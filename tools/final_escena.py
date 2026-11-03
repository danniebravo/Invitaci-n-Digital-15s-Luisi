"""Escena del final: video de flores sin puerta + Luisa de pie donde estaba la puerta + flores por delante.

Uso: python tools/final_escena.py <original.mp4> [luisa-recortada.png|webp]
Salida: assets/video/flores-fin-d.mp4 (1280 px), flores-fin-m.mp4 (celular, recorte central) y assets/img/flores-fin-poster.jpg
Ella se compone dentro del video para que quede alineada con las flores en cualquier pantalla.
"""
import sys, pathlib, subprocess
import numpy as np, cv2
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
V = ROOT / "assets" / "video"
src = sys.argv[1]
cut = Image.open(sys.argv[2] if len(sys.argv) > 2 else ROOT / "assets" / "img" / "luisa-final.webp").convert("RGBA")

cap = cv2.VideoCapture(src)
W, H, FPS = int(cap.get(3)), int(cap.get(4)), cap.get(5)

# --- puerta (mismo relleno de tools/quitar_puerta.py) ---
X0, X1, Y0, Y1 = 755, 1155, 165, 795
CX = 955
AXL, AXR = 750, 1160
xs = np.arange(W)
m = np.zeros((H, W), np.float32); m[Y0:Y1, X0:X1] = 1
M = cv2.GaussianBlur(m, (0, 0), 22)[..., None]
sl = np.clip(2 * AXL - xs, 0, W - 1); sr = np.clip(2 * AXR - xs, 0, W - 1)
wr = np.clip((xs - CX + 60) / 120, 0, 1); wr = (wr * wr * (3 - 2 * wr))[None, :, None]
dark = (0.42 - .12 * np.exp(-((xs - CX) / 110.0) ** 2))[None, :, None]

# --- ella: alto ~65 % del cuadro, cabeza donde empezaba la puerta ---
HER_H, HER_TOP = 760, 200
hw = round(cut.width * HER_H / cut.height)
her = cut.resize((hw, HER_H), Image.LANCZOS)
a = np.asarray(her).astype(np.float32)
rgb, al = a[..., :3], a[..., 3] / 255
yy = np.arange(HER_H)[:, None]
al = al * np.clip((HER_H - 1 - yy) / 190.0, 0, 1) ** 1.4              # el vestido se desvanece abajo (lo tapan las flores)
# los lados del vestido salen cortados por el borde de la foto: se difuminan en la zona del vestido
xx = np.arange(hw)[None, :] / hw
rx = np.clip(np.minimum(xx, 1 - xx) / .24, 0, 1); rx = rx * rx * (3 - 2 * rx)
wz = np.clip((yy / HER_H - .40) / .15, 0, 1)
al = al * (1 - wz * (1 - rx))
al = cv2.GaussianBlur(al, (0, 0), .7)
# integrar con la luz de la escena: más oscura, cálida, y más iluminada arriba (haz de luz)
lum = ((0.80 + 0.20 * np.clip(1 - yy / (HER_H * .8), 0, 1)) * (1 - .5 * np.clip((yy / HER_H - .55) / .45, 0, 1) ** 1.5))[..., None]
tint = np.array([1.0, .93, .90], np.float32)                      # BGR después del paso a cv2: se ajusta abajo
rgb = rgb * lum
gray = rgb.mean(2, keepdims=True); rgb = gray + (rgb - gray) * .9     # un poco menos de saturación
rgb = np.clip(rgb * np.array([.96, .98, 1.0], np.float32), 0, 255)    # RGB: algo más cálido
her_bgr = rgb[..., ::-1].copy()
ox, oy = CX - hw // 2, HER_TOP
ya, yb = oy, min(H, oy + HER_H); xa, xb = max(0, ox), min(W, ox + hw)
hs = (slice(ya - oy, yb - oy), slice(xa - ox, xb - ox))


def guardar(ruta, img, *params):
    ruta = pathlib.Path(ruta); ruta.write_bytes(cv2.imencode(ruta.suffix, img, list(params))[1].tobytes())


def ffmpeg(out, vf):
    return subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS),
                             "-i", "-", "-an", "-vf", vf, "-c:v", "libx264", "-crf", "28", "-preset", "slow", "-pix_fmt", "yuv420p",
                             "-movflags", "+faststart", str(out)], stdin=subprocess.PIPE)


pd = ffmpeg(V / "flores-fin-d.mp4", "scale=1280:-2")
pm = ffmpeg(V / "flores-fin-m.mp4", "crop=608:1080:656:0,scale=540:-2")
rampy = np.clip((np.arange(H) - 740) / 70.0, 0, 1)[:, None]; rampy = rampy * rampy * (3 - 2 * rampy)
n = 0
while True:
    ok, f = cap.read()
    if not ok:
        break
    f = f.astype(np.float32)
    fill = (f[:, sl] * (1 - wr) + f[:, sr] * wr) * dark
    o = f * (1 - M) + fill * M                                   # fondo sin puerta
    out = o.copy()
    al3 = al[hs][..., None]
    out[ya:yb, xa:xb] = o[ya:yb, xa:xb] * (1 - al3) + her_bgr[hs] * al3   # ella
    # flores por delante (solo la parte baja): flor = color vivo; hojas oscuras = cobertura parcial
    mx, mn = o.max(2) / 255, o.min(2) / 255
    sat = (mx - mn) / np.maximum(mx, 1e-3)
    flor = np.clip((sat * mx - .10) / .22, 0, 1)
    hoja = .35 * np.clip((sat - .25) / .3, 0, 1) * (mx > .05)
    fg = cv2.GaussianBlur(np.maximum(flor, hoja), (0, 0), 1.0) * rampy
    out = out * (1 - fg[..., None]) + o * fg[..., None]
    out = np.clip(out, 0, 255).astype(np.uint8)
    if n == 24:
        guardar(ROOT / "assets" / "img" / "flores-fin-poster.jpg", cv2.resize(out, (1280, 720), interpolation=cv2.INTER_AREA), cv2.IMWRITE_JPEG_QUALITY, 82)
    if n in (0, 120, 240):
        guardar(ROOT / "tools" / f"_escena_{n}.jpg", cv2.resize(out, (1280, 720), interpolation=cv2.INTER_AREA), cv2.IMWRITE_JPEG_QUALITY, 90)
    b = out.tobytes(); pd.stdin.write(b); pm.stdin.write(b); n += 1
for p in (pd, pm):
    p.stdin.close(); p.wait()
print("cuadros", n)
