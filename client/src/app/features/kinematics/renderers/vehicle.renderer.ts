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
      scaleMultiplier: 1.05
    },
    cruiser: {
      sheetPath: 'sprites/cruiser_sheet.png',
      frameWidth: 96,
      frameHeight: 48,
      idleFrames: 6,
      rideFrames: 8,
      anchorXRatio: 44 / 96,
      scaleMultiplier: 1.05
    },
    scooter: {
      sheetPath: 'sprites/scooter_sheet.png',
      frameWidth: 80,
      frameHeight: 40,
      idleFrames: 6,
      rideFrames: 8,
      anchorXRatio: 36 / 80,
      scaleMultiplier: 1.2
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
    const paddingRight = 40;
    const trackWidth = width - paddingLeft - paddingRight;

    const meterToPx = (m: number) => paddingLeft + (m / maxDistance) * trackWidth;
    const posX = meterToPx(frame.distance);

    const groundY = laneY + Math.min(laneHeight - 16, Math.max(50, laneHeight * 0.72));

    // Resolve sprite archetype
    const resolvedKey = this.resolveSpriteKey(spriteKey, name);
    const cfg = this.spriteConfigs[resolvedKey];

    // Responsive scaling based on lane height
    const baseScale = Math.min(1.7, Math.max(1.0, laneHeight / 110));
    const scale = baseScale * cfg.scaleMultiplier;

    const drawW = cfg.frameWidth * scale;
    const drawH = cfg.frameHeight * scale;
    const anchorX = cfg.frameWidth * cfg.anchorXRatio * scale;

    // Deceleration pitch angle (fork dive)
    const pitchAngle = Math.min(0.12, Math.max(-0.04, (frame.deceleration / 9.81) * 0.08));

    // Wheel positions relative to posX
    const rearWheelX = posX - anchorX + 16 * scale;
    const frontWheelX = posX - anchorX + (cfg.frameWidth - 14) * scale;

    // Ground tire contact shadow (soft oval ground shadow)
    const shadowW = drawW * 0.72;
    const shadowH = 5 * scale;
    ctx.fillStyle = 'rgba(34, 32, 30, 0.14)';
    ctx.beginPath();
    ctx.ellipse(posX - anchorX + drawW * 0.48, groundY + 1, shadowW * 0.48, shadowH * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tire Skid Marks (if severe slip or lockup)
    const isSlippingFront = Math.abs(frame.slipRatioFront) > 0.14;
    const isSlippingRear = Math.abs(frame.slipRatioRear) > 0.14;

    if (isSlippingRear) {
      ctx.fillStyle = 'rgba(46, 44, 51, 0.4)';
      ctx.fillRect(rearWheelX - 20 * scale, groundY - 1, 24 * scale, 2);
    }

    if (isSlippingFront) {
      ctx.fillStyle = 'rgba(46, 44, 51, 0.4)';
      ctx.fillRect(frontWheelX - 16 * scale, groundY - 1, 20 * scale, 2);
    }

    // Animated Sprite Sheet Rendering
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
      ctx.fillStyle = colorAccent;
      ctx.fillRect(-anchorX, -drawH * 0.8, drawW * 0.9, drawH * 0.7);
    }

    ctx.restore();
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
