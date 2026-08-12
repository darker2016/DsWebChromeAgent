# 架构设计（architecture.md）

> 本文档描述 DsBrowserHelper 的整体架构。修改 `manifest.json`、`src/background`、`src/popup`、`src/options`、`src/shared` 时必须同步更新本文档。

## 1. 一句话架构

Chrome MV3 扩展：在多个 AI 对话站点（Deepseek / Kimi / 豆包 / ChatGPT / 通义 / 智谱 / 元宝 / 文心，未命中走通用模式）注入浮动技能选择器。用户选一个**技能**（专家团 / 单体 / 用户自定义）后，扩展拉取对应 `SKILL.md`，套上**引导模板**（group / single 两套，告诉 AI 怎么用这个技能）并**注入聊天输入框**，让对话 AI 扮演专家主理人。

```
┌─────────────────────────────────────────────────────────────┐
│  浏览器                                                        │
│  ┌───────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ popup     │  │ background   │  │ content script        │  │
│  │ 站点状态   │  │ 技能兜底+唤醒 │◄─┤  - 浮动按钮 + 选择面板   │  │
│  │ 手动唤醒   │  │ ENABLE_SITE  │  │  - DSWA.adapter 注入   │  │
│  └─────┬─────┘  └──────┬───────┘  └───────────────────────┘  │
│        │消息             │消息(兜底)                          │
│        └────────────────┼ DSWA_GET_INDEX / GET_SKILL_TEXT ──┘│
│                         └ DSWA_ENABLE_SITE（popup → background）│
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ skills/（内置静态资源，web_accessible_resources 暴露）   │  │
│  │  index.json + groups/* + singles/*                     │  │
│  └─────────────────────────────────────────────────────────┘  │
│  chrome.storage.local：dswa:user-skills（用户上传技能）       │
│   内容脚本直读优先 fetch(getURL(...))，失败转 background 兜底    │
└─────────────────────────────────────────────────────────────┘
```

## 2. 模块职责

| 模块 | 职责 | 关键文件 |
|------|------|---------|
| `manifest.json` | MV3 声明：权限、content_scripts（多站点 matches）、background、popup、options、web_accessible_resources | `manifest.json` |
| content script | 页面侧 UI + 注入。直读技能索引（失败转 background）、合并用户技能、渲染选择器、把提示词写进输入框 | `src/content/skill-picker.js`、`src/content/content.css` |
| 站点适配 | 站点注册表 + 适配器工厂：按 host 选配置（textarea / contenteditable / 通用） | `src/shared/site-config.js`、`src/content/site-adapter.js`（见 docs/site-adapters.md） |
| shared | 技能索引读取/解析（双路径）、引导模板、用户技能存储与解析、站点注册表、常量 | `src/shared/skill-index.js`、`src/shared/user-skills.js`、`src/shared/site-config.js`、`src/shared/constants.js` |
| background | 技能数据兜底（DSWA_GET_INDEX / DSWA_GET_SKILL_TEXT）；站点唤醒（DSWA_ENABLE_SITE：executeScript + registerContentScripts 持久化） | `src/background/service-worker.js` |
| popup | 工具栏弹窗：版本、技能数量、当前站点状态、「在此页面启用插件」 | `src/popup/*` |
| options | 设置页：技能包概览、用户技能上传（单个 .md / 文件夹）与删除 | `src/options/*` |
| skills/ | 内置技能包（静态资源） | `skills/index.json`、`skills/groups/*`、`skills/singles/*` |
| scripts/ | 技能同步与索引构建（构建期工具，非运行时） | `scripts/sync-skills.sh`、`scripts/fetch-single-skills.sh`、`scripts/build-index.js` |

## 3. 数据流

### 3.1 技能注入（主链路）

```
1. 用户在任一支持的 AI 对话页（或手动唤醒的页面）
2. content script 初始化：site-adapter 按 host 选适配器；ensureRoot() 挂载浮动按钮
3. 用户点按钮 → toggle() → 面板打开 → 首次 load() 获取索引
   - 内置：直读优先 fetch(getURL('skills/index.json'))，失败经 DSWA_GET_INDEX 走 background（带超时）
   - 合并用户技能：chrome.storage 里 source:'user' 的技能追加进缓存索引
4. 用户点某个技能 → insertSkill(skill)
5. skillIndex.promptFor(skill) → 引导模板（DSWA.GUIDE[type]）+ 技能正文
   - group → 「你正在启用…专家团技能…主理人职责」+ groups/<id>/<lead.path>
   - single → 「你正在启用…技能…严格按定义执行」+ singles/<id>/<SKILL.md>
   - 用户技能 → 从 chrome.storage 读取文件正文
6. adapter.injectPrompt(prompt)：
   - textarea  → 原生 value setter + input 事件（React 兼容）
   - contenteditable → Selection 光标末尾 + execCommand('insertText')
7. toast 提示「已插入」，用户手动发送
```

### 3.2 技能索引（构建期）

```
scripts/sync-skills.sh        # 从本地 WorkBuddySkillGroups 复制专家团 → skills/groups/
scripts/fetch-single-skills.sh# 从 GitHub 收集单体技能 → skills/singles/
node scripts/build-index.js   # 扫描两类目录 → 生成 skills/index.json
```
详见 docs/skill-system.md。用户技能不走构建期，运行时从 chrome.storage 合并。

### 3.3 手动唤醒（任意页面）

```
1. 打开任意含富文本框的页面
2. popup →「在此页面启用插件」→ DSWA_ENABLE_SITE(host, tabId)
3. background：
   - insertCSS + executeScript 立即注入样式与内容脚本（当前页出现「技能」按钮）
   - registerContentScripts 持久化注册该 host（下次访问自动注入）
   - host 记入 chrome.storage['dswa:sites']；onInstalled/onStartup 重注册
4. 该页用「通用」适配器（textarea + contenteditable 检测）
```

## 4. 消息协议

popup / background / content 之间通过 `chrome.runtime.sendMessage` / `onMessage` 通信。

| 消息 type | 方向 | 入参 | 响应 | 说明 |
|-----------|------|------|------|------|
| `DSWA_GET_INDEX` | content → bg | 无 | `{ ok, index }` | 技能索引（background 缓存） |
| `DSWA_GET_SKILL_TEXT` | content → bg | `path`（相对 skills/） | `{ ok, text }` | SKILL.md 文本 |
| `DSWA_ENABLE_SITE` | popup → bg | `host`, `tabId?` | `{ ok }` | 手动唤醒：注入 + 持久化注册 |

新增消息时，在 `src/background/service-worker.js` 与本文档同步登记。

## 5. 权限与资源

| 项 | 值 | 说明 |
|----|----|------|
| permissions | `storage` `unlimitedStorage` `scripting` `tabs` | 技能存储；用户技能体积；运行时注入；查询当前 tab |
| host_permissions | `<all_urls>` | executeScript / registerContentScripts 对任意站点生效的前提 |
| content_scripts.matches | 内置 14 条站点匹配 | 支持站点的 FAB 自动出现（见 site-config.js 的站点列表） |
| web_accessible_resources | `skills/*` matches `<all_urls>` | 内容脚本直读技能包（覆盖所有注入站点） |

⚠️ 新增站点：先在 `src/shared/site-config.js` 注册，再改 `manifest.json` 的 `content_scripts.matches`，并在 docs/site-adapters.md 登记验证结果。

## 6. 关键设计决策

- **注入输入框而非系统提示词**：AI 对话页普遍未暴露系统提示词设置，注入输入框最通用、零 API 风险。
- **注入内容 = 引导模板 + 技能正文**：裸 SKILL.md 缺少「怎么用」的上下文；group 强调主理人调度职责，single 强调严格按定义执行。
- **技能双路径读取**：内容脚本直读优先（web_accessible_resources 授权），background 消息兜底；所有请求带超时，失败可见，避免 UI 卡死。
- **统一技能模型**：专家团 / 单体 / 用户自定义都是「SKILL.md + frontmatter」，注册表用 `type` 区分，注入逻辑复用；用户技能以 `source:'user'` 标记、从 chrome.storage 读取。
- **站点适配器工厂**：`site-config.js` 声明站点（kind: textarea/contenteditable），`site-adapter.js` 按 host 生成 adapter；未命中走通用模式。避免每站点一个模块。
- **手动唤醒用 scripting API**：`executeScript` 即时注入 + `registerContentScripts` 持久化，无需 `<all_urls>` 常驻内容脚本，减少默认打扰。
- **content script 用普通脚本而非 ES module**：MV3 下按 manifest 顺序加载、顶层绑定 `globalThis.DSWA` 共享；picker 带幂等守卫，重复注入不重复挂载。

## 7. 后续规划（本轮不做）

- 成员级选择：专家团内部挑选单个成员 SKILL.md 注入。
- 引导模板自定义：设置页可编辑 group / single 引导文案。
- 用户技能 zip 上传。
- 运行时外部拉取技能（GitHub raw / 远程服务器），需处理 CORS 与缓存。
- 打包分发：crx / Chrome 应用商店发布。
- 技能 SKILL.md 文本缓存到 background / `chrome.storage`，减少重复读取。
