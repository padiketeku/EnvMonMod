/**** Prac 04a — Land cover classification: Random Forest, CART and SVM (Darwin–Litchfield, NT)
 * Predictors: Sentinel-2 dry + late-wet season composites, indices, terrain.
 * Reference labels: by default sampled from ESA WorldCover 2021 (a TEACHING SHORTCUT).
 * Better practice: digitise your own training polygons (see section 2b) or use field data.
 ****/

// ---------- 1 Study area ----------
var aoi = ee.Geometry.Rectangle([130.60, -13.10, 131.20, -12.40]);
Map.centerObject(aoi, 10);

// ---------- 2 Data: predictors ----------
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
function s2Composite(start, end) {
  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(aoi).filterDate(start, end)
    .linkCollection(csPlus, ['cs_cdf'])
    .map(function(img) {
      return img.updateMask(img.select('cs_cdf').gte(0.6))
        .select(['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B11', 'B12']).divide(10000);
    }).median();
}
var dry = s2Composite('2021-05-01', '2021-09-30');
var wet = s2Composite('2021-03-01', '2021-04-30');   // late wet season: still green, fewer clouds than Jan

function addIndices(img, suffix) {
  var ndvi = img.normalizedDifference(['B8', 'B4']).rename('NDVI' + suffix);
  var mndwi = img.normalizedDifference(['B3', 'B11']).rename('MNDWI' + suffix);
  var ndbi = img.normalizedDifference(['B11', 'B8']).rename('NDBI' + suffix);
  return img.rename(img.bandNames().map(function(b) { return ee.String(b).cat(suffix); }))
    .addBands([ndvi, mndwi, ndbi]);
}
var dem = ee.Image('NASA/NASADEM_HGT/001').select('elevation');
var slope = ee.Terrain.slope(dem);
var predictors = addIndices(dry, '_dry').addBands(addIndices(wet, '_wet'))
  .addBands(dem).addBands(slope).clip(aoi);
var bands = predictors.bandNames();
print('Predictor bands', bands);

Map.addLayer(dry, {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.25}, 'S2 dry season 2021');

// ---------- 2a Reference labels from ESA WorldCover (teaching shortcut) ----------
var wc = ee.ImageCollection('ESA/WorldCover/v200').first().clip(aoi);
// Merge to 7 classes: 0 tree, 1 shrub/grass, 2 cropland, 3 built, 4 bare, 5 water, 6 mangrove (+ wetland herb -> 1)
var fromCodes = [10, 20, 30, 40, 50, 60, 80, 90, 95];
var toCodes   = [0,  1,  1,  2,  3,  4,  5,  1,  6];
var labels = wc.remap(fromCodes, toCodes).rename('class');
var classNames = ['Tree cover', 'Shrub/grass', 'Cropland', 'Built-up', 'Bare', 'Water', 'Mangrove'];
var palette = ['#006400', '#ffbb22', '#f096ff', '#fa0000', '#b4b4b4', '#0064c8', '#00cf75'];

var samples = predictors.addBands(labels).stratifiedSample({
  numPoints: 300, classBand: 'class', region: aoi, scale: 10, seed: 42, geometries: true,
  tileScale: 4
});
// ---------- 2b Alternative: your own digitised polygons ----------
// Draw FeatureCollections named tree, grass, ... with property 'class' (0–6) using the geometry tools, then:
// var training = tree.merge(grass).merge(crop) ... ;
// var samples = predictors.sampleRegions({collection: training, properties: ['class'], scale: 10});

samples = samples.randomColumn('rand', 7);
var train = samples.filter(ee.Filter.lt('rand', 0.7));
var test = samples.filter(ee.Filter.gte('rand', 0.7));
print('Training / testing points', train.size(), test.size());

// ---------- 3 Classifiers ----------
var rf = ee.Classifier.smileRandomForest({numberOfTrees: 200, seed: 1})
  .train({features: train, classProperty: 'class', inputProperties: bands});
var cart = ee.Classifier.smileCart({minLeafPopulation: 5})
  .train({features: train, classProperty: 'class', inputProperties: bands});

// SVM is sensitive to scale: standardise predictors with means and SDs from the training data.
var meanDict = predictors.reduceRegion({reducer: ee.Reducer.mean(), geometry: aoi, scale: 100, maxPixels: 1e10});
var sdDict = predictors.reduceRegion({reducer: ee.Reducer.stdDev(), geometry: aoi, scale: 100, maxPixels: 1e10});
var means = ee.Image.constant(bands.map(function(b) { return meanDict.get(b); })).rename(bands);
var sds = ee.Image.constant(bands.map(function(b) { return sdDict.get(b); })).rename(bands);
var predictorsZ = predictors.subtract(means).divide(sds);
var samplesZ = predictorsZ.addBands(labels).sampleRegions({
  collection: samples.select(['class', 'rand']), properties: ['class', 'rand'], scale: 10, tileScale: 4});
var trainZ = samplesZ.filter(ee.Filter.lt('rand', 0.7));
var testZ = samplesZ.filter(ee.Filter.gte('rand', 0.7));
var svm = ee.Classifier.libsvm({kernelType: 'RBF', gamma: 0.05, cost: 10})
  .train({features: trainZ, classProperty: 'class', inputProperties: bands});

// ---------- 4 Accuracy assessment ----------
function assess(classifier, testSet, name) {
  var cm = testSet.classify(classifier).errorMatrix('class', 'classification');
  print(name + ' confusion matrix (rows = reference, cols = predicted)', cm);
  print(name + ' overall accuracy', cm.accuracy());
  print(name + ' kappa', cm.kappa());
  print(name + " producer's accuracy (1 - omission)", cm.producersAccuracy());
  print(name + " user's accuracy (1 - commission)", cm.consumersAccuracy());
  print(name + ' F1 per class', cm.fscore());
  return cm;
}
var cmRF = assess(rf, test, 'RF');
var cmCART = assess(cart, test, 'CART');
var cmSVM = assess(svm, testZ, 'SVM');

var importance = ee.Dictionary(rf.explain().get('importance'));
var impFc = ee.FeatureCollection(importance.keys().map(function(k) {
  return ee.Feature(null, {band: k, importance: importance.get(k)});
})).sort('importance', false);
print(ui.Chart.feature.byFeature(impFc, 'band', 'importance').setChartType('BarChart')
  .setOptions({title: 'Random Forest variable importance', legend: {position: 'none'}}));

// ---------- 5 Visualise ----------
var vis = {min: 0, max: 6, palette: palette};
var classRF = predictors.classify(rf);
Map.addLayer(labels, vis, 'Reference: WorldCover (remapped)', false);
Map.addLayer(predictors.classify(cart), vis, 'CART', false);
Map.addLayer(predictorsZ.classify(svm), vis, 'SVM', false);
Map.addLayer(classRF, vis, 'Random Forest');

// Legend
var legend = ui.Panel({style: {position: 'bottom-left', padding: '6px'}});
classNames.forEach(function(n, i) {
  legend.add(ui.Panel([ui.Label('', {backgroundColor: palette[i], padding: '8px', margin: '2px'}),
                       ui.Label(n, {margin: '4px'})], ui.Panel.Layout.Flow('horizontal')));
});
Map.add(legend);

// Mapped area per class (ha)
var areaByClass = ee.Image.pixelArea().divide(1e4).addBands(classRF).reduceRegion({
  reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'class'}),
  geometry: aoi, scale: 10, maxPixels: 1e11, tileScale: 4});
print('Mapped area by class (ha), RF', areaByClass);

// ---------- 6 Export ----------
Export.image.toDrive({image: classRF.toByte(), description: 'Prac04a_RF_landcover_2021', folder: 'GEE_NT',
  region: aoi, scale: 10, crs: 'EPSG:32752', maxPixels: 1e11});

// Q: Which classifier has the highest overall accuracy? Which classes are confused most, and why (spectrally)?
// Q: Which predictors does RF rank highest? Does the wet-season composite help?
// Q: Why must SVM inputs be standardised but RF and CART inputs need not be?
// EXT: Our labels come from another map (WorldCover), so we are measuring agreement, not accuracy. Critique this.
// EXT: Tune RF (numberOfTrees, variablesPerSplit) and SVM (gamma, cost) by grid search; report the validation curve.
// EXT: Compute area-adjusted accuracy and 95% CIs (Olofsson et al. 2014) from the RF error matrix and mapped areas.
// EXT: Test spatial autocorrelation: split train/test by spatial blocks (e.g. 5 km grid) and compare accuracy.
