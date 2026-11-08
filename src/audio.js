/* Aminas — procedural audio (no audio files). Starts only after a user gesture (iOS requirement). */
(function (root) {
  'use strict';
  const A = (root.A = root.A || {});
  const Au = (A.Audio = {});
  let ctx = null, master = null, musicGain = null, musicTimer = null, step = 0;
  Au.sfxOn = true; Au.musicOn = true; Au.mode = 'light';

  /* Phase 8 (iPhone sound fix):
     - iOS plays Web Audio as "ambient" sound by default, which the side (Ring/Silent) switch mutes completely. While
       the game's sound or music is on, the page tells iOS it plays audio the way a video does (Audio Session API,
       iOS 17+), so the silent switch no longer mutes it; with both off the session is handed back. Older iOS: a
       one-off silent <audio> clip in the first tap has the same effect.
     - A context can also be left "interrupted" (a call, Siri, another app's audio) or suspended. The old code only
       resumed "suspended", and only on button taps, so one interruption silenced the game until a reload. Every tap,
       touch or key now resumes it from any state that is not running.
     - The first tap also plays one silent sample through the context, which older iOS needs to start output. */
  let kicked = false, tagTried = false;
  const IOS = !!(root.navigator && (/iP(hone|ad|od)/.test(root.navigator.userAgent || '') || (root.navigator.platform === 'MacIntel' && root.navigator.maxTouchPoints > 1)));
  Au.sessionType = () => (root.navigator && root.navigator.audioSession ? root.navigator.audioSession.type : null);
  function session() {
    const n = root.navigator; if (!n || !n.audioSession) return false;
    const want = Au.sfxOn || Au.musicOn ? 'playback' : 'auto';
    try { if (n.audioSession.type !== want) n.audioSession.type = want; } catch (e) {}
    return true;
  }
  function silentTag() { // older iOS without navigator.audioSession: one silent clip switches the page to playback
    if (tagTried || !IOS) return; tagTried = true;
    try {
      const n = 800, b = new Uint8Array(44 + n), dv = new DataView(b.buffer), w = (o, s) => { for (let i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i); };
      w(0, 'RIFF'); dv.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); w(36, 'data'); dv.setUint32(40, n, true); b.fill(128, 44);
      let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
      const el = root.document.createElement('audio'); el.setAttribute('x-webkit-airplay', 'deny'); el.preload = 'auto'; el.src = 'data:audio/wav;base64,' + root.btoa(s);
      const p = el.play(); if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }
  function prime() { try { const b = ctx.createBuffer(1, 1, ctx.sampleRate), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); kicked = true; } catch (e) {} }
  function create() {
    const C = root.AudioContext || root.webkitAudioContext; if (!C) return false;
    ctx = new C(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.18; musicGain.connect(master);
    return true;
  }
  Au.unlock = function () {
    try {
      // the session type goes first, so the context starts in the right iOS audio category
      if (!session() && (Au.sfxOn || Au.musicOn)) silentTag();
      if (!ctx && !create()) return;
      if (ctx.state !== 'running' && ctx.state !== 'closed') { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); suspendedByUs = false; prime(); }
      else if (!kicked) prime();
      Au.applyMusic();
    } catch (e) { /* audio is optional */ }
  };
  // Cheap check for every tap, touch and key (see ui.js): only does anything when sound is not running yet.
  Au.wake = function () {
    if (ctx && ctx.state === 'running' && kicked) return;
    if (!Au.sfxOn && !Au.musicOn) return;
    if (root.document && root.document.hidden) return;
    Au.unlock();
  };
  Au.diag = () => ({ context: ctx ? ctx.state : 'not started', sampleRate: ctx ? ctx.sampleRate : 0, session: Au.sessionType() || 'not available', ios: IOS, silentClip: tagTried, sfx: Au.sfxOn, music: Au.musicOn });

  function tone(freq, t0, dur, type, vol, dest, slide) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || master); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function noise(t0, dur, vol) {
    const n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; g.gain.value = vol || 0.2; s.connect(g); g.connect(master); s.start(t0);
  }
  const N = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const SFX = {
    tap: (t) => tone(N(84), t, 0.07, 'triangle', 0.12),
    ok: (t) => { tone(N(76), t, 0.09, 'triangle', 0.15); tone(N(83), t + 0.07, 0.12, 'triangle', 0.15); },
    no: (t) => { tone(N(55), t, 0.12, 'square', 0.08); tone(N(52), t + 0.09, 0.16, 'square', 0.08); },
    feed: (t) => { tone(N(72), t, 0.08, 'sine', 0.18); tone(N(79), t + 0.07, 0.1, 'sine', 0.18); tone(N(84), t + 0.14, 0.14, 'sine', 0.16); },
    level: (t) => [72, 76, 79, 84, 88].forEach((m, i) => tone(N(m), t + i * 0.09, 0.22, 'triangle', 0.2)),
    discover: (t) => [67, 71, 74, 79, 83].forEach((m, i) => { tone(N(m), t + i * 0.08, 0.3, 'sine', 0.16); tone(N(m + 12), t + i * 0.08 + 0.02, 0.2, 'sine', 0.06); }),
    restore: (t) => { noise(t, 0.2, 0.12); [60, 64, 67, 72].forEach((m, i) => tone(N(m), t + 0.12 + i * 0.1, 0.35, 'triangle', 0.18)); },
    hit: (t) => { noise(t, 0.1, 0.25); tone(120, t, 0.12, 'square', 0.12, null, 60); },
    super: (t) => { noise(t, 0.16, 0.3); tone(200, t, 0.2, 'sawtooth', 0.14, null, 70); tone(N(79), t + 0.08, 0.15, 'triangle', 0.12); },
    weak: (t) => { tone(160, t, 0.12, 'sine', 0.1, null, 120); },
    heal: (t) => [72, 76, 79].forEach((m, i) => tone(N(m), t + i * 0.07, 0.2, 'sine', 0.16)),
    guard: (t) => tone(N(60), t, 0.2, 'triangle', 0.15),
    faint: (t) => tone(300, t, 0.5, 'sine', 0.18, null, 80),
    win: (t) => [67, 72, 76, 79, 84].forEach((m, i) => tone(N(m), t + i * 0.12, 0.35, 'triangle', 0.2)),
    lose: (t) => [67, 63, 60, 55].forEach((m, i) => tone(N(m), t + i * 0.18, 0.4, 'sine', 0.16)),
    hatch: (t) => { noise(t, 0.08, 0.2); [76, 79, 83, 88, 91].forEach((m, i) => tone(N(m), t + 0.1 + i * 0.07, 0.25, 'sine', 0.16)); },
    hum: (t) => tone(N(57), t, 1.2, 'sine', 0.12, null, N(58)),
  };
  Au.play = function (name) {
    if (!Au.sfxOn || !ctx || ctx.state !== 'running') return;
    try { (SFX[name] || SFX.tap)(ctx.currentTime + 0.01); } catch (e) {}
  };

  // Gentle generative pad + arpeggio; scale shifts with mode.
  const SCALES = { light: [0, 2, 4, 7, 9, 12, 14, 16], dark: [0, 2, 3, 7, 8, 12, 14, 15], battle: [0, 3, 5, 7, 10, 12, 15, 17] };
  function tick() {
    if (!ctx || !Au.musicOn || ctx.state !== 'running') return;
    const sc = SCALES[Au.mode] || SCALES.light, root_ = Au.mode === 'dark' ? 52 : Au.mode === 'battle' ? 50 : 55;
    const t = ctx.currentTime + 0.05, bar = Math.floor(step / 8);
    const chordRoot = [0, 5, 3, 7][bar % 4];
    if (step % 8 === 0) { [0, 7, 12].forEach((o) => tone(N(root_ + chordRoot + o - 12), t, 3.2, 'sine', 0.35, musicGain)); }
    const note = sc[(step * 3 + bar) % sc.length];
    if (Au.mode === 'battle' || step % 2 === 0) tone(N(root_ + 12 + chordRoot + note), t, 0.5, 'triangle', Au.mode === 'battle' ? 0.22 : 0.16, musicGain);
    step++;
  }
  Au.applyMusic = function () {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    if (ctx && Au.musicOn && !(root.document && root.document.hidden)) musicTimer = setInterval(tick, Au.mode === 'battle' ? 260 : 420);
  };
  // Dev 7: release the audio hardware while the game is hidden; resume (and restart music) on return.
  let suspendedByUs = false;
  Au.suspend = function () { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } if (ctx && ctx.state === 'running') { suspendedByUs = true; try { ctx.suspend(); } catch (e) {} } };
  Au.resume = function () { if (ctx && suspendedByUs) { suspendedByUs = false; try { ctx.resume(); } catch (e) {} } if (ctx) Au.applyMusic(); };
  Au.ctxState = () => (ctx ? ctx.state : 'none');
  Au.musicRunning = () => !!musicTimer;
  Au.setMode = function (m) { if (Au.mode !== m) { Au.mode = m; Au.applyMusic(); } };
  Au.setPrefs = function (s) { Au.sfxOn = !!s.sfx; Au.musicOn = !!s.music; if (ctx) session(); Au.applyMusic(); };

  /* ================================================================ Phase 8: monster voices
     Original synthesized sounds (no recordings, nothing licensed) for the showcase monsters, one recognisable voice
     each: Umbrit chirps and purrs, Cannonis rumbles and booms, Aimza speaks in digital chimes, with one voice per head.
     Cues: tap, idle, move, attack, special, impact, hurt, heal, guard, victory, defeat.
     Volume: their own bus at a modest level through a compressor; at most 6 monster sounds at once; the same cue
     cannot repeat within 120 ms; nothing plays when sound effects are off (Settings). */
  const VOICED = { umbrit: 1, cannonis: 1, aimza: 1, aimza2: 2, aimza3: 3 };
  let mBus = null, mEcho = null, live = 0; const lastCue = {};
  function bus(c, dest) {
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.18;
    const g = c.createGain(); g.gain.value = 0.62; g.connect(comp); comp.connect(dest);
    // a short echo for Aimza's voice (its moves are literally echoes)
    const d = c.createDelay(0.5), fb = c.createGain(), wet = c.createGain(); d.delayTime.value = 0.11; fb.gain.value = 0.34; wet.gain.value = 0.42;
    d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(comp);
    return { out: g, echo: d };
  }
  // building blocks on any context (live or offline): X = { c, out, echo }
  function osc(X, t0, dur, type, f0, f1, vol, o) {
    o = o || {}; const c = X.c, os = c.createOscillator(), g = c.createGain(); let node = os;
    os.type = type; os.frequency.setValueAtTime(f0, t0); if (f1 && f1 !== f0) os.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur * (o.slideAt || 1));
    if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(os.frequency); l.start(t0); l.stop(t0 + dur + 0.05); }
    if (o.lp || o.bp || o.hp) { const f = c.createBiquadFilter(); f.type = o.lp ? 'lowpass' : o.bp ? 'bandpass' : 'highpass'; f.frequency.value = o.lp || o.bp || o.hp; f.Q.value = o.q || 0.8; node.connect(f); node = f; }
    const a = o.attack || 0.01; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + a); g.gain.setValueAtTime(vol, t0 + Math.max(a, dur * (o.hold || 0))); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    if (o.am) { const l = c.createOscillator(), lg = c.createGain(), mg = c.createGain(); l.frequency.value = o.am[0]; lg.gain.value = o.am[1]; mg.gain.value = 1 - o.am[1]; l.connect(lg); lg.connect(mg.gain); node.connect(mg); node = mg; l.start(t0); l.stop(t0 + dur + 0.05); }
    node.connect(g); g.connect(o.echo && X.echo ? X.echo : X.out); if (o.echo && X.echo) g.connect(X.out);
    os.start(t0); os.stop(t0 + dur + 0.05); return os;
  }
  function nz(X, t0, dur, vol, type, f0, f1, q) {
    const c = X.c, n = Math.max(1, Math.floor(c.sampleRate * dur)), b = c.createBuffer(1, n, c.sampleRate), dd = b.getChannelData(0);
    for (let i = 0; i < n; i++) dd[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = b; f.type = type || 'lowpass'; f.frequency.setValueAtTime(f0 || 1200, t0); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t0 + dur); f.Q.value = q || 0.7;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(X.out); s.start(t0); s.stop(t0 + dur + 0.02); return s;
  }
  const kick = (X, t, f0, f1, dur, vol) => { osc(X, t, dur, 'sine', f0, f1, vol, { attack: 0.003 }); nz(X, t, 0.04, vol * 0.5, 'lowpass', 2400); };
  const r = (a, b) => a + Math.random() * (b - a);
  const VOICE = {
    /* Umbrit: a small velvet shadow — soft chirps, a purr, a hiss when it bites */
    umbrit: {
      tap: (X, t) => { osc(X, t, 0.55, 'triangle', 170, 160, 0.14, { am: [24, 0.6], lp: 900, attack: 0.05 }); osc(X, t + 0.32, 0.24, 'sine', 640, 860, 0.12, { vib: [9, 18], slideAt: 0.6 }); },
      idle: (X, t) => osc(X, t, 0.28, 'sine', 780, 1050, 0.08, { vib: [8, 25], slideAt: 0.5 }),
      move: (X, t) => { osc(X, t, 0.05, 'sine', 420, 380, 0.06); osc(X, t + 0.16, 0.05, 'sine', 420, 380, 0.06); },
      attack: (X, t) => { nz(X, t, 0.14, 0.12, 'bandpass', 4200, 2600, 1.2); osc(X, t + 0.3, 0.06, 'square', 900, 300, 0.07, { lp: 2400 }); },
      special: (X, t) => { nz(X, t, 0.7, 0.16, 'lowpass', 3200, 260); osc(X, t, 0.7, 'sine', 120, 70, 0.14, { attack: 0.08 }); osc(X, t + 0.12, 0.5, 'triangle', 1320, 1240, 0.04, { vib: [5, 12], echo: true }); },
      impact: (X, t, o) => { nz(X, t, 0.1, 0.14, 'highpass', 1800); osc(X, t, 0.16, 'sine', 320, 110, (o && o.big) ? 0.2 : 0.14); },
      hurt: (X, t) => { osc(X, t, 0.12, 'sine', 1250, 720, 0.11, { vib: [20, 40] }); osc(X, t + 0.1, 0.12, 'sine', 1000, 620, 0.08); },
      heal: (X, t) => [0, 1, 2, 3, 4, 5].forEach((i) => osc(X, t + i * 0.05, 0.07, 'sine', i % 2 ? 1120 : 900, null, 0.07)),
      guard: (X, t) => osc(X, t, 0.16, 'triangle', 520, 380, 0.09, { lp: 1600 }),
      victory: (X, t) => [880, 1175, 1568].forEach((f, i) => osc(X, t + i * 0.12, 0.18, 'sine', f, f * 1.06, 0.1, { vib: [10, 20] })),
      defeat: (X, t) => { osc(X, t, 0.55, 'sine', 900, 480, 0.1, { vib: [7, 30] }); osc(X, t + 0.5, 0.4, 'sine', 330, 240, 0.06); },
    },
    /* Cannonis: living artillery — deep rumbles, the cannon's boom, bubbles, surf and stone */
    cannonis: {
      tap: (X, t) => { osc(X, t, 0.7, 'sawtooth', 56, 50, 0.16, { lp: 220, am: [7, 0.5], attack: 0.08 }); nz(X, t + 0.25, 0.45, 0.06, 'bandpass', 900, 420, 1.5); },
      idle: (X, t) => { nz(X, t, 0.45, 0.07, 'lowpass', 420, 180); osc(X, t, 0.45, 'sine', 72, 60, 0.08, { attack: 0.1 }); },
      move: (X, t) => osc(X, t, 0.14, 'sine', 64, 40, 0.16, { attack: 0.004 }),
      attack: (X, t) => { kick(X, t + 0.34, 130, 38, 0.36, 0.34); nz(X, t + 0.34, 0.18, 0.12, 'lowpass', 1400, 300); for (let i = 0; i < 6; i++) { const ti = t + 0.36 + i * 0.035 + r(0, 0.02); osc(X, ti, 0.05, 'sine', r(420, 600), r(900, 1300), 0.06); } },
      special: (X, t) => { osc(X, t, 0.55, 'sawtooth', 96, 58, 0.16, { lp: 640, attack: 0.05, vib: [6, 4] }); nz(X, t, 0.5, 0.08, 'lowpass', 700); kick(X, t + 0.4, 110, 32, 0.45, 0.4); nz(X, t + 0.38, 0.9, 0.16, 'lowpass', 300, 1500); nz(X, t + 0.9, 0.5, 0.1, 'lowpass', 1500, 400); },
      impact: (X, t, o) => { nz(X, t, 0.3, (o && o.big) ? 0.22 : 0.15, 'bandpass', 1500, 600, 0.9); osc(X, t, 0.16, 'sine', 120, 60, 0.12); },
      hurt: (X, t) => { nz(X, t, 0.07, 0.14, 'bandpass', 320, 220, 2); osc(X, t, 0.12, 'sine', 92, 50, 0.16); osc(X, t + 0.04, 0.22, 'sawtooth', 110, 78, 0.07, { lp: 500 }); },
      heal: (X, t) => { nz(X, t, 0.8, 0.06, 'highpass', 5200); osc(X, t, 0.8, 'sine', 98, 104, 0.06, { attack: 0.2 }); },
      guard: (X, t) => { nz(X, t, 0.05, 0.14, 'bandpass', 900, 700, 3); nz(X, t + 0.07, 0.05, 0.12, 'bandpass', 800, 600, 3); osc(X, t + 0.07, 0.15, 'sine', 70, 45, 0.14); },
      victory: (X, t) => { osc(X, t, 0.6, 'sawtooth', 88, 62, 0.15, { lp: 700, attack: 0.06 }); kick(X, t + 0.85, 120, 34, 0.45, 0.36); nz(X, t + 1.1, 0.6, 0.1, 'lowpass', 2200, 500); },
      defeat: (X, t) => { osc(X, t, 1.0, 'sawtooth', 100, 44, 0.14, { lp: 380 }); osc(X, t + 0.95, 0.25, 'sine', 70, 38, 0.18, { attack: 0.004 }); },
    },
    /* Aimza: the copied child — digital chimes and echoes; each head adds a voice (a fifth, then a triad) */
    aimza: {
      tap: (X, t, o) => voices(o, (k, i) => { osc(X, t + i * 0.03, 0.07, 'square', 880 * k, null, 0.04, { lp: 3000 }); osc(X, t + 0.1 + i * 0.03, 0.16, 'triangle', 660 * k, 990 * k, 0.06, { echo: true }); }),
      idle: (X, t, o) => voices(o, (k, i) => osc(X, t + i * 0.08, 0.3, 'sine', 1320 * k, null, 0.04, { echo: true })),
      move: (X, t) => osc(X, t, 0.04, 'square', 1200, null, 0.03, { lp: 2400 }),
      attack: (X, t, o) => voices(o, (k, i) => { osc(X, t + 0.28 + i * 0.02, 0.22, 'sine', 1760 * k, 880 * k, 0.09, { echo: true }); osc(X, t + 0.28 + i * 0.02, 0.18, 'triangle', 440 * k, null, 0.06, { echo: true }); }),
      special: (X, t, o) => { osc(X, t, 0.38, 'sawtooth', 200, 1600, 0.06, { lp: 2400, attack: 0.1 }); voices(o, (k, i) => { osc(X, t + 0.38 + i * 0.015, 0.45, 'square', 440 * k, null, 0.05, { lp: 2600, echo: true }); osc(X, t + 0.38 + i * 0.015, 0.5, 'triangle', 880 * k, 860 * k, 0.07, { echo: true }); }); },
      impact: (X, t) => { for (let i = 0; i < 5; i++) osc(X, t + i * 0.018, 0.08, 'sine', r(2000, 5200), null, 0.05); nz(X, t, 0.09, 0.07, 'highpass', 4000); },
      hurt: (X, t) => { for (let i = 0; i < 6; i++) osc(X, t + i * 0.025, 0.03, 'square', 900 - i * 110 + r(-80, 80), null, 0.05, { lp: 2400 }); },
      heal: (X, t, o) => { voices(o, (k) => { [1, 2, 3].forEach((h) => osc(X, t, 0.9, 'sine', 220 * k * h, null, 0.05 / h, { attack: 0.25 })); }); [0, 1, 2, 3].forEach((i) => osc(X, t + 0.3 + i * 0.09, 0.2, 'sine', [1320, 1568, 1760, 2093][i], null, 0.04, { echo: true })); },
      guard: (X, t, o) => voices(o, (k) => osc(X, t, 0.2, 'triangle', 660 * k, null, 0.06, { echo: true })),
      victory: (X, t, o) => { [523, 659, 784, 1047].forEach((f, i) => voices(o, (k) => osc(X, t + i * 0.1, 0.22, 'triangle', f * k, null, 0.06, { echo: true }))); voices(o, (k) => osc(X, t + 0.42, 0.6, 'sine', 1047 * k, null, 0.06, { echo: true })); },
      defeat: (X, t) => { osc(X, t, 0.8, 'sawtooth', 800, 80, 0.06, { lp: 1800 }); for (let i = 0; i < 5; i++) osc(X, t + 0.5 + i * 0.05, 0.04, 'square', 300 - i * 40, null, 0.04, { lp: 1500 }); },
    },
  };
  // one voice per head: unison, then a fifth, then a triad (the third head adds a major third an octave up)
  const STACK = [[1], [1, 1.5], [1, 1.5, 2.52]];
  function voices(o, fn) { const n = (o && o.heads) || 1; STACK[n - 1].forEach((k, i) => fn(k, i)); }
  const voiceOf = (sp) => (VOICE[sp] ? VOICE[sp] : /^aimza/.test(sp) ? VOICE.aimza : null);
  Au.hasVoice = (sp) => !!VOICED[sp];
  Au.monster = function (sp, cue, o) {
    o = o || {}; if (!Au.sfxOn || !ctx || ctx.state !== 'running' || !VOICED[sp]) return false;
    const v = voiceOf(sp), fn = v && v[cue]; if (!fn) return false;
    const key = sp + ':' + cue, now = ctx.currentTime; if (lastCue[key] && now - lastCue[key] < 0.12) return false;
    const low = cue === 'idle' || cue === 'tap' || cue === 'move'; if (live >= (low ? 3 : 6)) return false;
    lastCue[key] = now; live++; setTimeout(() => { live = Math.max(0, live - 1); }, 1200);
    if (!mBus) mBus = bus(ctx, master);
    try { fn({ c: ctx, out: mBus.out, echo: mBus.echo }, now + 0.01 + (o.delay || 0), Object.assign({ heads: VOICED[sp] }, o)); } catch (e) { /* audio is optional */ }
    return true;
  };
  // Renders one cue offline to a WAV file (review page and tests); resolves with an ArrayBuffer
  Au.renderCue = async function (sp, cue, seconds) {
    const C = root.OfflineAudioContext || root.webkitOfflineAudioContext; if (!C) return null;
    const rate = 44100, c = new C(1, Math.ceil(rate * (seconds || 1.6)), rate), b = bus(c, c.destination);
    voiceOf(sp)[cue]({ c, out: b.out, echo: b.echo }, 0.02, { heads: VOICED[sp] });
    const buf = await c.startRendering(), d = buf.getChannelData(0), n = d.length, ab = new ArrayBuffer(44 + n * 2), dv = new DataView(ab);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, rate, true); dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, n * 2, true);
    let peak = 0; for (let i = 0; i < n; i++) { const v = Math.max(-1, Math.min(1, d[i])); peak = Math.max(peak, Math.abs(v)); dv.setInt16(44 + i * 2, v * 32767, true); }
    return { wav: ab, peak, seconds: n / rate };
  };
  Au.CUES = ['tap', 'idle', 'move', 'attack', 'special', 'impact', 'hurt', 'heal', 'guard', 'victory', 'defeat'];
})(typeof window !== 'undefined' ? window : globalThis);
