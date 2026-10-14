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

    target_pressure: float = 2.2e6  # 22 bar in Pa (realistic progressive threshold braking)
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


@dataclass(frozen=True)
class BiomechanicalDualBrakeProfile:
    """Biomechanical dual-brake actuation profile modeling independent rider controls (ADR 0022).

    Models two-phase braking:
    1. Perception-Reaction Phase (t <= t_reaction): Free-rolling perception delay where line
       pressures remain 0.0 Pa and deceleration is governed solely by ambient drag and grade.
    2. Mechanical Braking Phase (t > t_reaction): Caliper line pressures ramp up independently
       based on fine-motor finger pull (front_lever_pct) and contextual rear control
       (rear_control_pct).
    """

    front_lever_pct: float = 85.0  # Right Hand Lever effort (0.0 to 100.0%)
    rear_control_pct: float = 65.0  # Contextual Rear Control effort (0.0 to 100.0%)
    t_reaction: float = 1.0  # Perception-reaction latency in seconds
    rise_time_front: float = 0.35  # Finger lever displacement ramp time in seconds
    rise_time_rear: float = 0.25  # Pedal / hand lever rear ramp time in seconds
    peak_front_pressure: float = 3.5e6  # Maximum front line pressure at 100% lever (Pa)
    peak_rear_pressure: float = 2.5e6  # Maximum rear line pressure at 100% control (Pa)

    def __post_init__(self) -> None:
        if not (0.0 <= self.front_lever_pct <= 100.0):
            raise PhysicalParameterError(
                f"Front lever percentage must be in [0.0, 100.0], got {self.front_lever_pct}"
            )
        if not (0.0 <= self.rear_control_pct <= 100.0):
            raise PhysicalParameterError(
                f"Rear control percentage must be in [0.0, 100.0], got {self.rear_control_pct}"
            )
        if self.t_reaction < 0.0:
            raise PhysicalParameterError(
                f"Reaction time cannot be negative, got {self.t_reaction}"
            )
        if self.rise_time_front <= 0.0:
            raise PhysicalParameterError(
                f"Front rise time must be positive, got {self.rise_time_front}"
            )
        if self.rise_time_rear <= 0.0:
            raise PhysicalParameterError(
                f"Rear rise time must be positive, got {self.rise_time_rear}"
            )
        if self.peak_front_pressure <= 0.0:
            raise PhysicalParameterError(
                f"Peak front pressure must be positive, got {self.peak_front_pressure}"
            )
        if self.peak_rear_pressure <= 0.0:
            raise PhysicalParameterError(
                f"Peak rear pressure must be positive, got {self.peak_rear_pressure}"
            )

    def applied_pressure(self, t: float) -> float:
        """Evaluate front line clamping pressure (in Pascals) at time t."""
        if t <= self.t_reaction:
            return 0.0
        dt = t - self.t_reaction
        ramp = min(1.0, dt / self.rise_time_front)
        effort = self.front_lever_pct / 100.0
        return self.peak_front_pressure * effort * ramp

    def applied_rear_pressure(self, t: float) -> float:
        """Evaluate rear line clamping pressure (in Pascals) at time t."""
        if t <= self.t_reaction:
            return 0.0
        dt = t - self.t_reaction
        ramp = min(1.0, dt / self.rise_time_rear)
        effort = self.rear_control_pct / 100.0
        return self.peak_rear_pressure * effort * ramp

    def applied_pressures(self, t: float) -> tuple[float, float]:
        """Evaluate both (front, rear) line clamping pressures in Pascals at time t."""
        return self.applied_pressure(t), self.applied_rear_pressure(t)

