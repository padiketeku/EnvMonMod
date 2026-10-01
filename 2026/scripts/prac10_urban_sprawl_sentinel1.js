/**** Prac 10 — Urban sprawl detection with Sentinel-1 SAR: Darwin–Palmerston (NT), 2016–2025
 * Built-up surfaces give strong, stable radar returns (double-bounce from walls and ground, corner reflectors).
 * Method: annual dry-season VV/VH medians → built-up mask → new urban area → expansion type (LEI).
 * Validation: GHSL built-up surface and Dynamic World 'built' probability.
 * Units: statistics in linear σ⁰; dB for display only (see the SAR units convention below).
 * Run entirely in the GEE Code Editor.
 *
 * WHAT THIS SCRIPT DOES:
 *   Asks: how much has Darwin–Palmerston's built-up area grown since 2016, and where (infill, edge or leapfrog)?
 *   Maps built-up land each study year from Sentinel-1 radar using simple threshold rules, measures the area,
 *   classifies new urban land by the Landscape Expansion Index (LEI) and checks 2020 against GHSL and Dynamic World.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) No EDIT lines are required. Calibrate the thresholds VV_T_DB, VH_T_DB and CV_T in section 3 (Q below).
 *   (3) Click Run.
 *   (4) Read the Console (scene counts, chart, growth rate, LEI and agreement tables), turn layers on/off in the
 *       Map's Layers list, and start the two exports in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   Map: VV log ratio 2024/2016 and >+3 dB brightening (10.1, off); S1 2024 false colour (off); change composite (off);
 *   Built-up 2016 (grey); New urban 2016→2024 coloured by type (orange infill, red edge, purple outlying);
 *   GHSL built-up 2020 (off).
 *   Console: scenes per year; relative orbit used; built-up area per year (km², column chart); annual growth rate (%/yr);
 *   new urban area by LEI type (km²); agreement tables (km²) against GHSL and Dynamic World.
 *
 * DATA:
 *   - COPERNICUS/S1_GRD_FLOAT — linear σ⁰; Sentinel-1 C-band SAR, IW mode, VV and VH, 10 m, descending pass, 2016–2024 used.
 *   - JRC/GSW1_4/GlobalSurfaceWater ('occurrence') — 30 m, 1984–2021; masks water.
 *   - NASA/NASADEM_HGT/001 — NASADEM elevation, 30 m (from 2000 SRTM); used for slope.
 *   - JRC/GHSL/P2023A/GHS_BUILT_S/2020 — GHSL built-up surface, 100 m, epoch 2020 (validation).
 *   - GOOGLE/DYNAMICWORLD/V1 — Dynamic World land-cover probabilities, 10 m, near-real-time from 2015 (2020 used).
 *
 * LINKS: pracs/prac10-urban-sprawl-detection-with-sentinel-1.md
 *   Feeds Prac 10 and AT4 elective (d).
 *
 * KEY GEE IDEAS:
 *   - Filtering an ImageCollection (filterBounds, filterDate, metadata filters) and map() to convert units.
 *   - Temporal reducers (median, stdDev, mean) to build annual composites in linear σ⁰.
 *   - Neighbourhood operations (focalMode, connectedPixelCount, reduceNeighborhood).
 *   - Grouped reducers in reduceRegion to get area per class.
 *
 * Q = core (ENV306 and ENV506). EXT = ENV506 extension.
 ****/

// ---------- 1 Study area ----------
// The area of interest, the study years and an area image used for all km² sums.
var aoi = ee.Geometry.Rectangle([130.80, -12.62, 131.12, -12.33]);   // Darwin, Palmerston, Litchfield Shire fringe
Map.centerObject(aoi, 11);
var YEARS = [2016, 2018, 2020, 2022, 2024];   // client-side list of study years (every 2 years)
var areaKm2 = ee.Image.pixelArea().divide(1e6);   // pixel area in m² ÷ 1,000,000 = km²

// ---------- SAR units convention (ENV306/506) ----------
// COPERNICUS/S1_GRD_FLOAT stores backscatter (σ⁰) as LINEAR power (its twin, COPERNICUS/S1_GRD, stores the same
// values in dB). So the data arrive in linear units: averages, medians of composites, ratios, filters, thresholds and
// all statistics are computed in LINEAR power units; dB is used ONLY for display (map layers, chart axes).
// Thresholds quoted in dB in the literature are converted to linear with dbToLin().
// Why: dB is a log scale. The mean or standard deviation of dB values is not that of the power, so they are biased.
// Rule of thumb: +3 dB ≈ double the power (×2); −3 dB ≈ half; +10 dB = ×10.
function toDb(img) { return ee.Image(img).log10().multiply(10); }                                                    // display only
function dbToLin(x) { return Math.pow(10, x / 10); }   // client-side number conversion, e.g. dbToLin(-8) ≈ 0.158

// ---------- 2 Data ----------
// Sentinel-1 scenes over the aoi, filtered so every scene is comparable (already linear σ⁰).
var s1 = ee.ImageCollection('COPERNICUS/S1_GRD_FLOAT').filterBounds(aoi)
  .filter(ee.Filter.eq('instrumentMode', 'IW'))   // Interferometric Wide swath, the standard mode over land
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))   // scene must include VH (dual-pol VV+VH)
  .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))   // one look direction for consistency
  .select(['VV', 'VH']);
// The collection is already in linear σ⁰ (S1_GRD_FLOAT), so no dB-to-linear conversion is needed.
// Count scenes per year on the server. Few scenes = noisier composites for that year.
print('Descending S1 scenes per year',
  ee.List(YEARS).map(function(y) { return s1.filter(ee.Filter.calendarRange(y, y, 'year')).size(); }));
// Note: Sentinel-1B failed in Dec 2021, so 2022–2024 has fewer scenes. Sentinel-1C (launched Dec 2024) adds data from 2025.

// annualS1(): one dry-season (May–Oct) composite per year with three bands: VV and VH medians, and VV_cv.
function annualS1(year) {
  var c = s1.filterDate(ee.Date.fromYMD(year, 5, 1), ee.Date.fromYMD(year, 10, 31));   // dry season: less soil moisture effect
  // Median per pixel per band: robust to single bright or dark outliers (e.g. rain, ships, speckle).
  var med = c.median();                                                      // linear σ⁰
  // Coefficient of variation = standard deviation ÷ mean of linear VV over the season (unitless).
  // Buildings stay bright all season (low CV); crops and wet soil change (high CV).
  var cv = c.select('VV').reduce(ee.Reducer.stdDev()).divide(c.select('VV').mean()).rename('VV_cv');   // temporal stability
  return med.addBands(cv).clip(aoi).set('year', year);
}

// ---------- Activity 10.1 warm-up: log-ratio change between two dates ----------
// Use ONE relative orbit so the look geometry is identical. The ratio is computed in linear units and shown in dB.
// Take the relative orbit of the first 2024 dry-season scene, and keep only scenes from that orbit.
var orbit = ee.Number(s1.filterDate('2024-05-01', '2024-10-31').first().get('relativeOrbitNumber_start'));
var s1o = s1.filter(ee.Filter.eq('relativeOrbitNumber_start', orbit)).select('VV');
var vv2016 = s1o.filterDate('2016-05-01', '2016-10-31').median();   // dry-season median, linear σ⁰
var vv2024 = s1o.filterDate('2024-05-01', '2024-10-31').median();
var ratio = vv2024.divide(vv2016).rename('ratio').clip(aoi);   // linear ratio σ⁰₂₀₂₄ / σ⁰₂₀₁₆
var RATIO_T_DB = 3;                                                // +3 dB brightening ≈ linear ratio 2.0
// RATIO_T_DB is a starting value — test others.
// Display: blue = darker in 2024, white = no change, red = brighter in 2024 (−6 to +6 dB).
Map.addLayer(toDb(ratio), {min: -6, max: 6, palette: ['#2166ac', '#f7f7f7', '#b2182b']}, '10.1: VV log ratio 2024 / 2016 (shown in dB)', false);
Map.addLayer(ratio.gt(dbToLin(RATIO_T_DB)).selfMask(), {palette: 'red'}, '10.1: Brightening > +3 dB (candidate new build)', false);
print('10.1: relative orbit used', orbit);
// Q: Which non-urban changes also brighten by > 3 dB (wet soil, crops, construction stockpiles)? Why do rules in Section 3 add stability tests?

// ---------- 3 Built-up classification (threshold rules; calibrate them) ----------
// A pixel is built-up if it is bright in VV, not too dark in VH, stable through the season, not water and not steep.
// Thresholds are set in dB (as in the literature) and converted to linear σ⁰ for the comparison.
// All three are starting values — test others against the map and the validation layers.
var VV_T_DB = -8;    // built-up typically > −8 dB in VV (compared in linear: dbToLin(-8) = 0.158)
var VH_T_DB = -15;   // helps exclude smooth bright surfaces (linear 0.032)
var CV_T = 0.5;      // built-up is temporally stable: coefficient of variation of linear VV < 0.5
// JRC 'occurrence' = % of observations with water (1984–2021). > 50 % = usually water. unmask(0) fills no-data with 0.
var water = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('occurrence').gt(50).unmask(0);
// Slope in degrees: slopes facing the radar look bright and could be mistaken for buildings.
var slope = ee.Terrain.slope(ee.Image('NASA/NASADEM_HGT/001').select('elevation'));
function builtUp(img) {
  // and() combines the 1/0 tests: a pixel must pass every rule to be built-up.
  var b = img.select('VV').gt(dbToLin(VV_T_DB)).and(img.select('VH').gt(dbToLin(VH_T_DB))).and(img.select('VV_cv').lt(CV_T))
    .and(water.not()).and(slope.lt(10));   // slope < 10° (a starting value — test others)
  b = b.focalMode({radius: 1, units: 'pixels'});   // majority filter removes speckle
  // Remove small isolated patches: count connected pixels (up to 50, 8-neighbour) and keep patches of ≥ 10 pixels.
  // unmask(0) turns removed pixels back into 0 so the result is a complete 0/1 image named 'built'.
  return b.updateMask(b.connectedPixelCount(50, true).gte(10)).unmask(0).rename('built').clip(aoi);
}
// Client-side JS array of five server-side images, one per study year.
var built = YEARS.map(function(y) { return builtUp(annualS1(y)).set('year', y); });

// Enforce monotonic urbanisation: once built, stays built (reduces flicker)
// Each year is OR-ed with the year before, so a pixel built in 2018 is also built in 2020, 2022 and 2024.
for (var i = 1; i < built.length; i++) { built[i] = built[i].or(built[i - 1]).set('year', YEARS[i]); }

// ---------- 4 Analysis ----------
// Built-up area per year (km²), the annual growth rate, and the type of new urban growth (LEI).
// For each year, sum the km² of built pixels. scale: 10 = Sentinel-1 pixel size; tileScale: 4 helps avoid memory errors.
// ee.Feature(null, …) is a row with no geometry — just a table record for charting and export.
var builtFc = ee.FeatureCollection(built.map(function(b, i) {
  var a = areaKm2.updateMask(b).reduceRegion({reducer: ee.Reducer.sum(), geometry: aoi, scale: 10, maxPixels: 1e11, tileScale: 4});
  return ee.Feature(null, {year: YEARS[i], built_km2: a.get('area')});   // pixelArea's band is named 'area'
}));
print(ui.Chart.feature.byFeature(builtFc, 'year', 'built_km2').setChartType('ColumnChart')
  .setOptions({title: 'Built-up area from Sentinel-1 (km²)', legend: {position: 'none'}}));

// Annual urban expansion rate between first and last year
// Continuous rate = ln(last ÷ first) ÷ number of years × 100, in % per year.
var first = ee.Number(builtFc.first().get('built_km2'));
var last = ee.Number(builtFc.sort('year', false).first().get('built_km2'));   // sort descending, take the first = latest year
print('Annual growth rate (%/yr)', last.divide(first).log().divide(YEARS[YEARS.length - 1] - YEARS[0]).multiply(100));

// New urban land and Landscape Expansion Index (LEI, Liu et al. 2010), pixel approximation:
// share of old urban within 100 m of each new urban pixel: > 0.5 infilling, 0–0.5 edge-expansion, 0 outlying
var oldU = built[0], newU = built[built.length - 1].and(oldU.not());   // new = built in 2024 but not in 2016
// Mean of the 0/1 old-urban image in a 100 m circle = the share of neighbours that were already urban.
var oldShare = oldU.reduceNeighborhood({reducer: ee.Reducer.mean(), kernel: ee.Kernel.circle(100, 'meters')});
// Start from 0 and use where() to write class codes 1 (infill), 2 (edge) or 3 (outlying) into new urban pixels.
var lei = ee.Image(0).where(newU.and(oldShare.gt(0.5)), 1)
  .where(newU.and(oldShare.gt(0)).and(oldShare.lte(0.5)), 2)
  .where(newU.and(oldShare.eq(0)), 3).selfMask().rename('expansion_type');
// Grouped reducer: band 0 (area) is summed separately for each value of band 1 (the LEI class) → km² per type.
var leiArea = areaKm2.addBands(lei).reduceRegion({reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'type'}),
  geometry: aoi, scale: 10, maxPixels: 1e11, tileScale: 4});
print('New urban area by type (1 infill, 2 edge, 3 outlying), km²', leiArea);

// ---------- Validation against GHSL and Dynamic World ----------
// Compare the Sentinel-1 built-up map for 2020 with two independent products. Neither is "truth";
// look at where they agree and disagree.
// GHSL built_surface = m² of built surface in each 100 m cell (10,000 m²), so > 1000 m² means > 10 % built.
var ghsl2020 = ee.Image('JRC/GHSL/P2023A/GHS_BUILT_S/2020').select('built_surface').gt(1000).clip(aoi);   // >10 % built in 100 m cell
// Dynamic World: mean 'built' probability over the 2020 dry season; > 0.5 = more likely built than not (a starting value).
var dwBuilt = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1').filterBounds(aoi).filterDate('2020-05-01', '2020-10-31')
  .select('built').mean().gt(0.5).clip(aoi);
var s1_2020 = built[2];   // index 2 of YEARS = 2020
// agreement(): cross-tabulate the S1 map against a reference map, as areas in km².
function agreement(ref, name) {
  var m = s1_2020.multiply(2).add(ref).rename('m');   // 0 both no, 1 ref only, 2 S1 only, 3 both yes
  // Grouped sum of area by code. scale: 100 compares the maps at GHSL's coarser 100 m resolution.
  var cm = areaKm2.addBands(m).reduceRegion({reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'code'}),
    geometry: aoi, scale: 100, maxPixels: 1e11});
  print('Agreement S1 2020 vs ' + name + ' (km²; 0 both no, 1 ref only, 2 S1 only, 3 both)', cm);
}
// reproject: fix GHSL on a 100 m grid in EPSG:32752 (WGS 84 / UTM zone 52S, which covers Darwin).
agreement(ghsl2020.reproject({crs: 'EPSG:32752', scale: 100}), 'GHSL 2020');
agreement(dwBuilt, 'Dynamic World 2020');

// ---------- 5 Visualise ----------
// All radar layers are converted to dB for display only.
var s1_2016 = annualS1(2016), s1_2024 = annualS1(2024);
// False colour: R = VV, G = VH, B = VV. Each band has its own dB stretch (min/max lists).
Map.addLayer(toDb(s1_2024.select(['VV', 'VH', 'VV'])), {min: [-20, -28, -20], max: [0, -8, 0]}, 'S1 2024 (VV-VH-VV, dB)', false);
// Change composite: R = VV 2024, G and B = VV 2016. Red = brighter in 2024; grey = unchanged.
Map.addLayer(toDb(ee.Image.cat(s1_2024.select('VV'), s1_2016.select('VV'), s1_2016.select('VV'))),
  {min: -20, max: 0}, 'Change composite: red = brighter in 2024', false);
Map.addLayer(oldU.selfMask(), {palette: '#636363'}, 'Built-up 2016');
Map.addLayer(lei, {min: 1, max: 3, palette: ['#fdae61', '#d7191c', '#7b3294']}, 'New urban 2016→2024: infill / edge / outlying');
Map.addLayer(ghsl2020.selfMask(), {palette: 'cyan'}, 'GHSL built-up 2020 (validation)', false);

// ---------- 6 Export ----------
// Image: one 0/1 band per year (built_2016 … built_2024) plus the LEI class (0 = not new urban).
// toByte() stores small whole numbers compactly. crs 'EPSG:32752' = UTM zone 52S (metres); scale: 10 m.
Export.image.toDrive({image: ee.Image.cat(built.map(function(b, i) { return b.rename('built_' + YEARS[i]); })).addBands(lei.unmask(0)).toByte(),
  description: 'Prac10_urban_S1', folder: 'GEE_NT', region: aoi, scale: 10, crs: 'EPSG:32752', maxPixels: 1e11});
// Table: built-up km² per year as a CSV (start both exports in the Tasks tab).
Export.table.toDrive({collection: builtFc, description: 'Prac10_built_area', folder: 'GEE_NT'});

// Q: Why do buildings appear bright in SAR? Why can bare rock, mangrove edges or metal-roofed sheds cause commission errors?
// Q: Which suburbs grew most between 2016 and 2024? Is growth mainly infill, edge-expansion or outlying (leapfrog)?
// Q: Why are dry-season composites and a single orbit direction used?
// Q: Change VV_T_DB to −6 and −10 dB. How sensitive is the built-up area?
// Q: Why is the median of linear σ⁰ identical to the median in dB, while the mean and standard deviation are not?
// Hint: converting to dB keeps the order of values (it is monotonic), but it is not linear.
// EXT: Add Sentinel-2 NDVI/NDBI and train an RF classifier on S1+S2 features; compare accuracy with S1 alone (Prac 04a workflow).
// EXT: Add GLCM texture (linear VV quantised to 0–255, then .glcmTexture()) and test whether it improves urban detection.
// EXT: Relate urban expansion to NT planning: compare growth areas with the zoning/land release in the Darwin Regional Land Use Plan.
