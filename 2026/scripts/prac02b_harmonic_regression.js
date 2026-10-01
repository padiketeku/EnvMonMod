/**** Prac 02b — Harmonic regression of seasonality (Northern Territory)
 * Model: NDVI(t) = b0 + b1*t + b2*cos(2πt) + b3*sin(2πt) [+ b4*cos(4πt) + b5*sin(4πt)]
 * Data: Landsat 8/9 NDVI, 2014–2024. Amplitude & phase describe seasonal greenness; t in years.
 ****/

// ---------- 1 Study area ----------
var aoi = ee.Geometry.Rectangle([130.70, -13.00, 131.40, -12.40]);   // Darwin hinterland: savanna, floodplain, cropping
var probes = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([131.1501, -12.4952]), {name: 'Howard Springs savanna'}),
  ee.Feature(ee.Geometry.Point([131.30, -12.60]), {name: 'Adelaide River floodplain'}),
  ee.Feature(ee.Geometry.Point([131.04, -12.73]), {name: 'Mixed rural blocks'})
]);
Map.centerObject(aoi, 10);
var HARMONICS = 1;   // try 2 for a bimodal season

// ---------- 2 Data ----------
function prep(img) {
  var qa = img.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(1 << 1).eq(0).and(qa.bitwiseAnd(1 << 3).eq(0)).and(qa.bitwiseAnd(1 << 4).eq(0));
  var sr = img.select(['SR_B4', 'SR_B5']).multiply(0.0000275).add(-0.2);
  return sr.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI').updateMask(mask)
    .copyProperties(img, ['system:time_start']);
}
var ndvi = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2').merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
  .filterBounds(aoi).filterDate('2014-01-01', '2025-01-01').map(prep);

// ---------- 3 Build independent variables ----------
var harmonicNames = [];
for (var k = 1; k <= HARMONICS; k++) { harmonicNames.push('cos' + k, 'sin' + k); }
var independents = ['constant', 't'].concat(harmonicNames);
function addVars(img) {
  var t = img.date().difference(ee.Date('2014-01-01'), 'year');
  var out = img.addBands(ee.Image.constant(1).rename('constant'))
               .addBands(ee.Image.constant(t).float().rename('t'));
  for (var k = 1; k <= HARMONICS; k++) {
    var w = ee.Image.constant(t).multiply(2 * Math.PI * k);
    out = out.addBands(w.cos().rename('cos' + k)).addBands(w.sin().rename('sin' + k));
  }
  return out.float();
}
var withVars = ndvi.map(addVars);

// ---------- 4 Fit ----------
var fit = withVars.select(independents.concat(['NDVI']))
  .reduce(ee.Reducer.linearRegression({numX: independents.length, numY: 1}));
var coefs = fit.select('coefficients').arrayProject([0]).arrayFlatten([independents]).clip(aoi);
var rmse = fit.select('residuals').arrayFlatten([['rmse']]).clip(aoi);

var amplitude = coefs.select('cos1').hypot(coefs.select('sin1')).rename('amplitude');
var phase = coefs.select('sin1').atan2(coefs.select('cos1')).rename('phase');   // radians
// Day of year of peak greenness from phase (t measured from 1 January)
var peakDoy = phase.divide(2 * Math.PI).multiply(365.25).add(365.25).mod(365.25).rename('peak_doy');

var fitted = withVars.map(function(img) {
  return img.select('NDVI').addBands(img.select(independents).multiply(coefs).reduce('sum').rename('fitted'));
});
probes.toList(3).evaluate(function(list) {
  list.forEach(function(f) {
    var g = ee.Feature(f).geometry();
    print(ui.Chart.image.series(fitted, g, ee.Reducer.mean(), 30)
      .setSeriesNames(['NDVI', 'fitted'])
      .setOptions({title: f.properties.name + ': observed vs harmonic fit', lineWidth: 1, pointSize: 2,
                   series: {0: {lineWidth: 0}, 1: {pointSize: 0, lineWidth: 2}}}));
  });
});

// ---------- 5 Visualise ----------
// Phase–amplitude–mean as HSV → RGB: hue = timing of peak, saturation = amplitude, value = mean greenness
var hsv = phase.unitScale(-Math.PI, Math.PI)
  .addBands(amplitude.multiply(2.5))
  .addBands(coefs.select('constant')).hsvToRgb();
Map.addLayer(hsv, {}, 'Seasonality (hue = peak timing, sat = amplitude, value = mean)');
Map.addLayer(amplitude, {min: 0, max: 0.3, palette: ['white', 'darkgreen']}, 'Amplitude', false);
Map.addLayer(peakDoy, {min: 1, max: 365, palette: ['#2c7bb6', '#abd9e9', '#ffffbf', '#fdae61', '#d7191c']}, 'Day of year of peak NDVI', false);
Map.addLayer(coefs.select('t'), {min: -0.02, max: 0.02, palette: ['brown', 'white', 'green']}, 'Linear trend term (NDVI/yr)', false);
Map.addLayer(rmse, {min: 0, max: 0.15, palette: ['white', 'red']}, 'Regression RMSE (NDVI units)', false);

// ---------- 6 Export ----------
Export.image.toDrive({image: coefs.addBands([amplitude, phase, peakDoy]).float(), description: 'Prac02b_harmonic_coefs',
  folder: 'GEE_NT', region: aoi, scale: 30, crs: 'EPSG:32752', maxPixels: 1e10});

// Q: Which land covers have the largest amplitude? When does each peak?
// Q: The wet season brings cloud; how does uneven sampling affect the fit?
// Q: Set HARMONICS = 2. Where does the fit improve (lower RMSE) and why?
// EXT: Use the coefficients as classification predictors (Prac 04a) and test whether they improve accuracy.
// EXT: Fit separate models for 2014–2018 and 2020–2024 and map the change in amplitude/phase — a phenology-shift analysis.
