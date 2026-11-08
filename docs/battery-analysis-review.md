# Battery discharge analysis

The restored `tool-battery-suite` is an explicit scenario model, not the former
generic chemistry/aging-curve suite. It supports primary and rechargeable battery
references, but models discharge only. It does not predict cycle life or provide
a charging prescription.

## Inputs and equation contract

- One consistent cell or battery-unit basis: reference Ah, supplied relaxed OCV
  versus SOC, effective DC resistance, cutoff, series/parallel counts and optional
  discharge current limit. Identical units are assumed. A 12 V monobloc can be one
  modeled unit if all its parameters are block-level.
- Sequential repeating segments of constant terminal current, output power or
  terminal resistance. Segment durations are seconds; optional battery temperature
  overrides the default for that segment.
- Pack OCV is unit OCV × series; pack R is unit R × series/parallel. For a current
  load, V = Voc − IR. For a resistor, I = Voc/(Rpack + Rload). For a constant-power
  output, solve Pout/η = I(Voc − IR) using the low-current quadratic root. Demand
  beyond the model's maximum power or supplied current limit ends service.
- Converter efficiency applies only to output-power segments. Current and
  resistance segments are already battery-terminal loads.
- Supplied SOH scales capacity once. Supplied daily self-discharge is modeled as
  exponential charge loss; neither value is inferred from a chemistry label.

## Temperature and retained charge

Reference charge Q remains a conserved state across temperature changes. With
capacity factor f in (0,1], the lower inaccessible charge window is Qnom(1−f),
and accessible SOC = [Q − Qnom(1−f)]/(Qnom f). Resistance is scaled by the entered
temperature R factor. Temperature is prescribed, not calculated from heating.
The reference capacity must bound the temperatures being modeled. No curve
extrapolation occurs.

Cold-limited service can end with reference charge retained. That is reported as
a temperature-capacity limit, not chemical exhaustion. The simulation stops at
the first service failure; it does not pretend the load continued until a later
warm interval. OCV-temperature shifts, recovery, nonlinear polarization and
Peukert/rate-dependent capacity are not represented by this screening model.

## Catalog and reference evidence

The manufacturer catalog contains 57 representative identities across 17 brand
labels. It includes Eveready India and Energizer's Eveready as distinct identities,
Duracell, Nippo, Panasonic, Energizer, GP, VARTA, Maxell, Renata, Saft, Murata,
Molicel, Lithium Werks/A123, GS Yuasa, CSB and Trojan. Ratings carry available
test conditions; unknown capacity/voltage/test conditions remain null. It is not
a complete global catalog or a purchasing recommendation.

See [profile evidence](battery-profile-evidence.md) for primary sources. Catalog
entries do not automatically provide OCV, DC R or temperature-model coefficients.
Selecting a manufacturer reference clears these fields so the previous
illustrative model cannot silently become a product-specific prediction.

Two optional Energizer generic AA alkaline capacity-temperature references are
coarse readings from a manufacturer handbook, with explicit test currents, cutoff,
temperature span and reading uncertainty. They are not specific E91 calibration.
Adoption replaces reference capacity/cutoff and temperature data; a constant R
factor remains an explicit assumption unless independently supplied. Published
pulse resistance and 1 kHz impedance are not silently copied as DC R.

One [loaded-discharge reference](battery-discharge-reference-evidence.md) provides
14 coarse manufacturer graph readings for generic AA/LR6 at 100 mA, 21 °C and
0.8 V cutoff. Explicit adoption uses the user's R to estimate
Voc ≈ Vloaded + Itest R. This reproduces the reference-current loaded curve within
graph-reading/numerical precision; it is not measured relaxed OCV or validation
at other currents or temperatures. The source's approximately 2.4 Ah plotted
endpoint and rounded 2.5 Ah prose example remain distinguished.

The initial Li-ion curve, cold-load example and ideal-voltage option are clearly
labelled assumptions. None is advertised as a manufacturer fit. JSON exports
retain selected source metadata, model provenance, config, limits and result.
CSV exports contain the sampled numerical trace.

## Numerical and UI checks

`node --test tests/battery-analysis.test.cjs tests/battery-analysis-ui.test.cjs`

Independent analytic checks cover constant current, resistance and power;
pack scaling; voltage cutoff; cyclic loads; current/power infeasibility;
temperature/charge conservation; self-discharge; integration refinement; and
time/step bounds. In particular, a 1 Ah OCV=3+SOC V model stores 3.5 Wh; a 2 W
output at 80% efficiency delivers 2.8 Wh in 5040 s with no internal R.

The UI fixture executes the actual scripts and fragment. It checks model
initialization, source filters, clearing unknown product data, source-curve
adoption, temperature examples, plot switching and stale-result clearing.
Browser checks separately verify actual loading, interactions, mobile layout and
the gold-dark/blue-light theme. Passing software checks is not cell validation.

Integration is bounded to 100,000 steps and 1600 plotted/exported points in the
UI. Fractional cutoffs are located within the final step; horizon/step-limited
runs report lower bounds. Sampled traces may omit some short-pulse detail even
though integration extrema/energy are accumulated at integration steps.
