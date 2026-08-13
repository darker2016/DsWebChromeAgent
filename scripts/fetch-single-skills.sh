#!/usr/bin/env bash
# 从多个 GitHub 仓库收集单体技能到 skills/singles/（按 singles-manifest.txt）。
# 每个技能只收集 SKILL.md + LICENSE（浏览器注入只用 SKILL.md 提示词，脚本/资源为冗余）。
#
# 清单格式：技能id<TAB>仓库<TAB>分支<TAB>仓库内路径
# 用法：
#   bash scripts/fetch-single-skills.sh
#   bash scripts/fetch-single-skills.sh --source-dir <本地克隆根目录>   # 网络受限时用本地克隆
#     （本地克隆根目录下需有 <owner>/<name> 子目录，如 .../DeepJH/doubao-skill-and-info）
# 收集后记得重新生成索引：node scripts/build-index.js
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEST="$ROOT/skills/singles"
MANIFEST="$SCRIPT_DIR/singles-manifest.txt"

SOURCE_DIR=""
while [ $# -gt 0 ]; do
  case "$1" in
    --source-dir) SOURCE_DIR="$2"; shift 2 ;;
    *) echo "未知参数: $1" >&2; exit 1 ;;
  esac
done

mkdir -p "$DEST"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# 目录名：repo|ref 可推导的干净名字（兼容 bash 3.2，不用关联数组）
sanitize() { echo "$1" | tr '/|' '__'; }

# Pass 1：收集唯一「repo|ref」并准备仓库根目录
REPO_KEYS_FILE="$TMP/repo_keys.txt"
: > "$REPO_KEYS_FILE"
while IFS=$'\t' read -r id repo ref path || [ -n "$id" ]; do
  case "$id" in "" | \#*) continue ;; esac
  key="$repo|$ref"
  if ! grep -qxF "$key" "$REPO_KEYS_FILE"; then
    echo "$key" >> "$REPO_KEYS_FILE"
  fi
done < "$MANIFEST"

while IFS='|' read -r repo ref; do
  [ -z "$repo" ] && continue
  dir="$TMP/repos/$(sanitize "$repo|$ref")"
  if [ -n "$SOURCE_DIR" ]; then
    if [ -d "$SOURCE_DIR/$repo" ]; then
      cp -R "$SOURCE_DIR/$repo" "$dir"
      echo "使用本地仓库: $SOURCE_DIR/$repo"
    else
      echo "✗ 本地缺少仓库: $SOURCE_DIR/$repo" >&2
    fi
  else
    echo "下载 $repo (ref=$ref) ..."
    curl -fsSL "https://github.com/$repo/archive/refs/heads/$ref.tar.gz" -o "$TMP/pkg.tgz"
    mkdir -p "$dir"
    tar -xzf "$TMP/pkg.tgz" -C "$dir" --strip-components 1
  fi
done < "$REPO_KEYS_FILE"

# Pass 2：按技能收集
while IFS=$'\t' read -r id repo ref path || [ -n "$id" ]; do
  case "$id" in "" | \#*) continue ;; esac
  srcdir="$TMP/repos/$(sanitize "$repo|$ref")/$path"
  if [ ! -d "$srcdir" ]; then
    echo "✗ $id 仓库内路径不存在: $repo/$path" >&2
    continue
  fi
  rm -rf "$DEST/$id"
  mkdir -p "$DEST/$id"
  if [ -f "$srcdir/SKILL.md" ]; then
    cp "$srcdir/SKILL.md" "$DEST/$id/SKILL.md"
  else
    echo "✗ $id 缺少 SKILL.md" >&2
    continue
  fi
  [ -f "$srcdir/LICENSE" ] && cp "$srcdir/LICENSE" "$DEST/$id/LICENSE"
  [ -f "$srcdir/LICENSE.txt" ] && cp "$srcdir/LICENSE.txt" "$DEST/$id/LICENSE.txt"
  echo "✓ 收集 $id"
done < "$MANIFEST"

echo "完成 -> $DEST"
echo "下一步: node scripts/build-index.js"
