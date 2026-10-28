// Loads the game's rule scripts (no DOM) into an isolated context, the same order index.html uses.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const RULE_FILES = ['data.js', 'world-maps.js', 'world-data.js', 'world.js', 'state.js', 'rules.js', 'quests.js', 'events.js', 'story.js'];
function load(extra) {
  const store = {};
  const ctx = { console, Math, Date, JSON, setTimeout, clearTimeout,
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
    _store: store };
  ctx.globalThis = ctx; vm.createContext(ctx);
  const files = RULE_FILES.concat(extra || []);
  const order = files.filter((f) => fs.existsSync(path.join(ROOT, 'src', f)));
  // newer builds may add rule modules; include them when present, in index.html order
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const listed = [...html.matchAll(/src="src\/([^"]+)"/g)].map((m) => m[1]).filter((f) => !/^(ui|art|c3d|island|audio|main|dungeon-art)/.test(f));
  const all = listed.length ? listed : order;
  all.forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'), ctx, { filename: f }));
  return ctx;
}
function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('FAIL  ' + m); } };
const done = (name) => { console.log('\n' + name + ': ' + pass + ' passed, ' + fail + ' failed'); process.exitCode = fail ? 1 : 0; };
module.exports = { load, seeded, ok, done, ROOT };
