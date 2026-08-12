// options：技能包概览 + 用户自定义技能上传（单个 .md / 文件夹）与删除。
const summaryEl = document.getElementById('skill-summary');
const listEl = document.getElementById('user-skill-list');
const fileSingle = document.getElementById('file-single');
const fileFolder = document.getElementById('file-folder');

(async () => {
  try {
    const res = await fetch(chrome.runtime.getURL('skills/index.json'));
    const idx = await res.json();
    const users = (await DSWA.userSkills.list()).length;
    summaryEl.textContent = `已内置 ${idx.counts.group} 个专家团 + ${idx.counts.single} 个单体技能（索引生成于 ${idx.generated_at}）；用户自定义 ${users} 个。`;
  } catch {
    summaryEl.textContent = '未能读取技能索引，请先运行 scripts 下的同步与构建脚本。';
  }
})();

async function refreshUserSkills() {
  const list = await DSWA.userSkills.list();
  listEl.innerHTML = '';
  if (!list.length) {
    const li = document.createElement('li');
    li.className = 'muted';
    li.textContent = '（暂无用户技能）';
    listEl.appendChild(li);
    return;
  }
  for (const s of list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))) {
    const li = document.createElement('li');
    const typeLabel = s.type === 'group' ? '专家团' : '单体';
    const desc = (s.description || '').replace(/\s+/g, ' ').slice(0, 50);
    li.textContent = `[${typeLabel}] ${s.name} — ${desc || '（无描述）'}（${s.member_count} 文件）`;

    const del = document.createElement('button');
    del.className = 'btn btn-small';
    del.type = 'button';
    del.textContent = '删除';
    del.addEventListener('click', async () => {
      await DSWA.userSkills.remove(s.id);
      refreshUserSkills();
    });
    li.appendChild(del);
    listEl.appendChild(li);
  }
}

document.getElementById('upload-single').addEventListener('click', () => fileSingle.click());
document.getElementById('upload-folder').addEventListener('click', () => fileFolder.click());

fileSingle.addEventListener('change', async e => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const content = await file.text();
    const skill = DSWA.userSkills.buildFromSingle(file.name, content);
    await DSWA.userSkills.save(skill);
    alert(`已上传单体技能「${skill.name}」`);
    refreshUserSkills();
  } catch (err) {
    alert('上传失败：' + err.message);
  }
});

fileFolder.addEventListener('change', async e => {
  const files = Array.from(e.target.files || []);
  e.target.value = '';
  if (!files.length) return;
  const entries = [];
  for (const f of files) {
    if (!/\.md$/i.test(f.name)) continue;
    const parts = (f.webkitRelativePath || f.name).split('/');
    const rel = parts.slice(1).join('/'); // 去掉第一级文件夹名
    if (!rel) continue;
    const isRootDoc = parts.length === 2 && ['readme.md', 'overview.md', '概览.md', '说明.md', 'index.md'].includes(rel.toLowerCase());
    if (isRootDoc) continue;
    entries.push({ name: f.name, relPath: rel, content: await f.text() });
  }
  if (!entries.length) {
    alert('文件夹里没有找到可用的 .md 文件（已忽略根目录 README/说明）');
    return;
  }
  const skill = DSWA.userSkills.buildFromFolder(entries);
  await DSWA.userSkills.save(skill);
  alert(`已上传${skill.type === 'group' ? '专家团' : '单体技能'}「${skill.name}」`);
  refreshUserSkills();
});

refreshUserSkills();
