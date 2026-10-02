[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 03](prac03-climate-and-hydrology-drivers-rainfall-anomalies-drought-indices-lst-and-et.md) · [Prac 05 →](prac05-change-detection-bi-temporal-transitions-landtrendr-and-ccdc.md)

# Prac 04: Land cover mapping and landscape metrics

**When:** Wed 4 Nov 2026, Sessions 1–2 · **Scripts:** [`prac04a_landcover_classification.js`](../scripts/prac04a_landcover_classification.js), [`prac04b_landscape_metrics.js`](../scripts/prac04b_landscape_metrics.js) · **ULOs:** 1, 2, 3, 4

**Also available in:** Python [`prac04_landcover_landscape_metrics.py`](../alternatives/python/prac04_landcover_landscape_metrics.py) · R [`prac04_landcover_landscape_metrics.R`](../alternatives/r/prac04_landcover_landscape_metrics.R) · QGIS [recipe](../alternatives/qgis/README.md). The Code Editor remains the main environment.

**Purpose.** Classify land cover with RF, CART and SVM, assess accuracy, and quantify landscape pattern with metrics, first for a teaching area and then for your own Daly tile.

## 1. Concept notes

### 1.1 Image classification

Supervised classification assigns every pixel to a class, using training samples of known class and predictor features: spectral bands, indices, seasonal composites, SAR backscatter and terrain.

| Classifier | How it works | Strengths | Watch out for |
| --- | --- | --- | --- |
| CART | A single decision tree that splits predictors at thresholds | Interpretable; fast | Overfits; unstable |
| Random Forest (RF) | Many trees on bootstrap samples and random predictor subsets, combined by majority vote | Robust; variable importance; no scaling needed | Inflated accuracy with spatially clustered samples |
| Support vector machine (SVM) | Maximum-margin boundary; the RBF kernel allows curved boundaries | Strong with small training sets | Standardise inputs; tune `gamma` and `cost` |

### 1.2 Accuracy assessment

- **Error (confusion) matrix:** rows = reference, columns = map.
- **Overall accuracy;** **producer's accuracy** = 1 − omission error; **user's accuracy** = 1 − commission error; F1.
- Kappa is reported by convention but is widely criticised (Pontius & Millones, 2011).
- **Good practice** (Olofsson et al., 2014): use a probability-based sample and report *area-adjusted* accuracy and area estimates with confidence intervals.

```math
\hat{p}_{\cdot k}=\sum_i W_i\frac{n_{ik}}{n_{i\cdot}} \qquad \hat{A}_k=A_{tot}\,\hat{p}_{\cdot k} \qquad W_i=\text{mapped area proportion of class } i
```

### 1.3 Spatial pattern analysis: landscape metrics

| Metric | Meaning |
| --- | --- |
| PLAND (%) | Share of the landscape occupied by a class |
| NP; MPS | Number of patches; mean patch size |
| LPI (%) | Largest patch as a share of the landscape |
| ED (m/ha) | Edge density |
| Core area | Habitat beyond an edge-effect distance |
| Isolation | Distance to the nearest habitat |
| Shannon diversity (H) | Local heterogeneity, −Σ p ln p |

*Habitat loss* reduces PLAND. *Fragmentation per se* breaks habitat into more, smaller and more isolated patches: NP and ED rise while MPS, LPI and core area fall. Metrics depend on grain, extent, the classification and the neighbour rule. This is why landscape ecologists report the scale of analysis.

## 2. Practical activities

**Activity 4.1 – Classification (`prac04a`), Darwin–Litchfield.**

1. Build predictors: Sentinel-2 dry and late-wet composites, NDVI, MNDWI, NDBI, elevation and slope.
2. Sample 300 points per class (7 classes, including mangrove) from WorldCover, a teaching shortcut, then split 70/30.
3. Train RF, CART and SVM; for SVM, standardise the inputs first. Compare confusion matrices, F1 and RF importance.
4. **Required:** digitise at least 30 polygons of your own with the geometry tools (section 2b), retrain RF and compare.

**Activity 4.2 – Landscape metrics (`prac04b`), Douglas–Daly.**

1. Define woodland habitat (Dynamic World trees + shrub). Compute PLAND, NP, MPS, LPI, ED, core area, isolation and Shannon H for 2017 and 2024.
2. Map habitat lost, edge, core and isolation, and chart the patch-size distribution.
3. Re-run at 10, 30 and 90 m grain and tabulate how each metric responds.
4. Repeat the 2017 vs 2024 comparison for **your tile**.

**Key code** (an excerpt from [`prac04a_landcover_classification.js`](../scripts/prac04a_landcover_classification.js); run the full script for the complete workflow):

```javascript
// Train a Random Forest on 70 % of the samples and assess it on the other 30 %
// (predictors, samples and bands are built earlier in the script)
var samples = samples.randomColumn('rand', 1);
var train = samples.filter(ee.Filter.lt('rand', 0.7));
var test = samples.filter(ee.Filter.gte('rand', 0.7));
var rf = ee.Classifier.smileRandomForest({numberOfTrees: 200, seed: 1})
  .train({features: train, classProperty: 'class', inputProperties: bands});
var cm = test.classify(rf).errorMatrix('class', 'classification');
print('Overall accuracy', cm.accuracy(), 'Kappa', cm.kappa());
print("Producer's accuracy", cm.producersAccuracy(), "User's accuracy", cm.consumersAccuracy());
Map.addLayer(predictors.classify(rf), {min: 0, max: 6, palette: palette}, 'Land cover (RF)');
```

## 3. Challenge questions (knowledge check)

**Core**

1. Which classifier is most accurate here? Which two classes are confused most, and why spectrally?
2. Explain producer's vs user's accuracy using the mangrove class.
3. Why does SVM need standardised inputs but RF does not?
4. Did the Douglas–Daly experience habitat loss, fragmentation, or both? Use three metrics to justify your answer.
5. Which metrics are most sensitive to grain, and why?

**Extension (ENV506)**

1. Validating against WorldCover measures *agreement*, not accuracy. Design a stratified random sample, interpret it in the Code Editor, and report area-adjusted accuracy with 95 % CIs.
2. Compare a random train/test split with spatially blocked splits (5 km blocks), and explain the difference using spatial autocorrelation.
3. Tune RF and SVM by grid search, and report the validation curve.
4. Test how sensitive the metrics are to the Dynamic World probability threshold (0.4, 0.5, 0.6), and write a 300-word briefing for an NT clearing-assessment officer on which metrics to report.

## 4. Link to summative assessment

- **AT4 Part 1:** classify **your Daly tile** with your own training and validation points; report the error matrix, producer's and user's accuracy, area per class and at least two landscape metrics (ENV506: area-adjusted accuracy with 95 % confidence intervals).
- **AT1:** keep your training points; they are reused in Prac 05a.

## 5. Reading

- Belgiu, M., & Drăguţ, L. (2016). Random forest in remote sensing: A review of applications and future directions. *ISPRS Journal of Photogrammetry and Remote Sensing, 114*, 24–31. https://doi.org/10.1016/j.isprsjprs.2016.01.011
- Maxwell, A. E., Warner, T. A., & Fang, F. (2018). Implementation of machine-learning classification in remote sensing: An applied review. *International Journal of Remote Sensing, 39*(9), 2784–2817. https://doi.org/10.1080/01431161.2018.1433343
- Olofsson, P., et al. (2014). Good practices for estimating area and assessing accuracy of land change. *Remote Sensing of Environment, 148*, 42–57. https://doi.org/10.1016/j.rse.2014.02.015
- Pontius, R. G., & Millones, M. (2011). Death to Kappa. *International Journal of Remote Sensing, 32*(15), 4407–4429. https://doi.org/10.1080/01431161.2011.552923
- Brown, C. F., et al. (2022). Dynamic World, near real-time global 10 m land use land cover mapping. *Scientific Data, 9*, 251. https://doi.org/10.1038/s41597-022-01307-4
- Zanaga, D., et al. (2022). *ESA WorldCover 10 m 2021 v200*. Zenodo. https://doi.org/10.5281/zenodo.7254221
- Hesselbarth, M. H. K., et al. (2019). landscapemetrics: An open-source R tool to calculate landscape metrics. *Ecography, 42*, 1648–1657. https://doi.org/10.1111/ecog.04617 (concepts and metric definitions)

## Full scripts

Each script is copied here from [`scripts/`](../scripts) so this page has everything in one place. The `.js` file is the master copy: if the two ever differ, use the file. Click a heading to open the script, then use the copy button and paste it into a new script in the Code Editor.

<details>
<summary><strong>prac04a_landcover_classification.js</strong> (205 lines)</summary>

```javascript
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
 *   Assessment: Prac 04; AT4 Part 1; training points reused for AT1.
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
```

</details>

<details>
<summary><strong>prac04b_landscape_metrics.js</strong> (170 lines)</summary>

```javascript
/**** Prac 04b — Spatial pattern analysis: landscape metrics for woodland habitat (Douglas–Daly, NT)
 * LO1 + LO4. Patch–corridor–matrix, fragmentation, edge, core area, isolation, heterogeneity.
 * Data: Google Dynamic World (10 m, 2015–present) dry-season modal land cover, 2017 vs 2024.
 * (Swap in your own Prac 04a classification by replacing lcBefore / lcAfter.)
 *
 * WHAT THIS SCRIPT DOES:
 *   Asks: has woodland habitat in the Douglas–Daly (an NT agricultural frontier) been lost or broken into smaller,
 *   more isolated pieces between 2017 and 2024? It maps habitat (trees + shrub) from Dynamic World, turns it into
 *   patches, and calculates classic landscape metrics (PLAND, NP, MPS, LPI, ED, core area, isolation) for both years,
 *   plus a moving-window Shannon diversity map for 2024.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) Optional EDIT: SCALE (analysis grain) and EDGE_DEPTH in section 1; RADIUS for the Shannon window.
 *   (3) Click Run (patch vectors can take a minute).
 *   (4) Read the metrics and patch-size chart in the Console (right panel), turn layers on/off in the Map's Layers
 *       list, and start the two exports in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   Map layers: land cover 2017 and 2024; habitat 2024; core habitat; habitat edge; distance to nearest habitat;
 *   Shannon diversity; habitat lost 2017→2024 (red).
 *   Console: a dictionary of landscape metrics for each year, and a histogram of 2024 patch sizes (ha, log scale).
 *
 * DATA:
 *   GOOGLE/DYNAMICWORLD/V1 — Dynamic World near-real-time land cover from Sentinel-2, 10 m, 2015–present;
 *     the most common ('mode') label over May–Sep 2017 and May–Sep 2024 is used. Analysed at SCALE (default 30 m).
 *
 * LINKS:
 *   Prac page: pracs/prac04-land-cover-mapping-and-landscape-metrics.md
 *   Assessment: Prac 04; AT4 Part 1; training points reused for AT1.
 *
 * KEY GEE IDEAS:
 *   - Projections and scale: reproject() fixes the analysis grain, so metrics change when SCALE changes.
 *   - Raster to vector: reduceToVectors() turns connected habitat pixels into patch polygons.
 *   - Neighbourhood operations: focalMin, fastDistanceTransform and reduceNeighborhood look at surrounding pixels.
 *   - Server-side dictionaries (ee.Dictionary) and aggregate_* functions summarise a FeatureCollection.
 *
 * Q = core (ENV306 and ENV506).  EXT = ENV506 extension.
 ****/

// ---------- 1 Study area & parameters ----------
// A ~44 × 44 km box in the Douglas–Daly region, and the two settings that control the metrics.
var aoi = ee.Geometry.Rectangle([131.05, -14.05, 131.45, -13.65]);   // [west, south, east, north]
// EDIT (optional): analysis grain and edge depth.
var SCALE = 30;              // analysis grain (m). Re-run at 10, 30, 90 — metrics are scale-dependent.
var EDGE_DEPTH = 100;        // m; edge-effect distance used for core area
Map.centerObject(aoi, 11);

// ---------- 2 Data ----------
// Dynamic World gives a land-cover label for every clear Sentinel-2 image. The dry-season mode (most frequent label
// May–Sep) gives one stable map per year and avoids wet-season cloud and flooding.
function dryMode(year) {
  return ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1').filterBounds(aoi)
    .filterDate(year + '-05-01', year + '-09-30').select('label').mode().clip(aoi);   // mode = most common class per pixel
}
// DW classes: 0 water 1 trees 2 grass 3 flooded veg 4 crops 5 shrub 6 built 7 bare 8 snow
var lcBefore = dryMode(2017), lcAfter = dryMode(2024);
// official DW colours, classes 0–8
var dwPal = ['#419bdf', '#397d49', '#88b053', '#7a87c6', '#e49635', '#dfc35a', '#c4281b', '#a59b8f', '#b39fe1'];
Map.addLayer(lcBefore, {min: 0, max: 8, palette: dwPal}, 'Land cover 2017 (DW dry-season mode)', false);
Map.addLayer(lcAfter, {min: 0, max: 8, palette: dwPal}, 'Land cover 2024 (DW dry-season mode)');

// Habitat = trees (class 1) + shrub (5); everything else = matrix
// Returns a 1/0 image: 1 = habitat, 0 = matrix (the non-habitat surroundings in the patch–corridor–matrix model).
function habitat(lc) { return lc.eq(1).or(lc.eq(5)).rename('habitat'); }

// ---------- 3 Metrics ----------
// metrics() computes all landscape metrics for one land-cover map and returns them with the layers used to make them.
// EPSG:32752 = WGS 84 / UTM zone 52S, a metric projection; atScale(SCALE) sets the pixel size in metres.
var proj = ee.Projection('EPSG:32752').atScale(SCALE);
function metrics(lc, label) {
  var hab = habitat(lc).reproject(proj);   // force the analysis onto the SCALE grid (nearest-neighbour resampling)
  var pixA = ee.Image.pixelArea();   // area of each pixel in m²

  // Patches as vectors (8-neighbour rule)
  // selfMask() hides matrix (0) pixels so only habitat becomes polygons. eightConnected: true joins pixels that touch
  // diagonally into one patch. maxPixels and tileScale give GEE enough room for a large job.
  var patches = hab.selfMask().reduceToVectors({geometry: aoi, crs: proj, geometryType: 'polygon',
    eightConnected: true, maxPixels: 1e10, tileScale: 4});
  // Add patch area (ha) and perimeter (m) to every patch. The 1 is the allowed error in metres for the calculation.
  patches = patches.map(function(f) {
    return f.set({area_ha: f.area(1).divide(1e4), perim_m: f.perimeter(1)});   // m² ÷ 1e4 = ha
  });
  var totalHa = ee.Number(aoi.area(1)).divide(1e4);   // whole landscape (ha)
  var habHa = ee.Number(patches.aggregate_sum('area_ha'));   // total habitat (ha)

  // Edge = habitat pixels with a matrix neighbour; core = habitat further than EDGE_DEPTH from matrix
  // focalMin over a 1-pixel radius is 0 if any neighbour is matrix; .not() flips that to 1 = "touches matrix".
  var edge = hab.and(hab.focalMin({radius: 1, units: 'pixels'}).not());
  // fastDistanceTransform returns SQUARED distance in pixels to the nearest non-zero pixel (here: matrix),
  // searching up to 256 pixels; sqrt() then × SCALE converts it to metres.
  var dist = hab.not().fastDistanceTransform(256).sqrt().multiply(SCALE);   // m to nearest matrix pixel
  var core = hab.and(dist.gt(EDGE_DEPTH));
  // Sum pixel areas inside core habitat. Positional arguments: reducer, geometry, scale, crs, crsTransform (null),
  // bestEffort (false), maxPixels (1e10). 'area' is the band name from pixelArea(); ÷ 1e4 = ha.
  var coreHa = pixA.updateMask(core).reduceRegion(ee.Reducer.sum(), aoi, SCALE, proj, null, false, 1e10).getNumber('area').divide(1e4);
  // Isolation: distance from each matrix pixel to nearest habitat
  // Search radius 512 pixels (about 15 km at 30 m); masked to matrix pixels only.
  var isolation = hab.fastDistanceTransform(512).sqrt().multiply(SCALE).updateMask(hab.not());

  // The metrics. Units are in each key name: _pct = %, _ha = hectares, _m = metres.
  var stats = ee.Dictionary({
    label: label,
    PLAND_pct: habHa.divide(totalHa).multiply(100),   // percentage of landscape that is habitat
    NP_patches: patches.size(),   // number of patches
    MPS_ha: habHa.divide(patches.size()),   // mean patch size
    // largest patch index: biggest patch as % of landscape
    LPI_pct: ee.Number(patches.aggregate_max('area_ha')).divide(totalHa).multiply(100),
    // Edge density: total patch perimeter per hectare of landscape (includes patch edges cut by the study-area boundary)
    ED_m_per_ha: ee.Number(patches.aggregate_sum('perim_m')).divide(totalHa),
    CORE_pct_of_habitat: coreHa.divide(habHa).multiply(100),   // share of habitat more than EDGE_DEPTH from the matrix
    // mean distance from matrix to habitat
    mean_isolation_m: isolation.reduceRegion(ee.Reducer.mean(), aoi, SCALE, proj, null, false, 1e10).values().get(0)
  });
  // a client-side object holding server-side results
  return {stats: stats, patches: patches, edge: edge, core: core, isolation: isolation, hab: hab};
}

var m1 = metrics(lcBefore, '2017');
var m2 = metrics(lcAfter, '2024');
print('Landscape metrics 2017', m1.stats);   // compare these two dictionaries key by key
print('Landscape metrics 2024', m2.stats);

// Patch size distribution
// Histogram of 2024 patch areas in up to 30 bins. The log vertical axis lets the few large patches show next to many tiny ones.
print(ui.Chart.feature.histogram(m2.patches, 'area_ha', 30)
  .setOptions({title: 'Patch size distribution 2024 (ha)', hAxis: {title: 'Patch area (ha)'}, vAxis: {scaleType: 'log'}}));

// ---------- Landscape heterogeneity: moving-window Shannon diversity ----------
// For each pixel, the share of each class within a RADIUS circle, then H = −Σ p·ln(p).
// H = 0 where one class fills the window; higher H = a more mixed landscape (maximum ln 7 ≈ 1.95 for 7 classes).
// EDIT (optional): window radius.
var RADIUS = 300;   // m
function shannon(lc) {
  var classes = [0, 1, 2, 4, 5, 6, 7];   // DW classes used (flooded veg 3 and snow 8 left out)
  var H = ee.Image(0);
  classes.forEach(function(c) {   // client-side loop: adds one term per class to H
    var p = lc.eq(c).reduceNeighborhood({reducer: ee.Reducer.mean(),   // mean of a 1/0 image = proportion of class c
      kernel: ee.Kernel.circle({radius: RADIUS, units: 'meters'})});
    H = H.subtract(p.multiply(p.max(1e-6).log()));   // max(1e-6) avoids log(0); where p = 0 the term is still 0
  });
  return H.rename('shannon');
}
var H2024 = shannon(lcAfter.reproject(proj));   // computed on the SCALE grid

// ---------- 5 Visualise ----------
// Layers for 2024 (and habitat lost since 2017). Layers with 'false' start off — tick them in Layers.
// selfMask() hides 0 pixels so only the feature of interest is coloured.
Map.addLayer(m2.hab.selfMask(), {palette: '#1b7837'}, 'Habitat 2024');
Map.addLayer(m2.core.selfMask(), {palette: '#00441b'}, 'Core habitat 2024 (> ' + EDGE_DEPTH + ' m from edge)', false);
Map.addLayer(m2.edge.selfMask(), {palette: '#ff7f00'}, 'Habitat edge 2024', false);
Map.addLayer(m2.isolation, {min: 0, max: 2000, palette: ['#ffffcc', '#fd8d3c', '#800026']}, 'Distance to nearest habitat (m)', false);
Map.addLayer(H2024, {min: 0, max: 1.5, palette: ['#f7fcfd', '#8c96c6', '#4d004b']}, 'Shannon diversity (' + RADIUS + ' m window)', false);
var lost = m1.hab.and(m2.hab.not()).selfMask();   // habitat in 2017 but not in 2024
Map.addLayer(lost, {palette: 'red'}, 'Habitat lost 2017→2024');

// ---------- 6 Export ----------
// Two tasks to start in the Tasks tab, both to the GEE_NT folder in Google Drive:
// a CSV (the default format) with one row of metrics per year, and a shapefile of the 2024 patches with area and perimeter.
Export.table.toDrive({collection: ee.FeatureCollection([ee.Feature(null, m1.stats), ee.Feature(null, m2.stats)]),
  description: 'Prac04b_landscape_metrics', folder: 'GEE_NT'});
Export.table.toDrive({collection: m2.patches, description: 'Prac04b_patches_2024', folder: 'GEE_NT', fileFormat: 'SHP'});

// Q: How did PLAND, NP, MPS, LPI, ED and core area change from 2017 to 2024? Is this fragmentation, habitat loss, or both?
// Q: Re-run with SCALE = 10 and 90. Which metrics are most scale-sensitive? Relate this to grain and extent.
// Q: Why does EDGE_DEPTH matter for a species such as a hollow-dependent woodland bird?
// EXT: Add two more metrics in the Code Editor — perimeter–area ratio per patch and an area-weighted shape index
//      (perimeter / (2·√(π·area))) — and interpret them for habitat edge effects.
// EXT: Dynamic World is probabilistic. Use the 'trees' probability band with thresholds 0.4/0.5/0.6 and quantify how much the metrics depend on classification choices.
// EXT: Write a 300-word briefing for an NT land-clearing assessment officer explaining which metrics they should report, and why.
```

</details>

---

[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 03](prac03-climate-and-hydrology-drivers-rainfall-anomalies-drought-indices-lst-and-et.md) · [Prac 05 →](prac05-change-detection-bi-temporal-transitions-landtrendr-and-ccdc.md)
