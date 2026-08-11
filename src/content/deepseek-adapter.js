// Deepseek 站点适配：定位聊天输入框，并把提示词以 React 兼容方式注入。
// 注意：Deepseek 前端用 React，直接改 textarea.value 不会触发其状态更新，
// 必须走原生 value setter + input 事件（见 injectPrompt）。
globalThis.DSWA = globalThis.DSWA || {};

DSWA.adapter = (() => {
  // 候选选择器，从上到下依次尝试。首个可用即用。
  // ⚠️ 选择器随站点改版可能失效，失效时按 docs/site-adapters.md 更新并在文档中记录。
  const INPUT_SELECTORS = [
    '#chat-input',
    'textarea#chat-input',
    'textarea.ds-input',
    'textarea[data-testid="chat_input"]',
    'textarea[placeholder]',
    'textarea',
  ];

  // 定位聊天输入框；找不到返回 null
  function findInput() {
    for (const sel of INPUT_SELECTORS) {
      const el = document.querySelector(sel);
      if (el && !el.disabled && !el.readOnly) return el;
    }
    // 兜底：页面最后一个可编辑 textarea
    const candidates = Array.from(document.querySelectorAll('textarea')).filter(
      t => !t.disabled && !t.readOnly
    );
    return candidates[candidates.length - 1] || null;
  }

  // 把提示词追加进输入框（保留已有内容），返回 { ok } 或 { ok:false, reason }
  function injectPrompt(text) {
    const input = findInput();
    if (!input) {
      return { ok: false, reason: '未找到聊天输入框' };
    }
    const existing = input.value ? input.value.replace(/\s+$/, '') + '\n\n' : '';
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    ).set;
    setter.call(input, existing + text);
    // React 通过 input 事件感知变更
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
    return { ok: true, input };
  }

  return { findInput, injectPrompt };
})();
