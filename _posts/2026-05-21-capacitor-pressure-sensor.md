---
layout: post
title: "Capacitive Pressure Sensing: Geometry and Readout"
date: 2026-05-21
category: Sensors & Instrumentation
excerpt: "A design note on diaphragm-based capacitance sensing, readout range, and calibration."
---

A capacitor's value depends on its geometry and dielectric. If pressure deflects a diaphragm or compresses a dielectric, the resulting capacitance change can be measured. This article describes the design principle; it does not report a calibrated sensor test.

## The Governing Physics

Capacitance of a parallel-plate capacitor:

```
C = ε₀ × εᵣ × A / d
```

Where:
- **A** — plate overlap area (m²)
- **d** — plate separation (m)
- **εᵣ** — dielectric permittivity

With a fixed plate area and dielectric, reducing a 10 µm gap to 9 µm raises the ideal parallel-plate capacitance by about **11%**. Fringing fields, diaphragm shape, and material changes make the response of a real sensor less simple.

## Two Structural Approaches

### 1. Diaphragm-Type (MEMS Style)
A thin conductive membrane suspended over a fixed plate. Applied pressure deflects the membrane, decreasing the air gap:

```
ΔC / C₀ ≈ -Δd / d₀    (for small changes in gap)
```

MEMS devices use this principle at micrometre scale. A flexible electrode over a cavity is one possible prototype approach, but its pressure range and sensitivity depend on the mechanical design and must be calibrated.

### 2. Dielectric Compression
Soft dielectrics between plates may compress under load. Both gap and permittivity can change, so the capacitance-to-pressure relationship needs measurement and calibration.

## Readout Circuit

One readout option converts capacitance to an oscillator frequency; the frequency equation depends on the circuit used. A capacitance-to-digital converter is another option. For example, the [AD7746 data sheet](https://www.analog.com/media/en/technical-documentation/data-sheets/AD7745_7746.pdf) specifies a ±4 pF changing-capacitance range and up to 17 pF of common-mode capacitance. Its 4 aF resolution figure describes noise under specified conditions, not overall measurement accuracy. The sensor and readout must be matched for baseline capacitance and expected change.

## Noise and Stability Concerns

- **Parasitic capacitance**: Keep sense connections short and consider driven guards or shielding where the readout supports them.
- **Humidity**: Moisture can change dielectric properties and leakage; packaging choices depend on the intended environment.
- **Temperature drift**: Characterize the sensor and readout across the operating range, then calibrate or compensate as needed.

## Practical Build Notes

A prototype could use two electrodes separated by a flexible film. The next steps would be to measure baseline capacitance, apply known pressures, repeat loading cycles, and check drift and hysteresis. No pressure-to-capacitance measurement is reported here.

The geometry sets the ideal sensitivity; calibration and environmental testing determine whether a particular build is useful as a pressure sensor.
