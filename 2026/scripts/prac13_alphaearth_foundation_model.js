/**** Prac 13 — Validating a geospatial foundation model: AlphaEarth satellite embeddings (NT)
 * Dataset: GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL — 64-band (A00–A63) unit-length embeddings, 10 m, annual 2017–2024,
 * produced by the AlphaEarth Foundations model from optical, SAR, lidar, climate and other inputs
 * (Brown et al. 2025, arXiv:2507.22291).
 * Activities: (1) explore, (2) unsupervised clustering, (3) few-shot classification vs spectral baseline,
 * (4) similarity search, (5) change detection — each VALIDATED against independent references.
 * Run entirely in the GEE Code Editor.
 ****/

// ---------- 1 Study area ----------
var aoi = ee.Geometry.Rectangle([130.80, -12.75, 131.30, -12.35]);   // Darwin–Palmerston–Howard Springs
Map.centerObject(aoi, 11);
var YEAR = 2024;

// ---------- 2 Data ----------
var emb = ee.ImageCollection('GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL');
function embYear(y) {
  return emb.filterDate(ee.Date.fromYMD(y, 1, 1), ee.Date.fromYMD(y + 1, 1, 1)).filterBounds(aoi).mosaic().clip(aoi);
}
var e = embYear(YEAR);
var bands = e.bandNames();
print('Embedding bands', bands);
Map.addLayer(e, {bands: ['A01', 'A16', 'A09'], min: -0.3, max: 0.3}, '1: Embedding ' + YEAR + ' (3 axes as RGB)');
// Q: The axes have no physical meaning (unlike bands). What does colour similarity mean here?

// ---------- 3 Unsupervised clustering ----------
var K = 8;
var training = e.sample({region: aoi, scale: 10, numPixels: 5000, seed: 1});
var clusterer = ee.Clusterer.wekaKMeans(K).train(training);
var clusters = e.cluster(clusterer);
Map.addLayer(clusters.randomVisualizer(), {}, '2: k-means clusters (K=' + K + ')', false);

// Validate clusters against ESA WorldCover: cross-tabulation
var wc = ee.ImageCollection('ESA/WorldCover/v200').first().clip(aoi);
var xtab = clusters.addBands(wc).sample({region: aoi, scale: 10, numPixels: 5000, seed: 2})
  .reduceColumns(ee.Reducer.frequencyHistogram().group({groupField: 0, groupName: 'cluster'}), ['cluster', 'Map']);
print('2: Cluster × WorldCover class counts', xtab);

// ---------- 4 Few-shot classification: embeddings vs Sentinel-2 spectral baseline ----------
// Labels: WorldCover 2021 merged to 6 classes (teaching labels — see EXT for independent validation)
var labels = wc.remap([10, 20, 30, 40, 50, 60, 80, 90, 95], [0, 1, 1, 2, 3, 4, 5, 1, 0]).rename('class');
// classes: 0 trees/mangrove, 1 grass/shrub/wetland, 2 cropland, 3 built, 4 bare, 5 water
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(aoi).filterDate(YEAR + '-05-01', YEAR + '-09-30')
  .linkCollection(csPlus, ['cs_cdf'])
  .map(function(img) { return img.updateMask(img.select('cs_cdf').gte(0.6)).divide(10000); }).median()
  .select(['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B11', 'B12']).clip(aoi);
var s2Bands = s2.bandNames();

var pool = e.addBands(s2).addBands(labels).stratifiedSample({numPoints: 400, classBand: 'class', region: aoi,
  scale: 10, seed: 7, geometries: true, tileScale: 4}).randomColumn('r', 9);
var testSet = pool.filter(ee.Filter.gte('r', 0.6));
var trainPool = pool.filter(ee.Filter.lt('r', 0.6));

// Learning curve: n labels per class
var NS = [5, 10, 25, 50, 100];
var curve = ee.FeatureCollection(NS.map(function(n) {
  var train = ee.FeatureCollection(ee.List.sequence(0, 5).map(function(c) {
    return trainPool.filter(ee.Filter.eq('class', c)).limit(n, 'r');
  })).flatten();
  var accE = test(ee.Classifier.smileKNN(3).train(train, 'class', bands));
  var accS = test(ee.Classifier.smileRandomForest(100).train(train, 'class', s2Bands));
  return ee.Feature(null, {labels_per_class: n, embeddings_kNN: accE, s2_RF: accS});
}));
function test(classifier) { return testSet.classify(classifier).errorMatrix('class', 'classification').accuracy(); }
print(ui.Chart.feature.byFeature(curve, 'labels_per_class', ['embeddings_kNN', 's2_RF'])
  .setOptions({title: '3: Overall accuracy vs number of training labels per class', hAxis: {title: 'labels per class', scaleType: 'log'},
               vAxis: {title: 'overall accuracy'}, pointSize: 4}));

var train25 = ee.FeatureCollection(ee.List.sequence(0, 5).map(function(c) {
  return trainPool.filter(ee.Filter.eq('class', c)).limit(25, 'r'); })).flatten();
var fewShot = e.classify(ee.Classifier.smileKNN(3).train(train25, 'class', bands));
Map.addLayer(fewShot, {min: 0, max: 5, palette: ['#006400', '#ffbb22', '#f096ff', '#fa0000', '#b4b4b4', '#0064c8']},
  '3: Few-shot map (25 labels/class, embeddings)', false);

// ---------- 5 Similarity search ----------
// Click-free version: a reference pixel (edit the point — e.g. a mango orchard, a solar farm, a mangrove stand)
var refPoint = ee.Geometry.Point([131.05, -12.55]);
var refVec = e.reduceRegion({reducer: ee.Reducer.mean(), geometry: refPoint.buffer(30), scale: 10});
var refImg = ee.Image.constant(bands.map(function(b) { return refVec.get(b); })).rename(bands);
var similarity = e.multiply(refImg).reduce('sum').rename('cosine');   // unit vectors: dot product = cosine similarity
Map.addLayer(similarity, {min: 0.5, max: 1, palette: ['black', 'yellow', 'white']}, '4: Similarity to reference point', false);
Map.addLayer(similarity.gt(0.9).selfMask(), {palette: 'magenta'}, '4: Pixels with similarity > 0.9', false);
Map.addLayer(refPoint, {color: 'cyan'}, '4: Reference point', false);

// ---------- 6 Change detection: dot product between years ----------
var e2018 = embYear(2018);
var change = e2018.multiply(e).reduce('sum').rename('dot_2018_' + YEAR);   // 1 = unchanged, low = changed
Map.addLayer(change, {min: 0.3, max: 1, palette: ['red', 'orange', 'white']}, '5: Embedding similarity 2018 vs ' + YEAR);
var changed = change.lt(0.7).selfMask();
Map.addLayer(changed, {palette: 'red'}, '5: Changed (dot < 0.7)', false);
// Validate: compare with Dynamic World 'built' change and your Prac 05 / Prac 06 / Prac 10 outputs
var dwBuilt = function(y) { return ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1').filterBounds(aoi)
  .filterDate(y + '-05-01', y + '-10-31').select('built').mean().gt(0.5); };
var newBuilt = dwBuilt(YEAR).and(dwBuilt(2018).not()).clip(aoi);
var hit = ee.Image.pixelArea().divide(1e4).updateMask(newBuilt).addBands(changed.unmask(0))
  .reduceRegion({reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'embedding_changed'}),
    geometry: aoi, scale: 10, maxPixels: 1e11, tileScale: 4});
print('5: New built-up 2018→' + YEAR + ' (DW), ha, split by embedding change flag (1 = detected)', hit);

// ---------- 7 Export ----------
Export.table.toDrive({collection: curve, description: 'Prac13_learning_curve', folder: 'GEE_NT'});
Export.image.toDrive({image: change.float(), description: 'Prac13_embedding_change', folder: 'GEE_NT', region: aoi,
  scale: 10, crs: 'EPSG:32752', maxPixels: 1e11});

// Q: Compare the embedding classifier with your Prac 04 Random Forest map and your Prac 12 habitat predictors: what is gained and lost?
// Q: How do the k-means clusters correspond to WorldCover classes? Which classes split or merge?
// Q: At 5–10 labels per class, which approach wins: embeddings + kNN or Sentinel-2 + RF? At 100? Why?
// Q: What fraction of new built-up land (DW) is flagged by the embedding change map? What else does it flag (fire, clearing, wet/dry year)?
// Q: Foundation models are trained on huge, mostly non-Australian datasets. What could go wrong in NT savanna and floodplains?
// EXT: Our labels come from WorldCover. Digitise 20 independent points per class in the Code Editor and re-validate.
// EXT: Repeat the change analysis for the Douglas–Daly and compare with your Prac 06 clearing patches and Prac 05 LandTrendr loss year (omission/commission).
// EXT: Discuss transparency, reproducibility and accountability when an opaque embedding informs a regulatory decision.
