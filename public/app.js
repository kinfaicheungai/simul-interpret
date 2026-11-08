'use strict';
const $ = selector => document.querySelector(selector);
const el = {
  start: $('#start'), stop: $('#stop'), sound: $('#sound'), status: $('#status'), clock: $('#clock'),
  audio: $('#audio'), language: $('#language'), noise: $('#noise'), download: $('#download'),
  clear: $('#clear'), source: $('#source'), target: $('#target'), uiLang: $('#ui-lang'),
  account: $('#account'), accountState: $('#account-state'), apiKey: $('#api-key'),
  password: $('#password'), accountMsg: $('#account-msg'),
};

// ---------- Interface language ----------
const STRINGS = {
  'zh-Hant': {
    uiLanguage: '介面語言',
    title: '即時傳譯', lead: '按開始後講嘢，網頁會持續收音，逐段顯示原文同譯文。請保持畫面喺前景。',
    account: '帳戶', notSet: '未設定', ownKeySet: '自己嘅 API key（…{last}）', ownerSet: '管理員',
    modeOwn: '用我自己嘅 OpenAI API key', modeOwner: '管理員密碼',
    apiKey: 'OpenAI API key', apiKeyHint: 'Key 只會儲存喺呢部裝置，每次連線時經伺服器轉交 OpenAI，唔會被記錄。費用由你嘅 OpenAI 帳戶支付。',
    password: '密碼', save: '儲存', forget: '清除', saved: '已儲存。', forgotten: '已清除。',
    checking: '檢查緊…', wrongPassword: '密碼唔啱。', keyFormat: 'API key 應該以 sk- 開頭。',
    translateTo: '譯成', micDistance: '咪高峰距離',
    near: '近距離（講者拎住電話）', far: '遠距離（電話擺喺枱面）', noiseOff: '關閉降噪',
    start: '開始收音', stop: '停止', stopNow: '即刻結束', playVoice: '播放譯音', mute: '靜音',
    translation: '譯文', original: '原文', download: '下載字幕 (.txt)', clear: '清除字幕',
    note: '收音期間，聲音會傳送到 OpenAI 處理，按使用時間收費。播放譯音時請戴耳機，減少回音。可以無限時連續使用；連續 3 分鐘冇人講嘢會自動停止。網站唔會儲存錄音或字幕。',
    idle: '等候開始', needAccount: '請先喺「帳戶」設定你嘅 API key 或密碼。',
    noSupport: '呢個瀏覽器唔支援收音或 WebRTC。請用 Safari / Chrome 開啟 HTTPS 網址。',
    micWait: '等候咪高峰權限…', connecting: '正在連接翻譯服務…', live: '收音及翻譯中',
    reconnecting: '連線中斷，自動重新連接中（第 {n} 次）…', unstable: '網絡不穩，嘗試恢復…',
    finishing: '正在完成最後一段翻譯…', stopped: '已停止收音。', idleStop: '連續 3 分鐘冇聲，已自動停止。',
    hidden: '畫面已離開前景，已停止收音。', micDenied: '未能使用咪高峰。請喺瀏覽器網站設定允許咪高峰，再試一次。',
    micEnded: '咪高峰已中斷，請再按開始。', gaveUp: '多次重新連接失敗，已停止。請檢查網絡後再開始。',
    playFailed: '瀏覽器未能播放語音，請再按播放。字幕會繼續更新。', switchedTo: '［改為譯成 {lang}］',
    serviceError: '翻譯服務出錯：{detail}', callFailed: '翻譯連線失敗（{status}）。',
    err_login_required: '密碼無效或已更改，請喺「帳戶」重新輸入。', err_key_format: 'API key 格式唔啱。',
    err_key_invalid: 'OpenAI 拒絕咗呢個 API key（無效或已停用）。', err_key_no_access: '呢個 API key 冇 Realtime Translation 權限。',
    err_key_quota: 'OpenAI 額度不足或請求太多，請檢查帳戶用量同付款設定。', err_too_many: '連線次數太多，請等一分鐘再試。',
    err_own_key_disabled: '呢個網站冇開放自備 API key。', err_unreachable: '暫時連接唔到 OpenAI，請稍後再試。',
    err_upstream: 'OpenAI 連線憑證申請失敗（{status}）。', err_generic: '未能開始，請再試一次。',
    exportTitle: '即時傳譯字幕',
  },
  'zh-Hans': {
    uiLanguage: '界面语言',
    title: '实时传译', lead: '按开始后说话，网页会持续收音，逐段显示原文和译文。请保持画面在前台。',
    account: '账户', notSet: '未设置', ownKeySet: '自己的 API key（…{last}）', ownerSet: '管理员',
    modeOwn: '使用我自己的 OpenAI API key', modeOwner: '管理员密码',
    apiKey: 'OpenAI API key', apiKeyHint: 'Key 只保存在这台设备上，每次连接时经服务器转交 OpenAI，不会被记录。费用由你的 OpenAI 账户支付。',
    password: '密码', save: '保存', forget: '清除', saved: '已保存。', forgotten: '已清除。',
    checking: '检查中…', wrongPassword: '密码不正确。', keyFormat: 'API key 应以 sk- 开头。',
    translateTo: '译成', micDistance: '麦克风距离',
    near: '近距离（讲者拿着手机）', far: '远距离（手机放在桌上）', noiseOff: '关闭降噪',
    start: '开始收音', stop: '停止', stopNow: '立即结束', playVoice: '播放译音', mute: '静音',
    translation: '译文', original: '原文', download: '下载字幕 (.txt)', clear: '清除字幕',
    note: '收音期间，声音会发送到 OpenAI 处理，按使用时间计费。播放译音时请戴耳机，减少回声。可无限时连续使用；连续 3 分钟没人说话会自动停止。网站不会保存录音或字幕。',
    idle: '等待开始', needAccount: '请先在「账户」设置你的 API key 或密码。',
    noSupport: '此浏览器不支持收音或 WebRTC。请用 Safari / Chrome 打开 HTTPS 网址。',
    micWait: '等待麦克风权限…', connecting: '正在连接翻译服务…', live: '收音及翻译中',
    reconnecting: '连接中断，正在自动重连（第 {n} 次）…', unstable: '网络不稳定，尝试恢复…',
    finishing: '正在完成最后一段翻译…', stopped: '已停止收音。', idleStop: '连续 3 分钟没有声音，已自动停止。',
    hidden: '画面已离开前台，已停止收音。', micDenied: '无法使用麦克风。请在浏览器网站设置中允许麦克风，再试一次。',
    micEnded: '麦克风已中断，请再按开始。', gaveUp: '多次重连失败，已停止。请检查网络后再开始。',
    playFailed: '浏览器未能播放语音，请再按播放。字幕会继续更新。', switchedTo: '［改为译成 {lang}］',
    serviceError: '翻译服务出错：{detail}', callFailed: '翻译连接失败（{status}）。',
    err_login_required: '密码无效或已更改，请在「账户」重新输入。', err_key_format: 'API key 格式不正确。',
    err_key_invalid: 'OpenAI 拒绝了这个 API key（无效或已停用）。', err_key_no_access: '这个 API key 没有 Realtime Translation 权限。',
    err_key_quota: 'OpenAI 额度不足或请求过多，请检查账户用量和付款设置。', err_too_many: '连接次数过多，请等一分钟再试。',
    err_own_key_disabled: '本网站未开放自备 API key。', err_unreachable: '暂时无法连接 OpenAI，请稍后再试。',
    err_upstream: 'OpenAI 连接凭证申请失败（{status}）。', err_generic: '未能开始，请再试一次。',
    exportTitle: '实时传译字幕',
  },
  en: {
    uiLanguage: 'Interface language',
    title: 'Live Interpreter', lead: 'Press Start and speak. The page keeps listening and shows the original and the translation as you go. Keep the screen in the foreground.',
    account: 'Account', notSet: 'not set', ownKeySet: 'own API key (…{last})', ownerSet: 'admin',
    modeOwn: 'Use my own OpenAI API key', modeOwner: 'Admin password',
    apiKey: 'OpenAI API key', apiKeyHint: 'Your key is stored only on this device and passed to OpenAI through the server for each connection. It is never logged. Usage is billed to your OpenAI account.',
    password: 'Password', save: 'Save', forget: 'Clear', saved: 'Saved.', forgotten: 'Cleared.',
    checking: 'Checking…', wrongPassword: 'Wrong password.', keyFormat: 'The API key should start with sk-.',
    translateTo: 'Translate to', micDistance: 'Microphone distance',
    near: 'Near (speaker holds the phone)', far: 'Far (phone on the table)', noiseOff: 'Noise reduction off',
    start: 'Start', stop: 'Stop', stopNow: 'End now', playVoice: 'Play voice', mute: 'Mute',
    translation: 'Translation', original: 'Original', download: 'Download (.txt)', clear: 'Clear',
    note: 'While listening, audio is sent to OpenAI and billed by time. Use headphones when playing the voice to avoid echo. Runs as long as you need; it stops by itself after 3 minutes of silence. Nothing is stored on this site.',
    idle: 'Ready', needAccount: 'Set your API key or password under “Account” first.',
    noSupport: 'This browser does not support microphone or WebRTC. Open the HTTPS address in Safari or Chrome.',
    micWait: 'Waiting for microphone permission…', connecting: 'Connecting…', live: 'Listening and translating',
    reconnecting: 'Connection lost, reconnecting (attempt {n})…', unstable: 'Network unstable, recovering…',
    finishing: 'Finishing the last segment…', stopped: 'Stopped.', idleStop: 'Stopped after 3 minutes of silence.',
    hidden: 'Stopped because the page left the foreground.', micDenied: 'Microphone blocked. Allow it in the browser’s site settings and try again.',
    micEnded: 'Microphone disconnected. Press Start again.', gaveUp: 'Reconnecting failed several times. Check the network and start again.',
    playFailed: 'The browser could not play audio. Press play again; subtitles keep updating.', switchedTo: '[Now translating to {lang}]',
    serviceError: 'Translation service error: {detail}', callFailed: 'Connection failed ({status}).',
    err_login_required: 'Password invalid or changed. Re-enter it under “Account”.', err_key_format: 'API key format is invalid.',
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
  el.stop.textContent = recording?.stopping ? t('stopNow') : t('stop');
  el.sound.textContent = el.audio.muted ? t('playVoice') : t('mute');
  setStatus(statusState.key, statusState.vars);
  renderAccount();
}

// ---------- Account ----------
const OWNER_USER = 'interpreter';
let serverConfig = { maxMinutes: 30, languages: Object.keys(LANGUAGE_NAMES), ownerEnabled: true, ownKeyEnabled: true };

function getAccount() {
  const mode = store.get('mode');
  if (mode === 'own' && store.get('apiKey')) return { mode, apiKey: store.get('apiKey') };
  if (mode === 'owner' && store.get('password')) return { mode, password: store.get('password') };
  return null;
}
function authHeaders(account) {
  if (account.mode === 'own') return { 'X-OpenAI-Key': account.apiKey };
  return { Authorization: 'Basic ' + btoa(OWNER_USER + ':' + account.password) };
}
function selectedMode() { return document.querySelector('input[name=mode]:checked')?.value; }
function renderAccount() {
  const account = getAccount();
  el.accountState.textContent = !account ? t('notSet')
    : account.mode === 'own' ? t('ownKeySet', { last: account.apiKey.slice(-4) }) : t('ownerSet');
  const mode = selectedMode();
  $('#own-fields').hidden = mode !== 'own';
  $('#owner-fields').hidden = mode !== 'owner';
}
function initAccount() {
  $('#choice-owner').hidden = !serverConfig.ownerEnabled;
  $('#choice-own').hidden = !serverConfig.ownKeyEnabled;
  const account = getAccount();
  const mode = account?.mode ?? (serverConfig.ownKeyEnabled ? 'own' : 'owner');
  const radio = document.querySelector(`input[name=mode][value=${mode}]`);
  if (radio) radio.checked = true;
  if (!account) el.account.open = true;
  renderAccount();
}
for (const radio of document.querySelectorAll('input[name=mode]')) radio.addEventListener('change', renderAccount);

$('#save-account').addEventListener('click', async () => {
  const mode = selectedMode();
  if (mode === 'own') {
    const key = el.apiKey.value.trim();
    if (!/^sk-\S{20,}$/.test(key)) { el.accountMsg.textContent = t('keyFormat'); return; }
    store.set('mode', 'own'); store.set('apiKey', key); store.remove('password');
  } else if (mode === 'owner') {
    const password = el.password.value;
    el.accountMsg.textContent = t('checking');
    let ok = false;
    try {
      const response = await fetch('/login', { method: 'POST', headers: authHeaders({ mode, password }) });
      ok = response.ok;
    } catch {}
    if (!ok) { el.accountMsg.textContent = t('wrongPassword'); return; }
    store.set('mode', 'owner'); store.set('password', password); store.remove('apiKey');
  }
  el.apiKey.value = '';
  el.password.value = '';
  el.accountMsg.textContent = t('saved');
  renderAccount();
  el.account.open = false;
});
$('#forget-account').addEventListener('click', () => {
  ['mode', 'apiKey', 'password'].forEach(store.remove);
  el.accountMsg.textContent = t('forgotten');
  renderAccount();
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
