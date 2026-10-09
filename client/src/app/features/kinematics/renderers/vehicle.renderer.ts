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
    const paddingLeft = 60;
    const paddingRight = 60;
    const trackWidth = width - paddingLeft - paddingRight;

    const meterToPx = (m: number) => paddingLeft + (m / maxDistance) * trackWidth;
    const posX = meterToPx(frame.distance);

    const roadHeight = Math.min(46, laneHeight * 0.32);
    const roadTop = laneY + laneHeight - roadHeight - 12;
    const groundY = roadTop;

    // Responsive scaling based on lane height (Hill Climb Racing prominent vehicle size)
    const scale = Math.min(2.0, Math.max(1.0, laneHeight / 140));

    const bikeLength = 54 * scale;
    const halfL = bikeLength / 2;
    const wheelR = 12 * scale;
    const cogH = 22 * scale;

    // Pitch angle from deceleration (fork dive / chassis pitch)
    const pitchAngle = Math.min(0.14, Math.max(-0.06, (frame.deceleration / 9.81) * 0.09));

    // Dynamic fork compression: distance along fork decreases under deceleration
    const forkCompression = Math.min(8 * scale, (frame.deceleration / 9.81) * 6 * scale);

    // 1. Tire Skid Marks (if severe slip or lockup)
    const isSlippingFront = Math.abs(frame.slipRatioFront) > 0.14;
    const isSlippingRear = Math.abs(frame.slipRatioRear) > 0.14;

    if (isSlippingRear) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(posX - halfL - 24 * scale, groundY - 2, 26 * scale, 3);

      // Skid smoke particles
      ctx.fillStyle = 'rgba(203, 213, 225, 0.35)';
      ctx.beginPath();
      ctx.arc(posX - halfL - 8, groundY - 4, 5 * scale, 0, Math.PI * 2);
      ctx.arc(posX - halfL - 18, groundY - 7, 7 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    if (isSlippingFront) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(posX + halfL - 20 * scale, groundY - 2, 22 * scale, 3);
    }

    // 2. Motorcycle Chassis & Rider Assembly
    ctx.save();
    ctx.translate(posX, groundY);
    ctx.rotate(-pitchAngle);

    // Wheel rotation angle
    const rotAngle = frame.time * frame.omega;

    // Rear Wheel (Tire + Rim + Rotor + Spokes)
    this.renderWheel(ctx, -halfL, -wheelR, wheelR, rotAngle, '#06b6d4', scale);

    // Front Wheel (Tire + Rim + Rotor + Spokes)
    this.renderWheel(ctx, halfL, -wheelR + forkCompression * 0.3, wheelR, rotAngle, '#fbbf24', scale);

    // Rear Swingarm & Shock
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.moveTo(-halfL, -wheelR);
    ctx.lineTo(-halfL + 22 * scale, -cogH * 0.55);
    ctx.stroke();

    // Shock spring
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(-halfL + 12 * scale, -wheelR);
    ctx.lineTo(-halfL + 16 * scale, -cogH * 0.7);
    ctx.stroke();

    // Front Inverted Suspension Fork (telescopic stanchion)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3.5 * scale;
    ctx.beginPath();
    ctx.moveTo(halfL * 0.65, -cogH * 1.05);
    ctx.lineTo(halfL, -wheelR + forkCompression * 0.3);
    ctx.stroke();

    // Frame Main Trellis Spars
    ctx.strokeStyle = colorAccent;
    ctx.lineWidth = 3.5 * scale;
    ctx.beginPath();
    ctx.moveTo(-halfL + 18 * scale, -cogH * 0.55);
    ctx.lineTo(0, -cogH);
    ctx.lineTo(halfL * 0.65, -cogH * 1.05);
    ctx.lineTo(-halfL + 10 * scale, -cogH * 0.55);
    ctx.closePath();
    ctx.stroke();

    // Engine Block
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-8 * scale, -cogH * 0.85, 18 * scale, 13 * scale, 2 * scale);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Exhaust Pipe & Silencer
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.moveTo(6 * scale, -cogH * 0.35);
    ctx.lineTo(-halfL * 0.8, -wheelR * 0.85);
    ctx.stroke();

    // Fuel Tank & Fairing
    ctx.fillStyle = colorAccent;
    ctx.beginPath();
    ctx.moveTo(-halfL * 0.15, -cogH * 1.15);
    ctx.lineTo(halfL * 0.5, -cogH * 1.18);
    ctx.lineTo(halfL * 0.65, -cogH * 1.05);
    ctx.lineTo(0, -cogH * 0.85);
    ctx.closePath();
    ctx.fill();

    // Windscreen
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(halfL * 0.45, -cogH * 1.25);
    ctx.lineTo(halfL * 0.68, -cogH * 1.45);
    ctx.stroke();

    // Rider Torso (tucked aerodynamic posture)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(-halfL * 0.45, -cogH * 0.9);
    ctx.lineTo(-halfL * 0.1, -cogH * 1.5);
    ctx.lineTo(halfL * 0.25, -cogH * 1.35);
    ctx.lineTo(halfL * 0.3, -cogH * 1.0);
    ctx.closePath();
    ctx.fill();

    // Rider Helmet
    ctx.fillStyle = colorAccent;
    ctx.beginPath();
    ctx.arc(0, -cogH * 1.62, 5.5 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Helmet Dark Visor
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(2.5 * scale, -cogH * 1.62, 3.2 * scale, -0.4, 0.8);
    ctx.fill();

    // Center of Gravity Target Crosshair
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(0, -cogH, 3 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-5 * scale, -cogH);
    ctx.lineTo(5 * scale, -cogH);
    ctx.moveTo(0, -cogH - 5 * scale);
    ctx.lineTo(0, -cogH + 5 * scale);
    ctx.stroke();

    ctx.restore();

    // 3. Dynamic Normal Load Vectors (F_z)
    const maxFz = 2500;
    const arrowMaxHeight = 28 * scale;
    const frontFzLen = Math.min(36 * scale, (frame.normalLoadFront / maxFz) * arrowMaxHeight);
    const rearFzLen = Math.min(36 * scale, (frame.normalLoadRear / maxFz) * arrowMaxHeight);

    // Front Normal Load (Electric Volt Amber)
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(posX + halfL, groundY);
    ctx.lineTo(posX + halfL, groundY + frontFzLen);
    ctx.stroke();
    // Arrowhead
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(posX + halfL, groundY + frontFzLen + 4);
    ctx.lineTo(posX + halfL - 3, groundY + frontFzLen);
    ctx.lineTo(posX + halfL + 3, groundY + frontFzLen);
    ctx.closePath();
    ctx.fill();

    // Rear Normal Load (Laser Cyan)
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(posX - halfL, groundY);
    ctx.lineTo(posX - halfL, groundY + rearFzLen);
    ctx.stroke();
    // Arrowhead
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.moveTo(posX - halfL, groundY + rearFzLen + 4);
    ctx.lineTo(posX - halfL - 3, groundY + rearFzLen);
    ctx.lineTo(posX - halfL + 3, groundY + rearFzLen);
    ctx.closePath();
    ctx.fill();

    // 4. Floating Vehicle Telemetry HUD Tag above bike
    const tagY = groundY - cogH * 1.85 - 18 * scale;
    const speedKmh = (frame.velocity * 3.6).toFixed(1);
    const decelG = (frame.deceleration / 9.81).toFixed(2);

    ctx.fillStyle = '#0b0f17';
    ctx.strokeStyle = colorAccent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(posX - 48 * scale, tagY, 96 * scale, 22 * scale, 3 * scale);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = colorAccent;
    ctx.font = `bold ${Math.round(9 * scale)}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(name, posX - 44 * scale, tagY + 10 * scale);

    ctx.fillStyle = '#f8fafc';
    ctx.font = `${Math.round(8 * scale)}px monospace`;
    ctx.fillText(`${speedKmh} km/h | -${decelG}g`, posX - 44 * scale, tagY + 18 * scale);
  }

  private renderWheel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    angle: number,
    accentColor: string,
    scale: number
  ): void {
    ctx.save();
    ctx.translate(x, y);

    // Outer Rubber Tire
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3.5 * scale;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner Alloy Rim
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
    ctx.stroke();

    // Brake Disc Rotor
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.2 * scale;
    ctx.setLineDash([2 * scale, 2 * scale]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.52, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Rotating Wheel Spokes
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.2 * scale;
    for (let i = 0; i < 3; i++) {
      const a = angle + (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(-Math.cos(a) * r * 0.7, -Math.sin(a) * r * 0.7);
      ctx.lineTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7);
      ctx.stroke();
    }

    // Wheel Hub
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(0, 0, 2.5 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
