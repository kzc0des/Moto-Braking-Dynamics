import { InterpolatedScrubFrame, TerminalOutcome } from '../../../core/models/telemetry.types';

export interface VehicleRenderParams {
  ctx: CanvasRenderingContext2D;
  laneY: number;
  laneHeight: number;
  width: number;
  maxDistance: number;
  colorAccent: string;
  name: string;
  frame: InterpolatedScrubFrame;
}

export class VehicleRenderer {
  render(params: VehicleRenderParams): void {
    const { ctx, laneY, laneHeight, width, maxDistance, colorAccent, name, frame } = params;
    const paddingLeft = 40;
    const paddingRight = 40;
    const trackWidth = width - paddingLeft - paddingRight;

    const meterToPx = (m: number) => paddingLeft + (m / maxDistance) * trackWidth;
    const posX = meterToPx(frame.distance);
    const groundY = laneY + laneHeight - 22;

    // Pitch angle approximation from deceleration (fork dive)
    // Positive pitch = nose dive
    const pitchAngle = Math.min(0.12, Math.max(-0.05, (frame.deceleration / 9.81) * 0.08));

    ctx.save();
    ctx.translate(posX, groundY);
    ctx.rotate(-pitchAngle);

    // Motorcycle visual dimensions (scale down for track representation)
    const bikeLength = 36;
    const halfL = bikeLength / 2;
    const wheelR = 7;
    const cogH = 14;

    // Rear Wheel
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-halfL, -wheelR, wheelR, 0, Math.PI * 2);
    ctx.stroke();

    // Front Wheel
    ctx.beginPath();
    ctx.arc(halfL, -wheelR, wheelR, 0, Math.PI * 2);
    ctx.stroke();

    // Wheel spokes rotating with omega
    const angle = frame.time * frame.omega;
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-halfL - Math.cos(angle) * wheelR, -wheelR - Math.sin(angle) * wheelR);
    ctx.lineTo(-halfL + Math.cos(angle) * wheelR, -wheelR + Math.sin(angle) * wheelR);
    ctx.moveTo(halfL - Math.cos(angle) * wheelR, -wheelR - Math.sin(angle) * wheelR);
    ctx.lineTo(halfL + Math.cos(angle) * wheelR, -wheelR + Math.sin(angle) * wheelR);
    ctx.stroke();

    // Chassis / Frame Line
    ctx.strokeStyle = colorAccent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-halfL, -wheelR);
    ctx.lineTo(0, -cogH);
    ctx.lineTo(halfL, -wheelR);
    ctx.stroke();

    // CoG Crosshair dot
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(0, -cogH, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Rider silhouette/helmet
    ctx.fillStyle = colorAccent;
    ctx.beginPath();
    ctx.arc(-4, -cogH - 8, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Dynamic Normal Load Arrows (drawn relative to world coordinate ground)
    const maxFz = 2500; // Reference 2.5 kN scale
    const arrowScale = 22; // max px height

    const frontFzLen = Math.min(30, (frame.normalLoadFront / maxFz) * arrowScale);
    const rearFzLen = Math.min(30, (frame.normalLoadRear / maxFz) * arrowScale);

    // Front Load Vector (pointing down onto ground)
    ctx.strokeStyle = '#fbbf24'; // Volt amber
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(posX + halfL, groundY);
    ctx.lineTo(posX + halfL, groundY + frontFzLen);
    ctx.stroke();

    // Rear Load Vector
    ctx.strokeStyle = '#06b6d4'; // Cyan
    ctx.beginPath();
    ctx.moveTo(posX - halfL, groundY);
    ctx.lineTo(posX - halfL, groundY + rearFzLen);
    ctx.stroke();

    // Vehicle Label & Speed Readout above bike
    ctx.fillStyle = colorAccent;
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(name, posX - halfL, groundY - 26);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '9px monospace';
    const speedKmh = (frame.velocity * 3.6).toFixed(1);
    ctx.fillText(`${speedKmh} km/h`, posX - halfL, groundY - 16);
  }
}
