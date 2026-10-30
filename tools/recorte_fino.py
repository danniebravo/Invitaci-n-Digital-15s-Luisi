"""Recorte fino del hero: BiRefNet + limpieza de los huecos de pared entre brazos y cabeza.

Uso: python tools/recorte_fino.py <foto_sin_texto.jpg>
Salida: assets/img/luisa-xv.webp y assets/img/og.jpg
"""
import sys, pathlib
import numpy as np, cv2
from PIL import Image
from rembg import remove, new_session

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from hero_photo import og  # noqa: E402

src = Image.open(sys.argv[1]).convert("RGB")
k = 2
im = src.resize((src.width * k, src.height * k), Image.LANCZOS)
W, H = im.size
alpha = np.asarray(remove(im, session=new_session("birefnet-general"), only_mask=True)).astype(np.float32) / 255

# Zona de los huecos: entre los brazos levantados y la cabeza (coordenadas de la foto 1080x1350)
zx0, zx1, zy0, zy1 = 470 * k, 730 * k, 112 * k, 300 * k
a = np.asarray(im).astype(np.uint8)
hsv = cv2.cvtColor(a, cv2.COLOR_RGB2HSV).astype(np.float32)
sat, val = hsv[..., 1] / 255, hsv[..., 2] / 255
# pared/arco: gris (poca saturación) y no tan oscuro como el pelo; la piel es más saturada
hue = hsv[..., 0]
skin = ((hue >= 0) & (hue <= 22) & (sat > .09)) | (hue >= 170)
wall = ((sat < .15) & (val > .32) & ~skin).astype(np.uint8)
zone = np.zeros_like(wall); zone[zy0:zy1, zx0:zx1] = 1
wall = wall * zone
wall = cv2.morphologyEx(wall, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
# solo manchas grandes (evita borrar brillos de piel o aretes)
n, lab, st, _ = cv2.connectedComponentsWithStats(wall)
clean = np.zeros_like(wall)
for i in range(1, n):
    if st[i, 4] > 900:
        clean[lab == i] = 1
clean = cv2.dilate(clean, np.ones((5, 5), np.uint8))
soft = cv2.GaussianBlur(clean.astype(np.float32), (0, 0), 2.2)
alpha = alpha * (1 - soft)
print("pixeles de pared quitados:", int(clean.sum()))

out = im.convert("RGBA")
out.putalpha(Image.fromarray((np.clip(alpha, 0, 1) * 255).astype(np.uint8)))
out = out.crop(out.getbbox())
out.thumbnail((1400, 1800))
out.save(ROOT / "assets" / "img" / "luisa-xv.webp", "WEBP", quality=90, method=6)
og(out)
print("ok", out.size)
