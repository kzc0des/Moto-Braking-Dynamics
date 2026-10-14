"""End-to-end integration and physics verification script.

Validates the full calculation lifecycle against the FastAPI backend,
confirming that custom motorcycle garage configurations yield expected
stopping distances, columnar telemetry arrays, and terminal outcomes
within Cossalter (2006) error bounds.
"""

import sys
import json
import argparse
import urllib.request
import urllib.error
from typing import Any, Dict


def make_request(url: str, data: Dict[str, Any] | None = None) -> tuple[int, Dict[str, Any]]:
    """Execute an HTTP request using standard library urllib."""
    headers = {"Content-Type": "application/json"} if data else {}
    req_body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=req_body, headers=headers, method="POST" if data else "GET")

    try:
        with urllib.request.urlopen(req, timeout=10.0) as resp:
            status = resp.status
            body = json.loads(resp.read().decode("utf-8"))
            return status, body
    except urllib.error.HTTPError as e:
        status = e.code
        body = json.loads(e.read().decode("utf-8")) if e.fp else {}
        return status, body


def run_e2e_verification(base_url: str = "http://127.0.0.1:8000") -> bool:
    """Run full end-to-end simulation verification."""
    print("=" * 70)
    print(" MOTO-BRAKING DYNAMICS: END-TO-END VERIFICATION")
    print(f" Target Endpoint: {base_url}")
    print("=" * 70)

    # 1. Health Check Verification
    health_url = f"{base_url}/api/v1/simulation/health"
    print(f"\n[1/3] Testing Health Endpoint: GET {health_url}")
    try:
        status, health = make_request(health_url)
    except Exception as e:
        print(f"FAILED: Unable to connect to {health_url}: {e}")
        print("Note: Ensure the backend is running (`npm run server` or `uvicorn app.main:app`).")
        return False

    if status != 200 or health.get("status") != "healthy":
        print(f"FAILED: Unexpected health response: status={status}, body={health}")
        return False

    print(f"  ✓ HTTP 200 OK — Status: '{health['status']}' | Engine: '{health.get('engine')}'")

    # 2. Baseline Garage Vehicle Verification (Custom 750cc Sport)
    print("\n[2/3] Simulating Custom Garage Vehicle (750cc Sport, 60 km/h Emergency Stop)")
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

    bench_url = f"{base_url}/api/v1/simulation/benchmark"
    status, bench_resp = make_request(bench_url, sport_payload)
    if status != 200:
        print(f"FAILED: Benchmark request failed with status {status}: {bench_resp}")
        return False

    runtime_ms = bench_resp.get("solverExecutionTimeMs", 0.0)
    instances = bench_resp.get("instances", [])
    if len(instances) != 1:
        print(f"FAILED: Expected 1 instance result, got {len(instances)}")
        return False

    res = instances[0]
    print(f"  ✓ SciPy Solver Execution Time: {runtime_ms:.2f} ms")
    print(f"  ✓ Terminal Outcome: '{res['terminalOutcome']}'")
    print(f"  ✓ Stopping Distance: {res['stoppingDistance']:.2f} m (Reaction: {res['reactionDistance']:.2f} m, Braking: {res['mechanicalBrakingDistance']:.2f} m)")
    print(f"  ✓ Stopping Time: {res['stoppingTime']:.2f} s")
    print(f"  ✓ Peak Deceleration: {res['peakDeceleration']:.2f} m/s² ({res['peakDeceleration']/9.80665:.2f} g)")

    # Cossalter (2006) Physical Consistency Checks
    # For a sport motorcycle braking from 60 km/h on dry asphalt (~0.6-0.8g deceleration):
    # Braking distance is expected around 17-25 m; with 0.8s reaction (13.34 m), total is 30-40 m.
    assert res["terminalOutcome"] == "Safe Stop", f"Unexpected outcome: {res['terminalOutcome']}"
    assert 25.0 < res["stoppingDistance"] < 45.0, f"Stopping distance {res['stoppingDistance']} m outside Cossalter bounds (25-45 m)"
    assert 15.0 < res["mechanicalBrakingDistance"] < 28.0, f"Braking distance {res['mechanicalBrakingDistance']} m outside realistic bounds (15-28 m)"
    assert 5.0 <= res["peakDeceleration"] <= 12.0, f"Peak decel {res['peakDeceleration']} m/s² outside physical limits"

    # Columnar Telemetry Checks
    telem = res["telemetry"]
    expected_cols = [
        "time", "distance", "velocity", "deceleration", "omega",
        "slipRatioFront", "slipRatioRear",
        "normalLoadFront", "normalLoadRear", "rotorTemperature"
    ]
    for col in expected_cols:
        arr = telem.get(col, [])
        assert len(arr) == 150, f"Column '{col}' length {len(arr)} != 150 points"

    # Physical dynamic equilibrium check during braking
    total_weight = 210.0 * 9.80665  # ~2059 N
    mid_idx = 75  # Mid-braking sample
    fz_sum = telem["normalLoadFront"][mid_idx] + telem["normalLoadRear"][mid_idx]
    weight_err = abs(fz_sum - total_weight) / total_weight
    assert weight_err < 0.05, f"Normal load equilibrium error {weight_err*100:.2f}% exceeds 5% tolerance"
    assert telem["normalLoadFront"][mid_idx] > telem["normalLoadRear"][mid_idx], "Front load must exceed rear during braking"
    print(f"  ✓ Dynamic Weight Transfer: Fz_front={telem['normalLoadFront'][mid_idx]:.1f} N, Fz_rear={telem['normalLoadRear'][mid_idx]:.1f} N (Total: {fz_sum:.1f} N)")
    print(f"  ✓ Columnar Telemetry Decimation: All 10 telemetry channels verified at exactly 150 points.")

    # 3. Low-Friction Wet Surface Safety Validation
    print("\n[3/3] Simulating Low-Friction Wet Asphalt Surface")
    wet_payload = json.loads(json.dumps(sport_payload))
    wet_payload["instances"][0]["environment"]["contaminant"] = "wet"
    status, wet_resp = make_request(bench_url, wet_payload)
    assert status == 200
    wet_res = wet_resp["instances"][0]
    print(f"  ✓ Wet Surface Stopping Distance: {wet_res['stoppingDistance']:.2f} m vs Dry: {res['stoppingDistance']:.2f} m")
    assert wet_res["stoppingDistance"] >= res["stoppingDistance"], "Wet stopping distance must exceed dry distance"

    print("\n" + "=" * 70)
    print(" ALL END-TO-END INTEGRATION AND PHYSICAL LAW TESTS PASSED (100%)")
    print("=" * 70)
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="End-to-End Simulation Verification")
    parser.add_argument("--url", default="http://127.0.0.1:8000", help="Base URL of FastAPI solver")
    args = parser.parse_args()

    success = run_e2e_verification(args.url)
    sys.exit(0 if success else 1)
