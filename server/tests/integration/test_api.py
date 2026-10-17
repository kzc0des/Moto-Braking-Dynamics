"""Integration tests for FastAPI simulation endpoints using TestClient."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check_endpoint():
    """Verify health endpoint returns status healthy and solver engine description."""
    response = client.get("/api/v1/simulation/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "SciPy" in data["engine"]


def test_benchmark_simulation_successful_run():
    """Verify POST /api/v1/simulation/benchmark executes full SciPy simulation and returns columnar telemetry."""
    payload = {
        "instances": [
            {
                "id": "garage-scooter-125",
                "name": "125cc Commuter Scooter",
                "enabled": True,
                "colorAccent": "#4ade80",
                "vehicle": {
                    "mass": 165.0,
                    "wheelbase": 1.28,
                    "cogDistanceFront": 0.64,
                    "cogDistanceRear": 0.64,
                    "cogHeight": 0.62,
                    "wheelRadius": 0.25,
                    "wheelInertia": 0.40,
                    "dragCoefficient": 0.65,
                    "frontalArea": 0.70,
                    "brakeBiasRatio": 0.35,
                },
                "brake": {
                    "brakeType": "drum",
                    "rotorMass": 1.20,
                    "specificHeat": 460.0,
                    "surfaceArea": 0.035,
                    "pistonArea": 0.0008,
                    "effectiveRadius": 0.110,
                    "padFrictionNominal": 0.38,
                    "fadeTemperature": 220.0,
                    "fadeCoefficient": 0.004,
                    "fluidBoilTemperature": 230.0,
                    "vaporTransitionBand": 35.0,
                    "thermalEfficiency": 0.85,
                    "drumAmplification": 1.5,
                },
                "actuation": {
                    "type": "biomechanical",
                    "frontLeverPct": 80.0,
                    "rearControlPct": 60.0,
                    "tReaction": 1.0,
                    "riseTime": 0.35,
                    "targetPressure": 2.5e6,
                },
                "environment": {
                    "substrate": "asphalt",
                    "contaminant": "dry",
                    "roadGradeAngle": 0.0,
                    "curveRadius": None,
                    "potholeEnabled": False,
                    "ambientTemperature": 25.0,
                    "airDensity": 1.225,
                },
                "simulation": {
                    "initialVelocity": 16.67,  # 60 km/h
                    "initialRotorTemp": 25.0,
                    "hazardDistance": 60.0,
                    "maxSimulationTime": 10.0,
                    "numTelemetryPoints": 150,
                    "standstillCutoffVelocity": 0.05,
                    "lowSpeedEpsilon": 0.10,
                },
            }
        ]
    }

    response = client.post("/api/v1/simulation/benchmark", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert "solverExecutionTimeMs" in data
    assert data["solverExecutionTimeMs"] >= 0.0
    assert len(data["instances"]) == 1

    inst_result = data["instances"][0]
    assert inst_result["instanceId"] == "garage-scooter-125"
    assert inst_result["terminalOutcome"] == "Safe Stop"
    # Stopping distance includes 1.0s reaction lag (~16.67m) + mechanical braking (~18-25m)
    assert 25.0 < inst_result["stoppingDistance"] < 55.0
    assert inst_result["stoppingTime"] > 1.0
    assert inst_result["reactionDistance"] == 16.67
    assert inst_result["mechanicalBrakingDistance"] > 0.0

    telem = inst_result["telemetry"]
    assert len(telem["time"]) == 150
    assert len(telem["distance"]) == 150
    assert len(telem["velocity"]) == 150
    assert len(telem["deceleration"]) == 150
    assert len(telem["slipRatioFront"]) == 150
    assert len(telem["slipRatioRear"]) == 150
    assert len(telem["normalLoadFront"]) == 150
    assert len(telem["normalLoadRear"]) == 150
    assert len(telem["rotorTemperature"]) == 150


def test_benchmark_alias_route():
    """Verify backward compatibility endpoint /api/simulation/benchmark also serves requests."""
    payload = {
        "instances": [
            {
                "id": "test-bike",
                "name": "Standard Roadster",
                "enabled": True,
                "vehicle": {
                    "mass": 190.0,
                    "wheelbase": 1.40,
                    "cogDistanceFront": 0.70,
                    "cogDistanceRear": 0.70,
                    "cogHeight": 0.60,
                },
                "brake": {},
                "actuation": {},
                "environment": {},
                "simulation": {"initialVelocity": 15.0, "hazardDistance": 50.0},
            }
        ]
    }
    response = client.post("/api/simulation/benchmark", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["instances"]) == 1


def test_benchmark_boundary_validation_rejection():
    """Verify physically impossible vehicle parameters raise HTTP 422 with clear error details."""
    invalid_payload = {
        "instances": [
            {
                "id": "broken-bike",
                "name": "Impossible Motorcycle",
                "enabled": True,
                "vehicle": {
                    "mass": -50.0,  # Negative mass!
                    "wheelbase": 0.2,  # Too short!
                    "cogDistanceFront": 0.70,
                    "cogDistanceRear": 0.70,
                    "cogHeight": 5.0,  # CoG higher than wheelbase!
                },
                "brake": {},
                "actuation": {},
                "environment": {},
                "simulation": {},
            }
        ]
    }
    response = client.post("/api/v1/simulation/benchmark", json=invalid_payload)
    assert response.status_code == 422
    data = response.json()
    assert data["error"] == "ValidationError"
    assert len(data["details"]) > 0


def test_benchmark_barrier_collision_detection():
    """Verify that excessive velocity with short hazard distance reports Barrier Collision."""
    payload = {
        "instances": [
            {
                "id": "crash-test",
                "name": "High-Speed Run",
                "enabled": True,
                "vehicle": {
                    "mass": 200.0,
                    "wheelbase": 1.40,
                    "cogDistanceFront": 0.70,
                    "cogDistanceRear": 0.70,
                    "cogHeight": 0.60,
                },
                "brake": {},
                "actuation": {"type": "progressive_squeeze", "targetPressure": 2.2e6},
                "environment": {},
                "simulation": {
                    "initialVelocity": 30.0,  # ~108 km/h
                    "hazardDistance": 15.0,  # Only 15 meters
                },
            }
        ]
    }
    response = client.post("/api/v1/simulation/benchmark", json=payload)
    assert response.status_code == 200
    data = response.json()
    res = data["instances"][0]
    assert res["terminalOutcome"] == "Barrier Collision"
    assert res["finalVelocity"] > 0.0


def test_custom_garage_vehicle_e2e_verification():
    """Verify custom garage motorcycle evaluation against Cossalter (2006) physical dynamics."""
    sport_payload = {
        "instances": [
            {
                "id": "garage-sport-750",
                "name": "Custom 750cc Sport Prototype",
                "enabled": True,
                "colorAccent": "#00f0ff",
                "vehicle": {
                    "mass": 210.0,
                    "wheelbase": 1.44,
                    "cogDistanceFront": 0.72,
                    "cogDistanceRear": 0.72,
                    "cogHeight": 0.55,
                    "wheelRadius": 0.31,
                    "wheelInertia": 0.65,
                    "dragCoefficient": 0.58,
                    "frontalArea": 0.60,
                    "brakeBiasRatio": 0.70,
                },
                "brake": {
                    "brakeType": "disc",
                    "rotorMass": 1.80,
                    "specificHeat": 460.0,
                    "surfaceArea": 0.055,
                    "pistonArea": 0.0012,
                    "effectiveRadius": 0.145,
                    "padFrictionNominal": 0.45,
                    "fadeTemperature": 280.0,
                    "fadeCoefficient": 0.003,
                    "fluidBoilTemperature": 260.0,
                    "vaporTransitionBand": 40.0,
                    "thermalEfficiency": 0.90,
                    "drumAmplification": 1.0,
                },
                "actuation": {
                    "type": "biomechanical",
                    "frontLeverPct": 85.0,
                    "rearControlPct": 45.0,
                    "tReaction": 0.8,
                    "riseTime": 0.30,
                    "targetPressure": 2.2e6,
                },
                "environment": {
                    "substrate": "asphalt",
                    "contaminant": "dry",
                    "roadGradeAngle": 0.0,
                    "curveRadius": None,
                    "potholeEnabled": False,
                    "ambientTemperature": 24.0,
                    "airDensity": 1.225,
                },
                "simulation": {
                    "initialVelocity": 16.67,  # 60 km/h
                    "initialRotorTemp": 25.0,
                    "hazardDistance": 60.0,
                    "maxSimulationTime": 10.0,
                    "numTelemetryPoints": 150,
                    "standstillCutoffVelocity": 0.05,
                    "lowSpeedEpsilon": 0.10,
                },
            }
        ]
    }

    response = client.post("/api/v1/simulation/benchmark", json=sport_payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["instances"]) == 1
    res = data["instances"][0]

    # Verify physical bounds and Cossalter stopping bounds
    assert res["terminalOutcome"] == "Safe Stop"
    assert 25.0 < res["stoppingDistance"] < 45.0
    assert 15.0 < res["mechanicalBrakingDistance"] < 28.0
    assert 5.0 <= res["peakDeceleration"] <= 12.0  # m/s^2 (~0.5 - 1.2 g)

    # Verify columnar telemetry format (exact 150 points for all series)
    telem = res["telemetry"]
    expected_cols = [
        "time", "distance", "velocity", "deceleration", "omega",
        "slipRatioFront", "slipRatioRear",
        "normalLoadFront", "normalLoadRear", "rotorTemperature"
    ]
    for col in expected_cols:
        assert len(telem[col]) == 150

    # Normal load balance check: normalLoadFront + normalLoadRear ~ total weight
    total_weight = 210.0 * 9.80665
    mid_fz = telem["normalLoadFront"][75] + telem["normalLoadRear"][75]
    assert abs(mid_fz - total_weight) / total_weight < 0.05
    assert telem["normalLoadFront"][75] > telem["normalLoadRear"][75]


def test_benchmark_simulation_with_decoupled_hardware_and_abs():
    """Verify simulation endpoint handles ADR 0027 (ABS, decoupled brakes) and ADR 0028 (tire pressure)."""
    payload = {
        "instances": [
            {
                "id": "decoupled-test-bike",
                "name": "Commuter with Single-Channel ABS and Rear Drum",
                "enabled": True,
                "colorAccent": "#38bdf8",
                "absConfiguration": "single_channel_front",
                "vehicle": {
                    "mass": 150.0,
                    "wheelbase": 1.30,
                    "cogDistanceFront": 0.65,
                    "cogDistanceRear": 0.65,
                    "cogHeight": 0.58,
                    "wheelRadius": 0.25,
                    "wheelInertia": 0.38,
                    "dragCoefficient": 0.60,
                    "frontalArea": 0.65,
                    "brakeBiasRatio": 0.35,
                    "frontTirePressurePsi": 28.0,
                    "rearTirePressurePsi": 32.0,
                },
                "frontBrake": {
                    "brakeType": "disc",
                    "rotorMass": 1.40,
                    "specificHeat": 480.0,
                    "surfaceArea": 0.040,
                    "pistonArea": 0.0010,
                    "effectiveRadius": 0.125,
                    "padFrictionNominal": 0.42,
                    "fadeTemperature": 270.0,
                    "fadeCoefficient": 0.005,
                    "fluidBoilTemperature": 260.0,
                    "vaporTransitionBand": 25.0,
                    "thermalEfficiency": 0.90,
                    "drumAmplification": 1.0,
                },
                "rearBrake": {
                    "brakeType": "drum",
                    "rotorMass": 1.10,
                    "specificHeat": 460.0,
                    "surfaceArea": 0.030,
                    "pistonArea": 0.0006,
                    "effectiveRadius": 0.080,
                    "padFrictionNominal": 0.36,
                    "fadeTemperature": 220.0,
                    "fadeCoefficient": 0.004,
                    "fluidBoilTemperature": 230.0,
                    "vaporTransitionBand": 35.0,
                    "thermalEfficiency": 0.85,
                    "drumAmplification": 1.5,
                },
                "actuation": {
                    "type": "biomechanical",
                    "frontLeverPct": 90.0,
                    "rearControlPct": 85.0,
                    "tReaction": 0.5,
                    "riseTime": 0.25,
                    "targetPressure": 3.0e6,
                },
                "environment": {
                    "substrate": "asphalt",
                    "contaminant": "wet",
                    "roadGradeAngle": 0.0,
                    "curveRadius": None,
                    "potholeEnabled": False,
                    "ambientTemperature": 25.0,
                    "airDensity": 1.225,
                },
                "simulation": {
                    "initialVelocity": 16.67,
                    "initialRotorTemp": 25.0,
                    "hazardDistance": 80.0,
                    "maxSimulationTime": 10.0,
                    "numTelemetryPoints": 150,
                    "standstillCutoffVelocity": 0.05,
                    "lowSpeedEpsilon": 0.10,
                },
            }
        ]
    }

    response = client.post("/api/v1/simulation/benchmark", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert len(data["instances"]) == 1
    res = data["instances"][0]

    assert res["terminalOutcome"] == "Safe Stop"
    assert res["absIntervened"] is True
    # Rear wheel lacked ABS and received 85% rear control -> rear lockup should be flagged
    assert res["rearLockupOccurred"] is True
    assert len(res["telemetry"]["absActiveFront"]) == 150
    assert any(res["telemetry"]["absActiveFront"])

