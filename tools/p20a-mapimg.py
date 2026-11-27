# Phase 20A: draws docs/audit20a/map.png (the labelled, proposed Celestial Crown map) from docs/audit20a/map.json,
# which tools/p20a-map.js writes from the real map data. Run: node tools/p20a-map.js && python3 tools/p20a-mapimg.py
import json
from PIL import Image, ImageDraw, ImageFont
d = json.load(open('docs/audit20a/map.json')); m = d['map']; C = 22; W = 34 * C; LEG = 440
img = Image.new('RGB', (W + LEG, W), '#141a3c'); dr = ImageDraw.Draw(img)
fp = '/usr/share/fonts/truetype/dejavu/'
F = ImageFont.truetype(fp + 'DejaVuSans.ttf', 13); FB = ImageFont.truetype(fp + 'DejaVuSans-Bold.ttf', 13); FT = ImageFont.truetype(fp + 'DejaVuSans-Bold.ttf', 17)
col = {'~': '#1d2a5e', 's': '#d6d0f2', 'g': '#9cb0ee', 'p': '#f0dfae', 'x': '#e8e4fb', 'w': '#5aa6d8'}
for y, row in enumerate(m):
    for x, c in enumerate(row):
        dr.rectangle([x * C, y * C, x * C + C - 1, y * C + C - 1], fill=col.get(c, '#888'))
        if c == '~' and (x + y) % 5 == 0: dr.point((x * C + C // 2, y * C + C // 2), fill='#3a4a8a')
oc = {'floatstone': '#8a86b8', 'starshard': '#fff3a8', 'moonbloom': '#c8a6f0', 'pillar': '#bfb8d8', 'cloudpuff': '#ffffff', 'geode': '#7a6ac8'}
for o in d['obstacles']:
    dr.rectangle([o['x'] * C + 3, o['y'] * C + 3, (o['x'] + o['w']) * C - 4, (o['y'] + o['h']) * C - 4], fill=oc[o['type']], outline='#4a4680')
for p in d['places']:
    dr.rectangle([p['x'] * C, p['y'] * C, (p['x'] + p['w']) * C - 1, (p['y'] + p['h']) * C - 1], outline='#ffd86b', width=3)
def dot(cx, cy, n, r=11):
    dr.ellipse([cx - r, cy - r, cx + r, cy + r], fill='#c2452a' if n < 10 else '#8a3fb0', outline='white', width=2)
    t = str(n); w = dr.textlength(t, font=FB); dr.text((cx - w / 2, cy - 8), t, fill='white', font=FB)
for s in d['sites']: dot(s['x'] * C + C // 2, s['y'] * C + C // 2, s['n'])
x0 = W + 18; y = 16
dr.text((x0, y), 'Celestial Crown, proposed (Phase 20A)', fill='white', font=FT); y += 26
for line in ['The real 34×34 map with its 62 obstacles; nothing moved.', 'Every site is on path or sand, never buildable grass.']:
    dr.text((x0, y), line, fill='#c8c4f0', font=F); y += 18
y += 8
for s in d['sites']:
    dot(x0 + 9, y + 9, s['n'], 9); dr.text((x0 + 26, y + 1), s['name'], fill='white', font=F); y += 23
y += 8
for p in d['places']:
    dr.rectangle([x0, y + 2, x0 + 18, y + 16], outline='#ffd86b', width=3); dr.text((x0 + 26, y + 1), p['name'], fill='white', font=F); y += 23
y += 8
for k, lab in [('g', 'grass: player building area (566 cells)'), ('p', 'path'), ('s', 'sand'), ('w', 'existing pond'), ('~', 'cloud sea')]:
    dr.rectangle([x0, y + 2, x0 + 18, y + 16], fill=col[k]); dr.text((x0 + 26, y + 1), lab, fill='white', font=F); y += 21
for k in oc:
    dr.rectangle([x0 + 3, y + 5, x0 + 15, y + 15], fill=oc[k], outline='#4a4680'); dr.text((x0 + 26, y + 1), k + ' (obstacle)', fill='white', font=F); y += 19
img.save('docs/audit20a/map.png'); print(img.size)
