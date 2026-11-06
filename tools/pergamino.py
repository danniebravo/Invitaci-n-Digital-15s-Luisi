"""Textura de pergamino (fibras, manchas, bordes tostados) -> assets/img/pergamino.webp
Uso: python tools/pergamino.py
"""
import pathlib
import numpy as np, cv2
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
W, H = 720, 1100
rng = np.random.default_rng(15)


def noise(sigma, seed_shape=(H, W)):
    n = rng.standard_normal(seed_shape).astype(np.float32)
    n = cv2.GaussianBlur(n, (0, 0), sigma)
    return n / (n.std() + 1e-6)


# manchas grandes y medianas (mottling) + grano fino
blot = .55 * noise(90) + .35 * noise(34) + .22 * noise(12)
grain = noise(1.1)
# fibras: ruido estirado en horizontal y en vertical
fh = cv2.GaussianBlur(rng.standard_normal((H, W)).astype(np.float32), (0, 0), sigmaX=22, sigmaY=.7); fh /= fh.std()
fv = cv2.GaussianBlur(rng.standard_normal((H, W)).astype(np.float32), (0, 0), sigmaX=.7, sigmaY=26); fv /= fv.std()
fib = .6 * fh + .4 * fv

# bordes tostados, finos y con ondulación leve
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
d = np.minimum(np.minimum(xx, W - 1 - xx), np.minimum(yy, H - 1 - yy)) + 7 * noise(14)
edge = np.clip(1 - d / 46.0, 0, 1) ** 2.2

base = np.array([245, 230, 200], np.float32)          # ~ --parch (#f3e4c6)
tan = np.array([205, 160, 96], np.float32)
dark = np.array([150, 100, 50], np.float32)

# luz/sombra suave y manchas cálidas (mezcla hacia tan solo donde la mancha es positiva)
warm = np.clip(.5 + .28 * blot, 0, 1)[..., None] * .38
img = base * (1 - warm) + tan * warm
img = img * (1 + .018 * blot[..., None])
img = img + grain[..., None] * 3.0 + fib[..., None] * 2.6
# vetas finas de fibra más claras y más oscuras
spots = np.clip((noise(16) - 1.5) / 1.2, 0, 1)[..., None]
img = img * (1 - .14 * spots) + tan * .14 * spots
e = (edge * (.75 + .25 * np.clip(.5 + .3 * blot, 0, 1)))[..., None]
img = img * (1 - .7 * e) + dark * .7 * e
img = np.clip(img, 0, 255).astype(np.uint8)
Image.fromarray(img).save(ROOT / "assets" / "img" / "pergamino.webp", "WEBP", quality=80, method=6)
print("ok", W, H)
