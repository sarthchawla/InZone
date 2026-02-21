import { describe, it, expect } from 'vitest';
import { markdownToHtml, htmlToMarkdown } from './richtext-utils';

describe('markdownToHtml', () => {
  it('returns empty string for empty/falsy input', () => {
    expect(markdownToHtml('')).toBe('');
    expect(markdownToHtml(null as unknown as string)).toBe('');
    expect(markdownToHtml(undefined as unknown as string)).toBe('');
  });

  // Code blocks - the replacement captures content between ``` markers;
  // the closing </code></pre> may get wrapped by the paragraph regex on its own line
  it('converts fenced code blocks', () => {
    const md = '```js\nconst x = 1;\n```';
    const result = markdownToHtml(md);
    expect(result).toContain('<pre><code>const x = 1;');
    expect(result).toContain('</code></pre>');
  });

  it('converts fenced code blocks without language', () => {
    const md = '```\nhello\n```';
    const result = markdownToHtml(md);
    expect(result).toContain('<pre><code>hello');
    expect(result).toContain('</code></pre>');
  });

  // Headings
  it('converts h1', () => {
    expect(markdownToHtml('# Title')).toBe('<h1>Title</h1>');
  });

  it('converts h2', () => {
    expect(markdownToHtml('## Subtitle')).toBe('<h2>Subtitle</h2>');
  });

  it('converts h3', () => {
    expect(markdownToHtml('### Section')).toBe('<h3>Section</h3>');
  });

  // Horizontal rules
  it('converts horizontal rules', () => {
    expect(markdownToHtml('---')).toBe('<hr>');
  });

  // Bold + italic (inline formatting alone on a line starts with <, so paragraph regex skips it)
  it('converts bold+italic', () => {
    expect(markdownToHtml('***bolditalic***')).toBe('<strong><em>bolditalic</em></strong>');
  });

  it('converts bold+italic mixed with text', () => {
    expect(markdownToHtml('some ***bolditalic*** text')).toBe('<p>some <strong><em>bolditalic</em></strong> text</p>');
  });

  // Bold
  it('converts bold', () => {
    expect(markdownToHtml('**bold**')).toBe('<strong>bold</strong>');
  });

  it('converts bold mixed with text', () => {
    expect(markdownToHtml('some **bold** text')).toBe('<p>some <strong>bold</strong> text</p>');
  });

  // Italic
  it('converts italic', () => {
    expect(markdownToHtml('*italic*')).toBe('<em>italic</em>');
  });

  it('converts italic mixed with text', () => {
    expect(markdownToHtml('some *italic* text')).toBe('<p>some <em>italic</em> text</p>');
  });

  // Strikethrough
  it('converts strikethrough', () => {
    expect(markdownToHtml('~~struck~~')).toBe('<s>struck</s>');
  });

  // Inline code
  it('converts inline code', () => {
    expect(markdownToHtml('use `code` here')).toBe('<p>use <code>code</code> here</p>');
  });

  // Highlight
  it('converts highlight', () => {
    expect(markdownToHtml('==highlighted==')).toBe('<mark>highlighted</mark>');
  });

  it('converts highlight mixed with text', () => {
    expect(markdownToHtml('some ==highlighted== text')).toBe('<p>some <mark>highlighted</mark> text</p>');
  });

  // Task lists - checked non-empty
  it('converts checked task list item', () => {
    const result = markdownToHtml('- [x] done');
    expect(result).toContain('data-type="taskList"');
    expect(result).toContain('data-checked="true"');
    expect(result).toContain('<p>done</p>');
  });

  // Task lists - checked empty
  it('converts empty checked task list item', () => {
    const result = markdownToHtml('- [x]');
    expect(result).toContain('data-checked="true"');
    expect(result).toContain('<p></p>');
  });

  it('converts empty checked task list item with trailing spaces', () => {
    const result = markdownToHtml('- [x]   ');
    expect(result).toContain('data-checked="true"');
    expect(result).toContain('<p></p>');
  });

  // Task lists - unchecked non-empty
  it('converts unchecked task list item', () => {
    const result = markdownToHtml('- [ ] todo');
    expect(result).toContain('data-checked="false"');
    expect(result).toContain('<p>todo</p>');
  });

  // Task lists - unchecked empty
  it('converts empty unchecked task list item', () => {
    const result = markdownToHtml('- [ ]');
    expect(result).toContain('data-checked="false"');
    expect(result).toContain('<p></p>');
  });

  it('converts empty unchecked task list item with trailing spaces', () => {
    const result = markdownToHtml('- [ ]   ');
    expect(result).toContain('data-checked="false"');
    expect(result).toContain('<p></p>');
  });

  // Unordered lists
  it('converts unordered list with dash', () => {
    expect(markdownToHtml('- item')).toBe('<ul><li><p>item</p></li></ul>');
  });

  it('converts unordered list with asterisk', () => {
    expect(markdownToHtml('* item')).toBe('<ul><li><p>item</p></li></ul>');
  });

  // Ordered lists
  it('converts ordered list', () => {
    expect(markdownToHtml('1. first')).toBe('<ol><li><p>first</p></li></ol>');
  });

  it('converts multi-digit ordered list', () => {
    expect(markdownToHtml('10. tenth')).toBe('<ol><li><p>tenth</p></li></ol>');
  });

  // Blockquotes
  it('converts blockquotes', () => {
    expect(markdownToHtml('> quote')).toBe('<blockquote><p>quote</p></blockquote>');
  });

  // Links (link alone on a line starts with <a, so paragraph regex skips it)
  it('converts links', () => {
    expect(markdownToHtml('[text](http://url.com)')).toBe('<a href="http://url.com">text</a>');
  });

  it('converts links mixed with text', () => {
    expect(markdownToHtml('click [here](http://url.com) now')).toBe('<p>click <a href="http://url.com">here</a> now</p>');
  });

  // Paragraphs
  it('wraps plain text in paragraph tags', () => {
    expect(markdownToHtml('hello world')).toBe('<p>hello world</p>');
  });

  // Merging consecutive lists
  it('merges consecutive unordered list items', () => {
    const md = '- one\n- two';
    const result = markdownToHtml(md);
    expect(result).toBe('<ul><li><p>one</p></li><li><p>two</p></li></ul>');
    // Should NOT contain </ul><ul>
    expect(result).not.toContain('</ul><ul>');
  });

  it('merges consecutive ordered list items', () => {
    const md = '1. one\n2. two';
    const result = markdownToHtml(md);
    expect(result).toBe('<ol><li><p>one</p></li><li><p>two</p></li></ol>');
    expect(result).not.toContain('</ol><ol>');
  });

  it('merges consecutive task list items', () => {
    const md = '- [x] done\n- [ ] todo';
    const result = markdownToHtml(md);
    // The first </ul> and second <ul data-type="taskList"> should be merged
    expect(result).not.toContain('</ul>\n<ul data-type="taskList">');
  });

  it('merges consecutive blockquotes', () => {
    const md = '> line one\n> line two';
    const result = markdownToHtml(md);
    expect(result).not.toContain('</blockquote><blockquote>');
  });
});

describe('htmlToMarkdown', () => {
  it('returns empty string for empty/falsy input', () => {
    expect(htmlToMarkdown('')).toBe('');
    expect(htmlToMarkdown(null as unknown as string)).toBe('');
    expect(htmlToMarkdown(undefined as unknown as string)).toBe('');
  });

  // Headings
  it('converts h1 to markdown', () => {
    expect(htmlToMarkdown('<h1>Title</h1>')).toBe('# Title');
  });

  it('converts h2 to markdown', () => {
    expect(htmlToMarkdown('<h2>Sub</h2>')).toBe('## Sub');
  });

  it('converts h3 to markdown', () => {
    expect(htmlToMarkdown('<h3>Section</h3>')).toBe('### Section');
  });

  // Paragraph standalone
  it('converts standalone paragraph', () => {
    expect(htmlToMarkdown('<p>text</p>')).toBe('text');
  });

  // Paragraph nested in li (should not add newlines)
  it('converts paragraph inside li without extra newlines', () => {
    const result = htmlToMarkdown('<ul><li><p>item</p></li></ul>');
    expect(result).toBe('- item');
  });

  // Paragraph nested in blockquote
  it('converts paragraph inside blockquote without extra newlines', () => {
    const result = htmlToMarkdown('<blockquote><p>quoted</p></blockquote>');
    expect(result).toBe('> quoted');
  });

  // Strong
  it('converts strong to bold', () => {
    expect(htmlToMarkdown('<p><strong>bold</strong></p>')).toBe('**bold**');
  });

  // Em
  it('converts em to italic', () => {
    expect(htmlToMarkdown('<p><em>italic</em></p>')).toBe('*italic*');
  });

  // Strikethrough
  it('converts s to strikethrough', () => {
    expect(htmlToMarkdown('<p><s>struck</s></p>')).toBe('~~struck~~');
  });

  // Inline code (standalone, not inside pre)
  it('converts code to inline code', () => {
    expect(htmlToMarkdown('<p><code>snippet</code></p>')).toBe('`snippet`');
  });

  // Code inside pre (should not double-wrap)
  it('converts code inside pre without backticks', () => {
    const result = htmlToMarkdown('<pre><code>block code</code></pre>');
    expect(result).toBe('```\nblock code```');
  });

  // Pre
  it('converts pre to fenced code block', () => {
    const result = htmlToMarkdown('<pre>raw code</pre>');
    expect(result).toBe('```\nraw code```');
  });

  // Mark
  it('converts mark to highlight', () => {
    expect(htmlToMarkdown('<p><mark>highlighted</mark></p>')).toBe('==highlighted==');
  });

  // Link
  it('converts anchor to link', () => {
    expect(htmlToMarkdown('<a href="http://url.com">text</a>')).toBe('[text](http://url.com)');
  });

  it('converts anchor without href', () => {
    expect(htmlToMarkdown('<a>text</a>')).toBe('[text]()');
  });

  // Horizontal rule
  it('converts hr', () => {
    expect(htmlToMarkdown('<hr>')).toBe('---');
  });

  // Line break
  it('converts br to newline', () => {
    expect(htmlToMarkdown('<p>line1<br>line2</p>')).toBe('line1\nline2');
  });

  // Blockquote
  it('converts blockquote', () => {
    expect(htmlToMarkdown('<blockquote><p>quote</p></blockquote>')).toBe('> quote');
  });

  it('converts multiline blockquote', () => {
    const result = htmlToMarkdown('<blockquote>line1\nline2</blockquote>');
    expect(result).toBe('> line1\n> line2');
  });

  // Task list - checked
  it('converts checked task list', () => {
    const html = '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>done</p></li></ul>';
    expect(htmlToMarkdown(html)).toBe('- [x] done');
  });

  // Task list - unchecked
  it('converts unchecked task list', () => {
    const html = '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>todo</p></li></ul>';
    expect(htmlToMarkdown(html)).toBe('- [ ] todo');
  });

  // Regular unordered list
  it('converts ul to unordered list', () => {
    const html = '<ul><li><p>one</p></li><li><p>two</p></li></ul>';
    expect(htmlToMarkdown(html)).toBe('- one\n- two');
  });

  // Ordered list
  it('converts ol to ordered list', () => {
    const html = '<ol><li><p>first</p></li><li><p>second</p></li></ol>';
    expect(htmlToMarkdown(html)).toBe('1. first\n2. second');
  });

  // Text nodes
  it('handles text nodes directly', () => {
    expect(htmlToMarkdown('plain text')).toBe('plain text');
  });

  // Non-element nodes (comments)
  it('handles non-element non-text nodes (returns empty)', () => {
    // Comments in HTML are ignored in body parsing by DOMParser,
    // but we test that the function doesn't crash
    expect(htmlToMarkdown('<!-- comment -->text')).toBe('text');
  });

  // Label inside taskItem (tiptap specific) - should be skipped
  it('skips label inside taskItem', () => {
    const html = '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label>checkbox</label><div><p>content</p></div></li></ul>';
    expect(htmlToMarkdown(html)).toBe('- [x] content');
  });

  // Label outside taskItem - should pass through children
  it('passes through label children outside taskItem', () => {
    expect(htmlToMarkdown('<label>label text</label>')).toBe('label text');
  });

  // Input element - should return empty
  it('returns empty for input elements', () => {
    expect(htmlToMarkdown('<p>before<input>after</p>')).toBe('beforeafter');
  });

  // Div element - passes through children
  it('passes through div children', () => {
    expect(htmlToMarkdown('<div>content</div>')).toBe('content');
  });

  // Li element directly - passes through children
  it('passes through li children', () => {
    const html = '<ul><li>item text</li></ul>';
    expect(htmlToMarkdown(html)).toBe('- item text');
  });

  // Default/unknown tags - passes through children
  it('handles unknown tags by returning children', () => {
    expect(htmlToMarkdown('<span>inside span</span>')).toBe('inside span');
  });

  // Collapses triple+ newlines
  it('collapses multiple consecutive newlines', () => {
    const html = '<h1>Title</h1><h2>Sub</h2>';
    const result = htmlToMarkdown(html);
    expect(result).not.toMatch(/\n{3,}/);
  });

  // Multiple task list items
  it('converts multiple task list items', () => {
    const html = '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>a</p></li><li data-type="taskItem" data-checked="false"><p>b</p></li></ul>';
    expect(htmlToMarkdown(html)).toBe('- [x] a\n- [ ] b');
  });
});

describe('roundtrip', () => {
  it('preserves bold text through markdown->html->markdown', () => {
    const md = 'some **bold** text';
    const html = markdownToHtml(md);
    const back = htmlToMarkdown(html);
    expect(back).toBe(md);
  });

  it('preserves italic text through roundtrip', () => {
    const md = 'some *italic* text';
    const html = markdownToHtml(md);
    const back = htmlToMarkdown(html);
    expect(back).toBe(md);
  });

  it('preserves strikethrough through roundtrip', () => {
    const md = 'some ~~struck~~ text';
    const html = markdownToHtml(md);
    const back = htmlToMarkdown(html);
    expect(back).toBe(md);
  });

  it('preserves heading through roundtrip', () => {
    const md = '# Title';
    const html = markdownToHtml(md);
    const back = htmlToMarkdown(html);
    expect(back).toBe(md);
  });

  it('preserves unordered list through roundtrip', () => {
    const md = '- one\n- two';
    const html = markdownToHtml(md);
    const back = htmlToMarkdown(html);
    expect(back).toBe(md);
  });

  it('preserves ordered list through roundtrip', () => {
    const md = '1. first\n2. second';
    const html = markdownToHtml(md);
    const back = htmlToMarkdown(html);
    expect(back).toBe(md);
  });

  it('preserves link through roundtrip', () => {
    const md = 'click [text](http://url.com) now';
    const html = markdownToHtml(md);
    const back = htmlToMarkdown(html);
    expect(back).toBe(md);
  });
});
