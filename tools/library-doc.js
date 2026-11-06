// Writes docs/art-bible/02_ASSET_LIBRARY.md from assets/library/manifest.json (run after tools/export-library.js)
const fs = require('fs'), path = require('path'); const man = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'library', 'manifest.json')));
const BUD = { terrain: 6000, vegetation: 2200, decor: 2500, water: 3000, buildings: 15000, ruins: 8000, architecture: 16000, biomes: 26000 };
const cats = { terrain: 'A. Terrain and geology', vegetation: 'B. Vegetation', architecture: 'C. Architecture: kit, standards and demonstrations', buildings: 'C. Architecture: the game\'s buildings', ruins: 'C. Architecture: ruins', decor: 'D. Environmental decoration', water: 'E. Water and atmosphere (objects)', biomes: 'Island identity vignettes (demonstrations)' };
let md = '# Aminas — Environment Asset Library\n\n*Generated from `assets/library/manifest.json` by `tools/library-doc.js` (' + man.generated.slice(0, 10) + '). Browse it live in `tools/library.html`.*\n\n';
md += '**Status:** `in-game` = on the Starter Island today · `library` = built, reviewed, exported, ready to place · `demo` = a demonstration of the standards, not a game asset.\n\n';
md += '**Files:**\n\n- `assets/library/vox/<category>/<id>[_variant].vox`: MagicaVoxel, 1 voxel = 1/8 cell (in git).\n- `assets/library/glb/...`: glTF binary for Godot 4, 1 unit = 1 cell. These are regenerated with `node tools/export-library.js`; they are in the release ZIP and not kept in git, because of size.\n\n';
const tot = { n: 0, v: 0, st: {} }; const over = [];
Object.keys(cats).forEach((c) => {
  const list = man.assets.filter((a) => a.cat === c); if (!list.length) return;
  md += '## ' + cats[c] + '\n\n| Asset | id | Footprint | Variants | Status | Triangles (full) | Mobile LOD |\n|---|---|---|---|---|---|---|\n';
  list.forEach((a) => { const t = a.stats.map((s) => s.tris), l = a.stats.map((s) => s.lodTris), rng = (x) => (Math.min(...x) === Math.max(...x) ? Math.min(...x).toLocaleString('en') : Math.min(...x).toLocaleString('en') + '–' + Math.max(...x).toLocaleString('en'));
    md += '| ' + a.title + ' | `' + a.id + '` | ' + a.fp.join('×') + ' | ' + a.variants + ' | ' + a.status + ' | ' + rng(t) + ' | ' + rng(l) + ' |\n';
    tot.n++; tot.v += a.variants; tot.st[a.status] = (tot.st[a.status] || 0) + 1; if (Math.max(...t) > BUD[c]) over.push(a.id + ' (' + Math.max(...t) + ' > ' + BUD[c] + ')'); });
  md += '\n';
});
md += '## Totals\n\n' + tot.n + ' assets, ' + tot.v + ' variants (' + Object.entries(tot.st).map(([k, v]) => v + ' ' + k).join(', ') + ').\n\n';
md += 'Budget check against the art bible, section 16 (per-category maxima: ' + Object.entries(BUD).map(([k, v]) => k + ' ' + v).join(', ') + '): ' + (over.length ? 'over budget: ' + over.join(', ') : 'all assets within budget') + '.\n\n';
md += '## Effect systems (in `src/3d/island3d.js`, not exported as models)\n\n- **Waterfalls:** ribbon shader, back sheet, churn and mist.\n- **Water surface:** ripple and sparkle.\n- **Clouds:** voxel banks.\n- **Distant islands:** hazed, with parallax.\n- **Pollen motes.**\n- **Magic motes:** in `MAGIC` hues.\n- **Sea glints and horizon mist:** in the backdrop.\n\nThese are documented in the art bible, section 11.\n';
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'art-bible', '02_ASSET_LIBRARY.md'), md); console.log('assets', tot.n, 'variants', tot.v, 'over budget:', over.join(', ') || 'none');
