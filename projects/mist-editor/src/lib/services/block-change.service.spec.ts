import { BlockChangeService } from './block-change.service';
import { BlockDocumentService } from './block-document.service';

describe('BlockChangeService', () => {
  let service: BlockChangeService;
  let blocks: BlockDocumentService;
  let editor: HTMLDivElement;

  beforeEach(() => {
    service = new BlockChangeService();
    blocks = new BlockDocumentService();
    editor = document.createElement('div');
    document.body.appendChild(editor);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('should emit insert patches immediately on first sync', () => {
    editor.innerHTML = '<p>Hello</p>';
    const emitted: unknown[] = [];

    service.sync(editor, blocks, (patch) => emitted.push(patch), 150);

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({ op: 'insert' });
  });

  it('should debounce update patches', () => {
    editor.innerHTML = '<p>Hello</p>';
    service.sync(editor, blocks, () => undefined, 150);

    const blockId = blocks.captureSnapshot(editor).order[0];
    editor.innerHTML = `<p data-mist-block="${blockId}">Hello world</p>`;

    const emitted: unknown[] = [];
    service.sync(editor, blocks, (patch) => emitted.push(patch), 150);

    expect(emitted).toHaveLength(0);

    vi.advanceTimersByTime(150);
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({ op: 'update', id: blockId });
  });

  it('should emit delete patches immediately', () => {
    editor.innerHTML = '<p data-mist-block="b_one">One</p><p data-mist-block="b_two">Two</p>';
    service.sync(editor, blocks, () => undefined, 150);

    editor.innerHTML = '<p data-mist-block="b_one">One</p>';
    const emitted: unknown[] = [];
    service.sync(editor, blocks, (patch) => emitted.push(patch), 150);

    expect(emitted).toEqual([{ op: 'delete', id: 'b_two' }]);
  });

  it('should flush pending updates on demand', () => {
    editor.innerHTML = '<p>Hello</p>';
    service.sync(editor, blocks, () => undefined, 150);

    const blockId = blocks.captureSnapshot(editor).order[0];
    editor.innerHTML = `<p data-mist-block="${blockId}">Hello world</p>`;

    const emitted: unknown[] = [];
    service.sync(editor, blocks, (patch) => emitted.push(patch), 150);

    service.flush(editor, (patch) => emitted.push(patch));
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({ op: 'update', id: blockId });
  });
});
