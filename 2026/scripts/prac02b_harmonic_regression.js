/**** Prac 02b — Harmonic regression of seasonality (Northern Territory)
 * Model: NDVI(t) = b0 + b1*t + b2*cos(2πt) + b3*sin(2πt) [+ b4*cos(4πt) + b5*sin(4πt)]
 * Data: Landsat 8/9 NDVI, 2014–2024. Amplitude & phase describe seasonal greenness; t in years.
 *
 * WHAT THIS SCRIPT DOES:
 *   Describes the shape of each pixel's yearly greenness cycle in the Darwin hinterland (savanna, Adelaide River
 *   floodplain, cropping and rural blocks). It fits a smooth wave (sine and cosine terms) plus a straight-line
 *   trend to every Landsat NDVI value from 2014–2024, then maps how big the seasonal swing is (amplitude),
 *   when greenness peaks (phase / day of year), the long-term trend, and how well the model fits (RMSE).
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) Edit the line marked HARMONICS (section 1): 1 = one peak per year, 2 = allows a second peak.
 *   (3) Click Run.
 *   (4) Read the charts in the Console (right panel), turn layers on/off in the Map's Layers list, and start the
 *       export in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   Charts: observed vs fitted NDVI at three probe sites.
 *   Map: seasonality colour composite (hue = peak timing, saturation = amplitude, brightness = constant term),
 *   amplitude, day of year of peak NDVI, linear trend term, and regression RMSE.
 *
 * DATA:
 *   LANDSAT/LC08/C02/T1_L2 and LANDSAT/LC09/C02/T1_L2 — Landsat 8/9 Collection 2 surface reflectance, 30 m;
 *   2014–2024 used (red and NIR bands only, for NDVI).
 *
 * LINKS:
 *   Prac page: pracs/prac02-monitoring-vegetation-condition-trends-and-seasonality.md
 *   Assessment: Prac 02; AT2 (trend and seasonality); AT4 Part 3.
 *
 * KEY GEE IDEAS:
 *   - map() to add predictor bands (constant, time, cos, sin) to every image.
 *   - Per-pixel least-squares regression with ee.Reducer.linearRegression and array images.
 *   - Server-side vs client-side: a JavaScript for-loop builds band names in the browser; evaluate() brings
 *     server results back to the browser to make one chart per site.
 *   - Exports of multi-band results with float() and a stated crs and scale.
 *
 * Q = core (ENV306 and ENV506).  EXT = ENV506 extension.
 ****/

// ---------- 1 Study area ----------
// Area of interest, three probe points for charts, and the number of harmonics (waves per year) to fit.
var aoi = ee.Geometry.Rectangle([130.70, -13.00, 131.40, -12.40]);   // Darwin hinterland: savanna, floodplain, cropping
var probes = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([131.1501, -12.4952]), {name: 'Howard Springs savanna'}),   // [lon, lat]
  ee.Feature(ee.Geometry.Point([131.30, -12.60]), {name: 'Adelaide River floodplain'}),
  ee.Feature(ee.Geometry.Point([131.04, -12.73]), {name: 'Mixed rural blocks'})
]);
Map.centerObject(aoi, 10);
var HARMONICS = 1;   // try 2 for a bimodal season
// EDIT HARMONICS: 1 = one cycle per year (annual wave); 2 = also a half-year wave, so the fitted curve can have two peaks.

// ---------- 2 Data ----------
// Make a cloud-masked NDVI image for every Landsat 8/9 scene over the area, 2014–2024.
function prep(img) {
  var qa = img.select('QA_PIXEL');
  // Keep pixels where QA bits 1 (dilated cloud), 3 (cloud) and 4 (cloud shadow) are all 0 (= clear).
  var mask = qa.bitwiseAnd(1 << 1).eq(0).and(qa.bitwiseAnd(1 << 3).eq(0)).and(qa.bitwiseAnd(1 << 4).eq(0));
  var sr = img.select(['SR_B4', 'SR_B5']).multiply(0.0000275).add(-0.2);   // red, NIR → reflectance (scale and offset)
  return sr.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI').updateMask(mask)   // (NIR − red) / (NIR + red)
    .copyProperties(img, ['system:time_start']);   // keep the date: the model needs it
}
var ndvi = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2').merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
  .filterBounds(aoi).filterDate('2014-01-01', '2025-01-01').map(prep);   // end date exclusive → through 2024

// ---------- 3 Build independent variables ----------
// The regression needs the predictors (x variables) as bands on every image: a constant (intercept),
// time t (for the trend) and a cos and sin band for each harmonic.
var harmonicNames = [];
// Ordinary JavaScript loop (runs in your browser): builds the band names, e.g. ['cos1', 'sin1'].
for (var k = 1; k <= HARMONICS; k++) { harmonicNames.push('cos' + k, 'sin' + k); }
var independents = ['constant', 't'].concat(harmonicNames);   // e.g. ['constant', 't', 'cos1', 'sin1']
function addVars(img) {
  var t = img.date().difference(ee.Date('2014-01-01'), 'year');   // time in years since 1 Jan 2014 (decimal)
  var out = img.addBands(ee.Image.constant(1).rename('constant'))   // 1 everywhere → gives the intercept b0
               .addBands(ee.Image.constant(t).float().rename('t'));
  for (var k = 1; k <= HARMONICS; k++) {
    var w = ee.Image.constant(t).multiply(2 * Math.PI * k);   // angle: one full cycle (2π) per year for k = 1
    out = out.addBands(w.cos().rename('cos' + k)).addBands(w.sin().rename('sin' + k));
  }
  return out.float();   // same data type for all bands, required by the regression reducer
}
var withVars = ndvi.map(addVars);

// ---------- 4 Fit ----------
// Fit the model separately in every pixel by least squares, using all clear observations of that pixel.
var fit = withVars.select(independents.concat(['NDVI']))   // x bands first, then the y band (NDVI) last
  .reduce(ee.Reducer.linearRegression({numX: independents.length, numY: 1}));
// The result is an array image; arrayProject/arrayFlatten turn it into one ordinary band per coefficient.
var coefs = fit.select('coefficients').arrayProject([0]).arrayFlatten([independents]).clip(aoi);
var rmse = fit.select('residuals').arrayFlatten([['rmse']]).clip(aoi);   // root-mean-square of the residuals (NDVI units)

// Amplitude = height of the seasonal wave = √(cos1² + sin1²). Large = strong wet/dry contrast.
var amplitude = coefs.select('cos1').hypot(coefs.select('sin1')).rename('amplitude');
// Phase = where in the yearly cycle the wave peaks, as an angle from −π to π.
var phase = coefs.select('sin1').atan2(coefs.select('cos1')).rename('phase');   // radians
// Day of year of peak greenness from phase (t measured from 1 January)
// phase ÷ 2π = fraction of a year; × 365.25 = days; + 365.25 then mod 365.25 makes negative values wrap into 0–365.
var peakDoy = phase.divide(2 * Math.PI).multiply(365.25).add(365.25).mod(365.25).rename('peak_doy');

// Predicted NDVI for every image: multiply each predictor band by its coefficient and add them up.
var fitted = withVars.map(function(img) {
  return img.select('NDVI').addBands(img.select(independents).multiply(coefs).reduce('sum').rename('fitted'));
});
// evaluate() fetches the three probe features to the browser, so we can loop over them and print one chart each.
probes.toList(3).evaluate(function(list) {
  list.forEach(function(f) {   // f is now a plain JavaScript object (GeoJSON), not an ee object
    var g = ee.Feature(f).geometry();   // turn it back into an ee geometry for the chart
    print(ui.Chart.image.series(fitted, g, ee.Reducer.mean(), 30)   // scale 30 m = Landsat pixel
      .setSeriesNames(['NDVI', 'fitted'])
      .setOptions({title: f.properties.name + ': observed vs harmonic fit', lineWidth: 1, pointSize: 2,
                   series: {0: {lineWidth: 0}, 1: {pointSize: 0, lineWidth: 2}}}));   // observed = dots, fitted = line
  });
});

// ---------- 5 Visualise ----------
// Map the seasonality results. Most layers start switched off — turn them on in the Layers list.
// Phase–amplitude–mean as HSV → RGB: hue = timing of peak, saturation = amplitude, value = mean greenness
// unitScale maps phase −π…π to 0–1 (hue); amplitude × 2.5 stretches typical amplitudes towards 0–1 (saturation);
// the constant term (intercept, close to mean NDVI) gives brightness (value).
var hsv = phase.unitScale(-Math.PI, Math.PI)
  .addBands(amplitude.multiply(2.5))
  .addBands(coefs.select('constant')).hsvToRgb();
Map.addLayer(hsv, {}, 'Seasonality (hue = peak timing, sat = amplitude, value = mean)');
Map.addLayer(amplitude, {min: 0, max: 0.3, palette: ['white', 'darkgreen']}, 'Amplitude', false);
Map.addLayer(peakDoy, {min: 1, max: 365, palette: ['#2c7bb6', '#abd9e9', '#ffffbf', '#fdae61', '#d7191c']}, 'Day of year of peak NDVI', false);
Map.addLayer(coefs.select('t'), {min: -0.02, max: 0.02, palette: ['brown', 'white', 'green']}, 'Linear trend term (NDVI/yr)', false);
Map.addLayer(rmse, {min: 0, max: 0.15, palette: ['white', 'red']}, 'Regression RMSE (NDVI units)', false);   // red = poor fit

// ---------- 6 Export ----------
// Save the coefficients, amplitude, phase and peak day as one GeoTIFF in Google Drive. Start it in the Tasks tab.
// crs EPSG:32752 = WGS 84 / UTM zone 52S; scale 30 m = Landsat pixel size.
Export.image.toDrive({image: coefs.addBands([amplitude, phase, peakDoy]).float(), description: 'Prac02b_harmonic_coefs',
  folder: 'GEE_NT', region: aoi, scale: 30, crs: 'EPSG:32752', maxPixels: 1e10});

// Q: Which land covers have the largest amplitude? When does each peak?
// Q: The wet season brings cloud; how does uneven sampling affect the fit?
// Q: Set HARMONICS = 2. Where does the fit improve (lower RMSE) and why?
// EXT: Use the coefficients as classification predictors (Prac 04a) and test whether they improve accuracy.
// EXT: Fit separate models for 2014–2018 and 2020–2024 and map the change in amplitude/phase — a phenology-shift analysis.
