import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-getting-started',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './getting-started.component.html',
  styleUrl: './getting-started.component.css',
})
export class GettingStartedComponent {
  installSteps = [
    {
      title: 'Install the Package',
      code: 'npm install mist-editor',
      description: 'Install Mist Editor via npm or yarn',
    },
    {
      title: 'Import Components',
      code: `import { RichTextEditorComponent, EditorToolbarComponent } from 'mist-editor';

@Component({
  imports: [RichTextEditorComponent, EditorToolbarComponent]
})`,
      description: 'Import the components in your Angular component',
    },
    {
      title: 'Add to Template',
      code: `<mist-editor-toolbar
  [boldActive]="toolbarState.bold"
  (formatCommand)="onFormatCommand($event)"
/>

<mist-rich-text-editor
  [content]="content"
  (contentChange)="onContentChange($event)"
/>`,
      description: 'Use the components in your template',
    },
  ];
}
