# 即時傳譯 Live Interpreter

用手機（iPhone Safari／Chrome）持續收音，透過 OpenAI Realtime Translation（`gpt-realtime-translate`）逐段將講者嘅說話翻譯成另一種語言，同步顯示**原文字幕**、**譯文字幕**，並可播放**譯音**。

- 後端：Cloudflare Workers（`src/worker.js` + `src/app.js`）；本機開發用 Node.js 22（`server.js`），零第三方依賴
- 前端：純 HTML/CSS/JS（`public/`），可加入 iPhone 主畫面當 App 用
- 音訊經 WebRTC 由瀏覽器直送 OpenAI；伺服器只負責發短期連線憑證，**唔儲存錄音或字幕**

## 版本

目前版本見 App 底部，更新內容見 [CHANGELOG.md](CHANGELOG.md)。

## 功能

- **無限時連續使用**：每段連線用到 30 分鐘前會喺背景自動無縫換新連線；網絡斷咗會自動重連（最多 4 次）；連續 3 分鐘冇人講嘢自動停止，避免忘記熄機一直收費
- **多用戶帳戶**（喺 App 嘅「帳戶」登入）：
  - **管理員**（用戶名 `admin`，密碼 `APP_PASSWORD`）：用伺服器上面 `OPENAI_API_KEY` 嘅額度；喺「管理用戶」新增用戶、重設密碼、刪除用戶
  - **一般用戶**：由管理員開帳戶（系統自動產生密碼）。第一次登入輸入自己嘅 OpenAI API key，之後任何裝置登入都自動使用，費用由佢自己嘅 OpenAI 帳戶支付
  - 用戶登入後可以喺「帳戶」自己改密碼，API key 會保留
  - 用戶嘅 key 用佢自己嘅密碼加密後先儲存（Cloudflare KV），冇密碼嘅人（包括管理員）都睇唔到；登入一次保持 30 日
- **介面語言**：繁體中文、简体中文、English（自動跟裝置語言，可以手動轉）
- **對話模式（雙語，測試）**：兩個講唔同語言嘅人共用一部手機。同時開兩條翻譯（每種語言一條），兩個框各自顯示一種語言；上面框可以反轉俾對面嘅人睇。只顯示文字，費用約為單向兩倍。OpenAI 建議每個講者有獨立收音，共用一個咪係目前嘅限制，所以準確度可能比單向低
- **聲音來源**：手機咪（附近／枱面）、喇叭／電話／電視聲（關閉手機降噪）、電腦分頁聲音（Chrome 電腦版）；有音量條同「收唔到聲」提示
- 揀目標語言，**收音途中都可以即時轉語言**
- 咪高峰距離模式：近距離（拎住電話）／遠距離（電話擺枱面，用 `far_field` 降噪）
- 撳「停止」會先等最後一段翻譯完成先斷線，唔會漏尾句
- 停頓超過 1.5 秒自動分段；收音期間保持螢幕常亮
- 計時、字體大細、下載字幕 `.txt`、清除字幕、深色模式、PWA（Safari →「分享」→「加至主畫面」）

## 顏色

- 主色暖橙 `#ffb84d` 只用喺按掣、圖示等重點位置；按掣上用深啡字（對比 9.8:1），唔用白字（白字配橙只有 1.7:1，睇唔清）
- 閱讀區用白底深啡字（15.8:1），淺色模式背景用暖米白 `#fdf6ec`；所有文字對比 ≥ WCAG AA 4.5:1
- 深色模式：深啡黑底、米白字（14:1 以上）

## 已知限制

- 翻譯質素由 OpenAI `gpt-realtime-translate` 決定，API 暫時唔支援術語表或背景指示（例如「0 and 3 = 零勝三負」呢類慣用語可能譯錯）
- iPhone 切去其他 App 或鎖機時，iOS 會停咪高峰，所以 App 會自動停止

## 本機啟動

需要 Node.js 22 或以上。

```sh
cp .env.example .env    # 用文字編輯器填好 OPENAI_API_KEY 同 APP_PASSWORD
npm start
```

打開 http://localhost:3000，喺「帳戶」用 `admin` 同 `APP_PASSWORD` 登入。（本機嘅用戶資料存喺記憶體，重新啟動就會清空。）
iPhone 收音一定要用 HTTPS，所以手機測試請用下面部署後嘅網址。

本機用 `.env` 設定；Cloudflare 上面嘅設定見下面部署部分（`MAX_SESSION_MINUTES` 等喺 `wrangler.toml` 改）。

| 環境變數 | 說明 |
|---|---|
| `OPENAI_API_KEY` | 管理員模式用嘅 key（同 `APP_PASSWORD` 一齊設定；兩個都唔設就只有「自己嘅 key」模式） |
| `APP_PASSWORD` | 管理員密碼，20+ 個可見 ASCII 字元 |
| `APP_USERNAME` | 管理員用戶名，預設 `admin` |
| `ALLOW_OWN_KEY` | 設做 `true` 就容許冇帳戶嘅人直接貼自己嘅 key 使用，預設 `false` |
| `MAX_SESSION_MINUTES` | 每段連線幾耐換新，預設 30（1–120）；整體冇時間上限 |
| `SESSIONS_PER_MINUTE` | 每個用戶每分鐘最多開幾次連線，預設 6 |
| `HOST` / `PORT` | 本機用，預設 `127.0.0.1` / `3000` |

## 測試

```sh
npm test
```

每次 push 去 GitHub 都會自動跑 CI（`.github/workflows/ci.yml`）。

## 部署到 Cloudflare Workers

Repo 已附 `wrangler.toml`，網頁同後端一齊放喺同一個 Worker。

1. Cloudflare Dashboard →「Workers & Pages」→「Create」→「Import a repository」→ 揀 GitHub 上嘅 `simul-interpret`
2. Build 設定保持預設（Deploy command：`npx wrangler deploy`），撳「Deploy」
3. 部署完成後去呢個 Worker →「Settings」→「Variables and Secrets」→「Add」，類型揀 **Secret**，加入：
   - `OPENAI_API_KEY`
   - `APP_PASSWORD`（20+ 個字元）
4. 用 iPhone Safari 開 `https://simul-interpret.<你的帳戶>.workers.dev`，喺「帳戶」用 `admin` 同密碼登入

用戶資料存喺 Cloudflare KV（`USERS`），第一次部署時 Wrangler 會自動建立，唔使手動設定。

想推介俾其他人：管理員喺「管理用戶」新增用戶，將畫面顯示嘅網址、用戶名同密碼交俾對方；對方第一次登入時輸入自己嘅 OpenAI API key，唔會用到你嘅額度。

之後每次 push 去 `main`，Cloudflare 會自動重新部署。

> 想喺本機用 Cloudflare 環境測試：建立 `.dev.vars`（格式同 `.env`），再 `npm run dev:cf`。

## iPhone 驗收清單

1. 開 HTTPS 網址，喺「帳戶」登入，撳「開始收音」並允許咪高峰。
2. 連續講 20–30 秒（例如讀一段天氣預報），睇譯文會唔會喺講完之前開始更新，核對數字同日期。
3. 戴耳機，撳「播放譯音」再撳「靜音」，確認字幕繼續出現。
4. 收音途中轉「譯成」語言，確認之後嘅譯文用新語言。
5. 撳「停止」，確認最後一句都有譯出、字幕保留；撳「下載字幕」得到 `.txt`。
6. 切去其他 App 會自動停止（iOS 限制），返嚟可以再開始。

## 運作原理

```
iPhone ──(登入 token) POST /session──▶ Worker    ──(對應 key)──▶ OpenAI /realtime/translations/client_secrets
   │                                       ◀────── 60 秒短期憑證 ek_… ──────┘
   └──WebRTC SDP (ek_…)──▶ OpenAI /realtime/translations/calls
        咪高峰音軌 ──▶          ◀── 譯音音軌 + 資料通道（原文／譯文字幕 delta）
```

- 原文轉錄用 `gpt-realtime-whisper`
- API key 只喺伺服器；瀏覽器只會拎到 60 秒內有效嘅短期憑證
- 網頁本身公開；攞翻譯連線一定要登入。另有 CSP、登入同連線嘅速率限制

## 私隱

收音期間聲音會傳送到 OpenAI 處理。請只用獲同意嘅音訊，並遵守客戶／活動嘅保密要求。

參考：[OpenAI Realtime Translation 指南](https://developers.openai.com/api/docs/guides/realtime-translation) · [Client secrets API](https://developers.openai.com/api/reference/resources/realtime/subresources/translations/index.md)
