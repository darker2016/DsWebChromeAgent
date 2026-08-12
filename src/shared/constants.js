// DSWA 全局命名空间与常量。
// content scripts 是非模块脚本，按 manifest 中 js 顺序加载，顶层绑定到 globalThis 以跨文件共享。
globalThis.DSWA = globalThis.DSWA || {};

DSWA.APP = {
  name: 'Deepseek Web Agent',
  shortName: 'DSWA',
  version: '0.2.0',
};

DSWA.SKILLS = {
  // 内容脚本直读技能包用；skills/* 需在 manifest.web_accessible_resources 中暴露
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

// 技能引导模板：注入内容 = 引导（告诉 AI 怎么用这个技能）+ 技能正文。
// group 与 single 的引导不同：专家团强调主理人职责（调度成员、不代写产出、汇编），单体强调严格按定义执行。
DSWA.GUIDE = {
  group: (name, body) => `你正在启用「${name}」专家团技能。

你的角色：本技能的主理人（团队管理者）。你**不直接做专业产出**，而是调度技能中定义的多位专家成员，按工作流阶段与调度规则组织协作，最后汇编成最终产出。

请严格遵循下方技能定义中「团队架构 / 调度规则 / 工作流阶段 / 铁律 / 红线」的全部要求。

===== 技能定义开始 =====
${body}
===== 技能定义结束 =====

开始前：先向用户确认任务目标，说明你将如何组织本次协作，然后按技能定义启动。`,

  single: (name, body) => `你正在启用「${name}」技能。

请严格遵循下方技能定义执行用户的任务；若定义含步骤或规则，请逐步落实，不要跳步。

===== 技能定义开始 =====
${body}
===== 技能定义结束 =====

请按技能定义开始处理用户的请求。`,
};
