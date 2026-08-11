# 架构设计（architecture.md）

> 本文档描述 DsBrowserHelper 的整体架构。修改 `manifest.json`、`src/background`、`src/popup`、`src/options`、`src/shared` 时必须同步更新本文档。

## 1. 一句话架构

Chrome MV3 扩展：content script 在 AI 对话页（当前仅 Deepseek）注入浮动技能选择器，用户选一个技能后，扩展拉取该技能的 `SKILL.md` 并**注入聊天输入框**，让对话 AI 扮演专家主理人。

```
┌─────────────────────────────────────────────────────────────┐
│  浏览器                                                        │
│  ┌───────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ popup     │  │ background   │  │ content script        │  │
│  │ (工具栏弹窗)│  │ (service     │◄─┤  - 浮动按钮 + 选择面板   │  │
│  │  技能数量  │  │   worker)    │  │  - DSWA.adapter 注入   │  │
│  └───────────┘  └──────┬───────┘  └───────────────────────┘  │
│                        │ 消息                                 │
│                        │ DSWA_GET_INDEX / DSWA_GET_SKILL_TEXT │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ skills/（扩展内置静态资源）                              │  │
│  │  index.json + groups/* + singles/*                     │  │
│  └─────────────────────────────────────────────────────────┘  │
│        background 用 fetch(chrome.runtime.getURL(...)) 读取技能│
└─────────────────────────────────────────────────────────────┘
```

## 2. 模块职责

| 模块 | 职责 | 关键文件 |
|------|------|---------|
| `manifest.json` | MV3 声明：权限、content_scripts、background、popup | `manifest.json` |
| content script | 页面侧 UI + 注入。经 background 获取技能索引、渲染选择器、把提示词写进输入框 | `src/content/skill-picker.js`、`src/content/deepseek-adapter.js`、`src/content/content.css` |
| 站点适配 | 屏蔽站点差异：定位输入框、React 兼容注入 | `src/content/deepseek-adapter.js`（见 docs/site-adapters.md） |
| shared | 技能索引的解析/匹配、常量 | `src/shared/skill-index.js`、`src/shared/constants.js` |
| background | 技能数据层：读取并缓存技能索引与 SKILL.md，响应内容脚本消息 | `src/background/service-worker.js` |
| popup | 工具栏弹窗：版本、技能数量、设置入口 | `src/popup/*` |
| options | 设置页（当前占位） | `src/options/*` |
| skills/ | 内置技能包（静态资源） | `skills/index.json`、`skills/groups/*`、`skills/singles/*` |
| scripts/ | 技能同步与索引构建（构建期工具，非运行时） | `scripts/sync-skills.sh`、`scripts/fetch-single-skills.sh`、`scripts/build-index.js` |

## 3. 数据流

### 3.1 技能注入（主链路）

```
1. 用户打开 chat.deepseek.com
2. content script 初始化：ensureRoot() 挂载浮动按钮（skill-picker.js）
3. 用户点按钮 → toggle() → 面板打开 → 首次 load() 经消息 DSWA_GET_INDEX 从 background 获取索引
4. 用户点某个技能 → insertSkill(skill)
5. skillIndex.promptFor(skill)：经消息 DSWA_GET_SKILL_TEXT 从 background 取文本，剥离 frontmatter
   - group  → skills/groups/<id>/<lead.path>
   - single → skills/singles/<id>/<SKILL.md>
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

## 4. 消息协议

popup / background / content 之间通过 `chrome.runtime.sendMessage` / `onMessage` 通信。

现有消息（background `service-worker.js` 实现）：

| 消息 type | 入参 | 响应 | 说明 |
|-----------|------|------|------|
| `DSWA_GET_INDEX` | 无 | `{ ok, index }` | 返回技能索引（background 缓存） |
| `DSWA_GET_SKILL_TEXT` | `path`（相对 skills/） | `{ ok, text }` | 返回 SKILL.md 文本 |
| `DSWA_PING` | 无 | `{ ok }` | 存活探测（当前代码已移除，如需要可恢复） |

新增消息时，在 `src/background/service-worker.js` 与本文档同步登记。

## 5. 权限与资源

| 项 | 值 | 说明 |
|----|----|------|
| permissions | `storage` | 预留偏好存储 |
| host_permissions | `https://chat.deepseek.com/*` | content script 匹配范围 |
| content_scripts.matches | `https://chat.deepseek.com/*` | 目前仅 Deepseek |

> 技能数据（index.json、SKILL.md）由 background 读取，无需 `web_accessible_resources`。

⚠️ 新增站点：同时修改 `manifest.json` 的 `matches` / `host_permissions`，并在 docs/site-adapters.md 登记。

## 6. 关键设计决策

- **注入输入框而非系统提示词**：Deepseek 网页版未暴露系统提示词设置，注入输入框最通用、零 API 风险。
- **技能打包进扩展（静态资源）**：离线可用、无 CORS 问题；用精选子集控制体积。技能数据由 **background 读取**（扩展上下文直读自身资源，不依赖 web_accessible_resources，比 content script 直接 fetch 更稳）。
- **统一技能模型**：专家团与单体技能都是「SKILL.md + frontmatter」，注册表用 `type` 区分，注入逻辑复用。
- **content script 用普通脚本而非 ES module**：MV3 下按 manifest 顺序加载、顶层绑定 `globalThis.DSWA` 共享，避免 importmap 复杂度。

## 7. 后续规划（本轮不做）

- 成员级选择：专家团内部挑选单个成员 SKILL.md 注入。
- 多站点适配（Kimi / 豆包 / ChatGPT 等），依赖站点适配层扩展。
- 运行时外部拉取技能（GitHub raw / 远程服务器），需处理 CORS 与缓存。
- 打包分发：crx / Chrome 应用商店发布。
- 技能 SKILL.md 文本缓存到 background / `chrome.storage`，减少重复读取（索引已在 background 缓存）。
