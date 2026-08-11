// options：占位设置页，读取技能清单数量做展示。
(async () => {
  const el = document.getElementById('skill-summary');
  try {
    const res = await fetch(chrome.runtime.getURL('skills/index.json'));
    const idx = await res.json();
    el.textContent = `已内置 ${idx.counts.group} 个专家团 + ${idx.counts.single} 个单体技能（索引生成于 ${idx.generated_at}）。`;
  } catch {
    el.textContent = '未能读取技能索引，请先运行 scripts 下的同步与构建脚本。';
  }
})();
