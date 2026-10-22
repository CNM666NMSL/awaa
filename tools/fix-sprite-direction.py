#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修正立绘朝向：所有角色贴图必须原始朝右。
运行后会备份原图到 assets/chars/backup/，
然后把目前朝左的贴图水平镜像为朝右。
"""
import os
import shutil
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC_DIR = os.path.join(ROOT, "assets", "chars")
BAK_DIR = os.path.join(SRC_DIR, "backup")

# 需要翻转为朝右的贴图（当前文件内容是朝左）
TO_FLIP = ["noble.png", "shouwang.png", "shouwang_armed.png"]

os.makedirs(BAK_DIR, exist_ok=True)

for name in TO_FLIP:
    src = os.path.join(SRC_DIR, name)
    if not os.path.exists(src):
        print(f"SKIP {name}: 文件不存在")
        continue
    bak = os.path.join(BAK_DIR, name)
    if not os.path.exists(bak):
        shutil.copy2(src, bak)
        print(f"BACKUP {name}")
    img = Image.open(src)
    flipped = img.transpose(Image.FLIP_LEFT_RIGHT)
    flipped.save(src)
    print(f"FLIP {name} -> 朝右")

print("done")
