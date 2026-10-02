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
