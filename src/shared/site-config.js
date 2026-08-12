// 站点注册表：AI 对话站点 → 输入框定位配置。
// content / popup / background 共用。修改站点需同步更新 manifest.content_scripts.matches 与 docs/site-adapters.md。
//
// kind：
//   textarea        —— 输入框是 <textarea>，走原生 value setter + input 事件
//   contenteditable —— 输入框是 contenteditable（如 ChatGPT），走 Selection + execCommand('insertText')
//   any             —— 通用：两者都尝试
// selectors：从上到下依次尝试，首个可用即用。
globalThis.DSWA = globalThis.DSWA || {};

DSWA.SITES = [
  {
    id: 'deepseek', name: 'Deepseek',
    hostPatterns: ['chat.deepseek.com'],
    kind: 'textarea',
    selectors: ['#chat-input', 'textarea.ds-input', 'textarea[placeholder]', 'textarea'],
  },
  {
    id: 'kimi', name: 'Kimi',
    hostPatterns: ['kimi.moonshot.cn'],
    kind: 'textarea',
    selectors: ['textarea', '[contenteditable="true"]'],
  },
  {
    id: 'doubao', name: '豆包',
    hostPatterns: ['doubao.com'],
    kind: 'textarea',
    selectors: ['textarea', '[contenteditable="true"]'],
  },
  {
    id: 'chatgpt', name: 'ChatGPT',
    hostPatterns: ['chatgpt.com'],
    kind: 'contenteditable',
    selectors: ['#prompt-textarea', '[contenteditable="true"][role="textbox"]'],
  },
  // 其他国内大厂（best-effort，通用 textarea/富文本检测，需真机验证后登记到 docs/site-adapters.md）
  {
    id: 'tongyi', name: '通义千问',
    hostPatterns: ['tongyi.aliyun.com', 'qianwen.aliyun.com'],
    kind: 'textarea',
    selectors: ['textarea', '[contenteditable="true"]'],
  },
  {
    id: 'chatglm', name: '智谱清言',
    hostPatterns: ['chatglm.cn'],
    kind: 'textarea',
    selectors: ['textarea', '[contenteditable="true"]'],
  },
  {
    id: 'yuanbao', name: '腾讯元宝',
    hostPatterns: ['yuanbao.tencent.com'],
    kind: 'textarea',
    selectors: ['textarea', '[contenteditable="true"]'],
  },
  {
    id: 'yiyan', name: '文心一言',
    hostPatterns: ['yiyan.baidu.com'],
    kind: 'textarea',
    selectors: ['textarea', '[contenteditable="true"]'],
  },
  {
    id: 'generic', name: '通用',
    hostPatterns: [],
    kind: 'any',
    selectors: ['textarea', '[contenteditable="true"][role="textbox"]'],
  },
];

DSWA.siteConfig = {
  // 按 hostname 匹配站点；未命中返回 generic
  matchHost(hostname) {
    const h = (hostname || '').toLowerCase().replace(/^www\./, '');
    for (const site of DSWA.SITES) {
      if (site.id === 'generic') continue;
      for (const pattern of site.hostPatterns) {
        if (h === pattern || h.endsWith('.' + pattern)) return site;
      }
    }
    return DSWA.SITES.find(s => s.id === 'generic');
  },
};
