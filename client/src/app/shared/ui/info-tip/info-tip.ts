import { Component, DestroyRef, ElementRef, Injector, afterNextRender, computed, inject, input, signal, viewChild } from '@angular/core';
import { GlossaryEntry, GlossaryKey, METRIC_GLOSSARY } from '../../../core/models/metric-glossary';
import { positionFloatingPanel } from '../floating-position';

let nextId = 0;

/**
 * Small "i" button that explains an engineering metric on demand. Hovering peeks at the
 * plain-language definition; clicking pins it open so "Read more" can reveal the formula.
 * Escape, an outside click, or scrolling closes it.
 */
@Component({
  selector: 'app-info-tip',
  templateUrl: './info-tip.html',
  styleUrl: './info-tip.css',
  host: {
    '(pointerenter)': 'onPointerEnter()',
    '(pointerleave)': 'onPointerLeave()',
    '(document:keydown.escape)': 'onEscape()',
    '(document:pointerdown)': 'onDocumentPointerDown($event)'
  }
})
export class InfoTip {
  readonly term = input.required<GlossaryKey>();
  readonly entry = computed<GlossaryEntry>(() => METRIC_GLOSSARY[this.term()]);

  readonly open = signal(false);
  readonly pinned = signal(false);
  readonly expanded = signal(false);
  readonly panelId = `info-tip-${nextId++}`;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private closeTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly closeOnScroll = () => this.close();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.closeTimer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('scroll', this.closeOnScroll, true);
      }
    });
  }

  onPointerEnter(): void {
    clearTimeout(this.closeTimer);
    this.show();
  }

  onPointerLeave(): void {
    if (this.pinned()) {
      return;
    }
    // Short grace period so the pointer can cross the gap between the button and the panel.
    this.closeTimer = setTimeout(() => this.close(), 150);
  }

  toggle(): void {
    if (this.pinned()) {
      this.close();
      return;
    }
    this.pinned.set(true);
    this.show();
  }

  toggleDetail(): void {
    this.expanded.update(v => !v);
    afterNextRender(() => this.reposition(), { injector: this.injector });
  }

  onEscape(): void {
    if (this.open()) {
      const wasPinned = this.pinned();
      this.close();
      if (wasPinned) {
        this.trigger().nativeElement.focus();
      }
    }
  }

  onDocumentPointerDown(event: PointerEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  private show(): void {
    const panel = this.panel().nativeElement;
    if (!this.open()) {
      panel.showPopover();
      this.open.set(true);
      window.addEventListener('scroll', this.closeOnScroll, true);
    }
    this.reposition();
  }

  private reposition(): void {
    if (this.open()) {
      positionFloatingPanel(this.trigger().nativeElement, this.panel().nativeElement);
    }
  }

  private close(): void {
    clearTimeout(this.closeTimer);
    if (!this.open()) {
      return;
    }
    const panel = this.panel().nativeElement;
    if (panel.matches(':popover-open')) {
      panel.hidePopover();
    }
    window.removeEventListener('scroll', this.closeOnScroll, true);
    this.open.set(false);
    this.pinned.set(false);
    this.expanded.set(false);
  }
}
