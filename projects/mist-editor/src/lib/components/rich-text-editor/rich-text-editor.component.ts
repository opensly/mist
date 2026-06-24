import {
  Component,
  input,
  output,
  signal,
  effect,
  ElementRef,
  ViewChild,
  AfterViewInit,
  HostListener,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableOptionsComponent, TableAction } from '../table-options/table-options.component';
import { EditorUtilsService } from '../../services/editor-utils.service';
import { EditorFormattingService } from '../../services/editor-formatting.service';
import { TableService } from '../../services/table.service';
import { SanitizationService } from '../../services/sanitization.service';
import { BlockDocumentService } from '../../services/block-document.service';
import { BlockPatch } from '../../models/editor-block.model';

export interface CommandMenuItem {
  id: string;
  label: string;
  icon?: string;
  action: () => void;
}

export interface EditorToolbarState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  blockType: string;
  alignment: string;
  textColor: string;
  highlightColor: string;
}

@Component({
  selector: 'mist-rich-text-editor',
  imports: [CommonModule, TableOptionsComponent],
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class RichTextEditorComponent implements AfterViewInit {
  @ViewChild('editor') editorElement!: ElementRef<HTMLDivElement>;

  content = input<string>('');
  placeholder = input<string>('Type / to insert elements');

  contentChange = output<string>();
  blockChange = output<BlockPatch>();
  toolbarStateChange = output<EditorToolbarState>();
  formatCommand = output<string>();

  showCommandMenu = signal<boolean>(false);
  commandMenuPosition = signal<{ top: number; left: number }>({ top: 0, left: 0 });
  commandFilter = signal<string>('');

  selectedTable = signal<HTMLTableElement | null>(null);
  tableOptionsPosition = signal<{ top: number; left: number }>({ top: 0, left: 0 });

  /** Prevents the content() effect from resetting DOM after our own contentChange emissions. */
  private lastEmittedContent: string | null = null;

  commandMenuItems: CommandMenuItem[] = [
    { id: 'heading1', label: 'Heading 1', action: () => this.insertHeading(1) },
    { id: 'heading2', label: 'Heading 2', action: () => this.insertHeading(2) },
    { id: 'heading3', label: 'Heading 3', action: () => this.insertHeading(3) },
    { id: 'paragraph', label: 'Paragraph', action: () => this.insertParagraph() },
    { id: 'bulletlist', label: 'Bullet List', action: () => this.insertList('ul') },
    { id: 'numberedlist', label: 'Numbered List', action: () => this.insertList('ol') },
    { id: 'codeblock', label: 'Code Block', action: () => this.insertCodeBlock() },
    { id: 'image', label: 'Image', action: () => this.insertImage() },
    { id: 'table', label: 'Table', action: () => this.insertTable() },
  ];

  constructor(
    private utils: EditorUtilsService,
    private formatting: EditorFormattingService,
    private tableService: TableService,
    private sanitization: SanitizationService,
    private blocks: BlockDocumentService
  ) {
    effect(() => {
      const incoming = this.content();
      if (!this.editorElement?.nativeElement) return;

      // Parent is echoing back content we just emitted — do not overwrite the live DOM.
      if (incoming === this.lastEmittedContent) return;

      const editor = this.editorElement.nativeElement;
      const sanitizedContent = this.sanitization.sanitizeEditorContent(incoming);
      if (editor.innerHTML !== sanitizedContent) {
        editor.innerHTML = sanitizedContent;
      }
      this.blocks.ensureAllBlockIds(editor);
      this.lastEmittedContent = sanitizedContent;
    });
  }

  ngAfterViewInit(): void {
    const editor = this.editorElement.nativeElement;

    // Ensure initial paragraph structure if empty
    if (!this.content() || this.content().trim() === '') {
      if (editor.innerHTML.trim() === '' || editor.innerHTML === '<br>') {
        editor.innerHTML = '<p><br></p>';
        this.blocks.ensureAllBlockIds(editor);
        this.lastEmittedContent = editor.innerHTML;
      }
    } else {
      const sanitizedContent = this.sanitization.sanitizeEditorContent(this.content());
      editor.innerHTML = sanitizedContent;
      this.blocks.ensureAllBlockIds(editor);
      this.lastEmittedContent = sanitizedContent;
    }
  }

  private publishContent(blockPatches: BlockPatch[] = []): void {
    const editor = this.editorElement?.nativeElement;
    if (!editor) {
      return;
    }

    const assembled = this.blocks.assembleHtml(editor);
    this.lastEmittedContent = assembled;

    for (const patch of blockPatches) {
      this.blockChange.emit(patch);
    }

    this.contentChange.emit(assembled);
  }

  private emitContentChange(options?: { fullDocument?: boolean }): void {
    const editor = this.editorElement?.nativeElement;
    if (!editor) {
      return;
    }

    this.blocks.ensureAllBlockIds(editor);

    if (options?.fullDocument) {
      const raw = editor.innerHTML;
      const sanitized = this.sanitization.sanitizeEditorContent(raw);
      if (sanitized !== raw) {
        const savedSelection = this.blocks.saveBlockSelection(editor);
        editor.innerHTML = sanitized;
        this.blocks.ensureAllBlockIds(editor);
        this.blocks.restoreBlockSelection(editor, savedSelection);
      }
    } else {
      const selection = window.getSelection();
      const activeBlock = selection
        ? this.blocks.getActiveRootBlock(editor, selection.anchorNode)
        : null;

      if (activeBlock) {
        const blockId = this.blocks.ensureBlockId(activeBlock);
        const changed = this.blocks.sanitizeBlockInPlace(editor, activeBlock, this.sanitization);
        if (changed) {
          const updated = this.blocks.findBlockById(editor, blockId);
          if (updated) {
            this.publishContent([
              { op: 'update', id: blockId, html: updated.outerHTML },
            ]);
            return;
          }
        }
      }
    }

    this.publishContent();
  }

  private placeCursorAtEnd(element: HTMLElement): void {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  private mergeSingleCharParagraphs(editor: HTMLDivElement): void {
    let previousParagraph: HTMLParagraphElement | null = null;

    for (const child of Array.from(editor.children)) {
      if (!(child instanceof HTMLParagraphElement)) {
        previousParagraph = null;
        continue;
      }

      const text = child.textContent ?? '';
      if (text.length === 1 && previousParagraph?.textContent?.length === 1) {
        previousParagraph.textContent += text;
        child.remove();
        continue;
      }

      previousParagraph = text.length === 1 ? child : null;
    }
  }

  onInput(event: Event): void {
    const editor = event.target as HTMLDivElement;

    let needsUpdate = false;
    let savedSelection: { markerId: string } | null = null;
    const touchedBlocks = new Set<HTMLElement>();

    // 1. Wrap all naked root text nodes in a single <p>
    const rootTextNodes = Array.from(editor.childNodes).filter(
      (child): child is Text =>
        child.nodeType === Node.TEXT_NODE &&
        !!child.textContent &&
        child.textContent.trim() !== '',
    );

    if (rootTextNodes.length > 0) {
      if (!savedSelection) savedSelection = this.utils.saveSelection();

      let targetParagraph: HTMLParagraphElement | null = null;
      for (const textNode of rootTextNodes) {
        const previousSibling = textNode.previousSibling;
        const emptyParagraph =
          previousSibling instanceof HTMLParagraphElement &&
          (previousSibling.textContent === '' || previousSibling.innerHTML === '<br>');

        if (emptyParagraph) {
          targetParagraph = previousSibling;
        } else if (!targetParagraph) {
          targetParagraph = document.createElement('p');
          editor.insertBefore(targetParagraph, textNode);
        }

        targetParagraph.appendChild(textNode);
      }

      if (targetParagraph) {
        this.placeCursorAtEnd(targetParagraph);
        savedSelection = null;
      }

      needsUpdate = true;
    }

    const children = Array.from(editor.childNodes);
    children.forEach(child => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        // 2. Convert <div> to <p> (except for panels/tables/code blocks)
        if (el.tagName === 'DIV' && !el.classList.contains('editor-panel')) {
          if (!savedSelection) savedSelection = this.utils.saveSelection();

          // Check if the DIV contains block elements (H1-H6, Table, UL, OL, PRE, etc.)
          // If so, unwrapping is safer than converting to P (which would create invalid nesting)
          if (el.querySelector('table, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, pre')) {
            const fragment = document.createDocumentFragment();
            while (el.firstChild) {
              fragment.appendChild(el.firstChild);
            }
            editor.replaceChild(fragment, el);
            needsUpdate = true;
          } else {
            // Safe to convert to P
            const p = document.createElement('p');
            p.innerHTML = el.innerHTML;
            // Carry over styles (like text-align)
            if (el.style.cssText) {
              p.style.cssText = el.style.cssText;
            }
            this.blocks.copyBlockId(el, p);
            editor.replaceChild(p, el);
            touchedBlocks.add(p);
            needsUpdate = true;
          }
        }
      }
    });

    // 3. Ensure it's not empty
    if (editor.innerHTML.trim() === '' || editor.innerHTML === '<br>') {
      editor.innerHTML = '<p><br></p>';
      needsUpdate = true;
    }

    // 4. Collapse accidental one-character paragraphs created by lost cursor position
    this.mergeSingleCharParagraphs(editor);

    this.blocks.ensureAllBlockIds(editor);

    const selection = window.getSelection();
    const activeBlock = selection
      ? this.blocks.getActiveRootBlock(editor, selection.anchorNode)
      : null;
    if (activeBlock) {
      touchedBlocks.add(activeBlock);
    }

    let blockPatches: BlockPatch[] = [];
    if (touchedBlocks.size > 0) {
      const changed = this.blocks.sanitizeBlocksInPlace(
        editor,
        Array.from(touchedBlocks),
        this.sanitization,
      );
      blockPatches = changed.map((block) => ({
        op: 'update' as const,
        id: this.blocks.ensureBlockId(block),
        html: block.outerHTML,
      }));
    } else if (activeBlock) {
      const blockId = this.blocks.ensureBlockId(activeBlock);
      if (this.blocks.sanitizeBlockInPlace(editor, activeBlock, this.sanitization)) {
        const updated = this.blocks.findBlockById(editor, blockId);
        if (updated) {
          blockPatches = [{ op: 'update', id: blockId, html: updated.outerHTML }];
        }
      }
    }

    this.publishContent(blockPatches);

    // Check for "/" command
    this.checkForSlashCommand(editor);

    if (this.selectedTable()) {
      setTimeout(() => this.recalculateTablePosition(), 0);
    }

    if (savedSelection) {
      this.utils.restoreSelection(editor, savedSelection);
    }

    this.updateToolbarState();
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();

    const clipboard = event.clipboardData;
    if (!clipboard) return;

    const html = clipboard.getData('text/html');
    const text = clipboard.getData('text/plain');

    if (html?.trim()) {
      const sanitized = this.sanitization.sanitizeEditorContent(html);
      if (sanitized) {
        this.formatting.insertModernHTML(sanitized);
      }
    } else if (text) {
      this.insertPlainTextAtSelection(text);
    }

    this.emitContentChange({ fullDocument: true });
    this.updateToolbarState();
  }

  private insertPlainTextAtSelection(text: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  onKeyDown(event: KeyboardEvent): void {
    const editor = event.target as HTMLDivElement;

    // Handle command menu navigation
    if (this.showCommandMenu()) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.hideCommandMenu();
        return;
      }
    }

    // Handle code block navigation
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let node = selection.anchorNode;
      let codeBlock: HTMLElement | null = null;

      // Check if we're inside a code block
      while (node && node !== editor) {
        if (node.nodeName === 'PRE') {
          codeBlock = node as HTMLElement;
          break;
        }
        node = node.parentNode;
      }

      if (codeBlock) {
        // Handle Enter key in code block - exit on double Enter
        if (event.key === 'Enter') {
          const range = selection.getRangeAt(0);
          const codeElement = codeBlock.querySelector('code');
          const content = codeElement?.textContent || '';
          
          // Check if cursor is at the end and last character is a newline
          const cursorAtEnd = range.endOffset === (range.endContainer.textContent?.length || 0);
          const endsWithNewline = content.endsWith('\n');
          
          if (cursorAtEnd && endsWithNewline) {
            // Exit code block on second Enter
            event.preventDefault();
            this.exitCodeBlock(editor, codeBlock);
            return;
          }
        }

        // Handle ArrowDown at the end of code block
        if (event.key === 'ArrowDown') {
          const range = selection.getRangeAt(0);
          const codeElement = codeBlock.querySelector('code');
          
          if (codeElement) {
            const content = codeElement.textContent || '';
            const lines = content.split('\n');
            const currentOffset = range.endOffset;
            
            // Calculate which line we're on
            let charCount = 0;
            let currentLine = 0;
            for (let i = 0; i < lines.length; i++) {
              charCount += lines[i].length + 1; // +1 for newline
              if (currentOffset < charCount) {
                currentLine = i;
                break;
              }
            }
            
            // If on last line, exit code block
            if (currentLine === lines.length - 1) {
              event.preventDefault();
              this.exitCodeBlock(editor, codeBlock);
              return;
            }
          }
        }

        // Handle ArrowUp at the beginning of code block
        if (event.key === 'ArrowUp') {
          const range = selection.getRangeAt(0);
          
          // If at the very beginning, move to previous block
          if (range.startOffset === 0 && range.endOffset === 0) {
            event.preventDefault();
            this.moveToPreviousBlock(editor, codeBlock);
            return;
          }
        }
      }
    }

    // Check for "/" key
    if (event.key === '/') {
      setTimeout(() => this.checkForSlashCommand(editor), 0);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const table = target.closest('table') as HTMLTableElement;

    if (table && this.editorElement.nativeElement.contains(table)) {
      this.selectedTable.set(table);
      setTimeout(() => this.recalculateTablePosition(), 0);
    } else {
      // Check if click is inside the table options toolbar
      const toolbar = target.closest('.table-options-toolbar');
      if (!toolbar) {
        this.selectedTable.set(null);
      }
    }
  }

  private lastSelectionRange: Range | null = null;

  @HostListener('mouseup')
  @HostListener('keyup')
  updateToolbarState(): void {
    const editor = this.editorElement.nativeElement;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
      this.lastSelectionRange = selection.getRangeAt(0).cloneRange();
    }

    const state: EditorToolbarState = {
      bold: this.utils.isFormatActive(editor, 'STRONG') || this.utils.isFormatActive(editor, 'B'),
      italic: this.utils.isFormatActive(editor, 'EM') || this.utils.isFormatActive(editor, 'I'),
      underline: this.utils.isFormatActive(editor, 'U'),
      blockType: this.utils.getCurrentBlockType(editor),
      alignment: this.utils.getCurrentAlignment(editor),
      textColor: this.utils.getCurrentColor(editor, 'color'),
      highlightColor: this.utils.getCurrentColor(editor, 'backgroundColor'),
    };
    this.toolbarStateChange.emit(state);
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.selectedTable()) {
      this.recalculateTablePosition();
    }
  }

  recalculateTablePosition(): void {
    const table = this.selectedTable();
    const editor = this.editorElement.nativeElement;
    const wrapper = editor.closest('.mist-editor-wrapper');
    if (!table || !wrapper) return;

    const tableRect = table.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();

    // High-precision relative positioning
    const top = tableRect.bottom - wrapperRect.top + 10;
    const left = tableRect.left - wrapperRect.left + tableRect.width / 2;

    this.tableOptionsPosition.set({ top, left });
  }

  checkForSlashCommand(editor: HTMLDivElement): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textContent = range.startContainer.textContent || '';
    const cursorPosition = range.startOffset;

    // Check if there's a "/" before cursor
    const textBeforeCursor = textContent.substring(0, cursorPosition);
    const slashMatch = textBeforeCursor.match(/\/(\w*)$/);

    if (slashMatch) {
      this.commandFilter.set(slashMatch[1]);
      this.showCommandMenuAtCursor();
    } else {
      this.hideCommandMenu();
    }
  }

  showCommandMenuAtCursor(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const editorRect = this.editorElement.nativeElement.getBoundingClientRect();

    this.commandMenuPosition.set({
      top: rect.bottom - editorRect.top + 5,
      left: rect.left - editorRect.left,
    });
    this.showCommandMenu.set(true);
  }

  hideCommandMenu(): void {
    this.showCommandMenu.set(false);
    this.commandFilter.set('');
  }

  getFilteredCommands(): CommandMenuItem[] {
    const filter = this.commandFilter().toLowerCase();
    if (!filter) return this.commandMenuItems;
    return this.commandMenuItems.filter((item) => item.label.toLowerCase().includes(filter));
  }

  executeCommand(item: CommandMenuItem): void {
    this.removeSlashCommand();
    item.action();
    this.hideCommandMenu();
    this.editorElement.nativeElement.focus();
  }

  removeSlashCommand(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;
    const text = textNode.textContent || '';
    const cursorPosition = range.startOffset;

    const textBeforeCursor = text.substring(0, cursorPosition);
    const slashMatch = textBeforeCursor.match(/\/(\w*)$/);

    if (slashMatch && textNode.nodeType === Node.TEXT_NODE) {
      const slashIndex = cursorPosition - slashMatch[0].length;
      const newText = text.substring(0, slashIndex) + text.substring(cursorPosition);
      textNode.textContent = newText;

      // Reset cursor position
      range.setStart(textNode, slashIndex);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  private restoreLastSelection(editor: HTMLElement): void {
    if (
      !this.lastSelectionRange ||
      this.lastSelectionRange.collapsed ||
      !editor.contains(this.lastSelectionRange.startContainer)
    ) {
      return;
    }

    const selection = window.getSelection();
    const needsRestore =
      !selection ||
      selection.rangeCount === 0 ||
      selection.isCollapsed ||
      !editor.contains(selection.anchorNode);

    if (needsRestore) {
      selection?.removeAllRanges();
      selection?.addRange(this.lastSelectionRange.cloneRange());
    }
  }

  // Formatting commands (Modern implementation without execCommand)
  execCommand(command: string, value?: string): void {
    const editor = this.editorElement.nativeElement;
    editor.focus();
    this.restoreLastSelection(editor);

    const blockTypeMap: Record<string, string> = {
      p: 'p',
      h1: 'h1',
      h2: 'h2',
      h3: 'h3',
      h4: 'h4',
      h5: 'h5',
      h6: 'h6',
    };

    if (blockTypeMap[command]) {
      this.formatting.setBlockType(editor, blockTypeMap[command]);
      this.emitContent();
      this.updateToolbarState();
      return;
    }

    const inlineFormatMap: Record<string, string> = {
      bold: 'STRONG',
      italic: 'EM',
      underline: 'U',
      strikethrough: 'STRIKE',
    };

    if (inlineFormatMap[command]) {
      this.formatting.toggleInlineFormat(editor, inlineFormatMap[command]);
      this.emitContent();
      this.updateToolbarState();
      return;
    }

    if (command === 'code') {
      this.formatting.applyCodeFormatting();
      this.emitContent();
      this.updateToolbarState();
      return;
    }

    if (command === 'justifyLeft' || command === 'justifyCenter' || command === 'justifyRight') {
      this.formatting.setTextAlignment(editor, command.replace('justify', '').toLowerCase());
      this.emitContent();
      this.updateToolbarState();
      return;
    }

    if (command === 'foreColor' && value) {
      this.formatting.applyStyle(editor, 'color', value);
      this.emitContent();
      this.updateToolbarState();
      return;
    }

    if (command === 'hiliteColor' && value) {
      this.formatting.applyStyle(editor, 'background-color', value);
      this.emitContent();
      this.updateToolbarState();
      return;
    }

    if (command === 'insertOrderedList' || command === 'insertUnorderedList') {
      this.formatting.handleListCommand(editor, command === 'insertOrderedList' ? 'OL' : 'UL');
      this.emitContent();
      this.updateToolbarState();
      return;
    }

    if (command === 'insertImage' && value) {
      this.formatting.insertModernImage(value);
      this.emitContent();
      this.updateToolbarState();
      return;
    }

    if (command === 'insertHTML' && value) {
      this.formatting.insertModernHTML(value);
      this.emitContent();
      this.updateToolbarState();
      return;
    }

    if (command === 'subscript') {
      this.formatting.toggleInlineFormat(editor, 'SUB');
      this.emitContent();
      this.updateToolbarState();
      return;
    }

    if (command === 'superscript') {
      this.formatting.toggleInlineFormat(editor, 'SUP');
      this.emitContent();
      this.updateToolbarState();
      return;
    }

    if (command === 'removeFormat') {
      this.formatting.clearModernFormatting();
      this.emitContent();
      this.updateToolbarState();
      return;
    }

    console.warn(`Command ${command} is not supported in the modern editor engine.`);
  }


  insertHeading(level: number): void {
    this.execCommand('h' + level);
  }

  insertParagraph(): void {
    this.execCommand('p');
  }

  insertList(type: 'ul' | 'ol'): void {
    if (type === 'ul') {
      this.execCommand('insertUnorderedList');
    } else {
      this.execCommand('insertOrderedList');
    }
  }

  insertImage(): void {
    const url = prompt('Enter image URL:');
    if (url) {
      const sanitizedUrl = this.sanitization.sanitizeImageUrl(url);
      if (sanitizedUrl) {
        this.execCommand('insertImage', sanitizedUrl);
      } else {
        alert('Invalid image URL. Please use http:// or https:// URLs only.');
      }
    }
  }

  insertTable(): void {
    const tableId = this.blocks.createBlockId();
    const tableHtml = this.tableService.createTable(3, 3, tableId);
    // Add spacing paragraphs around the table
    const wrapperHtml = `<p><br></p>${tableHtml}<p><br></p>`;

    // Use insertBlock to ensure it splits the current paragraph
    this.formatting.insertBlock(this.editorElement.nativeElement, wrapperHtml, true);

    setTimeout(() => {
      const insertedTable = this.editorElement.nativeElement.querySelector(
        `#${tableId}`,
      ) as HTMLTableElement;
      if (insertedTable) {
        this.selectedTable.set(insertedTable);
        this.recalculateTablePosition();

        const firstCell = insertedTable.querySelector('td');
        if (firstCell) {
          const range = document.createRange();
          const sel = window.getSelection();
          range.setStart(firstCell, 0);
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
          firstCell.focus();
        }
      }
    }, 10);
  }

  onTableAction(action: TableAction): void {
    const table = this.selectedTable();
    if (!table) return;

    let tableRemoved = false;

    switch (action.type) {
      case 'addRowAbove':
      case 'addRowBelow':
      case 'addColumnLeft':
      case 'addColumnRight':
      case 'deleteRow':
      case 'deleteColumn':
        tableRemoved = this.tableService.handleTableManipulation(table, action.type);
        if (tableRemoved) {
          this.selectedTable.set(null);
        }
        break;
      case 'deleteTable':
        table.remove();
        this.selectedTable.set(null);
        tableRemoved = true;
        this.emitContent();
        break;
      case 'alignLeft':
        table.style.marginLeft = '0';
        table.style.marginRight = 'auto';
        break;
      case 'alignCenter':
        table.style.marginLeft = 'auto';
        table.style.marginRight = 'auto';
        break;
      case 'alignRight':
        table.style.marginLeft = 'auto';
        table.style.marginRight = '0';
        break;
      case 'setCellBackground':
        if (action.payload) {
          this.tableService.setCellBackground(table, action.payload);
        }
        break;
    }

    if (!tableRemoved) {
      setTimeout(() => this.recalculateTablePosition(), 0);
      this.emitContent();
    }
  }



  insertHTML(html: string): void {
    this.execCommand('insertHTML', html);
  }

  emitContent(): void {
    this.emitContentChange({ fullDocument: true });
  }

  bold(): void { this.execCommand('bold'); }
  italic(): void { this.execCommand('italic'); }
  underline(): void { this.execCommand('underline'); }
  alignLeft(): void { this.execCommand('justifyLeft'); }
  alignCenter(): void { this.execCommand('justifyCenter'); }
  alignRight(): void { this.execCommand('justifyRight'); }
  strikethrough(): void { this.execCommand('strikethrough'); }
  code(): void { this.execCommand('code'); }
  subscript(): void { this.execCommand('subscript'); }
  superscript(): void { this.execCommand('superscript'); }
  clearFormatting(): void { this.execCommand('removeFormat'); }
  createOrderedList(): void { this.execCommand('insertOrderedList'); }
  createUnorderedList(): void { this.execCommand('insertUnorderedList'); }
  
  insertCodeBlock(): void {
    this.formatting.insertCodeBlock(this.editorElement.nativeElement);
    this.emitContent();
    this.updateToolbarState();
  }

  insertPanel(type: string): void {
    const panelBlockId = this.blocks.createBlockId();
    const panelDomId = `panel-${panelBlockId.replace(/^b_/, '')}`;
    const panelConfigs: Record<string, { icon: string; title: string }> = {
      info: {
        title: 'Info Panel',
        icon: `<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#0052cc" /><path d="M11 11h2v7h-2v-7zm0-3h2v2h-2V8z" fill="white" /></svg>`,
      },
      note: {
        title: 'Note Panel',
        icon: `<svg width="24" height="24" viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2" fill="#6554c0" /><rect x="8" y="7" width="8" height="2" fill="white" /></svg>`,
      },
      success: {
        title: 'Success Panel',
        icon: `<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#36b37e" /><path d="M7 12l3 3 7-7" stroke="white" stroke-width="2" fill="none" /></svg>`,
      },
      error: {
        title: 'Error Panel',
        icon: `<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#de350b" /><path d="M8 8l8 8M16 8l-8 8" stroke="white" stroke-width="2" /></svg>`,
      },
      warning: {
        title: 'Warning Panel',
        icon: `<svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 2l10 18H2L12 2z" fill="#ffab00" /><path d="M11 10h2v6h-2v-6zm0 7h2v2h-2v-2z" fill="white" /></svg>`,
      },
    };

    const config = panelConfigs[type];
    if (!config) return;

    const panelHtml = `
      <div id="${panelDomId}" data-mist-block="${panelBlockId}" class="editor-panel ${type}-panel" contenteditable="false">
        <div class="panel-icon-container">${config.icon}</div>
        <div class="panel-content" contenteditable="true">
          <p class="panel-text"><br></p>
        </div>
      </div>
    `;

    const editor = this.editorElement.nativeElement;
    const selection = window.getSelection();
    
    // Try to restore selection if lost
    if ((!selection || selection.rangeCount === 0 || !editor.contains(selection.anchorNode)) && this.lastSelectionRange) {
      selection?.removeAllRanges();
      selection?.addRange(this.lastSelectionRange);
    }
    
    // If still no valid selection, create one at the end of the editor
    if (!selection || selection.rangeCount === 0 || !editor.contains(selection.anchorNode)) {
      const range = document.createRange();
      const lastChild = editor.lastChild;
      
      if (lastChild) {
        range.setStartAfter(lastChild);
        range.collapse(true);
      } else {
        range.selectNodeContents(editor);
        range.collapse(false);
      }
      
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    this.formatting.insertBlock(editor, panelHtml, true);

    setTimeout(() => {
      const panel = editor.querySelector(`#${panelDomId}`) as HTMLElement;
      if (panel) {
        const textElement = panel.querySelector('.panel-text') as HTMLElement;
        if (textElement) {
          const range = document.createRange();
          const sel = window.getSelection();
          range.setStart(textElement, 0);
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
          textElement.focus();
        }
      }
      
      this.emitContent();
    }, 10);
  }

  setTextColor(color: string): void { this.execCommand('foreColor', color); }
  setHighlightColor(color: string): void { this.execCommand('hiliteColor', color); }
  removeTextColor(): void {
    const editor = this.editorElement.nativeElement;
    editor.focus();
    this.restoreLastSelection(editor);
    this.formatting.removeStyleFromSelection(editor, 'color');
    this.emitContent();
    this.updateToolbarState();
  }
  removeHighlightColor(): void {
    const editor = this.editorElement.nativeElement;
    editor.focus();
    this.restoreLastSelection(editor);
    this.formatting.removeStyleFromSelection(editor, 'background-color');
    this.emitContent();
    this.updateToolbarState();
  }

  private exitCodeBlock(editor: HTMLElement, codeBlock: HTMLElement): void {
    // Create a new paragraph after the code block
    const newP = document.createElement('p');
    newP.innerHTML = '<br>';
    this.blocks.assignNewBlockId(newP);
    
    // Insert after code block
    if (codeBlock.nextSibling) {
      editor.insertBefore(newP, codeBlock.nextSibling);
    } else {
      editor.appendChild(newP);
    }

    // Move cursor to the new paragraph
    const range = document.createRange();
    const selection = window.getSelection();
    range.setStart(newP, 0);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);

    // Focus the new paragraph
    newP.focus();
    this.emitContent();
  }

  private moveToPreviousBlock(editor: HTMLElement, codeBlock: HTMLElement): void {
    const previousSibling = codeBlock.previousSibling;
    
    if (previousSibling && previousSibling.nodeType === Node.ELEMENT_NODE) {
      const prevElement = previousSibling as HTMLElement;
      const range = document.createRange();
      const selection = window.getSelection();
      
      // Move cursor to end of previous block
      range.selectNodeContents(prevElement);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }
}
