---
layout: post
title: "Capacitor as Pressure Sensor: Exploiting Deformation Physics"
date: 2026-05-21
category: Sensors & Instrumentation
excerpt: "A parallel-plate capacitor under mechanical load becomes a surprisingly accurate force transducer — here's the physics and a practical circuit."
---

A capacitor's job is to store charge. But its capacitance is directly determined by its physical geometry — and that geometry changes under pressure. This makes a carefully constructed capacitor an elegant, zero-power, broadband pressure transducer.

## The Governing Physics

Capacitance of a parallel-plate capacitor:

```
C = ε₀ × εᵣ × A / d
```

Where:
- **A** — plate overlap area (m²)
- **d** — plate separation (m)
- **εᵣ** — dielectric permittivity

When pressure compresses the dielectric (reducing `d`) or bends a membrane (changing `A`), capacitance increases measurably. A 1µm change in a 10µm air gap produces a **10% capacitance shift** — easily resolved.

## Two Structural Approaches

### 1. Diaphragm-Type (MEMS Style)
A thin conductive membrane suspended over a fixed plate. Applied pressure deflects the membrane, decreasing the air gap:

```
ΔC ≈ C₀ × (Δd / d)
```

MEMS devices use this principle at µm-scale. At the benchtop, a thin PCB layer over a milled cavity works surprisingly well for 10–100kPa ranges.

### 2. Dielectric Compression
Soft dielectrics (silicone, foam) between plates compress under load. Since `d` decreases and `εᵣ` of compressed foam increases simultaneously, you get a strongly non-linear but reproducible transfer function.

## Readout Circuit

Capacitance change is tiny (femtofarads to picofarads). The standard readout approach uses a **relaxation oscillator** whose frequency depends on C:

```
f = 1 / (2 × R × C × ln(2))
```

An LTC1799 or a 555 in astable mode works. The frequency shift maps directly to pressure. For better linearity, a **charge amplifier** topology or a sigma-delta CDC (e.g., AD7746) gives direct capacitance-to-digital conversion with 4aF resolution.

## Noise and Stability Concerns

- **Guard rings**: Use PCB ground rings around sense traces to eliminate parasitic coupling from adjacent traces
- **Shield the dielectric**: Any moisture ingress changes εᵣ dramatically — conformal coat or hermetic packaging is essential
- **Temperature drift**: ε of most dielectrics has a 100–500 ppm/°C coefficient. Compensate with a reference capacitor not exposed to pressure

## Practical Build Notes

I used a stack of two FR4 copper pours separated by a 100µm Kapton film on a prototype EGSE board. At 20kPa, the measured capacitance shift was ~8pF over a nominal 47pF — clean, repeatable, and resolvable with an AD7746 in differential mode. The key insight: **sensitivity scales inversely with gap thickness**, so thinner films win.

The capacitor-as-sensor model is used in everything from MEMS accelerometers to touchscreens. Understanding the underlying deformation mechanics makes you a better designer at every scale.
