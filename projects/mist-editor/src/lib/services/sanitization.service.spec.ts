import { DomSanitizer } from '@angular/platform-browser';
import { SanitizationService } from './sanitization.service';

describe('SanitizationService', () => {
  let service: SanitizationService;
  let mockDomSanitizer: any;

  beforeEach(() => {
    mockDomSanitizer = {
      sanitize: vi.fn((_context: unknown, value: unknown) => {
        if (!value) return '';
        return String(value);
      }),
    };

    service = new SanitizationService(mockDomSanitizer);
  });

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
  });

  describe('sanitizeEditorContent', () => {
    it('should return empty string for empty input', () => {
      expect(service.sanitizeEditorContent('')).toBe('');
      expect(service.sanitizeEditorContent(null as any)).toBe('');
    });

    it('should preserve safe rich text markup', () => {
      const html = '<p>Hello <strong>world</strong></p>';
      const result = service.sanitizeEditorContent(html);
      expect(result).toContain('<strong>');
      expect(result).toContain('world');
    });

    it('should strip script tags and event handlers', () => {
      const html = '<p onclick="alert(1)">Text</p><script>alert(1)</script>';
      const result = service.sanitizeEditorContent(html);
      expect(result).not.toContain('<script');
      expect(result).not.toContain('onclick');
    });

    it('should remove disallowed tags while keeping children', () => {
      const html = '<p>Before <custom>inner</custom> after</p>';
      const result = service.sanitizeEditorContent(html);
      expect(result).not.toContain('<custom');
      expect(result).toContain('inner');
    });

    it('should keep valid links and add rel for _blank targets', () => {
      const html = '<a href="https://example.com" target="_blank">Link</a>';
      const result = service.sanitizeEditorContent(html);
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('noopener');
      expect(result).toContain('noreferrer');
    });

    it('should remove invalid href and src attributes', () => {
      const html =
        '<a href="javascript:alert(1)">Bad</a><img src="javascript:alert(1)" alt="x">';
      const result = service.sanitizeEditorContent(html);
      expect(result).not.toContain('javascript:');
      expect(result).toContain('Bad');
    });

    it('should allow safe inline styles and drop dangerous CSS', () => {
      const html =
        '<p style="color: #ff0000; background-color: rgb(0, 128, 0)">Styled</p>';
      const result = service.sanitizeEditorContent(html);
      expect(result).toContain('color');
      expect(result).toContain('rgb(0, 128, 0)');
      expect(result).not.toContain('expression(');
    });

    it('should preserve rgb text and highlight colors on spans', () => {
      const html =
        '<p>Hello <span style="color: rgb(23, 43, 77); background-color: rgb(234, 230, 255);">world</span></p>';
      const result = service.sanitizeEditorContent(html);
      expect(result).toContain('color: rgb(23, 43, 77)');
      expect(result).toContain('background-color: rgb(234, 230, 255)');
    });

    it('should preserve editor text and highlight colors through the full sanitize pipeline', () => {
      const html =
        '<p>Hello <span style="color: #172B4D; background-color: #EAE6FF;">world</span></p>';
      const result = service.sanitizeEditorContent(html);

      expect(result).toContain('color');
      expect(result).toMatch(/#172B4D|rgb\(23,\s*43,\s*77\)/i);
      expect(result).toMatch(/#EAE6FF|rgb\(234,\s*230,\s*255\)/i);
    });

    it('should reject disallowed style properties and dangerous values', () => {
      const html =
        '<p style="color: expression(alert(1)); behavior: url(evil.htc)">Text</p>';
      const result = service.sanitizeEditorContent(html);
      expect(result).not.toContain('expression');
      expect(result).not.toContain('behavior');
    });

    it('should remove invalid target attributes', () => {
      const html = '<a href="https://example.com" target="evil">Link</a>';
      const result = service.sanitizeEditorContent(html);
      expect(result).not.toContain('target="evil"');
    });

    it('should return empty when dangerous patterns remain after cleaning', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const containsSpy = vi
        .spyOn(service as unknown as { containsDangerousPatterns: (content: string) => boolean }, 'containsDangerousPatterns')
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      expect(service.sanitizeEditorContent('<p>safe</p>')).toBe('');

      containsSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('should apply custom tag and style validators', () => {
      const customService = new SanitizationService(mockDomSanitizer, {
        customTagValidator: (tag) => tag !== 'span',
        customStyleValidator: (property) => property === 'color',
      });

      const html = '<p><span>hidden</span><em style="font-weight: bold; color: #0000ff">x</em></p>';
      const result = customService.sanitizeEditorContent(html);
      expect(result).not.toContain('<span');
      expect(result).toContain('color');
      expect(result).not.toContain('font-weight');
    });
  });

  describe('sanitizeTrustedHtml', () => {
    it('should allow trusted HTML without DOMParser', () => {
      const html = '<div class="editor-panel">Content</div>';
      const result = service.sanitizeTrustedHtml(html);
      expect(result).toContain('editor-panel');
    });

    it('should still remove script tags from trusted HTML', () => {
      const html = '<div>Safe</div><script>alert(1)</script>';
      const result = service.sanitizeTrustedHtml(html);
      expect(result).not.toContain('<script');
    });

    it('should handle empty input', () => {
      expect(service.sanitizeTrustedHtml('')).toBe('');
    });
  });

  describe('isValidUrl', () => {
    it('should allow https URLs', () => {
      expect(service.isValidUrl('https://example.com')).toBe(true);
    });

    it('should allow http URLs', () => {
      expect(service.isValidUrl('http://example.com')).toBe(true);
    });

    it('should reject javascript: URLs', () => {
      expect(service.isValidUrl('javascript:alert(1)')).toBe(false);
    });

    it('should reject vbscript: URLs', () => {
      expect(service.isValidUrl('vbscript:alert(1)')).toBe(false);
    });

    it('should reject data:text/html URLs', () => {
      expect(service.isValidUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('should allow relative URLs', () => {
      expect(service.isValidUrl('/path/to/page')).toBe(true);
      expect(service.isValidUrl('./relative')).toBe(true);
      expect(service.isValidUrl('../parent')).toBe(true);
    });

    it('should reject empty URLs', () => {
      expect(service.isValidUrl('')).toBe(false);
    });

    it('should reject data:image URLs by default', () => {
      expect(service.isValidUrl('data:image/png;base64,abc123')).toBe(false);
    });

    it('should reject non-image data URLs even when data URLs are enabled', () => {
      const customService = new SanitizationService(mockDomSanitizer, { allowDataUrls: true });
      expect(customService.isValidUrl('data:text/plain,hello')).toBe(false);
    });

    it('should reject unsupported protocols', () => {
      expect(service.isValidUrl('ftp://example.com/file')).toBe(false);
    });

    it('should reject protocol-relative URLs', () => {
      expect(service.isValidUrl('//evil.example/phish')).toBe(false);
    });

    it('should reject percent-encoded javascript URLs', () => {
      expect(service.isValidUrl('java%73cript:alert(1)')).toBe(false);
    });

    it('should reject scheme-like relative URLs without a slash prefix', () => {
      expect(service.isValidUrl('alert(1)')).toBe(false);
    });
  });

  describe('isSafeStyleValue', () => {
    it('should allow valid hex colors', () => {
      expect(service.isSafeStyleValue('color', '#FF0000')).toBe(true);
      expect(service.isSafeStyleValue('background-color', '#00ff00')).toBe(true);
    });

    it('should reject dangerous CSS values', () => {
      expect(service.isSafeStyleValue('color', 'expression(alert(1))')).toBe(false);
      expect(service.isSafeStyleValue('background-color', 'url(javascript:alert(1))')).toBe(false);
    });
  });

  describe('sanitizeEditorContent edge cases', () => {
    it('should reject invalid rgb color values during style cleaning', () => {
      const html = '<p style="color: rgb(999, 999, 999)">Text</p>';
      const result = service.sanitizeEditorContent(html);
      expect(result).not.toContain('999');
    });

    it('should preserve valid hsl and named colors in inline styles', () => {
      const html =
        '<p style="color: hsl(120, 100%, 50%); background-color: transparent">Text</p>';
      const result = service.sanitizeEditorContent(html);
      expect(result).toMatch(/rgb\(0,\s*255,\s*0\)|hsl\(120/);
      expect(result).toContain('transparent');
    });

    it('should remove elements with dangerous inline attributes', () => {
      const html = '<p title="javascript:alert(1)">Unsafe</p>';
      const result = service.sanitizeEditorContent(html);
      expect(result).toContain('Unsafe');
      expect(result).not.toContain('javascript:');
    });

    it('should return empty when DOMParser body is missing', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const parseFromString = DOMParser.prototype.parseFromString;
      DOMParser.prototype.parseFromString = vi.fn(() => ({ body: null }) as unknown as Document);

      expect(service.sanitizeEditorContent('<p>Fallback</p>')).toBe('');

      DOMParser.prototype.parseFromString = parseFromString;
      errorSpy.mockRestore();
    });

    it('should return empty string when HTML parser reports an error', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const parseFromString = DOMParser.prototype.parseFromString;
      DOMParser.prototype.parseFromString = vi.fn((markup: string, type: DOMParserSupportedType) => {
        const doc = parseFromString.call(new DOMParser(), markup, type);
        const parserError = doc.createElement('parsererror');
        doc.documentElement.insertBefore(parserError, doc.body);
        return doc;
      });

      expect(service.sanitizeEditorContent('<p>Broken</p>')).toBe('');

      DOMParser.prototype.parseFromString = parseFromString;
      errorSpy.mockRestore();
    });
  });

  describe('sanitizeAttribute', () => {
    it('should remove dangerous characters', () => {
      const result = service.sanitizeAttribute('table<>"\'`=id');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).not.toContain('"');
      expect(result).not.toContain("'");
      expect(result).not.toContain('`');
      expect(result).not.toContain('=');
    });

    it('should preserve safe characters', () => {
      const result = service.sanitizeAttribute('table-id-123');
      expect(result).toBe('table-id-123');
    });
  });

  describe('sanitizeImageUrl', () => {
    it('should return sanitized valid URLs', () => {
      const url = 'https://example.com/image.png';
      const result = service.sanitizeImageUrl(url);
      expect(result).toBe(url);
    });

    it('should return null for invalid URLs', () => {
      const result = service.sanitizeImageUrl('javascript:alert(1)');
      expect(result).toBeNull();
    });

    it('should trim whitespace', () => {
      const result = service.sanitizeImageUrl('  https://example.com/image.png  ');
      expect(result).toBe('https://example.com/image.png');
    });

    it('should return null for empty input', () => {
      expect(service.sanitizeImageUrl('')).toBeNull();
    });
  });

  describe('custom configuration', () => {
    it('should accept custom URL validator', () => {
      const customService = new SanitizationService(
        mockDomSanitizer,
        { 
          customUrlValidator: (url: string) => url.startsWith('https://trusted.com')
        }
      );
      
      expect(customService.isValidUrl('https://trusted.com/page')).toBe(true);
      expect(customService.isValidUrl('https://untrusted.com/page')).toBe(false);
    });

    it('should allow data URLs when enabled', () => {
      const customService = new SanitizationService(
        mockDomSanitizer,
        { allowDataUrls: true }
      );
      
      expect(customService.isValidUrl('data:image/png;base64,abc123')).toBe(true);
      expect(customService.isValidUrl('data:text/html,<script>')).toBe(false);
    });
  });

  describe('security edge cases', () => {
    it('should handle case-insensitive javascript: protocol', () => {
      expect(service.isValidUrl('JavaScript:alert(1)')).toBe(false);
      expect(service.isValidUrl('JAVASCRIPT:alert(1)')).toBe(false);
    });
  });
});
