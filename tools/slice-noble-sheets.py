#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
贵族角色动作 sprite sheet 切片工具
用法：先调整 SHEETS 里的 rows/cols/x/y/w/h，运行生成预览和 PNG 序列。
"""
import os
import json
from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC_DIR = os.path.join(ROOT, "assets", "ref", "noble", "actions")
OUT_DIR = os.path.join(ROOT, "assets", "chars", "noble")
PREVIEW_DIR = os.path.join(ROOT, "assets", "ref", "noble", "previews")

# rows: 行数；cols: 每行帧数；x,y: 第一帧左上角；w,h: 单帧宽高；gap_x/gap_y: 帧间距
SHEETS = {
    "01_idle.jpg":            {"rows": 1, "cols": 8, "x": 0, "y": 0, "w": 248, "h": 793, "gap_x": 0, "gap_y": 0},
    "02_attack_j.jpg":        {"rows": 1, "cols": 12, "x": 0, "y": 0, "w": 181, "h": 724, "gap_x": 0, "gap_y": 0},
    "03_move_turn.jpg":       {"rows": 2, "cols": 13, "x": 0, "y": 0, "w": 167, "h": 362, "gap_x": 0, "gap_y": 0},
    "04_skill_u.jpg":         {"rows": 1, "cols": 12, "x": 0, "y": 0, "w": 181, "h": 724, "gap_x": 0, "gap_y": 0},
    "05_jump_block.jpg":      {"rows": 2, "cols": 12, "x": 0, "y": 0, "w": 181, "h": 362, "gap_x": 0, "gap_y": 0},
    "06_super_300.jpg":       {"rows": 2, "cols": 8, "x": 0, "y": 0, "w": 248, "h": 396, "gap_x": 0, "gap_y": 0},
    "07_super_100_200.jpg":   {"rows": 3, "cols": 9, "x": 0, "y": 0, "w": 170, "h": 341, "gap_x": 0, "gap_y": 0},
    "08_launcher_wj_wu_airu.jpg": {"rows": 3, "cols": 12, "x": 0, "y": 0, "w": 181, "h": 241, "gap_x": 0, "gap_y": 0},
    "09_air_attack.jpg":      {"rows": 1, "cols": 12, "x": 0, "y": 0, "w": 181, "h": 724, "gap_x": 0, "gap_y": 0},
    "10_low_sj_su.jpg":       {"rows": 2, "cols": 12, "x": 0, "y": 0, "w": 181, "h": 362, "gap_x": 0, "gap_y": 0},
    "11_dash_attack.jpg":     {"rows": 2, "cols": 6, "x": 0, "y": 0, "w": 256, "h": 512, "gap_x": 0, "gap_y": 0},
    "12_hit_knockdown.jpg":   {"rows": 4, "cols": 10, "x": 0, "y": 0, "w": 177, "h": 221, "gap_x": 0, "gap_y": 0},
}


def remove_bg(img, tol=30):
    """用边缘洪泛法去除深蓝/黑背景，返回RGBA。"""
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    # 取四角颜色均值作为背景色
    samples = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    bg = [sum(c[i] for c in samples) // len(samples) for i in range(3)]
    from collections import deque
    visited = [[False] * h for _ in range(w)]
    q = deque()
    for x in range(w):
        for y in [0, h - 1]:
            q.append((x, y)); visited[x][y] = True
    for y in range(h):
        for x in [0, w - 1]:
            q.append((x, y)); visited[x][y] = True
    while q:
        x, y = q.popleft()
        c = px[x, y]
        if sum(abs(c[i] - bg[i]) for i in range(3)) > tol:
            continue
        px[x, y] = (0, 0, 0, 0)
        for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[nx][ny]:
                visited[nx][ny] = True
                q.append((nx, ny))
    return img


def make_preview(path, spec):
    img = Image.open(path)
    draw = ImageDraw.Draw(img)
    rows, cols = spec["rows"], spec["cols"]
    x0, y0, w, h = spec["x"], spec["y"], spec["w"], spec["h"]
    gx, gy = spec.get("gap_x", 0), spec.get("gap_y", 0)
    for r in range(rows + 1):
        y = y0 + r * (h + gy)
        draw.line([(0, y), (img.width, y)], fill="red", width=2)
    for c in range(cols + 1):
        x = x0 + c * (w + gx)
        draw.line([(x, 0), (x, img.height)], fill="red", width=2)
    return img


def slice_sheet(path, spec):
    img = Image.open(path)
    frames = []
    rows, cols = spec["rows"], spec["cols"]
    x0, y0, w, h = spec["x"], spec["y"], spec["w"], spec["h"]
    gx, gy = spec.get("gap_x", 0), spec.get("gap_y", 0)
    for r in range(rows):
        for c in range(cols):
            x = x0 + c * (w + gx)
            y = y0 + r * (h + gy)
            frame = img.crop((x, y, x + w, y + h))
            frames.append(frame)
    return frames


def main():
    os.makedirs(PREVIEW_DIR, exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)
    for fname, spec in SHEETS.items():
        src = os.path.join(SRC_DIR, fname)
        if not os.path.exists(src):
            print("SKIP", fname)
            continue
        preview = make_preview(src, spec)
        preview.save(os.path.join(PREVIEW_DIR, fname.replace(".jpg", "_preview.jpg")))
        print("PREVIEW", fname)

        base = os.path.splitext(fname)[0]
        out_sub = os.path.join(OUT_DIR, base)
        os.makedirs(out_sub, exist_ok=True)
        frames = slice_sheet(src, spec)
        for i, fr in enumerate(frames):
            rgba = remove_bg(fr)
            rgba.save(os.path.join(out_sub, f"{i:02d}.png"))
        print("SLICE", fname, len(frames), "frames ->", out_sub)


if __name__ == "__main__":
    main()
