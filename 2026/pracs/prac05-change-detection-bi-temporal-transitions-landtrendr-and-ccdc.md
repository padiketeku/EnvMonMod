[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 04](prac04-land-cover-mapping-and-landscape-metrics.md) · [Prac 06 →](prac06-monitoring-land-clearing.md)

# Prac 05: Change detection: bi-temporal transitions, LandTrendr and CCDC

**When:** Thu 5 Nov 2026, Session 1 (transition matrix) and Session 3 (LandTrendr and CCDC); **AT1 in class, Session 4** · **Scripts:** [`prac05a_transition_matrix.js`](../scripts/prac05a_transition_matrix.js), [`prac05b_landtrendr_ccdc.js`](../scripts/prac05b_landtrendr_ccdc.js) · **ULOs:** 1, 2, 3, 4

**Also available in:** Python and R versions of LandTrendr in [`prac02_05_trends_seasonality_change.py`](../alternatives/python/prac02_05_trends_seasonality_change.py) and [`prac02_05_trends_seasonality_change.R`](../alternatives/r/prac02_05_trends_seasonality_change.R); QGIS [recipe](../alternatives/qgis/README.md). The transition matrix for AT1 is Code Editor only.

**Purpose.** Detect change between two dates in your own tile (your transition matrix for AT1), then over decades with LandTrendr and CCDC.

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

**Activity 5.1 – Bi-temporal change and the transition matrix (`prac05a`, Session 1), needed for AT1.**

1. Paste your tile geometry and AT1 year pair (from `prac00`), and point `TRAINING` to your Prac 04 training points.
2. Build dry-season Landsat 8/9 composites for both years, and classify both with one RF trained on year A. Report the hold-out accuracy.
3. Compute the 5 × 5 transition matrix in hectares (water, woodland, agriculture, bare soil, grassland/other).
4. Map woodland → agriculture and all changed pixels, then export the matrix. **Bring it to AT1 in Session 4.**

**Activity 5.2 – Multi-temporal change (`prac05b`, Session 3).**

1. Map bi-temporal dNBR for your year pair (section 4.1 of the script).
2. Run LandTrendr on inverted NBR for 1988–2024 in the Douglas–Daly, and map the year and magnitude of the greatest disturbance.
3. Run CCDC for 2000–2024, and map the most recent break and the number of breaks.
4. Map where the two algorithms agree, and compare them with your transition matrix.

> **Reading link (notes 2.3 and 2.4, Edwards et al. 2018 and Thomas et al. 2024).** dNBR (step 1 of Activity 5.2) and LandTrendr respond to any disturbance, fire as well as clearing. Thomas et al. needed clearing only, so permanent clearing must be separated from fire scars that recover within a year or two. Use the recovery after each break in LandTrendr and CCDC (steps 2–3) to make that distinction in your tile.

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

- **AT1 (supervised, Thu 5 Nov, 3:30–4:30 pm):** answer unseen questions about **your own** transition matrix from Activity 5.1.
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

## Full scripts

Each script is copied here from [`scripts/`](../scripts) so this page has everything in one place. The `.js` file is the master copy: if the two ever differ, use the file. Click a heading to open the script, then use the copy button and paste it into a new script in the Code Editor.

<details>
<summary><strong>prac05a_transition_matrix.js</strong> (162 lines)</summary>

```javascript
/**** Prac 05a — Bi-temporal change: post-classification comparison and YOUR transition matrix (for AT1)
 * ENV306/506 Environmental Monitoring and Modelling (2026)
 * Inputs: your Prac 00 tile and AT1 years, and your Prac 04 training points ('class' 0–4).
 * Method: Landsat 8/9 dry-season composites → Random Forest trained on YEAR_A → classify both years
 *         → cross-tabulate (from-class × to-class) areas → transition matrix and change map.
 * AT1 (in class, Thu 5 Nov 3:30–4:30): short answers about THIS matrix. Bring the printed table and the export.
 *
 * WHAT THIS SCRIPT DOES:
 *   Asks: how much of your tile changed from one land-cover class to another between YEAR_A and YEAR_B?
 *   It builds a dry-season Landsat composite for each year, trains a Random Forest on your Prac 04 points (YEAR_A),
 *   classifies both years with that one model, and counts the hectares in every from-class → to-class combination.
 *   The result is YOUR transition matrix — the table you bring to the in-class AT1.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) EDIT the four lines in section 0: TILE, YEAR_A, YEAR_B and TRAINING (replace YOUR_PROJECT with your
 *       Cloud project name, or paste your tile polygon). Nothing else needs changing.
 *   (3) Click Run.
 *   (4) Read the accuracy and the transition matrix in the Console (right panel), turn layers on/off in the Map's
 *       Layers list, and start the export in the Tasks tab. The exported CSV is what you bring to AT1.
 *
 * WHAT YOU WILL SEE:
 *   Map layers: composites for YEAR_A and YEAR_B; land cover for both years; Woodland → Agriculture (red);
 *   any change (yellow); your tile outline.
 *   Console: hold-out overall accuracy and kappa; producer's and user's accuracy; the transition matrix (ha);
 *   persistence (% of tile unchanged).
 *
 * DATA:
 *   LANDSAT/LC08/C02/T1_L2 and LANDSAT/LC09/C02/T1_L2 — Landsat 8/9 Collection 2 Level 2 surface reflectance, 30 m,
 *     dry season (May–Oct) of YEAR_A and YEAR_B. Landsat 9 data begin in late 2021.
 *   Your assets: the Prac 00 tile (TILE) and Prac 04 training points (TRAINING).
 *
 * LINKS:
 *   Prac page: pracs/prac05-change-detection-bi-temporal-transitions-landtrendr-and-ccdc.md
 *   Assessment: Prac 05; AT1 (your transition matrix).
 *
 * KEY GEE IDEAS:
 *   - Post-classification comparison: classify each date, then compare the maps pixel by pixel.
 *   - Encoding two maps as one image (from × 10 + to) so a grouped reducer can sum area per transition.
 *   - Server-side vs client-side: IDX/NAMES are JavaScript lists (client); groups and matrix are ee objects (server).
 *   - Exports run only when you start them in the Tasks tab.
 *
 * Q = core (ENV306 and ENV506).  EXT = ENV506 extension.
 ****/

// ---------- 0 EDIT: from Prac 00 and Prac 04 ----------
// >>> YOU MUST EDIT THE FOUR LINES MARKED EDIT BELOW (TILE, YEAR_A, YEAR_B, TRAINING). <<<
// Use the same tile and years you recorded in Prac 00, and the training points you made in Prac 04.
// EDIT TILE: your Prac 00 tile asset path (replace YOUR_PROJECT), or paste the polygon from Prac 00.
var TILE = ee.FeatureCollection('projects/YOUR_PROJECT/assets/my_tile').geometry();   // or paste the polygon from Prac 00
var YEAR_A = 2018;   // Prac 00: AT1 YEAR_A   <- EDIT (the earlier year)
var YEAR_B = 2024;   // Prac 00: AT1 YEAR_B   <- EDIT (the later year)
// EDIT TRAINING: your Prac 04 training points asset. Each point needs an integer 'class' 0–4 in the order of NAMES below.
var TRAINING = ee.FeatureCollection('projects/YOUR_PROJECT/assets/prac04_training');   // points with integer 'class'
// Do not edit below this line unless your classes differ. NAMES[i], IDX[i] and PAL[i] all describe class i.
var NAMES = ['Water', 'Woodland', 'Agriculture', 'Bare soil', 'Grassland/other'];
var IDX = [0, 1, 2, 3, 4];   // class numbers
var PAL = ['#2166ac', '#1b7837', '#fdae61', '#bf812d', '#d9f0a3'];   // map colours for classes 0–4
Map.centerObject(TILE, 11);

// ---------- 1 Composites (Landsat 8/9, dry season May–Oct) ----------
// One cloud-masked median composite per year. The dry season is used because it is mostly cloud-free in the NT
// and vegetation differences (woodland vs cleared land) are clearest.
function prep(img) {
  var qa = img.select('QA_PIXEL');
  // parseInt('11111', 2) = 31: checks bits 0–4 together. Keep a pixel only if all five flags are off.
  var mask = qa.bitwiseAnd(parseInt('11111', 2)).eq(0);   // fill, dilated cloud, cirrus, cloud, shadow
  // Select six reflectance bands and give them readable names (blue, green, ...).
  var sr = img.select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'], ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'])
    .multiply(0.0000275).add(-0.2);   // Collection 2 scale factor and offset → surface reflectance (0–1)
  return sr.updateMask(mask);
}
function composite(year) {
  var med = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2').merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
    // median: robust to leftover cloud and shadow
    .filterBounds(TILE).filterDate(year + '-05-01', year + '-10-31').map(prep).median();
  // Note: Landsat 9 starts in late 2021; for YEAR < 2021 the composite is Landsat 8 only.
  // Add three indices as extra predictors: NDVI (greenness), MNDWI (water), NDBI (built-up/bare).
  return med.addBands(med.normalizedDifference(['nir', 'red']).rename('NDVI'))
    .addBands(med.normalizedDifference(['green', 'swir1']).rename('MNDWI'))
    .addBands(med.normalizedDifference(['swir1', 'nir']).rename('NDBI'))
    .clip(TILE);
}
var imgA = composite(YEAR_A), imgB = composite(YEAR_B);
var bands = imgA.bandNames();   // the 9 predictor bands (6 reflectance + 3 indices)
Map.addLayer(imgA, {bands: ['red', 'green', 'blue'], min: 0, max: 0.2}, 'Composite ' + YEAR_A, false);   // true colour
Map.addLayer(imgB, {bands: ['red', 'green', 'blue'], min: 0, max: 0.2}, 'Composite ' + YEAR_B, false);

// ---------- 2 Train on YEAR_A, 70/30 hold-out ----------
// Read the YEAR_A composite at each training point, split the points 70 % training / 30 % testing,
// train a Random Forest and check its accuracy on the 30 % it has not seen.
// filterBounds keeps only points inside your tile; scale 30 = Landsat pixel; tileScale 4 helps avoid memory errors.
var samples = imgA.sampleRegions({collection: TRAINING.filterBounds(TILE), properties: ['class'], scale: 30, tileScale: 4})
  .randomColumn('r', 42);   // random number 0–1 per point (seed 42 makes the split repeatable)
var train = samples.filter(ee.Filter.lt('r', 0.7)), test = samples.filter(ee.Filter.gte('r', 0.7));
// 200 trees: a starting value
var rf = ee.Classifier.smileRandomForest({numberOfTrees: 200, seed: 1}).train(train, 'class', bands);
// errorMatrix(reference, predicted, order): IDX fixes the row/column order to classes 0–4.
var cm = test.classify(rf).errorMatrix('class', 'classification', IDX);
print('Hold-out accuracy (' + YEAR_A + '): overall, kappa', cm.accuracy(), cm.kappa());   // overall accuracy is 0–1
print("Producer's and user's accuracy", cm.producersAccuracy(), cm.consumersAccuracy());   // one value per class, in IDX order

// ---------- 3 Classify both years ----------
// The same model is applied to YEAR_B. Q: what assumption does this make, and when does it fail?
// Hint: think about whether the same class looks the same in both years (sensor, rainfall, fire, green-up).
var lcA = imgA.classify(rf).rename('lcA');
var lcB = imgB.classify(rf).rename('lcB');
Map.addLayer(lcA, {min: 0, max: 4, palette: PAL}, 'Land cover ' + YEAR_A, false);
Map.addLayer(lcB, {min: 0, max: 4, palette: PAL}, 'Land cover ' + YEAR_B, false);

// ---------- 4 Transition matrix ----------
// Every pixel gets a two-digit code: tens digit = YEAR_A class, units digit = YEAR_B class.
// A grouped reducer then sums the pixel areas (ha) for each code — that is the cross-tabulation.
var code = lcA.multiply(10).add(lcB).rename('code');   // e.g. 12 = Woodland → Agriculture
// pixelArea() is m² per pixel; ÷ 1e4 = ha. group({groupField: 1}) sums band 0 (area) for each value of band 1 (code).
var grouped = ee.Image.pixelArea().divide(1e4).addBands(code).reduceRegion({
  reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'code'}),
  geometry: TILE, scale: 30, maxPixels: 1e10, tileScale: 4});   // scale 30 m = Landsat; maxPixels raised for big tiles
// Turn the list of {code, sum} groups into a FeatureCollection so it can be filtered by code.
var groups = ee.FeatureCollection(ee.List(grouped.get('groups')).map(function(d) { return ee.Feature(null, d); }));

// Build the matrix: one row (feature) per YEAR_A class, one column per YEAR_B class.
// IDX.map and IDX.forEach are client-side loops that write the server-side lookups into each row.
var rows = IDX.map(function(i) {
  var props = {from_class: NAMES[i]};
  IDX.forEach(function(j) {
    var match = groups.filter(ee.Filter.eq('code', i * 10 + j));   // the group for transition i → j
    // Column name, e.g. to_Bare_soil (characters other than letters become _).
    props['to_' + NAMES[j].replace(/[^A-Za-z]/g, '_')] =
      // area in ha; 0 if that transition never occurs
      ee.Number(ee.Algorithms.If(match.size().gt(0), match.first().get('sum'), 0)).round();
  });
  return ee.Feature(null, props);
});
var matrix = ee.FeatureCollection(rows);
// THIS IS YOUR AT1 MATRIX. Diagonal cells (Water → Water, ...) = persistence; off-diagonal cells = change.
print('Transition matrix (ha): rows = ' + YEAR_A + ', columns = ' + YEAR_B, matrix);

// Persistence and gross change
// Codes 0, 11, 22, 33, 44 are the diagonal (same class in both years). Persistence = unchanged area ÷ tile area.
var stable = groups.filter(ee.Filter.inList('code', [0, 11, 22, 33, 44])).aggregate_sum('sum');
var total = groups.aggregate_sum('sum');   // total classified area (ha)
print('Persistence (% of tile)', ee.Number(stable).divide(total).multiply(100));   // 100 − persistence = gross change (%)

// ---------- 5 Visualise ----------
// Where the changes are: one transition of interest in red, and every changed pixel in yellow (off by default).
var w2a = lcA.eq(1).and(lcB.eq(2)).selfMask();   // Woodland (1) in YEAR_A and Agriculture (2) in YEAR_B
Map.addLayer(w2a, {palette: 'red'}, 'Woodland → Agriculture ' + YEAR_A + '–' + YEAR_B);
Map.addLayer(lcA.neq(lcB).selfMask(), {palette: 'yellow'}, 'Any change', false);
// outline only
Map.addLayer(ee.FeatureCollection([ee.Feature(TILE)]).style({color: 'red', fillColor: '00000000'}), {}, 'My tile');

// ---------- 6 Export (bring to AT1) ----------
// Saves the transition matrix as a CSV (the default format) to the GEE_NT folder in Google Drive.
// Go to the Tasks tab and click Run. Bring this CSV (and the printed Console table) to the in-class AT1.
Export.table.toDrive({collection: matrix, description: 'AT3_transition_matrix_' + YEAR_A + '_' + YEAR_B, folder: 'GEE_NT'});

// Q: Which transition is largest after persistence? Is it real change or classification error? How would you tell?
// Q: If each map is 85 % accurate, roughly how accurate can the change map be? Why do errors compound?
// Q: Why is a cross-tabulation more informative than comparing the class totals in the two years?
// EXT: Train a separate model on YEAR_B (with your own YEAR_B points) and compare the matrices.
// EXT: Area-adjust the woodland → agriculture area with a stratified sample of change/no-change (Olofsson et al. 2014).
```

</details>

<details>
<summary><strong>prac05b_landtrendr_ccdc.js</strong> (190 lines)</summary>

```javascript
/**** Prac 05b — Change detection: LandTrendr and CCDC (Douglas–Daly, NT)
 * LandTrendr: annual composites → piecewise-linear segments (Kennedy et al. 2010, 2018).
 * CCDC: all clear observations → harmonic models + breaks (Zhu & Woodcock 2014).
 *
 * WHAT THIS SCRIPT DOES:
 *   Asks when, how much and how often the landscape changed in the Douglas–Daly region (NT) between 1988 and 2024.
 *   It builds a cleaned Landsat 5/7/8/9 time series, then runs two time-series change algorithms:
 *   LandTrendr (fits straight-line segments to one dry-season NBR value per year) and
 *   CCDC (fits seasonal harmonic curves to every clear image and flags "breaks").
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) Optional EDIT lines: the study area (aoi, probe) in section 1, START/END years, YEAR_A/YEAR_B and MAG_T.
 *   (3) Click Run. LandTrendr and CCDC are heavy — tiles can take a minute or more to draw.
 *   (4) Read the Console (right panel) for the probe chart, turn layers on/off in the Map's Layers list,
 *       and start the export in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   - Map: bi-temporal dNBR (YEAR_A to YEAR_B), LandTrendr year and magnitude of greatest disturbance,
 *     CCDC most recent break year and number of breaks, and where both algorithms agree after 2005.
 *   - Console: chart of raw vs LandTrendr-fitted NBR at the probe point.
 *
 * DATA:
 *   - Landsat 5 TM Collection 2 Level 2 surface reflectance, LANDSAT/LT05/C02/T1_L2, 30 m, 1984–2011.
 *   - Landsat 7 ETM+ C2 L2, LANDSAT/LE07/C02/T1_L2, 30 m, used only 1999 to May 2003 (before the SLC failure).
 *   - Landsat 8 OLI C2 L2, LANDSAT/LC08/C02/T1_L2, 30 m, 2013–present.
 *   - Landsat 9 OLI-2 C2 L2, LANDSAT/LC09/C02/T1_L2, 30 m, 2021–present.
 *
 * LINKS: pracs/prac05-change-detection-bi-temporal-transitions-landtrendr-and-ccdc.md (course repository).
 *   Feeds Prac 05 and AT4 Part 2.
 *
 * KEY GEE IDEAS:
 *   - map() a function over an ImageCollection to mask clouds, rescale and rename bands for every image.
 *   - Building an annual collection from a list of years (ee.List.sequence + ee.ImageCollection.fromImages).
 *   - Array images: LandTrendr and CCDC return per-pixel arrays that are sliced, masked and sorted.
 *   - reduceRegion at a point to pull values back for a chart; Export.image.toDrive for outputs.
 *
 * Q = core (ENV306 and ENV506). EXT = ENV506 extension.
 ****/

// ---------- 1 Study area ----------
// A small rectangle keeps LandTrendr/CCDC fast. The probe point is one pixel we chart in detail.
var aoi = ee.Geometry.Rectangle([131.10, -14.00, 131.40, -13.75]);   // [west, south, east, north] in degrees (EPSG:4326)
var probe = ee.Geometry.Point([131.19, -13.83]);                        // [lon, lat] of the pixel to chart
Map.centerObject(aoi, 11);                                              // 11 = zoom level

// ---------- 2 Data: harmonised Landsat 5/7/8/9 ----------
// Landsat 5/7 and 8/9 number their bands differently. These two functions mask cloud, rename bands to
// common names (blue … swir2) and convert to surface reflectance, so all four sensors can be merged.
function prepL57(img) {
  var qa = img.select('QA_PIXEL');   // quality band: each bit is a yes/no flag
  // Bit 3 = cloud, bit 4 = cloud shadow. Keep pixels where both bits are 0 (clear).
  var mask = qa.bitwiseAnd(1 << 3).eq(0).and(qa.bitwiseAnd(1 << 4).eq(0));
  return img.select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'], ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'])
    // Collection 2 scale factor and offset: reflectance = DN × 0.0000275 − 0.2 (unitless, about 0–1).
    // copyProperties keeps the image date, which is lost after maths on an image.
    .multiply(0.0000275).add(-0.2).updateMask(mask).copyProperties(img, ['system:time_start']);
}
function prepL89(img) {
  var qa = img.select('QA_PIXEL');   // same QA bits as Landsat 5/7: bit 3 cloud, bit 4 shadow
  var mask = qa.bitwiseAnd(1 << 3).eq(0).and(qa.bitwiseAnd(1 << 4).eq(0));
  // Landsat 8/9 band numbers are shifted by one (B2 = blue), so the same names map to different bands.
  return img.select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'], ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'])
    .multiply(0.0000275).add(-0.2).updateMask(mask).copyProperties(img, ['system:time_start']);
}
// One merged collection of every clear Landsat image over the AOI. filterBounds keeps only scenes that touch the AOI.
var col = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2').map(prepL57)
  .merge(ee.ImageCollection('LANDSAT/LE07/C02/T1_L2').filterDate('1999-01-01', '2003-05-31').map(prepL57))  // L7 pre-SLC failure
  .merge(ee.ImageCollection('LANDSAT/LC08/C02/T1_L2').map(prepL89))
  .merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2').map(prepL89))
  .filterBounds(aoi);
// Note: L5 ends Nov 2011 and L8 begins Apr 2013, so 2012 has no clean data here (L7 SLC-off could fill it).

// ======================= LandTrendr =======================
// LandTrendr needs ONE value per pixel per year. We build a dry-season (May–Sep) median NBR composite for each year.
// NBR (Normalised Burn Ratio) = (NIR − SWIR2) / (NIR + SWIR2); unitless, −1 to 1; high = green, dense vegetation.
var START = 1988, END = 2024;   // EDIT: first and last year of the time series
var annual = ee.ImageCollection.fromImages(ee.List.sequence(START, END).map(function(y) {
  // Images from year y AND months May–Sep (NT dry season: fewer clouds, more stable vegetation signal).
  var c = col.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(5, 9, 'month'));
  var med = c.median();   // median per pixel: robust to leftover cloud, haze and single burnt dates
  var nbr = med.normalizedDifference(['nir', 'swir2']);
  // LandTrendr expects disturbance to INCREASE the index → multiply NBR by −1
  return nbr.multiply(-1).rename('NBR_inv').addBands(nbr.rename('NBR'))   // NBR kept as a second band to fit too
    .set('system:time_start', ee.Date.fromYMD(y, 8, 1).millis())          // stamp each composite as 1 August of year y
    .set('n', c.size());                                                   // number of images used (0 = no data that year)
})).filter(ee.Filter.gt('n', 0));   // drop empty years (e.g. 2012) so LandTrendr does not see blank images

// ---------- Warm-up: bi-temporal change (two dates only) ----------
// Before fitting a whole trajectory, compare two years. Positive dNBR = vegetation loss (clearing, fire).
var YEAR_A = 2017, YEAR_B = 2024;   // EDIT: the "before" and "after" years
var nbrA = annual.filter(ee.Filter.calendarRange(YEAR_A, YEAR_A, 'year')).first().select('NBR');
var nbrB = annual.filter(ee.Filter.calendarRange(YEAR_B, YEAR_B, 'year')).first().select('NBR');
var dNBR_AB = nbrA.subtract(nbrB).rename('dNBR').clip(aoi);   // before − after, so loss is positive
// Green = NBR went up (regrowth), white = little change, red = NBR went down (loss).
Map.addLayer(dNBR_AB, {min: -0.4, max: 0.4, palette: ['#1a9850', '#f7f7f7', '#d73027']}, '4.1: Bi-temporal dNBR ' + YEAR_A + '−' + YEAR_B, false);
// Q: What can two dates NOT tell you about when, how fast and how often change happened? LandTrendr answers this below.

// Run LandTrendr. The FIRST band (NBR_inv) is segmented; the other band (NBR) is fitted to the same vertices.
// These parameter values are common starting values from Kennedy et al. (2018) — test others.
var lt = ee.Algorithms.TemporalSegmentation.LandTrendr({
  timeSeries: annual.select(['NBR_inv', 'NBR']),
  // maxSegments: most straight-line pieces allowed; spikeThreshold: 0.9 damps one-year spikes (e.g. a single fire);
  // vertexCountOvershoot: extra vertices tried then pruned; preventOneYearRecovery: no full recovery in a single year.
  maxSegments: 6, spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true,
  // recoveryThreshold: blocks recovery faster than 1/0.25 = 4 years; pvalThreshold: fit must be significant (p ≤ 0.05);
  // bestModelProportion: accept a simpler model if it is ≥ 75% as good; minObservationsNeeded: at least 6 years of data.
  recoveryThreshold: 0.25, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 6
});
// 'LandTrendr' band = 2-D array: rows [year, raw, fitted, isVertex] × columns (years)
// The next lines turn that array into "segments" (start → end vertex) and measure each one.
var ltArr = lt.select('LandTrendr');
var vertexMask = ltArr.arraySlice(0, 3, 4);         // row 3 = isVertex (1 where a segment starts or ends)
var vertices = ltArr.arrayMask(vertexMask);         // keep only the vertex years (columns)
// Each segment runs from one vertex (left) to the next (right).
var left = vertices.arraySlice(1, 0, -1), right = vertices.arraySlice(1, 1, null);
var startYear = left.arraySlice(0, 0, 1), endYear = right.arraySlice(0, 0, 1);   // row 0 = year
var startVal = left.arraySlice(0, 2, 3), endVal = right.arraySlice(0, 2, 3);     // row 2 = fitted value
var mag = endVal.subtract(startVal);              // positive = disturbance (in inverted NBR)
var dur = endYear.subtract(startYear);            // segment length in years
var segInfo = ee.Image.cat([startYear, endYear, mag, dur]).toArray(0).arraySlice(0, 0, 4);   // rows: yod, end, mag, dur

// Greatest disturbance segment
// Sort segments by magnitude (×−1 so the largest comes first), then keep the first column.
var sortByMag = segInfo.arraySlice(0, 2, 3).multiply(-1);
var greatest = segInfo.arraySort(sortByMag).arraySlice(1, 0, 1);
var gd = greatest.arrayProject([0]).arrayFlatten([['yod', 'end', 'mag', 'dur']]);   // array → 4 ordinary bands
var MAG_T = 0.15;   // NBR units
// MAG_T is a starting value — test others. Smaller picks up more subtle change (and more noise, e.g. fire).
var dist = gd.updateMask(gd.select('mag').gt(MAG_T));   // keep only pixels whose biggest drop exceeds MAG_T
var yod = dist.select('yod').add(1).clip(aoi);   // year of detection = first year after the start vertex
// Rainbow palette: purple = early (1990), red = recent (2024).
Map.addLayer(yod, {min: 1990, max: 2024, palette: ['#9400D3', '#4B0082', '#0000FF', '#00FF00', '#FFFF00', '#FF7F00', '#FF0000']}, 'LandTrendr: year of greatest disturbance');
Map.addLayer(dist.select('mag').clip(aoi), {min: MAG_T, max: 0.6, palette: ['#fee5d9', '#a50f15']}, 'LandTrendr: magnitude', false);

// Raw vs fitted at the probe
// reduceRegion with Reducer.first() at 30 m (Landsat pixel size) pulls the array for one pixel to the client.
var ltProbe = ltArr.reduceRegion(ee.Reducer.first(), probe, 30).get('LandTrendr');
// Turn each array column (one year) into a Feature so it can be charted. Values are ×−1 to return to normal NBR.
var probeFc = ee.FeatureCollection(ee.List.sequence(0, ee.Array(ltProbe).length().get([1]).subtract(1)).map(function(i) {
  var a = ee.Array(ltProbe);
  return ee.Feature(null, {year: a.get([0, i]), raw: ee.Number(a.get([1, i])).multiply(-1), fitted: ee.Number(a.get([2, i])).multiply(-1)});
}));
// Points = raw annual NBR; line = LandTrendr fit. Look for sharp drops (disturbance) and slow rises (recovery).
print(ui.Chart.feature.byFeature(probeFc, 'year', ['raw', 'fitted'])
  .setOptions({title: 'LandTrendr NBR at probe (raw vs fitted)', series: {0: {pointSize: 3, lineWidth: 0}, 1: {lineWidth: 2}}}));

// ======================= CCDC =======================
// CCDC uses EVERY clear image (not annual composites). It fits a seasonal harmonic curve per band and
// starts a new curve when several observations in a row depart from the prediction (a "break").
var ccdcInput = col.filterDate('2000-01-01', '2025-01-01').map(function(img) {
  var ndvi = img.normalizedDifference(['nir', 'red']).rename('ndvi');   // NDVI added as an extra band to model (unitless)
  return img.select(['green', 'red', 'nir', 'swir1', 'swir2']).addBands(ndvi);
});
// Parameters are typical defaults (Zhu & Woodcock 2014; Arévalo et al. 2020) — test others.
var ccdc = ee.Algorithms.TemporalSegmentation.Ccdc({
  // breakpointBands: bands tested for a break; minObservations: consecutive outliers needed to confirm a break;
  // chiSquareProbability: how unusual the outliers must be; minNumOfYearsScaler: minimum years before fitting a model;
  // dateFormat 1 = fractional years (e.g. 2015.5); lambda: LASSO regularisation for the harmonic fit.
  collection: ccdcInput, breakpointBands: ['green', 'red', 'nir', 'swir1', 'swir2'],
  minObservations: 6, chiSquareProbability: 0.99, minNumOfYearsScaler: 1.33, dateFormat: 1, lambda: 0.002,
  maxIterations: 25000
});
// tBreak = array of break dates (fractional years); 0 = no break
var breaks = ccdc.select('tBreak');
var lastBreak = breaks.arrayReduce(ee.Reducer.max(), [0]).arrayGet([0]).rename('last_break');   // latest break date per pixel
var nBreaks = breaks.arrayMask(breaks.gt(0)).arrayLength(0).rename('n_breaks');                 // count of real (non-zero) breaks
// selfMask hides pixels with value 0 (no break) so only real break years are coloured.
Map.addLayer(lastBreak.selfMask().clip(aoi), {min: 2001, max: 2024, palette: ['#9400D3', '#0000FF', '#00FF00', '#FFFF00', '#FF0000']}, 'CCDC: most recent break (year)', false);
Map.addLayer(nBreaks.clip(aoi), {min: 0, max: 5, palette: ['white', 'black']}, 'CCDC: number of breaks', false);

// Compare: where do the two algorithms agree on a disturbance after 2005?
var agree = yod.gte(2005).and(lastBreak.gte(2005)).selfMask();   // 1 where both say "change after 2005"; others hidden
Map.addLayer(agree, {palette: 'cyan'}, 'Both detect change after 2005', false);

// ---------- 6 Export ----------
// Exports a 4-band GeoTIFF to Google Drive: yod, mag, last_break, n_breaks. Start it in the Tasks tab.
// toFloat() makes all bands the same data type (required for one multi-band file).
// scale 30 = Landsat pixel size (m); crs EPSG:32752 = WGS 84 / UTM zone 52S (metres, covers the Top End);
// maxPixels raises the default pixel limit so the export does not fail.
Export.image.toDrive({image: yod.toFloat().addBands(dist.select('mag')).addBands(lastBreak).addBands(nBreaks.toFloat()),
  description: 'Prac05b_LT_CCDC', folder: 'GEE_NT', region: aoi, scale: 30, crs: 'EPSG:32752', maxPixels: 1e10});
// Tip: save the full CCDC output as an Asset (Export.image.toAsset) — recomputing is slow.

// Q: Which years show the most clearing according to LandTrendr? Do they match the Hansen loss years (Prac 06)?
// Q: Why do we invert NBR for LandTrendr?
// Q: Annual fires lower NBR every dry season. How do spikeThreshold and the May–Sep window limit false "disturbance"?
// EXT: Run a sensitivity analysis on maxSegments (4, 6, 8) and MAG_T (0.1, 0.15, 0.25) and report the area detected.
// EXT: Compare LandTrendr and CCDC conceptually (annual vs all observations, segments vs harmonic models) and empirically (agreement matrix against 100 visually interpreted points).
// EXT: Explore the GEE community LandTrendr UI and CCDC API (Arévalo et al. 2020) for richer outputs.
```

</details>

---

[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 04](prac04-land-cover-mapping-and-landscape-metrics.md) · [Prac 06 →](prac06-monitoring-land-clearing.md)
