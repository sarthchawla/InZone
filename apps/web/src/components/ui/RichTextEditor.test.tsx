import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../test/utils";

// Mock all tiptap modules before importing the component
vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn().mockReturnValue(null),
  EditorContent: () => null,
}));

vi.mock("@tiptap/react/menus", () => ({
  BubbleMenu: () => null,
}));

vi.mock("@tiptap/starter-kit", () => ({
  default: { configure: vi.fn().mockReturnValue({}) },
}));

vi.mock("@tiptap/extension-placeholder", () => ({
  default: { configure: vi.fn().mockReturnValue({}) },
}));

vi.mock("@tiptap/extension-link", () => ({
  default: { configure: vi.fn().mockReturnValue({}) },
}));

vi.mock("@tiptap/extension-task-list", () => ({
  default: {},
}));

vi.mock("@tiptap/extension-task-item", () => ({
  default: { configure: vi.fn().mockReturnValue({}) },
}));

vi.mock("@tiptap/extension-highlight", () => ({
  default: {},
}));

vi.mock("@tiptap/extension-typography", () => ({
  default: {},
}));

import { RichTextEditor } from "./RichTextEditor";

describe("RichTextEditor", () => {
  const defaultProps = {
    content: "",
    onChange: vi.fn(),
  };

  it("renders without crashing when editor is null", () => {
    render(<RichTextEditor {...defaultProps} />);
    // When useEditor returns null, the component returns null early
    // so no rich-text-editor element should be in the DOM
    expect(screen.queryByTestId("rich-text-editor")).not.toBeInTheDocument();
  });

  it("handles content and onChange props without errors", () => {
    const onChange = vi.fn();
    render(
      <RichTextEditor content="Some markdown" onChange={onChange} />
    );
    // Still renders null because the mocked editor is null
    expect(screen.queryByTestId("rich-text-editor")).not.toBeInTheDocument();
  });
});
