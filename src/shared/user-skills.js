// 用户自定义技能：chrome.storage.local 持久化 + 上传解析（单个 .md / 文件夹）。
// content script 与 options 页共用；技能来源标记为 source:'user'，注入时从 storage 读文件正文。
globalThis.DSWA = globalThis.DSWA || {};

DSWA.userSkills = (() => {
  const STORAGE_KEY = 'dswa:user-skills';

  async function getAll() {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    return data[STORAGE_KEY] || {};
  }

  async function list() {
    return Object.values(await getAll());
  }

  async function get(id) {
    const map = await getAll();
    return map[id] || null;
  }

  async function save(skill) {
    const map = await getAll();
    map[skill.id] = skill;
    await chrome.storage.local.set({ [STORAGE_KEY]: map });
  }

  async function remove(id) {
    const map = await getAll();
    delete map[id];
    await chrome.storage.local.set({ [STORAGE_KEY]: map });
  }

  // 读取某个用户技能的指定文件正文（path 相对技能根目录，即 files 的 key）
  async function readFile(skill, path) {
    const s = await get(skill.id);
    return s && s.files ? (s.files[path] || '') : '';
  }

  // ---------- 解析 ----------

  function makeId(name) {
    const slug = (name || 'skill').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'skill';
    return 'user-' + Date.now().toString(36) + '-' + slug;
  }

  function parseFrontmatter(text) {
    const m = text.match(/^---\s*\n([\s\S]*?)\n---(?:\s*\n|$)/);
    const fm = {};
    if (m) {
      for (const line of m[1].split('\n')) {
        const km = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
        if (km) {
          let v = km[2].trim();
          if (v.startsWith('"') && v.endsWith('"') && v.length >= 2) v = v.slice(1, -1);
          fm[km[1]] = v;
        }
      }
    }
    return fm;
  }

  // 单个 .md → single 技能
  function buildFromSingle(fileName, content) {
    const fm = parseFrontmatter(content);
    const name = fm.name || fileName.replace(/\.md$/i, '');
    return {
      id: makeId(name),
      source: 'user',
      type: 'single',
      name,
      category: '用户自定义',
      description: (fm.description || '').slice(0, 400),
      lead: { path: 'SKILL.md', name },
      members: [],
      member_count: 1,
      triggers: [],
      files: { 'SKILL.md': content },
      createdAt: Date.now(),
    };
  }

  // 文件夹 → single（仅一个 md）或 group。entries: [{ name, relPath, content }]
  function buildFromFolder(entries) {
    if (entries.length === 1) {
      return buildFromSingle(entries[0].name, entries[0].content);
    }
    const files = {};
    entries.forEach(e => { files[e.relPath] = e.content; });
    // lead 判定：README「(主理人)」标记 → 路径含 lead/team-lead → 第一个
    let leadRel = null;
    const readme = entries.find(e => e.relPath.toLowerCase() === 'readme.md');
    if (readme) {
      const m = readme.content.match(/\| `([^`]+\.md)` \|[^|]*主理人/);
      if (m) leadRel = m[1];
    }
    if (!leadRel) leadRel = entries.find(e => /\blead\b/i.test(e.relPath))?.relPath || null;
    const leadPath = leadRel || entries[0].relPath;
    const leadText = files[leadPath] || entries[0].content;
    const fm = parseFrontmatter(leadText);
    const name = fm.name || entries[0].name.replace(/\.md$/i, '');
    return {
      id: makeId(name),
      source: 'user',
      type: 'group',
      name,
      category: '用户自定义',
      description: (fm.description || '').slice(0, 400),
      lead: { path: leadPath, name: fm.name || leadPath },
      members: entries
        .filter(e => e.relPath !== leadPath)
        .map(e => ({ path: e.relPath, name: e.name.replace(/\.md$/i, '') })),
      member_count: entries.length,
      triggers: [],
      files,
      createdAt: Date.now(),
    };
  }

  return { list, get, save, remove, readFile, makeId, buildFromSingle, buildFromFolder };
})();
