"""WebP animado de respaldo para el video del baile (celulares que bloquean el autoplay de video).
Uso: python tools/video_fallback.py
Salida: assets/img/vals-bosque-anim.webp
"""
import pathlib, subprocess, tempfile
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
src = ROOT / "assets" / "video" / "vals-bosque.mp4"
out = ROOT / "assets" / "img" / "vals-bosque-anim.webp"
FPS, W = 12, 420
with tempfile.TemporaryDirectory() as d:
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-vf", f"fps={FPS},scale={W}:-2:flags=lanczos", f"{d}/f%03d.png"], check=True)
    frames = [Image.open(p).convert("RGB") for p in sorted(pathlib.Path(d).glob("f*.png"))]
    frames[0].save(out, "WEBP", save_all=True, append_images=frames[1:], duration=round(1000 / FPS), loop=0, quality=55, method=6)
print(len(frames), "cuadros", frames[0].size, round(out.stat().st_size / 1024), "KB")
