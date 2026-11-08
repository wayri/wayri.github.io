# Published circuit calculator scope

The tools catalog intentionally contains only three ideal-circuit calculators.
Other calculator fragments are retained as source but excluded from GitHub Pages
in `_config.yml`. They have no catalog entry or supported loading route.
This review does not qualify those retired implementations.

| Tool | Equation basis | Checked cases | Limits |
| --- | --- | --- | --- |
| Ohm’s law | V = IR; P = VI | All six positive input pairs for 12 V, 2 A, 6 ohm, 24 W; changing an existing input; zero rejection; reopening | Positive finite scalar values, passive DC resistive model. No AC phase, nonlinear devices, tolerances or ratings. |
| Reactance | Xc = 1/(2 pi f C); Xl = 2 pi f L; fr = 1/(2 pi sqrt(LC)) | 1 kHz, 1 uF, 1 mH: 159.2 ohm, 6.283 ohm, 5.033 kHz; unit conversion and invalid values | Positive finite frequency, L and C. Ideal lumped elements; reactance magnitudes only. No ESR, self-resonance, losses or bandwidth prediction. |
| RC timing | tau = RC; fc = 1/(2 pi RC); charge time = -RC ln(1-p); discharge time = -RC ln(p) | 10 kohm, 100 nF: 1 ms, 159.2 Hz; 50% and 90% response; invalid values | Positive finite R and C; 0 < p < 1. Ideal first-order voltage step; no leakage, source impedance, nonlinear loads or tolerance analysis. |

Run `node --test tests/circuit-tools.test.cjs`. These tests execute the actual
inline calculator scripts with a small DOM fixture and compare displayed values
with analytic examples at the UI’s displayed precision. They check calculation
behavior, not browser rendering or correlation with hardware measurements.

Retired tools include all thermal calculators, magnetics/converter designers,
RF suites, PCB screening tools, motor/grid/battery simulations and the harness
designer. Reintroducing a tool requires a separately reviewed model scope,
traceable equations or data, representative numerical checks and UI checks.
