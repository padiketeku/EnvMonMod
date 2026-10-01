/**** Prac 03c — Land surface temperature and evapotranspiration (Northern Territory)
 * Part A: Darwin urban heat (Landsat 8/9 surface temperature, 30 m resampled from 100 m TIRS)
 * Part B: Daly River basin LST and ET seasonality (MODIS MOD11A2, MOD16A2)
 ****/

// ======================= Part A — Darwin urban heat =======================
var darwin = ee.Geometry.Rectangle([130.80, -12.52, 131.05, -12.33]);
Map.centerObject(darwin, 11);

function prep(img) {
  var qa = img.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(1 << 3).eq(0).and(qa.bitwiseAnd(1 << 4).eq(0));
  var stC = img.select('ST_B10').multiply(0.00341802).add(149.0).subtract(273.15).rename('LST_C');
  var sr = img.select(['SR_B4', 'SR_B5']).multiply(0.0000275).add(-0.2);
  return stC.addBands(sr.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI')).updateMask(mask)
    .copyProperties(img, ['system:time_start']);
}
var ls = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2').merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
  .filterBounds(darwin).filter(ee.Filter.calendarRange(9, 11, 'month'))   // build-up season
  .filterDate('2021-01-01', '2025-01-01').map(prep);
var lstDarwin = ls.median().clip(darwin);
Map.addLayer(lstDarwin.select('LST_C'), {min: 30, max: 55, palette: ['#313695', '#74add1', '#ffffbf', '#f46d43', '#a50026']}, 'A: LST (°C) Sep–Nov median');
Map.addLayer(lstDarwin.select('NDVI'), {min: 0, max: 0.8, palette: ['white', 'green']}, 'A: NDVI', false);

// LST vs NDVI relationship (sample)
var sample = lstDarwin.sample({region: darwin, scale: 30, numPixels: 2000, seed: 3, geometries: false});
print(ui.Chart.feature.byFeature(sample, 'NDVI', 'LST_C').setChartType('ScatterChart')
  .setOptions({title: 'Darwin: LST vs NDVI (build-up season)', pointSize: 2, trendlines: {0: {}}}));

// ======================= Part B — Daly River basin =======================
var basin = ee.FeatureCollection('WWF/HydroSHEDS/v1/Basins/hybas_5')
  .filterBounds(ee.Geometry.Point([131.25, -14.07]));   // Daly River near Oolloo — check the basin outline
Map.addLayer(basin.style({color: 'blue', fillColor: '00000000'}), {}, 'B: HydroSHEDS basin (level 5)');
print('Basin area (km²)', basin.geometry().area(100).divide(1e6));

var START = '2003-01-01', END = '2025-01-01';
var lstM = ee.ImageCollection('MODIS/061/MOD11A2').filterDate(START, END).select(['LST_Day_1km', 'LST_Night_1km']);
var et = ee.ImageCollection('MODIS/061/MOD16A2').filterDate(START, END).select(['ET', 'PET']);
var rain = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD').filterDate(START, END).select('precipitation');

// Monthly climatologies
var clim = ee.ImageCollection.fromImages(ee.List.sequence(1, 12).map(function(m) {
  var l = lstM.filter(ee.Filter.calendarRange(m, m, 'month')).mean().multiply(0.02).subtract(273.15);
  // MOD16A2: 8-day sums, scale 0.1 mm. Mean 8-day value × (days in month / 8) ≈ monthly total.
  var e = et.filter(ee.Filter.calendarRange(m, m, 'month')).mean().multiply(0.1).multiply(30.4 / 8);
  var nYears = 22;
  var p = rain.filter(ee.Filter.calendarRange(m, m, 'month')).sum().divide(nYears).rename('P_mm');
  return l.addBands(e.rename(['ET_mm', 'PET_mm'])).addBands(p).set('month', m);
}));
print(ui.Chart.image.series(clim.select(['P_mm', 'ET_mm', 'PET_mm']), basin, ee.Reducer.mean(), 1000, 'month')
  .setOptions({title: 'Daly basin: rainfall, actual ET and potential ET (mm/month)', hAxis: {title: 'Month'}}));
print(ui.Chart.image.series(clim.select(['LST_Day_1km', 'LST_Night_1km']), basin, ee.Reducer.mean(), 1000, 'month')
  .setOptions({title: 'Daly basin: day and night LST (°C)', hAxis: {title: 'Month'}}));

// Evaporative stress index for the late dry season: 1 − ET/PET
var lateDry = et.filter(ee.Filter.calendarRange(9, 10, 'month')).filterDate('2023-01-01', '2024-01-01').mean();
var esi = ee.Image(1).subtract(lateDry.select('ET').divide(lateDry.select('PET'))).rename('ESI').clip(basin);
Map.addLayer(esi, {min: 0.3, max: 1, palette: ['#1a9850', '#ffffbf', '#d73027']}, 'B: Evaporative stress (1 − ET/PET), Sep–Oct 2023', false);
var annualET = et.select('ET').filterDate('2023-01-01', '2024-01-01').sum().multiply(0.1).clip(basin);
Map.addLayer(annualET, {min: 200, max: 1200, palette: ['#ffffcc', '#41b6c4', '#0c2c84']}, 'B: Annual ET 2023 (mm)', false);

// ---------- Export ----------
Export.table.toDrive({collection: clim.map(function(img) {
    return ee.Feature(null, img.reduceRegion(ee.Reducer.mean(), basin.geometry(), 1000, null, null, false, 1e10)).set('month', img.get('month'));
  }), description: 'Prac03c_Daly_climatology', folder: 'GEE_NT'});

// Q: Which Darwin land covers are hottest and coolest? Quantify the LST–NDVI relationship and suggest urban planning responses.
// Q: In which months does PET exceed rainfall in the Daly basin? What sustains dry-season river flow (hint: groundwater from limestone aquifers)?
// Q: Where is evaporative stress highest late in the dry season? Relate this to riparian vegetation and irrigation.
// EXT: Compare MOD16 ET with ET from a second product (e.g. PML_V2 'CAS/IGSNRR/PML/V2_v018' if available) and discuss uncertainty for water allocation planning.
// EXT: Compute a simple basin water balance P − ET over 2003–2024 and compare with gauged discharge (NT Water Data portal).
