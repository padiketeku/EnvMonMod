/**** Prac 03b — Drought indices: VCI, TCI, VHI, SPI-type index and PDSI (Northern Territory)
 * Focus: 2019 — Australia's driest year on record — in central Australia (Alice Springs region).
 * Data: MODIS MOD13A3 (monthly NDVI, 1 km), MOD11A2 (8-day LST, 1 km), CHIRPS pentad, TerraClimate.
 *
 * WHAT THIS SCRIPT DOES:
 *   Asks: how severe and how widespread was drought in the NT in October 2019, and do different drought indices agree?
 *   It maps satellite vegetation and temperature indices (VCI, TCI, VHI), a rainfall-based SPI-type index over 3 and
 *   12 months, and the Palmer Drought Severity Index, then charts VHI for the Alice Springs region over 2017–2021.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) Optional EDIT: TARGET (section 1) sets the month to map (first day of the month, 2001–2024).
 *   (3) Click Run.
 *   (4) Read the chart and drought area in the Console (right panel), turn layers on/off in the Map's Layers list,
 *       and start the export in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   Map layers (0–100, red = stressed, green = healthy): VCI, TCI, VHI. Also SPI-type 3- and 12-month maps and PDSI
 *   (brown = dry, teal = wet) and the Alice Springs region outline.
 *   Console: a VCI/TCI/VHI time-series chart (Alice Springs region, 2017–2021) and the NT area (km²) with VHI < 40.
 *
 * DATA:
 *   MODIS/061/MOD13A3 — monthly NDVI, 1 km, 2001–2024 used here (scale factor 0.0001).
 *   MODIS/061/MOD11A2 — 8-day daytime land surface temperature, 1 km, 2001–2024 used here (scale 0.02, kelvin).
 *   UCSB-CHG/CHIRPS/PENTAD — rainfall, 5-day totals (mm), 0.05° (~5.5 km); 1991–2020 baseline plus the target period.
 *   IDAHO_EPSCOR/TERRACLIMATE — monthly PDSI, ~4 km (1/24°), target month only (scale 0.01).
 *   FAO/GAUL/2015/level1 — state boundaries (NT outline).
 *
 * LINKS:
 *   Prac page: pracs/prac03-climate-and-hydrology-drivers-rainfall-anomalies-drought-indices-lst-and-et.md
 *   Assessment: Prac 03; AT2 (climate drivers); AT4 Part 3.
 *
 * KEY GEE IDEAS:
 *   - Scale factors: MODIS bands are stored as integers and must be multiplied (and offset) to get real units.
 *   - Calendar filtering: ee.Filter.calendarRange compares a month only with the same month in other years.
 *   - Reusable functions that return images, called many times inside map() to build a time series.
 *   - reduceRegion with ee.Image.pixelArea() to turn a mask into an area (km²).
 *
 * Q = core (ENV306 and ENV506).  EXT = ENV506 extension.
 ****/

// ---------- 1 Study area & parameters ----------
// The NT outline, a rectangle around Alice Springs for the time series, the month to map, and the baseline period.
var nt = ee.FeatureCollection('FAO/GAUL/2015/level1').filter(ee.Filter.eq('ADM1_NAME', 'Northern Territory'));
var alice = ee.Geometry.Rectangle([132.5, -24.5, 135.5, -22.5]);   // [west, south, east, north] in degrees
// EDIT (optional): the month to map. Use the first day of a month.
var TARGET = ee.Date('2019-10-01');   // month to map
var BASE = ['2001-01-01', '2025-01-01'];   // baseline record (end date exclusive) used for the min/max in VCI and TCI
Map.centerObject(nt, 5);

// ---------- 2 Data: monthly NDVI and LST ----------
// Both indices need one image per month. MOD13A3 is already monthly; MOD11A2 (8-day) is averaged into months here.
var ndvi = ee.ImageCollection('MODIS/061/MOD13A3').filterDate(BASE[0], BASE[1])
  // Scale factor 0.0001 converts stored integers to NDVI (−1 to 1). copyProperties keeps the date, which select() drops.
  .map(function(img) { return img.select('NDVI').multiply(0.0001).copyProperties(img, ['system:time_start']); });

var lst8 = ee.ImageCollection('MODIS/061/MOD11A2').filterDate(BASE[0], BASE[1]).select('LST_Day_1km');   // daytime LST
// A list of month numbers 0, 1, 2, ... (one per month in BASE: 288 months)
var months = ee.List.sequence(0, ee.Date(BASE[1]).difference(ee.Date(BASE[0]), 'month').subtract(1));
var lst = ee.ImageCollection.fromImages(months.map(function(n) {
  var s = ee.Date(BASE[0]).advance(n, 'month');   // first day of month n
  // Mean of the 8-day images in that month; × 0.02 gives kelvin; − 273.15 gives °C
  return lst8.filterDate(s, s.advance(1, 'month')).mean().multiply(0.02).subtract(273.15)
    .rename('LST').set('system:time_start', s.millis());
}));

// ---------- 3 Processing: VCI, TCI, VHI per calendar month ----------
// Kogan's indices rescale the current value between the record minimum and maximum FOR THE SAME CALENDAR MONTH,
// so a dry-season October is compared with other Octobers, not with the wet season. 0 = worst on record, 100 = best.
function condition(col, band, date, inverse) {
  var m = date.get('month');   // calendar month (1–12) of the date
  var sameMonth = col.filter(ee.Filter.calendarRange(m, m, 'month'));   // that month in every year 2001–2024
  var mn = sameMonth.min(), mx = sameMonth.max();   // per-pixel record low and high for that month
  var cur = col.filterDate(date, date.advance(1, 'month')).first();   // the image for the month being assessed
  // inverse = true for temperature: a HOT month is stressful, so (max − current) / (max − min) gives low TCI when hot.
  var idx = inverse ? mx.subtract(cur).divide(mx.subtract(mn)) : cur.subtract(mn).divide(mx.subtract(mn));
  return idx.multiply(100).rename(band);   // 0–100 scale
}
var vci = condition(ndvi, 'VCI', TARGET, false).clip(nt);   // Vegetation Condition Index (greenness)
var tci = condition(lst, 'TCI', TARGET, true).clip(nt);     // Temperature Condition Index (heat)
// Vegetation Health Index: equal-weight average of VCI and TCI
var vhi = vci.multiply(0.5).add(tci.multiply(0.5)).rename('VHI');

// ---------- SPI-type index: standardised 3- and 12-month precipitation (z-score of totals) ----------
// Rainfall over the last 3 (or 12) months ending with the target month, expressed as a z-score against the
// same window in 1991–2020. Short windows track meteorological drought; long windows track hydrological drought.
var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD').select('precipitation');
function spa(date, nMonths) {
  var end = date.advance(1, 'month');   // window ends at the end of the target month (end date is exclusive)
  var current = chirps.filterDate(end.advance(-nMonths, 'month'), end).sum();   // current nMonths rainfall total (mm)
  // The same window in each baseline year 1991–2020 (30 totals)
  var hist = ee.ImageCollection.fromImages(ee.List.sequence(1991, 2020).map(function(y) {
    var e = ee.Date.fromYMD(y, end.get('month'), 1);
    return chirps.filterDate(e.advance(-nMonths, 'month'), e).sum();
  }));
  return current.subtract(hist.mean()).divide(hist.reduce(ee.Reducer.stdDev())).rename('SPA' + nMonths);   // z = (x − mean) / SD
}
var spa3 = spa(TARGET, 3).clip(nt);    // Aug–Oct 2019 by default
var spa12 = spa(TARGET, 12).clip(nt);  // Nov 2018–Oct 2019 by default

// ---------- TerraClimate Palmer Drought Severity Index (scale 0.01) ----------
// PDSI is a modelled soil-water balance index. About −4 or lower = extreme drought; +4 or higher = extremely wet.
var pdsi = ee.ImageCollection('IDAHO_EPSCOR/TERRACLIMATE').select('pdsi')
  // × 0.01 converts stored integers to PDSI units
  .filterDate(TARGET, TARGET.advance(1, 'month')).first().multiply(0.01).clip(nt);

// ---------- 4 Analysis: VHI time series for the Alice Springs region ----------
// Recomputes VCI, TCI and VHI for each of 60 months (Jan 2017 – Dec 2021) to show the drought building and breaking.
var vhiSeries = ee.ImageCollection.fromImages(ee.List.sequence(0, 59).map(function(n) {
  var d = ee.Date('2017-01-01').advance(n, 'month');
  var v = condition(ndvi, 'VCI', d, false), t = condition(lst, 'TCI', d, true);
  // 3 bands = 3 chart lines
  return v.multiply(0.5).add(t.multiply(0.5)).rename('VHI').addBands(v).addBands(t).set('system:time_start', d.millis());
}));
// Mean over the Alice Springs rectangle at 5000 m: coarser than the 1 km data, which keeps the chart quick to compute.
print(ui.Chart.image.series(vhiSeries, alice, ee.Reducer.mean(), 5000)
  .setOptions({title: 'Alice Springs region: VCI, TCI, VHI 2017–2021', vAxis: {viewWindow: {min: 0, max: 100}}}));

// Drought area: VHI < 40 = drought (Kogan's convention)
// pixelArea() gives each pixel's area in m²; ÷ 1e6 = km². The mask keeps only drought pixels, then sum() adds them up.
var droughtKm2 = ee.Image.pixelArea().divide(1e6).updateMask(vhi.lt(40))
  .reduceRegion({reducer: ee.Reducer.sum(), geometry: nt.geometry(), scale: 1000, maxPixels: 1e11});
  // scale 1000 m = MODIS resolution; maxPixels raised because the NT holds well over the default 10 million pixels
print('NT area with VHI < 40 in target month (km²)', droughtKm2);   // the result is a dictionary, key 'area'

// ---------- 5 Visualise ----------
// One shared 0–100 palette for VCI, TCI and VHI (red = poor condition, green = good).
// Z-score and PDSI layers use brown (dry) to teal (wet). Layers with 'false' start off — tick them in Layers.
var ci = {min: 0, max: 100, palette: ['#a50026', '#f46d43', '#fee08b', '#d9ef8b', '#66bd63', '#006837']};
Map.addLayer(vci, ci, 'VCI');
Map.addLayer(tci, ci, 'TCI', false);
Map.addLayer(vhi, ci, 'VHI');
Map.addLayer(spa3, {min: -2, max: 2, palette: ['#8c510a', '#f5f5f5', '#01665e']}, 'SPI-type 3-month', false);
Map.addLayer(spa12, {min: -2, max: 2, palette: ['#8c510a', '#f5f5f5', '#01665e']}, 'SPI-type 12-month', false);
Map.addLayer(pdsi, {min: -4, max: 4, palette: ['#8c510a', '#f5f5f5', '#01665e']}, 'PDSI (TerraClimate)', false);
// paint(geometry, colour, width) draws an outline only
Map.addLayer(ee.Image().paint(alice, 0, 2), {palette: 'black'}, 'Alice Springs region');

// ---------- 6 Export ----------
// A 5-band GeoTIFF (VCI, TCI, VHI, SPA3, SPA12) to the GEE_NT folder in Google Drive. Start it in the Tasks tab.
Export.image.toDrive({image: vci.addBands(tci).addBands(vhi).addBands(spa3).addBands(spa12).float(),
  description: 'Prac03b_drought_indices_201910', folder: 'GEE_NT', region: nt.geometry().bounds(), scale: 1000, crs: 'EPSG:3577', maxPixels: 1e11});
  // EPSG:3577 = GDA94 / Australian Albers, an equal-area projection suited to measuring areas across Australia.
  // The file name says 201910; change the description if you change TARGET.

// Q: Where was vegetation stress greatest in Oct 2019? Do VCI and TCI agree?
// Q: Compare the 3- and 12-month SPI-type maps. Which reflects meteorological and which hydrological/agricultural drought?
// Q: Why are VCI/TCI computed per calendar month rather than across all months?
// EXT: Our SPI-type index is a z-score of totals. True SPI fits a gamma distribution, then transforms to a standard normal.
//      Implement it in the Code Editor: method-of-moments shape k = mean²/var and scale θ = var/mean from the 1991–2020 totals;
//      G = current.divide(θ).gammainc(k)  (regularised lower incomplete gamma);  SPI = √2 · erfInv(2G − 1)  (ee.Image.erfInv).
//      Compare the gamma SPI map with the z-score map and explain the differences in arid central Australia.
// EXT: Evaluate each index as a trigger for drought assistance to pastoralists: lag, false alarms and spatial resolution.
