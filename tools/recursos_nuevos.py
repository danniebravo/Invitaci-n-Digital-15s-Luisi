"""Quita fondos de los recursos nuevos y los exporta a assets/img."""
import pathlib
import numpy as np, cv2
from PIL import Image
from rembg import remove, new_session

ROOT = pathlib.Path(__file__).resolve().parent.parent
R, O = ROOT / "recursos", ROOT / "assets" / "img"
sess = new_session("birefnet-general")


def save(im, name, maxw=1200, q=88):
    im = im.crop(im.getbbox()); im.thumbnail((maxw, maxw * 2))
    im.save(O / name, "WEBP", quality=q, method=6); print(name, im.size)


def cut(path):
    return remove(Image.open(path).convert("RGB"), session=sess, post_process_mask=True)


def white_key(path, soft=(232, 252)):
    """Fondo blanco -> transparente, suave (para acuarelas pálidas)."""
    a = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    dist = 255 - a.min(axis=2)               # qué tan lejos del blanco
    sat = a.max(axis=2) - a.min(axis=2)
    lo, hi = 255 - soft[1], 255 - soft[0]
    alpha = np.clip((np.maximum(dist, sat * 1.6) - lo) / (hi - lo), 0, 1)
    out = Image.fromarray(a.astype(np.uint8)).convert("RGBA")
    out.putalpha(Image.fromarray((alpha * 255).astype(np.uint8)))
    return out


def split(im, min_area=3000, dil=25):
    a = np.asarray(im)[..., 3]
    m = cv2.dilate((a > 25).astype(np.uint8), np.ones((dil, dil), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    parts = []
    for i in range(1, n):
        if st[i, 4] < min_area: continue
        arr = np.array(im); arr[..., 3] = arr[..., 3] * (lab == i)
        x, y, w, h = st[i, :4]
        parts.append(((x, y), Image.fromarray(arr).crop((x, y, x + w, y + h))))
    return sorted(parts, key=lambda p: (p[0][1] // 200, p[0][0]))


# Castillo sobre libro (fondo gris)
save(cut(R / "descarga.png"), "castillo.webp", 1000)

# Nubes rosas acuarela: dos grupos
for i, (_, p) in enumerate(split(white_key(R / "descarga (1).png"), 20000, 41)):
    save(p, f"nube-rosa-{i + 1}.webp", 1000)

# Marco ovalado dorado: fondo blanco fuera, interior rosa transparente
frame = cut(R / "descarga (2).png")
arr = np.array(frame); h, w = arr.shape[:2]
rgb = np.ascontiguousarray(arr[..., :3])
mask = np.zeros((h + 2, w + 2), np.uint8)
cv2.floodFill(rgb.copy(), mask, (w // 2, h // 2), (0, 0, 0), (22, 22, 22), (22, 22, 22), cv2.FLOODFILL_MASK_ONLY | (255 << 8))
hole = cv2.morphologyEx(mask[1:-1, 1:-1], cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
hole = cv2.GaussianBlur(hole, (0, 0), 1.5)
arr[..., 3] = (arr[..., 3] * (1 - hole / 255.0)).astype(np.uint8)
save(Image.fromarray(arr), "marco-oval.webp", 900)

# Palomas: separar las 4
for i, (_, p) in enumerate(split(cut(R / "44061b4c3c6631fa04510621f31cfd78.jpg"), 8000, 9)):
    save(p, f"paloma-{i + 1}.webp", 700)

# Estrellas doradas
for i, (_, p) in enumerate(split(cut(R / "0e8a4d19667a66ee98b72725ce25c048.jpg"), 2000, 9)):
    save(p, f"estrella-{i + 1}.webp", 300)

# Varita (cuadriculado falso)
save(cut(R / "12349a30a34b5d8d296335d2632cf02c.jpg"), "varita.webp", 600)

# Página rasgada: blanco puro fuera -> transparente
save(white_key(R / "2bf5e72ecaae1797a61a3cf1539f39a4.jpg", (244, 254)), "pagina-cuento.webp", 700)
