import { DomSanitizer } from '@angular/platform-browser';
import { BlockDocumentService } from './block-document.service';
import { SanitizationService } from './sanitization.service';
import { MIST_BLOCK_ATTR } from '../models/editor-block.model';

describe('BlockDocumentService', () => {
  let service: BlockDocumentService;
  let sanitization: SanitizationService;
  let editor: HTMLDivElement;

  beforeEach(() => {
    const mockDomSanitizer = {
      sanitize: vi.fn((_context: unknown, value: unknown) => String(value ?? '')),
    };
    sanitization = new SanitizationService(mockDomSanitizer as unknown as DomSanitizer);
    service = new BlockDocumentService();

    editor = document.createElement('div');
    editor.contentEditable = 'true';
    document.body.appendChild(editor);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    window.getSelection()?.removeAllRanges();
  });

  it('should create valid block ids', () => {
    const id = service.createBlockId();
    expect(id).toMatch(/^b_[a-zA-Z0-9_-]+$/);
    expect(service.isValidBlockId(id)).toBe(true);
  });

  it('should treat direct editor children as root blocks', () => {
    editor.innerHTML = '<p>One</p><h2>Two</h2><div class="editor-panel">Panel</div>';
    const blocks = service.getRootBlocks(editor);
    expect(blocks).toHaveLength(3);
    expect(service.isRootBlock(blocks[0], editor)).toBe(true);
    expect(service.getBlockType(blocks[2])).toBe('panel');
  });

  it('should assign block ids to all root blocks', () => {
    editor.innerHTML = '<p>Alpha</p><p>Beta</p>';
    service.ensureAllBlockIds(editor);

    const blocks = service.getRootBlocks(editor);
    expect(blocks[0].getAttribute(MIST_BLOCK_ATTR)).toMatch(/^b_/);
    expect(blocks[1].getAttribute(MIST_BLOCK_ATTR)).toMatch(/^b_/);
    expect(blocks[0].getAttribute(MIST_BLOCK_ATTR)).not.toBe(blocks[1].getAttribute(MIST_BLOCK_ATTR));
  });

  it('should preserve an existing valid block id', () => {
    editor.innerHTML = '<p data-mist-block="b_existing">Text</p>';
    const block = editor.querySelector('p') as HTMLParagraphElement;
    expect(service.ensureBlockId(block)).toBe('b_existing');
  });

  it('should replace an invalid block id', () => {
    editor.innerHTML = '<p data-mist-block="not-valid">Text</p>';
    const block = editor.querySelector('p') as HTMLParagraphElement;
    const id = service.ensureBlockId(block);
    expect(id).toMatch(/^b_/);
    expect(id).not.toBe('not-valid');
  });

  it('should copy block id when replacing block elements', () => {
    editor.innerHTML = '<p data-mist-block="b_copyme">Text</p>';
    const from = editor.querySelector('p') as HTMLParagraphElement;
    const to = document.createElement('h2');
    service.copyBlockId(from, to);
    expect(to.getAttribute(MIST_BLOCK_ATTR)).toBe('b_copyme');
  });

  it('should resolve the active root block from a text selection', () => {
    editor.innerHTML = '<p>Hello</p><p>World</p>';
    const textNode = editor.querySelectorAll('p')[1].firstChild!;
    const range = document.createRange();
    range.setStart(textNode, 1);
    range.collapse(true);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    const block = service.getActiveRootBlock(editor, selection.anchorNode);
    expect(block?.textContent).toBe('World');
  });

  it('should save and restore selection by block id and offset', () => {
    editor.innerHTML = '<p>Hello world</p>';
    const textNode = editor.querySelector('p')!.firstChild!;
    const range = document.createRange();
    range.setStart(textNode, 6);
    range.collapse(true);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    const saved = service.saveBlockSelection(editor);
    expect(saved?.blockId).toMatch(/^b_/);
    expect(saved?.offset).toBe(6);

    range.setStart(textNode, 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    service.restoreBlockSelection(editor, saved);
    expect(selection.anchorOffset).toBe(6);
  });

  it('should sanitize a single block in place without touching siblings', () => {
    editor.innerHTML =
      '<p data-mist-block="b_safe">Safe</p><p data-mist-block="b_dirty">Bad<script>alert(1)</script></p>';
    const dirty = service.findBlockById(editor, 'b_dirty')!;
    const safeBefore = service.findBlockById(editor, 'b_safe')!.outerHTML;

    const changed = service.sanitizeBlockInPlace(editor, dirty, sanitization);
    expect(changed).toBe(true);
    expect(editor.querySelector('script')).toBeNull();
    expect(service.findBlockById(editor, 'b_safe')!.outerHTML).toBe(safeBefore);
    expect(service.findBlockById(editor, 'b_dirty')).not.toBeNull();
  });

  it('should assign a new id when Enter duplicates data-mist-block on split paragraphs', () => {
    editor.innerHTML =
      '<p data-mist-block="b_shared">Hello world</p><p data-mist-block="b_shared"><br></p>';
    const selection = window.getSelection()!;
    const newParagraph = editor.querySelectorAll('p')[1];
    const range = document.createRange();
    range.setStart(newParagraph, 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    service.ensureAllBlockIds(editor);

    const blocks = service.getRootBlocks(editor);
    const ids = blocks.map((block) => block.getAttribute(MIST_BLOCK_ATTR));
    expect(ids[0]).toBe('b_shared');
    expect(ids[1]).toMatch(/^b_/);
    expect(ids[1]).not.toBe('b_shared');

    const saved = service.saveBlockSelection(editor);
    service.restoreBlockSelection(editor, saved);
    expect(selection.anchorNode).not.toBe(blocks[0]);
  });

  it('should assemble html with block ids on every root block', () => {
    editor.innerHTML = '<p>One</p><p>Two</p>';
    const html = service.assembleHtml(editor);
    expect(html).toMatch(/data-mist-block="b_[^"]+"/);
    expect((html.match(/data-mist-block=/g) || []).length).toBe(2);
  });

  it('should diff snapshots into insert, update, and delete patches', () => {
    editor.innerHTML =
      '<p data-mist-block="b_one">One</p><p data-mist-block="b_two">Two</p>';
    const previous = service.captureSnapshot(editor);

    editor.innerHTML = '<p data-mist-block="b_one">One updated</p><p data-mist-block="b_three">Three</p>';
    const current = service.captureSnapshot(editor);

    const patches = service.diffSnapshots(previous, current);
    expect(patches).toEqual([
      { op: 'delete', id: 'b_two' },
      { op: 'update', id: 'b_one', html: current.blocks.get('b_one') },
      { op: 'insert', id: 'b_three', html: current.blocks.get('b_three'), afterId: 'b_one' },
    ]);
  });

  it('should save and resolve intra-block text anchors', () => {
    editor.innerHTML = '<p data-mist-block="b_text">Hello world</p>';
    const textNode = editor.querySelector('p')!.firstChild!;
    const range = document.createRange();
    range.setStart(textNode, 6);
    range.setEnd(textNode, 11);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    const anchor = service.saveBlockTextRange(editor);
    expect(anchor).toEqual({ blockId: 'b_text', start: 6, end: 11 });

    selection.removeAllRanges();
    const resolved = service.resolveTextAnchor(editor, anchor!);
    expect(resolved?.toString()).toBe('world');
  });

  it('should create and validate text anchors', () => {
    expect(service.createTextAnchor('b_valid', 2, 5)).toEqual({
      blockId: 'b_valid',
      start: 2,
      end: 5,
    });
    expect(service.createTextAnchor('invalid', 2, 5)).toBeNull();
    expect(service.createTextAnchor('b_valid', 5, 2)).toBeNull();
  });
});
