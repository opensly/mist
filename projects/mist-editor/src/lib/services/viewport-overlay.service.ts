import { Injectable, Injector, afterNextRender } from '@angular/core';
import {
  OpenViewportOverlayConfig,
  OverlayPosition,
  OverlaySize,
  SyncViewportOverlayConfig,
  ViewportOverlayOptions,
} from '../models/overlay-position.model';

const DEFAULT_GAP = 4;
const DEFAULT_VIEWPORT_PADDING = 8;
const DEFAULT_ESTIMATED_SIZE: OverlaySize = { width: 220, height: 220 };

@Injectable({
  providedIn: 'root',
})
export class ViewportOverlayService {
  private readonly portaledElements = new Map<string, HTMLElement>();

  /**
   * Estimate position immediately, then portal the panel to document.body and
   * re-measure after the next render.
   */
  open(config: OpenViewportOverlayConfig, injector: Injector): void {
    const panel = this.resolvePanel(config.host, config.panelSelector, config.portaledKey);
    config.onPosition(this.position(config.trigger, panel, config.options));

    afterNextRender(
      () => {
        const resolvedPanel = this.resolvePanel(
          config.host,
          config.panelSelector,
          config.portaledKey,
        );
        if (resolvedPanel) {
          this.portalToBody(resolvedPanel, config.portaledKey);
        }
        config.onPosition(this.sync(config));
      },
      { injector },
    );
  }

  sync(config: SyncViewportOverlayConfig): OverlayPosition {
    const panel = this.resolvePanel(config.host, config.panelSelector, config.portaledKey);
    return this.position(config.trigger, panel, config.options);
  }

  position(
    trigger: HTMLElement,
    panel: HTMLElement | null,
    options?: ViewportOverlayOptions,
  ): OverlayPosition {
    const placement = options?.placement ?? 'below';
    const fallback = options?.estimatedSize ?? DEFAULT_ESTIMATED_SIZE;
    const gap = options?.gap ?? DEFAULT_GAP;
    const viewportPadding = options?.viewportPadding ?? DEFAULT_VIEWPORT_PADDING;

    if (placement === 'beside') {
      return this.positionBeside(trigger, panel, fallback, gap, viewportPadding);
    }

    return this.positionBelowOrAbove(trigger, panel, fallback, gap, viewportPadding);
  }

  portalToBody(element: HTMLElement, key: string): void {
    if (element.parentElement !== document.body) {
      document.body.appendChild(element);
    }
    this.portaledElements.set(key, element);
  }

  resolvePanel(host: HTMLElement, selector: string, portaledKey: string): HTMLElement | null {
    const portaled = this.portaledElements.get(portaledKey);
    if (portaled?.isConnected) {
      return portaled;
    }

    const inHost = host.querySelector(selector);
    if (inHost instanceof HTMLElement) {
      return inHost;
    }

    const inDocument = document.querySelector(selector);
    return inDocument instanceof HTMLElement ? inDocument : null;
  }

  releasePortaled(key: string): void {
    this.portaledElements.delete(key);
  }

  releaseAllPortaled(): void {
    this.portaledElements.clear();
  }

  private positionBelowOrAbove(
    trigger: HTMLElement,
    panel: HTMLElement | null,
    fallback: OverlaySize,
    gap: number,
    viewportPadding: number,
  ): OverlayPosition {
    const rect = trigger.getBoundingClientRect();
    const menuHeight = panel?.offsetHeight || fallback.height;
    const menuWidth = panel?.offsetWidth || fallback.width;

    let top = rect.bottom + gap;
    if (top + menuHeight > window.innerHeight - viewportPadding) {
      top = Math.max(viewportPadding, rect.top - menuHeight - gap);
    }

    let left = rect.left;
    const maxLeft = window.innerWidth - menuWidth - viewportPadding;
    left = Math.max(viewportPadding, Math.min(left, maxLeft));

    return { top, left };
  }

  private positionBeside(
    trigger: HTMLElement,
    panel: HTMLElement | null,
    fallback: OverlaySize,
    gap: number,
    viewportPadding: number,
  ): OverlayPosition {
    const rect = trigger.getBoundingClientRect();
    const menuWidth = panel?.offsetWidth || fallback.width;
    const menuHeight = panel?.offsetHeight || fallback.height;

    let left = rect.right + gap;
    if (left + menuWidth > window.innerWidth - viewportPadding) {
      left = rect.left - menuWidth - gap;
    }
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - menuWidth - viewportPadding));

    let top = rect.top - gap;
    if (top + menuHeight > window.innerHeight - viewportPadding) {
      top = window.innerHeight - menuHeight - viewportPadding;
    }
    top = Math.max(viewportPadding, top);

    return { top, left };
  }
}
