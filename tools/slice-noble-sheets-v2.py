#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
贵族动作 sheet 智能切片 v2
手动指定行数和行区域，列边界自动根据角色像素密度检测。
每帧自动去背景、统一画布、脚底对齐。
"""
import os
import json
from PIL import Image
import numpy as np

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC_DIR = os.path.join(ROOT, "assets", "ref", "noble", "actions")
OUT_DIR = os.path.join(ROOT, "assets", "chars", "noble")
PREVIEW_DIR = os.path.join(ROOT, "assets", "ref", "noble", "previews")

# rows: 每行 [y0, y1]；cols 留空让程序自动检测
SHEETS = {
    "01_idle.jpg": {
        "rows": [[0, 793]],
        "target_h": 240,
    },
    "02_attack_j.jpg": {
        "rows": [[0, 724]],
        "target_h": 220,
    },
    "03_move_turn.jpg": {
        "rows": [[0, 362], [362, 724]],
        "target_h": 220,
    },
    "04_skill_u.jpg": {
        "rows": [[0, 724]],
        "target_h": 220,
    },
    "05_jump_block.jpg": {
        "rows": [[0, 362], [362, 724]],
        "target_h": 220,
    },
    "06_super_300.jpg": {
        "rows": [[0, 396], [396, 793]],
        "target_h": 220,
    },
    "07_super_100_200.jpg": {
        # 三行：W+I / S+I 架势 / S+I 成功
        "rows": [[0, 341], [341, 682], [682, 1024]],
        "target_h": 220,
    },
    "08_launcher_wj_wu_airu.jpg": {
        "rows": [[0, 241], [241, 482], [482, 724]],
        "target_h": 200,
    },
    "09_air_attack.jpg": {
        "rows": [[0, 724]],
        "target_h": 220,
    },
    "10_low_sj_su.jpg": {
        "rows": [[0, 362], [362, 724]],
        "target_h": 220,
    },
    "11_dash_attack.jpg": {
        "rows": [[0, 512], [512, 1024]],
        "target_h": 220,
    },
    "12_hit_knockdown.jpg": {
        "rows": [[0, 221], [221, 442], [442, 663], [663, 887]],
        "target_h": 200,
    },
}


def is_bg_color(c, bg, tol=35):
    return sum(abs(int(c[i]) - int(bg[i])) for i in range(3)) <= tol


def mask_char(img_np, tol=35):
    """返回字符掩码（True=角色）。基于四角背景色 flood fill。"""
    h, w = img_np.shape[:2]
    # 背景色取四角
    samples = [img_np[0, 0], img_np[0, w - 1], img_np[h - 1, 0], img_np[h - 1, w - 1]]
    bg = np.mean(samples, axis=0)[:3].astype(int)
    mask = np.ones((h, w), dtype=bool)
    visited = np.zeros((h, w), dtype=bool)
    from collections import deque
    q = deque()
    for x in range(w):
        for y in [0, h - 1]:
            q.append((x, y)); visited[y, x] = True
    for y in range(h):
        for x in [0, w - 1]:
            q.append((x, y)); visited[y, x] = True
    while q:
        x, y = q.popleft()
        c = img_np[y, x]
        if sum(abs(int(c[i]) - int(bg[i])) for i in range(3)) > tol:
            continue
        mask[y, x] = False
        for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny, nx]:
                visited[ny, nx] = True
                q.append((nx, ny))
    return mask


def find_col_bounds(row_img_np, min_gap=8):
    """在一行内根据垂直像素密度找列边界。"""
    mask = mask_char(row_img_np)
    density = mask.sum(axis=0)  # 每列角色像素数
    # 平滑（纯 numpy 移动平均）
    den = np.convolve(density.astype(float), np.ones(5) / 5, mode="same")
    # 找低密度谷（背景列）
    valleys = []
    in_valley = False
    start = 0
    for i, v in enumerate(den):
        if v <= min_gap:
            if not in_valley:
                in_valley = True
                start = i
        else:
            if in_valley:
                valleys.append((start, i))
                in_valley = False
    if in_valley:
        valleys.append((start, len(den)))
    # 边界取谷中点
    bounds = [0] + [int((a + b) / 2) for a, b in valleys] + [len(den)]
    # 过滤太窄的帧
    frames = []
    for i in range(len(bounds) - 1):
        if bounds[i + 1] - bounds[i] > 20:
            frames.append((bounds[i], bounds[i + 1]))
    return frames


def remove_bg_frame(img):
    """对单帧去背景，返回RGBA。"""
    arr = np.array(img)
    mask = mask_char(arr)
    rgba = np.zeros((arr.shape[0], arr.shape[1], 4), dtype=np.uint8)
    rgba[:, :, :3] = arr[:, :, :3]
    rgba[:, :, 3] = mask.astype(np.uint8) * 255
    return Image.fromarray(rgba)


def normalize_frame(img, target_h, feet_y=None):
    """缩放至目标高度，底部对齐，脚底在 feet_y（默认底部）。"""
    # 找有效区域
    arr = np.array(img)
    if arr.shape[2] == 4:
        alpha = arr[:, :, 3]
        ys, xs = np.where(alpha > 0)
    else:
        ys, xs = np.where(np.any(arr < 250, axis=2))
    if len(ys) == 0:
        return Image.new("RGBA", (target_h, target_h), (0, 0, 0, 0))
    bbox = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    cropped = img.crop(bbox)
    w, h = cropped.size
    scale = target_h / h
    new_w = max(1, int(w * scale))
    resized = cropped.resize((new_w, target_h), Image.LANCZOS)
    return resized


def process_sheet(fname, spec):
    img = Image.open(os.path.join(SRC_DIR, fname))
    img_np = np.array(img)
    target_h = spec["target_h"]
    base = os.path.splitext(fname)[0]
    out_sub = os.path.join(OUT_DIR, base)
    os.makedirs(out_sub, exist_ok=True)
    all_frames = []
    idx = 0
    for ri, (y0, y1) in enumerate(spec["rows"]):
        row = img_np[y0:y1]
        bounds = find_col_bounds(row)
        print(f"  {fname} row{ri}: {len(bounds)} frames")
        for x0, x1 in bounds:
            frame = img.crop((x0, y0, x1, y1))
            rgba = remove_bg_frame(frame)
            norm = normalize_frame(rgba, target_h)
            norm.save(os.path.join(out_sub, f"{idx:02d}.png"))
            all_frames.append((ri, idx, x0, x1, x1 - x0, y1 - y0))
            idx += 1
    return all_frames


def main():
    os.makedirs(PREVIEW_DIR, exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)
    summary = {}
    for fname, spec in SHEETS.items():
        if not os.path.exists(os.path.join(SRC_DIR, fname)):
            print("SKIP", fname)
            continue
        print("PROCESS", fname)
        frames = process_sheet(fname, spec)
        summary[fname] = len(frames)
    print("\nSUMMARY:")
    for k, v in summary.items():
        print(f"  {k}: {v} frames")


if __name__ == "__main__":
    main()
