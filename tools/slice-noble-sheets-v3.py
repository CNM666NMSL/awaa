#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
贵族动作 sheet 切片 v3：手动指定每行列数，均匀切分。
输出：assets/chars/noble/<动作名>/<帧号>.png
"""
import os
import shutil
from PIL import Image
import numpy as np

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC_DIR = os.path.join(ROOT, "assets", "ref", "noble", "actions")
OUT_DIR = os.path.join(ROOT, "assets", "chars", "noble")

# 每行格式：[y0, y1, cols]；crop: [top, bottom] 像素裁切
SHEETS = {
    "01_idle_cleaned.png":    {"rows": [[0, 784, 8]], "target_h": 240, "interp": 1},
    "02_attack_j.jpg":        {"rows": [[0, 680, 12]], "target_h": 220, "interp": 1},
    "03_move_turn.jpg":       {"rows": [[60, 340, 13], [390, 700, 13]], "target_h": 220, "interp": 1},
    "04_skill_u.jpg":         {"rows": [[0, 680, 12]], "target_h": 220, "interp": 1},
    "05_jump_block.jpg":      {"rows": [[80, 340, 12], [392, 700, 12]], "target_h": 220, "interp": 1},
    "06_super_300.jpg":       {"rows": [[0, 380, 8], [396, 760, 8]], "target_h": 220, "interp": 1},
    "07_super_100_200.jpg":   {"rows": [[0, 320, 9], [370, 660, 6], [700, 980, 8]], "target_h": 220, "interp": 1},
    "08_launcher_wj_wu_airu.jpg": {"rows": [[0, 230, 12], [260, 470, 10], [500, 700, 12]], "target_h": 200, "interp": 1},
    "09_air_attack.jpg":      {"rows": [[0, 680, 12]], "target_h": 220, "interp": 1},
    "10_low_sj_su.jpg":       {"rows": [[0, 340, 12], [362, 700, 8]], "target_h": 220, "interp": 1},
    "11_dash_attack.jpg":     {"rows": [[0, 500, 6], [512, 1000, 6]], "target_h": 220, "interp": 1},
    "12_hit_knockdown.jpg":   {"rows": [[50, 210, 12], [250, 430, 8], [470, 650, 8], [690, 870, 10]], "target_h": 200, "interp": 1},
}


def remove_bg(img, tol=22):
    """边缘洪泛去背景，返回RGBA。"""
    arr = np.array(img.convert("RGBA"))
    h, w = arr.shape[:2]
    samples = [arr[0, 0], arr[0, w - 1], arr[h - 1, 0], arr[h - 1, w - 1]]
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
        c = arr[y, x]
        if sum(abs(int(c[i]) - int(bg[i])) for i in range(3)) > tol:
            continue
        mask[y, x] = False
        for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny, nx]:
                visited[ny, nx] = True
                q.append((nx, ny))
    arr[:, :, 3] = mask.astype(np.uint8) * 255
    return Image.fromarray(arr)


def normalize_frame(img, target_h):
    """等比缩放至目标高度，底部对齐画布。"""
    arr = np.array(img)
    if arr.shape[2] == 4:
        alpha = arr[:, :, 3]
        ys, xs = np.where(alpha > 0)
    else:
        ys, xs = np.where(np.any(arr < 250, axis=2))
    if len(ys) == 0:
        return Image.new("RGBA", (target_h // 3, target_h), (0, 0, 0, 0))
    bbox = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    cropped = img.crop(bbox)
    w, h = cropped.size
    scale = target_h / h
    new_w = max(1, int(w * scale))
    resized = cropped.resize((new_w, target_h), Image.LANCZOS)
    return resized


def blend_frames(a, b, t):
    """alpha 混合两帧，返回中间帧（同尺寸）。"""
    a = a.convert("RGBA")
    b = b.convert("RGBA")
    if a.size != b.size:
        # 统一画布尺寸
        w = max(a.width, b.width)
        h = max(a.height, b.height)
        ca = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        cb = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ca.paste(a, ((w - a.width) // 2, (h - a.height) // 2), a)
        cb.paste(b, ((w - b.width) // 2, (h - b.height) // 2), b)
        a, b = ca, cb
    arr_a = np.array(a).astype(float)
    arr_b = np.array(b).astype(float)
    blended = arr_a * (1 - t) + arr_b * t
    blended = np.clip(blended, 0, 255).astype(np.uint8)
    return Image.fromarray(blended)


def slice_sheet(fname, spec):
    img = Image.open(os.path.join(SRC_DIR, fname))
    base = os.path.splitext(fname)[0]
    out_sub = os.path.join(OUT_DIR, base)
    os.makedirs(out_sub, exist_ok=True)
    idx = 0
    target_h = spec["target_h"]
    interp = spec.get("interp", 0)
    all_frames = []
    for y0, y1, cols in spec["rows"]:
        row_h = y1 - y0
        frame_w = img.width / cols
        row_frames = []
        for c in range(cols):
            x0 = int(c * frame_w)
            x1 = int((c + 1) * frame_w) if c < cols - 1 else img.width
            frame = img.crop((x0, y0, x1, y1))
            rgba = remove_bg(frame)
            norm = normalize_frame(rgba, target_h)
            row_frames.append(norm)
        # 插帧
        if interp > 0 and len(row_frames) > 1:
            expanded = []
            for i in range(len(row_frames)):
                expanded.append(row_frames[i])
                if i < len(row_frames) - 1:
                    for k in range(1, interp + 1):
                        t = k / (interp + 1)
                        expanded.append(blend_frames(row_frames[i], row_frames[i + 1], t))
            row_frames = expanded
        all_frames.extend(row_frames)
    for fr in all_frames:
        fr.save(os.path.join(out_sub, f"{idx:02d}.png"))
        idx += 1
    return idx


def main():
    # 清理旧输出
    if os.path.exists(OUT_DIR):
        for d in os.listdir(OUT_DIR):
            p = os.path.join(OUT_DIR, d)
            if os.path.isdir(p) and d.startswith(("0", "1")):
                shutil.rmtree(p)
    os.makedirs(OUT_DIR, exist_ok=True)
    summary = {}
    for fname, spec in SHEETS.items():
        if not os.path.exists(os.path.join(SRC_DIR, fname)):
            continue
        n = slice_sheet(fname, spec)
        summary[fname] = n
        print(f"{fname}: {n} frames")
    print("\ndone")


if __name__ == "__main__":
    main()
