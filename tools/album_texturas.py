"""Texturas del libro del álbum.

Uso: python tools/album_texturas.py
- assets/img/damasco-beige.webp: fondo de las hojas (damasco beige).
- assets/img/cover-damasco-rosa.webp: fondo de la tapa; el parche rosado de recursos/descargaf.png reflejado en vertical (3:4).
"""
import pathlib
from PIL import Image, ImageOps

ROOT = pathlib.Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"

bg = Image.open(ROOT / "tools" / "invitacion-imagen" / "damasco-beige.jpg").convert("RGB")
bg.thumbnail((1000, 1046), Image.LANCZOS)
bg.save(IMG / "damasco-beige.webp", "WEBP", quality=78, method=6)

src = Image.open(ROOT / "recursos" / "descargaf.png").convert("RGB")
patch = src.crop((215, 372, 935, 812))                       # solo el parche rosado, sin los bordes grises del collage
tall = Image.new("RGB", (patch.width, patch.height * 2))
tall.paste(patch, (0, 0)); tall.paste(ImageOps.flip(patch), (0, patch.height))   # reflejo vertical: el damasco es simétrico
w = round(tall.height * 3 / 4)
tall = tall.crop(((tall.width - w) // 2, 0, (tall.width - w) // 2 + w, tall.height))
tall = tall.resize((900, 1200), Image.LANCZOS)
tall.save(IMG / "cover-damasco-rosa.webp", "WEBP", quality=82, method=6)
print("ok", (IMG / "damasco-beige.webp").stat().st_size // 1024, "KB;", (IMG / "cover-damasco-rosa.webp").stat().st_size // 1024, "KB")
