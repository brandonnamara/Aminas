# Phase 15 test: Meta concept (cropped from the user's concept sheet) above the code prototype and the current model.
import sys
from PIL import Image, ImageDraw
src = sys.argv[1]; M = 'docs/ui/screens15/models/'; out = sys.argv[2]
c = Image.open(src).convert('RGB'); W, H = c.size
crop = c.crop((int(W * 0.505), int(H * 0.04), int(W * 0.99), int(H * 0.40))); crop = crop.resize((900, int(900 * crop.size[1] / crop.size[0])))
row = lambda kind: [Image.open(M + f'{i}-{kind}-0.png').convert('RGB').resize((300, 300)) for i in ['meta1', 'meta2', 'meta']]
im = Image.new('RGB', (900, crop.size[1] + 650), '#0f1422'); d = ImageDraw.Draw(im)
d.text((8, 6), 'Your concept', fill='#ffd978'); im.paste(crop, (0, 24)); y = 24 + crop.size[1] + 8
d.text((8, y), 'Phase 15, sculpted in code: Meta, Meta II, Meta III', fill='#ffd978')
for i, a in enumerate(row('p15')): im.paste(a, (i * 300, y + 18))
y += 326; d.text((8, y), 'Current in game', fill='#9fb3d8')
for i, a in enumerate(row('cur')): im.paste(a, (i * 300, y + 18))
im.save(out, quality=88)
