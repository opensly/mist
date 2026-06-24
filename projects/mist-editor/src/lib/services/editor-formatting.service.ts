import { Injectable } from '@angular/core';
import { EditorUtilsService } from './editor-utils.service';
import { SanitizationService } from './sanitization.service';

@Injectable({
  providedIn: 'root'
})
export class EditorFormattingService {
  constructor(
    private utils: EditorUtilsService,
    private sanitization: SanitizationService
  ) { }

  toggleInlineFormat(editor: HTMLElement, tagName: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);

    if (this.utils.isFormatActive(editor, tagName)) {
      this.unwrapFormat(editor, tagName);
    } else {
      const element = document.createElement(tagName);
      try {
        range.surroundContents(element);
      } catch (e) {
        const fragment = range.extractContents();
        element.appendChild(fragment);
        range.insertNode(element);
      }
    }
  }

  unwrapFormat(editor: HTMLElement, tagName: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    let node = selection.anchorNode;
    let formatNode: HTMLElement | null = null;

    while (node && node !== editor) {
      if (node.nodeName === tagName) {
        formatNode = node as HTMLElement;
        break;
      }
      node = node.parentNode;
    }

    if (formatNode && formatNode.parentNode) {
      const parent = formatNode.parentNode;
      while (formatNode.firstChild) {
        parent.insertBefore(formatNode.firstChild, formatNode);
      }
      parent.removeChild(formatNode);
    }
  }

  setBlockType(editor: HTMLElement, tagName: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    let node = selection.anchorNode;
    let blockNode: HTMLElement | null = null;

    // Find the closest existing block element
    while (node && node !== editor) {
      if (['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DIV'].includes(node.nodeName)) {
        blockNode = node as HTMLElement;
        break;
      }
      node = node.parentNode;
    }

    if (blockNode) {
      // If we found a block, replace it
      const newBlock = document.createElement(tagName);
      newBlock.innerHTML = blockNode.innerHTML;

      // Preserve alignment if it was set
      if (blockNode.style.textAlign) {
        newBlock.style.textAlign = blockNode.style.textAlign;
      }

      blockNode.parentNode?.replaceChild(newBlock, blockNode);

      // Restore selection to the new block
      const newRange = document.createRange();
      newRange.selectNodeContents(newBlock);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } else {
      // Fallback: If no block node is found, wrap the current selection or current node
      const range = selection.getRangeAt(0);
      const newBlock = document.createElement(tagName);

      if (range.collapsed) {
        // If selection is collapsed, just insert an empty block
        newBlock.innerHTML = '<br>';
        range.insertNode(newBlock);
      } else {
        // Surround selection with the new block type
        try {
          range.surroundContents(newBlock);
        } catch (e) {
          const fragment = range.extractContents();
          newBlock.appendChild(fragment);
          range.insertNode(newBlock);
        }
      }

      // Move focus to the new block
      const newRange = document.createRange();
      newRange.selectNodeContents(newBlock);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
  }

  setTextAlignment(editor: HTMLElement, alignment: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    let node = selection.anchorNode;
    let blockNode: HTMLElement | null = null;
    let cellNode: HTMLElement | null = null;

    while (node && node !== editor) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (['TD', 'TH'].includes(el.nodeName)) {
          cellNode = el;
          // Don't break immediately, we might be in a P inside a TD. 
          // But the user wants the style on the TD.
          // So if we find a cell, we prioritize it?
          // Actually, if we are in a P inside a TD, do we want to align the P or the TD?
          // User request: "can you implement style="text-align: center" to the table td ?"
          // This implies they prefer cell-level alignment.
        }
        if (['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.nodeName)) {
          blockNode = el;
        }
      }
      node = node.parentNode;
    }

    if (cellNode) {
      cellNode.style.textAlign = alignment;
      // If there are block elements inside, their own alignment might override the cell's
      // So we might want to clear their alignment or set it to inherit/match?
      // For now, let's just set the cell alignment as requested.
      // Also, if we set cell alignment, we probably don't want to set block alignment too if specifically asked for cell.

      // However, if the user explicitly wants to align a specific paragraph inside a cell differently?
      // The request is specific: "When I am trying to align the content in the table cell, a p tag being applied... Instead... implement style to the table td"
      // So we should prioritize the cell.
      return;
    }

    if (blockNode) {
      blockNode.style.textAlign = alignment;
    } else {
      const p = document.createElement('p');
      p.style.textAlign = alignment;
      const range = selection.getRangeAt(0);
      try {
        range.surroundContents(p);
      } catch (e) {
        const fragment = range.extractContents();
        p.appendChild(fragment);
        range.insertNode(p);
      }
    }
  }

  applyStyle(editor: HTMLElement, property: string, value: string): void {
    if (!this.sanitization.isSafeStyleValue(property, value)) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.style.setProperty(property, value);

    try {
      range.surroundContents(span);
    } catch (e) {
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
    }
  }

  removeStyleFromSelection(editor: HTMLElement, property: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // Recursively find and remove the style property from all elements
    const removeStyle = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        element.style.removeProperty(property);

        // If the element has no remaining styles and is a span, we can potentially remove it
        if (element.tagName === 'SPAN' && !element.style.cssText) {
          const parent = element.parentNode;
          while (element.firstChild) {
            parent?.insertBefore(element.firstChild, element);
          }
          element.remove();
          return; // Node is removed, stop processing its previous children
        }
      }

      // Process children
      const children = Array.from(node.childNodes);
      children.forEach(child => removeStyle(child));
    };

    const fragment = range.extractContents();
    removeStyle(fragment);

    range.insertNode(fragment);
  }

  applyCodeFormatting(): void {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();
      if (selectedText) {
        const codeElement = document.createElement('code');
        codeElement.textContent = selectedText;
        range.deleteContents();
        range.insertNode(codeElement);
        range.setStartAfter(codeElement);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }

  handleListCommand(editor: HTMLElement, listType: 'UL' | 'OL'): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    let node = selection.anchorNode;
    let listNode: HTMLElement | null = null;
    let listItemNode: HTMLElement | null = null;

    while (node && node !== editor) {
      if (node.nodeName === 'UL' || node.nodeName === 'OL') {
        listNode = node as HTMLElement;
      }
      if (node.nodeName === 'LI') {
        listItemNode = node as HTMLElement;
      }
      node = node.parentNode;
    }

    if (listNode && listItemNode) {
      if (listNode.nodeName === listType) {
        const p = document.createElement('p');
        p.innerHTML = listItemNode.innerHTML;
        listNode.parentNode?.insertBefore(p, listNode.nextSibling);
        listItemNode.remove();
        if (listNode.childNodes.length === 0) {
          listNode.remove();
        }
      } else {
        const newList = document.createElement(listType);
        newList.innerHTML = listNode.innerHTML;
        listNode.parentNode?.replaceChild(newList, listNode);
      }
    } else {
      const block = this.utils.findParentBlock(editor, selection.anchorNode);
      if (block) {
        const list = document.createElement(listType);
        const li = document.createElement('li');
        li.innerHTML = block.innerHTML;
        list.appendChild(li);
        block.parentNode?.replaceChild(list, block);
      }
    }
  }

  clearModernFormatting(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const fragment = range.extractContents();
    const div = document.createElement('div');
    div.appendChild(fragment);

    const tagsToStrip = ['STRONG', 'B', 'EM', 'I', 'U', 'STRIKE', 'S', 'SUB', 'SUP', 'CODE', 'SPAN'];
    tagsToStrip.forEach((tag) => {
      const elements = div.getElementsByTagName(tag);
      while (elements.length > 0) {
        const el = elements[0];
        const parent = el.parentNode;
        while (el.firstChild) {
          parent?.insertBefore(el.firstChild, el);
        }
        el.remove();
      }
    });

    const spans = div.getElementsByTagName('span');
    while (spans.length > 0) {
      const span = spans[0];
      const parent = span.parentNode;
      while (span.firstChild) {
        parent?.insertBefore(span.firstChild, span);
      }
      span.remove();
    }

    range.insertNode(div.firstChild || document.createTextNode(''));
  }

  insertModernImage(url: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    // Validate and sanitize URL
    const sanitizedUrl = this.sanitization.sanitizeImageUrl(url);
    if (!sanitizedUrl) return;

    const range = selection.getRangeAt(0);
    const img = document.createElement('img');
    img.src = sanitizedUrl;
    img.style.maxWidth = '100%';

    range.deleteContents();
    range.insertNode(img);

    const br = document.createElement('br');
    range.setStartAfter(img);
    range.insertNode(br);
    range.collapse(true);
  }

  insertModernHTML(html: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    // Sanitize HTML before insertion
    const sanitizedHtml = this.sanitization.sanitizeEditorContent(html);

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const template = document.createElement('template');
    template.innerHTML = sanitizedHtml.trim();
    const fragment = template.content;

    range.insertNode(fragment);

    // Attempt to focus after inserted content
    setTimeout(() => {
      selection.collapseToEnd();
    }, 0);
  }

  insertBlock(editor: HTMLElement, html: string, trusted = false): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const sanitizedHtml = trusted
      ? this.sanitization.sanitizeTrustedHtml(html)
      : this.sanitization.sanitizeEditorContent(html);

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const template = document.createElement('template');
    template.innerHTML = sanitizedHtml.trim();
    // Use the whole content (DocumentFragment) instead of just firstChild
    const fragment = template.content;

    if (!fragment.firstChild) return;

    // Find the closest block parent (P, H1-H6, DIV, LI)
    let parentBlock: HTMLElement | null = null;
    let node = range.startContainer as Node;

    // Helper to find parent block
    while (node && node !== editor) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DIV', 'LI'].includes(el.nodeName)) {
          parentBlock = el;
          break;
        }
      }
      node = node.parentNode!;
    }

    if (parentBlock && parentBlock.nodeName === 'P') {
      // Split the paragraph
      const rightRange = document.createRange();
      rightRange.setStart(range.startContainer, range.startOffset);
      rightRange.setEndAfter(parentBlock.lastChild || parentBlock);

      const rightFragment = rightRange.extractContents();

      // Insert the new block(s) after the current paragraph
      // NOTE: insertBefore moves nodes from fragment, so we need a reference to the last inserted node for cursor positioning
      const lastInsertedNode = fragment.lastChild;
      const firstInsertedNode = fragment.firstChild;

      parentBlock.parentNode?.insertBefore(fragment, parentBlock.nextSibling);

      // Create a new paragraph for the right part
      const newP = document.createElement('p');
      newP.appendChild(rightFragment);

      if (newP.innerHTML.trim() === '') {
        newP.innerHTML = '<br>';
      }

      // Insert newP after the last inserted block node
      if (lastInsertedNode) {
        if (lastInsertedNode.nextSibling) {
          lastInsertedNode.parentNode?.insertBefore(newP, lastInsertedNode.nextSibling);
        } else {
          lastInsertedNode.parentNode?.appendChild(newP);
        }
      } else {
        // Should not happen if fragment has children
        parentBlock.parentNode?.insertBefore(newP, parentBlock.nextSibling);
      }

      if (parentBlock.innerHTML.trim() === '') {
        parentBlock.innerHTML = '<br>';
      }

    } else {
      // Fallback: just insert at range
      range.insertNode(fragment);
    }

    // Position cursor
    setTimeout(() => {
      selection.collapseToEnd();
    }, 0);
  }

  insertCodeBlock(editor: HTMLElement): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    let node = selection.anchorNode;
    let blockNode: HTMLElement | null = null;

    // Check if we're already in a code block
    while (node && node !== editor) {
      if (node.nodeName === 'PRE') {
        blockNode = node as HTMLElement;
        break;
      }
      node = node.parentNode;
    }

    if (blockNode) {
      // If already in a code block, convert back to paragraph
      const p = document.createElement('p');
      const codeElement = blockNode.querySelector('code');
      if (codeElement) {
        p.innerHTML = codeElement.innerHTML.replace(/<br>/g, ' ');
      } else {
        p.innerHTML = blockNode.innerHTML.replace(/<br>/g, ' ');
      }
      
      blockNode.parentNode?.replaceChild(p, blockNode);

      // Restore selection
      const newRange = document.createRange();
      newRange.selectNodeContents(p);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } else {
      // Find the current block to convert to code block
      node = selection.anchorNode;
      let currentBlock: HTMLElement | null = null;

      while (node && node !== editor) {
        if (['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DIV'].includes(node.nodeName)) {
          currentBlock = node as HTMLElement;
          break;
        }
        node = node.parentNode;
      }

      if (currentBlock) {
        // Create code block structure
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        
        // Get text content, preserving line breaks
        const textContent = currentBlock.textContent || '';
        code.textContent = textContent || '\u200B'; // Zero-width space if empty
        
        pre.appendChild(code);
        pre.setAttribute('contenteditable', 'true');
        
        currentBlock.parentNode?.replaceChild(pre, currentBlock);

        // Set cursor at the end of the code block
        const newRange = document.createRange();
        newRange.selectNodeContents(code);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        // Ensure there's a paragraph after the code block for easy exit
        if (!pre.nextSibling || (pre.nextSibling.nodeType === Node.ELEMENT_NODE && (pre.nextSibling as HTMLElement).tagName !== 'P')) {
          const followingP = document.createElement('p');
          followingP.innerHTML = '<br>';
          if (pre.nextSibling) {
            editor.insertBefore(followingP, pre.nextSibling);
          } else {
            editor.appendChild(followingP);
          }
        }
      } else {
        // No block found, insert a new code block
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = '\u200B'; // Zero-width space
        pre.appendChild(code);
        pre.setAttribute('contenteditable', 'true');

        const range = selection.getRangeAt(0);
        range.insertNode(pre);

        // Add a paragraph after for easy exit
        const followingP = document.createElement('p');
        followingP.innerHTML = '<br>';
        if (pre.nextSibling) {
          editor.insertBefore(followingP, pre.nextSibling);
        } else {
          editor.appendChild(followingP);
        }

        // Set cursor inside the code block
        const newRange = document.createRange();
        newRange.selectNodeContents(code);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }
  }
}
