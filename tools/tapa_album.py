"""Piezas de la tapa del álbum, sacadas de la invitación impresa.
Salida: assets/img/tapa-peonias.webp (marco de peonías con el centro limpio), castillo-libro.webp (castillo sobre el libro, fondo transparente), sello-l.webp
Uso: python tools/tapa_album.py
"""
import pathlib
import numpy as np, cv2
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"
src = Image.open(ROOT / "Invitación en imagen" / "invitacion-xv-luisa-vista-previa.jpg").convert("RGB")   # 1500x2100
a = np.asarray(src).astype(np.float32)
paper = np.median(a[300:340, 700:760].reshape(-1, 3), axis=0)  # crema liso entre títulos
print("papel", paper)

# --- marco: crema liso sobre todo el centro, con borde suave ---
H, W = a.shape[:2]
m = np.zeros((H, W), np.float32); m[205:1872, 230:1270] = 1
m[700:1010, 205:1295] = 1                    # restos de las hadas y del texto en los costados
m = cv2.GaussianBlur(m, (0, 0), 7)[..., None]
noise = cv2.GaussianBlur(np.random.default_rng(1).standard_normal((H, W)).astype(np.float32), (0, 0), 1.2)[..., None] * 1.6
fr = a * (1 - m) + (paper + noise) * m
Image.fromarray(np.clip(fr, 0, 255).astype(np.uint8)).resize((900, 1260), Image.LANCZOS).save(IMG / "tapa-peonias.webp", "WEBP", quality=84, method=6)

# --- castillo + libro: color-a-alfa respecto al papel ---
c = a[620:925, 372:1135]
al = np.clip(((paper - c) / paper).max(2) * 1.6, 0, 1)
al = np.where(al < .05, 0, al)
al[:150, 650:] = 0                           # hada rosa que asoma arriba a la derecha
col = np.clip((c - paper * (1 - al[..., None])) / np.maximum(al[..., None], .05), 0, 255)
rgba = np.dstack([col, al * 255]).astype(np.uint8)
Image.fromarray(rgba, "RGBA").save(IMG / "castillo-libro.webp", "WEBP", quality=88, method=6)

# --- sello L ---
s = Image.open(sorted((ROOT / "recursos").glob("sello-L-centrado.png"))[0]).convert("RGBA"); s.thumbnail((360, 360))
s.save(IMG / "sello-l.webp", "WEBP", quality=88, method=6)
print("ok")
