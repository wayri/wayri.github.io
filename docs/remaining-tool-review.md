# Remaining tool review and reference sheets

Reviewed 2026-11-09 against the actual fragments and shared implementations. This
record complements the basic, RF and SMPS review records; it does not qualify
excluded code. Thermal tools and harness builders are deliberately outside the
published catalog at the user's request.

| Legacy fragment | Decision | Evidence / reason |
| --- | --- | --- |
| ohms-law-wheel | Retain | All six independent positive input pairs, repeated edits, invalid values and remounting checked. Fixed stale calculated inputs. |
| reactance-calc | Retain | Ideal Xc, Xl and LC resonance; SI conversion and invalid-value clearing checked. |
| rc-time-calc | Retain | Ideal RC step response; 50%/90% charge/discharge and invalid input checks. |
| ev-powertrain-calc | Restore narrowly | Steady flat-road drag + rolling resistance, constant efficiency and usable energy. No acceleration, grade, weather, auxiliary load or battery model. At 72 km/h, 1000 kg, Crr .01, Cd .3, area 2 m²: drag 147 N, rolling 98.1 N, electrical power 5.447 kW at 90% efficiency. |
| magnetic-core-calc | Replace | Shared implementation mixes a valid constant-permeability reluctance model with generic material presets and an arbitrary 80% saturation “safe” solver. New magnetic-reluctance page retains only supplied geometry/permeability, linear L/B/energy and explicit no-fringing/no-loss limits. |
| awg-wire-ampacity | Exclude | Unsourced chassis/bundle ampacity table is used to declare “Safe & Compliant”; fusing formula does not establish insulation or installation compliance. DC resistance could be separated later. |
| ipc-2221-trace-width | Exclude | Empirical legacy temperature-rise fit is presented with automatic constraint satisfaction. It is a thermal screening tool without board/stackup/heat-flow validation. |
| pcb-clearance-calc | Exclude | Hardcoded table contains uncertain comments and no verified standard revision/applicability. A spacing compliance result needs the exact applicable standard and environment. |
| fusing-current | Exclude | Onderdonk-style adiabatic thermal calculation is not qualified for the offered PCB geometry and fault-clearing conditions. Thermal/fusing claims remain out. |
| planar-inductor | Exclude | Geometry/field display uses simplified effective-permeability weighting. Applicability, construction and current/loss claims lack the required reference comparison. |
| emi-filter-calc | Exclude | Resonant-frequency calculations assume specific common/differential-mode L and C definitions not established by the input labels; an LC corner alone is not insertion loss. The rebuilt SMPS filter offers an explicit loaded circuit instead. |
| power-electronics-calc | Exclude | Rectifier code explicitly mixes approximate resistive-load and continuous inductive-load equations; waveforms include a rough controlled-three-phase envelope. The combined suite is not restored on the strength of its sound buck subset. |
| battery-suite | Rebuilt/restored | Replaced generic chemistry/aging curves with a source-conditioned reference catalog and explicit OCV/R/temperature/load model. See battery-analysis-review.md. |
| bldc-winding-helper | Exclude | Code labels phase-belt winding assignment as simplified; no winding-factor/harmonic/connection validation supports practical winding recommendations. |
| ac-motor-dynamics | Exclude | Approximate Thevenin parameters are combined with a separate exact input-current branch and an operating-region “stable” verdict. Needs consistent model and reference cases. |
| motor-controller | Exclude | dq capability sweep uses coarse Id search and shared rendering/extraction assumptions; voltage/current conventions, field-weakening accuracy and model comparisons remain unverified. |
| voltage-margining-dac | Exclude | Valid feedback-node algebra coexists with default-masking inputs and ambiguous bipolar current-DAC step/count conventions. Requires separately checked solve paths and sign conventions before restoration. |
| web-serial-interface | Exclude | Device I/O utility, not a formula calculator. Shared chart/lifecycle/protocol behavior has no reviewed hardware acceptance record. No serial device was accessed in this task. |
| plot-extractor | Exclude | Linear-only digitization returns a plausible constant on coincident calibration points; lacks degenerate/calibration-reset checks and repeat-mount isolation. |
| fishbone | Exclude | Labels independent OR probability as a Bayesian fault tree; defaults and conversions do not establish a defensible causal probability model. |
| filter-designer | Exclude | Shared overrides draw a Butterworth-order magnitude based only on LC/LCL/CLC topology rather than the actual terminated network. Rebuilt SMPS filter uses its actual complex circuit. |
| loop-compensator-p-z | Exclude | Mixed shared Type-II/III topology/initializer paths and a fixed auto-solve component set lack a circuit-bound reference check. Measured-loop lead/lag exploration is now in the rebuilt SMPS tuner. |
| smps-loop-tuner | Rebuilt/restored | The old shaped Bode/transient recommendations are replaced; see smps-tool-review.md for actual RLC and measured-loop scope. |
| magnetics-suite | Exclude | Transformer area-product branch explicitly uses a “pseudo Ap” placeholder; generic window utilization/current density and turns/gap sizing cannot qualify a winding design. |
| transformer-designer | Exclude | Fixed approximate mean turn length, generic core/thermal inputs and safe-power recommendations do not represent supplied core/winding construction. Thermal model remains out. |
| pv-yield-simulator | Rebuilt/restored | Replaced synthetic clear-sky yield with supplied POA interval integration and monthly irradiation estimates, explicit temperatures/losses/clipping and provenance. See pv-generation-review.md. |
| thermistor-r-t-curve-ntc | Exclude | Shared Steinhart–Hart mode uses a placeholder beta-model plot. A valid beta equation alone does not defend the offered combined thermal/sensor tool. |
| heatsink-simulator | Exclude | Unverified heat-transfer/fin/thermal model; explicitly excluded. |
| thermal-network-calc | Exclude | Unverified thermal model; explicitly excluded. |
| cable-thermal | Exclude | Unverified dynamic cable thermal model; explicitly excluded. |
| busbar-capacity | Exclude | Capacity/temperature assumptions do not establish installation current rating; thermal/current-capacity result not restored. |
| multipoint-harness | Exclude | Harness builder explicitly excluded. |
| magnetics-harness | Exclude | Combined builder fragment outside the requested analytical catalog. |
| can-bus | Exclude | Harness builder; blanket length/stub PASS/FAIL thresholds lack transceiver/sample-point/delay budgets. |

## Narrow replacements

- **Magnetic reluctance**: ℜ = le/(μ0 μr Ae) + lg/(μ0 Ae); L = N²/ℜ,
  B = LI/(N Ae), E = LI²/2. Uniform geometry, constant permeability, no fringing,
  leakage, saturation curve, core/winding losses or thermal result. Primary
  background: [TDK ferrite definitions](https://www.tdk-electronics.tdk.com/download/187036/dbcde584d155cc270f5d5dbf1efec233/pdf-generaldefinitions.pdf).
  Tests check 125.664 µH ungapped and 5.984 µH at a 0.5 mm total gap for the stated
  50 mm / 25 mm² / μr 2000 / 10-turn example, plus zero current and bad geometry.
- **Skin depth** replaces the old AC-resistance interpolation: δ =
  1/√(πfμσ) for a homogeneous good conductor and Rdc = length/(σA). No AC-resistance,
  ampacity or temperature claim. [MIT circuit notes](https://fab.cba.mit.edu/classes/862.16/notes/circuits.pdf)
  give the skin-depth derivation. Tests check 66.085 µm at 1 MHz and 21.9524 mΩ/m
  DC resistance for a 1 mm wire at 58 MS/m, plus DC/invalid-input behavior.

## New reference sheets

DDR, Ethernet, SerDes and LVDS sheets provide independently written summaries and
link the primary vendor documentation beside the relevant sections. No universal
trace-length/skew, dielectric, impedance, capacitor or reach prescription is
inferred from an unrelated device. DDR includes a worked clock/data-rate example;
Ethernet separates MAC–PHY and MDI paths and identifies 8P8C pair groups; SerDes
covers channel/clock/coupling terminology; LVDS covers point-to-point termination,
common mode and topology limits. Tables scroll locally on mobile.

These are references, not standards-compliance calculators. They contain no
simulated eye diagrams or unsupported hardware pass/fail badges. Local checks
cover unique anchors, internal navigation and source-link presence; browser QA
covers representative layout, theme, and interactive calculators separately.
