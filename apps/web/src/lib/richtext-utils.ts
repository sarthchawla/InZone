export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  let html = markdown;

  // Code blocks (must be before inline code)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');
  // Inline code
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');
  // Highlight
  html = html.replace(/==(.+?)==/g, '<mark>$1</mark>');

  // Task lists — handle both empty and non-empty task items
  // Empty checked: - [x]  (with optional trailing whitespace)
  html = html.replace(/^- \[x\]\s*$/gm, '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p></p></li></ul>');
  // Non-empty checked: - [x] some text
  html = html.replace(/^- \[x\] (.+)$/gm, '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>$1</p></li></ul>');
  // Empty unchecked: - [ ]  (with optional trailing whitespace)
  html = html.replace(/^- \[ \]\s*$/gm, '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p></p></li></ul>');
  // Non-empty unchecked: - [ ] some text
  html = html.replace(/^- \[ \] (.+)$/gm, '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>$1</p></li></ul>');

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<ul><li><p>$1</p></li></ul>');
  html = html.replace(/^\* (.+)$/gm, '<ul><li><p>$1</p></li></ul>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<ol><li><p>$1</p></li></ol>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>');

  // Links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  // Paragraphs - wrap remaining lines
  html = html.replace(/^(?!<[a-z])((?!^\s*$).+)$/gm, '<p>$1</p>');

  // Merge consecutive same-type list items
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  html = html.replace(/<\/ol>\s*<ol>/g, '');
  html = html.replace(/<\/ul>\s*<ul data-type="taskList">/g, '');
  html = html.replace(/<\/blockquote>\s*<blockquote>/g, '');

  return html;
}

export function htmlToMarkdown(html: string): string {
  if (!html) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    const children = Array.from(el.childNodes).map(processNode).join('');

    switch (tag) {
      case 'h1': return `# ${children}\n\n`;
      case 'h2': return `## ${children}\n\n`;
      case 'h3': return `### ${children}\n\n`;
      case 'p': {
        const parent = el.parentElement;
        if (parent && (parent.tagName === 'LI' || parent.tagName === 'BLOCKQUOTE')) {
          return children;
        }
        return `${children}\n\n`;
      }
      case 'strong': return `**${children}**`;
      case 'em': return `*${children}*`;
      case 's': return `~~${children}~~`;
      case 'code': {
        if (el.parentElement?.tagName === 'PRE') return children;
        return `\`${children}\``;
      }
      case 'pre': return `\`\`\`\n${children}\`\`\`\n\n`;
      case 'mark': return `==${children}==`;
      case 'a': return `[${children}](${el.getAttribute('href') || ''})`;
      case 'hr': return `---\n\n`;
      case 'br': return '\n';
      case 'blockquote': {
        const lines = children.trim().split('\n');
        return lines.map(line => `> ${line}`).join('\n') + '\n\n';
      }
      case 'label': {
        // Skip checkbox labels rendered by tiptap's TaskItem
        if (el.closest('[data-type="taskItem"]')) return '';
        return children;
      }
      case 'input': return '';
      case 'div': {
        // Tiptap wraps task item content in a <div>; just pass through children
        return children;
      }
      case 'ul': {
        if (el.getAttribute('data-type') === 'taskList') {
          return Array.from(el.children).map(li => {
            const checked = li.getAttribute('data-checked') === 'true';
            const text = Array.from(li.childNodes).map(processNode).join('').trim();
            return `- [${checked ? 'x' : ' '}] ${text}`;
          }).join('\n') + '\n\n';
        }
        return Array.from(el.children).map(li => {
          const text = Array.from(li.childNodes).map(processNode).join('').trim();
          return `- ${text}`;
        }).join('\n') + '\n\n';
      }
      case 'ol': {
        return Array.from(el.children).map((li, i) => {
          const text = Array.from(li.childNodes).map(processNode).join('').trim();
          return `${i + 1}. ${text}`;
        }).join('\n') + '\n\n';
      }
      case 'li': return children;
      default: return children;
    }
  }

  const result = Array.from(doc.body.childNodes).map(processNode).join('');
  return result.replace(/\n{3,}/g, '\n\n').trim();
}
