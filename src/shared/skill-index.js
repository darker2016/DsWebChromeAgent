// 技能注册表：获取技能索引与 SKILL.md 文本（两种类型：group / single）。
// 双路径：内容脚本优先直接 fetch 技能包（依赖 web_accessible_resources），
// 失败再经 background 消息（DSWA_GET_INDEX / DSWA_GET_SKILL_TEXT）。
// 所有请求带超时，避免 UI 卡在「加载中」；任何失败都会变成可见报错。
globalThis.DSWA = globalThis.DSWA || {};

DSWA.skillIndex = (() => {
  let cache = null;

  function withTimeout(promise, ms, label) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(label + '超时 (' + ms + 'ms)')), ms);
      promise.then(
        v => { clearTimeout(timer); resolve(v); },
        e => { clearTimeout(timer); reject(e); }
      );
    });
  }

  // 直接 fetch 扩展资源；返回已校验 ok 的 Response
  async function fetchDirect(url, label) {
    const res = await withTimeout(fetch(url), 5000, label);
    if (!res.ok) throw new Error(label + ' HTTP ' + res.status);
    return res;
  }

  // 拉取并缓存技能索引（直读优先，background 兜底）
  async function load() {
    if (cache) return cache;
    try {
      const res = await fetchDirect(DSWA.SKILLS.indexUrl, '技能索引');
      cache = await res.json();
      return cache;
    } catch (err) {
      console.warn('[DSWA] 直接读取索引失败，转 background：', err.message);
    }
    const res = await withTimeout(
      chrome.runtime.sendMessage({ type: 'DSWA_GET_INDEX' }),
      4000,
      'background 索引'
    );
    if (!res || !res.ok) throw new Error((res && res.error) || '无法获取技能索引');
    cache = res.index;
    return cache;
  }

  // 列出技能；type 可选 'group' | 'single'，省略则全部
  async function list(type) {
    const idx = await load();
    if (!idx || !Array.isArray(idx.skills)) {
      throw new Error('技能索引格式异常（skills 数组缺失）');
    }
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
    let text = null;
    try {
      const res = await fetchDirect(url, '技能文件');
      text = await res.text();
    } catch (err) {
      console.warn('[DSWA] 直接读取技能文件失败，转 background：', err.message);
    }
    if (text === null) {
      const res = await withTimeout(
        chrome.runtime.sendMessage({ type: 'DSWA_GET_SKILL_TEXT', path: skill.lead.path }),
        4000,
        'background 技能文件'
      );
      if (!res || !res.ok) throw new Error((res && res.error) || '无法加载技能文件');
      text = res.text;
    }
    return stripFrontmatter(text);
  }

  // 剥离 YAML frontmatter（--- ... ---），只留正文作为提示词
  function stripFrontmatter(text) {
    const m = text.match(/^---\s*\n[\s\S]*?\n---(?:\s*\n|$)/);
    return m ? text.slice(m[0].length).trim() : text.trim();
  }

  return { load, list, find, promptFor, stripFrontmatter };
})();
