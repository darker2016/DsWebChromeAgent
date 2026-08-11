# CLAUDE.md — DsBrowserHelper（Deepseek Web Agent）

## 项目概述

浏览器扩展（Chrome MV3），在 AI 对话页（当前仅 Deepseek）右下角注入「技能」浮动按钮。用户在面板中选择一个**技能**——**专家团**（多角色协作 skill 组）或**单体技能**（单个 SKILL.md）——扩展把对应 `SKILL.md` 引导提示词**注入聊天输入框**，让对话 AI 扮演专家主理人。

- **本地路径**：`/Users/darker/Documents/cursor_projects/DsBrowserHelper`
- **GitHub**：https://github.com/darker2016/DeepseekWebAgent
- **技能来源**：专家团 ← 本地 `WorkBuddySkillGroups`；单体技能 ← GitHub `anthropics/skills` 等开源收集

## 核心协作规则（必须遵守）

### ⚠️ 规则 1（最高优先级）：改代码必须同步改文档

修改任何代码 / 技能 / 配置，都必须同步更新对应文档。**改前先读，改完必更。**

| 代码 / 资源 | 对应文档 |
|-------------|---------|
| `src/content/*`、`src/shared/*` | `docs/site-adapters.md` |
| `src/background`、`src/popup`、`src/options`、`manifest.json` | `docs/architecture.md` |
| `skills/`、`scripts/*`（sync / fetch / build-index） | `docs/skill-system.md` |
| 开发流程 | `docs/development.md` |
| 发布 / 同步规范 / 版权归因 | `docs/release.md` |
| 技能清单变化（增删） | 同步更新 `README.md` 技能清单 |

> 文档描述的是目标架构。文档与代码必须一致：改了行为但没更新文档 = 任务未完成。

### 规则 2：不主动推送 GitHub

只 commit，不 push；每次 `git commit` 后询问用户是否推送，仅当用户明确说「push / 推送」才执行 `git push origin main`。

### 规则 3：理解项目先读文档，不假设旧上下文

- 每次会话先 `git log --oneline -5` + `git status` 看当前状态。
- 涉及代码修改前，先读 CLAUDE.md 索引 + 对应 docs（architecture / skill-system / site-adapters）。
- 不参考与本项目无关的其他项目代码。

## 快速开始

1. `bash scripts/sync-skills.sh && bash scripts/fetch-single-skills.sh && node scripts/build-index.js`（一次性准备技能包）
2. Chrome 打开 `chrome://extensions` → 开发者模式 → 「加载已解压的扩展程序」→ 选本项目根目录
3. 打开 `chat.deepseek.com` → 点右下角「技能」按钮 → 选择技能 → 「插入」→ 输入框出现提示词 → 发送
4. 详细开发/调试见 `docs/development.md`

## 架构速览

```
content script（浮动按钮 + 选择面板 + DSWA.adapter 注入输入框）
        │ fetch(chrome.runtime.getURL('skills/index.json'))
        ▼
skills/index.json（注册表，build-index.js 生成）
        │
        ├── groups/<id>/  专家团（sync-skills.sh 从 WorkBuddySkillGroups 同步）
        └── singles/<id>/ 单体技能（fetch-single-skills.sh 从 GitHub 收集）
```

完整架构、数据流、消息协议见 `docs/architecture.md`。

## 目录结构速查

| 路径 | 作用 |
|------|------|
| `manifest.json` | MV3 声明（根目录，直接 Load unpacked） |
| `src/content/` | 站点适配 + 浮动技能选择器（Deepseek） |
| `src/shared/` | 技能索引加载 / 解析、常量 |
| `src/background/` | 极简 service worker |
| `src/popup/` | 工具栏弹窗 |
| `src/options/` | 设置页（占位） |
| `skills/` | 内置技能包（`index.json` 勿手改） |
| `scripts/` | 技能同步 + 索引构建 |
| `docs/` | 详细文档（见下方索引） |

## 文档索引（本文件 = 入口）

| 文档 | 一句话作用 |
|------|-----------|
| `docs/architecture.md` | 整体架构、模块职责、数据流、消息协议、权限 |
| `docs/skill-system.md` | 注册表格式、技能来源、同步/构建、新增技能指南 |
| `docs/site-adapters.md` | 站点适配层、Deepseek 注入机制、新增站点指南、真机验证记录 |
| `docs/development.md` | 本地加载、调试、测试、代码规范 |
| `docs/release.md` | GitHub 发布、同步规范、版权归因、版本记录 |

## 技能系统要点

- 技能统一为「目录 + SKILL.md + frontmatter」，注册表用 `type` 区分 `group`（专家团，注入 lead）与 `single`（单体，注入自身）。
- 精选子集：专家团 12 组（见 `scripts/skills-manifest.txt`）、单体技能 17 个（见 `scripts/singles-manifest.txt`）。
- 每次同步后必须 `node scripts/build-index.js` 重新生成 `skills/index.json`。
- 分类映射在 `scripts/categories.json`；版权归因见 `docs/release.md`。

## 发布

目标仓库 `darker2016/DeepseekWebAgent`。迭代完成 → commit → 询问后 push，流程见 `docs/release.md`。

## 当前版本

`0.1.0` — 文档体系 + 最小可运行骨架（专家团 12 + 单体 17，Deepseek 注入链路）。
