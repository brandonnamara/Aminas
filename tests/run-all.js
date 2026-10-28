// Runs every v0.6 suite in order. Node suites need nothing else; the browser suite needs Playwright + Chromium.
const { execFileSync } = require('child_process'); const path = require('path');
const suites = ['baseline.test.js', 'campaign.test.js', 'migration-v06.test.js', 'modes.test.js', 'browser-v06.test.js'];
let failed = 0;
suites.forEach((f) => { try { const out = execFileSync(process.execPath, [path.join(__dirname, f)], { encoding: 'utf8', timeout: 600000 }); console.log(out.trim().split('\n').slice(-1)[0]); } catch (e) { failed++; console.log(f + ': FAILED\n' + (e.stdout || '') + (e.stderr || '')); } });
process.exitCode = failed ? 1 : 0;
