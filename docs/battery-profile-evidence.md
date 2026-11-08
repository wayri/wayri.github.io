# Battery catalog and temperature-reference evidence

Reviewed 2026-11-09. The published data file is
`assets/data/battery-presets.json`, schema version 1. It contains **57 representative
manufacturer-listed identities across 17 brand labels**, not every SKU sold
worldwide and not a recommendation to purchase or use a particular cell.

## What a preset establishes

The catalog separates part identity and a stated capacity rating from the inputs
needed by an OCV-plus-resistance discharge model. All 57 profiles deliberately
have `ocv: null`, `resistanceOhm: null`, `temperature: null`, and `modelReady:
false`. No generic discharge curve has been attached to a branded product.

`capacityAh` is copied only when a manufacturer source supplies a numerical
nominal, typical, average or minimum rating. The separate `capacityKind` and
`capacityTest` describe that value. Missing conditions remain null. A null is
**unknown**, not zero and not permission to reuse the previous preset's data.
`ratingConditionsComplete` means the selected rating has a current/load, cutoff
and reference temperature recorded; it does not mean the cell model is complete
or validated for a user's load profile.

Several manufacturer product pages state only chemistry, size and model name.
Their capacity, voltage or test conditions remain unset when those values were
not transcribed from an inspected primary source. A user's explicit value can
fill a modeling assumption, but it must remain labelled as that user's input.
Do not replace missing Ah with another brand's number, or nominal voltage with
an OCV-versus-SOC curve.

## Manufacturer source coverage

| Brand / models represented | Recorded scope and source |
| --- | --- |
| Energizer E91 AA alkaline | [Current E91 manufacturer PDF](https://energizer.com/wp-content/uploads/2025/01/e91_max_na.pdf), E91NA0323. Nominal 1.5 V; graph conditions 21°C, continuous drains to 0.8 V. Ah remains unset because a universal single capacity would hide drain dependence. The obsolete `data.energizer.com/pdfs/E91_Max_NA.pdf` returned 404; the current source replaces it. |
| Energizer L91 AA Li/FeS₂ | [Official 2024 OEM sheet](https://energizer.com/apac/wp-content/uploads/sites/18/2024/07/Energizer-OEM-Lithium-L91-Sell-Sheet-CN-EN%202024.01.pdf). 1.5 V identity; load/temperature graphs, not an OCV table. No single Ah selected. |
| Eveready 1215, Energizer identity | [1215 manufacturer datasheet](https://data.energizer.com/pdfs/1215.pdf): average 1.1 Ah at 25 mA continuously, 21°C, 0.8 V cutoff. This is distinct from the Indian Eveready products below. Its resistance table uses a 750-ohm background, 4-ohm pulse and one-second pulse duration; it is not silently used as continuous DC resistance. |
| Eveready Industries India carbon-zinc 1015/1012/1005/1002; Ultima 2015/2012 and Ultima Pro 2115/2112/2135/2150/2116 | [Manufacturer catalog](https://www.eveready.in/products/batteries/), [Ultima model list](https://www.eveready.in/products/batteries/ultima-alkaline-batteries/eveready-ultima-alkaline-batteries/) and [Ultima Pro model list](https://www.eveready.in/products/batteries/ultima-alkaline-batteries/eveready-ultima-pro-alkaline-batteries/). AA/AAA/C/D/9 V identities and chemistry; no Ah test data supplied. Marketing lifetime multipliers are not converted to capacity. |
| Nippo Gold 3DG/4DG, Thor AA/AAA, Hyper C-2U/D-1UH and 9 V | [Nippo / Indo National official shop](https://www.nippo.in/shop). Catalog identities, formats and chemistry only; numerical capacity and test conditions are unavailable. No data from a similarly named brand or another chemistry is inherited. |
| Duracell Coppertop MN1500/MN2400/MN1400/MN1300/MN1604 | [Duracell technical library](https://duracell.com/techlibrary/product-technical-data-sheets) links the exact PDFs recorded in each profile. Those files were retrieved and text-inspected. Nominal voltages are 1.5 V for AA/AAA/C/D and 9 V for MN1604. No single Ah selected from load-dependent graphs. |
| Duracell CR123 / DLCR2 | The same [manufacturer library](https://duracell.com/techlibrary/product-technical-data-sheets) links the exact CR123_US and DLCR2_IN PDFs. Capacity is 1.55 Ah and 0.920 Ah respectively under **100-ohm continuous resistive load**, 2 V cutoff. This is not a constant-current test; `capacityTest.mode` records that distinction. |
| Panasonic CR2016/CR2025/CR2032/CR2450; CR123A/CR2 | [Coin-cell catalog](https://energy.panasonic.com/dam/common/content/business/pdf/en/catalog/Catalog_EN_241001.pdf), individual model links in JSON, and [cylindrical-primary introduction](https://energy.panasonic.com/dam/master/pdf/en/material/lithium/Introduction_of_primary_lthium_batteries_EN_240701.pdf). Coin capacities 90/165/225/620 mAh use their stated standard drain; CR123A/CR2 are 1550/850 mAh at 20 mA. Capacity convention is 2 V cutoff at 20°C. |
| Panasonic eneloop BK-3MCC | [Official AA instructions](https://panasonic.jp/manualdl/p-db/p_/p_bk3mcc248_t_201304181131_0.pdf) give minimum 1900 mAh and 1.2 V under JIS C8708:2007 section 7.2.1. That standard's numerical test schedule was not independently transcribed, so current/cutoff/temperature remain null. No generic NiMH temperature coefficient was invented. |
| Panasonic NCR-18650BF | [Manufacturer product table](https://industry.panasonic.eu/pd-35779/batteries/secondary-batteries/lithium-ion-batteries-for-europe/cylindrical-type/ncr-18650bf): 3.6 V, typical 3350 mAh, minimum 3250 mAh. Capacity-test conditions are not stated there. NCR18650B curves from unofficial mirrors were not substituted. |
| GP CR2016/CR2025/CR2032 and Super 15A AA | [GP coin selection table](https://ind.gpbatteries.com/products/primary-batteries/primary-lithium/lithium-button-batteries.html): 90/160/220 mAh at 3 V, without the full test schedule. [GP alkaline selection table](https://ind.gpbatteries.com/products/primary-batteries/alkaline-batteries/alkaline-cylindrical-batteries.html): 15A/LR6, AA, 1.5 V; Ah unset. Cross-reference codes identify size families, not equivalent performance. |
| Maxell LR44 and SR44SW | [Manufacturer SR/LR table](https://biz.maxell.com/en/primary_batteries/SRLR_22e.pdf): LR44 110 mAh at 100 µA; SR44SW 165 mAh at 200 µA; 1.2 V endpoint at 20°C. Their chemistries and nominal voltages differ. The indexed manufacturer PDF table was available, while direct web-tool fetches timed out; no unsupported curve or resistance was extracted. |
| Renata zinc-air sizes 10 / 312 | [Manufacturer zinc-air page](https://www.renata.com/en/products/zinc---air-batteries/): 105/165 mAh. The [manufacturer scope-of-supply record](https://www.renata.com/en-ch/downloads/) identifies the 1.45 V family. Full capacity-test conditions remain unset. Activation, oxygen availability, humidity and time since seal removal matter; fixed-capacity coulomb counting does not model them. |
| VARTA Industrial Pro 4003/4006/4014/4020/4022 | [Manufacturer brochure](https://www.varta-ag.com/fileadmin/varta/industry/images/products/Industrial_Pro/VM_Folder_Industrial_Pro_2022.pdf): nominal sizes, voltages and 1270/2970/7800/17000/640 mAh. The [specific 4006 sheet](https://www.varta-ag.com/en/industry/product-solutions/industrial-pro?cHash=4b9ba421bbc4f76afc3c20d9f2f79cc2&tx_vmbproductdata_typedata%5Baction%5D=streamFile&tx_vmbproductdata_typedata%5Bcontroller%5D=Type&tx_vmbproductdata_typedata%5Bdocument%5D=38) conditions 2970 mAh at 20 mA continuous to 0.75 V. The other brochure ratings do not include that test schedule and do not inherit it. |
| Saft LS14500 | [Manufacturer datasheet](https://saft4u.saft.com/fr/download_file/738dfd7b-3131-4e31-8924-401cd9a36bbc/English): 2.6 Ah at 2 mA, 20°C, 2 V cutoff. Fresh OCV 3.67 V is only a single condition, not an OCV-SOC curve. Passivation and pulses are outside the fixed-R model. |
| Murata US18650VTC6 | [Manufacturer datasheet](https://www.murata.com/-/media/webrenewal/products/batteries/cylindrical/datasheet/us18650vtc6-product-datasheet.ashx): nominal 3120 mAh/minimum 3000 mAh, 600 mA, 2.0 V cutoff at 23°C. High-current graphs use different endpoints and cannot silently replace the capacity-test definition. |
| Molicel INR-21700-P42A / INR-18650-P26A | [P42A manufacturer table](https://www.molicel.com/product/inr-21700-p42a/) and [P26A table](https://www.molicel.com/product/inr-18650-p26a/): 3.6 V, typical 4.2/2.6 Ah. Those tables do not state capacity-test current/cutoff/temperature. No download form was submitted. |
| Lithium Werks / A123 ANR26650M1B | [Manufacturer SF00008 rev 2, Aug 2022](https://lithiumwerks.com/wp-content/uploads/2022/08/26650-Power-Cell-080322.pdf): 3.3 V, typical 2.6 Ah/minimum 2.5 Ah at 23°C. Capacity current is not stated. The discharge minimum 2 V is not relabelled as the capacity-test endpoint. Its <10 mΩ figure is **1 kHz AC impedance**, not a DC resistance preset. |
| GS Yuasa NP7-12 | [US MKT-081 ver 1.0 Aug 2025](https://gsyuasa-es.com/Downloads/NP7-12SPEC_SHEET.pdf): six-cell 12 V block, 7 Ah at 20-hour rate, 25°C, 1.75 V/cell endpoint. 0.35 A follows from 7 Ah/20 h and is present in its table. Regional and older sheets use different reference conditions; they are not merged. The sheet's approximately 22 mΩ method is unspecified, so DC-R stays null. |
| CSB GP1272 | [Manufacturer RA240531](https://csb-battery.com/wp-content/uploads/2024/07/CSB-Datasheet-GP1272-%E2%80%93-053124.pdf): six-cell 12 V block, nominal 7.2 Ah at 20-hour rate to 1.75 V/cell at 25°C. Derived nominal test current is 0.36 A. Other typical capacities in the sheet are not silently substituted for that nominal rating. |
| Trojan T-105 | [Manufacturer product page](https://www.trojanbattery.com/products/t-105-6v-flooded-battery): 6 V flooded block, 225 Ah at 20 h, 207 Ah at 10 h, 185 Ah at 5 h, 250 Ah at 100 h. Only the 20-hour rating is selected; 11.25 A is its derived current. Cutoff and reference temperature are not stated on that page, so remain null. No Peukert exponent is inferred. |

## The separate alkaline temperature scenarios

`temperatureReferences` contains two optional **generic AA/LR6 alkaline-family
scenarios**, not calibrations of E91 or any other named SKU. They come from the
[Energizer Alkaline Handbook](https://data.energizer.com/pdfs/alkaline_appman.pdf),
2018, figure 6, PDF page 5. Points were manually read from a 1600-pixel-height
render of the actual graph, rounded to 0.1 Ah:

| Temperature | Capacity at 25 mA | Factor relative to 20°C | Capacity at 250 mA | Factor relative to 20°C |
| --- | --- | --- | --- | --- |
| −20°C | approximately 0.5 Ah | 0.1923 | approximately 0.2 Ah | 0.1111 |
| 0°C | approximately 2.5 Ah | 0.9615 | approximately 0.8 Ah | 0.4444 |
| 20°C | approximately 2.6 Ah | 1 | approximately 1.8 Ah | 1 |

Both are **continuous constant-current discharges to 0.9 V**. Reading uncertainty
is approximately ±0.15 Ah and ±2°C, not a statement about manufacturing spread
or predictive accuracy. Ratios inherit uncertainty in numerator and denominator.
Use only interpolation within −20 to 20°C; no extrapolation or arbitrary-load
generalization. Adopting the 250 mA scenario should use its own 1.8 Ah warm
reference, not a low-current product rating. The graph includes temperatures
outside some named-cell operating ranges; it is not authorization to use that
cell outside its specification.

The nested `resistanceReference` reads the **fresh generic pulse-effective**
resistance curve in figure 11, PDF page 10: about 0.40/0.23/0.15 ohm at
−20/0/20°C, ±0.03 ohm graph-reading uncertainty. Ratios use 20°C as their baseline.
The section explains pulse measurements but does not restate the exact pulse
schedule on figure 11. `autoFillDCResistance` is false: these ratios are not
qualified continuous-DC temperature coefficients. The UI may expose them only as
an explicitly adopted, labelled pulse-derived scenario.

Cold capacity factors describe **accessible capacity under the source test**;
they are not instructions to destroy stored charge when temperature changes.
Preserve charge conservation, distinguish unavailable charge from spent charge,
and avoid multiplying both charge state and capacity in a way that double-counts
temperature losses. No data here establishes self-heating, recovery kinetics or
a dynamic electrochemical temperature model.

## Verification and retained evidence

The JSON was parsed and checked for unique IDs, 57 profiles, explicit null model
fields, nonnegative capacity values, complete source URLs and bounded temperature
points/factors. These are data-contract checks, not battery bench tests. No
OCV-SOC or DC-R calibration was established by this review.

One 423,648-byte handbook PDF, its two small rendered graph pages, three small
manufacturer-label images and the source-generation helpers were created under
`C:/Users/yawar/AppData/Local/Temp/battery-profile-evidence/` or as named helpers
in TEMP. They are task-owned evidence, not website downloads. Other manufacturer
PDFs were inspected in memory; no installer, dependency, source checkout or
large dataset was created. The catalog and this note are the retained project
deliverables.
