/**** Prac 01c — NDVI and EVI time series (Northern Territory)
 * Sites: Howard Springs savanna (OzFlux tower) vs a cleared paddock in the Douglas–Daly.
 * Data: MODIS MOD13Q1 (250 m, 16-day, 2000–present) and Sentinel-2 (10 m, 2017–present).
 ****/

// ---------- 1 Study area ----------
var sites = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([131.1501, -12.4952]), {name: 'Howard Springs savanna'}),
  ee.Feature(ee.Geometry.Point([131.1900, -13.8300]), {name: 'Douglas-Daly farmland'}),
  ee.Feature(ee.Geometry.Point([133.8800, -23.7000]), {name: 'Alice Springs (arid)'})
]);
Map.centerObject(sites, 6);
Map.addLayer(sites, {color: 'red'}, 'Sites');
// Q: Move the Douglas-Daly point onto a pivot or cleared paddock using the satellite basemap.

// ---------- 2 Data: MODIS ----------
var modis = ee.ImageCollection('MODIS/061/MOD13Q1')
  .filterDate('2001-01-01', '2026-01-01')
  .map(function(img) {
    // SummaryQA: 0 = good, 1 = marginal. Keep both, drop snow/cloud (2, 3).
    var qa = img.select('SummaryQA').lte(1);
    return img.select(['NDVI', 'EVI']).multiply(0.0001).updateMask(qa)
      .copyProperties(img, ['system:time_start']);
  });

// ---------- 4 Analysis / 5 Visualise ----------
var chartNdvi = ui.Chart.image.seriesByRegion({
  imageCollection: modis, regions: sites, reducer: ee.Reducer.mean(),
  band: 'NDVI', scale: 250, xProperty: 'system:time_start', seriesProperty: 'name'
}).setOptions({title: 'MODIS NDVI 2001–2025', vAxis: {title: 'NDVI', viewWindow: {min: 0, max: 0.9}},
               lineWidth: 1, pointSize: 0});
print(chartNdvi);

var howard = sites.filter(ee.Filter.eq('name', 'Howard Springs savanna'));
print(ui.Chart.image.series(modis.select(['NDVI', 'EVI']), howard, ee.Reducer.mean(), 250)
  .setOptions({title: 'Howard Springs: NDVI vs EVI', lineWidth: 1, pointSize: 0}));

// Monthly climatology (mean seasonal cycle)
var months = ee.List.sequence(1, 12);
var clim = ee.ImageCollection.fromImages(months.map(function(m) {
  return modis.filter(ee.Filter.calendarRange(m, m, 'month')).mean()
    .set('month', m);
}));
print(ui.Chart.image.seriesByRegion({
  imageCollection: clim, regions: sites, reducer: ee.Reducer.mean(), band: 'NDVI',
  scale: 250, xProperty: 'month', seriesProperty: 'name'
}).setOptions({title: 'NDVI seasonal cycle (2001–2025 mean)', hAxis: {title: 'Month'}}));

// ---------- 2b Data: Sentinel-2 EVI at 10 m ----------
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(sites)
  .filterDate('2018-01-01', '2026-01-01')
  .linkCollection(csPlus, ['cs_cdf'])
  .map(function(img) {
    var r = img.updateMask(img.select('cs_cdf').gte(0.6)).divide(10000);
    var evi = r.expression('2.5 * (N - R) / (N + 6 * R - 7.5 * B + 1)',
      {N: r.select('B8'), R: r.select('B4'), B: r.select('B2')}).rename('EVI');
    var ndvi = r.normalizedDifference(['B8', 'B4']).rename('NDVI');
    return ndvi.addBands(evi).copyProperties(img, ['system:time_start']);
  });
print(ui.Chart.image.seriesByRegion({
  imageCollection: s2, regions: sites.filter(ee.Filter.neq('name', 'Alice Springs (arid)')),
  reducer: ee.Reducer.mean(), band: 'EVI', scale: 10, seriesProperty: 'name'
}).setOptions({title: 'Sentinel-2 EVI 2018–2025', pointSize: 2, lineWidth: 0}));

// Map: dry-season NDVI 2024 across the NT (MODIS)
var nt = ee.FeatureCollection('FAO/GAUL/2015/level1').filter(ee.Filter.eq('ADM1_NAME', 'Northern Territory'));
var dry2024 = modis.filterDate('2024-05-01', '2024-09-30').select('NDVI').median().clip(nt);
var wet2024 = modis.filterDate('2024-01-01', '2024-03-31').select('NDVI').median().clip(nt);
var vis = {min: 0, max: 0.8, palette: ['#8c510a', '#d8b365', '#f6e8c3', '#c7eae5', '#5ab4ac', '#01665e']};
Map.addLayer(wet2024, vis, 'NDVI wet season Jan–Mar 2024');
Map.addLayer(dry2024, vis, 'NDVI dry season May–Sep 2024');

// ---------- 6 Export ----------
Export.table.toDrive({
  collection: modis.map(function(img) {
    return img.reduceRegions(sites, ee.Reducer.mean(), 250)
      .map(function(f) { return f.set('date', img.date().format('YYYY-MM-dd')); });
  }).flatten(),
  description: 'Prac01c_MODIS_NDVI_EVI_sites', folder: 'GEE_NT', fileFormat: 'CSV'
});

// Q: Describe the seasonal cycle at Howard Springs. When is peak greenness, and why?
// Q: Why does the Douglas-Daly site show sharper peaks than the savanna?
// Q: Where does NDVI appear to saturate relative to EVI?
// EXT: Quantify the wet–dry amplitude per site per year and relate it to wet-season rainfall (Prac 03a).
// EXT: MODIS at 250 m mixes land covers. Compute S2 NDVI within one 250 m pixel and discuss sub-pixel heterogeneity.
