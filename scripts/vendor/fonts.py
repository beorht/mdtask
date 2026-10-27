#!/usr/bin/env python3
"""
Шрифты сайта — с самого сайта, а не с Google Fonts (на ПК класса нет интернета): Open Sans (текст страниц
и админки), JetBrains Mono (терминал ИБ), Oswald и Montserrat (светлая тема «Тетрадь»). Берутся из npm-пакетов @fontsource (те же файлы Google Fonts),
только woff2 и только нужные наборы символов: кириллица и латиница (с расширениями — для узбекской латиницы).
Пишет public/vendor/fonts/<шрифт>/*.woff2 и public/vendor/fonts/fonts.css с @font-face и unicode-range.
Файлы лежат в git; скрипт нужен, только чтобы обновить их. Запускается из scripts/vendor/fetch.sh.
"""

import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "vendor" / "fonts"
BASE = "https://cdn.jsdelivr.net/npm/@fontsource/{pkg}@{version}/"
SUBSETS = ("cyrillic-ext", "cyrillic", "latin-ext", "latin")
FONTS = [
    # (пакет, версия, файлы стилей пакета)
    ("open-sans", "5.1.0", ["400.css", "400-italic.css", "500.css", "600.css", "700.css"]),
    ("jetbrains-mono", "5.1.0", ["400.css", "500.css"]),
    # Светлая тема «Тетрадь» (docs/color-tetrad.md): заголовки Oswald, интерфейс Montserrat.
    ("oswald", "5.1.0", ["500.css"]),
    ("montserrat", "5.1.0", ["400.css", "400-italic.css", "500.css", "600.css", "700.css"]),
]
FACE_RE = re.compile(r"@font-face\s*\{(.*?)\}", re.S)


def get(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    css = ["/* Шрифты сайта (scripts/vendor/fonts.py, @fontsource): без обращения к Google Fonts. */", ""]
    for pkg, version, sheets in FONTS:
        base = BASE.format(pkg=pkg, version=version)
        (OUT / pkg).mkdir(exist_ok=True)
        for sheet in sheets:
            text = get(base + sheet).decode("utf-8")
            for body in FACE_RE.findall(text):
                m = re.search(r"url\(\./files/([^)]+?\.woff2)\)", body)
                if not m:
                    continue
                name = m.group(1)
                if not any(name.startswith(f"{pkg}-{sub}-") and name[len(pkg) + len(sub) + 2].isdigit()
                           for sub in SUBSETS):
                    continue
                data = get(base + "files/" + name)
                (OUT / pkg / name).write_bytes(data)
                print(f"  {len(data) // 1024:4d}K  public/vendor/fonts/{pkg}/{name}")
                lines = [line.strip() for line in body.strip().splitlines() if line.strip()]
                lines = [f"src: url(./{pkg}/{name}) format('woff2');" if line.startswith("src:") else line
                         for line in lines]
                css.append("@font-face {\n  " + "\n  ".join(lines) + "\n}")
    (OUT / "fonts.css").write_text("\n".join(css) + "\n", encoding="utf-8")
    print("  public/vendor/fonts/fonts.css")


if __name__ == "__main__":
    sys.exit(main())
