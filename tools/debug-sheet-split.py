#!/usr/bin/env python3
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
REF_DIR = os.path.join(ROOT, "assets", "ref")
OUT_DIR = os.path.join(ROOT, "tools", "debug-sheet")
os.makedirs(OUT_DIR, exist_ok=True)

for name in ["noble", "jianke", "shouwang"]:
    img = Image.open(os.path.join(REF_DIR, f"{name}-sheet.jpg"))
    w, h = img.size
    bottom = img.crop((0, int(h*0.55), w, h))
    bw, bh = bottom.size
    part_w = bw // 4
    for i in range(4):
        part = bottom.crop((i*part_w, 0, (i+1)*part_w, bh))
        part.save(os.path.join(OUT_DIR, f"{name}_part{i}.png"))
    print(name, "split done")
