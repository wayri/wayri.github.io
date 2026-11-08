# SMPS output-network and measured-loop tuner review

The previous tool is replaced because its Bode drawing was a shaped illustration,
not the response of a supplied circuit or a measured loop. Damping extracted from
an arbitrary load transient does not establish a general SMPS phase margin.
No earlier automatic component tuning or stability verdict is retained.

## Supported models

| Panel | Basis | Output scope |
| --- | --- | --- |
| Capacitor resonance | Per-part series RLC, Z = ESR + jωESL + 1/(jωC); identical parts in parallel; banks combine through complex admittance | SRF, bank impedance versus frequency and sampled local peaks. Positive ESR/ESL and integer quantities required. No board/plane/common mounting inductance. |
| Output-capacitor sizing | Ideal buck CCM ΔIL = Vout(1−Vout/Vin)/(Lfs); triangular ripple budget ΔV ≈ ΔIL/(8fsC)+ΔIL·ESR; IC,rms = ΔIL/√12 | Effective capacitance requirement after ESR budget, not a part recommendation. Ripple sizing is suppressed outside CCM or above any bank SRF. Even below SRF, the lumped-capacitor estimate excludes resonance dynamics. |
| Load increase budget | Full current deficit for user-supplied duration: ΔV ≈ ΔI·t/C + ΔI·ESR + ESL·ΔI/tedge | A first-order budget, not exact response. No inferred loop recovery, negative load step, saturation or ringing. Mixed-bank ESR is the low-frequency effective value Σ(nC²ESR)/(ΣnC)²; ESL is the high-frequency parallel limit. These separate asymptotic contributions are not a full multi-branch transient solution. |
| Loaded LC filter | Source → (Rseries + jωL) → (Rload ∥ capacitor bank); H = Zshunt/(Rseries + jωL + Zshunt) | Absolute voltage gain and phase, sampled peak, gain at switching frequency, DC divider gain. Resistive load, constant lumped parameters, no magnetic/geometry model or converter-loop stability claim. |
| Measured-loop adjustment | Supplied unwrapped open-loop data multiplied by K(1+jf/fz)/(1+jf/fp) | Hypothetical lead/lag gain and phase; interpolated 0 dB crossings and PM = 180° + phase. No extrapolation, automatic pass/fail, general stability conclusion or compensator component synthesis. |

All sweeps use 501 logarithmic points. Sampled extrema can miss a narrow
resonance; the UI states that limitation and exposes sweep limits. Loop data
must use strictly increasing frequencies and the negative-feedback return-ratio
phase convention. Multiple crossings and phase branch selection require a
complete loop/Nyquist review; phase margin alone is not a stability certificate.

## Sources

- [Analog Devices: Buck Power Stage Design Equations](https://www.analog.com/en/resources/app-notes/buck-power-stage-design-equations.html)
- [TI: Input and output capacitor considerations](https://www.ti.com/document-viewer/lit/html/SSZTAL7/GUID-3EDE487C-5BCB-45E3-8940-52FAA90331EA)
- [Analog Devices MT-101: Decoupling Techniques](https://www.analog.com/media/en/training-seminars/tutorials/MT-101.pdf)

Complex impedance and lead/lag calculations are explicit algebra, not a claimed
validated regulator-control synthesis method. The UI keeps effective C,
temperature/DC-bias effects, actual ESR/ESL, capacitor ratings and the controller’s
approved output-network region as required design inputs/review items.

## Executed checks

`node --test tests/smps-design-tools.test.cjs`: 8 tests passed.

- Series RLC SRF and ESR at resonance; identical parallel scaling.
- Mixed-bank admittance and an independently calculated anti-resonance case.
- 12 V → 6 V, 10 µH, 100 kHz buck: 3 A p-p ripple; 100 µF and 20 mΩ
  produce 37.5 mV capacitive + 60 mV ESR ripple.
- 1 A deficit for 10 µs and 100 ns edge: 100 mV C + 20 mV ESR + 10 mV ESL.
- CCM and SRF applicability flags; no-budget and invalid-input handling.
- Capacitance-weighted mixed-bank low-frequency ESR.
- Loaded filter response against an independently rearranged real/imaginary
  transfer expression, including its low-frequency divider limit.
- Neutral and phase-lead loop adjustments; exact and log-interpolated crossovers;
  no crossing, duplicate frequency, invalid data and finite sweep limits.
- Mounting against actual fragment IDs, SVG creation, result clearing on invalid
  input and repeat-safe script evaluation/mounting.

`node --check assets/js/smps-design-tools.js` passed. DOM tests are lightweight
fixtures, not a browser visual test or hardware correlation.

## Integration

Keep the catalog ID `tool-smps-loop-tuner`, filename `smps-loop-tuner.html`, label
“SMPS Output Network & Loop Tuner”. The fragment loads
`/assets/js/smps-design-tools.js?v=1` and calls `SMPSDesignTools.mount(...)`.
It needs no retired shared tools engine or lifecycle initializer.
