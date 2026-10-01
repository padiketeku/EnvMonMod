/**** Prac 08c — Mangrove dynamics: the 2015–16 Gulf of Carpentaria dieback (Limmen Bight, NT)
 * Context: ~7,400 ha of mangroves died along ~1,000 km of coast between the Roper River (NT) and Karumba (Qld)
 * over summer 2015–16; the NT lost ~5,500 ha (Duke et al. 2017). Drought, heat and a temporary sea-level drop
 * during a strong El Niño are the likely causes.
 ****/

// ---------- 1 Study area ----------
var aoi = ee.Geometry.Rectangle([135.30, -15.60, 136.60, -14.60]);   // Roper River mouth to Limmen Bight & beyond
Map.centerObject(aoi, 9);

// ---------- 2 Data ----------
// Pre-dieback mangrove extent: Giri et al. (2011), Landsat 2000
var mangrove2000 = ee.ImageCollection('LANDSAT/MANGROVE_FORESTS').filterBounds(aoi).mosaic().clip(aoi).selfMask();
// Post-dieback reference: ESA WorldCover 2021, class 95 = mangroves
var mangrove2021 = ee.ImageCollection('ESA/WorldCover/v200').first().clip(aoi).eq(95).selfMask();
// Optional: Global Mangrove Watch v3 in the GEE community catalogue (check path at gee-community-catalog.org)

function prep(img) {
  var qa = img.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(1 << 3).eq(0).and(qa.bitwiseAnd(1 << 4).eq(0));
  var sr = img.select('SR_B.').multiply(0.0000275).add(-0.2);
  return img.addBands(sr, null, true).updateMask(mask);
}
var l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2').merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
  .filterBounds(aoi).map(function(img) {
    var p = prep(img);
    return p.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI')
      .copyProperties(img, ['system:time_start']);
  });

// ---------- 3 Processing: annual dry-season NDVI inside the 2000 mangrove mask ----------
var years = ee.List.sequence(2014, 2024);
var annual = ee.ImageCollection.fromImages(years.map(function(y) {
  y = ee.Number(y);
  return l8.filter(ee.Filter.calendarRange(y, y, 'year'))
    .filter(ee.Filter.calendarRange(6, 10, 'month')).median()
    .updateMask(mangrove2000).set('year', y)
    .set('system:time_start', ee.Date.fromYMD(y, 8, 1).millis());
}));

// ---------- 4 Analysis ----------
print(ui.Chart.image.series(annual, aoi, ee.Reducer.mean(), 30)
  .setOptions({title: 'Mean dry-season NDVI within 2000 mangrove extent', pointSize: 4}));

var ndvi2015 = annual.filter(ee.Filter.eq('year', 2015)).first();
var ndvi2017 = annual.filter(ee.Filter.eq('year', 2017)).first();
var ndvi2024 = annual.filter(ee.Filter.eq('year', 2024)).first();
var dNDVI = ndvi2017.subtract(ndvi2015).rename('dNDVI');
var dieback = dNDVI.lt(-0.2).and(ndvi2017.lt(0.3)).selfMask();   // teaching thresholds — test them
var recovery = dieback.and(ndvi2024.gt(0.45)).selfMask();

var areaHa = ee.Image.pixelArea().divide(1e4);
function sumHa(mask) {
  return areaHa.updateMask(mask).reduceRegion({reducer: ee.Reducer.sum(), geometry: aoi,
    scale: 30, maxPixels: 1e11, tileScale: 4}).get('area');
}
print('Mangrove area 2000 (Giri), ha', sumHa(mangrove2000));
print('Mangrove area 2021 (WorldCover), ha', sumHa(mangrove2021));
print('Dieback 2015→2017 (NDVI rule), ha', sumHa(dieback));
print('Of which NDVI > 0.45 by 2024, ha', sumHa(recovery));

// ---------- 5 Visualise ----------
Map.addLayer(mangrove2000, {palette: '#1b7837'}, 'Mangroves 2000 (Giri)');
Map.addLayer(mangrove2021, {palette: '#a6dba0'}, 'Mangroves 2021 (WorldCover)', false);
Map.addLayer(dNDVI, {min: -0.5, max: 0.2, palette: ['#67001f', '#f4a582', '#f7f7f7', '#4393c3']}, 'dNDVI 2015→2017');
Map.addLayer(dieback, {palette: '#ff00ff'}, 'Dieback (NDVI rule)');
Map.addLayer(recovery, {palette: '#00ff00'}, 'Recovered by 2024', false);

// ---------- 6 Export ----------
Export.image.toDrive({image: dNDVI.addBands(dieback.unmask(0).rename('dieback')).float(),
  description: 'Prac08c_mangrove_dieback', folder: 'GEE_NT', region: aoi, scale: 30, crs: 'EPSG:32753', maxPixels: 1e11});

// Q: Where along the coast is dieback concentrated: the seaward fringe or the landward edge next to saltpans? Why?
// Q: Compare the Giri 2000 and WorldCover 2021 areas. List reasons (other than dieback) they differ.
// Q: Is there evidence of recovery by 2024?
// EXT: Rainfall (CHIRPS) and sea-level data are drivers. Build a monthly NDVI series 2013–2018 and align it with CHIRPS anomalies (Prac 03a).
// EXT: Separate dieback (dead standing stems, NDVI drop) from erosion/shoreline retreat (land→water) using MNDWI.
// EXT: Repeat with Global Mangrove Watch v3 and quantify how the choice of baseline map changes the dieback estimate.
