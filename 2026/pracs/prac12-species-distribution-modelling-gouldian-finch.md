[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 11](prac11-lidar-gedi-canopy-structure-and-optical-sar-lidar-fusion.md) · [Prac 13 →](prac13-geospatial-foundation-models-validating-alphaearth.md)

# Prac 12: Species distribution modelling: Gouldian finch

**When:** Wed 11 Nov 2026, Sessions 2–3 (article review 3 on species–landscape relationships in Session 1; poster making in Session 4; posters presented Thu 12 Nov, Session 1) · **Script:** [`prac12_species_distribution_model.js`](../scripts/prac12_species_distribution_model.js) · **ULOs:** 1, 3, 4

**Also available in:** Python [`prac12_species_distribution_model.py`](../alternatives/python/prac12_species_distribution_model.py) · R [`prac12_species_distribution_model.R`](../alternatives/r/prac12_species_distribution_model.R) · QGIS [recipe](../alternatives/qgis/README.md). The Code Editor remains the main environment.

**Purpose.** Model habitat suitability with predictors from earlier pracs (climate from Prac 03, tree cover and canopy height from Pracs 04 and 11, fire from Prac 07, water from Prac 08), then test it with spatial cross-validation and model comparison.

## 1. Concept notes

**Species distribution models (SDMs)** relate where a species occurs to environmental predictors, then predict **relative habitat suitability** across a landscape. They link landscape pattern to species and are used in threatened-species planning, reserve design and impact assessment.

| Component | In this prac |
| --- | --- |
| Response | Presence records from the Atlas of Living Australia (ALA), with **background** points instead of true absences |
| Predictors | Climate (WorldClim), terrain, NDVI (mean and dry season), MODIS tree cover, fire frequency, late-fire frequency, distance to permanent water |
| Algorithms | Random Forest (probability) and Maxent (`ee.Classifier.amnhMaxent`) |
| Evaluation | ROC curve and AUC on held-out data, random vs **spatial-block** cross-validation; variable importance |

**Gouldian finch** (*Erythrura gouldiae*) is a threatened granivore of tropical savanna. It depends on seeding grasses, hollow-bearing eucalypts for nesting, and daily access to surface water. Frequent late dry season fires and grazing reduce its food, so fire-regime predictors are ecologically relevant.

**Pitfalls.**

- **Sampling bias:** records cluster near roads and towns. Thin the records, and consider a target-group background.
- **Spatial autocorrelation:** random cross-validation inflates AUC, so use spatial blocks (Roberts et al., 2017).
- **Presence-background output:** the model gives *relative* suitability, not probability of occurrence.
- **Equilibrium:** the model assumes the species occupies all suitable habitat.
- **Transferability:** predictions to new times or places are risky.

## 2. Practical activities

**Activity 12.1 – Build and fit the model (Session 2).**

1. Download Gouldian finch records from [ala.org.au](https://www.ala.org.au) (2000 onwards, coordinate uncertainty under 1 km), and upload them via **Assets → NEW → CSV**. Edit `OCC_ASSET`.
2. Build the 12-band predictor stack at 1 km (EPSG:3577), and justify each predictor ecologically.
3. Thin presences to one per cell, draw 5,000 background points, and split 70/30.
4. Fit RF and Maxent, then compare ROC curves, AUC, variable importance and the maps.

**Activity 12.2 – Validation and model comparison (Session 3).**

1. Replace the random split with 50 km spatial blocks, and record how much AUC drops.
2. Report the mean suitability of your Daly tile, and the share of it above 0.5.
3. **Group poster:** each group changes one element and reports its effect:
   - **A:** spatial blocks vs random split.
   - **B:** target-group background.
   - **C:** predictor set without fire.
   - **D:** Maxent feature types.

**Key code** (an excerpt from [`prac12_species_distribution_model.js`](../scripts/prac12_species_distribution_model.js); run the full script for the complete workflow):

```javascript
// Presence–background models: Random Forest (probability) and Maxent
// (train holds presences pa = 1 and background points pa = 0, sampled from predictors)
var rf = ee.Classifier.smileRandomForest({numberOfTrees: 500, minLeafPopulation: 5, seed: 1})
  .setOutputMode('PROBABILITY').train(train, 'pa', bands);
var maxent = ee.Classifier.amnhMaxent({autoFeature: true, seed: 1}).train(train, 'pa', bands);
var suitRF = predictors.classify(rf).rename('suitability_RF');
var suitMX = predictors.classify(maxent).select('probability').rename('suitability_Maxent');
Map.addLayer(suitRF, {min: 0, max: 1, palette: ['#f7fcf5', '#74c476', '#00441b']}, 'Suitability (RF)');
```

## 3. Challenge questions (knowledge check)

**Core**

1. Why do SDMs use background points rather than absences with ALA data?
2. Which predictors matter most? Does that fit Gouldian finch ecology (fire, seeding grasses, water, hollows)?
3. Why does AUC drop with spatial blocks, and which estimate should a manager trust?
4. Where do RF and Maxent disagree, and why might the models over-predict near towns?
5. How could NT fire managers use the map, and what must they be told about its limits?

**Extension (ENV506)**

1. Correct sampling bias with a target-group background (other ALA savanna bird records), and compare the maps.
2. Add GEDI canopy height (Prac 11) as a proxy for hollow-bearing trees. Does it improve the model?
3. Project the model under +1.5 °C, and critique SDM transferability.

## 4. Link to summative assessment

- **AT4 elective (a), habitat suitability:** model your assigned species in the Daly River Catchment with spatial-block cross-validation, and test the effect of the clearing you mapped in Part 2.
- The poster Q&A is practice for the AT4 viva.

## 5. Reading

- Crego, R. D., Stabach, J. A., & Connette, G. (2022). Implementation of species distribution models in Google Earth Engine. *Diversity and Distributions, 28*(5), 904–916. https://doi.org/10.1111/ddi.13491
- Valavi, R., Guillera-Arroita, G., Lahoz-Monfort, J. J., & Elith, J. (2022). Predictive performance of presence-only species distribution models: A benchmark study with reproducible code. *Ecological Monographs, 92*(1), e01486. https://doi.org/10.1002/ecm.1486
- Elith, J., et al. (2011). A statistical explanation of MaxEnt for ecologists. *Diversity and Distributions, 17*, 43–57. https://doi.org/10.1111/j.1472-4642.2010.00725.x
- Roberts, D. R., et al. (2017). Cross-validation strategies for data with temporal, spatial, hierarchical, or phylogenetic structure. *Ecography, 40*, 913–929. https://doi.org/10.1111/ecog.02881
- Phillips, S. J., Anderson, R. P., & Schapire, R. E. (2006). Maximum entropy modeling of species geographic distributions. *Ecological Modelling, 190*, 231–259. https://doi.org/10.1016/j.ecolmodel.2005.03.026

## Full scripts

Each script is copied here from [`scripts/`](../scripts) so this page has everything in one place. The `.js` file is the master copy: if the two ever differ, use the file. Click a heading to open the script, then use the copy button and paste it into a new script in the Code Editor.

<details>
<summary><strong>prac12_species_distribution_model.js</strong> (257 lines)</summary>

```javascript
/**** Prac 12 — Habitat suitability / species distribution model: Gouldian finch (Erythrura gouldiae), NT
 * Presence data: Atlas of Living Australia (ala.org.au) → download occurrences (CSV), keep
 *   decimalLatitude, decimalLongitude, eventDate; filter to records since 2000 with coordinate uncertainty < 1 km.
 *   Upload to GEE: Assets → New → CSV → set X/Y columns → asset path below.
 * Models: Random Forest (probability) and Maxent (ee.Classifier.amnhMaxent) with background points.
 *
 * WHAT THIS SCRIPT DOES:
 *   Asks: where in the NT is habitat suitable for the endangered Gouldian finch?
 *   Links ALA presence records to climate, vegetation, fire and water layers, compares them with random background
 *   points, and fits two models (Random Forest and Maxent). It maps suitability (0–1) and tests the models with
 *   a random split and with spatial-block cross-validation.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) Prepare and upload the presence data, then EDIT OCC_ASSET (section 2):
 *       a. Download Gouldian finch occurrences from ALA as CSV and filter them as described above.
 *       b. Code Editor → Assets tab → NEW → "CSV file (.csv)". In the upload dialog set the X column to
 *          decimalLongitude and the Y column to decimalLatitude, so each row becomes a point.
 *       c. Wait for the upload to finish in the Tasks tab, click the asset and copy its ID
 *          (e.g. projects/my-project/assets/gouldian_finch_ALA). Paste it between the quotes of OCC_ASSET.
 *   (3) Click Run. The cross-validation in 4c trains five extra models, so allow a few minutes.
 *   (4) Read the Console (record counts, AUC values, ROC curves, block CV table, variable importance),
 *       turn layers on/off in the Map's Layers list, and start the export in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   Map: Suitability — Random Forest; Suitability — Maxent (off); thinned presences (red);
 *   presences with their fold number (4c, off; click with the Inspector to see 'fold').
 *   Console: raw and thinned presence counts; test AUC and ROC curve for RF and Maxent; spatial-block AUC per fold
 *   and its mean; RF variable importance bar chart.
 *
 * DATA:
 *   - Your uploaded asset: Gouldian finch presences from the Atlas of Living Australia (points, since 2000).
 *   - FAO/GAUL/2015/level1 — state boundaries (NT outline).
 *   - WORLDCLIM/V1/BIO — WorldClim bioclimatic variables, ~1 km, 1960–1990 climate averages.
 *   - NASA/NASADEM_HGT/001 — NASADEM elevation, 30 m.
 *   - MODIS/061/MOD13A3 — MODIS monthly NDVI, 1 km, 2015–2024.
 *   - MODIS/061/MOD44B — MODIS yearly percent tree cover, 250 m, 2015–2024.
 *   - MODIS/061/MCD64A1 — MODIS monthly burned area (BurnDate), 500 m, 2005–2024.
 *   - JRC/GSW1_4/GlobalSurfaceWater ('occurrence') — 30 m, 1984–2021.
 *   All predictors are resampled to 1 km (SCALE) in EPSG:3577.
 *
 * LINKS: pracs/prac12-species-distribution-modelling-gouldian-finch.md
 *   Feeds Prac 12 and AT4 elective (a).
 *
 * KEY GEE IDEAS:
 *   - Building a multi-band predictor stack and fixing its projection and scale (reproject).
 *   - sampleRegions (values at points) vs sample (values at random pixels); distinct() to thin points.
 *   - Classifiers in PROBABILITY mode (Random Forest, Maxent) and classify() for maps and tables.
 *   - Server-side lists, arrays and map() to compute ROC curves and AUC.
 *
 * Q = core (ENV306 and ENV506). EXT = ENV506 extension.
 ****/

// ---------- 1 Study area ----------
// The NT boundary is the modelling region. SCALE (metres) is the pixel size for every predictor and sample.
var nt = ee.FeatureCollection('FAO/GAUL/2015/level1').filter(ee.Filter.eq('ADM1_NAME', 'Northern Territory'));
var region = nt.geometry();
Map.centerObject(nt, 5);
var SCALE = 1000;   // 1 km: matches the coarsest predictors (WorldClim, MODIS NDVI) and the ALA location accuracy (< 1 km)

// ---------- 2 Data: occurrences ----------
// PRESENCE points = places where the finch was recorded. Only records inside the NT are kept.
// EDIT OCC_ASSET: paste your own asset ID (see HOW TO USE IT step 2).
var OCC_ASSET = 'projects/YOUR_PROJECT/assets/gouldian_finch_ALA';   // <-- change
var occ = ee.FeatureCollection(OCC_ASSET).filterBounds(region);
print('Raw presence records', occ.size());

// ---------- 2b Predictors ----------
// Environmental layers that may limit where the finch can live: climate, terrain, greenness, tree cover, fire and water.
// Each becomes one band of the predictor stack below.
var bio = ee.Image('WORLDCLIM/V1/BIO');
var dem = ee.Image('NASA/NASADEM_HGT/001').select('elevation');
// MODIS NDVI is stored as integers; × 0.0001 is the scale factor that gives NDVI (unitless, −1 to 1).
var ndviMean = ee.ImageCollection('MODIS/061/MOD13A3').filterDate('2015-01-01', '2025-01-01').select('NDVI').mean().multiply(0.0001);
// Late dry-season (Aug–Oct) greenness: shows where vegetation stays green when food and water are scarce.
var ndviDry = ee.ImageCollection('MODIS/061/MOD13A3').filterDate('2015-01-01', '2025-01-01')
  .filter(ee.Filter.calendarRange(8, 10, 'month')).select('NDVI').mean().multiply(0.0001);
// Mean percent tree cover (0–100 %) over 2015–2024: hollow-bearing trees are needed for nesting.
var treeCover = ee.ImageCollection('MODIS/061/MOD44B').filterDate('2015-01-01', '2024-12-31').select('Percent_Tree_Cover').mean();
// Fire frequency: for each year 2005–2024, BurnDate (day of year burnt; 0 = not burnt) > 0 means burnt that year.
// unmask(0) treats missing as unburnt. sum() over the 20 yearly 1/0 images = number of years burnt.
var fires = ee.ImageCollection.fromImages(ee.List.sequence(2005, 2024).map(function(y) {
  return ee.ImageCollection('MODIS/061/MCD64A1').filter(ee.Filter.calendarRange(y, y, 'year'))
    .select('BurnDate').max().gt(0).unmask(0);
})).sum();
// Late-season fires: latest burn day ≥ 213 (about 1 August) — hotter, more destructive fires. Counts years with one.
var lateFires = ee.ImageCollection.fromImages(ee.List.sequence(2005, 2024).map(function(y) {
  return ee.ImageCollection('MODIS/061/MCD64A1').filter(ee.Filter.calendarRange(y, y, 'year'))
    .select('BurnDate').max().gte(213).unmask(0);
})).sum();
// Water: pixels with water in > 50 % of JRC observations (a starting value — test others). Finches drink daily.
var water = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('occurrence').gt(50).unmask(0);
// fastDistanceTransform gives SQUARED distance in pixels (searching up to 500 pixels). sqrt() → pixels;
// × pixel side length (sqrt of pixel area, m) → metres. reproject fixes the grid (EPSG:3577 at 250 m) so the
// result doesn't change with the map zoom level.
var distWater = water.fastDistanceTransform(500, 'pixels').sqrt().multiply(ee.Image.pixelArea().sqrt())
  .reproject({crs: 'EPSG:3577', scale: 250});

// Stack all predictors into one image and give each band a clear name.
// WorldClim stores temperature as °C × 10, so ÷ 10 gives °C. bio12 = annual rainfall (mm); bio15 = rainfall
// seasonality (coefficient of variation, %).
// EPSG:3577 = GDA94 / Australian Albers, an equal-area projection in metres — every 1 km pixel has the same area.
var predictors = ee.Image.cat([
  bio.select('bio01').divide(10).rename('temp_mean'),
  bio.select('bio05').divide(10).rename('temp_max_warm'),
  bio.select('bio12').rename('rain_annual'),
  bio.select('bio15').rename('rain_seasonality'),
  dem.rename('elevation'),
  ee.Terrain.slope(dem).rename('slope'),
  ndviMean.rename('ndvi_mean'), ndviDry.rename('ndvi_dry'),
  treeCover.rename('tree_cover'),
  fires.rename('fire_freq'), lateFires.rename('late_fire_freq'),
  distWater.rename('dist_water_m')
]).clip(region).reproject({crs: 'EPSG:3577', scale: SCALE});
var bands = predictors.bandNames();   // server-side list of the 12 predictor names

// Q: Justify each predictor ecologically for a granivorous savanna finch that nests in tree hollows and drinks daily.

// ---------- 3 Presence & background ----------
// PRESENCE (pa = 1): where the finch WAS recorded. BACKGROUND (pa = 0): random points across the NT that describe
// the environments available. Background points are NOT absences — the finch may live there unrecorded. So the model
// learns how presence sites differ from the NT in general, and its output is relative suitability, not true probability.
// Thin presences to one per predictor pixel (reduces sampling bias / pseudo-replication)
// Why thin: ALA records cluster near roads, towns and popular birding sites, and many records repeat the same spot.
// Without thinning, those places dominate the model and test points sit on top of training points.
// sampleRegions: read the predictor values at every presence point and tag it pa = 1. Points with any masked
// predictor are dropped. geometries: true keeps the point locations (needed for thinning and block CV).
var presence = predictors.sampleRegions({collection: occ.map(function(f) { return f.set('pa', 1); }),
  properties: ['pa'], scale: SCALE, geometries: true, tileScale: 4});
// Give each point a grid-cell ID from its Albers x and y (metres ÷ 1000, rounded down), e.g. "123_-1456".
// transform('EPSG:3577', 1): convert the point to Albers metres (1 m allowed error).
presence = presence.map(function(f) {
  var c = f.geometry().transform('EPSG:3577', 1).coordinates();
  return f.set('cell', ee.Number(c.get(0)).divide(SCALE).floor().int().format('%d')
    .cat('_').cat(ee.Number(c.get(1)).divide(SCALE).floor().int().format('%d')));
}).distinct('cell');   // keep one presence per 1 km cell
print('Thinned presences', presence.size());

// Background: up to 10,000 random 1 km pixels across the NT (seed 11 = repeatable), keep 5,000, tag pa = 0.
var background = predictors.sample({region: region, scale: SCALE, numPixels: 10000, seed: 11, geometries: true, tileScale: 4})
  .limit(5000).map(function(f) { return f.set('pa', 0); });

// Merge presences and background, add a random number 0–1 (seed 5), and split 70 % train / 30 % test.
var data = presence.merge(background).randomColumn('rand', 5);
var train = data.filter(ee.Filter.lt('rand', 0.7));
var test = data.filter(ee.Filter.gte('rand', 0.7));

// ---------- 4 Models ----------
// Two common SDM methods trained on the same data: Random Forest (many decision trees) and Maxent.
// RF: 500 trees; minLeafPopulation: 5 limits overfitting; PROBABILITY mode outputs the share of trees voting presence (0–1).
var rf = ee.Classifier.smileRandomForest({numberOfTrees: 500, minLeafPopulation: 5, seed: 1})
  .setOutputMode('PROBABILITY').train(train, 'pa', bands);
// Maxent: designed for presence-background data. autoFeature lets it choose response shapes (linear, quadratic, etc.).
var maxent = ee.Classifier.amnhMaxent({autoFeature: true, seed: 1})
  .train(train, 'pa', bands);   // outputs a 'probability' band (cloglog by default)

// classify() applies each model to every pixel of the predictor stack → suitability maps (0–1).
var suitRF = predictors.classify(rf).rename('suitability_RF');
var suitMX = predictors.classify(maxent).select('probability').rename('suitability_Maxent');

// ---------- 4b Evaluation: ROC / AUC on the test set ----------
// ROC curve: for thresholds 0, 0.02 … 1, the true positive rate (test presences scored ≥ threshold) vs the false
// positive rate (test background scored ≥ threshold). AUC = area under that curve: 0.5 = no better than random,
// 1 = perfect. With background points (not absences) the best possible AUC is below 1.
function auc(classifier, name, outBand) {
  var scored = test.classify(classifier, 'score');   // RF: the probability goes into property 'score'
  // Maxent writes its result to 'probability', so copy that into 'score' instead.
  if (outBand) { scored = test.classify(classifier).map(function(f) { return f.set('score', f.get(outBand)); }); }
  var pos = scored.filter(ee.Filter.eq('pa', 1)), neg = scored.filter(ee.Filter.eq('pa', 0));
  var nPos = pos.size(), nNeg = neg.size();
  var thresholds = ee.List.sequence(0, 1, 0.02);
  var roc = ee.FeatureCollection(thresholds.map(function(t) {
    var tpr = pos.filter(ee.Filter.gte('score', t)).size().divide(nPos);   // sensitivity
    var fpr = neg.filter(ee.Filter.gte('score', t)).size().divide(nNeg);   // 1 − specificity
    return ee.Feature(null, {threshold: t, TPR: tpr, FPR: fpr});
  })).sort('FPR');
  // Trapezoid rule: AUC = sum of (step in FPR) × (average TPR of the two neighbouring points).
  var fprL = ee.Array(roc.aggregate_array('FPR')), tprL = ee.Array(roc.aggregate_array('TPR'));
  var n = fprL.length().get([0]);   // number of ROC points
  var dx = fprL.slice(0, 1).subtract(fprL.slice(0, 0, n.subtract(1)));   // FPR[i+1] − FPR[i]
  var yAvg = tprL.slice(0, 1).add(tprL.slice(0, 0, n.subtract(1))).divide(2);   // (TPR[i+1] + TPR[i]) / 2
  var aucVal = dx.multiply(yAvg).reduce('sum', [0]).get([0]);
  print(name + ' test AUC', aucVal);
  print(ui.Chart.feature.byFeature(roc, 'FPR', 'TPR').setOptions({title: name + ' ROC curve',
    hAxis: {title: 'False positive rate'}, vAxis: {title: 'True positive rate'}, pointSize: 2}));
  return roc;
}
auc(rf, 'Random Forest');
auc(maxent, 'Maxent', 'probability');

// ---------- 4c Spatial block cross-validation (50 km blocks, 5 folds) ----------
// Random splits put test points next to training points, so AUC is optimistic. Hold out whole blocks instead.
// Nearby points have similar environments (spatial autocorrelation). In a random split the model is tested on points
// almost identical to ones it trained on, so it looks better than it is. Holding out whole 50 km blocks forces it
// to predict into new areas — a harder, more honest test, so expect a LOWER AUC than in 4b.
var BLOCK = 50000;   // metres
var FOLDS = 5;   // each block is assigned to one of 5 folds; each fold is held out once
// Assign every point (presence and background) to a 50 km block from its Albers coordinates, then to a fold.
// (7·bx + 13·by) mod 5 is a simple rule that scatters neighbouring blocks across different folds; abs() avoids
// negative fold numbers from negative coordinates.
var blocked = data.map(function(f) {
  var c = f.geometry().transform('EPSG:3577', 1).coordinates();
  var bx = ee.Number(c.get(0)).divide(BLOCK).floor();   // block column
  var by = ee.Number(c.get(1)).divide(BLOCK).floor();   // block row
  return f.set('fold', bx.multiply(7).add(by.multiply(13)).mod(FOLDS).abs().int());
});
// aucValue(): the same ROC/AUC calculation as in 4b, returning just the AUC number.
function aucValue(scored) {   // scored needs 'pa' and 'score'
  var pos = scored.filter(ee.Filter.eq('pa', 1)), neg = scored.filter(ee.Filter.eq('pa', 0));
  var roc = ee.FeatureCollection(ee.List.sequence(0, 1, 0.02).map(function(t) {
    return ee.Feature(null, {TPR: pos.filter(ee.Filter.gte('score', t)).size().divide(pos.size()),
                             FPR: neg.filter(ee.Filter.gte('score', t)).size().divide(neg.size())});
  })).sort('FPR');
  var x = ee.Array(roc.aggregate_array('FPR')), y = ee.Array(roc.aggregate_array('TPR'));
  var n = x.length().get([0]);
  return x.slice(0, 1).subtract(x.slice(0, 0, n.subtract(1)))
    .multiply(y.slice(0, 1).add(y.slice(0, 0, n.subtract(1))).divide(2)).reduce('sum', [0]).get([0]);
}
// For each fold k: train RF on all other folds, test on fold k. 200 trees (fewer than in 4) to keep it faster.
// n_test_presences shows how many presences each fold holds — a fold with very few gives an unstable AUC.
var cv = ee.FeatureCollection(ee.List.sequence(0, FOLDS - 1).map(function(k) {
  var tr = blocked.filter(ee.Filter.neq('fold', k)), te = blocked.filter(ee.Filter.eq('fold', k));
  var m = ee.Classifier.smileRandomForest({numberOfTrees: 200, minLeafPopulation: 5, seed: 1})
    .setOutputMode('PROBABILITY').train(tr, 'pa', bands);
  return ee.Feature(null, {fold: k, n_test_presences: te.filter(ee.Filter.eq('pa', 1)).size(),
    AUC_spatial: aucValue(te.classify(m, 'score'))});
}));
print('4c: Spatial-block CV (RF) per fold', cv);
print('4c: Mean spatial-block AUC (compare with the random-split AUC above)', cv.aggregate_mean('AUC_spatial'));
Map.addLayer(blocked.filter(ee.Filter.eq('pa', 1)).style({color: 'black', pointSize: 3}), {}, '4c: Presences (inspect fold property)', false);

// Variable importance from the main RF model: how much each predictor contributed to its splits (larger = more).
// explain() returns a dictionary; its 'importance' entry maps band name → importance score.
var imp = ee.Dictionary(rf.explain().get('importance'));
print(ui.Chart.array.values(imp.values(), 0, imp.keys()).setChartType('BarChart')
  .setOptions({title: 'RF variable importance', legend: {position: 'none'}}));

// ---------- 5 Visualise ----------
// Suitability 0 (pale) to 1 (dark green). Compare the two models by switching layers on and off.
var vis = {min: 0, max: 1, palette: ['#f7fcf5', '#c7e9c0', '#74c476', '#238b45', '#00441b']};
Map.addLayer(suitMX, vis, 'Suitability — Maxent', false);
Map.addLayer(suitRF, vis, 'Suitability — Random Forest');
Map.addLayer(presence, {color: 'red'}, 'Presences (thinned)');

// ---------- 6 Export ----------
// Save both suitability maps as one 2-band GeoTIFF to Google Drive (start it in the Tasks tab).
// region.bounds() = the NT's bounding rectangle (simpler than the coastline); scale: 1 km; crs: Australian Albers.
Export.image.toDrive({image: suitRF.addBands(suitMX).float(), description: 'Prac12_GouldianFinch_suitability',
  folder: 'GEE_NT', region: region.bounds(), scale: SCALE, crs: 'EPSG:3577', maxPixels: 1e11});

// Q: Which predictors matter most? Does this fit what is known about Gouldian finch ecology (fire, seeding grasses, water, hollows)?
// Q: Where do RF and Maxent disagree? Why might presence-background models over-predict near roads and towns?
// Q: How could land managers use the map (fire management, grazing, clearing approvals)? What must they be told about its limits?
// Q: How much lower is the spatial-block AUC than the random-split AUC? What does the gap tell you about spatial autocorrelation?
// EXT: Vary BLOCK (25, 50, 100 km), relate it to the range of a variogram of the residuals, and add Maxent to the block CV.
// EXT: Correct sampling bias with a target-group background (other ALA bird records) and compare maps.
// EXT: Project the model under a +1.5 °C temperature shift (edit temp layers) and discuss assumptions of SDM transferability.
```

</details>

---

[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 11](prac11-lidar-gedi-canopy-structure-and-optical-sar-lidar-fusion.md) · [Prac 13 →](prac13-geospatial-foundation-models-validating-alphaearth.md)
