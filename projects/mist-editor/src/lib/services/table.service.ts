import { Injectable } from '@angular/core';
import { SanitizationService } from './sanitization.service';

@Injectable({
  providedIn: 'root'
})
export class TableService {
  constructor(private sanitization: SanitizationService) {}

  createTable(rows: number, cols: number, blockId?: string): string {
    let blockAttr = '';
    if (blockId) {
      const sanitizedId = this.sanitization.sanitizeAttribute(blockId);
      blockAttr = `data-mist-block="${sanitizedId}" id="${sanitizedId}"`;
    }
    let html = `<table ${blockAttr} class="editor-table"><tbody>`;
    for (let i = 0; i < rows; i++) {
      html += '<tr>';
      for (let j = 0; j < cols; j++) {
        html += '<td><br></td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    return html;
  }

  handleTableManipulation(table: HTMLTableElement, type: string): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    let cell = range.startContainer as HTMLElement;
    while (cell && cell.nodeName !== 'TD' && cell.nodeName !== 'TH') {
      cell = cell.parentElement as HTMLElement;
    }

    if (!cell || !table.contains(cell)) {
      cell = table.querySelector('td') as HTMLElement;
    }

    if (!cell) return false;

    const row = cell.parentElement as HTMLTableRowElement;
    const rowIndex = row.rowIndex;
    const cellIndex = (cell as HTMLTableCellElement).cellIndex;

    if (type === 'addRowAbove') {
      const newRow = table.insertRow(rowIndex);
      for (let i = 0; i < row.cells.length; i++) {
        newRow.insertCell().innerHTML = '<br>';
      }
    } else if (type === 'addRowBelow') {
      const newRow = table.insertRow(rowIndex + 1);
      for (let i = 0; i < row.cells.length; i++) {
        newRow.insertCell().innerHTML = '<br>';
      }
    } else if (type === 'addColumnLeft') {
      for (let i = 0; i < table.rows.length; i++) {
        table.rows[i].insertCell(cellIndex).innerHTML = '<br>';
      }
    } else if (type === 'addColumnRight') {
      for (let i = 0; i < table.rows.length; i++) {
        table.rows[i].insertCell(cellIndex + 1).innerHTML = '<br>';
      }
    } else if (type === 'deleteRow') {
      if (table.rows.length > 1) {
        table.deleteRow(rowIndex);
      } else {
        table.remove();
        return true; // Table removed
      }
    } else if (type === 'deleteColumn') {
      if (row.cells.length > 1) {
        for (let i = 0; i < table.rows.length; i++) {
          table.rows[i].deleteCell(cellIndex);
        }
      } else {
        table.remove();
        return true; // Table removed
      }
    }
    return false; // Table still exists
  }

  setCellBackground(table: HTMLTableElement, color: string): void {
    if (!this.sanitization.isValidColor(color)) return;

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      let cell = range.startContainer as HTMLElement;
      while (cell && cell.nodeName !== 'TD' && cell.nodeName !== 'TH') {
        cell = cell.parentElement as HTMLElement;
      }
      if (cell && table.contains(cell)) {
        cell.style.backgroundColor = color;
      }
    }
  }
}
