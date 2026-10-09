"""Brake actuation profiles driving hydraulic or mechanical clamping effort over time.

Supports Progressive Squeeze (gradual linear ramp) and Sudden Lockup (instantaneous step).
"""

from typing import Protocol
from dataclasses import dataclass

from app.domain.exceptions import PhysicalParameterError


class BrakeActuationProfile(Protocol):
    """Protocol defining time-dependent brake line pressure or clamping force."""

    def applied_pressure(self, t: float) -> float:
        """Evaluate line clamping pressure (in Pascals) at time t (seconds)."""
        ...


@dataclass(frozen=True)
class ProgressiveSqueezeProfile:
    """Smoothly ramps hydraulic pressure from zero up to target pressure over rise_time.

    Models skilled threshold braking where the rider allows front fork dive and
    dynamic normal load transfer before reaching maximum clamping effort.
    """

    target_pressure: float = 5.0e6  # 50 bar in Pa
    rise_time: float = 0.50  # Seconds to ramp from 0 to target_pressure

    def __post_init__(self) -> None:
        if self.target_pressure <= 0:
            raise PhysicalParameterError(
                f"Target pressure must be positive, got {self.target_pressure}"
            )
        if self.rise_time <= 0:
            raise PhysicalParameterError(
                f"Rise time must be positive, got {self.rise_time}"
            )

    def applied_pressure(self, t: float) -> float:
        if t <= 0.0:
            return 0.0
        if t < self.rise_time:
            return self.target_pressure * (t / self.rise_time)
        return self.target_pressure


@dataclass(frozen=True)
class SuddenLockupProfile:
    """Instantaneously applies peak hydraulic pressure at t=0.

    Models a panic grab where the rider clamps the lever to full stop immediately,
    exceeding tire adhesion before dynamic load transfer stabilizes.
    """

    target_pressure: float = 7.0e6  # 70 bar in Pa

    def __post_init__(self) -> None:
        if self.target_pressure <= 0:
            raise PhysicalParameterError(
                f"Target pressure must be positive, got {self.target_pressure}"
            )

    def applied_pressure(self, t: float) -> float:
        if t < 0.0:
            return 0.0
        return self.target_pressure
