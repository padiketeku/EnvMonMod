/**** Prac 08c — Mangrove dynamics: the 2015–16 Gulf of Carpentaria dieback (Limmen Bight, NT)
 * Context: ~7,400 ha of mangroves died along ~1,000 km of coast between the Roper River (NT) and Karumba (Qld)
 * over summer 2015–16; the NT lost ~5,500 ha (Duke et al. 2017). Drought, heat and a temporary sea-level drop
 * during a strong El Niño are the likely causes.
 *
 * WHAT THIS SCRIPT DOES:
 *   Asks: how much mangrove died in the 2015–16 event near Limmen Bight, and has any of it recovered?
 *   Builds one dry-season (Jun–Oct) median NDVI image per year (2014–2024) from Landsat 8/9, inside the
 *   2000 mangrove extent. It flags dieback as a large NDVI drop from 2015 to 2017, then checks NDVI in 2024.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) No EDIT lines. You may move the aoi rectangle (section 1) or test other thresholds (section 4).
 *   (3) Click Run.
 *   (4) Read the Console (chart and areas in ha), turn layers on/off in the Map's Layers list,
 *       and start the export in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   Console: a chart of mean dry-season NDVI per year inside the 2000 mangroves; mangrove areas (ha) for
 *   2000 and 2021; dieback area 2015→2017 (ha); dieback area that is green again by 2024 (ha).
 *   Map: Mangroves 2000, Mangroves 2021 (off), dNDVI 2015→2017, Dieback (magenta), Recovered by 2024 (off).
 *
 * DATA:
 *   - LANDSAT/MANGROVE_FORESTS — Giri et al. (2011) global mangrove map, 30 m, circa 2000.
 *   - ESA/WorldCover/v200 — ESA WorldCover land cover, 10 m, 2021 (class 95 = mangroves).
 *   - LANDSAT/LC08/C02/T1_L2 and LANDSAT/LC09/C02/T1_L2 — Landsat 8/9 Collection 2 surface reflectance,
 *     30 m, 2013–present (used here for 2014–2024).
 *
 * LINKS: pracs/prac08-sar-and-water-surface-water-sentinel-1-flood-mapping-wetlands-and-mangroves.md
 *   Feeds Prac 08 and AT4 Part 4.
 *
 * KEY GEE IDEAS:
 *   - Cloud masking with QA bits (bitwiseAnd) and applying Collection 2 scale factors.
 *   - map() over an ImageCollection, and building a new collection from a list of years.
 *   - Masks (updateMask, selfMask) to restrict analysis to mangroves.
 *   - reduceRegion with pixelArea() to turn a mask into an area in hectares.
 *
 * Q = core (ENV306 and ENV506). EXT = ENV506 extension.
 ****/

// ---------- 1 Study area ----------
// A rectangle (west, south, east, north in decimal degrees) around the NT section of the dieback.
// All filtering and statistics below use this area of interest (aoi).
var aoi = ee.Geometry.Rectangle([135.30, -15.60, 136.60, -14.60]);   // Roper River mouth to Limmen Bight & beyond
Map.centerObject(aoi, 9);   // zoom level 9 shows the whole coastline in view

// ---------- 2 Data ----------
// Two independent mangrove maps (before and after the event) plus Landsat 8/9 for yearly NDVI.
// Using a mask from BEFORE the dieback (2000) means dead mangroves are still inside the area we measure.
// Pre-dieback mangrove extent: Giri et al. (2011), Landsat 2000
// The collection is stored as tiles: filterBounds keeps tiles touching the aoi, mosaic() joins them into one image,
// and selfMask() hides the 0 (not mangrove) pixels so only mangroves remain.
var mangrove2000 = ee.ImageCollection('LANDSAT/MANGROVE_FORESTS').filterBounds(aoi).mosaic().clip(aoi).selfMask();
// Post-dieback reference: ESA WorldCover 2021, class 95 = mangroves
// eq(95) makes a 1/0 image (1 where the class is mangrove); selfMask() then hides the 0s.
var mangrove2021 = ee.ImageCollection('ESA/WorldCover/v200').first().clip(aoi).eq(95).selfMask();
// Optional: Global Mangrove Watch v3 in the GEE community catalogue (check path at gee-community-catalog.org)

// prep(): cloud-mask one Landsat Collection 2 image and convert its digital numbers to surface reflectance.
function prep(img) {
  var qa = img.select('QA_PIXEL');   // QA_PIXEL holds per-pixel quality flags as bits
  // Bit 3 = cloud, bit 4 = cloud shadow. (1 << 3) is 8 and (1 << 4) is 16; a result of 0 means the flag is NOT set.
  // Keep pixels where both flags are off (clear sky).
  var mask = qa.bitwiseAnd(1 << 3).eq(0).and(qa.bitwiseAnd(1 << 4).eq(0));
  // Collection 2 Level-2 scale factor (0.0000275) and offset (-0.2) convert the stored integers to reflectance (0–1).
  var sr = img.select('SR_B.').multiply(0.0000275).add(-0.2);   // 'SR_B.' is a regex: all optical SR_B1 … SR_B7 bands
  return img.addBands(sr, null, true).updateMask(mask);   // true = overwrite the original bands with the scaled ones
}
// Merge Landsat 8 and 9 (same sensor design) to get more clear observations per year.
// filterBounds keeps only scenes that overlap the aoi; map() runs the function on every image in the collection.
var l8 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2').merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
  .filterBounds(aoi).map(function(img) {
    var p = prep(img);
    // NDVI = (NIR − Red) / (NIR + Red); on Landsat 8/9 NIR is SR_B5 and Red is SR_B4. Unitless, −1 to 1.
    return p.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI')
      .copyProperties(img, ['system:time_start']);   // keep the date so we can filter by year later
  });

// ---------- 3 Processing: annual dry-season NDVI inside the 2000 mangrove mask ----------
// One image per year: the median NDVI of all clear Jun–Oct scenes. The dry season has fewer clouds and
// steadier canopy, so years are comparable. The median ignores leftover cloud or haze better than the mean.
var years = ee.List.sequence(2014, 2024);   // server-side list of years 2014 … 2024
var annual = ee.ImageCollection.fromImages(years.map(function(y) {
  y = ee.Number(y);   // list items arrive as generic objects; cast to a number before use
  return l8.filter(ee.Filter.calendarRange(y, y, 'year'))   // scenes from this year only
    .filter(ee.Filter.calendarRange(6, 10, 'month')).median()   // June to October (dry season), then per-pixel median
    .updateMask(mangrove2000).set('year', y)   // keep only pixels that were mangrove in 2000; tag the year
    .set('system:time_start', ee.Date.fromYMD(y, 8, 1).millis());   // a mid-season date (1 Aug) so charts can plot it
}));

// ---------- 4 Analysis ----------
// Chart the mangrove NDVI over time, then map dieback (2015→2017 drop) and recovery (green again by 2024),
// and convert each mask to an area in hectares.
// series(): for each image, average (mean reducer) NDVI over the aoi at 30 m (Landsat resolution).
print(ui.Chart.image.series(annual, aoi, ee.Reducer.mean(), 30)
  .setOptions({title: 'Mean dry-season NDVI within 2000 mangrove extent', pointSize: 4}));

// Pull single years out of the annual collection: 2015 (before), 2017 (after) and 2024 (latest).
var ndvi2015 = annual.filter(ee.Filter.eq('year', 2015)).first();
var ndvi2017 = annual.filter(ee.Filter.eq('year', 2017)).first();
var ndvi2024 = annual.filter(ee.Filter.eq('year', 2024)).first();
var dNDVI = ndvi2017.subtract(ndvi2015).rename('dNDVI');   // negative = canopy lost greenness between 2015 and 2017
// Dieback rule: NDVI fell by more than 0.2 AND 2017 NDVI is below 0.3 (sparse or dead canopy).
// These are starting values — test others and see how the area changes.
var dieback = dNDVI.lt(-0.2).and(ndvi2017.lt(0.3)).selfMask();   // teaching thresholds — test them
// Recovery: a dieback pixel whose 2024 NDVI is above 0.45 (a starting value for "green canopy again" — test others).
var recovery = dieback.and(ndvi2024.gt(0.45)).selfMask();

// pixelArea() gives each pixel's area in m²; dividing by 1e4 (10,000 m² per ha) gives hectares.
var areaHa = ee.Image.pixelArea().divide(1e4);
// sumHa(): add up the hectares of all unmasked pixels in a mask.
function sumHa(mask) {
  // scale: 30 = work at Landsat's 30 m pixels. maxPixels: raise the default cap so large areas don't fail.
  // tileScale: 4 splits the job into smaller pieces to avoid memory errors (slower but safer).
  return areaHa.updateMask(mask).reduceRegion({reducer: ee.Reducer.sum(), geometry: aoi,
    scale: 30, maxPixels: 1e11, tileScale: 4}).get('area');   // pixelArea's band is named 'area'
}
// print() sends each server-side result to the Console once it has been computed.
print('Mangrove area 2000 (Giri), ha', sumHa(mangrove2000));
print('Mangrove area 2021 (WorldCover), ha', sumHa(mangrove2021));
print('Dieback 2015→2017 (NDVI rule), ha', sumHa(dieback));
print('Of which NDVI > 0.45 by 2024, ha', sumHa(recovery));

// ---------- 5 Visualise ----------
// Add layers to the Map. The last argument false means "added but switched off" — tick it in the Layers list.
Map.addLayer(mangrove2000, {palette: '#1b7837'}, 'Mangroves 2000 (Giri)');
Map.addLayer(mangrove2021, {palette: '#a6dba0'}, 'Mangroves 2021 (WorldCover)', false);
// dNDVI colours: dark red = large NDVI loss, white = little change, blue = NDVI gain.
Map.addLayer(dNDVI, {min: -0.5, max: 0.2, palette: ['#67001f', '#f4a582', '#f7f7f7', '#4393c3']}, 'dNDVI 2015→2017');
Map.addLayer(dieback, {palette: '#ff00ff'}, 'Dieback (NDVI rule)');
Map.addLayer(recovery, {palette: '#00ff00'}, 'Recovered by 2024', false);

// ---------- 6 Export ----------
// Save dNDVI and a 0/1 dieback band as a GeoTIFF to Google Drive (start it in the Tasks tab).
// unmask(0) turns masked (no dieback) pixels into 0 so the band is a full 0/1 layer; float() gives both bands one type.
// folder: Drive folder name. scale: 30 m. crs 'EPSG:32753' = WGS 84 / UTM zone 53S (metres), which covers this coast.
Export.image.toDrive({image: dNDVI.addBands(dieback.unmask(0).rename('dieback')).float(),
  description: 'Prac08c_mangrove_dieback', folder: 'GEE_NT', region: aoi, scale: 30, crs: 'EPSG:32753', maxPixels: 1e11});

// Q: Where along the coast is dieback concentrated: the seaward fringe or the landward edge next to saltpans? Why?
// Q: Compare the Giri 2000 and WorldCover 2021 areas. List reasons (other than dieback) they differ.
// Hint: think about pixel size (30 m vs 10 m), mapping method and accuracy, and real change over 21 years.
// Q: Is there evidence of recovery by 2024?
// EXT: Rainfall (CHIRPS) and sea-level data are drivers. Build a monthly NDVI series 2013–2018 and align it with CHIRPS anomalies (Prac 03a).
// EXT: Separate dieback (dead standing stems, NDVI drop) from erosion/shoreline retreat (land→water) using MNDWI.
// EXT: Repeat with Global Mangrove Watch v3 and quantify how the choice of baseline map changes the dieback estimate.
