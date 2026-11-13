# Phase 15B: current (top) vs refined (bottom) sheets for a list of forms rendered by tools/proto15-compare.js
import sys
from PIL import Image, ImageDraw
D, OUT, ids = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
W = 260; im = Image.new('RGB', (len(ids) * W, 2 * W + 26), '#0f1422'); d = ImageDraw.Draw(im)
for i, id in enumerate(ids):
    for j, k in enumerate(['cur', 'p15']):
        im.paste(Image.open(f'{D}/models/{id}-{k}-0.png').convert('RGB').resize((W, W)), (i * W, 26 + j * W))
    d.text((i * W + 6, 6), id, fill='#ffffff')
im.save(OUT, quality=85)
