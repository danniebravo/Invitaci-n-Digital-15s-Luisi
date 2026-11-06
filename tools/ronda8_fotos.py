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


def matte(im, semilla):
    """Recorte fino: birefnet -> solo el componente de la persona -> pymatting (borde suave) -> color sin halo del fondo.
    semilla = (x, y) de un punto dentro de la persona (en px de im)."""
    from rembg import remove, new_session
    from pymatting import estimate_alpha_cf, estimate_foreground_ml
    a = np.asarray(remove(im, session=new_session("birefnet-general"), only_mask=True)).astype(np.float32) / 255
    n, lab, _, _ = cv2.connectedComponentsWithStats((a > .5).astype(np.uint8), connectivity=4)
    a = a * (lab == lab[semilla[1], semilla[0]])
    fg = cv2.erode((a > .97).astype(np.uint8), np.ones((9, 9), np.uint8))
    bg = 1 - cv2.dilate((a > .03).astype(np.uint8), np.ones((15, 15), np.uint8))
    tri = np.full(a.shape, .5, np.float64); tri[fg > 0] = 1; tri[bg > 0] = 0
    x = np.asarray(im.convert("RGB")).astype(np.float64) / 255
    al = np.clip(estimate_alpha_cf(x, tri), 0, 1)
    f = np.clip(estimate_foreground_ml(x, al), 0, 1)
    out = np.dstack([(f * 255).astype(np.uint8), (al * 255).astype(np.uint8)])
    return Image.fromarray(out, "RGBA")


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
        cut = matte(abrir(FV / "lu.JPG", 1300), (640, 880))
        cut = cut.crop(cut.getbbox()); cut.thumbnail((1400, 1800))
        # sin borrados manuales: el matte ya deja el rostro completo y sin arete suelto (la elipse anterior se comía la mejilla)
        cut.save(IMG / "luisa-xv.webp", "WEBP", quality=90, method=6)
        print("hero", cut.size)
    elif modo == "final":
        # final.png: la usuaria ya suavizó la piel de los brazos; aquí solo se recorta
        im = ImageOps.exif_transpose(Image.open(FV / "final.png")).convert("RGB")
        cut = matte(im, (560, 1000))
        cut = cut.crop(cut.getbbox()); cut.thumbnail((1200, 1800))
        cut.save(IMG / "luisa-final.webp", "WEBP", quality=90, method=6)
        print("final", cut.size)
    elif modo == "marco":
        # recorte con la cara al centro del óvalo (x=0..3375 de la foto de 4000x6000)
        im = ImageOps.exif_transpose(Image.open(FV / "marco.JPG")).convert("RGB")
        im = im.crop((0, 0, 3375, 4500)).resize((900, 1200), Image.LANCZOS)
        im.save(IMG / "foto-marco.webp", "WEBP", quality=86, method=6)
        print("marco", im.size)


if __name__ == "__main__":
    main()
