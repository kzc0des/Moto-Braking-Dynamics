import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BenchmarkStore } from '../state/benchmark.store';
import { ThemeService } from '../core/services/theme.service';
import { KinematicsCanvasComponent } from '../features/kinematics/kinematics-canvas.component';
import { AnatomyInspectorComponent } from '../features/anatomy/anatomy-inspector.component';
import { TelemetryPanelComponent } from '../features/telemetry/telemetry-panel.component';
import { ParameterCockpitComponent } from '../features/parameters/parameter-cockpit.component';
import { TrajectoryScrubberComponent } from '../features/telemetry/trajectory-scrubber.component';

@Component({
  selector: 'app-workbench',
  standalone: true,
  imports: [
    CommonModule,
    KinematicsCanvasComponent,
    AnatomyInspectorComponent,
    TrajectoryScrubberComponent,
    TelemetryPanelComponent,
    ParameterCockpitComponent
  ],
  template: `
    <div class="bg-[#FAF7F2] text-[#22201E] flex flex-col font-sans select-none overflow-hidden h-[100dvh] max-h-[100dvh]">
      <!-- Top Application Header -->
      <header class="flex items-center justify-between px-6 py-3 bg-[#FFFFFF] border-b border-[#E6DFD3] shrink-0">
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2.5">
            <span class="w-5 h-5 bg-[#F2554A] rounded-md shrink-0"></span>
            <div>
              <div class="text-sm sm:text-base font-bold tracking-tight text-[#22201E]">Moto-Braking Dynamics</div>
              <div class="text-xs text-[#6B645C]">Computational benchmark workbench</div>
            </div>
          </div>
        </div>

        <!-- Right: Team Members Drawer Trigger Button -->
        <button
          type="button"
          (click)="toggleMembersDrawer()"
          class="px-3.5 py-1.5 bg-[#FFFFFF] border border-[#E6DFD3] hover:border-[#F2554A] hover:bg-[#FDEBE8] text-[#22201E] rounded-lg transition-colors text-xs font-semibold flex items-center gap-2 shadow-2xs cursor-pointer group"
          title="View Project Team Members (Esc to close)"
        >
          <svg class="w-4 h-4 text-[#F2554A] shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 16v-1a5 5 0 00-2.316-4.175A3.992 3.992 0 0115 11a4 4 0 014 4v1h-3zM4.316 10.825A5 5 0 002 15v1h3v-1a4 4 0 011-2.9 3.992 3.992 0 01-1.684-1.275z" />
          </svg>
          <span>Team Members</span>
        </button>
      </header>

      <!-- Main Workbench Layout -->
      <main
        class="flex-1 min-h-0 p-3 sm:p-4 flex flex-col gap-3.5 max-w-[1840px] w-full mx-auto transition-all duration-300 ease-in-out"
        [style.paddingBottom]="isBottomDrawerOpen() ? 'min(55vh, 420px)' : '2.5rem'"
      >
        <!-- 2D Kinematics Track Viewport & Centered Anatomy Inspector -->
        <div class="flex flex-col lg:flex-row gap-3.5 items-center w-full flex-1 min-h-0">
          <!-- 2D Kinematics Track Viewport (occupies space) -->
          <div class="flex-1 min-w-0 transition-all duration-300 flex flex-col min-h-0 h-full self-stretch">
            <app-kinematics-canvas class="flex-1 min-h-0 flex flex-col h-full" />
          </div>

          <!-- Interactive Anatomy Inspector (vertically centered) -->
          <div
            class="transition-all duration-300 shrink-0 self-center"
            [ngClass]="isAnatomyMinimized() ? 'w-full lg:w-12' : 'w-full lg:w-[380px]'"
          >
            <app-anatomy-inspector
              [isMinimized]="isAnatomyMinimized()"
              (toggleMinimize)="isAnatomyMinimized.set(!isAnatomyMinimized())"
            />
          </div>
        </div>
      </main>

      <!-- Bottom Slide-up Drawer for Trajectory Scrubber & Telemetry -->
      <div
        class="fixed bottom-0 inset-x-0 z-40 h-[min(55vh,420px)] flex flex-col bg-[#FAF7F2] border-t border-[#E6DFD3] shadow-2xl transition-transform duration-300 ease-in-out select-none"
        [class.translate-y-0]="isBottomDrawerOpen()"
        [class.translate-y-full]="!isBottomDrawerOpen()"
      >
        <!-- Docked Bottom Edge Drawer Trigger Handle Tab -->
        <button
          type="button"
          (click)="toggleBottomDrawer()"
          class="absolute -top-9 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-[#FFFFFF] border border-b-0 border-[#E6DFD3] hover:border-[#F2554A] text-[#22201E] hover:text-[#F2554A] rounded-t-lg shadow-md flex items-center gap-2 text-xs font-bold transition-all cursor-pointer"
          [title]="isBottomDrawerOpen() ? 'Hide Scrubber & Telemetry (Esc)' : 'Open Scrubber & Telemetry'"
        >
          <span class="text-[#F2554A] text-[10px]">{{ isBottomDrawerOpen() ? '▼' : '▲' }}</span>
          <span class="tracking-wider uppercase text-[10px]">{{ isBottomDrawerOpen() ? 'HIDE CONTROLS & TELEMETRY' : 'SCRUBBER & TELEMETRY' }}</span>
        </button>

        <!-- Drawer Header -->
        <div class="flex items-center justify-between px-5 py-2.5 bg-[#FFFFFF] border-b border-[#E6DFD3] shrink-0">
          <div class="flex items-center gap-2.5">
            <span class="w-3.5 h-3.5 bg-[#F2554A] rounded-xs shrink-0"></span>
            <div>
              <div class="text-xs sm:text-sm font-bold text-[#22201E]">Trajectory Scrubber & Telemetry</div>
              <div class="text-[11px] text-[#6B645C]">Real-time kinematic timeline playback & multi-channel telemetry</div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="isBottomDrawerOpen.set(false)"
              class="px-2.5 py-1 bg-[#FFFFFF] border border-[#E6DFD3] hover:border-[#F2554A] hover:bg-[#FDEBE8] text-[#22201E] rounded-lg text-xs font-bold transition-colors cursor-pointer"
              title="Close drawer"
            >
              ✕ ESC
            </button>
          </div>
        </div>

        <!-- Drawer Scrollable Body -->
        <div class="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col gap-3 min-h-0">
          <!-- Trajectory Scrubber Component -->
          <app-trajectory-scrubber />

          <!-- Telemetry Panel Component -->
          <app-telemetry-panel />
        </div>
      </div>

      <!-- Configuration Slide-over Drawer -->
      @if (isConfigDrawerOpen()) {
        <!-- Backdrop Overlay -->
        <div
          (click)="isConfigDrawerOpen.set(false)"
          class="fixed inset-0 bg-black/30 z-40 backdrop-blur-2xs transition-opacity"
        ></div>
      }

      <div
        class="fixed inset-y-0 right-0 z-50 w-full sm:w-[640px] lg:w-[780px] bg-[#FAF7F2] border-l border-[#E6DFD3] shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out select-none"
        [class.translate-x-0]="isConfigDrawerOpen()"
        [class.translate-x-full]="!isConfigDrawerOpen()"
      >
        <!-- Drawer Header -->
        <div class="flex items-center justify-between px-5 py-3.5 bg-[#FFFFFF] border-b border-[#E6DFD3]">
          <div class="flex items-center gap-2.5">
            <span class="w-4 h-4 bg-[#F2554A] rounded-xs"></span>
            <div>
              <div class="text-base font-bold text-[#22201E]">System Configuration Cockpit</div>
              <div class="text-xs text-[#6B645C]">Vehicle, Roadway & Actuation Parameter Control</div>
            </div>
          </div>
          <button
            type="button"
            (click)="isConfigDrawerOpen.set(false)"
            class="px-3 py-1 bg-[#FFFFFF] border border-[#E6DFD3] hover:border-[#F2554A] hover:bg-[#FDEBE8] text-[#22201E] rounded-lg text-xs font-bold transition-colors"
          >
            ✕ ESC
          </button>
        </div>

        <!-- Drawer Scrollable Body -->
        <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          <app-parameter-cockpit />
        </div>

        <!-- Drawer Footer -->
        <div class="px-5 py-3 bg-[#FFFFFF] border-t border-[#E6DFD3] flex items-center justify-between text-xs">
          <div class="flex items-center gap-2 text-[#6B645C]">
            <span
              class="w-2 h-2 rounded-full"
              [ngClass]="store.isLoading() ? 'bg-[#E0A030] animate-ping' : 'bg-[#2F9E6B]'"
            ></span>
            <span>{{ store.isLoading() ? 'Solver Computing...' : 'Real-time Synchronized' }}</span>
          </div>
          <button
            type="button"
            (click)="isConfigDrawerOpen.set(false)"
            class="px-5 py-1.5 bg-[#F2554A] hover:bg-[#C93A30] text-white rounded-lg font-bold transition-colors text-xs shadow-2xs"
          >
            Done
          </button>
        </div>
      </div>

      <!-- Team Members Slide-over Drawer (From Left) -->
      @if (isMembersDrawerOpen()) {
        <!-- Backdrop Overlay -->
        <div
          (click)="isMembersDrawerOpen.set(false)"
          class="fixed inset-0 bg-black/30 z-50 backdrop-blur-2xs transition-opacity"
        ></div>
      }

      <div
        class="fixed inset-y-0 left-0 z-50 w-full sm:w-[460px] bg-[#FAF7F2] border-r border-[#E6DFD3] shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out select-none"
        [class.translate-x-0]="isMembersDrawerOpen()"
        [class.-translate-x-full]="!isMembersDrawerOpen()"
      >
        <!-- Drawer Header -->
        <div class="flex items-center justify-between px-5 py-3.5 bg-[#FFFFFF] border-b border-[#E6DFD3]">
          <div class="flex items-center gap-2.5">
            <span class="w-6 h-6 rounded-md bg-[#FDEBE8] border border-[#F2554A]/30 flex items-center justify-center text-[#F2554A] shrink-0">
              <svg class="w-3.5 h-3.5 text-[#F2554A]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 16v-1a5 5 0 00-2.316-4.175A3.992 3.992 0 0115 11a4 4 0 014 4v1h-3zM4.316 10.825A5 5 0 002 15v1h3v-1a4 4 0 011-2.9 3.992 3.992 0 01-1.684-1.275z" />
              </svg>
            </span>
            <div>
              <div class="text-base font-bold text-[#22201E]">Project Team & Members</div>
              <div class="text-xs text-[#6B645C]">Computational Science Benchmark Group</div>
            </div>
          </div>
          <button
            type="button"
            (click)="isMembersDrawerOpen.set(false)"
            class="px-3 py-1 bg-[#FFFFFF] border border-[#E6DFD3] hover:border-[#F2554A] hover:bg-[#FDEBE8] text-[#22201E] rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            ✕ ESC
          </button>
        </div>

        <!-- Research Topic Information Callout -->
        <div class="p-4 bg-[#FFFFFF] border-b border-[#E6DFD3] flex flex-col gap-1.5">
          <div class="text-[10px] font-bold uppercase tracking-wider text-[#F2554A]">Research Investigation</div>
          <div class="text-xs text-[#22201E] font-semibold leading-snug">
            Multi-Physics Emergency Braking Dynamics, Thermal Fade, and Environmental Surface Modeling in Two-Wheeled Vehicles
          </div>
          <div class="text-[11px] text-[#6B645C] mt-1 pt-1.5 border-t border-[#E6DFD3]/60 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>Course: <strong class="text-[#22201E]">Computational Science</strong></span>
            <span>•</span>
            <span>Adviser: <strong class="text-[#22201E]">Prof. Edrick Mendoza Estorel</strong></span>
          </div>
        </div>

        <!-- Scrollable Member Cards List -->
        <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
          <div class="text-[11px] font-bold uppercase tracking-wider text-[#6B645C] px-1 flex items-center justify-between">
            <span>Contributors</span>
            <span class="font-mono text-xs text-[#A39B90]">{{ members.length }} Members</span>
          </div>

          @for (member of members; track member.name; let idx = $index) {
            <div
              class="p-3 bg-[#FFFFFF] border rounded-xl flex items-center gap-3 transition-colors shadow-2xs"
              [ngClass]="member.isLead ? 'border-[#F2554A] bg-[#FEF9F8]' : 'border-[#E6DFD3] hover:border-[#C93A30]/50'"
            >
              <!-- Avatar Circle -->
              <div
                class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 tracking-wide"
                [ngClass]="member.isLead ? 'bg-[#F2554A] text-white shadow-xs' : 'bg-[#F3EEE6] text-[#22201E]'"
              >
                {{ member.initials }}
              </div>

              <!-- Name & Role Description -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-xs sm:text-sm font-bold text-[#22201E] truncate">
                    {{ member.name }}
                  </span>
                  @if (member.isLead) {
                    <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FDEBE8] text-[#C93A30] border border-[#F2554A]/40 shrink-0">
                      Author / Lead
                    </span>
                  }
                </div>
                <div class="text-xs text-[#6B645C] truncate">
                  {{ member.role }}
                </div>
              </div>

              <!-- Rank Index -->
              <span class="text-xs font-mono text-[#A39B90] tabular-nums shrink-0">
                #{{ idx + 1 }}
              </span>
            </div>
          }
        </div>

        <!-- Drawer Footer -->
        <div class="px-5 py-3 bg-[#FFFFFF] border-t border-[#E6DFD3] flex items-center justify-between text-xs">
          <div class="text-[#6B645C] text-[11px] font-medium">
            Academic Year 2026
          </div>
          <button
            type="button"
            (click)="isMembersDrawerOpen.set(false)"
            class="px-5 py-1.5 bg-[#F2554A] hover:bg-[#C93A30] text-white rounded-lg font-bold transition-colors text-xs shadow-2xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      <!-- Floating Right Edge Drawer Trigger Tab -->
      <button
        type="button"
        (click)="toggleConfigDrawer()"
        class="fixed top-1/2 -right-1 transform -translate-y-1/2 z-45 px-2 py-3 bg-[#FFFFFF] border border-[#E6DFD3] hover:border-[#F2554A] text-[#6B645C] hover:text-[#F2554A] rounded-l-lg shadow-md flex flex-col items-center gap-1.5 text-xs font-bold transition-all hover:pr-3 cursor-pointer"
        title="Open System Configuration Drawer"
      >
        <span>⚙</span>
        <span class="[writing-mode:vertical-lr] rotate-180 uppercase tracking-widest text-[10px]">CONFIG</span>
      </button>
    </div>
  `
})
export class WorkbenchComponent {
  readonly store = inject(BenchmarkStore);
  readonly theme = inject(ThemeService);

  readonly isMembersDrawerOpen = signal<boolean>(false);
  readonly isConfigDrawerOpen = signal<boolean>(false);
  readonly isBottomDrawerOpen = signal<boolean>(false);
  readonly isAnatomyMinimized = signal<boolean>(false);

  readonly members = [
    { name: 'Vidal, Kenzo Shenel N.', initials: 'KV', role: 'Project Author & Lead Developer', isLead: true },
    { name: 'Agustin, Sandra C.', initials: 'SA', role: 'Research & Project Member', isLead: false },
    { name: 'Mamayson, Ferkeem F.', initials: 'FM', role: 'Research & Project Member', isLead: false },
    { name: 'Andres, Andrea R.', initials: 'AA', role: 'Research & Project Member', isLead: false },
    { name: 'Tenegra Jr., Antonio O.', initials: 'AT', role: 'Research & Project Member', isLead: false },
    { name: 'Española, Johnwell A.', initials: 'JE', role: 'Research & Project Member', isLead: false },
    { name: 'Tuba, John Michael S.', initials: 'JT', role: 'Research & Project Member', isLead: false },
    { name: 'Herrera, Timothy James A.', initials: 'TH', role: 'Research & Project Member', isLead: false },
  ];

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.isMembersDrawerOpen()) {
      this.isMembersDrawerOpen.set(false);
    } else if (this.isConfigDrawerOpen()) {
      this.isConfigDrawerOpen.set(false);
    } else if (this.isBottomDrawerOpen()) {
      this.isBottomDrawerOpen.set(false);
    }
  }

  toggleMembersDrawer(): void {
    this.isMembersDrawerOpen.set(!this.isMembersDrawerOpen());
  }

  toggleConfigDrawer(): void {
    this.isConfigDrawerOpen.set(!this.isConfigDrawerOpen());
  }

  toggleBottomDrawer(): void {
    this.isBottomDrawerOpen.set(!this.isBottomDrawerOpen());
  }
}
