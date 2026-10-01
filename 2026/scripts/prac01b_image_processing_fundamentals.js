/**** Prac 01b — Image processing fundamentals (Darwin & Adelaide River floodplain, NT)
 * LO2: image management, rectification & registration, enhancement, transformation.
 * Sections: A management · B rectification/registration · C enhancement · D filtering · E transformation
 *
 * WHAT THIS SCRIPT DOES:
 *   Walks through the classic image-processing steps on one clear Landsat 9 scene (2024) covering Darwin's
 *   rural area and the Adelaide River floodplain: checking scene metadata, measuring misregistration against
 *   Sentinel-2, contrast stretches, spatial filters, and transformations (indices, tasseled cap, PCA).
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) No EDIT lines are needed. You can change the aoi rectangle or the year if you want to explore.
 *   (3) Click Run.
 *   (4) Read the Console (right panel), turn layers on/off in the Map's Layers list (most start off — the
 *       layer names start with the section letter A–E), and start the export in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   Map: Landsat–Sentinel-2 offset, stretched and equalised composites, false colour, NDVI pseudocolour,
 *   filtered images and edges, tasseled cap and PCA composites.
 *   Console: scene counts, cloud cover, path/row, scene metadata and projection, geometric RMSE, mean offset,
 *   2nd/98th percentiles, eigenvalues, proportion of variance and eigenvectors.
 *
 * DATA:
 *   LANDSAT/LC09/C02/T1_L2 — Landsat 9 Collection 2 Tier 1 surface reflectance, 30 m; 2024.
 *   LANDSAT/LC09/C02/T2_L2 — Landsat 9 Tier 2 (counted only, not analysed); 2024.
 *   COPERNICUS/S2_SR_HARMONIZED — Sentinel-2 surface reflectance, 10 m red band; within ±10 days of the Landsat scene.
 *
 * LINKS:
 *   Prac page: pracs/prac01-earth-engine-image-processing-fundamentals-and-vegetation-dynamics.md
 *   Assessment: Prac 01; foundations for AT1–AT4.
 *
 * KEY GEE IDEAS:
 *   - Collection metadata: aggregate_array, filter on properties, sort, first().
 *   - Projections and scale: projection(), reproject(), resample(), and the scale argument of reducers.
 *   - Neighbourhood operations: convolve() with kernels, focal filters, edge detectors.
 *   - Array images (toArray, matrixMultiply) for tasseled cap and PCA.
 *
 * Q = core (ENV306 and ENV506).  EXT = ENV506 extension.
 ****/

var aoi = ee.Geometry.Rectangle([130.85, -12.75, 131.35, -12.35]);   // Darwin rural area to Adelaide River
// Rectangle corners are [west lon, south lat, east lon, north lat] in degrees.
Map.centerObject(aoi, 10);

// ======================= A. IMAGE MANAGEMENT =======================
// Collections, metadata, tiers and processing levels.
// Find the Landsat 9 scenes for 2024, look at their metadata, and choose the clearest one to work with.
// filterDate end date is exclusive, so '2025-01-01' means "up to the end of 2024".
var l9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2').filterBounds(aoi).filterDate('2024-01-01', '2025-01-01');
print('Landsat 9 scenes in 2024', l9.size());
print('Cloud cover per scene (%)', l9.aggregate_array('CLOUD_COVER'));   // one value per scene, from scene metadata
print('Path/row', l9.aggregate_array('WRS_PATH').distinct(), l9.aggregate_array('WRS_ROW').distinct());   // WRS-2 grid position
// Keep scenes with < 5% cloud, sort clearest first, take the first. (If none qualify, scene is empty and later steps fail.)
var scene = l9.filter(ee.Filter.lt('CLOUD_COVER', 5)).sort('CLOUD_COVER').first();
print('Clearest scene metadata', scene);   // expand the properties in the Console to see date, sun angles, etc.
print('Native projection of SR_B4', scene.select('SR_B4').projection());   // the scene's own CRS (UTM) and 30 m grid
// Tier 1 = precise terrain-corrected (L1TP) with geometric RMSE within tolerance; Tier 2 = poorer geometry.
print('Geometric RMSE (model, m)', scene.get('GEOMETRIC_RMSE_MODEL'));   // positional error of the scene's geometric model
var t2 = ee.ImageCollection('LANDSAT/LC09/C02/T2_L2').filterBounds(aoi).filterDate('2024-01-01', '2025-01-01');
print('Tier 2 scenes (excluded from analysis)', t2.size());
// Q: Why does a scientific workflow normally use Tier 1 only?

// Scale to reflectance
// Stored integers × 0.0000275 − 0.2 = surface reflectance (about 0–1). No cloud mask here: we chose a clear scene.
var img = scene.select('SR_B.').multiply(0.0000275).add(-0.2)
  .select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'], ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'])
  .clip(aoi);

// ================ B. RECTIFICATION AND REGISTRATION ================
// Check how well Landsat 9 lines up with Sentinel-2, correct the offset, and show how to reproject to a map grid.
// Landsat C2 and Sentinel-2 L2A are already orthorectified (terrain-corrected with a DEM + ground control).
// Residual misregistration between sensors can still be several metres. Measure it:
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(aoi)
  .filterDate(scene.date().advance(-10, 'day'), scene.date().advance(10, 'day'))   // within ±10 days of the Landsat date
  .sort('CLOUDY_PIXEL_PERCENTAGE').first();   // least cloudy Sentinel-2 image in that window
// resample('bicubic') = smooth interpolation instead of nearest neighbour, needed for sub-pixel matching.
var s2Red = s2.select('B4').divide(10000).resample('bicubic');   // Sentinel-2 red, scaled to reflectance
var l9Red = img.select('red').resample('bicubic');
// displacement() finds how far each Landsat patch must shift to match Sentinel-2. maxOffset and patchWidth are in metres.
var displacement = l9Red.displacement({referenceImage: s2Red, maxOffset: 60, patchWidth: 300});
// dx and dy are the shifts in metres; hypot() = straight-line distance √(dx² + dy²).
var offsetM = displacement.select('dx').hypot(displacement.select('dy')).rename('offset_m');
// Positional arguments: reducer, geometry, scale (90 m), crs, crsTransform, bestEffort, maxPixels.
print('Mean Landsat→S2 offset (m)', offsetM.reduceRegion(ee.Reducer.mean(), aoi, 90, null, null, false, 1e9));
Map.addLayer(offsetM, {min: 0, max: 15, palette: ['white', 'red']}, 'B: L9 vs S2 offset (m)', false);
var l9Registered = l9Red.displace(displacement);   // or l9Red.register(s2Red, 60)
Map.addLayer(l9Registered, {min: 0, max: 0.3}, 'B: L9 red registered to S2', false);
// Reprojection = changing CRS / pixel grid (a form of rectification to a map grid)
// In GEE you rarely need reproject(): the Map and Export handle projections. Here we only print the result
// to show that the image now sits on a GDA2020 / MGA zone 52 grid with 30 m pixels. Set crs in Export instead.
var reprojected = img.reproject({crs: 'EPSG:7852', scale: 30});   // GDA2020 / MGA zone 52
print('B: Reprojected image — CRS and pixel size', reprojected.projection());
// Q: What is the difference between orthorectification, georeferencing and co-registration?

// ========================== C. ENHANCEMENT ==========================
// Enhancement changes how an image LOOKS (contrast and colour), not the data values used in analysis.
// Reflectance of most land surfaces is below 0.3, so a 0–1 display range looks dark and flat.
Map.addLayer(img, {bands: ['red', 'green', 'blue'], min: 0, max: 1}, 'C: No stretch (0–1)', false);
Map.addLayer(img, {bands: ['red', 'green', 'blue'], min: 0, max: 0.3}, 'C: Linear stretch 0–0.3');
// Percentile (2–98 %) stretch computed from the data
// Find the 2nd and 98th percentile of each band, then rescale so those values become 0 and 1.
// scale: 60 m (coarser than 30 m) makes the calculation faster; the percentiles barely change.
var pct = img.select(['red', 'green', 'blue']).reduceRegion({
  reducer: ee.Reducer.percentile([2, 98]), geometry: aoi, scale: 60, maxPixels: 1e9});
print('2nd/98th percentiles', pct);   // keys are named band_p2 and band_p98
var stretched = ee.Image.cat(   // cat() stacks the three stretched bands into one image
  img.select('red').unitScale(pct.getNumber('red_p2'), pct.getNumber('red_p98')),   // unitScale: p2 → 0, p98 → 1
  img.select('green').unitScale(pct.getNumber('green_p2'), pct.getNumber('green_p98')),
  img.select('blue').unitScale(pct.getNumber('blue_p2'), pct.getNumber('blue_p98')));
Map.addLayer(stretched, {min: 0, max: 1}, 'C: 2–98% stretch', false);
// Histogram equalisation via the cumulative distribution function (CDF)
// Each pixel value is replaced by the fraction of pixels darker than it, so values spread evenly from 0 to 1.
function equalize(image, band) {
  var hist = ee.Dictionary(image.select(band).reduceRegion({
    reducer: ee.Reducer.histogram({maxBuckets: 256}), geometry: aoi, scale: 60, maxPixels: 1e9}).get(band));
  var counts = ee.Array(hist.get('histogram'));   // number of pixels in each bucket
  var cdf = counts.accum(0).divide(counts.reduce(ee.Reducer.sum(), [0]).get([0]));   // running total ÷ total → 0 to 1
  return image.select(band).interpolate(hist.get('bucketMeans'), cdf.toList(), 'clamp');   // look up each value's CDF
}
var eq = ee.Image.cat(equalize(img, 'nir'), equalize(img, 'red'), equalize(img, 'green'));
Map.addLayer(eq, {min: 0, max: 1}, 'C: Histogram-equalised false colour (NIR-R-G)', false);
// Colour composites: false colour (vegetation red) and SWIR composite (moisture, burn scars)
Map.addLayer(img, {bands: ['nir', 'red', 'green'], min: 0, max: 0.4}, 'C: False colour NIR-R-G', false);
Map.addLayer(img, {bands: ['swir2', 'nir', 'red'], min: 0, max: 0.4}, 'C: SWIR2-NIR-R', false);
// Density slicing / pseudocolour
// A single band (NDVI) shown with a colour palette: water blue, bare tan, dense vegetation dark green.
var ndvi = img.normalizedDifference(['nir', 'red']).rename('NDVI');
Map.addLayer(ndvi, {min: -0.2, max: 0.8, palette: ['blue', 'white', 'tan', 'yellowgreen', 'darkgreen']}, 'C: NDVI pseudocolour', false);

// ======================= D. SPATIAL FILTERING =======================
// Filters replace each pixel with a value calculated from its neighbours (a moving window, or "kernel").
// Low-pass filters smooth; high-pass and edge filters highlight sharp changes such as roads, rivers and field edges.
var nir = img.select('nir');
// radius 2 pixels = a 5 × 5 window; normalize: true makes the weights sum to 1 (so it is a mean).
var lowPass = nir.convolve(ee.Kernel.square({radius: 2, units: 'pixels', normalize: true}));
var highPass = nir.convolve(ee.Kernel.laplacian8({normalize: false}));   // Laplacian: near 0 in flat areas, large at edges
var median = nir.focalMedian({radius: 2, units: 'pixels'});   // 5 × 5 median: smooths but keeps edges sharper than a mean
// Sobel kernel = gradient in the x (east–west) direction only; abs() drops the sign so all edges are positive.
var sobel = nir.convolve(ee.Kernel.sobel()).abs();
// Canny edge detector: threshold = minimum gradient to count as an edge (a starting value — test others);
// sigma = amount of Gaussian smoothing first (in pixels).
var canny = ee.Algorithms.CannyEdgeDetector({image: nir, threshold: 0.05, sigma: 1});
Map.addLayer(lowPass, {min: 0, max: 0.4}, 'D: Low-pass 5×5 mean', false);
Map.addLayer(highPass, {min: -0.05, max: 0.05}, 'D: High-pass Laplacian', false);
Map.addLayer(median, {min: 0, max: 0.4}, 'D: Median 5×5', false);
Map.addLayer(sobel, {min: 0, max: 0.3}, 'D: Sobel edges (x-gradient)', false);
Map.addLayer(canny.selfMask(), {palette: 'red'}, 'D: Canny edges', false);   // selfMask hides non-edge (0) pixels

// ===================== E. IMAGE TRANSFORMATION =====================
// Transformations combine bands into new ones that highlight one property (water, burn, greenness) or
// squeeze the shared information in six bands into fewer, less correlated ones (tasseled cap, PCA).
// E1 Band ratios and indices
var ndwi = img.normalizedDifference(['green', 'nir']).rename('NDWI');   // McFeeters NDWI: open water > 0
var nbr = img.normalizedDifference(['nir', 'swir2']).rename('NBR');     // Normalised Burn Ratio: low over recent burns
Map.addLayer(ndwi, {min: -0.5, max: 0.5, palette: ['#8c510a', 'white', '#2166ac']}, 'E: NDWI (blue = open water)', false);
Map.addLayer(nbr, {min: -0.5, max: 0.8, palette: ['#d73027', 'white', '#1a9850']}, 'E: NBR (red = recent burns)', false);

// E2 Tasseled cap (Baig et al. 2014 coefficients for OLI; derived for TOA reflectance —
// applied to SR here for teaching; note the caveat in your report)
// Each row is a set of weights for the 6 bands (blue, green, red, nir, swir1, swir2).
var coeffs = ee.Array([
  [0.3029, 0.2786, 0.4733, 0.5599, 0.5080, 0.1872],     // brightness
  [-0.2941, -0.2430, -0.5424, 0.7276, 0.0713, -0.1608], // greenness
  [0.1511, 0.1973, 0.3283, 0.3407, -0.7117, -0.4559]    // wetness
]);
// Turn each pixel's 6 bands into a 6 × 1 column, multiply by the 3 × 6 weights → 3 × 1, then back to 3 named bands.
var tc = ee.Image(coeffs).matrixMultiply(img.toArray().toArray(1))
  .arrayProject([0]).arrayFlatten([['brightness', 'greenness', 'wetness']]);
Map.addLayer(tc, {bands: ['brightness', 'greenness', 'wetness'], min: [0, -0.1, -0.3], max: [0.6, 0.3, 0.1]},
  'E: Tasseled cap (B-G-W)', false);

// E3 Principal components analysis
// PCA finds new axes (PCs) that capture the most variance across the six bands. PC1 holds the most.
var bandNames = img.bandNames();
var meanDict = img.reduceRegion({reducer: ee.Reducer.mean(), geometry: aoi, scale: 60, maxPixels: 1e9});
var centered = img.subtract(ee.Image.constant(meanDict.values(bandNames)));   // subtract each band's mean
var arrays = centered.toArray();   // one 6-value array per pixel
var covar = arrays.reduceRegion({reducer: ee.Reducer.centeredCovariance(), geometry: aoi, scale: 60, maxPixels: 1e9});   // 6 × 6
// eigen() returns a 6 × 7 array: column 0 = eigenvalues, columns 1–6 = eigenvectors (one row per PC).
var eigens = ee.Array(covar.get('array')).eigen();
var eigenValues = eigens.slice(1, 0, 1);
var eigenVectors = eigens.slice(1, 1);
// Project each pixel onto the eigenvectors to get its PC scores.
var pcs = ee.Image(eigenVectors).matrixMultiply(arrays.toArray(1))
  .arrayProject([0]).arrayFlatten([['PC1', 'PC2', 'PC3', 'PC4', 'PC5', 'PC6']]);
print('Eigenvalues (variance per PC)', eigenValues);
print('Proportion of variance', eigenValues.divide(eigenValues.reduce(ee.Reducer.sum(), [0]).get([0, 0])));   // each ÷ total
print('Eigenvectors (rows = PCs, cols = bands)', eigenVectors);
Map.addLayer(pcs, {bands: ['PC1', 'PC2', 'PC3'], min: [-0.5, -0.15, -0.08], max: [0.5, 0.15, 0.08]}, 'E: PCA 1-2-3', false);

// ============================ Export ============================
// Save tasseled cap (3 bands) + PC1–PC3 as one 6-band GeoTIFF in Google Drive. Start it in the Tasks tab.
// float() gives every band the same data type (required for export); crs EPSG:7852 = GDA2020 / MGA zone 52.
Export.image.toDrive({image: tc.addBands(pcs.select(['PC1', 'PC2', 'PC3'])).float(),
  description: 'Prac01b_TC_PCA', folder: 'GEE_NT', region: aoi, scale: 30, crs: 'EPSG:7852', maxPixels: 1e10});

// Q: Which stretch best separates floodplain, mangrove and savanna? Why?
// Q: Compare low-pass, median and high-pass outputs. When would you use each?
// Q: What proportion of variance is in PC1? Interpret PC1 and PC2 from the eigenvectors.
// Q: Interpret greenness and wetness over the Adelaide River floodplain.
// EXT: Compare register() vs displacement() + displace(), and report residual offset after registration.
// EXT: Standardised PCA (correlation matrix) vs covariance PCA — which is appropriate here and why?
// EXT: Evaluate whether enhancement should ever be applied BEFORE quantitative analysis.
