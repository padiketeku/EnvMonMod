/**** Prac 02a — Non-parametric trend analysis: Sen's slope and Mann–Kendall (Northern Territory)
 * Variable: annual mean NDVI (MODIS MOD13A3, 1 km), 2001–2024. Swap in rainfall, LST or fire frequency.
 * Mann–Kendall S statistic computed pairwise (after the GEE "non-parametric trend" tutorial);
 * variance formula ignores ties (fine for continuous NDVI — see EXT).
 ****/

// ---------- 1 Study area ----------
var nt = ee.FeatureCollection('FAO/GAUL/2015/level1').filter(ee.Filter.eq('ADM1_NAME', 'Northern Territory'));
Map.centerObject(nt, 5);
var START = 2001, END = 2024;

// ---------- 2 Data: annual mean NDVI ----------
var modis = ee.ImageCollection('MODIS/061/MOD13A3').select('NDVI');
var annual = ee.ImageCollection.fromImages(ee.List.sequence(START, END).map(function(y) {
  y = ee.Number(y);
  return modis.filter(ee.Filter.calendarRange(y, y, 'year')).mean().multiply(0.0001)
    .rename('NDVI').set('year', y).set('system:time_start', ee.Date.fromYMD(y, 7, 1).millis());
}));
var n = END - START + 1;

// ---------- 3a Sen's slope (median of all pairwise slopes) ----------
var sens = annual.map(function(img) {
  return ee.Image.constant(img.get('year')).float().rename('year').addBands(img);
}).reduce(ee.Reducer.sensSlope()).clip(nt);   // bands: slope (NDVI/yr), offset

// ---------- 3b Mann–Kendall S ----------
var afterFilter = ee.Filter.lessThan({leftField: 'system:time_start', rightField: 'system:time_start'});
var joined = ee.ImageCollection(ee.Join.saveAll('after').apply({primary: annual, secondary: annual, condition: afterFilter}));
var sign = function(i, j) {
  return ee.Image(j).neq(i).multiply(ee.Image(j).subtract(i).clamp(-1, 1)).int();
};
var S = ee.ImageCollection(joined.map(function(current) {
  var afterCol = ee.ImageCollection.fromImages(current.get('after'));
  return afterCol.map(function(image) { return ee.Image(sign(current, image)).unmask(0); });
}).flatten()).reduce('sum', 2).rename('S');

var varS = ee.Image.constant(n * (n - 1) * (2 * n + 5) / 18);
var Z = ee.Image(0).where(S.gt(0), S.subtract(1).divide(varS.sqrt()))
                   .where(S.lt(0), S.add(1).divide(varS.sqrt())).rename('Z');
// Two-sided p-value: p = 2 * (1 − Φ(|Z|)),  Φ(z) = 0.5 * (1 + erf(z/√2))
var p = ee.Image(1).subtract(Z.abs().divide(Math.SQRT2).erf()).rename('p').clip(nt);
// Kendall's tau = S / (n(n−1)/2)
var tau = S.divide(n * (n - 1) / 2).rename('tau').clip(nt);

var ALPHA = 0.05;
var sigSlope = sens.select('slope').updateMask(p.lt(ALPHA));

// ---------- 4 Analysis ----------
var area = ee.Image.pixelArea().divide(1e6);
var sigInc = area.updateMask(p.lt(ALPHA).and(sens.select('slope').gt(0)));
var sigDec = area.updateMask(p.lt(ALPHA).and(sens.select('slope').lt(0)));
print('Area with significant greening (km²)', sigInc.reduceRegion(ee.Reducer.sum(), nt.geometry(), 1000, null, null, false, 1e11));
print('Area with significant browning (km²)', sigDec.reduceRegion(ee.Reducer.sum(), nt.geometry(), 1000, null, null, false, 1e11));

// Inspect one pixel: series + Sen line
var probe = ee.Geometry.Point([131.19, -13.83]);   // Douglas–Daly
print(ui.Chart.image.series(annual, probe, ee.Reducer.mean(), 1000, 'year')
  .setOptions({title: 'Annual NDVI at probe (click map to move)', trendlines: {0: {color: 'red'}}, pointSize: 4}));
print('Probe: Sen slope / tau / p', sens.select('slope').addBands(tau).addBands(p).reduceRegion(ee.Reducer.first(), probe, 1000));

// ---------- 5 Visualise ----------
var slopeVis = {min: -0.006, max: 0.006, palette: ['#8c510a', '#d8b365', '#f6e8c3', '#f5f5f5', '#c7eae5', '#5ab4ac', '#01665e']};
Map.addLayer(sens.select('slope'), slopeVis, "Sen's slope (NDVI/yr), all pixels", false);
Map.addLayer(p, {min: 0, max: 0.1, palette: ['black', 'white']}, 'Mann–Kendall p-value', false);
Map.addLayer(sigSlope, slopeVis, "Sen's slope where p < 0.05");

// ---------- 6 Export ----------
Export.image.toDrive({image: sens.select('slope').addBands([tau, p, Z]).float(), description: 'Prac02a_NDVI_trend_NT',
  folder: 'GEE_NT', region: nt.geometry().bounds(), scale: 1000, crs: 'EPSG:3577', maxPixels: 1e11});

// Q: Where is the NT greening or browning? Propose landscape processes (rainfall trend, woody thickening, clearing, fire).
// Q: Why use Sen's slope and Mann–Kendall rather than OLS regression for NDVI?
// Q: About 5% of pixels will be "significant" by chance at α = 0.05. Why is this a problem for a map with ~1.4 million pixels?
// EXT: Apply a Benjamini–Hochberg false-discovery-rate correction in the Code Editor: use ee.Reducer.fixedHistogram on the
//      p-value image to get k(t) = number of pixels with p ≤ t, then find the largest t with t ≤ (k(t)/m)·α and re-map.
// EXT: Autocorrelated series inflate significance. Implement pre-whitening (Yue–Pilon) or the modified MK test for one region.
// EXT: Remove rainfall-driven variation first (RESTREND: residuals of NDVI ~ rainfall) and compare trend maps.
