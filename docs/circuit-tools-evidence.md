# Published circuit calculator scope

The tools catalog contains 26 bounded analytical calculators and scenario models and four source-linked
interface cheat sheets. Restoring a tool means its stated model and representative
calculations have been reviewed; it does not mean the tool is measurement-correlated.
The prior three-tool-only catalog was too restrictive and has been superseded.
Unreviewed fragments remain in source and are excluded from GitHub Pages in
`_config.yml`; the loader accepts only registered tool IDs and files.

Review records:

- [Solar PV generation](pv-generation-review.md): supplied-data interval energy and monthly irradiation estimates.
- [Battery discharge analysis](battery-analysis-review.md): model equations, source-conditioned catalog, temperature/load scope and numerical checks.

- [Basic circuit and power tools](basic-tool-review.md): 13 reviewed, 11 restored.
- [RF and high-speed tools](rf-tool-review.md): 17 reviewed; five repaired calculators
  and the rebuilt Smith chart restored. Skin-depth replacement is covered below.
- [SMPS output-network and loop tuner](smps-tool-review.md): explicit models,
  equations, source links and numerical verification.
- [Remaining catalog review](remaining-tool-review.md): every other legacy entry,
  retained exclusions, narrowed replacements and new reference sheets.

| Tool | Equation basis | Checked cases | Limits |
| --- | --- | --- | --- |
| Ohm’s law | V = IR; P = VI | All six positive input pairs for 12 V, 2 A, 6 ohm, 24 W; changing an existing input; zero rejection; reopening | Positive finite scalar values, passive DC resistive model. No AC phase, nonlinear devices, tolerances or ratings. |
| Reactance | Xc = 1/(2 pi f C); Xl = 2 pi f L; fr = 1/(2 pi sqrt(LC)) | 1 kHz, 1 uF, 1 mH: 159.2 ohm, 6.283 ohm, 5.033 kHz; unit conversion and invalid values | Positive finite frequency, L and C. Ideal lumped elements; reactance magnitudes only. No ESR, self-resonance, losses or bandwidth prediction. |
| RC timing | tau = RC; fc = 1/(2 pi RC); charge time = -RC ln(1-p); discharge time = -RC ln(p) | 10 kohm, 100 nF: 1 ms, 159.2 Hz; 50% and 90% response; invalid values | Positive finite R and C; 0 < p < 1. Ideal first-order voltage step; no leakage, source impedance, nonlinear loads or tolerance analysis. |

Run `node --test tests/circuit-tools.test.cjs`. These tests execute the actual
inline calculator scripts with a small DOM fixture and compare displayed values
with analytic examples at the UI’s displayed precision. They check calculation
behavior, not browser rendering or correlation with hardware measurements.

All thermal simulators and harness builders remain out. Other excluded suites are
listed individually in the review records. Reintroducing another tool requires a
bounded model, traceable equations/data, numerical examples and lifecycle/UI checks.
The retired shared engines remain excluded; restored pages are self-contained or
use a dedicated reviewed engine. Tests for the changed catalog are:

`node --test tests/circuit-tools.test.cjs tests/basic-tools.test.cjs tests/rf-tools.test.cjs tests/smith-tools.test.cjs tests/smps-design-tools.test.cjs`
