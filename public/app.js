'use strict';
const $ = selector => document.querySelector(selector);
const el = {
  start: $('#start'), stop: $('#stop'), sound: $('#sound'), status: $('#status'), clock: $('#clock'),
  audio: $('#audio'), language: $('#language'), noise: $('#noise'), download: $('#download'),
  clear: $('#clear'), source: $('#source'), target: $('#target'), uiLang: $('#ui-lang'),
  account: $('#account'), accountState: $('#account-state'), apiKey: $('#api-key'),
  password: $('#password'), accountMsg: $('#account-msg'), username: $('#username'),
};

// ---------- Interface language ----------
const STRINGS = {
  'zh-Hant': {
    keyHelpButton: '❓ 點樣攞 OpenAI API key？', firstTimeHelp: '❓ 第一次用？睇點樣準備 OpenAI API key', helpClose: '明白',
    helpTitle: '點樣申請 OpenAI API key？',
    helpIntro: 'API key 就好似一條專屬鎖匙：App 用佢幫你連接 OpenAI 做翻譯，費用直接計落你自己嘅 OpenAI 帳戶，唔會用到其他人嘅錢。注意：ChatGPT Plus 訂閱同 API 係分開收費，就算有 Plus 都要另外增值。大約 5 分鐘就搞掂。',
    help1: '註冊或登入 OpenAI 開發者平台（可以用 email 或 Google 帳戶，同 ChatGPT 帳戶一樣都得）。',
    help2: '增值：去 Billing 頁，撳「Add credit」或「Add payment details」，加信用卡並增值（最少約 US$5）。',
    help3: '建立 key：去 API keys 頁，撳「Create new secret key」，名可以隨便改（例如 interpreter），再撳「Create secret key」。',
    help4: '即刻撳「Copy」複製。Key 係一長串以「sk-」開頭嘅字，只會顯示一次；如果唔見咗，就重新建立一條。',
    help5: '返嚟呢個 App，喺「OpenAI API key」格貼上，再撳「登入」。完成！',
    helpTipsTitle: '小貼士', helpLink: '打開頁面 ↗',
    tip1: 'Key 好似密碼咁，唔好傳俾其他人；俾人用咗，費用會計落你個帳戶。',
    tip2: '用咗幾多錢，可以喺 OpenAI 嘅 Usage 頁睇。',
    tip3: '建議唔好開「自動增值」（auto recharge），用完先再增值，就唔會超支。',
    tip4: '如果 App 話 key 冇權限或者額度不足，通常係未增值，或者啱啱增值要等幾分鐘。',
    changePassword: '改密碼', currentPassword: '目前密碼', newPassword: '新密碼', confirmPassword: '再輸入一次新密碼', passwordRule: '新密碼最少 10 個字元（英文、數字或符號，唔可以有空格）。', savePassword: '儲存新密碼', cancel: '取消', passwordChanged: '密碼已更改，其他裝置會自動登出。', passwordMismatch: '兩次輸入嘅新密碼唔一樣。', wrongCurrentPassword: '目前密碼唔啱。',
    username: '用戶名', login: '登入', logout: '登出', changeKey: '更換 API key',
    changeKeyHint: '請輸入密碼同新嘅 API key。', noAccount: '冇帳戶？直接用自己嘅 API key', useThisKey: '用呢個 key',
    loggedInAdmin: '管理員 {name}', loggedInUser: '已登入：{name}', wrongLogin: '用戶名或密碼唔啱。',
    firstLoginKey: '第一次登入：請輸入你自己嘅 OpenAI API key，之後喺任何裝置登入都會自動使用。',
    loginOk: '已登入。', loggedOut: '已登出。',
    manageUsers: '管理用戶', newUserPlaceholder: '新用戶名（英文細階／數字）', addUser: '新增用戶',
    noUsers: '未有用戶。', userHasKey: '已設定 API key', userNoKey: '未登入過（未有 API key）', lastLogin: '最近登入 {date}',
    resetPassword: '重設密碼', deleteUser: '刪除', confirmDelete: '再撳一次確認刪除',
    shareCredentials: '將以下資料交俾對方：', passwordOnce: '密碼只會顯示呢一次。對方登入後可以喺「帳戶」自己改密碼。重設密碼後，對方要重新輸入 API key。',
    copy: '複製', copied: '已複製',
    adminErr_bad_username: '用戶名要 2–32 個英文細階字母、數字或 . _ -，而且唔可以同管理員一樣。',
    adminErr_user_exists: '呢個用戶名已經有人用。', adminErr_no_user: '搵唔到呢個用戶。',
    adminErr_storage_missing: '伺服器未設定用戶儲存（KV）。', adminErr_admin_only: '只有管理員可以做呢個操作。', adminErr_generic: '操作失敗，請再試。',
    uiLanguage: '介面語言',
    title: '即時傳譯', lead: '按開始後講嘢，網頁會持續收音，逐段顯示原文同譯文。請保持畫面喺前景。',
    account: '帳戶', notSet: '未設定', ownKeySet: '自己嘅 API key（…{last}）', ownerSet: '管理員',
    modeOwn: '用我自己嘅 OpenAI API key', modeOwner: '管理員密碼',
    apiKey: 'OpenAI API key', apiKeyHint: 'Key 會用你嘅密碼加密後儲存，冇密碼嘅人（包括管理員）都睇唔到。費用由你嘅 OpenAI 帳戶支付。',
    password: '密碼', save: '儲存', forget: '清除', saved: '已儲存。', forgotten: '已清除。',
    checking: '檢查緊…', wrongPassword: '密碼唔啱。', keyFormat: 'API key 應該以 sk- 開頭。',
    translateTo: '譯成', micDistance: '咪高峰距離',
    near: '近距離（講者拎住電話）', far: '遠距離（電話擺喺枱面）', noiseOff: '關閉降噪',
    start: '開始收音', stop: '停止', stopNow: '即刻結束', playVoice: '播放譯音', mute: '靜音',
    translation: '譯文', original: '原文', download: '下載字幕 (.txt)', clear: '清除字幕',
    note: '收音期間，聲音會傳送到 OpenAI 處理，按使用時間收費。播放譯音時請戴耳機，減少回音。可以無限時連續使用；連續 3 分鐘冇人講嘢會自動停止。網站唔會儲存錄音或字幕。',
    idle: '等候開始', needAccount: '請先喺「帳戶」登入。',
    noSupport: '呢個瀏覽器唔支援收音或 WebRTC。請用 Safari / Chrome 開啟 HTTPS 網址。',
    micWait: '等候咪高峰權限…', connecting: '正在連接翻譯服務…', live: '收音及翻譯中',
    reconnecting: '連線中斷，自動重新連接中（第 {n} 次）…', unstable: '網絡不穩，嘗試恢復…',
    finishing: '正在完成最後一段翻譯…', stopped: '已停止收音。', idleStop: '連續 3 分鐘冇聲，已自動停止。',
    hidden: '畫面已離開前景，已停止收音。', micDenied: '未能使用咪高峰。請喺瀏覽器網站設定允許咪高峰，再試一次。',
    micEnded: '咪高峰已中斷，請再按開始。', gaveUp: '多次重新連接失敗，已停止。請檢查網絡後再開始。',
    playFailed: '瀏覽器未能播放語音，請再按播放。字幕會繼續更新。', switchedTo: '［改為譯成 {lang}］',
    serviceError: '翻譯服務出錯：{detail}', callFailed: '翻譯連線失敗（{status}）。',
    err_login_required: '登入已過期或帳戶已更改，請喺「帳戶」重新登入。', err_key_format: 'API key 格式唔啱。',
    err_key_invalid: 'OpenAI 拒絕咗呢個 API key（無效或已停用）。', err_key_no_access: '呢個 API key 冇 Realtime Translation 權限。',
    err_key_quota: 'OpenAI 額度不足或請求太多，請檢查帳戶用量同付款設定。', err_too_many: '連線次數太多，請等一分鐘再試。',
    err_own_key_disabled: '呢個網站冇開放自備 API key。', err_unreachable: '暫時連接唔到 OpenAI，請稍後再試。',
    err_upstream: 'OpenAI 連線憑證申請失敗（{status}）。', err_generic: '未能開始，請再試一次。',
    exportTitle: '即時傳譯字幕',
  },
  'zh-Hans': {
    keyHelpButton: '❓ 如何获取 OpenAI API key？', firstTimeHelp: '❓ 第一次使用？看看如何准备 OpenAI API key', helpClose: '明白',
    helpTitle: '如何申请 OpenAI API key？',
    helpIntro: 'API key 就像一把专属钥匙：App 用它帮你连接 OpenAI 翻译，费用直接计入你自己的 OpenAI 账户，不会用到别人的钱。注意：ChatGPT Plus 订阅与 API 分开收费，即使有 Plus 也要另外充值。大约 5 分钟即可完成。',
    help1: '注册或登录 OpenAI 开发者平台（可用 email 或 Google 账户，与 ChatGPT 账户相同也可以）。',
    help2: '充值：打开 Billing 页面，点「Add credit」或「Add payment details」，添加信用卡并充值（最少约 US$5）。',
    help3: '创建 key：打开 API keys 页面，点「Create new secret key」，名称可随意（例如 interpreter），再点「Create secret key」。',
    help4: '立即点「Copy」复制。Key 是一长串以「sk-」开头的字符，只显示一次；如果丢失，重新创建一条即可。',
    help5: '回到本 App，在「OpenAI API key」框粘贴，再点「登录」。完成！',
    helpTipsTitle: '小贴士', helpLink: '打开页面 ↗',
    tip1: 'Key 像密码一样，不要发给别人；被别人使用，费用会计入你的账户。',
    tip2: '用了多少钱，可以在 OpenAI 的 Usage 页面查看。',
    tip3: '建议不要开启「自动充值」（auto recharge），用完再充值，就不会超支。',
    tip4: '如果 App 提示 key 没有权限或额度不足，通常是还没充值，或刚充值需要等几分钟。',
    changePassword: '修改密码', currentPassword: '当前密码', newPassword: '新密码', confirmPassword: '再次输入新密码', passwordRule: '新密码至少 10 个字符（英文、数字或符号，不能有空格）。', savePassword: '保存新密码', cancel: '取消', passwordChanged: '密码已修改，其他设备会自动退出登录。', passwordMismatch: '两次输入的新密码不一致。', wrongCurrentPassword: '当前密码不正确。',
    username: '用户名', login: '登录', logout: '退出登录', changeKey: '更换 API key',
    changeKeyHint: '请输入密码和新的 API key。', noAccount: '没有账户？直接用自己的 API key', useThisKey: '使用这个 key',
    loggedInAdmin: '管理员 {name}', loggedInUser: '已登录：{name}', wrongLogin: '用户名或密码不正确。',
    firstLoginKey: '首次登录：请输入你自己的 OpenAI API key，之后在任何设备登录都会自动使用。',
    loginOk: '已登录。', loggedOut: '已退出登录。',
    manageUsers: '管理用户', newUserPlaceholder: '新用户名（小写英文／数字）', addUser: '新增用户',
    noUsers: '暂无用户。', userHasKey: '已设置 API key', userNoKey: '未登录过（未有 API key）', lastLogin: '最近登录 {date}',
    resetPassword: '重设密码', deleteUser: '删除', confirmDelete: '再按一次确认删除',
    shareCredentials: '把以下信息发给对方：', passwordOnce: '密码只显示这一次。对方登录后可在「账户」自行修改密码。重设密码后，对方需要重新输入 API key。',
    copy: '复制', copied: '已复制',
    adminErr_bad_username: '用户名需为 2–32 个小写英文字母、数字或 . _ -，且不能与管理员相同。',
    adminErr_user_exists: '这个用户名已被使用。', adminErr_no_user: '找不到这个用户。',
    adminErr_storage_missing: '服务器未设置用户存储（KV）。', adminErr_admin_only: '只有管理员可以执行此操作。', adminErr_generic: '操作失败，请重试。',
    uiLanguage: '界面语言',
    title: '实时传译', lead: '按开始后说话，网页会持续收音，逐段显示原文和译文。请保持画面在前台。',
    account: '账户', notSet: '未设置', ownKeySet: '自己的 API key（…{last}）', ownerSet: '管理员',
    modeOwn: '使用我自己的 OpenAI API key', modeOwner: '管理员密码',
    apiKey: 'OpenAI API key', apiKeyHint: 'Key 会用你的密码加密后保存，没有密码的人（包括管理员）都无法查看。费用由你的 OpenAI 账户支付。',
    password: '密码', save: '保存', forget: '清除', saved: '已保存。', forgotten: '已清除。',
    checking: '检查中…', wrongPassword: '密码不正确。', keyFormat: 'API key 应以 sk- 开头。',
    translateTo: '译成', micDistance: '麦克风距离',
    near: '近距离（讲者拿着手机）', far: '远距离（手机放在桌上）', noiseOff: '关闭降噪',
    start: '开始收音', stop: '停止', stopNow: '立即结束', playVoice: '播放译音', mute: '静音',
    translation: '译文', original: '原文', download: '下载字幕 (.txt)', clear: '清除字幕',
    note: '收音期间，声音会发送到 OpenAI 处理，按使用时间计费。播放译音时请戴耳机，减少回声。可无限时连续使用；连续 3 分钟没人说话会自动停止。网站不会保存录音或字幕。',
    idle: '等待开始', needAccount: '请先在「账户」登录。',
    noSupport: '此浏览器不支持收音或 WebRTC。请用 Safari / Chrome 打开 HTTPS 网址。',
    micWait: '等待麦克风权限…', connecting: '正在连接翻译服务…', live: '收音及翻译中',
    reconnecting: '连接中断，正在自动重连（第 {n} 次）…', unstable: '网络不稳定，尝试恢复…',
    finishing: '正在完成最后一段翻译…', stopped: '已停止收音。', idleStop: '连续 3 分钟没有声音，已自动停止。',
    hidden: '画面已离开前台，已停止收音。', micDenied: '无法使用麦克风。请在浏览器网站设置中允许麦克风，再试一次。',
    micEnded: '麦克风已中断，请再按开始。', gaveUp: '多次重连失败，已停止。请检查网络后再开始。',
    playFailed: '浏览器未能播放语音，请再按播放。字幕会继续更新。', switchedTo: '［改为译成 {lang}］',
    serviceError: '翻译服务出错：{detail}', callFailed: '翻译连接失败（{status}）。',
    err_login_required: '登录已过期或账户已更改，请在「账户」重新登录。', err_key_format: 'API key 格式不正确。',
    err_key_invalid: 'OpenAI 拒绝了这个 API key（无效或已停用）。', err_key_no_access: '这个 API key 没有 Realtime Translation 权限。',
    err_key_quota: 'OpenAI 额度不足或请求过多，请检查账户用量和付款设置。', err_too_many: '连接次数过多，请等一分钟再试。',
    err_own_key_disabled: '本网站未开放自备 API key。', err_unreachable: '暂时无法连接 OpenAI，请稍后再试。',
    err_upstream: 'OpenAI 连接凭证申请失败（{status}）。', err_generic: '未能开始，请再试一次。',
    exportTitle: '实时传译字幕',
  },
  en: {
    keyHelpButton: '❓ How do I get an OpenAI API key?', firstTimeHelp: '❓ First time? How to get an OpenAI API key', helpClose: 'Got it',
    helpTitle: 'How to get an OpenAI API key',
    helpIntro: 'An API key is like a personal key: the app uses it to connect to OpenAI for translation, and usage is billed to your own OpenAI account. Note: a ChatGPT Plus subscription is billed separately from the API, so you still need to add API credit. It takes about 5 minutes.',
    help1: 'Sign up or log in to the OpenAI developer platform (email or Google works; your ChatGPT login is fine).',
    help2: 'Add credit: open the Billing page, choose “Add credit” or “Add payment details”, add a card and top up (minimum about US$5).',
    help3: 'Create a key: open the API keys page, choose “Create new secret key”, give it any name (e.g. interpreter), then “Create secret key”.',
    help4: 'Copy it right away. The key is a long string starting with “sk-” and is shown only once; if you lose it, just create a new one.',
    help5: 'Come back here, paste it into the “OpenAI API key” box and log in. Done!',
    helpTipsTitle: 'Tips', helpLink: 'Open page ↗',
    tip1: 'Treat the key like a password; anyone who has it can spend your credit.',
    tip2: 'See how much you have spent on OpenAI’s Usage page.',
    tip3: 'Consider leaving “auto recharge” off so you never spend more than you topped up.',
    tip4: 'If the app says the key has no access or no quota, you usually have not added credit yet, or it can take a few minutes after topping up.',
    changePassword: 'Change password', currentPassword: 'Current password', newPassword: 'New password', confirmPassword: 'Repeat new password', passwordRule: 'At least 10 characters (letters, digits or symbols, no spaces).', savePassword: 'Save new password', cancel: 'Cancel', passwordChanged: 'Password changed. Other devices are logged out.', passwordMismatch: 'The new passwords do not match.', wrongCurrentPassword: 'Current password is wrong.',
    username: 'Username', login: 'Log in', logout: 'Log out', changeKey: 'Change API key',
    changeKeyHint: 'Enter your password and the new API key.', noAccount: 'No account? Use your own API key', useThisKey: 'Use this key',
    loggedInAdmin: 'Admin {name}', loggedInUser: 'Logged in: {name}', wrongLogin: 'Wrong username or password.',
    firstLoginKey: 'First login: enter your own OpenAI API key. It will be used automatically whenever you log in, on any device.',
    loginOk: 'Logged in.', loggedOut: 'Logged out.',
    manageUsers: 'Manage users', newUserPlaceholder: 'New username (lowercase / digits)', addUser: 'Add user',
    noUsers: 'No users yet.', userHasKey: 'API key set', userNoKey: 'Not logged in yet (no API key)', lastLogin: 'last login {date}',
    resetPassword: 'Reset password', deleteUser: 'Delete', confirmDelete: 'Tap again to delete',
    shareCredentials: 'Send these details to the person:', passwordOnce: 'The password is shown only once. The user can change it under “Account” after logging in. After a reset, they must enter their API key again.',
    copy: 'Copy', copied: 'Copied',
    adminErr_bad_username: 'Usernames are 2–32 lowercase letters, digits or . _ - and cannot match the admin name.',
    adminErr_user_exists: 'That username is taken.', adminErr_no_user: 'User not found.',
    adminErr_storage_missing: 'User storage (KV) is not set up on the server.', adminErr_admin_only: 'Only the admin can do this.', adminErr_generic: 'Something went wrong. Try again.',
    uiLanguage: 'Interface language',
    title: 'Live Interpreter', lead: 'Press Start and speak. The page keeps listening and shows the original and the translation as you go. Keep the screen in the foreground.',
    account: 'Account', notSet: 'not set', ownKeySet: 'own API key (…{last})', ownerSet: 'admin',
    modeOwn: 'Use my own OpenAI API key', modeOwner: 'Admin password',
    apiKey: 'OpenAI API key', apiKeyHint: 'Your key is stored encrypted with your password; nobody without it (the admin included) can read it. Usage is billed to your OpenAI account.',
    password: 'Password', save: 'Save', forget: 'Clear', saved: 'Saved.', forgotten: 'Cleared.',
    checking: 'Checking…', wrongPassword: 'Wrong password.', keyFormat: 'The API key should start with sk-.',
    translateTo: 'Translate to', micDistance: 'Microphone distance',
    near: 'Near (speaker holds the phone)', far: 'Far (phone on the table)', noiseOff: 'Noise reduction off',
    start: 'Start', stop: 'Stop', stopNow: 'End now', playVoice: 'Play voice', mute: 'Mute',
    translation: 'Translation', original: 'Original', download: 'Download (.txt)', clear: 'Clear',
    note: 'While listening, audio is sent to OpenAI and billed by time. Use headphones when playing the voice to avoid echo. Runs as long as you need; it stops by itself after 3 minutes of silence. Nothing is stored on this site.',
    idle: 'Ready', needAccount: 'Log in under “Account” first.',
    noSupport: 'This browser does not support microphone or WebRTC. Open the HTTPS address in Safari or Chrome.',
    micWait: 'Waiting for microphone permission…', connecting: 'Connecting…', live: 'Listening and translating',
    reconnecting: 'Connection lost, reconnecting (attempt {n})…', unstable: 'Network unstable, recovering…',
    finishing: 'Finishing the last segment…', stopped: 'Stopped.', idleStop: 'Stopped after 3 minutes of silence.',
    hidden: 'Stopped because the page left the foreground.', micDenied: 'Microphone blocked. Allow it in the browser’s site settings and try again.',
    micEnded: 'Microphone disconnected. Press Start again.', gaveUp: 'Reconnecting failed several times. Check the network and start again.',
    playFailed: 'The browser could not play audio. Press play again; subtitles keep updating.', switchedTo: '[Now translating to {lang}]',
    serviceError: 'Translation service error: {detail}', callFailed: 'Connection failed ({status}).',
    err_login_required: 'Login expired or the account changed. Log in again under “Account”.', err_key_format: 'API key format is invalid.',
    err_key_invalid: 'OpenAI rejected this API key (invalid or disabled).', err_key_no_access: 'This API key has no access to Realtime Translation.',
    err_key_quota: 'OpenAI quota exceeded or rate limited. Check usage and billing.', err_too_many: 'Too many connections. Wait a minute and try again.',
    err_own_key_disabled: 'This site does not accept personal API keys.', err_unreachable: 'Cannot reach OpenAI right now. Try again later.',
    err_upstream: 'OpenAI rejected the session request ({status}).', err_generic: 'Could not start. Please try again.',
    exportTitle: 'Live Interpreter transcript',
  },
};
const LANGUAGE_NAMES = {
  zh: '中文', en: 'English', ja: '日本語', ko: '한국어', es: 'Español', fr: 'Français',
  de: 'Deutsch', it: 'Italiano', pt: 'Português', ru: 'Русский', vi: 'Tiếng Việt',
  th: 'ไทย', id: 'Bahasa Indonesia', hi: 'हिन्दी', ar: 'العربية',
};

const store = {
  get(key, fallback = null) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch {} },
  remove(key) { try { localStorage.removeItem(key); } catch {} },
};

function detectUiLang() {
  const saved = store.get('uiLang');
  if (saved && STRINGS[saved]) return saved;
  const nav = (navigator.language || 'en').toLowerCase();
  if (nav.startsWith('zh')) return /(cn|sg|hans)/.test(nav) ? 'zh-Hans' : 'zh-Hant';
  return 'en';
}
let uiLang = detectUiLang();
const t = (key, vars = {}) => (STRINGS[uiLang][key] ?? STRINGS.en[key] ?? key)
  .replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');

let statusState = { key: 'idle', vars: {} };
function setStatus(key, vars = {}) { statusState = { key, vars }; el.status.textContent = t(key, vars); }

function applyUiLang() {
  document.documentElement.lang = uiLang;
  document.title = t('title');
  for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
  for (const node of document.querySelectorAll('[data-i18n-placeholder]')) node.placeholder = t(node.dataset.i18nPlaceholder);
  el.stop.textContent = recording?.stopping ? t('stopNow') : t('stop');
  el.sound.textContent = el.audio.muted ? t('playVoice') : t('mute');
  setStatus(statusState.key, statusState.vars);
  renderAccount();
}

// ---------- Account ----------
let serverConfig = { maxMinutes: 30, languages: Object.keys(LANGUAGE_NAMES), ownKeyEnabled: false, accounts: true };

// Stored on this device: a login token (admin or user), or a pasted API key.
function getAccount() {
  const mode = store.get('mode');
  if (mode === 'token' && store.get('token')) return { mode, token: store.get('token'), role: store.get('role'), username: store.get('username') };
  if (mode === 'own' && store.get('apiKey')) return { mode, apiKey: store.get('apiKey') };
  return null;
}
function authHeaders(account) {
  if (account.mode === 'own') return { 'X-OpenAI-Key': account.apiKey };
  return { Authorization: 'Bearer ' + account.token };
}
function clearAccount() { ['mode', 'token', 'role', 'username', 'apiKey', 'password'].forEach(store.remove); }

let needKey = false;
function renderAccount() {
  const account = getAccount();
  el.accountState.textContent = !account ? t('notSet')
    : account.mode === 'own' ? t('ownKeySet', { last: account.apiKey.slice(-4) })
    : account.role === 'owner' ? t('loggedInAdmin', { name: account.username })
    : t('loggedInUser', { name: account.username });
  const loggedIn = Boolean(account);
  $('#login-form').hidden = loggedIn && !needKey;
  $('#logged-in').hidden = !loggedIn || needKey;
  $('#show-change-key').hidden = account?.role !== 'user';
  $('#show-change-password').hidden = account?.role !== 'user';
  if (account?.role !== 'user') $('#password-form').hidden = true;
  $('#key-field').hidden = !needKey;
  $('#own-key-box').hidden = loggedIn || !serverConfig.ownKeyEnabled;
  $('#admin').hidden = account?.role !== 'owner';
}

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  const account = getAccount();
  if (auth && account?.mode === 'token') headers.Authorization = 'Bearer ' + account.token;
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = {};
  try { data = await response.json(); } catch {}
  return { ok: response.ok, status: response.status, data };
}

$('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const username = el.username.value.trim().toLowerCase();
  const password = el.password.value;
  const apiKey = el.apiKey.value.trim();
  if (needKey && !/^sk-\S{20,}$/.test(apiKey)) { el.accountMsg.textContent = t('keyFormat'); return; }
  el.accountMsg.textContent = t('checking');
  let result;
  try { result = await api('/login', { method: 'POST', auth: false, body: { username, password, apiKey: needKey ? apiKey : undefined } }); }
  catch { el.accountMsg.textContent = t('err_unreachable'); return; }
  if (result.status === 409 && result.data.error === 'need_key') {
    needKey = true;
    renderAccount();
    el.accountMsg.textContent = t('firstLoginKey');
    el.apiKey.focus();
    return;
  }
  if (!result.ok) {
    el.accountMsg.textContent = result.data.error === 'key_format' ? t('keyFormat')
      : result.data.error === 'too_many' ? t('err_too_many') : t('wrongLogin');
    return;
  }
  clearAccount();
  store.set('mode', 'token');
  store.set('token', result.data.token);
  store.set('role', result.data.role);
  store.set('username', result.data.username);
  needKey = false;
  el.password.value = '';
  el.apiKey.value = '';
  el.accountMsg.textContent = t('loginOk');
  renderAccount();
  if (result.data.role === 'owner') loadUsers();
  else el.account.open = false;
});

$('#logout').addEventListener('click', async () => {
  const account = getAccount();
  if (account?.mode === 'token') api('/logout', { method: 'POST' }).catch(() => {});
  clearAccount();
  needKey = false;
  el.accountMsg.textContent = t('loggedOut');
  renderAccount();
});
$('#show-change-key').addEventListener('click', () => {
  // Changing the stored key needs the password, because the key is encrypted with it.
  el.username.value = store.get('username') ?? '';
  needKey = true;
  renderAccount();
  el.accountMsg.textContent = t('changeKeyHint');
  el.password.focus();
});
$('#show-change-password').addEventListener('click', () => {
  $('#password-form').hidden = false;
  $('#pw-username').value = store.get('username') ?? '';
  $('#current-password').focus();
});
$('#cancel-password').addEventListener('click', () => { $('#password-form').reset(); $('#password-form').hidden = true; });
$('#password-form').addEventListener('submit', async event => {
  event.preventDefault();
  const newPassword = $('#new-password-1').value;
  if (newPassword !== $('#new-password-2').value) { el.accountMsg.textContent = t('passwordMismatch'); return; }
  if (!/^[!-~]{10,128}$/.test(newPassword)) { el.accountMsg.textContent = t('passwordRule'); return; }
  el.accountMsg.textContent = t('checking');
  let result;
  try {
    result = await api('/account/password', { method: 'POST', auth: false, body: {
      username: store.get('username'), password: $('#current-password').value, newPassword,
    } });
  } catch { el.accountMsg.textContent = t('err_unreachable'); return; }
  if (result.ok) {
    store.set('token', result.data.token);
    $('#password-form').reset();
    $('#password-form').hidden = true;
    el.accountMsg.textContent = t('passwordChanged');
  } else if (result.data.error === 'need_key') {
    // Password changed, but there was no key to keep: log in again and enter one.
    clearAccount();
    renderAccount();
    el.accountMsg.textContent = t('passwordChanged') + ' ' + t('firstLoginKey');
  } else {
    el.accountMsg.textContent = result.data.error === 'weak_password' ? t('passwordRule')
      : result.data.error === 'too_many' ? t('err_too_many') : t('wrongCurrentPassword');
  }
});
$('#save-own-key').addEventListener('click', () => {
  const key = $('#own-key').value.trim();
  if (!/^sk-\S{20,}$/.test(key)) { el.accountMsg.textContent = t('keyFormat'); return; }
  clearAccount();
  store.set('mode', 'own');
  store.set('apiKey', key);
  $('#own-key').value = '';
  el.accountMsg.textContent = t('saved');
  renderAccount();
});

// ----- Admin: manage users -----
function showAdminError(data) {
  $('#admin-msg').textContent = t('adminErr_' + (data.error ?? 'generic'));
}
async function loadUsers() {
  const list = $('#user-list');
  const result = await api('/admin/users').catch(() => ({ ok: false, data: {} }));
  if (!result.ok) {
    if (result.status === 403) { clearAccount(); renderAccount(); el.accountMsg.textContent = t('err_login_required'); }
    else showAdminError(result.data);
    return;
  }
  list.replaceChildren();
  if (!result.data.users.length) {
    list.append(Object.assign(document.createElement('li'), { className: 'hint', textContent: t('noUsers') }));
  }
  for (const user of result.data.users) {
    const item = document.createElement('li');
    const info = document.createElement('div');
    const name = Object.assign(document.createElement('strong'), { textContent: user.username });
    const meta = Object.assign(document.createElement('span'), {
      className: 'hint',
      textContent: (user.hasKey ? t('userHasKey') : t('userNoKey')) + (user.lastLogin ? ' · ' + t('lastLogin', { date: user.lastLogin.slice(0, 10) }) : ''),
    });
    info.append(name, document.createElement('br'), meta);
    const reset = Object.assign(document.createElement('button'), { type: 'button', textContent: t('resetPassword') });
    reset.addEventListener('click', () => adminAction('reset', user.username));
    const remove = Object.assign(document.createElement('button'), { type: 'button', textContent: t('deleteUser') });
    remove.addEventListener('click', () => {
      if (remove.dataset.confirm) return adminAction('delete', user.username);
      remove.dataset.confirm = '1';
      remove.textContent = t('confirmDelete');
      setTimeout(() => { delete remove.dataset.confirm; remove.textContent = t('deleteUser'); }, 4000);
    });
    const actions = document.createElement('div');
    actions.className = 'controls';
    actions.append(reset, remove);
    item.append(info, actions);
    list.append(item);
  }
}
async function adminAction(action, username) {
  $('#admin-msg').textContent = '';
  const result = await api('/admin/users/' + action, { method: 'POST', body: { username } }).catch(() => ({ ok: false, data: {} }));
  if (!result.ok) return showAdminError(result.data);
  const box = $('#new-password');
  if (result.data.password) {
    box.replaceChildren(
      Object.assign(document.createElement('p'), { textContent: t('shareCredentials') }),
      Object.assign(document.createElement('pre'), { textContent: `${location.origin}\n${t('username')}: ${result.data.username}\n${t('password')}: ${result.data.password}` }),
      Object.assign(document.createElement('p'), { className: 'hint', textContent: t('passwordOnce') }),
    );
    const copy = Object.assign(document.createElement('button'), { type: 'button', textContent: t('copy') });
    copy.addEventListener('click', () => navigator.clipboard?.writeText(box.querySelector('pre').textContent).then(() => { copy.textContent = t('copied'); }));
    box.append(copy);
    box.hidden = false;
  } else {
    box.hidden = true;
  }
  loadUsers();
}
$('#new-user-form').addEventListener('submit', async event => {
  event.preventDefault();
  const username = $('#new-username').value.trim().toLowerCase();
  if (!/^[a-z0-9._-]{2,32}$/.test(username)) { $('#admin-msg').textContent = t('adminErr_bad_username'); return; }
  await adminAction('create', username);
  $('#new-username').value = '';
});
$('#admin').addEventListener('toggle', () => { if ($('#admin').open) loadUsers(); });

function initAccount() {
  // Logins from v1.3 and earlier (admin password stored on device) are no longer valid.
  if (store.get('mode') === 'owner') clearAccount();
  if (!getAccount()) el.account.open = true;
  renderAccount();
}

// ---------- API key help ----------
const HELP_STEPS = [
  ['help1', 'https://platform.openai.com/'],
  ['help2', 'https://platform.openai.com/settings/organization/billing/overview'],
  ['help3', 'https://platform.openai.com/api-keys'],
  ['help4'], ['help5'],
];
const HELP_TIPS = [['tip1'], ['tip2', 'https://platform.openai.com/settings/organization/usage'], ['tip3'], ['tip4']];
function renderHelp() {
  const fill = (list, items) => list.replaceChildren(...items.map(([key, url]) => {
    const item = document.createElement('li');
    item.append(t(key));
    if (url) {
      item.append(' ', Object.assign(document.createElement('a'), {
        href: url, target: '_blank', rel: 'noopener noreferrer', textContent: t('helpLink'),
      }));
    }
    return item;
  }));
  fill($('#help-steps'), HELP_STEPS);
  fill($('#help-tips'), HELP_TIPS);
}
for (const button of document.querySelectorAll('[data-help]')) {
  button.addEventListener('click', () => { renderHelp(); $('#key-help').showModal(); });
}
$('#key-help').addEventListener('click', event => {
  if (event.target === $('#key-help')) $('#key-help').close(); // tap outside closes
});

// ---------- Transcript ----------
const PARAGRAPH_GAP_MS = 1500;   // pause that starts a new paragraph
const FLUSH_TIMEOUT_MS = 4000;   // how long to wait for the last segment after closing a connection
const IDLE_STOP_MS = 3 * 60_000;  // auto-stop after this much silence
const RETRY_DELAYS = [1000, 3000, 6000, 10000];

const boxes = {
  'session.input_transcript.delta': { el: el.source, last: 0 },
  'session.output_transcript.delta': { el: el.target, last: 0 },
};
function appendText(entry, text) {
  const box = entry.el;
  const now = Date.now();
  const follow = box.scrollHeight - box.clientHeight - box.scrollTop < 40;
  if (entry.last && now - entry.last > PARAGRAPH_GAP_MS && box.textContent && !box.textContent.endsWith('\n')) {
    box.append('\n\n');
  }
  entry.last = now;
  box.append(text);
  if (follow) box.scrollTop = box.scrollHeight;
}
function updateTranscriptButtons() {
  const hasText = Boolean(el.source.textContent || el.target.textContent);
  el.download.disabled = !hasText;
  el.clear.disabled = !hasText || Boolean(recording);
}

// ---------- Recording (one mic stream, a chain of OpenAI connections) ----------
let recording;

class SessionError extends Error {
  constructor(message, { fatal = false } = {}) { super(message); this.fatal = fatal; }
}

function finish(rec, key, vars) {
  if (!rec || recording !== rec) return;
  recording = undefined;
  for (const conn of [...rec.conns]) closeConn(rec, conn);
  clearInterval(rec.clockTimer);
  clearInterval(rec.idleTimer);
  clearTimeout(rec.retryTimer);
  clearTimeout(rec.stopTimer);
  rec.stream?.getTracks().forEach(track => track.stop());
  rec.wakeLock?.release().catch(() => {});
  el.audio.pause();
  el.audio.srcObject = null;
  el.audio.muted = true;
  el.start.disabled = false;
  el.stop.disabled = true;
  el.stop.textContent = t('stop');
  el.sound.disabled = true;
  el.sound.setAttribute('aria-pressed', 'false');
  el.sound.textContent = t('playVoice');
  el.noise.disabled = false;
  setStatus(key, vars);
  updateTranscriptButtons();
}

function closeConn(rec, conn) {
  if (conn.closed) return;
  conn.closed = true;
  clearTimeout(conn.connectTimer);
  clearTimeout(conn.rolloverTimer);
  clearTimeout(conn.flushTimer);
  conn.abort.abort();
  try { conn.peer.close(); } catch {}
  rec.conns.delete(conn);
  if (rec.current === conn) rec.current = undefined;
  if (rec.stopping && rec.conns.size === 0) finish(rec, rec.stopKey);
}

// Ask OpenAI to flush what it already heard, then close.
function retire(rec, conn) {
  if (conn.closed) return;
  if (conn.channel.readyState !== 'open') return closeConn(rec, conn);
  conn.retiring = true;
  try { conn.channel.send(JSON.stringify({ type: 'session.close' })); } catch { return closeConn(rec, conn); }
  conn.flushTimer = setTimeout(() => closeConn(rec, conn), FLUSH_TIMEOUT_MS);
}

function gracefulStop(rec, key) {
  if (!rec || recording !== rec) return;
  if (rec.stopping) return finish(rec, key);
  rec.stopping = true;
  rec.stopKey = key;
  clearTimeout(rec.retryTimer);
  rec.stream?.getAudioTracks().forEach(track => { track.enabled = false; });
  el.stop.textContent = t('stopNow');
  setStatus('finishing');
  for (const conn of [...rec.conns]) retire(rec, conn);
  if (rec.conns.size === 0) return finish(rec, key);
  rec.stopTimer = setTimeout(() => finish(rec, key), FLUSH_TIMEOUT_MS + 500);
}

function connectionLost(rec, conn) {
  if (conn.closed || recording !== rec) return;
  const wasCurrent = rec.current === conn;
  const wasPending = !conn.ready;
  const retiring = conn.retiring;
  closeConn(rec, conn);
  if (rec.stopping || retiring) return;
  if (wasCurrent || (wasPending && !rec.current)) scheduleReconnect(rec);
  else if (wasPending) scheduleRollover(rec, 30_000); // handover failed; old one still runs
}

function scheduleReconnect(rec) {
  if (recording !== rec || rec.stopping || rec.retryTimer) return;
  const attempt = ++rec.retries;
  if (attempt > RETRY_DELAYS.length) return finish(rec, 'gaveUp');
  setStatus('reconnecting', { n: attempt });
  rec.retryTimer = setTimeout(() => {
    rec.retryTimer = undefined;
    openConnection(rec);
  }, RETRY_DELAYS[attempt - 1]);
}

function scheduleRollover(rec, delay) {
  const conn = rec.current;
  if (!conn) return;
  clearTimeout(conn.rolloverTimer);
  conn.rolloverTimer = setTimeout(() => {
    if (recording === rec && !rec.stopping && rec.current === conn) openConnection(rec);
  }, delay);
}

function makeCurrent(rec, conn) {
  const previous = rec.current;
  rec.current = conn;
  rec.retries = 0;
  rec.hadLive = true;
  if (conn.remoteTrack) el.audio.srcObject = new MediaStream([conn.remoteTrack]);
  // Start a fresh connection a little before this one reaches the limit.
  scheduleRollover(rec, Math.max(60_000, serverConfig.maxMinutes * 60_000 - 30_000));
  if (previous && previous !== conn) retire(rec, previous);
  setStatus('live');
}

async function openConnection(rec) {
  if (recording !== rec || rec.stopping) return;
  const account = getAccount();
  if (!account) return finish(rec, 'needAccount');
  const conn = { abort: new AbortController() };
  const peer = new RTCPeerConnection();
  conn.peer = peer;
  rec.conns.add(conn);
  conn.connectTimer = setTimeout(() => connectionLost(rec, conn), 30_000);
  for (const track of rec.stream.getAudioTracks()) peer.addTrack(track, rec.stream);

  peer.addEventListener('track', event => {
    if (event.track.kind !== 'audio') return;
    conn.remoteTrack = event.track;
    if (rec.current === conn) el.audio.srcObject = new MediaStream([event.track]);
    el.sound.disabled = false;
  });
  peer.addEventListener('connectionstatechange', () => {
    const state = peer.connectionState;
    if (state === 'failed' || state === 'closed') connectionLost(rec, conn);
    else if (state === 'disconnected' && rec.current === conn && !rec.stopping) {
      // Often transient on mobile networks; give it a moment before replacing it.
      setStatus('unstable');
      setTimeout(() => { if (peer.connectionState === 'disconnected') connectionLost(rec, conn); }, 5000);
    } else if (state === 'connected' && rec.current === conn && !rec.stopping) setStatus('live');
  });

  const channel = peer.createDataChannel('oai-events');
  conn.channel = channel;
  channel.addEventListener('open', () => {
    if (conn.closed || recording !== rec) return;
    clearTimeout(conn.connectTimer);
    conn.ready = true;
    if (rec.stopping) return retire(rec, conn);
    if (!rec.clockTimer) startClock(rec);
    makeCurrent(rec, conn);
  });
  channel.addEventListener('close', () => connectionLost(rec, conn));
  channel.addEventListener('message', event => {
    if (recording !== rec) return;
    let data;
    try { data = JSON.parse(event.data); } catch { return; }
    if (data.type === 'session.closed') { if (conn.retiring) closeConn(rec, conn); else connectionLost(rec, conn); return; }
    if (data.type === 'error') {
      // Before the first successful connection, show the error. Later ones are logged only;
      // if the session really died, the channel closes and we reconnect.
      console.warn('Realtime error', data.error);
      if (!rec.hadLive) { closeConn(rec, conn); finish(rec, 'serviceError', { detail: data.error?.message ?? '' }); }
      return;
    }
    const entry = boxes[data.type];
    if (entry && typeof data.delta === 'string') {
      appendText(entry, data.delta);
      rec.lastSpeech = Date.now();
      updateTranscriptButtons();
    }
  });

  try {
    await peer.setLocalDescription(await peer.createOffer());
    const secretResponse = await fetch('/session', {
      method: 'POST',
      headers: { 'X-Interpreter-Request': 'start', 'Content-Type': 'application/json', ...authHeaders(account) },
      body: JSON.stringify({ language: el.language.value, noise: el.noise.value }),
      signal: conn.abort.signal,
    });
    if (!secretResponse.ok) {
      let body = {};
      try { body = await secretResponse.json(); } catch {}
      const code = body.error ?? 'generic';
      const fatal = ['login_required', 'key_format', 'key_invalid', 'key_no_access', 'key_quota', 'own_key_disabled', 'bad_request'].includes(code);
      throw new SessionError(t('err_' + code, { status: body.status ?? secretResponse.status }), { fatal });
    }
    const { value } = await secretResponse.json();
    const call = await fetch('https://api.openai.com/v1/realtime/translations/calls', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + value, 'Content-Type': 'application/sdp' },
      body: peer.localDescription.sdp,
      signal: conn.abort.signal,
    });
    if (!call.ok) throw new SessionError(t('callFailed', { status: call.status }));
    const answer = await call.text();
    if (conn.closed) return;
    await peer.setRemoteDescription({ type: 'answer', sdp: answer });
  } catch (error) {
    if (conn.closed) return;
    console.warn('Connection attempt failed', error);
    if (error.fatal || !rec.hadLive) {
      closeConn(rec, conn);
      return finish(rec, 'serviceError', { detail: error.message || t('err_generic') });
    }
    connectionLost(rec, conn);
  }
}

function startClock(rec) {
  rec.began = Date.now();
  const tick = () => {
    const s = Math.floor((Date.now() - rec.began) / 1000);
    const hh = Math.floor(s / 3600);
    const mm = String(Math.floor(s / 60) % 60).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    el.clock.textContent = hh ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
  };
  tick();
  rec.clockTimer = setInterval(tick, 1000);
}

async function requestWakeLock(rec) {
  try {
    if ('wakeLock' in navigator) rec.wakeLock = await navigator.wakeLock.request('screen');
  } catch { /* Not supported or denied; the session still works. */ }
}

el.start.addEventListener('click', async () => {
  if (recording) return;
  if (!getAccount()) { el.account.open = true; setStatus('needAccount'); return; }
  if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) { setStatus('noSupport'); return; }
  const rec = { conns: new Set(), retries: 0, lastSpeech: Date.now() };
  recording = rec;
  el.start.disabled = true;
  el.stop.disabled = false;
  el.noise.disabled = true;
  el.clock.textContent = '';
  updateTranscriptButtons();
  setStatus('micWait');
  try {
    rec.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch (error) {
    return finish(rec, error.name === 'NotAllowedError' ? 'micDenied' : 'noSupport');
  }
  if (recording !== rec) { rec.stream.getTracks().forEach(track => track.stop()); return; }
  for (const track of rec.stream.getAudioTracks()) {
    track.addEventListener('ended', () => finish(rec, 'micEnded'));
  }
  if (el.source.textContent || el.target.textContent) {
    for (const entry of Object.values(boxes)) if (entry.el.textContent) entry.el.append('\n\n———\n\n');
  }
  for (const entry of Object.values(boxes)) entry.last = 0;
  requestWakeLock(rec);
  rec.idleTimer = setInterval(() => {
    if (Date.now() - rec.lastSpeech > IDLE_STOP_MS) gracefulStop(rec, 'idleStop');
  }, 15_000);
  setStatus('connecting');
  openConnection(rec);
});

el.stop.addEventListener('click', () => gracefulStop(recording, 'stopped'));
window.addEventListener('pagehide', () => finish(recording, 'stopped'));
document.addEventListener('visibilitychange', () => {
  // iOS suspends the microphone in the background, so end cleanly instead of hanging.
  if (document.hidden) finish(recording, 'hidden');
});

el.sound.addEventListener('click', async () => {
  const rec = recording;
  el.audio.muted = !el.audio.muted;
  const enabled = !el.audio.muted;
  el.sound.setAttribute('aria-pressed', String(enabled));
  el.sound.textContent = enabled ? t('mute') : t('playVoice');
  if (!enabled) { el.audio.pause(); return; }
  try { await el.audio.play(); } catch {
    if (recording !== rec) return;
    el.audio.muted = true;
    el.sound.setAttribute('aria-pressed', 'false');
    el.sound.textContent = t('playVoice');
    setStatus('playFailed');
  }
});

el.language.addEventListener('change', () => {
  store.set('language', el.language.value);
  const conn = recording?.current;
  // Switch the target language of the running connection without reconnecting.
  if (conn?.channel.readyState === 'open' && !recording.stopping) {
    conn.channel.send(JSON.stringify({
      type: 'session.update',
      session: { audio: { output: { language: el.language.value } } },
    }));
    appendText(boxes['session.output_transcript.delta'],
      '\n\n' + t('switchedTo', { lang: LANGUAGE_NAMES[el.language.value] ?? el.language.value }) + '\n\n');
  }
});
el.noise.addEventListener('change', () => store.set('noise', el.noise.value));
el.uiLang.addEventListener('change', () => {
  uiLang = el.uiLang.value;
  store.set('uiLang', uiLang);
  applyUiLang();
});

function setFontSize(rem) {
  const size = Math.min(2.6, Math.max(0.9, rem));
  el.target.style.fontSize = size + 'rem';
  store.set('fontSize', String(size));
}
$('#smaller').addEventListener('click', () => setFontSize(parseFloat(el.target.style.fontSize || '1.3') - 0.2));
$('#bigger').addEventListener('click', () => setFontSize(parseFloat(el.target.style.fontSize || '1.3') + 0.2));

el.download.addEventListener('click', () => {
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const text = `${t('exportTitle')} ${stamp}\n\n== ${t('translation')} ==\n${el.target.textContent}\n\n== ${t('original')} ==\n${el.source.textContent}\n`;
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = Object.assign(document.createElement('a'), {
    href: url, download: `interpreter-${stamp.replace(/[: ]/g, '-')}.txt`,
  });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
});
el.clear.addEventListener('click', () => {
  el.source.textContent = '';
  el.target.textContent = '';
  updateTranscriptButtons();
});

async function init() {
  el.uiLang.value = uiLang;
  try {
    const response = await fetch('/config');
    if (response.ok) serverConfig = { ...serverConfig, ...(await response.json()) };
  } catch {}
  for (const code of serverConfig.languages) el.language.append(new Option(LANGUAGE_NAMES[code] ?? code, code));
  const savedLanguage = store.get('language', 'zh');
  el.language.value = serverConfig.languages.includes(savedLanguage) ? savedLanguage : 'zh';
  el.noise.value = store.get('noise', 'near_field');
  if (!el.noise.value) el.noise.value = 'near_field';
  const size = parseFloat(store.get('fontSize', '1.3'));
  if (size) setFontSize(size);
  if (serverConfig.version) $('#version').textContent = 'v' + serverConfig.version;
  initAccount();
  applyUiLang();
}
init();
