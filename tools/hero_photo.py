"""Prepara la foto principal (hero) de Luisa.

Uso:
  python tools/hero_photo.py <foto.jpg> [--quitar-texto]

- --quitar-texto: borra el texto blanco superpuesto (borrador) con LaMa local.
  Con la foto limpia que llega del estudio, se corre SIN esa opción.
- Recorta a Luisa con BiRefNet y guarda assets/img/luisa-xv.webp
- Regenera assets/img/og.jpg (vista previa al compartir el enlace).
"""
import sys, pathlib
import numpy as np, cv2
from PIL import Image, ImageFilter, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"


def quitar_texto(im: Image.Image) -> Image.Image:
    from simple_lama_inpainting import SimpleLama
    a = np.asarray(im.convert("RGB")).astype(np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    hi = (r > 205) & (g > 205) & (b > 205) & ((np.max(a, 2) - np.min(a, 2)) < 40)
    m = np.zeros(hi.shape, np.uint8)
    h, w = hi.shape
    # zona del texto/logo (proporciones de la foto 1080x1350 del estudio)
    y0, y1, x0, x1 = int(h * .46), int(h * .86), int(w * .24), int(w * .78)
    m[y0:y1, x0:x1] = hi[y0:y1, x0:x1].astype(np.uint8) * 255
    m = cv2.dilate(m, np.ones((9, 9), np.uint8), iterations=2)
    Image.fromarray(m).save(ROOT / "tools" / "_mask_debug.png")
    return SimpleLama()(im.convert("RGB"), Image.fromarray(m)).resize(im.size)


def recortar(im: Image.Image) -> Image.Image:
    from rembg import remove, new_session
    up = im.resize((im.width * 2, im.height * 2), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 60, 2))
    out = remove(up, session=new_session("birefnet-general"), post_process_mask=True)
    return out.crop(out.getbbox())


def og(cut: Image.Image):
    W, H = 1200, 630
    bg = Image.open(IMG / "valle-poster.webp").convert("RGBA")
    r = max(W / bg.width, H / bg.height)
    bg = bg.resize((int(bg.width * r), int(bg.height * r)))
    bg = bg.crop(((bg.width - W) // 2, bg.height - H, (bg.width - W) // 2 + W, bg.height))
    glow = Image.new("RGBA", (W, H)); ImageDraw.Draw(glow).ellipse((W // 2 - 320, 20, W // 2 + 320, 720), fill=(255, 240, 246, 180))
    bg.alpha_composite(glow.filter(ImageFilter.GaussianBlur(70)))
    g = cut.copy(); g.thumbnail((900, 600))
    bg.alpha_composite(g, ((W - g.width) // 2, H - g.height + 10))
    bg.convert("RGB").save(IMG / "og.jpg", quality=86)


def main():
    src = pathlib.Path(sys.argv[1])
    im = Image.open(src).convert("RGB")
    if "--quitar-texto" in sys.argv:
        im = quitar_texto(im)
        im.save(ROOT / "tools" / "_sin_texto.jpg", quality=95)
    cut = recortar(im)
    cut.thumbnail((1400, 1800))
    cut.save(IMG / "luisa-xv.webp", "WEBP", quality=90, method=6)
    og(cut)
    print("ok", cut.size)


if __name__ == "__main__":
    main()
