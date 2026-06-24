export interface ApiMember {
  name: string;
  description: string;
}

export interface ApiSection {
  title: string;
  selector?: string;
  description: string;
  inputs?: ApiMember[];
  outputs?: ApiMember[];
  methods?: ApiMember[];
}

export interface CommandRow {
  command: string;
  action: string;
}

export interface TypeDefinition {
  name: string;
  code: string;
}

export const EDITOR_COMPONENT: ApiSection = {
  title: 'RichTextEditorComponent',
  selector: 'mist-rich-text-editor',
  description: 'Main contenteditable surface. Emits sanitized HTML on every change.',
  inputs: [
    { name: 'content', description: 'HTML string bound into the editor' },
    { name: 'placeholder', description: 'Empty-state hint (default: "Type / to insert elements")' },
  ],
  outputs: [
    { name: 'contentChange', description: 'Sanitized innerHTML after edits' },
    { name: 'toolbarStateChange', description: 'Active formats, block type, alignment, colors' },
  ],
  methods: [
    { name: 'bold(), italic(), underline(), strikethrough(), code()', description: 'Inline formatting' },
    { name: 'subscript(), superscript(), clearFormatting()', description: 'Additional inline styles' },
    { name: 'alignLeft(), alignCenter(), alignRight()', description: 'Block alignment' },
    { name: 'setTextColor(color), setHighlightColor(color)', description: 'Apply hex colors to selection' },
    { name: 'removeTextColor(), removeHighlightColor()', description: 'Clear color styles' },
    { name: 'createOrderedList(), createUnorderedList()', description: 'List toggles' },
    { name: 'insertTable(), insertCodeBlock(), insertImage()', description: 'Block insertion' },
    { name: "insertPanel(type)", description: "Callout panels: info | note | success | error | warning" },
    { name: 'execCommand(p | h1 … h6)', description: 'Set block type for current paragraph' },
  ],
};

export const TOOLBAR_COMPONENT: ApiSection = {
  title: 'EditorToolbarComponent',
  selector: 'mist-editor-toolbar',
  description:
    'Optional formatting chrome. Emits command strings — map them to RichTextEditorComponent methods in the host.',
  inputs: [
    { name: 'boldActive, italicActive, underlineActive', description: 'Reflect active inline formats' },
    { name: 'currentBlockType', description: 'p, h1, h2, h3, h4, h5, or h6' },
    { name: 'alignment', description: 'left, center, or right' },
    { name: 'textColor, highlightColor', description: 'Current color swatch selection (hex)' },
  ],
  outputs: [{ name: 'formatCommand', description: 'Command string — see toolbar command table below' }],
};

export const TABLE_OPTIONS_COMPONENT: ApiSection = {
  title: 'TableOptionsComponent',
  selector: 'mist-table-options',
  description:
    'Rendered automatically when a table is selected inside the editor. No manual integration required.',
};

export const TOOLBAR_COMMANDS: CommandRow[] = [
  { command: 'bold', action: 'editor.bold()' },
  { command: 'italic', action: 'editor.italic()' },
  { command: 'underline', action: 'editor.underline()' },
  { command: 'strikethrough', action: 'editor.strikethrough()' },
  { command: 'code', action: 'editor.code()' },
  { command: 'alignLeft', action: 'editor.alignLeft()' },
  { command: 'alignCenter', action: 'editor.alignCenter()' },
  { command: 'alignRight', action: 'editor.alignRight()' },
  { command: 'orderedList', action: 'editor.createOrderedList()' },
  { command: 'unorderedList', action: 'editor.createUnorderedList()' },
  { command: 'codeBlock', action: 'editor.insertCodeBlock()' },
  { command: 'table', action: 'editor.insertTable()' },
  { command: 'image', action: 'editor.insertImage()' },
  { command: 'subscript', action: 'editor.subscript()' },
  { command: 'superscript', action: 'editor.superscript()' },
  { command: 'removeFormat', action: 'editor.clearFormatting()' },
  { command: 'removeTextColor', action: 'editor.removeTextColor()' },
  { command: 'removeHighlightColor', action: 'editor.removeHighlightColor()' },
  { command: 'p, h1 … h6', action: 'editor.execCommand(blockType)' },
  { command: 'textColor:#RRGGBB', action: 'editor.setTextColor(value)' },
  { command: 'highlightColor:#RRGGBB', action: 'editor.setHighlightColor(value)' },
  { command: 'insert-panel:info', action: 'editor.insertPanel(type)' },
];

export const SERVICES: ApiSection[] = [
  {
    title: 'SanitizationService',
    description: 'HTML allowlists, XSS protection, and injectable SANITIZATION_CONFIG.',
    methods: [
      { name: 'sanitizeEditorContent(html)', description: 'Strict path for user HTML' },
      { name: 'sanitizeTrustedHtml(html)', description: 'App-generated panels and tables' },
      { name: 'isValidUrl(url), sanitizeImageUrl(url)', description: 'URL validation helpers' },
      { name: 'isSafeStyleValue(property, value), isValidColor(color)', description: 'Inline style guards' },
      { name: 'sanitizeAttribute(value)', description: 'Strip dangerous attribute characters' },
    ],
  },
  {
    title: 'EditorFormattingService',
    description: 'Low-level DOM formatting used by the editor component.',
    methods: [
      { name: 'toggleInlineFormat(editor, tagName)', description: 'Wrap or unwrap inline tags' },
      { name: 'setBlockType(editor, tagName)', description: 'Change paragraph / heading type' },
      { name: 'applyStyle(editor, property, value)', description: 'Apply validated inline CSS' },
      { name: 'insertBlock(editor, html, trusted?)', description: 'Insert HTML; trusted for panels/tables' },
      { name: 'insertCodeBlock(editor)', description: 'Convert selection to <pre><code>' },
    ],
  },
  {
    title: 'EditorUtilsService',
    description: 'Selection helpers and format detection.',
    methods: [
      { name: 'isFormatActive(editor, tagName)', description: 'Whether tag wraps the selection' },
      { name: 'getCurrentColor(editor, property)', description: 'Read color or background-color' },
      { name: 'getCurrentBlockType(editor), getCurrentAlignment(editor)', description: 'Toolbar state helpers' },
      { name: 'saveSelection(), restoreSelection(editor, saved)', description: 'Preserve range across DOM updates' },
    ],
  },
  {
    title: 'TableService',
    description: 'Table HTML generation and manipulation.',
    methods: [
      { name: 'createTable(rows, cols, id?)', description: 'Return sanitized table markup' },
      { name: 'handleTableManipulation(table, type)', description: 'Row/column CRUD' },
      { name: 'setCellBackground(table, color)', description: 'Apply validated cell background' },
    ],
  },
];

export const TYPE_DEFINITIONS: TypeDefinition[] = [
  {
    name: 'EditorToolbarState',
    code: `interface EditorToolbarState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  blockType: string;
  alignment: string;
  textColor: string;
  highlightColor: string;
}`,
  },
  {
    name: 'SanitizationConfig',
    code: `interface SanitizationConfig {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  allowedStyles?: string[];
  allowedProtocols?: string[];
  allowDataUrls?: boolean;
  customUrlValidator?: (url: string) => boolean;
  customStyleValidator?: (property: string, value: string) => boolean;
  customTagValidator?: (tagName: string, element: HTMLElement) => boolean;
}`,
  },
  {
    name: 'TableAction',
    code: `type TableAction =
  | 'addRowAbove' | 'addRowBelow'
  | 'addColumnLeft' | 'addColumnRight'
  | 'deleteRow' | 'deleteColumn' | 'deleteTable'
  | 'alignLeft' | 'alignCenter' | 'alignRight'
  | 'setCellBackground';`,
  },
];

export const API_USAGE_NOTES: string[] = [
  'Parse toolbar commands with command.split(":", 2) so hex colors are not split on #.',
  'Echo contentChange into [content] via a signal — the editor skips redundant DOM resets when values match.',
  'The toolbar can sit outside mist-rich-text-editor; selection is restored when formatting commands run.',
  'contentChange output is already sanitized — persist that string, not raw DOM innerHTML.',
  'Provide SANITIZATION_CONFIG at bootstrap to customize allowlists and validators.',
];
