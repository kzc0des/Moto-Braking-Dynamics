import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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

  ngOnInit(): void {
    if (this.garageService.hasVehicles()) {
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
