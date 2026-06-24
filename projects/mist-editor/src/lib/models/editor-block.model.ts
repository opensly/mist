/** Attribute persisted on root block elements in saved HTML. */
export const MIST_BLOCK_ATTR = 'data-mist-block';

/** Valid block id: `b_` prefix + alphanumeric/underscore/hyphen. */
export const MIST_BLOCK_ID_PATTERN = /^b_[a-zA-Z0-9_-]+$/;

export type MistBlockType =
  | 'p'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'ul'
  | 'ol'
  | 'blockquote'
  | 'pre'
  | 'table'
  | 'panel';

export interface BlockSelection {
  blockId: string;
  offset: number;
}

export interface BlockPatch {
  op: 'update' | 'insert' | 'delete';
  id: string;
  html?: string;
  afterId?: string;
}
