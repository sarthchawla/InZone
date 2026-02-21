import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import { useEffect, useCallback } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Highlighter,
  Link as LinkIcon,
  Minus,
  CodeSquare,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
}

function markdownToHtml(markdown: string): string {
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

  // Task lists
  html = html.replace(/^- \[x\] (.+)$/gm, '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>$1</p></li></ul>');
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

function htmlToMarkdown(html: string): string {
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

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-2 md:p-1.5 rounded-lg text-stone-600 hover:bg-stone-200 hover:text-stone-900 transition-colors flex-shrink-0',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        isActive && 'bg-accent-light text-accent hover:bg-accent-light'
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Write something...',
  editable = true,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-accent underline cursor-pointer' },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight,
      Typography,
    ],
    content: markdownToHtml(content),
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const md = htmlToMarkdown(html);
      onChange(md);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-3 py-2',
      },
    },
  });

  // Sync content from outside
  useEffect(() => {
    if (editor && !editor.isFocused) {
      const currentMd = htmlToMarkdown(editor.getHTML());
      if (currentMd !== content) {
        editor.commands.setContent(markdownToHtml(content));
      }
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={cn('border border-stone-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent transition-colors', className)}>
      {/* Toolbar — horizontally scrollable on mobile */}
      {editable && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-stone-200 bg-stone-50 overflow-x-auto">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive('code')}
            title="Inline Code"
          >
            <Code className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            isActive={editor.isActive('highlight')}
            title="Highlight"
          >
            <Highlighter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={setLink}
            isActive={editor.isActive('link')}
            title="Add Link"
          >
            <LinkIcon className="h-4 w-4" />
          </ToolbarButton>

          <div className="w-px h-5 bg-stone-300 mx-1 flex-shrink-0" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>

          <div className="w-px h-5 bg-stone-300 mx-1 flex-shrink-0" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Ordered List"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive('taskList')}
            title="Task List"
          >
            <CheckSquare className="h-4 w-4" />
          </ToolbarButton>

          <div className="w-px h-5 bg-stone-300 mx-1 flex-shrink-0" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="Blockquote"
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            title="Code Block"
          >
            <CodeSquare className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Rule"
          >
            <Minus className="h-4 w-4" />
          </ToolbarButton>
        </div>
      )}

      {/* Bubble menu for text selection */}
      {editable && (
        <BubbleMenu editor={editor}>
          <div className="flex items-center gap-0.5 bg-stone-900 rounded-xl px-1.5 py-1 shadow-lg">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="Bold"
              className={cn(
                'p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-700 transition-colors',
                editor.isActive('bold') && 'text-white bg-stone-700'
              )}
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="Italic"
              className={cn(
                'p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-700 transition-colors',
                editor.isActive('italic') && 'text-white bg-stone-700'
              )}
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              title="Strikethrough"
              className={cn(
                'p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-700 transition-colors',
                editor.isActive('strike') && 'text-white bg-stone-700'
              )}
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCode().run()}
              title="Inline Code"
              className={cn(
                'p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-700 transition-colors',
                editor.isActive('code') && 'text-white bg-stone-700'
              )}
            >
              <Code className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              title="Highlight"
              className={cn(
                'p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-700 transition-colors',
                editor.isActive('highlight') && 'text-white bg-stone-700'
              )}
            >
              <Highlighter className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={setLink}
              title="Add Link"
              className={cn(
                'p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-700 transition-colors',
                editor.isActive('link') && 'text-white bg-stone-700'
              )}
            >
              <LinkIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </BubbleMenu>
      )}

      {/* Editor content */}
      <EditorContent editor={editor} data-testid="rich-text-editor" />
    </div>
  );
}
