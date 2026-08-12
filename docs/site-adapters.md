# 站点适配层（site-adapters.md）

> 本文档描述站点适配层设计、各站点适配详情与输入注入机制。修改 `src/shared/site-config.js`、`src/content/site-adapter.js`、`manifest.json` 中 content_scripts 配置时必须同步更新本文档。

## 1. 适配层接口

站点差异全部收敛到 `DSWA.adapter`（由 `src/content/site-adapter.js` 按当前 host 生成），content script 其它部分不感知具体站点。

```js
// DSWA.adapter 形状（site-adapter.js 提供）
{
  // 当前命中的站点配置（来自 DSWA.SITES）
  site: { id, name, kind, selectors },

  // 定位聊天输入框；找不到返回 null
  findInput(): HTMLElement | null,

  // 把提示词追加进输入框，返回 { ok: true, input } 或 { ok: false, reason }
  injectPrompt(text): { ok: boolean, input?: HTMLElement, reason?: string },
}
```

站点注册表在 `src/shared/site-config.js`：`DSWA.SITES`（字段见下）+ `DSWA.siteConfig.matchHost(hostname)`（未命中返回 generic）。

### 站点配置字段

| 字段 | 说明 |
|------|------|
| `id` / `name` | 唯一标识 / 展示名 |
| `hostPatterns` | host 匹配列表（`matchHost` 用「等于或子域名」匹配） |
| `kind` | `textarea`：原生 setter 注入；`contenteditable`：execCommand 注入；`any`：两者都试 |
| `selectors` | 输入框候选选择器，从上到下首个可用即用 |

## 2. 注入机制

### textarea（Deepseek / Kimi / 豆包 / 通义 / 智谱 / 元宝 / 文心）

前端多为 React，直接赋值 `textarea.value` 不触发状态更新。必须走**原生 value setter + input 事件**：

```js
const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
setter.call(textarea, 新值);
textarea.dispatchEvent(new Event('input', { bubbles: true }));
```

### contenteditable（ChatGPT）

聚焦 → Selection 光标移到末尾 → `document.execCommand('insertText', false, text)`，多数前端框架会捕获输入事件。

```js
el.focus();
const sel = window.getSelection();
const range = document.createRange();
range.selectNodeContents(el);
range.collapse(false);          // 光标到末尾
sel.removeAllRanges();
sel.addRange(range);
document.execCommand('insertText', false, text);
```

- 注入时**保留输入框已有内容**（新提示词追加在末尾，中间空一行）。
- 注入后 `focus()`，用户直接回车即可发送。

## 3. 注入内容

- **注入内容 = 引导模板 + 技能正文**（`DSWA.GUIDE`，见 `src/shared/constants.js`）。
  - group 引导：「你正在启用…专家团技能…主理人职责（调度成员、不代写产出、汇编）」+ lead SKILL.md 正文。
  - single 引导：「你正在启用…技能…严格按定义执行」+ 自身 SKILL.md 正文。
- 建议用户在新对话的**首条消息**注入，效果最接近「把它当系统提示词」。

## 4. 新增站点指南

1. 在 `src/shared/site-config.js` 的 `DSWA.SITES` 增加一条（id/name/hostPatterns/kind/selectors）。
2. 在 `manifest.json` 的 `content_scripts.matches` 增加该站点 URL 模式（host_permissions 已是 `<all_urls>`，无需改）。
3. 真机验证注入；在 §6 登记站点 + 选择器 + 结果。
4. 同步更新本文档、docs/architecture.md、README 的站点列表。

## 5. 手动唤醒（任意页面）

- popup →「在此页面启用插件」→ `DSWA_ENABLE_SITE` → background `insertCSS` + `executeScript` 即时注入，`registerContentScripts` 持久化注册该 host。
- 该页使用 `generic` 适配器（`kind:'any'`，扫 textarea + contenteditable）。
- 持久化的 host 存在 `chrome.storage['dswa:sites']`，onInstalled / onStartup 时重注册。

## 6. 真机验证记录

| 日期 | 站点 | 输入框选择器 | 注入方式 | 结果 |
|------|------|-------------|---------|------|
| 2026-08-11 | chat.deepseek.com | `#chat-input` → `textarea` 兜底 | 原生 setter | ✅ 技能列表与注入可用（用户真机确认） |
| 2026-08-12 | kimi.moonshot.cn | `textarea` → contenteditable 兜底 | 原生 setter | 未验证 |
| 2026-08-12 | doubao.com | `textarea` → contenteditable 兜底 | 原生 setter | 未验证 |
| 2026-08-12 | chatgpt.com | `#prompt-textarea` → contenteditable | execCommand('insertText') | 未验证 |
| 2026-08-12 | 通义/智谱/元宝/文心 | 通用 textarea → contenteditable | 原生 setter | 未验证 |
| 2026-08-12 | 任意页面（手动唤醒） | generic 通用检测 | 按命中 kind | 未验证 |

> 以上「未验证」站点为基础归纳，需在真机逐一验证；失效时按新增站点指南调整并在此表追加记录（日期 + 改动 + 结果）。
