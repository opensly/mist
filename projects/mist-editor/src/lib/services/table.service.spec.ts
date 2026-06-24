import { TableService } from './table.service';
import { SanitizationService } from './sanitization.service';

describe('TableService', () => {
  let service: TableService;
  let sanitizationService: any;

  beforeEach(() => {
    sanitizationService = {
      sanitizeAttribute: vi.fn((value: string) => value.replace(/[<>"'`=]/g, '')),
      isValidColor: vi.fn((color: string) => /^#([0-9A-Fa-f]{3}){1,2}$/.test(color))
    };

    service = new TableService(sanitizationService);
  });

  describe('createTable', () => {
    it('should create a table with specified dimensions', () => {
      const result = service.createTable(2, 3);
      
      expect(result).toContain('<table');
      expect(result).toContain('</table>');
      expect(result).toContain('<tbody>');
      
      // Count rows
      const rowMatches = result.match(/<tr>/g);
      expect(rowMatches?.length).toBe(2);
      
      // Count cells (2 rows * 3 cols = 6 cells)
      const cellMatches = result.match(/<td>/g);
      expect(cellMatches?.length).toBe(6);
    });

    it('should create table with custom block id', () => {
      const result = service.createTable(1, 1, 'b_mytable');

      expect(result).toContain('data-mist-block="b_mytable"');
      expect(result).toContain('id="b_mytable"');
      expect(sanitizationService.sanitizeAttribute).toHaveBeenCalledWith('b_mytable');
    });

    it('should create table without id when not provided', () => {
      const result = service.createTable(1, 1);

      expect(result).toContain('<table');
      expect(result).not.toContain('data-mist-block=');
    });

    it('should include editor-table class', () => {
      const result = service.createTable(1, 1);
      expect(result).toContain('class="editor-table"');
    });

    it('should create cells with br tags', () => {
      const result = service.createTable(1, 1);
      expect(result).toContain('<td><br></td>');
    });
  });

  describe('handleTableManipulation', () => {
    let table: HTMLTableElement;

    beforeEach(() => {
      // Create a 2x2 table for testing
      const tableHtml = service.createTable(2, 2, 'test-table');
      const container = document.createElement('div');
      container.innerHTML = tableHtml;
      table = container.querySelector('table') as HTMLTableElement;
      document.body.appendChild(table);
    });

    afterEach(() => {
      if (table && table.parentNode) {
        table.parentNode.removeChild(table);
      }
      window.getSelection()?.removeAllRanges();
    });

    it('should add row above current cell', () => {
      const cell = table.rows[0].cells[0];
      selectCell(cell);
      
      service.handleTableManipulation(table, 'addRowAbove');
      
      expect(table.rows.length).toBe(3);
    });

    it('should add row below current cell', () => {
      const cell = table.rows[1].cells[0];
      selectCell(cell);
      
      service.handleTableManipulation(table, 'addRowBelow');
      
      expect(table.rows.length).toBe(3);
    });

    it('should add column left of current cell', () => {
      const cell = table.rows[0].cells[0];
      selectCell(cell);
      
      service.handleTableManipulation(table, 'addColumnLeft');
      
      expect(table.rows[0].cells.length).toBe(3);
    });

    it('should add column right of current cell', () => {
      const cell = table.rows[0].cells[1];
      selectCell(cell);
      
      service.handleTableManipulation(table, 'addColumnRight');
      
      expect(table.rows[0].cells.length).toBe(3);
    });

    it('should delete row', () => {
      const cell = table.rows[0].cells[0];
      selectCell(cell);
      
      service.handleTableManipulation(table, 'deleteRow');
      
      expect(table.rows.length).toBe(1);
    });

    it('should delete column', () => {
      const cell = table.rows[0].cells[0];
      selectCell(cell);
      
      service.handleTableManipulation(table, 'deleteColumn');
      
      expect(table.rows[0].cells.length).toBe(1);
    });

    it('should remove table when deleting last row', () => {
      // Create 1x1 table
      const singleCellTableHtml = service.createTable(1, 1, 'single');
      const container = document.createElement('div');
      container.innerHTML = singleCellTableHtml;
      const singleTable = container.querySelector('table') as HTMLTableElement;
      document.body.appendChild(singleTable);
      
      const cell = singleTable.rows[0].cells[0];
      selectCell(cell);
      
      const removed = service.handleTableManipulation(singleTable, 'deleteRow');
      
      expect(removed).toBe(true);
      expect(document.body.contains(singleTable)).toBe(false);
    });

    it('should remove table when deleting last column', () => {
      // Create 1x1 table
      const singleCellTableHtml = service.createTable(1, 1, 'single2');
      const container = document.createElement('div');
      container.innerHTML = singleCellTableHtml;
      const singleTable = container.querySelector('table') as HTMLTableElement;
      document.body.appendChild(singleTable);
      
      const cell = singleTable.rows[0].cells[0];
      selectCell(cell);
      
      const removed = service.handleTableManipulation(singleTable, 'deleteColumn');
      
      expect(removed).toBe(true);
      expect(document.body.contains(singleTable)).toBe(false);
    });

    it('should return false when table still exists', () => {
      const cell = table.rows[0].cells[0];
      selectCell(cell);

      const removed = service.handleTableManipulation(table, 'addRowAbove');

      expect(removed).toBe(false);
    });

    it('should fall back to the first cell when selection is outside the table', () => {
      const outside = document.createElement('p');
      outside.textContent = 'outside';
      document.body.appendChild(outside);
      selectNodeContents(outside.firstChild!);

      service.handleTableManipulation(table, 'addRowBelow');

      expect(table.rows.length).toBe(3);
      outside.remove();
    });

    it('should return false when no cells exist', () => {
      const emptyTable = document.createElement('table');
      document.body.appendChild(emptyTable);
      const outside = document.createElement('p');
      outside.textContent = 'outside';
      document.body.appendChild(outside);
      selectNodeContents(outside.firstChild!);

      expect(service.handleTableManipulation(emptyTable, 'addRowAbove')).toBe(false);

      emptyTable.remove();
      outside.remove();
    });

    it('should return false when there is no selection', () => {
      window.getSelection()?.removeAllRanges();
      expect(service.handleTableManipulation(table, 'addRowAbove')).toBe(false);
    });
  });

  describe('setCellBackground', () => {
    let table: HTMLTableElement;

    beforeEach(() => {
      const tableHtml = service.createTable(2, 2);
      const container = document.createElement('div');
      container.innerHTML = tableHtml;
      table = container.querySelector('table') as HTMLTableElement;
      document.body.appendChild(table);
    });

    afterEach(() => {
      if (table && table.parentNode) {
        table.parentNode.removeChild(table);
      }
      window.getSelection()?.removeAllRanges();
    });

    it('should set cell background color', () => {
      const cell = table.rows[0].cells[0];
      selectCell(cell);
      
      service.setCellBackground(table, '#FF0000');
      
      expect(cell.style.backgroundColor).toBe('rgb(255, 0, 0)');
    });

    it('should not throw when no selection exists', () => {
      window.getSelection()?.removeAllRanges();

      expect(() => {
        service.setCellBackground(table, '#FF0000');
      }).not.toThrow();
    });

    it('should style a cell when selection is inside nested text', () => {
      const cell = table.rows[0].cells[0];
      cell.innerHTML = '<span>Nested</span>';
      const textNode = cell.querySelector('span')!.firstChild!;
      selectNodeContents(textNode);

      service.setCellBackground(table, '#00FF00');

      expect(cell.style.backgroundColor).toBe('rgb(0, 255, 0)');
    });

    it('should ignore invalid cell background colors', () => {
      const cell = table.rows[0].cells[0];
      selectCell(cell);

      service.setCellBackground(table, 'expression(alert(1))');

      expect(cell.style.backgroundColor).toBe('');
    });
  });

  function selectNodeContents(node: Node) {
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  // Helper function to select a cell
  function selectCell(cell: HTMLTableCellElement) {
    const range = document.createRange();
    range.selectNodeContents(cell);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
});
