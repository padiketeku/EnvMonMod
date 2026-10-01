/**** Prac 07a — Burned area and severity with dNBR (Arnhem Land / Kakadu, NT)
 * Data: Sentinel-2 SR (NBR from B8A and B12, 20 m), MODIS MCD64A1 for burn dates.
 * Approach: pre-fire (early dry season) vs post-fire (late dry season) composites for one year.
 * Section 4b compares the NT season-based severity convention (EDS = low, LDS = high; Russell-Smith & Edwards 2006)
 * with the Key & Benson (2006) dNBR classes, using event-matched pre/post windows for each season.
 ****/

// ---------- 1 Study area & parameters ----------
var aoi = ee.Geometry.Rectangle([132.70, -13.00, 133.60, -12.30]);  // eastern Kakadu / western Arnhem Land
var YEAR = 2023;
var PRE = [YEAR + '-05-01', YEAR + '-06-15'];
var POST = [YEAR + '-10-15', YEAR + '-11-20'];  // before the first wet-season green-up
Map.centerObject(aoi, 9);

// ---------- 2 Data ----------
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
function s2(start, end) {
  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(aoi).filterDate(start, end)
    .linkCollection(csPlus, ['cs_cdf'])
    .map(function(img) {
      var r = img.updateMask(img.select('cs_cdf').gte(0.6)).divide(10000);
      return r.addBands(r.normalizedDifference(['B8A', 'B12']).rename('NBR'));
    });
}
var preCol = s2(PRE[0], PRE[1]);
var postCol = s2(POST[0], POST[1]);
print('Pre / post scenes', preCol.size(), postCol.size());
// Median composites are robust to residual cloud and smoke.
var pre = preCol.median().clip(aoi);
var post = postCol.median().clip(aoi);
// EXT: try a "most burnt" post-fire mosaic: postCol.map(function(i){return i.addBands(i.select('NBR').multiply(-1).rename('negNBR'));}).qualityMosaic('negNBR')

// ---------- 3 Processing ----------
var dNBR = pre.select('NBR').subtract(post.select('NBR')).rename('dNBR');
// RdNBR (Miller & Thode 2007) — relative, less dependent on pre-fire cover
var RdNBR = dNBR.divide(pre.select('NBR').abs().sqrt().max(0.001)).rename('RdNBR');

// USGS FIREMON thresholds (Key & Benson 2006), developed in temperate forests.
function keyBenson(d) {
  return ee.Image(0)
    .where(d.lt(-0.25), 1)
    .where(d.gte(-0.25).and(d.lt(-0.1)), 2)
    .where(d.gte(-0.1).and(d.lt(0.1)), 3)
    .where(d.gte(0.1).and(d.lt(0.27)), 4)
    .where(d.gte(0.27).and(d.lt(0.44)), 5)
    .where(d.gte(0.44).and(d.lt(0.66)), 6)
    .where(d.gte(0.66), 7)
    .updateMask(d.mask()).rename('severity');
}
var sev = ee.Image(0)
  .where(dNBR.lt(-0.25), 1)
  .where(dNBR.gte(-0.25).and(dNBR.lt(-0.1)), 2)
  .where(dNBR.gte(-0.1).and(dNBR.lt(0.1)), 3)
  .where(dNBR.gte(0.1).and(dNBR.lt(0.27)), 4)
  .where(dNBR.gte(0.27).and(dNBR.lt(0.44)), 5)
  .where(dNBR.gte(0.44).and(dNBR.lt(0.66)), 6)
  .where(dNBR.gte(0.66), 7)
  .updateMask(dNBR.mask()).clip(aoi).rename('severity');
var sevNames = ['Enhanced regrowth, high', 'Enhanced regrowth, low', 'Unburned', 'Low severity',
                'Moderate-low', 'Moderate-high', 'High severity'];
var sevPal = ['#7a8737', '#acbe4d', '#0ae042', '#fff70b', '#ffaf38', '#ff641b', '#a41fd6'];

// ---------- 4 Analysis ----------
var areaHa = ee.Image.pixelArea().divide(1e4);
var sevArea = areaHa.addBands(sev).reduceRegion({
  reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'class'}),
  geometry: aoi, scale: 20, maxPixels: 1e11, tileScale: 4});
print('Area (ha) by severity class 1–7', sevArea);

// MODIS burn date for the same year: early (Jan–Jul) vs late (Aug–Dec) dry season
var burnDate = ee.ImageCollection('MODIS/061/MCD64A1').filterDate(YEAR + '-01-01', (YEAR + 1) + '-01-01')
  .select('BurnDate').max().clip(aoi);
var season = ee.Image(0).where(burnDate.gt(0).and(burnDate.lt(213)), 1)  // DOY 213 ≈ 1 Aug
  .where(burnDate.gte(213), 2).selfMask();

// Compare dNBR with burn timing — early fires may have partially recovered by November
var dnbrBySeason = dNBR.addBands(season).reduceRegion({
  reducer: ee.Reducer.mean().group({groupField: 1, groupName: 'season'}),
  geometry: aoi, scale: 500, maxPixels: 1e10});
print('Mean dNBR: season 1 = early dry, 2 = late dry', dnbrBySeason);
// Q: With ONE pre (May–Jun) and ONE post (Oct–Nov) image, why is this comparison biased against EDS fires?
//    (Hint: some EDS fires burn before or during the PRE window; others re-green or lose their ash before November.)

// ---------- 4b NT season-based severity vs Key & Benson dNBR classes (event-matched) ----------
// NT convention: EDS fires (before 1 Aug) are treated as low severity, LDS fires (from 1 Aug) as high severity.
// That is a PROXY for expected intensity (fuel curing, fire weather). Key & Benson classes measure the spectral
// EFFECT of the fire. Comparing them tests the convention: are LDS fires really more severe on the ground?
// Each season gets its own pre/post windows so both are measured soon after they burn.
var firstBurn = ee.ImageCollection('MODIS/061/MCD64A1').filterDate(YEAR + '-01-01', (YEAR + 1) + '-01-01')
  .select('BurnDate').map(function(i) { return i.updateMask(i.gt(0)); }).min().clip(aoi);   // first burn of the year (DOY)
var W = {EDS_PRE: [YEAR + '-04-01', YEAR + '-05-10'], EDS_POST: [YEAR + '-07-15', YEAR + '-07-31'],
         LDS_PRE: [YEAR + '-07-01', YEAR + '-07-31'], LDS_POST: POST};
function nbrMedian(w) { return s2(w[0], w[1]).select('NBR').median(); }
// Only fires that burned BETWEEN their windows are tested: EDS DOY 131–195 (11 May–14 Jul); LDS DOY 213–288 (1 Aug–15 Oct)
var isEDS = firstBurn.gte(131).and(firstBurn.lte(195));
var isLDS = firstBurn.gte(213).and(firstBurn.lte(288));
var dNBR_event = ee.Image(nbrMedian(W.EDS_PRE).subtract(nbrMedian(W.EDS_POST))).updateMask(isEDS)
  .blend(nbrMedian(W.LDS_PRE).subtract(nbrMedian(W.LDS_POST)).updateMask(isLDS)).rename('dNBR_event').clip(aoi);
var kbEvent = keyBenson(dNBR_event);
var seasonCls = ee.Image(0).where(isEDS, 1).where(isLDS, 2).selfMask().rename('season');   // 1 = EDS ("low"), 2 = LDS ("high")

// Cross-tabulation: area (ha) of each Key & Benson class within EDS and LDS fires
var ct = areaHa.addBands(seasonCls.multiply(10).add(kbEvent).rename('code')).reduceRegion({
  reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'code'}),
  geometry: aoi, scale: 20, maxPixels: 1e11, tileScale: 8});
var ctFc = ee.FeatureCollection(ee.List(ct.get('groups')).map(function(d) { return ee.Feature(null, d); }));
function cell(code) {
  var m = ctFc.filter(ee.Filter.eq('code', code));
  return ee.Number(ee.Algorithms.If(m.size().gt(0), m.first().get('sum'), 0));
}
var table4b = ee.FeatureCollection([1, 2].map(function(sc) {
  var props = {season: sc === 1 ? 'EDS (NT: low)' : 'LDS (NT: high)'};
  [3, 4, 5, 6, 7].forEach(function(k) { props['KB' + k + '_' + sevNames[k - 1].replace(/[^A-Za-z]/g, '')] = cell(sc * 10 + k).round(); });
  props.regrowth_or_noise = cell(sc * 10 + 1).add(cell(sc * 10 + 2)).round();
  return ee.Feature(null, props);
}));
print('4b: Area (ha) by Key & Benson class within EDS and LDS fires', table4b);

// Binary agreement: NT "high" = LDS; Key & Benson "high" = moderate-high or high (dNBR ≥ SEVERE_T)
var SEVERE_T = 0.44;   // try 0.27 (moderate-low and above) and 0.66 (high only)
var sevBin = dNBR_event.gte(SEVERE_T);
var lds = seasonCls.eq(2);
var n = function(maskImg) {
  return ee.Number(areaHa.updateMask(maskImg).reduceRegion({reducer: ee.Reducer.sum(), geometry: aoi, scale: 20,
    maxPixels: 1e11, tileScale: 8}).get('area'));
};
var a = n(lds.and(sevBin)), b = n(lds.and(sevBin.not())), c = n(lds.not().and(sevBin)), d = n(lds.not().and(sevBin.not()));
var N = a.add(b).add(c).add(d);
var po = a.add(d).divide(N);
var pe = a.add(b).multiply(a.add(c)).add(c.add(d).multiply(b.add(d))).divide(N.pow(2));
print('4b: 2 × 2 (ha) [LDS&severe, LDS&not, EDS&severe, EDS&not]', [a, b, c, d]);
print('4b: Agreement (proportion) and Cohen\'s kappa', po, po.subtract(pe).divide(ee.Number(1).subtract(pe)));
print('4b: Share of EDS area that Key & Benson calls severe; share of LDS area that it calls severe',
  c.divide(c.add(d)), a.divide(a.add(b)));
Map.addLayer(kbEvent, {min: 1, max: 7, palette: ['#7a8737', '#acbe4d', '#0ae042', '#fff70b', '#ffaf38', '#ff641b', '#a41fd6']},
  '4b: Key & Benson class, event-matched windows', false);
Map.addLayer(seasonCls, {min: 1, max: 2, palette: ['#4daf4a', '#e41a1c']}, '4b: Tested fires: EDS (green) / LDS (red)', false);
// Q: Do the two systems agree? Which cell of the 2 × 2 table is largest after the diagonal, and what does it mean ecologically?
// Q: List three reasons they can disagree (surface vs crown fire, fuel load and time since fire, MODIS 500 m vs S2 20 m,
//    timing of the post image, US-forest thresholds, patchiness within an EDS fire).
// EXT: Repeat 4b for three years (wet and dry) and for SEVERE_T = 0.27, 0.44, 0.66; report kappa with a bootstrap CI.
// EXT: Replace dNBR with the pre–post difference in SWIR (S2 B11, ≈1.6 µm), which Edwards et al. (2013) found best in NT savanna,
//      and compare its agreement with the season classes.

// ---------- 5 Visualise ----------
var swir = {bands: ['B12', 'B8A', 'B4'], min: 0, max: 0.4};
Map.addLayer(pre, swir, 'Pre-fire S2 (SWIR false colour)');
Map.addLayer(post, swir, 'Post-fire S2 (SWIR false colour)');
Map.addLayer(dNBR, {min: -0.3, max: 0.7, palette: ['green', 'white', 'yellow', 'orange', 'red', 'purple']}, 'dNBR');
Map.addLayer(sev, {min: 1, max: 7, palette: sevPal}, 'Severity (Key & Benson)');
Map.addLayer(season, {min: 1, max: 2, palette: ['#4daf4a', '#e41a1c']}, 'MODIS: early (green) vs late (red) fire', false);

var legend = ui.Panel({style: {position: 'bottom-left'}});
sevNames.forEach(function(n, i) {
  legend.add(ui.Panel([ui.Label('', {backgroundColor: sevPal[i], padding: '8px', margin: '2px'}),
    ui.Label(n, {margin: '4px'})], ui.Panel.Layout.Flow('horizontal')));
});
Map.add(legend);

// ---------- 6 Export ----------
Export.image.toDrive({image: dNBR.addBands(RdNBR).addBands(sev).float(), description: 'Prac07a_dNBR_' + YEAR,
  folder: 'GEE_NT', region: aoi, scale: 20, crs: 'EPSG:32753', maxPixels: 1e11});

// Q: Describe the spatial pattern of severity. Where are the high-severity patches (plateau, lowlands, riparian)?
// Q: Why use SWIR (B12) in NBR? What happens physically to NIR and SWIR after fire?
// Q: Why must post-fire imagery be acquired before the first wet-season storms?
// EXT: The Key & Benson thresholds were calibrated on US conifer forests (Composite Burn Index plots). Argue whether they apply to
//      NT grassy savanna, and propose a local calibration (e.g. leaf-scorch-height field plots, as in Russell-Smith & Edwards 2006).
// EXT: Compare dNBR and RdNBR across areas of different pre-fire cover. Which is better for savanna, and why?
// EXT: Build a per-fire workflow: pre = image just before the MODIS BurnDate, post = first clear image after it.
