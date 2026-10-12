import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BenchmarkStore } from '../../../state/benchmark.store';

@Component({
  selector: 'app-anatomy-inspector',
  imports: [CommonModule],
  templateUrl: './anatomy-inspector.html',
  styleUrl: './anatomy-inspector.css'
})
export class AnatomyInspector {
  readonly store = inject(BenchmarkStore);
  readonly isMinimized = input<boolean>(false);
  readonly toggleMinimize = output<void>();

  readonly Math = Math;
  readonly previewMode = signal<'auto' | 'idle' | 'ride'>('auto');

  inst = this.store.selectedInstance;

  currentFrame = () => {
    const id = this.store.selectedInstanceId();
    return this.store.scrubFrames()[id];
  };

  activePreviewMode(): 'idle' | 'ride' {
    const mode = this.previewMode();
    if (mode !== 'auto') return mode;
    if (!this.store.isPlaying()) return 'idle';
    const frame = this.currentFrame();
    return frame && frame.velocity > 0.08 ? 'ride' : 'idle';
  }

  getStatusLabel(): string {
    const frame = this.currentFrame();
    if (!frame) return 'Safe stop';
    if (frame.terminalOutcome === 'Front-Wheel Washout') return 'Washout';
    if (frame.terminalOutcome === 'Barrier Collision') return 'Barrier hit';
    if (frame.terminalOutcome === 'Rear-Wheel Lift-off') return 'Rear lift';
    return 'Safe stop';
  }
}
