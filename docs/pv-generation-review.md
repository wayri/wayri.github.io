# Solar PV generation tool — scope and evidence

Reviewed/rebuilt 2026-11-09. The default workflow is once again a fully local
map/location, solar-time power, monthly/annual energy and angle-search explorer.
Its geometric clear-sky scenario is explicitly separated from expected
weather-based yield. The supplied-data calculations remain in collapsed advanced
sections. Their four-interval fixture is labelled analytic, not site weather.

## Fully local location workflow

`assets/js/pv-location.js` reuses reduced coastline polygons already present in
the old site solar tool. The map is equirectangular and selects latitude/longitude
by pointer/tap, keyboard arrows or direct numeric inputs. It does not request
geolocation or depend on an API, map tile provider or external library.

Solar declination uses the fractional-year series in
[NOAA's general solar-position equations](https://gml.noaa.gov/grad/solcalc/solareqns.PDF).
Sun directions are represented in local east/north/up coordinates; array normal
uses tilt from horizontal and azimuth clockwise from north. The selected-hour
axis is **local apparent solar time**, with solar noon at 12:00, not civil clock
time. Longitude identifies the map point and optional provider request; it does
not alter a solar-time geometry curve or secretly assume a timezone.

The local irradiance scenario intentionally exposes its atmosphere assumptions:

- Extraterrestrial normal irradiance: `E0 = 1361 × [1 + 0.033 cos(2π day/year_days)]` W/m².
- For elevation above the horizon, `DNI = E0 × tau^(1/max(0.01,sin(elevation)))`.
  At/below the horizon all generated radiation is zero. Tau is a user-entered
  constant-atmosphere transmission assumption, not a calibrated local model.
- `DHI = diffuse_fraction × (E0 − DNI) × sin(elevation)`; the entered fraction
  returns part of the attenuated direct beam as horizontal diffuse radiation.
  Thus `GHI = DNI × sin(elevation) + DHI` does not exceed extraterrestrial
  horizontal irradiance for the permitted parameter bounds.
- Beam POA is `DNI × max(0, sun_direction dot panel_normal)`.
  [Isotropic sky diffuse](https://pvpmc.sandia.gov/modeling-guide/1-weather-design-inputs/plane-of-array-poa-irradiance/calculating-poa-irradiance/poa-sky-diffuse/isotropic-sky-diffuse-model/)
  is `DHI × (1+cos(tilt))/2`, while
  [Lambertian ground reflection](https://pvpmc.sandia.gov/modeling-guide/1-weather-design-inputs/plane-of-array-poa-irradiance/calculating-poa-irradiance/poa-ground-reflected/)
  is `albedo × GHI × (1−cos(tilt))/2`.
- Power applies the shared DC rating, Pmax coefficient, DC loss, inverter
  efficiency and AC clipping limit at an **explicit fixed cell temperature**.
  The advanced interval NOCT setting is not applied to this local scenario.

This is neither Hottel nor a weather-calibrated clear-sky model. No actual clouds,
aerosols, elevation/pressure, horizon, terrain, seasonal temperatures or shading
are supplied. The resulting annual number is prominently labelled **model
scenario energy, not expected site generation**. Reference equations defend its
geometry and arithmetic, not its predictive accuracy for a real site.

Daily power uses 15-minute midpoint integration. Monthly and annual energy sum
**every calendar day**, including leap day, with the same declared atmosphere.
The visible selected-month daily curve uses its 15th day. Changing time/month
redraws the relevant curve without recomputing the unchanged annual scenario.

The angle study evaluates tilt 0–90° in 5° steps and north-clockwise azimuth
0–345° in 15° steps, then refines ±5° tilt and ±15° azimuth at 1° around the best
coarse point. The starting design is also considered. Annual search uses each
month's 15th day weighted by its actual day count; selected-month search uses
that one representative day. It returns the **best searched scenario**, not a
global analytic optimum, expected-weather optimum or installation recommendation.
Scope/month/model changes invalidate the search result. Search and annual
calculations are bounded synchronous loops with no network calls.

## Optional weather-based provider result

The PVGIS workflow is collapsed and optional. A parameterized official
`api/v5_3/PVcalc` link requests `PVGIS-ERA5` data for the chosen coordinates,
DC kWp and a separate provider combined-loss allowance. Array azimuth is
converted from north-clockwise to PVGIS south-zero conventions. Users may ask
PVGIS to optimize both angles, which overrides explicit angle inputs.
[JRC API parameter definitions](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/api-non-interactive-service_en)
are linked as the contract. No frontend fetch wrapper, CORS workaround or
fabricated fallback is installed.

Imported fixed-mount PVcalc JSON must have all 12 unique numeric months, finite
nonnegative monthly/annual energies, actual source coordinates/rating/angles,
database and integer weather-year metadata, and its provider system-loss
allowance. Monthly sum must agree with annual energy within max(1 kWh, 1%) to
allow provider rounding. Malformed/partial imports clear the old provider result.
Imported coordinates and optimized-angle flags come from the file, not the
requested scenario. Its energy chart/result remains separate and is **never
multiplied again** by local loss, temperature or POA factors. Editing local
controls does not recompute provider data. File authenticity remains user stated;
schema checks do not authenticate its publisher. Evidence JSON retains the raw
parsed response, returned provenance and local scenario separately.

## Supported calculation

For each interval:

1. `Pref = DC_kWp × POA_W_m2 / 1000`.
2. `Ptemp = Pref × [1 + (gamma_pct_per_C / 100) × (Tcell_C − 25)]`.
3. `Pdc = Ptemp × (1 − other_DC_loss_pct / 100)`.
4. `Pac_available = Pdc × inverter_efficiency_pct / 100`.
5. `Pac = min(Pac_available, inverter_AC_limit_kW)`.
6. Integrate each power as `kW × duration_h`, producing kWh.

The DC temperature/irradiance model follows the linear nameplate relationship
described by the [NREL PVWatts v5 manual](https://research-hub.nlr.gov/en/publications/pvwatts-version-5-manual/).
This implementation is **not the complete PVWatts model**: inverter efficiency is
a user-entered constant and clipping is an explicit AC ceiling. No IV curve,
MPPT-window, low-load inverter, spectral, bifacial or thermal dynamic model is
claimed. POA is already oriented irradiance; no extra tilt/cloud multiplier is
applied. Loss allowances must exclude losses already represented in the input.

Supplied effective cell temperatures are preferred. The optional NOCT-linear
screening approximation is `Tcell = Tamb + (NOCT − 20) × POA / 800`. It omits wind,
mounting and thermal inertia and is not a calibrated thermal simulation. The
[Sandia PVPMC fuller NOCT model](https://pvpmc.sandia.gov/modeling-guide/2-dc-module-iv/cell-temperature/noct-cell-temperature/)
includes additional corrections not implemented here. Optional wind input is
preserved and explicitly reported as unused rather than silently claiming it
affects temperature.

## Input and time contract

- CSV relative schema: `time_h,duration_h,poa_w_m2,ambient_c,cell_c`.
  `start_h` is an accepted alias for `time_h`, but cannot coexist with it.
- CSV absolute schema: `start_iso,end_iso,poa_w_m2,ambient_c,cell_c`.
  ISO timestamps require `Z` or an explicit UTC offset. Naive local times and
  invalid dates are rejected. Calendar completeness and selected days use UTC.
- `cell_c` is required in supplied-temperature mode; `ambient_c` in NOCT mode.
  `wind_m_s` is optional. Header names are case-insensitive. Unknown/duplicate
  headers and differing column counts are rejected.
- Rows are constant interval means with explicit boundaries. No final duration
  is inferred, no instantaneous samples are silently integrated, and no missing
  weather is synthesized. Imported provider data must first be converted using
  its documented timestamp/radiation semantics.
- Overlapping/nonchronological intervals, duplicate starts, nonpositive duration,
  nonfinite or negative irradiance, and invalid system inputs are rejected.
  Durations are 1 second–168 hours; at most 25,000 rows and 2 MB input.
- Gaps are reported, excluded from energy and never filled. Coverage is the sum
  of supplied intervals. A gap-free Jan 1 through next Jan 1 UTC series is needed
  for an interval annual total. Relative/partial histories are not annualized.
- The local browser import has no weather API or network dependency. The
  user-stated source/provenance is retained in an evidence JSON export alongside
  system inputs, raw CSV and calculated rows; it is not independently certified.
  A separate result CSV contains interval powers, temperatures, durations and
  integrated energy. Neither export occurs without clicking its button.

## Monthly screening mode

Each month uses the entered mean daily **POA** irradiation in kWh/m²/day, exact
calendar days and an irradiance-weighted representative cell temperature:

`Eac_before_clipping = DC_kWp × POA_daily × days × temperature_factor × (1 − DC_loss) × inverter_efficiency`.

The monthly temperature is explicit and does not use NOCT from a daily aggregate.
All 12 months are required before displaying an annual estimate; blank months
remain unknown. Entered-month subtotals are labelled partial. Monthly irradiation
cannot reconstruct clipping or intra-day temperature, so clipping remains
unknown and monthly/annual outputs are explicitly **before clipping**.

[JRC PVGIS documentation](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/pvgis-5-tools/grid-connected-pv_en)
defines `H(i)_d` as daily POA irradiation in kWh/m²/day. Users may obtain
site/orientation/database-specific values there and transfer them explicitly.
No sample weather or provider-failure fallback is supplied by this tool.

## Actual verification

`node --test tests/pv-generation.test.cjs` executes the implementation and checks
STC, night, temperature coefficient, loss/efficiency/clipping, exact energy
integration for irregular intervals, gap accounting, UTC-offset conversion,
overlap/missing-duration/invalid-input rejection, loss-ledger conservation,
leap-year month lengths, incomplete annual rejection, a complete UTC reference
year and mocked-DOM mounting/reopening/stale-result handling. Analytic fixtures
establish arithmetic contracts, not measured yield prediction accuracy. Browser
visual checks and actual-site weather/measurement comparisons are separate.

`node --test tests/pv-location.test.cjs` additionally checks equinox/solstice and
polar geometry, morning/evening orientation, horizontal POA = GHI, the
extraterrestrial horizontal energy bound, an independent cosine-integral daily
energy reference and timestep refinement, clipping/fixed-temperature effects,
calendar/leap totals, bounded hemisphere-aware angle search, PVGIS request
coordinates and azimuth conversion, complete/consistent provider import and
negative cases, plus mocked-DOM local map pointer/keyboard interaction, search,
apply and invalid-input clearing. Test provider responses are schema fixtures,
not represented as actual downloaded weather results.
