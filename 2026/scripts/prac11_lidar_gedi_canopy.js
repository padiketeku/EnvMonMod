/**** Prac 11 — Lidar: canopy height and biomass from GEDI, and optical–SAR–lidar fusion (NT savanna)
 * GEDI = full-waveform spaceborne lidar on the ISS (2019–2023, resumed 2024), ~25 m footprints, 51.6°N–51.6°S.
 * Part A: explore GEDI L2A canopy height (rh98) and L4A biomass footprints along the NT rainfall gradient.
 * Part B: wall-to-wall canopy height — train Random Forest regression on GEDI footprints with
 *         Sentinel-2 (optical) + Sentinel-1 (C-band SAR) + ALOS PALSAR-2 (L-band SAR) predictors.
 * Run entirely in the GEE Code Editor.
 * Units: SAR statistics in linear σ⁰/γ⁰; dB for display only (see the SAR units convention below).
 *
 * WHAT THIS SCRIPT DOES:
 *   Asks: how tall is the NT savanna canopy, how does it change with rainfall, and which satellites best map it?
 *   GEDI lidar measures height only at scattered footprints. The script trains a Random Forest on those footprints
 *   using optical, radar and terrain layers, compares sensor combinations, and predicts a continuous height map
 *   for the Darwin–Litchfield–Adelaide River area.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) No EDIT lines are required. You may move the aoi rectangle (section 1) or the transect sites (Part A).
 *   (3) Click Run. The model comparison can take a minute or two.
 *   (4) Read the Console (site statistics, chart, RMSE and R² for each sensor combination, scatter plot),
 *       turn layers on/off in the Map's Layers list, and start the export in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   Map: GEDI L4B 1 km biomass (off); GEDI rh98 height footprints; GEDI L4A biomass footprints (off);
 *   PALSAR-2 and Sentinel-1 false colour (dB, off); predicted canopy height (B).
 *   Console: rh98 median, p90 and footprint count per transect site, with a column chart; train/test sizes;
 *   RMSE (m) and R² for optical only, SAR only, and optical + SAR + terrain; observed vs predicted scatter plot.
 *
 * DATA:
 *   - FAO/GAUL/2015/level1 — state boundaries (NT outline).
 *   - LARSE/GEDI/GEDI02_A_002_MONTHLY — GEDI L2A canopy height (rh98, m), ~25 m footprints, Apr 2019–Mar 2023 used.
 *   - LARSE/GEDI/GEDI04_A_002_MONTHLY — GEDI L4A aboveground biomass density (agbd, Mg/ha), ~25 m footprints, same period.
 *   - LARSE/GEDI/GEDI04_B_002 — GEDI L4B gridded mean biomass (MU, Mg/ha), 1 km, mission-period mean.
 *   - COPERNICUS/S2_SR_HARMONIZED — Sentinel-2 surface reflectance, 10–20 m, May–Sep 2021.
 *   - GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED — Cloud Score+ cloud probability for Sentinel-2.
 *   - COPERNICUS/S1_GRD — Sentinel-1 C-band SAR, VV/VH, 10 m, May–Sep 2021.
 *   - JAXA/ALOS/PALSAR/YEARLY/SAR_EPOCH — ALOS PALSAR-2 L-band HH/HV yearly mosaic, 25 m, 2021.
 *   - NASA/NASADEM_HGT/001 — NASADEM elevation, 30 m.
 *
 * LINKS: pracs/prac11-lidar-gedi-canopy-structure-and-optical-sar-lidar-fusion.md
 *   Feeds Prac 11 and AT4 Part 4.
 *
 * KEY GEE IDEAS:
 *   - Quality-masking each image with map() before mosaicking an ImageCollection.
 *   - reduceRegions with combined reducers (median, percentile, count) for zonal statistics.
 *   - sample() to build a training table, randomColumn for a train/test split.
 *   - ee.Classifier.smileRandomForest in REGRESSION mode, and classify() to make a map.
 *
 * Q = core (ENV306 and ENV506). EXT = ENV506 extension.
 ****/

// ---------- 1 Study area ----------
// The NT boundary (for the 1 km biomass layer) and a smaller study rectangle for the modelling.
// The rectangle spans open woodland to taller forest, so height varies enough to train a model.
var nt = ee.FeatureCollection('FAO/GAUL/2015/level1').filter(ee.Filter.eq('ADM1_NAME', 'Northern Territory'));
var aoi = ee.Geometry.Rectangle([130.90, -13.10, 131.50, -12.50]);   // Darwin–Litchfield–Adelaide River: woodland to forest
Map.centerObject(aoi, 10);

// ---------- 2 Data: GEDI ----------
// Load GEDI height (L2A) and biomass (L4A, L4B). Footprints are stored as monthly rasters: only footprint
// pixels have values, everything else is masked. Low-quality shots are removed before use.
// L2A monthly rasterised footprints. Quality filter: quality_flag = 1, degrade_flag = 0, sensitivity > 0.95.
// sensitivity > 0.95 keeps shots whose laser could penetrate dense canopy and find the ground (needed for a true height).
function qaL2A(img) {
  return img.updateMask(img.select('quality_flag').eq(1))   // 1 = shot passed GEDI's quality tests
            .updateMask(img.select('degrade_flag').eq(0))   // 0 = instrument not in a degraded state
            .updateMask(img.select('sensitivity').gt(0.95));
}
// rh98 = height (m) above ground at which 98 % of the returned laser energy has been received ≈ top-of-canopy height.
// mosaic() stacks all months into one image of footprints.
var gediH = ee.ImageCollection('LARSE/GEDI/GEDI02_A_002_MONTHLY').filterBounds(aoi)
  .filterDate('2019-04-01', '2023-03-31').map(qaL2A).select('rh98').mosaic().clip(aoi).rename('height');
// L4A monthly biomass footprints (Mg/ha)
// agbd = aboveground biomass density in Mg/ha (1 Mg = 1 tonne). Same quality idea, with L4A's own flag.
var gediB = ee.ImageCollection('LARSE/GEDI/GEDI04_A_002_MONTHLY').filterBounds(aoi)
  .filterDate('2019-04-01', '2023-03-31')
  .map(function(img) { return img.updateMask(img.select('l4_quality_flag').eq(1)).updateMask(img.select('degrade_flag').eq(0)); })
  .select('agbd').mosaic().clip(aoi);
// L4B gridded 1 km mean biomass for the whole NT
// MU = mean biomass (Mg/ha) estimated from all footprints in each 1 km cell.
var gedi4b = ee.Image('LARSE/GEDI/GEDI04_B_002').select('MU').clip(nt);

// Zoom in to see individual footprints: they appear as small dots along the ISS ground tracks.
Map.addLayer(gedi4b, {min: 0, max: 80, palette: ['#ffffcc', '#a1dab4', '#41b6c4', '#225ea8']}, 'A: GEDI L4B mean biomass 1 km (Mg/ha)', false);
// Height colours from 0 m (pale) to 30 m (dark green), reused for the predicted map below.
var hVis = {min: 0, max: 30, palette: ['#ffffcc', '#c2e699', '#78c679', '#31a354', '#006837']};
Map.addLayer(gediH, hVis, 'A: GEDI rh98 canopy height footprints (m)');
Map.addLayer(gediB, {min: 0, max: 120, palette: ['#fff7bc', '#fe9929', '#993404']}, 'A: GEDI L4A biomass footprints (Mg/ha)', false);

// Part A analysis: canopy height along the rainfall gradient (Darwin → Katherine → Tennant Creek)
// Four 20 km-radius circles (buffer(20000) is in metres) from the wet north to the dry south. Rainfall is mean annual.
var transect = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([131.15, -12.50]).buffer(20000), {site: '1 Darwin hinterland (~1700 mm)'}),
  ee.Feature(ee.Geometry.Point([132.26, -14.47]).buffer(20000), {site: '2 Katherine (~1100 mm)'}),
  ee.Feature(ee.Geometry.Point([133.40, -16.60]).buffer(20000), {site: '3 Daly Waters (~650 mm)'}),
  ee.Feature(ee.Geometry.Point([134.19, -19.65]).buffer(20000), {site: '4 Tennant Creek (~450 mm)'})
]);
var gediAll = ee.ImageCollection('LARSE/GEDI/GEDI02_A_002_MONTHLY').filterBounds(transect)
  .filterDate('2019-04-01', '2023-03-31').map(qaL2A).select('rh98').mosaic();
// reduceRegions: statistics for every site at once. combine() joins reducers so one pass gives the median,
// the 90th percentile (tallest trees) and the number of footprints. scale: 25 m ≈ GEDI footprint size.
// Output properties are named 'median', 'p90' and 'count'.
var transectStats = gediAll.reduceRegions({collection: transect,
  reducer: ee.Reducer.median().combine(ee.Reducer.percentile([90]), null, true).combine(ee.Reducer.count(), null, true), scale: 25});
print('A: GEDI rh98 by site (median, p90, n footprints)', transectStats);
print(ui.Chart.feature.byFeature(transectStats, 'site', ['median', 'p90']).setChartType('ColumnChart')
  .setOptions({title: 'A: Canopy height (m) along the NT rainfall gradient', vAxis: {title: 'rh98 (m)'}}));

// ---------- 2b Predictors: optical + C-band SAR + L-band SAR + terrain ----------
// Build one multi-band image of predictors (the X variables). All are from the 2021 dry season (or year),
// within the GEDI period, so vegetation is in a similar state to when it was measured.
// Sentinel-2: link each image to its Cloud Score+ image. cs_cdf is a clear-sky score (0 = cloud, 1 = clear);
// ≥ 0.6 is a common starting value — test others. ÷ 10000 converts the stored integers to reflectance (0–1).
// median() over the dry season removes leftover cloud and haze.
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(aoi).filterDate('2021-05-01', '2021-09-30')
  .linkCollection(csPlus, ['cs_cdf'])
  .map(function(img) { return img.updateMask(img.select('cs_cdf').gte(0.6)).divide(10000); }).median();
// Blue, green, red, red-edge, NIR and two SWIR bands, plus NDVI (greenness) and NDMI (canopy moisture), both unitless −1 to 1.
var optical = s2.select(['B2', 'B3', 'B4', 'B5', 'B8', 'B11', 'B12'])
  .addBands(s2.normalizedDifference(['B8', 'B4']).rename('NDVI'))
  .addBands(s2.normalizedDifference(['B8', 'B11']).rename('NDMI'));
// ---------- SAR units convention (ENV306/506) ----------
// COPERNICUS/S1_GRD stores backscatter (σ⁰) in dB. Averages, medians of composites, ratios, filters, thresholds and
// all statistics are computed in LINEAR power units; dB is used ONLY for display (map layers, chart axes).
// Thresholds quoted in dB in the literature are converted to linear with dbToLin().
// Here that means: medians and the VH/VV ratio are in linear units, and the model is trained on linear values.
function toLinear(img) {   // 10^(dB/10); keeps metadata (orbit, pass, date) for later filters
  img = ee.Image(img);
  // exp(dB × ln10 / 10) is the same as 10^(dB/10). copyProperties keeps the date and orbit tags on the new image.
  return ee.Image(img.multiply(Math.LN10 / 10).exp().copyProperties(img, ['system:time_start'])).copyProperties(img);
}
function toDb(img) { return ee.Image(img).log10().multiply(10); }                                                    // display only
function dbToLin(x) { return Math.pow(10, x / 10); }   // not used in this script; kept so all SAR scripts share the same helpers
// Sentinel-1 dry-season 2021: IW mode, dual-pol (VV+VH), converted to linear σ⁰ BEFORE the median is taken.
var s1 = ee.ImageCollection('COPERNICUS/S1_GRD').filterBounds(aoi).filterDate('2021-05-01', '2021-09-30')
  .filter(ee.Filter.eq('instrumentMode', 'IW')).filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
  .select(['VV', 'VH']).map(toLinear).median();                          // linear σ⁰
// VH/VV: cross-pol (volume scattering from branches and leaves) relative to co-pol. A ratio must use linear values.
var sarC = s1.addBands(s1.select('VH').divide(s1.select('VV')).rename('VH_VV'));   // cross-pol ratio, linear
// ALOS PALSAR-2 yearly mosaic (L-band, 25 m): γ⁰ (dB) = 10·log10(DN²) − 83  →  linear γ⁰ = DN² · 10^(−8.3)
// PALSAR is stored as digital numbers (DN), not dB, so it is converted straight to linear γ⁰ with JAXA's calibration.
// L-band (~24 cm wavelength) penetrates leaves and responds to trunks and branches — useful for woody structure.
var palsar = ee.ImageCollection('JAXA/ALOS/PALSAR/YEARLY/SAR_EPOCH').filterDate('2021-01-01', '2022-01-01').first();
var sarL = palsar.select(['HH', 'HV']).pow(2).multiply(Math.pow(10, -8.3)).rename(['L_HH', 'L_HV']);   // linear γ⁰
// False-colour SAR displays: converted to dB for display only; per-band min/max in dB.
Map.addLayer(toDb(sarL.select(['L_HV', 'L_HH', 'L_HV'])), {min: [-25, -15, -25], max: [-10, 0, -10]}, 'PALSAR-2 L-band (HV-HH-HV, dB)', false);
Map.addLayer(toDb(s1.select(['VH', 'VV', 'VH'])), {min: [-25, -15, -25], max: [-10, 0, -10]}, 'Sentinel-1 C-band (VH-VV-VH, dB)', false);
var dem = ee.Image('NASA/NASADEM_HGT/001').select('elevation');   // metres
// Stack everything into one image: optical + C-band + L-band + elevation + slope (degrees).
// float() gives all bands the same data type, which sample() and export need.
var predictors = optical.addBands(sarC).addBands(sarL).addBands(dem).addBands(ee.Terrain.slope(dem)).clip(aoi).float();
var bands = predictors.bandNames();   // server-side list of all predictor band names

// ---------- 3 Training data: sample predictors at GEDI footprints ----------
// Add the GEDI height band (the Y variable) to the predictors and sample random pixels. Pixels without a GEDI
// footprint are masked, so only footprint locations end up in the table. Then split 70 % train / 30 % test.
// sample(): numPixels = random pixels to try (far fewer survive, because most pixels have no footprint);
// scale: 25 m ≈ footprint size; seed: 1 makes the sample repeatable; geometries: true keeps point locations;
// tileScale: 4 helps avoid memory errors.
var samples = predictors.addBands(gediH).sample({region: aoi, scale: 25, numPixels: 20000, seed: 1, geometries: true, tileScale: 4})
  .filter(ee.Filter.notNull(['height']));   // safety: drop any row without a height value
samples = samples.randomColumn('r', 2);   // adds a random number 0–1 in column 'r' (seed 2, repeatable)
var train = samples.filter(ee.Filter.lt('r', 0.7)), test = samples.filter(ee.Filter.gte('r', 0.7));
print('GEDI footprints with predictors: train / test', train.size(), test.size());

// fitAndTest(): train a Random Forest regression on the training rows using the listed bands,
// predict the test rows, and print RMSE (typical error, m) and R² (share of height variance explained).
function fitAndTest(inputBands, name) {
  // 200 trees; minLeafPopulation: 5 stops trees splitting down to single points (less overfitting); seed for repeatability.
  // setOutputMode('REGRESSION') predicts a number (height) instead of a class.
  var rf = ee.Classifier.smileRandomForest({numberOfTrees: 200, minLeafPopulation: 5, seed: 1})
    .setOutputMode('REGRESSION').train(train, 'height', inputBands);
  var pred = test.classify(rf, 'pred');   // adds the prediction to each test row as 'pred'
  // Squared error per test footprint: (observed − predicted)².
  var resid = pred.map(function(f) { return f.set('sq', ee.Number(f.get('height')).subtract(f.get('pred')).pow(2)); });
  var rmse = ee.Number(resid.aggregate_mean('sq')).sqrt();   // root mean squared error, in metres
  // R² = 1 − (sum of squared errors ÷ total sum of squares around the mean height).
  var meanH = ee.Number(test.aggregate_mean('height'));
  var ssTot = test.map(function(f) { return f.set('d', ee.Number(f.get('height')).subtract(meanH).pow(2)); }).aggregate_sum('d');
  var r2 = ee.Number(1).subtract(ee.Number(resid.aggregate_sum('sq')).divide(ssTot));
  print(name + ': RMSE (m), R²', rmse, r2);
  return {rf: rf, pred: pred};   // a client-side object holding the trained model and test predictions
}
// Compare sensor combinations — the key question of this lab
var opticalBands = ['B2', 'B3', 'B4', 'B5', 'B8', 'B11', 'B12', 'NDVI', 'NDMI'];
fitAndTest(opticalBands, 'Optical only');
fitAndTest(['VV', 'VH', 'VH_VV', 'L_HH', 'L_HV'], 'SAR only (C + L band)');
var best = fitAndTest(bands, 'Optical + SAR + terrain');   // all predictors; this model is used for the map

// Scatter of observed vs predicted for up to 2,000 test points (limit keeps the chart fast).
// Points on the 1:1 line are perfect; a flattened cloud at high values shows saturation.
print(ui.Chart.feature.byFeature(best.pred.limit(2000), 'height', 'pred').setChartType('ScatterChart')
  .setOptions({title: 'Observed GEDI rh98 vs predicted (m)', hAxis: {title: 'GEDI rh98'}, vAxis: {title: 'Predicted'}, pointSize: 1}));

// ---------- 4 Wall-to-wall canopy height map ----------
// Apply the best model to every pixel of the predictor stack to get a continuous canopy height map (m).
var heightMap = predictors.classify(best.rf).rename('canopy_height');
Map.addLayer(heightMap, hVis, 'B: Predicted canopy height 10 m (m)');

// Optional comparison: Meta / WRI 1 m global canopy height (community/partner asset — check availability)
// var meta = ee.ImageCollection('projects/meta-forest-monitoring-okw37/assets/CanopyHeight').mosaic();
// Map.addLayer(meta.clip(aoi), hVis, 'Meta 1 m canopy height', false);

// ---------- 6 Export ----------
// Save the height map as a GeoTIFF to Google Drive (start it in the Tasks tab).
// scale: 10 m (Sentinel-2 resolution); crs 'EPSG:32752' = WGS 84 / UTM zone 52S (metres), which covers this area.
Export.image.toDrive({image: heightMap.float(), description: 'Prac11_canopy_height', folder: 'GEE_NT', region: aoi,
  scale: 10, crs: 'EPSG:32752', maxPixels: 1e11});

// Q: How do lidar, SAR and optical sensors "see" vegetation differently (height vs structure/moisture vs greenness)?
// Q: How does canopy height change along the rainfall gradient? Link to savanna structure and fire.
// Q: Which sensor combination predicts canopy height best? Why does L-band SAR help more than C-band in woodland?
// Q: Where does the model under- or over-predict (tall riparian forest, burnt areas)? Why does saturation occur?
// EXT: GEDI geolocation error is ~10 m. How does this affect training at 10 m? Test aggregating predictors to 30 m.
// EXT: Use GEDI L4A biomass instead of height and map aboveground biomass; discuss use for savanna carbon accounting.
// EXT: Airborne lidar (e.g. NT/GA surveys via the ELVIS portal) gives full-coverage canopy models. Discuss how it could validate this map.
