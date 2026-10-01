/**** Prac 01a — Google Earth Engine basics (Northern Territory)
 * ENV306/506 Environmental Monitoring and Modelling (2026)
 * Learning goals: ee objects, filtering, cloud masking, scaling, reducers, charts, export.
 *
 * WHAT THIS SCRIPT DOES:
 *   Builds cloud-free dry-season 2024 images of a 20 km area around Darwin from Landsat 8/9 and Sentinel-2,
 *   calculates NDVI (a greenness index), summarises it with a mean and standard deviation, and exports it.
 *   It is a tour of the basic Earth Engine workflow: find data → clean it → combine it → summarise → export.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) No EDIT lines are needed. Later, try changing the dates or the buffer distance (section 1) yourself.
 *   (3) Click Run.
 *   (4) Read the Console (right panel), turn layers on/off in the Map's Layers list, and start the export in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   Map: NT boundary, Landsat 8/9 and Sentinel-2 true-colour composites, and an NDVI layer (brown = bare, green = vegetated).
 *   Console: number of Landsat and Sentinel-2 scenes, NDVI mean and SD, and an NDVI histogram chart.
 *
 * DATA:
 *   FAO/GAUL/2015/level1 — state/territory boundaries (vector, 2015).
 *   LANDSAT/LC08/C02/T1_L2 and LANDSAT/LC09/C02/T1_L2 — Landsat 8/9 Collection 2 surface reflectance, 30 m; May–Sep 2024 used.
 *   COPERNICUS/S2_SR_HARMONIZED — Sentinel-2 surface reflectance, 10–20 m (10 m for the bands used in NDVI); May–Sep 2024 used.
 *   GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED — Cloud Score+ per-pixel clear-sky score for Sentinel-2, 10 m.
 *
 * LINKS:
 *   Prac page: pracs/prac01-earth-engine-image-processing-fundamentals-and-vegetation-dynamics.md
 *   Assessment: Prac 01; foundations for AT1–AT4.
 *
 * KEY GEE IDEAS:
 *   - ImageCollection filtering (filterBounds, filterDate) and map() to apply a function to every image.
 *   - Cloud masking with bit flags (bitwiseAnd) and with Cloud Score+; scale factors to get reflectance.
 *   - Compositing (median) and reducers (reduceRegion with scale and maxPixels).
 *   - Lazy evaluation: nothing is computed until you print, display or export something.
 *
 * Q = core (ENV306 and ENV506).  EXT = ENV506 extension.
 ****/

// ---------- 1 Study area ----------
// Define where we are working: the NT boundary (for context) and a 20 km circle around Darwin (for analysis).
var nt = ee.FeatureCollection('FAO/GAUL/2015/level1')
  .filter(ee.Filter.eq('ADM1_NAME', 'Northern Territory'));   // keep only the feature whose name is Northern Territory
var darwin = ee.Geometry.Point([130.8456, -12.4634]);   // [longitude, latitude] in degrees — GEE always uses lon first
var aoi = darwin.buffer(20000);           // 20 km buffer around Darwin
Map.centerObject(aoi, 10);   // zoom the map to the area of interest (aoi)
Map.addLayer(nt.style({color: 'black', fillColor: '00000000'}), {}, 'NT boundary');   // outline only, transparent fill

// ---------- 2 Data ----------
// Load two satellite collections for the same area and dates, remove clouds, and convert stored numbers
// to surface reflectance (0–1) so the two sensors can be compared.
// Landsat 8/9 Collection 2 Level 2 (surface reflectance). Scale: SR * 0.0000275 - 0.2
function prepLandsat(img) {
  var qa = img.select('QA_PIXEL');   // quality band: each bit (0/1 flag) records one condition for the pixel
  // bit 1 dilated cloud, 3 cloud, 4 cloud shadow
  // 1 << n is the number with only bit n switched on. bitwiseAnd(...).eq(0) is true where that flag is OFF (clear).
  var mask = qa.bitwiseAnd(1 << 1).eq(0)
    .and(qa.bitwiseAnd(1 << 3).eq(0))
    .and(qa.bitwiseAnd(1 << 4).eq(0));   // keep a pixel only if it is not dilated cloud, cloud or shadow
  // Landsat stores reflectance as integers; multiply by 0.0000275 and add −0.2 to get reflectance (about 0–1).
  var sr = img.select('SR_B.').multiply(0.0000275).add(-0.2);   // 'SR_B.' = every band named SR_B + one character
  return img.addBands(sr, null, true).updateMask(mask)   // true = overwrite the original bands with the scaled ones
    .select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'],
            ['blue', 'green', 'red', 'nir', 'swir1', 'swir2']);   // rename to common names shared with Sentinel-2
}
var landsat = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))   // combine Landsat 8 and 9 into one collection
  .filterBounds(aoi)   // keep only scenes that overlap the aoi
  .filterDate('2024-05-01', '2024-09-30')   // NT dry season = fewer clouds
  .map(prepLandsat);   // apply the cloud mask and scaling to every image
print('Number of Landsat scenes', landsat.size());

// Sentinel-2 with Cloud Score+ masking. Scale: reflectance / 10000
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(aoi)
  .filterDate('2024-05-01', '2024-09-30')
  .linkCollection(csPlus, ['cs_cdf'])   // attach the matching Cloud Score+ band (cs_cdf) to each Sentinel-2 image
  .map(function(img) {
    // cs_cdf runs from 0 (cloudy) to 1 (clear). Keep pixels ≥ 0.6 — a starting value, test others (see EXT).
    return ee.Image(img.updateMask(img.select('cs_cdf').gte(0.6))
      .select(['B2', 'B3', 'B4', 'B8', 'B11', 'B12'],
              ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'])
      .divide(10000)   // Sentinel-2 stores reflectance × 10 000
      .copyProperties(img, ['system:time_start']));   // keep the image date (lost by the band maths above)
  });
print('Number of Sentinel-2 scenes', s2.size());

// ---------- 3 Processing ----------
// Combine each collection into one cloud-free image (a composite) and calculate NDVI.
// median() takes the middle value of each pixel through time; it ignores leftover cloud (too bright)
// and shadow (too dark) better than mean(). clip() trims the result to the aoi for display.
var lsComposite = landsat.median().clip(aoi);
var s2Composite = s2.median().clip(aoi);
// NDVI = (NIR − red) / (NIR + red). Unitless, −1 to 1; dense green vegetation is usually above about 0.6.
var ndvi = s2Composite.normalizedDifference(['nir', 'red']).rename('NDVI');

// ---------- 4 Analysis: reducers ----------
// A reducer turns many pixel values into a summary number. reduceRegion summarises all pixels inside a geometry.
var stats = ndvi.reduceRegion({
  // combine() calculates mean and SD in one pass; true = share inputs, giving outputs NDVI_mean and NDVI_stdDev
  reducer: ee.Reducer.mean().combine(ee.Reducer.stdDev(), null, true),
  // scale = pixel size (m) used for the calculation (10 m = Sentinel-2 native).
  // maxPixels raises GEE's default pixel limit so a large area does not fail.
  geometry: aoi, scale: 10, maxPixels: 1e10
});
print('NDVI mean and SD (Darwin, 2024 dry season)', stats);

// ---------- 5 Visualise ----------
// Add the composites and NDVI to the map, and chart the spread of NDVI values.
var rgb = {bands: ['red', 'green', 'blue'], min: 0, max: 0.3};   // stretch reflectance 0–0.3 to full brightness
Map.addLayer(lsComposite, rgb, 'Landsat 8/9 true colour');
Map.addLayer(s2Composite, rgb, 'Sentinel-2 true colour');
Map.addLayer(ndvi, {min: 0, max: 0.8, palette: ['#a6611a', '#f5f5f5', '#018571']}, 'NDVI');   // brown → white → green

// Histogram = how many pixels fall in each NDVI range. scale 30 m keeps it quick (coarser than the 10 m data).
print(ui.Chart.image.histogram({image: ndvi, region: aoi, scale: 30, maxPixels: 1e9})
  .setOptions({title: 'NDVI histogram, Darwin 20 km buffer'}));

// ---------- 6 Export ----------
// Save the NDVI image as a GeoTIFF in your Google Drive. Start it in the Tasks tab (click RUN).
Export.image.toDrive({
  // description = task and file name; folder = Drive folder (created if missing); crs = map projection of the output
  image: ndvi, description: 'Prac01a_NDVI_Darwin_2024', folder: 'GEE_NT',
  region: aoi, scale: 10, crs: 'EPSG:32752', maxPixels: 1e10   // UTM zone 52S
});

// Q: Why do we composite over May–September in the Top End?
// Q: Compare the number of Landsat and Sentinel-2 scenes. Why do they differ?
// Q: What happens to the NDVI mean if you set scale to 250? Why?
// EXT: Replace median() with qualityMosaic() on NDVI. Explain the difference and when each is preferable.
// EXT: Change the Cloud Score+ threshold (0.5, 0.6, 0.7) and quantify the effect on valid pixel counts.
