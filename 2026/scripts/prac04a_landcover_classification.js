/**** Prac 04a — Land cover classification: Random Forest, CART and SVM (Darwin–Litchfield, NT)
 * Predictors: Sentinel-2 dry + late-wet season composites, indices, terrain.
 * Reference labels: by default sampled from ESA WorldCover 2021 (a TEACHING SHORTCUT).
 * Better practice: digitise your own training polygons (see section 2b) or use field data.
 *
 * WHAT THIS SCRIPT DOES:
 *   Asks: how well can three machine-learning classifiers map land cover between Darwin and Litchfield, and which
 *   inputs matter most? It builds Sentinel-2 composites for the 2021 dry and late-wet seasons plus terrain, samples
 *   7-class labels, trains Random Forest (RF), CART and SVM, compares their accuracy on held-out points, and maps
 *   the classes and their areas.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) No EDIT lines are required. Optional: replace the WorldCover labels with your own digitised polygons (section 2b).
 *   (3) Click Run (the first run can take a minute or two).
 *   (4) Read accuracy tables and the importance chart in the Console (right panel), turn layers on/off in the Map's
 *       Layers list, and start the export in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   Map layers: S2 dry-season true colour; Reference (remapped WorldCover); CART; SVM; Random Forest; plus a legend.
 *   Console: predictor band names; training/testing counts; for each classifier the confusion matrix, overall accuracy,
 *   kappa, producer's and user's accuracy and F1; an RF variable importance chart; RF area per class (ha).
 *
 * DATA:
 *   COPERNICUS/S2_SR_HARMONIZED — Sentinel-2 surface reflectance, 10–20 m, Mar–Apr and May–Sep 2021.
 *   GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED — Cloud Score+ per-pixel cloud scores for Sentinel-2 (band cs_cdf).
 *   NASA/NASADEM_HGT/001 — NASADEM elevation, 30 m (≈ 1 arc-second); slope derived from it.
 *   ESA/WorldCover/v200 — ESA WorldCover 2021 land cover, 10 m (used as reference labels).
 *
 * LINKS:
 *   Prac page: pracs/prac04-land-cover-mapping-and-landscape-metrics.md
 *   Assessment: Prac 04; AT4 Part 1; training points reused for AT3.
 *
 * KEY GEE IDEAS:
 *   - Supervised classification: sample predictors at labelled points, train(), then classify() the image.
 *   - Accuracy assessment with errorMatrix() on an independent (held-out) test set.
 *   - Cloud masking with Cloud Score+ via linkCollection(), then a median composite.
 *   - Grouped reducers: area per class in one reduceRegion call.
 *
 * Q = core (ENV306 and ENV506).  EXT = ENV506 extension.
 ****/

// ---------- 1 Study area ----------
// A rectangle from Darwin south to Litchfield National Park (about 65 × 78 km).
var aoi = ee.Geometry.Rectangle([130.60, -13.10, 131.20, -12.40]);   // [west, south, east, north]
Map.centerObject(aoi, 10);

// ---------- 2 Data: predictors ----------
// Predictors are the layers the classifier learns from: reflectance in two seasons, three indices per season, and terrain.
// Two seasons help separate classes that look alike in one season (e.g. grass is green in the wet, brown in the dry).
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
function s2Composite(start, end) {
  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(aoi).filterDate(start, end)   // only scenes over the study area in the date window
    .linkCollection(csPlus, ['cs_cdf'])   // attach the matching Cloud Score+ band to each Sentinel-2 image
    .map(function(img) {
      // cs_cdf runs 0 (cloudy) to 1 (clear). Keep pixels ≥ 0.6 — a starting value; test others.
      return img.updateMask(img.select('cs_cdf').gte(0.6))
        .select(['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B11', 'B12']).divide(10000);   // ÷ 10000 → reflectance (0–1)
    }).median();   // per-pixel median of clear observations: removes leftover cloud and shadow outliers
}
var dry = s2Composite('2021-05-01', '2021-09-30');
var wet = s2Composite('2021-03-01', '2021-04-30');   // late wet season: still green, fewer clouds than Jan

// Adds NDVI (greenness), MNDWI (open water) and NDBI (built-up/bare) and tags every band name with the season.
function addIndices(img, suffix) {
  var ndvi = img.normalizedDifference(['B8', 'B4']).rename('NDVI' + suffix);     // (NIR − red) / (NIR + red)
  var mndwi = img.normalizedDifference(['B3', 'B11']).rename('MNDWI' + suffix);  // (green − SWIR) / (green + SWIR)
  var ndbi = img.normalizedDifference(['B11', 'B8']).rename('NDBI' + suffix);    // (SWIR − NIR) / (SWIR + NIR)
  return img.rename(img.bandNames().map(function(b) { return ee.String(b).cat(suffix); }))   // e.g. B4 → B4_dry
    .addBands([ndvi, mndwi, ndbi]);
}
var dem = ee.Image('NASA/NASADEM_HGT/001').select('elevation');   // metres above sea level
var slope = ee.Terrain.slope(dem);   // degrees
var predictors = addIndices(dry, '_dry').addBands(addIndices(wet, '_wet'))
  .addBands(dem).addBands(slope).clip(aoi);   // 26 bands in total
var bands = predictors.bandNames();
print('Predictor bands', bands);

Map.addLayer(dry, {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.25}, 'S2 dry season 2021');   // true colour (red, green, blue)

// ---------- 2a Reference labels from ESA WorldCover (teaching shortcut) ----------
// Training needs labelled pixels. Here labels are borrowed from an existing global map, which is quick but means
// we measure agreement with WorldCover, not true accuracy (see the EXT question).
var wc = ee.ImageCollection('ESA/WorldCover/v200').first().clip(aoi);   // v200 = the 2021 map (one image)
// Merge to 7 classes: 0 tree, 1 shrub/grass, 2 cropland, 3 built, 4 bare, 5 water, 6 mangrove (+ wetland herb -> 1)
// WorldCover codes: 10 tree, 20 shrub, 30 grass, 40 crop, 50 built, 60 bare, 80 water, 90 herbaceous wetland, 95 mangrove.
// Codes not listed (e.g. 70 snow, 100 moss) become masked by remap().
var fromCodes = [10, 20, 30, 40, 50, 60, 80, 90, 95];
var toCodes   = [0,  1,  1,  2,  3,  4,  5,  1,  6];   // each position pairs with fromCodes above
var labels = wc.remap(fromCodes, toCodes).rename('class');
var classNames = ['Tree cover', 'Shrub/grass', 'Cropland', 'Built-up', 'Bare', 'Water', 'Mangrove'];   // index = class number
var palette = ['#006400', '#ffbb22', '#f096ff', '#fa0000', '#b4b4b4', '#0064c8', '#00cf75'];

// Stratified sampling takes up to 300 points PER class, so rare classes (built-up, mangrove) are not swamped by trees.
// scale 10 = Sentinel-2 pixel size; seed makes the sample repeatable; tileScale 4 splits the work to avoid memory errors.
var samples = predictors.addBands(labels).stratifiedSample({
  numPoints: 300, classBand: 'class', region: aoi, scale: 10, seed: 42, geometries: true,
  tileScale: 4
});
// ---------- 2b Alternative: your own digitised polygons ----------
// Better practice: label polygons yourself from imagery or field visits. These lines are commented out; to use them,
// remove the leading // and comment out the stratifiedSample block above. Add geometries: true to sampleRegions so the
// SVM step (section 3) can re-sample the same points.
// Draw FeatureCollections named tree, grass, ... with property 'class' (0–6) using the geometry tools, then:
// var training = tree.merge(grass).merge(crop) ... ;
// var samples = predictors.sampleRegions({collection: training, properties: ['class'], scale: 10, geometries: true});

// Random 70/30 split: 70 % of points train the models, 30 % are held back to test them.
samples = samples.randomColumn('rand', 7);   // adds a uniform random number 0–1 to each point (seed 7)
var train = samples.filter(ee.Filter.lt('rand', 0.7));
var test = samples.filter(ee.Filter.gte('rand', 0.7));
print('Training / testing points', train.size(), test.size());

// ---------- 3 Classifiers ----------
// Three classifiers learn the link between predictor values and class labels from the training points.
// RF = many decision trees voting; CART = one decision tree; SVM = finds boundaries between classes in predictor space.
var rf = ee.Classifier.smileRandomForest({numberOfTrees: 200, seed: 1})   // 200 trees: a starting value; test others
  .train({features: train, classProperty: 'class', inputProperties: bands});
var cart = ee.Classifier.smileCart({minLeafPopulation: 5})   // a leaf needs ≥ 5 points: limits over-fitting
  .train({features: train, classProperty: 'class', inputProperties: bands});

// SVM is sensitive to scale: standardise predictors with means and SDs from the training data.
// (In this code the means and SDs are computed over the whole study area at 100 m, not from the training points.)
// Standardising puts every band on the same footing (z-score), so elevation in metres does not outweigh reflectance.
// 100 m is coarse but quick
var meanDict = predictors.reduceRegion({reducer: ee.Reducer.mean(), geometry: aoi, scale: 100, maxPixels: 1e10});
var sdDict = predictors.reduceRegion({reducer: ee.Reducer.stdDev(), geometry: aoi, scale: 100, maxPixels: 1e10});
var means = ee.Image.constant(bands.map(function(b) { return meanDict.get(b); })).rename(bands);   // dictionary → constant image
var sds = ee.Image.constant(bands.map(function(b) { return sdDict.get(b); })).rename(bands);
var predictorsZ = predictors.subtract(means).divide(sds);   // z = (value − mean) / SD for every band
// Re-sample the standardised image at the same points, keeping each point's class and its 'rand' value,
// so the SVM uses the same 70/30 split as RF and CART.
var samplesZ = predictorsZ.addBands(labels).sampleRegions({
  collection: samples.select(['class', 'rand']), properties: ['class', 'rand'], scale: 10, tileScale: 4});
var trainZ = samplesZ.filter(ee.Filter.lt('rand', 0.7));
var testZ = samplesZ.filter(ee.Filter.gte('rand', 0.7));
// RBF kernel with gamma 0.05 and cost 10: starting values — test others (see the EXT on grid search).
var svm = ee.Classifier.libsvm({kernelType: 'RBF', gamma: 0.05, cost: 10})
  .train({features: trainZ, classProperty: 'class', inputProperties: bands});

// ---------- 4 Accuracy assessment ----------
// Each classifier predicts the class of the held-out test points; the error (confusion) matrix compares predicted
// with reference labels. The function prints the standard accuracy measures to the Console.
function assess(classifier, testSet, name) {
  var cm = testSet.classify(classifier).errorMatrix('class', 'classification');   // reference column, predicted column
  print(name + ' confusion matrix (rows = reference, cols = predicted)', cm);
  print(name + ' overall accuracy', cm.accuracy());   // proportion of test points correct (0–1)
  print(name + ' kappa', cm.kappa());   // agreement beyond what chance would give
  // per class: how much of the real class was found
  print(name + " producer's accuracy (1 - omission)", cm.producersAccuracy());
  print(name + " user's accuracy (1 - commission)", cm.consumersAccuracy());     // per class: how reliable the mapped class is
  print(name + ' F1 per class', cm.fscore());   // balance of producer's and user's accuracy
  return cm;
}
var cmRF = assess(rf, test, 'RF');
var cmCART = assess(cart, test, 'CART');
var cmSVM = assess(svm, testZ, 'SVM');   // the SVM is tested on the standardised test points

// Variable importance: how much each predictor helped the RF trees split the classes. Turned into a table for charting.
var importance = ee.Dictionary(rf.explain().get('importance'));
var impFc = ee.FeatureCollection(importance.keys().map(function(k) {
  return ee.Feature(null, {band: k, importance: importance.get(k)});   // one row per band
})).sort('importance', false);   // most important first
print(ui.Chart.feature.byFeature(impFc, 'band', 'importance').setChartType('BarChart')
  .setOptions({title: 'Random Forest variable importance', legend: {position: 'none'}}));

// ---------- 5 Visualise ----------
// Show each classified map with the same colours as the reference so they are easy to compare (toggle in Layers).
var vis = {min: 0, max: 6, palette: palette};   // class 0–6 → the 7 colours
var classRF = predictors.classify(rf);   // classify every pixel in the study area
Map.addLayer(labels, vis, 'Reference: WorldCover (remapped)', false);
Map.addLayer(predictors.classify(cart), vis, 'CART', false);
Map.addLayer(predictorsZ.classify(svm), vis, 'SVM', false);   // SVM must classify the standardised image
Map.addLayer(classRF, vis, 'Random Forest');

// Legend
// A small panel in the bottom-left of the Map: one coloured box and class name per row.
var legend = ui.Panel({style: {position: 'bottom-left', padding: '6px'}});
classNames.forEach(function(n, i) {   // client-side loop over the JavaScript list
  legend.add(ui.Panel([ui.Label('', {backgroundColor: palette[i], padding: '8px', margin: '2px'}),
                       ui.Label(n, {margin: '4px'})], ui.Panel.Layout.Flow('horizontal')));
});
Map.add(legend);

// Mapped area per class (ha)
// pixelArea() gives m² per pixel; ÷ 1e4 = hectares. The grouped reducer sums band 0 (area) for each value of band 1 (class).
var areaByClass = ee.Image.pixelArea().divide(1e4).addBands(classRF).reduceRegion({
  reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'class'}),
  geometry: aoi, scale: 10, maxPixels: 1e11, tileScale: 4});   // maxPixels raised: the area holds ~50 million 10 m pixels
print('Mapped area by class (ha), RF', areaByClass);   // a list of {class, sum} groups

// ---------- 6 Export ----------
// Saves the RF map as a GeoTIFF to the GEE_NT folder in Google Drive. Start it in the Tasks tab.
// toByte() stores classes 0–6 compactly; EPSG:32752 = WGS 84 / UTM zone 52S (metres), the UTM zone covering Darwin.
Export.image.toDrive({image: classRF.toByte(), description: 'Prac04a_RF_landcover_2021', folder: 'GEE_NT',
  region: aoi, scale: 10, crs: 'EPSG:32752', maxPixels: 1e11});

// Q: Which classifier has the highest overall accuracy? Which classes are confused most, and why (spectrally)?
// Q: Which predictors does RF rank highest? Does the wet-season composite help?
// Q: Why must SVM inputs be standardised but RF and CART inputs need not be?
// EXT: Our labels come from another map (WorldCover), so we are measuring agreement, not accuracy. Critique this.
// EXT: Tune RF (numberOfTrees, variablesPerSplit) and SVM (gamma, cost) by grid search; report the validation curve.
// EXT: Compute area-adjusted accuracy and 95% CIs (Olofsson et al. 2014) from the RF error matrix and mapped areas.
// EXT: Test spatial autocorrelation: split train/test by spatial blocks (e.g. 5 km grid) and compare accuracy.
