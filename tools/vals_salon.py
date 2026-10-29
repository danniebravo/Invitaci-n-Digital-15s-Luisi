"""Recorta la pareja del vals (cuadros ya escalados 2x) y arma un WebP animado con transparencia."""
import sys, glob, os
import numpy as np, cv2
from PIL import Image
from rembg import remove, new_session

src, out = sys.argv[1], sys.argv[2]
files = sorted(glob.glob(os.path.join(src, "*.png")))
sess = new_session("birefnet-general")
frames = []
for f in files:
    im = Image.open(f).convert("RGB")
    cut = remove(im, session=sess, post_process_mask=True)
    a = np.asarray(cut)[..., 3]
    # quedarse solo con el componente principal (la pareja) + destellos cercanos
    n, lab, st, _ = cv2.connectedComponentsWithStats((a > 30).astype(np.uint8))
    if n > 1:
        main = 1 + int(np.argmax(st[1:, 4]))
        x, y, w, h = st[main, :4]
        keep = np.zeros_like(a, bool)
        pad = 60
        keep[max(0, y - pad):y + h + pad, max(0, x - pad):x + w + pad] = True
        arr = np.array(cut); arr[..., 3] = (arr[..., 3] * keep).astype(np.uint8)
        cut = Image.fromarray(arr)
    frames.append(cut)
    print(os.path.basename(f), end=" ", flush=True)
# caja común para que no "salte"
boxes = [fr.getbbox() for fr in frames if fr.getbbox()]
x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
frames = [fr.crop((x0, y0, x1, y1)) for fr in frames]
for fr in frames:
    fr.thumbnail((560, 560))
frames[0].save(out, "WEBP", save_all=True, append_images=frames[1:], duration=100, loop=0, quality=82, method=6, lossless=False)
print("\nsaved", out, frames[0].size, len(frames))
