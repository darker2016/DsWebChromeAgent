#!/usr/bin/env bash
# scripts/package-extension.sh — 将扩展打包为用于 GitHub Release / Chrome & Edge 商店的 ZIP 包
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION=$(node -e 'console.log(require("./manifest.json").version)')
OUTPUT_DIR="$ROOT/dist"
ZIP_NAME="DsWebChromeAgent_v${VERSION}.zip"

echo "==> 准备打包 DsWebChromeAgent v${VERSION}..."
mkdir -p "$OUTPUT_DIR"

# 确保索引是最新的
echo "==> 校验并构建技能索引..."
node "$ROOT/scripts/build-index.js"

# 切换到项目根目录打包
cd "$ROOT"
rm -f "$OUTPUT_DIR/$ZIP_NAME"

echo "==> 正在生成 ZIP 文件: dist/$ZIP_NAME..."
zip -r -q "$OUTPUT_DIR/$ZIP_NAME" \
  manifest.json \
  LICENSE \
  README.md \
  README_EN.md \
  src/ \
  skills/ \
  -x "*.DS_Store" \
  -x "*__pycache__*"

ZIP_SIZE=$(du -h "$OUTPUT_DIR/$ZIP_NAME" | awk '{print $1}')
echo "✅ 打包完成！"
echo "   文件路径: dist/$ZIP_NAME"
echo "   文件大小: $ZIP_SIZE"
