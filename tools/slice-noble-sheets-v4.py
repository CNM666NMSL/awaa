#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
贵族动作 sheet 智能切片 v4：
1. 按 sheet 指定行区域裁剪掉标题/标签
2. 对每行用连通域检测每个角色的精确包围盒
3. 合并被刀光/披风分开的同一角色
4. 去背景、统一画布、脚底中心对齐
解决相邻帧 bleed 和文字标签问题。
"""
import os
import shutil
from PIL import Image
import numpy as np
from collections import deque

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC_DIR = os.path.join(ROOT, "assets", "ref", "noble", "actions")
OUT_DIR = os.path.join(ROOT, "assets", "chars", "noble")

# rows: 每行 [y0, y1]；min_area 过滤文字/噪声；target_h 输出高度
SHEETS = {
    "01_idle.jpg": {
        "rows": [[100, 600]],
        "target_h": 240,
        "pad": 8,
        "min_area": 200,
    },
    "02_attack_j.jpg": {
        "rows": [[20, 700]],
        "target_h": 220,
        "pad": 6,
        "min_area": 300,
    },
    "03_move_turn.jpg": {
        "rows": [[20, 350], [360, 700]],
        "target_h": 220,
        "pad": 6,
        "min_area": 300,
    },
    "04_skill_u.jpg": {
        "rows": [[20, 700]],
        "target_h": 220,
        "pad": 6,
        "min_area": 300,
    },
    "05_jump_block.jpg": {
        "rows": [[40, 340], [360, 700]],
        "target_h": 220,
        "pad": 6,
        "min_area": 300,
    },
    "06_super_300.jpg": {
        "rows": [[20, 380], [390, 760]],
        "target_h": 220,
        "pad": 8,
        "min_area": 300,
    },
    "07_super_100_200.jpg": {
        "rows": [[20, 330], [340, 670], [680, 1000]],
        "target_h": 220,
        "pad": 8,
        "min_area": 300,
    },
    "08_launcher_wj_wu_airu.jpg": {
        "rows": [[10, 230], [240, 470], [480, 700]],
        "target_h": 200,
        "pad": 6,
        "min_area": 250,
    },
    "09_air_attack.jpg": {
        "rows": [[20, 700]],
        "target_h": 220,
        "pad": 6,
        "min_area": 300,
    },
    "10_low_sj_su.jpg": {
        "rows": [[20, 350], [360, 700]],
        "target_h": 220,
        "pad": 6,
        "min_area": 300,
    },
    "11_dash_attack.jpg": {
        "rows": [[30, 500], [510, 990]],
        "target_h": 220,
        "pad": 8,
        "min_area": 300,
    },
    "12_hit_knockdown.jpg": {
        "rows": [[10, 210], [220, 430], [440, 650], [660, 870]],
        "target_h": 200,
        "pad": 6,
        "min_area": 200,
    },
}


def flood_bg_mask(arr, tol=22):
    """返回 True=角色, False=背景。"""
    h, w = arr.shape[:2]
    samples = [arr[0, 0], arr[0, w - 1], arr[h - 1, 0], arr[h - 1, w - 1]]
    bg = np.mean(samples, axis=0)[:3].astype(int)
    mask = np.ones((h, w), dtype=bool)
    visited = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in [0, h - 1]:
            q.append((x, y)); visited[y, x] = True
    for y in range(h):
        for x in [0, w - 1]:
            q.append((x, y)); visited[y, x] = True
    while q:
        x, y = q.popleft()
        c = arr[y, x]
        if sum(abs(int(c[i]) - int(bg[i])) for i in range(3)) > tol:
            continue
        mask[y, x] = False
        for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny, nx]:
                visited[ny, nx] = True
                q.append((nx, ny))
    return mask


def find_components(mask, min_area=80):
    """找连通域，返回 [(x0,y0,x1,y1), ...]，按 x 排序。"""
    h, w = mask.shape
    visited = np.zeros((h, w), dtype=bool)
    comps = []
    for sy in range(h):
        for sx in range(w):
            if not mask[sy, sx] or visited[sy, sx]:
                continue
            q = deque([(sx, sy)])
            visited[sy, sx] = True
            xs, ys = [sx], [sy]
            while q:
                x, y = q.popleft()
                for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and mask[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        q.append((nx, ny))
                        xs.append(nx); ys.append(ny)
            if len(xs) < min_area:
                continue
            comps.append((min(xs), min(ys), max(xs) + 1, max(ys) + 1))
    comps.sort(key=lambda b: b[0])
    return comps


def merge_close_boxes(boxes, min_gap=40):
    """把离得太近的框合并（处理被刀光/披风分开的同一角色）。"""
    if not boxes:
        return boxes
    merged = [list(boxes[0])]
    for x0, y0, x1, y1 in boxes[1:]:
        px0, py0, px1, py1 = merged[-1]
        if x0 - px1 < min_gap:
            merged[-1] = [min(px0, x0), min(py0, y0), max(px1, x1), max(py1, y1)]
        else:
            merged.append([x0, y0, x1, y1])
    return [tuple(b) for b in merged]


def clean_mask(mask, iterations=1):
    """简单形态学开闭：去噪点、平滑边缘（纯 numpy）。"""
    for _ in range(iterations):
        pad = np.pad(mask, 1, mode="constant", constant_values=False)
        eroded = np.all(np.stack([
            pad[0:-2, 0:-2], pad[0:-2, 1:-1], pad[0:-2, 2:],
            pad[1:-1, 0:-2],                   pad[1:-1, 2:],
            pad[2:,   0:-2], pad[2:,   1:-1], pad[2:,   2:]
        ]), axis=0)
        pad = np.pad(eroded, 1, mode="constant", constant_values=False)
        dilated = np.any(np.stack([
            pad[0:-2, 0:-2], pad[0:-2, 1:-1], pad[0:-2, 2:],
            pad[1:-1, 0:-2], pad[1:-1, 1:-1], pad[1:-1, 2:],
            pad[2:,   0:-2], pad[2:,   1:-1], pad[2:,   2:]
        ]), axis=0)
        mask = dilated
    return mask


def process_row(img, y0, y1, pad, target_h, min_area):
    row = img.crop((0, y0, img.width, y1))
    arr = np.array(row)
    mask = flood_bg_mask(arr, tol=35)
    mask = clean_mask(mask, iterations=1)
    boxes = find_components(mask, min_area=min_area)
    boxes = merge_close_boxes(boxes, min_gap=60)
    frames = []
    for x0, y0b, x1, y1b in boxes:
        x0 = max(0, x0 - pad); y0b = max(0, y0b - pad)
        x1 = min(row.width, x1 + pad); y1b = min(row.height, y1b + pad)
        crop = row.crop((x0, y0b, x1, y1b))
        carr = np.array(crop)
        cmask = flood_bg_mask(carr, tol=18)
        rgba = np.zeros((carr.shape[0], carr.shape[1], 4), dtype=np.uint8)
        rgba[:, :, :3] = carr[:, :, :3]
        rgba[:, :, 3] = cmask.astype(np.uint8) * 255
        frames.append(Image.fromarray(rgba))
    return frames


def align_to_canvas(img, target_h, ref_w):
    """把角色按脚底中心对齐到标准画布。"""
    arr = np.array(img)
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > 0)
    if len(ys) == 0:
        return Image.new("RGBA", (ref_w, target_h), (0, 0, 0, 0))
    x0, y0b, x1, y1b = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    content = img.crop((x0, y0b, x1, y1b))
    cw, ch = content.size
    scale = target_h / ch
    new_w = max(1, int(cw * scale))
    new_h = target_h
    resized = content.resize((new_w, new_h), Image.LANCZOS)
    canvas = Image.new("RGBA", (ref_w, target_h), (0, 0, 0, 0))
    paste_x = (ref_w - new_w) // 2
    paste_y = target_h - new_h
    canvas.paste(resized, (paste_x, paste_y), resized)
    return canvas


def process_sheet(fname, spec):
    src = os.path.join(SRC_DIR, fname)
    if not os.path.exists(src):
        return 0
    img = Image.open(src)
    base = os.path.splitext(fname)[0]
    out_sub = os.path.join(OUT_DIR, base)
    os.makedirs(out_sub, exist_ok=True)
    all_frames = []
    for y0, y1 in spec["rows"]:
        frames = process_row(img, y0, y1, spec.get("pad", 8), spec["target_h"], spec.get("min_area", 200))
        all_frames.extend(frames)
        print(f"  {fname} row: {len(frames)} frames")
    # 统一画布宽度
    max_w = max((f.width for f in all_frames), default=100)
    # 限制最大宽度，避免特效跨帧导致画布过大
    ref_w = min(max_w + 40, spec["target_h"] * 2)
    for i, fr in enumerate(all_frames):
        aligned = align_to_canvas(fr, spec["target_h"], ref_w)
        aligned.save(os.path.join(out_sub, f"{i:02d}.png"))
    return len(all_frames)


def main():
    if os.path.exists(OUT_DIR):
        for d in os.listdir(OUT_DIR):
            p = os.path.join(OUT_DIR, d)
            if os.path.isdir(p) and d.startswith(("0", "1")):
                shutil.rmtree(p)
    os.makedirs(OUT_DIR, exist_ok=True)
    for fname, spec in SHEETS.items():
        print("PROCESS", fname)
        n = process_sheet(fname, spec)
        print(f"  -> {n} frames total\n")


if __name__ == "__main__":
    main()
