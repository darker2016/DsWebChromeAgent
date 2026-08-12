# 技能系统（skill-system.md）

> 本文档描述技能注册表格式、技能来源与同步/构建流程。修改 `skills/`、`scripts/` 时必须同步更新本文档，并在技能清单变化时同步更新 README 的技能清单。

## 1. 技能模型

所有技能统一为「目录 + SKILL.md + YAML frontmatter（`name` / `description`）」，用 `type` 区分两类：

| type | 含义 | 来源 | 目录 | 注入内容 |
|------|------|------|------|---------|
| `group` | 专家团（多角色协作） | 本地 WorkBuddySkillGroups | `skills/groups/<id>/` | lead SKILL.md |
| `single` | 单体技能 | GitHub 开源收集 | `skills/singles/<id>/` | 自身 SKILL.md |

## 2. 注册表格式（skills/index.json）

由 `scripts/build-index.js` 生成，**禁止手改**。结构：

```jsonc
{
  "version": 1,
  "generated_at": "2026-08-11",
  "counts": { "group": 12, "single": 17 },
  "skills": [
    {
      "id": "investment-masters-skills",          // 目录名
      "type": "group",                             // group | single
      "name": "investment-masters-skills（AI 投资大师专家团）", // 展示名
      "category": "投资分析",                        // 来自 categories.json，缺省为「未分类」
      "description": "…（截断 400 字）",
      "lead": { "path": "groups/investment-masters-skills/hedge-fund-lead/SKILL.md", "name": "hedge-fund-lead" },
      "members": [ { "path": "groups/investment-masters-skills/oracle-of-omaha/SKILL.md", "name": "oracle-of-omaha" } ],
      "member_count": 21,
      "triggers": ["投资分析", "股票分析", "…"]
    }
  ]
}
```

### build-index.js 解析规则

- **group.name**：README.md 首个 H1；兜底 lead frontmatter.name / 目录名。
- **group.description**：lead SKILL.md frontmatter.description；兜底 README「## 描述」段。
- **group.lead 探测顺序**：
  1. README.md 团队表中标记 `(主理人)` 的那一行，如 `| \`hedge-fund-lead/SKILL.md\` | **(主理人)** |`；
  2. 候选文件路径含 `lead` / `team-lead`；
  3. 第一个候选文件。
- **group.members**：目录内候选 md（递归，排除 README.md / overview.md，排除 `references|scripts|assets` 子目录），去掉 lead。
- **group.triggers**：lead description 中「触发词：」之后按 `、，,；` 分隔的项。
- **single**：目录内最浅的 SKILL.md 的 frontmatter name/description。
- **path**：lead / members 的 `path` 含类型前缀（`groups/` 或 `singles/`），**相对 `skills/`**，如 `groups/<id>/…/SKILL.md`、`singles/<id>/SKILL.md`。运行时加载为 `skills/` + path。
- **category**：查 `scripts/categories.json`（id → 分类），未命中记「未分类」并告警。

> 若某专家团的 lead 探测不正确，先检查其 README 是否含 `(主理人)` 标记行；极少数非标准结构（如纯扁平 `01-xxx-skill.md` 组）需人工在 build-index.js 中补充规则并更新本文档。

## 3. 技能来源

| 来源 | 类型 | 地址 |
|------|------|------|
| WorkBuddySkillGroups（本地） | group | `/Users/darker/Documents/cursor_projects/WorkBuddySkillGroups`（GitHub: darker2016/workbuddy-skill-groups） |
| anthropics/skills（官方开源示例技能） | single | https://github.com/anthropics/skills |
| 后续可选：superpowers | single | https://github.com/obra/superpowers |
| 后续可选：awesome-claude-code（社区清单） | single | https://github.com/hesreallyhim/awesome-claude-code |

> 网络受限时可先用 `git clone` 拉取来源仓库到本地，再用 `--source-dir` 参数走本地复制。

## 4. 同步与构建流程

```bash
# 1) 专家团：从本地 WorkBuddySkillGroups 同步（按 skills-manifest.txt）
bash scripts/sync-skills.sh [源目录]

# 2) 单体技能：从 GitHub 下载（按 singles-manifest.txt）
bash scripts/fetch-single-skills.sh [--source-dir <本地克隆> | --repo <URL> --ref <分支>]

# 3) 重新生成注册表（幂等）
node scripts/build-index.js
```

- `scripts/skills-manifest.txt`：专家团精选清单（一行一个目录名，`#` 为注释）。
- `scripts/singles-manifest.txt`：单体技能清单。
- `scripts/categories.json`：id → 分类映射，两类共用。
- 同步脚本排除 `.DS_Store` / `.gitignore` / `__pycache__`，单体技能目录自带 LICENSE 会被原样保留（归因要求）。

> 📦 **体积说明**：单体技能（docx/pptx/xlsx 的 Office schema、canvas-design 的字体等）自带 scripts/assets 使 `skills/` 约 12M。浏览器注入场景只用 SKILL.md 提示词，这些辅助资源为冗余；后续可考虑同步时仅保留 SKILL.md + LICENSE + 必要 references，并在本文档登记变更。

## 5. 新增 / 删除技能

### 新增专家团（group）

1. 在 `scripts/skills-manifest.txt` 加入来源目录名。
2. `bash scripts/sync-skills.sh`。
3. 在 `scripts/categories.json` 补分类。
4. `node scripts/build-index.js`，检查该组 lead / members / member_count 是否正确。
5. 同步更新 README 技能清单 + 本文档。

### 新增单体技能（single）

1. 确认来源仓库 `skills/<name>` 目录存在、含 SKILL.md。
2. 在 `scripts/singles-manifest.txt` 加入名字。
3. `bash scripts/fetch-single-skills.sh`（默认从 anthropics/skills 拉取）。
4. 在 `scripts/categories.json` 补分类。
5. `node scripts/build-index.js`。
6. 同步更新 README 技能清单 + 本文档。

### 删除技能

从对应 manifest 移除 → 手动删除 `skills/groups|singles/<id>` 目录 → `node scripts/build-index.js` → 同步更新文档。

## 6. 用户技能（运行时上传）

浏览器用户在设置页（options）上传自定义技能，存储于 `chrome.storage.local['dswa:user-skills']`，运行时与内置技能合并展示（`source:'user'`，分类「用户自定义」）。**不走构建期脚本**。

| 上传方式 | 格式 | 识别结果 |
|---------|------|---------|
| 单个 .md | 含 frontmatter（name/description）的 SKILL.md | `single`（files 存为 `{'SKILL.md': 正文}`） |
| 文件夹 | 多个 .md | 仅一个 md → `single`；多个 → `group`（lead 判定：README「(主理人)」标记 → 路径含 lead/team-lead → 第一个） |

存储结构（`dswa:user-skills` = map `id → skill`）：

```jsonc
{
  "id": "user-xxx",
  "source": "user",
  "type": "group | single",
  "name": "…",
  "category": "用户自定义",
  "description": "…",
  "lead": { "path": "lead/SKILL.md", "name": "…" },
  "members": [ { "path": "…", "name": "…" } ],
  "member_count": 3,
  "files": { "lead/SKILL.md": "…", "member/SKILL.md": "…" },  // 相对技能根目录
  "createdAt": 123456
}
```

- 实现：`src/shared/user-skills.js`（`list / get / save / remove / readFile / buildFromSingle / buildFromFolder`），content 与 options 共用。
- 合并：`src/shared/skill-index.js` `load()` 拉取内置索引后追加用户技能；`promptFor()` 对用户技能从 storage 读取文件正文，同样套引导模板。
- 依赖权限：`unlimitedStorage`（chrome.storage.local 体积上限放开）。

## 7. 版权与归因

- 专家团内容来自 WorkBuddySkillGroups（第三方作者见其仓库 LICENSE 顶部 attribution）。
- 单体技能来自 anthropics/skills，各技能目录自带 LICENSE 文件，保留不删。
- 本扩展 `LICENSE` 为 MIT，第三方技能版权归原作者所有，详见 docs/release.md。
