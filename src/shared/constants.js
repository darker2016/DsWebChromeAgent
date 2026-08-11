// DSWA 全局命名空间与常量。
// content scripts 是非模块脚本，按 manifest 中 js 顺序加载，顶层绑定到 globalThis 以跨文件共享。
globalThis.DSWA = globalThis.DSWA || {};

DSWA.APP = {
  name: 'Deepseek Web Agent',
  shortName: 'DSWA',
  version: '0.1.0',
};

DSWA.SKILLS = {
  // skills/index.json 与 skills/ 下的文件需在 manifest.web_accessible_resources 中暴露
  indexUrl: chrome.runtime.getURL('skills/index.json'),
  baseUrl: chrome.runtime.getURL('skills'),
};

DSWA.UI = {
  containerId: 'dswa-root',
  storageKey: 'dswa-preferences',
};

DSWA.TYPES = {
  group: 'group',   // 专家团
  single: 'single', // 单体技能
};

DSWA.TYPE_LABELS = {
  group: '专家团',
  single: '单体技能',
};
