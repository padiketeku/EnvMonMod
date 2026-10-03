[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 05](prac05-change-detection-bi-temporal-transitions-landtrendr-and-ccdc.md) · [Prac 07 →](prac07-fire-regime-burn-severity-frequency-and-seasonality.md)

# Prac 06: Monitoring land clearing

**When:** Fri 6 Nov 2026, Session 2 · **Script:** [`prac06_land_clearing.js`](../scripts/prac06_land_clearing.js) · **ULOs:** 1, 2, 3, 4

**Also available in:** Python [`prac06_land_clearing.py`](../alternatives/python/prac06_land_clearing.py) · R [`prac06_land_clearing.R`](../alternatives/r/prac06_land_clearing.R) · QGIS [recipe](../alternatives/qgis/README.md). The Code Editor remains the main environment.

**Purpose.** Map historic and recent land clearing in the Daly River Catchment with Hansen GFC and annual Sentinel-2 detection with persistence rules, and produce clearing patches for compliance checks.

> **Read first (about 15 min).** Before you start, read these summary notes in the *Article review reading list and summary notes* (Learnline, and [reference/article-review-notes.md](../reference/article-review-notes.md)):
>
> - **2.4 Thomas et al. (2024)**, *Poor compliance and exemptions facilitate ongoing deforestation*
>
> **Carry these ideas into the prac:**
>
> - Satellite clearing maps become policy evidence when they are compared with permits, exemptions and EPBC Act referrals (Thomas et al.).
> - Choices such as the canopy threshold, the minimum patch size (Thomas et al. used clearing larger than 20 ha) and how you separate clearing from fire or regrowth change the totals you report.
> - "Potentially non-compliant" is not a legal finding: be clear about what a map can and cannot show.

## 1. Concept notes

**Why it matters.** Clearing of native vegetation is the main driver of habitat loss and fragmentation in Australia (Evans, 2016). Much of the habitat lost for threatened species has had little regulatory scrutiny (Ward et al., 2019). In the NT, clearing generally requires approval: under the *Planning Act 1999* on freehold land, and under the *Pastoral Land Act 1992* on pastoral leases. Agricultural development in the Douglas–Daly, Katherine and Ord regions has made clearing a live policy issue. Satellite monitoring supports approvals, compliance checks and national greenhouse accounting.

**What counts as clearing?** Clearing is the removal of woody vegetation (trees and shrubs) that persists. Remote sensing must separate it from three other things:

- **Fire:** NBR and NDVI drop, then recover within one wet season.
- **Drought:** temporary greenness loss.
- **Crop and pasture cycles:** land that is already cleared changing state.

The usual tools to separate them are *persistence rules* (the low NDVI must persist into the next year), *bare-soil indices*, and a baseline mask of woody vegetation.

```math
\mathrm{BSI}=\frac{(\rho_{SWIR1}+\rho_{Red})-(\rho_{NIR}+\rho_{Blue})}{(\rho_{SWIR1}+\rho_{Red})+(\rho_{NIR}+\rho_{Blue})}
```

**Defining forest in a savanna.** Hansen Global Forest Change defines trees as vegetation taller than 5 m. The canopy-cover threshold is the user's choice, and in open woodland (10–30 % cover) that choice decides the answer.

**Minimum mapping unit (MMU).** Patches below the MMU (here 1 ha) are dropped, which reduces noise but omits small clearing.

## 2. Practical activities

**Part A – Historic loss (Hansen, 2001–2023).**

1. Map tree cover in 2000, loss and loss year at a 20 % canopy threshold, then chart loss per year.
2. Cross-check with Landsat dry-season dNDVI (2005 → 2023).
3. Re-run at 10, 30 and 50 % canopy thresholds.

> **Reading link (notes 2.4, Thomas et al. 2024).** Clearing totals depend on the loss map. In step 3 of Part A, see how the area changes between the 10, 30 and 50 % canopy thresholds: many Daly savanna woodlands sit close to 20 % cover, so the threshold alone can move your estimate a long way.

**Part B – Annual clearing detection with Sentinel-2 (2018–2025).**

1. Build dry-season (Jun–Sep) composites of NDVI and BSI for each year, and a woody baseline (Dynamic World trees, 2018).
2. Apply the rules: an NDVI drop of more than 0.20, NDVI below 0.30, a BSI rise of more than 0.05, and NDVI still below 0.35 the next year. Then apply an MMU of 1 ha.
3. Chart clearing per year, vectorise the patches, and inspect the ten largest with the satellite basemap.
4. Export the patches as a shapefile and as an Earth Engine asset.
5. Run Part B for **your tile**.

> **Reading link (notes 2.4, Thomas et al. 2024).** The persistence rule in step 2 of Part B (NDVI still below 0.35 the next year) is how you separate permanent clearing from fire scars, the limitation flagged in the notes. Thomas et al. assessed only clearing larger than 20 ha: calculate how much of your tile's clearing is in patches of 1–20 ha that such a study would miss. Your exported patches (step 4) are the kind of evidence that can be compared with permits and threatened species habitat.

**Key code** (an excerpt from [`prac06_land_clearing.js`](../scripts/prac06_land_clearing.js); run the full script for the complete workflow):

```javascript
// Tree-cover loss by year from Hansen Global Forest Change (savanna threshold: 20 % cover in 2000)
var aoi = ee.Geometry.Rectangle([130.9, -14.2, 131.6, -13.6]);   // Douglas–Daly
var gfc = ee.Image('UMD/hansen/global_forest_change_2023_v1_11').clip(aoi);
var loss = gfc.select('loss').and(gfc.select('treecover2000').gte(20));
var lossByYear = ee.Image.pixelArea().divide(1e4).updateMask(loss).addBands(gfc.select('lossyear'))
  .reduceRegion({reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'year'}),
                 geometry: aoi, scale: 30, maxPixels: 1e10});
print('Loss (ha) by year (1 = 2001)', lossByYear.get('groups'));
```

## 3. Challenge questions (knowledge check)

**Core**

1. How does total Hansen loss change with the canopy threshold? What does that say about "forest" in a savanna?
2. Why is the persistence rule essential in the Top End?
3. Compare Hansen and Sentinel-2 results for 2019–2023. Where do they disagree, and why (resolution, definitions, thresholds)?
4. What replaced the woodland in the three largest patches (cropping, pasture, mining, infrastructure)?

**Extension (ENV506)**

1. Calibrate `NDVI_DROP` and `BSI_RISE` with 30 cleared and 30 uncleared points you digitise yourself, choosing the values that maximise F1.
2. Estimate area-adjusted clearing with a stratified random sample (Olofsson et al., 2014).
3. Design a monthly near-real-time clearing alert for an NT regulator. Specify the latency, MMU and acceptable false-alarm rate, and justify each against the legal and compliance context.

## 4. Link to summative assessment

- **AT4 Part 2:** map clearing and regrowth in your Daly tile over your clearing period (from `prac00`).

## 5. Reading

- Hansen, M. C., et al. (2013). High-resolution global maps of 21st-century forest cover change. *Science, 342*, 850–853. https://doi.org/10.1126/science.1244693
- Evans, M. C. (2016). Deforestation in Australia: Drivers, trends and policy responses. *Pacific Conservation Biology, 22*(2), 130–150. https://doi.org/10.1071/PC15052
- Ward, M. S., et al. (2019). Lots of loss with little scrutiny: The attrition of habitat critical for threatened species in Australia. *Conservation Science and Practice, 1*, e117. https://doi.org/10.1111/csp2.117
- Olofsson, P., et al. (2014). Good practices for estimating area and assessing accuracy of land change. *Remote Sensing of Environment, 148*, 42–57. https://doi.org/10.1016/j.rse.2014.02.015
- Brown, C. F., et al. (2022). Dynamic World, near real-time global 10 m land use land cover mapping. *Scientific Data, 9*, 251. https://doi.org/10.1038/s41597-022-01307-4
- Thomas, H., Ward, M., Simmonds, J., Taylor, M., & Maron, M. (2024). Poor compliance and exemptions facilitate ongoing deforestation. *Conservation Biology*, e14354. https://doi.org/10.1111/cobi.14354 (article review notes)

## Full scripts

Each script is copied here from [`scripts/`](../scripts) so this page has everything in one place. The `.js` file is the master copy: if the two ever differ, use the file. Click a heading to open the script, then use the copy button and paste it into a new script in the Code Editor.

<details>
<summary><strong>prac06_land_clearing.js</strong> (201 lines)</summary>

```javascript
/**** Prac 06 — Land clearing: historic and recent clearing in the Douglas–Daly (Northern Territory)
 * Part A: historic tree-cover loss (Hansen Global Forest Change, 2001–2023) + Landsat cross-check.
 * Part B: annual clearing detection 2018–2025 with Sentinel-2 dry-season composites → clearing patches.
 * Context: in the NT, clearing native vegetation generally needs approval — under the Planning Act 1999
 * (freehold land) or the Pastoral Land Act 1992 (pastoral leases). Satellite monitoring supports compliance
 * and reporting.
 * Run entirely in the GEE Code Editor.
 *
 * WHAT THIS SCRIPT DOES:
 *   Asks how much woody vegetation has been cleared in the Douglas–Daly, and when.
 *   Part A summarises a global tree-cover loss product (Hansen) per year and checks it against Landsat NDVI.
 *   Part B builds our own rule-based clearing map from Sentinel-2 dry-season NDVI and a bare soil index,
 *   then turns cleared pixels into patch polygons that could be checked against clearing approvals.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) Optional EDIT lines: aoi (section 1), TREE_COVER_THRESHOLD (Part A), YEARS and the four clearing
 *       thresholds NDVI_DROP, NDVI_LOW, BSI_RISE, PERSIST (Part B).
 *   (3) Click Run.
 *   (4) Read the Console (right panel) for charts and patch counts, turn layers on/off in the Map's Layers list,
 *       and start the exports in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   - Map: AOI outline, Hansen tree cover 2000 and loss year, Landsat dNDVI 2005→2023, Sentinel-2 NDVI 2018 and 2025,
 *     Sentinel-2 clearing year, and clearing patch outlines.
 *   - Console: column charts of Hansen loss (ha/yr) and Sentinel-2 clearing (ha/yr), number of patches ≥ 1 ha,
 *     and a table of the 10 largest patches.
 *
 * DATA:
 *   - Hansen Global Forest Change v1.11, UMD/hansen/global_forest_change_2023_v1_11, 30 m, 2000–2023.
 *   - Landsat 5 C2 L2 (LANDSAT/LT05/C02/T1_L2) for 2005 and Landsat 8/9 C2 L2 (LANDSAT/LC08/C02/T1_L2,
 *     LANDSAT/LC09/C02/T1_L2) for 2023, 30 m, dry season May–Sep.
 *   - Sentinel-2 surface reflectance, COPERNICUS/S2_SR_HARMONIZED, 10 m (20 m for B11), Jun–Sep 2018–2025.
 *   - Cloud Score+, GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED, 10 m, matched to each Sentinel-2 image.
 *   - Dynamic World, GOOGLE/DYNAMICWORLD/V1, 10 m, May–Sep 2018 (tree probability for the woody baseline).
 *
 * LINKS: pracs/prac06-monitoring-land-clearing.md (course repository). Feeds Prac 06 and AT4 Part 2.
 *
 * KEY GEE IDEAS:
 *   - Grouped reducers: Reducer.sum().group() inside reduceRegion gives area per class (here per year).
 *   - ee.Image.pixelArea() to turn pixel counts into hectares (scale matters: 30 m vs 10 m).
 *   - A client-side JavaScript for loop that builds a server-side image with .where().
 *   - reduceToVectors to turn a raster into polygons; Export.image/Export.table to Drive and Assets.
 *
 * Q = core (ENV306 and ENV506). EXT = ENV506 extension.
 ****/

// ---------- 1 Study area ----------
// Define the area of interest (AOI), draw its outline, and prepare a pixel-area image used for all area totals.
var aoi = ee.Geometry.Rectangle([130.9, -14.2, 131.6, -13.6]);   // Douglas–Daly region
Map.centerObject(aoi, 10);
Map.addLayer(ee.Image().paint(aoi, 0, 2), {palette: 'black'}, 'AOI');   // paint draws the outline only (width 2 px)
var areaHa = ee.Image.pixelArea().divide(1e4);   // each pixel's area in m², ÷ 10 000 = hectares

// =====================================================================
// PART A — Historic loss (Hansen GFC)
// =====================================================================
// Hansen GFC is a ready-made global map of tree-cover loss per year. We first decide what counts as
// "forest" in 2000, keep loss only in those pixels, then total the hectares lost each year.
var GFC_ID = 'UMD/hansen/global_forest_change_2023_v1_11';   // check the catalogue for a newer version
var gfc = ee.Image(GFC_ID).clip(aoi);
var TREE_COVER_THRESHOLD = 20;   // % canopy cover in 2000 — savanna woodland is often 10–50 %
// TREE_COVER_THRESHOLD is a starting value — test others (see the first Q below).
var forest2000 = gfc.select('treecover2000').gte(TREE_COVER_THRESHOLD);   // 1 = "forest" in 2000
var loss = gfc.select('loss').and(forest2000);                          // loss band: 1 = lost at any time 2001–2023
var lossYear = gfc.select('lossyear').updateMask(loss).add(2000);       // lossyear is 1–23, so +2000 gives the calendar year

Map.addLayer(gfc.select('treecover2000'), {min: 0, max: 80, palette: ['white', 'darkgreen']}, 'A: Tree cover 2000 (%)', false);
Map.addLayer(lossYear, {min: 2001, max: 2023, palette: ['yellow', 'orange', 'red']}, 'A: Hansen loss year');

// Grouped reducer: band 0 = area (ha) to sum, band 1 = lossyear used as the group label.
// Result is a list of {year, sum} dictionaries. scale 30 = Hansen pixel size; maxPixels lifts the default limit.
var lossByYear = areaHa.updateMask(loss).addBands(gfc.select('lossyear')).reduceRegion({
  reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'year'}),
  geometry: aoi, scale: 30, maxPixels: 1e10});
// Convert the list of groups into a FeatureCollection (one feature per year) so it can be charted.
var lossFc = ee.FeatureCollection(ee.List(lossByYear.get('groups')).map(function(g) {
  g = ee.Dictionary(g);
  return ee.Feature(null, {year: ee.Number(g.get('year')).add(2000), area_ha: g.get('sum')});
}));
print(ui.Chart.feature.byFeature(lossFc, 'year', 'area_ha').setChartType('ColumnChart')
  .setOptions({title: 'A: Hansen tree cover loss (ha), canopy >= ' + TREE_COVER_THRESHOLD + '%', legend: {position: 'none'}}));

// Landsat cross-check: dry-season NDVI 2005 vs 2023
// An independent check on Hansen: where woody cover was removed, dry-season NDVI should drop between the two dates.
// prepLs takes the NIR and red band names as arguments because Landsat 5 and 8/9 number them differently.
function prepLs(img, nir, red) {
  var qa = img.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(1 << 3).eq(0).and(qa.bitwiseAnd(1 << 4).eq(0));   // bit 3 = cloud, bit 4 = shadow; 0 = clear
  var sr = img.select('SR_B.').multiply(0.0000275).add(-0.2);   // all SR bands (regex); C2 scale × 0.0000275, offset −0.2
  return sr.normalizedDifference([nir, red]).rename('NDVI').updateMask(mask);   // NDVI is unitless, −1 to 1
}
// Median of all clear dry-season (May–Sep) images in each year: less cloud and a robust "typical" value.
var ndvi2005 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2').filterBounds(aoi).filterDate('2005-05-01', '2005-09-30')
  .map(function(i) { return prepLs(i, 'SR_B4', 'SR_B3'); }).median();   // Landsat 5: B4 = NIR, B3 = red
var ndvi2023 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2').merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
  // Landsat 8/9: B5 = NIR, B4 = red
  .filterBounds(aoi).filterDate('2023-05-01', '2023-09-30').map(function(i) { return prepLs(i, 'SR_B5', 'SR_B4'); }).median();
// Red = NDVI fell (possible clearing), blue = NDVI rose.
Map.addLayer(ndvi2023.subtract(ndvi2005).clip(aoi), {min: -0.4, max: 0.4, palette: ['#b2182b', '#f7f7f7', '#2166ac']}, 'A: Landsat dNDVI 2005→2023', false);

// =====================================================================
// PART B — Annual clearing detection with Sentinel-2 (2018–2025)
// =====================================================================
// Build one cloud-free dry-season composite per year, apply simple change rules year to year,
// then clean the result (minimum patch size) and convert it to polygons.
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');   // per-pixel cloud scores for Sentinel-2
// s2Dry(year): median NDVI and BSI composite for 1 June – 30 September of that year (mid/late dry season, few clouds).
function s2Dry(year) {
  var c = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(aoi)
    .filterDate(ee.Date.fromYMD(year, 6, 1), ee.Date.fromYMD(year, 9, 30))
    .linkCollection(csPlus, ['cs_cdf'])   // attach the matching Cloud Score+ band to each S2 image
    .map(function(img) {
      // cs_cdf runs 0 (cloudy) to 1 (clear); keep ≥ 0.6 (a common starting value — test others).
      // ÷ 10000 converts S2 digital numbers to reflectance (0–1).
      var r = img.updateMask(img.select('cs_cdf').gte(0.6)).divide(10000);
      var ndvi = r.normalizedDifference(['B8', 'B4']).rename('NDVI');   // B8 = NIR, B4 = red
      // Bare Soil Index: ((SWIR1 + Red) − (NIR + Blue)) / ((SWIR1 + Red) + (NIR + Blue))
      // BSI rises when vegetation is replaced by bare soil. B11 = SWIR1, B2 = blue.
      var bsi = r.expression('((S + R) - (N + B)) / ((S + R) + (N + B))',
        {S: r.select('B11'), R: r.select('B4'), N: r.select('B8'), B: r.select('B2')}).rename('BSI');
      return ndvi.addBands(bsi);
    });
  return c.median().clip(aoi).set('year', year);   // median per pixel: robust to leftover cloud and single burnt dates
}
var YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];   // EDIT: years to composite
var composites = YEARS.map(s2Dry);   // client-side JavaScript array of 8 server-side images

// Woody vegetation baseline: Dynamic World tree probability in the first year
// Mean 'trees' probability > 0.4 = woody in 2018 (a starting value — test others). Only woody pixels can be "cleared".
var woody2018 = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1').filterBounds(aoi)
  .filterDate('2018-05-01', '2018-09-30').select('trees').mean().gt(0.4).clip(aoi);

// Rules (teaching thresholds — test them!):
//  cleared in year t if NDVI fell by > 0.20 from year t−1, NDVI(t) < 0.30, BSI rose by > 0.05,
//  AND NDVI stays below 0.35 in year t+1 (persistence, separates clearing from fire scars).
var NDVI_DROP = 0.20, NDVI_LOW = 0.30, BSI_RISE = 0.05, PERSIST = 0.35;   // EDIT: all NDVI/BSI units (unitless)
var clearingYear = ee.Image(0);   // start with 0 everywhere = "not cleared"
// Client-side loop over the middle years (2019–2024): each needs a year before AND a year after.
for (var i = 1; i < YEARS.length - 1; i++) {
  var prev = composites[i - 1], cur = composites[i], next = composites[i + 1];
  var cleared = prev.select('NDVI').subtract(cur.select('NDVI')).gt(NDVI_DROP)   // big NDVI drop
    .and(cur.select('NDVI').lt(NDVI_LOW))                                       // now low NDVI
    .and(cur.select('BSI').subtract(prev.select('BSI')).gt(BSI_RISE))           // more bare soil
    .and(next.select('NDVI').lt(PERSIST))                                       // still low next year
    .and(woody2018);                                                             // was woody in 2018
  // Record the year only if the pixel has not already been flagged — keeps the FIRST clearing year.
  clearingYear = clearingYear.where(cleared.and(clearingYear.eq(0)), YEARS[i]);
}
clearingYear = clearingYear.selfMask().rename('clear_year');   // selfMask hides the 0 (never cleared) pixels
// Minimum mapping unit ~1 ha (100 S2 pixels)
// connectedPixelCount counts each patch's pixels (up to 200; true = 8-neighbour connection); drop patches < 100 px.
clearingYear = clearingYear.updateMask(clearingYear.connectedPixelCount(200, true).gte(100));

Map.addLayer(composites[0].select('NDVI'), {min: 0, max: 0.8, palette: ['brown', 'white', 'green']}, 'B: S2 NDVI 2018', false);
Map.addLayer(composites[YEARS.length - 1].select('NDVI'), {min: 0, max: 0.8, palette: ['brown', 'white', 'green']}, 'B: S2 NDVI 2025', false);
Map.addLayer(clearingYear, {min: 2019, max: 2024, palette: ['#fee08b', '#fdae61', '#f46d43', '#d73027', '#a50026', '#67001f']}, 'B: S2 clearing year');

// Area per year
// Same grouped-reducer pattern as Part A, but at scale 10 (Sentinel-2 pixel size).
// tileScale 8 splits the work into smaller tiles so the calculation does not run out of memory.
var clearByYear = areaHa.addBands(clearingYear).reduceRegion({
  reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'year'}),
  geometry: aoi, scale: 10, maxPixels: 1e11, tileScale: 8});
var clearFc = ee.FeatureCollection(ee.List(clearByYear.get('groups')).map(function(g) {
  g = ee.Dictionary(g);
  return ee.Feature(null, {year: g.get('year'), area_ha: g.get('sum')});
}));
print(ui.Chart.feature.byFeature(clearFc, 'year', 'area_ha').setChartType('ColumnChart')
  .setOptions({title: 'B: Sentinel-2 clearing detected (ha)', legend: {position: 'none'}}));

// Clearing patches as polygons (for compliance checks against approved clearing)
// reduceToVectors joins touching pixels with the same clear_year into one polygon (eightConnected = diagonals count).
// toInt() is needed because reduceToVectors works on integer images.
var patches = clearingYear.toInt().reduceToVectors({geometry: aoi, scale: 10, geometryType: 'polygon',
  labelProperty: 'clear_year', eightConnected: true, maxPixels: 1e11, tileScale: 8})
  .map(function(f) { return f.set('area_ha', f.area(1).divide(1e4)); })   // polygon area in m² (1 m error margin) → ha
  .filter(ee.Filter.gte('area_ha', 1));                                    // keep patches ≥ 1 ha
// fillColor '00000000' = fully transparent fill, so only outlines show.
Map.addLayer(patches.style({color: 'black', fillColor: '00000000', width: 1}), {}, 'B: Clearing patches (outline)');
print('Number of clearing patches >= 1 ha', patches.size());
print('Largest 10 patches', patches.sort('area_ha', false).limit(10));   // false = descending order

// ---------- 6 Export ----------
// Three exports — start each in the Tasks tab.
// 1) Hansen loss year as a GeoTIFF: Int16 keeps the file small; scale 30 m;
//    crs EPSG:32752 = WGS 84 / UTM zone 52S (metres); maxPixels lifts the default limit.
Export.image.toDrive({image: lossYear.toInt16(), description: 'Prac06_Hansen_lossyear', folder: 'GEE_NT',
  region: aoi, scale: 30, crs: 'EPSG:32752', maxPixels: 1e10});
// 2) Clearing patches as a shapefile for GIS (QGIS/ArcGIS).
Export.table.toDrive({collection: patches, description: 'Prac06_S2_clearing_patches', folder: 'GEE_NT', fileFormat: 'SHP'});
// 3) The same patches as an Earth Engine Asset, so later scripts can load them without recomputing.
Export.table.toAsset({collection: patches, description: 'Prac06_patches_asset', assetId: 'Prac06_clearing_patches'});

// Q: Re-run Part A with TREE_COVER_THRESHOLD = 10, 30, 50. How does total loss change? What does "forest" mean in a savanna?
// Q: In Part B, which years show most clearing? Inspect three patches with the satellite basemap: what replaced the woodland?
// Q: Why is the persistence rule (year t+1) needed in the Top End? (Hint: fire scars.)
// Q: Compare Part A (Hansen) and Part B (S2) for 2019–2023. Where do they disagree and why (resolution, definitions, thresholds)?
// EXT: Calibrate NDVI_DROP and BSI_RISE: digitise 30 cleared and 30 uncleared points (geometry tools) and choose thresholds that maximise F1.
// EXT: Estimate area-adjusted clearing (Olofsson et al. 2014) with a stratified random sample interpreted in the Code Editor.
// EXT: Design a monthly near-real-time clearing alert for a regulator. What latency, minimum patch size and false-alarm rate are acceptable?
```

</details>

---

[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 05](prac05-change-detection-bi-temporal-transitions-landtrendr-and-ccdc.md) · [Prac 07 →](prac07-fire-regime-burn-severity-frequency-and-seasonality.md)
