/**** Prac 08a — Surface water and wetland dynamics (Kakadu / Mary River floodplains, NT)
 * Data: JRC Global Surface Water v1.4 (Landsat, 1984–2021), Sentinel-2 MNDWI (2017–present).
 *
 * WHAT THIS SCRIPT DOES:
 *   Asks where and how often open water occurs on the Mary, Wildman, West and South Alligator River floodplains.
 *   It maps the JRC long-term water layers (how often, how many months, how it changed 1984→2021), charts
 *   seasonal vs permanent water area each year, and compares late-wet and late-dry 2024 water from Sentinel-2 MNDWI.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) Optional EDIT lines: aoi (section 1) and the wet/dry date windows for wetMNDWI and dryMNDWI.
 *   (3) Click Run.
 *   (4) Read the Console (right panel) for the chart and water areas, turn layers on/off in the Map's Layers list,
 *       and start the export in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   - Map: JRC water occurrence (%), seasonality (months/year), transition class 1984→2021,
 *     and Sentinel-2 water (MNDWI > 0) for Mar–Apr and Sep–Oct 2024.
 *   - Console: stacked column chart of seasonal and permanent water area (km²) per year, and open-water area (km²)
 *     for late wet vs late dry 2024.
 *
 * DATA:
 *   - JRC Global Surface Water v1.4, JRC/GSW1_4/GlobalSurfaceWater, 30 m, 1984–2021 summary layers.
 *   - JRC Yearly Water Classification History v1.4, JRC/GSW1_4/YearlyHistory, 30 m, one image per year 1984–2021.
 *   - Sentinel-2 surface reflectance, COPERNICUS/S2_SR_HARMONIZED, B3 (10 m) and B11 (20 m), Mar–Apr and Sep–Oct 2024.
 *   - Cloud Score+, GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED, 10 m, matched to each Sentinel-2 image.
 *
 * LINKS: pracs/prac08-sar-and-water-surface-water-sentinel-1-flood-mapping-wetlands-and-mangroves.md
 *   (course repository). Feeds Prac 08 and AT4 Part 4.
 *
 * KEY GEE IDEAS:
 *   - Using a ready-made global product (JRC) and its band meanings and class codes.
 *   - map() over an ImageCollection with a grouped reducer inside, to get area per class per year.
 *   - Server-side conditionals (ee.Algorithms.If) when a class may be missing in some years.
 *   - reduceRegion arguments (scale, maxPixels, tileScale) — here also given by position, not by name.
 *
 * Q = core (ENV306 and ENV506). EXT = ENV506 extension.
 ****/

// ---------- 1 Study area ----------
// A rectangle over the coastal floodplains between Darwin and Kakadu.
var aoi = ee.Geometry.Rectangle([131.60, -12.95, 132.70, -12.10]);   // Mary, Wildman, West & South Alligator floodplains
Map.centerObject(aoi, 9);

// ---------- 2 Data ----------
// JRC Global Surface Water: water mapped from every Landsat image since 1984.
// gsw = one image of long-term summaries; yearly = one image per year with a water class per pixel.
var gsw = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').clip(aoi);
var yearly = ee.ImageCollection('JRC/GSW1_4/YearlyHistory');   // 0 no data, 1 not water, 2 seasonal, 3 permanent

// ---------- 3 Visualise JRC layers ----------
// occurrence = % of valid observations that were water (0–100); seasonality = months of water in a typical year (1–12);
// transition = change class between the first and last years (e.g. permanent, new seasonal, lost permanent).
Map.addLayer(gsw.select('occurrence'), {min: 0, max: 100, palette: ['#ffffff', '#ffbbbb', '#0000ff']}, 'Occurrence (% of time water)');
Map.addLayer(gsw.select('seasonality'), {min: 1, max: 12, palette: ['#99d8c9', '#2ca25f', '#00441b']}, 'Seasonality (months water per year)', false);
// The 11 colours follow the JRC transition legend for classes 0–10 (click a pixel with Inspector to read its class).
Map.addLayer(gsw.select('transition'), {min: 0, max: 10,
  palette: ['#ffffff', '#0000ff', '#22b14c', '#d1102d', '#99d9ea', '#b5e61d', '#e6a1aa', '#ff7f27', '#ffc90e', '#7f7f7f', '#c3c3c3']},
  'Transition class 1984→2021', false);

// ---------- 4 Analysis: permanent vs seasonal water area per year ----------
// For each yearly image, total the km² in each water class, then pull out seasonal (2), permanent (3) and no-data (0).
var areaKm2 = ee.Image.pixelArea().divide(1e6);   // pixel area in m² ÷ 1 000 000 = km²
var waterSeries = yearly.map(function(img) {
  var w = img.select('waterClass');
  // Grouped reducer: sum band 0 (km²) for each value of band 1 (waterClass). scale 30 = JRC/Landsat pixel size;
  // maxPixels lifts the pixel limit; tileScale 4 uses smaller tiles to avoid memory errors.
  var a = areaKm2.addBands(w).reduceRegion({
    reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'cls'}),
    geometry: aoi, scale: 30, maxPixels: 1e11, tileScale: 4});
  var groups = ee.FeatureCollection(ee.List(a.get('groups')).map(function(d) { return ee.Feature(null, d); }));
  // lookup(code): area for one class, or 0 if that class is absent this year (server-side "if").
  var lookup = function(code) {
    var match = groups.filter(ee.Filter.eq('cls', code));
    return ee.Algorithms.If(match.size().gt(0), match.first().get('sum'), 0);
  };
  return ee.Feature(null, {year: img.get('year'), seasonal_km2: lookup(2), permanent_km2: lookup(3),
                           nodata_km2: lookup(0)});
});
print(ui.Chart.feature.byFeature(waterSeries, 'year', ['seasonal_km2', 'permanent_km2'])
  .setChartType('ColumnChart').setOptions({isStacked: true, title: 'JRC water area per year (km²)',
  colors: ['#99d8c9', '#08519c']}));   // light = seasonal, dark = permanent
// Q: Check nodata_km2 in the exported table. Why are some early years unreliable?

// ---------- Sentinel-2 MNDWI: wet vs dry season ----------
// A recent, finer check than JRC. MNDWI = (Green − SWIR1) / (Green + SWIR1); open water is usually > 0
// because water reflects some green light but almost no SWIR. Unitless, −1 to 1.
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
function mndwi(start, end) {
  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(aoi).filterDate(start, end)
    .linkCollection(csPlus, ['cs_cdf'])   // attach the matching Cloud Score+ band to each S2 image
    .map(function(img) {
      // Keep pixels with cs_cdf ≥ 0.5 (0 = cloudy, 1 = clear; a starting value — test others). B3 = green, B11 = SWIR1.
      // No ÷ 10000 needed: a normalised difference is the same in digital numbers or reflectance.
      return img.updateMask(img.select('cs_cdf').gte(0.5)).normalizedDifference(['B3', 'B11']).rename('MNDWI');
    }).median().clip(aoi);   // median of the window: robust to leftover cloud and shadow
}
var wetMNDWI = mndwi('2024-03-01', '2024-04-15');   // end of wet season (cloud permitting)
var dryMNDWI = mndwi('2024-09-15', '2024-10-31');   // end of dry season
// Threshold 0 is a common starting value — test others (see the Otsu EXT below). selfMask hides non-water.
var wetWater = wetMNDWI.gt(0).selfMask();
var dryWater = dryMNDWI.gt(0).selfMask();
Map.addLayer(wetWater, {palette: '#6baed6'}, 'Water (MNDWI>0) Mar–Apr 2024');
Map.addLayer(dryWater, {palette: '#08306b'}, 'Water (MNDWI>0) Sep–Oct 2024');

// reduceRegion arguments given by position: reducer, geometry, scale (20 m = B11 pixel size), crs (null = default),
// crsTransform (null), bestEffort (false), maxPixels (1e11), tileScale (4).
var wetArea = areaKm2.updateMask(wetWater).reduceRegion(ee.Reducer.sum(), aoi, 20, null, null, false, 1e11, 4);
var dryArea = areaKm2.updateMask(dryWater).reduceRegion(ee.Reducer.sum(), aoi, 20, null, null, false, 1e11, 4);
print('Open water km², late wet vs late dry 2024', wetArea, dryArea);   // each prints as {area: km²}

// ---------- 6 Export ----------
// The yearly JRC area table (including nodata_km2) as a CSV in Google Drive. Start it in the Tasks tab.
Export.table.toDrive({collection: waterSeries, description: 'Prac08a_JRC_water_area', folder: 'GEE_NT'});

// Q: Which parts of the floodplain are permanent vs seasonal water? Relate this to the paperbark swamps and billabongs.
// Q: MNDWI under-detects water beneath emergent vegetation (sedges, water lilies). How would this bias the wet-season area?
// Q: Look at transition classes near the coast of the Mary River. What do "new permanent" or "lost" classes suggest? (Hint: saltwater intrusion.)
// EXT: Optical sensors miss vegetated wetlands. Add Sentinel-1 VH (Prac 08b) and compare inundation extents.
// EXT: Calibrate the MNDWI threshold with Otsu's method instead of 0, and report the area sensitivity.
