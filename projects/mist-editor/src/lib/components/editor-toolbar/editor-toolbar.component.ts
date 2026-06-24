import { Component, output, signal, input, effect, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'mist-editor-toolbar',
  imports: [CommonModule],
  templateUrl: './editor-toolbar.component.html',
  styleUrl: './editor-toolbar.component.css',
})
export class EditorToolbarComponent {
  boldActive = input<boolean>(false);
  italicActive = input<boolean>(false);
  underlineActive = input<boolean>(false);
  currentBlockType = input<string>('p');
  alignment = input<string>('left');
  textColor = input<string>('');
  highlightColor = input<string>('');

  formatCommand = output<string>();
  selectedTextType = signal<string>('p');
  showPanelsDropdown = signal<boolean>(false);
  showFormatDropdown = signal<boolean>(false);
  showAlignmentDropdown = signal<boolean>(false);
  showTextColorDropdown = signal<boolean>(false);
  showHighlightColorDropdown = signal<boolean>(false);

  textColors = [
    ['#172B4D', '#0052CC', '#00668F', '#006644', '#E67E22', '#BF2600', '#6554C0'],
    ['#7A869A', '#2684FF', '#22A3C3', '#36B37E', '#FFAB00', '#DE350B', '#998DD9'],
    ['#FFFFFF', '#B3D4FF', '#B3F5FF', '#ABF5D1', '#FFF0B3', '#FFEAE6', '#EAE6FF'],
  ];

  highlightColors = [
    { color: '#EBECF0', label: 'Grey' },
    { color: '#EAE6FF', label: 'Purple' },
    { color: '#FCE6F2', label: 'Pink' },
    { color: '#FFF0B3', label: 'Yellow' },
    { color: '#FFF7D6', label: 'Cream' },
    { color: '#E3FCEF', label: 'Green' },
    { color: '#E6FCFF', label: 'Cyan' },
  ];

  constructor(private elementRef: ElementRef) {
    effect(() => {
      this.selectedTextType.set(this.currentBlockType());
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!this.elementRef.nativeElement.contains(target)) {
      this.closeAllDropdowns();
    }
  }

  private closeAllDropdowns(): void {
    this.showPanelsDropdown.set(false);
    this.showFormatDropdown.set(false);
    this.showAlignmentDropdown.set(false);
    this.showTextColorDropdown.set(false);
    this.showHighlightColorDropdown.set(false);
  }

  togglePanelsDropdown(): void {
    this.showPanelsDropdown.set(!this.showPanelsDropdown());
    if (this.showPanelsDropdown()) {
      this.showFormatDropdown.set(false);
      this.showAlignmentDropdown.set(false);
      this.showTextColorDropdown.set(false);
      this.showHighlightColorDropdown.set(false);
    }
  }

  toggleFormatDropdown(): void {
    this.showFormatDropdown.set(!this.showFormatDropdown());
    if (this.showFormatDropdown()) {
      this.showPanelsDropdown.set(false);
      this.showAlignmentDropdown.set(false);
      this.showTextColorDropdown.set(false);
      this.showHighlightColorDropdown.set(false);
    }
  }

  toggleAlignmentDropdown(): void {
    this.showAlignmentDropdown.set(!this.showAlignmentDropdown());
    if (this.showAlignmentDropdown()) {
      this.showPanelsDropdown.set(false);
      this.showFormatDropdown.set(false);
      this.showTextColorDropdown.set(false);
      this.showHighlightColorDropdown.set(false);
    }
  }

  toggleTextColorDropdown(): void {
    this.showTextColorDropdown.set(!this.showTextColorDropdown());
    if (this.showTextColorDropdown()) {
      this.showPanelsDropdown.set(false);
      this.showFormatDropdown.set(false);
      this.showAlignmentDropdown.set(false);
      this.showHighlightColorDropdown.set(false);
    }
  }

  toggleHighlightColorDropdown(): void {
    this.showHighlightColorDropdown.set(!this.showHighlightColorDropdown());
    if (this.showHighlightColorDropdown()) {
      this.showPanelsDropdown.set(false);
      this.showFormatDropdown.set(false);
      this.showAlignmentDropdown.set(false);
      this.showTextColorDropdown.set(false);
    }
  }

  onTextTypeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const type = select.value;
    this.selectedTextType.set(type);
    this.formatCommand.emit(type);
  }

  onFormat(command: string): void {
    if (command === 'more') {
      this.togglePanelsDropdown();
    } else if (command === 'format-dropdown') {
      this.toggleFormatDropdown();
    } else if (command === 'alignment-dropdown') {
      this.toggleAlignmentDropdown();
    } else if (command === 'text-color-dropdown') {
      this.toggleTextColorDropdown();
    } else if (command === 'highlight-color-dropdown') {
      this.toggleHighlightColorDropdown();
    } else {
      this.formatCommand.emit(command);
      this.showPanelsDropdown.set(false);
      this.showFormatDropdown.set(false);
      this.showAlignmentDropdown.set(false);
      this.showTextColorDropdown.set(false);
      this.showHighlightColorDropdown.set(false);
    }
  }

  onFormatOption(command: string): void {
    this.formatCommand.emit(command);
    this.showFormatDropdown.set(false);
    this.showAlignmentDropdown.set(false);
    this.showTextColorDropdown.set(false);
    this.showHighlightColorDropdown.set(false);
  }

  onColorSelect(type: 'text' | 'highlight', color: string): void {
    if (type === 'text') {
      this.formatCommand.emit(`textColor:${color}`);
      this.showTextColorDropdown.set(false);
    } else {
      this.formatCommand.emit(`highlightColor:${color}`);
      this.showHighlightColorDropdown.set(false);
    }
  }

  onRemoveTextColor(): void {
    this.formatCommand.emit('removeTextColor');
    this.showTextColorDropdown.set(false);
  }

  onRemoveHighlightColor(): void {
    this.formatCommand.emit('removeHighlightColor');
    this.showHighlightColorDropdown.set(false);
  }

  onSelectPanel(type: string): void {
    this.formatCommand.emit(`insert-panel:${type}`);
    this.showPanelsDropdown.set(false);
  }
}
