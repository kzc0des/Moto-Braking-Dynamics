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
    const paddingLeft = 60;
    const paddingRight = 60;
    const trackWidth = width - paddingLeft - paddingRight;

    const meterToPx = (m: number) => paddingLeft + (m / maxDistance) * trackWidth;

    // Atmospheric horizon gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#070a10');
    skyGrad.addColorStop(0.65, '#0f1726');
    skyGrad.addColorStop(1, '#131d2e');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle distance guide grid in sky
    ctx.strokeStyle = '#1b263b';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 6]);
    for (let y = 30; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const laneHeight = height / numLanes;

    for (let l = 0; l < numLanes; l++) {
      const laneY = l * laneHeight;
      const roadHeight = 44;
      const roadTop = laneY + (laneHeight > 260 ? Math.floor(laneHeight * 0.65) : laneHeight - roadHeight - 12);
      const groundBottom = laneY + laneHeight - 2;

      // 1. Terrain Sub-stratum (Hill Climb Racing underground cross-section)
      ctx.fillStyle = '#0a0e17';
      ctx.fillRect(paddingLeft - 20, roadTop + roadHeight, trackWidth + 40, groundBottom - (roadTop + roadHeight));

      // Underground geological diagonal hatching
      ctx.strokeStyle = '#161f30';
      ctx.lineWidth = 1;
      const hatchStep = 18;
      ctx.beginPath();
      for (let x = paddingLeft - 20; x < width - paddingRight + 40; x += hatchStep) {
        ctx.moveTo(x, roadTop + roadHeight);
        ctx.lineTo(x - 14, groundBottom);
      }
      ctx.stroke();

      // 2. Asphalt Road Surface Band
      const roadGrad = ctx.createLinearGradient(0, roadTop, 0, roadTop + roadHeight);
      roadGrad.addColorStop(0, '#1e293b');
      roadGrad.addColorStop(0.3, '#141c2b');
      roadGrad.addColorStop(1, '#0f141f');
      ctx.fillStyle = roadGrad;
      ctx.fillRect(paddingLeft - 20, roadTop, trackWidth + 40, roadHeight);

      // Top road edge highlight
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(paddingLeft - 20, roadTop);
      ctx.lineTo(width - paddingRight + 20, roadTop);
      ctx.stroke();

      // Motorsport Rumble Kerb (alternating red & white blocks along track edge)
      const kerbWidth = 12;
      const kerbHeight = 4;
      const kerbCount = Math.floor((trackWidth + 40) / kerbWidth);
      for (let k = 0; k < kerbCount; k++) {
        ctx.fillStyle = k % 2 === 0 ? '#dc2626' : '#f8fafc';
        ctx.fillRect(paddingLeft - 20 + k * kerbWidth, roadTop - kerbHeight, kerbWidth, kerbHeight);
      }

      // Dashed lane centerline
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 10]);
      ctx.beginPath();
      const centerLineY = roadTop + roadHeight * 0.52;
      ctx.moveTo(paddingLeft, centerLineY);
      ctx.lineTo(width - paddingRight, centerLineY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Pothole surface defect (if configured)
      if (pothole && pothole.width > 0) {
        const holeX1 = meterToPx(pothole.startX);
        const holeX2 = meterToPx(pothole.startX + pothole.width);
        const holeW = Math.max(10, holeX2 - holeX1);
        const holeDepth = Math.min(14, pothole.severity * 14);

        ctx.fillStyle = '#05070b';
        ctx.fillRect(holeX1, roadTop, holeW, holeDepth);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(holeX1, roadTop, holeW, holeDepth);

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('POTHOLE', holeX1 + holeW / 2, roadTop - 6);
      }

      // Lane separator between multiple vehicles
      if (l < numLanes - 1) {
        ctx.strokeStyle = '#232f42';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(paddingLeft, laneY + laneHeight);
        ctx.lineTo(width - paddingRight, laneY + laneHeight);
        ctx.stroke();
      }
    }

    // Distance Milestone Posts & Ticks
    const tickStep = maxDistance > 70 ? 10 : 5;
    ctx.textAlign = 'center';

    for (let m = 0; m <= maxDistance; m += tickStep) {
      const x = meterToPx(m);

      // Vertical guide line across all lanes
      ctx.strokeStyle = m % 10 === 0 ? '#2a3b53' : '#1a2434';
      ctx.lineWidth = m % 10 === 0 ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(x, 14);
      ctx.lineTo(x, height - 10);
      ctx.stroke();

      // Milestone Post Badge at the top
      if (m % 10 === 0 || m === 0) {
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x - 16, 4, 32, 14, 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#93c5fd';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`${m}m`, x, 14);
      } else {
        ctx.fillStyle = '#64748b';
        ctx.font = '9px monospace';
        ctx.fillText(`${m}m`, x, 14);
      }
    }

    // Checkered Start Gantry Line (0m)
    const startX = meterToPx(0);
    const checkSize = 5;
    for (let y = 14; y < height - 10; y += checkSize) {
      ctx.fillStyle = (Math.floor(y / checkSize) % 2 === 0) ? '#10b981' : '#ffffff';
      ctx.fillRect(startX - checkSize / 2, y, checkSize, checkSize);
    }

    // Start Banner Post
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('START', startX, 12);

    // Hazard Barrier Line (X_hazard)
    const hazardX = meterToPx(hazardDistance);
    if (hazardX <= width) {
      // Barrier Wall Structure
      const barrierWidth = 14;
      ctx.fillStyle = '#1e1117';
      ctx.fillRect(hazardX - barrierWidth / 2, 16, barrierWidth, height - 28);

      // Warning Chevron Stripes on the Barrier
      const stripeHeight = 12;
      for (let y = 16; y < height - 28; y += stripeHeight) {
        ctx.fillStyle = (Math.floor(y / stripeHeight) % 2 === 0) ? '#f43f5e' : '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(hazardX - barrierWidth / 2, y);
        ctx.lineTo(hazardX + barrierWidth / 2, y + 6);
        ctx.lineTo(hazardX + barrierWidth / 2, Math.min(height - 28, y + 6 + stripeHeight / 2));
        ctx.lineTo(hazardX - barrierWidth / 2, Math.min(height - 28, y + stripeHeight / 2));
        ctx.closePath();
        ctx.fill();
      }

      // Barrier Top Red Warning Beacon
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(hazardX, 10, 4, 0, Math.PI * 2);
      ctx.fill();

      // Barrier Tag
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`BARRIER: ${hazardDistance}m`, hazardX + 10, 14);
    }

    // Road Grade Angle Badge (if inclined)
    if (Math.abs(roadGradeAngle) > 0.001) {
      const gradePct = (Math.tan(roadGradeAngle) * 100).toFixed(1);
      const isUphill = roadGradeAngle > 0;
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(width - paddingRight - 110, height - 24, 100, 18, 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`GRADE: ${gradePct}% ${isUphill ? '↗' : '↘'}`, width - paddingRight - 60, height - 12);
    }
  }
}
