#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从设定集四视图中提取「左侧」视图（角色朝右）作为游戏 idle 立绘。
处理：裁剪底部视图行 → 取第四张（左侧/朝右）→ 边缘洪泛去背景 → 去标签 → 修剪。
"""
import os
from collections import deque
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT_DIR = os.path.join(ROOT, "assets", "chars")
REF_DIR = os.path.join(ROOT, "assets", "ref")

# 每张 sheet 底部四视图的裁剪参数（x0,y0,x1,y1 为整张图坐标，覆盖四视图区域）
# shouwang 顶部有细节展示区，底部区域需要单独调整避免裁进上面小图
SHEETS = {
    "noble":   (os.path.join(REF_DIR, "noble-sheet.jpg"),   0.54, 0.08),
    "jianke":  (os.path.join(REF_DIR, "jianke-sheet.jpg"),  0.54, 0.08),
    "shouwang": (os.path.join(REF_DIR, "shouwang-sheet.jpg"), 0.72, 0.08),
}

# 单图需要水平镜像的角色（只有朝左的素材）
FLIP = {
    "shouwang_armed": os.path.join(REF_DIR, "shouwang_armed-crop.jpg"),
}

BG_COLOR = (13, 21, 38)       # 近似 #0d1526
TOL = 42                       # 背景色容差（RGB 各通道）


def flood_fill_bg(img, tol=TOL):
    """从四边开始洪泛，把与背景色接近的连通区域设为透明。"""
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    visited = [[False] * h for _ in range(w)]
    q = deque()

    def near_bg(r, g, b):
        return abs(r - BG_COLOR[0]) < tol and abs(g - BG_COLOR[1]) < tol and abs(b - BG_COLOR[2]) < tol

    # 加入四边起点
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))

    while q:
        x, y = q.popleft()
        if x < 0 or x >= w or y < 0 or y >= h or visited[x][y]:
            continue
        r, g, b, a = px[x, y]
        if not near_bg(r, g, b):
            continue
        visited[x][y] = True
        px[x, y] = (r, g, b, 0)
        q.append((x + 1, y))
        q.append((x - 1, y))
        q.append((x, y + 1))
        q.append((x, y - 1))
    return img


def trim_alpha(img):
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def crop_label(img, label_ratio=0.12):
    """去掉底部标签文字区域"""
    w, h = img.size
    return img.crop((0, 0, w, int(h * (1 - label_ratio))))


def process_sheet(name, path, top_ratio, label_ratio):
    img = Image.open(path)
    w, h = img.size
    # 裁出底部四视图条
    strip = img.crop((0, int(h * top_ratio), w, h))
    sw, sh = strip.size
    part_w = sw // 4
    # 第四张 = 左侧视图（角色朝右）
    left_view = strip.crop((part_w * 3, 0, sw, sh))
    left_view = flood_fill_bg(left_view)
    left_view = crop_label(left_view, label_ratio)
    left_view = trim_alpha(left_view)
    left_view.save(os.path.join(OUT_DIR, f"{name}.png"))
    print(f"EXTRACT {name}.png: {left_view.size}")


def process_flip(name, path):
    img = Image.open(path)
    img = flood_fill_bg(img)
    img = img.transpose(Image.FLIP_LEFT_RIGHT)
    img = crop_label(img, 0.0)   # 单图无标签
    img = trim_alpha(img)
    img.save(os.path.join(OUT_DIR, f"{name}.png"))
    print(f"FLIP {name}.png: {img.size}")


if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, (path, top, label) in SHEETS.items():
        process_sheet(name, path, top, label)
    for name, path in FLIP.items():
        process_flip(name, path)
    print("done")
