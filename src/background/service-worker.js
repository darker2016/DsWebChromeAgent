// 极简 Service Worker。
// 当前职责：安装日志 + 占位消息路由。
// 后续迭代：在此缓存 skills/index.json 与 SKILL.md，避免 content script 每次 fetch。
const DSWA_APP_NAME = 'Deepseek Web Agent';

chrome.runtime.onInstalled.addListener(() => {
  console.log('[DSWA] 已安装');
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'DSWA_PING') {
    sendResponse({ ok: true, app: DSWA_APP_NAME });
    return false;
  }
  // 未识别消息不响应
  return false;
});
