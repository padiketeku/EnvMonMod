[Home](../README.md) · [Schedule](../schedule-2026.md) · [Prac 02 →](prac02-monitoring-vegetation-condition-trends-and-seasonality.md)

# Prac 01: Earth Engine, image processing fundamentals and vegetation dynamics

**When:** Mon 2 Nov 2026, Sessions 1–3 · **Scripts:** [`prac00_my_study_tile.js`](../scripts/prac00_my_study_tile.js), [`prac01a_gee_basics.js`](../scripts/prac01a_gee_basics.js), [`prac01b_image_processing_fundamentals.js`](../scripts/prac01b_image_processing_fundamentals.js), [`prac01c_vegetation_dynamics_ndvi_evi.js`](../scripts/prac01c_vegetation_dynamics_ndvi_evi.js) · **ULOs:** 1, 2, 4

**Also available in:** Python [`prac01_basics_image_processing_vegetation.py`](../alternatives/python/prac01_basics_image_processing_vegetation.py) · R [`prac01_basics_image_processing_vegetation.R`](../alternatives/r/prac01_basics_image_processing_vegetation.R) · QGIS [recipe](../alternatives/qgis/README.md). The Code Editor remains the main environment.

**Purpose.** Get started in Earth Engine, learn the principles of image management, registration, enhancement and transformation, meet the three sensor families, and receive your personal study tile.

## 1. Concept notes

### 1.1 Landscape ecology in one page

Landscape ecology studies how **spatial pattern** affects **ecological process**, and how process creates pattern, across **scales** (Turner & Gardner, 2015).

| Concept | Meaning | NT example |
| --- | --- | --- |
| Pattern–process | Spatial arrangement shapes flows of organisms, water, fire and nutrients | Patchy early dry season burns stop large late dry season fires |
| Scale: grain and extent | Grain is the finest unit (pixel size); extent is the total area or period studied | 10 m Sentinel-2 vs 250 m MODIS give different answers about the same savanna |
| Hierarchy | Processes at broad scales constrain finer ones | The rainfall gradient (Darwin about 1,700 mm to Alice Springs about 300 mm) constrains woody cover |
| Patch–corridor–matrix | Habitat patches, linear connectors, and the dominant background | Riparian monsoon forest corridors in a savanna matrix |
| Heterogeneity | Spatial variability of the landscape | Floodplain–woodland mosaic of the Mary River |
| Disturbance regime | Frequency, intensity, timing and extent of disturbance | Fire every 1–3 years across much of the Top End |

These concepts are relevant to management because decisions on clearing, burning, water allocation and protected areas are all spatial. Remote sensing measures pattern, and modelling links that pattern to process.

### 1.2 Three families of remote sensing data

| Family | How it works | Strengths | Limitations | In this unit |
| --- | --- | --- | --- | --- |
| **Optical** (passive) | Measures reflected sunlight in visible to shortwave-infrared bands | Spectral detail (chlorophyll, water, char); long archive (Landsat since 1984) | Blocked by cloud and smoke, which is a big problem in the NT wet season | Landsat, Sentinel-2, MODIS |
| **SAR** (active microwave) | Sends microwave pulses and records the backscatter | Works day and night through cloud; sensitive to structure, roughness and moisture | Speckle; geometric distortions; harder to interpret | Sentinel-1 (C-band), ALOS PALSAR-2 (L-band) |
| **Lidar** (active laser) | Times laser pulses to measure 3-D structure | Direct canopy height and vertical profile | Sparse footprints from space; airborne surveys are costly | GEDI |

### 1.3 Image processing principles (ULO 2)

- **Image management:** storage, metadata, collections, versions and quality tiers. In GEE, an `ImageCollection` is filtered by place, date and properties such as `CLOUD_COVER` or `GEOMETRIC_RMSE_MODEL`. Landsat Collection 2 **Tier 1** scenes meet geometric tolerances; Tier 2 scenes do not.
- **Rectification:** correcting geometric distortions and fitting the image to a map projection.
  - *Orthorectification* removes terrain and sensor effects using a DEM and ground control. Landsat C2 L1TP and Sentinel-2 L2A are delivered already orthorectified.
  - *Georeferencing* assigns map coordinates.
  - *Reprojection* resamples to a new coordinate reference system (for example, GDA2020 / MGA zone 52, EPSG:7852).
- **Registration:** aligning two images to each other. Multi-sensor and multi-date analysis needs sub-pixel co-registration. GEE's `displacement()`, `displace()` and `register()` estimate and correct the offsets.
- **Enhancement:** improves *display*, not data. Examples are linear and percentile stretches, histogram equalisation, false-colour composites, density slicing, and spatial filters (low-pass, median, high-pass, edge detection). Always analyse unstretched reflectance.
- **Transformation:** re-expresses bands as new variables. Examples are band ratios and normalised differences (NDVI, NDWI, NBR), the tasseled cap (brightness, greenness, wetness) and principal components analysis (PCA).
- **Analysis and classification:** extracting information. Prac 04 covers supervised classification.

```math
\mathbf{PC} = \mathbf{E}^{\mathsf{T}}(\mathbf{x}-\bar{\mathbf{x}}) \quad\text{where the columns of } \mathbf{E} \text{ are eigenvectors of the band covariance matrix}
```

### 1.4 Earth Engine essentials

| Concept | Meaning |
| --- | --- |
| `ee.Image` / `ee.ImageCollection` | A raster with bands; a stack filtered by `filterBounds`, `filterDate` and `filter` |
| `map()` | Applies a function to every image (for example, cloud masking) |
| Reducers | Summarise over time (`median()`) or space (`reduceRegion`) |
| Scale | The pixel size the computation runs at, set by you |
| Client vs server | `ee.` objects are computed on Google's servers; `print`, `Map` and `Export` bring results back |

Scaling rules:

- Landsat C2 L2 reflectance = DN × 0.0000275 − 0.2, and surface temperature (K) = DN × 0.00341802 + 149.0.
- Sentinel-2 SR reflectance = DN / 10 000.
- MODIS NDVI = DN × 0.0001.

Cloud masking:

- Landsat: `QA_PIXEL` bits 1, 3 and 4.
- Sentinel-2: Cloud Score+ `cs_cdf` ≥ 0.6.

### 1.5 Vegetation indices and NT phenology

```math
\mathrm{NDVI}=\frac{\rho_{NIR}-\rho_{Red}}{\rho_{NIR}+\rho_{Red}} \qquad \mathrm{EVI}=2.5\,\frac{\rho_{NIR}-\rho_{Red}}{\rho_{NIR}+6\rho_{Red}-7.5\rho_{Blue}+1}
```

NDVI saturates over dense canopy and is affected by the soil background. EVI reduces both effects. In Top End savanna, the grass layer greens up with the first monsoon rains (Dec–Jan), peaks in Feb–Mar and cures through the dry season (May–Oct). The eucalypt overstorey stays largely evergreen.

## 2. Practical activities

**Activity 1.0 – Your study tile (5 min).** Run [`prac00_my_study_tile.js`](../scripts/prac00_my_study_tile.js) with your student number. Record your TILE\_ID, years and AT4 parameters; you will use them in AT1–AT4.

**Activity 1.1 – GEE basics (`prac01a`).**

1. Load Landsat 8/9 and Sentinel-2 for Darwin for the 2024 dry season, cloud-mask and scale them, and print the scene counts.
2. Build median composites, compute NDVI, and use the Inspector over mangroves, the CBD and savanna.
3. Run `reduceRegion` and the histogram, then export a GeoTIFF to `GEE_NT`.

**Activity 1.2 – Image processing fundamentals (`prac01b`).**

1. **Management:** query cloud cover, path/row, tier and `GEOMETRIC_RMSE_MODEL`, and compare Tier 1 and Tier 2 counts.
2. **Rectification and registration:** reproject to EPSG:7852, measure the Landsat 9 → Sentinel-2 offset with `displacement()`, and correct it.
3. **Enhancement:** compare no stretch, a linear stretch, a 2–98 % stretch, histogram equalisation, and false-colour and SWIR composites.
4. **Filtering:** compare low-pass, median, Laplacian, Sobel and Canny outputs.
5. **Transformation:** compute the tasseled cap and PCA, and read the eigenvalues and eigenvectors.

**Activity 1.3 – Vegetation dynamics (`prac01c`).**

1. Chart MODIS NDVI for 2001–2025 at Howard Springs, a Douglas–Daly paddock and Alice Springs.
2. Build the monthly climatology, compare NDVI and EVI, and chart Sentinel-2 EVI at 10 m.
3. Map wet- and dry-season NDVI across the NT.
4. Repeat step 1 with a point inside **your tile**.

**Key code** (an excerpt from [`prac01a_gee_basics.js`](../scripts/prac01a_gee_basics.js); run the full script for the complete workflow):

```javascript
// Scale and cloud-mask Landsat 8/9 surface reflectance, then map NDVI around Darwin
var aoi = ee.Geometry.Point([130.8456, -12.4634]).buffer(20000);
function prepLandsat(img) {
  var qa = img.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(1 << 3).eq(0).and(qa.bitwiseAnd(1 << 4).eq(0));   // cloud, cloud shadow
  var sr = img.select('SR_B.').multiply(0.0000275).add(-0.2);              // Collection 2 scale factors
  return img.addBands(sr, null, true).updateMask(mask);
}
var ls = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2').filterBounds(aoi)
  .filterDate('2024-05-01', '2024-09-30').map(prepLandsat).median().clip(aoi);
var ndvi = ls.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
Map.centerObject(aoi, 10);
Map.addLayer(ndvi, {min: 0, max: 0.8, palette: ['brown', 'white', 'green']}, 'NDVI, dry season 2024');
```

## 3. Challenge questions (knowledge check)

**Core (ENV306 and ENV506)**

1. Define grain and extent. How would moving from 10 m to 250 m pixels change the patchiness you observe in a savanna?
2. Give one strength and one limitation each for optical, SAR and lidar data in the NT wet season.
3. Explain the difference between orthorectification, georeferencing and co-registration.
4. Why should quantitative analysis use unstretched reflectance rather than an enhanced image?
5. What share of variance does PC1 hold in your scene, and what does it represent physically?
6. When is peak greenness at Howard Springs, and why is the Alice Springs signal flatter and more irregular?

**Extension (ENV506)**

1. Report the residual offset after `register()` and discuss the consequences for 10 m change detection.
2. Compare covariance-based and correlation-based (standardised) PCA for this scene, and justify a choice.
3. Tasseled cap coefficients were derived for top-of-atmosphere reflectance. Evaluate the error of applying them to surface reflectance.
4. Using one paper from the reading list, critique how the choice of grain affects a published NT phenology result.

## 4. Link to summative assessment

- **AT1:** run [`prac00_my_study_tile.js`](../scripts/prac00_my_study_tile.js) (Activity 1.0) to get your Daly tile, years and AT4 parameters. Your AT1 proposal plans your integrated AT4.
- **AT3:** the image-processing principles in this prac underpin the supervised short answers.

## 5. Reading

- Turner, M. G., & Gardner, R. H. (2015). *Landscape ecology in theory and practice* (2nd ed.). Springer. https://doi.org/10.1007/978-1-4939-2794-4
- Cardille, J. A., Crowley, M. A., Saah, D., & Clinton, N. E. (Eds.). (2024). *Cloud-based remote sensing with Google Earth Engine*. Springer (open access). https://doi.org/10.1007/978-3-031-26588-4
- Gorelick, N., et al. (2017). Google Earth Engine: Planetary-scale geospatial analysis for everyone. *Remote Sensing of Environment, 202*, 18–27. https://doi.org/10.1016/j.rse.2017.06.031
- Richards, J. A. (2022). *Remote sensing digital image analysis* (6th ed.). Springer. https://doi.org/10.1007/978-3-030-82327-6
- Pasquarella, V. J., Brown, C. F., Czerwinski, W., & Rucklidge, W. J. (2023). Comprehensive quality assessment of optical satellite imagery using weakly supervised video learning. *CVPR Workshops* (Cloud Score+).
- Huete, A., et al. (2002). Overview of the radiometric and biophysical performance of the MODIS vegetation indices. *Remote Sensing of Environment, 83*, 195–213. https://doi.org/10.1016/S0034-4257(02)00096-2
- Ma, X., et al. (2013). Spatial patterns and temporal dynamics in savanna vegetation phenology across the North Australian Tropical Transect. *Remote Sensing of Environment, 139*, 97–115. https://doi.org/10.1016/j.rse.2013.07.030
- Hutley, L. B., et al. (2011). A sub-continental scale living laboratory: Spatial patterns of savanna vegetation over a rainfall gradient in northern Australia. *Agricultural and Forest Meteorology, 151*, 1417–1428. https://doi.org/10.1016/j.agrformet.2011.03.002

## Full scripts

Each script is copied here from [`scripts/`](../scripts) so this page has everything in one place. The `.js` file is the master copy: if the two ever differ, use the file. Click a heading to open the script, then use the copy button and paste it into a new script in the Code Editor.

<details>
<summary><strong>prac00_my_study_tile.js</strong> (140 lines)</summary>

```javascript
/**** Prac 00 — My study tile and years (run this first, in Prac 01, Session 4)
 * ENV306/506 Environmental Monitoring and Modelling (2026)
 * Every student gets a personal 20 km tile in the Daly River catchment and personal years / sites for the
 * summative assessments. The values are reproducible from your student number, so markers can re-run this
 * script (and the staff check-value coordinates) and check that your figures and numbers came from YOUR tile (AT2, AT3, AT4).
 * Paste your outputs into your AT1 proposal. Do not swap tiles or years without written approval.
 *
 * WHAT THIS SCRIPT DOES:
 *   Works out YOUR study area and YOUR years for the assessments. It splits the Daly River catchment (NT) into
 *   20 km × 20 km squares ("tiles"), then uses your student number to choose one tile, plus years, a species,
 *   a river and an urban site. Nothing is random: the same student number always gives the same answers.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository (File > Save as).
 *   (2) Edit ONE line only: STUDENT_NUMBER in section 0 (look for the line marked "EDIT HERE").
 *       Type your digits only — for s123456 type 123456. Do not change COHORT_SALT.
 *   (3) Click Run.
 *   (4) Read the Console (right panel) and copy every printed value into your AT1 proposal.
 *       Turn layers on/off in the Map's Layers list. Optionally start the "Prac00_my_tile" export in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   Map: the Daly catchment outline (blue), the 20 km tile grid (grey, off by default) and MY TILE (red).
 *   Console: number of tiles, your tile index and TILE_ID, your AT2/AT3/AT4 years, elective sites and species,
 *   an allocation code for the staff master sheet, and your tile's corner coordinates.
 *
 * DATA:
 *   WWF/HydroSHEDS/v1/Basins/hybas_4 — HydroSHEDS level-4 river basins (vector polygons, derived from ~15 arc-second
 *   (~500 m) elevation data; static, no time period). Only used to get the Daly catchment outline.
 *
 * LINKS:
 *   Prac page: pracs/prac01-earth-engine-image-processing-fundamentals-and-vegetation-dynamics.md (Session 4).
 *   Assessment: AT1–AT4 (your personal tile, years and AT4 settings).
 *
 * KEY GEE IDEAS:
 *   - FeatureCollection filtering with filterBounds (keep the basin that touches a point).
 *   - coveringGrid in a chosen projection (EPSG:3577 at 20 km) to make a regular tile grid.
 *   - Server-side ee.Number / ee.List maths: values are computed on Google's servers, then shown with print().
 *   - Exporting a feature to your Assets with Export.table.toAsset (start it in the Tasks tab).
 *
 * Q = core (ENV306 and ENV506).  EXT = ENV506 extension.
 ****/

// ---------- 0 EDIT: your student number (digits only, e.g. s123456 → 123456) ----------
// This is the ONLY line you need to change. Replace 123456 with your own student number (no "s", no quotes).
// Everything below is calculated from this number, so a typo here gives you someone else's tile.
var STUDENT_NUMBER = 123456;   // <-- EDIT HERE
var COHORT_SALT = 2026;   // staff: change each year so tiles and years rotate between cohorts
// COHORT_SALT ("salt" = an extra number mixed in) is set by staff. Students: leave it alone.
// Because it changes each year, the same student number gets a different tile in a different year.

// ---------- 1 Daly River catchment and the 20 km tile grid ----------
// Find the Daly River catchment, then cover it with a grid of 20 km squares. Only squares lying almost
// fully inside the catchment are kept, so every tile is a fair, complete study area.
// HydroSHEDS level-4 basin containing the Daly River near Oolloo. Staff: check the outline each year.
var daly = ee.FeatureCollection('WWF/HydroSHEDS/v1/Basins/hybas_4')
  .filterBounds(ee.Geometry.Point([131.25, -14.07]));   // keep only the basin that contains this point (near Oolloo)
var dalyGeom = daly.geometry();   // turn the basin feature(s) into one geometry (an outline) we can measure against
var proj = ee.Projection('EPSG:3577').atScale(20000);   // GDA94 / Australian Albers, 20 km cells
// EPSG:3577 is an equal-area projection for Australia (units are metres), so every 20 km cell has the same area.
var grid = dalyGeom.coveringGrid(proj)   // make a grid of 20 km squares that covers the whole catchment
  .map(function(cell) {   // map() runs this function on every grid cell
    // inside = fraction of the cell's area that falls inside the catchment (0 = none, 1 = all).
    // The "100" values are the error margin (in metres) GEE may use when computing the shapes and areas.
    var inside = cell.geometry().intersection(dalyGeom, 100).area(100).divide(cell.geometry().area(100));
    return cell.set('inside', inside);   // store the fraction as a property of the cell
  })
  .filter(ee.Filter.gt('inside', 0.99))   // keep only cells more than 99% inside the catchment (drops edge cells)
  .sort('system:index');   // put the tiles in a fixed order, so "tile number 5" always means the same square
var n = grid.size();   // how many tiles are available to choose from

// ---------- 2 Deterministic picks ----------
// "Deterministic" means: no randomness. The same student number always gives the same picks.
// The idea: multiply your student number by a fixed number, add the cohort salt, then take the remainder
// after dividing by the length of the list (that is what mod() does). The remainder is always between 0 and
// (length − 1), so it can be used as a position in the list. Example: list of 4 years, remainder 2 → the 3rd year.
// Each pick uses a different multiplier (k), so your tile, years and sites do not all move together.
function pick(list, k) {
  list = ee.List(list);   // make sure the list is a server-side ee.List
  // position = (STUDENT_NUMBER × k + COHORT_SALT) mod (number of items); then return the item at that position
  return list.get(ee.Number(STUDENT_NUMBER).multiply(k).add(COHORT_SALT).mod(list.length()));
}
// Your tile: same recipe, using the multiplier 7919 (a prime number, which spreads students across tiles).
var tileIndex = ee.Number(STUDENT_NUMBER).multiply(7919).add(COHORT_SALT).mod(n);   // a number from 0 to n − 1
var tile = ee.Feature(grid.toList(n).get(tileIndex));   // take the tile at that position in the sorted grid
var TILE = tile.geometry();   // your tile's square outline — later scripts call this TILE

// Your assessment years and sites. Each line picks one item from a list using pick(list, multiplier).
var at2Year = ee.Number(pick(ee.List.sequence(2005, 2024), 31));          // AT2 focus year
var at3Gap = ee.Number(pick([5, 6, 7, 8], 17));   // number of years between your two AT3 dates
var at3YearA = ee.Number(pick(ee.List.sequence(2014, ee.Number(2024).subtract(at3Gap)), 37));   // Landsat 8/9 era
// YEAR_A is chosen from 2014 up to (2024 − gap), so that YEAR_B = YEAR_A + gap is never later than 2024.
var at3YearB = at3YearA.add(at3Gap);                                                               // ≤ 2024
var clearingStart = ee.Number(pick([2016, 2017, 2018, 2019], 13));   // first year of your 5-year clearing period
var fireStart = ee.Number(pick([2003, 2005, 2007, 2009, 2011, 2013], 11));   // first year of your 10-year fire window
var crocRiver = pick(['Adelaide', 'Mary', 'Daly', 'Liverpool', 'Blyth', 'Glyde'], 19);   // elective (c) river system
var urbanSite = pick(['Palmerston', 'Darwin northern suburbs', 'Litchfield rural fringe', 'Katherine', 'Alice Springs', 'Nhulunbuy'], 23);
// Elective (d): urbanSite (above) is your town; urbanPair (below) is your [start year, end year].
var urbanPair = ee.List(pick([[2016, 2024], [2017, 2025], [2018, 2025], [2016, 2023]], 29));
// Elective (a) species: staff check Atlas of Living Australia record counts (and coordinate generalisation of
// sensitive species) before the cohort starts, and edit this list if needed.
var species = pick(['Gouldian finch (Erythrura gouldiae)', 'Partridge pigeon (Geophaps smithii)',
                    'Northern quoll (Dasyurus hallucatus)', 'Black-footed tree-rat (Mesembriomys gouldii)',
                    'Brush-tailed rabbit-rat (Conilurus penicillatus)', 'Red goshawk (Erythrotriorchis radiatus)'], 43);
var alphaPair = ee.List(pick([[2017, 2024], [2018, 2024], [2017, 2023], [2019, 2024]], 41));   // elective (b) year pair

// ---------- 3 Print (copy these into your AT1 proposal) ----------
// print() sends each value to the Console. The values are worked out on Google's servers, so they may take
// a few seconds to appear. Copy all of them into your AT1 proposal.
print('Student number', STUDENT_NUMBER, 'cohort', COHORT_SALT);   // check this is YOUR number before copying anything
print('Tiles available in the Daly catchment', n);
print('Your tile index', tileIndex, 'tile centroid (lon, lat)', TILE.centroid(1).coordinates());   // centre point, degrees
print('AT2 focus year (Pracs 02–03)', at2Year);
print('AT3 transition years (Prac 05): YEAR_A, YEAR_B', at3YearA, at3YearB);
print('AT4 Part 2 clearing period (Prac 06)', clearingStart, '→', clearingStart.add(4));   // 5 years, inclusive
print('AT4 Part 3 fire window (Prac 07)', fireStart, '→', fireStart.add(9));   // 10 years, inclusive
print('AT4 elective (a) species (Prac 12)', species);
print('AT4 elective (b) AlphaEarth years (Prac 13)', alphaPair);
print('AT4 elective (c) focal river system (Prac 09)', crocRiver);
print('AT4 elective (d) urban site and years (Prac 10)', urbanSite, urbanPair);
// TILE_ID is your tile index written with 3 digits, e.g. tile 7 → "DALY-007".
var TILE_ID = ee.String('DALY-').cat(tileIndex.int().format('%03d'));
print('Your TILE_ID (label every figure with it and your student ID)', TILE_ID);
// Allocation code = tile index × 1000 + (last two digits of AT2 year) × 10 + AT3 gap. Staff use it to check your allocation.
print('Allocation code (staff master sheet)', tileIndex.multiply(1000).add(at2Year.mod(100).multiply(10)).add(at3Gap));

// ---------- 4 Map ----------
// Draw the catchment, the grid and your tile so you can see where you will be working.
Map.centerObject(TILE, 10);   // zoom to your tile (zoom level 10 ≈ the whole 20 km square on screen)
// style() draws outlines; fillColor '00000000' is fully transparent (the last two hex digits are opacity).
Map.addLayer(daly.style({color: '#08519c', fillColor: '00000000', width: 2}), {}, 'Daly catchment (HydroSHEDS level 4)');
// The grid layer starts switched off (false); MY TILE has a light red, mostly see-through fill ('ff000022').
Map.addLayer(grid.style({color: '#999999', fillColor: '00000000', width: 1}), {}, '20 km tile grid', false);
Map.addLayer(ee.FeatureCollection([tile]).style({color: 'red', fillColor: 'ff000022', width: 3}), {}, 'MY TILE');
Map.setOptions('HYBRID');   // satellite basemap with labels

// Save TILE for other scripts: Export the tile as an asset (optional), or copy its corner coordinates.
print('Your tile corners (paste into later scripts as ee.Geometry.Polygon)', TILE.coordinates());   // lon, lat pairs
// This export does not run by itself: open the Tasks tab and click RUN next to "Prac00_my_tile".
// It saves your tile as a table called "my_tile" in your Assets, which later scripts can load.
Export.table.toAsset({collection: ee.FeatureCollection([tile]), description: 'Prac00_my_tile', assetId: 'my_tile'});
```

</details>

<details>
<summary><strong>prac01a_gee_basics.js</strong> (131 lines)</summary>

```javascript
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
```

</details>

<details>
<summary><strong>prac01b_image_processing_fundamentals.js</strong> (203 lines)</summary>

```javascript
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
```

</details>

<details>
<summary><strong>prac01c_vegetation_dynamics_ndvi_evi.js</strong> (138 lines)</summary>

```javascript
/**** Prac 01c — NDVI and EVI time series (Northern Territory)
 * Sites: Howard Springs savanna (OzFlux tower) vs a cleared paddock in the Douglas–Daly.
 * Data: MODIS MOD13Q1 (250 m, 16-day, 2000–present) and Sentinel-2 (10 m, 2017–present).
 *
 * WHAT THIS SCRIPT DOES:
 *   Charts how vegetation greenness (NDVI and EVI) rises and falls through the wet and dry seasons at three NT
 *   sites — tropical savanna (Howard Springs), farmland (Douglas–Daly) and arid country (Alice Springs) —
 *   using 25 years of MODIS and recent Sentinel-2 data, and maps wet- vs dry-season NDVI across the NT.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) No EDIT lines are required, but the first Q asks you to move the Douglas–Daly point (section 1).
 *   (3) Click Run.
 *   (4) Read the charts in the Console (right panel) — click the arrow icon on a chart to open it full size and
 *       download CSV. Turn layers on/off in the Map's Layers list, and start the export in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   Charts: MODIS NDVI 2001–2025 per site; NDVI vs EVI at Howard Springs; mean monthly NDVI cycle per site;
 *   Sentinel-2 EVI 2018–2025 for the two Top End sites.
 *   Map: site points, and NT NDVI for the 2024 wet season (Jan–Mar) and dry season (May–Sep).
 *
 * DATA:
 *   MODIS/061/MOD13Q1 — MODIS Terra vegetation indices, 250 m, 16-day; 2001–2025 used.
 *   COPERNICUS/S2_SR_HARMONIZED — Sentinel-2 surface reflectance, 10 m; 2018–2025 used.
 *   GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED — Cloud Score+ clear-sky score for Sentinel-2, 10 m.
 *   FAO/GAUL/2015/level1 — state/territory boundaries (vector, 2015).
 *
 * LINKS:
 *   Prac page: pracs/prac01-earth-engine-image-processing-fundamentals-and-vegetation-dynamics.md
 *   Assessment: Prac 01; foundations for AT1–AT4.
 *
 * KEY GEE IDEAS:
 *   - map() over an ImageCollection to mask, scale and calculate indices for every image.
 *   - Time-series charts (ui.Chart.image.series / seriesByRegion) with a reducer and scale.
 *   - Calendar filters (calendarRange) to build a monthly climatology.
 *   - reduceRegions + flatten() to turn an image collection into a table for export.
 *
 * Q = core (ENV306 and ENV506).  EXT = ENV506 extension.
 ****/

// ---------- 1 Study area ----------
// Three contrasting sites, stored as points with a "name" property (used to label chart lines).
var sites = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([131.1501, -12.4952]), {name: 'Howard Springs savanna'}),   // [lon, lat]
  ee.Feature(ee.Geometry.Point([131.1900, -13.8300]), {name: 'Douglas-Daly farmland'}),
  ee.Feature(ee.Geometry.Point([133.8800, -23.7000]), {name: 'Alice Springs (arid)'})
]);
Map.centerObject(sites, 6);
Map.addLayer(sites, {color: 'red'}, 'Sites');
// Q: Move the Douglas-Daly point onto a pivot or cleared paddock using the satellite basemap.
// Hint: click the map to read coordinates in the Inspector tab, then edit the numbers for Douglas-Daly above.

// ---------- 2 Data: MODIS ----------
// Load MODIS 16-day vegetation indices, drop poor-quality pixels and convert NDVI/EVI to real values.
var modis = ee.ImageCollection('MODIS/061/MOD13Q1')
  .filterDate('2001-01-01', '2026-01-01')   // start inclusive, end exclusive → 2001 to 2025
  .map(function(img) {
    // SummaryQA: 0 = good, 1 = marginal. Keep both, drop snow/cloud (2, 3).
    var qa = img.select('SummaryQA').lte(1);
    // MODIS stores NDVI and EVI × 10 000; multiply by 0.0001 to get values on the usual −1 to 1 scale.
    return img.select(['NDVI', 'EVI']).multiply(0.0001).updateMask(qa)
      .copyProperties(img, ['system:time_start']);   // keep the date so charts can plot against time
  });

// ---------- 4 Analysis / 5 Visualise ----------
// Chart the MODIS time series at each site. Each chart takes the mean of the pixels at the point (scale 250 m).
var chartNdvi = ui.Chart.image.seriesByRegion({
  // one line per site: seriesProperty 'name' labels the lines; xProperty sets the x-axis to the image date
  imageCollection: modis, regions: sites, reducer: ee.Reducer.mean(),
  band: 'NDVI', scale: 250, xProperty: 'system:time_start', seriesProperty: 'name'
}).setOptions({title: 'MODIS NDVI 2001–2025', vAxis: {title: 'NDVI', viewWindow: {min: 0, max: 0.9}},
               lineWidth: 1, pointSize: 0});
print(chartNdvi);

// NDVI and EVI on the same chart for one site, to compare the two indices.
var howard = sites.filter(ee.Filter.eq('name', 'Howard Springs savanna'));
print(ui.Chart.image.series(modis.select(['NDVI', 'EVI']), howard, ee.Reducer.mean(), 250)
  .setOptions({title: 'Howard Springs: NDVI vs EVI', lineWidth: 1, pointSize: 0}));

// Monthly climatology (mean seasonal cycle)
// For each month (1–12), average every image from that calendar month across all years → 12 images.
var months = ee.List.sequence(1, 12);
var clim = ee.ImageCollection.fromImages(months.map(function(m) {
  return modis.filter(ee.Filter.calendarRange(m, m, 'month')).mean()   // e.g. all Januaries 2001–2025
    .set('month', m);   // store the month number so the chart can use it on the x-axis
}));
print(ui.Chart.image.seriesByRegion({
  imageCollection: clim, regions: sites, reducer: ee.Reducer.mean(), band: 'NDVI',
  scale: 250, xProperty: 'month', seriesProperty: 'name'
}).setOptions({title: 'NDVI seasonal cycle (2001–2025 mean)', hAxis: {title: 'Month'}}));

// ---------- 2b Data: Sentinel-2 EVI at 10 m ----------
// The same idea at much finer detail (10 m vs 250 m), but with a shorter record.
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(sites)
  .filterDate('2018-01-01', '2026-01-01')
  .linkCollection(csPlus, ['cs_cdf'])   // attach the Cloud Score+ band to each image
  .map(function(img) {
    // Keep pixels with cs_cdf ≥ 0.6 (0 = cloudy, 1 = clear) — a starting value, test others. ÷ 10 000 → reflectance.
    var r = img.updateMask(img.select('cs_cdf').gte(0.6)).divide(10000);
    // EVI uses the blue band to correct for haze and does not saturate as quickly as NDVI over dense vegetation.
    var evi = r.expression('2.5 * (N - R) / (N + 6 * R - 7.5 * B + 1)',
      {N: r.select('B8'), R: r.select('B4'), B: r.select('B2')}).rename('EVI');   // B8 = NIR, B4 = red, B2 = blue
    var ndvi = r.normalizedDifference(['B8', 'B4']).rename('NDVI');
    return ndvi.addBands(evi).copyProperties(img, ['system:time_start']);
  });
print(ui.Chart.image.seriesByRegion({
  // Alice Springs is left out (filter neq = "not equal") to keep the chart to the two Top End sites.
  imageCollection: s2, regions: sites.filter(ee.Filter.neq('name', 'Alice Springs (arid)')),
  reducer: ee.Reducer.mean(), band: 'EVI', scale: 10, seriesProperty: 'name'
}).setOptions({title: 'Sentinel-2 EVI 2018–2025', pointSize: 2, lineWidth: 0}));   // points only: gaps are cloud

// Map: dry-season NDVI 2024 across the NT (MODIS)
// Median of the 16-day images in each season; median ignores leftover cloud better than mean.
var nt = ee.FeatureCollection('FAO/GAUL/2015/level1').filter(ee.Filter.eq('ADM1_NAME', 'Northern Territory'));
var dry2024 = modis.filterDate('2024-05-01', '2024-09-30').select('NDVI').median().clip(nt);
var wet2024 = modis.filterDate('2024-01-01', '2024-03-31').select('NDVI').median().clip(nt);
var vis = {min: 0, max: 0.8, palette: ['#8c510a', '#d8b365', '#f6e8c3', '#c7eae5', '#5ab4ac', '#01665e']};   // brown → teal
Map.addLayer(wet2024, vis, 'NDVI wet season Jan–Mar 2024');
Map.addLayer(dry2024, vis, 'NDVI dry season May–Sep 2024');

// ---------- 6 Export ----------
// Make a table (CSV) with one row per site per MODIS date: mean NDVI and EVI plus a readable date.
// Start the export in the Tasks tab; the file goes to the GEE_NT folder in your Google Drive.
Export.table.toDrive({
  collection: modis.map(function(img) {
    return img.reduceRegions(sites, ee.Reducer.mean(), 250)   // mean value at each site for this image (250 m pixels)
      .map(function(f) { return f.set('date', img.date().format('YYYY-MM-dd')); });   // add the date as text
  }).flatten(),   // turn the collection of tables (one per image) into one long table
  description: 'Prac01c_MODIS_NDVI_EVI_sites', folder: 'GEE_NT', fileFormat: 'CSV'
});

// Q: Describe the seasonal cycle at Howard Springs. When is peak greenness, and why?
// Q: Why does the Douglas-Daly site show sharper peaks than the savanna?
// Q: Where does NDVI appear to saturate relative to EVI?
// EXT: Quantify the wet–dry amplitude per site per year and relate it to wet-season rainfall (Prac 03a).
// EXT: MODIS at 250 m mixes land covers. Compute S2 NDVI within one 250 m pixel and discuss sub-pixel heterogeneity.
```

</details>

---

[Home](../README.md) · [Schedule](../schedule-2026.md) · [Prac 02 →](prac02-monitoring-vegetation-condition-trends-and-seasonality.md)
