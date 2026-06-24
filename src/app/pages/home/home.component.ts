import { Component, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RichTextEditorComponent, EditorToolbarComponent, EditorToolbarState } from 'mist-editor';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, RichTextEditorComponent, EditorToolbarComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  @ViewChild(RichTextEditorComponent) editor!: RichTextEditorComponent;

  demoContent = signal(
    '<h2>Try Mist Editor</h2><p>Start typing...</p>',
  );

  toolbarState = signal<EditorToolbarState>({
    bold: false,
    italic: false,
    underline: false,
    blockType: 'p',
    alignment: 'left',
    textColor: '',
    highlightColor: '',
  });

  features = [
    {
      icon: '✨',
      title: 'Rich Formatting',
      description: 'Bold, italic, underline, headings, lists, and more formatting options.',
    },
    {
      icon: '🎨',
      title: 'Customizable',
      description: 'Fully customizable with your own styles, themes, and sanitization rules.',
    },
    {
      icon: '🔒',
      title: 'Secure by Default',
      description: 'Built-in XSS protection and HTML sanitization for safe content.',
    },
    {
      icon: '📦',
      title: 'Block-Based',
      description: 'Confluence-style block editor with slash commands for quick insertion.',
    },
    {
      icon: '🚀',
      title: 'Angular 21+',
      description:
        'Built with the latest Angular features including signals and standalone components.',
    },
    {
      icon: '⚡',
      title: 'Lightweight',
      description: 'No heavy dependencies. Pure Angular implementation with minimal bundle size.',
    },
  ];

  onContentChange(content: string) {
    this.demoContent.set(content);
  }

  onToolbarStateChange(state: EditorToolbarState) {
    this.toolbarState.set(state);
  }

  onFormatCommand(command: string) {
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
}
