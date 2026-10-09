export interface TrackRenderParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  maxDistance: number;    // e.g. 60m
  hazardDistance: number; // e.g. 50m
  numLanes: number;       // e.g. 3
}

export class TrackRenderer {
  render(params: TrackRenderParams): void {
    const { ctx, width, height, maxDistance, hazardDistance, numLanes } = params;
    const paddingLeft = 40;
    const paddingRight = 40;
    const trackWidth = width - paddingLeft - paddingRight;

    // Convert meters to canvas X
    const meterToPx = (m: number) => paddingLeft + (m / maxDistance) * trackWidth;

    // Background track surface
    ctx.fillStyle = '#0f141c';
    ctx.fillRect(0, 0, width, height);

    // Lane dividers
    const laneHeight = height / numLanes;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (let l = 1; l < numLanes; l++) {
      const y = l * laneHeight;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Meter tick marks
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';

    const tickStep = maxDistance > 60 ? 10 : 5;
    for (let m = 0; m <= maxDistance; m += tickStep) {
      const x = meterToPx(m);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      ctx.fillText(`${m}m`, x, height - 6);
    }

    // Start Line
    const startX = meterToPx(0);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(startX, height - 18);
    ctx.stroke();

    // Hazard Barrier Line (X_hazard)
    const hazardX = meterToPx(hazardDistance);
    if (hazardX <= width) {
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(hazardX, 0);
      ctx.lineTo(hazardX, height - 18);
      ctx.stroke();

      // Hazard Barrier Stripes
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`BARRIER: ${hazardDistance}m`, hazardX + 4, 16);
    }
  }
}
