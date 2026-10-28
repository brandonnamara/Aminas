/* Aminas — procedural audio (no audio files). Starts only after a user gesture (iOS requirement). */
(function (root) {
  'use strict';
  const A = (root.A = root.A || {});
  const Au = (A.Audio = {});
  let ctx = null, master = null, musicGain = null, musicTimer = null, step = 0;
  Au.sfxOn = true; Au.musicOn = true; Au.mode = 'light';

  Au.unlock = function () {
    try {
      if (!ctx) {
        const C = root.AudioContext || root.webkitAudioContext; if (!C) return;
        ctx = new C(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
        musicGain = ctx.createGain(); musicGain.gain.value = 0.18; musicGain.connect(master);
      }
      if (ctx.state === 'suspended') ctx.resume();
      Au.applyMusic();
    } catch (e) { /* audio is optional */ }
  };

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
    if (ctx && Au.musicOn) musicTimer = setInterval(tick, Au.mode === 'battle' ? 260 : 420);
  };
  Au.setMode = function (m) { if (Au.mode !== m) { Au.mode = m; Au.applyMusic(); } };
  Au.setPrefs = function (s) { Au.sfxOn = !!s.sfx; Au.musicOn = !!s.music; Au.applyMusic(); };
})(typeof window !== 'undefined' ? window : globalThis);
