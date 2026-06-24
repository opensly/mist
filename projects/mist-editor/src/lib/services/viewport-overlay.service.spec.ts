import { ViewportOverlayService } from './viewport-overlay.service';

describe('ViewportOverlayService', () => {
  let service: ViewportOverlayService;
  let trigger: HTMLButtonElement;

  beforeEach(() => {
    service = new ViewportOverlayService();
    trigger = document.createElement('button');
    document.body.appendChild(trigger);

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
  });

  afterEach(() => {
    document.body.innerHTML = '';
    service.releaseAllPortaled();
  });

  it('should position below the trigger by default', () => {
    const position = service.position(trigger, null, {
      estimatedSize: { width: 220, height: 220 },
    });

    expect(position).toEqual({ top: 536, left: 120 });
  });

  it('should flip above the trigger when the panel would clip the viewport bottom', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 });

    const panel = document.createElement('div');
    Object.defineProperty(panel, 'offsetHeight', { configurable: true, value: 180 });
    Object.defineProperty(panel, 'offsetWidth', { configurable: true, value: 220 });

    const position = service.position(trigger, panel, { placement: 'below' });
    expect(position.top).toBe(316);
    expect(position.left).toBe(120);
  });

  it('should position beside the trigger and flip to the left when needed', () => {
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      top: 200,
      left: 900,
      right: 980,
      bottom: 232,
      width: 80,
      height: 32,
      x: 900,
      y: 200,
      toJSON: () => ({}),
    } as DOMRect);

    const panel = document.createElement('div');
    Object.defineProperty(panel, 'offsetHeight', { configurable: true, value: 160 });
    Object.defineProperty(panel, 'offsetWidth', { configurable: true, value: 200 });

    const position = service.position(trigger, panel, { placement: 'beside' });
    expect(position.left).toBe(696);
    expect(position.top).toBe(196);
  });

  it('should portal panels to document.body and resolve them by key', () => {
    const host = document.createElement('div');
    const panel = document.createElement('div');
    panel.setAttribute('data-overlay', 'menu');
    host.appendChild(panel);
    document.body.appendChild(host);

    service.portalToBody(panel, 'menu');

    expect(panel.parentElement).toBe(document.body);
    expect(service.resolvePanel(host, '[data-overlay="menu"]', 'menu')).toBe(panel);
  });

  it('should release tracked portaled elements', () => {
    const panel = document.createElement('div');
    service.portalToBody(panel, 'menu');
    service.releasePortaled('menu');

    const host = document.createElement('div');
    expect(service.resolvePanel(host, '[data-overlay="menu"]', 'menu')).toBeNull();
  });
});
