export interface ChartCurve {
  name: string;
  color: string;
  times: number[];
  values: number[];
  unit: string;
}

export interface ThresholdLine {
  value: number;
  label: string;
  color: string;
  dashed?: boolean;
}

export interface StripChartRenderParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  title?: string;
  curves: ChartCurve[];
  thresholds?: ThresholdLine[];
  maxTime: number;
  scrubTime: number;
  yMin?: number;
  yMax?: number;
}

export class StripChartRenderer {
  render(params: StripChartRenderParams): void {
    const { ctx, width, height, title, curves, thresholds, maxTime, scrubTime } = params;

    const padLeft = 16;
    const padRight = 16;
    const padTop = 12;
    const padBottom = 24;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    if (plotW <= 0 || plotH <= 0) return;

    // 1. Chart Well Background (--well / #FAF7F2)
    ctx.fillStyle = '#FAF7F2';
    ctx.fillRect(0, 0, width, height);

    // 2. Chart Plot Border (--border / #E6DFD3)
    ctx.strokeStyle = '#E6DFD3';
    ctx.lineWidth = 1;
    ctx.strokeRect(padLeft, padTop, plotW, plotH);

    // Dynamic Y min/max calculation
    let minY = params.yMin ?? Infinity;
    let maxY = params.yMax ?? -Infinity;

    if (params.yMin === undefined || params.yMax === undefined) {
      curves.forEach(c => {
        c.values.forEach(v => {
          if (v < minY) minY = v;
          if (v > maxY) maxY = v;
        });
      });
      if (minY === Infinity) minY = 0;
      if (maxY === -Infinity || maxY === minY) maxY = minY + 1;
    }

    const yRange = maxY - minY || 1;
    const timeToX = (t: number) => padLeft + (t / maxTime) * plotW;
    const valToY = (v: number) => padTop + plotH - ((v - minY) / yRange) * plotH;

    // 3. Horizontal Gridlines (--border / #E6DFD3)
    ctx.strokeStyle = '#E6DFD3';
    ctx.lineWidth = 1;
    const gridDivs = 3;
    for (let i = 1; i < gridDivs; i++) {
      const y = padTop + (i / gridDivs) * plotH;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.stroke();
    }

    // 4. Bottom Time Axis Ticks & Labels
    ctx.fillStyle = '#A39B90';
    ctx.font = '500 11px system-ui, sans-serif';
    ctx.textAlign = 'center';

    const stepT = maxTime > 3 ? 1.0 : 0.5;
    for (let t = 0; t <= maxTime + 0.01; t += stepT) {
      const x = timeToX(t);
      if (x > padLeft + plotW) break;

      // Vertical tick stub
      ctx.strokeStyle = '#E6DFD3';
      ctx.beginPath();
      ctx.moveTo(x, padTop + plotH);
      ctx.lineTo(x, padTop + plotH + 4);
      ctx.stroke();

      const label = t === 0 ? '0 s' : t >= maxTime - 0.2 ? `${t.toFixed(1)} s` : `${t.toFixed(1)}`;
      ctx.fillText(label, x, padTop + plotH + 16);
    }

    // 5. Threshold Lines (if applicable)
    if (thresholds) {
      thresholds.forEach(th => {
        if (th.value >= minY && th.value <= maxY) {
          const y = valToY(th.value);
          ctx.strokeStyle = th.color;
          ctx.lineWidth = 1;
          if (th.dashed) ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(padLeft, y);
          ctx.lineTo(padLeft + plotW, y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    }

    // 6. Plot Curves
    curves.forEach(c => {
      if (c.times.length === 0) return;
      ctx.strokeStyle = c.color;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.beginPath();

      for (let i = 0; i < c.times.length; i++) {
        const x = timeToX(c.times[i]);
        const y = Math.max(padTop, Math.min(padTop + plotH, valToY(c.values[i])));
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    });

    // 7. Synchronized Scrub Needle
    if (scrubTime >= 0 && scrubTime <= maxTime) {
      const scrubX = timeToX(scrubTime);
      ctx.strokeStyle = '#22201E';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(scrubX, padTop);
      ctx.lineTo(scrubX, padTop + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  interpolateValue(times: number[], values: number[], t: number): number {
    if (times.length === 0) return 0;
    if (t <= times[0]) return values[0];
    const last = times.length - 1;
    if (t >= times[last]) return values[last];

    let low = 0;
    let high = last;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (times[mid] < t) low = mid + 1;
      else high = mid - 1;
    }
    const i0 = Math.max(0, low - 1);
    const i1 = Math.min(last, low);
    const dt = times[i1] - times[i0];
    const alpha = dt > 1e-6 ? (t - times[i0]) / dt : 0;
    return values[i0] + alpha * (values[i1] - values[i0]);
  }
}
