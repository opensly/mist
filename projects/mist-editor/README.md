# Mist Editor

> A powerful, block-based rich text editor for Angular applications, inspired by Atlassian Confluence. Built with Angular 21+ and modern web standards.

[![npm version](https://img.shields.io/npm/v/mist-editor.svg)](https://www.npmjs.com/package/mist-editor)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Angular](https://img.shields.io/badge/Angular-21%2B-red.svg)](https://angular.io/)

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Components](#components)
- [API Reference](#api-reference)
- [Customization](#customization)
- [Security](#security)
- [Examples](#examples)
- [Browser Support](#browser-support)
- [Comparison with TipTap / ProseMirror](#-comparison-with-tiptap--prosemirror)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

**Mist Editor** is a native Angular rich text editor library that provides a Confluence-like editing experience. Unlike framework-agnostic solutions like TipTap (which uses ProseMirror), Mist Editor is built specifically for Angular, leveraging Angular 21+ features including:

- **Signals** for reactive state management
- **Standalone Components** for modern Angular architecture
- **Native Angular APIs** without heavy dependencies
- **Built-in Security** with comprehensive HTML sanitization

### Package Information

- **Package Name**: `mist-editor`
- **Framework**: Angular 21+
- **Language**: TypeScript 5.9+
- **License**: MIT
- **Bundle Size**: Lightweight (no ProseMirror dependency)

### Architecture

```
mist-editor/
├── components/
│   ├── rich-text-editor/          # Main editor component
│   ├── editor-toolbar/            # Formatting toolbar
│   └── table-options/             # Table manipulation toolbar
├── services/
│   ├── sanitization.service.ts    # HTML sanitization & XSS protection
│   ├── editor-formatting.service.ts # Text formatting logic
│   ├── editor-utils.service.ts    # Utility functions
│   └── table.service.ts           # Table operations
└── styles/
    └── mist-editor.css            # Default styles
```

## ✨ Key Features

### Rich Text Editing
- **Inline Formatting**: Bold, Italic, Underline, Strikethrough, Code
- **Headings**: H1-H6 support
- **Text Alignment**: Left, Center, Right
- **Colors**: Text color and highlight color
- **Special Characters**: Subscript, Superscript

### Block Elements
- **Paragraphs**: Standard text blocks
- **Code Blocks**: Syntax-highlighted code with exit hints
- **Lists**: Bullet and numbered lists
- **Tables**: Full CRUD operations (add/delete rows/columns, cell backgrounds)
- **Panels**: Info, Note, Success, Error, Warning panels with icons
- **Images**: URL-based image insertion

### User Experience
- **Slash Commands**: Type `/` to open command menu
- **Command Menu**: Quick element insertion (Confluence-style)
- **Floating Toolbars**: Context-aware table options
- **Keyboard Navigation**: Arrow keys, Enter for code block exit
- **Placeholder Support**: Customizable placeholder text

### Security Features
- **XSS Protection**: Multi-layer sanitization
- **Dangerous Pattern Detection**: Blocks javascript:, vbscript:, event handlers
- **URL Validation**: Protocol whitelisting (http/https)
- **CSS Injection Prevention**: Blocks expression(), import, behavior:
- **Custom Sanitization**: Injectable configuration for custom rules

## 📦 Installation

```bash
npm install mist-editor
```

### Requirements

- Angular 21.0 or higher
- TypeScript 5.9 or higher
- Node.js 18 or higher

## 🚀 Quick Start

### 1. Import Components

```typescript
import { Component, ViewChild, signal } from '@angular/core';
import { 
  RichTextEditorComponent, 
  EditorToolbarComponent,
  EditorToolbarState 
} from 'mist-editor';

@Component({
  selector: 'app-my-editor',
  standalone: true,
  imports: [RichTextEditorComponent, EditorToolbarComponent],
  templateUrl: './my-editor.component.html',
  styleUrls: ['./my-editor.component.css']
})
export class MyEditorComponent {
  @ViewChild(RichTextEditorComponent) editor!: RichTextEditorComponent;

  content = signal('<p>Start typing...</p>');
  toolbarState = signal<EditorToolbarState>({
    bold: false,
    italic: false,
    underline: false,
    blockType: 'p',
    alignment: 'left',
    textColor: '',
    highlightColor: ''
  });

  onContentChange(newContent: string) {
    this.content.set(newContent);
  }

  onToolbarStateChange(state: EditorToolbarState) {
    this.toolbarState.set(state);
  }

  onFormatCommand(command: string) {
    // Handle formatting commands
    this.handleCommand(command);
  }

  private handleCommand(command: string) {
    const handlers: Record<string, () => void> = {
      'bold': () => this.editor.bold(),
      'italic': () => this.editor.italic(),
      'underline': () => this.editor.underline(),
      'strikethrough': () => this.editor.strikethrough(),
      'code': () => this.editor.code(),
      'alignLeft': () => this.editor.alignLeft(),
      'alignCenter': () => this.editor.alignCenter(),
      'alignRight': () => this.editor.alignRight(),
      'orderedList': () => this.editor.createOrderedList(),
      'unorderedList': () => this.editor.createUnorderedList(),
      'codeBlock': () => this.editor.insertCodeBlock(),
      'table': () => this.editor.insertTable(),
      'image': () => this.editor.insertImage(),
      'subscript': () => this.editor.subscript(),
      'superscript': () => this.editor.superscript(),
      'removeFormat': () => this.editor.clearFormatting(),
      'removeTextColor': () => this.editor.removeTextColor(),
      'removeHighlightColor': () => this.editor.removeHighlightColor(),
    };

    if (handlers[command]) {
      handlers[command]();
      return;
    }

    // Handle commands with values
    const [prefix, value] = command.includes(':') ? command.split(':') : [command, ''];
    
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
}
```

### 2. Add to Template

```html
<div class="editor-container">
  <!-- Toolbar -->
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
  
  <!-- Editor -->
  <mist-rich-text-editor
    [content]="content()"
    [placeholder]="'Start typing or press / for commands...'"
    (contentChange)="onContentChange($event)"
    (toolbarStateChange)="onToolbarStateChange($event)"
  />
</div>
```

### 3. Add Styles

```css
.editor-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

## 🧩 Components

### RichTextEditorComponent

The main editor component that handles content editing.

**Selector**: `mist-rich-text-editor`

**Inputs**:
- `content: InputSignal<string>` - Initial HTML content
- `placeholder: InputSignal<string>` - Placeholder text (default: "Type / to insert elements")

**Outputs**:
- `contentChange: OutputEmitterRef<string>` - Emits when content changes
- `toolbarStateChange: OutputEmitterRef<EditorToolbarState>` - Emits toolbar state updates
- `formatCommand: OutputEmitterRef<string>` - Emits format commands

**Public Methods**:
```typescript
// Inline formatting
bold(): void
italic(): void
underline(): void
strikethrough(): void
code(): void
subscript(): void
superscript(): void
clearFormatting(): void

// Alignment
alignLeft(): void
alignCenter(): void
alignRight(): void

// Colors
setTextColor(color: string): void
setHighlightColor(color: string): void
removeTextColor(): void
removeHighlightColor(): void

// Lists
createOrderedList(): void
createUnorderedList(): void

// Block elements
insertTable(): void
insertCodeBlock(): void
insertPanel(type: 'info' | 'note' | 'success' | 'error' | 'warning'): void
insertImage(): void

// Block type
execCommand(command: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'): void
```

### EditorToolbarComponent

Formatting toolbar with buttons for all formatting options.

**Selector**: `mist-editor-toolbar`

**Inputs**:
- `boldActive: InputSignal<boolean>` - Bold state
- `italicActive: InputSignal<boolean>` - Italic state
- `underlineActive: InputSignal<boolean>` - Underline state
- `currentBlockType: InputSignal<string>` - Current block type (p, h1-h6)
- `alignment: InputSignal<string>` - Text alignment (left, center, right)
- `textColor: InputSignal<string>` - Current text color
- `highlightColor: InputSignal<string>` - Current highlight color

**Outputs**:
- `formatCommand: OutputEmitterRef<string>` - Emits format commands

**Command Format**:
- Simple commands: `'bold'`, `'italic'`, `'underline'`, etc.
- Commands with values: `'textColor:#ff0000'`, `'highlightColor:#ffff00'`
- Panel commands: `'insert-panel:info'`, `'insert-panel:success'`

### TableOptionsComponent

Floating toolbar for table manipulation (internal component, auto-displayed).

**Selector**: `mist-table-options`

**Features**:
- Add/delete rows and columns
- Cell background colors
- Table alignment
- Delete entire table

## 📖 API Reference

### Types and Interfaces

```typescript
// Toolbar state interface
interface EditorToolbarState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  blockType: string;
  alignment: string;
  textColor: string;
  highlightColor: string;
}

// Command menu item
interface CommandMenuItem {
  id: string;
  label: string;
  icon?: string;
  action: () => void;
}

// Table action
interface TableAction {
  type: 'addRowAbove' | 'addRowBelow' | 'addColumnLeft' | 'addColumnRight' 
      | 'deleteRow' | 'deleteColumn' | 'deleteTable' 
      | 'alignLeft' | 'alignCenter' | 'alignRight' | 'setCellBackground';
  payload?: string;
}
```

### Services

#### SanitizationService

Handles HTML sanitization and XSS protection.

```typescript
import { SanitizationService } from 'mist-editor';

// Methods
sanitizeEditorContent(html: string): string
sanitizeTrustedHtml(html: string): string
isValidUrl(url: string): boolean
sanitizeAttribute(value: string): string
sanitizeImageUrl(url: string): string | null
```

#### EditorFormattingService

Handles text formatting operations.

```typescript
import { EditorFormattingService } from 'mist-editor';

// Methods
toggleInlineFormat(editor: HTMLElement, tagName: string): void
setBlockType(editor: HTMLElement, tagName: string): void
setTextAlignment(editor: HTMLElement, alignment: string): void
applyStyle(editor: HTMLElement, property: string, value: string): void
insertCodeBlock(editor: HTMLElement): void
insertBlock(editor: HTMLElement, html: string): void
```

#### EditorUtilsService

Utility functions for editor operations.

```typescript
import { EditorUtilsService } from 'mist-editor';

// Methods
isFormatActive(editor: HTMLElement, tagName: string): boolean
getCurrentColor(editor: HTMLElement, property: string): string
getCurrentAlignment(editor: HTMLElement): string
getCurrentBlockType(editor: HTMLElement): string
saveSelection(): { markerId: string } | null
restoreSelection(editor: HTMLElement, saved: { markerId: string }): void
```

#### TableService

Table creation and manipulation.

```typescript
import { TableService } from 'mist-editor';

// Methods
createTable(rows: number, cols: number, id?: string): string
handleTableManipulation(table: HTMLTableElement, type: string): boolean
setCellBackground(table: HTMLTableElement, color: string): void
```

## 🎨 Customization

### Custom Styles

Override CSS variables to customize the appearance:

```css
:root {
  /* Font Sizes */
  --font-size-md: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 20px;
  --font-size-xxl: 24px;
  --font-size-xxxl: 28px;
  --font-size-title: 32px;

  /* Colors */
  --color-text-primary: #172b4d;
  --color-text-tertiary: #6b778c;
  --color-border: #dfe1e6;
  --color-background-hover: #f4f5f7;
  --color-primary: #0052cc;

  /* Spacing */
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 20px;
  --spacing-xxl: 24px;

  /* Border Radius */
  --border-radius-sm: 3px;
  --border-radius-md: 6px;
  --border-radius-lg: 8px;
}
```

### Custom Sanitization Rules

Provide custom sanitization configuration:

```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { SANITIZATION_CONFIG, SanitizationConfig } from 'mist-editor';
import { App } from './app/app';

const customSanitizationConfig: SanitizationConfig = {
  // Custom allowed tags
  allowedTags: ['p', 'strong', 'em', 'u', 'h1', 'h2', 'h3'],
  
  // Custom allowed attributes
  allowedAttributes: {
    '*': ['class', 'id'],
    'a': ['href', 'target', 'rel']
  },
  
  // Custom allowed styles
  allowedStyles: ['color', 'background-color', 'font-weight'],
  
  // Custom URL validator
  customUrlValidator: (url: string) => {
    return url.startsWith('https://');
  },
  
  // Custom style validator
  customStyleValidator: (property: string, value: string) => {
    return property === 'color' && value.startsWith('#');
  },
  
  // Allow data URLs for images
  allowDataUrls: true,
  
  // Custom allowed protocols
  allowedProtocols: ['https:']
};

bootstrapApplication(App, {
  providers: [
    { provide: SANITIZATION_CONFIG, useValue: customSanitizationConfig }
  ]
});
```

## 🔒 Security

Mist Editor includes comprehensive security features:

### Built-in Protection

1. **XSS Prevention**: Multi-layer HTML sanitization
2. **Dangerous Pattern Detection**: Blocks javascript:, vbscript:, data:text/html
3. **Event Handler Removal**: Strips onclick, onload, etc.
4. **CSS Injection Prevention**: Blocks expression(), import, behavior:
5. **URL Validation**: Protocol whitelisting (http/https only by default)
6. **Attribute Sanitization**: Removes dangerous attributes
7. **Safe Link Handling**: Auto-adds rel="noopener noreferrer" for external links

### Security Best Practices

```typescript
// Always sanitize user-generated content
import { SanitizationService } from 'mist-editor';

constructor(private sanitizer: SanitizationService) {}

saveContent(html: string) {
  const sanitized = this.sanitizer.sanitizeEditorContent(html);
  // Save sanitized content to database
}
```

## 📚 Examples

### Basic Editor

```typescript
import { Component } from '@angular/core';
import { RichTextEditorComponent } from 'mist-editor';

@Component({
  selector: 'app-basic-editor',
  standalone: true,
  imports: [RichTextEditorComponent],
  template: `
    <mist-rich-text-editor
      [content]="content"
      (contentChange)="onContentChange($event)"
    />
  `
})
export class BasicEditorComponent {
  content = '<p>Hello World!</p>';
  
  onContentChange(newContent: string) {
    console.log('Content:', newContent);
  }
}
```

### Editor with Toolbar

See [Quick Start](#quick-start) section for complete example.

### Programmatic Control

```typescript
import { Component, ViewChild } from '@angular/core';
import { RichTextEditorComponent } from 'mist-editor';

@Component({
  selector: 'app-programmatic-editor',
  template: `
    <mist-rich-text-editor #editor [content]="content" />
    <button (click)="makeBold()">Bold</button>
    <button (click)="insertTable()">Insert Table</button>
  `
})
export class ProgrammaticEditorComponent {
  @ViewChild('editor') editor!: RichTextEditorComponent;
  content = '<p>Select text and click Bold</p>';
  
  makeBold() {
    this.editor.bold();
  }
  
  insertTable() {
    this.editor.insertTable();
  }
}
```

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🆚 Comparison with TipTap / ProseMirror

Mist Editor is a deliberate tradeoff: Angular-native HTML editing with Confluence-style UX, not a universal replacement for ProseMirror. See **[docs/MIST_VS_TIPTAP_PROSEMIRROR.md](docs/MIST_VS_TIPTAP_PROSEMIRROR.md)** for architecture diagrams, tradeoffs, and when to choose each stack.

| Feature | Mist Editor | TipTap / ProseMirror |
|---------|-------------|----------------------|
| Framework | Angular native | Framework-agnostic (TipTap) |
| Document model | HTML string + `contenteditable` | Schema + transactions |
| Dependencies | Angular peers + `tslib` only | ProseMirror stack (+ extensions) |
| Bundle size | Lightweight | Heavier |
| Angular signals | Built-in | Requires adapter |
| Standalone components | Yes | Framework bindings vary |
| Security | Built-in `SanitizationService` | Manual (e.g. DOMPurify) |
| Confluence-style blocks | Panels, slash menu, tables included | Custom nodes/plugins |
| Collaboration | Roadmap | Yjs / ecosystem patterns |
| Extensibility | Fixed feature set | Plugin ecosystem |
| Learning curve | Low for Angular devs | Medium (schema, steps) |

**Choose Mist** for Angular 21+ apps that persist HTML, want minimal deps, and need panels/tables/slash commands without building a ProseMirror schema.

**Choose TipTap/ProseMirror** for collaboration, strict document structure, custom nodes, markdown round-tripping, or cross-framework reuse.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/opensly/mist-editor/issues)
- **Discussions**: [GitHub Discussions](https://github.com/opensly/mist-editor/discussions)
- **Documentation**: [https://mist-editor.dev](https://mist-editor.dev)

## 🗺️ Roadmap

- [ ] Markdown support
- [ ] Collaborative editing
- [ ] More panel types
- [ ] Image upload support
- [ ] Emoji picker
- [ ] Mention support (@user)
- [ ] Keyboard shortcuts customization
- [ ] Mobile optimization

---

Made with ❤️ for the Angular community
