"""Domain exceptions for motorcycle braking dynamics.

These exceptions represent physical rule violations and solver anomalies
independent of web transport frameworks.
"""


class DomainError(Exception):
    """Base class for all domain-level exceptions."""

    pass


class PhysicalParameterError(DomainError):
    """Raised when physical parameters violate physical constraints."""

    pass


class SimulationConfigurationError(DomainError):
    """Raised when simulation parameters or initial states are invalid."""

    pass


class SolverConvergenceError(DomainError):
    """Raised when the numerical ODE solver fails to converge."""

    pass
