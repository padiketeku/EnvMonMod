/**** Prac 08a — Surface water and wetland dynamics (Kakadu / Mary River floodplains, NT)
 * Data: JRC Global Surface Water v1.4 (Landsat, 1984–2021), Sentinel-2 MNDWI (2017–present).
 ****/

// ---------- 1 Study area ----------
var aoi = ee.Geometry.Rectangle([131.60, -12.95, 132.70, -12.10]);   // Mary, Wildman, West & South Alligator floodplains
Map.centerObject(aoi, 9);

// ---------- 2 Data ----------
var gsw = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').clip(aoi);
var yearly = ee.ImageCollection('JRC/GSW1_4/YearlyHistory');   // 0 no data, 1 not water, 2 seasonal, 3 permanent

// ---------- 3 Visualise JRC layers ----------
Map.addLayer(gsw.select('occurrence'), {min: 0, max: 100, palette: ['#ffffff', '#ffbbbb', '#0000ff']}, 'Occurrence (% of time water)');
Map.addLayer(gsw.select('seasonality'), {min: 1, max: 12, palette: ['#99d8c9', '#2ca25f', '#00441b']}, 'Seasonality (months water per year)', false);
Map.addLayer(gsw.select('transition'), {min: 0, max: 10,
  palette: ['#ffffff', '#0000ff', '#22b14c', '#d1102d', '#99d9ea', '#b5e61d', '#e6a1aa', '#ff7f27', '#ffc90e', '#7f7f7f', '#c3c3c3']},
  'Transition class 1984→2021', false);

// ---------- 4 Analysis: permanent vs seasonal water area per year ----------
var areaKm2 = ee.Image.pixelArea().divide(1e6);
var waterSeries = yearly.map(function(img) {
  var w = img.select('waterClass');
  var a = areaKm2.addBands(w).reduceRegion({
    reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'cls'}),
    geometry: aoi, scale: 30, maxPixels: 1e11, tileScale: 4});
  var groups = ee.FeatureCollection(ee.List(a.get('groups')).map(function(d) { return ee.Feature(null, d); }));
  var lookup = function(code) {
    var match = groups.filter(ee.Filter.eq('cls', code));
    return ee.Algorithms.If(match.size().gt(0), match.first().get('sum'), 0);
  };
  return ee.Feature(null, {year: img.get('year'), seasonal_km2: lookup(2), permanent_km2: lookup(3),
                           nodata_km2: lookup(0)});
});
print(ui.Chart.feature.byFeature(waterSeries, 'year', ['seasonal_km2', 'permanent_km2'])
  .setChartType('ColumnChart').setOptions({isStacked: true, title: 'JRC water area per year (km²)',
  colors: ['#99d8c9', '#08519c']}));
// Q: Check nodata_km2 in the exported table. Why are some early years unreliable?

// ---------- Sentinel-2 MNDWI: wet vs dry season ----------
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
function mndwi(start, end) {
  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(aoi).filterDate(start, end)
    .linkCollection(csPlus, ['cs_cdf'])
    .map(function(img) {
      return img.updateMask(img.select('cs_cdf').gte(0.5)).normalizedDifference(['B3', 'B11']).rename('MNDWI');
    }).median().clip(aoi);
}
var wetMNDWI = mndwi('2024-03-01', '2024-04-15');   // end of wet season (cloud permitting)
var dryMNDWI = mndwi('2024-09-15', '2024-10-31');   // end of dry season
var wetWater = wetMNDWI.gt(0).selfMask();
var dryWater = dryMNDWI.gt(0).selfMask();
Map.addLayer(wetWater, {palette: '#6baed6'}, 'Water (MNDWI>0) Mar–Apr 2024');
Map.addLayer(dryWater, {palette: '#08306b'}, 'Water (MNDWI>0) Sep–Oct 2024');

var wetArea = areaKm2.updateMask(wetWater).reduceRegion(ee.Reducer.sum(), aoi, 20, null, null, false, 1e11, 4);
var dryArea = areaKm2.updateMask(dryWater).reduceRegion(ee.Reducer.sum(), aoi, 20, null, null, false, 1e11, 4);
print('Open water km², late wet vs late dry 2024', wetArea, dryArea);

// ---------- 6 Export ----------
Export.table.toDrive({collection: waterSeries, description: 'Prac08a_JRC_water_area', folder: 'GEE_NT'});

// Q: Which parts of the floodplain are permanent vs seasonal water? Relate this to the paperbark swamps and billabongs.
// Q: MNDWI under-detects water beneath emergent vegetation (sedges, water lilies). How would this bias the wet-season area?
// Q: Look at transition classes near the coast of the Mary River. What do "new permanent" or "lost" classes suggest? (Hint: saltwater intrusion.)
// EXT: Optical sensors miss vegetated wetlands. Add Sentinel-1 VH (Prac 08b) and compare inundation extents.
// EXT: Calibrate the MNDWI threshold with Otsu's method instead of 0, and report the area sensitivity.
