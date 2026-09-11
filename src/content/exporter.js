// 消息与整场对话导出模块：支持 Markdown (.md)、Word (.doc / .docx 兼容格式)、PDF (.pdf 打印与保存)
// 适配 DeepSeek、Kimi、豆包、ChatGPT、Gemini 等多个主流平台。
globalThis.DSWA = globalThis.DSWA || {};

if (!DSWA._exporterLoaded) {
DSWA._exporterLoaded = true;

DSWA.exporter = (() => {
  // 文件下载辅助
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  function getTimestamp() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  }

  // 1. 导出 Markdown
  function exportMarkdown(title, text) {
    const filename = `${title.replace(/[\/\\?%*:|"<>]/g, '_')}_${getTimestamp()}.md`;
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    downloadBlob(blob, filename);
  }

  // 2. 导出 Word (基于标准 HTML-Word MIME 协议，Word / WPS 完美原生排版渲染)
  function exportWord(title, htmlContent) {
    const filename = `${title.replace(/[\/\\?%*:|"<>]/g, '_')}_${getTimestamp()}.doc`;
    const docHtml = `
      <!DOCTYPE html>
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; font-size: 11pt; line-height: 1.6; color: #222; }
          h1, h2, h3, h4, h5, h6 { color: #111; margin-top: 18pt; margin-bottom: 6pt; }
          h1 { font-size: 18pt; border-bottom: 1.5pt solid #4F46E5; padding-bottom: 4pt; }
          h2 { font-size: 15pt; }
          h3 { font-size: 13pt; }
          p { margin: 6pt 0; }
          table { border-collapse: collapse; width: 100%; margin: 12pt 0; }
          th, td { border: 1pt solid #CBD5E1; padding: 6pt 10pt; text-align: left; }
          th { background-color: #F1F5F9; font-weight: bold; }
          pre, code { font-family: Consolas, "Courier New", monospace; font-size: 10pt; background: #F8FAFC; border: 1pt solid #E2E8F0; padding: 4pt 6pt; border-radius: 4pt; }
          pre { padding: 8pt; white-space: pre-wrap; word-break: break-all; }
          blockquote { border-left: 3pt solid #6366F1; margin: 8pt 0; padding-left: 10pt; color: #475569; font-style: italic; }
          ul, ol { padding-left: 20pt; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <hr style="border: 0; border-top: 1px solid #E2E8F0; margin-bottom: 16pt;" />
        ${htmlContent}
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + docHtml], { type: 'application/msword;charset=utf-8' });
    downloadBlob(blob, filename);
  }

  // 3. 导出 PDF (利用浏览器高质量 Print 渲染引擎，支持分页与矢量字体)
  function exportPdf(title, htmlContent) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          @page { size: A4; margin: 18mm 16mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; font-size: 13px; line-height: 1.65; color: #1E293B; }
          h1, h2, h3, h4 { color: #0F172A; page-break-after: avoid; }
          h1 { font-size: 20px; border-bottom: 2px solid #4F46E5; padding-bottom: 6px; margin-bottom: 16px; }
          h2 { font-size: 16px; margin-top: 16px; margin-bottom: 8px; }
          h3 { font-size: 14px; margin-top: 12px; margin-bottom: 6px; }
          table { border-collapse: collapse; width: 100%; margin: 12px 0; page-break-inside: avoid; }
          th, td { border: 1px solid #CBD5E1; padding: 6px 10px; font-size: 12px; text-align: left; }
          th { background: #F8FAFC; font-weight: 600; }
          pre, code { font-family: Menlo, Monaco, Consolas, monospace; font-size: 11px; background: #F1F5F9; border-radius: 4px; }
          pre { padding: 10px; border: 1px solid #E2E8F0; white-space: pre-wrap; word-break: break-all; page-break-inside: avoid; }
          blockquote { border-left: 3px solid #6366F1; margin: 10px 0; padding: 4px 12px; color: #475569; background: #F8FAFC; }
          img { max-width: 100%; page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${htmlContent}
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 2000);
    }, 400);
  }

  // 提取清洗后的 HTML（去除多余按钮、微标等）
  function getCleanHtml(el) {
    const clone = el.cloneNode(true);
    // 移除插件自身添加的元素及各种无用控制图标
    clone.querySelectorAll('.dswa-export-btn, .dswa-export-menu, button, svg, .ds-icon-button').forEach(n => n.remove());
    return clone.innerHTML;
  }

  // 为单条消息生成「导出」下拉按钮
  function createExportWidget(getContentElement) {
    const container = document.createElement('div');
    container.className = 'dswa-export-widget';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dswa-export-btn';
    btn.title = '导出为文档 (Markdown / Word / PDF)';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <span>导出</span>
    `;

    const menu = document.createElement('div');
    menu.className = 'dswa-export-menu';
    menu.hidden = true;
    menu.innerHTML = `
      <div class="dswa-export-item" data-format="md">
        <span class="dswa-export-icon">📝</span>
        <span>导出为 Markdown (.md)</span>
      </div>
      <div class="dswa-export-item" data-format="word">
        <span class="dswa-export-icon">📄</span>
        <span>导出为 Word (.doc)</span>
      </div>
      <div class="dswa-export-item" data-format="pdf">
        <span class="dswa-export-icon">📑</span>
        <span>导出为 PDF (.pdf)</span>
      </div>
    `;

    function closeMenu() {
      menu.hidden = true;
      document.removeEventListener('click', onDocClick);
    }

    function onDocClick(e) {
      if (!container.contains(e.target)) closeMenu();
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = menu.hidden;
      document.querySelectorAll('.dswa-export-menu').forEach(m => m.hidden = true);
      menu.hidden = !isHidden;
      if (!menu.hidden) {
        document.addEventListener('click', onDocClick);
      }
    });

    menu.addEventListener('click', (e) => {
      const item = e.target.closest('.dswa-export-item');
      if (!item) return;
      e.stopPropagation();
      closeMenu();

      const format = item.dataset.format;
      const contentEl = getContentElement();
      if (!contentEl) {
        alert('未找到该消息的内容区域');
        return;
      }

      // 获取对话标题或当前页面标题
      const pageTitle = document.title.split(/[-_|]/)[0].trim() || 'AI对话回答';
      const cleanHtml = getCleanHtml(contentEl);

      if (format === 'md') {
        const mdText = DSWA.htmlToMarkdown.fromElement(contentEl);
        exportMarkdown(pageTitle, mdText);
      } else if (format === 'word') {
        exportWord(pageTitle, cleanHtml);
      } else if (format === 'pdf') {
        exportPdf(pageTitle, cleanHtml);
      }
    });

    container.appendChild(btn);
    container.appendChild(menu);
    return container;
  }

  return {
    exportMarkdown,
    exportWord,
    exportPdf,
    getCleanHtml,
    createExportWidget,
  };
})();

}
