[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 04](prac04-land-cover-mapping-and-landscape-metrics.md) · [Prac 06 →](prac06-monitoring-land-clearing.md)

# Prac 05: Change detection: bi-temporal transitions, LandTrendr and CCDC

**When:** Thu 5 Nov 2026, Session 1 (transition matrix) and Session 3 (LandTrendr and CCDC); **AT3 in class, Session 4** · **Scripts:** [`prac05a_transition_matrix.js`](../scripts/prac05a_transition_matrix.js), [`prac05b_landtrendr_ccdc.js`](../scripts/prac05b_landtrendr_ccdc.js) · **ULOs:** 1, 2, 3, 4

**Also available in:** Python and R versions of LandTrendr in [`prac02_05_trends_seasonality_change.py`](../alternatives/python/prac02_05_trends_seasonality_change.py) and [`prac02_05_trends_seasonality_change.R`](../alternatives/r/prac02_05_trends_seasonality_change.R); QGIS [recipe](../alternatives/qgis/README.md). The transition matrix for AT3 is Code Editor only.

**Purpose.** Detect change between two dates in your own tile (your transition matrix for AT3), then over decades with LandTrendr and CCDC.

## 1. Concept notes

Landscapes change abruptly (clearing, fire, flood) and gradually (woody thickening, drying). Change detection has two families:

| Family | Methods | Strengths | Weaknesses |
| --- | --- | --- | --- |
| **Bi-temporal** | Image differencing (dNDVI, dNBR), ratioing, change-vector analysis, **post-classification comparison** (a transition matrix) | Simple; easy to explain; "from–to" classes | Sensitive to the two dates chosen, phenology, registration and classification error |
| **Multi-temporal** | **LandTrendr** (annual segments), **CCDC** (harmonic model breaks) | Uses the whole record; dates and magnitudes of change; separates noise from persistent change | Parameter tuning; computationally heavy |

**The transition matrix** cross-tabulates the class of each pixel at time A (rows) against its class at time B (columns). The diagonal shows persistence and the off-diagonal cells show change, such as woodland → agriculture. With classification accuracy p at each date, a rough guide is that the chance a pixel is correct at *both* dates is about p², which is why apparent change is often inflated.

| Algorithm | Question | Input | Output | Main assumption |
| --- | --- | --- | --- | --- |
| LandTrendr | When did abrupt change occur, and how large was it? | One composite per year | Segments, year of disturbance, magnitude | Change is piecewise linear between vertices |
| CCDC | When did the land surface model break? | All clear observations, multiple bands | Harmonic segments (Prac 02) and break dates | A break is a persistent departure from the model |

**NT caveats.**

- Annual fire lowers NBR every dry season. LandTrendr therefore uses a spike filter and a fixed dry-season window.
- Wet/dry contrasts mean the two dates of a bi-temporal comparison must come from the same season.

## 2. Practical activities

**Activity 5.1 – Bi-temporal change and the transition matrix (`prac05a`, Session 1), needed for AT3.**

1. Paste your tile geometry and AT3 year pair (from `prac00`), and point `TRAINING` to your Prac 04 training points.
2. Build dry-season Landsat 8/9 composites for both years, and classify both with one RF trained on year A. Report the hold-out accuracy.
3. Compute the 5 × 5 transition matrix in hectares (water, woodland, agriculture, bare soil, grassland/other).
4. Map woodland → agriculture and all changed pixels, then export the matrix. **Bring it to AT3 in Session 4.**

**Activity 5.2 – Multi-temporal change (`prac05b`, Session 3).**

1. Map bi-temporal dNBR for your year pair (section 4.1 of the script).
2. Run LandTrendr on inverted NBR for 1988–2024 in the Douglas–Daly, and map the year and magnitude of the greatest disturbance.
3. Run CCDC for 2000–2024, and map the most recent break and the number of breaks.
4. Map where the two algorithms agree, and compare them with your transition matrix.

**Key code** (an excerpt from [`prac05a_transition_matrix.js`](../scripts/prac05a_transition_matrix.js); run the full script for the complete workflow):

```javascript
// From–to codes: 12 = class 1 in YEAR_A became class 2 in YEAR_B; area (ha) per code
var code = lcA.multiply(10).add(lcB).rename('code');
var grouped = ee.Image.pixelArea().divide(1e4).addBands(code).reduceRegion({
  reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'code'}),
  geometry: TILE, scale: 30, maxPixels: 1e10, tileScale: 4});
print('Area (ha) by from–to code', grouped.get('groups'));
Map.addLayer(lcA.eq(1).and(lcB.eq(2)).selfMask(), {palette: 'red'}, 'Woodland → agriculture');
```

## 3. Challenge questions (knowledge check)

**Core**

1. Give two reasons a bi-temporal comparison can show "change" where none occurred.
2. If each date's classification is 85 % accurate, roughly how reliable is a "from–to" change pixel? What does this mean for your matrix?
3. Why is NBR inverted for LandTrendr? How do the spike filter and dry-season window reduce false fire "disturbances"?
4. Do LandTrendr and CCDC agree on when clearing happened? Why might they differ?

**Extension (ENV506)**

1. Run a sensitivity analysis of LandTrendr parameters (`maxSegments`, magnitude threshold), and validate the results against 100 points you interpret yourself.
2. Estimate area-adjusted change (Olofsson et al., 2014) from a stratified sample of your changed and unchanged pixels.
3. Explain when a regulator should prefer a bi-temporal product over a multi-temporal one, and the reverse.

## 4. Link to summative assessment

- **AT3 (supervised, Thu 5 Nov, 3:30–4:30 pm):** answer unseen questions about **your own** transition matrix from Activity 5.1.
    - **ENV306:** 400–500 words.
    - **ENV506:** 500–700 words, including quantified error impact.
- **AT4 Part 2:** LandTrendr or CCDC dates the disturbance history of your tile.

## 5. Reading

- Kennedy, R. E., Yang, Z., & Cohen, W. B. (2010). Detecting trends in forest disturbance and recovery using yearly Landsat time series: 1. LandTrendr. *Remote Sensing of Environment, 114*, 2897–2910. https://doi.org/10.1016/j.rse.2010.07.008
- Kennedy, R. E., et al. (2018). Implementation of the LandTrendr algorithm on Google Earth Engine. *Remote Sensing, 10*(5), 691. https://doi.org/10.3390/rs10050691
- Zhu, Z., & Woodcock, C. E. (2014). Continuous change detection and classification of land cover using all available Landsat data. *Remote Sensing of Environment, 144*, 152–171. https://doi.org/10.1016/j.rse.2014.01.011
- Arévalo, P., Bullock, E. L., Woodcock, C. E., & Olofsson, P. (2020). A suite of tools for continuous land change monitoring in Google Earth Engine. *Frontiers in Climate, 2*, 576740. https://doi.org/10.3389/fclim.2020.576740
- Olofsson, P., et al. (2014). Good practices for estimating area and assessing accuracy of land change. *Remote Sensing of Environment, 148*, 42–57. https://doi.org/10.1016/j.rse.2014.02.015
- Pontius, R. G., & Millones, M. (2011). Death to Kappa. *International Journal of Remote Sensing, 32*(15), 4407–4429. https://doi.org/10.1080/01431161.2011.552923

---

[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 04](prac04-land-cover-mapping-and-landscape-metrics.md) · [Prac 06 →](prac06-monitoring-land-clearing.md)
