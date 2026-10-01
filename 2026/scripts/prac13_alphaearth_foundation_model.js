/**** Prac 13 — Validating a geospatial foundation model: AlphaEarth satellite embeddings (NT)
 * Dataset: GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL — 64-band (A00–A63) unit-length embeddings, 10 m, annual 2017–2024,
 * produced by the AlphaEarth Foundations model from optical, SAR, lidar, climate and other inputs
 * (Brown et al. 2025, arXiv:2507.22291).
 * Activities: (1) explore, (2) unsupervised clustering, (3) few-shot classification vs spectral baseline,
 * (4) similarity search, (5) change detection — each VALIDATED against independent references.
 * Run entirely in the GEE Code Editor.
 *
 * WHAT THIS SCRIPT DOES:
 *   Asks: are AlphaEarth embeddings useful and trustworthy for mapping the Darwin–Palmerston–Howard Springs area?
 *   Each pixel has a 64-number "summary" (embedding) of what the model learned about it in a year. The script clusters
 *   them, classifies land cover from very few labels (vs a Sentinel-2 baseline), finds pixels similar to a reference
 *   point, and detects change 2018→YEAR — checking each result against WorldCover or Dynamic World.
 *   Note: script sections are numbered 1–7; map layer and Console labels use the activity numbers 1–5.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) Optional EDIT lines: YEAR (section 1, 2017–2024) and refPoint (section 5, the reference location).
 *   (3) Click Run. The learning curve trains 10 classifiers, so allow a minute or two.
 *   (4) Read the Console (band names, cluster × WorldCover table, learning-curve chart, change table), turn layers
 *       on/off in the Map's Layers list, and start the two exports in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   Map: embedding as RGB (1); k-means clusters (2, off); few-shot land-cover map (3, off); similarity to the reference
 *   point, pixels > 0.9 and the point itself (4, off); embedding similarity 2018 vs YEAR and changed pixels (5).
 *   Console: the 64 band names; cluster × WorldCover counts; a chart of overall accuracy vs labels per class for
 *   embeddings + kNN and Sentinel-2 + RF; new built-up area (ha) split by whether the embedding flagged change.
 *
 * DATA:
 *   - GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL — AlphaEarth embeddings, 64 bands, 10 m, annual 2017–2024 (2018 and YEAR used).
 *   - ESA/WorldCover/v200 — ESA WorldCover land cover, 10 m, 2021 (labels and cluster check).
 *   - COPERNICUS/S2_SR_HARMONIZED — Sentinel-2 surface reflectance, 10–20 m, May–Sep of YEAR (spectral baseline).
 *   - GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED — Cloud Score+ cloud probability for Sentinel-2.
 *   - GOOGLE/DYNAMICWORLD/V1 — Dynamic World 'built' probability, 10 m, May–Oct of 2018 and YEAR (change check).
 *
 * LINKS: pracs/prac13-geospatial-foundation-models-validating-alphaearth.md
 *   Feeds Prac 13 and AT4 elective (b).
 *
 * KEY GEE IDEAS:
 *   - Image band maths across all 64 bands (multiply then reduce('sum') = dot product per pixel).
 *   - Unsupervised (ee.Clusterer) vs supervised (ee.Classifier) learning; stratifiedSample for balanced labels.
 *   - errorMatrix and accuracy for validation; grouped reducers for cross-tabulation.
 *   - Server-side lists and map() to build a learning curve as a FeatureCollection.
 *
 * Q = core (ENV306 and ENV506). EXT = ENV506 extension.
 ****/

// ---------- 1 Study area ----------
// A rectangle around Darwin's urban area and rural fringe, and the main year analysed.
var aoi = ee.Geometry.Rectangle([130.80, -12.75, 131.30, -12.35]);   // Darwin–Palmerston–Howard Springs
Map.centerObject(aoi, 11);
var YEAR = 2024;   // EDIT if you like: any year 2017–2024

// ---------- 2 Data ----------
// Activity 1 (explore): load one year of embeddings. The collection is stored as tiles, one per area per year.
var emb = ee.ImageCollection('GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL');
// embYear(): all tiles for year y (1 Jan to 1 Jan next year; end date exclusive) over the aoi, joined by mosaic().
function embYear(y) {
  return emb.filterDate(ee.Date.fromYMD(y, 1, 1), ee.Date.fromYMD(y + 1, 1, 1)).filterBounds(aoi).mosaic().clip(aoi);
}
var e = embYear(YEAR);
var bands = e.bandNames();   // A00 … A63
print('Embedding bands', bands);
// Three of the 64 axes shown as red, green, blue. Values range about −1 to 1; ±0.3 is a display stretch.
Map.addLayer(e, {bands: ['A01', 'A16', 'A09'], min: -0.3, max: 0.3}, '1: Embedding ' + YEAR + ' (3 axes as RGB)');
// Q: The axes have no physical meaning (unlike bands). What does colour similarity mean here?

// ---------- 3 Unsupervised clustering ----------
// Activity 2: group pixels with similar embeddings into K clusters WITHOUT any labels (k-means), then check
// what the clusters correspond to in an independent land-cover map.
var K = 8;   // number of clusters — a starting value, test others
// sample(): 5,000 random pixels at 10 m (seed 1 = repeatable) to train the clusterer.
var training = e.sample({region: aoi, scale: 10, numPixels: 5000, seed: 1});
var clusterer = ee.Clusterer.wekaKMeans(K).train(training);
var clusters = e.cluster(clusterer);   // band 'cluster' with values 0 … K−1 (cluster numbers are labels, not ranks)
Map.addLayer(clusters.randomVisualizer(), {}, '2: k-means clusters (K=' + K + ')', false);   // random colour per cluster

// Validate clusters against ESA WorldCover: cross-tabulation
// For 5,000 new random pixels, count WorldCover classes (band 'Map') within each cluster.
// frequencyHistogram counts each value; group(groupField: 0) does this separately for each value of column 0 (cluster).
var wc = ee.ImageCollection('ESA/WorldCover/v200').first().clip(aoi);
var xtab = clusters.addBands(wc).sample({region: aoi, scale: 10, numPixels: 5000, seed: 2})
  .reduceColumns(ee.Reducer.frequencyHistogram().group({groupField: 0, groupName: 'cluster'}), ['cluster', 'Map']);
print('2: Cluster × WorldCover class counts', xtab);

// ---------- 4 Few-shot classification: embeddings vs Sentinel-2 spectral baseline ----------
// Activity 3: how many labels does each approach need? Train with 5 to 100 labels per class and compare
// embeddings + k-nearest-neighbour (kNN) against Sentinel-2 bands + Random Forest on the same test set.
// Labels: WorldCover 2021 merged to 6 classes (teaching labels — see EXT for independent validation)
// remap(from, to): WorldCover codes 10 tree, 20 shrub, 30 grass, 40 crop, 50 built, 60 bare, 80 water,
// 90 herbaceous wetland, 95 mangrove → our 6 classes. Codes not listed become masked.
var labels = wc.remap([10, 20, 30, 40, 50, 60, 80, 90, 95], [0, 1, 1, 2, 3, 4, 5, 1, 0]).rename('class');
// classes: 0 trees/mangrove, 1 grass/shrub/wetland, 2 cropland, 3 built, 4 bare, 5 water
// Sentinel-2 dry-season median for the baseline. cs_cdf is Cloud Score+'s clear-sky score (0 = cloud, 1 = clear);
// ≥ 0.6 is a starting value — test others. ÷ 10000 converts stored integers to reflectance (0–1).
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(aoi).filterDate(YEAR + '-05-01', YEAR + '-09-30')
  .linkCollection(csPlus, ['cs_cdf'])   // attach the matching Cloud Score+ band to each Sentinel-2 image
  .map(function(img) { return img.updateMask(img.select('cs_cdf').gte(0.6)).divide(10000); }).median()
  .select(['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B11', 'B12']).clip(aoi);   // visible, red-edge, NIR, SWIR
var s2Bands = s2.bandNames();

// stratifiedSample: up to 400 points PER CLASS (balanced), with embedding, S2 and class values (seed 7 = repeatable).
// randomColumn adds 'r' (0–1, seed 9): r ≥ 0.6 → fixed test set (40 %); r < 0.6 → pool to draw training labels from.
var pool = e.addBands(s2).addBands(labels).stratifiedSample({numPoints: 400, classBand: 'class', region: aoi,
  scale: 10, seed: 7, geometries: true, tileScale: 4}).randomColumn('r', 9);
var testSet = pool.filter(ee.Filter.gte('r', 0.6));
var trainPool = pool.filter(ee.Filter.lt('r', 0.6));

// Learning curve: n labels per class
var NS = [5, 10, 25, 50, 100];   // client-side list of training sizes per class
var curve = ee.FeatureCollection(NS.map(function(n) {
  // For each class 0–5 take n points (limit(n, 'r') = the n with the smallest 'r', i.e. a random n), then
  // flatten() joins the six per-class collections into one training set.
  var train = ee.FeatureCollection(ee.List.sequence(0, 5).map(function(c) {
    return trainPool.filter(ee.Filter.eq('class', c)).limit(n, 'r');
  })).flatten();
  var accE = test(ee.Classifier.smileKNN(3).train(train, 'class', bands));   // kNN, k = 3 nearest neighbours in embedding space
  var accS = test(ee.Classifier.smileRandomForest(100).train(train, 'class', s2Bands));   // RF with 100 trees on S2 bands
  return ee.Feature(null, {labels_per_class: n, embeddings_kNN: accE, s2_RF: accS});
}));
// test(): classify the test set, build a confusion (error) matrix of true 'class' vs predicted 'classification',
// and return overall accuracy (share of test points correct, 0–1). Declared here but usable above (JS hoisting).
function test(classifier) { return testSet.classify(classifier).errorMatrix('class', 'classification').accuracy(); }
print(ui.Chart.feature.byFeature(curve, 'labels_per_class', ['embeddings_kNN', 's2_RF'])
  .setOptions({title: '3: Overall accuracy vs number of training labels per class', hAxis: {title: 'labels per class', scaleType: 'log'},
               vAxis: {title: 'overall accuracy'}, pointSize: 4}));

// Map the embedding classifier trained with 25 labels per class across the whole aoi.
var train25 = ee.FeatureCollection(ee.List.sequence(0, 5).map(function(c) {
  return trainPool.filter(ee.Filter.eq('class', c)).limit(25, 'r'); })).flatten();
var fewShot = e.classify(ee.Classifier.smileKNN(3).train(train25, 'class', bands));
// Colours follow classes 0–5: trees, grass/shrub, cropland, built, bare, water.
Map.addLayer(fewShot, {min: 0, max: 5, palette: ['#006400', '#ffbb22', '#f096ff', '#fa0000', '#b4b4b4', '#0064c8']},
  '3: Few-shot map (25 labels/class, embeddings)', false);

// ---------- 5 Similarity search ----------
// Activity 4: find all pixels whose embedding points in nearly the same direction as a reference location's.
// Click-free version: a reference pixel (edit the point — e.g. a mango orchard, a solar farm, a mangrove stand)
var refPoint = ee.Geometry.Point([131.05, -12.55]);   // EDIT: [longitude, latitude]
// Mean embedding within 30 m of the point (a few 10 m pixels), returned as a dictionary band name → value.
var refVec = e.reduceRegion({reducer: ee.Reducer.mean(), geometry: refPoint.buffer(30), scale: 10});
// Turn the 64 numbers into a constant 64-band image so it can be multiplied pixel by pixel.
var refImg = ee.Image.constant(bands.map(function(b) { return refVec.get(b); })).rename(bands);
// Multiply band by band and sum = dot product. (The averaged reference vector is slightly shorter than unit length,
// so values are a close approximation of cosine similarity: 1 = same direction, 0 = unrelated.)
var similarity = e.multiply(refImg).reduce('sum').rename('cosine');   // unit vectors: dot product = cosine similarity
Map.addLayer(similarity, {min: 0.5, max: 1, palette: ['black', 'yellow', 'white']}, '4: Similarity to reference point', false);
// 0.9 is a starting value — test others.
Map.addLayer(similarity.gt(0.9).selfMask(), {palette: 'magenta'}, '4: Pixels with similarity > 0.9', false);
Map.addLayer(refPoint, {color: 'cyan'}, '4: Reference point', false);

// ---------- 6 Change detection: dot product between years ----------
// Activity 5: the same pixel in two years. A dot product near 1 = the embedding barely changed; low = something changed.
var e2018 = embYear(2018);
var change = e2018.multiply(e).reduce('sum').rename('dot_2018_' + YEAR);   // 1 = unchanged, low = changed
Map.addLayer(change, {min: 0.3, max: 1, palette: ['red', 'orange', 'white']}, '5: Embedding similarity 2018 vs ' + YEAR);
var changed = change.lt(0.7).selfMask();   // 0.7 is a starting value — test others
Map.addLayer(changed, {palette: 'red'}, '5: Changed (dot < 0.7)', false);
// Validate: compare with Dynamic World 'built' change and your Prac 05 / Prac 06 / Prac 10 outputs
// dwBuilt(y): mean Dynamic World 'built' probability over the May–Oct dry season of year y; > 0.5 = built (starting value).
var dwBuilt = function(y) { return ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1').filterBounds(aoi)
  .filterDate(y + '-05-01', y + '-10-31').select('built').mean().gt(0.5); };
var newBuilt = dwBuilt(YEAR).and(dwBuilt(2018).not()).clip(aoi);   // built in YEAR but not in 2018
// Area (ha) of new built-up land, grouped by the embedding change flag (band 1: 0 = not flagged, 1 = flagged).
// unmask(0) makes unflagged pixels 0 instead of masked so they are counted too. scale: 10 m; tileScale: 4 saves memory.
var hit = ee.Image.pixelArea().divide(1e4).updateMask(newBuilt).addBands(changed.unmask(0))
  .reduceRegion({reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'embedding_changed'}),
    geometry: aoi, scale: 10, maxPixels: 1e11, tileScale: 4});
print('5: New built-up 2018→' + YEAR + ' (DW), ha, split by embedding change flag (1 = detected)', hit);

// ---------- 7 Export ----------
// Learning-curve table as CSV, and the change image as a GeoTIFF, to Google Drive (start both in the Tasks tab).
// crs 'EPSG:32752' = WGS 84 / UTM zone 52S (metres), which covers Darwin; scale: 10 m = embedding resolution.
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
