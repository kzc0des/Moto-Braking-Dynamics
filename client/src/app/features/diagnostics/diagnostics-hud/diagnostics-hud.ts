import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DiagnosticsService } from '../diagnostics.service';
import { BenchmarkStore } from '../../../state/benchmark.store';

@Component({
  selector: 'app-diagnostics-hud',
  imports: [CommonModule],
  templateUrl: './diagnostics-hud.html',
  styleUrl: './diagnostics-hud.css'
})
export class DiagnosticsHud {
  readonly diagnostics = inject(DiagnosticsService);
  readonly store = inject(BenchmarkStore);

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.diagnostics.isHudOpen()) {
      this.diagnostics.isHudOpen.set(false);
    }
  }
}
