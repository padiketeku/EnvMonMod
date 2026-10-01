/**** Prac 01a — Google Earth Engine basics (Northern Territory)
 * ENV306/506 Environmental Monitoring and Modelling (2026)
 * Learning goals: ee objects, filtering, cloud masking, scaling, reducers, charts, export.
 * Q = core (ENV306 and ENV506).  EXT = ENV506 extension.
 ****/

// ---------- 1 Study area ----------
var nt = ee.FeatureCollection('FAO/GAUL/2015/level1')
  .filter(ee.Filter.eq('ADM1_NAME', 'Northern Territory'));
var darwin = ee.Geometry.Point([130.8456, -12.4634]);
var aoi = darwin.buffer(20000);           // 20 km buffer around Darwin
Map.centerObject(aoi, 10);
Map.addLayer(nt.style({color: 'black', fillColor: '00000000'}), {}, 'NT boundary');

// ---------- 2 Data ----------
// Landsat 8/9 Collection 2 Level 2 (surface reflectance). Scale: SR * 0.0000275 - 0.2
function prepLandsat(img) {
  var qa = img.select('QA_PIXEL');
  // bit 1 dilated cloud, 3 cloud, 4 cloud shadow
  var mask = qa.bitwiseAnd(1 << 1).eq(0)
    .and(qa.bitwiseAnd(1 << 3).eq(0))
    .and(qa.bitwiseAnd(1 << 4).eq(0));
  var sr = img.select('SR_B.').multiply(0.0000275).add(-0.2);
  return img.addBands(sr, null, true).updateMask(mask)
    .select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'],
            ['blue', 'green', 'red', 'nir', 'swir1', 'swir2']);
}
var landsat = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
  .filterBounds(aoi)
  .filterDate('2024-05-01', '2024-09-30')   // NT dry season = fewer clouds
  .map(prepLandsat);
print('Number of Landsat scenes', landsat.size());

// Sentinel-2 with Cloud Score+ masking. Scale: reflectance / 10000
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(aoi)
  .filterDate('2024-05-01', '2024-09-30')
  .linkCollection(csPlus, ['cs_cdf'])
  .map(function(img) {
    return ee.Image(img.updateMask(img.select('cs_cdf').gte(0.6))
      .select(['B2', 'B3', 'B4', 'B8', 'B11', 'B12'],
              ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'])
      .divide(10000)
      .copyProperties(img, ['system:time_start']));
  });
print('Number of Sentinel-2 scenes', s2.size());

// ---------- 3 Processing ----------
var lsComposite = landsat.median().clip(aoi);
var s2Composite = s2.median().clip(aoi);
var ndvi = s2Composite.normalizedDifference(['nir', 'red']).rename('NDVI');

// ---------- 4 Analysis: reducers ----------
var stats = ndvi.reduceRegion({
  reducer: ee.Reducer.mean().combine(ee.Reducer.stdDev(), null, true),
  geometry: aoi, scale: 10, maxPixels: 1e10
});
print('NDVI mean and SD (Darwin, 2024 dry season)', stats);

// ---------- 5 Visualise ----------
var rgb = {bands: ['red', 'green', 'blue'], min: 0, max: 0.3};
Map.addLayer(lsComposite, rgb, 'Landsat 8/9 true colour');
Map.addLayer(s2Composite, rgb, 'Sentinel-2 true colour');
Map.addLayer(ndvi, {min: 0, max: 0.8, palette: ['#a6611a', '#f5f5f5', '#018571']}, 'NDVI');

print(ui.Chart.image.histogram({image: ndvi, region: aoi, scale: 30, maxPixels: 1e9})
  .setOptions({title: 'NDVI histogram, Darwin 20 km buffer'}));

// ---------- 6 Export ----------
Export.image.toDrive({
  image: ndvi, description: 'Prac01a_NDVI_Darwin_2024', folder: 'GEE_NT',
  region: aoi, scale: 10, crs: 'EPSG:32752', maxPixels: 1e10   // UTM zone 52S
});

// Q: Why do we composite over May–September in the Top End?
// Q: Compare the number of Landsat and Sentinel-2 scenes. Why do they differ?
// Q: What happens to the NDVI mean if you set scale to 250? Why?
// EXT: Replace median() with qualityMosaic() on NDVI. Explain the difference and when each is preferable.
// EXT: Change the Cloud Score+ threshold (0.5, 0.6, 0.7) and quantify the effect on valid pixel counts.
