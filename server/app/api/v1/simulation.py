"""FastAPI router for motorcycle emergency braking simulation endpoints."""

from fastapi import APIRouter, Depends, status
from app.api.schemas.simulation import BenchmarkApiPayload, BenchmarkResponseSchema
from app.services.simulation_service import SimulationService

router = APIRouter(prefix="/simulation", tags=["Simulation"])


def get_simulation_service() -> SimulationService:
    """Dependency injection provider for SimulationService."""
    return SimulationService()


@router.post(
    "/benchmark",
    response_model=BenchmarkResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Execute multi-physics motorcycle emergency braking benchmark",
    description="Statelessly integrates the 4-state dynamical system for custom garage vehicles using SciPy RK45.",
)
def run_benchmark(
    payload: BenchmarkApiPayload,
    service: SimulationService = Depends(get_simulation_service),
) -> BenchmarkResponseSchema:
    """Execute benchmark run and return decimated columnar telemetry trajectories."""
    return service.run_benchmark(payload)


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="Health check endpoint for solver engine",
)
def health_check() -> dict[str, str]:
    """Return scientific engine health and solver state."""
    return {
        "status": "healthy",
        "engine": "SciPy solve_ivp (RK45)",
        "service": "moto-braking-dynamics-server",
    }
