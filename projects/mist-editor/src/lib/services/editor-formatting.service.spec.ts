import { EditorFormattingService } from './editor-formatting.service';
import { EditorUtilsService } from './editor-utils.service';
import { SanitizationService } from './sanitization.service';
import { BlockDocumentService } from './block-document.service';

describe('EditorFormattingService', () => {
  let service: EditorFormattingService;
  let utilsService: any;
  let sanitizationService: any;
  let blocksService: BlockDocumentService;
  let editor: HTMLElement;

  beforeEach(() => {
    utilsService = new EditorUtilsService();
    sanitizationService = {
      sanitizeEditorContent: vi.fn(),
      sanitizeTrustedHtml: vi.fn(),
      sanitizeImageUrl: vi.fn(),
      isSafeStyleValue: vi.fn((property: string, value: string) => {
        if (!value?.trim() || value.includes('expression(')) return false;
        return property === 'color' || property === 'background-color';
      })
    };
    blocksService = new BlockDocumentService();

    service = new EditorFormattingService(utilsService, sanitizationService, blocksService);

    editor = document.createElement('div');
    editor.contentEditable = 'true';
    document.body.appendChild(editor);
  });

  afterEach(() => {
    if (editor && editor.parentNode) {
      document.body.removeChild(editor);
    }
    window.getSelection()?.removeAllRanges();
  });

  describe('toggleInlineFormat', () => {
    it('should wrap selected text with format tag when not active', () => {
      editor.innerHTML = '<p>Hello World</p>';
      const textNode = editor.querySelector('p')!.firstChild!;
      
      selectRange(textNode, 0, textNode, 5);
      
      service.toggleInlineFormat(editor, 'STRONG');
      
      expect(editor.innerHTML).toContain('<strong>');
    });

    it('should unwrap text when format is already active', () => {
      editor.innerHTML = '<p>Hello <strong>World</strong></p>';
      const strong = editor.querySelector('strong')!;
      selectNodeContents(strong);

      service.toggleInlineFormat(editor, 'STRONG');

      expect(editor.querySelector('strong')).toBeFalsy();
      expect(editor.textContent).toContain('World');
    });

    it('should toggle bold off when selection uses a b tag', () => {
      editor.innerHTML = '<p>Hello <b>World</b></p>';
      const bold = editor.querySelector('b')!;
      selectNodeContents(bold);

      service.toggleInlineFormat(editor, 'STRONG');

      expect(editor.querySelector('b')).toBeFalsy();
      expect(editor.querySelector('strong')).toBeFalsy();
    });

    it('should toggle bold on and off for the same selection', () => {
      editor.innerHTML = '<p>Toggle me</p>';
      const textNode = editor.querySelector('p')!.firstChild!;
      selectRange(textNode, 0, textNode, 9);

      service.toggleInlineFormat(editor, 'STRONG');
      expect(editor.querySelector('strong')).toBeTruthy();

      service.toggleInlineFormat(editor, 'STRONG');
      expect(editor.querySelector('strong')).toBeFalsy();
      expect(editor.textContent).toContain('Toggle me');
    });

    it('should toggle italic on and off for the same selection', () => {
      editor.innerHTML = '<p>Toggle me</p>';
      const textNode = editor.querySelector('p')!.firstChild!;
      selectRange(textNode, 0, textNode, 9);

      service.toggleInlineFormat(editor, 'EM');
      expect(editor.querySelector('em')).toBeTruthy();

      service.toggleInlineFormat(editor, 'EM');
      expect(editor.querySelector('em')).toBeFalsy();
    });

    it('should handle selections spanning partial elements', () => {
      editor.innerHTML = '<p>Hello</p><p>World</p>';
      const range = document.createRange();
      range.setStart(editor.querySelector('p')!.firstChild!, 2);
      range.setEnd(editor.querySelectorAll('p')[1].firstChild!, 3);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      utilsService.findParentBlock = vi.fn().mockReturnValue(editor.querySelector('p'));

      service.toggleInlineFormat(editor, 'EM');

      expect(editor.querySelector('em')).toBeTruthy();
    });

    it('should not format when selection is collapsed', () => {
      editor.innerHTML = '<p>Hello World</p>';
      const textNode = editor.querySelector('p')!.firstChild!;
      
      // Collapsed selection
      selectRange(textNode, 0, textNode, 0);
      
      service.toggleInlineFormat(editor, 'STRONG');
      
      expect(editor.innerHTML).not.toContain('<strong>');
    });
  });

  describe('setBlockType', () => {
    it('should convert paragraph to heading', () => {
      editor.innerHTML = '<p>Text</p>';
      const p = editor.querySelector('p')!;
      selectNode(p);
      
      service.setBlockType(editor, 'H1');
      
      expect(editor.innerHTML).toContain('<h1>');
      expect(editor.innerHTML).not.toContain('<p>');
    });

    it('should preserve text alignment when converting blocks', () => {
      editor.innerHTML = '<p style="text-align: center">Centered</p>';
      const p = editor.querySelector('p')!;
      selectNode(p);

      service.setBlockType(editor, 'H2');

      const h2 = editor.querySelector('h2');
      expect(h2?.style.textAlign).toBe('center');
    });

    it('should preserve data-mist-block when converting blocks', () => {
      editor.innerHTML = '<p data-mist-block="b_keep">Text</p>';
      const p = editor.querySelector('p')!;
      selectNode(p);

      service.setBlockType(editor, 'H1');

      const h1 = editor.querySelector('h1');
      expect(h1?.getAttribute('data-mist-block')).toBe('b_keep');
    });

    it('should insert a new block when no parent block exists', () => {
      editor.innerHTML = 'Plain text';
      const textNode = editor.firstChild!;
      selectRange(textNode, 0, textNode, 5);

      service.setBlockType(editor, 'H3');

      expect(editor.querySelector('h3')).toBeTruthy();
    });

    it('should insert an empty block for collapsed selection without a parent block', () => {
      editor.innerHTML = 'Plain';
      const textNode = editor.firstChild!;
      selectRange(textNode, 0, textNode, 0);

      service.setBlockType(editor, 'P');

      expect(editor.querySelector('p')).toBeTruthy();
    });
  });

  describe('setTextAlignment', () => {
    it('should set text alignment on block element', () => {
      editor.innerHTML = '<p>Text</p>';
      const p = editor.querySelector('p')!;
      selectNode(p);
      
      service.setTextAlignment(editor, 'center');
      
      expect(p.style.textAlign).toBe('center');
    });

    it('should set alignment on table cell when inside a cell', () => {
      editor.innerHTML = '<table><tr><td>Cell content</td></tr></table>';
      const td = editor.querySelector('td')!;
      selectNode(td);

      service.setTextAlignment(editor, 'right');

      expect(td.style.textAlign).toBe('right');
    });

    it('should wrap selection in a paragraph when no block or cell exists', () => {
      editor.innerHTML = 'Loose text';
      const textNode = editor.firstChild!;
      selectRange(textNode, 0, textNode, 5);

      service.setTextAlignment(editor, 'center');

      const p = editor.querySelector('p');
      expect(p?.style.textAlign).toBe('center');
    });
  });

  describe('applyStyle', () => {
    it('should wrap selection with styled span', () => {
      editor.innerHTML = '<p>Hello World</p>';
      const textNode = editor.querySelector('p')!.firstChild!;
      selectRange(textNode, 0, textNode, 5);
      
      service.applyStyle(editor, 'color', '#FF0000');
      
      const span = editor.querySelector('span');
      expect(span).toBeTruthy();
      expect(span?.style.color).toBe('rgb(255, 0, 0)');
    });

    it('should not apply style when selection is collapsed', () => {
      editor.innerHTML = '<p>Hello World</p>';
      const textNode = editor.querySelector('p')!.firstChild!;
      selectRange(textNode, 0, textNode, 0);

      service.applyStyle(editor, 'color', '#FF0000');

      expect(editor.querySelector('span')).toBeFalsy();
    });
    it('should not apply unsafe color values', () => {
      editor.innerHTML = '<p>Hello World</p>';
      const textNode = editor.querySelector('p')!.firstChild!;
      selectRange(textNode, 0, textNode, 5);

      service.applyStyle(editor, 'color', 'expression(alert(1))');

      expect(editor.querySelector('span')).toBeFalsy();
    });
  });

  describe('removeStyleFromSelection', () => {
    it('should remove inline styles from selected content', () => {
      editor.innerHTML = '<p><span style="color: red">Styled</span> plain</p>';
      const p = editor.querySelector('p')!;
      selectNode(p);

      service.removeStyleFromSelection(editor, 'color');

      expect(editor.querySelector('span')).toBeFalsy();
      expect(editor.textContent).toContain('Styled');
    });
  });

  describe('applyCodeFormatting', () => {
    it('should wrap selected text in a code element', () => {
      editor.innerHTML = '<p>const value = 1;</p>';
      const textNode = editor.querySelector('p')!.firstChild!;
      selectRange(textNode, 0, textNode, 5);

      service.applyCodeFormatting();

      expect(editor.querySelector('code')?.textContent).toBe('const');
    });
  });

  describe('insertModernImage', () => {
    it('should insert image with sanitized URL', () => {
      editor.innerHTML = '<p>Text</p>';
      const p = editor.querySelector('p')!;
      selectNode(p);
      
      sanitizationService.sanitizeImageUrl.mockReturnValue('https://example.com/image.png');
      
      service.insertModernImage('https://example.com/image.png');
      
      const img = editor.querySelector('img');
      expect(img).toBeTruthy();
      expect(img?.src).toContain('example.com/image.png');
      expect(img?.style.maxWidth).toBe('100%');
    });

    it('should not insert image when URL is invalid', () => {
      editor.innerHTML = '<p>Text</p>';
      const p = editor.querySelector('p')!;
      selectNode(p);
      
      sanitizationService.sanitizeImageUrl.mockReturnValue(null);
      
      service.insertModernImage('javascript:alert(1)');
      
      expect(editor.querySelector('img')).toBeFalsy();
    });
  });

  describe('insertModernHTML', () => {
    it('should sanitize and insert HTML', async () => {
      editor.innerHTML = '<p>Text</p>';
      const p = editor.querySelector('p')!;
      selectNode(p);

      const htmlToInsert = '<div>New content</div>';
      sanitizationService.sanitizeEditorContent.mockReturnValue(htmlToInsert);

      service.insertModernHTML(htmlToInsert);

      expect(sanitizationService.sanitizeEditorContent).toHaveBeenCalledWith(htmlToInsert);
      expect(editor.innerHTML).toContain('New content');

      await flushPendingTimers();
    });
  });

  describe('insertBlock', () => {
    it('should use trusted sanitization for panel content', async () => {
      editor.innerHTML = '<p>Text</p>';
      const p = editor.querySelector('p')!;
      selectNode(p);

      const panelHtml = '<div class="editor-panel">Panel</div>';
      sanitizationService.sanitizeTrustedHtml.mockReturnValue(panelHtml);

      service.insertBlock(editor, panelHtml, true);

      expect(sanitizationService.sanitizeTrustedHtml).toHaveBeenCalledWith(panelHtml);

      await flushPendingTimers();
    });

    it('should use regular sanitization for user content', async () => {
      editor.innerHTML = '<p>Text</p>';
      const p = editor.querySelector('p')!;
      selectNode(p);

      const userHtml = '<div>User content</div>';
      sanitizationService.sanitizeEditorContent.mockReturnValue(userHtml);

      service.insertBlock(editor, userHtml);

      expect(sanitizationService.sanitizeEditorContent).toHaveBeenCalledWith(userHtml);

      await flushPendingTimers();
    });

    it('should not use trusted sanitization for table-like user content by default', async () => {
      editor.innerHTML = '<p>Text</p>';
      const p = editor.querySelector('p')!;
      selectNode(p);

      const maliciousTable = '<table onclick="alert(1)"><tr><td>x</td></tr></table>';
      sanitizationService.sanitizeEditorContent.mockReturnValue('<table><tr><td>x</td></tr></table>');

      service.insertBlock(editor, maliciousTable);

      expect(sanitizationService.sanitizeEditorContent).toHaveBeenCalledWith(maliciousTable);
      expect(sanitizationService.sanitizeTrustedHtml).not.toHaveBeenCalled();

      await flushPendingTimers();
    });

    it('should split a paragraph when inserting a block inside it', async () => {
      editor.innerHTML = '<p>Before middle after</p>';
      const textNode = editor.querySelector('p')!.firstChild!;
      selectRange(textNode, 7, textNode, 12);

      const blockHtml = '<div class="editor-panel">Panel</div>';
      sanitizationService.sanitizeTrustedHtml.mockReturnValue(blockHtml);

      service.insertBlock(editor, blockHtml, true);

      expect(editor.querySelector('.editor-panel')).toBeTruthy();
      expect(editor.querySelectorAll('p').length).toBe(2);

      await flushPendingTimers();
    });

    it('should use trusted sanitization for table content', async () => {
      editor.innerHTML = '<p>Text</p>';
      const p = editor.querySelector('p')!;
      selectNode(p);

      const tableHtml = '<table><tr><td>Cell</td></tr></table>';
      sanitizationService.sanitizeTrustedHtml.mockReturnValue(tableHtml);

      service.insertBlock(editor, tableHtml, true);

      expect(sanitizationService.sanitizeTrustedHtml).toHaveBeenCalledWith(tableHtml);
      expect(editor.querySelector('table')).toBeTruthy();

      await flushPendingTimers();
    });

    it('should insert at the range when block parent is not a paragraph', async () => {
      editor.innerHTML = '<h1>Title</h1>';
      const h1 = editor.querySelector('h1')!;
      selectNode(h1);

      const blockHtml = '<div>Block</div>';
      sanitizationService.sanitizeEditorContent.mockReturnValue(blockHtml);

      service.insertBlock(editor, blockHtml);

      expect(sanitizationService.sanitizeEditorContent).toHaveBeenCalledWith(blockHtml);
      expect(editor.querySelector('div')).toBeTruthy();

      await flushPendingTimers();
    });

    it('should no-op when sanitized block content is empty', () => {
      editor.innerHTML = '<p>Text</p>';
      const p = editor.querySelector('p')!;
      selectNode(p);
      sanitizationService.sanitizeEditorContent.mockReturnValue('');

      service.insertBlock(editor, '<div></div>');

      expect(editor.querySelector('div')).toBeFalsy();
    });
  });

  describe('insertCodeBlock', () => {
    it('should convert paragraph to code block', () => {
      editor.innerHTML = '<p>const x = 1;</p>';
      const p = editor.querySelector('p')!;
      selectNode(p);
      
      service.insertCodeBlock(editor);
      
      const pre = editor.querySelector('pre');
      const code = pre?.querySelector('code');
      expect(pre).toBeTruthy();
      expect(code).toBeTruthy();
      expect(code?.textContent).toContain('const x = 1;');
    });

    it('should convert code block back to paragraph', () => {
      editor.innerHTML = '<pre contenteditable="true"><code>const x = 1;</code></pre>';
      const pre = editor.querySelector('pre')!;
      selectNode(pre);
      
      service.insertCodeBlock(editor);
      
      const p = editor.querySelector('p');
      expect(p).toBeTruthy();
      expect(editor.querySelector('pre')).toBeFalsy();
    });

    it('should add following paragraph after code block for easy exit', () => {
      editor.innerHTML = '<p>Text</p>';
      const p = editor.querySelector('p')!;
      selectNode(p);

      service.insertCodeBlock(editor);

      const pre = editor.querySelector('pre');
      expect(pre?.nextElementSibling?.tagName).toBe('P');
    });

    it('should insert a new code block when no parent block exists', () => {
      editor.innerHTML = 'Loose text';
      const textNode = editor.firstChild!;
      selectRange(textNode, 0, textNode, 0);

      service.insertCodeBlock(editor);

      expect(editor.querySelector('pre code')).toBeTruthy();
      expect(editor.querySelector('pre')?.nextElementSibling?.tagName).toBe('P');
    });

    it('should append a following paragraph when the code block is last in the editor', () => {
      editor.innerHTML = '<p>Intro</p>';
      const p = editor.querySelector('p')!;
      selectNode(p);

      service.insertCodeBlock(editor);

      const pre = editor.querySelector('pre');
      expect(pre).toBeTruthy();
      expect(editor.lastElementChild?.tagName).toBe('P');
    });

    it('should not add an extra paragraph when one already follows the code block', () => {
      editor.innerHTML = '<p>Intro</p><p>Next</p>';
      const firstParagraph = editor.querySelector('p')!;
      selectNode(firstParagraph);

      service.insertCodeBlock(editor);

      expect(editor.querySelector('pre')).toBeTruthy();
      expect(editor.querySelectorAll('p').length).toBe(1);
      expect(editor.querySelector('p')?.textContent).toContain('Next');
    });

    it('should unwrap pre blocks without nested code elements', () => {
      editor.innerHTML = '<pre contenteditable="true">raw code</pre>';
      const pre = editor.querySelector('pre')!;
      selectNode(pre);

      service.insertCodeBlock(editor);

      expect(editor.querySelector('p')?.textContent).toContain('raw code');
    });
  });

  describe('handleListCommand', () => {
    it('should create unordered list from paragraph', () => {
      editor.innerHTML = '<p>Item</p>';
      const p = editor.querySelector('p')!;
      selectNode(p);
      
      vi.spyOn(utilsService, 'findParentBlock').mockReturnValue(p);
      
      service.handleListCommand(editor, 'UL');
      
      expect(editor.querySelector('ul')).toBeTruthy();
      expect(editor.querySelector('li')).toBeTruthy();
    });

    it('should create ordered list from paragraph', () => {
      editor.innerHTML = '<p>Item</p>';
      const p = editor.querySelector('p')!;
      selectNode(p);

      vi.spyOn(utilsService, 'findParentBlock').mockReturnValue(p);

      service.handleListCommand(editor, 'OL');

      expect(editor.querySelector('ol')).toBeTruthy();
      expect(editor.querySelector('li')).toBeTruthy();
    });

    it('should keep the cursor inside the list item after creating a list', () => {
      editor.innerHTML = '<p>First</p><p>Second item</p>';
      const second = editor.querySelectorAll('p')[1];
      selectNode(second);

      vi.spyOn(utilsService, 'findParentBlock').mockReturnValue(second);

      service.handleListCommand(editor, 'OL');

      const list = editor.querySelector('ol');
      const selection = window.getSelection();
      expect(list).toBeTruthy();
      expect(list?.contains(selection?.anchorNode ?? null)).toBe(true);
    });

    it('should preserve data-mist-block when converting a paragraph to a list', () => {
      editor.innerHTML = '<p data-mist-block="b_list">Item</p>';
      const p = editor.querySelector('p')!;
      selectNode(p);

      vi.spyOn(utilsService, 'findParentBlock').mockReturnValue(p);

      service.handleListCommand(editor, 'UL');

      expect(editor.querySelector('ul')?.getAttribute('data-mist-block')).toBe('b_list');
    });

    it('should convert an existing list to a paragraph', () => {
      editor.innerHTML = '<ul><li>Item</li></ul>';
      const li = editor.querySelector('li')!;
      selectNode(li);

      service.handleListCommand(editor, 'UL');

      expect(editor.querySelector('ul')).toBeFalsy();
      expect(editor.querySelector('p')).toBeTruthy();
    });

    it('should convert list type when command differs', () => {
      editor.innerHTML = '<ul><li>Item</li></ul>';
      const li = editor.querySelector('li')!;
      selectNode(li);

      service.handleListCommand(editor, 'OL');

      expect(editor.querySelector('ol')).toBeTruthy();
      expect(editor.querySelector('ul')).toBeFalsy();
    });
  });

  describe('clearModernFormatting', () => {
    it('should remove inline formatting tags', () => {
      editor.innerHTML = '<p>Text with <strong>bold</strong> and <em>italic</em></p>';
      const p = editor.querySelector('p')!;
      selectNode(p);
      
      service.clearModernFormatting();
      
      expect(editor.innerHTML).not.toContain('<strong>');
      expect(editor.innerHTML).not.toContain('<em>');
    });

    it('should not clear formatting when selection is collapsed', () => {
      editor.innerHTML = '<p>Text with <strong>bold</strong></p>';
      const textNode = editor.querySelector('p')!.firstChild!;
      selectRange(textNode, 0, textNode, 0);

      const originalHtml = editor.innerHTML;
      service.clearModernFormatting();

      expect(editor.innerHTML).toBe(originalHtml);
    });

    it('should unwrap span elements left after stripping inline tags', () => {
      editor.innerHTML = '<p><span style="color: red">Red</span></p>';
      const p = editor.querySelector('p')!;
      selectNode(p);

      service.clearModernFormatting();

      expect(editor.querySelector('span')).toBeFalsy();
      expect(editor.textContent).toContain('Red');
    });
  });

  // Helper functions
  function flushPendingTimers(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  function selectNodeContents(node: Node) {
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function selectNode(node: Node) {
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function selectRange(startNode: Node, startOffset: number, endNode: Node, endOffset: number) {
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
});
