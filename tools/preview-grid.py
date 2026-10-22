#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
给 sprite sheet 画网格预览，便于人工确认每行帧数。
用法：python preview-grid.py <fname> <row1_cols> [<row2_cols> ...]
"""
import sys
from PIL import Image, ImageDraw, ImageFont

SRC = "E:/2026-10-18-22-54-21/baishou-yexing-fighter/assets/ref/noble/actions"
OUT = "E:/2026-10-18-22-54-21/baishou-yexing-fighter/assets/ref/noble/previews"


def draw_grid(fname, cols_per_row):
    img = Image.open(f"{SRC}/{fname}")
    draw = ImageDraw.Draw(img)
    h = img.height
    n_rows = len(cols_per_row)
    row_h = h / n_rows
    try:
        font = ImageFont.truetype("arial.ttf", 16)
    except:
        font = ImageFont.load_default()
    for ri, cols in enumerate(cols_per_row):
        y0 = int(ri * row_h)
        y1 = int((ri + 1) * row_h)
        draw.line([(0, y0), (img.width, y0)], fill="red", width=2)
        draw.line([(0, y1), (img.width, y1)], fill="red", width=2)
        w = img.width / cols
        for c in range(cols + 1):
            x = int(c * w)
            draw.line([(x, y0), (x, y1)], fill="red", width=2)
        for c in range(cols):
            x = int((c + 0.5) * w)
            draw.text((x - 6, (y0 + y1) // 2 - 8), str(c + 1), fill="yellow", font=font)
    out_path = f"{OUT}/{fname.replace('.jpg', '_grid.jpg')}"
    img.save(out_path)
    print(out_path)


if __name__ == "__main__":
    fname = sys.argv[1]
    cols = [int(x) for x in sys.argv[2:]]
    draw_grid(fname, cols)
