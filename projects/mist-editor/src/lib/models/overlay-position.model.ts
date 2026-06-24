export interface OverlayPosition {
  top: number;
  left: number;
}

export interface OverlaySize {
  width: number;
  height: number;
}

export type OverlayPlacement = 'below' | 'beside';

export interface ViewportOverlayOptions {
  placement?: OverlayPlacement;
  gap?: number;
  viewportPadding?: number;
  estimatedSize?: OverlaySize;
}

/** Apply to panels that are portaled to document.body with fixed viewport coordinates. */
export const VIEWPORT_OVERLAY_CLASS = 'mist-viewport-overlay';

export interface OpenViewportOverlayConfig {
  trigger: HTMLElement;
  host: HTMLElement;
  panelSelector: string;
  portaledKey: string;
  options?: ViewportOverlayOptions;
  onPosition: (position: OverlayPosition) => void;
}

export interface SyncViewportOverlayConfig {
  trigger: HTMLElement;
  host: HTMLElement;
  panelSelector: string;
  portaledKey: string;
  options?: ViewportOverlayOptions;
}
