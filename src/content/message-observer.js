// 页面消息操作栏监听与导出按钮挂载器
// 精准挂载在「分享」图标按钮之后，保证 100% 可靠出现
globalThis.DSWA = globalThis.DSWA || {};

if (!DSWA._messageObserverLoaded) {
DSWA._messageObserverLoaded = true;

DSWA.messageObserver = (() => {
  const ATTR_MOUNTED = 'data-dswa-mounted';

  // 提取消息正文：从操作栏或操作按钮向上查找到回答卡片，提取全部回答正文
  function extractContent(btnOrBar) {
    const card = btnOrBar.closest('[class*="message"], [class*="chat-item"], article, .ds-message') 
      || btnOrBar.parentElement?.parentElement?.parentElement;
    if (!card) return btnOrBar.parentElement;

    // 寻找卡片内的 markdown 容器
    const mds = Array.from(card.querySelectorAll('.ds-markdown, [class*="markdown"], [class*="prose"]'))
      .filter(el => !el.closest('.dswa-root') && !el.closest('.dswa-export-widget'));

    if (!mds.length) return card;
    if (mds.length === 1) return mds[0];

    // 如果有多个（如包含思考过程），提取非思考链的正式回答内容
    const main = mds.filter(el => {
      const text = el.className || '';
      return !text.includes('think') && !text.includes('thought') && !el.closest('[class*="think"], [class*="thought"]');
    }).pop();

    return main || mds[mds.length - 1];
  }

  // 挂载核心逻辑
  function scanAndMount() {
    // 策略：DeepSeek 消息底部有一排按钮：复制、重新生成、点赞、点踩、分享
    // 我们直接寻找这排按钮中的最后一个（即「分享」按钮），把 [📄 导出] 紧跟插在它后面！
    
    // 找到页面上所有的按钮或具有点击角色的图标
    const allButtons = Array.from(document.querySelectorAll('button, div[role="button"], .ds-icon-button'));

    allButtons.forEach(btn => {
      // 排除侧边栏、顶部导航和输入框区域
      if (btn.closest('aside, nav, header, footer, form, [class*="sidebar"], .dswa-root, .dswa-export-widget')) {
        return;
      }

      // 获取按钮文案或提示
      const label = (btn.getAttribute('title') || btn.getAttribute('aria-label') || btn.textContent || '').trim();
      
      // 判断是不是分享按钮（或点踩按钮作为备选）
      const isShare = /分享|share/i.test(label);
      const isDislike = /点踩|dislike|差评/i.test(label);

      // 如果既没有 label，但处于消息操作栏中并且是紧邻点赞点踩后面的图标
      let isTargetAction = isShare || isDislike;
      
      if (!isTargetAction) {
        // 通过 svg 特征检测：消息底部的操作按钮
        const svg = btn.querySelector('svg');
        if (svg && btn.offsetWidth > 10 && btn.offsetWidth < 44 && btn.offsetHeight < 44) {
          const parent = btn.parentElement;
          if (parent && parent.children.length >= 3 && !parent.hasAttribute(ATTR_MOUNTED)) {
            // 这是一个由多个小图标组成的工具栏，取其最后一个子元素
            if (btn === parent.lastElementChild || btn === parent.children[parent.children.length - 1]) {
              isTargetAction = true;
            }
          }
        }
      }

      if (isTargetAction) {
        const parent = btn.parentElement;
        if (!parent || parent.hasAttribute(ATTR_MOUNTED) || parent.querySelector('.dswa-export-widget')) {
          return;
        }

        // 确保上层属于消息卡片，而不是会话列表
        const card = btn.closest('[class*="message"], [class*="chat-item"], article, .ds-message');
        if (!card || card.querySelector('.dswa-export-widget')) {
          return;
        }

        // 标记已挂载
        parent.setAttribute(ATTR_MOUNTED, 'true');

        const widget = DSWA.exporter.createExportWidget(() => extractContent(btn));
        
        // 插入到操作栏的末尾（分享右侧）
        parent.appendChild(widget);
      }
    });

    // 备用机制：扫描所有显式类名操作栏
    document.querySelectorAll('.ds-message-actions, div[class*="messageActions"]').forEach(bar => {
      if (bar.hasAttribute(ATTR_MOUNTED) || bar.querySelector('.dswa-export-widget')) return;
      const card = bar.closest('[class*="message"], article, .ds-message');
      if (card && card.querySelector('.dswa-export-widget')) return;

      bar.setAttribute(ATTR_MOUNTED, 'true');
      const widget = DSWA.exporter.createExportWidget(() => extractContent(bar));
      bar.appendChild(widget);
    });
  }

  let observer = null;
  let timer = null;

  function init() {
    scanAndMount();

    // 持续周期检查（每 800ms 执行一次，确保流式回答完毕或翻页后立刻出现）
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
