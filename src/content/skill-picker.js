// 浮动技能选择器：右下角按钮 → 面板（专家团 / 单体技能 双 Tab + 搜索 + 分类过滤）。
// 点击技能 → 载入对应 SKILL.md → 经 DSWA.adapter 注入聊天输入框。
globalThis.DSWA = globalThis.DSWA || {};

DSWA.picker = (() => {
  const state = {
    loaded: false,
    type: DSWA.TYPES.group,
    skills: [],
    search: '',
    category: '',
  };

  let root = null;

  // ---------- DOM 骨架 ----------

  function ensureRoot() {
    if (root && document.getElementById(DSWA.UI.containerId)) return root;
    root = document.createElement('div');
    root.id = DSWA.UI.containerId;
    root.className = 'dswa-root';
    root.innerHTML = `
      <button class="dswa-fab" type="button" title="选择技能注入对话">技能</button>
      <div class="dswa-panel" hidden>
        <div class="dswa-header">
          <span class="dswa-title">技能选择</span>
          <button class="dswa-close" type="button" title="关闭">×</button>
        </div>
        <div class="dswa-tabs">
          <button class="dswa-tab is-active" data-type="group" type="button">专家团</button>
          <button class="dswa-tab" data-type="single" type="button">单体技能</button>
        </div>
        <input class="dswa-search" type="search" placeholder="搜索技能名称 / 描述…" autocomplete="off" />
        <div class="dswa-status"></div>
        <div class="dswa-cats"></div>
        <div class="dswa-list">
          <div class="dswa-loading">加载技能清单…</div>
        </div>
      </div>
      <div class="dswa-toast" hidden></div>
    `;
    document.body.appendChild(root);
    bindEvents();
    return root;
  }

  function bindEvents() {
    root.querySelector('.dswa-fab').addEventListener('click', toggle);
    root.querySelector('.dswa-close').addEventListener('click', () => setPanel(false));
    root.querySelector('.dswa-search').addEventListener('input', e => {
      state.search = e.target.value.trim().toLowerCase();
      renderList();
    });
    root.querySelector('.dswa-tabs').addEventListener('click', e => {
      const btn = e.target.closest('.dswa-tab');
      if (!btn) return;
      if (btn.dataset.type === state.type) return;
      state.type = btn.dataset.type;
      state.category = '';
      state.search = '';
      root.querySelector('.dswa-search').value = '';
      renderTabs();
      renderCats();
      renderList();
      renderStatus();
    });
  }

  // ---------- 交互 ----------

  async function toggle() {
    const panel = root.querySelector('.dswa-panel');
    if (!panel.hidden) { setPanel(false); return; }
    setPanel(true);
    if (!state.loaded) {
      try {
        state.skills = await DSWA.skillIndex.list();
        state.loaded = true;
        renderCats();
        renderList();
        renderStatus();
      } catch (err) {
        renderList('加载技能清单失败：' + err.message);
      }
    }
  }

  function setPanel(open) {
    root.querySelector('.dswa-panel').hidden = !open;
    root.classList.toggle('is-open', open);
  }

  // ---------- 渲染 ----------

  function renderTabs() {
    root.querySelectorAll('.dswa-tab').forEach(b => {
      b.classList.toggle('is-active', b.dataset.type === state.type);
    });
  }

  function renderCats() {
    const wrap = root.querySelector('.dswa-cats');
    const cats = [...new Set(
      state.skills.filter(s => s.type === state.type).map(s => s.category)
    )].sort();
    if (!cats.length) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = '';
    const all = document.createElement('button');
    all.type = 'button';
    all.className = 'dswa-cat' + (state.category === '' ? ' is-active' : '');
    all.textContent = '全部';
    all.addEventListener('click', () => { state.category = ''; renderCats(); renderList(); });
    wrap.appendChild(all);
    for (const c of cats) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dswa-cat' + (c === state.category ? ' is-active' : '');
      b.textContent = c;
      b.addEventListener('click', () => { state.category = c; renderCats(); renderList(); });
      wrap.appendChild(b);
    }
  }

  function renderStatus() {
    const el = root.querySelector('.dswa-status');
    if (!state.loaded) { el.textContent = ''; return; }
    const groups = state.skills.filter(s => s.type === DSWA.TYPES.group).length;
    const singles = state.skills.filter(s => s.type === DSWA.TYPES.single).length;
    el.textContent = '已加载 ' + state.skills.length + ' 个技能（专家团 ' + groups + ' / 单体 ' + singles + '）';
  }

  function visibleSkills() {
    return state.skills.filter(s => {
      if (s.type !== state.type) return false;
      if (state.category && s.category !== state.category) return false;
      if (state.search) {
        const hay = (s.name + ' ' + s.id + ' ' + s.description).toLowerCase();
        if (!hay.includes(state.search)) return false;
      }
      return true;
    });
  }

  function renderList(message) {
    const list = root.querySelector('.dswa-list');
    if (message) { list.innerHTML = ''; list.textContent = message; return; }
    const items = visibleSkills();
    list.innerHTML = '';
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'dswa-empty';
      empty.textContent = '没有匹配的技能（已加载 ' + state.skills.length + ' 个）';
      list.appendChild(empty);
      return;
    }
    for (const s of items) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'dswa-item';
      const head = document.createElement('div');
      head.className = 'dswa-item-head';
      const name = document.createElement('span');
      name.className = 'dswa-item-name';
      name.textContent = s.name;
      const meta = document.createElement('span');
      meta.className = 'dswa-item-meta';
      meta.textContent = s.category + ' · ' + s.member_count + ' 成员';
      head.appendChild(name);
      head.appendChild(meta);
      const desc = document.createElement('div');
      desc.className = 'dswa-item-desc';
      desc.textContent = s.description || '（无描述）';
      item.appendChild(head);
      item.appendChild(desc);
      item.addEventListener('click', () => insertSkill(s));
      list.appendChild(item);
    }
  }

  // ---------- 注入 ----------

  async function insertSkill(skill) {
    showToast('正在载入「' + skill.name + '」…');
    try {
      const prompt = await DSWA.skillIndex.promptFor(skill);
      const res = DSWA.adapter.injectPrompt(prompt);
      if (res.ok) {
        showToast('已插入「' + skill.name + '」到输入框，发送即可生效', true);
      } else {
        showToast('未找到聊天输入框：' + res.reason, false);
      }
    } catch (err) {
      showToast('载入失败：' + err.message, false);
    }
  }

  // ---------- 提示 ----------

  let toastTimer = null;
  function showToast(msg, ok) {
    const el = root.querySelector('.dswa-toast');
    el.textContent = msg;
    el.classList.toggle('is-error', !ok);
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }

  // ---------- 启动 ----------

  function init() {
    ensureRoot();
  }

  return { init };
})();

DSWA.picker.init();
