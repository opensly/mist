import { Injectable, ElementRef } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class EditorUtilsService {
  isFormatActive(editor: HTMLElement, tagName: string): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    let nodeSelection = selection.anchorNode;
    let node: Node | null = nodeSelection;
    while (node && node !== editor) {
      if (node.nodeName === tagName) return true;
      node = node.parentNode;
    }
    return false;
  }

  getCurrentColor(editor: HTMLElement, property: string): string {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return '';

    let node: Node | null = selection.anchorNode;

    // Walk up the tree to find an explicit style property or an HTMLElement
    while (node && node !== editor) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const style = el.style.getPropertyValue(
          property === 'color' ? 'color' : 'background-color'
        );
        if (style && style !== 'inherit' && style !== 'initial') {
          return this.normalizeColor(style);
        }
      }
      node = node.parentNode;
    }

    // Fallback to computed style of anchor node parent
    let fallbackNode = selection.anchorNode;
    if (fallbackNode && fallbackNode.nodeType === Node.TEXT_NODE) {
      fallbackNode = fallbackNode.parentNode;
    }

    if (fallbackNode instanceof HTMLElement) {
      const style = window.getComputedStyle(fallbackNode);
      const color = style.getPropertyValue(
        property === 'color' ? 'color' : 'background-color'
      );

      if (!color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent') return '';
      return this.normalizeColor(color);
    }
    return '';
  }

  normalizeColor(color: string): string {
    if (!color) return '';
    if (color.startsWith('rgb')) {
      return this.rgbToHex(color).toUpperCase();
    }
    return color.toUpperCase();
  }

  rgbToHex(rgb: string): string {
    if (!rgb.startsWith('rgb')) return rgb;
    const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(\.\d+)?))?\)$/);
    if (!match) return rgb;

    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);

    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  }

  getCurrentAlignment(editor: HTMLElement): string {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 'left';

    let node: Node | null = selection.anchorNode;
    while (node && node !== editor) {
      if (node instanceof HTMLElement) {
        const textAlign = window.getComputedStyle(node).textAlign;
        if (textAlign === 'center' || textAlign === 'right' || textAlign === 'justify') {
          return textAlign;
        }
      }
      node = node.parentNode;
    }
    return 'left';
  }

  getCurrentBlockType(editor: HTMLElement): string {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 'p';

    let node: Node | null = selection.anchorNode;
    while (node && node !== editor) {
      const name = node.nodeName.toLowerCase();
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'pre'].includes(name)) {
        return name;
      }
      node = node.parentNode;
    }
    return 'p';
  }

  findParentBlock(editor: HTMLElement, node: Node | null): HTMLElement | null {
    while (node && node !== editor) {
      if (['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DIV'].includes(node.nodeName)) {
        return node as HTMLElement;
      }
      node = node.parentNode;
    }
    return null;
  }

  saveSelection(): { markerId: string } | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const markerId = `selection-marker-${Date.now()}`;
    const marker = document.createElement('span');
    marker.id = markerId;
    marker.style.display = 'none';
    marker.innerHTML = '&#xFEFF;'; // Zero-width non-breaking space

    try {
      range.insertNode(marker);
      return { markerId };
    } catch (e) {
      return null;
    }
  }

  restoreSelection(editor: HTMLElement, saved: { markerId: string } | null): void {
    if (!saved) return;

    const marker = editor.querySelector(`#${saved.markerId}`);
    if (marker) {
      const range = document.createRange();
      const selection = window.getSelection();

      range.setStartAfter(marker);
      range.collapse(true);

      selection?.removeAllRanges();
      selection?.addRange(range);

      marker.remove();
    }
  }
}
