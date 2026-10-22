# -*- coding: utf-8 -*-
"""从设定集抠正面立绘 + 生成场景背景图"""
import os
from collections import deque
from PIL import Image

SRC = r"D:\我的资料库\xwechat_files\wxid_lavqs5whrwfg12_644c\temp\RWTemp\2026-10\8b50630dd8becb60a7208852ee2d95f1"
OUT = r"E:\2026-10-18-22-54-21\baishou-yexing-fighter\assets"
os.makedirs(os.path.join(OUT, "chars"), exist_ok=True)
os.makedirs(os.path.join(OUT, "stages"), exist_ok=True)

# (文件名, 粗裁剪框(左,上,右,下), 输出名)
JOBS = [
    ("9b54d3af5f838d1ee5aae00fac79fa8f.jpg", (10, 675, 265, 1015), "noble.png"),
    ("6109477a4e8ee137427aa4834b327846.jpg", (10, 675, 270, 1015), "jianke.png"),
    ("07d617f5d1717c6f48c7bfb5f529b346.jpg", (10, 445, 265, 700), "shouwang.png"),
]

TOL = 30          # 背景色容差
PAD = 8           # 边缘留白


def bg_key(img, box):
    """取粗裁图四角像素平均作为背景基准色"""
    im = img.crop(box).convert("RGB")
    w, h = im.size
    pts = [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3),
           (w // 2, 2), (2, h // 2), (w - 3, h // 2)]
    r = g = b = n = 0
    for x, y in pts:
        p = im.getpixel((x, y))
        r += p[0]; g += p[1]; b += p[2]; n += 1
    return (r // n, g // n, b // n)


def cutout(img, box, out_path):
    im = img.crop(box).convert("RGBA")
    w, h = im.size
    key = bg_key(img, box)

    def close(p):
        return (abs(p[0] - key[0]) + abs(p[1] - key[1]) + abs(p[2] - key[2])) <= TOL * 3

    # 从边界洪泛填充背景
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    px = im.load()
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h:
            continue
        i = y * w + x
        if seen[i]:
            continue
        p = px[x, y]
        if not close(p):
            seen[i] = 2   # 非背景，边界止于此
            continue
        seen[i] = 1
        px[x, y] = (p[0], p[1], p[2], 0)
        q.append((x + 1, y)); q.append((x - 1, y)); q.append((x, y + 1)); q.append((x, y - 1))

    # 裁到不透明区域 bbox
    minx, miny, maxx, maxy = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            if seen[y * w + x] != 1:
                if x < minx: minx = x
                if x > maxx: maxx = x
                if y < miny: miny = y
                if y > maxy: maxy = y
    if maxx < 0:
        raise RuntimeError("整个区域都被当成背景了，容差太大")
    minx = max(0, minx - PAD); miny = max(0, miny - PAD)
    maxx = min(w - 1, maxx + PAD); maxy = min(h - 1, maxy + PAD)
    im = im.crop((minx, miny, maxx + 1, maxy + 1))
    im.save(out_path)
    print(f"{out_path}  {im.size[0]}x{im.size[1]}  bg={key}")


for fname, box, out in JOBS:
    img = Image.open(os.path.join(SRC, fname))
    print(fname, "原图", img.size)
    cutout(img, box, os.path.join(OUT, "chars", out))

# ---- 场景：巷子图 cover 裁到 960x540 ----
alley = Image.open(os.path.join(SRC, "ff6aed3f2bc99e183ac37250b5f4c9d9.jpg")).convert("RGB")
W, H = 960, 540
sw, sh = alley.size
scale = max(W / sw, H / sh)
nw, nh = round(sw * scale), round(sh * scale)
alley = alley.resize((nw, nh), Image.LANCZOS)
l = (nw - W) // 2
t = nh - H          # 底部对齐，保住地面
alley = alley.crop((l, t, l + W, t + H))
alley.save(os.path.join(OUT, "stages", "lingxia.jpg"), quality=90)
print("场景 lingxia.jpg", alley.size)
print("完成")
