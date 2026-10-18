---
layout: post
title: "Power Dissipation in Electronics: From Calculation to PCB"
date: 2026-05-21
category: Power Electronics
excerpt: "Understanding where power goes — and how to stop it from becoming a failure mode."
---

Power lost in a component appears mostly as heat. Estimating that loss and the path from the component to ambient helps identify where thermal validation is needed.

## The Fundamentals

Power dissipation in a resistive element is defined by:

```
P = I² × R  =  V² / R  =  V × I
```

For a 10 V to 5 V linear regulator supplying 1 A, the IC dissipates about 5 W. A buck converter delivering the same 5 W output at an assumed 90% efficiency would dissipate about 0.56 W. Actual efficiency depends on the device and operating point.

## Where Power Actually Goes

In a real system, losses appear across multiple domains:

| Domain | Primary Loss Mechanism |
|--------|----------------------|
| Linear regulators | Voltage drop × current |
| MOSFETs | I²×Rds(on) conduction + switching losses |
| Inductors | I²×DCR + core losses |
| PCB traces | I²×R_trace |
| Connectors | Contact resistance × I² |

## Trace Resistance

Using bulk copper resistivity as a first estimate, a 10 mm trace that is 0.3 mm wide and 35 µm thick has:

```
R = ρ × L / A
R = (1.72×10⁻⁸) × 0.01 / (0.3×10⁻³ × 35×10⁻⁶)
R ≈ 16.4 mΩ
```

At 3 A, that is about 147 mW. Actual resistance also depends on copper thickness, temperature, and geometry.

## Thermal Resistance Chain

With a heatsink, a simplified steady-state thermal path is:

```
T_junction = P_dissipated × (θ_jc + θ_cs + θ_sa) + T_ambient
```

Where:
- **θ_jc** — Junction-to-case (from datasheet)  
- **θ_cs** — Case-to-heatsink (depends on TIM/pad)  
- **θ_sa** — Heatsink-to-ambient (heatsink selection)

Without a heatsink, use the package's junction-to-ambient estimate instead of θ_sa. For example, 8 W with θ_ja = 60°C/W would imply a 480°C temperature rise in this simple model, far beyond a practical operating limit. With a heatsink and illustrative values θ_jc = 2°C/W, θ_cs = 0.5°C/W, and θ_sa = 5°C/W, the same 8 W at 40°C ambient gives an estimated junction temperature of 100°C. These values must come from the chosen device, mounting method, heatsink, and airflow. See [TI's thermal model guide](https://www.ti.com/lit/an/slva118a/slva118a.pdf) for the distinction between θ_ja and a heatsink path.

## My Verification Workflow

1. **Schematic phase**: Annotate every power path with expected I, V, and P
2. **Layout phase**: Check resistance and temperature rise on relevant power traces
3. **Thermal simulation**: Build a thermal model in MATLAB or LTspice
4. **Lab validation**: Thermistor + thermal camera after 30-min steady state soak

Estimate the losses, measure temperatures under representative loads, and update the model where measurements differ.
