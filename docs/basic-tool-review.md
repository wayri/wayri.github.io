# Basic and power tool review

Reviewed the actual calculator fragments, equations, displayed claims and loading
behavior. Restored tools are analytic arithmetic aids, not measurement-correlated
hardware models. All are self-contained inline scripts; no retired shared engine
or special initializer is required. Each script runs inside a local closure and
exports only its UI handlers, so repeat navigation cannot redeclare lexical state
or replace another tool’s generic formatting helper.

| Fragment | Decision and model scope | Corrections and evidence |
| --- | --- | --- |
| resistor-divider | Restore: loaded DC resistor divider | Replaced the previous shared-script-dependent UI and package-size guesses with an explicit load resistance. Checks 12 V / 1 kohm / 1 kohm gives 6 V open circuit, 4 V with a 1 kohm load; resistor loss checks and invalid values. |
| e-series-finder | Restore: nearest preferred nominal value | Uses actual E12/E24/E96 tables, not generated geometric rounding; searches adjacent decades. 4850 selects E24 4700 and E96 4870; 99 selects E12 100. Series membership does not guarantee a component tolerance. |
| smd-resistor | Restore: common nominal code decoder | Rejected malformed decimal strings, fixed R047 decoding, restricted ambiguous multiplier aliases, removed claims that nominal codes establish tolerance. Checks 103, 1002, R047, 4R7, 01C and 000 plus malformed input. |
| led-resistor | Restore: constant-Vf DC series resistor estimate | Requires positive finite current/voltages and integer LED count. E12 rounds upward rather than choosing a lower value that exceeds target nominal current. The 2× example power rating is explicitly arithmetic, not a thermal/safety result. Checks 5 V, 2 V, 20 mA gives 150 ohm and 60 mW, upward rounding and invalid current. |
| 555-timer-calc | Restore: ideal astable/monostable timing | Uses ln(2) charge/discharge and ln(3) monostable equations consistently; frequency now equals reciprocal computed period. Invalid R/C clears results. Checks 1 kohm/1 kohm/1 uF gives 480.9 Hz, 66.7% duty; monostable 1.099 ms. Real IC/component tolerances remain outside scope. |
| current-sense-amp | Restore: ideal shunt/amplifier/ADC scaling | Three solve paths checked for 10 A, 50 mV, 3.3 V: 5 mohm, gain 66, 0.5 W, 2.44 mA per 12-bit code. Nonfinite/nonpositive inputs clear result fields. Added explicit output-headroom, common-mode, noise and tolerance exclusions. |
| battery-life-estimator | Restore in narrower form: usable-capacity/mean-current estimate | Removed chemistry presets and an unsupported annual aging curve. User supplies usable capacity and active/sleep current with duty. 2000 mAh, 100 mA, 10% active and zero sleep gives 200 h. No safety or aging prediction. |
| battery-pack-s-p-config | Restore in narrower form: series/parallel arithmetic | Removed generic chemistry current/resistance presets, fixed cell-mass assumption, automatic sizing policy and “fully safe”/“thermally balanced” verdicts. User supplies identical-cell nominal data. 4S2P, 3.6 V/3 Ah cells gives 14.4 V/6 Ah/86.4 Wh; 5 A and 20 mohm/cell gives 1 W lumped resistive loss. No cell/BMS qualification. |
| grid-power-calc | Restore: sinusoidal single-phase/balanced three-phase power | Corrected displayed three-phase capacitance to **each delta branch** and its formula. Rejects invalid PF instead of silently clamping. 400 V line-to-line, 10 A, PF 0.8: 6.93 kVA, 5.54 kW, 4.16 kvar; unity correction at 50 Hz needs 27.6 uF per delta branch. No distortion-PF, harmonics or resonance analysis. |
| hydro-power-calc | Restore: steady-flow power balance | Explicit net head and supplied turbine/generator efficiencies, water density 1000 kg/m³, g 9.81 m/s². Rejects efficiencies outside (0, 100%]. 10 m, 1 m³/s, 80% turbine and 90% generator gives 70.63 kW. No turbine selection, annual yield or hydraulic-loss solver. |
| unit-converter | Restore: stated SI factors and log references | Blank/nonfinite input and temperature below absolute zero no longer produce plausible zero outputs. Nonpositive linear-to-log cases produce no result. Removed an unrelated impedance conversion explanation. Checks inch/mm, Wh/J, Celsius/Fahrenheit, dBm/W and dBmV/V. BTU and horsepower conventions are stated. |
| opamp-calc | Keep out in its current form | Actual code uses closed-loop signal gain rather than noise gain to infer bandwidth for every topology; transient plots multiply inputs by static gain and clip at an arbitrary 0.5 V rail margin. Several “real” inputs do not define a traceable amplifier model. A future separate ideal-gain calculator could be restored after removing the broader simulation claims. |
| smps-topology-ratio | Keep out in its current form | The UI offers isolated topologies that reach a generic buck-boost/SEPIC fallback. The flyback branch mixes target-duty transfer-ratio and triangular-current assumptions without selecting/qualifying CCM/DCM. Stress outputs apply undocumented 1.2×/1.3× multipliers and generic current/capacitor equations across modes. Needs topology-specific model contracts and reference comparisons. |

## Primary references

- [Vishay standard electronic decade value tables](https://www.vishay.com/docs/31001/dectable.pdf): published preferred-value tables used by the lookup.
- [TI LM555 datasheet](https://www.ti.com/lit/ds/symlink/lm555.pdf): astable and monostable timing circuits; this calculator evaluates the ideal threshold ratios rather than treating the displayed values as actual IC accuracy.
- [NIST SI conversion factors](https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8): conversion conventions. Some legacy non-SI factors are rounded to the displayed precision; the electronvolt uses the current exact elementary-charge value.

## Verification

`node --test tests/basic-tools.test.cjs` executes the actual fragment scripts with
a minimal DOM fixture: 12 tests cover representative numeric outputs, negative or
zero/domain-invalid inputs, successive solve paths and repeated mounting. Passing
these checks establishes only the stated analytic behavior and script lifecycle;
it is not hardware correlation or a browser visual check.
