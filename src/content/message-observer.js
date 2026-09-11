// 页面消息操作栏监听与导出按钮挂载器
// 精准适配 DeepSeek、Kimi、豆包、ChatGPT、Gemini 等各大平台的消息工具栏
globalThis.DSWA = globalThis.DSWA || {};

if (!DSWA._messageObserverLoaded) {
DSWA._messageObserverLoaded = true;

DSWA.messageObserver = (() => {
  const ATTR_PROCESSED = 'data-dswa-export-mounted';

  // 寻找图标按钮的通用操作栏容器
  function findActionBarFromButton(btn) {
    // 向上寻找包含多个按钮的容器
    let cur = btn.parentElement;
    for (let i = 0; i < 4 && cur; i++) {
      // 检查当前容器内的按钮或具有可点击行为的子元素数量
      const btns = cur.querySelectorAll('button, div[role="button"], svg');
      if (btns.length >= 2 && btns.length <= 15) {
        // 判断样式是否是水平排列的工具栏
        const display = window.getComputedStyle(cur).display;
        if (display.includes('flex') || display.includes('grid') || cur.children.length >= 2) {
          return cur;
        }
      }
      cur = cur.parentElement;
    }
    return btn.parentElement;
  }

  function getContentFromActionBar(bar) {
    // 1. 优先在祖先消息卡片中查找包含实际内容的容器
    const card = bar.closest('[class*="message"], [class*="chat-item"], article, .ds-message, [data-message-author-role]')
      || bar.parentElement?.parentElement;
    if (!card) return bar.parentElement;

    // 2. 寻找 card 内部包含 markdown/prose/文本 的节点
    const content = card.querySelector('.ds-markdown, [class*="markdown"], [class*="prose"], [class*="content"], [class*="segment"]');
    return content || card;
  }

  function scanAndMount() {
    // 1. 特征一：找页面所有带 svg 图标的常用操作按钮（复制、重新生成、点赞、点踩、分享）
    // DeepSeek 的操作按钮通常包含 ds-icon-button 或内嵌特定 path 的 svg
    const candidateButtons = Array.from(document.querySelectorAll(
      'button, div[role="button"], [class*="icon-button"], [class*="action-button"]'
    )).filter(el => {
      // 排除扩展自身的元素
      if (el.closest('.dswa-root') || el.closest('.dswa-export-widget')) return false;
      // 包含复制/分享/重试等文案或提示
      const text = (el.getAttribute('title') || el.getAttribute('aria-label') || el.textContent || '').trim();
      if (/复制|分享|点赞|点踩|重新生成|copy|share|like|regenerate/i.test(text)) return true;
      // 或者包含 svg 图标且尺寸较小（典型的消息底部按钮）
      const svg = el.querySelector('svg');
      if (svg && el.offsetWidth > 0 && el.offsetWidth < 48 && el.offsetHeight < 48) {
        // 且它不是顶部的导航按钮
        if (!el.closest('header') && !el.closest('nav')) return true;
      }
      return false;
    });

    candidateButtons.forEach(btn => {
      const bar = findActionBarFromButton(btn);
      if (!bar || bar.hasAttribute(ATTR_PROCESSED) || !bar.isConnected) return;
      if (bar.closest('.dswa-root') || bar.closest('.dswa-export-widget')) return;

      // 标记防止重复挂载
      bar.setAttribute(ATTR_PROCESSED, 'true');
      
      const widget = DSWA.exporter.createExportWidget(() => getContentFromActionBar(bar));
      bar.appendChild(widget);
    });

    // 2. 特征二：已知类名的操作栏直接定位
    const knownBarSelectors = [
      '.ds-message-actions',
      'div[class*="messageActions"]',
      'div[class*="actions-container"]',
      'div[class*="actionGroup"]',
      'div[class*="operationBar"]',
      'div[class*="message-actions"]',
      'message-actions'
    ];

    document.querySelectorAll(knownBarSelectors.join(',')).forEach(bar => {
      if (bar.hasAttribute(ATTR_PROCESSED) || !bar.isConnected) return;
      if (bar.closest('.dswa-root') || bar.closest('.dswa-export-widget')) return;

      bar.setAttribute(ATTR_PROCESSED, 'true');
      const widget = DSWA.exporter.createExportWidget(() => getContentFromActionBar(bar));
      bar.appendChild(widget);
    });
  }

  let observer = null;
  let timer = null;

  function init() {
    scanAndMount();

    // 周期扫描（兜底单页应用与流式输出）
    setInterval(scanAndMount, 1500);

    // MutationObserver 监听实时渲染
    observer = new MutationObserver(() => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        scanAndMount();
      }, 200);
    });

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  return { init, scanAndMount };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', DSWA.messageObserver.init);
} else {
  DSWA.messageObserver.init();
}

}
