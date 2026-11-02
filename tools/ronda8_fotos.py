"""Ronda 8: prepara las fotos nuevas (hero, marco, final) con la rotación EXIF corregida.

Uso: python tools/ronda8_fotos.py hero|marco|final
"""
import sys, pathlib
import numpy as np, cv2
from PIL import Image, ImageOps, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"
FV = ROOT / "fotos luisa" / "fotos con vestido"


def abrir(p, ancho):
    im = ImageOps.exif_transpose(Image.open(p)).convert("RGB")
    return im.resize((ancho, round(im.height * ancho / im.width)), Image.LANCZOS)


def recortar(im):
    from rembg import remove, new_session
    out = remove(im, session=new_session("birefnet-general"), post_process_mask=True)
    return out


def suavizar_brazos(im):
    """Quita la textura granulosa de la piel de hombros y brazos sin tocar cara ni vestido."""
    a = np.asarray(im.convert("RGB"))
    ycc = cv2.cvtColor(a, cv2.COLOR_RGB2YCrCb)
    cr, cb = ycc[..., 1], ycc[..., 2]
    piel = ((cr > 140) & (cr < 180) & (cb > 85) & (cb < 128)).astype(np.uint8)
    piel = cv2.morphologyEx(piel, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    h, w = piel.shape
    # excluir la cara/cuello (franja superior central): solo hombros y brazos
    zona = np.ones_like(piel)
    zona[: int(h * .16), :] = 0
    piel = piel * zona
    m = cv2.GaussianBlur(piel.astype(np.float32), (0, 0), 6)[..., None]
    # separación de frecuencias: se alisa solo el detalle fino
    f = a.astype(np.float32)
    bajo = cv2.bilateralFilter(a, 15, 38, 15).astype(np.float32)
    bajo = cv2.GaussianBlur(bajo, (0, 0), 3)
    detalle = f - cv2.GaussianBlur(f, (0, 0), 3)
    suave = bajo + detalle * 0.18
    out = f * (1 - m) + suave * m
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def main():
    modo = sys.argv[1]
    if modo == "hero":
        cut = recortar(abrir(FV / "lu.JPG", 1600))
        cut = cut.crop(cut.getbbox()); cut.thumbnail((1400, 1800))
        cut.save(IMG / "luisa-xv.webp", "WEBP", quality=90, method=6)
        print("hero", cut.size)
    elif modo == "final":
        im = suavizar_brazos(abrir(FV / "brazos.JPG", 1600))
        im.save(ROOT / "tools" / "_final_suave.jpg", quality=95)
        cut = recortar(im)
        cut = cut.crop(cut.getbbox()); cut.thumbnail((1200, 1800))
        cut.save(IMG / "luisa-final.webp", "WEBP", quality=90, method=6)
        print("final", cut.size)
    elif modo == "marco":
        im = abrir(FV / "marco.JPG", 1500)
        im.save(ROOT / "tools" / "_marco_full.jpg", quality=92)
        print("marco", im.size)


if __name__ == "__main__":
    main()
