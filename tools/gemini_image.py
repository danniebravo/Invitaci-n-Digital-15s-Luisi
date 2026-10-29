"""Edita o genera una imagen con la API de Gemini.

Uso:
  GEMINI_API_KEY=... python tools/gemini_image.py salida.png "prompt" [entrada1.jpg entrada2.png ...]

La key se lee SOLO de la variable de entorno; nunca se guarda en el proyecto.
"""
import base64, json, os, sys, urllib.request, mimetypes

MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-3-pro-image")


def main():
    out, prompt, *inputs = sys.argv[1:]
    key = os.environ["GEMINI_API_KEY"]
    parts = []
    for p in inputs:
        mime = mimetypes.guess_type(p)[0] or "image/png"
        with open(p, "rb") as f:
            parts.append({"inline_data": {"mime_type": mime, "data": base64.b64encode(f.read()).decode()}})
    parts.append({"text": prompt})
    body = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]},
    }
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            data = json.load(r)
    except urllib.error.HTTPError as e:
        print("HTTP", e.code, e.read().decode()[:600]); sys.exit(1)
    for cand in data.get("candidates", []):
        for part in cand.get("content", {}).get("parts", []):
            blob = part.get("inline_data") or part.get("inlineData")
            if blob:
                with open(out, "wb") as f:
                    f.write(base64.b64decode(blob["data"]))
                print("saved", out); return
            if "text" in part:
                print("text:", part["text"][:300])
    print("no image returned", json.dumps(data)[:600]); sys.exit(2)


if __name__ == "__main__":
    main()
