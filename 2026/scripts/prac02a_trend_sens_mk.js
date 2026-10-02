/**** Prac 02a — Non-parametric trend analysis: Sen's slope and Mann–Kendall (Northern Territory)
 * Variable: annual mean NDVI (MODIS MOD13A3, 1 km), 2001–2024. Swap in rainfall, LST or fire frequency.
 * Mann–Kendall S statistic computed pairwise (after the GEE "non-parametric trend" tutorial);
 * variance formula ignores ties (fine for continuous NDVI — see EXT).
 *
 * WHAT THIS SCRIPT DOES:
 *   Asks "Where in the NT has vegetation greenness gone up or down since 2001?" For every 1 km pixel it makes a
 *   24-year series of annual mean NDVI, estimates the trend with Sen's slope (NDVI per year), tests whether the
 *   trend is significant with the Mann–Kendall test, and maps and sums the significant greening and browning.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) Optional edits: START and END years (section 1), ALPHA (significance level), and the probe point (section 4), or click the map to chart any pixel.
 *   (3) Click Run. The NT-wide calculations can take a minute or two.
 *   (4) Read the Console (right panel), turn layers on/off in the Map's Layers list, and start the export in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   Map: Sen's slope for all pixels (off), Mann–Kendall p-value (off), and Sen's slope only where p < 0.05.
 *   Console: area (km²) of significant greening and browning; annual NDVI chart at the probe with a trend line;
 *   Sen slope, Kendall's tau and p at the probe.
 *
 * DATA:
 *   MODIS/061/MOD13A3 — MODIS Terra monthly vegetation indices, 1 km; 2001–2024 used (NDVI band).
 *   FAO/GAUL/2015/level1 — state/territory boundaries (vector, 2015).
 *
 * LINKS:
 *   Prac page: pracs/prac02-monitoring-vegetation-condition-trends-and-seasonality.md
 *   Assessment: Prac 02; AT3 (trend and seasonality); AT4 Part 3.
 *
 * KEY GEE IDEAS:
 *   - Building a new ImageCollection with ee.List.sequence(...).map() (one image per year).
 *   - Per-pixel statistics with collection reducers (ee.Reducer.sensSlope, sum).
 *   - Joins (ee.Join.saveAll) to pair every image with all later images.
 *   - reduceRegion with scale and maxPixels for area totals (pixelArea).
 *
 * Q = core (ENV306 and ENV506).  EXT = ENV506 extension.
 ****/

// ---------- 1 Study area ----------
// The whole NT, and the range of years to analyse.
var nt = ee.FeatureCollection('FAO/GAUL/2015/level1').filter(ee.Filter.eq('ADM1_NAME', 'Northern Territory'));
Map.centerObject(nt, 5);
var START = 2001, END = 2024;   // first and last year of the trend (both included)

// ---------- 2 Data: annual mean NDVI ----------
// Average the 12 monthly MODIS images in each year, giving one NDVI image per year. Using annual values
// removes the strong wet–dry seasonal cycle, so what is left is the year-to-year change.
var modis = ee.ImageCollection('MODIS/061/MOD13A3').select('NDVI');
var annual = ee.ImageCollection.fromImages(ee.List.sequence(START, END).map(function(y) {
  y = ee.Number(y);
  // calendarRange(y, y, 'year') keeps images from year y; × 0.0001 converts stored integers to NDVI (−1 to 1).
  return modis.filter(ee.Filter.calendarRange(y, y, 'year')).mean().multiply(0.0001)
    // store the year, and a date (1 July) that the join and charts can use
    .rename('NDVI').set('year', y).set('system:time_start', ee.Date.fromYMD(y, 7, 1).millis());
}));
var n = END - START + 1;   // number of years (24). This is plain JavaScript, worked out in your browser.

// ---------- 3a Sen's slope (median of all pairwise slopes) ----------
// For every pair of years, slope = change in NDVI ÷ change in years. Sen's slope is the median of these,
// so a single unusual year (drought, big fire) has little effect — unlike an ordinary least-squares line.
var sens = annual.map(function(img) {
  // sensSlope needs two bands per image: first the x value (year), then the y value (NDVI).
  return ee.Image.constant(img.get('year')).float().rename('year').addBands(img);
}).reduce(ee.Reducer.sensSlope()).clip(nt);   // bands: slope (NDVI/yr), offset

// ---------- 3b Mann–Kendall S ----------
// Mann–Kendall compares every year with every later year and adds up +1 (later is higher) or −1 (later is lower).
// A large positive S suggests an upward trend; large negative S a downward trend. Z and p then test significance.
// Join: for each annual image, save the list of all LATER images (time_start of this < time_start of the other).
var afterFilter = ee.Filter.lessThan({leftField: 'system:time_start', rightField: 'system:time_start'});
var joined = ee.ImageCollection(ee.Join.saveAll('after').apply({primary: annual, secondary: annual, condition: afterFilter}));
// sign(i, j): +1 if NDVI rose from year i to the later year j, −1 if it fell, 0 if it is unchanged (a tie).
// signum() returns exactly −1, 0 or +1, which is what Mann–Kendall counts. (Clamping the difference to −1…1 and
// converting to an integer would not work here: NDVI differences are fractions, so int() would turn them all into 0.)
var sign = function(i, j) {
  return ee.Image(j).subtract(i).signum().int();
};
var S = ee.ImageCollection(joined.map(function(current) {
  var afterCol = ee.ImageCollection.fromImages(current.get('after'));   // all years after the current one
  return afterCol.map(function(image) { return ee.Image(sign(current, image)).unmask(0); });   // masked pixels count as 0
}).flatten()).reduce('sum', 2).rename('S');   // add up all pairs per pixel; 2 = parallelScale (helps avoid memory errors)

// Variance of S when there are no tied values: n(n − 1)(2n + 5) / 18.
var varS = ee.Image.constant(n * (n - 1) * (2 * n + 5) / 18);
// Z score with a continuity correction (move S one step towards 0); Z = 0 when S = 0.
var Z = ee.Image(0).where(S.gt(0), S.subtract(1).divide(varS.sqrt()))
                   .where(S.lt(0), S.add(1).divide(varS.sqrt())).rename('Z');
// Two-sided p-value: p = 2 * (1 − Φ(|Z|)),  Φ(z) = 0.5 * (1 + erf(z/√2))
// which simplifies to p = 1 − erf(|Z|/√2). Small p = trend unlikely to be chance.
var p = ee.Image(1).subtract(Z.abs().divide(Math.SQRT2).erf()).rename('p').clip(nt);
// Kendall's tau = S / (n(n−1)/2)
// tau runs from −1 (always decreasing) to +1 (always increasing).
var tau = S.divide(n * (n - 1) / 2).rename('tau').clip(nt);

var ALPHA = 0.05;   // significance level: a conventional starting value — test others (e.g. 0.01)
var sigSlope = sens.select('slope').updateMask(p.lt(ALPHA));   // hide pixels whose trend is not significant

// ---------- 4 Analysis ----------
// Add up the area of pixels with a significant positive (greening) or negative (browning) trend.
var area = ee.Image.pixelArea().divide(1e6);   // pixelArea() gives m² per pixel; ÷ 1 000 000 → km²
var sigInc = area.updateMask(p.lt(ALPHA).and(sens.select('slope').gt(0)));
var sigDec = area.updateMask(p.lt(ALPHA).and(sens.select('slope').lt(0)));
// Positional arguments: reducer, geometry, scale (1000 m = MODIS pixel), crs, crsTransform, bestEffort, maxPixels.
print('Area with significant greening (km²)', sigInc.reduceRegion(ee.Reducer.sum(), nt.geometry(), 1000, null, null, false, 1e11));
print('Area with significant browning (km²)', sigDec.reduceRegion(ee.Reducer.sum(), nt.geometry(), 1000, null, null, false, 1e11));

// Inspect one pixel: series + Sen line
// To look at a different place, change the coordinates [lon, lat] below and click Run again,
// or simply click on the map: the click handler below charts the pixel you click.
var probe = ee.Geometry.Point([131.19, -13.83]);   // Douglas–Daly
// The red line on the chart is the chart's own least-squares trend line, drawn for reference — it is not Sen's slope.
print(ui.Chart.image.series(annual, probe, ee.Reducer.mean(), 1000, 'year')   // 'year' = x-axis property
  .setOptions({title: 'Annual NDVI at probe', trendlines: {0: {color: 'red'}}, pointSize: 4}));
// Reducer.first() simply reads the value of the pixel under the point.
print('Probe: Sen slope / tau / p', sens.select('slope').addBands(tau).addBands(p).reduceRegion(ee.Reducer.first(), probe, 1000));
// Click anywhere on the map: Map.onClick runs this function with the clicked longitude and latitude,
// and prints a new chart and the Sen slope / tau / p for that pixel in the Console.
Map.onClick(function(coords) {
  var pt = ee.Geometry.Point([coords.lon, coords.lat]);
  print(ui.Chart.image.series(annual, pt, ee.Reducer.mean(), 1000, 'year')
    .setOptions({title: 'Annual NDVI at ' + coords.lon.toFixed(3) + ', ' + coords.lat.toFixed(3),
                 trendlines: {0: {color: 'red'}}, pointSize: 4}));
  print('Clicked pixel: Sen slope / tau / p', sens.select('slope').addBands(tau).addBands(p).reduceRegion(ee.Reducer.first(), pt, 1000));
});

// ---------- 5 Visualise ----------
// Brown = browning (negative slope), white = no change, teal-green = greening (positive slope).
var slopeVis = {min: -0.006, max: 0.006, palette: ['#8c510a', '#d8b365', '#f6e8c3', '#f5f5f5', '#c7eae5', '#5ab4ac', '#01665e']};
Map.addLayer(sens.select('slope'), slopeVis, "Sen's slope (NDVI/yr), all pixels", false);
Map.addLayer(p, {min: 0, max: 0.1, palette: ['black', 'white']}, 'Mann–Kendall p-value', false);   // dark = small p
Map.addLayer(sigSlope, slopeVis, "Sen's slope where p < 0.05");

// ---------- 6 Export ----------
// Save slope, tau, p and Z as one 4-band GeoTIFF in Google Drive. Start it in the Tasks tab.
// crs EPSG:3577 = GDA94 / Australian Albers (equal-area); bounds() = the NT's bounding rectangle.
Export.image.toDrive({image: sens.select('slope').addBands([tau, p, Z]).float(), description: 'Prac02a_NDVI_trend_NT',
  folder: 'GEE_NT', region: nt.geometry().bounds(), scale: 1000, crs: 'EPSG:3577', maxPixels: 1e11});

// Q: Where is the NT greening or browning? Propose landscape processes (rainfall trend, woody thickening, clearing, fire).
// Q: Why use Sen's slope and Mann–Kendall rather than OLS regression for NDVI?
// Q: About 5% of pixels will be "significant" by chance at α = 0.05. Why is this a problem for a map with ~1.4 million pixels?
// EXT: Apply a Benjamini–Hochberg false-discovery-rate correction in the Code Editor: use ee.Reducer.fixedHistogram on the
//      p-value image to get k(t) = number of pixels with p ≤ t, then find the largest t with t ≤ (k(t)/m)·α and re-map.
// EXT: Autocorrelated series inflate significance. Implement pre-whitening (Yue–Pilon) or the modified MK test for one region.
// EXT: Remove rainfall-driven variation first (RESTREND: residuals of NDVI ~ rainfall) and compare trend maps.
