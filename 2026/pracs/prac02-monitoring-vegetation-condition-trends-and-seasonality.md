[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 01](prac01-earth-engine-image-processing-fundamentals-and-vegetation-dynamics.md) · [Prac 03 →](prac03-climate-and-hydrology-drivers-rainfall-anomalies-drought-indices-lst-and-et.md)

# Prac 02: Monitoring vegetation condition: trends and seasonality

**When:** Tue 3 Nov 2026, Sessions 2–3 · **Scripts:** [`prac02a_trend_sens_mk.js`](../scripts/prac02a_trend_sens_mk.js), [`prac02b_harmonic_regression.js`](../scripts/prac02b_harmonic_regression.js) · **ULOs:** 1, 2, 3, 4

**Also available in:** Python [`prac02_05_trends_seasonality_change.py`](../alternatives/python/prac02_05_trends_seasonality_change.py) · R [`prac02_05_trends_seasonality_change.R`](../alternatives/r/prac02_05_trends_seasonality_change.R) · QGIS [recipe](../alternatives/qgis/README.md). The Code Editor remains the main environment.

**Purpose.** Find where NT vegetation is greening or browning, test whether the trends are significant, and describe seasonality. Adapted from the Earth Engine community tutorial *Monitoring forest vegetation condition* (pskoulgi).

> **Read first (about 10 min).** Before you start, read these summary notes in the *Article review reading list and summary notes* (Learnline, and [reference/article-review-notes.md](../reference/article-review-notes.md)):
>
> - **1.3 Skidmore et al. (2021)**, *Priority list of biodiversity metrics to observe from space* (revisit from Prac 01)
>
> **Carry these ideas into the prac:**
>
> - Vegetation trends and seasonality are measures of **ecosystem function** (productivity and phenology), one of the classes Skidmore ranks as most feasible from space.
> - A greening trend is a change in function, not proof of better biodiversity condition: in Top End savanna it can also mean woody thickening or invasive grasses.

## 1. Concept notes

**Vegetation condition** is the state of vegetation relative to what is expected for a place and season. Long time series of a vegetation index (NDVI, EVI) reveal two things:

- **Trends:** gradual change over years, such as woody thickening, degradation, clearing or recovery.
- **Seasonality:** the within-year cycle of green-up and senescence (phenology).

Separating the two is the first step in monitoring condition. In the NT, monsoonal seasonality is very strong, so a naive straight line through all observations is misleading.

**Trend analysis: Sen's slope and the Mann–Kendall test.** These are non-parametric methods. They are robust to outliers and to non-normal data, which is typical of NDVI.

```math
S=\sum_{i=1}^{n-1}\sum_{j=i+1}^{n}\operatorname{sgn}(x_j-x_i)\qquad \mathrm{Var}(S)=\frac{n(n-1)(2n+5)}{18}\qquad Z=\frac{S-\operatorname{sgn}(S)}{\sqrt{\mathrm{Var}(S)}}\qquad \beta_{Sen}=\operatorname{median}\!\left(\frac{x_j-x_i}{t_j-t_i}\right)
```

S counts increases minus decreases across all pairs of years, Z tests whether the trend is significant, and Sen's slope gives its magnitude in NDVI units per year.

**Seasonality: harmonic regression.** Model the seasonal cycle as sine and cosine waves. The amplitude says how strongly the vegetation greens and browns; the phase says *when* it peaks.

```math
\mathrm{NDVI}(t)=\beta_0+\beta_1t+\sum_{k=1}^{K}\left[\beta_{2k}\cos(2\pi kt)+\beta_{2k+1}\sin(2\pi kt)\right]\qquad A=\sqrt{\beta_2^2+\beta_3^2},\ \phi=\operatorname{atan2}(\beta_3,\beta_2)
```

**NT caveats.**

- Wet-season cloud leaves gaps, so harmonic fits rely on uneven sampling.
- Rainfall variability can masquerade as trend. RESTREND separates the climate-driven part of the signal from other drivers, and Prac 03 provides the rainfall data.
- Annual fires cause short-lived NDVI drops, which affect means but rarely long-term trends.

## 2. Practical activities

**Activity 2.1 – Trends (`prac02a`, Session 2).**

1. Build annual mean NDVI (MOD13A3) for the NT for 2001–2024.
2. Compute Sen's slope, the Mann–Kendall S statistic, Z, p-value and Kendall's tau.
3. Map significant slopes (p < 0.05), and calculate the area that is greening and browning.
4. Chart a probe pixel in the Douglas–Daly, then move the probe into **your Daly tile**.
5. **AT3:** clip the trend and significance maps to your tile, and calculate the area greening and browning.

> **Reading link (notes 1.3, Skidmore et al. 2021).** In steps 3–5 of Activity 2.1 you map where NDVI is greening or browning. Use discussion question 3 in the notes: is greening in your tile evidence of better biodiversity condition, or could it be woody thickening, invasive grasses or a run of wet years (Prac 03)?

**Activity 2.2 – Seasonality (`prac02b`, Session 3).**

1. Fit a first-order harmonic model to Landsat 8/9 NDVI (2014–2024) around the Darwin hinterland.
2. Map amplitude, phase (day of peak greenness) and the HSV seasonality composite.
3. Plot observed vs fitted values at savanna, floodplain and rural probes, then refit with `HARMONICS = 2` and compare RMSE.
4. **AT3:** fit the model in your tile, and compare amplitude and peak timing for at least two land covers.

> **Reading link (notes 1.3, Skidmore et al. 2021).** Amplitude and day of peak greenness (Activity 2.2) are phenology metrics, part of the ecosystem function class. Differences between land covers in step 4 are the kind of functional signal satellites capture well.

**Key code** (an excerpt from [`prac02a_trend_sens_mk.js`](../scripts/prac02a_trend_sens_mk.js); run the full script for the complete workflow):

```javascript
// Sen's slope of annual mean NDVI, 2001–2024 (MODIS MOD13A3)
var modis = ee.ImageCollection('MODIS/061/MOD13A3').select('NDVI');
var annual = ee.ImageCollection.fromImages(ee.List.sequence(2001, 2024).map(function(y) {
  var img = modis.filter(ee.Filter.calendarRange(y, y, 'year')).mean().multiply(0.0001);
  return ee.Image.constant(y).float().rename('year').addBands(img.rename('NDVI'));
}));
var sens = annual.reduce(ee.Reducer.sensSlope());   // bands: slope (NDVI per year), offset
Map.addLayer(sens.select('slope'), {min: -0.006, max: 0.006, palette: ['#8c510a', '#f5f5f5', '#01665e']}, "Sen's slope");
```

## 3. Challenge questions (knowledge check)

**Core**

1. Why use Sen's slope and Mann–Kendall rather than ordinary least squares for NDVI?
2. Where is the NT greening or browning? Propose processes such as rainfall, woody thickening, clearing and fire.
3. What do the amplitude and phase tell a land manager about different land covers?
4. Why can a single dry-season composite not describe vegetation condition in the Top End?

**Extension (ENV506)**

> **ENV506 cohort only: ready-made challenge scripts.** The ENV506 challenges below come as complete code at the end of the script `prac02a`, inside blocks headed `ENV506 COHORT ONLY`. To run one, delete its `/* ENV506-… START` line and its `ENV506-… END */` line, then click Run. Change only the lines marked `EDIT` (your tile and focus year). ENV306 students: leave these blocks commented out; they do not affect the rest of the script. Your marks come from interpreting the charts, tables and maps, not from the code.

1. With about 1.4 million pixels, about 5 % will be "significant" by chance. Run **ENV506 challenge A** in `prac02a` (Benjamini–Hochberg false-discovery-rate correction) and compare the maps and areas before and after the correction.
2. Run **ENV506 challenge B** in `prac02a` (RESTREND: the trend in NDVI residuals after removing rainfall) and compare it with the NDVI trend map. Where does a trend disappear, and where does it remain?
3. Fit harmonics for 2014–2018 and for 2020–2024, then map the shifts in phenology.
4. Test for serial autocorrelation, apply pre-whitening, and discuss its effect on significance.

## 4. Link to summative assessment

- **AT3:** the trend and seasonality maps of your tile are the core of your magazine article (ENV506: false-discovery-rate correction).
- **AT4 Part 3:** the same trend methods, applied to your clearing period and fire window, help separate climate-driven change from clearing and fire (AT4 does not reuse your AT3 results).

## 5. Reading

- Forkel, M., et al. (2013). Trend change detection in NDVI time series: Effects of inter-annual variability and methodology. *Remote Sensing, 5*(5), 2113–2144. https://doi.org/10.3390/rs5052113
- Burrell, A. L., Evans, J. P., & De Kauwe, M. G. (2020). Anthropogenic climate change has driven over 5 million km² of drylands towards desertification. *Nature Communications, 11*, 3853. https://doi.org/10.1038/s41467-020-17710-7
- Donohue, R. J., Roderick, M. L., McVicar, T. R., & Farquhar, G. D. (2013). Impact of CO₂ fertilization on maximum foliage cover across the globe's warm, arid environments. *Geophysical Research Letters, 40*, 3031–3035. https://doi.org/10.1002/grl.50563
- Ma, X., et al. (2013). Spatial patterns and temporal dynamics in savanna vegetation phenology across the North Australian Tropical Transect. *Remote Sensing of Environment, 139*, 97–115. https://doi.org/10.1016/j.rse.2013.07.030
- Earth Engine community tutorial: *Monitoring forest vegetation condition* (pskoulgi). https://developers.google.com/earth-engine/tutorials/community/forest-vegetation-condition
- Skidmore, A. K., et al. (2021). Priority list of biodiversity metrics to observe from space. *Nature Ecology & Evolution, 5*, 896–906. https://doi.org/10.1038/s41559-021-01451-x (article review notes)
- Benjamini, Y., & Hochberg, Y. (1995). Controlling the false discovery rate: A practical and powerful approach to multiple testing. *Journal of the Royal Statistical Society: Series B, 57*(1), 289–300. https://doi.org/10.1111/j.2517-6161.1995.tb02031.x (ENV506 challenge A)
- Evans, J., & Geerken, R. (2004). Discrimination between climate and human-induced dryland degradation. *Journal of Arid Environments, 57*(4), 535–554. https://doi.org/10.1016/S0140-1963(03)00121-6 (ENV506 challenge B, RESTREND)
- Wessels, K. J., Prince, S. D., Malherbe, J., Small, J., Frost, P. E., & VanZyl, D. (2007). Can human-induced land degradation be distinguished from the effects of rainfall variability? A case study in South Africa. *Journal of Arid Environments, 68*(2), 271–297. https://doi.org/10.1016/j.jaridenv.2006.05.015 (ENV506 challenge B, RESTREND)

## Full scripts

Each script is copied here from [`scripts/`](../scripts) so this page has everything in one place. The `.js` file is the master copy: if the two ever differ, use the file. Click a heading to open the script, then use the copy button and paste it into a new script in the Code Editor.

<details>
<summary><strong>prac02a_trend_sens_mk.js</strong> (257 lines)</summary>

```javascript
/**** Prac 02a — Non-parametric trend analysis: Sen's slope and Mann–Kendall (Northern Territory)
 * Variable: annual mean NDVI (MODIS MOD13A3, 1 km), 2001–2024. Swap in rainfall, LST or fire frequency.
 * Mann–Kendall S statistic computed pairwise (after the GEE "non-parametric trend" tutorial);
 * variance formula ignores ties (fine for continuous NDVI — see EXT).
 *
 * WHAT THIS SCRIPT DOES:
 *   Asks "Where in the NT has vegetation greenness gone up or down since 2001?" For every 1 km pixel it makes a
 *   24-year series of annual mean NDVI, estimates the trend with Sen's slope (NDVI per year), tests whether the
 *   trend is significant with the Mann–Kendall test, and maps and sums the significant greening and browning.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) Optional edits: START and END years (section 1), ALPHA (significance level), and the probe point (section 4), or click the map to chart any pixel.
 *   (3) Click Run. The NT-wide calculations can take a minute or two.
 *   (4) Read the Console (right panel), turn layers on/off in the Map's Layers list, and start the export in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   Map: Sen's slope for all pixels (off), Mann–Kendall p-value (off), and Sen's slope only where p < 0.05.
 *   Console: area (km²) of significant greening and browning; annual NDVI chart at the probe with a trend line;
 *   Sen slope, Kendall's tau and p at the probe.
 *
 * DATA:
 *   MODIS/061/MOD13A3 — MODIS Terra monthly vegetation indices, 1 km; 2001–2024 used (NDVI band).
 *   FAO/GAUL/2015/level1 — state/territory boundaries (vector, 2015).
 *
 * LINKS:
 *   Prac page: pracs/prac02-monitoring-vegetation-condition-trends-and-seasonality.md
 *   Assessment: Prac 02; AT3 (trend and seasonality); AT4 Part 3.
 *
 * KEY GEE IDEAS:
 *   - Building a new ImageCollection with ee.List.sequence(...).map() (one image per year).
 *   - Per-pixel statistics with collection reducers (ee.Reducer.sensSlope, sum).
 *   - Joins (ee.Join.saveAll) to pair every image with all later images.
 *   - reduceRegion with scale and maxPixels for area totals (pixelArea).
 *
 * Q = core (ENV306 and ENV506).  EXT = ENV506 extension.
 ****/

// ---------- 1 Study area ----------
// The whole NT, and the range of years to analyse.
var nt = ee.FeatureCollection('FAO/GAUL/2015/level1').filter(ee.Filter.eq('ADM1_NAME', 'Northern Territory'));
Map.centerObject(nt, 5);
var START = 2001, END = 2024;   // first and last year of the trend (both included)

// ---------- 2 Data: annual mean NDVI ----------
// Average the 12 monthly MODIS images in each year, giving one NDVI image per year. Using annual values
// removes the strong wet–dry seasonal cycle, so what is left is the year-to-year change.
var modis = ee.ImageCollection('MODIS/061/MOD13A3').select('NDVI');
var annual = ee.ImageCollection.fromImages(ee.List.sequence(START, END).map(function(y) {
  y = ee.Number(y);
  // calendarRange(y, y, 'year') keeps images from year y; × 0.0001 converts stored integers to NDVI (−1 to 1).
  return modis.filter(ee.Filter.calendarRange(y, y, 'year')).mean().multiply(0.0001)
    // store the year, and a date (1 July) that the join and charts can use
    .rename('NDVI').set('year', y).set('system:time_start', ee.Date.fromYMD(y, 7, 1).millis());
}));
var n = END - START + 1;   // number of years (24). This is plain JavaScript, worked out in your browser.

// ---------- 3a Sen's slope (median of all pairwise slopes) ----------
// For every pair of years, slope = change in NDVI ÷ change in years. Sen's slope is the median of these,
// so a single unusual year (drought, big fire) has little effect — unlike an ordinary least-squares line.
var sens = annual.map(function(img) {
  // sensSlope needs two bands per image: first the x value (year), then the y value (NDVI).
  return ee.Image.constant(img.get('year')).float().rename('year').addBands(img);
}).reduce(ee.Reducer.sensSlope()).clip(nt);   // bands: slope (NDVI/yr), offset

// ---------- 3b Mann–Kendall S ----------
// Mann–Kendall compares every year with every later year and adds up +1 (later is higher) or −1 (later is lower).
// A large positive S suggests an upward trend; large negative S a downward trend. Z and p then test significance.
// Join: for each annual image, save the list of all LATER images (time_start of this < time_start of the other).
var afterFilter = ee.Filter.lessThan({leftField: 'system:time_start', rightField: 'system:time_start'});
var joined = ee.ImageCollection(ee.Join.saveAll('after').apply({primary: annual, secondary: annual, condition: afterFilter}));
// sign(i, j): +1 if NDVI rose from year i to the later year j, −1 if it fell, 0 if it is unchanged (a tie).
// signum() returns exactly −1, 0 or +1, which is what Mann–Kendall counts. (Clamping the difference to −1…1 and
// converting to an integer would not work here: NDVI differences are fractions, so int() would turn them all into 0.)
var sign = function(i, j) {
  return ee.Image(j).subtract(i).signum().int();
};
var S = ee.ImageCollection(joined.map(function(current) {
  var afterCol = ee.ImageCollection.fromImages(current.get('after'));   // all years after the current one
  return afterCol.map(function(image) { return ee.Image(sign(current, image)).unmask(0); });   // masked pixels count as 0
}).flatten()).reduce('sum', 2).rename('S');   // add up all pairs per pixel; 2 = parallelScale (helps avoid memory errors)

// Variance of S when there are no tied values: n(n − 1)(2n + 5) / 18.
var varS = ee.Image.constant(n * (n - 1) * (2 * n + 5) / 18);
// Z score with a continuity correction (move S one step towards 0); Z = 0 when S = 0.
var Z = ee.Image(0).where(S.gt(0), S.subtract(1).divide(varS.sqrt()))
                   .where(S.lt(0), S.add(1).divide(varS.sqrt())).rename('Z');
// Two-sided p-value: p = 2 * (1 − Φ(|Z|)),  Φ(z) = 0.5 * (1 + erf(z/√2))
// which simplifies to p = 1 − erf(|Z|/√2). Small p = trend unlikely to be chance.
var p = ee.Image(1).subtract(Z.abs().divide(Math.SQRT2).erf()).rename('p').clip(nt);
// Kendall's tau = S / (n(n−1)/2)
// tau runs from −1 (always decreasing) to +1 (always increasing).
var tau = S.divide(n * (n - 1) / 2).rename('tau').clip(nt);

var ALPHA = 0.05;   // significance level: a conventional starting value — test others (e.g. 0.01)
var sigSlope = sens.select('slope').updateMask(p.lt(ALPHA));   // hide pixels whose trend is not significant

// ---------- 4 Analysis ----------
// Add up the area of pixels with a significant positive (greening) or negative (browning) trend.
var area = ee.Image.pixelArea().divide(1e6);   // pixelArea() gives m² per pixel; ÷ 1 000 000 → km²
var sigInc = area.updateMask(p.lt(ALPHA).and(sens.select('slope').gt(0)));
var sigDec = area.updateMask(p.lt(ALPHA).and(sens.select('slope').lt(0)));
// Positional arguments: reducer, geometry, scale (1000 m = MODIS pixel), crs, crsTransform, bestEffort, maxPixels.
print('Area with significant greening (km²)', sigInc.reduceRegion(ee.Reducer.sum(), nt.geometry(), 1000, null, null, false, 1e11));
print('Area with significant browning (km²)', sigDec.reduceRegion(ee.Reducer.sum(), nt.geometry(), 1000, null, null, false, 1e11));

// Inspect one pixel: series + Sen line
// To look at a different place, change the coordinates [lon, lat] below and click Run again,
// or simply click on the map: the click handler below charts the pixel you click.
var probe = ee.Geometry.Point([131.19, -13.83]);   // Douglas–Daly
// The red line on the chart is the chart's own least-squares trend line, drawn for reference — it is not Sen's slope.
print(ui.Chart.image.series(annual, probe, ee.Reducer.mean(), 1000, 'year')   // 'year' = x-axis property
  .setOptions({title: 'Annual NDVI at probe', trendlines: {0: {color: 'red'}}, pointSize: 4}));
// Reducer.first() simply reads the value of the pixel under the point.
print('Probe: Sen slope / tau / p', sens.select('slope').addBands(tau).addBands(p).reduceRegion(ee.Reducer.first(), probe, 1000));
// Click anywhere on the map: Map.onClick runs this function with the clicked longitude and latitude,
// and prints a new chart and the Sen slope / tau / p for that pixel in the Console.
Map.onClick(function(coords) {
  var pt = ee.Geometry.Point([coords.lon, coords.lat]);
  print(ui.Chart.image.series(annual, pt, ee.Reducer.mean(), 1000, 'year')
    .setOptions({title: 'Annual NDVI at ' + coords.lon.toFixed(3) + ', ' + coords.lat.toFixed(3),
                 trendlines: {0: {color: 'red'}}, pointSize: 4}));
  print('Clicked pixel: Sen slope / tau / p', sens.select('slope').addBands(tau).addBands(p).reduceRegion(ee.Reducer.first(), pt, 1000));
});

// ---------- 5 Visualise ----------
// Brown = browning (negative slope), white = no change, teal-green = greening (positive slope).
var slopeVis = {min: -0.006, max: 0.006, palette: ['#8c510a', '#d8b365', '#f6e8c3', '#f5f5f5', '#c7eae5', '#5ab4ac', '#01665e']};
Map.addLayer(sens.select('slope'), slopeVis, "Sen's slope (NDVI/yr), all pixels", false);
Map.addLayer(p, {min: 0, max: 0.1, palette: ['black', 'white']}, 'Mann–Kendall p-value', false);   // dark = small p
Map.addLayer(sigSlope, slopeVis, "Sen's slope where p < 0.05");

// ---------- 6 Export ----------
// Save slope, tau, p and Z as one 4-band GeoTIFF in Google Drive. Start it in the Tasks tab.
// crs EPSG:3577 = GDA94 / Australian Albers (equal-area); bounds() = the NT's bounding rectangle.
Export.image.toDrive({image: sens.select('slope').addBands([tau, p, Z]).float(), description: 'Prac02a_NDVI_trend_NT',
  folder: 'GEE_NT', region: nt.geometry().bounds(), scale: 1000, crs: 'EPSG:3577', maxPixels: 1e11});

// Q: Where is the NT greening or browning? Propose landscape processes (rainfall trend, woody thickening, clearing, fire).
// Q: Why use Sen's slope and Mann–Kendall rather than OLS regression for NDVI?
// Q: About 5% of pixels will be "significant" by chance at α = 0.05. Why is this a problem for a map with ~1.4 million pixels?
// EXT: Benjamini–Hochberg false-discovery-rate correction: ready to run in ENV506 challenge A at the end of this script.
// EXT: Autocorrelated series inflate significance. Implement pre-whitening (Yue–Pilon) or the modified MK test for one region.
// EXT: RESTREND (trend in NDVI residuals after removing rainfall): ready to run in ENV506 challenge B at the end of this script.

// #####################################################################################################################
// ##  ENV506 COHORT ONLY — CHALLENGE A: Benjamini–Hochberg false-discovery-rate (FDR) correction
// ##  ENV306 students: you do not need this block. Leave it commented out; it does not affect the rest of the script.
// #####################################################################################################################
// HOW TO RUN (ENV506): delete the line  /* ENV506-A START  and the line  ENV506-A END */  below, then click Run.
//   Nothing else needs editing to run it. Lines marked EDIT are the settings to change for YOUR tile and focus year.
// USES: p (Mann–Kendall p-values), sens, ALPHA, area, slopeVis and nt from the main script above.
// FOR AT3 (ENV506): map greening and browning that stays significant after the FDR correction, and report both areas (raw p < 0.05 and FDR).
// READING THE OUTPUT:
//   - "BH cut-off p-value" is the new significance threshold. It is always ≤ ALPHA; the more pixels tested, the
//     smaller it usually gets. A cut-off of 0 means no pixel survives the correction.
//   - Compare "pixels significant at raw p < ALPHA" with "after BH": the difference is roughly the number of
//     trends you would otherwise report that could be chance.
//   - Map layer "ENV506-A: Sen's slope, significant after BH" — compare it with "Sen's slope where p < 0.05".
/* ENV506-A START
// Benjamini–Hochberg (1995): rank the m p-values; the cut-off is the largest p(i) with p(i) ≤ (i / m) × ALPHA.
// Sorting a million pixels is slow, so we use a fine histogram of p between 0 and ALPHA instead:
// for each bin end t, k(t) = number of pixels with p < t, and t passes if t ≤ (k(t) / m) × ALPHA.
var BH_REGION = nt.geometry();   // EDIT (AT3): your tile polygon from prac00, to apply the correction within your tile
var BH_STEPS = 2000;             // histogram bins between 0 and ALPHA (finer = more exact cut-off)
var bhM = ee.Number(p.reduceRegion({reducer: ee.Reducer.count(), geometry: BH_REGION, scale: 1000,
  maxPixels: 1e11}).get('p'));   // m = number of pixels tested
var bhHist = ee.Array(p.reduceRegion({reducer: ee.Reducer.fixedHistogram(0, ALPHA, BH_STEPS),
  geometry: BH_REGION, scale: 1000, maxPixels: 1e11}).get('p'));   // rows: [bin start, count]
var bhEnds = bhHist.slice(1, 0, 1).project([0]).add(ALPHA / BH_STEPS);   // upper edge t of each bin
var bhK = bhHist.slice(1, 1, 2).project([0]).accum(0);                    // k(t): cumulative count of p < t
var bhPass = bhEnds.lte(bhK.divide(bhM).multiply(ALPHA));                // 1 where t ≤ (k(t) / m) × ALPHA
var bhCut = ee.Number(bhEnds.multiply(bhPass).reduce(ee.Reducer.max(), [0]).get([0]));   // largest passing t (0 if none)
var bhSig = p.lte(bhCut).and(p.lt(ALPHA));   // significant after FDR correction
print('ENV506-A: pixels tested (m)', bhM);
print('ENV506-A: BH cut-off p-value (compare with ALPHA = ' + ALPHA + ')', bhCut);
print('ENV506-A: pixels significant at raw p < ALPHA', p.lt(ALPHA).reduceRegion({reducer: ee.Reducer.sum(), geometry: BH_REGION, scale: 1000, maxPixels: 1e11}).get('p'));
print('ENV506-A: pixels significant after BH', bhSig.reduceRegion({reducer: ee.Reducer.sum(), geometry: BH_REGION, scale: 1000, maxPixels: 1e11}).get('p'));
var bhGreen = area.updateMask(bhSig.and(sens.select('slope').gt(0)));
var bhBrown = area.updateMask(bhSig.and(sens.select('slope').lt(0)));
print('ENV506-A: significant greening after BH (km²)', bhGreen.reduceRegion({reducer: ee.Reducer.sum(), geometry: BH_REGION, scale: 1000, maxPixels: 1e11}).get('area'));
print('ENV506-A: significant browning after BH (km²)', bhBrown.reduceRegion({reducer: ee.Reducer.sum(), geometry: BH_REGION, scale: 1000, maxPixels: 1e11}).get('area'));
Map.addLayer(sens.select('slope').updateMask(bhSig).clip(BH_REGION), slopeVis, "ENV506-A: Sen's slope, significant after BH");
ENV506-A END */
// ##################################### end of ENV506 challenge A #################################################

// #####################################################################################################################
// ##  ENV506 COHORT ONLY — CHALLENGE B: RESTREND — trend in NDVI residuals after removing rainfall
// ##  ENV306 students: you do not need this block. Leave it commented out; it does not affect the rest of the script.
// #####################################################################################################################
// HOW TO RUN (ENV506): delete the line  /* ENV506-B START  and the line  ENV506-B END */  below, then click Run.
//   Nothing else needs editing to run it. Lines marked EDIT are the settings to change for YOUR tile and focus year.
// USES: annual (annual NDVI), START, END, n, ALPHA, area, slopeVis, sens, probe and nt from the main script; CHIRPS rainfall.
// FOR AT3 (ENV506): compare the NDVI trend map with the RESTREND map for your tile: where NDVI trends disappear, rainfall explains them;
//   where RESTREND stays negative, something other than rainfall (clearing, fire, grazing) is reducing vegetation.
// READING THE OUTPUT:
//   - Layer "ENV506-B: NDVI–rainfall correlation (r)": high r = vegetation tracks rainfall closely. RESTREND is only
//     meaningful where this relationship is positive and significant (Wessels et al., 2007), so the trend layer is masked to those pixels.
//   - Layer "ENV506-B: RESTREND slope (p < ALPHA)": brown = vegetation declining more than rainfall predicts.
//   - Console: areas of significant positive/negative residual trend, to set beside the NDVI greening/browning areas.
//   - Chart: actual NDVI, NDVI predicted from rainfall, and the residuals at the probe point.
/* ENV506-B START
// RESTREND (Evans & Geerken, 2004; Wessels et al., 2007): fit NDVI = offset + scale × rainfall in every pixel over all
// years, take the residuals (NDVI − predicted), and test the residuals for a trend with Sen's slope and Mann–Kendall.
var RAIN_START_MONTH = 10;   // EDIT: rainfall window = 12 months starting 1 Oct of the previous year (the wet season
                             //       that feeds this year's growth). Justify your window in AT3.
var chirpsR = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD').select('precipitation');
var rsPairs = annual.map(function(img) {
  var y = ee.Number(img.get('year'));
  var s = ee.Date.fromYMD(y.subtract(1), RAIN_START_MONTH, 1);
  var rain = chirpsR.filterDate(s, s.advance(12, 'month')).sum().rename('rain');   // 12-month rainfall (mm)
  return rain.addBands(img.select('NDVI')).copyProperties(img, ['year', 'system:time_start']);
});
// linearFit expects two bands, x then y: it returns 'scale' (NDVI per mm) and 'offset'.
var rsFit = rsPairs.select(['rain', 'NDVI']).reduce(ee.Reducer.linearFit());
var rsCor = rsPairs.select(['rain', 'NDVI']).reduce(ee.Reducer.pearsonsCorrelation());   // bands: correlation, p-value
var rsResid = rsPairs.map(function(img) {
  var pred = rsFit.select('offset').add(rsFit.select('scale').multiply(img.select('rain')));
  return img.select('NDVI').subtract(pred).rename('resid').copyProperties(img, ['year', 'system:time_start']);
});
// Sen's slope of the residuals (NDVI per year)
var rsSens = rsResid.map(function(img) {
  return ee.Image.constant(img.get('year')).float().rename('year').addBands(img);
}).reduce(ee.Reducer.sensSlope()).select('slope').clip(nt);
// Mann–Kendall p-value of the residuals (same method as section 3b)
function mkP(col) {
  var later = ee.Filter.lessThan({leftField: 'system:time_start', rightField: 'system:time_start'});
  var j = ee.ImageCollection(ee.Join.saveAll('after').apply({primary: col, secondary: col, condition: later}));
  var s = ee.ImageCollection(j.map(function(cur) {
    return ee.ImageCollection.fromImages(cur.get('after')).map(function(img) {
      return ee.Image(img).subtract(cur).signum().int().unmask(0);
    });
  }).flatten()).reduce('sum', 2).rename('S');
  var v = ee.Image.constant(n * (n - 1) * (2 * n + 5) / 18);
  var z = ee.Image(0).where(s.gt(0), s.subtract(1).divide(v.sqrt())).where(s.lt(0), s.add(1).divide(v.sqrt()));
  return ee.Image(1).subtract(z.abs().divide(Math.SQRT2).erf()).rename('p');
}
var rsP = mkP(rsResid).clip(nt);
// Use RESTREND only where NDVI responds positively and significantly to rainfall
var rsValid = rsCor.select('correlation').gt(0).and(rsCor.select('p-value').lt(ALPHA));
var rsSig = rsP.lt(ALPHA).and(rsValid);
Map.addLayer(rsCor.select('correlation').clip(nt), {min: -0.2, max: 0.9, palette: ['#f7f7f7', '#9ecae1', '#08519c']}, 'ENV506-B: NDVI–rainfall correlation (r)', false);
Map.addLayer(rsSens.updateMask(rsSig), slopeVis, 'ENV506-B: RESTREND slope (p < ALPHA)');
var rsRegion = nt.geometry();   // EDIT (AT3): your tile polygon from prac00
print('ENV506-B: area where RESTREND is valid (km²)', area.updateMask(rsValid).reduceRegion({reducer: ee.Reducer.sum(), geometry: rsRegion, scale: 1000, maxPixels: 1e11}).get('area'));
print('ENV506-B: significant positive residual trend (km²)', area.updateMask(rsSig.and(rsSens.gt(0))).reduceRegion({reducer: ee.Reducer.sum(), geometry: rsRegion, scale: 1000, maxPixels: 1e11}).get('area'));
print('ENV506-B: significant negative residual trend (km²)', area.updateMask(rsSig.and(rsSens.lt(0))).reduceRegion({reducer: ee.Reducer.sum(), geometry: rsRegion, scale: 1000, maxPixels: 1e11}).get('area'));
// Chart at the probe point: actual NDVI, NDVI predicted from rainfall, and residuals
var rsChartCol = rsPairs.map(function(img) {
  var pred = rsFit.select('offset').add(rsFit.select('scale').multiply(img.select('rain'))).rename('NDVI_predicted');
  return img.select('NDVI').addBands(pred).addBands(img.select('NDVI').subtract(pred).rename('residual'))
    .copyProperties(img, ['year', 'system:time_start']);
});
print(ui.Chart.image.series(rsChartCol, probe, ee.Reducer.mean(), 1000, 'year')
  .setOptions({title: 'ENV506-B: NDVI, NDVI predicted from rainfall, and residual at the probe', pointSize: 4}));
ENV506-B END */
// ##################################### end of ENV506 challenge B #################################################
```

</details>

<details>
<summary><strong>prac02b_harmonic_regression.js</strong> (140 lines)</summary>

```javascript
/**** Prac 02b — Harmonic regression of seasonality (Northern Territory)
 * Model: NDVI(t) = b0 + b1*t + b2*cos(2πt) + b3*sin(2πt) [+ b4*cos(4πt) + b5*sin(4πt)]
 * Data: Landsat 8/9 NDVI, 2014–2024. Amplitude & phase describe seasonal greenness; t in years.
 *
 * WHAT THIS SCRIPT DOES:
 *   Describes the shape of each pixel's yearly greenness cycle in the Darwin hinterland (savanna, Adelaide River
 *   floodplain, cropping and rural blocks). It fits a smooth wave (sine and cosine terms) plus a straight-line
 *   trend to every Landsat NDVI value from 2014–2024, then maps how big the seasonal swing is (amplitude),
 *   when greenness peaks (phase / day of year), the long-term trend, and how well the model fits (RMSE).
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) Edit the line marked HARMONICS (section 1): 1 = one peak per year, 2 = allows a second peak.
 *   (3) Click Run.
 *   (4) Read the charts in the Console (right panel), turn layers on/off in the Map's Layers list, and start the
 *       export in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   Charts: observed vs fitted NDVI at three probe sites.
 *   Map: seasonality colour composite (hue = peak timing, saturation = amplitude, brightness = constant term),
 *   amplitude, day of year of peak NDVI, linear trend term, and regression RMSE.
 *
 * DATA:
 *   LANDSAT/LC08/C02/T1_L2 and LANDSAT/LC09/C02/T1_L2 — Landsat 8/9 Collection 2 surface reflectance, 30 m;
 *   2014–2024 used (red and NIR bands only, for NDVI).
 *
 * LINKS:
 *   Prac page: pracs/prac02-monitoring-vegetation-condition-trends-and-seasonality.md
 *   Assessment: Prac 02; AT3 (trend and seasonality); AT4 Part 3.
 *
 * KEY GEE IDEAS:
 *   - map() to add predictor bands (constant, time, cos, sin) to every image.
 *   - Per-pixel least-squares regression with ee.Reducer.linearRegression and array images.
 *   - Server-side vs client-side: a JavaScript for-loop builds band names in the browser; evaluate() brings
 *     server results back to the browser to make one chart per site.
 *   - Exports of multi-band results with float() and a stated crs and scale.
 *
 * Q = core (ENV306 and ENV506).  EXT = ENV506 extension.
 ****/

// ---------- 1 Study area ----------
// Area of interest, three probe points for charts, and the number of harmonics (waves per year) to fit.
var aoi = ee.Geometry.Rectangle([130.70, -13.00, 131.40, -12.40]);   // Darwin hinterland: savanna, floodplain, cropping
var probes = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([131.1501, -12.4952]), {name: 'Howard Springs savanna'}),   // [lon, lat]
  ee.Feature(ee.Geometry.Point([131.30, -12.60]), {name: 'Adelaide River floodplain'}),
  ee.Feature(ee.Geometry.Point([131.04, -12.73]), {name: 'Mixed rural blocks'})
]);
Map.centerObject(aoi, 10);
var HARMONICS = 1;   // try 2 for a bimodal season
// EDIT HARMONICS: 1 = one cycle per year (annual wave); 2 = also a half-year wave, so the fitted curve can have two peaks.

// ---------- 2 Data ----------
// Make a cloud-masked NDVI image for every Landsat 8/9 scene over the area, 2014–2024.
function prep(img) {
  var qa = img.select('QA_PIXEL');
  // Keep pixels where QA bits 1 (dilated cloud), 3 (cloud) and 4 (cloud shadow) are all 0 (= clear).
  var mask = qa.bitwiseAnd(1 << 1).eq(0).and(qa.bitwiseAnd(1 << 3).eq(0)).and(qa.bitwiseAnd(1 << 4).eq(0));
  var sr = img.select(['SR_B4', 'SR_B5']).multiply(0.0000275).add(-0.2);   // red, NIR → reflectance (scale and offset)
  return sr.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI').updateMask(mask)   // (NIR − red) / (NIR + red)
    .copyProperties(img, ['system:time_start']);   // keep the date: the model needs it
}
var ndvi = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2').merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
  .filterBounds(aoi).filterDate('2014-01-01', '2025-01-01').map(prep);   // end date exclusive → through 2024

// ---------- 3 Build independent variables ----------
// The regression needs the predictors (x variables) as bands on every image: a constant (intercept),
// time t (for the trend) and a cos and sin band for each harmonic.
var harmonicNames = [];
// Ordinary JavaScript loop (runs in your browser): builds the band names, e.g. ['cos1', 'sin1'].
for (var k = 1; k <= HARMONICS; k++) { harmonicNames.push('cos' + k, 'sin' + k); }
var independents = ['constant', 't'].concat(harmonicNames);   // e.g. ['constant', 't', 'cos1', 'sin1']
function addVars(img) {
  var t = img.date().difference(ee.Date('2014-01-01'), 'year');   // time in years since 1 Jan 2014 (decimal)
  var out = img.addBands(ee.Image.constant(1).rename('constant'))   // 1 everywhere → gives the intercept b0
               .addBands(ee.Image.constant(t).float().rename('t'));
  for (var k = 1; k <= HARMONICS; k++) {
    var w = ee.Image.constant(t).multiply(2 * Math.PI * k);   // angle: one full cycle (2π) per year for k = 1
    out = out.addBands(w.cos().rename('cos' + k)).addBands(w.sin().rename('sin' + k));
  }
  return out.float();   // same data type for all bands, required by the regression reducer
}
var withVars = ndvi.map(addVars);

// ---------- 4 Fit ----------
// Fit the model separately in every pixel by least squares, using all clear observations of that pixel.
var fit = withVars.select(independents.concat(['NDVI']))   // x bands first, then the y band (NDVI) last
  .reduce(ee.Reducer.linearRegression({numX: independents.length, numY: 1}));
// The result is an array image; arrayProject/arrayFlatten turn it into one ordinary band per coefficient.
var coefs = fit.select('coefficients').arrayProject([0]).arrayFlatten([independents]).clip(aoi);
var rmse = fit.select('residuals').arrayFlatten([['rmse']]).clip(aoi);   // root-mean-square of the residuals (NDVI units)

// Amplitude = height of the seasonal wave = √(cos1² + sin1²). Large = strong wet/dry contrast.
var amplitude = coefs.select('cos1').hypot(coefs.select('sin1')).rename('amplitude');
// Phase = where in the yearly cycle the wave peaks, as an angle from −π to π.
var phase = coefs.select('sin1').atan2(coefs.select('cos1')).rename('phase');   // radians
// Day of year of peak greenness from phase (t measured from 1 January)
// phase ÷ 2π = fraction of a year; × 365.25 = days; + 365.25 then mod 365.25 makes negative values wrap into 0–365.
var peakDoy = phase.divide(2 * Math.PI).multiply(365.25).add(365.25).mod(365.25).rename('peak_doy');

// Predicted NDVI for every image: multiply each predictor band by its coefficient and add them up.
var fitted = withVars.map(function(img) {
  return img.select('NDVI').addBands(img.select(independents).multiply(coefs).reduce('sum').rename('fitted'));
});
// evaluate() fetches the three probe features to the browser, so we can loop over them and print one chart each.
probes.toList(3).evaluate(function(list) {
  list.forEach(function(f) {   // f is now a plain JavaScript object (GeoJSON), not an ee object
    var g = ee.Feature(f).geometry();   // turn it back into an ee geometry for the chart
    print(ui.Chart.image.series(fitted, g, ee.Reducer.mean(), 30)   // scale 30 m = Landsat pixel
      .setSeriesNames(['NDVI', 'fitted'])
      .setOptions({title: f.properties.name + ': observed vs harmonic fit', lineWidth: 1, pointSize: 2,
                   series: {0: {lineWidth: 0}, 1: {pointSize: 0, lineWidth: 2}}}));   // observed = dots, fitted = line
  });
});

// ---------- 5 Visualise ----------
// Map the seasonality results. Most layers start switched off — turn them on in the Layers list.
// Phase–amplitude–mean as HSV → RGB: hue = timing of peak, saturation = amplitude, value = mean greenness
// unitScale maps phase −π…π to 0–1 (hue); amplitude × 2.5 stretches typical amplitudes towards 0–1 (saturation);
// the constant term (intercept, close to mean NDVI) gives brightness (value).
var hsv = phase.unitScale(-Math.PI, Math.PI)
  .addBands(amplitude.multiply(2.5))
  .addBands(coefs.select('constant')).hsvToRgb();
Map.addLayer(hsv, {}, 'Seasonality (hue = peak timing, sat = amplitude, value = mean)');
Map.addLayer(amplitude, {min: 0, max: 0.3, palette: ['white', 'darkgreen']}, 'Amplitude', false);
Map.addLayer(peakDoy, {min: 1, max: 365, palette: ['#2c7bb6', '#abd9e9', '#ffffbf', '#fdae61', '#d7191c']}, 'Day of year of peak NDVI', false);
Map.addLayer(coefs.select('t'), {min: -0.02, max: 0.02, palette: ['brown', 'white', 'green']}, 'Linear trend term (NDVI/yr)', false);
Map.addLayer(rmse, {min: 0, max: 0.15, palette: ['white', 'red']}, 'Regression RMSE (NDVI units)', false);   // red = poor fit

// ---------- 6 Export ----------
// Save the coefficients, amplitude, phase and peak day as one GeoTIFF in Google Drive. Start it in the Tasks tab.
// crs EPSG:32752 = WGS 84 / UTM zone 52S; scale 30 m = Landsat pixel size.
Export.image.toDrive({image: coefs.addBands([amplitude, phase, peakDoy]).float(), description: 'Prac02b_harmonic_coefs',
  folder: 'GEE_NT', region: aoi, scale: 30, crs: 'EPSG:32752', maxPixels: 1e10});

// Q: Which land covers have the largest amplitude? When does each peak?
// Q: The wet season brings cloud; how does uneven sampling affect the fit?
// Q: Set HARMONICS = 2. Where does the fit improve (lower RMSE) and why?
// EXT: Use the coefficients as classification predictors (Prac 04a) and test whether they improve accuracy.
// EXT: Fit separate models for 2014–2018 and 2020–2024 and map the change in amplitude/phase — a phenology-shift analysis.
```

</details>

---

[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 01](prac01-earth-engine-image-processing-fundamentals-and-vegetation-dynamics.md) · [Prac 03 →](prac03-climate-and-hydrology-drivers-rainfall-anomalies-drought-indices-lst-and-et.md)
