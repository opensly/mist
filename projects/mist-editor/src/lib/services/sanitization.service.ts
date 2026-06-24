import { Injectable, InjectionToken, Optional, Inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MIST_BLOCK_ID_PATTERN } from '../models/editor-block.model';

/**
 * Configuration interface for custom sanitization rules
 */
export interface SanitizationConfig {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  allowedStyles?: string[];
  allowedProtocols?: string[];
  allowDataUrls?: boolean;
  customUrlValidator?: (url: string) => boolean;
  customStyleValidator?: (property: string, value: string) => boolean;
  customTagValidator?: (tagName: string, element: HTMLElement) => boolean;
}

/**
 * Injection token for custom sanitization configuration
 */
export const SANITIZATION_CONFIG = new InjectionToken<SanitizationConfig>('SANITIZATION_CONFIG');

@Injectable({
  providedIn: 'root'
})
export class SanitizationService {
  // Default allowed HTML tags for rich text editor
  private readonly DEFAULT_ALLOWED_TAGS = [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'strike', 's', 'sub', 'sup',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'blockquote', 'pre', 'code',
    'img', 'a',
    'div', 'span',
    'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g'
  ];

  // Default allowed attributes per tag
  private readonly DEFAULT_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
    '*': ['style', 'class', 'id', 'data-mist-block'],
    'img': ['src', 'alt', 'width', 'height', 'style', 'loading'],
    'a': ['href', 'target', 'rel', 'title'],
    'table': ['id', 'class', 'style', 'data-mist-block'],
    'p': ['data-mist-block'],
    'h1': ['data-mist-block'],
    'h2': ['data-mist-block'],
    'h3': ['data-mist-block'],
    'h4': ['data-mist-block'],
    'h5': ['data-mist-block'],
    'h6': ['data-mist-block'],
    'ul': ['data-mist-block'],
    'ol': ['data-mist-block'],
    'blockquote': ['data-mist-block'],
    'pre': ['data-mist-block', 'contenteditable', 'class', 'style'],
    'td': ['colspan', 'rowspan', 'style'],
    'th': ['colspan', 'rowspan', 'style', 'scope'],
    'div': ['class', 'id', 'contenteditable', 'style', 'data-mist-block'],
    'code': ['class'],
    'svg': ['width', 'height', 'viewBox', 'fill', 'stroke', 'xmlns'],
    'path': ['d', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'],
    'circle': ['cx', 'cy', 'r', 'fill', 'stroke', 'stroke-width'],
    'rect': ['x', 'y', 'width', 'height', 'rx', 'ry', 'fill', 'stroke'],
    'line': ['x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width'],
    'polyline': ['points', 'fill', 'stroke', 'stroke-width'],
    'polygon': ['points', 'fill', 'stroke', 'stroke-width']
  };

  // Default allowed CSS properties
  private readonly DEFAULT_ALLOWED_STYLES = [
    'color', 'background-color', 'text-align',
    'font-weight', 'font-style', 'text-decoration',
    'margin-left', 'margin-right', 'max-width',
    'width', 'height', 'padding', 'margin',
    'border', 'border-radius', 'display',
    'vertical-align', 'line-height'
  ];

  // Default allowed URL protocols
  private readonly DEFAULT_ALLOWED_PROTOCOLS = ['http:', 'https:'];

  // Dangerous patterns to check for
  private readonly DANGEROUS_PATTERNS = [
    /javascript:/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=
    /<script/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<applet/gi,
    /<meta/gi,
    /<link/gi,
    /<style/gi,
    /expression\s*\(/gi, // CSS expressions
    /import\s+/gi, // CSS imports
    /@import/gi,
    /behavior\s*:/gi, // IE behaviors
  ];

  private allowedTags: string[];
  private allowedAttributes: Record<string, string[]>;
  private allowedStyles: string[];
  private allowedProtocols: string[];
  private allowDataUrls: boolean;

  constructor(
    private sanitizer: DomSanitizer,
    @Optional() @Inject(SANITIZATION_CONFIG) private config?: SanitizationConfig
  ) {
    // Merge default config with custom config
    this.allowedTags = config?.allowedTags || this.DEFAULT_ALLOWED_TAGS;
    this.allowedAttributes = config?.allowedAttributes || this.DEFAULT_ALLOWED_ATTRIBUTES;
    this.allowedStyles = config?.allowedStyles || this.DEFAULT_ALLOWED_STYLES;
    this.allowedProtocols = config?.allowedProtocols || this.DEFAULT_ALLOWED_PROTOCOLS;
    this.allowDataUrls = config?.allowDataUrls || false;
  }

  /**
   * Sanitize HTML content for the rich text editor
   * Allows safe HTML tags and attributes while removing dangerous content
   */
  sanitizeEditorContent(html: string): string {
    if (!html) return '';

    // Pre-check for dangerous patterns
    if (this.containsDangerousPatterns(html)) {
      console.warn('[Sanitization] Dangerous patterns detected in content');
      html = this.stripDangerousPatterns(html);
    }

    // Parse and validate structure with our allowlists.
    // Do not run Angular's DomSanitizer first — it strips safe inline styles (color, background-color)
    // that the editor applies, while our cleanNode pipeline validates each style property.
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Check if parsing was successful
    if (!doc || !doc.body) {
      console.error('[Sanitization] DOMParser failed to parse HTML');
      return '';
    }

    // Check for parsing errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      console.error('[Sanitization] HTML parsing error detected');
      return '';
    }

    // Clean the document
    this.cleanNode(doc.body);

    const result = doc.body.innerHTML;

    // Final validation
    if (this.containsDangerousPatterns(result)) {
      console.error('[Sanitization] Dangerous patterns still present after sanitization');
      return '';
    }

    return result;
  }

  /**
   * Sanitize a single root block element (outerHTML).
   * Used for incremental block-level sanitization on the hot input path.
   */
  sanitizeBlock(outerHtml: string): string {
    const trimmed = outerHtml?.trim();
    if (!trimmed) {
      return '';
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmed, 'text/html');
    const block = doc.body.firstElementChild;

    if (!block || doc.body.children.length !== 1) {
      return this.sanitizeEditorContent(trimmed);
    }

    if (this.containsDangerousPatterns(trimmed)) {
      const stripped = this.stripDangerousPatterns(trimmed);
      const reparsed = parser.parseFromString(stripped, 'text/html');
      const reblock = reparsed.body.firstElementChild;
      if (!reblock) {
        return '';
      }
      this.cleanNode(reblock);
      return reblock.outerHTML;
    }

    this.cleanNode(block);
    const result = block.outerHTML;

    if (this.containsDangerousPatterns(result)) {
      return '';
    }

    return result;
  }

  /**
   * Sanitize trusted HTML (generated by the application, not user input)
   * This bypasses Angular's sanitizer and DOMParser for app-generated content
   */
  sanitizeTrustedHtml(html: string): string {
    if (!html) return '';

    const cleanHtml = html.trim();
    
    // Remove any script tags and dangerous patterns as a safety measure
    let result = cleanHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    result = this.stripDangerousPatterns(result);

    return result;
  }

  /**
   * Check if content contains dangerous patterns
   */
  private containsDangerousPatterns(content: string): boolean {
    return this.DANGEROUS_PATTERNS.some(pattern => pattern.test(content));
  }

  /**
   * Strip dangerous patterns from content
   */
  private stripDangerousPatterns(content: string): string {
    let result = content;
    
    // Remove script tags
    result = result.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove iframe tags
    result = result.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    
    // Remove object/embed/applet tags
    result = result.replace(/<(object|embed|applet)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');
    
    // Remove event handlers
    result = result.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    result = result.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');
    
    // Remove javascript: and vbscript: protocols
    result = result.replace(/javascript:/gi, '');
    result = result.replace(/vbscript:/gi, '');
    
    // Remove data:text/html
    result = result.replace(/data:text\/html[^"'\s]*/gi, '');
    
    return result;
  }

  /**
   * Recursively clean a DOM node
   */
  private cleanNode(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      return; // Text nodes are safe
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      // Document structure nodes are traversed, not validated as content tags
      if (tagName === 'html' || tagName === 'body') {
        const children = Array.from(node.childNodes);
        children.forEach(child => this.cleanNode(child));
        return;
      }

      // Custom tag validator if provided
      if (this.config?.customTagValidator) {
        if (!this.config.customTagValidator(tagName, element)) {
          this.removeElement(element);
          return;
        }
      }

      // Remove disallowed tags
      if (!this.allowedTags.includes(tagName)) {
        this.removeElement(element);
        return;
      }

      // Clean attributes
      this.cleanAttributes(element);

      // Clean inline styles
      this.cleanStyles(element);

      // Additional security: Remove elements with suspicious content
      if (this.hasInlineScripts(element)) {
        this.removeElement(element);
        return;
      }
    }

    // Recursively clean children
    const children = Array.from(node.childNodes);
    children.forEach(child => this.cleanNode(child));
  }

  /**
   * Remove an element and move its children up
   */
  private removeElement(element: HTMLElement): void {
    while (element.firstChild) {
      element.parentNode?.insertBefore(element.firstChild, element);
    }
    element.remove();
  }

  /**
   * Check if element has inline scripts or dangerous content
   */
  private hasInlineScripts(element: HTMLElement): boolean {
    // Check all attributes for javascript: or event handlers
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      const value = attr.value.toLowerCase();
      
      if (value.includes('javascript:') || 
          value.includes('vbscript:') ||
          value.includes('data:text/html') ||
          attr.name.startsWith('on')) {
        return true;
      }
    }
    return false;
  }

  /**
   * Remove disallowed attributes from an element
   */
  private cleanAttributes(element: HTMLElement): void {
    const tagName = element.tagName.toLowerCase();
    const allowedForTag = this.allowedAttributes[tagName] || [];
    const allowedGlobal = this.allowedAttributes['*'] || [];
    const allowed = [...allowedForTag, ...allowedGlobal];

    const attributesToRemove: string[] = [];
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      
      // Remove event handler attributes
      if (attr.name.startsWith('on')) {
        attributesToRemove.push(attr.name);
        continue;
      }
      
      if (!allowed.includes(attr.name)) {
        attributesToRemove.push(attr.name);
      }
    }

    attributesToRemove.forEach(attr => element.removeAttribute(attr));

    if (element.hasAttribute('data-mist-block')) {
      const blockId = element.getAttribute('data-mist-block') || '';
      if (!MIST_BLOCK_ID_PATTERN.test(blockId)) {
        element.removeAttribute('data-mist-block');
      }
    }

    // Special validation for href
    if (element.hasAttribute('href')) {
      const href = element.getAttribute('href') || '';
      if (!this.isValidUrl(href)) {
        element.removeAttribute('href');
      } else {
        // Add rel="noopener noreferrer" for security
        if (element.getAttribute('target') === '_blank') {
          const currentRel = element.getAttribute('rel') || '';
          const relValues = new Set(currentRel.split(' ').filter(Boolean));
          relValues.add('noopener');
          relValues.add('noreferrer');
          element.setAttribute('rel', Array.from(relValues).join(' '));
        }
      }
    }

    // Special validation for src
    if (element.hasAttribute('src')) {
      const src = element.getAttribute('src') || '';
      if (!this.isValidUrl(src)) {
        element.removeAttribute('src');
      }
    }

    // Validate target attribute
    if (element.hasAttribute('target')) {
      const target = element.getAttribute('target') || '';
      if (!['_blank', '_self', '_parent', '_top'].includes(target)) {
        element.removeAttribute('target');
      }
    }
  }

  /**
   * Clean inline styles to only allow safe CSS properties
   */
  private cleanStyles(element: HTMLElement): void {
    if (!element.style || !element.style.cssText) return;

    const originalStyles = element.style.cssText;
    const styles = originalStyles.split(';').filter(s => s.trim());

    // Clear all styles
    element.style.cssText = '';

    // Re-add only allowed styles
    styles.forEach(style => {
      const colonIndex = style.indexOf(':');
      if (colonIndex === -1) return;

      const property = style.slice(0, colonIndex).trim();
      const value = style.slice(colonIndex + 1).trim();
      if (!property || !value) return;

      // Check for dangerous CSS values
      if (this.isDangerousCssValue(value)) {
        return;
      }

      // Custom style validator if provided
      if (this.config?.customStyleValidator) {
        if (!this.config.customStyleValidator(property, value)) {
          return;
        }
      }

      if (this.allowedStyles.includes(property)) {
        // Additional validation for color values
        if (property === 'color' || property === 'background-color') {
          if (this.isValidColor(value)) {
            element.style.setProperty(property, value);
          }
        } else if (property.includes('url')) {
          // Don't allow url() in CSS
          return;
        } else {
          element.style.setProperty(property, value);
        }
      }
    });
  }

  /**
   * Check if CSS value is dangerous
   */
  private isDangerousCssValue(value: string): boolean {
    const lowerValue = value.toLowerCase();
    return lowerValue.includes('javascript:') ||
           lowerValue.includes('expression(') ||
           lowerValue.includes('import') ||
           lowerValue.includes('behavior:') ||
           lowerValue.includes('binding:') ||
           lowerValue.includes('-moz-binding:');
  }

  /**
   * Validate URL to prevent javascript: and data: URLs
   */
  isValidUrl(url: string): boolean {
    if (!url) return false;

    url = url.trim();

    if (url.startsWith('//')) {
      return false;
    }

    const decoded = this.decodeUrlForValidation(url);
    const normalized = decoded.replace(/\s/g, '').toLowerCase();

    if (
      normalized.includes('javascript:') ||
      normalized.includes('vbscript:') ||
      normalized.includes('data:text/html')
    ) {
      return false;
    }

    if (this.config?.customUrlValidator) {
      return this.config.customUrlValidator(decoded);
    }

    if (decoded.startsWith('data:')) {
      if (!this.allowDataUrls) {
        return false;
      }
      return decoded.startsWith('data:image/');
    }

    try {
      const parsed = new URL(decoded, window.location.href);
      const looksAbsolute = /^[a-z][a-z0-9+.-]*:/i.test(decoded);
      const looksRelative =
        decoded.startsWith('/') ||
        decoded.startsWith('./') ||
        decoded.startsWith('../') ||
        decoded.startsWith('#');

      if (!looksAbsolute && !looksRelative) {
        return false;
      }

      return this.allowedProtocols.includes(parsed.protocol);
    } catch {
      if (decoded.includes(':')) {
        return false;
      }
      return (
        decoded.startsWith('/') ||
        decoded.startsWith('./') ||
        decoded.startsWith('../')
      );
    }
  }

  /**
   * Validate color values used in inline styles
   */
  isValidColor(color: string): boolean {
    // Allow hex colors (3 or 6 digits)
    const hexPattern = /^#([0-9A-Fa-f]{3}){1,2}$/;
    
    // Allow rgb/rgba with proper format
    const rgbPattern = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/;
    
    // Allow hsl/hsla
    const hslPattern = /^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/;
    
    // Safe named colors
    const namedColors = ['transparent', 'inherit', 'initial', 'unset', 'currentcolor'];

    if (hexPattern.test(color)) {
      return true;
    }

    if (rgbPattern.test(color)) {
      // Validate RGB values are in range 0-255
      const match = color.match(rgbPattern);
      if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        return r <= 255 && g <= 255 && b <= 255;
      }
    }

    if (hslPattern.test(color)) {
      return true;
    }

    return namedColors.includes(color.toLowerCase());
  }

  /**
   * Validate inline style values applied by the editor
   */
  isSafeStyleValue(property: string, value: string): boolean {
    if (!value?.trim() || this.isDangerousCssValue(value)) {
      return false;
    }

    if (property === 'color' || property === 'background-color') {
      return this.isValidColor(value.trim());
    }

    return false;
  }

  private decodeUrlForValidation(url: string): string {
    let decoded = url;
    for (let i = 0; i < 3; i++) {
      try {
        const next = decodeURIComponent(decoded);
        if (next === decoded) {
          break;
        }
        decoded = next;
      } catch {
        break;
      }
    }
    return decoded;
  }

  /**
   * Sanitize a simple string attribute (like table ID)
   */
  sanitizeAttribute(value: string): string {
    // Remove any characters that could break out of attribute context
    return value.replace(/[<>"'`=]/g, '');
  }

  /**
   * Validate and sanitize image URL
   */
  sanitizeImageUrl(url: string): string | null {
    if (!url) return null;

    // Trim whitespace
    url = url.trim();

    // Validate URL
    if (!this.isValidUrl(url)) {
      return null;
    }

    return url;
  }
}
