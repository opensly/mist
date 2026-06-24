export interface CodeExample {
  title: string;
  description: string;
  code: string;
}

/** Use \u0040 instead of @ in sample code so the Angular language service does not treat them as decorators. */
const AT = '\u0040';

export const EXAMPLES: CodeExample[] = [
  {
    title: 'Minimal editor',
    description:
      'Use only mist-rich-text-editor when you do not need the built-in toolbar. Content is emitted as sanitized HTML on every change.',
    code: `import { Component, signal } from '${AT}angular/core';
import { RichTextEditorComponent } from 'mist-editor';

${AT}Component({
  selector: 'app-minimal-editor',
  standalone: true,
  imports: [RichTextEditorComponent],
  template: \`
    <mist-rich-text-editor
      [content]="content()"
      [placeholder]="'Write something...'"
      (contentChange)="onContentChange($event)"
    />
  \`,
})
export class MinimalEditorComponent {
  content = signal('<p>Hello from Mist Editor</p>');

  onContentChange(html: string): void {
    this.content.set(html);
  }
}`,
  },
  {
    title: 'Editor with toolbar (recommended)',
    description:
      'Wire mist-editor-toolbar to mist-rich-text-editor. Keep content and toolbar state in signals, route toolbar commands to editor public methods via ViewChild.',
    code: `import { Component, ViewChild, signal } from '${AT}angular/core';
import {
  RichTextEditorComponent,
  EditorToolbarComponent,
  EditorToolbarState,
} from 'mist-editor';

${AT}Component({
  selector: 'app-full-editor',
  standalone: true,
  imports: [RichTextEditorComponent, EditorToolbarComponent],
  template: \`
    <mist-editor-toolbar
      [boldActive]="toolbarState().bold"
      [italicActive]="toolbarState().italic"
      [underlineActive]="toolbarState().underline"
      [currentBlockType]="toolbarState().blockType"
      [alignment]="toolbarState().alignment"
      [textColor]="toolbarState().textColor"
      [highlightColor]="toolbarState().highlightColor"
      (formatCommand)="onFormatCommand($event)"
    />

    <mist-rich-text-editor
      [content]="content()"
      (contentChange)="content.set($event)"
      (toolbarStateChange)="toolbarState.set($event)"
    />
  \`,
})
export class FullEditorComponent {
  ${AT}ViewChild(RichTextEditorComponent) editor!: RichTextEditorComponent;

  content = signal('<p>Start typing...</p>');
  toolbarState = signal<EditorToolbarState>({
    bold: false,
    italic: false,
    underline: false,
    blockType: 'p',
    alignment: 'left',
    textColor: '',
    highlightColor: '',
  });

  onFormatCommand(command: string): void {
    if (!this.editor) return;

    const handlers: Record<string, () => void> = {
      bold: () => this.editor.bold(),
      italic: () => this.editor.italic(),
      underline: () => this.editor.underline(),
      strikethrough: () => this.editor.strikethrough(),
      code: () => this.editor.code(),
      alignLeft: () => this.editor.alignLeft(),
      alignCenter: () => this.editor.alignCenter(),
      alignRight: () => this.editor.alignRight(),
      orderedList: () => this.editor.createOrderedList(),
      unorderedList: () => this.editor.createUnorderedList(),
      codeBlock: () => this.editor.insertCodeBlock(),
      table: () => this.editor.insertTable(),
      image: () => this.editor.insertImage(),
      subscript: () => this.editor.subscript(),
      superscript: () => this.editor.superscript(),
      removeFormat: () => this.editor.clearFormatting(),
      removeTextColor: () => this.editor.removeTextColor(),
      removeHighlightColor: () => this.editor.removeHighlightColor(),
    };

    if (handlers[command]) {
      handlers[command]();
      return;
    }

    const [prefix, value] = command.includes(':') ? command.split(':', 2) : [command, ''];

    if (prefix === 'textColor' && value) {
      this.editor.setTextColor(value);
    } else if (prefix === 'highlightColor' && value) {
      this.editor.setHighlightColor(value);
    } else if (prefix === 'insert-panel' && value) {
      this.editor.insertPanel(value);
    } else if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(command)) {
      this.editor.execCommand(command);
    }
  }
}`,
  },
  {
    title: 'Programmatic control',
    description:
      'Call editor methods from your own buttons, menus, or keyboard shortcuts. Select text in the editor first, then invoke formatting methods.',
    code: `${AT}ViewChild('editor') editor!: RichTextEditorComponent;

makeBold(): void {
  this.editor.bold();
}

insertInfoPanel(): void {
  this.editor.insertPanel('info');
}

setBrandColor(): void {
  this.editor.setTextColor('#0052CC');
}

// Template
<mist-rich-text-editor #editor [content]="content()" (contentChange)="content.set($event)" />
<button type="button" (click)="makeBold()">Bold</button>
<button type="button" (click)="insertInfoPanel()">Info panel</button>`,
  },
  {
    title: 'Persisting content',
    description:
      'contentChange already emits sanitized HTML. Store that string in your API or database — do not persist raw innerHTML from the DOM.',
    code: `content = signal('');

onContentChange(html: string): void {
  this.content.set(html);
}

async saveArticle(): Promise<void> {
  await fetch('/api/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: this.content() }),
  });
}

// Load existing content
ngOnInit(): void {
  this.articleService.getBody().subscribe((html) => this.content.set(html));
}`,
  },
  {
    title: 'Custom sanitization rules',
    description:
      'Provide SANITIZATION_CONFIG at bootstrap to tighten or relax what HTML is allowed. The editor sanitizes on input, output, and paste.',
    code: `import { bootstrapApplication } from '${AT}angular/platform-browser';
import { SANITIZATION_CONFIG, SanitizationConfig } from 'mist-editor';

const sanitization: SanitizationConfig = {
  allowedProtocols: ['https:'],
  allowDataUrls: false,
  customUrlValidator: (url) => url.startsWith('https://'),
};

bootstrapApplication(App, {
  providers: [{ provide: SANITIZATION_CONFIG, useValue: sanitization }],
});`,
  },
  {
    title: 'Styling the editor',
    description:
      'Components ship with default styles. Override CSS variables on a wrapper to theme the editor and toolbar to match your app.',
    code: `.editor-shell {
  max-width: 900px;
  margin: 0 auto;
  border: 1px solid var(--color-border, #dfe1e6);
  border-radius: 8px;
  overflow: hidden;
}

/* Optional: override Mist theme tokens */
.editor-shell {
  --color-primary: #0052cc;
  --color-text-primary: #172b4d;
  --color-border: #dfe1e6;
  --color-background-hover: #f4f5f7;
}`,
  },
];
