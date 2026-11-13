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
    // Hide and Seek (hs-redesign)
    hsMorph: (t) => { noise(t, 0.12, 0.08); [79, 74, 83, 86].forEach((m, i) => tone(N(m), t + i * 0.05, 0.18, 'sine', 0.13)); tone(N(62), t, 0.3, 'triangle', 0.08, null, N(74)); },
    hsSwing: (t) => { noise(t, 0.14, 0.16); tone(520, t, 0.13, 'triangle', 0.06, null, 180); },
    hsReveal: (t) => { noise(t, 0.08, 0.2); [72, 76, 79, 84].forEach((m, i) => { tone(N(m), t + 0.05 + i * 0.06, 0.32, 'triangle', 0.17); tone(N(m + 12), t + 0.07 + i * 0.06, 0.18, 'sine', 0.06); }); },
    hsMiss: (t) => { noise(t, 0.09, 0.14); tone(110, t, 0.16, 'sine', 0.16, null, 70); },
    hsLeaf: (t) => noise(t, 0.08, 0.035),
    hsRock: (t) => { noise(t, 0.06, 0.03); tone(70, t, 0.09, 'sine', 0.05, null, 50); },
    hsWood: (t) => tone(N(50), t, 0.06, 'triangle', 0.04, null, N(46)),
    hsTick: (t) => tone(N(81), t, 0.06, 'sine', 0.09),
    hsGo: (t) => { tone(N(67), t, 0.16, 'triangle', 0.15); tone(N(74), t + 0.12, 0.28, 'triangle', 0.17); tone(N(79), t + 0.12, 0.28, 'sine', 0.08); },
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
  Au.context = () => ctx;   // Phase 15C: for tests of interruption handling
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
  /* Phase 8B: a voice for every other line, built from a recipe: base pitch, timbre, warble or growl, chirp shape and
     an element layer (crackle, bubbles, rustle, stone, wind, whisper, chimes, metal). Later forms are deeper, and the
     third form adds a body tone under its calls. Same bus, limits and settings as the Phase 8 voices. */
  const EL = {
    fire: { hit: (X, t, k) => { for (let i = 0; i < 4; i++) nz(X, t + i * 0.025 + r(0, 0.02), 0.05, 0.07 * k, 'bandpass', r(2200, 4800), null, 1.4); nz(X, t, 0.22, 0.09 * k, 'lowpass', 700, 2600); },
      burst: (X, t, k) => { nz(X, t, 0.55, 0.13 * k, 'bandpass', 600, 3200, 0.7); for (let i = 0; i < 7; i++) nz(X, t + 0.05 + i * 0.05 + r(0, 0.03), 0.04, 0.06 * k, 'highpass', 3000); },
      amb: (X, t, k) => { for (let i = 0; i < 3; i++) nz(X, t + i * 0.07 + r(0, 0.04), 0.04, 0.035 * k, 'bandpass', r(2500, 4500), null, 1.6); } },
    water: { hit: (X, t, k) => { nz(X, t, 0.25, 0.11 * k, 'bandpass', 1400, 500, 0.9); for (let i = 0; i < 4; i++) osc(X, t + i * 0.04, 0.05, 'sine', r(380, 600), r(900, 1300), 0.05 * k); },
      burst: (X, t, k) => { nz(X, t, 0.7, 0.13 * k, 'lowpass', 300, 1800); for (let i = 0; i < 8; i++) osc(X, t + 0.06 + i * 0.045 + r(0, 0.02), 0.05, 'sine', r(400, 650), r(950, 1400), 0.05 * k); },
      amb: (X, t, k) => { for (let i = 0; i < 3; i++) osc(X, t + i * 0.09 + r(0, 0.05), 0.05, 'sine', r(500, 700), r(1000, 1300), 0.03 * k); } },
    nature: { hit: (X, t, k) => { nz(X, t, 0.14, 0.1 * k, 'bandpass', 4200, 2400, 1.1); osc(X, t, 0.12, 'sine', 300, 170, 0.09 * k); },
      burst: (X, t, k) => { for (let i = 0; i < 5; i++) nz(X, t + i * 0.06, 0.12, 0.07 * k, 'bandpass', r(2600, 5200), null, 1.2); osc(X, t + 0.02, 0.4, 'triangle', 180, 120, 0.08 * k, { lp: 900 }); },
      amb: (X, t, k) => nz(X, t, 0.3, 0.03 * k, 'bandpass', 4600, 3000, 1) },
    earth: { hit: (X, t, k) => { nz(X, t, 0.12, 0.13 * k, 'bandpass', 700, 380, 1.6); osc(X, t, 0.2, 'sine', 110, 50, 0.14 * k, { attack: 0.004 }); },
      burst: (X, t, k) => { osc(X, t, 0.7, 'sine', 70, 38, 0.16 * k, { attack: 0.01 }); nz(X, t, 0.7, 0.11 * k, 'lowpass', 600, 180); for (let i = 0; i < 4; i++) nz(X, t + 0.1 + i * 0.08, 0.08, 0.08 * k, 'bandpass', r(500, 900), null, 2); },
      amb: (X, t, k) => osc(X, t, 0.4, 'sine', 62, 52, 0.04 * k, { attack: 0.1 }) },
    wind: { hit: (X, t, k) => { nz(X, t, 0.22, 0.11 * k, 'bandpass', 900, 3400, 0.8); },
      burst: (X, t, k) => { nz(X, t, 0.7, 0.13 * k, 'bandpass', 500, 3200, 0.7); osc(X, t + 0.1, 0.5, 'sine', 1400, 2100, 0.03 * k, { vib: [6, 30] }); },
      amb: (X, t, k) => nz(X, t, 0.45, 0.03 * k, 'bandpass', 700, 1600, 0.9) },
    dark: { hit: (X, t, k) => { nz(X, t, 0.12, 0.1 * k, 'highpass', 2200); osc(X, t, 0.2, 'sine', 260, 90, 0.11 * k); },
      burst: (X, t, k) => { nz(X, t, 0.7, 0.12 * k, 'lowpass', 3000, 240); osc(X, t, 0.7, 'sine', 110, 62, 0.11 * k, { attack: 0.08, vib: [5, 4] }); },
      amb: (X, t, k) => nz(X, t, 0.3, 0.03 * k, 'highpass', 5200) },
    light: { hit: (X, t, k) => { osc(X, t, 0.3, 'triangle', 1568, null, 0.07 * k, { echo: true }); osc(X, t + 0.03, 0.3, 'sine', 2093, null, 0.05 * k, { echo: true }); },
      burst: (X, t, k) => { [1047, 1319, 1568, 2093].forEach((f, i) => osc(X, t + i * 0.05, 0.4, 'triangle', f, null, 0.05 * k, { echo: true })); nz(X, t, 0.4, 0.05 * k, 'highpass', 6000); },
      amb: (X, t, k) => osc(X, t, 0.4, 'sine', 1760, null, 0.025 * k, { echo: true }) },
    metal: { hit: (X, t, k) => { nz(X, t, 0.06, 0.09 * k, 'bandpass', 3200, null, 3); [1780, 2630, 3410].forEach((f) => osc(X, t, 0.35, 'sine', f, null, 0.035 * k)); },
      burst: (X, t, k) => { for (let i = 0; i < 6; i++) osc(X, t + i * 0.04, 0.05, 'square', r(800, 2400), null, 0.035 * k, { lp: 3600 }); osc(X, t, 0.5, 'sawtooth', 220, 880, 0.05 * k, { lp: 2400 }); nz(X, t + 0.3, 0.12, 0.08 * k, 'bandpass', 3000, null, 3); },
      amb: (X, t, k) => osc(X, t, 0.06, 'square', r(1400, 2000), null, 0.025 * k, { lp: 3000 }) },
  };
  // line recipes: base pitch (Hz), timbre, filter, warble [rate, depth], growl am [rate, depth], call shape, element(s), weight 0..1
  const RECIPE = {
    lumifern: { base: 640, wave: 'sine', vib: [6, 16], shape: 'up', el: ['light', 'nature'], w: 0.1 },
    umbrit: { base: 560, wave: 'triangle', lp: 1400, am: [24, 0.45], shape: 'up', el: ['dark'], w: 0.25 },
    cannonis: { base: 92, wave: 'sawtooth', lp: 280, am: [7, 0.5], shape: 'down', el: ['water', 'earth'], w: 0.9, boom: 1 },
    kairyu: { base: 500, wave: 'triangle', lp: 2400, vib: [12, 30], shape: 'wobble', el: ['water'], w: 0.3 },
    aquaflora: { base: 300, wave: 'sine', vib: [4, 22], shape: 'song', el: ['water'], w: 0.3, echo: 1 },
    gaiaroki: { base: 150, wave: 'sawtooth', lp: 650, am: [11, 0.5], shape: 'down', el: ['earth', 'nature'], w: 0.7 },
    pyrocell: { base: 95, wave: 'sawtooth', lp: 420, am: [8, 0.6], shape: 'down', el: ['earth', 'fire'], w: 0.95 },
    acinus: { base: 210, wave: 'triangle', lp: 1100, vib: [5, 8], shape: 'down', el: ['nature'], w: 0.6 },
    sylvaneer: { base: 360, wave: 'sine', vib: [5, 20], shape: 'bugle', el: ['nature'], w: 0.45 },
    terraflora: { base: 165, wave: 'triangle', lp: 900, am: [4, 0.35], shape: 'song', el: ['nature'], w: 0.5 },
    emberix: { base: 580, wave: 'triangle', lp: 2600, shape: 'up', el: ['fire', 'light'], w: 0.3 },
    pyrokai: { base: 470, wave: 'square', lp: 1700, am: [18, 0.4], shape: 'wobble', el: ['fire'], w: 0.35, g: 1.45 },
    igniflare: { base: 230, wave: 'sawtooth', lp: 950, am: [13, 0.45], shape: 'down', el: ['fire'], w: 0.5, roar: 1, g: 1.5 },
    pyrospark: { base: 1150, wave: 'sine', vib: [14, 40], shape: 'tweet', el: ['fire'], w: 0.15 },
    zephyr: { base: 760, wave: 'sine', vib: [7, 28], shape: 'cry', el: ['wind'], w: 0.35 },
    voltar: { base: 620, wave: 'square', lp: 2200, am: [16, 0.55], shape: 'giggle', el: ['dark'], w: 0.25, bells: 1 },
    zeep: { base: 820, wave: 'square', lp: 3000, shape: 'beep', el: ['metal'], w: 0.5 },
    lumi: { base: 920, wave: 'sine', vib: [5, 18], shape: 'song', el: ['light'], w: 0.1, echo: 1 },
    meta: { base: 540, wave: 'triangle', shape: 'chatter', el: ['metal', 'light'], w: 0.35 },
    atem: { base: 165, wave: 'sawtooth', lp: 720, am: [30, 0.25], shape: 'servo', el: ['metal'], w: 0.65, blade: 1 },
  };
  function makeVoice(R0, stage) {
    const P = Object.assign({}, R0), k = [1, 0.84, 0.7][stage - 1], f = P.base * k, big = stage === 3, E = EL[P.el[0]], E2 = EL[P.el[1] || P.el[0]];
    const o = (extra) => Object.assign({ lp: P.lp, vib: P.vib, am: P.am, echo: !!P.echo }, extra || {});
    // one call in the line's own shape: dur, start/end pitch multipliers, volume
    const call = (X, t, dur, a, b, vol, x) => {
      const v = vol * (P.wave === 'sawtooth' || P.wave === 'square' ? 0.7 : 1) * (P.g || 1);   // g: a muffled timbre's make-up gain
      if (P.shape === 'beep') { for (let i = 0; i < Math.max(2, Math.round(dur / 0.07)); i++) osc(X, t + i * 0.07, 0.05, 'square', f * (a + (b - a) * (i % 3) / 2) * (1 + (i % 2) * 0.25), null, v * 0.7, { lp: 3000 }); return; }
      if (P.shape === 'chatter') { for (let i = 0; i < Math.max(3, Math.round(dur / 0.05)); i++) osc(X, t + i * 0.05, 0.04, i % 2 ? 'square' : 'triangle', f * (a + (b - a) * i / Math.max(1, dur / 0.05)) * (1 + r(-0.12, 0.12)), null, v * 0.6, { lp: 2800 }); return; }
      if (P.shape === 'giggle') { for (let i = 0; i < Math.max(3, Math.round(dur / 0.06)); i++) osc(X, t + i * 0.06, 0.05, 'square', f * (a + (b - a) * i / Math.max(1, dur / 0.06)) * (1 + (i % 2) * 0.18), null, v * 0.6, { lp: 2400 }); return; }
      if (P.shape === 'tweet') { for (let i = 0; i < Math.max(2, Math.round(dur / 0.08)); i++) osc(X, t + i * 0.08, 0.06, 'sine', f * a * (1 + i * 0.06), f * b * (1.3 + i * 0.06), v, { slideAt: 0.7 }); return; }
      if (P.shape === 'servo') { osc(X, t, dur, 'sawtooth', f * a, f * b, v * 0.8, o({ attack: 0.03 })); osc(X, t, dur, 'square', f * a * 4, f * b * 4, v * 0.15, { lp: 1800 }); return; }
      const shp = { up: [a, b * 1.25], down: [a * 1.1, b * 0.8], wobble: [a, b], song: [a, b], bugle: [a * 0.9, b * 1.5], cry: [a * 1.3, b * 0.75] }[P.shape] || [a, b];
      osc(X, t, dur, P.wave, f * shp[0], f * shp[1], v, o(Object.assign({ attack: Math.min(0.06, dur * 0.2), slideAt: P.shape === 'bugle' ? 0.5 : 0.9 }, x)));
      if (big) osc(X, t, dur, 'sine', f * shp[0] * 0.5, f * shp[1] * 0.5, v * 0.45, { attack: 0.04, lp: 600 });   // the third form's body tone
    };
    const step = (X, t, vol) => (P.w > 0.6 ? osc(X, t, 0.14, 'sine', 70 * (2 - P.w), 40, vol, { attack: 0.004 }) : P.shape === 'song' || P.el[0] === 'light' || P.el[0] === 'wind' ? nz(X, t, 0.18, vol * 1.1, 'bandpass', 1400, 700, 0.8) : osc(X, t, 0.04, 'sine', 380 * (1.4 - P.w), 300, vol * 0.7));
    return {
      tap: (X, t) => { call(X, t, 0.32 + P.w * 0.2, 1, 1.15, 0.12); E.amb(X, t + 0.25, 1.2); },
      idle: (X, t) => { call(X, t, 0.2, 1.05, 1.12, 0.06); E.amb(X, t + 0.1, 0.8); },
      move: (X, t) => { step(X, t, 0.08); step(X, t + 0.18, 0.07); },
      attack: (X, t) => { call(X, t + 0.06, 0.14, 1.2, 0.9, 0.1); E.hit(X, t + 0.3, 0.8); if (P.blade) nz(X, t + 0.22, 0.16, 0.04, 'highpass', 4500); if (P.bells) [2637, 3136].forEach((q, i) => osc(X, t + 0.3 + i * 0.05, 0.12, 'triangle', q, null, 0.04)); if (P.boom) kick(X, t + 0.34, 130 * k, 38, 0.36, 0.3); },
      special: (X, t) => { call(X, t, 0.36, 0.8, 1.4, 0.1); nz(X, t, 0.38, 0.05, 'lowpass', 400, 2200); E.burst(X, t + 0.38, 1); if (E2 !== E) E2.hit(X, t + 0.45, 0.6); if (P.roar || big) call(X, t + 0.4, 0.5, 0.9, 0.7, 0.09, { lp: 900 }); if (P.boom) kick(X, t + 0.4, 110 * k, 32, 0.45, 0.34); if (P.bells) [2093, 2637, 3136, 4186].forEach((q, i) => osc(X, t + 0.4 + i * 0.05, 0.16, 'triangle', q, null, 0.035)); },
      impact: (X, t, oo) => { E.hit(X, t, (oo && oo.big) ? 1.25 : 1); osc(X, t, 0.12, 'sine', 240 * (1.6 - P.w), 90, 0.08); },
      hurt: (X, t) => call(X, t, 0.2, 1.5, 0.95, 0.11, { vib: [22, 40] }),
      heal: (X, t) => { [1, 1.25, 1.5, 2].forEach((m, i) => osc(X, t + i * 0.08, 0.22, 'sine', Math.min(2400, f * 2 * m), null, 0.045, { echo: true })); EL.light.amb(X, t + 0.3, 1); },
      guard: (X, t) => { E.hit(X, t, 0.7); call(X, t + 0.04, 0.14, 1, 0.9, 0.06); },
      victory: (X, t) => { [1, 1.26, 1.5].forEach((m, i) => call(X, t + i * 0.13, 0.2, m, m * 1.08, 0.08)); E.amb(X, t + 0.45, 1.4); if (P.bells) [2093, 2637, 3136].forEach((q, i) => osc(X, t + 0.5 + i * 0.07, 0.14, 'triangle', q, null, 0.035)); },
      defeat: (X, t) => { call(X, t, 0.6, 1.1, 0.55, 0.09); call(X, t + 0.55, 0.4, 0.6, 0.45, 0.05); },
    };
  }
  (function rosterVoices() { const D = root.A && root.A.Data; if (!D) return;
    Object.values(D.SPECIES).forEach((sp) => { if (VOICED[sp.id] || !RECIPE[sp.line]) return; VOICE[sp.id] = makeVoice(RECIPE[sp.line], sp.stage || 1); VOICED[sp.id] = 1; }); })();
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
    try { const L15 = layer15(sp, cue); if (L15) L15({ c: ctx, out: mBus.out, echo: mBus.echo }, now + 0.01 + (o.delay || 0)); } catch (e) { /* audio is optional */ }
    return true;
  };
  /* Phase 15 prototypes (developer switch A.Proto15 only): a layer on top of the line's voice that sounds like its
     body — Atem's servos, clanks and ringing blades; Igniflare's wingbeats, heavy steps and fire; Lumifern's leaves and
     chimes. Deeper with each stage, through the same bus and limits; nothing plays with the switch off. */
  const L15 = {
    atem: (k) => ({
      move: (X, t) => { osc(X, t, 0.09, 'square', 820 * k, 1250 * k, 0.025, { lp: 2600 }); kick(X, t + 0.1, 140 * k, 60, 0.12, 0.08); nz(X, t + 0.1, 0.05, 0.03, 'highpass', 3000); },
      attack: (X, t) => { osc(X, t + 0.05, 0.12, 'square', 600 * k, 1500 * k, 0.03, { lp: 3000 }); nz(X, t + 0.28, 0.12, 0.05, 'bandpass', 5200, 2400, 2); [2637, 3520, 4186].forEach((f, i) => osc(X, t + 0.32 + i * 0.01, 0.55, 'triangle', f * k, f * k * 0.995, 0.025, { attack: 0.002 })); },
      special: (X, t) => { osc(X, t, 0.36, 'sawtooth', 140 * k, 900 * k, 0.04, { lp: 2400 }); [1760, 2637, 3520].forEach((f, i) => osc(X, t + 0.4 + i * 0.012, 0.6, 'triangle', f * k, null, 0.025, { attack: 0.002 })); kick(X, t + 0.4, 120, 50, 0.2, 0.1); },
      hurt: (X, t) => { kick(X, t, 300 * k, 120, 0.1, 0.06); [1180, 1630].forEach((f) => osc(X, t, 0.3, 'triangle', f * k, null, 0.02, { attack: 0.002 })); },
      defeat: (X, t) => { osc(X, t, 0.9, 'sawtooth', 700 * k, 50, 0.04, { lp: 1600 }); kick(X, t + 0.75, 90, 40, 0.25, 0.1); },
      victory: (X, t) => { [0, 0.12, 0.24].forEach((d, i) => osc(X, t + d, 0.06, 'square', (1400 + i * 300) * k, null, 0.025, { lp: 3500 })); },
    }),
    igniflare: (k) => ({
      move: (X, t) => { kick(X, t, 90 * k, 38, 0.16, 0.05 + 0.04 / k); },
      attack: (X, t) => { nz(X, t + 0.2, 0.08, 0.06, 'bandpass', 900, 500, 1.2); nz(X, t + 0.33, 0.03, 0.08, 'highpass', 2500); },
      special: (X, t) => { [0, 0.5].forEach((d) => nz(X, t + d, 0.32, 0.06, 'bandpass', 260 / k, 1100 / k, 0.9)); nz(X, t + 0.38, 0.5, 0.07, 'lowpass', 1800, 300); osc(X, t + 0.38, 0.5, 'sawtooth', 110 * k, 70 * k, 0.03, { lp: 500 }); },
      hurt: (X, t) => nz(X, t, 0.2, 0.05, 'bandpass', 400 / k, 900 / k, 0.9),
      victory: (X, t) => { [0, 0.62].forEach((d) => nz(X, t + d, 0.32, 0.06, 'bandpass', 240 / k, 1000 / k, 0.9)); },
      defeat: (X, t) => { kick(X, t + 0.9, 70, 30, 0.3, 0.1); nz(X, t + 0.9, 0.3, 0.05, 'lowpass', 600); },
    }),
    meta: (k) => ({
      move: (X, t) => { osc(X, t, 0.05, 'sine', 1400 * k, 1700 * k, 0.02); osc(X, t + 0.45, 0.05, 'sine', 1300 * k, 1600 * k, 0.02); },
      attack: (X, t) => { [0, 0.03, 0.06].forEach((d, i) => nz(X, t + 0.26 + d, 0.08, 0.03, 'bandpass', 3800 + i * 600, 1800, 2)); osc(X, t + 0.32, 0.25, 'sine', 1760 * k, 1320 * k, 0.03, { echo: true }); },
      special: (X, t) => { [880, 1320, 1760, 2640].forEach((f, i) => osc(X, t + i * 0.07, 0.35, 'sine', f * k, null, 0.025, { echo: true })); osc(X, t + 0.38, 0.4, 'triangle', 220 * k, 660 * k, 0.03, { lp: 2400 }); },
      hurt: (X, t) => osc(X, t, 0.15, 'square', 900 * k, 500 * k, 0.02, { lp: 2400 }),
      victory: (X, t) => [1320, 1760, 2093].forEach((f, i) => osc(X, t + 0.2 + i * 0.1, 0.25, 'sine', f * k, null, 0.025, { echo: true })),
    }),
    lumifern: (k) => ({
      move: (X, t) => { nz(X, t, 0.05, 0.02, 'highpass', 4500); nz(X, t + 0.2, 0.05, 0.018, 'highpass', 4800); },
      attack: (X, t) => { nz(X, t + 0.3, 0.12, 0.03, 'bandpass', 3000, 1500, 1); },
      special: (X, t) => [1568, 1976, 2349, 3136].forEach((f, i) => osc(X, t + 0.1 + i * 0.07, 0.4, 'sine', f * k, null, 0.03, { echo: true })),
      hurt: (X, t) => nz(X, t, 0.1, 0.025, 'highpass', 3500),
      victory: (X, t) => [2093, 2637, 3136, 4186].forEach((f, i) => osc(X, t + 0.3 + i * 0.08, 0.3, 'sine', f * k, null, 0.025, { echo: true })),
    }),
  };
  /* Phase 15B: the refined roster's layers, by body type (same bus, same limits; switch on only) */
  const B15 = {
    bat: (k) => ({ move: (X, t) => { nz(X, t, 0.07, 0.03, 'lowpass', 700); nz(X, t + 0.2, 0.07, 0.03, 'lowpass', 700); },
      attack: (X, t) => { nz(X, t + 0.18, 0.08, 0.04, 'lowpass', 800); osc(X, t + 0.3, 0.07, 'sine', 3400 * k, 5200 * k, 0.018); },
      special: (X, t) => { [0, 0.1].forEach((d, i) => osc(X, t + 0.3 + d, 0.08, 'sine', (3000 + i * 900) * k, (4800 + i * 900) * k, 0.016, { echo: true })); nz(X, t + 0.26, 0.12, 0.04, 'lowpass', 600); },
      hurt: (X, t) => osc(X, t, 0.08, 'sine', 4200 * k, 2600 * k, 0.016), victory: (X, t) => [0, 0.16, 0.32].forEach((d) => nz(X, t + d, 0.07, 0.03, 'lowpass', 700)) }),
    fox: (k) => ({ attack: (X, t) => osc(X, t + 0.26, 0.09, 'triangle', 900 * k, 1500 * k, 0.025, { lp: 3000 }),
      special: (X, t) => { nz(X, t + 0.1, 0.3, 0.04, 'bandpass', 500, 2600, 1.2); osc(X, t + 0.38, 0.1, 'triangle', 1000 * k, 1600 * k, 0.022); },
      hurt: (X, t) => osc(X, t, 0.12, 'triangle', 1500 * k, 800 * k, 0.022, { lp: 3000 }), victory: (X, t) => [0, 0.18].forEach((d) => osc(X, t + 0.2 + d, 0.08, 'triangle', 1100 * k, 1600 * k, 0.022)) }),
    serpent: (k) => ({ move: (X, t) => nz(X, t, 0.3, 0.025, 'bandpass', 500, 1300, 0.8), attack: (X, t) => nz(X, t + 0.2, 0.18, 0.035, 'highpass', 4000),
      special: (X, t) => { nz(X, t + 0.1, 0.5, 0.05, 'lowpass', 900, 300); nz(X, t + 0.38, 0.2, 0.03, 'highpass', 3500); }, hurt: (X, t) => nz(X, t, 0.12, 0.03, 'highpass', 3800) }),
    monkey: (k) => ({ attack: (X, t) => osc(X, t + 0.22, 0.1, 'square', 420 * k, 620 * k, 0.02, { lp: 1400 }),
      hurt: (X, t) => osc(X, t, 0.12, 'square', 900 * k, 1300 * k, 0.018, { lp: 2400 }), victory: (X, t) => [0, 0.09, 0.18, 0.27].forEach((d, i) => osc(X, t + 0.2 + d, 0.06, 'square', (700 + (i % 2) * 250) * k, null, 0.016, { lp: 2000 })) }),
    mech: (k) => ({ move: (X, t) => osc(X, t, 0.08, 'square', 700 * k, 1000 * k, 0.015, { lp: 2400 }), attack: (X, t) => [0, 0.08].forEach((d) => osc(X, t + 0.2 + d, 0.05, 'square', 1800 * k, null, 0.015, { lp: 4000 })),
      special: (X, t) => [0, 0.07, 0.14, 0.21].forEach((d, i) => osc(X, t + 0.12 + d, 0.05, 'square', (1200 + i * 300) * k, null, 0.015, { lp: 4000 })), hurt: (X, t) => osc(X, t, 0.14, 'sawtooth', 160 * k, 90 * k, 0.025, { lp: 900 }) }),
    bird: (k) => ({ move: (X, t) => { nz(X, t, 0.06, 0.03, 'bandpass', 900, 600, 1); nz(X, t + 0.18, 0.06, 0.03, 'bandpass', 900, 600, 1); },
      attack: (X, t) => { nz(X, t + 0.15, 0.08, 0.035, 'bandpass', 900, 600, 1); osc(X, t + 0.3, 0.12, 'sawtooth', 2200 * k, 1500 * k, 0.014, { lp: 3500 }); },
      special: (X, t) => { [0, 0.14, 0.28].forEach((d) => nz(X, t + d, 0.08, 0.035, 'bandpass', 800, 600, 1)); osc(X, t + 0.38, 0.25, 'sawtooth', 1800 * k, 2600 * k, 0.014, { lp: 3500 }); },
      victory: (X, t) => osc(X, t + 0.3, 0.3, 'sawtooth', 1900 * k, 2700 * k, 0.014, { lp: 3500 }) }),
    heavy: (k) => ({ move: (X, t) => kick(X, t, 80 * k, 40, 0.18, 0.06), attack: (X, t) => kick(X, t + 0.3, 90 * k, 40, 0.2, 0.08),
      special: (X, t) => { kick(X, t + 0.38, 70 * k, 32, 0.32, 0.1); nz(X, t + 0.38, 0.3, 0.04, 'lowpass', 500); }, hurt: (X, t) => kick(X, t, 110 * k, 50, 0.14, 0.06), defeat: (X, t) => kick(X, t + 0.85, 60, 28, 0.35, 0.1) }),
    quad: (k) => ({ move: (X, t) => [0, 0.12, 0.24].forEach((d) => kick(X, t + d, 260 * k, 140, 0.05, 0.03)), attack: (X, t) => kick(X, t + 0.3, 200 * k, 90, 0.08, 0.05) }),
    jester: (k) => ({ attack: (X, t) => [3136, 3729, 4186].forEach((f, i) => osc(X, t + 0.3 + i * 0.03, 0.25, 'triangle', f * k, null, 0.012, { attack: 0.002 })),
      special: (X, t) => [2637, 3136, 3729, 4186, 4978].forEach((f, i) => osc(X, t + 0.1 + i * 0.06, 0.3, 'triangle', f * k, null, 0.012, { attack: 0.002, echo: true })),
      victory: (X, t) => [0, 0.15, 0.3].forEach((d, i) => [3136, 3729].forEach((f) => osc(X, t + 0.2 + d, 0.2, 'triangle', (f + i * 200) * k, null, 0.011, { attack: 0.002 }))) }),
    float: (k) => ({ attack: (X, t) => osc(X, t + 0.3, 0.3, 'sine', 2093 * k, null, 0.02, { echo: true }), special: (X, t) => [1568, 2093, 2637].forEach((f, i) => osc(X, t + 0.15 + i * 0.07, 0.35, 'sine', f * k, null, 0.02, { echo: true })) }),
  };
  const BODY15 = { umbrit: 'bat', emberix: 'fox', aquaflora: 'serpent', kairyu: 'monkey', pyrokai: 'monkey', zeep: 'mech', pyrospark: 'bird', zephyr: 'bird',
    cannonis: 'heavy', acinus: 'heavy', gaiaroki: 'heavy', pyrocell: 'heavy', terraflora: 'heavy', sylvaneer: 'quad', voltar: 'jester', lumi: 'float' };
  function layer15(sp, cue) {
    const P = root.A && root.A.Proto15, D = root.A && root.A.Data; if (!P || !P.active(sp) || !D) return null;
    const s = D.SPECIES[sp], mk = s && (L15[s.line] || B15[BODY15[s.line]]); if (!mk) return null; return mk([1, 0.86, 0.74][(s.stage || 1) - 1])[cue] || null;
  }
  Au.layer15 = (sp, cue) => !!layer15(sp, cue);
  // Renders one cue offline to a WAV file (review page and tests); resolves with an ArrayBuffer
  Au.renderCue = async function (sp, cue, seconds) {
    const C = root.OfflineAudioContext || root.webkitOfflineAudioContext; if (!C) return null;
    const rate = 44100, c = new C(1, Math.ceil(rate * (seconds || 1.6)), rate), b = bus(c, c.destination);
    voiceOf(sp)[cue]({ c, out: b.out, echo: b.echo }, 0.02, { heads: VOICED[sp] }); const L = layer15(sp, cue); if (L) L({ c, out: b.out, echo: b.echo }, 0.02);
    const buf = await c.startRendering(), d = buf.getChannelData(0), n = d.length, ab = new ArrayBuffer(44 + n * 2), dv = new DataView(ab);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, rate, true); dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, n * 2, true);
    let peak = 0; for (let i = 0; i < n; i++) { const v = Math.max(-1, Math.min(1, d[i])); peak = Math.max(peak, Math.abs(v)); dv.setInt16(44 + i * 2, v * 32767, true); }
    return { wav: ab, peak, seconds: n / rate };
  };
  /* Phase 15C (developer switch only): presentation sequences for the battle stage, synthesised here (no recorded
     audio). They play through the same monster bus and compressor, at most two at once, so nothing stacks up. */
  const SEQ15 = {
    // Atem III, nine blades: activation hum, nine assembly clicks, a held resonance, nine launches and nine ringing
    // impacts (the last one heaviest), then the blades retracting. t is when the sequence starts.
    atem9: (X, t) => {
      osc(X, t, 0.32, 'sawtooth', 90, 420, 0.035, { lp: 1400, attack: 0.04 }); osc(X, t + 0.05, 0.4, 'sine', 220, 440, 0.03, { attack: 0.06 });
      for (let i = 0; i < 9; i++) { const c = t + 0.3 + i * 0.035; osc(X, c, 0.05, 'square', 1500 + i * 90, 1100 + i * 90, 0.012, { lp: 4200 }); nz(X, c, 0.03, 0.02, 'highpass', 4500); }
      osc(X, t + 0.36, 0.48, 'triangle', 330, 330, 0.02, { am: [14, 0.5], attack: 0.08 });
      for (let i = 0; i < 9; i++) { const l = t + 0.8 + i * 0.022, h = t + 0.84 + i * 0.025, last = i === 8; nz(X, l, 0.08, 0.018, 'bandpass', 1800, 4200, 1.4);
        osc(X, h, last ? 0.6 : 0.22, 'triangle', (last ? 1760 : 2637 - i * 60), null, last ? 0.03 : 0.014, { attack: 0.002 }); if (last) kick(X, h, 160, 55, 0.22, 0.09); else nz(X, h, 0.04, 0.02, 'highpass', 3200); }
      nz(X, t + 1.18, 0.3, 0.02, 'bandpass', 3000, 900, 1); osc(X, t + 1.2, 0.26, 'sine', 880, 330, 0.02);
    },
    // Phase 15D signatures: Lumifern's bloom (soft rising chimes), Igniflare's inferno (roar of flame, a deep thump),
    // Zeep's overclock (a servo spin-up, a lock-on blip, a crisp electric crack)
    bloom: (X, t) => { [784, 988, 1175, 1568].forEach((f, i) => osc(X, t + 0.05 + i * 0.07, 0.5, 'sine', f, null, 0.022, { echo: true, attack: 0.02 })); nz(X, t + 0.3, 0.4, 0.02, 'bandpass', 2400, 4000, 0.8); osc(X, t + 0.55, 0.6, 'triangle', 2093, null, 0.018, { echo: true, attack: 0.01 }); },
    inferno: (X, t) => { nz(X, t, 0.4, 0.05, 'lowpass', 400, 1600); nz(X, t + 0.36, 0.5, 0.06, 'bandpass', 900, 300, 0.7); kick(X, t + 0.5, 90, 38, 0.3, 0.09); },
    overclockZ: (X, t) => { osc(X, t, 0.4, 'sawtooth', 120, 900, 0.025, { lp: 2600 }); osc(X, t + 0.38, 0.05, 'square', 2200, null, 0.02, { lp: 5000 }); nz(X, t + 0.5, 0.12, 0.05, 'highpass', 3000); osc(X, t + 0.5, 0.18, 'square', 1400, 300, 0.02, { lp: 4000 }); },
    guard: (X, t) => { osc(X, t, 0.35, 'sine', 300, 300, 0.066, { am: [18, 0.4], attack: 0.03 }); osc(X, t + 0.02, 0.3, 'triangle', 600, 900, 0.033); },
    heal: (X, t) => [1047, 1319, 1568, 2093].forEach((f, i) => osc(X, t + i * 0.06, 0.4, 'sine', f, null, 0.035, { echo: true, attack: 0.01 })),
    status: (X, t) => { osc(X, t, 0.18, 'triangle', 700, 420, 0.04); nz(X, t, 0.12, 0.031, 'bandpass', 1400, 600, 1.2); },
    super: (X, t) => { osc(X, t, 0.25, 'triangle', 1568, 2093, 0.04, { attack: 0.003 }); osc(X, t + 0.05, 0.3, 'sine', 3136, null, 0.026, { attack: 0.003 }); },
    faint: (X, t) => { osc(X, t, 0.7, 'sine', 330, 110, 0.066, { lp: 900 }); nz(X, t + 0.5, 0.3, 0.044, 'lowpass', 500); },
    victory: (X, t) => [523, 659, 784, 1047].forEach((f, i) => osc(X, t + i * 0.09, i === 3 ? 0.6 : 0.2, 'triangle', f, null, 0.048, { attack: 0.005 })),
  };
  let seqLive = 0;
  Au.seq15 = function (name, o) {
    o = o || {}; const fn = SEQ15[name], P = root.A && root.A.Proto15;
    if (!fn || !P || !P.enabled() || !Au.sfxOn || !ctx || ctx.state !== 'running' || seqLive >= 2) return false;
    if (!mBus) mBus = bus(ctx, master);
    seqLive++; setTimeout(() => { seqLive = Math.max(0, seqLive - 1); }, name === 'atem9' ? 1500 : 700);
    try { fn({ c: ctx, out: mBus.out, echo: mBus.echo }, ctx.currentTime + 0.01 + (o.delay || 0)); } catch (e) { /* audio is optional */ }
    return true;
  };
  Au.SEQ15 = Object.keys(SEQ15);
  Au.renderSeq15 = async function (name, seconds) {
    const C = root.OfflineAudioContext || root.webkitOfflineAudioContext; if (!C || !SEQ15[name]) return null;
    const rate = 44100, c = new C(1, Math.ceil(rate * (seconds || 1.6)), rate), b = bus(c, c.destination); SEQ15[name]({ c, out: b.out, echo: b.echo }, 0.02);
    const buf = await c.startRendering(), d = buf.getChannelData(0), n = d.length, ab = new ArrayBuffer(44 + n * 2), dv = new DataView(ab);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, rate, true); dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, n * 2, true);
    let peak = 0; for (let i = 0; i < n; i++) { const v = Math.max(-1, Math.min(1, d[i])); peak = Math.max(peak, Math.abs(v)); dv.setInt16(44 + i * 2, v * 32767, true); }
    return { wav: ab, peak, seconds: n / rate };
  };
  Au.CUES = ['tap', 'idle', 'move', 'attack', 'special', 'impact', 'hurt', 'heal', 'guard', 'victory', 'defeat'];
})(typeof window !== 'undefined' ? window : globalThis);
