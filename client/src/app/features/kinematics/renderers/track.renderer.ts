import { PotholeDefect } from '../../../core/models/benchmark.types';

export interface TrackRenderParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  maxDistance: number;
  hazardDistance: number;
  numLanes: number;
  roadGradeAngle?: number;
  pothole?: PotholeDefect;
}

export class TrackRenderer {
  render(params: TrackRenderParams): void {
    const { ctx, width, height, maxDistance, hazardDistance, numLanes, roadGradeAngle = 0, pothole } = params;
    const paddingLeft = 90;
    const paddingRight = 40;
    const trackWidth = width - paddingLeft - paddingRight;

    const meterToPx = (m: number) => paddingLeft + (m / maxDistance) * trackWidth;

    // 1. Clean track background (--panel / #FFFFFF)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    const topOffset = 24;
    const laneHeight = (height - topOffset) / numLanes;

    // 2. Vertical distance gridlines (every 10m)
    const tickStep = 10;
    ctx.font = '500 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    for (let m = 0; m <= maxDistance; m += tickStep) {
      const x = meterToPx(m);

      // Vertical line across all lanes
      if (m === 0) {
        ctx.strokeStyle = '#22201E';
        ctx.lineWidth = 1.5;
      } else {
        ctx.strokeStyle = '#E6DFD3';
        ctx.lineWidth = 1;
      }

      ctx.beginPath();
      ctx.moveTo(x, topOffset);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Top distance tick labels: "0 m", "10", "20", ...
      ctx.fillStyle = '#6B645C';
      ctx.textAlign = 'center';
      const label = m === 0 ? '0 m' : m === 50 ? '50 m' : `${m}`;
      ctx.fillText(label, x, 16);
    }

    // 3. Hazard Barrier at hazardDistance (55 m) - Coral dashed line
    const barrierX = meterToPx(hazardDistance);
    if (barrierX <= width) {
      ctx.strokeStyle = '#F2554A';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(barrierX, topOffset);
      ctx.lineTo(barrierX, height);
      ctx.stroke();
      ctx.setLineDash([]);

      // "Barrier 55 m" label
      ctx.fillStyle = '#F2554A';
      ctx.font = '600 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`Barrier ${hazardDistance} m`, barrierX - 6, 32);
    }

    // 4. Horizontal lane dividing lines between multiple vehicles
    for (let l = 0; l < numLanes; l++) {
      const laneY = topOffset + l * laneHeight;

      if (l > 0) {
        ctx.strokeStyle = '#E6DFD3';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, laneY);
        ctx.lineTo(width, laneY);
        ctx.stroke();
      }

      // Pothole defect indicator (if configured)
      if (pothole && pothole.width > 0) {
        const holeX1 = meterToPx(pothole.startX);
        const holeX2 = meterToPx(pothole.startX + pothole.width);
        const holeW = Math.max(12, holeX2 - holeX1);
        const groundY = laneY + laneHeight - 20;

        ctx.fillStyle = '#FDEBE8';
        ctx.strokeStyle = '#F2554A';
        ctx.lineWidth = 1.5;
        ctx.fillRect(holeX1, groundY, holeW, 8);
        ctx.strokeRect(holeX1, groundY, holeW, 8);

        ctx.fillStyle = '#C93A30';
        ctx.font = '600 10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('POTHOLE', holeX1 + holeW / 2, groundY - 4);
      }
    }
  }
}
