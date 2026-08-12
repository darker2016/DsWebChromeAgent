// Service Worker。
// 1) 技能数据层（兜底）：content script 直读失败时，响应 DSWA_GET_INDEX / DSWA_GET_SKILL_TEXT。
// 2) 站点唤醒：响应 DSWA_ENABLE_SITE，为任意 host 注入内容脚本并持久化注册（下次访问自动注入）。
const INDEX_PATH = 'skills/index.json';

const CONTENT_CSS = ['src/content/content.css'];
const CONTENT_JS = [
  'src/shared/constants.js',
  'src/shared/site-config.js',
  'src/shared/user-skills.js',
  'src/shared/skill-index.js',
  'src/content/site-adapter.js',
  'src/content/skill-picker.js',
];

let indexCache = null;

async function fetchIndex() {
  if (indexCache) return indexCache;
  const res = await fetch(chrome.runtime.getURL(INDEX_PATH));
  if (!res.ok) throw new Error('索引 HTTP ' + res.status);
  indexCache = await res.json();
  return indexCache;
}

// 为指定 host 注册持久化内容脚本（registerContentScripts 会跨会话保留）
async function registerHost(host) {
  const id = 'dswa-' + host.replace(/[^a-z0-9-]/gi, '-');
  const matches = [`https://${host}/*`, `https://*.${host}/*`];
  try {
    await chrome.scripting.registerContentScripts([
      { id, matches, css: CONTENT_CSS, js: CONTENT_JS, runAt: 'document_idle' },
    ]);
  } catch (e) {
    // 已注册过（重复 id）视为成功
    console.warn('[DSWA] registerContentScripts 跳过：', e.message);
  }
}

async function savedSites() {
  const data = await chrome.storage.local.get('dswa:sites');
  return data['dswa:sites'] || [];
}

async function enableSite(host, tabId) {
  const sites = await savedSites();
  if (!sites.includes(host)) {
    sites.push(host);
    await chrome.storage.local.set({ 'dswa:sites': sites });
  }
  await registerHost(host);
  if (tabId) {
    // 立即在当前 tab 注入
    await chrome.scripting.executeScript({ target: { tabId }, files: CONTENT_JS });
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  for (const host of await savedSites()) await registerHost(host);
});

chrome.runtime.onStartup.addListener(async () => {
  for (const host of await savedSites()) await registerHost(host);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg.type !== 'string') return false;

  if (msg.type === 'DSWA_GET_INDEX') {
    fetchIndex()
      .then(index => sendResponse({ ok: true, index }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // 异步响应
  }

  if (msg.type === 'DSWA_GET_SKILL_TEXT') {
    // msg.path 相对 skills/，如 "groups/investment-masters-skills/hedge-fund-lead/SKILL.md"
    fetch(chrome.runtime.getURL('skills/' + msg.path))
      .then(res => {
        if (!res.ok) throw new Error('技能文件 HTTP ' + res.status);
        return res.text();
      })
      .then(text => sendResponse({ ok: true, text }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === 'DSWA_ENABLE_SITE') {
    enableSite(msg.host, msg.tabId)
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  return false;
});
