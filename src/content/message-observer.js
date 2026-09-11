// 页面消息操作栏监听与导出按钮挂载器
// 精准挂载在 DeepSeek 等 AI 平台消息操作栏（复制、重新生成、点赞、点踩、分享）的末尾
globalThis.DSWA = globalThis.DSWA || {};

if (!DSWA._messageObserverLoaded) {
DSWA._messageObserverLoaded = true;

DSWA.messageObserver = (() => {
  const ATTR_MOUNTED = 'data-dswa-mounted';

  // 提取完整的回答正文内容（关键修复：抓取正文区域的所有文本段落，绝不遗漏）
  function extractContent(bar) {
    // 1. 寻找该工具栏上方的整个内容区域
    // 在 DeepSeek 中，工具栏通常与正文同级或紧随正文容器其后
    let parent = bar.parentElement;
    let mainContainer = null;

    // 向上查找包含全部正文的回答卡片容器（通常为包含很多子元素的祖先容器）
    for (let i = 0; i < 5 && parent; i++) {
      if (parent.querySelectorAll('.ds-markdown, [class*="markdown"]').length > 0) {
        mainContainer = parent;
        break;
      }
      parent = parent.parentElement;
    }

    if (!mainContainer) {
      mainContainer = bar.closest('[class*="message"], article') || bar.parentElement;
    }

    // 2. 获取该容器内部所有的 markdown 渲染块
    const allMds = Array.from(mainContainer.querySelectorAll('.ds-markdown, [class*="markdown"]'))
      .filter(el => !el.closest('.dswa-root') && !el.closest('.dswa-export-widget'));

    // 3. 过滤掉思考链：DeepSeek 的思考过程往往在特定的思考组件中
    const contentMds = allMds.filter(el => {
      // 如果是在可折叠的思考块内部
      if (el.closest('[class*="think"], [class*="thought"], [class*="reasoning"]')) {
        return false;
      }
      return true;
    });

    // 4. 如果找到了正文 markdown 块
    if (contentMds.length > 0) {
      // 如果正文被拆分成了多个同级块，创建一个虚拟容器把它们全部包容起来
      if (contentMds.length === 1) {
        return contentMds[0];
      }
      const fragment = document.createElement('div');
      contentMds.forEach(node => {
        fragment.appendChild(node.cloneNode(true));
      });
      return fragment;
    }

    // 兜底：取非工具栏的前驱兄弟节点
    let prev = bar.previousElementSibling;
    while (prev) {
      if (!prev.classList.contains('dswa-export-widget') && prev.textContent.trim().length > 20) {
        return prev;
      }
      prev = prev.previousElementSibling;
    }

    return mainContainer;
  }

  function scanAndMount() {
    // 唯一精准锚定：通过「分享」图标唯一的 SVG Path 寻找真正的工具栏！
    // 彻底摒弃宽泛选择器，避免出现右侧多余的第二个按钮
    const sharePaths = document.querySelectorAll('path[d*="M7.95889 1.52285"], path[d*="M7.95889"]');
    
    sharePaths.forEach(path => {
      const svg = path.closest('svg');
      if (!svg) return;

      // 向上找到具有按钮角色的元素（在 DeepSeek 中为 .ds-button 或 role="button"）
      const btn = svg.closest('.ds-button, [role="button"], button') || svg.parentElement;
      // 真正的操作栏即该按钮的直接父容器
      const bar = btn?.parentElement;
      if (!bar) return;

      // 排除非消息区域
      if (bar.closest('aside, nav, header, footer, form, [class*="chat-input"], .dswa-root')) return;

      // 如果这个操作栏已经挂载过，绝不重复挂载
      if (bar.hasAttribute(ATTR_MOUNTED) || bar.querySelector('.dswa-export-widget')) return;

      // 标记当前操作栏已处理
      bar.setAttribute(ATTR_MOUNTED, 'true');

      // 创建完全仿照 DeepSeek 原生图标按钮风格的导出小胶囊
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
