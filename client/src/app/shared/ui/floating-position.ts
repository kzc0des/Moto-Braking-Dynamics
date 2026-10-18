/**
 * Places a top-layer popover next to its anchor: above when it fits, otherwise below, and
 * beside the anchor (on the roomier side) when it is too tall for either. Always clamped inside
 * the viewport. The panel is position: fixed, so it never reflows the page.
 */
export function positionFloatingPanel(anchor: HTMLElement, panel: HTMLElement, gap = 8, margin = 8): void {
  const rect = anchor.getBoundingClientRect();
  const width = panel.offsetWidth;
  const height = panel.offsetHeight;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const centredLeft = rect.left + rect.width / 2 - width / 2;

  let top: number;
  let left: number;
  if (rect.top - gap - height >= margin) {
    top = rect.top - gap - height;
    left = centredLeft;
  } else if (rect.bottom + gap + height <= viewportHeight - margin) {
    top = rect.bottom + gap;
    left = centredLeft;
  } else {
    const roomRight = viewportWidth - rect.right - gap - margin;
    const roomLeft = rect.left - gap - margin;
    left = roomRight >= roomLeft ? rect.right + gap : rect.left - gap - width;
    top = rect.top + rect.height / 2 - height / 2;
  }

  const clamp = (value: number, max: number) => Math.max(margin, Math.min(value, max));
  panel.style.top = `${clamp(top, viewportHeight - height - margin)}px`;
  panel.style.left = `${clamp(left, viewportWidth - width - margin)}px`;
}
