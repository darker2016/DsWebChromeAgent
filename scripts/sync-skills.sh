#!/usr/bin/env bash
# 从本地 WorkBuddySkillGroups 同步精选专家团到 skills/groups/
# 用法：
#   bash scripts/sync-skills.sh [SOURCE_DIR]
#   SOURCE_DIR 默认 /Users/darker/Documents/cursor_projects/WorkBuddySkillGroups
# 同步后记得重新生成索引：node scripts/build-index.js
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE="${1:-/Users/darker/Documents/cursor_projects/WorkBuddySkillGroups}"
DEST="$ROOT/skills/groups"
MANIFEST="$SCRIPT_DIR/skills-manifest.txt"

if [ ! -d "$SOURCE" ]; then
  echo "✗ 源目录不存在: $SOURCE" >&2
  echo "  请传入 WorkBuddySkillGroups 本地路径作为参数" >&2
  exit 1
fi

mkdir -p "$DEST"

while IFS= read -r name || [ -n "$name" ]; do
  # 跳过空行与注释（# 开头）
  case "$name" in "" | \#*) continue ;; esac

  src="$SOURCE/$name"
  if [ ! -d "$src" ]; then
    echo "✗ 源中缺少目录: $name" >&2
    continue
  fi

  rm -rf "$DEST/$name"
  mkdir -p "$DEST/$name"
  # 用 tar 流式复制，排除垃圾文件；--exclude 在 macOS 的 bsdtar 下可用
  tar --exclude='.DS_Store' \
      --exclude='.gitignore' \
      --exclude='__pycache__' \
      -C "$SOURCE" -cf - "$name" \
    | tar -C "$DEST" -xf -
  echo "✓ 同步 $name"
done < "$MANIFEST"

echo "完成 -> $DEST"
echo "下一步: node scripts/build-index.js"
