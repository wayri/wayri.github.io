---
layout: post
title: "Power Dissipation in Electronics: From Calculation to PCB"
date: 2026-05-21
category: Power Electronics
excerpt: "Understanding where power goes — and how to stop it from becoming a failure mode."
---

Every watt of power that doesn't make it to the load becomes heat. In precision hardware, ignoring this basic truth leads to thermal runaway, component stress, and degraded reliability. Here's how I approach power dissipation analysis from schematic to board.

## The Fundamentals

Power dissipation in a resistive element is defined by:

```
P = I² × R  =  V² / R  =  V × I
```

For a linear regulator dropping 5V at 1A, that's 5W — entirely dissipated as heat inside the IC. This is why switching regulators exist: a buck converter at 90% efficiency doing the same job produces only ~0.56W of loss.

## Where Power Actually Goes

In a real system, losses appear across multiple domains:

| Domain | Primary Loss Mechanism |
|--------|----------------------|
| Regulators | Dropout voltage × current |
| MOSFETs | I²×Rds(on) conduction + switching losses |
| Inductors | I²×DCR + core losses |
| PCB traces | I²×R_trace (use IPC-2221) |
| Connectors | Contact resistance × I² |

## Trace Resistance — A Forgotten Source

Using the IPC-2221 model, a 1oz copper trace 10mm long and 0.3mm wide has:

```
R = ρ × L / A
R = (1.72×10⁻⁸) × 0.01 / (0.3×10⁻³ × 35×10⁻⁶)
R ≈ 16 mΩ
```

At 3A, that's 144mW — invisible in simulation, but a real derating source on high-density boards.

## Thermal Resistance Chain

The full thermal path from junction to ambient follows:

```
T_junction = P_dissipated × (θ_jc + θ_cs + θ_sa) + T_ambient
```

Where:
- **θ_jc** — Junction-to-case (from datasheet)  
- **θ_cs** — Case-to-heatsink (depends on TIM/pad)  
- **θ_sa** — Heatsink-to-ambient (heatsink selection)

For a TO-220 MOSFET with θ_jc = 2°C/W dissipating 8W in a 40°C ambient, without a heatsink (θ_sa ≈ 60°C/W), the junction hits **~560°C** — silicon destruction. A good heatsink dropping θ_sa to 5°C/W brings it to **100°C** — survivable.

## My Verification Workflow

1. **Schematic phase**: Annotate every power path with expected I, V, and P
2. **Layout phase**: Use the IPC-2221 trace width calculator for every power net
3. **Thermal simulation**: Star thermal network in MATLAB or LTSpice
4. **Lab validation**: Thermistor + thermal camera after 30-min steady state soak

The physical layer doesn't forgive assumptions. Model everything, then measure.
