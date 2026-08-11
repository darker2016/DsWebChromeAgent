#!/usr/bin/env node
/**
 * 生成 skills/index.json（技能注册表）。
 *
 * 扫描两种来源：
 *   skills/groups/<id>/   —— 专家团：目录含多个 SKILL.md，其中一个是主理人 lead
 *   skills/singles/<id>/  —— 单体技能：目录含单个 SKILL.md
 *
 * 解析规则：
 *   group.name  = README.md 首个 H1（兜底 lead frontmatter.name / 目录名）
 *   description = lead SKILL.md frontmatter.description（兜底 README「## 描述」段）
 *   lead        = README「(主理人)」标记行 → 路径含 lead/team-lead → 第一个候选文件
 *   members     = 其余候选 md（排除 README/overview 与 references|scripts|assets 子目录）
 *   triggers    = description 中「触发词：」之后的分隔项
 *   single      = 目录内最浅的 SKILL.md 的 frontmatter name/description
 *
 * 用法：node scripts/build-index.js
 * 每次新增/删除技能、或改动同步结果后都要重跑本脚本。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'skills');
const GROUPS_DIR = path.join(SKILLS_DIR, 'groups');
const SINGLES_DIR = path.join(SKILLS_DIR, 'singles');

let categories = {};
try {
  categories = JSON.parse(fs.readFileSync(path.join(__dirname, 'categories.json'), 'utf8'));
} catch {
  console.warn('[warn] categories.json 读取失败，所有技能将归为「未分类」');
}

// ---------- 基础工具 ----------

function readFile(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

function collectFiles(dir) {
  const files = [];
  (function rec(d) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) rec(p);
      else if (e.isFile()) files.push(p);
    }
  })(dir);
  return files;
}

function toPosix(rel) {
  return rel.split(path.sep).join('/');
}

function parseFrontmatter(text) {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---(?:\s*\n|$)/);
  if (!m) return { frontmatter: {}, body: text };
  const block = m[1];
  const body = text.slice(m[0].length);
  const fm = {};
  let key = null;
  let lines = [];
  const flush = () => {
    if (key === null) return;
    let val = lines.slice();
    // 去掉 YAML 折叠/字面指示符（>- | |+ 等）那一行
    if (val.length && /^[>|][+-]?$/.test(val[0].trim())) val = val.slice(1);
    let v = val.join('\n').trim().replace(/\n+/g, ' ');
    if (v.startsWith('"') && v.endsWith('"') && v.length >= 2) v = v.slice(1, -1);
    fm[key] = v;
    key = null;
    lines = [];
  };
  for (const line of block.split('\n')) {
    const km = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (km) { flush(); key = km[1]; lines = [km[2]]; }
    else lines.push(line);
  }
  flush();
  return { frontmatter: fm, body };
}

function firstH1(readme) {
  const m = readme.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : '';
}

function readmeDescription(readme) {
  const head = readme.match(/^##\s+描述\s*$/m);
  if (!head) return '';
  const after = readme.slice(head.index + head[0].length);
  const end = after.match(/^##\s/m);
  const section = (end ? after.slice(0, end.index) : after).trim();
  return section.replace(/\n+/g, ' ').slice(0, 500);
}

function extractTriggersFromFrontmatter(text) {
  // 在 frontmatter 块内找「触发词：」之后的内容（支持 description 同行或折叠多行），
  // 按 、，,； 分隔；到下一个 frontmatter 键停止。
  const fm = text.match(/^---\s*\n([\s\S]*?)\n---(?:\s*\n|$)/);
  if (!fm) return [];
  const out = [];
  const pushItems = s => {
    s.split(/[、，,;；]+/).forEach(x => {
      const v = x.trim().replace(/[。.．]+$/, '');
      if (v) out.push(v);
    });
  };
  let inDesc = false;
  for (const line of fm[1].split('\n')) {
    const km = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (km) {
      inDesc = km[1] === 'description';
      if (inDesc) {
        const m = km[2].match(/触发词[:：]\s*(.*)$/);
        if (m) pushItems(m[1]);
      }
      continue;
    }
    if (inDesc) {
      const m = line.match(/触发词[:：]\s*(.*)$/);
      if (m) pushItems(m[1]);
    }
  }
  return [...new Set(out)];
}

function memberName(rel) {
  const parts = rel.split('/');
  const base = parts[parts.length - 1];
  if (base === 'SKILL.md') return parts[parts.length - 2] || 'skill';
  return base.replace(/\.md$/, '');
}

function truncate(s, n) {
  if (!s) return s;
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// ---------- 候选技能文件（group 用） ----------

function groupSkillFiles(dir) {
  return collectFiles(dir)
    .filter(p => p.endsWith('.md'))
    .filter(p => {
      const rel = toPosix(path.relative(dir, p));
      const parts = rel.split('/');
      const base = parts[parts.length - 1];
      // 常见非技能文档（含中文命名）不计入成员
      if (['README.md', 'overview.md', '概览.md', '说明.md', 'index.md'].includes(base)) return false;
      if (parts.slice(0, -1).some(x => ['references', 'scripts', 'assets'].includes(x))) return false;
      return true;
    })
    .map(p => toPosix(path.relative(dir, p)))
    .sort();
}

function detectLead(readme, skillFiles) {
  if (readme) {
    const m = readme.match(/\| `([^`]+\.md)` \|[^|]*主理人/);
    if (m) return m[1];
  }
  const byLead = skillFiles.find(f => /\blead\b/i.test(f));
  if (byLead) return byLead;
  return skillFiles[0] || null;
}

function singleSkillFile(dir) {
  return collectFiles(dir)
    .filter(p => /SKILL\.md$/.test(p))
    .map(p => toPosix(path.relative(dir, p)))
    .sort((a, b) => a.split('/').length - b.split('/').length)[0] || null;
}

// ---------- 构建条目 ----------

function buildGroup(dir) {
  const id = path.basename(dir);
  const readme = readFile(path.join(dir, 'README.md'));
  const skillFiles = groupSkillFiles(dir);
  const leadRel = detectLead(readme, skillFiles);
  const leadText = leadRel ? readFile(path.join(dir, leadRel)) : '';
  const { frontmatter } = parseFrontmatter(leadText);
  const description = frontmatter.description || readmeDescription(readme);
  const triggers = extractTriggersFromFrontmatter(leadText);
  const members = skillFiles
    .filter(f => f !== leadRel)
    .map(f => ({ path: id + '/' + f, name: memberName(f) }));
  return {
    id,
    type: 'group',
    name: firstH1(readme) || frontmatter.name || id,
    category: categories[id] || '未分类',
    description: truncate(description, 400),
    lead: leadRel
      ? { path: id + '/' + leadRel, name: frontmatter.name || memberName(leadRel) }
      : null,
    members,
    member_count: members.length + (leadRel ? 1 : 0),
    triggers,
  };
}

function buildSingle(dir) {
  const id = path.basename(dir);
  const leadRel = singleSkillFile(dir);
  const text = leadRel ? readFile(path.join(dir, leadRel)) : '';
  const { frontmatter } = parseFrontmatter(text);
  const description = frontmatter.description || '';
  return {
    id,
    type: 'single',
    name: frontmatter.name || id,
    category: categories[id] || '未分类',
    description: truncate(description, 400),
    lead: leadRel ? { path: id + '/' + leadRel, name: frontmatter.name || id } : null,
    members: [],
    member_count: 1,
    triggers: extractTriggersFromFrontmatter(text),
  };
}

// ---------- 主流程 ----------

function buildAll() {
  const groups = [];
  const singles = [];
  if (fs.existsSync(GROUPS_DIR)) {
    for (const e of fs.readdirSync(GROUPS_DIR, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name.startsWith('.')) continue;
      groups.push(buildGroup(path.join(GROUPS_DIR, e.name)));
    }
  }
  if (fs.existsSync(SINGLES_DIR)) {
    for (const e of fs.readdirSync(SINGLES_DIR, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name.startsWith('.')) continue;
      singles.push(buildSingle(path.join(SINGLES_DIR, e.name)));
    }
  }
  const uncategorized = [...groups, ...singles].filter(s => s.category === '未分类');
  if (uncategorized.length) {
    console.warn('[warn] 以下技能未配置分类（可在 scripts/categories.json 补充）：');
    uncategorized.forEach(s => console.warn('  - ' + s.id));
  }
  const index = {
    version: 1,
    generated_at: new Date().toISOString().slice(0, 10),
    counts: { group: groups.length, single: singles.length },
    skills: [...groups, ...singles],
  };
  fs.writeFileSync(path.join(SKILLS_DIR, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  console.log(`已生成 skills/index.json：${groups.length} 个专家团 + ${singles.length} 个单体技能`);
}

buildAll();
