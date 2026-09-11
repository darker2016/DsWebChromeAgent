// 页面消息操作栏监听与导出按钮挂载器
// 精准挂载在 DeepSeek 等 AI 平台消息操作栏（复制、重新生成、点赞、点踩、分享）的末尾
globalThis.DSWA = globalThis.DSWA || {};

if (!DSWA._messageObserverLoaded) {
DSWA._messageObserverLoaded = true;

DSWA.messageObserver = (() => {
  const ATTR_MOUNTED = 'data-dswa-mounted';

  // 提取消息主力正文
  function extractContent(bar) {
    // 向上查找消息主卡片
    let card = bar.closest('.ds-markdown, [class*="message"], [class*="chat-item"], article') 
      || bar.parentElement?.parentElement;
    if (!card) return bar.parentElement;

    // 寻找其中的所有 markdown 节点
    const mds = Array.from(card.querySelectorAll('.ds-markdown, [class*="markdown"], [class*="prose"]'))
      .filter(el => !el.closest('.dswa-root') && !el.closest('.dswa-export-widget'));

    if (!mds.length) return card;
    if (mds.length === 1) return mds[0];

    // 排除思考过程节点，取正式输出正文
    const main = mds.filter(el => {
      const cls = el.className || '';
      return !cls.includes('think') && !cls.includes('thought') && !el.closest('[class*="think"], [class*="thought"]');
    }).pop();

    return main || mds[mds.length - 1];
  }

  function scanAndMount() {
    // 关键特征 1：直接通过真实 DOM 类名精准定位操作栏！
    // DeepSeek 的操作栏特征：包含 ds-flex，子元素由多个带 ds-button 且含 svg 的按钮组成
    const actionBars = Array.from(document.querySelectorAll(
      '.ds-flex, [class*="actions"], [class*="actionGroup"], [class*="operationBar"], message-actions'
    )).filter(el => {
      // 排除扩展自身
      if (el.closest('.dswa-root') || el.closest('.dswa-export-widget')) return false;
      // 排除侧边栏、历史会话列表、导航栏
      if (el.closest('aside, nav, header, [class*="sidebar"], [class*="history"]')) return false;
      // 排除输入框底部工具栏（包含网络搜索、深度思考开关的区域）
      if (el.closest('form, [class*="chat-input"], [class*="composer"]')) return false;

      // 验证子元素：必须包含 3 个以上的操作按钮或 SVG 图标（复制、重试、点赞、点踩、分享）
      const buttons = el.querySelectorAll('.ds-button, button, div[role="button"]');
      if (buttons.length >= 3 && el.querySelector('svg')) {
        // 且这些按钮尺寸是小图标（xs 尺寸）
        return true;
      }
      return false;
    });

    actionBars.forEach(bar => {
      if (bar.hasAttribute(ATTR_MOUNTED) || bar.querySelector('.dswa-export-widget')) return;

      // 标记已挂载
      bar.setAttribute(ATTR_MOUNTED, 'true');

      const widget = DSWA.exporter.createExportWidget(() => extractContent(bar));
      bar.appendChild(widget);
    });

    // 关键特征 2：通过「分享」图标的精确 SVG Path 查找操作栏！
    // 无论类名如何动态混淆，分享图标的 SVG path 形状是独一无二且固定的
    const sharePaths = document.querySelectorAll('path[d*="M7.95889 1.52285"], path[d*="M7.95889"]');
    sharePaths.forEach(path => {
      const svg = path.closest('svg');
      if (!svg) return;
      // 向上找到按钮和工具栏容器
      const btn = svg.closest('.ds-button, button, div[role="button"]') || svg.parentElement;
      const bar = btn?.parentElement;
      if (!bar || bar.hasAttribute(ATTR_MOUNTED) || bar.querySelector('.dswa-export-widget')) return;
      if (bar.closest('aside, nav, header, form, .dswa-root')) return;

      bar.setAttribute(ATTR_MOUNTED, 'true');
      const widget = DSWA.exporter.createExportWidget(() => extractContent(bar));
      bar.appendChild(widget);
    });
  }

  let observer = null;
  let timer = null;

  function init() {
    scanAndMount();
    setInterval(scanAndMount, 800);

    observer = new MutationObserver(() => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        scanAndMount();
      }, 100);
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
