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
// 两者都含「运行环境说明」：网页对话没有工具/脚本/文件系统/子代理，忽略技能定义里的相关指令，
// 改为在对话内依次扮演成员、基于当前对话内容完成。
DSWA.GUIDE = {
  group: (name, leadName, leadBody, members) => {
    const memberBlocks = members
      .map(m => `===== 成员：${m.name} =====\n${m.body}`)
      .join('\n\n');
    return `我将使用下面的「${name}」专家团来执行后续的任务。

【重要 · 运行环境（必读）】
当前是网页对话环境：没有工具调用、脚本、文件系统、子任务/子代理创建，也无法真正并行调度多名成员。
技能定义中凡涉及「调用工具、创建团队、派发子任务、运行脚本、写文件、外部数据源/联网检索」的指令一律忽略，
改为：在本对话中**依次扮演**主理人与各位成员，按技能定义的工作流阶段推进；成员产出由你按各成员角色内部模拟，
无需真正创建子任务。所有输入取自当前对话内容（用户粘贴的材料），所有产出直接呈现在对话中；
技能要求落盘的，改为在对话中给出完整内容。

以下是该专家团的完整定义：先是主理人，然后是各位成员的角色说明。

===== 主理人：${leadName} =====
${leadBody}

${memberBlocks}

我已理解上述团队定义。请把你需要我完成的任务发给我，我将作为主理人调度该团队完成。`;
  },

  single: (name, body) => `你正在启用「${name}」技能。

【运行环境】当前是网页对话：没有脚本/文件系统可执行，无法写文件或调用外部数据源。
技能定义中涉及脚本、落盘、外部检索的指令，改为：基于当前对话内容直接完成，产出呈现在对话中。

===== 技能定义开始 =====
${body}
===== 技能定义结束 =====

请按技能定义开始处理用户的请求。`,
};
