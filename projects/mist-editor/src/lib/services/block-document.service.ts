import { Injectable } from '@angular/core';
import { SanitizationService } from './sanitization.service';
import {
  MIST_BLOCK_ATTR,
  MIST_BLOCK_ID_PATTERN,
  BlockSelection,
  MistBlockType,
} from '../models/editor-block.model';

const ROOT_BLOCK_TAGS = new Set([
  'P',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'UL',
  'OL',
  'BLOCKQUOTE',
  'PRE',
  'TABLE',
]);

@Injectable({
  providedIn: 'root',
})
export class BlockDocumentService {
  createBlockId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return `b_${crypto.randomUUID().replace(/-/g, '')}`;
    }
    return `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  isValidBlockId(id: string): boolean {
    return MIST_BLOCK_ID_PATTERN.test(id);
  }

  isRootBlock(element: HTMLElement, editor: HTMLElement): boolean {
    if (!editor.contains(element) || element.parentElement !== editor) {
      return false;
    }
    if (ROOT_BLOCK_TAGS.has(element.tagName)) {
      return true;
    }
    return element.tagName === 'DIV' && element.classList.contains('editor-panel');
  }

  getBlockType(element: HTMLElement): MistBlockType {
    if (element.classList.contains('editor-panel')) {
      return 'panel';
    }
    return element.tagName.toLowerCase() as MistBlockType;
  }

  getRootBlocks(editor: HTMLElement): HTMLElement[] {
    return Array.from(editor.children).filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && this.isRootBlock(child, editor),
    );
  }

  getActiveRootBlock(editor: HTMLElement, node: Node | null): HTMLElement | null {
    while (node && node !== editor) {
      if (node instanceof HTMLElement && this.isRootBlock(node, editor)) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  findBlockById(editor: HTMLElement, blockId: string): HTMLElement | null {
    if (!this.isValidBlockId(blockId)) {
      return null;
    }
    const selector = `[${MIST_BLOCK_ATTR}="${blockId}"]`;
    const found = editor.querySelector(selector);
    if (found instanceof HTMLElement && this.isRootBlock(found, editor)) {
      return found;
    }
    return null;
  }

  ensureBlockId(block: HTMLElement): string {
    const existing = block.getAttribute(MIST_BLOCK_ATTR);
    if (existing && this.isValidBlockId(existing)) {
      return existing;
    }
    const id = this.createBlockId();
    block.setAttribute(MIST_BLOCK_ATTR, id);
    return id;
  }

  ensureAllBlockIds(editor: HTMLElement): void {
    for (const block of this.getRootBlocks(editor)) {
      this.ensureBlockId(block);
    }
    this.deduplicateBlockIds(editor);
  }

  /**
   * Browsers copy block attributes when Enter splits a paragraph.
   * Reassign ids on duplicates so selection restore targets the correct block.
   */
  deduplicateBlockIds(editor: HTMLElement): void {
    const seen = new Set<string>();

    for (const block of this.getRootBlocks(editor)) {
      const id = block.getAttribute(MIST_BLOCK_ATTR);

      if (!id || !this.isValidBlockId(id) || seen.has(id)) {
        this.assignNewBlockId(block);
      }

      const resolvedId = block.getAttribute(MIST_BLOCK_ATTR);
      if (resolvedId) {
        seen.add(resolvedId);
      }
    }
  }

  copyBlockId(from: HTMLElement, to: HTMLElement): void {
    const id = from.getAttribute(MIST_BLOCK_ATTR);
    if (id && this.isValidBlockId(id)) {
      to.setAttribute(MIST_BLOCK_ATTR, id);
    }
  }

  assignNewBlockId(block: HTMLElement): string {
    block.setAttribute(MIST_BLOCK_ATTR, this.createBlockId());
    return block.getAttribute(MIST_BLOCK_ATTR)!;
  }

  assembleHtml(editor: HTMLElement): string {
    this.ensureAllBlockIds(editor);
    return editor.innerHTML;
  }

  saveBlockSelection(editor: HTMLElement): BlockSelection | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }

    const block = this.getActiveRootBlock(editor, selection.anchorNode);
    if (!block) {
      return null;
    }

    const range = selection.getRangeAt(0);
    const offset = this.textOffsetWithinBlock(block, range.startContainer, range.startOffset);

    return {
      blockId: block.getAttribute(MIST_BLOCK_ATTR) ?? this.ensureBlockId(block),
      offset,
    };
  }

  private textOffsetWithinBlock(block: HTMLElement, endContainer: Node, endOffset: number): number {
    const preRange = document.createRange();
    preRange.setStart(block, 0);
    preRange.setEnd(endContainer, endOffset);
    return preRange.toString().length;
  }

  restoreBlockSelection(editor: HTMLElement, saved: BlockSelection | null): void {
    if (!saved) {
      return;
    }

    const block = this.findBlockById(editor, saved.blockId);
    if (!block) {
      return;
    }

    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    const range = this.rangeAtTextOffset(block, saved.offset);
    if (!range) {
      const fallback = document.createRange();
      fallback.selectNodeContents(block);
      fallback.collapse(false);
      selection.removeAllRanges();
      selection.addRange(fallback);
      return;
    }

    selection.removeAllRanges();
    selection.addRange(range);
  }

  sanitizeBlockInPlace(
    editor: HTMLElement,
    block: HTMLElement,
    sanitization: SanitizationService,
    savedSelection?: BlockSelection | null,
  ): boolean {
    const outer = block.outerHTML;
    const clean = sanitization.sanitizeBlock(outer);
    if (!clean || clean === outer) {
      return false;
    }

    const selection = savedSelection ?? this.saveBlockSelection(editor);
    const template = document.createElement('template');
    template.innerHTML = clean.trim();
    const replacement = template.content.firstElementChild;

    if (!(replacement instanceof HTMLElement)) {
      return false;
    }

    block.parentNode?.replaceChild(replacement, block);
    this.restoreBlockSelection(editor, selection);
    return true;
  }

  sanitizeBlocksInPlace(
    editor: HTMLElement,
    blocks: HTMLElement[],
    sanitization: SanitizationService,
  ): HTMLElement[] {
    const saved = this.saveBlockSelection(editor);
    const changed: HTMLElement[] = [];

    for (const block of blocks) {
      if (!editor.contains(block)) {
        continue;
      }
      if (this.sanitizeBlockInPlace(editor, block, sanitization, saved)) {
        const active = this.findBlockById(editor, saved?.blockId ?? '') ?? block;
        changed.push(active);
      }
    }

    if (saved && changed.length > 0) {
      this.restoreBlockSelection(editor, saved);
    }

    return changed;
  }

  private rangeAtTextOffset(root: HTMLElement, targetOffset: number): Range | null {
    const range = document.createRange();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let offset = 0;

    while (walker.nextNode()) {
      const textNode = walker.currentNode as Text;
      const length = textNode.textContent?.length ?? 0;
      if (offset + length >= targetOffset) {
        range.setStart(textNode, targetOffset - offset);
        range.collapse(true);
        return range;
      }
      offset += length;
    }

    if (targetOffset === 0) {
      const firstText = this.findFirstTextNode(root);
      if (firstText) {
        range.setStart(firstText, 0);
      } else {
        range.setStart(root, 0);
      }
      range.collapse(true);
      return range;
    }

    const lastText = this.findLastTextNode(root);
    if (lastText && targetOffset >= (root.textContent?.length ?? 0)) {
      range.setStart(lastText, lastText.textContent?.length ?? 0);
      range.collapse(true);
      return range;
    }

    return null;
  }

  private findFirstTextNode(root: HTMLElement): Text | null {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    return (walker.nextNode() as Text | null) ?? null;
  }

  private findLastTextNode(root: HTMLElement): Text | null {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let last: Text | null = null;
    while (walker.nextNode()) {
      last = walker.currentNode as Text;
    }
    return last;
  }
}
