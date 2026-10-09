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
  title: string;
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

    const padLeft = 45;
    const padRight = 85;
    const padTop = 20;
    const padBottom = 20;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Background
    ctx.fillStyle = '#0b0f17';
    ctx.fillRect(0, 0, width, height);

    // Border
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(padLeft, padTop, plotW, plotH);

    // Compute dynamic Y min/max if not explicitly provided
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

    // Horizontal grid lines
    ctx.strokeStyle = '#151c28';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = padTop + (i / 3) * plotH;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.stroke();

      const val = maxY - (i / 3) * yRange;
      ctx.fillStyle = '#64748b';
      ctx.font = '9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(1), padLeft - 4, y + 3);
    }

    // Threshold lines (e.g. Critical Slip or Lift-off 0 N)
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

          ctx.fillStyle = th.color;
          ctx.font = '9px monospace';
          ctx.textAlign = 'left';
          ctx.fillText(th.label, padLeft + plotW + 4, y + 3);
        }
      });
    }

    // Title & Legend at top left
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(title, padLeft, 13);

    // Plot Curves
    curves.forEach(c => {
      if (c.times.length === 0) return;
      ctx.strokeStyle = c.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      for (let i = 0; i < c.times.length; i++) {
        const x = timeToX(c.times[i]);
        const y = valToY(c.values[i]);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Find value at scrub needle
      const scrubVal = this.interpolateValue(c.times, c.values, scrubTime);
      ctx.fillStyle = c.color;
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${c.name}: ${scrubVal.toFixed(1)}${c.unit}`, padLeft + plotW + 4, padTop + 14 * (curves.indexOf(c) + 1));
    });

    // Synchronized Scrub Needle
    if (scrubTime >= 0 && scrubTime <= maxTime) {
      const scrubX = timeToX(scrubTime);
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(scrubX, padTop);
      ctx.lineTo(scrubX, padTop + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  private interpolateValue(times: number[], values: number[], t: number): number {
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
