/**** Prac 03a — Rainfall variability and anomalies (Northern Territory)
 * Data: CHIRPS v2.0 pentad (0.05°, 1981–present). Baseline 1991–2020 (WMO standard normal).
 * NT wet season = October–April.
 ****/

// ---------- 1 Study area ----------
var nt = ee.FeatureCollection('FAO/GAUL/2015/level1').filter(ee.Filter.eq('ADM1_NAME', 'Northern Territory'));
var sites = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([130.84, -12.46]).buffer(10000), {name: 'Darwin'}),
  ee.Feature(ee.Geometry.Point([132.26, -14.47]).buffer(10000), {name: 'Katherine'}),
  ee.Feature(ee.Geometry.Point([134.19, -19.65]).buffer(10000), {name: 'Tennant Creek'}),
  ee.Feature(ee.Geometry.Point([133.88, -23.70]).buffer(10000), {name: 'Alice Springs'})
]);
Map.centerObject(nt, 5);

// ---------- 2 Data ----------
var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD').select('precipitation');

// ---------- 3 Processing: wet-season totals (Oct of year y to Apr of y+1) ----------
function wetSeason(y) {
  y = ee.Number(y);
  var start = ee.Date.fromYMD(y, 10, 1), end = ee.Date.fromYMD(y.add(1), 5, 1);
  return chirps.filterDate(start, end).sum().rename('wet_mm')
    .set('season_start', y).set('system:time_start', start.millis());
}
var seasons = ee.ImageCollection.fromImages(ee.List.sequence(1981, 2024).map(wetSeason));
var baseline = seasons.filter(ee.Filter.rangeContains('season_start', 1991, 2019));  // 1991/92–2019/20 (29 seasons)
var mean = baseline.mean().rename('mean');
var sd = baseline.reduce(ee.Reducer.stdDev()).rename('sd');

var TARGET = 2024;   // 2024/25 wet season
var target = seasons.filter(ee.Filter.eq('season_start', TARGET)).first();
var anomMm = target.subtract(mean).rename('anomaly_mm').clip(nt);
var pctNormal = target.divide(mean).multiply(100).rename('pct_of_mean').clip(nt);
var zScore = target.subtract(mean).divide(sd).rename('z').clip(nt);

// Decile ranking (BoM style): where does the target season rank among all seasons 1981–2024?
var rank = seasons.map(function(img) { return img.lt(target).rename('lt'); }).sum();
var decile = rank.divide(seasons.size()).multiply(10).ceil().max(1).rename('decile').clip(nt);

// ---------- 4 Analysis ----------
print(ui.Chart.image.seriesByRegion({imageCollection: seasons, regions: sites, reducer: ee.Reducer.mean(),
  band: 'wet_mm', scale: 5566, xProperty: 'season_start', seriesProperty: 'name'})
  .setOptions({title: 'Oct–Apr rainfall (mm), CHIRPS', hAxis: {title: 'Season starting', format: '####'}}));

// Standardised anomaly series for Alice Springs (bar chart)
var alice = sites.filter(ee.Filter.eq('name', 'Alice Springs'));
var zSeries = seasons.map(function(img) {
  return img.subtract(mean).divide(sd).rename('z').copyProperties(img, ['season_start', 'system:time_start']);
});
print(ui.Chart.image.series(zSeries, alice, ee.Reducer.mean(), 5566, 'season_start').setChartType('ColumnChart')
  .setOptions({title: 'Alice Springs: standardised wet-season rainfall anomaly', legend: {position: 'none'}}));

// Monthly climatology per site
var monthly = ee.ImageCollection.fromImages(ee.List.sequence(1, 12).map(function(m) {
  var yearsSum = ee.List.sequence(1991, 2020).map(function(y) {
    return chirps.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month')).sum();
  });
  return ee.ImageCollection.fromImages(yearsSum).mean().rename('mm').set('month', m);
}));
print(ui.Chart.image.seriesByRegion({imageCollection: monthly, regions: sites, reducer: ee.Reducer.mean(),
  band: 'mm', scale: 5566, xProperty: 'month', seriesProperty: 'name'}).setChartType('ColumnChart')
  .setOptions({title: 'Mean monthly rainfall 1991–2020 (mm)'}));

// Coefficient of variation (rainfall reliability) — an important driver of NT landscapes
var cv = sd.divide(mean).multiply(100).rename('CV_pct').clip(nt);

// ---------- 5 Visualise ----------
Map.addLayer(mean.clip(nt), {min: 100, max: 1800, palette: ['#fff7bc', '#fec44f', '#41b6c4', '#225ea8', '#081d58']}, 'Mean Oct–Apr rainfall (mm)');
Map.addLayer(cv, {min: 15, max: 60, palette: ['#1a9850', '#ffffbf', '#d73027']}, 'Coefficient of variation (%)', false);
Map.addLayer(pctNormal, {min: 40, max: 160, palette: ['#8c510a', '#d8b365', '#f5f5f5', '#5ab4ac', '#01665e']}, TARGET + '/' + (TARGET + 1) + ' % of mean');
Map.addLayer(zScore, {min: -2, max: 2, palette: ['#b2182b', '#ef8a62', '#f7f7f7', '#67a9cf', '#2166ac']}, 'Standardised anomaly (z)', false);
Map.addLayer(decile, {min: 1, max: 10, palette: ['#a50026', '#f46d43', '#fee08b', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#d9ef8b', '#66bd63', '#006837']}, 'Decile', false);

// ---------- 6 Export ----------
Export.image.toDrive({image: anomMm.addBands(pctNormal).addBands(zScore).addBands(decile).float(),
  description: 'Prac03a_rain_anomaly_' + TARGET, folder: 'GEE_NT', region: nt.geometry().bounds(), scale: 5566, crs: 'EPSG:4326'});

// Q: Describe the north–south rainfall gradient and the gradient in variability (CV). How do they shape NT landscapes?
// Q: Was the target wet season wetter or drier than normal at each site? Which decile?
// Q: Why is a z-score better than mm for comparing Darwin and Alice Springs?
// EXT: CHIRPS blends satellite and gauge data; gauges are sparse in central Australia. Compare CHIRPS with BoM station data (Climate Data Online) for one site and quantify bias.
// EXT: Relate wet-season rainfall anomalies to ENSO (Niño 3.4) and the Indian Ocean Dipole over 1981–2024.
