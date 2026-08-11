#!/usr/bin/env bash
# 从 GitHub 收集精选单体技能到 skills/singles/
# 默认来源：https://github.com/anthropics/skills（官方开源示例技能）
# 用法：
#   bash scripts/fetch-single-skills.sh                # 从 GitHub 下载
#   bash scripts/fetch-single-skills.sh --source-dir <本地克隆路径>   # 网络受限时用本地克隆
#   bash scripts/fetch-single-skills.sh --repo <URL> --ref <分支>    # 更换来源
# 收集后记得重新生成索引：node scripts/build-index.js
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEST="$ROOT/skills/singles"
MANIFEST="$SCRIPT_DIR/singles-manifest.txt"

REPO="https://github.com/anthropics/skills"
REF="main"
SOURCE_DIR=""

# 解析参数
while [ $# -gt 0 ]; do
  case "$1" in
    --source-dir)
      SOURCE_DIR="$2"; shift 2 ;;
    --repo)
      REPO="$2"; shift 2 ;;
    --ref)
      REF="$2"; shift 2 ;;
    *)
      echo "未知参数: $1" >&2; exit 1 ;;
  esac
done

mkdir -p "$DEST"

copy_dir() {
  # $1 = 源（目录所在位置） $2 = 目录名
  rm -rf "$DEST/$2"
  mkdir -p "$DEST/$2"
  tar --exclude='.DS_Store' --exclude='__pycache__' -C "$1" -cf - "$2" \
    | tar -C "$DEST" -xf -
  echo "✓ 收集 $2"
}

if [ -n "$SOURCE_DIR" ]; then
  SKILLS_ROOT="$SOURCE_DIR/skills"
  if [ ! -d "$SKILLS_ROOT" ]; then
    echo "✗ 本地克隆目录未找到 skills/ 子目录: $SOURCE_DIR" >&2
    exit 1
  fi
  while IFS= read -r name || [ -n "$name" ]; do
    case "$name" in "" | \#*) continue ;; esac
    if [ -d "$SKILLS_ROOT/$name" ]; then
      copy_dir "$SKILLS_ROOT" "$name"
    else
      echo "✗ 本地缺少技能: $name" >&2
    fi
  done < "$MANIFEST"
else
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  TARBALL="$REPO/archive/refs/heads/$REF.tar.gz"
  echo "下载 $TARBALL ..."
  curl -fsSL "$TARBALL" -o "$TMP/skills.tar.gz"
  tar -xzf "$TMP/skills.tar.gz" -C "$TMP"
  # 解压目录名形如 skills-main/skills/
  EXTRACTED="$(find "$TMP" -maxdepth 2 -type d -name skills | head -n 1)"
  if [ -z "$EXTRACTED" ]; then
    echo "✗ 解压后未找到 skills/ 目录（仓库结构可能变化）" >&2
    exit 1
  fi
  while IFS= read -r name || [ -n "$name" ]; do
    case "$name" in "" | \#*) continue ;; esac
    if [ -d "$EXTRACTED/$name" ]; then
      copy_dir "$EXTRACTED" "$name"
    else
      echo "✗ 来源缺少技能: $name" >&2
    fi
  done < "$MANIFEST"
fi

echo "完成 -> $DEST"
echo "下一步: node scripts/build-index.js"
