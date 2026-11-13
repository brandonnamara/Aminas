// Phase 15C: renders the synthesised presentation sounds offline to WAV (no recorded or licensed audio is used).
// Run: node tools/c15-audio.js  -> docs/ui/screens15c/audio/<name>.wav
const { chromium } = require('playwright'); const serve = require('../tests/server'); const fs = require('fs'), path = require('path');
(async () => {
  const srv = await serve(); const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
  await p.goto(srv.url + '?p15=1'); await p.waitForFunction(() => window.A && A.Audio && A.Audio.renderSeq15);
  const dir = path.join(__dirname, '..', 'docs', 'ui', 'screens15c', 'audio'); fs.mkdirSync(dir, { recursive: true });
  const names = await p.evaluate(() => A.Audio.SEQ15);
  for (const n of names) {
    const r = await p.evaluate(async (n) => { const x = await A.Audio.renderSeq15(n, n === 'atem9' ? 1.7 : 1.0); return { b64: btoa(String.fromCharCode(...new Uint8Array(x.wav))), peak: x.peak }; }, n).catch(async () => p.evaluate(async (n) => { const x = await A.Audio.renderSeq15(n, n === 'atem9' ? 1.7 : 1.0); const u = new Uint8Array(x.wav); let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return { b64: btoa(s), peak: x.peak }; }, n));
    fs.writeFileSync(path.join(dir, n + '.wav'), Buffer.from(r.b64, 'base64')); console.log(n, 'peak', r.peak.toFixed(3));
  }
  await b.close(); srv.close();
})();
