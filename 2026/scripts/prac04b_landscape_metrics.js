/**** Prac 04b — Spatial pattern analysis: landscape metrics for woodland habitat (Douglas–Daly, NT)
 * LO1 + LO4. Patch–corridor–matrix, fragmentation, edge, core area, isolation, heterogeneity.
 * Data: Google Dynamic World (10 m, 2015–present) dry-season modal land cover, 2017 vs 2024.
 * (Swap in your own Prac 04a classification by replacing lcBefore / lcAfter.)
 *
 * WHAT THIS SCRIPT DOES:
 *   Asks: has woodland habitat in the Douglas–Daly (an NT agricultural frontier) been lost or broken into smaller,
 *   more isolated pieces between 2017 and 2024? It maps habitat (trees + shrub) from Dynamic World, turns it into
 *   patches, and calculates classic landscape metrics (PLAND, NP, MPS, LPI, ED, core area, isolation) for both years,
 *   plus a moving-window Shannon diversity map for 2024.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) Optional EDIT: SCALE (analysis grain) and EDGE_DEPTH in section 1; RADIUS for the Shannon window.
 *   (3) Click Run (patch vectors can take a minute).
 *   (4) Read the metrics and patch-size chart in the Console (right panel), turn layers on/off in the Map's Layers
 *       list, and start the two exports in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   Map layers: land cover 2017 and 2024; habitat 2024; core habitat; habitat edge; distance to nearest habitat;
 *   Shannon diversity; habitat lost 2017→2024 (red).
 *   Console: a dictionary of landscape metrics for each year, and a histogram of 2024 patch sizes (ha, log scale).
 *
 * DATA:
 *   GOOGLE/DYNAMICWORLD/V1 — Dynamic World near-real-time land cover from Sentinel-2, 10 m, 2015–present;
 *     the most common ('mode') label over May–Sep 2017 and May–Sep 2024 is used. Analysed at SCALE (default 30 m).
 *
 * LINKS:
 *   Prac page: pracs/prac04-land-cover-mapping-and-landscape-metrics.md
 *   Assessment: Prac 04; AT4 Part 1; training points reused for AT3.
 *
 * KEY GEE IDEAS:
 *   - Projections and scale: reproject() fixes the analysis grain, so metrics change when SCALE changes.
 *   - Raster to vector: reduceToVectors() turns connected habitat pixels into patch polygons.
 *   - Neighbourhood operations: focalMin, fastDistanceTransform and reduceNeighborhood look at surrounding pixels.
 *   - Server-side dictionaries (ee.Dictionary) and aggregate_* functions summarise a FeatureCollection.
 *
 * Q = core (ENV306 and ENV506).  EXT = ENV506 extension.
 ****/

// ---------- 1 Study area & parameters ----------
// A ~44 × 44 km box in the Douglas–Daly region, and the two settings that control the metrics.
var aoi = ee.Geometry.Rectangle([131.05, -14.05, 131.45, -13.65]);   // [west, south, east, north]
// EDIT (optional): analysis grain and edge depth.
var SCALE = 30;              // analysis grain (m). Re-run at 10, 30, 90 — metrics are scale-dependent.
var EDGE_DEPTH = 100;        // m; edge-effect distance used for core area
Map.centerObject(aoi, 11);

// ---------- 2 Data ----------
// Dynamic World gives a land-cover label for every clear Sentinel-2 image. The dry-season mode (most frequent label
// May–Sep) gives one stable map per year and avoids wet-season cloud and flooding.
function dryMode(year) {
  return ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1').filterBounds(aoi)
    .filterDate(year + '-05-01', year + '-09-30').select('label').mode().clip(aoi);   // mode = most common class per pixel
}
// DW classes: 0 water 1 trees 2 grass 3 flooded veg 4 crops 5 shrub 6 built 7 bare 8 snow
var lcBefore = dryMode(2017), lcAfter = dryMode(2024);
// official DW colours, classes 0–8
var dwPal = ['#419bdf', '#397d49', '#88b053', '#7a87c6', '#e49635', '#dfc35a', '#c4281b', '#a59b8f', '#b39fe1'];
Map.addLayer(lcBefore, {min: 0, max: 8, palette: dwPal}, 'Land cover 2017 (DW dry-season mode)', false);
Map.addLayer(lcAfter, {min: 0, max: 8, palette: dwPal}, 'Land cover 2024 (DW dry-season mode)');

// Habitat = trees (class 1) + shrub (5); everything else = matrix
// Returns a 1/0 image: 1 = habitat, 0 = matrix (the non-habitat surroundings in the patch–corridor–matrix model).
function habitat(lc) { return lc.eq(1).or(lc.eq(5)).rename('habitat'); }

// ---------- 3 Metrics ----------
// metrics() computes all landscape metrics for one land-cover map and returns them with the layers used to make them.
// EPSG:32752 = WGS 84 / UTM zone 52S, a metric projection; atScale(SCALE) sets the pixel size in metres.
var proj = ee.Projection('EPSG:32752').atScale(SCALE);
function metrics(lc, label) {
  var hab = habitat(lc).reproject(proj);   // force the analysis onto the SCALE grid (nearest-neighbour resampling)
  var pixA = ee.Image.pixelArea();   // area of each pixel in m²

  // Patches as vectors (8-neighbour rule)
  // selfMask() hides matrix (0) pixels so only habitat becomes polygons. eightConnected: true joins pixels that touch
  // diagonally into one patch. maxPixels and tileScale give GEE enough room for a large job.
  var patches = hab.selfMask().reduceToVectors({geometry: aoi, crs: proj, geometryType: 'polygon',
    eightConnected: true, maxPixels: 1e10, tileScale: 4});
  // Add patch area (ha) and perimeter (m) to every patch. The 1 is the allowed error in metres for the calculation.
  patches = patches.map(function(f) {
    return f.set({area_ha: f.area(1).divide(1e4), perim_m: f.perimeter(1)});   // m² ÷ 1e4 = ha
  });
  var totalHa = ee.Number(aoi.area(1)).divide(1e4);   // whole landscape (ha)
  var habHa = ee.Number(patches.aggregate_sum('area_ha'));   // total habitat (ha)

  // Edge = habitat pixels with a matrix neighbour; core = habitat further than EDGE_DEPTH from matrix
  // focalMin over a 1-pixel radius is 0 if any neighbour is matrix; .not() flips that to 1 = "touches matrix".
  var edge = hab.and(hab.focalMin({radius: 1, units: 'pixels'}).not());
  // fastDistanceTransform returns SQUARED distance in pixels to the nearest non-zero pixel (here: matrix),
  // searching up to 256 pixels; sqrt() then × SCALE converts it to metres.
  var dist = hab.not().fastDistanceTransform(256).sqrt().multiply(SCALE);   // m to nearest matrix pixel
  var core = hab.and(dist.gt(EDGE_DEPTH));
  // Sum pixel areas inside core habitat. Positional arguments: reducer, geometry, scale, crs, crsTransform (null),
  // bestEffort (false), maxPixels (1e10). 'area' is the band name from pixelArea(); ÷ 1e4 = ha.
  var coreHa = pixA.updateMask(core).reduceRegion(ee.Reducer.sum(), aoi, SCALE, proj, null, false, 1e10).getNumber('area').divide(1e4);
  // Isolation: distance from each matrix pixel to nearest habitat
  // Search radius 512 pixels (about 15 km at 30 m); masked to matrix pixels only.
  var isolation = hab.fastDistanceTransform(512).sqrt().multiply(SCALE).updateMask(hab.not());

  // The metrics. Units are in each key name: _pct = %, _ha = hectares, _m = metres.
  var stats = ee.Dictionary({
    label: label,
    PLAND_pct: habHa.divide(totalHa).multiply(100),   // percentage of landscape that is habitat
    NP_patches: patches.size(),   // number of patches
    MPS_ha: habHa.divide(patches.size()),   // mean patch size
    // largest patch index: biggest patch as % of landscape
    LPI_pct: ee.Number(patches.aggregate_max('area_ha')).divide(totalHa).multiply(100),
    // Edge density: total patch perimeter per hectare of landscape (includes patch edges cut by the study-area boundary)
    ED_m_per_ha: ee.Number(patches.aggregate_sum('perim_m')).divide(totalHa),
    CORE_pct_of_habitat: coreHa.divide(habHa).multiply(100),   // share of habitat more than EDGE_DEPTH from the matrix
    // mean distance from matrix to habitat
    mean_isolation_m: isolation.reduceRegion(ee.Reducer.mean(), aoi, SCALE, proj, null, false, 1e10).values().get(0)
  });
  // a client-side object holding server-side results
  return {stats: stats, patches: patches, edge: edge, core: core, isolation: isolation, hab: hab};
}

var m1 = metrics(lcBefore, '2017');
var m2 = metrics(lcAfter, '2024');
print('Landscape metrics 2017', m1.stats);   // compare these two dictionaries key by key
print('Landscape metrics 2024', m2.stats);

// Patch size distribution
// Histogram of 2024 patch areas in up to 30 bins. The log vertical axis lets the few large patches show next to many tiny ones.
print(ui.Chart.feature.histogram(m2.patches, 'area_ha', 30)
  .setOptions({title: 'Patch size distribution 2024 (ha)', hAxis: {title: 'Patch area (ha)'}, vAxis: {scaleType: 'log'}}));

// ---------- Landscape heterogeneity: moving-window Shannon diversity ----------
// For each pixel, the share of each class within a RADIUS circle, then H = −Σ p·ln(p).
// H = 0 where one class fills the window; higher H = a more mixed landscape (maximum ln 7 ≈ 1.95 for 7 classes).
// EDIT (optional): window radius.
var RADIUS = 300;   // m
function shannon(lc) {
  var classes = [0, 1, 2, 4, 5, 6, 7];   // DW classes used (flooded veg 3 and snow 8 left out)
  var H = ee.Image(0);
  classes.forEach(function(c) {   // client-side loop: adds one term per class to H
    var p = lc.eq(c).reduceNeighborhood({reducer: ee.Reducer.mean(),   // mean of a 1/0 image = proportion of class c
      kernel: ee.Kernel.circle({radius: RADIUS, units: 'meters'})});
    H = H.subtract(p.multiply(p.max(1e-6).log()));   // max(1e-6) avoids log(0); where p = 0 the term is still 0
  });
  return H.rename('shannon');
}
var H2024 = shannon(lcAfter.reproject(proj));   // computed on the SCALE grid

// ---------- 5 Visualise ----------
// Layers for 2024 (and habitat lost since 2017). Layers with 'false' start off — tick them in Layers.
// selfMask() hides 0 pixels so only the feature of interest is coloured.
Map.addLayer(m2.hab.selfMask(), {palette: '#1b7837'}, 'Habitat 2024');
Map.addLayer(m2.core.selfMask(), {palette: '#00441b'}, 'Core habitat 2024 (> ' + EDGE_DEPTH + ' m from edge)', false);
Map.addLayer(m2.edge.selfMask(), {palette: '#ff7f00'}, 'Habitat edge 2024', false);
Map.addLayer(m2.isolation, {min: 0, max: 2000, palette: ['#ffffcc', '#fd8d3c', '#800026']}, 'Distance to nearest habitat (m)', false);
Map.addLayer(H2024, {min: 0, max: 1.5, palette: ['#f7fcfd', '#8c96c6', '#4d004b']}, 'Shannon diversity (' + RADIUS + ' m window)', false);
var lost = m1.hab.and(m2.hab.not()).selfMask();   // habitat in 2017 but not in 2024
Map.addLayer(lost, {palette: 'red'}, 'Habitat lost 2017→2024');

// ---------- 6 Export ----------
// Two tasks to start in the Tasks tab, both to the GEE_NT folder in Google Drive:
// a CSV (the default format) with one row of metrics per year, and a shapefile of the 2024 patches with area and perimeter.
Export.table.toDrive({collection: ee.FeatureCollection([ee.Feature(null, m1.stats), ee.Feature(null, m2.stats)]),
  description: 'Prac04b_landscape_metrics', folder: 'GEE_NT'});
Export.table.toDrive({collection: m2.patches, description: 'Prac04b_patches_2024', folder: 'GEE_NT', fileFormat: 'SHP'});

// Q: How did PLAND, NP, MPS, LPI, ED and core area change from 2017 to 2024? Is this fragmentation, habitat loss, or both?
// Q: Re-run with SCALE = 10 and 90. Which metrics are most scale-sensitive? Relate this to grain and extent.
// Q: Why does EDGE_DEPTH matter for a species such as a hollow-dependent woodland bird?
// EXT: Add two more metrics in the Code Editor — perimeter–area ratio per patch and an area-weighted shape index
//      (perimeter / (2·√(π·area))) — and interpret them for habitat edge effects.
// EXT: Dynamic World is probabilistic. Use the 'trees' probability band with thresholds 0.4/0.5/0.6 and quantify how much the metrics depend on classification choices.
// EXT: Write a 300-word briefing for an NT land-clearing assessment officer explaining which metrics they should report, and why.
