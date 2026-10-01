/**** Prac 08b — Flood mapping with Sentinel-1 SAR: Victoria River, Kalkarindji (NT), Feb–Mar 2023
 * A monsoonal low brought 200–300 mm in a week; Kalkarindji, Daguragu and Pigeon Hole were evacuated (~1 March 2023).
 * Method: change detection on VV backscatter between a dry reference and the flood period.
 * Units: statistics in linear σ⁰; dB for display only (see the SAR units convention below).
 ****/

// ---------- 1 Study area & dates ----------
var aoi = ee.Geometry.Rectangle([130.40, -17.80, 131.20, -17.00]);
var BEFORE = ['2022-10-01', '2022-11-30'];   // late dry season reference
var AFTER  = ['2023-02-25', '2023-03-15'];   // flood period: inspect individual dates below
Map.centerObject(aoi, 10);
Map.addLayer(ee.Geometry.Point([130.83, -17.43]), {color: 'red'}, 'Kalkarindji (approx.)');

// ---------- SAR units convention (ENV306/506) ----------
// COPERNICUS/S1_GRD stores backscatter (σ⁰) in dB. Averages, medians of composites, ratios, filters, thresholds and
// all statistics are computed in LINEAR power units; dB is used ONLY for display (map layers, chart axes).
// Thresholds quoted in dB in the literature are converted to linear with dbToLin().
function toLinear(img) {   // 10^(dB/10); keeps metadata (orbit, pass, date) for later filters
  img = ee.Image(img);
  return ee.Image(img.multiply(Math.LN10 / 10).exp().copyProperties(img, ['system:time_start'])).copyProperties(img);
}
function toDb(img) { return ee.Image(img).log10().multiply(10); }                                                    // display only
function dbToLin(x) { return Math.pow(10, x / 10); }

// ---------- 2 Data ----------
var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterBounds(aoi)
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
  .select(['VV', 'VH'])
  .map(toLinear);   // linear σ⁰ from here on

var afterCol = s1.filterDate(AFTER[0], AFTER[1]);
print('Flood-period acquisitions (date, pass, relative orbit)',
  afterCol.aggregate_array('system:time_start').map(function(t) { return ee.Date(t).format('YYYY-MM-dd'); }),
  afterCol.aggregate_array('orbitProperties_pass'), afterCol.aggregate_array('relativeOrbitNumber_start'));
// Same orbit for before & after avoids look-angle differences
var orbit = ee.Number(afterCol.first().get('relativeOrbitNumber_start'));
var beforeCol = s1.filterDate(BEFORE[0], BEFORE[1]).filter(ee.Filter.eq('relativeOrbitNumber_start', orbit));
afterCol = afterCol.filter(ee.Filter.eq('relativeOrbitNumber_start', orbit));
print('Images used: before / after', beforeCol.size(), afterCol.size());

// ---------- 3 Processing ----------
var SMOOTH = 50;   // metres; boxcar (mean) speckle filter, applied in linear units
var before = beforeCol.select('VV').mean().focalMean(SMOOTH, 'circle', 'meters').clip(aoi);
var after = afterCol.select('VV').min().focalMean(SMOOTH, 'circle', 'meters').clip(aoi);  // min = most water seen
var ratio = after.divide(before).rename('ratioVV');   // linear ratio (water darkens → ratio < 1)

var DIFF_T_DB = -3;    // a 3 dB drop ...
var WATER_T_DB = -16;  // ... to calm open water, typically darker than −16 dB in VV
var flood = ratio.lt(dbToLin(DIFF_T_DB)).and(after.lt(dbToLin(WATER_T_DB)));   // compared in linear: 0.50 and 0.025

// Refinement masks
var gsw = ee.Image('JRC/GSW1_4/GlobalSurfaceWater');
var permanent = gsw.select('seasonality').gte(10).unmask(0);
var slope = ee.Terrain.slope(ee.Image('NASA/NASADEM_HGT/001').select('elevation'));
flood = flood.and(permanent.not()).and(slope.lt(5));
flood = flood.updateMask(flood.connectedPixelCount(25, true).gte(8)).selfMask().rename('flood');

// ---------- 4 Analysis ----------
var floodKm2 = ee.Image.pixelArea().divide(1e6).updateMask(flood)
  .reduceRegion({reducer: ee.Reducer.sum(), geometry: aoi, scale: 10, maxPixels: 1e11, tileScale: 4});
print('Flooded area (km²)', floodKm2);

// Time series of mean VV over a floodplain point — shows the flood pulse
var probe = ee.Geometry.Point([130.83, -17.45]).buffer(1000);
var pulse = s1.filterDate('2022-10-01', '2023-06-30').select('VV').map(function(img) {
  var meanLin = ee.Number(img.reduceRegion(ee.Reducer.mean(), probe, 10).get('VV'));   // mean in linear units
  return ee.Feature(null, {date: img.date().millis(), VV_dB: meanLin.log10().multiply(10)}); // converted for display
});
print(ui.Chart.feature.byFeature(pulse, 'date', 'VV_dB')
  .setOptions({title: 'Mean VV near Kalkarindji (mean of linear σ⁰, shown in dB)', pointSize: 3, hAxis: {format: 'MMM yyyy'}}));

// ---------- 5 Visualise ----------
Map.addLayer(toDb(before), {min: -25, max: 0}, 'VV before (dB)');
Map.addLayer(toDb(after), {min: -25, max: 0}, 'VV flood period (dB)');
Map.addLayer(toDb(ratio), {min: -8, max: 8, palette: ['#08519c', '#ffffff', '#a50f15']}, 'VV change, 10·log10(after/before) (dB)', false);
Map.addLayer(permanent.selfMask(), {palette: '#000080'}, 'JRC permanent water', false);
Map.addLayer(flood, {palette: '#00ffff'}, 'Flood extent');

// ---------- 6 Export ----------
Export.image.toDrive({image: flood.toByte(), description: 'Prac08b_flood_Kalkarindji_2023', folder: 'GEE_NT',
  region: aoi, scale: 10, crs: 'EPSG:32752', maxPixels: 1e11});
Export.table.toDrive({collection: ee.FeatureCollection([ee.Feature(null, floodKm2)]),
  description: 'Prac08b_flood_area', folder: 'GEE_NT'});

// Q: Why is SAR suited to wet-season flood mapping in the NT?
// Q: Why must the before and after images come from the same relative orbit?
// Q: Change DIFF_T_DB to -2 and -5 dB. How does the flooded area respond?
// Q: Why average σ⁰ in linear units? Average −10 dB and −20 dB in dB and in linear, then convert back: which is physically right?
// Q: Why are flooded woodlands and towns often missed (or appear brighter, not darker)?
// EXT: Replace fixed thresholds with Otsu or a bimodal split (Bmax Otsu) on the log-ratio image (Otsu on the histogram of
//      10·log10(ratio) is fine: the threshold is then converted back to linear before it is applied).
// EXT: Add HAND (height above nearest drainage, e.g. MERIT Hydro 'MERIT/Hydro/v1_0_1' band 'hnd') to remove false positives on high ground.
// EXT: Validate with a Sentinel-2 or Planet image (if cloud-free) or news/emergency-service reports; compute agreement.
