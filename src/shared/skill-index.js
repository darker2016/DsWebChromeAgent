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

  // 拉取并缓存技能索引（直读优先，background 兜底），随后合并用户自定义技能
  async function load() {
    if (cache) return cache;
    try {
      const res = await fetchDirect(DSWA.SKILLS.indexUrl, '技能索引');
      cache = await res.json();
    } catch (err) {
      console.warn('[DSWA] 直接读取索引失败，转 background：', err.message);
      const res = await withTimeout(
        chrome.runtime.sendMessage({ type: 'DSWA_GET_INDEX' }),
        4000,
        'background 索引'
      );
      if (!res || !res.ok) throw new Error((res && res.error) || '无法获取技能索引');
      cache = res.index;
    }
    await mergeUserSkills();
    return cache;
  }

  // 把用户自定义技能（chrome.storage 里的 source:'user'）合并进缓存索引
  async function mergeUserSkills() {
    try {
      const userSkills = await DSWA.userSkills.list();
      if (userSkills.length) {
        cache = {
          ...cache,
          skills: [
            ...cache.skills,
            ...userSkills.map(u => ({
              id: u.id,
              type: u.type,
              source: u.source,
              name: u.name,
              category: u.category,
              description: u.description,
              lead: u.lead,
              members: u.members || [],
              member_count: u.member_count || 1,
              triggers: u.triggers || [],
            })),
          ],
        };
      }
    } catch (e) {
      console.warn('[DSWA] 读取用户技能失败：', e.message);
    }
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

  // 拉取某个技能的引导提示词：group 取 lead SKILL.md，single 取自身 SKILL.md。
  // 注入内容 = 引导模板（DSWA.GUIDE，group/single 不同）+ 技能正文。
  async function promptFor(skill) {
    if (!skill || !skill.lead) throw new Error('技能缺少 lead 文件');
    let body;
    if (skill.source === 'user') {
      const raw = await DSWA.userSkills.readFile(skill, skill.lead.path);
      if (!raw) throw new Error('用户技能缺少文件：' + skill.lead.path);
      body = stripFrontmatter(raw);
    } else {
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
      body = stripFrontmatter(text);
    }
    const wrap = DSWA.GUIDE[skill.type] || DSWA.GUIDE.single;
    return wrap(skill.name, body);
  }

  // 剥离 YAML frontmatter（--- ... ---），只留正文作为提示词
  function stripFrontmatter(text) {
    const m = text.match(/^---\s*\n[\s\S]*?\n---(?:\s*\n|$)/);
    return m ? text.slice(m[0].length).trim() : text.trim();
  }

  // 用户技能上传/删除时失效缓存，下次 load 自动合并最新数据
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes['dswa:user-skills']) {
      cache = null;
    }
  });

  // 自诊断：分别探测直读与 background 两条路径，返回可读结果（定位数据加载问题用）
  async function diagnose() {
    const lines = [];
    try {
      const res = await withTimeout(fetch(DSWA.SKILLS.indexUrl), 5000, '直读');
      const text = await res.text();
      let skills = '解析失败';
      try {
        const j = JSON.parse(text);
        skills = 'skills=' + (Array.isArray(j.skills) ? j.skills.length : '(skills 缺失)');
      } catch { /* 保持解析失败 */ }
      lines.push('直读: HTTP ' + res.status + ', 字节=' + text.length + ', ' + skills);
    } catch (e) {
      lines.push('直读: 失败 - ' + e.message);
    }
    try {
      const res = await withTimeout(
        chrome.runtime.sendMessage({ type: 'DSWA_GET_INDEX' }),
        4000,
        '消息'
      );
      if (res && res.ok) {
        const n = res.index && Array.isArray(res.index.skills) ? res.index.skills.length : '(skills 缺失)';
        lines.push('消息: ok, skills=' + n);
      } else {
        lines.push('消息: 失败 - ' + ((res && res.error) || '无响应'));
      }
    } catch (e) {
      lines.push('消息: 失败 - ' + e.message);
    }
    return lines.join('\n');
  }

  return { load, list, find, promptFor, stripFrontmatter, diagnose };
})();
