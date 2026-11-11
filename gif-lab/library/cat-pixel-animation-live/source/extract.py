#!/usr/bin/env python3
"""Режет лист спрайтов source/_.jpeg (4 колонки × 8 строк) на кадры по группам.

Результат: frames/<группа>/r{строка}c{колонка}.png
- белый фон убирается заливкой от краёв ячеек (белое внутри кошки остаётся);
- кадры кладутся на общий холст: по центру по горизонтали, тень (низ) на одной линии.

Группы задаёт словарь GROUPS ниже. Имя кадра — позиция на листе, по ней клипы в clips.json
ссылаются на кадры: например, "walk/r2c1".
Запуск из папки cat-pixel-animation-live: python3 source/extract.py   (нужен Pillow)
"""
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent.parent
SRC = HERE / 'source' / '_.jpeg'
OUT = HERE / 'frames'
COLS, ROWS = 4, 8
PAD = 4

# группа → кадры (строка, колонка) с листа
GROUPS = {
    'sit':   [(1, 1), (1, 2), (1, 3), (1, 4), (5, 1), (5, 2), (5, 3), (5, 4)],
    'wash':  [(3, 1), (3, 2), (3, 3), (3, 4), (6, 1), (6, 2), (6, 3), (6, 4)],
    'walk':  [(2, 1), (2, 2), (2, 3), (2, 4), (4, 1), (4, 2), (4, 3), (4, 4), (7, 1)],
    'lie':   [(7, 2), (7, 3), (7, 4), (8, 3), (8, 4)],
    'sleep': [(8, 1), (8, 2)],
}


def main():
    im = Image.open(SRC).convert('RGBA')
    W, H = im.size
    cw, ch = W // COLS, H // ROWS
    for x in range(0, W, cw):
        for y in range(0, H, ch):
            ImageDraw.floodfill(im, (x, y), (0, 0, 0, 0), thresh=40)

    crops = {}
    for r in range(1, ROWS + 1):
        for c in range(1, COLS + 1):
            cell = im.crop(((c - 1) * cw, (r - 1) * ch, c * cw, r * ch))
            bb = cell.getbbox()
            if bb is None:
                raise SystemExit(f'пустая ячейка r{r}c{c}')
            crops[(r, c)] = cell.crop(bb)

    cw_max = max(s.width for s in crops.values()) + PAD * 2
    ch_max = max(s.height for s in crops.values()) + PAD * 2

    # кадр, которого нет ни в одной группе, не теряем: кладём в other
    placed = {pos for group in GROUPS.values() for pos in group}
    for pos in crops:
        if pos not in placed:
            GROUPS.setdefault('other', []).append(pos)

    written = 0
    for group, positions in GROUPS.items():
        folder = OUT / group
        folder.mkdir(parents=True, exist_ok=True)
        for r, c in positions:
            spr = crops[(r, c)]
            canvas = Image.new('RGBA', (cw_max, ch_max), (0, 0, 0, 0))
            x = (cw_max - spr.width) // 2
            y = ch_max - PAD - spr.height
            canvas.paste(spr, (x, y), spr)
            canvas.save(folder / f'r{r}c{c}.png', optimize=True)
            written += 1
    print('кадров записано:', written, 'холст:', cw_max, 'x', ch_max)


if __name__ == '__main__':
    main()
