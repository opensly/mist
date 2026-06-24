import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TableAction {
  type:
  | 'addRowAbove'
  | 'addRowBelow'
  | 'addColumnLeft'
  | 'addColumnRight'
  | 'deleteRow'
  | 'deleteColumn'
  | 'deleteTable'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'setCellBackground';
  payload?: string;
}

@Component({
  selector: 'mist-table-options',
  imports: [CommonModule],
  templateUrl: './table-options.component.html',
  styleUrl: './table-options.component.css',
})
export class TableOptionsComponent {
  tableElement = input.required<HTMLTableElement>();

  tableAction = output<TableAction>();
  close = output<void>();

  showTableDropdown = signal<boolean>(false);
  showMoreDropdown = signal<boolean>(false);
  showColorPicker = signal<boolean>(false);

  cellColors = [
    '#FFFFFF', // White
    '#F4F5F7', // Light Grey 1 
    '#EBECF0', // Light Grey 2
    '#DFE1E6', // Light Grey 3
    '#E9F2FF', // Light Blue 1
    '#B3D4FF', // Light Blue 2
    '#E6FCFF', // Light Cyan 1
    '#B3F5FF', // Light Cyan 2
    '#E3FCEF', // Light Green 1
    '#ABF5D1', // Light Green 2
    '#FFF9E6', // Light Yellow 1
    '#FFF0B3', // Light Yellow 2
    '#FFEBE6', // Light Red 1
    '#FFBDAD', // Light Red 2
    '#EAE6FF', // Light Purple 1
    '#B2D4FF', // Light Purple 2
  ];

  toggleTableDropdown(): void {
    this.showTableDropdown.set(!this.showTableDropdown());
    this.showMoreDropdown.set(false);
    this.showColorPicker.set(false);
  }

  toggleMoreDropdown(): void {
    this.showMoreDropdown.set(!this.showMoreDropdown());
    this.showTableDropdown.set(false);
    this.showColorPicker.set(false);
  }

  toggleColorPicker(event: MouseEvent): void {
    event.stopPropagation();
    this.showColorPicker.set(!this.showColorPicker());
  }

  onTableAction(type: TableAction['type'], payload?: string): void {
    this.tableAction.emit({ type, payload });
    this.showTableDropdown.set(false);
    this.showMoreDropdown.set(false);
    this.showColorPicker.set(false);
  }

  onDeleteTable(): void {
    this.tableAction.emit({ type: 'deleteTable' });
    this.close.emit();
  }
}
