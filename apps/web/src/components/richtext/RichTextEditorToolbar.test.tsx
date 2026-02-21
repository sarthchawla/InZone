import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import { EditorToolbar } from './RichTextEditorToolbar';

// Mock BubbleMenu since we're only testing EditorToolbar
vi.mock('@tiptap/react/menus', () => ({
  BubbleMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function createMockEditor(activeMarks: string[] = []) {
  const chainMethods = {
    focus: vi.fn().mockReturnThis(),
    toggleBold: vi.fn().mockReturnThis(),
    toggleItalic: vi.fn().mockReturnThis(),
    toggleStrike: vi.fn().mockReturnThis(),
    toggleCode: vi.fn().mockReturnThis(),
    toggleHighlight: vi.fn().mockReturnThis(),
    toggleHeading: vi.fn().mockReturnThis(),
    toggleBulletList: vi.fn().mockReturnThis(),
    toggleOrderedList: vi.fn().mockReturnThis(),
    toggleTaskList: vi.fn().mockReturnThis(),
    toggleBlockquote: vi.fn().mockReturnThis(),
    toggleCodeBlock: vi.fn().mockReturnThis(),
    setHorizontalRule: vi.fn().mockReturnThis(),
    run: vi.fn(),
  };

  return {
    chain: vi.fn(() => chainMethods),
    isActive: vi.fn((mark: string) => activeMarks.includes(mark)),
    _chainMethods: chainMethods,
  } as unknown as import('@tiptap/react').Editor & { _chainMethods: typeof chainMethods };
}

describe('EditorToolbar', () => {
  it('renders all toolbar buttons', () => {
    const editor = createMockEditor();
    const setLink = vi.fn();
    render(<EditorToolbar editor={editor} setLink={setLink} />);

    expect(screen.getByTitle('Bold (Ctrl+B)')).toBeInTheDocument();
    expect(screen.getByTitle('Italic (Ctrl+I)')).toBeInTheDocument();
    expect(screen.getByTitle('Strikethrough')).toBeInTheDocument();
    expect(screen.getByTitle('Inline Code')).toBeInTheDocument();
    expect(screen.getByTitle('Highlight')).toBeInTheDocument();
    expect(screen.getByTitle('Add Link')).toBeInTheDocument();
    expect(screen.getByTitle('Heading 2')).toBeInTheDocument();
    expect(screen.getByTitle('Heading 3')).toBeInTheDocument();
    expect(screen.getByTitle('Bullet List')).toBeInTheDocument();
    expect(screen.getByTitle('Ordered List')).toBeInTheDocument();
    expect(screen.getByTitle('Task List')).toBeInTheDocument();
    expect(screen.getByTitle('Blockquote')).toBeInTheDocument();
    expect(screen.getByTitle('Code Block')).toBeInTheDocument();
    expect(screen.getByTitle('Horizontal Rule')).toBeInTheDocument();
  });

  it('calls editor chain on bold button click', () => {
    const editor = createMockEditor();
    const setLink = vi.fn();
    render(<EditorToolbar editor={editor} setLink={setLink} />);

    fireEvent.click(screen.getByTitle('Bold (Ctrl+B)'));
    expect(editor.chain).toHaveBeenCalled();
    expect(editor._chainMethods.toggleBold).toHaveBeenCalled();
    expect(editor._chainMethods.run).toHaveBeenCalled();
  });

  it('calls setLink on link button click', () => {
    const editor = createMockEditor();
    const setLink = vi.fn();
    render(<EditorToolbar editor={editor} setLink={setLink} />);

    fireEvent.click(screen.getByTitle('Add Link'));
    expect(setLink).toHaveBeenCalled();
  });

  it('applies active styling when marks are active', () => {
    const editor = createMockEditor(['bold', 'italic']);
    const setLink = vi.fn();
    render(<EditorToolbar editor={editor} setLink={setLink} />);

    expect(editor.isActive).toHaveBeenCalledWith('bold');
    expect(editor.isActive).toHaveBeenCalledWith('italic');
  });

  it('calls appropriate chain methods for each button', () => {
    const editor = createMockEditor();
    const setLink = vi.fn();
    render(<EditorToolbar editor={editor} setLink={setLink} />);

    fireEvent.click(screen.getByTitle('Italic (Ctrl+I)'));
    expect(editor._chainMethods.toggleItalic).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Strikethrough'));
    expect(editor._chainMethods.toggleStrike).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Inline Code'));
    expect(editor._chainMethods.toggleCode).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Highlight'));
    expect(editor._chainMethods.toggleHighlight).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Heading 2'));
    expect(editor._chainMethods.toggleHeading).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Bullet List'));
    expect(editor._chainMethods.toggleBulletList).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Ordered List'));
    expect(editor._chainMethods.toggleOrderedList).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Task List'));
    expect(editor._chainMethods.toggleTaskList).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Blockquote'));
    expect(editor._chainMethods.toggleBlockquote).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Code Block'));
    expect(editor._chainMethods.toggleCodeBlock).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Horizontal Rule'));
    expect(editor._chainMethods.setHorizontalRule).toHaveBeenCalled();
  });
});
