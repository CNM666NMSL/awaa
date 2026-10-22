# -*- coding: utf-8 -*-
"""从设定集中抠出角色立绘：
1) 以四角颜色为种子、按颜色距离做边界洪泛（容忍暗角渐变，但到服装边缘停住）
2) 期望区域内最大连通域 = 角色主体
3) 填内部空洞 → 腐蚀 1px 去 JPEG 黑边 → 输出透明 PNG
"""
import sys
from collections import deque
from PIL import Image, ImageFilter

def process(src, dst, region):
    im = Image.open(src).convert("RGB")
    W, H = im.size
    px = im.load()
    rx0, ry0, rx1, ry1 = region

    # 四角种子色
    seeds = [px[2, 2], px[W - 3, 2], px[2, H - 3], px[W - 3, H - 3]]
    TOL = 40.0

    def near_seed(p):
        for s in seeds:
            dr, dg, db = p[0] - s[0], p[1] - s[1], p[2] - s[2]
            if dr * dr + dg * dg + db * db < TOL * TOL:
                return True
        return False

    # 1) 边界洪泛背景
    seen = bytearray(W * H)
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if not seen[y * W + x] and near_seed(px[x, y]):
                seen[y * W + x] = 1
                q.append((x, y))
    for y in range(H):
        for x in (0, W - 1):
            if not seen[y * W + x] and near_seed(px[x, y]):
                seen[y * W + x] = 1
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < W and 0 <= ny < H:
                i = ny * W + nx
                if not seen[i] and near_seed(px[nx, ny]):
                    seen[i] = 1
                    q.append((nx, ny))

    # 2) 期望区域内的非背景连通域，取最大
    obj = bytearray(W * H)
    for y in range(ry0, min(ry1, H)):
        base = y * W
        for x in range(rx0, min(rx1, W)):
            if not seen[base + x]:
                obj[base + x] = 1

    best = None
    comp_seen = bytearray(W * H)
    for i0 in range(W * H):
        if not obj[i0] or comp_seen[i0]:
            continue
        q = deque([(i0 % W, i0 // W)])
        comp_seen[i0] = 1
        area = 0
        minx, maxx, miny, maxy = W, 0, H, 0
        while q:
            x, y = q.popleft()
            area += 1
            if x < minx: minx = x
            if x > maxx: maxx = x
            if y < miny: miny = y
            if y > maxy: maxy = y
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < W and 0 <= ny < H:
                    j = ny * W + nx
                    if obj[j] and not comp_seen[j]:
                        comp_seen[j] = 1
                        q.append((nx, ny))
        if best is None or area > best[0]:
            best = (area, minx, maxx, miny, maxy)
    area, minx, maxx, miny, maxy = best
    print(f"{src}: 主体面积={area}  bbox=({minx},{miny})-({maxx},{maxy})")

    # 3) 按 bbox 重建主体掩码，并填掉内部空洞
    cw, ch = maxx - minx + 1, maxy - miny + 1
    m = Image.new("L", (cw, ch), 0)
    mp = m.load()
    for y in range(ch):
        base = (miny + y) * W
        for x in range(cw):
            if not seen[base + (minx + x)]:
                mp[x, y] = 255
    # 空洞 = 从掩码边界洪泛不到的透明点
    hole = Image.new("L", (cw, ch), 0)
    hp = hole.load()
    hq = deque()
    for x in range(cw):
        for y in (0, ch - 1):
            if mp[x, y] == 0:
                hp[x, y] = 1
                hq.append((x, y))
    for y in range(ch):
        for x in (0, cw - 1):
            if mp[x, y] == 0 and not hp[x, y]:
                hp[x, y] = 1
                hq.append((x, y))
    while hq:
        x, y = hq.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < cw and 0 <= ny < ch and mp[nx, ny] == 0 and not hp[nx, ny]:
                hp[nx, ny] = 1
                hq.append((nx, ny))
    filled = m.copy()
    fp = filled.load()
    for y in range(ch):
        for x in range(cw):
            if mp[x, y] == 0 and not hp[x, y]:
                fp[x, y] = 255
    # 腐蚀 1px 去黑边
    filled = filled.filter(ImageFilter.MinFilter(3))

    out = im.crop((minx, miny, maxx + 1, maxy + 1)).convert("RGBA")
    out.putalpha(filled)
    out.save(dst)
    print(f"已保存 {dst}  {out.size}")

ROOT = r"E:/2026-10-18-22-54-21/baishou-yexing-fighter"
process(f"{ROOT}/assets/ref/noble-sheet.jpg",    f"{ROOT}/assets/chars/noble.png",    (360, 30, 950, 830))
process(f"{ROOT}/assets/ref/jianke-sheet.jpg",   f"{ROOT}/assets/chars/jianke.png",   (400, 30, 950, 830))
process(f"{ROOT}/assets/ref/shouwang-sheet.jpg", f"{ROOT}/assets/chars/shouwang.png", (380, 20, 850, 680))
print("done")
