/**** Prac 11 — Lidar: canopy height and biomass from GEDI, and optical–SAR–lidar fusion (NT savanna)
 * GEDI = full-waveform spaceborne lidar on the ISS (2019–2023, resumed 2024), ~25 m footprints, 51.6°N–51.6°S.
 * Part A: explore GEDI L2A canopy height (rh98) and L4A biomass footprints along the NT rainfall gradient.
 * Part B: wall-to-wall canopy height — train Random Forest regression on GEDI footprints with
 *         Sentinel-2 (optical) + Sentinel-1 (C-band SAR) + ALOS PALSAR-2 (L-band SAR) predictors.
 * Run entirely in the GEE Code Editor.
 ****/

// ---------- 1 Study area ----------
var nt = ee.FeatureCollection('FAO/GAUL/2015/level1').filter(ee.Filter.eq('ADM1_NAME', 'Northern Territory'));
var aoi = ee.Geometry.Rectangle([130.90, -13.10, 131.50, -12.50]);   // Darwin–Litchfield–Adelaide River: woodland to forest
Map.centerObject(aoi, 10);

// ---------- 2 Data: GEDI ----------
// L2A monthly rasterised footprints. Quality filter: quality_flag = 1, degrade_flag = 0, sensitivity > 0.95.
function qaL2A(img) {
  return img.updateMask(img.select('quality_flag').eq(1))
            .updateMask(img.select('degrade_flag').eq(0))
            .updateMask(img.select('sensitivity').gt(0.95));
}
var gediH = ee.ImageCollection('LARSE/GEDI/GEDI02_A_002_MONTHLY').filterBounds(aoi)
  .filterDate('2019-04-01', '2023-03-31').map(qaL2A).select('rh98').mosaic().clip(aoi).rename('height');
// L4A monthly biomass footprints (Mg/ha)
var gediB = ee.ImageCollection('LARSE/GEDI/GEDI04_A_002_MONTHLY').filterBounds(aoi)
  .filterDate('2019-04-01', '2023-03-31')
  .map(function(img) { return img.updateMask(img.select('l4_quality_flag').eq(1)).updateMask(img.select('degrade_flag').eq(0)); })
  .select('agbd').mosaic().clip(aoi);
// L4B gridded 1 km mean biomass for the whole NT
var gedi4b = ee.Image('LARSE/GEDI/GEDI04_B_002').select('MU').clip(nt);

Map.addLayer(gedi4b, {min: 0, max: 80, palette: ['#ffffcc', '#a1dab4', '#41b6c4', '#225ea8']}, 'A: GEDI L4B mean biomass 1 km (Mg/ha)', false);
var hVis = {min: 0, max: 30, palette: ['#ffffcc', '#c2e699', '#78c679', '#31a354', '#006837']};
Map.addLayer(gediH, hVis, 'A: GEDI rh98 canopy height footprints (m)');
Map.addLayer(gediB, {min: 0, max: 120, palette: ['#fff7bc', '#fe9929', '#993404']}, 'A: GEDI L4A biomass footprints (Mg/ha)', false);

// Part A analysis: canopy height along the rainfall gradient (Darwin → Katherine → Tennant Creek)
var transect = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([131.15, -12.50]).buffer(20000), {site: '1 Darwin hinterland (~1700 mm)'}),
  ee.Feature(ee.Geometry.Point([132.26, -14.47]).buffer(20000), {site: '2 Katherine (~1100 mm)'}),
  ee.Feature(ee.Geometry.Point([133.40, -16.60]).buffer(20000), {site: '3 Daly Waters (~650 mm)'}),
  ee.Feature(ee.Geometry.Point([134.19, -19.65]).buffer(20000), {site: '4 Tennant Creek (~450 mm)'})
]);
var gediAll = ee.ImageCollection('LARSE/GEDI/GEDI02_A_002_MONTHLY').filterBounds(transect)
  .filterDate('2019-04-01', '2023-03-31').map(qaL2A).select('rh98').mosaic();
var transectStats = gediAll.reduceRegions({collection: transect,
  reducer: ee.Reducer.median().combine(ee.Reducer.percentile([90]), null, true).combine(ee.Reducer.count(), null, true), scale: 25});
print('A: GEDI rh98 by site (median, p90, n footprints)', transectStats);
print(ui.Chart.feature.byFeature(transectStats, 'site', ['median', 'p90']).setChartType('ColumnChart')
  .setOptions({title: 'A: Canopy height (m) along the NT rainfall gradient', vAxis: {title: 'rh98 (m)'}}));

// ---------- 2b Predictors: optical + C-band SAR + L-band SAR + terrain ----------
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(aoi).filterDate('2021-05-01', '2021-09-30')
  .linkCollection(csPlus, ['cs_cdf'])
  .map(function(img) { return img.updateMask(img.select('cs_cdf').gte(0.6)).divide(10000); }).median();
var optical = s2.select(['B2', 'B3', 'B4', 'B5', 'B8', 'B11', 'B12'])
  .addBands(s2.normalizedDifference(['B8', 'B4']).rename('NDVI'))
  .addBands(s2.normalizedDifference(['B8', 'B11']).rename('NDMI'));
// ---------- SAR units convention (ENV306/506) ----------
// COPERNICUS/S1_GRD stores backscatter (σ⁰) in dB. Averages, medians of composites, ratios, filters, thresholds and
// all statistics are computed in LINEAR power units; dB is used ONLY for display (map layers, chart axes).
// Thresholds quoted in dB in the literature are converted to linear with dbToLin().
function toLinear(img) {   // 10^(dB/10); keeps metadata (orbit, pass, date) for later filters
  img = ee.Image(img);
  return ee.Image(img.multiply(Math.LN10 / 10).exp().copyProperties(img, ['system:time_start'])).copyProperties(img);
}
function toDb(img) { return ee.Image(img).log10().multiply(10); }                                                    // display only
function dbToLin(x) { return Math.pow(10, x / 10); }
var s1 = ee.ImageCollection('COPERNICUS/S1_GRD').filterBounds(aoi).filterDate('2021-05-01', '2021-09-30')
  .filter(ee.Filter.eq('instrumentMode', 'IW')).filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
  .select(['VV', 'VH']).map(toLinear).median();                          // linear σ⁰
var sarC = s1.addBands(s1.select('VH').divide(s1.select('VV')).rename('VH_VV'));   // cross-pol ratio, linear
// ALOS PALSAR-2 yearly mosaic (L-band, 25 m): γ⁰ (dB) = 10·log10(DN²) − 83  →  linear γ⁰ = DN² · 10^(−8.3)
var palsar = ee.ImageCollection('JAXA/ALOS/PALSAR/YEARLY/SAR_EPOCH').filterDate('2021-01-01', '2022-01-01').first();
var sarL = palsar.select(['HH', 'HV']).pow(2).multiply(Math.pow(10, -8.3)).rename(['L_HH', 'L_HV']);   // linear γ⁰
Map.addLayer(toDb(sarL.select(['L_HV', 'L_HH', 'L_HV'])), {min: [-25, -15, -25], max: [-10, 0, -10]}, 'PALSAR-2 L-band (HV-HH-HV, dB)', false);
Map.addLayer(toDb(s1.select(['VH', 'VV', 'VH'])), {min: [-25, -15, -25], max: [-10, 0, -10]}, 'Sentinel-1 C-band (VH-VV-VH, dB)', false);
var dem = ee.Image('NASA/NASADEM_HGT/001').select('elevation');
var predictors = optical.addBands(sarC).addBands(sarL).addBands(dem).addBands(ee.Terrain.slope(dem)).clip(aoi).float();
var bands = predictors.bandNames();

// ---------- 3 Training data: sample predictors at GEDI footprints ----------
var samples = predictors.addBands(gediH).sample({region: aoi, scale: 25, numPixels: 20000, seed: 1, geometries: true, tileScale: 4})
  .filter(ee.Filter.notNull(['height']));
samples = samples.randomColumn('r', 2);
var train = samples.filter(ee.Filter.lt('r', 0.7)), test = samples.filter(ee.Filter.gte('r', 0.7));
print('GEDI footprints with predictors: train / test', train.size(), test.size());

function fitAndTest(inputBands, name) {
  var rf = ee.Classifier.smileRandomForest({numberOfTrees: 200, minLeafPopulation: 5, seed: 1})
    .setOutputMode('REGRESSION').train(train, 'height', inputBands);
  var pred = test.classify(rf, 'pred');
  var resid = pred.map(function(f) { return f.set('sq', ee.Number(f.get('height')).subtract(f.get('pred')).pow(2)); });
  var rmse = ee.Number(resid.aggregate_mean('sq')).sqrt();
  var meanH = ee.Number(test.aggregate_mean('height'));
  var ssTot = test.map(function(f) { return f.set('d', ee.Number(f.get('height')).subtract(meanH).pow(2)); }).aggregate_sum('d');
  var r2 = ee.Number(1).subtract(ee.Number(resid.aggregate_sum('sq')).divide(ssTot));
  print(name + ': RMSE (m), R²', rmse, r2);
  return {rf: rf, pred: pred};
}
// Compare sensor combinations — the key question of this lab
var opticalBands = ['B2', 'B3', 'B4', 'B5', 'B8', 'B11', 'B12', 'NDVI', 'NDMI'];
fitAndTest(opticalBands, 'Optical only');
fitAndTest(['VV', 'VH', 'VH_VV', 'L_HH', 'L_HV'], 'SAR only (C + L band)');
var best = fitAndTest(bands, 'Optical + SAR + terrain');

print(ui.Chart.feature.byFeature(best.pred.limit(2000), 'height', 'pred').setChartType('ScatterChart')
  .setOptions({title: 'Observed GEDI rh98 vs predicted (m)', hAxis: {title: 'GEDI rh98'}, vAxis: {title: 'Predicted'}, pointSize: 1}));

// ---------- 4 Wall-to-wall canopy height map ----------
var heightMap = predictors.classify(best.rf).rename('canopy_height');
Map.addLayer(heightMap, hVis, 'B: Predicted canopy height 10 m (m)');

// Optional comparison: Meta / WRI 1 m global canopy height (community/partner asset — check availability)
// var meta = ee.ImageCollection('projects/meta-forest-monitoring-okw37/assets/CanopyHeight').mosaic();
// Map.addLayer(meta.clip(aoi), hVis, 'Meta 1 m canopy height', false);

// ---------- 6 Export ----------
Export.image.toDrive({image: heightMap.float(), description: 'Prac11_canopy_height', folder: 'GEE_NT', region: aoi,
  scale: 10, crs: 'EPSG:32752', maxPixels: 1e11});

// Q: How do lidar, SAR and optical sensors "see" vegetation differently (height vs structure/moisture vs greenness)?
// Q: How does canopy height change along the rainfall gradient? Link to savanna structure and fire.
// Q: Which sensor combination predicts canopy height best? Why does L-band SAR help more than C-band in woodland?
// Q: Where does the model under- or over-predict (tall riparian forest, burnt areas)? Why does saturation occur?
// EXT: GEDI geolocation error is ~10 m. How does this affect training at 10 m? Test aggregating predictors to 30 m.
// EXT: Use GEDI L4A biomass instead of height and map aboveground biomass; discuss use for savanna carbon accounting.
// EXT: Airborne lidar (e.g. NT/GA surveys via the ELVIS portal) gives full-coverage canopy models. Discuss how it could validate this map.
