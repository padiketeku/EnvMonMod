/**** Prac 03b — Drought indices: VCI, TCI, VHI, SPI-type index and PDSI (Northern Territory)
 * Focus: 2019 — Australia's driest year on record — in central Australia (Alice Springs region).
 * Data: MODIS MOD13A3 (monthly NDVI, 1 km), MOD11A2 (8-day LST, 1 km), CHIRPS pentad, TerraClimate.
 ****/

// ---------- 1 Study area & parameters ----------
var nt = ee.FeatureCollection('FAO/GAUL/2015/level1').filter(ee.Filter.eq('ADM1_NAME', 'Northern Territory'));
var alice = ee.Geometry.Rectangle([132.5, -24.5, 135.5, -22.5]);
var TARGET = ee.Date('2019-10-01');   // month to map
var BASE = ['2001-01-01', '2025-01-01'];
Map.centerObject(nt, 5);

// ---------- 2 Data: monthly NDVI and LST ----------
var ndvi = ee.ImageCollection('MODIS/061/MOD13A3').filterDate(BASE[0], BASE[1])
  .map(function(img) { return img.select('NDVI').multiply(0.0001).copyProperties(img, ['system:time_start']); });

var lst8 = ee.ImageCollection('MODIS/061/MOD11A2').filterDate(BASE[0], BASE[1]).select('LST_Day_1km');
var months = ee.List.sequence(0, ee.Date(BASE[1]).difference(ee.Date(BASE[0]), 'month').subtract(1));
var lst = ee.ImageCollection.fromImages(months.map(function(n) {
  var s = ee.Date(BASE[0]).advance(n, 'month');
  return lst8.filterDate(s, s.advance(1, 'month')).mean().multiply(0.02).subtract(273.15)
    .rename('LST').set('system:time_start', s.millis());
}));

// ---------- 3 Processing: VCI, TCI, VHI per calendar month ----------
function condition(col, band, date, inverse) {
  var m = date.get('month');
  var sameMonth = col.filter(ee.Filter.calendarRange(m, m, 'month'));
  var mn = sameMonth.min(), mx = sameMonth.max();
  var cur = col.filterDate(date, date.advance(1, 'month')).first();
  var idx = inverse ? mx.subtract(cur).divide(mx.subtract(mn)) : cur.subtract(mn).divide(mx.subtract(mn));
  return idx.multiply(100).rename(band);
}
var vci = condition(ndvi, 'VCI', TARGET, false).clip(nt);
var tci = condition(lst, 'TCI', TARGET, true).clip(nt);
var vhi = vci.multiply(0.5).add(tci.multiply(0.5)).rename('VHI');

// ---------- SPI-type index: standardised 3- and 12-month precipitation (z-score of totals) ----------
var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD').select('precipitation');
function spa(date, nMonths) {
  var end = date.advance(1, 'month');
  var current = chirps.filterDate(end.advance(-nMonths, 'month'), end).sum();
  var hist = ee.ImageCollection.fromImages(ee.List.sequence(1991, 2020).map(function(y) {
    var e = ee.Date.fromYMD(y, end.get('month'), 1);
    return chirps.filterDate(e.advance(-nMonths, 'month'), e).sum();
  }));
  return current.subtract(hist.mean()).divide(hist.reduce(ee.Reducer.stdDev())).rename('SPA' + nMonths);
}
var spa3 = spa(TARGET, 3).clip(nt);
var spa12 = spa(TARGET, 12).clip(nt);

// ---------- TerraClimate Palmer Drought Severity Index (scale 0.01) ----------
var pdsi = ee.ImageCollection('IDAHO_EPSCOR/TERRACLIMATE').select('pdsi')
  .filterDate(TARGET, TARGET.advance(1, 'month')).first().multiply(0.01).clip(nt);

// ---------- 4 Analysis: VHI time series for the Alice Springs region ----------
var vhiSeries = ee.ImageCollection.fromImages(ee.List.sequence(0, 59).map(function(n) {
  var d = ee.Date('2017-01-01').advance(n, 'month');
  var v = condition(ndvi, 'VCI', d, false), t = condition(lst, 'TCI', d, true);
  return v.multiply(0.5).add(t.multiply(0.5)).rename('VHI').addBands(v).addBands(t).set('system:time_start', d.millis());
}));
print(ui.Chart.image.series(vhiSeries, alice, ee.Reducer.mean(), 5000)
  .setOptions({title: 'Alice Springs region: VCI, TCI, VHI 2017–2021', vAxis: {viewWindow: {min: 0, max: 100}}}));

// Drought area: VHI < 40 = drought (Kogan's convention)
var droughtKm2 = ee.Image.pixelArea().divide(1e6).updateMask(vhi.lt(40))
  .reduceRegion({reducer: ee.Reducer.sum(), geometry: nt.geometry(), scale: 1000, maxPixels: 1e11});
print('NT area with VHI < 40 in target month (km²)', droughtKm2);

// ---------- 5 Visualise ----------
var ci = {min: 0, max: 100, palette: ['#a50026', '#f46d43', '#fee08b', '#d9ef8b', '#66bd63', '#006837']};
Map.addLayer(vci, ci, 'VCI');
Map.addLayer(tci, ci, 'TCI', false);
Map.addLayer(vhi, ci, 'VHI');
Map.addLayer(spa3, {min: -2, max: 2, palette: ['#8c510a', '#f5f5f5', '#01665e']}, 'SPI-type 3-month', false);
Map.addLayer(spa12, {min: -2, max: 2, palette: ['#8c510a', '#f5f5f5', '#01665e']}, 'SPI-type 12-month', false);
Map.addLayer(pdsi, {min: -4, max: 4, palette: ['#8c510a', '#f5f5f5', '#01665e']}, 'PDSI (TerraClimate)', false);
Map.addLayer(ee.Image().paint(alice, 0, 2), {palette: 'black'}, 'Alice Springs region');

// ---------- 6 Export ----------
Export.image.toDrive({image: vci.addBands(tci).addBands(vhi).addBands(spa3).addBands(spa12).float(),
  description: 'Prac03b_drought_indices_201910', folder: 'GEE_NT', region: nt.geometry().bounds(), scale: 1000, crs: 'EPSG:3577', maxPixels: 1e11});

// Q: Where was vegetation stress greatest in Oct 2019? Do VCI and TCI agree?
// Q: Compare the 3- and 12-month SPI-type maps. Which reflects meteorological and which hydrological/agricultural drought?
// Q: Why are VCI/TCI computed per calendar month rather than across all months?
// EXT: Our SPI-type index is a z-score of totals. True SPI fits a gamma distribution, then transforms to a standard normal.
//      Implement it in the Code Editor: method-of-moments shape k = mean²/var and scale θ = var/mean from the 1991–2020 totals;
//      G = current.divide(θ).gammainc(k)  (regularised lower incomplete gamma);  SPI = √2 · erfInv(2G − 1)  (ee.Image.erfInv).
//      Compare the gamma SPI map with the z-score map and explain the differences in arid central Australia.
// EXT: Evaluate each index as a trigger for drought assistance to pastoralists: lag, false alarms and spatial resolution.
