"""Quita la puerta del video de flores del final (relleno con flores reflejadas, cuadro por cuadro).

Uso: python tools/quitar_puerta.py <original.mp4>
Salida: assets/video/flores-fin-d.mp4 (1280 px), flores-fin-m.mp4 (celular, recorte central) y assets/img/flores-fin-poster.jpg
"""
import sys, pathlib, subprocess
import numpy as np, cv2

ROOT = pathlib.Path(__file__).resolve().parent.parent
V = ROOT / "assets" / "video"
src = sys.argv[1]

cap = cv2.VideoCapture(src)
W, H, FPS = int(cap.get(3)), int(cap.get(4)), cap.get(5)
X0, X1, Y0, Y1 = 755, 1155, 165, 795          # caja de la puerta (1920x1080), con margen
CX = 955
AXL, AXR = 750, 1160                          # ejes del espejo (justo fuera de la puerta)

xs = np.arange(W)
m = np.zeros((H, W), np.float32); m[Y0:Y1, X0:X1] = 1
M = cv2.GaussianBlur(m, (0, 0), 22)[..., None]
sl = np.clip(2 * AXL - xs, 0, W - 1); sr = np.clip(2 * AXR - xs, 0, W - 1)
wr = np.clip((xs - CX + 60) / 120, 0, 1); wr = (wr * wr * (3 - 2 * wr))[None, :, None]
dark = (0.42 - .12 * np.exp(-((xs - CX) / 110.0) ** 2))[None, :, None]  # claro sombreado: oculta la simetría del espejo


def guardar(ruta, img, *params):
    # cv2.imwrite falla con tildes en la ruta (Windows)
    ruta = pathlib.Path(ruta); ruta.write_bytes(cv2.imencode(ruta.suffix, img, list(params))[1].tobytes())


def ffmpeg(out, vf, w, h):
    return subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{w}x{h}", "-r", str(FPS),
                             "-i", "-", "-an", "-vf", vf, "-c:v", "libx264", "-crf", "29", "-preset", "slow", "-pix_fmt", "yuv420p",
                             "-movflags", "+faststart", str(out)], stdin=subprocess.PIPE)


pd = ffmpeg(V / "flores-fin-d.mp4", "scale=1280:-2", W, H)
pm = ffmpeg(V / "flores-fin-m.mp4", "crop=608:1080:656:0,scale=540:-2", W, H)
n = 0
while True:
    ok, f = cap.read()
    if not ok:
        break
    f = f.astype(np.float32)
    fill = (f[:, sl] * (1 - wr) + f[:, sr] * wr) * dark
    o = np.clip(f * (1 - M) + fill * M, 0, 255).astype(np.uint8)
    if n == 24:
        guardar(ROOT / "assets" / "img" / "flores-fin-poster.jpg", cv2.resize(o, (1280, 720), interpolation=cv2.INTER_AREA), cv2.IMWRITE_JPEG_QUALITY, 82)
    if n in (0, 120, 240):
        guardar(ROOT / "tools" / f"_puerta_{n}.jpg", cv2.resize(o, (960, 540), interpolation=cv2.INTER_AREA))
    b = o.tobytes(); pd.stdin.write(b); pm.stdin.write(b); n += 1
for p in (pd, pm):
    p.stdin.close(); p.wait()
print("cuadros", n)
