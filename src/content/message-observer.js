// 页面消息操作栏监听与导出按钮挂载器
// 适配 DeepSeek、Kimi、豆包、ChatGPT、Gemini 等各大平台的消息工具栏
globalThis.DSWA = globalThis.DSWA || {};

if (!DSWA._messageObserverLoaded) {
DSWA._messageObserverLoaded = true;

DSWA.messageObserver = (() => {
  const ATTR_PROCESSED = 'data-dswa-export-mounted';

  // 针对各站点的选择器配置
  // actionSelectors: 消息底部的操作按钮容器（如包含复制、分享、点赞的那一行）
  // contentFinder: 如何从该操作栏向上或向内找到消息的正文内容容器
  const SITE_RULES = [
    {
      id: 'deepseek',
      matches: ['chat.deepseek.com'],
      // DeepSeek 操作栏特征：带有多个操作按钮的弹性布局底栏
      actionSelectors: [
        '.ds-message-actions',
        'div[class*="messageActions"]',
        'div[class*="actions-container"]',
        // 兼容通用模式：找复制图标按钮的父容器
        '.ds-icon-button'
      ],
      findActionBar(root) {
        // DeepSeek 底部通常有一组图标按钮
        return root.querySelector('.ds-message-actions, div[class*="messageActions"], div[class*="actions"]');
      },
      getContent(actionEl) {
        // 寻找父级消息气泡或上一级消息文本块
        const msgWrapper = actionEl.closest('.ds-markdown, div[class*="messageContent"], div[class*="chat-message"]')
          || actionEl.parentElement?.closest('div[class*="message"]')
          || actionEl.closest('.ds-message')
          || actionEl.parentElement;
        if (!msgWrapper) return null;
        // 优先取 markdown 渲染容器
        return msgWrapper.querySelector('.ds-markdown, [class*="markdown"], .prose') || msgWrapper;
      }
    },
    {
      id: 'kimi',
      matches: ['kimi.com', 'kimi.moonshot.cn'],
      findActionBar(root) {
        return root.querySelector('div[class*="operationBar"], div[class*="actionGroup"], div[class*="toolBar"]');
      },
      getContent(actionEl) {
        const parent = actionEl.closest('div[class*="messageItem"], div[class*="chatItem"]');
        return parent ? (parent.querySelector('div[class*="segment"], div[class*="markdown"]') || parent) : actionEl.parentElement;
      }
    },
    {
      id: 'doubao',
      matches: ['doubao.com'],
      findActionBar(root) {
        return root.querySelector('div[class*="message-actions"], div[class*="action-bar"]');
      },
      getContent(actionEl) {
        const parent = actionEl.closest('div[class*="message-block"], div[class*="container"]');
        return parent ? (parent.querySelector('div[class*="markdown"], div[class*="content"]') || parent) : actionEl.parentElement;
      }
    },
    {
      id: 'chatgpt',
      matches: ['chatgpt.com', 'chat.openai.com'],
      findActionBar(root) {
        return root.querySelector('div[class*="text-gray-400"][class*="flex"], div[class*="agent-turn"] div[class*="justify-start"]');
      },
      getContent(actionEl) {
        const turn = actionEl.closest('[data-message-author-role="assistant"]') || actionEl.closest('article');
        return turn ? (turn.querySelector('.markdown') || turn) : actionEl.parentElement;
      }
    },
    {
      id: 'gemini',
      matches: ['gemini.google.com'],
      findActionBar(root) {
        return root.querySelector('message-actions, div[class*="actions-container"]');
      },
      getContent(actionEl) {
        const host = actionEl.closest('model-response') || actionEl.closest('div[class*="response-container"]');
        return host ? (host.querySelector('message-content, .markdown') || host) : actionEl.parentElement;
      }
    {
      id: 'tongyi',
      matches: ['tongyi.aliyun.com', 'qianwen.aliyun.com'],
      findActionBar(root) {
        return root.querySelector('div[class*="actions"], div[class*="tools"], div[class*="operate"]');
      },
      getContent(actionEl) {
        const parent = actionEl.closest('div[class*="item"], div[class*="message"]');
        return parent ? (parent.querySelector('div[class*="content"], div[class*="markdown"]') || parent) : actionEl.parentElement;
      }
    },
    {
      id: 'chatglm',
      matches: ['chatglm.cn'],
      findActionBar(root) {
        return root.querySelector('div[class*="actions"], div[class*="tools"]');
      },
      getContent(actionEl) {
        const parent = actionEl.closest('div[class*="message"]');
        return parent ? (parent.querySelector('div[class*="content"], div[class*="markdown"]') || parent) : actionEl.parentElement;
      }
    },
    {
      id: 'yuanbao',
      matches: ['yuanbao.tencent.com'],
      findActionBar(root) {
        return root.querySelector('div[class*="action"], div[class*="footer"]');
      },
      getContent(actionEl) {
        const parent = actionEl.closest('div[class*="message"], div[class*="chat-item"]');
        return parent ? (parent.querySelector('div[class*="content"], div[class*="markdown"]') || parent) : actionEl.parentElement;
      }
    },
    {
      id: 'yiyan',
      matches: ['yiyan.baidu.com'],
      findActionBar(root) {
        return root.querySelector('div[class*="tools"], div[class*="actions"]');
      },
      getContent(actionEl) {
        const parent = actionEl.closest('div[class*="message"], div[class*="item"]');
        return parent ? (parent.querySelector('div[class*="content"], div[class*="markdown"]') || parent) : actionEl.parentElement;
      }
    }
  ];

  function getRule() {
    const host = location.hostname.toLowerCase();
    for (const rule of SITE_RULES) {
      for (const m of rule.matches) {
        if (host === m || host.endsWith('.' + m)) return rule;
      }
    }
    return null;
  }

  // 通用备用方案：扫描页面上所有的复制/分享操作条
  function findGenericActionBars() {
    const bars = [];
    // 很多站点复制按钮都带 title="复制" 或 svg
    const buttons = document.querySelectorAll('button[title*="复制"], button[aria-label*="复制"], button[title*="Copy"], button[aria-label*="Copy"]');
    buttons.forEach(btn => {
      const bar = btn.parentElement;
      if (bar && !bar.hasAttribute(ATTR_PROCESSED) && bar.children.length >= 2) {
        bars.push({
          bar,
          getContent: () => {
            const card = bar.closest('[class*="message"], article, [class*="chat-item"]') || bar.parentElement;
            return card ? (card.querySelector('[class*="markdown"], .prose, pre') || card) : card;
          }
        });
      }
    });
    return bars;
  }

  function scanAndMount() {
    const rule = getRule();
    if (rule) {
      // 专用规则扫描
      const candidates = document.querySelectorAll(rule.actionSelectors ? rule.actionSelectors.join(',') : 'div');
      candidates.forEach(el => {
        const bar = rule.findActionBar ? rule.findActionBar(el) || el : el;
        if (!bar || bar.hasAttribute(ATTR_PROCESSED) || !bar.isConnected) return;
        
        // 确保这是一个操作条（包含多个子元素按钮）
        if (bar.children.length < 2 && !bar.querySelector('button, svg')) return;

        bar.setAttribute(ATTR_PROCESSED, 'true');
        const widget = DSWA.exporter.createExportWidget(() => rule.getContent(bar));
        bar.appendChild(widget);
      });
    }

    // 兜底扫描
    const genericList = findGenericActionBars();
    genericList.forEach(({ bar, getContent }) => {
      if (bar.hasAttribute(ATTR_PROCESSED)) return;
      bar.setAttribute(ATTR_PROCESSED, 'true');
      const widget = DSWA.exporter.createExportWidget(getContent);
      bar.appendChild(widget);
    });
  }

  let observer = null;
  let timer = null;

  function init() {
    // 初始扫描
    scanAndMount();

    // 监听动态新增的消息 DOM
    observer = new MutationObserver(() => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        scanAndMount();
      }, 300);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  return { init, scanAndMount };
})();

// DOM 就绪后启动监听
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', DSWA.messageObserver.init);
} else {
  DSWA.messageObserver.init();
}

}
