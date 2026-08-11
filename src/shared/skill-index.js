// 技能注册表：经 background 获取技能索引与 SKILL.md 文本（两种类型：group / single）。
// 数据都来自 background（DSWA_GET_INDEX / DSWA_GET_SKILL_TEXT），内容脚本不直接 fetch 扩展资源。
globalThis.DSWA = globalThis.DSWA || {};

DSWA.skillIndex = (() => {
  let cache = null;

  // 拉取并缓存技能索引（来自 background）
  async function load() {
    if (cache) return cache;
    const res = await chrome.runtime.sendMessage({ type: 'DSWA_GET_INDEX' });
    if (!res || !res.ok) throw new Error((res && res.error) || '无法获取技能索引');
    cache = res.index;
    return cache;
  }

  // 列出技能；type 可选 'group' | 'single'，省略则全部
  async function list(type) {
    const idx = await load();
    return type ? idx.skills.filter(s => s.type === type) : idx.skills;
  }

  // 按 id 精确查找
  function find(id) {
    if (!cache) return null;
    return cache.skills.find(s => s.id === id) || null;
  }

  // 拉取某个技能的引导提示词：group 取 lead SKILL.md，single 取自身 SKILL.md
  async function promptFor(skill) {
    if (!skill || !skill.lead) throw new Error('技能缺少 lead 文件');
    const res = await chrome.runtime.sendMessage({
      type: 'DSWA_GET_SKILL_TEXT',
      path: skill.lead.path,
    });
    if (!res || !res.ok) throw new Error((res && res.error) || '无法加载技能文件');
    return stripFrontmatter(res.text);
  }

  // 剥离 YAML frontmatter（--- ... ---），只留正文作为提示词
  function stripFrontmatter(text) {
    const m = text.match(/^---\s*\n[\s\S]*?\n---(?:\s*\n|$)/);
    return m ? text.slice(m[0].length).trim() : text.trim();
  }

  return { load, list, find, promptFor, stripFrontmatter };
})();
