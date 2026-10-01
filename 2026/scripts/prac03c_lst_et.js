/**** Prac 03c — Land surface temperature and evapotranspiration (Northern Territory)
 * Part A: Darwin urban heat (Landsat 8/9 surface temperature, 30 m resampled from 100 m TIRS)
 * Part B: Daly River basin LST and ET seasonality (MODIS MOD11A2, MOD16A2)
 *
 * WHAT THIS SCRIPT DOES:
 *   Part A asks: which parts of Darwin are hottest in the build-up (Sep–Nov), and how does surface temperature relate
 *   to vegetation? It builds a median Landsat LST and NDVI composite for 2021–2024 and plots LST against NDVI.
 *   Part B asks: how do rainfall, evapotranspiration (ET) and temperature change through the year in the Daly River
 *   basin? It builds monthly climatologies (2003–2024) and maps late-dry-season evaporative stress and annual ET.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) No EDIT lines are required. You may change the dates (START, END or the filterDate lines) to explore.
 *   (3) Click Run.
 *   (4) Read the charts and basin area in the Console (right panel), turn layers on/off in the Map's Layers list,
 *       and start the export in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   Map layers: A: LST (°C) and NDVI for Darwin; B: Daly basin outline, evaporative stress (1 − ET/PET) Sep–Oct 2023,
 *   annual ET 2023 (mm). The map opens on Darwin; zoom out to the south-west to see the Daly basin.
 *   Console: Darwin LST vs NDVI scatter plot; Daly basin area (km²); monthly P/ET/PET chart; monthly day/night LST chart.
 *
 * DATA:
 *   LANDSAT/LC08/C02/T1_L2 and LANDSAT/LC09/C02/T1_L2 — Landsat 8/9 Collection 2 Level 2 surface reflectance and
 *     surface temperature, 30 m (thermal band collected at 100 m), Sep–Nov 2021–2024.
 *   WWF/HydroSHEDS/v1/Basins/hybas_5 — HydroSHEDS level 5 river basins (vector).
 *   MODIS/061/MOD11A2 — 8-day day and night LST, 1 km, 2003–2024.
 *   MODIS/061/MOD16A2 — 8-day actual ET and potential ET, 500 m, 2003–2024.
 *   UCSB-CHG/CHIRPS/PENTAD — rainfall, 5-day totals (mm), 0.05° (~5.5 km), 2003–2024.
 *
 * LINKS:
 *   Prac page: pracs/prac03-climate-and-hydrology-drivers-rainfall-anomalies-drought-indices-lst-and-et.md
 *   Assessment: Prac 03; AT2 (climate drivers); AT4 Part 3.
 *
 * KEY GEE IDEAS:
 *   - Cloud masking with bitwiseAnd on a QA band, and scale factors/offsets to convert stored integers to real units.
 *   - map() a function over every image in a collection, then median() to make a cloud-reduced composite.
 *   - Monthly climatologies with ee.Filter.calendarRange, built inside ee.List.sequence(1, 12).map().
 *   - reduceRegion over a basin, and Export.table.toDrive to save the numbers as a CSV.
 *
 * Q = core (ENV306 and ENV506).  EXT = ENV506 extension.
 ****/

// ======================= Part A — Darwin urban heat =======================
// Landsat surface temperature shows how hot the ground surface gets (not air temperature).
// Roofs, roads and bare ground heat up; trees and water stay cooler. We test this with an LST–NDVI plot.
var darwin = ee.Geometry.Rectangle([130.80, -12.52, 131.05, -12.33]);   // [west, south, east, north]
Map.centerObject(darwin, 11);

// prep() is applied to every Landsat image: mask cloud, convert to °C and reflectance, add NDVI.
function prep(img) {
  var qa = img.select('QA_PIXEL');   // bit-packed quality band
  // Bit 3 = cloud, bit 4 = cloud shadow. (1 << 3) is 8, i.e. only bit 3 set; .eq(0) keeps pixels where the bit is off.
  var mask = qa.bitwiseAnd(1 << 3).eq(0).and(qa.bitwiseAnd(1 << 4).eq(0));
  // Collection 2 surface temperature: × 0.00341802 + 149.0 gives kelvin; − 273.15 gives °C
  var stC = img.select('ST_B10').multiply(0.00341802).add(149.0).subtract(273.15).rename('LST_C');
  var sr = img.select(['SR_B4', 'SR_B5']).multiply(0.0000275).add(-0.2);   // red and NIR to reflectance (0–1)
  // NDVI = (NIR − red) / (NIR + red)
  return stC.addBands(sr.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI')).updateMask(mask)
    .copyProperties(img, ['system:time_start']);   // keep the acquisition date
}
// pool Landsat 8 and 9
var ls = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2').merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
  .filterBounds(darwin).filter(ee.Filter.calendarRange(9, 11, 'month'))   // build-up season
  .filterDate('2021-01-01', '2025-01-01').map(prep);   // four build-up seasons, 2021–2024
// Median, not mean: it ignores the occasional too-hot or too-cold value left by missed cloud or haze.
var lstDarwin = ls.median().clip(darwin);
Map.addLayer(lstDarwin.select('LST_C'), {min: 30, max: 55, palette: ['#313695', '#74add1', '#ffffbf', '#f46d43', '#a50026']}, 'A: LST (°C) Sep–Nov median');
Map.addLayer(lstDarwin.select('NDVI'), {min: 0, max: 0.8, palette: ['white', 'green']}, 'A: NDVI', false);

// LST vs NDVI relationship (sample)
// 2000 random 30 m pixels (seed: 3 makes the sample repeatable); geometries: false because only the values are needed.
var sample = lstDarwin.sample({region: darwin, scale: 30, numPixels: 2000, seed: 3, geometries: false});
print(ui.Chart.feature.byFeature(sample, 'NDVI', 'LST_C').setChartType('ScatterChart')   // x = NDVI, y = LST
  // trendlines adds a linear fit
  .setOptions({title: 'Darwin: LST vs NDVI (build-up season)', pointSize: 2, trendlines: {0: {}}}));

// ======================= Part B — Daly River basin =======================
// Monthly averages over 2003–2024 show the wet–dry cycle in rainfall, ET and temperature for a whole catchment.
// The basin is the HydroSHEDS level 5 polygon that contains a point on the Daly River near Oolloo.
var basin = ee.FeatureCollection('WWF/HydroSHEDS/v1/Basins/hybas_5')
  .filterBounds(ee.Geometry.Point([131.25, -14.07]));   // Daly River near Oolloo — check the basin outline
// '00000000' = transparent fill
Map.addLayer(basin.style({color: 'blue', fillColor: '00000000'}), {}, 'B: HydroSHEDS basin (level 5)');
print('Basin area (km²)', basin.geometry().area(100).divide(1e6));   // area() in m² (100 m max error); ÷ 1e6 = km²

var START = '2003-01-01', END = '2025-01-01';   // 22 full years (END is exclusive)
var lstM = ee.ImageCollection('MODIS/061/MOD11A2').filterDate(START, END).select(['LST_Day_1km', 'LST_Night_1km']);
var et = ee.ImageCollection('MODIS/061/MOD16A2').filterDate(START, END).select(['ET', 'PET']);   // actual and potential ET
var rain = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD').filterDate(START, END).select('precipitation');

// Monthly climatologies
// One image per calendar month (1–12), each holding mean day/night LST (°C), ET and PET (mm/month) and rainfall (mm/month).
var clim = ee.ImageCollection.fromImages(ee.List.sequence(1, 12).map(function(m) {
  // MODIS LST scale 0.02 → kelvin → °C
  var l = lstM.filter(ee.Filter.calendarRange(m, m, 'month')).mean().multiply(0.02).subtract(273.15);
  // MOD16A2: 8-day sums, scale 0.1 mm. Mean 8-day value × (days in month / 8) ≈ monthly total.
  // 30.4 = average days per month
  var e = et.filter(ee.Filter.calendarRange(m, m, 'month')).mean().multiply(0.1).multiply(30.4 / 8);
  var nYears = 22;   // number of years in START–END
  // Sum of all of this month's pentads over 22 years ÷ 22 = mean monthly rainfall (mm)
  var p = rain.filter(ee.Filter.calendarRange(m, m, 'month')).sum().divide(nYears).rename('P_mm');
  return l.addBands(e.rename(['ET_mm', 'PET_mm'])).addBands(p).set('month', m);
}));
// Basin-mean values by month. scale 1000 m matches the coarsest MODIS layer (LST) and keeps the reduction quick.
print(ui.Chart.image.series(clim.select(['P_mm', 'ET_mm', 'PET_mm']), basin, ee.Reducer.mean(), 1000, 'month')
  .setOptions({title: 'Daly basin: rainfall, actual ET and potential ET (mm/month)', hAxis: {title: 'Month'}}));
print(ui.Chart.image.series(clim.select(['LST_Day_1km', 'LST_Night_1km']), basin, ee.Reducer.mean(), 1000, 'month')
  .setOptions({title: 'Daly basin: day and night LST (°C)', hAxis: {title: 'Month'}}));

// Evaporative stress index for the late dry season: 1 − ET/PET
// ET/PET near 1 = plants have water to evaporate as fast as the air demands; near 0 = water-limited.
// So ESI near 1 = high stress. Scale factors cancel in the ratio, so no × 0.1 is needed here.
var lateDry = et.filter(ee.Filter.calendarRange(9, 10, 'month')).filterDate('2023-01-01', '2024-01-01').mean();   // Sep–Oct 2023
var esi = ee.Image(1).subtract(lateDry.select('ET').divide(lateDry.select('PET'))).rename('ESI').clip(basin);
Map.addLayer(esi, {min: 0.3, max: 1, palette: ['#1a9850', '#ffffbf', '#d73027']}, 'B: Evaporative stress (1 − ET/PET), Sep–Oct 2023', false);
// Sum of all 8-day ET totals in 2023, × 0.1 → mm per year
var annualET = et.select('ET').filterDate('2023-01-01', '2024-01-01').sum().multiply(0.1).clip(basin);
Map.addLayer(annualET, {min: 200, max: 1200, palette: ['#ffffcc', '#41b6c4', '#0c2c84']}, 'B: Annual ET 2023 (mm)', false);

// ---------- Export ----------
// Turns each monthly climatology image into a table row of basin means, then saves the 12 rows as a CSV
// (the default format) to the GEE_NT folder in Google Drive. Start it in the Tasks tab; use the CSV for your own graphs.
Export.table.toDrive({collection: clim.map(function(img) {
    // reduceRegion arguments in order: reducer, geometry, scale (1000 m), crs (null = default), crsTransform (null),
    // bestEffort (false), maxPixels (1e10)
    return ee.Feature(null, img.reduceRegion(ee.Reducer.mean(), basin.geometry(), 1000, null, null, false, 1e10)).set('month', img.get('month'));
  }), description: 'Prac03c_Daly_climatology', folder: 'GEE_NT'});   // ee.Feature(null, ...) = a table row with no geometry

// Q: Which Darwin land covers are hottest and coolest? Quantify the LST–NDVI relationship and suggest urban planning responses.
// Q: In which months does PET exceed rainfall in the Daly basin? What sustains dry-season river flow (hint: groundwater from limestone aquifers)?
// Q: Where is evaporative stress highest late in the dry season? Relate this to riparian vegetation and irrigation.
// EXT: Compare MOD16 ET with ET from a second product (e.g. PML_V2 'CAS/IGSNRR/PML/V2_v018' if available) and discuss uncertainty for water allocation planning.
// EXT: Compute a simple basin water balance P − ET over 2003–2024 and compare with gauged discharge (NT Water Data portal).
