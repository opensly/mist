import {
  Component,
  ElementRef,
  HostListener,
  Injector,
  ViewChild,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewportOverlayService } from '../../services/viewport-overlay.service';

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

type DropdownKind = 'table' | 'more' | 'color';

@Component({
  selector: 'mist-table-options',
  imports: [CommonModule],
  templateUrl: './table-options.component.html',
  styleUrls: ['./table-options.component.css', '../../styles/viewport-overlay.css'],
})
export class TableOptionsComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);
  private readonly overlays = inject(ViewportOverlayService);

  private readonly overlayConfig: Record<
    DropdownKind,
    { selector: string; placement: 'below' | 'beside'; estimatedSize: { width: number; height: number } }
  > = {
    table: {
      selector: '[data-dropdown="table"]',
      placement: 'below',
      estimatedSize: { width: 220, height: 220 },
    },
    more: {
      selector: '[data-dropdown="more"]',
      placement: 'below',
      estimatedSize: { width: 260, height: 360 },
    },
    color: {
      selector: '[data-dropdown="color"]',
      placement: 'beside',
      estimatedSize: { width: 200, height: 160 },
    },
  };

  @ViewChild('tableOptionsTrigger') tableOptionsTrigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('moreOptionsTrigger') moreOptionsTrigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('colorPickerTrigger') colorPickerTrigger?: ElementRef<HTMLButtonElement>;

  tableElement = input.required<HTMLTableElement>();

  tableAction = output<TableAction>();
  close = output<void>();

  showTableDropdown = signal<boolean>(false);
  showMoreDropdown = signal<boolean>(false);
  showColorPicker = signal<boolean>(false);

  tableDropdownPosition = signal<{ top: number; left: number } | null>(null);
  moreDropdownPosition = signal<{ top: number; left: number } | null>(null);
  colorPickerPosition = signal<{ top: number; left: number } | null>(null);

  cellColors = [
    '#FFFFFF',
    '#F4F5F7',
    '#EBECF0',
    '#DFE1E6',
    '#E9F2FF',
    '#B3D4FF',
    '#E6FCFF',
    '#B3F5FF',
    '#E3FCEF',
    '#ABF5D1',
    '#FFF9E6',
    '#FFF0B3',
    '#FFEBE6',
    '#FFBDAD',
    '#EAE6FF',
    '#B2D4FF',
  ];

  toggleTableDropdown(): void {
    const opening = !this.showTableDropdown();
    this.closeAllDropdowns();
    if (!opening) {
      return;
    }

    this.showTableDropdown.set(true);
    this.openOverlay('table', this.tableOptionsTrigger?.nativeElement, (position) => {
      this.tableDropdownPosition.set(position);
    });
  }

  toggleMoreDropdown(): void {
    const opening = !this.showMoreDropdown();
    this.closeAllDropdowns();
    if (!opening) {
      return;
    }

    this.showMoreDropdown.set(true);
    this.openOverlay('more', this.moreOptionsTrigger?.nativeElement, (position) => {
      this.moreDropdownPosition.set(position);
    });
  }

  toggleColorPicker(event: MouseEvent): void {
    event.stopPropagation();
    const opening = !this.showColorPicker();
    this.showColorPicker.set(opening);
    this.colorPickerPosition.set(null);

    if (!opening) {
      return;
    }

    this.openOverlay('color', this.colorPickerTrigger?.nativeElement, (position) => {
      this.colorPickerPosition.set(position);
    });
  }

  onTableAction(type: TableAction['type'], payload?: string): void {
    this.tableAction.emit({ type, payload });
    this.closeAllDropdowns();
  }

  onDeleteTable(): void {
    this.tableAction.emit({ type: 'deleteTable' });
    this.closeAllDropdowns();
    this.close.emit();
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onViewportChange(): void {
    if (this.showTableDropdown()) {
      this.syncOverlay('table', this.tableOptionsTrigger?.nativeElement, (position) => {
        this.tableDropdownPosition.set(position);
      });
    }
    if (this.showMoreDropdown()) {
      this.syncOverlay('more', this.moreOptionsTrigger?.nativeElement, (position) => {
        this.moreDropdownPosition.set(position);
      });
    }
    if (this.showColorPicker()) {
      this.syncOverlay('color', this.colorPickerTrigger?.nativeElement, (position) => {
        this.colorPickerPosition.set(position);
      });
    }
  }

  private closeAllDropdowns(): void {
    this.showTableDropdown.set(false);
    this.showMoreDropdown.set(false);
    this.showColorPicker.set(false);
    this.tableDropdownPosition.set(null);
    this.moreDropdownPosition.set(null);
    this.colorPickerPosition.set(null);
    this.overlays.releaseAllPortaled();
  }

  private openOverlay(
    kind: DropdownKind,
    trigger: HTMLElement | undefined,
    onPosition: (position: { top: number; left: number }) => void,
  ): void {
    if (!trigger) {
      return;
    }

    const config = this.overlayConfig[kind];
    this.overlays.open(
      {
        trigger,
        host: this.host.nativeElement,
        panelSelector: config.selector,
        portaledKey: kind,
        options: {
          placement: config.placement,
          estimatedSize: config.estimatedSize,
        },
        onPosition,
      },
      this.injector,
    );
  }

  private syncOverlay(
    kind: DropdownKind,
    trigger: HTMLElement | undefined,
    onPosition: (position: { top: number; left: number }) => void,
  ): void {
    if (!trigger) {
      return;
    }

    const config = this.overlayConfig[kind];
    onPosition(
      this.overlays.sync({
        trigger,
        host: this.host.nativeElement,
        panelSelector: config.selector,
        portaledKey: kind,
        options: {
          placement: config.placement,
          estimatedSize: config.estimatedSize,
        },
      }),
    );
  }
}
