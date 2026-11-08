# Manufacturer discharge-curve reference

Reviewed 2026-11-09. One strong, primary-source dataset is supplied rather than
substituting generic OCV curves or mirrored documents with uncertain provenance.

## Energizer AA/LR6 alkaline, 100 mA at 21 °C

Source: [Energizer, Alkaline Manganese Dioxide Handbook and Application Manual,
2018, page 11, Figure 12](https://data.energizer.com/pdfs/alkaline_appman.pdf#page=11).
The page is printed “Page 11 of 14”; it is also the 11th PDF page. Figure 12’s
subtitle specifies **100 mA constant-current discharge at 21 °C**. The figure
caption identifies the **0.8 V cutoff**. It describes a generic AA/LR6 alkaline
cell family, not an E91 SKU or a Duracell/Panasonic product. The manufacturer
states that the handbook does not constitute a performance warranty.

The actual graph was visually inspected from a 1600-pixel selected-page render
of the public manufacturer PDF. The orange loaded-voltage trace, not the nearby
capacity-versus-current bar chart, was read at coarse knots. No original graph
image or full copyrighted PDF is copied into the website. Facts and approximate
numeric graph readings are stored with attribution in
`assets/data/battery-discharge-references.json`.

The source x-axis is elapsed hours. Because the annotated test is constant
current, conversion is `discharged_Ah = 0.100 × elapsed_hours`:

| Plotted time, h | Delivered Ah | Loaded cell voltage, V (coarse read) |
| ---: | ---: | ---: |
| 0 | 0.00 | 1.60 |
| 1 | 0.10 | 1.45 |
| 2.5 | 0.25 | 1.37 |
| 5 | 0.50 | 1.32 |
| 7.5 | 0.75 | 1.27 |
| 10 | 1.00 | 1.25 |
| 12.5 | 1.25 | 1.22 |
| 15 | 1.50 | 1.19 |
| 17.5 | 1.75 | 1.16 |
| 20 | 2.00 | 1.10 |
| 21.5 | 2.15 | 1.04 |
| 22.5 | 2.25 | 0.98 |
| 23.5 | 2.35 | 0.87 |
| about 24 | about 2.40 | 0.80 |

Use approximately **±0.03 V and ±0.05 Ah as visual-reading bounds**, including
endpoint uncertainty. These are deliberately coarse reading allowances, not
statistical uncertainty, lot variation or guaranteed cell performance. The
starting point at t≈0 cannot resolve the immediate load-application transient.
Piecewise-linear interpolation between knots introduces additional unquantified
shape error; it does not recover the manufacturer’s underlying raw measurements.

### Source discrepancy preserved

The visible orange trace reaches 0.8 V at approximately **24 hours**, while the
explanatory paragraph below uses a rounded **25 hours / 2500 mAh** example. Its
1.2 V example likewise rounds to 15 hours / 1500 mAh. The provided knots follow
the plotted trace and do not stretch the x-axis to force the prose’s rounded
example. Do not advertise 2.4 Ah as an exact guaranteed capacity.

## Permitted interpretation in the calculator

- These are **loaded terminal voltages at 100 mA and 21 °C**, not open-circuit
  voltage or relaxed state of charge. The point at zero delivered Ah remains a
  graph-start value, not an independently established OCV.
- Direct interpolation is bounded to 0–approximately 2.4 Ah and the plotted
  0.8 V cutoff. A higher device cutoff will reduce usable capacity. Lower-cutoff
  predictions would extrapolate beyond this reference and must be rejected.
- With an explicitly **user-supplied** effective resistance R, a demonstration
  may form `Voc_estimate(Ah) ≈ Vtest(Ah) + 0.100 A × R`. Applying the same R and
  subtracting `0.100 A × R` reproduces the coarse reference curve by
  construction. This is an internal consistency check, not independent model
  validation or an OCV measurement.
- Subtracting another load’s `I × R` provides only an approximate scenario.
  Resistance, polarization, effective capacity, recovery and temperature depend
  on current and discharge history. The source itself discusses those effects
  on pages 7–10. Arbitrary-load results are not qualified by this dataset.
- No current rating, charge behavior, manufacturer interoperability or pack
  safety rating follows from a single discharge trace.

## Verification and artifact accounting

JSON syntax, finite numeric values, strictly increasing Ah knots, nonincreasing
voltage, zero-Ah start, and final 0.8 V cutoff were checked. All 14 knots satisfy
the structural constraints. The official source PDF was 423,648 bytes; only it
and a selected-page PNG were temporarily materialized for visual inspection.
They are outside the repository and are not website payloads. No dependencies,
large downloads or full-document image batch were created.

The older Energizer NH15-2300 manufacturer PDF link returned 404 during this
review. No NiMH or lithium reference curve was invented to fill that gap. Add
another chemistry only after its current primary manufacturer graph and exact
test conditions can be inspected.
