/**** Prac 12 — Habitat suitability / species distribution model: Gouldian finch (Erythrura gouldiae), NT
 * Presence data: Atlas of Living Australia (ala.org.au) → download occurrences (CSV), keep
 *   decimalLatitude, decimalLongitude, eventDate; filter to records since 2000 with coordinate uncertainty < 1 km.
 *   Upload to GEE: Assets → New → CSV → set X/Y columns → asset path below.
 * Models: Random Forest (probability) and Maxent (ee.Classifier.amnhMaxent) with background points.
 ****/

// ---------- 1 Study area ----------
var nt = ee.FeatureCollection('FAO/GAUL/2015/level1').filter(ee.Filter.eq('ADM1_NAME', 'Northern Territory'));
var region = nt.geometry();
Map.centerObject(nt, 5);
var SCALE = 1000;

// ---------- 2 Data: occurrences ----------
var OCC_ASSET = 'projects/YOUR_PROJECT/assets/gouldian_finch_ALA';   // <-- change
var occ = ee.FeatureCollection(OCC_ASSET).filterBounds(region);
print('Raw presence records', occ.size());

// ---------- 2b Predictors ----------
var bio = ee.Image('WORLDCLIM/V1/BIO');
var dem = ee.Image('NASA/NASADEM_HGT/001').select('elevation');
var ndviMean = ee.ImageCollection('MODIS/061/MOD13A3').filterDate('2015-01-01', '2025-01-01').select('NDVI').mean().multiply(0.0001);
var ndviDry = ee.ImageCollection('MODIS/061/MOD13A3').filterDate('2015-01-01', '2025-01-01')
  .filter(ee.Filter.calendarRange(8, 10, 'month')).select('NDVI').mean().multiply(0.0001);
var treeCover = ee.ImageCollection('MODIS/061/MOD44B').filterDate('2015-01-01', '2024-12-31').select('Percent_Tree_Cover').mean();
var fires = ee.ImageCollection.fromImages(ee.List.sequence(2005, 2024).map(function(y) {
  return ee.ImageCollection('MODIS/061/MCD64A1').filter(ee.Filter.calendarRange(y, y, 'year'))
    .select('BurnDate').max().gt(0).unmask(0);
})).sum();
var lateFires = ee.ImageCollection.fromImages(ee.List.sequence(2005, 2024).map(function(y) {
  return ee.ImageCollection('MODIS/061/MCD64A1').filter(ee.Filter.calendarRange(y, y, 'year'))
    .select('BurnDate').max().gte(213).unmask(0);
})).sum();
var water = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('occurrence').gt(50).unmask(0);
var distWater = water.fastDistanceTransform(500, 'pixels').sqrt().multiply(ee.Image.pixelArea().sqrt())
  .reproject({crs: 'EPSG:3577', scale: 250});

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
var bands = predictors.bandNames();

// Q: Justify each predictor ecologically for a granivorous savanna finch that nests in tree hollows and drinks daily.

// ---------- 3 Presence & background ----------
// Thin presences to one per predictor pixel (reduces sampling bias / pseudo-replication)
var presence = predictors.sampleRegions({collection: occ.map(function(f) { return f.set('pa', 1); }),
  properties: ['pa'], scale: SCALE, geometries: true, tileScale: 4});
presence = presence.map(function(f) {
  var c = f.geometry().transform('EPSG:3577', 1).coordinates();
  return f.set('cell', ee.Number(c.get(0)).divide(SCALE).floor().int().format('%d')
    .cat('_').cat(ee.Number(c.get(1)).divide(SCALE).floor().int().format('%d')));
}).distinct('cell');
print('Thinned presences', presence.size());

var background = predictors.sample({region: region, scale: SCALE, numPixels: 10000, seed: 11, geometries: true, tileScale: 4})
  .limit(5000).map(function(f) { return f.set('pa', 0); });

var data = presence.merge(background).randomColumn('rand', 5);
var train = data.filter(ee.Filter.lt('rand', 0.7));
var test = data.filter(ee.Filter.gte('rand', 0.7));

// ---------- 4 Models ----------
var rf = ee.Classifier.smileRandomForest({numberOfTrees: 500, minLeafPopulation: 5, seed: 1})
  .setOutputMode('PROBABILITY').train(train, 'pa', bands);
var maxent = ee.Classifier.amnhMaxent({autoFeature: true, seed: 1})
  .train(train, 'pa', bands);   // outputs a 'probability' band (cloglog by default)

var suitRF = predictors.classify(rf).rename('suitability_RF');
var suitMX = predictors.classify(maxent).select('probability').rename('suitability_Maxent');

// ---------- 4b Evaluation: ROC / AUC on the test set ----------
function auc(classifier, name, outBand) {
  var scored = test.classify(classifier, 'score');
  if (outBand) { scored = test.classify(classifier).map(function(f) { return f.set('score', f.get(outBand)); }); }
  var pos = scored.filter(ee.Filter.eq('pa', 1)), neg = scored.filter(ee.Filter.eq('pa', 0));
  var nPos = pos.size(), nNeg = neg.size();
  var thresholds = ee.List.sequence(0, 1, 0.02);
  var roc = ee.FeatureCollection(thresholds.map(function(t) {
    var tpr = pos.filter(ee.Filter.gte('score', t)).size().divide(nPos);
    var fpr = neg.filter(ee.Filter.gte('score', t)).size().divide(nNeg);
    return ee.Feature(null, {threshold: t, TPR: tpr, FPR: fpr});
  })).sort('FPR');
  var fprL = ee.Array(roc.aggregate_array('FPR')), tprL = ee.Array(roc.aggregate_array('TPR'));
  var n = fprL.length().get([0]);
  var dx = fprL.slice(0, 1).subtract(fprL.slice(0, 0, n.subtract(1)));
  var yAvg = tprL.slice(0, 1).add(tprL.slice(0, 0, n.subtract(1))).divide(2);
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
var BLOCK = 50000;   // metres
var FOLDS = 5;
var blocked = data.map(function(f) {
  var c = f.geometry().transform('EPSG:3577', 1).coordinates();
  var bx = ee.Number(c.get(0)).divide(BLOCK).floor();
  var by = ee.Number(c.get(1)).divide(BLOCK).floor();
  return f.set('fold', bx.multiply(7).add(by.multiply(13)).mod(FOLDS).abs().int());
});
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

var imp = ee.Dictionary(rf.explain().get('importance'));
print(ui.Chart.array.values(imp.values(), 0, imp.keys()).setChartType('BarChart')
  .setOptions({title: 'RF variable importance', legend: {position: 'none'}}));

// ---------- 5 Visualise ----------
var vis = {min: 0, max: 1, palette: ['#f7fcf5', '#c7e9c0', '#74c476', '#238b45', '#00441b']};
Map.addLayer(suitMX, vis, 'Suitability — Maxent', false);
Map.addLayer(suitRF, vis, 'Suitability — Random Forest');
Map.addLayer(presence, {color: 'red'}, 'Presences (thinned)');

// ---------- 6 Export ----------
Export.image.toDrive({image: suitRF.addBands(suitMX).float(), description: 'Prac12_GouldianFinch_suitability',
  folder: 'GEE_NT', region: region.bounds(), scale: SCALE, crs: 'EPSG:3577', maxPixels: 1e11});

// Q: Which predictors matter most? Does this fit what is known about Gouldian finch ecology (fire, seeding grasses, water, hollows)?
// Q: Where do RF and Maxent disagree? Why might presence-background models over-predict near roads and towns?
// Q: How could land managers use the map (fire management, grazing, clearing approvals)? What must they be told about its limits?
// Q: How much lower is the spatial-block AUC than the random-split AUC? What does the gap tell you about spatial autocorrelation?
// EXT: Vary BLOCK (25, 50, 100 km), relate it to the range of a variogram of the residuals, and add Maxent to the block CV.
// EXT: Correct sampling bias with a target-group background (other ALA bird records) and compare maps.
// EXT: Project the model under a +1.5 °C temperature shift (edit temp layers) and discuss assumptions of SDM transferability.
