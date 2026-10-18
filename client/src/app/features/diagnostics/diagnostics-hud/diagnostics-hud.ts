import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DiagnosticsService } from '../diagnostics.service';
import { BenchmarkStore } from '../../../state/benchmark.store';

@Component({
  selector: 'app-diagnostics-hud',
  imports: [CommonModule],
  templateUrl: './diagnostics-hud.html',
  styleUrl: './diagnostics-hud.css'
})
export class DiagnosticsHud {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly diagnostics = inject(DiagnosticsService);
  readonly store = inject(BenchmarkStore);

  toggleHud(): void {
    const next = !this.diagnostics.isHudOpen();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { panel: next ? 'diagnostics' : null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  closeHud(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { panel: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.diagnostics.isHudOpen()) {
      this.closeHud();
    }
  }
}
