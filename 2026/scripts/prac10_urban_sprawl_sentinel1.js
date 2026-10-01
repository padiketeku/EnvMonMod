/**** Prac 10 — Urban sprawl detection with Sentinel-1 SAR: Darwin–Palmerston (NT), 2016–2025
 * Built-up surfaces give strong, stable radar returns (double-bounce from walls and ground, corner reflectors).
 * Method: annual dry-season VV/VH medians → built-up mask → new urban area → expansion type (LEI).
 * Validation: GHSL built-up surface and Dynamic World 'built' probability.
 * Units: statistics in linear σ⁰; dB for display only (see the SAR units convention below).
 * Run entirely in the GEE Code Editor.
 ****/

// ---------- 1 Study area ----------
var aoi = ee.Geometry.Rectangle([130.80, -12.62, 131.12, -12.33]);   // Darwin, Palmerston, Litchfield Shire fringe
Map.centerObject(aoi, 11);
var YEARS = [2016, 2018, 2020, 2022, 2024];
var areaKm2 = ee.Image.pixelArea().divide(1e6);

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
var s1 = ee.ImageCollection('COPERNICUS/S1_GRD').filterBounds(aoi)
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
  .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))   // one look direction for consistency
  .select(['VV', 'VH'])
  .map(toLinear);   // linear σ⁰ from here on
print('Descending S1 scenes per year',
  ee.List(YEARS).map(function(y) { return s1.filter(ee.Filter.calendarRange(y, y, 'year')).size(); }));
// Note: Sentinel-1B failed in Dec 2021, so 2022–2024 has fewer scenes. Sentinel-1C (launched Dec 2024) adds data from 2025.

function annualS1(year) {
  var c = s1.filterDate(ee.Date.fromYMD(year, 5, 1), ee.Date.fromYMD(year, 10, 31));   // dry season: less soil moisture effect
  var med = c.median();                                                      // linear σ⁰
  var cv = c.select('VV').reduce(ee.Reducer.stdDev()).divide(c.select('VV').mean()).rename('VV_cv');   // temporal stability
  return med.addBands(cv).clip(aoi).set('year', year);
}

// ---------- Activity 10.1 warm-up: log-ratio change between two dates ----------
// Use ONE relative orbit so the look geometry is identical. The ratio is computed in linear units and shown in dB.
var orbit = ee.Number(s1.filterDate('2024-05-01', '2024-10-31').first().get('relativeOrbitNumber_start'));
var s1o = s1.filter(ee.Filter.eq('relativeOrbitNumber_start', orbit)).select('VV');
var vv2016 = s1o.filterDate('2016-05-01', '2016-10-31').median();
var vv2024 = s1o.filterDate('2024-05-01', '2024-10-31').median();
var ratio = vv2024.divide(vv2016).rename('ratio').clip(aoi);   // linear ratio σ⁰₂₀₂₄ / σ⁰₂₀₁₆
var RATIO_T_DB = 3;                                                // +3 dB brightening ≈ linear ratio 2.0
Map.addLayer(toDb(ratio), {min: -6, max: 6, palette: ['#2166ac', '#f7f7f7', '#b2182b']}, '10.1: VV log ratio 2024 / 2016 (shown in dB)', false);
Map.addLayer(ratio.gt(dbToLin(RATIO_T_DB)).selfMask(), {palette: 'red'}, '10.1: Brightening > +3 dB (candidate new build)', false);
print('10.1: relative orbit used', orbit);
// Q: Which non-urban changes also brighten by > 3 dB (wet soil, crops, construction stockpiles)? Why do rules in Section 3 add stability tests?

// ---------- 3 Built-up classification (threshold rules; calibrate them) ----------
var VV_T_DB = -8;    // built-up typically > −8 dB in VV (compared in linear: dbToLin(-8) = 0.158)
var VH_T_DB = -15;   // helps exclude smooth bright surfaces (linear 0.032)
var CV_T = 0.5;      // built-up is temporally stable: coefficient of variation of linear VV < 0.5
var water = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('occurrence').gt(50).unmask(0);
var slope = ee.Terrain.slope(ee.Image('NASA/NASADEM_HGT/001').select('elevation'));
function builtUp(img) {
  var b = img.select('VV').gt(dbToLin(VV_T_DB)).and(img.select('VH').gt(dbToLin(VH_T_DB))).and(img.select('VV_cv').lt(CV_T))
    .and(water.not()).and(slope.lt(10));
  b = b.focalMode({radius: 1, units: 'pixels'});   // majority filter removes speckle
  return b.updateMask(b.connectedPixelCount(50, true).gte(10)).unmask(0).rename('built').clip(aoi);
}
var built = YEARS.map(function(y) { return builtUp(annualS1(y)).set('year', y); });

// Enforce monotonic urbanisation: once built, stays built (reduces flicker)
for (var i = 1; i < built.length; i++) { built[i] = built[i].or(built[i - 1]).set('year', YEARS[i]); }

// ---------- 4 Analysis ----------
var builtFc = ee.FeatureCollection(built.map(function(b, i) {
  var a = areaKm2.updateMask(b).reduceRegion({reducer: ee.Reducer.sum(), geometry: aoi, scale: 10, maxPixels: 1e11, tileScale: 4});
  return ee.Feature(null, {year: YEARS[i], built_km2: a.get('area')});
}));
print(ui.Chart.feature.byFeature(builtFc, 'year', 'built_km2').setChartType('ColumnChart')
  .setOptions({title: 'Built-up area from Sentinel-1 (km²)', legend: {position: 'none'}}));

// Annual urban expansion rate between first and last year
var first = ee.Number(builtFc.first().get('built_km2'));
var last = ee.Number(builtFc.sort('year', false).first().get('built_km2'));
print('Annual growth rate (%/yr)', last.divide(first).log().divide(YEARS[YEARS.length - 1] - YEARS[0]).multiply(100));

// New urban land and Landscape Expansion Index (LEI, Liu et al. 2010), pixel approximation:
// share of old urban within 100 m of each new urban pixel: > 0.5 infilling, 0–0.5 edge-expansion, 0 outlying
var oldU = built[0], newU = built[built.length - 1].and(oldU.not());
var oldShare = oldU.reduceNeighborhood({reducer: ee.Reducer.mean(), kernel: ee.Kernel.circle(100, 'meters')});
var lei = ee.Image(0).where(newU.and(oldShare.gt(0.5)), 1)
  .where(newU.and(oldShare.gt(0)).and(oldShare.lte(0.5)), 2)
  .where(newU.and(oldShare.eq(0)), 3).selfMask().rename('expansion_type');
var leiArea = areaKm2.addBands(lei).reduceRegion({reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'type'}),
  geometry: aoi, scale: 10, maxPixels: 1e11, tileScale: 4});
print('New urban area by type (1 infill, 2 edge, 3 outlying), km²', leiArea);

// ---------- Validation against GHSL and Dynamic World ----------
var ghsl2020 = ee.Image('JRC/GHSL/P2023A/GHS_BUILT_S/2020').select('built_surface').gt(1000).clip(aoi);   // >10 % built in 100 m cell
var dwBuilt = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1').filterBounds(aoi).filterDate('2020-05-01', '2020-10-31')
  .select('built').mean().gt(0.5).clip(aoi);
var s1_2020 = built[2];
function agreement(ref, name) {
  var m = s1_2020.multiply(2).add(ref).rename('m');   // 0 both no, 1 ref only, 2 S1 only, 3 both yes
  var cm = areaKm2.addBands(m).reduceRegion({reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'code'}),
    geometry: aoi, scale: 100, maxPixels: 1e11});
  print('Agreement S1 2020 vs ' + name + ' (km²; 0 both no, 1 ref only, 2 S1 only, 3 both)', cm);
}
agreement(ghsl2020.reproject({crs: 'EPSG:32752', scale: 100}), 'GHSL 2020');
agreement(dwBuilt, 'Dynamic World 2020');

// ---------- 5 Visualise ----------
var s1_2016 = annualS1(2016), s1_2024 = annualS1(2024);
Map.addLayer(toDb(s1_2024.select(['VV', 'VH', 'VV'])), {min: [-20, -28, -20], max: [0, -8, 0]}, 'S1 2024 (VV-VH-VV, dB)', false);
Map.addLayer(toDb(ee.Image.cat(s1_2024.select('VV'), s1_2016.select('VV'), s1_2016.select('VV'))),
  {min: -20, max: 0}, 'Change composite: red = brighter in 2024', false);
Map.addLayer(oldU.selfMask(), {palette: '#636363'}, 'Built-up 2016');
Map.addLayer(lei, {min: 1, max: 3, palette: ['#fdae61', '#d7191c', '#7b3294']}, 'New urban 2016→2024: infill / edge / outlying');
Map.addLayer(ghsl2020.selfMask(), {palette: 'cyan'}, 'GHSL built-up 2020 (validation)', false);

// ---------- 6 Export ----------
Export.image.toDrive({image: ee.Image.cat(built.map(function(b, i) { return b.rename('built_' + YEARS[i]); })).addBands(lei.unmask(0)).toByte(),
  description: 'Prac10_urban_S1', folder: 'GEE_NT', region: aoi, scale: 10, crs: 'EPSG:32752', maxPixels: 1e11});
Export.table.toDrive({collection: builtFc, description: 'Prac10_built_area', folder: 'GEE_NT'});

// Q: Why do buildings appear bright in SAR? Why can bare rock, mangrove edges or metal-roofed sheds cause commission errors?
// Q: Which suburbs grew most between 2016 and 2024? Is growth mainly infill, edge-expansion or outlying (leapfrog)?
// Q: Why are dry-season composites and a single orbit direction used?
// Q: Change VV_T_DB to −6 and −10 dB. How sensitive is the built-up area?
// Q: Why is the median of linear σ⁰ identical to the median in dB, while the mean and standard deviation are not?
// EXT: Add Sentinel-2 NDVI/NDBI and train an RF classifier on S1+S2 features; compare accuracy with S1 alone (Prac 04a workflow).
// EXT: Add GLCM texture (linear VV quantised to 0–255, then .glcmTexture()) and test whether it improves urban detection.
// EXT: Relate urban expansion to NT planning: compare growth areas with the zoning/land release in the Darwin Regional Land Use Plan.
