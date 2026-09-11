// 页面消息操作栏监听与导出按钮挂载器
// 精准定位 DeepSeek 等 AI 平台每个回答卡片唯一的操作栏末尾
globalThis.DSWA = globalThis.DSWA || {};

if (!DSWA._messageObserverLoaded) {
DSWA._messageObserverLoaded = true;

DSWA.messageObserver = (() => {
  const ATTR_PROCESSED = 'data-dswa-export-mounted';

  // 严格过滤：必须是消息正文内部或紧随其后的操作栏，坚决排除侧边栏、输入框内部、用户头像栏等
  function isBlacklisted(el) {
    if (!el) return true;
    // 排除侧边栏 (侧边栏会话列表、左下角个人信息)
    if (el.closest('aside, nav, header, footer, [class*="sidebar"], [class*="menu"], [class*="history"]')) {
      return true;
    }
    // 排除输入框区域及输入框底部工具栏（深度思考、网络搜索、发送按钮那一排）
    if (el.closest('form, [class*="input"], [class*="prompt"], [class*="chat-input"], [class*="composer"]')) {
      return true;
    }
    // 排除插件自身
    if (el.closest('.dswa-root, .dswa-export-widget')) {
      return true;
    }
    return false;
  }

  // 检查是否是正规的消息操作栏（必须包含复制/重试/点赞等专属动作，并且其上方存在 markdown 消息主体）
  function findValidMessageActionBar(candidate) {
    if (isBlacklisted(candidate)) return null;

    // 检查此容器或其直接子树中是否包含复制或重新生成操作
    const hasMsgAction = candidate.querySelector(
      'button[title*="复制"], button[aria-label*="复制"], button[title*="重新生成"], button[aria-label*="重新生成"], [class*="ds-icon-button"]'
    ) || (candidate.children.length >= 3 && candidate.querySelector('svg'));

    if (!hasMsgAction) return null;

    // 向上找到对应的消息容器卡片
    const msgCard = candidate.closest('[class*="message"], [class*="chat-item"], article, .ds-message, [data-message-author-role="assistant"]');
    // 如果找不到上层的消息卡片，说明不是对话消息区
    if (!msgCard || isBlacklisted(msgCard)) return null;

    // 必须能找到正文容器（如 markdown、prose、content）
    const content = msgCard.querySelector('.ds-markdown, [class*="markdown"], [class*="prose"], [class*="content"]');
    if (!content) return null;

    return {
      bar: candidate,
      getContent: () => content
    };
  }

  function scanAndMount() {
    // 1. 查找所有可能的消息块
    // DeepSeek 结构中，回答操作栏一般为包含多个小图标的 flex 容器
    const potentialBars = document.querySelectorAll(
      'div[class*="actions"], div[class*="operate"], div[class*="tools"], div[class*="toolbar"], [class*="ds-message-actions"]'
    );

    potentialBars.forEach(bar => {
      // 避免重复注入同一个容器
      if (bar.hasAttribute(ATTR_PROCESSED) || bar.querySelector('.dswa-export-widget')) return;

      const valid = findValidMessageActionBar(bar);
      if (valid) {
        // 再次确认该消息卡片内是否已经挂载过了导出按钮（防止双分页 1/2 时两个 bar 导致重复）
        const msgCard = bar.closest('[class*="message"], article, .ds-message');
        if (msgCard && msgCard.querySelector('.dswa-export-widget')) {
          return;
        }

        valid.bar.setAttribute(ATTR_PROCESSED, 'true');
        const widget = DSWA.exporter.createExportWidget(valid.getContent);
        // 挂载到操作栏的最右侧（末尾）
        valid.bar.appendChild(widget);
      }
    });

    // 2. 备用准确定位：直接找「分享」或「点踩」按钮的父容器（DeepSeek 紧随其后）
    const shareOrDislikeButtons = document.querySelectorAll('button, div[role="button"]');
    shareOrDislikeButtons.forEach(btn => {
      if (isBlacklisted(btn)) return;

      const title = (btn.getAttribute('title') || btn.getAttribute('aria-label') || '').trim();
      // 匹配点踩、分享或 copy
      const isTarget = /分享|点踩|dislike|share/i.test(title);
      if (isTarget) {
        const bar = btn.parentElement;
        if (!bar || isBlacklisted(bar)) return;
        if (bar.hasAttribute(ATTR_PROCESSED) || bar.querySelector('.dswa-export-widget')) return;

        const msgCard = bar.closest('[class*="message"], article, .ds-message');
        if (!msgCard || msgCard.querySelector('.dswa-export-widget')) return;

        const content = msgCard.querySelector('.ds-markdown, [class*="markdown"], [class*="prose"]') || msgCard;
        
        bar.setAttribute(ATTR_PROCESSED, 'true');
        const widget = DSWA.exporter.createExportWidget(() => content);
        bar.appendChild(widget);
      }
    });
  }

  let observer = null;
  let timer = null;

  function init() {
    scanAndMount();

    // 周期扫描
    setInterval(scanAndMount, 1500);

    // MutationObserver 监听
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
