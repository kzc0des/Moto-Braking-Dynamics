import { InterpolatedScrubFrame } from '../../../core/models/telemetry.types';
import { VehicleSpriteKey } from '../../../core/models/benchmark.types';

export interface VehicleRenderParams {
  ctx: CanvasRenderingContext2D;
  laneY: number;
  laneHeight: number;
  width: number;
  maxDistance: number;
  colorAccent: string;
  name: string;
  spriteKey?: VehicleSpriteKey;
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
  idleFps: number;
  rideFps: number;
  wheelRear: [number, number];
  wheelFront: [number, number];
  groundYOffset: number;
  scaleMultiplier: number;
}

export class VehicleRenderer {
  private readonly spriteConfigs: Record<Exclude<VehicleSpriteKey, 'ninja'>, SpriteConfig> = {
    scooter: {
      sheetPath: 'sprites/scooter_sheet.png',
      frameWidth: 112,
      frameHeight: 56,
      idleFrames: 6,
      rideFrames: 8,
      idleFps: 6,
      rideFps: 14,
      wheelRear: [16, 45],
      wheelFront: [66, 45],
      groundYOffset: 52,
      scaleMultiplier: 1.15
    },
    maxi: {
      sheetPath: 'sprites/maxi_sheet.png',
      frameWidth: 112,
      frameHeight: 56,
      idleFrames: 6,
      rideFrames: 8,
      idleFps: 6,
      rideFps: 14,
      wheelRear: [18, 43],
      wheelFront: [76, 43],
      groundYOffset: 52,
      scaleMultiplier: 1.15
    },
    underbone: {
      sheetPath: 'sprites/underbone_sheet.png',
      frameWidth: 112,
      frameHeight: 56,
      idleFrames: 6,
      rideFrames: 8,
      idleFps: 6,
      rideFps: 14,
      wheelRear: [17, 44],
      wheelFront: [68, 44],
      groundYOffset: 52,
      scaleMultiplier: 1.15
    },
    naked: {
      sheetPath: 'sprites/naked_sheet.png',
      frameWidth: 112,
      frameHeight: 56,
      idleFrames: 6,
      rideFrames: 8,
      idleFps: 6,
      rideFps: 14,
      wheelRear: [16, 43],
      wheelFront: [72, 43],
      groundYOffset: 52,
      scaleMultiplier: 1.15
    },
    supersport: {
      sheetPath: 'sprites/supersport_sheet.png',
      frameWidth: 112,
      frameHeight: 56,
      idleFrames: 6,
      rideFrames: 8,
      idleFps: 6,
      rideFps: 14,
      wheelRear: [15, 43],
      wheelFront: [74, 43],
      groundYOffset: 52,
      scaleMultiplier: 1.15
    },
    adventure: {
      sheetPath: 'sprites/adventure_sheet.png',
      frameWidth: 112,
      frameHeight: 56,
      idleFrames: 6,
      rideFrames: 8,
      idleFps: 6,
      rideFps: 14,
      wheelRear: [15, 43],
      wheelFront: [74, 42],
      groundYOffset: 52,
      scaleMultiplier: 1.15
    },
    cruiser: {
      sheetPath: 'sprites/cruiser_sheet.png',
      frameWidth: 112,
      frameHeight: 56,
      idleFrames: 6,
      rideFrames: 8,
      idleFps: 6,
      rideFps: 14,
      wheelRear: [14, 43],
      wheelFront: [84, 43],
      groundYOffset: 52,
      scaleMultiplier: 1.15
    }
  };

  private readonly loadedImages = new Map<string, HTMLImageElement>();

  constructor() {
    this.preloadSpriteSheets();
  }

  private preloadSpriteSheets(): void {
    if (typeof window === 'undefined') return;

    const keys = Object.keys(this.spriteConfigs) as Array<keyof typeof this.spriteConfigs>;
    for (const key of keys) {
      const cfg = this.spriteConfigs[key];
      const img = new Image();
      img.src = cfg.sheetPath;
      this.loadedImages.set(key, img);
    }
  }

  render(params: VehicleRenderParams): void {
    const { ctx, laneY, laneHeight, width, maxDistance, colorAccent, name, spriteKey, frame } = params;
    const paddingLeft = 70;
    const paddingRight = 50;
    const trackWidth = Math.max(120, width - paddingLeft - paddingRight);

    const meterToPx = (m: number) => paddingLeft + (m / maxDistance) * trackWidth;
    const posX = meterToPx(frame.distance);

    // Resolve sprite archetype
    const resolvedKey = this.resolveSpriteKey(spriteKey, name);
    const cfg = this.spriteConfigs[resolvedKey];

    // Responsive scaling based on lane height
    const baseScale = Math.min(1.9, Math.max(1.05, laneHeight / 64));
    const scale = baseScale * cfg.scaleMultiplier;

    const drawW = cfg.frameWidth * scale;
    const drawH = cfg.frameHeight * scale;
    const anchorX = cfg.wheelRear[0] * scale;
    const anchorY = cfg.groundYOffset * scale;

    const groundY = laneY + Math.min(laneHeight - 10, Math.max(drawH * 0.9, laneHeight * 0.78));

    // Road surface band under the wheels (fills the lower part of the lane)
    ctx.fillStyle = '#1C2027';
    ctx.fillRect(0, groundY + 1, width, Math.max(0, laneY + laneHeight - groundY - 1));
    ctx.strokeStyle = '#3A414B';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, groundY + 1);
    ctx.lineTo(width, groundY + 1);
    ctx.stroke();

    // Deceleration pitch angle (fork dive transient) - zeroed when idling at rest
    const pitchAngle = params.forceIdle ? 0 : Math.min(0.12, Math.max(-0.04, (frame.deceleration / 9.81) * 0.08));

    // Wheel positions
    const rearWheelX = posX;
    const frontWheelX = posX + (cfg.wheelFront[0] - cfg.wheelRear[0]) * scale;

    // Soft ground tire contact shadows under both wheels
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(rearWheelX, groundY + 1, 14 * scale, 3 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(frontWheelX, groundY + 1, 14 * scale, 3 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tire Skid Marks (if severe slip or lockup)
    const isSlippingFront = Math.abs(frame.slipRatioFront) > 0.14;
    const isSlippingRear = Math.abs(frame.slipRatioRear) > 0.14;

    if (isSlippingRear) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(rearWheelX - 18 * scale, groundY - 1, 22 * scale, 2.5);
    }

    if (isSlippingFront) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(frontWheelX - 16 * scale, groundY - 1, 20 * scale, 2.5);
    }

    // Animated Sprite Sheet Rendering
    const img = this.loadedImages.get(resolvedKey);
    const isImgReady = img && img.complete && img.naturalWidth > 0;

    const isMoving = !params.forceIdle && frame.velocity > 0.08;
    const fps = isMoving ? cfg.rideFps : cfg.idleFps;
    const frameCount = isMoving ? cfg.rideFrames : cfg.idleFrames;
    const animClock = isMoving ? frame.time : (params.animTime ?? (typeof performance !== 'undefined' ? performance.now() / 1000 : frame.time));
    const frameIdx = Math.floor(animClock * fps) % frameCount;

    const sx = frameIdx * cfg.frameWidth;
    const sy = isMoving ? cfg.frameHeight : 0; // Row 1 = Ride, Row 0 = Idle

    ctx.save();
    // Pivot around front wheel contact patch on hard deceleration fork dive
    ctx.translate(frontWheelX, groundY);
    ctx.rotate(-pitchAngle);
    ctx.translate(-frontWheelX, -groundY);

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
        posX - anchorX,
        groundY - anchorY,
        drawW,
        drawH
      );
    } else {
      ctx.fillStyle = colorAccent;
      ctx.fillRect(posX - anchorX + 10 * scale, groundY - drawH * 0.8, drawW * 0.8, drawH * 0.7);
    }

    ctx.restore();
  }

  private resolveSpriteKey(spriteKey?: VehicleSpriteKey, name?: string): Exclude<VehicleSpriteKey, 'ninja'> {
    if (spriteKey) {
      if (spriteKey === 'ninja') return 'supersport';
      if (this.spriteConfigs[spriteKey]) return spriteKey;
    }
    if (!name) return 'supersport';
    const lower = name.toLowerCase();
    if (lower.includes('maxi')) return 'maxi';
    if (lower.includes('underbone')) return 'underbone';
    if (lower.includes('scooter')) return 'scooter';
    if (lower.includes('naked') || lower.includes('standard')) return 'naked';
    if (lower.includes('adventure') || lower.includes('trail')) return 'adventure';
    if (lower.includes('cruiser') || lower.includes('touring')) return 'cruiser';
    if (lower.includes('supersport') || lower.includes('superbike') || lower.includes('sport')) return 'supersport';
    return 'supersport';
  }
}
