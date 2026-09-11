// 页面消息操作栏监听与导出按钮挂载器
// 精准定位 DeepSeek 等 AI 平台每个回答卡片唯一的操作栏末尾，并精确提取完整正文
globalThis.DSWA = globalThis.DSWA || {};

if (!DSWA._messageObserverLoaded) {
DSWA._messageObserverLoaded = true;

DSWA.messageObserver = (() => {
  const ATTR_PROCESSED = 'data-dswa-export-mounted';

  function isBlacklisted(el) {
    if (!el) return true;
    if (el.closest('aside, nav, header, footer, [class*="sidebar"], [class*="menu"], [class*="history"]')) return true;
    if (el.closest('form, [class*="input"], [class*="prompt"], [class*="chat-input"], [class*="composer"]')) return true;
    if (el.closest('.dswa-root, .dswa-export-widget')) return true;
    return false;
  }

  // 获取 DeepSeek / Kimi / ChatGPT / 豆包 的完整消息内容块
  // 关键：不能只取 .ds-markdown（因为思维链、搜索折叠块、正文块是并列的多个 .ds-markdown）
  function extractFullMessageElement(bar) {
    // 1. 找到该操作栏所属的消息外层卡片 (Message Wrapper)
    // 在 DeepSeek 中，消息结构通常形如：
    // <div class="... message-wrapper ...">
    //    <div>... [思考链折叠框 / 搜索结果] ...</div>
    //    <div class="ds-markdown ...">... [最终正文] ...</div>
    //    <div class="ds-message-actions">... [操作栏] ...</div>
    // </div>
    
    // 向上寻找包含了操作栏的上级消息主容器
    let card = bar.closest('[class*="message"], [class*="chat-item"], article, .ds-message');
    if (!card) {
      // 找不到就取直接前驱兄弟容器
      card = bar.parentElement;
    }

    if (!card) return null;

    // 2. 如果卡片内有多个正文块（例如：思考链 + 搜索结果 + 正文），或者分页卡片（1/2）：
    // 我们必须取当前操作栏紧邻的或者当前处于激活可见状态的正文块！
    
    // 在该操作栏之前寻找最后一个可见的正文内容容器
    const allContents = Array.from(card.querySelectorAll('.ds-markdown, [class*="markdown"], [class*="prose"], [class*="content"]'))
      .filter(el => {
        // 排除深度思考折叠过程中的草稿块，优先保留实际可见的输出
        return !el.closest('.dswa-root') && !el.closest('.dswa-export-widget');
      });

    if (!allContents.length) {
      return card;
    }

    // 检查是否有处于分页可见态的块
    // 如果有多个，优先取非思考链的正式回答块（通常是最后一个或者最大的一个）
    if (allContents.length === 1) {
      return allContents[0];
    }

    // 优先取操作栏上方的那个主力 markdown（排除思考过程）
    const mainContent = allContents.filter(el => {
      const cls = el.className || '';
      return !cls.includes('think') && !cls.includes('thought') && !el.closest('[class*="think"], [class*="thought"]');
    }).pop();

    return mainContent || allContents[allContents.length - 1];
  }

  function findValidMessageActionBar(candidate) {
    if (isBlacklisted(candidate)) return null;

    // 包含操作按钮（复制/重试/点赞/分享等）
    const hasMsgAction = candidate.querySelector(
      'button[title*="复制"], button[aria-label*="复制"], button[title*="重新生成"], button[aria-label*="重新生成"], [class*="ds-icon-button"]'
    ) || (candidate.children.length >= 3 && candidate.querySelector('svg'));

    if (!hasMsgAction) return null;

    // 排除含有输入框的容器
    if (candidate.querySelector('textarea, input, [contenteditable="true"]')) return null;

    return {
      bar: candidate,
      getContent: () => extractFullMessageElement(candidate)
    };
  }

  function scanAndMount() {
    const potentialBars = document.querySelectorAll(
      'div[class*="actions"], div[class*="operate"], div[class*="tools"], div[class*="toolbar"], [class*="ds-message-actions"]'
    );

    potentialBars.forEach(bar => {
      if (bar.hasAttribute(ATTR_PROCESSED) || bar.querySelector('.dswa-export-widget')) return;

      const valid = findValidMessageActionBar(bar);
      if (valid) {
        // 确保同一个消息卡片内部只有一个导出按钮
        const msgCard = bar.closest('[class*="message"], article, .ds-message') || bar.parentElement;
        if (msgCard && msgCard.querySelector('.dswa-export-widget')) {
          return;
        }

        valid.bar.setAttribute(ATTR_PROCESSED, 'true');
        const widget = DSWA.exporter.createExportWidget(valid.getContent);
        valid.bar.appendChild(widget);
      }
    });
  }

  let observer = null;
  let timer = null;

  function init() {
    scanAndMount();
    setInterval(scanAndMount, 1200);

    observer = new MutationObserver(() => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        scanAndMount();
      }, 150);
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
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
