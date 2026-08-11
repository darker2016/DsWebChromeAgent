// popup：显示版本与技能数量，提供设置入口。
const versionEl = document.getElementById('version');
const countGroupEl = document.getElementById('count-group');
const countSingleEl = document.getElementById('count-single');

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

document.getElementById('open-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
