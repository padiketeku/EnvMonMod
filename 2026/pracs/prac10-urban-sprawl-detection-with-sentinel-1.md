[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 09](prac09-crocodile-biomass-modelling-with-sar-floodplain-inundation.md) · [Prac 11 →](prac11-lidar-gedi-canopy-structure-and-optical-sar-lidar-fusion.md)

# Prac 10: Urban sprawl detection with Sentinel-1

**When:** Tue 10 Nov 2026, Session 2 · **Script:** [`prac10_urban_sprawl_sentinel1.js`](../scripts/prac10_urban_sprawl_sentinel1.js) · **ULOs:** 1, 2, 3, 4

**Also available in:** Python [`prac10_urban_sprawl_sentinel1.py`](../alternatives/python/prac10_urban_sprawl_sentinel1.py) · R [`prac10_urban_sprawl_sentinel1.R`](../alternatives/r/prac10_urban_sprawl_sentinel1.R) · QGIS [recipe](../alternatives/qgis/README.md). The Code Editor remains the main environment.

**Purpose.** Map urban expansion in Darwin–Palmerston with Sentinel-1: a **log-ratio** change warm-up, then an annual built-up time series, growth rates, expansion types and validation against independent products.

## 1. Concept notes

**Urban landscapes.** Urban expansion converts savanna, woodland and wetland into built surfaces. It fragments habitat (Prac 04), raises land surface temperature (Prac 03) and changes runoff. Greater Darwin has grown outward to Palmerston, the eastern suburbs and the rural Litchfield area. Planners need to know how much land has been converted, where, and in what form.

**Why SAR for urban areas?** Walls and the ground form corner reflectors, so buildings produce strong **double-bounce** returns (Prac 08). Built-up areas are therefore **bright and temporally stable** in SAR, and Sentinel-1 sees through wet-season cloud.

| Surface | Typical VV (dB) | Temporal stability |
| --- | --- | --- |
| Open water | < −18 | Stable (dark) |
| Bare soil, grass | −15 to −10 | Varies with moisture |
| Woodland | −10 to −7 | Moderate |
| Built-up | > −8, often near 0 | High |

**Log ratio.** Speckle is multiplicative, so change between two SAR dates is measured as a ratio. Following the Prac 08 rule, the ratio is computed from linear σ⁰ and shown in dB: LR = 10 log₁₀(σ⁰₂ / σ⁰₁). A +3 dB threshold is a linear ratio of 2.0. Large positive values mark new bright (built) surfaces.

**Error sources.**

- **Commission:** rock outcrops, metal-roofed sheds, slopes facing the sensor, mangrove edges.
- **Omission:** low-density housing under trees, and buildings oriented away from the look direction.

Use one orbit pass and dry-season composites to reduce both.

**Landscape Expansion Index (LEI).** For each new urban patch, the LEI is the share of a buffer around it that was already urban (Liu et al., 2010): infilling (> 50 %), edge-expansion (0–50 %), or outlying/leapfrog (0 %). Leapfrog growth is the signature of sprawl.

```math
\text{Annual growth rate}=\frac{\ln(A_{t_2}/A_{t_1})}{t_2-t_1}\times 100\%
```

## 2. Practical activities

**Activity 10.1 – Log-ratio warm-up (15 min).** Using descending Sentinel-1 VV from one relative orbit, map the ratio of linear dry-season medians (2024 ÷ 2016), shown in dB, for Darwin–Palmerston. Threshold it at +3 dB (linear ratio > 2.0), and compare the result with the satellite basemap.

**Activity 10.2 – Annual built-up mapping (`prac10`).**

1. Print descending Sentinel-1 scenes per year, and note the gap after Sentinel-1B failed in December 2021.
2. Build dry-season (May–Oct) VV/VH medians (linear σ⁰) and the temporal coefficient of variation of linear VV for 2016, 2018, 2020, 2022 and 2024.
3. Classify built-up land with VV, VH and stability thresholds, a water and slope mask, a majority filter and a minimum patch size. Enforce monotonic growth.
4. Chart built-up area per year, and compute the annual growth rate.
5. Map new urban land (2016 → 2024) by LEI type, and calculate the area of each type.
6. Validate 2020 against GHSL built-up surface and Dynamic World `built`.
7. Test sensitivity with `VV_T_DB` set to −6, −8 and −10 dB (the script converts each to linear before comparing).

**Key code** (an excerpt from [`prac10_urban_sprawl_sentinel1.js`](../scripts/prac10_urban_sprawl_sentinel1.js); run the full script for the complete workflow):

```javascript
// Log-ratio change: ratio of linear dry-season medians from one relative orbit, shown in dB
// (s1 is a descending, linear-σ⁰ VV/VH collection; aoi, toDb and dbToLin as in the script)
var orbit = ee.Number(s1.filterDate('2024-05-01', '2024-10-31').first().get('relativeOrbitNumber_start'));
var vv = s1.filter(ee.Filter.eq('relativeOrbitNumber_start', orbit)).select('VV');
var ratio = vv.filterDate('2024-05-01', '2024-10-31').median()
  .divide(vv.filterDate('2016-05-01', '2016-10-31').median()).clip(aoi);
Map.addLayer(toDb(ratio), {min: -6, max: 6, palette: ['#2166ac', '#f7f7f7', '#b2182b']}, 'VV log ratio (dB)');
Map.addLayer(ratio.gt(dbToLin(3)).selfMask(), {palette: 'red'}, 'Brightening > +3 dB');
```

## 3. Challenge questions (knowledge check)

**Core**

1. Why do buildings appear bright in SAR? Name two land covers that cause commission errors.
2. Why does the log-ratio method suit SAR better than simple differencing of linear backscatter?
3. Why use dry-season composites and a single orbit pass?
4. Which suburbs grew most from 2016 to 2024? Is growth mainly infill, edge-expansion or leapfrog?
5. How sensitive is the built-up area to `VV_T`?

**Extension (ENV506)**

1. Fuse Sentinel-1 with Sentinel-2 (NDVI, NDBI) in an RF classifier (the Prac 04 workflow), and quantify the accuracy gain over SAR alone.
2. Test whether GLCM texture (`glcmTexture()` on integer-scaled VV) improves detection.
3. Compare mapped growth with land-release areas in NT planning documents, and evaluate whether satellite monitoring could track compliance with a regional land use plan.

## 4. Link to summative assessment

- **AT4 elective (d), urban expansion:** map urban expansion at your site and years (from `prac00`) with Sentinel-1.
    - **ENV306:** log ratio plus annual built-up mapping, with validation.
    - **ENV506:** add Sentinel-1 + Sentinel-2 fusion, LEI analysis and a threshold sensitivity test.

## 5. Reading

- Liu, X., et al. (2010). A new landscape index for quantifying urban expansion using multi-temporal remotely sensed data. *Landscape Ecology, 25*, 671–682. https://doi.org/10.1007/s10980-010-9454-5
- Ban, Y., Jacob, A., & Gamba, P. (2015). Spaceborne SAR data for global urban mapping at 30 m resolution using a robust urban extractor. *ISPRS Journal of Photogrammetry and Remote Sensing, 103*, 28–37. https://doi.org/10.1016/j.isprsjprs.2014.08.004
- Bazi, Y., Bruzzone, L., & Melgani, F. (2005). An unsupervised approach based on the generalized Gaussian model to automatic change detection in multitemporal SAR images. *IEEE Transactions on Geoscience and Remote Sensing, 43*(4), 874–887. https://doi.org/10.1109/TGRS.2004.842441
- Schiavina, M., et al. (2023). *GHSL Data Package 2023*. Publications Office of the European Union. https://doi.org/10.2760/098587
- Mullissa, A., et al. (2021). Sentinel-1 SAR backscatter analysis ready data preparation in Google Earth Engine. *Remote Sensing, 13*(10), 1954. https://doi.org/10.3390/rs13101954

---

[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 09](prac09-crocodile-biomass-modelling-with-sar-floodplain-inundation.md) · [Prac 11 →](prac11-lidar-gedi-canopy-structure-and-optical-sar-lidar-fusion.md)
