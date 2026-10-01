/**** Prac 05b — Change detection: LandTrendr and CCDC (Douglas–Daly, NT)
 * LandTrendr: annual composites → piecewise-linear segments (Kennedy et al. 2010, 2018).
 * CCDC: all clear observations → harmonic models + breaks (Zhu & Woodcock 2014).
 *
 * WHAT THIS SCRIPT DOES:
 *   Asks when, how much and how often the landscape changed in the Douglas–Daly region (NT) between 1988 and 2024.
 *   It builds a cleaned Landsat 5/7/8/9 time series, then runs two time-series change algorithms:
 *   LandTrendr (fits straight-line segments to one dry-season NBR value per year) and
 *   CCDC (fits seasonal harmonic curves to every clear image and flags "breaks").
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) Optional EDIT lines: the study area (aoi, probe) in section 1, START/END years, YEAR_A/YEAR_B and MAG_T.
 *   (3) Click Run. LandTrendr and CCDC are heavy — tiles can take a minute or more to draw.
 *   (4) Read the Console (right panel) for the probe chart, turn layers on/off in the Map's Layers list,
 *       and start the export in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   - Map: bi-temporal dNBR (YEAR_A to YEAR_B), LandTrendr year and magnitude of greatest disturbance,
 *     CCDC most recent break year and number of breaks, and where both algorithms agree after 2005.
 *   - Console: chart of raw vs LandTrendr-fitted NBR at the probe point.
 *
 * DATA:
 *   - Landsat 5 TM Collection 2 Level 2 surface reflectance, LANDSAT/LT05/C02/T1_L2, 30 m, 1984–2011.
 *   - Landsat 7 ETM+ C2 L2, LANDSAT/LE07/C02/T1_L2, 30 m, used only 1999 to May 2003 (before the SLC failure).
 *   - Landsat 8 OLI C2 L2, LANDSAT/LC08/C02/T1_L2, 30 m, 2013–present.
 *   - Landsat 9 OLI-2 C2 L2, LANDSAT/LC09/C02/T1_L2, 30 m, 2021–present.
 *
 * LINKS: pracs/prac05-change-detection-bi-temporal-transitions-landtrendr-and-ccdc.md (course repository).
 *   Feeds Prac 05 and AT4 Part 2.
 *
 * KEY GEE IDEAS:
 *   - map() a function over an ImageCollection to mask clouds, rescale and rename bands for every image.
 *   - Building an annual collection from a list of years (ee.List.sequence + ee.ImageCollection.fromImages).
 *   - Array images: LandTrendr and CCDC return per-pixel arrays that are sliced, masked and sorted.
 *   - reduceRegion at a point to pull values back for a chart; Export.image.toDrive for outputs.
 *
 * Q = core (ENV306 and ENV506). EXT = ENV506 extension.
 ****/

// ---------- 1 Study area ----------
// A small rectangle keeps LandTrendr/CCDC fast. The probe point is one pixel we chart in detail.
var aoi = ee.Geometry.Rectangle([131.10, -14.00, 131.40, -13.75]);   // [west, south, east, north] in degrees (EPSG:4326)
var probe = ee.Geometry.Point([131.19, -13.83]);                        // [lon, lat] of the pixel to chart
Map.centerObject(aoi, 11);                                              // 11 = zoom level

// ---------- 2 Data: harmonised Landsat 5/7/8/9 ----------
// Landsat 5/7 and 8/9 number their bands differently. These two functions mask cloud, rename bands to
// common names (blue … swir2) and convert to surface reflectance, so all four sensors can be merged.
function prepL57(img) {
  var qa = img.select('QA_PIXEL');   // quality band: each bit is a yes/no flag
  // Bit 3 = cloud, bit 4 = cloud shadow. Keep pixels where both bits are 0 (clear).
  var mask = qa.bitwiseAnd(1 << 3).eq(0).and(qa.bitwiseAnd(1 << 4).eq(0));
  return img.select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'], ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'])
    // Collection 2 scale factor and offset: reflectance = DN × 0.0000275 − 0.2 (unitless, about 0–1).
    // copyProperties keeps the image date, which is lost after maths on an image.
    .multiply(0.0000275).add(-0.2).updateMask(mask).copyProperties(img, ['system:time_start']);
}
function prepL89(img) {
  var qa = img.select('QA_PIXEL');   // same QA bits as Landsat 5/7: bit 3 cloud, bit 4 shadow
  var mask = qa.bitwiseAnd(1 << 3).eq(0).and(qa.bitwiseAnd(1 << 4).eq(0));
  // Landsat 8/9 band numbers are shifted by one (B2 = blue), so the same names map to different bands.
  return img.select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'], ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'])
    .multiply(0.0000275).add(-0.2).updateMask(mask).copyProperties(img, ['system:time_start']);
}
// One merged collection of every clear Landsat image over the AOI. filterBounds keeps only scenes that touch the AOI.
var col = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2').map(prepL57)
  .merge(ee.ImageCollection('LANDSAT/LE07/C02/T1_L2').filterDate('1999-01-01', '2003-05-31').map(prepL57))  // L7 pre-SLC failure
  .merge(ee.ImageCollection('LANDSAT/LC08/C02/T1_L2').map(prepL89))
  .merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2').map(prepL89))
  .filterBounds(aoi);
// Note: L5 ends Nov 2011 and L8 begins Apr 2013, so 2012 has no clean data here (L7 SLC-off could fill it).

// ======================= LandTrendr =======================
// LandTrendr needs ONE value per pixel per year. We build a dry-season (May–Sep) median NBR composite for each year.
// NBR (Normalised Burn Ratio) = (NIR − SWIR2) / (NIR + SWIR2); unitless, −1 to 1; high = green, dense vegetation.
var START = 1988, END = 2024;   // EDIT: first and last year of the time series
var annual = ee.ImageCollection.fromImages(ee.List.sequence(START, END).map(function(y) {
  // Images from year y AND months May–Sep (NT dry season: fewer clouds, more stable vegetation signal).
  var c = col.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(5, 9, 'month'));
  var med = c.median();   // median per pixel: robust to leftover cloud, haze and single burnt dates
  var nbr = med.normalizedDifference(['nir', 'swir2']);
  // LandTrendr expects disturbance to INCREASE the index → multiply NBR by −1
  return nbr.multiply(-1).rename('NBR_inv').addBands(nbr.rename('NBR'))   // NBR kept as a second band to fit too
    .set('system:time_start', ee.Date.fromYMD(y, 8, 1).millis())          // stamp each composite as 1 August of year y
    .set('n', c.size());                                                   // number of images used (0 = no data that year)
})).filter(ee.Filter.gt('n', 0));   // drop empty years (e.g. 2012) so LandTrendr does not see blank images

// ---------- Warm-up: bi-temporal change (two dates only) ----------
// Before fitting a whole trajectory, compare two years. Positive dNBR = vegetation loss (clearing, fire).
var YEAR_A = 2017, YEAR_B = 2024;   // EDIT: the "before" and "after" years
var nbrA = annual.filter(ee.Filter.calendarRange(YEAR_A, YEAR_A, 'year')).first().select('NBR');
var nbrB = annual.filter(ee.Filter.calendarRange(YEAR_B, YEAR_B, 'year')).first().select('NBR');
var dNBR_AB = nbrA.subtract(nbrB).rename('dNBR').clip(aoi);   // before − after, so loss is positive
// Green = NBR went up (regrowth), white = little change, red = NBR went down (loss).
Map.addLayer(dNBR_AB, {min: -0.4, max: 0.4, palette: ['#1a9850', '#f7f7f7', '#d73027']}, '4.1: Bi-temporal dNBR ' + YEAR_A + '−' + YEAR_B, false);
// Q: What can two dates NOT tell you about when, how fast and how often change happened? LandTrendr answers this below.

// Run LandTrendr. The FIRST band (NBR_inv) is segmented; the other band (NBR) is fitted to the same vertices.
// These parameter values are common starting values from Kennedy et al. (2018) — test others.
var lt = ee.Algorithms.TemporalSegmentation.LandTrendr({
  timeSeries: annual.select(['NBR_inv', 'NBR']),
  // maxSegments: most straight-line pieces allowed; spikeThreshold: 0.9 damps one-year spikes (e.g. a single fire);
  // vertexCountOvershoot: extra vertices tried then pruned; preventOneYearRecovery: no full recovery in a single year.
  maxSegments: 6, spikeThreshold: 0.9, vertexCountOvershoot: 3, preventOneYearRecovery: true,
  // recoveryThreshold: blocks recovery faster than 1/0.25 = 4 years; pvalThreshold: fit must be significant (p ≤ 0.05);
  // bestModelProportion: accept a simpler model if it is ≥ 75% as good; minObservationsNeeded: at least 6 years of data.
  recoveryThreshold: 0.25, pvalThreshold: 0.05, bestModelProportion: 0.75, minObservationsNeeded: 6
});
// 'LandTrendr' band = 2-D array: rows [year, raw, fitted, isVertex] × columns (years)
// The next lines turn that array into "segments" (start → end vertex) and measure each one.
var ltArr = lt.select('LandTrendr');
var vertexMask = ltArr.arraySlice(0, 3, 4);         // row 3 = isVertex (1 where a segment starts or ends)
var vertices = ltArr.arrayMask(vertexMask);         // keep only the vertex years (columns)
// Each segment runs from one vertex (left) to the next (right).
var left = vertices.arraySlice(1, 0, -1), right = vertices.arraySlice(1, 1, null);
var startYear = left.arraySlice(0, 0, 1), endYear = right.arraySlice(0, 0, 1);   // row 0 = year
var startVal = left.arraySlice(0, 2, 3), endVal = right.arraySlice(0, 2, 3);     // row 2 = fitted value
var mag = endVal.subtract(startVal);              // positive = disturbance (in inverted NBR)
var dur = endYear.subtract(startYear);            // segment length in years
var segInfo = ee.Image.cat([startYear, endYear, mag, dur]).toArray(0).arraySlice(0, 0, 4);   // rows: yod, end, mag, dur

// Greatest disturbance segment
// Sort segments by magnitude (×−1 so the largest comes first), then keep the first column.
var sortByMag = segInfo.arraySlice(0, 2, 3).multiply(-1);
var greatest = segInfo.arraySort(sortByMag).arraySlice(1, 0, 1);
var gd = greatest.arrayProject([0]).arrayFlatten([['yod', 'end', 'mag', 'dur']]);   // array → 4 ordinary bands
var MAG_T = 0.15;   // NBR units
// MAG_T is a starting value — test others. Smaller picks up more subtle change (and more noise, e.g. fire).
var dist = gd.updateMask(gd.select('mag').gt(MAG_T));   // keep only pixels whose biggest drop exceeds MAG_T
var yod = dist.select('yod').add(1).clip(aoi);   // year of detection = first year after the start vertex
// Rainbow palette: purple = early (1990), red = recent (2024).
Map.addLayer(yod, {min: 1990, max: 2024, palette: ['#9400D3', '#4B0082', '#0000FF', '#00FF00', '#FFFF00', '#FF7F00', '#FF0000']}, 'LandTrendr: year of greatest disturbance');
Map.addLayer(dist.select('mag').clip(aoi), {min: MAG_T, max: 0.6, palette: ['#fee5d9', '#a50f15']}, 'LandTrendr: magnitude', false);

// Raw vs fitted at the probe
// reduceRegion with Reducer.first() at 30 m (Landsat pixel size) pulls the array for one pixel to the client.
var ltProbe = ltArr.reduceRegion(ee.Reducer.first(), probe, 30).get('LandTrendr');
// Turn each array column (one year) into a Feature so it can be charted. Values are ×−1 to return to normal NBR.
var probeFc = ee.FeatureCollection(ee.List.sequence(0, ee.Array(ltProbe).length().get([1]).subtract(1)).map(function(i) {
  var a = ee.Array(ltProbe);
  return ee.Feature(null, {year: a.get([0, i]), raw: ee.Number(a.get([1, i])).multiply(-1), fitted: ee.Number(a.get([2, i])).multiply(-1)});
}));
// Points = raw annual NBR; line = LandTrendr fit. Look for sharp drops (disturbance) and slow rises (recovery).
print(ui.Chart.feature.byFeature(probeFc, 'year', ['raw', 'fitted'])
  .setOptions({title: 'LandTrendr NBR at probe (raw vs fitted)', series: {0: {pointSize: 3, lineWidth: 0}, 1: {lineWidth: 2}}}));

// ======================= CCDC =======================
// CCDC uses EVERY clear image (not annual composites). It fits a seasonal harmonic curve per band and
// starts a new curve when several observations in a row depart from the prediction (a "break").
var ccdcInput = col.filterDate('2000-01-01', '2025-01-01').map(function(img) {
  var ndvi = img.normalizedDifference(['nir', 'red']).rename('ndvi');   // NDVI added as an extra band to model (unitless)
  return img.select(['green', 'red', 'nir', 'swir1', 'swir2']).addBands(ndvi);
});
// Parameters are typical defaults (Zhu & Woodcock 2014; Arévalo et al. 2020) — test others.
var ccdc = ee.Algorithms.TemporalSegmentation.Ccdc({
  // breakpointBands: bands tested for a break; minObservations: consecutive outliers needed to confirm a break;
  // chiSquareProbability: how unusual the outliers must be; minNumOfYearsScaler: minimum years before fitting a model;
  // dateFormat 1 = fractional years (e.g. 2015.5); lambda: LASSO regularisation for the harmonic fit.
  collection: ccdcInput, breakpointBands: ['green', 'red', 'nir', 'swir1', 'swir2'],
  minObservations: 6, chiSquareProbability: 0.99, minNumOfYearsScaler: 1.33, dateFormat: 1, lambda: 0.002,
  maxIterations: 25000
});
// tBreak = array of break dates (fractional years); 0 = no break
var breaks = ccdc.select('tBreak');
var lastBreak = breaks.arrayReduce(ee.Reducer.max(), [0]).arrayGet([0]).rename('last_break');   // latest break date per pixel
var nBreaks = breaks.arrayMask(breaks.gt(0)).arrayLength(0).rename('n_breaks');                 // count of real (non-zero) breaks
// selfMask hides pixels with value 0 (no break) so only real break years are coloured.
Map.addLayer(lastBreak.selfMask().clip(aoi), {min: 2001, max: 2024, palette: ['#9400D3', '#0000FF', '#00FF00', '#FFFF00', '#FF0000']}, 'CCDC: most recent break (year)', false);
Map.addLayer(nBreaks.clip(aoi), {min: 0, max: 5, palette: ['white', 'black']}, 'CCDC: number of breaks', false);

// Compare: where do the two algorithms agree on a disturbance after 2005?
var agree = yod.gte(2005).and(lastBreak.gte(2005)).selfMask();   // 1 where both say "change after 2005"; others hidden
Map.addLayer(agree, {palette: 'cyan'}, 'Both detect change after 2005', false);

// ---------- 6 Export ----------
// Exports a 4-band GeoTIFF to Google Drive: yod, mag, last_break, n_breaks. Start it in the Tasks tab.
// toFloat() makes all bands the same data type (required for one multi-band file).
// scale 30 = Landsat pixel size (m); crs EPSG:32752 = WGS 84 / UTM zone 52S (metres, covers the Top End);
// maxPixels raises the default pixel limit so the export does not fail.
Export.image.toDrive({image: yod.toFloat().addBands(dist.select('mag')).addBands(lastBreak).addBands(nBreaks.toFloat()),
  description: 'Prac05b_LT_CCDC', folder: 'GEE_NT', region: aoi, scale: 30, crs: 'EPSG:32752', maxPixels: 1e10});
// Tip: save the full CCDC output as an Asset (Export.image.toAsset) — recomputing is slow.

// Q: Which years show the most clearing according to LandTrendr? Do they match the Hansen loss years (Prac 06)?
// Q: Why do we invert NBR for LandTrendr?
// Q: Annual fires lower NBR every dry season. How do spikeThreshold and the May–Sep window limit false "disturbance"?
// EXT: Run a sensitivity analysis on maxSegments (4, 6, 8) and MAG_T (0.1, 0.15, 0.25) and report the area detected.
// EXT: Compare LandTrendr and CCDC conceptually (annual vs all observations, segments vs harmonic models) and empirically (agreement matrix against 100 visually interpreted points).
// EXT: Explore the GEE community LandTrendr UI and CCDC API (Arévalo et al. 2020) for richer outputs.
