// 技能注册表：加载 / 解析 / 匹配 skills/index.json（两种类型：group / single）。
globalThis.DSWA = globalThis.DSWA || {};

DSWA.skillIndex = (() => {
  let cache = null;

  // 拉取并缓存 skills/index.json
  async function load() {
    if (cache) return cache;
    const res = await fetch(DSWA.SKILLS.indexUrl);
    if (!res.ok) throw new Error('无法加载技能索引 (HTTP ' + res.status + ')');
    cache = await res.json();
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
    const url = DSWA.SKILLS.baseUrl + '/' + skill.lead.path;
    const res = await fetch(url);
    if (!res.ok) throw new Error('无法加载技能文件 (HTTP ' + res.status + ')');
    const text = await res.text();
    return stripFrontmatter(text);
  }

  // 剥离 YAML frontmatter（--- ... ---），只留正文作为提示词
  function stripFrontmatter(text) {
    const m = text.match(/^---\s*\n[\s\S]*?\n---(?:\s*\n|$)/);
    return m ? text.slice(m[0].length).trim() : text.trim();
  }

  return { load, list, find, promptFor, stripFrontmatter };
})();
