/**** Prac 05b — Change detection: LandTrendr and CCDC (Douglas–Daly, NT)
 * LandTrendr: annual composites → piecewise-linear segments (Kennedy et al. 2010, 2018).
 * CCDC: all clear observations → harmonic models + breaks (Zhu & Woodcock 2014).
 ****/

// ---------- 1 Study area ----------
var aoi = ee.Geometry.Rectangle([131.10, -14.00, 131.40, -13.75]);
var probe = ee.Geometry.Point([131.19, -13.83]);
Map.centerObject(aoi, 11);

// ---------- 2 Data: harmonised Landsat 5/7/8/9 ----------
function prepL57(img) {
  var qa = img.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(1 << 3).eq(0).and(qa.bitwiseAnd(1 << 4).eq(0));
  return img.select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'], ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'])
    .multiply(0.0000275).add(-0.2).updateMask(mask).copyProperties(img, ['system:time_start']);
}
function prepL89(img) {
  var qa = img.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(1 << 3).eq(0).and(qa.bitwiseAnd(1 << 4).eq(0));
  return img.select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'], ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'])
    .multiply(0.0000275).add(-0.2).updateMask(mask).copyProperties(img, ['system:time_start']);
}
var col = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2').map(prepL57)
  .merge(ee.ImageCollection('LANDSAT/LE07/C02/T1_L2').filterDate('1999-01-01', '2003-05-31').map(prepL57))  // L7 pre-SLC failure
  .merge(ee.ImageCollection('LANDSAT/LC08/C02/T1_L2').map(prepL89))
  .merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2').map(prepL89))
  .filterBounds(aoi);
// Note: L5 ends Nov 2011 and L8 begins Apr 2013, so 2012 has no clean data here (L7 SLC-off could fill it).

// ======================= LandTrendr =======================
var START = 1988, END = 2024;
var annual = ee.ImageCollection.fromImages(ee.List.sequence(START, END).map(function(y) {
  var c = col.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(5, 9, 'month'));
  var med = c.median();
  var nbr = med.normalizedDifference(['nir', 'swir2']);
  // LandTrendr expects disturbance to INCREASE the index → multiply NBR by −1
  return nbr.multiply(-1).rename('NBR_inv').addBands(nbr.rename('NBR'))
    .set('system:time_start', ee.Date.fromYMD(y, 8, 1).millis())
    .set('n', c.size());
})).filter(ee.Filter.gt('n', 0));

// ---------- Warm-up: bi-temporal change (two dates only) ----------
// Before fitting a whole trajectory, compare two years. Positive dNBR = vegetation loss (clearing, fire).
var YEAR_A = 2017, YEAR_B = 2024;
var nbrA = annual.filter(ee.Filter.calendarRange(YEAR_A, YEAR_A, 'year')).first().select('NBR');
var nbrB = annual.filter(ee.Filter.calendarRange(YEAR_B, YEAR_B, 'year')).first().select('NBR');
var dNBR_AB = nbrA.subtract(nbrB).rename('dNBR').clip(aoi);
Map.addLayer(dNBR_AB, {min: -0.4, max: 0.4, palette: ['#1a9850', '#f7f7f7', '#d73027']}, '4.1: Bi-temporal dNBR ' + YEAR_A + '−' + YEAR_B, false);
// Q: What can two dates NOT tell you about when, how fast and how often change happened? LandTrendr answers this below.

var lt = ee.Algorithms.TemporalSegmentation.LandTrendr({
  timeSeries: annual.select(['NBR_inv', 'NBR']),
  maxSegments: 6, spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true,
  recoveryThreshold: 0.25, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 6
});
// 'LandTrendr' band = 2-D array: rows [year, raw, fitted, isVertex] × columns (years)
var ltArr = lt.select('LandTrendr');
var vertexMask = ltArr.arraySlice(0, 3, 4);
var vertices = ltArr.arrayMask(vertexMask);
var left = vertices.arraySlice(1, 0, -1), right = vertices.arraySlice(1, 1, null);
var startYear = left.arraySlice(0, 0, 1), endYear = right.arraySlice(0, 0, 1);
var startVal = left.arraySlice(0, 2, 3), endVal = right.arraySlice(0, 2, 3);
var mag = endVal.subtract(startVal);              // positive = disturbance (in inverted NBR)
var dur = endYear.subtract(startYear);
var segInfo = ee.Image.cat([startYear, endYear, mag, dur]).toArray(0).arraySlice(0, 0, 4);   // rows: yod, end, mag, dur

// Greatest disturbance segment
var sortByMag = segInfo.arraySlice(0, 2, 3).multiply(-1);
var greatest = segInfo.arraySort(sortByMag).arraySlice(1, 0, 1);
var gd = greatest.arrayProject([0]).arrayFlatten([['yod', 'end', 'mag', 'dur']]);
var MAG_T = 0.15;   // NBR units
var dist = gd.updateMask(gd.select('mag').gt(MAG_T));
var yod = dist.select('yod').add(1).clip(aoi);   // year of detection = first year after the start vertex
Map.addLayer(yod, {min: 1990, max: 2024, palette: ['#9400D3', '#4B0082', '#0000FF', '#00FF00', '#FFFF00', '#FF7F00', '#FF0000']}, 'LandTrendr: year of greatest disturbance');
Map.addLayer(dist.select('mag').clip(aoi), {min: MAG_T, max: 0.6, palette: ['#fee5d9', '#a50f15']}, 'LandTrendr: magnitude', false);

// Raw vs fitted at the probe
var ltProbe = ltArr.reduceRegion(ee.Reducer.first(), probe, 30).get('LandTrendr');
var probeFc = ee.FeatureCollection(ee.List.sequence(0, ee.Array(ltProbe).length().get([1]).subtract(1)).map(function(i) {
  var a = ee.Array(ltProbe);
  return ee.Feature(null, {year: a.get([0, i]), raw: ee.Number(a.get([1, i])).multiply(-1), fitted: ee.Number(a.get([2, i])).multiply(-1)});
}));
print(ui.Chart.feature.byFeature(probeFc, 'year', ['raw', 'fitted'])
  .setOptions({title: 'LandTrendr NBR at probe (raw vs fitted)', series: {0: {pointSize: 3, lineWidth: 0}, 1: {lineWidth: 2}}}));

// ======================= CCDC =======================
var ccdcInput = col.filterDate('2000-01-01', '2025-01-01').map(function(img) {
  var ndvi = img.normalizedDifference(['nir', 'red']).rename('ndvi');
  return img.select(['green', 'red', 'nir', 'swir1', 'swir2']).addBands(ndvi);
});
var ccdc = ee.Algorithms.TemporalSegmentation.Ccdc({
  collection: ccdcInput, breakpointBands: ['green', 'red', 'nir', 'swir1', 'swir2'],
  minObservations: 6, chiSquareProbability: 0.99, minNumOfYearsScaler: 1.33, dateFormat: 1, lambda: 0.002,
  maxIterations: 25000
});
// tBreak = array of break dates (fractional years); 0 = no break
var breaks = ccdc.select('tBreak');
var lastBreak = breaks.arrayReduce(ee.Reducer.max(), [0]).arrayGet([0]).rename('last_break');
var nBreaks = breaks.arrayMask(breaks.gt(0)).arrayLength(0).rename('n_breaks');
Map.addLayer(lastBreak.selfMask().clip(aoi), {min: 2001, max: 2024, palette: ['#9400D3', '#0000FF', '#00FF00', '#FFFF00', '#FF0000']}, 'CCDC: most recent break (year)', false);
Map.addLayer(nBreaks.clip(aoi), {min: 0, max: 5, palette: ['white', 'black']}, 'CCDC: number of breaks', false);

// Compare: where do the two algorithms agree on a disturbance after 2005?
var agree = yod.gte(2005).and(lastBreak.gte(2005)).selfMask();
Map.addLayer(agree, {palette: 'cyan'}, 'Both detect change after 2005', false);

// ---------- 6 Export ----------
Export.image.toDrive({image: yod.toFloat().addBands(dist.select('mag')).addBands(lastBreak).addBands(nBreaks.toFloat()),
  description: 'Prac05b_LT_CCDC', folder: 'GEE_NT', region: aoi, scale: 30, crs: 'EPSG:32752', maxPixels: 1e10});
// Tip: save the full CCDC output as an Asset (Export.image.toAsset) — recomputing is slow.

// Q: Which years show the most clearing according to LandTrendr? Do they match the Hansen loss years (Prac 06)?
// Q: Why do we invert NBR for LandTrendr?
// Q: Annual fires lower NBR every dry season. How do spikeThreshold and the May–Sep window limit false "disturbance"?
// EXT: Run a sensitivity analysis on maxSegments (4, 6, 8) and MAG_T (0.1, 0.15, 0.25) and report the area detected.
// EXT: Compare LandTrendr and CCDC conceptually (annual vs all observations, segments vs harmonic models) and empirically (agreement matrix against 100 visually interpreted points).
// EXT: Explore the GEE community LandTrendr UI and CCDC API (Arévalo et al. 2020) for richer outputs.
