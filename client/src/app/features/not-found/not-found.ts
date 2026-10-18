import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [CommonModule],
  templateUrl: './not-found.html',
  styleUrl: './not-found.css'
})
export class NotFound {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly reason = this.route.snapshot.queryParamMap.get('reason');
  readonly missingId = this.route.snapshot.queryParamMap.get('id');

  get isVehicleNotFound(): boolean {
    return this.reason === 'vehicle' || !!this.missingId;
  }

  goToWorkbench(): void {
    this.router.navigate(['/workbench']);
  }

  goToConfigure(): void {
    this.router.navigate(['/configure'], { queryParams: { mode: 'new' } });
  }

  goToSetup(): void {
    this.router.navigate(['/setup'], { queryParams: { revisit: 1 } });
  }
}
