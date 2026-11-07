/**** Prac 03a — Rainfall variability and anomalies (Northern Territory)
 * Data: CHIRPS v2.0 pentad (0.05°, 1981–present). Baseline 1991–2020 (WMO standard normal).
 * NT wet season = October–April.
 *
 * WHAT THIS SCRIPT DOES:
 *   Asks: was a chosen wet season (default 2024/25) wetter or drier than normal across the NT, and how reliable is
 *   NT rainfall? It sums CHIRPS rainfall for each Oct–Apr wet season (1981/82–2024/25), builds a 1991–2020 baseline,
 *   and maps the target season as an anomaly (mm), % of mean, z-score and decile. Charts compare Darwin, Katherine,
 *   Tennant Creek and Alice Springs along the north–south rainfall gradient.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) Optional EDIT: change TARGET (section 3) to map a different wet season (the year it starts, 1981–2024).
 *   (3) Click Run.
 *   (4) Read the charts in the Console (right panel), turn layers on/off in the Map's Layers list, and start the
 *       export in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   Map layers: mean Oct–Apr rainfall (mm), coefficient of variation (%), target season % of mean, standardised
 *   anomaly (z) and decile (the last three for TARGET).
 *   Console charts: wet-season totals per site 1981–2024; Alice Springs z-score bar chart; mean monthly rainfall per site.
 *
 * DATA:
 *   UCSB-CHG/CHIRPS/PENTAD — CHIRPS v2.0 rainfall, 5-day (pentad) totals in mm, 0.05° (~5.5 km), 1981–present.
 *   FAO/GAUL/2015/level1 — state boundaries (used to select and clip to the Northern Territory).
 *
 * LINKS:
 *   Prac page: pracs/prac03-climate-and-hydrology-drivers-rainfall-anomalies-drought-indices-lst-and-et.md
 *   Assessment: Prac 03; AT3 (climate drivers); AT4 Part 3.
 *
 * KEY GEE IDEAS:
 *   - Building a new ImageCollection by mapping a function over a list of years (ee.List.sequence(...).map()).
 *   - Collection reducers: sum(), mean(), reduce(ee.Reducer.stdDev()) collapse many images into one.
 *   - Image maths is pixel by pixel: subtract(), divide() give an anomaly in every pixel.
 *   - Charts (ui.Chart.image.*) run a reducer over regions at a given scale and print to the Console.
 *
 * Q = core (ENV306 and ENV506).  EXT = ENV506 extension.
 ****/

// ---------- 1 Study area ----------
// The NT boundary (for clipping and the export region) and four towns along the north–south rainfall gradient.
// Each town is a 10 km buffer so the charts average several CHIRPS pixels instead of reading one.
// keep only the NT polygon
var nt = ee.FeatureCollection('FAO/GAUL/2015/level1').filter(ee.Filter.eq('ADM1_NAME', 'Northern Territory'));
var sites = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([130.84, -12.46]).buffer(10000), {name: 'Darwin'}),   // [longitude, latitude]; buffer in metres
  ee.Feature(ee.Geometry.Point([132.26, -14.47]).buffer(10000), {name: 'Katherine'}),
  ee.Feature(ee.Geometry.Point([134.19, -19.65]).buffer(10000), {name: 'Tennant Creek'}),
  ee.Feature(ee.Geometry.Point([133.88, -23.70]).buffer(10000), {name: 'Alice Springs'})
]);   // the 'name' property labels each line in the charts
Map.centerObject(nt, 5);   // zoom level 5 shows the whole NT

// ---------- 2 Data ----------
// CHIRPS pentad images hold rainfall totals (mm) for about 5 days each; summing them gives seasonal totals.
var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD').select('precipitation');   // band units: mm per pentad

// ---------- 3 Processing: wet-season totals (Oct of year y to Apr of y+1) ----------
// One image per wet season, then a 1991–2020 baseline (mean and standard deviation) to compare a target season against.
// Results are expressed four ways: anomaly in mm, % of mean, z-score and decile (the BoM uses deciles in its drought reports).
function wetSeason(y) {
  y = ee.Number(y);   // y arrives as a server-side number from ee.List.sequence
  var start = ee.Date.fromYMD(y, 10, 1), end = ee.Date.fromYMD(y.add(1), 5, 1);   // 1 Oct y to 1 May y+1 (end date is exclusive)
  return chirps.filterDate(start, end).sum().rename('wet_mm')   // sum of all pentads in the season = season total (mm)
    .set('season_start', y).set('system:time_start', start.millis());   // properties used for filtering and chart x-axes
}
var seasons = ee.ImageCollection.fromImages(ee.List.sequence(1981, 2024).map(wetSeason));   // 44 seasons: 1981/82–2024/25
var baseline = seasons.filter(ee.Filter.rangeContains('season_start', 1991, 2019));  // 1991/92–2019/20 (29 seasons)
var mean = baseline.mean().rename('mean');   // long-term mean wet-season total (mm) in each pixel
var sd = baseline.reduce(ee.Reducer.stdDev()).rename('sd');   // year-to-year spread (mm) in each pixel

// EDIT (optional): the year the target wet season starts.
var TARGET = 2024;   // 2024/25 wet season
var target = seasons.filter(ee.Filter.eq('season_start', TARGET)).first();   // first() turns the 1-image collection into an image
var anomMm = target.subtract(mean).rename('anomaly_mm').clip(nt);   // mm above (+) or below (−) the mean
var pctNormal = target.divide(mean).multiply(100).rename('pct_of_mean').clip(nt);   // 100 = average; 50 = half the usual rain
var zScore = target.subtract(mean).divide(sd).rename('z').clip(nt);   // anomaly in standard deviations; comparable between sites

// Decile ranking (BoM style): where does the target season rank among all seasons 1981–2024?
// For each season, 1 where it was drier than the target; the sum counts how many seasons the target beat.
var rank = seasons.map(function(img) { return img.lt(target).rename('lt'); }).sum();
// Rank as a fraction of all seasons, scaled to 1–10. Decile 1 = among the driest 10 %, 10 = among the wettest.
// max(1) stops the driest season scoring 0
var decile = rank.divide(seasons.size()).multiply(10).ceil().max(1).rename('decile').clip(nt);

// ---------- 4 Analysis ----------
// Charts summarise the maps at the four towns. Each chart averages pixels inside each buffer (reducer: mean)
// at scale 5566 m, roughly the CHIRPS pixel size (0.05°), so GEE does not resample to a finer grid.
print(ui.Chart.image.seriesByRegion({imageCollection: seasons, regions: sites, reducer: ee.Reducer.mean(),
  band: 'wet_mm', scale: 5566, xProperty: 'season_start', seriesProperty: 'name'})   // one line per town
  // '####' stops 1,981-style labels
  .setOptions({title: 'Oct–Apr rainfall (mm), CHIRPS', hAxis: {title: 'Season starting', format: '####'}}));

// Standardised anomaly series for Alice Springs (bar chart)
// Converts every season (not just TARGET) to a z-score against the 1991–2020 baseline.
var alice = sites.filter(ee.Filter.eq('name', 'Alice Springs'));
var zSeries = seasons.map(function(img) {
  // keep dates for the x-axis
  return img.subtract(mean).divide(sd).rename('z').copyProperties(img, ['season_start', 'system:time_start']);
});
print(ui.Chart.image.series(zSeries, alice, ee.Reducer.mean(), 5566, 'season_start').setChartType('ColumnChart')
  // bars above 0 = wetter than normal
  .setOptions({title: 'Alice Springs: standardised wet-season rainfall anomaly', legend: {position: 'none'}}));

// Monthly climatology per site
// For each month, total that month's rain in each year 1991–2020, then average the 30 totals = mean monthly rainfall (mm).
var monthly = ee.ImageCollection.fromImages(ee.List.sequence(1, 12).map(function(m) {
  var yearsSum = ee.List.sequence(1991, 2020).map(function(y) {
    // calendarRange picks images by calendar year and calendar month
    return chirps.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month')).sum();
  });
  return ee.ImageCollection.fromImages(yearsSum).mean().rename('mm').set('month', m);
}));
print(ui.Chart.image.seriesByRegion({imageCollection: monthly, regions: sites, reducer: ee.Reducer.mean(),
  band: 'mm', scale: 5566, xProperty: 'month', seriesProperty: 'name'}).setChartType('ColumnChart')
  .setOptions({title: 'Mean monthly rainfall 1991–2020 (mm)'}));

// Coefficient of variation (rainfall reliability) — an important driver of NT landscapes
// CV = SD / mean × 100. High CV = unreliable rain (big swings between years), typical of the arid south.
var cv = sd.divide(mean).multiply(100).rename('CV_pct').clip(nt);

// ---------- 5 Visualise ----------
// Layers are drawn in order; later layers sit on top. Layers added with 'false' start switched off — tick them in Layers.
// min/max set the colour stretch; values outside are shown in the end colours.
Map.addLayer(mean.clip(nt), {min: 100, max: 1800, palette: ['#fff7bc', '#fec44f', '#41b6c4', '#225ea8', '#081d58']}, 'Mean Oct–Apr rainfall (mm)');
// green = reliable, red = variable
Map.addLayer(cv, {min: 15, max: 60, palette: ['#1a9850', '#ffffbf', '#d73027']}, 'Coefficient of variation (%)', false);
// Brown = drier than normal, white ≈ normal (100 %), blue-green = wetter.
Map.addLayer(pctNormal, {min: 40, max: 160, palette: ['#8c510a', '#d8b365', '#f5f5f5', '#5ab4ac', '#01665e']}, TARGET + '/' + (TARGET + 1) + ' % of mean');
// ±2 SD
Map.addLayer(zScore, {min: -2, max: 2, palette: ['#b2182b', '#ef8a62', '#f7f7f7', '#67a9cf', '#2166ac']}, 'Standardised anomaly (z)', false);
// Deciles 4–7 are white (near average); 1–3 red/orange (below average), 8–10 green (above average).
Map.addLayer(decile, {min: 1, max: 10, palette: ['#a50026', '#f46d43', '#fee08b', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#d9ef8b', '#66bd63', '#006837']}, 'Decile', false);

// ---------- 6 Export ----------
// Writes a 4-band GeoTIFF (anomaly_mm, pct_of_mean, z, decile) to the GEE_NT folder in your Google Drive.
// Nothing happens until you click Run on the task in the Tasks tab.
// float() gives all bands one data type
Export.image.toDrive({image: anomMm.addBands(pctNormal).addBands(zScore).addBands(decile).float(),
  description: 'Prac03a_rain_anomaly_' + TARGET, folder: 'GEE_NT', region: nt.geometry().bounds(), scale: 5566, crs: 'EPSG:4326'});
  // region: the NT's bounding rectangle; scale: native CHIRPS resolution (m);
  // EPSG:4326 = latitude/longitude (WGS 84), the grid CHIRPS is stored in

// Q: Describe the north–south rainfall gradient and the gradient in variability (CV). How do they shape NT landscapes?
// Q: Was the target wet season wetter or drier than normal at each site? Which decile?
// Q: Why is a z-score better than mm for comparing Darwin and Alice Springs?
// EXT: CHIRPS blends satellite and gauge data; gauges are sparse in central Australia. Compare CHIRPS with BoM station data (Climate Data Online) for one site and quantify bias.
// EXT: Relate wet-season rainfall anomalies to ENSO (Niño 3.4) and the Indian Ocean Dipole over 1981–2024.
// EXT: Lagged correlation between rainfall and NDVI: ready to run in ENV506 challenge A at the end of this script.

// #####################################################################################################################
// ##  ENV506 COHORT ONLY — CHALLENGE A: Lagged correlation between rainfall and NDVI
// ##  ENV306 students: you do not need this block. Leave it commented out; it does not affect the rest of the script.
// #####################################################################################################################
// HOW TO RUN (ENV506): delete the line  /* ENV506-A START  and the line  ENV506-A END */  below, then click Run.
//   Nothing else needs editing to run it. Lines marked EDIT are the settings to change for YOUR tile and focus year.
// USES: chirps, sites and nt from the main script; MODIS monthly NDVI (MOD13A3), 2001–2024.
// FOR AT3 (ENV506): show how quickly vegetation in your tile responds to rain, and which land covers respond fastest; use the lag to
//   explain why your focus year's NDVI anomaly may follow the rainfall anomaly by one or more months.
// READING THE OUTPUT:
//   - Column chart: mean correlation (r) between monthly rainfall and NDVI anomalies at lags 0–6 months.
//     The tallest bar is the typical response time; r near 0 at every lag = vegetation not limited by rainfall.
//   - Layer "ENV506-A: best lag (months)" and "ENV506-A: correlation at best lag": map where response is fast
//     (often grasslands) or slow/weak (evergreen forest, riparian vegetation fed by groundwater).
//   - Anomalies are used (each month minus its 2001–2024 mean) so the shared wet–dry cycle does not inflate r.
/* ENV506-A START
// EDIT: replace the EXAMPLE rectangle with your own tile. prac00 prints "Your tile corners"; paste them as
//       ee.Geometry.Polygon([[[lon, lat], [lon, lat], [lon, lat], [lon, lat], [lon, lat]]]).
var LAG_REGION = ee.Geometry.Rectangle([131.10, -14.00, 131.28, -13.82]);   // EXAMPLE tile — EDIT
var MAX_LAG = 6;   // EDIT: longest lag tested (months)
Map.addLayer(ee.Image().paint(LAG_REGION, 0, 2), {palette: 'red'}, 'ENV506-A: lag-correlation region (your tile)');
var T0 = ee.Date('2001-01-01'), NM = 24 * 12;   // 288 months, Jan 2001 – Dec 2024
var ndviMon = ee.ImageCollection('MODIS/061/MOD13A3').filterDate('2001-01-01', '2025-01-01').map(function(img) {
  var d = ee.Date(img.get('system:time_start'));
  return img.select('NDVI').multiply(0.0001).rename('NDVI')
    .set({idx: d.difference(T0, 'month').round().int(), month: d.get('month'), 'system:time_start': d.millis()});
});
// Monthly rainfall totals, starting MAX_LAG months earlier so every lag has a partner
var rainMon = ee.ImageCollection.fromImages(ee.List.sequence(-MAX_LAG, NM - 1).map(function(i) {
  var s = T0.advance(ee.Number(i), 'month');
  return chirps.filterDate(s, s.advance(1, 'month')).sum().rename('rain')
    .set({idx: ee.Number(i).int(), month: s.get('month'), 'system:time_start': s.millis()});
}));
// Anomaly = value − mean of the same calendar month (removes the seasonal cycle)
function monthlyAnom(col, band) {
  var clim = ee.ImageCollection.fromImages(ee.List.sequence(1, 12).map(function(m) {
    return col.filter(ee.Filter.eq('month', m)).mean().set('month', m);
  }));
  return col.map(function(img) {
    var c = ee.Image(clim.filter(ee.Filter.eq('month', img.get('month'))).first());
    return img.subtract(c).rename(band).copyProperties(img, ['idx', 'month', 'system:time_start']);
  });
}
var ndviAn = monthlyAnom(ndviMon, 'NDVI'), rainAn = monthlyAnom(rainMon, 'rain');
// Correlation of NDVI in month t with rainfall in month t − lag, per pixel
function lagCorr(lag) {
  var pairs = ndviAn.map(function(img) {
    var r = ee.Image(rainAn.filter(ee.Filter.eq('idx', ee.Number(img.get('idx')).subtract(lag).int())).first());
    return r.select('rain').addBands(img.select('NDVI'));
  });
  return pairs.reduce(ee.Reducer.pearsonsCorrelation()).select('correlation').rename('r_lag' + lag);
}
var lagImgs = [];
for (var lag = 0; lag <= MAX_LAG; lag++) lagImgs.push(lagCorr(lag));
var rStack = ee.Image.cat(lagImgs).clip(LAG_REGION);
var rMean = rStack.reduceRegion({reducer: ee.Reducer.mean(), geometry: LAG_REGION, scale: 1000, maxPixels: 1e10});
var lagRows = ee.FeatureCollection(lagImgs.map(function(img, L) {
  return ee.Feature(null, {lag_months: L, r: rMean.get('r_lag' + L)});
}));
print('ENV506-A: mean r by lag (table)', lagRows);
print(ui.Chart.feature.byFeature(lagRows, 'lag_months', 'r').setChartType('ColumnChart')
  .setOptions({title: 'ENV506-A: rainfall → NDVI correlation by lag (anomalies, 2001–2024)',
               hAxis: {title: 'Lag (months)'}, vAxis: {title: 'Pearson r'}, legend: {position: 'none'}}));
var bestLag = rStack.toArray().arrayArgmax().arrayGet([0]).rename('best_lag');
var bestR = rStack.reduce(ee.Reducer.max()).rename('best_r');
Map.addLayer(bestLag, {min: 0, max: MAX_LAG, palette: ['#1a9850', '#ffffbf', '#d73027']}, 'ENV506-A: best lag (months)');
Map.addLayer(bestR, {min: 0, max: 0.7, palette: ['#f7f7f7', '#6baed6', '#08306b']}, 'ENV506-A: correlation at best lag', false);
ENV506-A END */
// ##################################### end of ENV506 challenge A #################################################
