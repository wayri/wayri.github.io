# Inverter DC copper demonstration

This is an executed WayriCAD Quick PI calculation on the exact saved public
inverter PCB, not a generated gradient or a measured result. The static image
renders values from the solved triangular finite-element mesh. The browser
overlay imports the computed data and does not run a solver in the visitor's
browser.

## Source and operating conditions

- PCB: `3PD+IB.kicad_pcb`, public source revision
  `283f41b65c193abcc7e63c8c919dacdbccc89829`.
- Exact SHA-256:
  `09bc4def38e6d866ee38c2ba4f87c349945c3514a4f3b3195c14b89e530fa75d`.
- Selected net: **Vdc**, source **J10.1**, load **Q4.2**.
- A normalized **1 A** constant-current load and **1 V** source reference are
  explicitly assigned. The public README documents a 500 W board but provides
  no complete source/load operating point. These inputs do **not** represent
  the inverter's operating voltage, output current, or 500 W performance.
- Saved F.Cu and B.Cu thickness: **35 µm** each, taken from the board stackup.
  Copper is modeled at **20 °C**, with resistivity **1.724 × 10⁻⁸ Ω m**.
  Plating thickness is an explicit **25 µm assumption**.
- The saved pad contact polygons form ideal equipotential electrodes. No
  additional contact radius or contact resistance is invented.

## Model and executed verification

The production Quick PI mesher extracts saved copper tracks, pads, filled zones,
holes, and plated barrels. The linear 2.5D DC conductivity FEM solves both copper
layers together; the displayed field is F.Cu. Package resistance, semiconductor
switching, loaded return paths, AC impedance, temperature feedback, and thermal
fields are outside this study.

| Mesh edge | Nodes | Triangles | Source-to-load drop | Copper loss |
| --- | ---: | ---: | ---: | ---: |
| 2 mm | 10,256 | 15,202 | 7.861494 mV | 7.861494 mW |
| 1 mm | 21,786 | 38,262 | 7.911853 mV | 7.911853 mW |
| 0.5 mm | 63,369 | 121,428 | 7.936776 mV | 7.936776 mW |

The final two total-drop changes are **0.6365%** and **0.3140%**. The final
source/load current mismatch is **1.11 × 10⁻¹⁶ A**, maximum nodal residual is
**9.88 × 10⁻¹¹ A**, and relative power-balance error is **2.19 × 10⁻¹⁶**.
An independent 10 × 5 × 0.035 mm rectangular conductor test using the same
production solver agrees with `R = ρL/(wt)` within a **10⁻⁹ relative tolerance**.

These checks support numerical execution and total-drop stability for this
declared model. They do not establish physical accuracy or board qualification.
The final local peak current-density change is **16.29%**, so local hotspots
are **not mesh converged** and are not presented as conductor ratings.

## Display mapping

`inverter-real-dc.png` colors the mean solved voltage drop on every F.Cu triangle
of the final mesh, with a fixed 0–8 mV color scale. Source and load markers use
their saved pad centers.

`inverter-real-dc.json` contains 424 conservative 2 mm sample squares per field.
Squares crossing copper/hole boundaries are omitted; no values are extrapolated
onto empty board area. Voltage uses barycentric interpolation in an actual FEM
triangle; current density uses the containing element's solved value. The
reported maxima come from the full solution, not the sampled overlay.

## Reproduction

Use an existing Python environment containing KiCad 10 native `pcbnew`, NumPy,
SciPy, VTK, and matplotlib; no package installation is performed by the script.
From the portfolio repository:

```text
python -B tools/compute-inverter-dc.py --quickpi-root /path/to/WayriCAD
```

The script preserves the PCB, verifies its exact hash, solves 2/1/0.5 mm meshes,
executes the analytical reference and conservation assertions, and regenerates
the dataset, report, and figure. Per-module solver hashes and runtime versions
are recorded in `inverter-real-dc-report.json`. The run creates less than 1 MiB
of published assets and requires no build or new environment.
