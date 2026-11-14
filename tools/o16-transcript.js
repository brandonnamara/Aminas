// Phase 16A: writes the complete opening dialogue transcript from the game's own text (src/onboard16.js), so the
// document can never drift from what plays. Run: node tools/o16-transcript.js -> docs/PHASE16A-transcript.md
const fs = require('fs'), path = require('path'); const { load } = require('../tests/harness');
const W = load().A.Onboard16.WORDS, MOOD = { n: 'neutral', t: 'tired', s: 'startled', a: 'looking away', w: 'wry', c: 'eyes closed' };
const line = ([m, x]) => m === '*' ? '*' + x + '*' : m === 'you' ? '**[name] (the player):** ' + x.replace(/\{name\}/g, '[name]') : '**The Entity** (' + (MOOD[m] || m) + '): ' + x.replace(/\{name\}/g, '[name]').replace('{rec}', '4');
const sec = (t, note, lines) => '## ' + t + '\n\n' + (note ? note + '\n\n' : '') + lines.map((l) => '- ' + line(l)).join('\n') + '\n';
let md = '# Phase 16A — complete opening dialogue transcript\n\nGenerated from `src/onboard16.js` by `tools/o16-transcript.js`. Shown only with the Phase 16A switch on. [name] is the name the player gave their avatar ("Kind Soul" if left empty).\n\n';
md += '## Opening cinematic captions\n\n' + W.captions.map((c) => '- “' + c + '”').join('\n') + '\n\n';
md += sec('First conversation (after the cinematic)', 'Skipping the cinematic also skips this conversation.', W.arrival) + '\n';
md += sec('Resuming at the starter choice', 'Only for a game that was closed after the cinematic and before a starter was chosen.', W.resume) + '\n';
md += sec('Starter choice: the Entity’s introduction', 'One line at a time on the strip above the cards (→ shows the next).', W.starterIntro) + '\n';
md += sec('Starter choice: when a starter is tapped', '', [W.starterAside.lumifern, W.starterAside.umbrit]) + '\n';
md += sec('After choosing Lumifern', '', W.starterChosen.lumifern) + '\n' + sec('After choosing Umbrit', '', W.starterChosen.umbrit) + '\n';
md += '## One-time lines (shown as the Entity’s toast)\n\n' + [['First look at your companion', W.inspect], ['First time in the Battle menu', W.battleMenu], ['First time in the Hatchery', W.hatchery], ['First time in the Forge', W.forge]].map(([k, v]) => '- **' + k + ':** ' + v).join('\n') + '\n\n';
md += sec('First visit to Dungeons', '{rec} is the dungeon’s own recommended level (4 for the Forgotten Road).', W.dungeons) + '\n';
md += '## First-battle coach (one at a time, each once)\n\n' + Object.keys(W.coach).map((k) => '- **' + k + ':** ' + W.coach[k].replace('{a}', '[move element]').replace('{b}', '[foe element]')).join('\n') + '\n\n';
md += sec('Back on the island after the first win (the handoff)', '', W.handoff);
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'PHASE16A-transcript.md'), md); console.log('wrote docs/PHASE16A-transcript.md', md.length, 'chars');
