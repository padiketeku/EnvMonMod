/**** Prac 01b — Image processing fundamentals (Darwin & Adelaide River floodplain, NT)
 * LO2: image management, rectification & registration, enhancement, transformation.
 * Sections: A management · B rectification/registration · C enhancement · D filtering · E transformation
 ****/

var aoi = ee.Geometry.Rectangle([130.85, -12.75, 131.35, -12.35]);   // Darwin rural area to Adelaide River
Map.centerObject(aoi, 10);

// ======================= A. IMAGE MANAGEMENT =======================
// Collections, metadata, tiers and processing levels.
var l9 = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2').filterBounds(aoi).filterDate('2024-01-01', '2025-01-01');
print('Landsat 9 scenes in 2024', l9.size());
print('Cloud cover per scene (%)', l9.aggregate_array('CLOUD_COVER'));
print('Path/row', l9.aggregate_array('WRS_PATH').distinct(), l9.aggregate_array('WRS_ROW').distinct());
var scene = l9.filter(ee.Filter.lt('CLOUD_COVER', 5)).sort('CLOUD_COVER').first();
print('Clearest scene metadata', scene);
print('Native projection of SR_B4', scene.select('SR_B4').projection());
// Tier 1 = precise terrain-corrected (L1TP) with geometric RMSE within tolerance; Tier 2 = poorer geometry.
print('Geometric RMSE (model, m)', scene.get('GEOMETRIC_RMSE_MODEL'));
var t2 = ee.ImageCollection('LANDSAT/LC09/C02/T2_L2').filterBounds(aoi).filterDate('2024-01-01', '2025-01-01');
print('Tier 2 scenes (excluded from analysis)', t2.size());
// Q: Why does a scientific workflow normally use Tier 1 only?

// Scale to reflectance
var img = scene.select('SR_B.').multiply(0.0000275).add(-0.2)
  .select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'], ['blue', 'green', 'red', 'nir', 'swir1', 'swir2'])
  .clip(aoi);

// ================ B. RECTIFICATION AND REGISTRATION ================
// Landsat C2 and Sentinel-2 L2A are already orthorectified (terrain-corrected with a DEM + ground control).
// Residual misregistration between sensors can still be several metres. Measure it:
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(aoi)
  .filterDate(scene.date().advance(-10, 'day'), scene.date().advance(10, 'day'))
  .sort('CLOUDY_PIXEL_PERCENTAGE').first();
var s2Red = s2.select('B4').divide(10000).resample('bicubic');
var l9Red = img.select('red').resample('bicubic');
var displacement = l9Red.displacement({referenceImage: s2Red, maxOffset: 60, patchWidth: 300});
var offsetM = displacement.select('dx').hypot(displacement.select('dy')).rename('offset_m');
print('Mean Landsat→S2 offset (m)', offsetM.reduceRegion(ee.Reducer.mean(), aoi, 90, null, null, false, 1e9));
Map.addLayer(offsetM, {min: 0, max: 15, palette: ['white', 'red']}, 'B: L9 vs S2 offset (m)', false);
var l9Registered = l9Red.displace(displacement);   // or l9Red.register(s2Red, 60)
Map.addLayer(l9Registered, {min: 0, max: 0.3}, 'B: L9 red registered to S2', false);
// Reprojection = changing CRS / pixel grid (a form of rectification to a map grid)
var reprojected = img.reproject({crs: 'EPSG:7852', scale: 30});   // GDA2020 / MGA zone 52
// Q: What is the difference between orthorectification, georeferencing and co-registration?

// ========================== C. ENHANCEMENT ==========================
Map.addLayer(img, {bands: ['red', 'green', 'blue'], min: 0, max: 1}, 'C: No stretch (0–1)', false);
Map.addLayer(img, {bands: ['red', 'green', 'blue'], min: 0, max: 0.3}, 'C: Linear stretch 0–0.3');
// Percentile (2–98 %) stretch computed from the data
var pct = img.select(['red', 'green', 'blue']).reduceRegion({
  reducer: ee.Reducer.percentile([2, 98]), geometry: aoi, scale: 60, maxPixels: 1e9});
print('2nd/98th percentiles', pct);
var stretched = ee.Image.cat(
  img.select('red').unitScale(pct.getNumber('red_p2'), pct.getNumber('red_p98')),
  img.select('green').unitScale(pct.getNumber('green_p2'), pct.getNumber('green_p98')),
  img.select('blue').unitScale(pct.getNumber('blue_p2'), pct.getNumber('blue_p98')));
Map.addLayer(stretched, {min: 0, max: 1}, 'C: 2–98% stretch', false);
// Histogram equalisation via the cumulative distribution function (CDF)
function equalize(image, band) {
  var hist = ee.Dictionary(image.select(band).reduceRegion({
    reducer: ee.Reducer.histogram({maxBuckets: 256}), geometry: aoi, scale: 60, maxPixels: 1e9}).get(band));
  var counts = ee.Array(hist.get('histogram'));
  var cdf = counts.accum(0).divide(counts.reduce(ee.Reducer.sum(), [0]).get([0]));
  return image.select(band).interpolate(hist.get('bucketMeans'), cdf.toList(), 'clamp');
}
var eq = ee.Image.cat(equalize(img, 'nir'), equalize(img, 'red'), equalize(img, 'green'));
Map.addLayer(eq, {min: 0, max: 1}, 'C: Histogram-equalised false colour (NIR-R-G)', false);
// Colour composites: false colour (vegetation red) and SWIR composite (moisture, burn scars)
Map.addLayer(img, {bands: ['nir', 'red', 'green'], min: 0, max: 0.4}, 'C: False colour NIR-R-G', false);
Map.addLayer(img, {bands: ['swir2', 'nir', 'red'], min: 0, max: 0.4}, 'C: SWIR2-NIR-R', false);
// Density slicing / pseudocolour
var ndvi = img.normalizedDifference(['nir', 'red']).rename('NDVI');
Map.addLayer(ndvi, {min: -0.2, max: 0.8, palette: ['blue', 'white', 'tan', 'yellowgreen', 'darkgreen']}, 'C: NDVI pseudocolour', false);

// ======================= D. SPATIAL FILTERING =======================
var nir = img.select('nir');
var lowPass = nir.convolve(ee.Kernel.square({radius: 2, units: 'pixels', normalize: true}));
var highPass = nir.convolve(ee.Kernel.laplacian8({normalize: false}));
var median = nir.focalMedian({radius: 2, units: 'pixels'});
var sobel = nir.convolve(ee.Kernel.sobel()).abs();
var canny = ee.Algorithms.CannyEdgeDetector({image: nir, threshold: 0.05, sigma: 1});
Map.addLayer(lowPass, {min: 0, max: 0.4}, 'D: Low-pass 5×5 mean', false);
Map.addLayer(highPass, {min: -0.05, max: 0.05}, 'D: High-pass Laplacian', false);
Map.addLayer(median, {min: 0, max: 0.4}, 'D: Median 5×5', false);
Map.addLayer(sobel, {min: 0, max: 0.3}, 'D: Sobel edges (x-gradient)', false);
Map.addLayer(canny.selfMask(), {palette: 'red'}, 'D: Canny edges', false);

// ===================== E. IMAGE TRANSFORMATION =====================
// E1 Band ratios and indices
var ndwi = img.normalizedDifference(['green', 'nir']).rename('NDWI');
var nbr = img.normalizedDifference(['nir', 'swir2']).rename('NBR');

// E2 Tasseled cap (Baig et al. 2014 coefficients for OLI; derived for TOA reflectance —
// applied to SR here for teaching; note the caveat in your report)
var coeffs = ee.Array([
  [0.3029, 0.2786, 0.4733, 0.5599, 0.5080, 0.1872],     // brightness
  [-0.2941, -0.2430, -0.5424, 0.7276, 0.0713, -0.1608], // greenness
  [0.1511, 0.1973, 0.3283, 0.3407, -0.7117, -0.4559]    // wetness
]);
var tc = ee.Image(coeffs).matrixMultiply(img.toArray().toArray(1))
  .arrayProject([0]).arrayFlatten([['brightness', 'greenness', 'wetness']]);
Map.addLayer(tc, {bands: ['brightness', 'greenness', 'wetness'], min: [0, -0.1, -0.3], max: [0.6, 0.3, 0.1]},
  'E: Tasseled cap (B-G-W)', false);

// E3 Principal components analysis
var bandNames = img.bandNames();
var meanDict = img.reduceRegion({reducer: ee.Reducer.mean(), geometry: aoi, scale: 60, maxPixels: 1e9});
var centered = img.subtract(ee.Image.constant(meanDict.values(bandNames)));
var arrays = centered.toArray();
var covar = arrays.reduceRegion({reducer: ee.Reducer.centeredCovariance(), geometry: aoi, scale: 60, maxPixels: 1e9});
var eigens = ee.Array(covar.get('array')).eigen();
var eigenValues = eigens.slice(1, 0, 1);
var eigenVectors = eigens.slice(1, 1);
var pcs = ee.Image(eigenVectors).matrixMultiply(arrays.toArray(1))
  .arrayProject([0]).arrayFlatten([['PC1', 'PC2', 'PC3', 'PC4', 'PC5', 'PC6']]);
print('Eigenvalues (variance per PC)', eigenValues);
print('Proportion of variance', eigenValues.divide(eigenValues.reduce(ee.Reducer.sum(), [0]).get([0, 0])));
print('Eigenvectors (rows = PCs, cols = bands)', eigenVectors);
Map.addLayer(pcs, {bands: ['PC1', 'PC2', 'PC3'], min: [-0.5, -0.15, -0.08], max: [0.5, 0.15, 0.08]}, 'E: PCA 1-2-3', false);

// ============================ Export ============================
Export.image.toDrive({image: tc.addBands(pcs.select(['PC1', 'PC2', 'PC3'])).float(),
  description: 'Prac01b_TC_PCA', folder: 'GEE_NT', region: aoi, scale: 30, crs: 'EPSG:7852', maxPixels: 1e10});

// Q: Which stretch best separates floodplain, mangrove and savanna? Why?
// Q: Compare low-pass, median and high-pass outputs. When would you use each?
// Q: What proportion of variance is in PC1? Interpret PC1 and PC2 from the eigenvectors.
// Q: Interpret greenness and wetness over the Adelaide River floodplain.
// EXT: Compare register() vs displacement() + displace(), and report residual offset after registration.
// EXT: Standardised PCA (correlation matrix) vs covariance PCA — which is appropriate here and why?
// EXT: Evaluate whether enhancement should ever be applied BEFORE quantitative analysis.
