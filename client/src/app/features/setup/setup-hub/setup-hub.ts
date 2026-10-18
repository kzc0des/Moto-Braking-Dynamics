import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { GarageService } from '../../../core/services/garage.service';

@Component({
  selector: 'app-setup-hub',
  imports: [CommonModule],
  templateUrl: './setup-hub.html',
  styleUrl: './setup-hub.css'
})
export class SetupHub implements OnInit {
  private readonly router = inject(Router);
  private readonly garageService = inject(GarageService);
  private readonly route = inject(ActivatedRoute);

  /** True when opened from the workbench "Intro" button, so a saved vehicle must not redirect away. */
  readonly isRevisit = this.route.snapshot.queryParamMap.has('revisit');

  ngOnInit(): void {
    if (!this.isRevisit && this.garageService.hasVehicles()) {
      this.router.navigate(['/workbench']);
    }
  }

  goToConfigure(): void {
    this.router.navigate(['/configure'], { queryParams: { mode: 'new' } });
  }

  loadBaselineAndProceed(): void {
    this.garageService.loadBaselineScooter();
    this.router.navigate(['/workbench']);
  }
}
