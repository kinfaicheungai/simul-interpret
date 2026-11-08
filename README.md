# 即時傳譯 Live Interpreter

用手機（iPhone Safari／Chrome）持續收音，透過 OpenAI Realtime Translation（`gpt-realtime-translate`）逐段將講者嘅說話翻譯成另一種語言，同步顯示**原文字幕**、**譯文字幕**，並可播放**譯音**。

- 後端：Node.js 22，零第三方依賴（`server.js`）
- 前端：純 HTML/CSS/JS（`public/`），可加入 iPhone 主畫面當 App 用
- 音訊經 WebRTC 由瀏覽器直送 OpenAI；伺服器只負責發短期連線憑證，**唔儲存錄音或字幕**

## 功能

- 揀目標語言（中文、English、日本語、한국어……），**收音途中都可以即時轉語言**
- 咪高峰距離模式：近距離（拎住電話）／遠距離（電話擺枱面，用 `far_field` 降噪）
- 撳「停止」會先等最後一段翻譯完成先斷線，唔會漏尾句
- 停頓超過 1.5 秒自動分段，字幕易讀
- 收音期間保持螢幕常亮（Screen Wake Lock），避免 iPhone 自動鎖機中斷
- 計時顯示、字體大細、下載字幕 `.txt`、清除字幕
- 深色模式、PWA（Safari →「分享」→「加至主畫面」）

## 本機啟動

需要 Node.js 22 或以上。

```sh
cp .env.example .env    # 用文字編輯器填好 OPENAI_API_KEY 同 APP_PASSWORD
npm start
```

打開 http://localhost:3000，用戶名 `interpreter`（可用 `APP_USERNAME` 改），密碼係 `APP_PASSWORD`。
iPhone 收音一定要用 HTTPS，所以手機測試請用下面部署後嘅網址。

| 環境變數 | 必填 | 說明 |
|---|---|---|
| `OPENAI_API_KEY` | ✅ | 有 Realtime Translation 權限同額度嘅 key |
| `APP_PASSWORD` | ✅ | 網站登入密碼，20+ 個可見 ASCII 字元（建議用密碼管理器產生 32 位） |
| `APP_USERNAME` | | 預設 `interpreter` |
| `MAX_SESSION_MINUTES` | | 每次收音上限，預設 10（1–120） |
| `SESSIONS_PER_MINUTE` | | 每分鐘最多開幾次連線，預設 6 |
| `HOST` / `PORT` | | 預設 `127.0.0.1` / `3000`；雲端部署設 `HOST=0.0.0.0` |

## 測試

```sh
npm test
```

每次 push 去 GitHub 都會自動跑 CI（`.github/workflows/ci.yml`）。

## 部署到 Render

Repo 已附 `render.yaml`：

1. Render Dashboard →「New」→「Blueprint」→ 揀呢個 GitHub repo
2. 喺提示中自己填 `OPENAI_API_KEY` 同 `APP_PASSWORD`（唔好寫入 repo）
3. 部署完成後用 iPhone Safari 開 Render 畀嘅 `https://….onrender.com` 網址並登入

> Render 免費方案閒置後會休眠，第一次開可能要等 30–60 秒。

## iPhone 驗收清單

1. 開 HTTPS 網址並登入，撳「開始收音」並允許咪高峰。
2. 連續講 20–30 秒（例如讀一段天氣預報），睇譯文會唔會喺講完之前開始更新，核對數字同日期。
3. 戴耳機，撳「播放譯音」再撳「靜音」，確認字幕繼續出現。
4. 收音途中轉「譯成」語言，確認之後嘅譯文用新語言。
5. 撳「停止」，確認最後一句都有譯出、字幕保留；撳「下載字幕」得到 `.txt`。
6. 切去其他 App 會自動停止（iOS 限制），返嚟可以再開始。

## 運作原理

```
iPhone ──(Basic Auth) POST /session──▶ server.js ──(API key)──▶ OpenAI /realtime/translations/client_secrets
   │                                       ◀────── 60 秒短期憑證 ek_… ──────┘
   └──WebRTC SDP (ek_…)──▶ OpenAI /realtime/translations/calls
        咪高峰音軌 ──▶          ◀── 譯音音軌 + 資料通道（原文／譯文字幕 delta）
```

- 原文轉錄用 `gpt-realtime-whisper`
- API key 只喺伺服器；瀏覽器只會拎到 60 秒內有效嘅短期憑證
- 網站有 HTTP Basic Auth、CSP、速率限制；公開部署必須用 HTTPS

## 私隱

收音期間聲音會傳送到 OpenAI 處理。請只用獲同意嘅音訊，並遵守客戶／活動嘅保密要求。

參考：[OpenAI Realtime Translation 指南](https://developers.openai.com/api/docs/guides/realtime-translation) · [Client secrets API](https://developers.openai.com/api/reference/resources/realtime/subresources/translations/index.md)
