import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TableOptionsComponent } from './table-options.component';
import { ViewportOverlayService } from '../../services/viewport-overlay.service';

describe('TableOptionsComponent', () => {
  let fixture: ComponentFixture<TableOptionsComponent>;
  let component: TableOptionsComponent;
  let overlays: ViewportOverlayService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableOptionsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TableOptionsComponent);
    component = fixture.componentInstance;
    overlays = TestBed.inject(ViewportOverlayService);

    const table = document.createElement('table');
    table.innerHTML = '<tr><td>Cell</td></tr>';
    fixture.componentRef.setInput('tableElement', table);
    fixture.detectChanges();
  });

  afterEach(() => {
    overlays.releaseAllPortaled();
    document.body.innerHTML = '';
  });

  it('should delegate table dropdown positioning to ViewportOverlayService', () => {
    const trigger = fixture.nativeElement.querySelector(
      '[title="Table options"]',
    ) as HTMLButtonElement;
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      top: 500,
      left: 120,
      right: 260,
      bottom: 532,
      width: 140,
      height: 32,
      x: 120,
      y: 500,
      toJSON: () => ({}),
    } as DOMRect);

    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });

    const openSpy = vi.spyOn(overlays, 'open');

    component.toggleTableDropdown();
    fixture.detectChanges();

    expect(openSpy).toHaveBeenCalled();
    expect(component.showTableDropdown()).toBe(true);
    expect(component.tableDropdownPosition()).toEqual({ top: 536, left: 120 });
  });
});
