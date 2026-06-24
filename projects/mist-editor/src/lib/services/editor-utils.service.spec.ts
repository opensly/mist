import { EditorUtilsService } from './editor-utils.service';

describe('EditorUtilsService', () => {
  let service: EditorUtilsService;
  let editor: HTMLElement;

  beforeEach(() => {
    service = new EditorUtilsService();
    
    // Create a mock editor element
    editor = document.createElement('div');
    editor.contentEditable = 'true';
    document.body.appendChild(editor);
  });

  afterEach(() => {
    document.body.removeChild(editor);
    window.getSelection()?.removeAllRanges();
  });

  describe('isFormatActive', () => {
    it('should return true when format is active', () => {
      editor.innerHTML = '<p>Hello <strong>World</strong></p>';
      const strong = editor.querySelector('strong');
      
      const range = document.createRange();
      range.selectNodeContents(strong!);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      expect(service.isFormatActive(editor, 'STRONG')).toBe(true);
    });

    it('should return false when format is not active', () => {
      editor.innerHTML = '<p>Plain text</p>';
      const p = editor.querySelector('p');
      
      const range = document.createRange();
      range.selectNodeContents(p!);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      expect(service.isFormatActive(editor, 'STRONG')).toBe(false);
    });

    it('should return false when no selection exists', () => {
      window.getSelection()?.removeAllRanges();
      expect(service.isFormatActive(editor, 'STRONG')).toBe(false);
    });
  });

  describe('getCurrentColor', () => {
    it('should read inline color from ancestor element', () => {
      editor.innerHTML = '<p><span style="color: rgb(255, 0, 0)">Red</span></p>';
      const span = editor.querySelector('span')!;
      selectNodeContents(span.firstChild!);

      expect(service.getCurrentColor(editor, 'color')).toBe('#FF0000');
    });

    it('should read background color from inline style', () => {
      editor.innerHTML = '<p style="background-color: #00ff00">Highlighted</p>';
      const p = editor.querySelector('p')!;
      selectNodeContents(p.firstChild!);

      expect(service.getCurrentColor(editor, 'background-color')).toBe('#00FF00');
    });

    it('should fall back to computed style for text nodes', () => {
      editor.innerHTML = '<p style="color: rgb(0, 0, 255)">Blue</p>';
      const textNode = editor.querySelector('p')!.firstChild!;
      selectNodeContents(textNode);

      expect(service.getCurrentColor(editor, 'color')).toBe('#0000FF');
    });

    it('should return empty string for transparent computed colors', () => {
      editor.innerHTML = '<p>Plain</p>';
      const textNode = editor.querySelector('p')!.firstChild!;
      selectNodeContents(textNode);

      expect(service.getCurrentColor(editor, 'background-color')).toBe('');
    });

    it('should return empty string when no selection exists', () => {
      window.getSelection()?.removeAllRanges();
      expect(service.getCurrentColor(editor, 'color')).toBe('');
    });
  });

  describe('normalizeColor', () => {
    it('should convert rgb to hex', () => {
      const result = service.normalizeColor('rgb(255, 0, 0)');
      expect(result).toBe('#FF0000');
    });

    it('should uppercase hex colors', () => {
      const result = service.normalizeColor('#abc123');
      expect(result).toBe('#ABC123');
    });

    it('should return empty string for empty input', () => {
      expect(service.normalizeColor('')).toBe('');
    });
  });

  describe('rgbToHex', () => {
    it('should convert rgb to hex format', () => {
      expect(service.rgbToHex('rgb(255, 0, 0)')).toBe('#FF0000');
      expect(service.rgbToHex('rgb(0, 255, 0)')).toBe('#00FF00');
      expect(service.rgbToHex('rgb(0, 0, 255)')).toBe('#0000FF');
    });

    it('should handle rgba format', () => {
      const result = service.rgbToHex('rgba(128, 128, 128, 0.5)');
      expect(result).toBe('#808080');
    });

    it('should return original value if not rgb format', () => {
      expect(service.rgbToHex('#FF0000')).toBe('#FF0000');
      expect(service.rgbToHex('red')).toBe('red');
    });
  });

  describe('getCurrentAlignment', () => {
    it('should detect center alignment', () => {
      editor.innerHTML = '<p style="text-align: center">Centered</p>';
      const p = editor.querySelector('p');
      
      const range = document.createRange();
      range.selectNodeContents(p!);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      expect(service.getCurrentAlignment(editor)).toBe('center');
    });

    it('should detect right alignment', () => {
      editor.innerHTML = '<p style="text-align: right">Right aligned</p>';
      const p = editor.querySelector('p');
      
      const range = document.createRange();
      range.selectNodeContents(p!);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      expect(service.getCurrentAlignment(editor)).toBe('right');
    });

    it('should detect justify alignment', () => {
      editor.innerHTML = '<p style="text-align: justify">Justified</p>';
      const p = editor.querySelector('p')!;
      selectNodeContents(p.firstChild!);

      expect(service.getCurrentAlignment(editor)).toBe('justify');
    });

    it('should default to left alignment', () => {
      editor.innerHTML = '<p>Normal text</p>';
      const p = editor.querySelector('p');
      
      const range = document.createRange();
      range.selectNodeContents(p!);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      expect(service.getCurrentAlignment(editor)).toBe('left');
    });
  });

  describe('getCurrentBlockType', () => {
    it('should detect paragraph block', () => {
      editor.innerHTML = '<p>Paragraph</p>';
      const p = editor.querySelector('p');
      
      const range = document.createRange();
      range.selectNodeContents(p!);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      expect(service.getCurrentBlockType(editor)).toBe('p');
    });

    it('should detect heading blocks', () => {
      editor.innerHTML = '<h1>Heading 1</h1>';
      const h1 = editor.querySelector('h1');
      
      const range = document.createRange();
      range.selectNodeContents(h1!);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      expect(service.getCurrentBlockType(editor)).toBe('h1');
    });

    it('should detect pre block', () => {
      editor.innerHTML = '<pre>Code</pre>';
      const pre = editor.querySelector('pre');
      
      const range = document.createRange();
      range.selectNodeContents(pre!);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      expect(service.getCurrentBlockType(editor)).toBe('pre');
    });

    it('should detect h3 block type', () => {
      editor.innerHTML = '<h3>Heading</h3>';
      const h3 = editor.querySelector('h3')!;
      selectNodeContents(h3.firstChild!);

      expect(service.getCurrentBlockType(editor)).toBe('h3');
    });

    it('should default to paragraph when no block found', () => {
      window.getSelection()?.removeAllRanges();
      expect(service.getCurrentBlockType(editor)).toBe('p');
    });
  });

  describe('findParentBlock', () => {
    it('should find parent paragraph', () => {
      editor.innerHTML = '<p>Text <strong>bold</strong></p>';
      const strong = editor.querySelector('strong');
      
      const result = service.findParentBlock(editor, strong);
      expect(result?.tagName).toBe('P');
    });

    it('should find parent heading', () => {
      editor.innerHTML = '<h2>Heading <em>italic</em></h2>';
      const em = editor.querySelector('em');
      
      const result = service.findParentBlock(editor, em);
      expect(result?.tagName).toBe('H2');
    });

    it('should return null when no parent block exists', () => {
      const orphanNode = document.createTextNode('orphan');
      const result = service.findParentBlock(editor, orphanNode);
      expect(result).toBeNull();
    });
  });

  describe('saveSelection and restoreSelection', () => {
    it('should save and restore selection', () => {
      editor.innerHTML = '<p>Test content</p>';
      const p = editor.querySelector('p');
      
      // Create initial selection
      const range = document.createRange();
      range.setStart(p!.firstChild!, 2);
      range.setEnd(p!.firstChild!, 6);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Save selection
      const saved = service.saveSelection();
      expect(saved).not.toBeNull();
      expect(saved?.markerId).toBeDefined();

      // Clear selection
      selection?.removeAllRanges();
      expect(selection?.rangeCount).toBe(0);

      // Restore selection
      service.restoreSelection(editor, saved);
      expect(selection?.rangeCount).toBeGreaterThan(0);
    });

    it('should handle null saved selection', () => {
      service.restoreSelection(editor, null);
      expect(editor.querySelector('span[id^="selection-marker-"]')).toBeNull();
    });

    it('should return null when selection cannot be saved', () => {
      const detachedText = document.createTextNode('detached');
      const range = document.createRange();
      range.selectNodeContents(detachedText);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      expect(service.saveSelection()).toBeNull();
    });

    it('should return null when marker insertion fails', () => {
      editor.innerHTML = '<p>Test content</p>';
      const p = editor.querySelector('p')!;
      selectNodeContents(p.firstChild!);
      const selection = window.getSelection()!;
      const range = selection.getRangeAt(0);
      vi.spyOn(range, 'insertNode').mockImplementation(() => {
        throw new Error('insert failed');
      });

      expect(service.saveSelection()).toBeNull();
    });
  });

  function selectNodeContents(node: Node) {
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
});
