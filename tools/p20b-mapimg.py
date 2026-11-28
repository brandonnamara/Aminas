# Phase 20B: draws docs/audit20b/map.png (the labelled Celestial Crown map, as built) from docs/audit20b/map.json, which
# tools/p20b-map.js writes from the game data. Run: node tools/p20b-map.js && python3 tools/p20b-mapimg.py
import json
from PIL import Image, ImageDraw, ImageFont
d = json.load(open('docs/audit20b/map.json')); m = d['map']; C = 22; W = 34 * C; LEG = 470
img = Image.new('RGB', (W + LEG, W + 20), '#141a3c'); dr = ImageDraw.Draw(img)
fp = '/usr/share/fonts/truetype/dejavu/'
F = ImageFont.truetype(fp + 'DejaVuSans.ttf', 13); FB = ImageFont.truetype(fp + 'DejaVuSans-Bold.ttf', 13); FT = ImageFont.truetype(fp + 'DejaVuSans-Bold.ttf', 17); FS = ImageFont.truetype(fp + 'DejaVuSans-Bold.ttf', 10)
col = {'~': '#1d2a5e', 's': '#d6d0f2', 'g': '#9cb0ee', 'p': '#f0dfae', 'x': '#e8e4fb', 'w': '#5aa6d8'}
for y, row in enumerate(m):
    for x, c in enumerate(row):
        dr.rectangle([x * C, y * C, x * C + C - 1, y * C + C - 1], fill=col.get(c, '#888'))
        if c == '~' and (x + y) % 5 == 0: dr.point((x * C + C // 2, y * C + C // 2), fill='#3a4a8a')
oc = {'floatstone': '#8a86b8', 'starshard': '#fff3a8', 'moonbloom': '#c8a6f0', 'pillar': '#bfb8d8', 'cloudpuff': '#ffffff', 'geode': '#7a6ac8'}
for o in d['obstacles']:
    dr.rectangle([o['x'] * C + 3, o['y'] * C + 3, (o['x'] + o['w']) * C - 4, (o['y'] + o['h']) * C - 4], fill=oc[o['type']], outline='#4a4680')
letters = {}
for i, s in enumerate(d['sites']):
    L = 'ABCDEFGHIJKL'[i]; letters[s['id']] = L
    dr.rectangle([s['x'] * C, s['y'] * C, (s['x'] + s['w']) * C - 1, (s['y'] + s['h']) * C - 1], outline='#8a6ad8' if s['role'] != 'hub' else '#ffd86b', width=3)
    dr.text((s['x'] * C + 3, s['y'] * C + 2), L, fill='#3a2a7a', font=FS)
def dot(cx, cy, n, r=11):
    dr.ellipse([cx - r, cy - r, cx + r, cy + r], fill='#c2452a' if n < 10 else '#8a3fb0', outline='white', width=2)
    t = str(n); w = dr.textlength(t, font=FB); dr.text((cx - w / 2, cy - 8), t, fill='white', font=FB)
for g in d['gates']: dot(g['x'] * C + C // 2, g['y'] * C + C // 2 + (C if g['inside'] else 0), g['n'])
x0 = W + 18; y = 14
dr.text((x0, y), 'Celestial Crown, as built (Phase 20B)', fill='white', font=FT); y += 24
for line in ['The real 34×34 map, 62 obstacles; nothing moved.', 'Every place and entrance is on path, sand or', 'the observatory slot, never on buildable grass.']:
    dr.text((x0, y), line, fill='#c8c4f0', font=F); y += 17
y += 6
for g in d['gates']:
    dot(x0 + 9, y + 9, g['n'], 9); dr.text((x0 + 26, y + 1), g['name'] + '  (rec ' + str(g['rec']) + ', sealed)', fill='white', font=F); y += 21
y += 6
for s in d['sites']:
    dr.rectangle([x0, y + 2, x0 + 18, y + 16], outline='#8a6ad8' if s['role'] != 'hub' else '#ffd86b', width=3); dr.text((x0 + 5, y + 3), letters[s['id']], fill='white', font=FS)
    dr.text((x0 + 26, y + 1), s['name'] + ('  (hub)' if s['role'] == 'hub' else '  (arrival)' if s['role'] == 'arrival' else ''), fill='white', font=F); y += 20
img.save('docs/audit20b/map.png'); print(img.size)
