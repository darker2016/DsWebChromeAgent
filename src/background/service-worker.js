// Service Worker —— 技能数据层。
// content script 通过消息从这里获取技能索引与 SKILL.md 文本。
// 扩展上下文可直接 fetch 自身资源（不依赖 web_accessible_resources），
// 比 content script 直接 fetch chrome-extension:// 更稳定。
const INDEX_PATH = 'skills/index.json';

let indexCache = null;

async function fetchIndex() {
  if (indexCache) return indexCache;
  const res = await fetch(chrome.runtime.getURL(INDEX_PATH));
  if (!res.ok) throw new Error('索引 HTTP ' + res.status);
  indexCache = await res.json();
  console.log('[DSWA] 索引已获取, skills:', Array.isArray(indexCache.skills) ? indexCache.skills.length : '缺失');
  return indexCache;
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[DSWA] 已安装');
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
    // msg.path 相对 skills/，如 "investment-masters-skills/hedge-fund-lead/SKILL.md"
    fetch(chrome.runtime.getURL('skills/' + msg.path))
      .then(res => {
        if (!res.ok) throw new Error('技能文件 HTTP ' + res.status);
        return res.text();
      })
      .then(text => sendResponse({ ok: true, text }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  return false;
});
