"""FastAPI application entrypoint for Motorcycle Braking Dynamics.

Configures CORS, exception handlers, and API v1 routing.
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.api.v1.simulation import router as simulation_v1_router
from app.domain.exceptions import PhysicalParameterError, SimulationConfigurationError, SolverConvergenceError


def create_application() -> FastAPI:
    """Factory creating and configuring the FastAPI app."""
    app = FastAPI(
        title="Motorcycle Braking Dynamics Simulation API",
        version="0.1.0",
        description="High-performance numerical simulation engine for motorcycle straight-line emergency braking dynamics.",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # 1. CORS Middleware (allows Angular dev server on port 4200 and production origins)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 2. Structured Domain Exception Handlers
    @app.exception_handler(PhysicalParameterError)
    async def physical_parameter_exception_handler(request: Request, exc: PhysicalParameterError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content={"error": "PhysicalParameterError", "message": str(exc)},
        )

    @app.exception_handler(SimulationConfigurationError)
    async def simulation_config_exception_handler(request: Request, exc: SimulationConfigurationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content={"error": "SimulationConfigurationError", "message": str(exc)},
        )

    @app.exception_handler(SolverConvergenceError)
    async def solver_convergence_exception_handler(request: Request, exc: SolverConvergenceError):
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "SolverConvergenceError", "message": str(exc)},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        formatted_errors = []
        for err in exc.errors():
            loc = " -> ".join(str(item) for item in err["loc"])
            msg = err["msg"]
            formatted_errors.append(f"{loc}: {msg}")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content={"error": "ValidationError", "details": formatted_errors},
        )

    # 3. Mount Routers
    # Versioned route: /api/v1/simulation/...
    app.include_router(simulation_v1_router, prefix="/api/v1")
    # Direct alias: /api/simulation/... (seamless backward compatibility)
    app.include_router(simulation_v1_router, prefix="/api")

    @app.get("/", tags=["Health"])
    def root():
        return {
            "name": "Motorcycle Braking Dynamics Simulation API",
            "version": "0.1.0",
            "docs": "/docs",
            "health": "/api/v1/simulation/health",
        }

    return app


app = create_application()
