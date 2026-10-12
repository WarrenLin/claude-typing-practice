import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  component: 'Pane',
  requestId: 'typing',
  props: { title: 'Typing', isFocused: true, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const

test('typing the whole sentence records WPM and starts a new one', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  mock.store(on)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'typing-practice', surface, ...PANE })
    const before = await ui.drawn()
    const target = JSON.stringify(before)
    const sentence = (await ui.findAll({ type: 'Text' }))[0]!.text

    await ui.input({ key: 'typing-field', text: sentence.slice(0, 1), kind: 'change' })
    await clock.advance(6_000)
    // 6 秒內完成
    await ui.input({ key: 'typing-field', text: sentence, kind: 'change' })

    const stats = await ui.find({ type: 'Text', text: /上回合/ })
    expect(stats).toBeDefined()
    const wpm = Math.round(sentence.length / 5 / 0.1)
    expect(stats!.text).toContain(`${wpm}`)
    expect(stats!.text).toContain('100%')
    expect(JSON.stringify(await ui.drawn())).not.toBe(target)
    await ui.unmount()
  }
})
