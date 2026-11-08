const $ = selector => document.querySelector(selector);
const start = $('#start');
const stop = $('#stop');
const sound = $('#sound');
const statusText = $('#status');
const clock = $('#clock');
const audio = $('#audio');
const languageSelect = $('#language');
const noiseSelect = $('#noise');
const downloadButton = $('#download');
const clearButton = $('#clear');
const source = $('#source');
const target = $('#target');

const LANGUAGE_NAMES = {
  zh: '中文', en: 'English', ja: '日本語', ko: '한국어', es: 'Español', fr: 'Français',
  de: 'Deutsch', it: 'Italiano', pt: 'Português', ru: 'Русский', vi: 'Tiếng Việt',
  th: 'ไทย', id: 'Bahasa Indonesia', hi: 'हिन्दी', ar: 'العربية',
};
// A pause this long between deltas starts a new paragraph in the transcript.
const PARAGRAPH_GAP_MS = 1500;
// After 停止, wait this long for the last translated segment to arrive.
const FLUSH_TIMEOUT_MS = 4000;

const boxes = new Map([
  ['session.input_transcript.delta', { el: source, last: 0 }],
  ['session.output_transcript.delta', { el: target, last: 0 }],
]);
let maxMinutes = 10;
let active;

const store = {
  get(key, fallback) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch {} },
};

function setStatus(message) { statusText.textContent = message; }

function updateTranscriptButtons() {
  const hasText = Boolean(source.textContent || target.textContent);
  downloadButton.disabled = !hasText;
  clearButton.disabled = !hasText || Boolean(active);
}

function finish(message, run = active) {
  if (!run || active !== run) return;
  active = undefined;
  clearTimeout(run.connectTimer);
  clearTimeout(run.sessionTimer);
  clearTimeout(run.flushTimer);
  clearInterval(run.clockTimer);
  run.abort.abort();
  run.stream?.getTracks().forEach(track => track.stop());
  run.peer?.close();
  run.wakeLock?.release().catch(() => {});
  audio.pause();
  audio.srcObject = null;
  audio.muted = true;
  start.disabled = false;
  stop.disabled = true;
  stop.textContent = '停止';
  sound.disabled = true;
  sound.setAttribute('aria-pressed', 'false');
  sound.textContent = '播放譯音';
  noiseSelect.disabled = false;
  setStatus(message);
  updateTranscriptButtons();
}

// Ask the server to flush what it has already heard, then close.
function gracefulStop(message, run = active) {
  if (!run || active !== run) return;
  if (run.channel?.readyState !== 'open') return finish(message, run);
  if (run.stopping) return finish(message, run);
  run.stopping = true;
  run.stopMessage = message;
  run.stream?.getAudioTracks().forEach(track => { track.enabled = false; });
  stop.textContent = '即刻結束';
  setStatus('正在完成最後一段翻譯…');
  try { run.channel.send(JSON.stringify({ type: 'session.close' })); } catch { return finish(message, run); }
  run.flushTimer = setTimeout(() => finish(message, run), FLUSH_TIMEOUT_MS);
}

function appendDelta(entry, text) {
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

async function requestWakeLock(run) {
  try {
    if ('wakeLock' in navigator) run.wakeLock = await navigator.wakeLock.request('screen');
  } catch { /* Not supported or denied; the session still works. */ }
}

function startClock(run) {
  const began = Date.now();
  const tick = () => {
    const s = Math.floor((Date.now() - began) / 1000);
    clock.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')} / ${maxMinutes}:00`;
  };
  tick();
  run.clockTimer = setInterval(tick, 1000);
}

start.addEventListener('click', async () => {
  if (active) return;
  if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
    setStatus('呢個瀏覽器唔支援收音或 WebRTC。請用 Safari / Chrome 開啟 HTTPS 網址。');
    return;
  }
  const run = { abort: new AbortController() };
  active = run;
  start.disabled = true;
  stop.disabled = false;
  noiseSelect.disabled = true;
  clock.textContent = '';
  updateTranscriptButtons();
  setStatus('等候咪高峰權限…');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    if (active !== run) {
      stream.getTracks().forEach(track => track.stop());
      return;
    }
    run.stream = stream;
    run.connectTimer = setTimeout(() => finish('連線逾時，請再按開始。', run), 30_000);
    setStatus('正在連接翻譯服務…');
    const peer = new RTCPeerConnection();
    run.peer = peer;
    for (const track of stream.getAudioTracks()) {
      peer.addTrack(track, stream);
      track.addEventListener('ended', () => finish('咪高峰已中斷，請再按開始。', run));
    }
    peer.addEventListener('track', event => {
      if (active !== run || event.track.kind !== 'audio') return;
      audio.srcObject = new MediaStream([event.track]);
      sound.disabled = false;
    });
    peer.addEventListener('connectionstatechange', () => {
      if (['failed', 'closed'].includes(peer.connectionState)) {
        finish('連線已中斷，請再按開始。', run);
      } else if (peer.connectionState === 'disconnected' && !run.stopping) {
        // "disconnected" is often transient on mobile networks; give it a moment.
        setStatus('網絡不穩，嘗試重新連接…');
        setTimeout(() => {
          if (active === run && peer.connectionState === 'disconnected') finish('連線已中斷，請再按開始。', run);
        }, 5000);
      } else if (peer.connectionState === 'connected' && active === run && !run.stopping && run.ready) {
        setStatus('收音及翻譯中');
      }
    });

    const channel = peer.createDataChannel('oai-events');
    run.channel = channel;
    channel.addEventListener('open', () => {
      if (active !== run) return;
      clearTimeout(run.connectTimer);
      run.ready = true;
      run.sessionTimer = setTimeout(() => gracefulStop(`已到 ${maxMinutes} 分鐘上限，請重新開始。`, run), maxMinutes * 60_000);
      startClock(run);
      requestWakeLock(run);
      setStatus('收音及翻譯中');
    });
    channel.addEventListener('close', () => finish(run.stopMessage ?? '翻譯連線已結束。', run));
    channel.addEventListener('message', event => {
      if (active !== run) return;
      let data;
      try { data = JSON.parse(event.data); } catch { return; }
      if (data.type === 'error') {
        const detail = data.error?.message ? `：${data.error.message}` : '';
        console.warn('Realtime error', data.error);
        finish(`翻譯服務出錯${detail}`, run);
        return;
      }
      if (data.type === 'session.closed') {
        finish(run.stopMessage ?? '翻譯連線已結束。', run);
        return;
      }
      const entry = boxes.get(data.type);
      if (entry && typeof data.delta === 'string') {
        appendDelta(entry, data.delta);
        updateTranscriptButtons();
      }
    });

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    const signal = run.abort.signal;
    const secretResponse = await fetch('/session', {
      method: 'POST',
      headers: { 'X-Interpreter-Request': 'start', 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: languageSelect.value, noise: noiseSelect.value }),
      signal,
    });
    if (!secretResponse.ok) throw new Error(await secretResponse.text());
    const { value } = await secretResponse.json();
    const call = await fetch('https://api.openai.com/v1/realtime/translations/calls', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + value, 'Content-Type': 'application/sdp' },
      body: peer.localDescription.sdp,
      signal,
    });
    if (!call.ok) throw new Error('翻譯連線失敗（' + call.status + '）。請再試一次。');
    const answer = await call.text();
    if (active !== run) return;
    if (source.textContent || target.textContent) {
      // Keep earlier text, visually separated from the new session.
      for (const { el } of boxes.values()) if (el.textContent) el.append('\n\n———\n\n');
    }
    for (const entry of boxes.values()) entry.last = 0;
    await peer.setRemoteDescription({ type: 'answer', sdp: answer });
  } catch (error) {
    if (error.name === 'AbortError' && active !== run) return;
    const message = error.name === 'NotAllowedError'
      ? '未能使用咪高峰。請喺瀏覽器網站設定允許咪高峰，再試一次。'
      : error.message || '未能開始，請再試一次。';
    finish(message, run);
  }
});

stop.addEventListener('click', () => gracefulStop('已停止收音。'));
window.addEventListener('pagehide', () => finish('已停止收音。'));
document.addEventListener('visibilitychange', () => {
  // iOS suspends the microphone in the background, so end cleanly instead of hanging.
  if (document.hidden) finish('畫面已離開前景，已停止收音。');
});

sound.addEventListener('click', async () => {
  const run = active;
  audio.muted = !audio.muted;
  const enabled = !audio.muted;
  sound.setAttribute('aria-pressed', String(enabled));
  sound.textContent = enabled ? '靜音' : '播放譯音';
  if (!enabled) { audio.pause(); return; }
  try { await audio.play(); } catch {
    if (active !== run) return;
    audio.muted = true;
    sound.setAttribute('aria-pressed', 'false');
    sound.textContent = '播放譯音';
    setStatus('瀏覽器未能播放語音，請再按播放。字幕會繼續更新。');
  }
});

languageSelect.addEventListener('change', () => {
  store.set('language', languageSelect.value);
  // Switch the target language of a running session without reconnecting.
  if (active?.channel?.readyState === 'open' && !active.stopping) {
    active.channel.send(JSON.stringify({
      type: 'session.update',
      session: { audio: { output: { language: languageSelect.value } } },
    }));
    appendDelta(boxes.get('session.output_transcript.delta'), `\n\n［改為譯成 ${LANGUAGE_NAMES[languageSelect.value] ?? languageSelect.value}］\n\n`);
  }
});
noiseSelect.addEventListener('change', () => store.set('noise', noiseSelect.value));

function setFontSize(rem) {
  const size = Math.min(2.6, Math.max(0.9, rem));
  target.style.fontSize = size + 'rem';
  store.set('fontSize', String(size));
}
$('#smaller').addEventListener('click', () => setFontSize(parseFloat(target.style.fontSize || '1.3') - 0.2));
$('#bigger').addEventListener('click', () => setFontSize(parseFloat(target.style.fontSize || '1.3') + 0.2));

downloadButton.addEventListener('click', () => {
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const text = `即時傳譯字幕 ${stamp}\n\n== 譯文 ==\n${target.textContent}\n\n== 原文 ==\n${source.textContent}\n`;
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = Object.assign(document.createElement('a'), {
    href: url, download: `interpreter-${stamp.replace(/[: ]/g, '-')}.txt`,
  });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
});
clearButton.addEventListener('click', () => {
  source.textContent = '';
  target.textContent = '';
  updateTranscriptButtons();
});

async function init() {
  let languages = Object.keys(LANGUAGE_NAMES);
  try {
    const response = await fetch('/config');
    if (response.ok) {
      const config = await response.json();
      maxMinutes = config.maxMinutes ?? maxMinutes;
      languages = config.languages ?? languages;
    }
  } catch {}
  $('#max-min').textContent = String(maxMinutes);
  for (const code of languages) {
    languageSelect.append(new Option(LANGUAGE_NAMES[code] ?? code, code));
  }
  languageSelect.value = languages.includes(store.get('language', 'zh')) ? store.get('language', 'zh') : 'zh';
  noiseSelect.value = store.get('noise', 'near_field');
  if (!noiseSelect.value) noiseSelect.value = 'near_field';
  const size = parseFloat(store.get('fontSize', '1.3'));
  if (size) setFontSize(size);
}
init();
