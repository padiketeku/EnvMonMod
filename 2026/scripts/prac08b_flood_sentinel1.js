/**** Prac 08b — Flood mapping with Sentinel-1 SAR: Victoria River, Kalkarindji (NT), Feb–Mar 2023
 * A monsoonal low brought 200–300 mm in a week; Kalkarindji, Daguragu and Pigeon Hole were evacuated (~1 March 2023).
 * Method: change detection on VV backscatter between a dry reference and the flood period.
 * Units: statistics in linear σ⁰; dB for display only (see the SAR units convention below).
 *
 * WHAT THIS SCRIPT DOES:
 *   Maps the extent of the February–March 2023 Victoria River flood around Kalkarindji using Sentinel-1 radar,
 *   which sees through cloud. Calm open water reflects the radar pulse away from the sensor, so flooded ground
 *   turns dark. We flag pixels that became much darker than a late-dry reference AND are now water-dark,
 *   remove permanent water and steep slopes, and report the flooded area.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) Optional EDIT lines: aoi, BEFORE and AFTER (section 1), SMOOTH, DIFF_T_DB and WATER_T_DB (section 3).
 *   (3) Click Run.
 *   (4) Read the Console (right panel) for acquisition dates, image counts, flooded area and the VV chart;
 *       turn layers on/off in the Map's Layers list; start the exports in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   - Map: Kalkarindji marker, VV before and during the flood (dB), VV change (dB), JRC permanent water, flood extent.
 *   - Console: flood-period acquisition dates, pass and relative orbit; number of before/after images;
 *     flooded area (km²); a chart of mean VV (dB) near Kalkarindji from Oct 2022 to Jun 2023 showing the flood pulse.
 *
 * DATA:
 *   - Sentinel-1 C-band SAR GRD, COPERNICUS/S1_GRD, IW mode, VV and VH, 10 m, Oct 2022 – Jun 2023 used (stored in dB).
 *   - JRC Global Surface Water v1.4, JRC/GSW1_4/GlobalSurfaceWater, 30 m, 1984–2021 (seasonality band).
 *   - NASADEM elevation, NASA/NASADEM_HGT/001, 30 m (≈ year 2000), used for slope.
 *
 * LINKS: pracs/prac08-sar-and-water-surface-water-sentinel-1-flood-mapping-wetlands-and-mangroves.md
 *   (course repository). Feeds Prac 08 and AT4 Part 4; also supports AT4 elective (c).
 *
 * KEY GEE IDEAS:
 *   - SAR units: convert dB → linear σ⁰ with map() before any maths; convert back to dB only for display.
 *   - Filtering a collection by metadata (instrument mode, polarisation, relative orbit) with ee.Filter.
 *   - Client-side vs server-side: dbToLin() is plain JavaScript (Math.pow) on numbers; toLinear() works on ee.Image.
 *   - Neighbourhood operations (focalMean, connectedPixelCount) and reduceRegion for area; exports.
 *
 * Q = core (ENV306 and ENV506). EXT = ENV506 extension.
 ****/

// ---------- 1 Study area & dates ----------
// The AOI covers the Victoria River floodplain around Kalkarindji. BEFORE is a dry reference with no flooding;
// AFTER covers the flood peak.
var aoi = ee.Geometry.Rectangle([130.40, -17.80, 131.20, -17.00]);   // [west, south, east, north] in degrees
var BEFORE = ['2022-10-01', '2022-11-30'];   // late dry season reference
var AFTER  = ['2023-02-25', '2023-03-15'];   // flood period: inspect individual dates below
Map.centerObject(aoi, 10);
Map.addLayer(ee.Geometry.Point([130.83, -17.43]), {color: 'red'}, 'Kalkarindji (approx.)');

// ---------- SAR units convention (ENV306/506) ----------
// COPERNICUS/S1_GRD stores backscatter (σ⁰) in dB. Averages, medians of composites, ratios, filters, thresholds and
// all statistics are computed in LINEAR power units; dB is used ONLY for display (map layers, chart axes).
// Thresholds quoted in dB in the literature are converted to linear with dbToLin().
// Why: dB is a logarithm. Averaging logarithms is not the same as averaging power (it biases the mean low),
// and a ratio in linear units is a difference in dB. So: convert to linear first, do the maths, convert to dB to look.
function toLinear(img) {   // 10^(dB/10); keeps metadata (orbit, pass, date) for later filters
  img = ee.Image(img);
  // exp(dB × ln10 / 10) is the same as 10^(dB/10). copyProperties keeps all metadata, which maths would otherwise drop.
  return ee.Image(img.multiply(Math.LN10 / 10).exp().copyProperties(img, ['system:time_start'])).copyProperties(img);
}
function toDb(img) { return ee.Image(img).log10().multiply(10); }                                                    // display only
function dbToLin(x) { return Math.pow(10, x / 10); }   // client-side: converts one dB NUMBER (not an image) to linear

// ---------- 2 Data ----------
// All Sentinel-1 images over the AOI in Interferometric Wide (IW) swath mode that include VV polarisation.
var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterBounds(aoi)
  .filter(ee.Filter.eq('instrumentMode', 'IW'))                                  // standard mode over land
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))       // image must have a VV band
  .select(['VV', 'VH'])   // VV = vertical send/receive (best for open water); VH = cross-polarised
  .map(toLinear);   // linear σ⁰ from here on

var afterCol = s1.filterDate(AFTER[0], AFTER[1]);
// Print the date, pass (ASCENDING/DESCENDING) and relative orbit of every flood-period image.
// aggregate_array collects one property from all images into a list.
print('Flood-period acquisitions (date, pass, relative orbit)',
  afterCol.aggregate_array('system:time_start').map(function(t) { return ee.Date(t).format('YYYY-MM-dd'); }),
  afterCol.aggregate_array('orbitProperties_pass'), afterCol.aggregate_array('relativeOrbitNumber_start'));
// Same orbit for before & after avoids look-angle differences
// We take the orbit of the first flood image and keep only that orbit in both periods.
var orbit = ee.Number(afterCol.first().get('relativeOrbitNumber_start'));
var beforeCol = s1.filterDate(BEFORE[0], BEFORE[1]).filter(ee.Filter.eq('relativeOrbitNumber_start', orbit));
afterCol = afterCol.filter(ee.Filter.eq('relativeOrbitNumber_start', orbit));
print('Images used: before / after', beforeCol.size(), afterCol.size());

// ---------- 3 Processing ----------
// Build smoothed before and after VV images (linear σ⁰), take their ratio, then apply two thresholds:
// a big drop in backscatter AND a dark (water-like) after value.
var SMOOTH = 50;   // metres; boxcar (mean) speckle filter, applied in linear units
// Speckle = grainy noise in all SAR images. focalMean averages within a 50 m circle to reduce it.
var before = beforeCol.select('VV').mean().focalMean(SMOOTH, 'circle', 'meters').clip(aoi);   // mean of linear σ⁰
var after = afterCol.select('VV').min().focalMean(SMOOTH, 'circle', 'meters').clip(aoi);  // min = most water seen
var ratio = after.divide(before).rename('ratioVV');   // linear ratio (water darkens → ratio < 1)

// Both thresholds are written in dB (as in the literature) and converted to linear by dbToLin() before use.
// They are starting values — test others (see the Q on DIFF_T_DB below).
var DIFF_T_DB = -3;    // a 3 dB drop ...
var WATER_T_DB = -16;  // ... to calm open water, typically darker than −16 dB in VV
var flood = ratio.lt(dbToLin(DIFF_T_DB)).and(after.lt(dbToLin(WATER_T_DB)));   // compared in linear: 0.50 and 0.025

// Refinement masks
// Remove water that is always there (not flood) and steep ground (radar shadow there also looks dark).
var gsw = ee.Image('JRC/GSW1_4/GlobalSurfaceWater');
var permanent = gsw.select('seasonality').gte(10).unmask(0);   // water ≥ 10 months/year = permanent; unmask: no-data → 0
var slope = ee.Terrain.slope(ee.Image('NASA/NASADEM_HGT/001').select('elevation'));   // slope in degrees
flood = flood.and(permanent.not()).and(slope.lt(5));   // 5° is a starting value — floods sit on flat ground
// Remove speckle-sized specks: keep groups of ≥ 8 connected pixels (counting up to 25; true = 8-neighbour connection).
flood = flood.updateMask(flood.connectedPixelCount(25, true).gte(8)).selfMask().rename('flood');

// ---------- 4 Analysis ----------
// Flooded area: pixel area (m² ÷ 1e6 = km²) summed over flood pixels. scale 10 = Sentinel-1 GRD pixel size;
// maxPixels lifts the pixel limit; tileScale 4 uses smaller tiles to avoid memory errors.
var floodKm2 = ee.Image.pixelArea().divide(1e6).updateMask(flood)
  .reduceRegion({reducer: ee.Reducer.sum(), geometry: aoi, scale: 10, maxPixels: 1e11, tileScale: 4});
print('Flooded area (km²)', floodKm2);   // printed as {area: km²}

// Time series of mean VV over a floodplain point — shows the flood pulse
// A 1 km buffer around a floodplain point; each image's mean VV is computed in LINEAR units, then converted to dB.
var probe = ee.Geometry.Point([130.83, -17.45]).buffer(1000);
var pulse = s1.filterDate('2022-10-01', '2023-06-30').select('VV').map(function(img) {
  var meanLin = ee.Number(img.reduceRegion(ee.Reducer.mean(), probe, 10).get('VV'));   // mean in linear units
  return ee.Feature(null, {date: img.date().millis(), VV_dB: meanLin.log10().multiply(10)}); // converted for display
});
// Look for a sharp dip in VV (flooding) around late Feb–early Mar 2023. Note: all orbits are included here.
print(ui.Chart.feature.byFeature(pulse, 'date', 'VV_dB')
  .setOptions({title: 'Mean VV near Kalkarindji (mean of linear σ⁰, shown in dB)', pointSize: 3, hAxis: {format: 'MMM yyyy'}}));

// ---------- 5 Visualise ----------
// Display only: linear σ⁰ is converted to dB with toDb() so the contrast is easy to see. Dark = water/smooth surface.
Map.addLayer(toDb(before), {min: -25, max: 0}, 'VV before (dB)');
Map.addLayer(toDb(after), {min: -25, max: 0}, 'VV flood period (dB)');
// Blue = darker during the flood (likely new water), red = brighter (e.g. flooded woodland or towns, see the Q below).
Map.addLayer(toDb(ratio), {min: -8, max: 8, palette: ['#08519c', '#ffffff', '#a50f15']}, 'VV change, 10·log10(after/before) (dB)', false);
Map.addLayer(permanent.selfMask(), {palette: '#000080'}, 'JRC permanent water', false);
Map.addLayer(flood, {palette: '#00ffff'}, 'Flood extent');

// ---------- 6 Export ----------
// Flood map as a GeoTIFF (toByte = 1 byte per pixel, small file); scale 10 m;
// crs EPSG:32752 = WGS 84 / UTM zone 52S (metres; Kalkarindji is at ~130.8° E); maxPixels lifts the pixel limit.
// The flooded-area number is also exported as a one-row CSV. Start both in the Tasks tab.
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
