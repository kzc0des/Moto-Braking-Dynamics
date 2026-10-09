# Moto Braking Dynamics

<p align="center">
  <img src="https://img.shields.io/badge/Angular_21-%23DD0031?style=for-the-badge&logo=angular&logoColor=white" alt="Angular 21" />
  <img src="https://img.shields.io/badge/FastAPI-%23009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Python_3.10+-%233776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/SciPy_solve__ivp_(RK45)-%238CAAE6?style=for-the-badge&logo=scipy&logoColor=white" alt="SciPy" />
  <img src="https://img.shields.io/badge/NumPy-%23013243?style=for-the-badge&logo=numpy&logoColor=white" alt="NumPy" />
  <img src="https://img.shields.io/badge/Tailwind_CSS_v4-%2306B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" />
</p>

> **Multi-Physics Emergency Braking Dynamics, Thermal Fade, and Environmental Surface Modeling in Two-Wheeled Vehicles**  
> An interactive computational science simulation and multi-instance benchmark harness coupling 2-DOF wheel spin kinematics, Pacejka Magic Formula tire traction with curvature friction ellipses, dynamic normal load transfer, and lumped capacitance brake thermodynamics.

---

## 1. Academic & Theoretical Overview

Motorcycle and scooter riders face disproportionately high risks during emergency stopping maneuvers compared to drivers of four-wheeled vehicles. A single-track vehicle possesses:
1. An inherently unstable roll degree of freedom.
2. A high Center of Gravity (CoG) height relative to its narrow wheelbase ($L$).
3. Complete dependence on two small tire contact patches for all traction forces.

During heavy emergency braking, severe dynamic load transfer unloads the rear tire and concentrates vertical force onto the front tire. On pristine dry asphalt, this mechanism amplifies front tire grip; however, in real-world roadway conditions (such as wet tarmac, rain-soaked thermoplastic lane markings, loose gravel, fine road grit, or pothole depressions), available friction collapses or fluctuates abruptly.

```
       Pitch Inertial Moment [m · (-ax) · h]
                 ┌───────────────┐
                 │       ▲       │
                 │      / \      │
                 ▼       │ CoG   ▼
           [REAR AXLE]   │    [FRONT AXLE]
           Unloading ◄───┴───► Heavy Compression
         (Risk: Stoppie)      (Risk: Washout)
```

If brake lever clamping torque exceeds the friction budget of the tire-pavement interface, the front tire exceeds its **Critical Slip Ratio** ($\kappa_{\text{crit}}$). The instantaneous loss of lateral force capability triggers catastrophic **Front-Wheel Washout** (low-side crash). Conversely, aggressive front clamping on high-grip dry surfaces can unload rear normal load to zero ($F_{z,\text{rear}} \le 0$), inducing pitch-over (**Rear-Wheel Lift-off** or stoppie).

Compounding these kinematic limits are thermodynamic failure modes within the brake hardware:
* **Pad Thermal Fade**: High temperatures degrade the pad friction coefficient ($\mu_{\text{pad}}(T)$), drastically lowering torque bite under sustained lever pressure.
* **Hydraulic Vapor Lock (Fluid Boiling)**: Prolonged downhill drag braking superheats the caliper fluid past its boiling point ($T_{\text{boil}}$). The resulting compressible gas pockets destroy line pressure ($P_{\text{line}} \to 0$), causing total brake failure.
* **Enclosed Drum Brake Dissipation Limits**: Drum brakes retain heat within rotating hubs, exhibiting lower convective heat transfer ($h_{\text{conv}}$) and accelerating thermal fade.

---

## 2. Virtual Simulation: Purpose & Accident Prevention

Physical track testing of emergency stopping thresholds at highway velocities ($v_0 = 60\text{ km/h}$) introduces severe life-safety hazards and destructive costs.

### What This System Solves
This platform serves as a digital testbed to safely discover, evaluate, and calibrate the exact operational envelope needed to avoid collisions and loss of control:
* **Determines Safe Stopping Thresholds**: Identifies whether a given vehicle configuration can come to a full stop before a designated emergency barrier ($X_{\text{hazard}}$).
* **Quantifies Safety Boundaries**: Maps the precise braking pressure, actuation rise time ($\tau$), and front-to-rear brake bias ($\gamma$) required to stop safely without locking the wheels.
* **Evaluates Adverse Scenarios**: Simulates high-risk scenarios (downhill slopes with wet paint lines or sudden pothole impacts) to test Anti-Lock Braking System (ABS) algorithms and rider modulation strategies without risk to human riders.

---

## 3. Mathematical & Physics Formulation

The simulation solves a coupled non-linear system of differential and constitutive equations using SciPy's adaptive Runge-Kutta solver (`scipy.integrate.solve_ivp`, RK45 method).

### a. Longitudinal Vehicle Equation of Motion
For a combined rider and vehicle mass $m$ traversing an inclined grade $\theta$ (radians):

$$m \frac{dv}{dt} = -(F_{x,\text{front}} + F_{x,\text{rear}}) - \frac{1}{2} \rho C_d A v^2 - m g \sin(\theta)$$

$$\frac{dx}{dt} = v$$

Where:
* $\rho = 1.225\text{ kg/m}^3$ (air density)
* $C_d A \approx 0.40 - 0.70\text{ m}^2$ (aerodynamic drag area)
* $\theta > 0$ denotes uphill incline; $\theta < 0$ denotes downhill descent

---

### b. Dynamic Wheel Spin & Slip Formulation
Slip ratio is not an imposed input; it emerges dynamically from wheel rotational deceleration:

$$I_w \frac{d\omega}{dt} = F_x R_w - T_b(t, T)$$

Longitudinal slip ratio ($\kappa$) is evaluated at each step:

$$\kappa = \frac{v - \omega R_w}{\max(v, \varepsilon)}$$

* Pure rolling: $\omega R_w = v \implies \kappa = 0$
* Full wheel lockup: $\omega = 0 \implies \kappa = 1.0$
* $\varepsilon = 0.10\text{ m/s}$ regularizes the denominator near standstill to prevent numerical division-by-zero stiffness.

---

### c. Closed-Form Dynamic Normal Load Transfer
Deceleration creates an algebraic loop between braking forces and vertical normal loads. The analytical closed-form solution resolves this interaction without iterative solver convergence stalls:

$$F_{z,\text{front}} = \frac{m g \cos(\theta) \frac{b}{L} + \left(k_r m g \cos(\theta) + F_{\text{drag}} + m g \sin(\theta)\right) \frac{h}{L} + \Delta F_{z,\text{defect}}(x)}{1 - (k_f - k_r) \frac{h}{L}}$$

$$F_{z,\text{rear}} = m g \cos(\theta) - F_{z,\text{front}}$$

Where:
* $k_f = \mu_{\text{eff}} f_f(\kappa_{\text{front}})$, $k_r = \mu_{\text{eff}} f_r(\kappa_{\text{rear}})$
* $L = a + b$ (wheelbase)
* $h$ is Center of Gravity height
* $\Delta F_{z,\text{defect}}(x)$ represents localized vertical load drop across pothole voids ($x \in [x_{\text{hole}}, x_{\text{hole}} + w]$)

---

### d. Pacejka Magic Formula & Friction Ellipse
Longitudinal tire force under straight-line braking is modeled via the Pacejka empirical formulation:

$$F_{x,\text{nominal}}(\kappa) = D \sin\left[ C \arctan\left( B\kappa - E(B\kappa - \arctan(B\kappa)) \right) \right]$$

With peak scaling factor $D = \mu_{\text{effective}} F_z$.

When braking through a constant-radius curve $R$, available longitudinal grip is constrained by lateral centripetal force demand ($F_y \approx \frac{m v^2}{R}$) via the **Friction Ellipse**:

$$F_{x,\text{max}} = \sqrt{\max\left(0, (\mu_{\text{effective}} F_z)^2 - F_y^2\right)}$$

$$F_x(\kappa) = F_{x,\text{nominal}}(\kappa) \cdot \left[ \frac{F_{x,\text{max}}}{\mu_{\text{effective}} F_z} \right]$$

If $F_y > \mu_{\text{effective}} F_z$, the tire immediately loses lateral equilibrium, triggering a washout.

---

### e. Thermodynamic Lumped Capacitance Model
Brake rotor or drum temperature ($T$) updates continuously based on friction power input versus convective cooling:

$$m_d c_p \frac{dT}{dt} = \eta_{\text{thermal}} T_b \omega - h_{\text{conv}} A_{\text{surface}} (T - T_{\text{ambient}})$$

* **Convective Dissipation**:
  * Exposed Disc: $h_{\text{conv,disc}} = 20 + 0.15 v^{0.8}\text{ W/(m}^2\text{K)}$
  * Enclosed Drum: $h_{\text{conv,drum}} \approx 0.20 \cdot h_{\text{conv,disc}}$
* **Pad Friction Fade**:
  $$\mu_{\text{pad}}(T) = \mu_{\text{pad},0} \exp\left(-\beta_{\text{fade}} \max(0, T - T_{\text{fade}})\right)$$
* **Hydraulic Vapor Lock**:
  $$P_{\text{line}}(T) = P_{\text{applied}} \max\left(0, 1 - \frac{T - T_{\text{boil}}}{\Delta T_{\text{vapor}}}\right)$$
  When fluid reaches boiling point ($T \ge T_{\text{boil}}$), vapor bubbles eliminate hydraulic pressure transmission ($P_{\text{line}} \to 0$, $T_b \to 0$).

---

## 4. Safety Engineering: 4-Way Terminal Failure Taxonomy

Every simulation trajectory is evaluated against an immovable hazard barrier ($X_{\text{hazard}}$) and classified into one of four mutually exclusive physical outcomes:

| Terminal Outcome | Visual Marker | Physical Boundary Condition | Crash Avoidance Meaning |
| :--- | :--- | :--- | :--- |
| **Safe Stop** | `[ SAFE STOP ]` (Signal Mint) | $v \le v_{\text{stop}}$ at $x < X_{\text{hazard}}$ with $\kappa \le \kappa_{\text{crit}}$ | Success. Vehicle came to rest safely before the hazard. |
| **Barrier Collision** | `[ COLLISION ]` (Hyper Red) | $x \ge X_{\text{hazard}}$ with $v_{\text{impact}} > 0$ | Crash. Insufficient friction, brake fade, or downhill slope caused impact. |
| **Front-Wheel Washout** | `[ WASHOUT ]` (Hyper Red) | $\kappa_{\text{front}} > \kappa_{\text{crit}}$ under braking or steering | Low-Side Fall. Tire exceeded grip limit, causing front steering collapse. |
| **Rear-Wheel Lift-off** | `[ LIFT-OFF ]` (Hyper Red) | $F_{z,\text{rear}} \le 0$ under forward pitch | Pitch-Over Stoppie. Extreme front braking lifted rear wheel off ground. |

---

## 5. System Features & Interactive Workbench

The platform provides an authentic telemetry cockpit and simulation workbench designed according to high-density motorsport telemetry standards.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             MOTO-BRAKING DYNAMICS                                │
│                   [ STANDBY / SOLVING ODE ]   [ ☀ LIGHT / 🌙 DARK ]               │
├───────────────────────────────────────────────────────┬──────────────────────────┤
│ 2D Canvas Kinematics Track (60 FPS)                   │ Interactive Anatomy      │
│ • Real-time vehicle pitch and suspension compression  │ Inspector                │
│ • Vector arrows for Normal Loads (Fz_front, Fz_rear)  │ • 2D SVG Schematic       │
│ • Dynamic tire contact patch & hazard barrier distance│ • Parameter-to-part sync │
├───────────────────────────────────────────────────────┴──────────────────────────┤
│ Synchronized Multi-Channel Telemetry Strips                                      │
│ • Velocity [m/s]          • Deceleration [g]      • Rotor Temperature [°C]       │
│ • Normal Loads Fz [kN]    • Slip Ratio κ [%]      • 10-Segment LED Slip Meter    │
│ • Real-time Trajectory Scrubber needle synced across all channels                │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 3-Pillar Parameter Cockpit (Dual-Layered Plain English + Engineering SI Units)  │
│ [ Chassis & Mass ]         [ Road & Environment ]         [ Rider & Braking ]    │
│ • Mass m: 200 kg           • Substrate & Contaminant      • Panic vs Progressive │
│ • Wheelbase L: 1.40 m      • Grade θ & Pothole Void       • Bias γ: 0.30 (Rear)  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Key Capabilities
1. **Multi-Instance Comparative Benchmark Harness**:
   * Spawns up to **three motorcycles side-by-side** simultaneously.
   * **Mode A (Shared Track)**: Compare 3 bike setups (e.g., Drum Commuter vs Non-ABS Disc vs ABS Superbike) on identical pavement.
   * **Mode B (Environmental Stress)**: Deploy the same bike across 3 distinct road conditions (Dry Concrete vs Wet Downhill Asphalt vs Potholed Gravel).
2. **Native HTML5 Canvas 2D Kinematics Track**:
   * Smooth 60 FPS rendering of vehicle pitch angle, wheel rotation ($\omega$), dynamic tire deformation, and spatial barrier clearance without SVG DOM overhead.
3. **Interactive Anatomy Inspector**:
   * Interactive SVG chassis diagram that visually highlights physical motorcycle components (disc calipers, CoG crosshair, wheel hubs, levers, road slope) as sliders are adjusted.
4. **Synchronized Telemetry Strips with Trajectory Scrubber**:
   * Time-series chart strips sharing an interactive scrubbing needle. Inspect velocity, deceleration, slip ratio, dynamic normal loads, and rotor heating at any timestamp.
5. **Decoupled 4x4 Environmental Matrix**:
   * 4 Substrates (Bituminous Asphalt, Concrete Slab, Loose Gravel, Cratered Asphalt) $\times$ 4 Contaminants (Dry, Wet Film, Dusty Grit, Wet Painted Thermoplastic).
6. **Pre-Calibrated Motorcycle Archetypes**:
   * Standardized baselines for non-domain evaluators: *Superbike 1000cc*, *Cruiser 650cc*, and *Urban Scooter 125cc*.

---

## 6. Technical Stack & Architecture

The application adopts a decoupled full-stack architecture separating the high-speed Python numerical ODE engine from the responsive Angular client.

```
moto-braking-dynamics/
├── client/                     # Interactive Telemetry Workbench (Angular 21)
│   ├── src/app/
│   │   ├── core/               # API clients, models, and theme services
│   │   ├── features/
│   │   │   ├── anatomy/        # 2D SVG Interactive Anatomy Inspector
│   │   │   ├── diagnostics/    # Fixed Diagnostics HUD & numerical warnings
│   │   │   ├── kinematics/     # 60 FPS HTML5 Canvas vehicle track renderer
│   │   │   ├── parameters/     # 3-pillar parameter cockpit controls
│   │   │   └── telemetry/      # Synchronized strip charts & LED slip gauge
│   │   ├── state/              # Reactive Signals store (BenchmarkStore)
│   │   └── workbench/          # Master cockpit orchestrator component
│   └── package.json
│
└── server/                     # Scientific ODE Solver Backend (FastAPI)
    ├── app/
    │   ├── api/                # REST simulation and preset endpoints
    │   ├── core/               # Configuration settings and CORS handling
    │   └── domain/physics/     # Pure mathematical modeling & numerical integration
    │       ├── actuation.py    # Rider lever profiles (Panic, Modulated, ABS)
    │       ├── brake.py        # Thermodynamics, pad fade, and fluid vapor lock
    │       ├── derivatives.py  # Coupled state derivative evaluations
    │       ├── models.py       # Domain dataclasses, enums, and validations
    │       ├── solver.py       # SciPy solve_ivp (RK45) integration harness
    │       ├── tire.py         # Pacejka Magic Formula & friction matrices
    │       └── weight_transfer.py # Closed-form normal load equations
    └── pyproject.toml
```

### Technologies & Libraries

#### Frontend Ecosystem
* **Angular 21**: Reactive client architecture powered by Signals (`signal`, `computed`, `effect`) and standalone components.
* **Tailwind CSS v4**: High-performance, tokenized styling using the Motorsport Paddock dark matrix palette.
* **HTML5 Canvas 2D**: Hardware-accelerated vehicle kinematic rendering at 60 FPS.
* **RxJS**: Debounced reactivity for auto-recomputing simulations upon slider input.

#### Backend Scientific Computing
* **Python 3.10+**: Core backend runtime.
* **FastAPI & Uvicorn**: High-throughput REST API serving batch simulation payloads (`POST /api/simulation/benchmark`).
* **SciPy (`scipy.integrate.solve_ivp`)**: Adaptive Runge-Kutta numerical integration (RK45) with boundary event detection.
* **NumPy**: Vectorized state arrays and columnar telemetry decimation ($N = 150$ points per run).

---

## 7. Local Setup & Quickstart

### Prerequisites
* **Node.js**: v20.x or higher
* **npm**: v10.x or higher
* **Python**: v3.10 or higher

---

### Step 1: Start the Backend Simulation Server
```bash
# Navigate to the server root
cd moto-braking-dynamics/server

# Install scientific dependencies
pip install numpy scipy fastapi uvicorn

# Start the FastAPI simulation server
uvicorn app.main:app --reload --port 8000
```
* Interactive API Documentation (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)
* Health Check Endpoint: `http://localhost:8000/api/simulation/presets`

---

### Step 2: Start the Frontend Telemetry Workbench
Open a separate terminal window:
```bash
# Navigate to the client root
cd moto-braking-dynamics/client

# Install frontend dependencies
npm install

# Start the Angular development server
npm run start
```
* Open your browser and navigate to: **[http://localhost:4200](http://localhost:4200)**

---

## 8. Academic Attribution & Project Roster

This research and software implementation was developed in partial fulfillment of the requirements for the course **Computational Science**.

### Principal Author & Software Architect
* **Vidal, Kenzo Shenel N.**  
  *Principal Conceptualizer, Lead Software Architect, and Numerical Simulation Developer*  
  4th Year Computer Science Student

### Academic Research Team (Co-Authors & Contributors)
* Agustin, Sandra C.
* Mamayson, Ferkeem F.
* Andres, Andrea R.
* Tenegra Jr., Antonio O.
* Española, Johnwell A.
* Tuba, John Michael S.
* Herrera, Timothy James A.

### Academic Adviser
* **Prof. Edrick Mendoza Estorel**  
  *Computational Science Adviser*

---

### Suggested Citation (BibTeX)
```bibtex
@misc{vidal2026motobraking,
  author       = {Vidal, Kenzo Shenel N. and Agustin, Sandra C. and Mamayson, Ferkeem F. and Andres, Andrea R. and Tenegra, Antonio O. and Espa{\~n}ola, Johnwell A. and Tuba, John Michael S. and Herrera, Timothy James A.},
  title        = {Moto Braking Dynamics: Multi-Physics Emergency Braking Dynamics, Thermal Fade, and Environmental Surface Modeling in Two-Wheeled Vehicles},
  year         = {2026},
  howpublished = {Computational Science Case Study},
  note         = {Adviser: Prof. Edrick Mendoza Estorel}
}
```

---

<p align="center">
  <b>Moto Braking Dynamics</b> • Computational Science
</p>
