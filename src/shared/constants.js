// DSWA 全局命名空间与常量。
// content scripts 是非模块脚本，按 manifest 中 js 顺序加载，顶层绑定到 globalThis 以跨文件共享。
globalThis.DSWA = globalThis.DSWA || {};

DSWA.APP = {
  name: 'Deepseek Web Agent',
  shortName: 'DSWA',
  version: '0.3.0',
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
// group 与 single 的引导不同：
//   group  —— 注入主理人 + 全部成员定义；开头声明"将使用该专家团"，结尾等待用户输入任务
//   single —— 强调严格按定义执行
DSWA.GUIDE = {
  group: (name, leadName, leadBody, members) => {
    const memberBlocks = members
      .map(m => `===== 成员：${m.name} =====\n${m.body}`)
      .join('\n\n');
    return `我将使用下面的「${name}」专家团来执行后续的任务。

以下是该专家团的完整定义：先是主理人，然后是各位成员的角色说明。

===== 主理人：${leadName} =====
${leadBody}

${memberBlocks}

我已理解上述团队定义。请把你需要我完成的任务发给我，我将作为主理人调度该团队完成。`;
  },

  single: (name, body) => `你正在启用「${name}」技能。

请严格遵循下方技能定义执行用户的任务；若定义含步骤或规则，请逐步落实，不要跳步。

===== 技能定义开始 =====
${body}
===== 技能定义结束 =====

请按技能定义开始处理用户的请求。`,
};
