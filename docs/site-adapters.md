# 站点适配层（site-adapters.md）

> 本文档描述站点适配层设计、Deepseek 适配详情与输入注入机制。修改 `src/content/*`、`src/shared/*`、`manifest.json` 中 content_scripts 配置时必须同步更新本文档。

## 1. 适配层接口

站点差异全部收敛到单个 adapter 模块，content script 其它部分不感知具体站点。

```js
// 约定的 adapter 形状（当前仅 DSWA.adapter 一个实现）
{
  // 定位聊天输入框；找不到返回 null
  findInput(): HTMLElement | null,

  // 把提示词追加进输入框（React 兼容），返回 { ok: true, input } 或 { ok: false, reason }
  injectPrompt(text): { ok: boolean, input?: HTMLElement, reason?: string },
}
```

新增站点步骤见 §4。

## 2. Deepseek 适配（src/content/deepseek-adapter.js）

### 输入框定位

候选选择器从上到下依次尝试，首个可用即返回：

```js
'#chat-input',
'textarea#chat-input',
'textarea.ds-input',
'textarea[data-testid="chat_input"]',
'textarea[placeholder]',
'textarea',          // 兜底
```

找不到时回退到「页面最后一个可编辑 textarea」。

⚠️ **真机验证记录**：以上选择器基于 Deepseek 网页版常见 DOM 归纳，**必须**在真实 `chat.deepseek.com` 上验证。若站点改版导致选择器失效：
1. 在浏览器 DevTools 中检查输入框真实结构；
2. 更新 `INPUT_SELECTORS`；
3. 在本文档「真机验证记录」追加一条改动（日期 + 选择器 + 验证结果）。

### 注入机制（React 兼容）

Deepseek 前端使用 React，直接赋值 `textarea.value` 不会触发其状态更新。必须走**原生 value setter + input 事件**：

```js
const setter = Object.getOwnPropertyDescriptor(
  window.HTMLTextAreaElement.prototype, 'value'
).set;
setter.call(textarea, 新值);
textarea.dispatchEvent(new Event('input', { bubbles: true }));
```

- 注入时**保留输入框已有内容**（新提示词追加在末尾，中间空一行）。
- 注入后 `focus()`，用户直接回车即可发送。

## 3. 注入内容

- 注入的是技能 `SKILL.md` **正文**（剥离 YAML frontmatter 后的部分）。
- group 注入 lead 的 SKILL.md；single 注入自身的 SKILL.md。
- 建议用户在新对话的**首条消息**注入，效果最接近「把它当系统提示词」。

## 4. 新增站点指南

1. 新建 `src/content/<site>-adapter.js`，实现 `findInput` / `injectPrompt`。
2. 在 `manifest.json`：
   - `content_scripts.matches` 增加站点 URL 模式；
   - `host_permissions` 增加对应 host；
   - `web_accessible_resources.matches` 增加对应 host；
   - `content_scripts.js` 中把新 adapter 文件放在 `skill-picker.js` **之前**加载。
3. 在 `src/shared/constants.js` 或新文件中注册站点 → adapter 的映射，并让 skill-picker 按当前站点选择 adapter（本轮骨架只做一个站点，注册处留占位）。
4. 真机验证注入是否成功；在本文档登记站点。
5. 同步更新本文档、docs/architecture.md、README。

## 5. 真机验证记录

| 日期 | 站点 | 输入框选择器 | 注入结果 |
|------|------|-------------|---------|
| 2026-08-11 | chat.deepseek.com | 待验证（骨架默认 `#chat-input` → `textarea` 兜底） | 待验证 |
