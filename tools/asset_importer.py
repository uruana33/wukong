#!/usr/bin/env python3
"""美术资产管线：扫描资产目录、校验命名规范、生成导入清单 manifest.json

规范（见 docs/architecture.md 第 4 节）：
  - 模型：*.fbx / *.obj，文件名 snake_case，角色模型须带 _skin 或 _prop 后缀
  - PBR 贴图：*_albedo / *_normal / *_orm (occlusion-roughness-metallic)
  - 动画：*.fbx 且文件名以 anim_ 开头
校验失败的资产进 manifest 的 "rejected"，并给出原因 —— 让美术自查，不进主干。
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

MODEL_EXT = {".fbx", ".obj"}
TEXTURE_EXT = {".png", ".tga", ".exr"}
PBR_SUFFIXES = ("_albedo", "_normal", "_orm")
SNAKE_CASE = re.compile(r"^[a-z0-9]+(_[a-z0-9]+)*$")


def classify(path: Path) -> tuple[str, str | None]:
    """返回 (asset_type, reject_reason)；reject_reason 为 None 表示通过。"""
    stem, ext = path.stem.lower(), path.suffix.lower()

    if ext in TEXTURE_EXT:
        if any(stem.endswith(s) for s in PBR_SUFFIXES):
            return "texture", None
        return "texture", "PBR 贴图须以 _albedo/_normal/_orm 结尾"

    if stem.startswith("anim_"):
        if ext == ".fbx":
            return "animation", None
        return "animation", "动画文件须为 .fbx"

    if ext in MODEL_EXT:
        if not SNAKE_CASE.match(stem):
            return "model", "模型文件名须为 snake_case"
        if not (stem.endswith("_skin") or stem.endswith("_prop")):
            return "model", "模型须带 _skin(角色) 或 _prop(物件) 后缀"
        return "model", None

    return "unknown", f"未识别的资产类型: {ext}"


def process_asset(path: Path) -> dict:
    asset_type, reason = classify(path)
    entry = {"file": str(path), "type": asset_type, "size": path.stat().st_size}
    if reason:
        entry["reject_reason"] = reason
    else:
        # 通过校验的资产：登记需要自动生成的衍生资源
        entry["derived"] = (
            ["prefab", "collider", "lod_group"] if asset_type == "model" else ["compressed_mips"]
        )
    return entry


def build_manifest(asset_dir: Path) -> dict:
    accepted, rejected = [], []
    for p in sorted(asset_dir.rglob("*")):
        if not p.is_file() or p.name.startswith("."):
            continue
        entry = process_asset(p)
        (rejected if "reject_reason" in entry else accepted).append(entry)
    return {"accepted": accepted, "rejected": rejected,
            "stats": {"accepted": len(accepted), "rejected": len(rejected)}}


if __name__ == "__main__":
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "assets")
    if not root.is_dir():
        sys.exit(f"asset dir not found: {root}")
    manifest = build_manifest(root)
    out = root / "manifest.json"
    out.write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    s = manifest["stats"]
    print(f"manifest written: {out}  (accepted={s['accepted']}, rejected={s['rejected']})")
