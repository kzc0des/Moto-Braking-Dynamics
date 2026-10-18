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
  reactionDistance?: number;
  isCollision?: boolean;
  impactVelocityKmh?: number;
}

export class TrackRenderer {
  render(params: TrackRenderParams): void {
    const { ctx, width, height, maxDistance, hazardDistance, numLanes, roadGradeAngle = 0, pothole } = params;
    const paddingLeft = 70;
    const paddingRight = 50;
    const trackWidth = Math.max(120, width - paddingLeft - paddingRight);

    const meterToPx = (m: number) => paddingLeft + (m / maxDistance) * trackWidth;

    // 1. Clean track background (--panel / #171B21)
    ctx.fillStyle = '#171B21';
    ctx.fillRect(0, 0, width, height);

    const topOffset = 26;
    const laneHeight = (height - topOffset) / numLanes;

    // 1b. Zone shading so the stage explains itself: reaction -> braking -> impact
    const zoneTop = topOffset;
    const zoneH = height - topOffset;
    const barrierPx = meterToPx(hazardDistance);
    const onsetPx = params.reactionDistance && params.reactionDistance > 0
      ? meterToPx(Math.min(params.reactionDistance, hazardDistance))
      : meterToPx(0);
    const startPx = meterToPx(0);
    const endPx = width;

    // Reaction zone (free-roll): diagonal hatch
    if (onsetPx > startPx) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(startPx, zoneTop, onsetPx - startPx, zoneH);
      ctx.clip();
      ctx.fillStyle = '#14181D';
      ctx.fillRect(startPx, zoneTop, onsetPx - startPx, zoneH);
      ctx.strokeStyle = '#232830';
      ctx.lineWidth = 1;
      for (let x = startPx - zoneH; x < onsetPx; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, zoneTop + zoneH);
        ctx.lineTo(x + zoneH, zoneTop);
        ctx.stroke();
      }
      ctx.restore();
    }
    // Braking zone: soft amber
    if (barrierPx > onsetPx) {
      ctx.fillStyle = 'rgba(255, 200, 0, 0.10)';
      ctx.fillRect(onsetPx, zoneTop, barrierPx - onsetPx, zoneH);
    }
    // Beyond the impact barrier: soft red
    if (endPx > barrierPx) {
      ctx.fillStyle = 'rgba(242, 84, 75, 0.09)';
      ctx.fillRect(barrierPx, zoneTop, endPx - barrierPx, zoneH);
    }
    // Zone captions (only when the zone is wide enough to hold them)
    ctx.font = '700 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#858D98';
    const captionY = zoneTop + zoneH * 0.30;
    const caption = (label: string, x1: number, x2: number) => {
      if (x2 - x1 >= ctx.measureText(label).width + 16) {
        ctx.fillText(label, (x1 + x2) / 2, captionY);
      }
    };
    caption('REACTION · FREE-ROLL', startPx, onsetPx);
    caption('BRAKING ZONE', onsetPx, barrierPx);
    ctx.fillStyle = '#FF8F88';
    caption('BEYOND BARRIER', barrierPx, endPx);

    // 2. Vertical distance gridlines (every 10m, big and readable)
    const tickStep = 10;
    ctx.font = '600 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    for (let m = 0; m <= maxDistance; m += tickStep) {
      const x = meterToPx(m);

      // Vertical line across all lanes
      if (m === 0) {
        // High-contrast starting line
        ctx.strokeStyle = '#ECEFF3';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, topOffset);
        ctx.lineTo(x, height);
        ctx.stroke();

        // Pavement start mark amber accent line
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - 3, topOffset);
        ctx.lineTo(x - 3, height);
        ctx.stroke();

        ctx.fillStyle = '#ECEFF3';
        ctx.font = '700 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('START 0 m', x, 18);
        continue;
      } else {
        ctx.strokeStyle = '#2A3039';
        ctx.lineWidth = 1;
      }

      ctx.beginPath();
      ctx.moveTo(x, topOffset);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Top distance tick labels: "10 m", "20 m", ...
      ctx.fillStyle = '#A9B0BA';
      ctx.textAlign = 'center';
      ctx.fillText(`${m} m`, x, 18);
    }

    // 2b. Reaction Distance / Brake Onset Demarcation Line (Neutral Cool Slate)
    if (params.reactionDistance && params.reactionDistance > 0 && params.reactionDistance < maxDistance) {
      const rxnX = meterToPx(params.reactionDistance);
      ctx.strokeStyle = '#A9B0BA';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(rxnX, topOffset);
      ctx.lineTo(rxnX, height);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = '600 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      const onsetLabel = `BRAKE ONSET (${params.reactionDistance.toFixed(1)}m)`;
      const onsetW = ctx.measureText(onsetLabel).width + 10;
      ctx.fillStyle = '#171B21';
      ctx.fillRect(rxnX - onsetW / 2, topOffset + 3, onsetW, 16);
      ctx.fillStyle = '#C7CCD4';
      ctx.fillText(onsetLabel, rxnX, topOffset + 15);
    }

    // 3. Impact Barrier at X_impact (hazardDistance) - Red Signal Barrier
    const barrierX = meterToPx(hazardDistance);
    if (barrierX <= width) {
      ctx.strokeStyle = '#F2544B';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(barrierX, topOffset);
      ctx.lineTo(barrierX, height);
      ctx.stroke();
      ctx.setLineDash([]);

      // "Barrier 32.5 m" label
      ctx.fillStyle = '#F2544B';
      ctx.font = '700 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'right';
      const barrierLabel = `Impact Barrier ${hazardDistance} m`;
      const barrierW = ctx.measureText(barrierLabel).width + 10;
      ctx.fillStyle = '#171B21';
      ctx.fillRect(barrierX - 4 - barrierW, topOffset + 20, barrierW, 16);
      ctx.fillStyle = '#F2544B';
      ctx.fillText(barrierLabel, barrierX - 9, topOffset + 32);

      // High-Visibility Red Canvas Callout if Collision Occurred
      if (params.isCollision) {
        ctx.font = '700 10.5px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const spdText = params.impactVelocityKmh ? ` · ${params.impactVelocityKmh} km/h` : '';
        const impactLabel = `CRITICAL IMPACT${spdText} · FAILED`;
        const pillW = Math.max(180, ctx.measureText(impactLabel).width + 24);
        const pillH = 22;
        const pillX = barrierX - pillW / 2;
        const pillY = topOffset + 18;

        ctx.fillStyle = '#2D1514';
        ctx.strokeStyle = '#F2544B';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FF8F88';
        ctx.textAlign = 'center';
        ctx.fillText(impactLabel, barrierX, pillY + 15);
      }
    }

    // 4. Horizontal lane dividing lines between multiple vehicles - Yellow pavement marking lines
    for (let l = 0; l < numLanes; l++) {
      const laneY = topOffset + l * laneHeight;

      if (l > 0) {
        ctx.strokeStyle = '#FFC800';
        ctx.lineWidth = 2;
        ctx.setLineDash([12, 10]);
        ctx.beginPath();
        ctx.moveTo(0, laneY);
        ctx.lineTo(width, laneY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Pothole defect indicator (if configured)
      if (pothole && pothole.width > 0) {
        const holeX1 = meterToPx(pothole.startX);
        const holeX2 = meterToPx(pothole.startX + pothole.width);
        const holeW = Math.max(12, holeX2 - holeX1);
        const groundY = laneY + laneHeight - 20;

        ctx.fillStyle = '#2D1514';
        ctx.strokeStyle = '#F2544B';
        ctx.lineWidth = 1.5;
        ctx.fillRect(holeX1, groundY, holeW, 8);
        ctx.strokeRect(holeX1, groundY, holeW, 8);

        ctx.fillStyle = '#F2544B';
        ctx.font = '600 10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('POTHOLE', holeX1 + holeW / 2, groundY - 4);
      }
    }
  }
}
