# RF and high-speed calculator review

Reviewed against the actual HTML/script implementations on 2026-11-09. Equation
checks establish a bounded analytical calculation, not a measured board model.
All restored fragments are self-contained; reopening their scripts is exercised.

| Tool | Decision and exact basis |
| --- | --- |
| RF unit translator | Restore. dBm/dBW power references, dBV/dBµV/dBu voltage references and P = Vrms²/R. Removed field-strength wording; sine-wave peak conversion only. Rejects empty, nonfinite, negative linear quantities and nonpositive resistance; zero power gives −infinity dB. |
| Friis transmission | Restore. FSPL = 20 log10(4πdf/c), c = 299792458 m/s; received dBm = transmitted dBm + antenna gains − FSPL − explicit system loss. Far-field free space and matched polarization only. Does not predict real coverage. |
| Cascade noise figure | Restore after fixing missing stage-1 DOM wrapper and the skipped-middle-stage bug. Friis cascade in linear factors/gains for matched same-frequency linear stages; passive loss assumes physical temperature 290 K. Does not model mixers or compression. |
| PDN target impedance | Restore as a voltage-budget ratio, not a decoupling design. Ztarget = allocated dynamic droop / actual entered current step. Removed implicit 50% current assumption and arbitrary 100 MHz capacitor estimate. |
| Attenuator | Restore only equal-real-impedance Pi and Tee networks. Standard matched resistive equations; resistor dissipation calculated from loaded node voltages/currents. Removed unequal-impedance and bridged-T/L-pad modes with inconsistent power calculations. No RF bandwidth, tolerance or component rating claim. |
| Skin effect | Restore only after narrowing to skin depth and DC resistance (handled in the catalog integration). Removed ad hoc AC-resistance interpolation and radius-as-skin-depth at DC. No AC current rating or conductor temperature prediction. |
| Insertion loss | Defer. Conductor loss uses an unqualified 0.1 sqrt(f)/(W/5) rule; neither roughness nor actual return geometry is represented. Not an S-parameter calculation despite its title. |
| Basic impedance calculation | Defer. Mixes IPC-style log fits with an explicitly demonstration-only CPW expression; lacks valid geometry/range checks and masks invalid inputs with defaults or zero. |
| Differential impedance | Defer. Legacy microstrip/stripline fits lack documented applicability bounds; effective permittivity and delay are inconsistent approximations. Invalid geometry can be clipped to zero impedance. Needs a separately bounded implementation. |
| Stackup solver | Defer. Inverts the same uncontrolled log/exponential fits, offers protocol presets as general requirements, and binary search can return a boundary even when a requested solution is infeasible. |
| Crosstalk estimator | Defer. NEXT = 1/(1+(D/H)²); FEXT uses an explicitly heuristic 0.1 multiplier and dimensional L/Tr ratio. Not defensible as a percentage prediction. |
| Comprehensive via | Defer. Lumped impedance misses the nH/pF conversion factor; current uses an unqualified ×1.5 multiplier and trace-fit thermal assumptions. Thermal output remains excluded. |
| Via impedance | Defer. Unit conversion is consistent, but a lumped LC ratio is presented as via impedance/delay without geometry applicability or extracted-field comparison. |
| High-speed design | Defer. Useful delay/quarter-wave equations coexist with unqualified 3W/5W spacing guidance; global event dependency and fallback input masking need cleanup. Source-specific DDR/Ethernet/SerDes/LVDS sheets are a better replacement. |
| Smith chart | Rebuilt and restored. Self-contained bilinear Z↔Γ mapping, passive reflection circle, mirrored normalized-admittance grid, VSWR/return loss/reflected-power readouts, click-to-select load, and editable series/shunt R/L/C matching. Frequency recalculates ideal component reactances; load remains an explicitly entered fixed complex impedance. No real transmission-line, parasitic or measured-frequency behavior claim. |
| RF signal suite | Defer. Large shared visualization suite includes unexplained Eb/N0 lookup values, arbitrary EVM noise scaling, malformed 32-QAM geometry and mismatched decision-grid keys. Sound pieces need separation from unsupported estimates. |
| Balun calculator | Defer. Topology diagrams and current-balun/common-mode claims need circuit validation; 1:9 uses a simplified 1:1 diagram. Ideal turns/impedance ratios alone do not defend bandwidth or power capability. |

## References and verification

- [ITU-R P.525, free-space attenuation](https://www.itu.int/rec/R-REC-P.525/en).
- [Analog Devices, system noise-figure analysis](https://www.analog.com/en/resources/technical-articles/system-noisefigure-analysis-for-modern-radio-receivers.html), including the distinction between linear cascades and mixers.
- [TI SWPA222A, PDN analysis](https://www.ti.com/lit/an/swpa222a/swpa222a.pdf), section 4. This tool uses an explicit current step instead of treating that document’s particular 0.5 × maximum-current assumption as universal.

`node --test tests/rf-tools.test.cjs` executes the actual fragment scripts.
Coverage includes reference values, unit conversions, zero where meaningful,
empty/nonfinite/out-of-domain inputs, stage skipping, reopened fragments and
independent loaded-network calculations for Pi/Tee input match, attenuation,
per-resistor power and conservation of power. Browser layout and measured RF
performance are separate checks.

`node --test tests/smith-tools.test.cjs` additionally checks match/short/reactive
limits, the Analog Devices 100+j50 Ω → Γ = 0.4+j0.2 example, round trips across
100 passive impedance/reference combinations, known SWR/return-loss ratios,
series reactance cancellation, an independently derived shunt-C match, changed
frequency, resistor networks and invalid input rejection. The drawing samples
the same complex transformations; the trajectory is the actual intermediate
series impedance or shunt admittance path rather than a straight line.

Smith chart reference: [Analog Devices, impedance matching and Smith chart impedance](https://www.analog.com/en/resources/technical-articles/impedance-matching-and-smith-chart-impedance-maxim-integrated.html).
