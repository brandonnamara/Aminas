# Phase 15: composes current-vs-prototype model sheets from tools/proto15-compare.js renders.
import sys
from PIL import Image, ImageDraw
D = sys.argv[1]; OUT = sys.argv[2]
groups = {'lumifern': ['lumifern', 'solarbloom', 'aurelith'], 'igniflare': ['igniflare', 'pyronix', 'ignivor'], 'atem': ['atem1', 'atem2', 'atem']}
names = {'lumifern': 'Lumifern', 'solarbloom': 'Lumifern II', 'aurelith': 'Lumifern III', 'igniflare': 'Igniflare', 'pyronix': 'Igniflare II', 'ignivor': 'Igniflare III', 'atem1': 'Atem', 'atem2': 'Atem II', 'atem': 'Atem III'}
W = 300
for g, ids in groups.items():
    im = Image.new('RGB', (6 * W, 2 * W + 40), '#0f1422'); d = ImageDraw.Draw(im)
    for i, id in enumerate(ids):
        for j, k in enumerate(['cur', 'p15']):
            for v in range(2):
                a = Image.open(f'{D}/{id}-{k}-{v}.png').convert('RGB'); im.paste(a, (i * 2 * W + v * W, 40 + j * W))
        d.text((i * 2 * W + 8, 12), names[id], fill='#ffffff')
    d.text((6 * W - 230, 12), 'top: current   bottom: Phase 15', fill='#9fb3d8')
    im.save(f'{OUT}/compare-{g}.jpg', quality=88)
