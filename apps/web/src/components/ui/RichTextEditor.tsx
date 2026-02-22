import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import { useEffect, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { markdownToHtml, htmlToMarkdown } from '../../lib/richtext-utils';
import { EditorToolbar, EditorBubbleMenu } from '../richtext/RichTextEditorToolbar';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  /** Compact mode: no border, no min-height, fits content size */
  compact?: boolean;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Write something...',
  editable = true,
  className,
  compact = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline cursor-pointer' },
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
        class: compact
          ? 'prose prose-sm max-w-none focus:outline-none px-1 py-0.5 text-xs'
          : 'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-3 py-2',
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
    <div className={cn(
      compact
        ? 'rounded-lg overflow-hidden'
        : 'border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-ring/30 focus-within:border-primary transition-colors',
      className
    )}>
      {/* Toolbar — hidden in compact mode */}
      {editable && !compact && (
        <EditorToolbar editor={editor} setLink={setLink} />
      )}

      {/* Bubble menu for text selection */}
      {editable && (
        <EditorBubbleMenu editor={editor} setLink={setLink} />
      )}

      {/* Editor content */}
      <EditorContent editor={editor} data-testid="rich-text-editor" />
    </div>
  );
}
