/**** Prac 07b — Fire frequency, seasonality and time since fire (Northern Territory)
 * Data: MODIS MCD64A1 v6.1 burned area (500 m, monthly, Nov 2000–present); ESA FireCCI51 (250 m, 2001–2020) as a cross-check.
 * NT savanna fire management splits the year at 1 August: early dry season (EDS) vs late dry season (LDS).
 ****/

// ---------- 1 Study area ----------
var nt = ee.FeatureCollection('FAO/GAUL/2015/level1').filter(ee.Filter.eq('ADM1_NAME', 'Northern Territory'));
// Approximate western Arnhem Land box (digitise the WALFA boundary for real analysis)
var arnhem = ee.Geometry.Rectangle([133.0, -13.3, 134.3, -12.0]);
Map.centerObject(nt, 5);

var START = 2001, END = 2024;
var years = ee.List.sequence(START, END);

// ---------- 2 Data ----------
var mcd = ee.ImageCollection('MODIS/061/MCD64A1').select('BurnDate');

// ---------- 3 Processing: one image per year ----------
var annual = ee.ImageCollection.fromImages(years.map(function(y) {
  y = ee.Number(y);
  var bd = mcd.filter(ee.Filter.calendarRange(y, y, 'year')).max();   // day of year burned (0 = not burned)
  var burned = bd.gt(0).unmask(0).rename('burned');
  var eds = bd.gt(0).and(bd.lt(213)).unmask(0).rename('eds');
  var lds = bd.gte(213).unmask(0).rename('lds');
  var lastYear = burned.multiply(y).rename('yearBurned');
  return burned.addBands([eds, lds, lastYear]).set('year', y)
    .set('system:time_start', ee.Date.fromYMD(y, 7, 1).millis());
}));

var frequency = annual.select('burned').sum().clip(nt).rename('fire_frequency');
var ldsFreq = annual.select('lds').sum().clip(nt);
var lastFire = annual.select('yearBurned').max().selfMask();
var timeSinceFire = ee.Image(END).subtract(lastFire).clip(nt).rename('years_since_fire');
// Proportion of fires that occur late in the dry season
var ldsShare = ldsFreq.divide(frequency).updateMask(frequency.gt(0)).rename('LDS_share');

// ---------- 4 Analysis: area burned per year, EDS vs LDS ----------
var areaKm2 = ee.Image.pixelArea().divide(1e6);
function areaSeries(region, label) {
  var fc = annual.map(function(img) {
    var a = img.select(['eds', 'lds']).multiply(areaKm2).reduceRegion({
      reducer: ee.Reducer.sum(), geometry: region, scale: 500, maxPixels: 1e11});
    return ee.Feature(null, {year: img.get('year'), EDS_km2: a.get('eds'), LDS_km2: a.get('lds')});
  });
  print(ui.Chart.feature.byFeature(fc, 'year', ['EDS_km2', 'LDS_km2']).setChartType('ColumnChart')
    .setOptions({title: 'Area burned by season: ' + label, isStacked: true,
                 colors: ['#4daf4a', '#e41a1c'], vAxis: {title: 'km²'}}));
  return fc;
}
var arnhemSeries = areaSeries(arnhem, 'western Arnhem Land (approx.)');
var ntSeries = areaSeries(nt.geometry(), 'Northern Territory');

// ---------- 4b Product comparison: MCD64A1 vs ESA FireCCI51 (2001–2020) ----------
// FireCCI51 (250 m, MODIS red/NIR) maps smaller fires than MCD64A1 (500 m). AT4 Part 3 uses this check for your tile.
var TILE = ee.Geometry.Rectangle([131.0, -14.2, 131.2, -14.0]);   // replace with your tile from prac00
var cci = ee.ImageCollection('ESA/CCI/FireCCI/5_1');
var compare = ee.FeatureCollection(ee.List.sequence(START, 2020).map(function(y) {
  y = ee.Number(y);
  var cciBurn = cci.filter(ee.Filter.calendarRange(y, y, 'year')).select('BurnDate').max().gt(0).unmask(0);
  var mcdBurn = mcd.filter(ee.Filter.calendarRange(y, y, 'year')).max().gt(0).unmask(0);
  var a = areaKm2.multiply(mcdBurn).rename('MCD64A1_km2')
    .addBands(areaKm2.multiply(cciBurn).rename('FireCCI51_km2'))
    .addBands(areaKm2.multiply(mcdBurn.and(cciBurn)).rename('both_km2'))
    .reduceRegion({reducer: ee.Reducer.sum(), geometry: TILE, scale: 250, maxPixels: 1e10});
  return ee.Feature(null, a).set('year', y);
}));
print(ui.Chart.feature.byFeature(compare, 'year', ['MCD64A1_km2', 'FireCCI51_km2', 'both_km2'])
  .setOptions({title: 'Burned area in your tile: MCD64A1 vs FireCCI51', vAxis: {title: 'km²'}, pointSize: 3}));
// Q: In which years do the products disagree most? Relate this to fire size and the season of burning.

// ---------- 5 Visualise ----------
Map.addLayer(frequency.selfMask(), {min: 1, max: 20, palette: ['#ffffb2', '#fecc5c', '#fd8d3c', '#f03b20', '#bd0026']},
  'Fire frequency ' + START + '–' + END + ' (years burned)');
Map.addLayer(ldsShare, {min: 0, max: 1, palette: ['#1a9641', '#ffffbf', '#d7191c']}, 'Share of fires in late dry season', false);
Map.addLayer(timeSinceFire, {min: 0, max: 15, palette: ['#d7191c', '#fdae61', '#a6d96a', '#1a9641']}, 'Years since last fire', false);
Map.addLayer(ee.Image().paint(arnhem, 0, 2), {palette: 'blue'}, 'Western Arnhem Land box');

// ---------- 6 Export ----------
Export.image.toDrive({image: frequency.addBands(ldsShare).addBands(timeSinceFire).float(),
  description: 'Prac07b_fire_regime_NT', folder: 'GEE_NT', region: nt.geometry().bounds(),
  scale: 500, crs: 'EPSG:3577', maxPixels: 1e11});   // EPSG:3577 = GDA94 / Australian Albers (equal area)
Export.table.toDrive({collection: arnhemSeries, description: 'Prac07b_Arnhem_EDS_LDS', folder: 'GEE_NT'});
Export.table.toDrive({collection: compare, description: 'Prac07b_tile_MCD64A1_vs_FireCCI51', folder: 'GEE_NT'});

// Q: Where in the NT do fires occur most often? Relate the pattern to rainfall and fuel (grass) production.
// Q: Describe the trend in the EDS vs LDS split in western Arnhem Land since 2006 (start of WALFA). What might explain it?
// Q: Why does the 500 m MODIS product miss many small early-season fires?
// EXT: Test whether the LDS share decreased after 2006 (Mann–Kendall, Prac 02a), and compare inside vs outside the project area (BACI-style design).
// EXT: Validate MCD64A1 against NAFI fire scars (Landsat/Sentinel-derived, firenorth.org.au) for one year; report omission and commission.
