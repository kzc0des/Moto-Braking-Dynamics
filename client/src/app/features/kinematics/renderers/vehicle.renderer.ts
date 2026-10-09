import { InterpolatedScrubFrame } from '../../../core/models/telemetry.types';

export interface VehicleRenderParams {
  ctx: CanvasRenderingContext2D;
  laneY: number;
  laneHeight: number;
  width: number;
  maxDistance: number;
  colorAccent: string;
  name: string;
  spriteKey?: 'ninja' | 'cruiser' | 'scooter';
  forceIdle?: boolean;
  animTime?: number;
  frame: InterpolatedScrubFrame;
}

interface SpriteConfig {
  sheetPath: string;
  frameWidth: number;
  frameHeight: number;
  idleFrames: number;
  rideFrames: number;
  anchorXRatio: number;
  scaleMultiplier: number;
}

export class VehicleRenderer {
  private readonly spriteConfigs: Record<'ninja' | 'cruiser' | 'scooter', SpriteConfig> = {
    ninja: {
      sheetPath: 'sprites/ninja_sheet.png',
      frameWidth: 96,
      frameHeight: 48,
      idleFrames: 6,
      rideFrames: 8,
      anchorXRatio: 44 / 96,
      scaleMultiplier: 1.0
    },
    cruiser: {
      sheetPath: 'sprites/cruiser_sheet.png',
      frameWidth: 96,
      frameHeight: 48,
      idleFrames: 6,
      rideFrames: 8,
      anchorXRatio: 44 / 96,
      scaleMultiplier: 1.0
    },
    scooter: {
      sheetPath: 'sprites/scooter_sheet.png',
      frameWidth: 80,
      frameHeight: 40,
      idleFrames: 6,
      rideFrames: 8,
      anchorXRatio: 36 / 80,
      scaleMultiplier: 1.15
    }
  };

  private readonly loadedImages = new Map<string, HTMLImageElement>();

  constructor() {
    this.preloadSpriteSheets();
  }

  private preloadSpriteSheets(): void {
    if (typeof window === 'undefined') return;

    for (const key of ['ninja', 'cruiser', 'scooter'] as const) {
      const cfg = this.spriteConfigs[key];
      const img = new Image();
      img.src = cfg.sheetPath;
      this.loadedImages.set(key, img);
    }
  }

  render(params: VehicleRenderParams): void {
    const { ctx, laneY, laneHeight, width, maxDistance, colorAccent, name, spriteKey, frame } = params;
    const paddingLeft = 90;
    const paddingRight = 60;
    const trackWidth = width - paddingLeft - paddingRight;

    const meterToPx = (m: number) => paddingLeft + (m / maxDistance) * trackWidth;
    const posX = meterToPx(frame.distance);

    const roadHeight = 44;
    const roadTop = laneY + (laneHeight > 260 ? Math.floor(laneHeight * 0.65) : laneHeight - roadHeight - 12);
    const groundY = roadTop;

    // Resolve sprite archetype
    const resolvedKey = this.resolveSpriteKey(spriteKey, name);
    const cfg = this.spriteConfigs[resolvedKey];

    // Responsive scaling based on lane height (prominent vehicle size)
    const baseScale = Math.min(2.1, Math.max(1.1, laneHeight / 135));
    const scale = baseScale * cfg.scaleMultiplier;

    const drawW = cfg.frameWidth * scale;
    const drawH = cfg.frameHeight * scale;
    const anchorX = cfg.frameWidth * cfg.anchorXRatio * scale;

    // Deceleration pitch angle (fork dive)
    const pitchAngle = Math.min(0.12, Math.max(-0.04, (frame.deceleration / 9.81) * 0.08));

    // Wheel positions relative to posX
    const rearWheelX = posX - anchorX + 16 * scale;
    const frontWheelX = posX - anchorX + (cfg.frameWidth - 14) * scale;

    // 1. Tire Skid Marks (if severe slip or lockup)
    const isSlippingFront = Math.abs(frame.slipRatioFront) > 0.14;
    const isSlippingRear = Math.abs(frame.slipRatioRear) > 0.14;

    if (isSlippingRear) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(rearWheelX - 20 * scale, groundY - 2, 24 * scale, 3);

      // Skid smoke particles
      ctx.fillStyle = 'rgba(203, 213, 225, 0.40)';
      ctx.beginPath();
      ctx.arc(rearWheelX - 8, groundY - 4, 5 * scale, 0, Math.PI * 2);
      ctx.arc(rearWheelX - 18, groundY - 7, 7 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    if (isSlippingFront) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(frontWheelX - 16 * scale, groundY - 2, 20 * scale, 3);
    }

    // 2. Animated Sprite Sheet Rendering
    const img = this.loadedImages.get(resolvedKey);
    const isImgReady = img && img.complete && img.naturalWidth > 0;

    const isMoving = !params.forceIdle && frame.velocity > 0.08;
    const fps = isMoving ? 13.0 : 6.25;
    const frameCount = isMoving ? cfg.rideFrames : cfg.idleFrames;
    const animClock = isMoving ? frame.time : (params.animTime ?? (typeof performance !== 'undefined' ? performance.now() / 1000 : frame.time));
    const frameIdx = Math.floor(animClock * fps) % frameCount;

    const sx = frameIdx * cfg.frameWidth;
    const sy = isMoving ? cfg.frameHeight : 0; // Row 1 = Ride, Row 0 = Idle

    ctx.save();
    ctx.translate(posX, groundY);
    ctx.rotate(-pitchAngle);

    if (isImgReady) {
      // Ensure pixel-perfect sharp sprite scaling without blur
      ctx.imageSmoothingEnabled = false;
      const anyCtx = ctx as unknown as { mozImageSmoothingEnabled?: boolean; webkitImageSmoothingEnabled?: boolean };
      if (anyCtx.mozImageSmoothingEnabled !== undefined) anyCtx.mozImageSmoothingEnabled = false;
      if (anyCtx.webkitImageSmoothingEnabled !== undefined) anyCtx.webkitImageSmoothingEnabled = false;

      ctx.drawImage(
        img,
        sx,
        sy,
        cfg.frameWidth,
        cfg.frameHeight,
        -anchorX,
        -drawH,
        drawW,
        drawH
      );
    } else {
      // Graceful fallback while asset loads
      ctx.fillStyle = colorAccent;
      ctx.fillRect(-anchorX, -drawH * 0.8, drawW * 0.9, drawH * 0.7);
    }

    // Center of Gravity (CoG) Target Crosshair
    const cogY = -drawH * 0.45;
    ctx.fillStyle = colorAccent;
    ctx.beginPath();
    ctx.arc(0, cogY, 3 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-5 * scale, cogY);
    ctx.lineTo(5 * scale, cogY);
    ctx.moveTo(0, cogY - 5 * scale);
    ctx.lineTo(0, cogY + 5 * scale);
    ctx.stroke();

    ctx.restore();

    // 3. Dynamic Normal Load Vectors (F_z)
    const maxFz = 2500;
    const arrowMaxHeight = 26 * scale;
    const frontFzLen = Math.min(36 * scale, (frame.normalLoadFront / maxFz) * arrowMaxHeight);
    const rearFzLen = Math.min(36 * scale, (frame.normalLoadRear / maxFz) * arrowMaxHeight);

    // Front Normal Load (Gold)
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(frontWheelX, groundY);
    ctx.lineTo(frontWheelX, groundY + frontFzLen);
    ctx.stroke();
    // Arrowhead
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(frontWheelX, groundY + frontFzLen + 4);
    ctx.lineTo(frontWheelX - 3, groundY + frontFzLen);
    ctx.lineTo(frontWheelX + 3, groundY + frontFzLen);
    ctx.closePath();
    ctx.fill();

    // Rear Normal Load (Cyan)
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(rearWheelX, groundY);
    ctx.lineTo(rearWheelX, groundY + rearFzLen);
    ctx.stroke();
    // Arrowhead
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.moveTo(rearWheelX, groundY + rearFzLen + 4);
    ctx.lineTo(rearWheelX - 3, groundY + rearFzLen);
    ctx.lineTo(rearWheelX + 3, groundY + rearFzLen);
    ctx.closePath();
    ctx.fill();

    // 4. Floating Vehicle Telemetry HUD Tag above bike
    const speedKmh = (frame.velocity * 3.6).toFixed(1);
    const decelG = (frame.deceleration / 9.81).toFixed(2);
    const titleText = name;
    const subText = isMoving ? `${speedKmh} km/h | -${decelG}g` : '0.0 km/h | IDLE STANCE';

    ctx.font = `bold ${Math.round(9 * scale)}px monospace`;
    const titleWidth = ctx.measureText(titleText).width;

    ctx.font = `${Math.round(8 * scale)}px monospace`;
    const subWidth = ctx.measureText(subText).width;

    const padX = 8 * scale;
    const padY = 4 * scale;
    const tagW = Math.max(titleWidth, subWidth) + padX * 2;
    const tagH = 22 * scale + padY;
    const padEdge = 12;
    const tagX = Math.max(padEdge, Math.min(width - tagW - padEdge, posX - tagW / 2));
    const tagY = groundY - drawH - 26 * scale;

    ctx.fillStyle = 'rgba(11, 15, 23, 0.94)';
    ctx.strokeStyle = colorAccent;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(tagX, tagY, tagW, tagH, 4 * scale);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = colorAccent;
    ctx.font = `bold ${Math.round(9 * scale)}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(titleText, tagX + padX, tagY + padY);

    ctx.fillStyle = '#f8fafc';
    ctx.font = `${Math.round(8 * scale)}px monospace`;
    ctx.fillText(subText, tagX + padX, tagY + padY + 10 * scale);
    ctx.textBaseline = 'alphabetic';
  }

  private resolveSpriteKey(spriteKey?: 'ninja' | 'cruiser' | 'scooter', name?: string): 'ninja' | 'cruiser' | 'scooter' {
    if (spriteKey) return spriteKey;
    if (!name) return 'ninja';
    const lower = name.toLowerCase();
    if (lower.includes('scooter')) return 'scooter';
    if (lower.includes('cruiser')) return 'cruiser';
    return 'ninja';
  }
}
