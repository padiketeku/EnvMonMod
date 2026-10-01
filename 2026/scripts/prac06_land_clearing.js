/**** Prac 06 — Land clearing: historic and recent clearing in the Douglas–Daly (Northern Territory)
 * Part A: historic tree-cover loss (Hansen Global Forest Change, 2001–2023) + Landsat cross-check.
 * Part B: annual clearing detection 2018–2025 with Sentinel-2 dry-season composites → clearing patches.
 * Context: in the NT, clearing native vegetation generally needs approval — under the Planning Act 1999
 * (freehold land) or the Pastoral Land Act 1992 (pastoral leases). Satellite monitoring supports compliance
 * and reporting.
 * Run entirely in the GEE Code Editor.
 ****/

// ---------- 1 Study area ----------
var aoi = ee.Geometry.Rectangle([130.9, -14.2, 131.6, -13.6]);   // Douglas–Daly region
Map.centerObject(aoi, 10);
Map.addLayer(ee.Image().paint(aoi, 0, 2), {palette: 'black'}, 'AOI');
var areaHa = ee.Image.pixelArea().divide(1e4);

// =====================================================================
// PART A — Historic loss (Hansen GFC)
// =====================================================================
var GFC_ID = 'UMD/hansen/global_forest_change_2023_v1_11';   // check the catalogue for a newer version
var gfc = ee.Image(GFC_ID).clip(aoi);
var TREE_COVER_THRESHOLD = 20;   // % canopy cover in 2000 — savanna woodland is often 10–50 %
var forest2000 = gfc.select('treecover2000').gte(TREE_COVER_THRESHOLD);
var loss = gfc.select('loss').and(forest2000);
var lossYear = gfc.select('lossyear').updateMask(loss).add(2000);

Map.addLayer(gfc.select('treecover2000'), {min: 0, max: 80, palette: ['white', 'darkgreen']}, 'A: Tree cover 2000 (%)', false);
Map.addLayer(lossYear, {min: 2001, max: 2023, palette: ['yellow', 'orange', 'red']}, 'A: Hansen loss year');

var lossByYear = areaHa.updateMask(loss).addBands(gfc.select('lossyear')).reduceRegion({
  reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'year'}),
  geometry: aoi, scale: 30, maxPixels: 1e10});
var lossFc = ee.FeatureCollection(ee.List(lossByYear.get('groups')).map(function(g) {
  g = ee.Dictionary(g);
  return ee.Feature(null, {year: ee.Number(g.get('year')).add(2000), area_ha: g.get('sum')});
}));
print(ui.Chart.feature.byFeature(lossFc, 'year', 'area_ha').setChartType('ColumnChart')
  .setOptions({title: 'A: Hansen tree cover loss (ha), canopy >= ' + TREE_COVER_THRESHOLD + '%', legend: {position: 'none'}}));

// Landsat cross-check: dry-season NDVI 2005 vs 2023
function prepLs(img, nir, red) {
  var qa = img.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(1 << 3).eq(0).and(qa.bitwiseAnd(1 << 4).eq(0));
  var sr = img.select('SR_B.').multiply(0.0000275).add(-0.2);
  return sr.normalizedDifference([nir, red]).rename('NDVI').updateMask(mask);
}
var ndvi2005 = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2').filterBounds(aoi).filterDate('2005-05-01', '2005-09-30')
  .map(function(i) { return prepLs(i, 'SR_B4', 'SR_B3'); }).median();
var ndvi2023 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2').merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
  .filterBounds(aoi).filterDate('2023-05-01', '2023-09-30').map(function(i) { return prepLs(i, 'SR_B5', 'SR_B4'); }).median();
Map.addLayer(ndvi2023.subtract(ndvi2005).clip(aoi), {min: -0.4, max: 0.4, palette: ['#b2182b', '#f7f7f7', '#2166ac']}, 'A: Landsat dNDVI 2005→2023', false);

// =====================================================================
// PART B — Annual clearing detection with Sentinel-2 (2018–2025)
// =====================================================================
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
function s2Dry(year) {
  var c = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(aoi)
    .filterDate(ee.Date.fromYMD(year, 6, 1), ee.Date.fromYMD(year, 9, 30))
    .linkCollection(csPlus, ['cs_cdf'])
    .map(function(img) {
      var r = img.updateMask(img.select('cs_cdf').gte(0.6)).divide(10000);
      var ndvi = r.normalizedDifference(['B8', 'B4']).rename('NDVI');
      // Bare Soil Index: ((SWIR1 + Red) − (NIR + Blue)) / ((SWIR1 + Red) + (NIR + Blue))
      var bsi = r.expression('((S + R) - (N + B)) / ((S + R) + (N + B))',
        {S: r.select('B11'), R: r.select('B4'), N: r.select('B8'), B: r.select('B2')}).rename('BSI');
      return ndvi.addBands(bsi);
    });
  return c.median().clip(aoi).set('year', year);
}
var YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
var composites = YEARS.map(s2Dry);

// Woody vegetation baseline: Dynamic World tree probability in the first year
var woody2018 = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1').filterBounds(aoi)
  .filterDate('2018-05-01', '2018-09-30').select('trees').mean().gt(0.4).clip(aoi);

// Rules (teaching thresholds — test them!):
//  cleared in year t if NDVI fell by > 0.20 from year t−1, NDVI(t) < 0.30, BSI rose by > 0.05,
//  AND NDVI stays below 0.35 in year t+1 (persistence, separates clearing from fire scars).
var NDVI_DROP = 0.20, NDVI_LOW = 0.30, BSI_RISE = 0.05, PERSIST = 0.35;
var clearingYear = ee.Image(0);
for (var i = 1; i < YEARS.length - 1; i++) {
  var prev = composites[i - 1], cur = composites[i], next = composites[i + 1];
  var cleared = prev.select('NDVI').subtract(cur.select('NDVI')).gt(NDVI_DROP)
    .and(cur.select('NDVI').lt(NDVI_LOW))
    .and(cur.select('BSI').subtract(prev.select('BSI')).gt(BSI_RISE))
    .and(next.select('NDVI').lt(PERSIST))
    .and(woody2018);
  clearingYear = clearingYear.where(cleared.and(clearingYear.eq(0)), YEARS[i]);
}
clearingYear = clearingYear.selfMask().rename('clear_year');
// Minimum mapping unit ~1 ha (100 S2 pixels)
clearingYear = clearingYear.updateMask(clearingYear.connectedPixelCount(200, true).gte(100));

Map.addLayer(composites[0].select('NDVI'), {min: 0, max: 0.8, palette: ['brown', 'white', 'green']}, 'B: S2 NDVI 2018', false);
Map.addLayer(composites[YEARS.length - 1].select('NDVI'), {min: 0, max: 0.8, palette: ['brown', 'white', 'green']}, 'B: S2 NDVI 2025', false);
Map.addLayer(clearingYear, {min: 2019, max: 2024, palette: ['#fee08b', '#fdae61', '#f46d43', '#d73027', '#a50026', '#67001f']}, 'B: S2 clearing year');

// Area per year
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
var patches = clearingYear.toInt().reduceToVectors({geometry: aoi, scale: 10, geometryType: 'polygon',
  labelProperty: 'clear_year', eightConnected: true, maxPixels: 1e11, tileScale: 8})
  .map(function(f) { return f.set('area_ha', f.area(1).divide(1e4)); })
  .filter(ee.Filter.gte('area_ha', 1));
Map.addLayer(patches.style({color: 'black', fillColor: '00000000', width: 1}), {}, 'B: Clearing patches (outline)');
print('Number of clearing patches >= 1 ha', patches.size());
print('Largest 10 patches', patches.sort('area_ha', false).limit(10));

// ---------- 6 Export ----------
Export.image.toDrive({image: lossYear.toInt16(), description: 'Prac06_Hansen_lossyear', folder: 'GEE_NT',
  region: aoi, scale: 30, crs: 'EPSG:32752', maxPixels: 1e10});
Export.table.toDrive({collection: patches, description: 'Prac06_S2_clearing_patches', folder: 'GEE_NT', fileFormat: 'SHP'});
Export.table.toAsset({collection: patches, description: 'Prac06_patches_asset', assetId: 'Prac06_clearing_patches'});

// Q: Re-run Part A with TREE_COVER_THRESHOLD = 10, 30, 50. How does total loss change? What does "forest" mean in a savanna?
// Q: In Part B, which years show most clearing? Inspect three patches with the satellite basemap: what replaced the woodland?
// Q: Why is the persistence rule (year t+1) needed in the Top End? (Hint: fire scars.)
// Q: Compare Part A (Hansen) and Part B (S2) for 2019–2023. Where do they disagree and why (resolution, definitions, thresholds)?
// EXT: Calibrate NDVI_DROP and BSI_RISE: digitise 30 cleared and 30 uncleared points (geometry tools) and choose thresholds that maximise F1.
// EXT: Estimate area-adjusted clearing (Olofsson et al. 2014) with a stratified random sample interpreted in the Code Editor.
// EXT: Design a monthly near-real-time clearing alert for a regulator. What latency, minimum patch size and false-alarm rate are acceptable?
