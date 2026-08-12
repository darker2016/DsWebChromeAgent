// 站点适配器工厂：按当前 host 选择站点配置，生成 DSWA.adapter。
// textarea 走原生 value setter + input 事件（React 兼容）；
// contenteditable（如 ChatGPT）走 Selection 光标末尾 + execCommand('insertText')。
// ⚠️ 选择器与 contenteditable 注入方式需真机验证，改动登记到 docs/site-adapters.md。
globalThis.DSWA = globalThis.DSWA || {};

DSWA.adapter = (() => {
  const site = DSWA.siteConfig.matchHost(location.hostname);

  function isUsable(el) {
    if (!el) return false;
    if (el.tagName === 'TEXTAREA') return !el.disabled && !el.readOnly;
    return el.isContentEditable === true;
  }

  // 定位聊天输入框；找不到返回 null
  function findInput() {
    for (const sel of site.selectors) {
      const el = document.querySelector(sel);
      if (isUsable(el)) return el;
    }
    // 兜底：页面最后一个可编辑 textarea / contenteditable
    const ta = Array.from(document.querySelectorAll('textarea')).filter(t => !t.disabled && !t.readOnly).pop();
    if (ta) return ta;
    const ce = Array.from(document.querySelectorAll('[contenteditable="true"][role="textbox"]')).filter(e => e.isContentEditable).pop();
    return ce || null;
  }

  function injectIntoTextarea(input, text) {
    const existing = input.value ? input.value.replace(/\s+$/, '') + '\n\n' : '';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(input, existing + text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  }

  function injectIntoContenteditable(el, text) {
    el.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false); // 光标移动到末尾
    sel.removeAllRanges();
    sel.addRange(range);
    // 在光标处插入文本，大多数前端框架会捕获到输入事件
    return document.execCommand('insertText', false, text);
  }

  // 把提示词追加进输入框（保留已有内容），返回 { ok } 或 { ok:false, reason }
  function injectPrompt(text) {
    const input = findInput();
    if (!input) return { ok: false, reason: '未找到聊天输入框' };
    try {
      if (input.tagName === 'TEXTAREA') {
        injectIntoTextarea(input, text);
      } else {
        const ok = injectIntoContenteditable(input, text);
        if (!ok) return { ok: false, reason: '富文本框注入失败（execCommand 不可用）' };
      }
      return { ok: true, input };
    } catch (e) {
      return { ok: false, reason: e.message };
    }
  }

  return { findInput, injectPrompt, site };
})();
