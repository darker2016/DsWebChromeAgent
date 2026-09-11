// HTML 转 Markdown 轻量解析器（专为 AI 回答设计：支持标题、加粗、代码块、列表、表格、引用、链接等）
globalThis.DSWA = globalThis.DSWA || {};

DSWA.htmlToMarkdown = (() => {
  function convert(node) {
    if (!node) return '';
    if (node.nodeType === Node.TEXT_NODE) {
      return node.nodeValue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const tag = node.tagName.toLowerCase();

    // 过滤无用节点或插件注入的 DOM
    if (tag === 'style' || tag === 'script' || tag === 'noscript' || tag === 'svg') {
      return '';
    }
    if (node.classList && (node.classList.contains('dswa-export-btn') || node.classList.contains('dswa-export-menu') || node.classList.contains('dswa-export-widget'))) {
      return '';
    }

    // 处理代码块 pre / code
    if (tag === 'pre') {
      const codeEl = node.querySelector('code');
      const lang = codeEl ? (codeEl.className.match(/(?:lang|language)-(\w+)/) || [])[1] || '' : '';
      const text = (codeEl || node).textContent.replace(/\r\n/g, '\n');
      return `\n\`\`\`${lang}\n${text.trim()}\n\`\`\`\n\n`;
    }
    if (tag === 'code') {
      if (node.closest('pre')) return node.textContent;
      return `\`${node.textContent}\``;
    }

    // 递归转换子节点
    let inner = '';
    for (const child of node.childNodes) {
      inner += convert(child);
    }

    switch (tag) {
      case 'h1': return `\n# ${inner.trim()}\n\n`;
      case 'h2': return `\n## ${inner.trim()}\n\n`;
      case 'h3': return `\n### ${inner.trim()}\n\n`;
      case 'h4': return `\n#### ${inner.trim()}\n\n`;
      case 'h5': return `\n##### ${inner.trim()}\n\n`;
      case 'h6': return `\n###### ${inner.trim()}\n\n`;
      case 'p': return `\n\n${inner.trim()}\n\n`;
      case 'strong':
      case 'b': return `**${inner.trim()}**`;
      case 'em':
      case 'i': return `*${inner.trim()}*`;
      case 'del':
      case 's': return `~~${inner.trim()}~~`;
      case 'hr': return `\n\n---\n\n`;
      case 'blockquote': {
        const lines = inner.trim().split('\n').map(l => `> ${l}`).join('\n');
        return `\n\n${lines}\n\n`;
      }
      case 'a': {
        const href = node.getAttribute('href');
        return href ? `[${inner.trim()}](${href})` : inner;
      }
      case 'ul': {
        return `\n${inner.trim()}\n\n`;
      }
      case 'ol': {
        return `\n${inner.trim()}\n\n`;
      }
      case 'li': {
        const parent = node.parentElement;
        const isOl = parent && parent.tagName.toLowerCase() === 'ol';
        const prefix = isOl ? '1. ' : '- ';
        return `${prefix}${inner.trim()}\n`;
      }
      case 'br': return `\n`;
      case 'table': {
        return tableToMarkdown(node);
      }
      default:
        return inner;
    }
  }

  function tableToMarkdown(table) {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (!rows.length) return '';
    let md = '\n\n';
    rows.forEach((tr, rowIndex) => {
      const cells = Array.from(tr.querySelectorAll('th, td'));
      const line = '| ' + cells.map(c => c.textContent.trim().replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ') + ' |';
      md += line + '\n';
      if (rowIndex === 0) {
        const sep = '| ' + cells.map(() => '---').join(' | ') + ' |';
        md += sep + '\n';
      }
    });
    return md + '\n';
  }

  function cleanMarkdown(text) {
    return text
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  return {
    fromElement(el) {
      if (!el) return '';
      // 如果 el 是一个包含了多个段落或正文容器的数组或节点，递归解析
      return cleanMarkdown(convert(el));
    },
  };
})();

// 消息与整场对话导出模块：支持 Markdown (.md)、Word (.doc / .docx 兼容格式)、PDF (.pdf 打印与保存)
DSWA.exporter = (() => {
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

  function exportMarkdown(title, text) {
    const filename = `${title.replace(/[\/\\?%*:|"<>]/g, '_')}_${getTimestamp()}.md`;
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    downloadBlob(blob, filename);
  }

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

  function getCleanHtml(el) {
    if (!el) return '';
    const clone = el.cloneNode(true);
    clone.querySelectorAll('.dswa-export-btn, .dswa-export-menu, .dswa-export-widget, button, svg, .ds-icon-button').forEach(n => n.remove());
    return clone.innerHTML;
  }

  function createExportWidget(getContentElement) {
    const container = document.createElement('div');
    container.className = 'dswa-export-widget';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dswa-export-btn';
    btn.title = '导出该回答为文档 (Markdown / Word / PDF)';
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
