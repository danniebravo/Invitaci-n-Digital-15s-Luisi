"""Genera un link personalizado por invitado a partir del listado (xlsx).

Uso: python tools/invitados_links.py            -> los 127 invitados
     python tools/invitados_links.py --prueba   -> solo Edward Basante y Samuel Urbano
Salida: invitados-links.csv (nombre, lugares, link). Contiene datos personales: no se sube a git ni a Vercel.
"""
import csv, re, sys, pathlib
from urllib.parse import quote
import openpyxl

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = "https://invitacion-digital-xvs-luisa-maria.vercel.app/"
PRUEBA = ("EDWARD BASANTE", "SAMUEL URBANO")
MENORES = {"y", "e", "de", "del", "la", "los", "las", "hijo", "hijos", "hija", "hijas", "esposo"}
ARREGLOS = {"SEÑORTIA": "SEÑORITA", "SEÑIRTA": "SEÑORITA", "HE": "E"}   # erratas del listado


def bonito(nombre):
    pal = [ARREGLOS.get(p, p) for p in nombre.strip().split()]
    out = []
    for p in pal:
        m = p.lower()
        if m == "sra":
            out.append("Sra.")
        elif m in MENORES:
            out.append(m)
        else:
            out.append(m.capitalize())
    txt = " ".join(out)
    return re.sub(r"\s+Sra\.", ", Sra.", txt, count=1) if " Sra." in txt and not txt.startswith("Sra.") and " y Sra." not in txt else txt


def main():
    ws = openpyxl.load_workbook(ROOT / "LISTADO INVITADOS 15 AÑOS LUISA MARIA.xlsx", data_only=True).active
    filas = []
    for r in ws.iter_rows(min_row=3, values_only=True):
        num, nombre, cant = r[1], r[2], r[3]
        if isinstance(num, int) and nombre and not str(nombre).startswith("INVITADOS"):
            filas.append((num, str(nombre), int(cant or 0)))
    if "--prueba" in sys.argv:
        filas = [f for f in filas if any(k in f[1].upper() for k in PRUEBA)]
    out = ROOT / "invitados-links.csv"
    with open(out, "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.writer(fh); w.writerow(["No.", "Nombre", "Lugares", "Link"])
        for num, nombre, cant in filas:
            link = f"{BASE}?para={quote(bonito(nombre), safe='')}" + (f"&c={cant}" if cant else "")
            w.writerow([num, bonito(nombre), cant, link])
            print(num, "|", bonito(nombre), "|", cant, "\n   ", link)
    print(len(filas), "links ->", out.name)


if __name__ == "__main__":
    main()
