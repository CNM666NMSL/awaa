#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
处理贵族决斗者动作条带图（抠图后）：
- idle: 8 帧循环
- j1: 普攻第一段
- u: U 技能突刺

输出：
  assets/chars/noble/<action>/<frame>.png
  assets/chars/noble/manifest.json

处理流程：
1. 优先读 _temp_sources/<label>_matted.png（已透明背景）。
2. 找到整条带的内容包围盒，统一裁掉上下透明边。
3. 按帧数均分后，再裁掉每帧左右剩余透明边。
4. 统一画布、脚底对齐、保持比例缩放。
"""
import os
import json
import shutil
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT_DIR = os.path.join(ROOT, "assets", "chars", "noble")
TEMP_DIR = os.path.join(OUT_DIR, "_temp_sources")
os.makedirs(TEMP_DIR, exist_ok=True)

# 原始 JPG 路径（供首次抠图用）
RAW_SOURCES = {
    "idle": r"D:\我的资料库\xwechat_files\wxid_lavqs5whrwfg12_644c\temp\RWTemp\2026-10\9e20f478899dc29eb19741386f9343c8\431350919668e05e61c6ec0f67683e7c.jpg",
    "j1": r"D:\我的资料库\xwechat_files\wxid_lavqs5whrwfg12_644c\temp\RWTemp\2026-10\9e20f478899dc29eb19741386f9343c8\ccab4edf546c9b0391134e6e1e1f0c3c.jpg",
    "u": r"D:\我的资料库\xwechat_files\wxid_lavqs5whrwfg12_644c\temp\RWTemp\2026-10\9e20f478899dc29eb19741386f9343c8\a82c7adac04d9ae2998efccb4190b057.jpg",
}

SOURCES = {
    "idle": {
        "frames": 8,
        "loop": True,
        "fps": 8,
    },
    "j1": {
        "frames": 16,
        "loop": False,
        "fps": 12,
    },
    "u": {
        "frames": 15,
        "loop": False,
        "fps": 12,
    },
}

CANVAS_H = 260
CANVAS_W = 220


def find_content_bbox(img):
    """返回 (left, top, right, bottom) 非透明内容包围盒"""
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    w, h = img.size
    data = list(img.getdata())
    left, top, right, bottom = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            _, _, _, a = data[y * w + x]
            if a > 30:
                if x < left: left = x
                if x > right: right = x
                if y < top: top = y
                if y > bottom: bottom = y
    if left > right or top > bottom:
        return 0, 0, w, h
    return left, top, right + 1, bottom + 1


def crop_equal_frames(img, frames):
    w, h = img.size
    frame_w = w // frames
    out = []
    for i in range(frames):
        x0 = i * frame_w
        x1 = w if i == frames - 1 else (i + 1) * frame_w
        out.append(img.crop((x0, 0, x1, h)))
    return out


def place_on_canvas(img):
    tw, th = img.size
    scale = min(CANVAS_W / tw, (CANVAS_H - 10) / th, 1.0)
    if scale < 1.0:
        tw, th = max(1, int(tw * scale)), max(1, int(th * scale))
        img = img.resize((tw, th), Image.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    px = (CANVAS_W - tw) // 2
    py = CANVAS_H - th
    canvas.paste(img, (px, py), img)
    return canvas


def process():
    manifest = {"character": "noble", "actions": {}}
    for label, info in SOURCES.items():
        # 优先用已抠图的结果
        matted = os.path.join(TEMP_DIR, f"{label}_matted.png")
        raw = RAW_SOURCES.get(label)
        if os.path.exists(matted):
            src = matted
        elif raw and os.path.exists(raw):
            src = raw
            # 备份原始图
            ext = os.path.splitext(raw)[1]
            shutil.copy2(raw, os.path.join(TEMP_DIR, label + ext))
        else:
            print(f"SKIP {label}: no source found")
            continue

        img = Image.open(src)
        if img.mode != "RGBA":
            img = img.convert("RGBA")

        l, t, r, b = find_content_bbox(img)
        img = img.crop((l, t, r, b))
        print(f"{label}: content bbox ({l},{t},{r},{b}), size={img.size}")

        frames = crop_equal_frames(img, info["frames"])
        action_dir = os.path.join(OUT_DIR, label)
        os.makedirs(action_dir, exist_ok=True)
        for f in os.listdir(action_dir):
            if f.endswith(".png"):
                os.remove(os.path.join(action_dir, f))

        for i, frame in enumerate(frames):
            fl, ft, fr, fb = find_content_bbox(frame)
            frame = frame.crop((fl, ft, fr, fb))
            canvas = place_on_canvas(frame)
            canvas.save(os.path.join(action_dir, f"{i:02d}.png"))
        manifest["actions"][label] = {
            "frames": info["frames"],
            "loop": info["loop"],
            "fps": info["fps"],
            "path": f"assets/chars/noble/{label}",
        }
        print(f"DONE {label}: {info['frames']} frames -> {action_dir}")

    with open(os.path.join(OUT_DIR, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"MANIFEST -> {os.path.join(OUT_DIR, 'manifest.json')}")


if __name__ == "__main__":
    process()
