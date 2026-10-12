# ⌨️ Typing Practice — Claude Code Mod

等 Claude 回覆的空檔，順手練打字。

送出 prompt 後，Claude Code 側邊會自動打開一個 **Typing** 面板，給你一句英文名言或程式碼，邊打邊即時顯示 **WPM** 與正確率，打完自動換下一句。成績會保存下來，下次開啟還看得到。

```
The quick brown fox jumps over the lazy dog.
┌──────────────────────────────────────────┐
│ The quick brown f                        │
└──────────────────────────────────────────┘
WPM 42  (17/44)

上回合 38 WPM · 正確率 97%
最佳 51 · 平均 40 · 已完成 12 回合
打完自動換句 · Enter 跳過 · Esc 關閉
```

## 功能

- **自動開啟**：每次 Claude 開始回覆時，自動打開練習面板並取得鍵盤焦點
- **想關就關**：`Esc` 關掉面板，下次 Claude 回覆時會再自動打開
- **即時上色**：打對的字變綠色、打錯的字變紅色並加底線
- **WPM 計算**：從第一個按鍵開始計時，以「正確字元數 ÷ 5」為一個字
- **成績紀錄**：上回合 WPM／正確率、歷史最佳、平均、完成回合數，重開 session 也會保留
- **題庫**：程式設計名言 + Git／JS／Kotlin／Swift 程式碼片段

## 安裝

需求：[Claude Code](https://claude.com/claude-code)（需支援 mods／plugin hooks 的版本），並在**終端機**中執行。

在 Claude Code 的 prompt 輸入：

```
/plugin install typing-practice --marketplace WarrenLin/claude-typing-practice
```

接著：

1. 出現 `Add marketplace?`（來源 `github:WarrenLin/claude-typing-practice`）時輸入 `y`
2. 選擇安裝範圍，直接按 Enter 選 **user scope**（所有專案都能用）
3. 看到 `Installed typing-practice. Plugin is now active.` 就完成了，不需要重開

> 也可以在 shell 用 CLI 安裝：
>
> ```bash
> claude plugin marketplace add WarrenLin/claude-typing-practice
> claude plugin install typing-practice@warren-mods
> ```

## 使用方式

| 操作 | 說明 |
| --- | --- |
| 送出任一 prompt | Claude 開始回覆時面板自動打開 |
| `/typing` | 手動打開練習面板 |
| 直接打字 | 從第一個鍵開始計時 |
| `Enter` | 跳過這句、換下一句（有打字的話會記成績） |
| `Esc` | 關閉面板 |

### 關閉面板 & 停止自動跳出

- 按 `Esc`，或點面板上的關閉符號（鍵盤可用 `Tab` 移到關閉符號再按 `Enter`）即可關閉。
- 關閉只對這一次有效，**下次 Claude 回覆時面板會再自動打開**。
- 不想再自動跳出，就停用這個 mod：

  ```bash
  claude plugin disable typing-practice@warren-mods   # 停用
  claude plugin enable typing-practice@warren-mods    # 重新啟用
  ```

> 手機版（Claude App）不支援，面板會提示需要實體鍵盤。

## 更新與移除

```bash
# 更新到最新版
claude plugin marketplace update warren-mods
claude plugin update typing-practice@warren-mods

# 移除
claude plugin uninstall typing-practice@warren-mods
```

更新或移除後，在已開啟的 session 中執行 `/reload-plugins` 即可生效。

## 自訂題庫

想練自己的句子？Fork 這個 repo，修改 [`hooks/register.tsx`](hooks/register.tsx) 裡的 `SENTENCES` 陣列，再用你自己的 repo 安裝：

```
/plugin install typing-practice --marketplace <你的帳號>/claude-typing-practice
```

## 本機開發

```bash
git clone https://github.com/WarrenLin/claude-typing-practice.git
cd claude-typing-practice

# 驗證 manifest 與 hooks
claude plugin validate .

# 直接從資料夾載入，改完程式後在 session 裡執行 /reload-plugins
claude --plugin-dir .
```

### 專案結構

```
.
├── .claude-plugin/
│   ├── plugin.json        # mod 資訊（名稱、版本、說明）
│   └── marketplace.json   # 讓這個 repo 本身就是一個 marketplace
├── hooks/
│   ├── hooks.json         # 註冊 hooks 模組
│   └── register.tsx       # 主程式：面板、輸入處理、WPM 計算
├── types/index.d.ts       # state 型別
└── tests/typing.test.ts   # 測試
```

## License

[MIT](LICENSE) © Warren Lin
