// popup：显示版本与技能数量，展示当前站点状态，支持「在此页面启用插件」（手动唤醒）。
const versionEl = document.getElementById('version');
const countGroupEl = document.getElementById('count-group');
const countSingleEl = document.getElementById('count-single');
const hostEl = document.getElementById('current-host');
const statusEl = document.getElementById('site-status');
const enableBtn = document.getElementById('enable-site');

versionEl.textContent = chrome.runtime.getManifest().version;

(async () => {
  try {
    const res = await fetch(chrome.runtime.getURL('skills/index.json'));
    const idx = await res.json();
    countGroupEl.textContent = idx.counts.group;
    countSingleEl.textContent = idx.counts.single;
  } catch {
    countGroupEl.textContent = '0';
    countSingleEl.textContent = '0';
  }
})();

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let host = '';
  try { host = new URL(tab.url).hostname; } catch { /* 无地址栏页面 */ }
  hostEl.textContent = host || '未知页面';
  const site = DSWA.siteConfig.matchHost(host);

  if (!host) {
    statusEl.textContent = '无法获取当前页面地址';
  } else if (site && site.id !== 'generic') {
    statusEl.textContent = '✓ 已支持：' + site.name;
  } else {
    statusEl.textContent = '此站点未内置适配，可手动启用（通用富文本框模式）';
    enableBtn.hidden = false;
    enableBtn.addEventListener('click', async () => {
      enableBtn.disabled = true;
      enableBtn.textContent = '启用中…';
      try {
        const res = await chrome.runtime.sendMessage({ type: 'DSWA_ENABLE_SITE', host, tabId: tab.id });
        enableBtn.textContent = res && res.ok ? '✓ 已启用，右下角出现「技能」按钮' : '启用失败：' + ((res && res.error) || '未知');
      } catch (e) {
        enableBtn.textContent = '启用失败：' + e.message;
      }
    });
  }
})();

document.getElementById('open-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
