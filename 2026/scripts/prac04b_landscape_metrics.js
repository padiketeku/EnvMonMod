/**** Prac 04b — Spatial pattern analysis: landscape metrics for woodland habitat (Douglas–Daly, NT)
 * LO1 + LO4. Patch–corridor–matrix, fragmentation, edge, core area, isolation, heterogeneity.
 * Data: Google Dynamic World (10 m, 2015–present) dry-season modal land cover, 2017 vs 2024.
 * (Swap in your own Prac 04a classification by replacing lcBefore / lcAfter.)
 ****/

// ---------- 1 Study area & parameters ----------
var aoi = ee.Geometry.Rectangle([131.05, -14.05, 131.45, -13.65]);
var SCALE = 30;              // analysis grain (m). Re-run at 10, 30, 90 — metrics are scale-dependent.
var EDGE_DEPTH = 100;        // m; edge-effect distance used for core area
Map.centerObject(aoi, 11);

// ---------- 2 Data ----------
function dryMode(year) {
  return ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1').filterBounds(aoi)
    .filterDate(year + '-05-01', year + '-09-30').select('label').mode().clip(aoi);
}
// DW classes: 0 water 1 trees 2 grass 3 flooded veg 4 crops 5 shrub 6 built 7 bare 8 snow
var lcBefore = dryMode(2017), lcAfter = dryMode(2024);
var dwPal = ['#419bdf', '#397d49', '#88b053', '#7a87c6', '#e49635', '#dfc35a', '#c4281b', '#a59b8f', '#b39fe1'];
Map.addLayer(lcBefore, {min: 0, max: 8, palette: dwPal}, 'Land cover 2017 (DW dry-season mode)', false);
Map.addLayer(lcAfter, {min: 0, max: 8, palette: dwPal}, 'Land cover 2024 (DW dry-season mode)');

// Habitat = trees (class 1) + shrub (5); everything else = matrix
function habitat(lc) { return lc.eq(1).or(lc.eq(5)).rename('habitat'); }

// ---------- 3 Metrics ----------
var proj = ee.Projection('EPSG:32752').atScale(SCALE);
function metrics(lc, label) {
  var hab = habitat(lc).reproject(proj);
  var pixA = ee.Image.pixelArea();

  // Patches as vectors (8-neighbour rule)
  var patches = hab.selfMask().reduceToVectors({geometry: aoi, crs: proj, geometryType: 'polygon',
    eightConnected: true, maxPixels: 1e10, tileScale: 4});
  patches = patches.map(function(f) {
    return f.set({area_ha: f.area(1).divide(1e4), perim_m: f.perimeter(1)});
  });
  var totalHa = ee.Number(aoi.area(1)).divide(1e4);
  var habHa = ee.Number(patches.aggregate_sum('area_ha'));

  // Edge = habitat pixels with a matrix neighbour; core = habitat further than EDGE_DEPTH from matrix
  var edge = hab.and(hab.focalMin({radius: 1, units: 'pixels'}).not());
  var dist = hab.not().fastDistanceTransform(256).sqrt().multiply(SCALE);   // m to nearest matrix pixel
  var core = hab.and(dist.gt(EDGE_DEPTH));
  var coreHa = pixA.updateMask(core).reduceRegion(ee.Reducer.sum(), aoi, SCALE, proj, null, false, 1e10).getNumber('area').divide(1e4);
  // Isolation: distance from each matrix pixel to nearest habitat
  var isolation = hab.fastDistanceTransform(512).sqrt().multiply(SCALE).updateMask(hab.not());

  var stats = ee.Dictionary({
    label: label,
    PLAND_pct: habHa.divide(totalHa).multiply(100),
    NP_patches: patches.size(),
    MPS_ha: habHa.divide(patches.size()),
    LPI_pct: ee.Number(patches.aggregate_max('area_ha')).divide(totalHa).multiply(100),
    ED_m_per_ha: ee.Number(patches.aggregate_sum('perim_m')).divide(totalHa),
    CORE_pct_of_habitat: coreHa.divide(habHa).multiply(100),
    mean_isolation_m: isolation.reduceRegion(ee.Reducer.mean(), aoi, SCALE, proj, null, false, 1e10).values().get(0)
  });
  return {stats: stats, patches: patches, edge: edge, core: core, isolation: isolation, hab: hab};
}

var m1 = metrics(lcBefore, '2017');
var m2 = metrics(lcAfter, '2024');
print('Landscape metrics 2017', m1.stats);
print('Landscape metrics 2024', m2.stats);

// Patch size distribution
print(ui.Chart.feature.histogram(m2.patches, 'area_ha', 30)
  .setOptions({title: 'Patch size distribution 2024 (ha)', hAxis: {title: 'Patch area (ha)'}, vAxis: {scaleType: 'log'}}));

// ---------- Landscape heterogeneity: moving-window Shannon diversity ----------
var RADIUS = 300;   // m
function shannon(lc) {
  var classes = [0, 1, 2, 4, 5, 6, 7];
  var H = ee.Image(0);
  classes.forEach(function(c) {
    var p = lc.eq(c).reduceNeighborhood({reducer: ee.Reducer.mean(),
      kernel: ee.Kernel.circle({radius: RADIUS, units: 'meters'})});
    H = H.subtract(p.multiply(p.max(1e-6).log()));
  });
  return H.rename('shannon');
}
var H2024 = shannon(lcAfter.reproject(proj));

// ---------- 5 Visualise ----------
Map.addLayer(m2.hab.selfMask(), {palette: '#1b7837'}, 'Habitat 2024');
Map.addLayer(m2.core.selfMask(), {palette: '#00441b'}, 'Core habitat 2024 (> ' + EDGE_DEPTH + ' m from edge)', false);
Map.addLayer(m2.edge.selfMask(), {palette: '#ff7f00'}, 'Habitat edge 2024', false);
Map.addLayer(m2.isolation, {min: 0, max: 2000, palette: ['#ffffcc', '#fd8d3c', '#800026']}, 'Distance to nearest habitat (m)', false);
Map.addLayer(H2024, {min: 0, max: 1.5, palette: ['#f7fcfd', '#8c96c6', '#4d004b']}, 'Shannon diversity (' + RADIUS + ' m window)', false);
var lost = m1.hab.and(m2.hab.not()).selfMask();
Map.addLayer(lost, {palette: 'red'}, 'Habitat lost 2017→2024');

// ---------- 6 Export ----------
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
