import { Component, ElementRef, viewChild, inject, afterNextRender, signal, computed, OnDestroy, input, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BenchmarkStore } from '../../state/benchmark.store';
import { TrackRenderer } from './renderers/track.renderer';
import { VehicleRenderer } from './renderers/vehicle.renderer';

@Component({
  selector: 'app-kinematics-canvas',
  standalone: true,
  imports: [CommonModule],
  host: {
    class: 'block w-full h-full flex-1 min-h-0 flex flex-col'
  },
  template: `
    <div class="relative w-full h-full flex-1 min-h-0 bg-[#FFFFFF] border border-[#E6DFD3] rounded-xl shadow-xs p-2.5 sm:p-4 flex flex-col gap-2.5 sm:gap-3 select-none">
      <!-- Top Track Viewport Header -->
      <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pb-1 border-b border-[#E6DFD3]/60 shrink-0">
        <!-- Left: Title, Status Badge & Archetype Pills -->
        <div class="flex items-center gap-2.5">
          <span class="font-bold text-[#22201E] text-base">Track viewport</span>

          @if (store.enabledInstances().length === 3) {
            <!-- Archetype Pills when all on track -->
            <div class="flex items-center gap-1.5">
              @for (inst of store.instances(); track inst.id) {
                <button
                  type="button"
                  (click)="store.setSelectedInstanceId(inst.id)"
                  class="px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer"
                  [ngClass]="store.selectedInstanceId() === inst.id ? 'bg-[#FAF7F2] text-[#22201E] border-[#E6DFD3] font-semibold' : 'bg-transparent text-[#6B645C] border-transparent hover:text-[#22201E]'"
                >
                  {{ inst.name.split(' ')[0] }}
                </button>
              }
            </div>
          } @else {
            <!-- "X of 3 on track" Badge -->
            <span class="px-2.5 py-0.5 text-xs bg-[#F3EEE6] text-[#6B645C] rounded-full font-medium">
              {{ store.enabledInstances().length }} of {{ store.instances().length }} on track
            </span>
          }
        </div>

        <!-- Right: Hazard distance, time readout, Play button, Reset button, and + Summon button -->
        <div class="flex items-center gap-1.5 sm:gap-2.5 text-xs flex-wrap">
          <div class="flex items-center gap-1 text-[#6B645C] whitespace-nowrap shrink-0">
            <span>Hazard</span>
            <span class="font-bold text-[#22201E] tabular-nums">{{ store.selectedInstance().simulation.hazardDistance }}m</span>
          </div>

          <div class="flex items-center gap-1 text-[#6B645C] whitespace-nowrap shrink-0">
            <span>t</span>
            <span class="font-bold text-[#22201E] tabular-nums">{{ store.scrubTime().toFixed(2) }}s</span>
            <span class="text-[#A39B90]">/ {{ store.maxRunTime().toFixed(2) }}s</span>
          </div>

          <!-- Play / Pause / Replay Button -->
          <button
            type="button"
            (click)="handlePlay()"
            class="px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1 shadow-2xs whitespace-nowrap shrink-0"
            [ngClass]="
              store.isPlaying()
                ? 'bg-[#22201E] hover:bg-[#000000] text-white'
                : isAtEnd()
                  ? 'bg-[#FDEBE8] text-[#C93A30] border border-[#F2554A] hover:bg-[#F2554A] hover:text-white'
                  : 'bg-[#F2554A] hover:bg-[#C93A30] text-white'
            "
            [title]="store.isPlaying() ? 'Pause playback (Space)' : (isAtEnd() ? 'Replay simulation from start' : 'Play simulation trajectory (Space)')"
          >
            <span>{{ store.isPlaying() ? '❚❚ Pause' : (isAtEnd() ? '↺ Replay' : '► Play') }}</span>
          </button>

          <!-- Reset Button -->
          <button
            type="button"
            (click)="handleReset()"
            class="px-2.5 py-1 bg-white hover:bg-[#FAF7F2] text-[#22201E] rounded-md border border-[#E6DFD3] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Reset to start line"
          >
            Reset
          </button>

          <!-- Summon Trigger Button & Dropdown Popover -->
          <div class="relative">
            <button
              type="button"
              (click)="toggleSummon($event)"
              [disabled]="unsummonedInstances().length === 0"
              class="px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 shadow-2xs"
              [ngClass]="
                unsummonedInstances().length === 0
                  ? 'bg-[#F3EEE6] text-[#A39B90] border border-[#E6DFD3] cursor-not-allowed shadow-none'
                  : 'bg-[#F2554A] hover:bg-[#C93A30] text-white cursor-pointer'
              "
              [title]="unsummonedInstances().length === 0 ? 'All 3 vehicles are on the track' : 'Add another vehicle to the track'"
            >
              <span>+ Summon</span>
            </button>

            <!-- Summon Dropdown Popover matching screenshot -->
            @if (isSummonOpen() && unsummonedInstances().length > 0) {
              <div
                class="absolute right-0 top-full mt-2 w-72 bg-white border border-[#E6DFD3] rounded-xl shadow-xl z-50 p-2 select-none"
                (click)="$event.stopPropagation()"
              >
                <div class="px-3 pt-1.5 pb-2 text-[11px] font-bold text-[#6B645C] tracking-wider uppercase border-b border-[#E6DFD3]/60 mb-1">
                  Add to Track
                </div>

                @for (inst of unsummonedInstances(); track inst.id) {
                  <button
                    type="button"
                    (click)="summonBike(inst.id, $event)"
                    class="w-full px-3 py-2.5 text-left hover:bg-[#FAF7F2] rounded-lg flex flex-col gap-0.5 cursor-pointer transition-colors group border border-transparent hover:border-[#E6DFD3]"
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-xs sm:text-sm font-bold text-[#22201E] group-hover:text-[#F2554A] transition-colors">
                        {{ inst.name }}
                      </span>
                      <span
                        class="w-2.5 h-2.5 rounded-full shrink-0 border border-white shadow-2xs"
                        [style.backgroundColor]="inst.colorAccent"
                      ></span>
                    </div>
                    <span class="text-[11px] sm:text-xs text-[#6B645C] leading-snug">
                      {{ getSubtitleFor(inst.name) }}
                    </span>
                  </button>
                }
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Track Grid: Left Vehicle Column (sticky) + Right Canvas Viewport (Horizontally Scrollable) -->
      <div
        class="w-full flex-1 flex items-stretch border border-[#E6DFD3] rounded-lg overflow-hidden bg-white shadow-xs"
        [style.minHeight.px]="getCanvasContainerHeight()"
      >
        <!-- Vehicle Info Column (Pinned on Left, matching track height) -->
        <div
          class="w-32 sm:w-40 md:w-48 border-r border-[#E6DFD3] bg-[#FAF7F2] shrink-0 flex flex-col self-stretch z-10 shadow-xs"
        >
          <div class="h-[26px] px-2.5 sm:px-3 flex items-center text-[10px] sm:text-[11px] font-bold text-[#A39B90] uppercase tracking-wider border-b border-[#E6DFD3] shrink-0">
            Vehicle
          </div>

          <!-- Dynamic Lane Vehicle Rows distributing available height -->
          <div
            class="flex-1 min-h-0 grid grid-cols-1"
            [style.gridTemplateRows]="'repeat(' + store.enabledInstances().length + ', 1fr)'"
          >
            @for (inst of store.enabledInstances(); track inst.id; let idx = $index) {
              <div
                class="px-2.5 sm:px-3 py-2 flex flex-col justify-center border-b border-[#E6DFD3] last:border-b-0 min-h-0 overflow-hidden"
              >
                <div class="flex items-center gap-1.5">
                  <span
                    class="w-2 h-2 rounded-full shrink-0"
                    [style.backgroundColor]="inst.colorAccent"
                  ></span>
                  <div class="text-[11px] sm:text-xs md:text-sm font-bold text-[#22201E] leading-tight truncate" [title]="inst.name">
                    {{ inst.name }}
                  </div>
                </div>
                <div class="text-[10px] sm:text-xs text-[#6B645C] leading-tight truncate mt-1 pl-3.5">
                  {{ getVehicleSpeedText(inst.id) }}
                </div>
                @if (store.enabledInstances().length > 1) {
                  <button
                    type="button"
                    (click)="removeBike(inst.id)"
                    class="text-[10px] sm:text-xs text-[#C93A30] hover:text-[#F2554A] hover:underline text-left mt-1.5 pl-3.5 cursor-pointer whitespace-nowrap"
                  >
                    Remove
                  </button>
                }
              </div>
            }
          </div>
        </div>

        <!-- Canvas Track Lanes Area (Horizontally Scrollable) -->
        <div
          #trackScrollContainer
          class="flex-1 min-w-0 relative bg-white overflow-x-auto overflow-y-hidden self-stretch"
        >
          <canvas
            #canvas
            (click)="onCanvasClick($event)"
            (mousemove)="onCanvasMouseMove($event)"
            (mousedown)="onCanvasMouseDown($event)"
            (mouseup)="onCanvasMouseUp()"
            class="min-w-[840px] w-full h-full block cursor-crosshair select-none"
          ></canvas>
        </div>
      </div>

      <!-- Empty Lane Slot when fewer than 3 bikes are present -->
      @if (unsummonedInstances().length > 0) {
        <div class="w-full bg-[#FAF7F2] border border-dashed border-[#E6DFD3] rounded-lg py-3 px-4 flex flex-wrap items-center justify-center gap-3 shrink-0">
          <span class="text-xs text-[#6B645C]">
            {{ unsummonedInstances().length === 2 ? 'Only the superbike is on the track.' : 'One more bike can join the track.' }}
          </span>
          <button
            type="button"
            (click)="toggleSummon($event)"
            class="border border-[#F2554A] text-[#F2554A] bg-white hover:bg-[#FDEBE8] text-xs font-semibold px-3 py-1.5 rounded-md transition-colors cursor-pointer shadow-2xs"
          >
            Summon a bike
          </button>
        </div>
      }
    </div>
  `
})
export class KinematicsCanvasComponent implements OnDestroy {
  readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  readonly trackScrollContainerRef = viewChild<ElementRef<HTMLDivElement>>('trackScrollContainer');
  readonly store = inject(BenchmarkStore);
  readonly isTelemetryCollapsed = input<boolean>(false);
  readonly isSummonOpen = signal<boolean>(false);

  readonly unsummonedInstances = computed(() => {
    return this.store.instances().filter(inst => !inst.enabled);
  });

  readonly isAtEnd = computed(() => {
    return this.store.scrubTime() >= this.store.maxRunTime() - 0.05;
  });

  handlePlay(): void {
    if (this.isAtEnd()) {
      this.handleReset();
      this.store.togglePlay();
    } else {
      this.store.togglePlay();
    }
  }

  handleReset(): void {
    this.store.resetPlayback();
    const container = this.trackScrollContainerRef()?.nativeElement;
    if (container) {
      container.scrollLeft = 0;
    }
  }

  @HostListener('window:keydown.space', ['$event'])
  onSpacebar(event: Event): void {
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }
    event.preventDefault();
    this.handlePlay();
  }

  private readonly trackRenderer = new TrackRenderer();
  private readonly vehicleRenderer = new VehicleRenderer();
  private resizeObserver?: ResizeObserver;
  private animFrameId?: number;
  private isDragging = false;

  constructor() {
    afterNextRender(() => {
      this.setupCanvas();
      this.startRenderLoop();
    });
  }

  toggleSummon(event: MouseEvent): void {
    event.stopPropagation();
    if (this.unsummonedInstances().length > 0) {
      this.isSummonOpen.update(open => !open);
    }
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.isSummonOpen()) {
      this.isSummonOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isSummonOpen()) {
      this.isSummonOpen.set(false);
    }
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  getCanvasContainerHeight(): number {
    const count = Math.max(1, this.store.enabledInstances().length);
    // Generous lane height (~160px per lane for 3 bikes) so prominent arcade bikes fit comfortably
    if (count === 1) return 320;
    if (count === 2) return 420;
    return 510;
  }

  getVehicleSpeedText(id: string): string {
    const frame = this.store.scrubFrames()[id];
    if (!frame) return '0.0 km/h · Idle';
    const kmh = (frame.velocity * 3.6).toFixed(1);
    const status = frame.velocity > 0.08 ? 'Braking' : 'Idle';
    return `${kmh} km/h · ${status}`;
  }

  getSubtitleFor(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('scooter')) return 'Blue sport scooter, light and short';
    if (lower.includes('cruiser')) return 'Heavy touring twin, high inertia';
    return 'Green supersport, high power';
  }

  summonBike(id: string, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.store.toggleInstanceEnabled(id);
    this.store.setSelectedInstanceId(id);
    this.isSummonOpen.set(false);
  }

  removeBike(id: string): void {
    this.store.toggleInstanceEnabled(id);
    // If the removed bike was selected, select an enabled one
    if (this.store.selectedInstanceId() === id) {
      const remaining = this.store.enabledInstances();
      if (remaining.length > 0) {
        this.store.setSelectedInstanceId(remaining[0].id);
      }
    }
  }

  private setupCanvas(): void {
    const canvas = this.canvasRef().nativeElement;
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
      this.drawFrame();
    });
    this.resizeObserver.observe(canvas);
    this.resizeCanvas();
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    }
  }

  private startRenderLoop(): void {
    const loop = () => {
      if (this.store.isPlaying()) {
        const dt = 0.016 * this.store.playbackSpeed();
        const nextT = this.store.scrubTime() + dt;
        if (nextT >= this.store.maxRunTime()) {
          this.store.setScrubTime(this.store.maxRunTime());
          this.store.pause();
        } else {
          this.store.setScrubTime(nextT);
        }
      }
      this.drawFrame();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private drawFrame(): void {
    const canvas = this.canvasRef().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    if (width === 0 || height === 0) return;

    const maxDist = this.store.maxStoppingDistance();
    const selectedInst = this.store.selectedInstance();
    const hazardDist = selectedInst.simulation.hazardDistance;
    const enabledInsts = this.store.enabledInstances();
    const frames = this.store.scrubFrames();

    // 1. Render Track Grid & Hazard line
    this.trackRenderer.render({
      ctx,
      width,
      height,
      maxDistance: maxDist,
      hazardDistance: hazardDist,
      numLanes: Math.max(1, enabledInsts.length),
      roadGradeAngle: selectedInst.environment.roadGradeAngle,
      pothole: selectedInst.environment.potholeEnabled ? selectedInst.environment.pothole : undefined
    });

    // 2. Render Vehicles on Lanes
    const topOffset = 26;
    const laneHeight = (height - topOffset) / Math.max(1, enabledInsts.length);
    const isPaused = !this.store.isPlaying();

    enabledInsts.forEach((inst, idx) => {
      const frame = frames[inst.id];
      if (!frame) return;

      const shouldIdle = isPaused || frame.velocity <= 0.08;
      const renderFrame = isPaused
        ? { ...frame, velocity: 0, deceleration: 0 }
        : frame;

      this.vehicleRenderer.render({
        ctx,
        laneY: topOffset + idx * laneHeight,
        laneHeight,
        width,
        maxDistance: maxDist,
        colorAccent: inst.colorAccent,
        name: inst.name,
        spriteKey: inst.spriteKey,
        forceIdle: shouldIdle,
        animTime: performance.now() / 1000,
        frame: renderFrame
      });
    });

    // 3. Auto-scroll container following motorcycle movement
    this.updateScrollFollow();
  }

  private lastFollowedTime = -1;

  private updateScrollFollow(): void {
    const container = this.trackScrollContainerRef()?.nativeElement;
    if (!container) return;

    const maxScroll = container.scrollWidth - container.clientWidth;
    if (maxScroll <= 0) return;

    const scrubTime = this.store.scrubTime();
    const isPlaying = this.store.isPlaying();

    // If user is paused and time hasn't changed, allow free manual inspection
    if (!isPlaying && !this.isDragging && Math.abs(scrubTime - this.lastFollowedTime) < 0.001) {
      return;
    }
    this.lastFollowedTime = scrubTime;

    if (scrubTime <= 0.02) {
      container.scrollLeft = 0;
      return;
    }

    const frames = this.store.scrubFrames();
    const selectedInst = this.store.selectedInstance();
    // Track selected bike or the foremost moving bike
    const frame = frames[selectedInst?.id] ?? Object.values(frames)[0];
    if (!frame) return;

    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    const cssWidth = rect.width > 0 ? rect.width : 840;
    const paddingLeft = 70;
    const paddingRight = 50;
    const trackWidth = Math.max(120, cssWidth - paddingLeft - paddingRight);
    const maxDist = this.store.maxStoppingDistance();
    const posX = paddingLeft + (frame.distance / maxDist) * trackWidth;

    // Keep active bike at ~30% from the left edge of the visible scroll window
    const targetScroll = Math.max(0, Math.min(maxScroll, posX - container.clientWidth * 0.3));
    container.scrollLeft = targetScroll;
  }

  onCanvasMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.seekFromEvent(event);
  }

  onCanvasMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      this.seekFromEvent(event);
    }
  }

  onCanvasMouseUp(): void {
    this.isDragging = false;
  }

  onCanvasClick(event: MouseEvent): void {
    this.seekFromEvent(event);
  }

  private seekFromEvent(event: MouseEvent): void {
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const paddingLeft = 70;
    const paddingRight = 50;
    const trackWidth = Math.max(120, rect.width - paddingLeft - paddingRight);

    if (clickX >= paddingLeft && clickX <= rect.width - paddingRight) {
      const frac = Math.max(0, Math.min(1, (clickX - paddingLeft) / trackWidth));
      const targetDist = frac * this.store.maxStoppingDistance();
      const res = this.store.activeResults().find(r => r.instanceId === this.store.selectedInstanceId());
      if (res && res.telemetry) {
        const dists = res.telemetry.distance;
        const times = res.telemetry.time;
        for (let i = 0; i < dists.length; i++) {
          if (dists[i] >= targetDist) {
            this.store.setScrubTime(times[i]);
            return;
          }
        }
        if (times.length > 0) {
          this.store.setScrubTime(times[times.length - 1]);
        }
      }
    }
  }
}
