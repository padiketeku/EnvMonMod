/**** Prac 05a — Bi-temporal change: post-classification comparison and YOUR transition matrix (for AT3)
 * ENV306/506 Environmental Monitoring and Modelling (2026)
 * Inputs: your Prac 00 tile and AT3 years, and your Prac 04 training points ('class' 0–4).
 * Method: Landsat 8/9 dry-season composites → Random Forest trained on YEAR_A → classify both years
 *         → cross-tabulate (from-class × to-class) areas → transition matrix and change map.
 * AT3 (in class, Thu 5 Nov 3:30–4:30): short answers about THIS matrix. Bring the printed table and the export.
 * Q = core (ENV306 and ENV506).  EXT = ENV506 extension.
 ****/

// ---------- 0 EDIT: from Prac 00 and Prac 04 ----------
var TILE = ee.FeatureCollection('projects/YOUR_PROJECT/assets/my_tile').geometry();   // or paste the polygon from Prac 00
var YEAR_A = 2018;   // Prac 00: AT3 YEAR_A
var YEAR_B = 2024;   // Prac 00: AT3 YEAR_B
var TRAINING = ee.FeatureCollection('projects/YOUR_PROJECT/assets/prac04_training');   // points with integer 'class'
var NAMES = ['Water', 'Woodland', 'Agriculture', 'Bare soil', 'Grassland/other'];
var IDX = [0, 1, 2, 3, 4];
var PAL = ['#2166ac', '#1b7837', '#fdae61', '#bf812d', '#d9f0a3'];
Map.centerObject(TILE, 11);

// ---------- 1 Composites (Landsat 8/9, dry season May–Oct) ----------
function prep(img) {
  var qa = img.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(parseInt('11111', 2)).eq(0);   // fill, dilated cloud, cirrus, cloud, shadow
  var sr = img.select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'], ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'])
    .multiply(0.0000275).add(-0.2);
  return sr.updateMask(mask);
}
function composite(year) {
  var med = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2').merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
    .filterBounds(TILE).filterDate(year + '-05-01', year + '-10-31').map(prep).median();
  // Note: Landsat 9 starts in late 2021; for YEAR < 2021 the composite is Landsat 8 only.
  return med.addBands(med.normalizedDifference(['nir', 'red']).rename('NDVI'))
    .addBands(med.normalizedDifference(['green', 'swir1']).rename('MNDWI'))
    .addBands(med.normalizedDifference(['swir1', 'nir']).rename('NDBI'))
    .clip(TILE);
}
var imgA = composite(YEAR_A), imgB = composite(YEAR_B);
var bands = imgA.bandNames();
Map.addLayer(imgA, {bands: ['red', 'green', 'blue'], min: 0, max: 0.2}, 'Composite ' + YEAR_A, false);
Map.addLayer(imgB, {bands: ['red', 'green', 'blue'], min: 0, max: 0.2}, 'Composite ' + YEAR_B, false);

// ---------- 2 Train on YEAR_A, 70/30 hold-out ----------
var samples = imgA.sampleRegions({collection: TRAINING.filterBounds(TILE), properties: ['class'], scale: 30, tileScale: 4})
  .randomColumn('r', 42);
var train = samples.filter(ee.Filter.lt('r', 0.7)), test = samples.filter(ee.Filter.gte('r', 0.7));
var rf = ee.Classifier.smileRandomForest({numberOfTrees: 200, seed: 1}).train(train, 'class', bands);
var cm = test.classify(rf).errorMatrix('class', 'classification', IDX);
print('Hold-out accuracy (' + YEAR_A + '): overall, kappa', cm.accuracy(), cm.kappa());
print("Producer's and user's accuracy", cm.producersAccuracy(), cm.consumersAccuracy());

// ---------- 3 Classify both years ----------
// The same model is applied to YEAR_B. Q: what assumption does this make, and when does it fail?
var lcA = imgA.classify(rf).rename('lcA');
var lcB = imgB.classify(rf).rename('lcB');
Map.addLayer(lcA, {min: 0, max: 4, palette: PAL}, 'Land cover ' + YEAR_A, false);
Map.addLayer(lcB, {min: 0, max: 4, palette: PAL}, 'Land cover ' + YEAR_B, false);

// ---------- 4 Transition matrix ----------
var code = lcA.multiply(10).add(lcB).rename('code');   // e.g. 12 = Woodland → Agriculture
var grouped = ee.Image.pixelArea().divide(1e4).addBands(code).reduceRegion({
  reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'code'}),
  geometry: TILE, scale: 30, maxPixels: 1e10, tileScale: 4});
var groups = ee.FeatureCollection(ee.List(grouped.get('groups')).map(function(d) { return ee.Feature(null, d); }));

var rows = IDX.map(function(i) {
  var props = {from_class: NAMES[i]};
  IDX.forEach(function(j) {
    var match = groups.filter(ee.Filter.eq('code', i * 10 + j));
    props['to_' + NAMES[j].replace(/[^A-Za-z]/g, '_')] =
      ee.Number(ee.Algorithms.If(match.size().gt(0), match.first().get('sum'), 0)).round();
  });
  return ee.Feature(null, props);
});
var matrix = ee.FeatureCollection(rows);
print('Transition matrix (ha): rows = ' + YEAR_A + ', columns = ' + YEAR_B, matrix);

// Persistence and gross change
var stable = groups.filter(ee.Filter.inList('code', [0, 11, 22, 33, 44])).aggregate_sum('sum');
var total = groups.aggregate_sum('sum');
print('Persistence (% of tile)', ee.Number(stable).divide(total).multiply(100));

// ---------- 5 Visualise ----------
var w2a = lcA.eq(1).and(lcB.eq(2)).selfMask();
Map.addLayer(w2a, {palette: 'red'}, 'Woodland → Agriculture ' + YEAR_A + '–' + YEAR_B);
Map.addLayer(lcA.neq(lcB).selfMask(), {palette: 'yellow'}, 'Any change', false);
Map.addLayer(ee.FeatureCollection([ee.Feature(TILE)]).style({color: 'red', fillColor: '00000000'}), {}, 'My tile');

// ---------- 6 Export (bring to AT3) ----------
Export.table.toDrive({collection: matrix, description: 'AT3_transition_matrix_' + YEAR_A + '_' + YEAR_B, folder: 'GEE_NT'});

// Q: Which transition is largest after persistence? Is it real change or classification error? How would you tell?
// Q: If each map is 85 % accurate, roughly how accurate can the change map be? Why do errors compound?
// Q: Why is a cross-tabulation more informative than comparing the class totals in the two years?
// EXT: Train a separate model on YEAR_B (with your own YEAR_B points) and compare the matrices.
// EXT: Area-adjust the woodland → agriculture area with a stratified sample of change/no-change (Olofsson et al. 2014).
