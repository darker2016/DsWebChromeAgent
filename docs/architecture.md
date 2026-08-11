# 架构设计（architecture.md）

> 本文档描述 DsBrowserHelper 的整体架构。修改 `manifest.json`、`src/background`、`src/popup`、`src/options`、`src/shared` 时必须同步更新本文档。

## 1. 一句话架构

Chrome MV3 扩展：content script 在 AI 对话页（当前仅 Deepseek）注入浮动技能选择器，用户选一个技能后，扩展拉取该技能的 `SKILL.md` 并**注入聊天输入框**，让对话 AI 扮演专家主理人。

```
┌─────────────────────────────────────────────────────────────┐
│  浏览器                                                        │
│  ┌───────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ popup     │  │ background   │  │ content script        │  │
│  │ (工具栏弹窗)│  │ (service     │  │  - 浮动按钮 + 选择面板   │  │
│  │  技能数量  │  │   worker)    │  │  - DSWA.adapter 注入   │  │
│  └─────┬─────┘  └──────┬───────┘  └──────────┬────────────┘  │
│        │              │                     │               │
│        └──────────────┴────── chrome.storage / 消息 ────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ skills/（扩展内置静态资源，web_accessible_resources 暴露）│  │
│  │  index.json + groups/* + singles/*                     │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
        content script 通过 fetch(chrome.runtime.getURL(...)) 读取技能内容
```

## 2. 模块职责

| 模块 | 职责 | 关键文件 |
|------|------|---------|
| `manifest.json` | MV3 声明：权限、content_scripts、background、popup、web_accessible_resources | `manifest.json` |
| content script | 页面侧 UI + 注入。加载技能索引、渲染选择器、把提示词写进输入框 | `src/content/skill-picker.js`、`src/content/deepseek-adapter.js`、`src/content/content.css` |
| 站点适配 | 屏蔽站点差异：定位输入框、React 兼容注入 | `src/content/deepseek-adapter.js`（见 docs/site-adapters.md） |
| shared | 技能索引的加载/解析/匹配、常量 | `src/shared/skill-index.js`、`src/shared/constants.js` |
| background | 极简 service worker；后续做技能内容缓存与消息路由 | `src/background/service-worker.js` |
| popup | 工具栏弹窗：版本、技能数量、设置入口 | `src/popup/*` |
| options | 设置页（当前占位） | `src/options/*` |
| skills/ | 内置技能包（静态资源） | `skills/index.json`、`skills/groups/*`、`skills/singles/*` |
| scripts/ | 技能同步与索引构建（构建期工具，非运行时） | `scripts/sync-skills.sh`、`scripts/fetch-single-skills.sh`、`scripts/build-index.js` |

## 3. 数据流

### 3.1 技能注入（主链路）

```
1. 用户打开 chat.deepseek.com
2. content script 初始化：ensureRoot() 挂载浮动按钮（skill-picker.js）
3. 用户点按钮 → toggle() → 面板打开 → 首次 load() 拉取 skills/index.json
4. 用户点某个技能 → insertSkill(skill)
5. skillIndex.promptFor(skill)：
   - group  → fetch skills/groups/<id>/<lead.path>，剥离 frontmatter
   - single → fetch skills/singles/<id>/<SKILL.md>，剥离 frontmatter
6. adapter.injectPrompt(prompt)：
   - findInput() 定位 textarea
   - 原生 value setter 写入 + 触发 input 事件（React 兼容）
7. toast 提示「已插入」，用户手动发送
```

### 3.2 技能索引（构建期）

```
scripts/sync-skills.sh        # 从本地 WorkBuddySkillGroups 复制专家团 → skills/groups/
scripts/fetch-single-skills.sh# 从 GitHub 收集单体技能 → skills/singles/
node scripts/build-index.js   # 扫描两类目录 → 生成 skills/index.json
```
详见 docs/skill-system.md。

## 4. 消息协议（当前占位）

- popup / background / content 之间暂以 `chrome.runtime.sendMessage` / `onMessage` 通信。
- 现有消息：`DSWA_PING`（存活探测，返回 `{ ok: true }`）。
- 后续计划消息：`DSWA_GET_INDEX`（由 background 返回缓存的索引）、`DSWA_CACHE_SKILL`（预取 SKILL.md）。
- 新增消息时，在 `src/background/service-worker.js` 与本文档「消息协议」一节同步登记。

## 5. 权限与资源

| 项 | 值 | 说明 |
|----|----|------|
| permissions | `storage` | 预留偏好存储 |
| host_permissions | `https://chat.deepseek.com/*` | content script 匹配范围 |
| content_scripts.matches | `https://chat.deepseek.com/*` | 目前仅 Deepseek |
| web_accessible_resources | `skills/*`、`src/*` | 供 content script fetch 技能文件 |

⚠️ 新增站点：同时修改 `manifest.json` 的 `matches` / `host_permissions` / `web_accessible_resources`，并在 docs/site-adapters.md 登记。

## 6. 关键设计决策

- **注入输入框而非系统提示词**：Deepseek 网页版未暴露系统提示词设置，注入输入框最通用、零 API 风险。
- **技能打包进扩展（静态资源）**：离线可用、无 CORS 问题；用精选子集控制体积。
- **统一技能模型**：专家团与单体技能都是「SKILL.md + frontmatter」，注册表用 `type` 区分，注入逻辑复用。
- **content script 用普通脚本而非 ES module**：MV3 下按 manifest 顺序加载、顶层绑定 `globalThis.DSWA` 共享，避免 importmap 复杂度。

## 7. 后续规划（本轮不做）

- 成员级选择：专家团内部挑选单个成员 SKILL.md 注入。
- 多站点适配（Kimi / 豆包 / ChatGPT 等），依赖站点适配层扩展。
- 运行时外部拉取技能（GitHub raw / 远程服务器），需处理 CORS 与缓存。
- 打包分发：crx / Chrome 应用商店发布。
- 技能内容缓存到 `chrome.storage` / background 缓存，减少重复 fetch。
