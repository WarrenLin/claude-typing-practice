import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Round, Stats } from '../types'

const PANE = 'typing'
const FIELD = 'typing-field'
const STORE_KEY = 'stats'
/** false = 已用 /typing off 暫停，turn.start 不自動打開 */
const AUTO_OPEN_KEY = 'autoOpen'

const SENTENCES = [
  'The quick brown fox jumps over the lazy dog.',
  'Premature optimization is the root of all evil.',
  'Talk is cheap. Show me the code.',
  'Programs must be written for people to read.',
  'Simplicity is prerequisite for reliability.',
  'Make it work, make it right, make it fast.',
  'Any fool can write code that a computer can understand.',
  'First, solve the problem. Then, write the code.',
  'Code is like humor. When you have to explain it, it is bad.',
  'Deleted code is debugged code.',
  'There are only two hard things: cache invalidation and naming things.',
  'Testing shows the presence, not the absence of bugs.',
  'git commit -m "fix: handle empty response from api"',
  'const result = await fetch(url).then(res => res.json())',
  'for (let i = 0; i < items.length; i++) { total += items[i] }',
  'fun main() { println("Hello, Kotlin!") }',
  'let view = UIView(frame: .zero)',
  'Walking on water and developing software from a specification are easy if both are frozen.',
  'The best error message is the one that never shows up.',
  'Weeks of coding can save you hours of planning.',
]

const pick = (not?: string) => {
  const pool = SENTENCES.filter(s => s !== not)
  return pool[Math.floor(Math.random() * pool.length)] ?? SENTENCES[0]!
}

const freshRound = (not?: string): Round => ({ target: pick(not), typed: '', startedAt: 0, lastAt: 0 })
const emptyStats: Stats = { best: 0, rounds: 0, totalWpm: 0 }

const round = atom({ plugin: 'typing-practice', key: 'round' } as const, freshRound())
const stats = atom({ plugin: 'typing-practice', key: 'stats' } as const, emptyStats)

const correctCount = (target: string, typed: string) => {
  let n = 0
  for (let i = 0; i < typed.length && i < target.length; i++) if (typed[i] === target[i]) n++
  return n
}

/** WPM 以「正確字元數 / 5」為一個字計算 */
const wpmOf = (r: Round) => {
  const minutes = (r.lastAt - r.startedAt) / 60000
  if (r.startedAt === 0 || minutes <= 0) return 0
  return Math.round(correctCount(r.target, r.typed) / 5 / minutes)
}

const openPane = ($: EngineInterface) =>
  $.ui.open({ id: PANE, title: 'Typing', focus: true, closeOnEscape: true })

const finish = async ($: EngineInterface, r: Round) => {
  if (r.typed.length > 0 && r.startedAt > 0) {
    const wpm = wpmOf(r)
    const accuracy = Math.round((correctCount(r.target, r.typed) / r.target.length) * 100)
    const next = await update($, stats, s => ({
      last: { wpm, accuracy },
      best: Math.max(s.best, wpm),
      rounds: s.rounds + 1,
      totalWpm: s.totalWpm + wpm,
    }))
    await $.store.set(STORE_KEY, next)
  }
  await update($, round, () => freshRound(r.target))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const saved = (await $.store.get(STORE_KEY)) as Stats | undefined
    if (saved) await update($, stats, () => saved)
    await $.command.register({
      name: 'typing',
      description: '開啟打字練習面板（等 AI 回覆時練 WPM）；off 暫停自動開啟',
      argumentHint: '[on|off]',
    })
    return next(e)
  })

  on('command.run', { command: 'typing' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'off') {
      await $.store.set(AUTO_OPEN_KEY, false)
      await $.ui.close({ id: PANE })
      return { text: '打字練習已暫停，AI 回覆時不會再自動打開；輸入 /typing 恢復。' }
    }
    await $.store.set(AUTO_OPEN_KEY, true)
    await openPane($)
    return { text: '打字練習面板已開啟，直接開始打字；Esc 關閉面板。' }
  })

  // 送出 prompt 後 AI 開始回覆時，自動打開面板並請求鍵盤焦點
  on('turn.start', async ($, e, next) => {
    if ((await $.store.get(AUTO_OPEN_KEY)) !== false) void openPane($)
    return next(e)
  })


  on('ui.input', async ($, e, next) => {
    if (e.plugin !== 'typing-practice' || e.element !== FIELD) return next(e)
    const now = await $.clock.now()
    const r = await read($, round)

    if (e.kind === 'submit') {
      await finish($, { ...r, typed: e.value, lastAt: r.startedAt ? now : 0 })
      return { element: e.element, value: '' }
    }

    const typed = e.value
    const current: Round = {
      ...r,
      typed,
      startedAt: r.startedAt || (typed.length > 0 ? now : 0),
      lastAt: now,
    }
    if (typed.length >= r.target.length) {
      await finish($, current)
    } else {
      await update($, round, () => current)
    }
    return { element: e.element, value: typed }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    if (e.surface === 'mobile') {
      const { Text } = $.ui.resolve(e)
      return <Text dimColor>打字練習需要實體鍵盤，請在桌面或終端機使用。</Text>
    }
    const { Box, Text, Input } = $.ui.resolve(e)
    const r = await read($, round)
    const s = await read($, stats)

    // 依正確 / 錯誤 / 未輸入切成連續片段上色
    const runs: { kind: 'ok' | 'bad' | 'todo'; text: string }[] = []
    for (let i = 0; i < r.target.length; i++) {
      const ch = r.target.charAt(i)
      const kind = i >= r.typed.length ? 'todo' : r.typed[i] === ch ? 'ok' : 'bad'
      const last = runs[runs.length - 1]
      if (last && last.kind === kind) last.text += ch
      else runs.push({ kind, text: ch })
    }

    const liveWpm = wpmOf(r)
    const avg = s.rounds ? Math.round(s.totalWpm / s.rounds) : 0

    return (
      <Box flexDirection="column" gap={1}>
        <Text>
          {runs.map(run =>
            run.kind === 'ok' ? (
              <Text color="green">{run.text}</Text>
            ) : run.kind === 'bad' ? (
              <Text color="red" underline>{run.text}</Text>
            ) : (
              <Text dimColor>{run.text}</Text>
            ),
          )}
        </Text>
        <Input
          key={FIELD}
          placeholder="開始打字，計時從第一個鍵開始…"
          value={r.typed}
          submitLabel="next"
          autoFocus
          onSubmit={() => {}}
        />
        <Text>
          <Text bold>WPM {liveWpm}</Text>
          <Text dimColor>  ({r.typed.length}/{r.target.length})</Text>
        </Text>
        <Box flexDirection="column">
          {s.last && (
            <Text>
              上回合 <Text bold>{s.last.wpm}</Text> WPM · 正確率 {s.last.accuracy}%
            </Text>
          )}
          <Text dimColor>
            最佳 {s.best} · 平均 {avg} · 已完成 {s.rounds} 回合
          </Text>
          <Text dimColor>打完自動換句 · Enter 跳過 · Esc 關閉</Text>
        </Box>
      </Box>
    )
  })
}
