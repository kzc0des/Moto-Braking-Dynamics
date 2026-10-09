# Moto Braking Dynamics

Multi-Physics Emergency Braking Dynamics, Thermal Fade, and Environmental Surface Modeling in Two-Wheeled Vehicles.

## Overview

This repository houses the simulation engine and comparative benchmark platform for analyzing single-track vehicle braking behavior. It couples longitudinal equations of motion, 2-DOF wheel spin dynamics, closed-form dynamic normal load transfer, Pacejka tire traction with curvature friction ellipses, brake thermal fade (including hydraulic vapor lock), and an interactive multi-instance benchmark harness.

## Architecture

The project is structured into two core subsystems:

```text
moto-braking-dynamics/
├── client/          # Frontend interactive benchmark harness (Angular)
├── server/          # Simulation backend & ODE numerical solver (FastAPI, SciPy, NumPy)
└── .gitignore       # Root repository exclusions
```

### 1. Client (`client/`)
* **Framework**: Angular
* **Role**: Interactive multi-instance benchmark harness allowing users to configure up to three motorcycle instances side-by-side (vehicle geometry, brake hardware presets, rider control strategies, and road environments) and inspect real-time comparison telemetry against an emergency hazard barrier ($X_{\text{hazard}}$).

### 2. Server (`server/`)
* **Framework**: FastAPI
* **Role**: Exposes high-performance simulation endpoints and executes numerical integration of coupled dynamical and thermal differential equations via SciPy's adaptive Runge-Kutta solver (`solve_ivp RK45`).

## Development

* Client and server setups are isolated within their respective directories.
* Refer to the `client/` and `server/` README files for local setup and run instructions.
