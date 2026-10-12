export type Round = {
  /** 本回合要打的句子 */
  target: string
  /** 目前已輸入的文字 */
  typed: string
  /** 第一個按鍵的時間（ms），尚未開始為 0 */
  startedAt: number
  /** 最近一次輸入的時間（ms） */
  lastAt: number
}

export type Stats = {
  /** 上一回合的 WPM 與正確率 */
  last?: { wpm: number; accuracy: number }
  /** 歷史最佳 WPM */
  best: number
  /** 完成回合數 */
  rounds: number
  /** 所有回合 WPM 總和，用來算平均 */
  totalWpm: number
}

declare module 'claude-code' {
  interface PluginState {
    'typing-practice': { round: Round; stats: Stats }
  }
}
