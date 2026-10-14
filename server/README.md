# Motorcycle Braking Dynamics - Physics & API Server

High-performance numerical simulation engine for two-wheeled emergency braking dynamics using SciPy's Runge-Kutta 4th/5th order ODE solver (`solve_ivp` RK45) and FastAPI REST endpoints.

## Setup & Testing

```bash
# Create and activate virtual environment
py -3.11 -m venv .venv
.venv\Scripts\activate

# Install dependencies
pip install -e ".[dev]"

# Run unit tests
pytest
```
