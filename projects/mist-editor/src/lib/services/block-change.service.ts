import { Injectable } from '@angular/core';
import { BlockDocumentService } from './block-document.service';
import { BlockPatch, BlockSnapshot } from '../models/editor-block.model';

const DEFAULT_DEBOUNCE_MS = 150;

@Injectable({
  providedIn: 'root',
})
export class BlockChangeService {
  private readonly snapshots = new WeakMap<HTMLElement, BlockSnapshot>();
  private readonly debounceTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();
  private readonly pendingUpdates = new WeakMap<HTMLElement, Map<string, BlockPatch>>();

  /**
   * Diff the editor against the last snapshot and emit patches.
   * Insert/delete emit immediately; updates are debounced per block.
   */
  sync(
    editor: HTMLElement,
    blocks: BlockDocumentService,
    emit: (patch: BlockPatch) => void,
    debounceMs = DEFAULT_DEBOUNCE_MS,
  ): void {
    const previous = this.snapshots.get(editor) ?? null;
    const current = blocks.captureSnapshot(editor);
    const patches = blocks.diffSnapshots(previous, current);

    for (const patch of patches) {
      if (patch.op === 'insert' || patch.op === 'delete') {
        emit(patch);
      } else {
        this.queueUpdate(editor, patch, emit, debounceMs);
      }
    }

    this.snapshots.set(editor, current);
  }

  /** Drop snapshot state and cancel pending debounced updates. */
  reset(editor: HTMLElement): void {
    this.clearDebounce(editor);
    this.snapshots.delete(editor);
  }

  /** Immediately emit all queued update patches. */
  flush(editor: HTMLElement, emit: (patch: BlockPatch) => void): void {
    const pending = this.pendingUpdates.get(editor);
    this.clearDebounce(editor);

    if (!pending) {
      return;
    }

    for (const patch of pending.values()) {
      emit(patch);
    }

    pending.clear();
  }

  private queueUpdate(
    editor: HTMLElement,
    patch: BlockPatch,
    emit: (patch: BlockPatch) => void,
    debounceMs: number,
  ): void {
    let pending = this.pendingUpdates.get(editor);
    if (!pending) {
      pending = new Map();
      this.pendingUpdates.set(editor, pending);
    }

    pending.set(patch.id, patch);
    this.scheduleDebounce(editor, emit, debounceMs);
  }

  private scheduleDebounce(
    editor: HTMLElement,
    emit: (patch: BlockPatch) => void,
    debounceMs: number,
  ): void {
    const existing = this.debounceTimers.get(editor);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(editor);
      this.flush(editor, emit);
    }, debounceMs);

    this.debounceTimers.set(editor, timer);
  }

  private clearDebounce(editor: HTMLElement): void {
    const timer = this.debounceTimers.get(editor);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(editor);
    }
    this.pendingUpdates.delete(editor);
  }
}
