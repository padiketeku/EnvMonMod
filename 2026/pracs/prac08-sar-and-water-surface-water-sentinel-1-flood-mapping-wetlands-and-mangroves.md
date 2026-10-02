[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 07](prac07-fire-regime-burn-severity-frequency-and-seasonality.md) · [Prac 09 →](prac09-crocodile-biomass-modelling-with-sar-floodplain-inundation.md)

# Prac 08: SAR and water: surface water, Sentinel-1 flood mapping, wetlands and mangroves

**When:** Mon 9 Nov 2026, Session 2 (surface water and Sentinel-1 floods, after the SAR and lidar introduction) and Tue 10 Nov 2026, Session 4 (wetlands and mangroves) · **Scripts:** [`prac08a_surface_water_wetlands.js`](../scripts/prac08a_surface_water_wetlands.js), [`prac08b_flood_sentinel1.js`](../scripts/prac08b_flood_sentinel1.js), [`prac08c_mangrove_dynamics.js`](../scripts/prac08c_mangrove_dynamics.js) · **ULOs:** 1, 2, 3, 4

**Also available in:** Python [`prac08_water_floods_mangroves.py`](../alternatives/python/prac08_water_floods_mangroves.py) · R [`prac08_water_floods_mangroves.R`](../alternatives/r/prac08_water_floods_mangroves.R) · QGIS [recipe](../alternatives/qgis/README.md). The Code Editor remains the main environment.

**Purpose.** This is the first SAR prac. It teaches Sentinel-1 flood mapping, which is then applied to crocodile habitat (Prac 09) and urban areas (Prac 10).

## 1. Concept notes

### SAR fundamentals (introduced on Mon 9 Nov, Session 1)

SAR is an *active* microwave sensor. It records backscatter (σ⁰) and works through cloud, smoke and darkness, which makes it essential in the NT wet season.

| Property | Meaning | Effect |
| --- | --- | --- |
| Wavelength | C-band ≈ 5.6 cm (Sentinel-1); L-band ≈ 24 cm (ALOS PALSAR-2) | Longer wavelengths penetrate canopies |
| Polarisation | VV and VH (Sentinel-1) | VH (cross-polarised) is sensitive to vegetation volume and suits heterogeneous floodplains |
| Scattering | Specular (calm water → dark); surface; volume; double-bounce (flooded vegetation, buildings → bright) | Open water is darkest because the signal reflects away from the sensor |
| Geometry | Side-looking; ascending vs descending passes | Keep one pass throughout a time series |
| Speckle | Granular "salt and pepper" noise | Smooth with a moving window (boxcar filter), at the cost of spatial detail |

**SAR units in this unit: dB to look, linear to compute.** Earth Engine holds Sentinel-1 in two versions of the same scenes: `COPERNICUS/S1_GRD` in dB (negative values) and `COPERNICUS/S1_GRD_FLOAT` in linear power. Backscatter is a power, and dB is a logarithm of it, so averaging or filtering dB values gives the wrong answer (the mean of −10 dB and −20 dB is −15 dB in dB, but −12.6 dB in power). Every script therefore loads the linear `S1_GRD_FLOAT` collection, does all calculations in linear σ⁰, and uses dB only for map layers and chart axes:

```math
\sigma^0_{\mathrm{lin}}=10^{\,\sigma^0_{\mathrm{dB}}/10}\qquad \sigma^0_{\mathrm{dB}}=10\log_{10}\sigma^0_{\mathrm{lin}}\qquad \text{ratio}=\frac{\sigma^0_{\mathrm{after}}}{\sigma^0_{\mathrm{before}}}\;(\text{shown as }10\log_{10}\text{ratio dB})
```

Composites, speckle filters, ratios, standard deviations, regression predictors and areas all use linear values. Thresholds quoted in dB are converted before use: a 3 dB drop is a linear ratio of 0.50, and −16 dB is 0.025. A darker, wetter "after" image gives a ratio below 1. Medians and minima are the same in either unit, but means, standard deviations and ratios are not.

### Water in NT landscapes

**Hydrological connectivity.** Water links NT landscapes: monsoonal floods connect rivers to floodplains and billabongs, and tides connect mangroves to saltpans. Connectivity governs the movement of fish, sediment, nutrients and salt. Floodplains of the Mary River and Kakadu are internationally important wetlands, threatened by saltwater intrusion and weeds.

**Optical water indices.**

```math
\mathrm{NDWI}=\frac{\rho_{Green}-\rho_{NIR}}{\rho_{Green}+\rho_{NIR}}\qquad \mathrm{MNDWI}=\frac{\rho_{Green}-\rho_{SWIR1}}{\rho_{Green}+\rho_{SWIR1}}
```

Optical indices detect open water well, but miss water under emergent vegetation and are blocked by wet-season cloud.

**JRC Global Surface Water (1984–2021).**

- Occurrence: % of valid observations that are water.
- Seasonality: months of water per year.
- Transitions.
- Yearly seasonal vs permanent classes.

**SAR flood mapping.** Calm water reflects radar away from the sensor (specular reflection) and appears dark. Flood mapping uses change detection: compare a dry reference with the flood period (from the *same relative orbit*), threshold the backscatter drop and low values, and then mask permanent water and steep slopes. Flooded vegetation can instead appear *brighter* through double-bounce scattering.

**Case: Victoria River, Kalkarindji, Feb–Mar 2023.** A monsoonal low dropped 200–300 mm in a week. The river at Kalkarindji was forecast to reach about 17.5 m, matching the 2001 record, and about 700 residents of Kalkarindji, Daguragu, Pigeon Hole and nearby communities were evacuated around 1 March 2023 ([ABC News](https://www.abc.net.au/news/2023-03-01/nt-kalkaringi-flooding-victoria-daly/102038966)).

**Mangroves.** Mangroves are intertidal forests that store blue carbon and protect coasts. In summer 2015–16, about 7,400 ha died along about 1,000 km of Gulf of Carpentaria coast from the Roper River (NT) to Karumba (Qld), with about 5,500 ha of that loss in the NT. The likely causes were drought, extreme heat and a temporary sea-level drop of up to 20 cm during a strong El Niño (Duke et al., 2017).

## 2. Practical activities

**Activity 8.1 – Surface water and wetlands (`prac08a`).**

1. Map JRC occurrence, seasonality and transitions on the Mary, Wildman and Alligator River floodplains.
2. Chart seasonal vs permanent water per year.
3. Map MNDWI water at the end of the wet and dry seasons in 2024, and compare the areas.

**Activity 8.2 – SAR flood mapping (`prac08b`).**

1. List the flood-period Sentinel-1 acquisitions and choose a relative orbit.
2. Build the reference (Oct–Nov 2022) and the flood composite (25 Feb–15 Mar 2023), convert to linear σ⁰, speckle-filter, and take the ratio after ÷ before (shown in dB).
3. Threshold in linear units (ratio < 0.50, a 3 dB drop; VV < 0.025, i.e. −16 dB), mask permanent water, slopes and small clusters, and calculate the flooded area.
4. Chart the VV flood pulse at a floodplain point.

**Activity 8.3 – Mangrove dieback (`prac08c`).**

1. Compare the Giri 2000 and WorldCover 2021 mangrove extents at Limmen Bight.
2. Chart annual dry-season NDVI inside the mangrove mask (2014–2024).
3. Map dieback (2015 → 2017) and recovery by 2024, and calculate the areas.

**Key code** (an excerpt from [`prac08b_flood_sentinel1.js`](../scripts/prac08b_flood_sentinel1.js); run the full script for the complete workflow):

```javascript
// Sentinel-1 flood mapping: statistics in linear units, dB for display only
function toDb(img) { return img.log10().multiply(10); }   // display only
function dbToLin(x) { return Math.pow(10, x / 10); }
var aoi = ee.Geometry.Rectangle([130.40, -17.80, 131.20, -17.00]);   // Victoria River at Kalkarindji
var s1 = ee.ImageCollection('COPERNICUS/S1_GRD_FLOAT').filterBounds(aoi)   // linear σ⁰, no conversion needed
  .filter(ee.Filter.eq('instrumentMode', 'IW')).select('VV');
var before = s1.filterDate('2022-10-01', '2022-11-30').mean().focalMean(50, 'circle', 'meters');
var after = s1.filterDate('2023-02-25', '2023-03-15').min().focalMean(50, 'circle', 'meters');
var ratio = after.divide(before);                                   // water darkens → ratio < 1
var flood = ratio.lt(dbToLin(-3)).and(after.lt(dbToLin(-16))).selfMask();
Map.addLayer(toDb(ratio), {min: -8, max: 8, palette: ['#08519c', '#ffffff', '#a50f15']}, 'VV change (dB)');
Map.addLayer(flood, {palette: 'cyan'}, 'Flood extent');
```

## 3. Challenge questions (knowledge check)

**Core**

1. Which parts of the Kakadu floodplains are permanent vs seasonal water? Link this to connectivity.
2. Why is SAR preferred for wet-season flood mapping, and why must the images share an orbit?
3. How does the flooded area change with thresholds of −2 dB and −5 dB? Which error does each threshold favour?
4. Is mangrove dieback concentrated on the seaward fringe or the landward saltpan edge? Why?
5. For each activity, name one management decision the map informs and one limitation a decision-maker must know.

**Extension (ENV506)**

1. Replace the fixed SAR thresholds with Otsu thresholding, and add HAND (`MERIT/Hydro/v1_0_1`, band `hnd`).
2. Fuse Sentinel-1 VH with MNDWI to detect water under vegetation in Kakadu, and evaluate what each sensor adds.
3. Quantify how the choice of baseline mangrove map changes the dieback estimate, and discuss the implications for state-of-environment reporting.

## 4. Link to summative assessment

- **AT4 Part 4:** use Sentinel-1 (linear units) for wet-season change, inundation or cloud-free clearing detection in your tile.
- **AT4 elective (c):** the flood-mapping methods here support the crocodile case study.

## 5. Reading

- Pekel, J.-F., Cottam, A., Gorelick, N., & Belward, A. S. (2016). High-resolution mapping of global surface water and its long-term changes. *Nature, 540*, 418–422. https://doi.org/10.1038/nature20584
- Xu, H. (2006). Modification of normalised difference water index (NDWI) to enhance open water features in remotely sensed imagery. *International Journal of Remote Sensing, 27*(14), 3025–3033. https://doi.org/10.1080/01431160600589179
- Tiwari, V., et al. (2020). Flood inundation mapping — Kerala 2018; Harnessing the power of SAR, automatic threshold detection method and Google Earth Engine. *PLoS ONE, 15*(8), e0237324. https://doi.org/10.1371/journal.pone.0237324
- Duke, N. C., et al. (2017). Large-scale dieback of mangroves in Australia's Gulf of Carpentaria: A severe ecosystem response, coincidental with an unusually extreme weather event. *Marine and Freshwater Research, 68*, 1816–1829. https://doi.org/10.1071/MF16322
- Bunting, P., et al. (2022). Global mangrove extent change 1996–2020: Global Mangrove Watch version 3.0. *Remote Sensing, 14*(15), 3657. https://doi.org/10.3390/rs14153657

## Full scripts

Each script is copied here from [`scripts/`](../scripts) so this page has everything in one place. The `.js` file is the master copy: if the two ever differ, use the file. Click a heading to open the script, then use the copy button and paste it into a new script in the Code Editor.

<details>
<summary><strong>prac08a_surface_water_wetlands.js</strong> (120 lines)</summary>

```javascript
/**** Prac 08a — Surface water and wetland dynamics (Kakadu / Mary River floodplains, NT)
 * Data: JRC Global Surface Water v1.4 (Landsat, 1984–2021), Sentinel-2 MNDWI (2017–present).
 *
 * WHAT THIS SCRIPT DOES:
 *   Asks where and how often open water occurs on the Mary, Wildman, West and South Alligator River floodplains.
 *   It maps the JRC long-term water layers (how often, how many months, how it changed 1984→2021), charts
 *   seasonal vs permanent water area each year, and compares late-wet and late-dry 2024 water from Sentinel-2 MNDWI.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) Optional EDIT lines: aoi (section 1) and the wet/dry date windows for wetMNDWI and dryMNDWI.
 *   (3) Click Run.
 *   (4) Read the Console (right panel) for the chart and water areas, turn layers on/off in the Map's Layers list,
 *       and start the export in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   - Map: JRC water occurrence (%), seasonality (months/year), transition class 1984→2021,
 *     and Sentinel-2 water (MNDWI > 0) for Mar–Apr and Sep–Oct 2024.
 *   - Console: stacked column chart of seasonal and permanent water area (km²) per year, and open-water area (km²)
 *     for late wet vs late dry 2024.
 *
 * DATA:
 *   - JRC Global Surface Water v1.4, JRC/GSW1_4/GlobalSurfaceWater, 30 m, 1984–2021 summary layers.
 *   - JRC Yearly Water Classification History v1.4, JRC/GSW1_4/YearlyHistory, 30 m, one image per year 1984–2021.
 *   - Sentinel-2 surface reflectance, COPERNICUS/S2_SR_HARMONIZED, B3 (10 m) and B11 (20 m), Mar–Apr and Sep–Oct 2024.
 *   - Cloud Score+, GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED, 10 m, matched to each Sentinel-2 image.
 *
 * LINKS: pracs/prac08-sar-and-water-surface-water-sentinel-1-flood-mapping-wetlands-and-mangroves.md
 *   (course repository). Feeds Prac 08 and AT4 Part 4.
 *
 * KEY GEE IDEAS:
 *   - Using a ready-made global product (JRC) and its band meanings and class codes.
 *   - map() over an ImageCollection with a grouped reducer inside, to get area per class per year.
 *   - Server-side conditionals (ee.Algorithms.If) when a class may be missing in some years.
 *   - reduceRegion arguments (scale, maxPixels, tileScale) — here also given by position, not by name.
 *
 * Q = core (ENV306 and ENV506). EXT = ENV506 extension.
 ****/

// ---------- 1 Study area ----------
// A rectangle over the coastal floodplains between Darwin and Kakadu.
var aoi = ee.Geometry.Rectangle([131.60, -12.95, 132.70, -12.10]);   // Mary, Wildman, West & South Alligator floodplains
Map.centerObject(aoi, 9);

// ---------- 2 Data ----------
// JRC Global Surface Water: water mapped from every Landsat image since 1984.
// gsw = one image of long-term summaries; yearly = one image per year with a water class per pixel.
var gsw = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').clip(aoi);
var yearly = ee.ImageCollection('JRC/GSW1_4/YearlyHistory');   // 0 no data, 1 not water, 2 seasonal, 3 permanent

// ---------- 3 Visualise JRC layers ----------
// occurrence = % of valid observations that were water (0–100); seasonality = months of water in a typical year (1–12);
// transition = change class between the first and last years (e.g. permanent, new seasonal, lost permanent).
Map.addLayer(gsw.select('occurrence'), {min: 0, max: 100, palette: ['#ffffff', '#ffbbbb', '#0000ff']}, 'Occurrence (% of time water)');
Map.addLayer(gsw.select('seasonality'), {min: 1, max: 12, palette: ['#99d8c9', '#2ca25f', '#00441b']}, 'Seasonality (months water per year)', false);
// The 11 colours follow the JRC transition legend for classes 0–10 (click a pixel with Inspector to read its class).
Map.addLayer(gsw.select('transition'), {min: 0, max: 10,
  palette: ['#ffffff', '#0000ff', '#22b14c', '#d1102d', '#99d9ea', '#b5e61d', '#e6a1aa', '#ff7f27', '#ffc90e', '#7f7f7f', '#c3c3c3']},
  'Transition class 1984→2021', false);

// ---------- 4 Analysis: permanent vs seasonal water area per year ----------
// For each yearly image, total the km² in each water class, then pull out seasonal (2), permanent (3) and no-data (0).
var areaKm2 = ee.Image.pixelArea().divide(1e6);   // pixel area in m² ÷ 1 000 000 = km²
var waterSeries = yearly.map(function(img) {
  var w = img.select('waterClass');
  // Grouped reducer: sum band 0 (km²) for each value of band 1 (waterClass). scale 30 = JRC/Landsat pixel size;
  // maxPixels lifts the pixel limit; tileScale 4 uses smaller tiles to avoid memory errors.
  var a = areaKm2.addBands(w).reduceRegion({
    reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'cls'}),
    geometry: aoi, scale: 30, maxPixels: 1e11, tileScale: 4});
  var groups = ee.FeatureCollection(ee.List(a.get('groups')).map(function(d) { return ee.Feature(null, d); }));
  // lookup(code): area for one class, or 0 if that class is absent this year (server-side "if").
  var lookup = function(code) {
    var match = groups.filter(ee.Filter.eq('cls', code));
    return ee.Algorithms.If(match.size().gt(0), match.first().get('sum'), 0);
  };
  return ee.Feature(null, {year: img.get('year'), seasonal_km2: lookup(2), permanent_km2: lookup(3),
                           nodata_km2: lookup(0)});
});
print(ui.Chart.feature.byFeature(waterSeries, 'year', ['seasonal_km2', 'permanent_km2'])
  .setChartType('ColumnChart').setOptions({isStacked: true, title: 'JRC water area per year (km²)',
  colors: ['#99d8c9', '#08519c']}));   // light = seasonal, dark = permanent
// Q: Check nodata_km2 in the exported table. Why are some early years unreliable?

// ---------- Sentinel-2 MNDWI: wet vs dry season ----------
// A recent, finer check than JRC. MNDWI = (Green − SWIR1) / (Green + SWIR1); open water is usually > 0
// because water reflects some green light but almost no SWIR. Unitless, −1 to 1.
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
function mndwi(start, end) {
  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(aoi).filterDate(start, end)
    .linkCollection(csPlus, ['cs_cdf'])   // attach the matching Cloud Score+ band to each S2 image
    .map(function(img) {
      // Keep pixels with cs_cdf ≥ 0.5 (0 = cloudy, 1 = clear; a starting value — test others). B3 = green, B11 = SWIR1.
      // No ÷ 10000 needed: a normalised difference is the same in digital numbers or reflectance.
      return img.updateMask(img.select('cs_cdf').gte(0.5)).normalizedDifference(['B3', 'B11']).rename('MNDWI');
    }).median().clip(aoi);   // median of the window: robust to leftover cloud and shadow
}
var wetMNDWI = mndwi('2024-03-01', '2024-04-15');   // end of wet season (cloud permitting)
var dryMNDWI = mndwi('2024-09-15', '2024-10-31');   // end of dry season
// Threshold 0 is a common starting value — test others (see the Otsu EXT below). selfMask hides non-water.
var wetWater = wetMNDWI.gt(0).selfMask();
var dryWater = dryMNDWI.gt(0).selfMask();
Map.addLayer(wetWater, {palette: '#6baed6'}, 'Water (MNDWI>0) Mar–Apr 2024');
Map.addLayer(dryWater, {palette: '#08306b'}, 'Water (MNDWI>0) Sep–Oct 2024');

// reduceRegion arguments given by position: reducer, geometry, scale (20 m = B11 pixel size), crs (null = default),
// crsTransform (null), bestEffort (false), maxPixels (1e11), tileScale (4).
var wetArea = areaKm2.updateMask(wetWater).reduceRegion(ee.Reducer.sum(), aoi, 20, null, null, false, 1e11, 4);
var dryArea = areaKm2.updateMask(dryWater).reduceRegion(ee.Reducer.sum(), aoi, 20, null, null, false, 1e11, 4);
print('Open water km², late wet vs late dry 2024', wetArea, dryArea);   // each prints as {area: km²}

// ---------- 6 Export ----------
// The yearly JRC area table (including nodata_km2) as a CSV in Google Drive. Start it in the Tasks tab.
Export.table.toDrive({collection: waterSeries, description: 'Prac08a_JRC_water_area', folder: 'GEE_NT'});

// Q: Which parts of the floodplain are permanent vs seasonal water? Relate this to the paperbark swamps and billabongs.
// Q: MNDWI under-detects water beneath emergent vegetation (sedges, water lilies). How would this bias the wet-season area?
// Q: Look at transition classes near the coast of the Mary River. What do "new permanent" or "lost" classes suggest? (Hint: saltwater intrusion.)
// EXT: Optical sensors miss vegetated wetlands. Add Sentinel-1 VH (Prac 08b) and compare inundation extents.
// EXT: Calibrate the MNDWI threshold with Otsu's method instead of 0, and report the area sensitivity.
```

</details>

<details>
<summary><strong>prac08b_flood_sentinel1.js</strong> (150 lines)</summary>

```javascript
/**** Prac 08b — Flood mapping with Sentinel-1 SAR: Victoria River, Kalkarindji (NT), Feb–Mar 2023
 * A monsoonal low brought 200–300 mm in a week; Kalkarindji, Daguragu and Pigeon Hole were evacuated (~1 March 2023).
 * Method: change detection on VV backscatter between a dry reference and the flood period.
 * Units: statistics in linear σ⁰; dB for display only (see the SAR units convention below).
 *
 * WHAT THIS SCRIPT DOES:
 *   Maps the extent of the February–March 2023 Victoria River flood around Kalkarindji using Sentinel-1 radar,
 *   which sees through cloud. Calm open water reflects the radar pulse away from the sensor, so flooded ground
 *   turns dark. We flag pixels that became much darker than a late-dry reference AND are now water-dark,
 *   remove permanent water and steep slopes, and report the flooded area.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) Optional EDIT lines: aoi, BEFORE and AFTER (section 1), SMOOTH, DIFF_T_DB and WATER_T_DB (section 3).
 *   (3) Click Run.
 *   (4) Read the Console (right panel) for acquisition dates, image counts, flooded area and the VV chart;
 *       turn layers on/off in the Map's Layers list; start the exports in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   - Map: Kalkarindji marker, VV before and during the flood (dB), VV change (dB), JRC permanent water, flood extent.
 *   - Console: flood-period acquisition dates, pass and relative orbit; number of before/after images;
 *     flooded area (km²); a chart of mean VV (dB) near Kalkarindji from Oct 2022 to Jun 2023 showing the flood pulse.
 *
 * DATA:
 *   - Sentinel-1 C-band SAR GRD, COPERNICUS/S1_GRD_FLOAT, IW mode, VV and VH, 10 m, Oct 2022 – Jun 2023 used (linear σ⁰).
 *   - JRC Global Surface Water v1.4, JRC/GSW1_4/GlobalSurfaceWater, 30 m, 1984–2021 (seasonality band).
 *   - NASADEM elevation, NASA/NASADEM_HGT/001, 30 m (≈ year 2000), used for slope.
 *
 * LINKS: pracs/prac08-sar-and-water-surface-water-sentinel-1-flood-mapping-wetlands-and-mangroves.md
 *   (course repository). Feeds Prac 08 and AT4 Part 4; also supports AT4 elective (c).
 *
 * KEY GEE IDEAS:
 *   - SAR units: load linear σ⁰ (S1_GRD_FLOAT), do all maths in linear units, convert to dB only for display.
 *   - Filtering a collection by metadata (instrument mode, polarisation, relative orbit) with ee.Filter.
 *   - Client-side vs server-side: dbToLin() is plain JavaScript (Math.pow) on numbers; toDb() works on ee.Image.
 *   - Neighbourhood operations (focalMean, connectedPixelCount) and reduceRegion for area; exports.
 *
 * Q = core (ENV306 and ENV506). EXT = ENV506 extension.
 ****/

// ---------- 1 Study area & dates ----------
// The AOI covers the Victoria River floodplain around Kalkarindji. BEFORE is a dry reference with no flooding;
// AFTER covers the flood peak.
var aoi = ee.Geometry.Rectangle([130.40, -17.80, 131.20, -17.00]);   // [west, south, east, north] in degrees
var BEFORE = ['2022-10-01', '2022-11-30'];   // late dry season reference
var AFTER  = ['2023-02-25', '2023-03-15'];   // flood period: inspect individual dates below
Map.centerObject(aoi, 10);
Map.addLayer(ee.Geometry.Point([130.83, -17.43]), {color: 'red'}, 'Kalkarindji (approx.)');

// ---------- SAR units convention (ENV306/506) ----------
// COPERNICUS/S1_GRD_FLOAT stores backscatter (σ⁰) as LINEAR power (its twin, COPERNICUS/S1_GRD, stores the same
// values in dB). So the data arrive in linear units: averages, medians of composites, ratios, filters, thresholds and
// all statistics are computed in LINEAR power units; dB is used ONLY for display (map layers, chart axes).
// Thresholds quoted in dB in the literature are converted to linear with dbToLin().
// Why: dB is a logarithm. Averaging logarithms is not the same as averaging power (it biases the mean low),
// and a ratio in linear units is a difference in dB. So: do the maths in linear units, and convert to dB only to look.
function toDb(img) { return ee.Image(img).log10().multiply(10); }                                                    // display only
function dbToLin(x) { return Math.pow(10, x / 10); }   // client-side: converts one dB NUMBER (not an image) to linear

// ---------- 2 Data ----------
// All Sentinel-1 images over the AOI in Interferometric Wide (IW) swath mode that include VV polarisation.
var s1 = ee.ImageCollection('COPERNICUS/S1_GRD_FLOAT')
  .filterBounds(aoi)
  .filter(ee.Filter.eq('instrumentMode', 'IW'))                                  // standard mode over land
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))       // image must have a VV band
  .select(['VV', 'VH']);   // VV = vertical send/receive (best for open water); VH = cross-polarised
// The collection is already in linear σ⁰ (S1_GRD_FLOAT), so no dB-to-linear conversion is needed.

var afterCol = s1.filterDate(AFTER[0], AFTER[1]);
// Print the date, pass (ASCENDING/DESCENDING) and relative orbit of every flood-period image.
// aggregate_array collects one property from all images into a list.
print('Flood-period acquisitions (date, pass, relative orbit)',
  afterCol.aggregate_array('system:time_start').map(function(t) { return ee.Date(t).format('YYYY-MM-dd'); }),
  afterCol.aggregate_array('orbitProperties_pass'), afterCol.aggregate_array('relativeOrbitNumber_start'));
// Same orbit for before & after avoids look-angle differences
// We take the orbit of the first flood image and keep only that orbit in both periods.
var orbit = ee.Number(afterCol.first().get('relativeOrbitNumber_start'));
var beforeCol = s1.filterDate(BEFORE[0], BEFORE[1]).filter(ee.Filter.eq('relativeOrbitNumber_start', orbit));
afterCol = afterCol.filter(ee.Filter.eq('relativeOrbitNumber_start', orbit));
print('Images used: before / after', beforeCol.size(), afterCol.size());

// ---------- 3 Processing ----------
// Build smoothed before and after VV images (linear σ⁰), take their ratio, then apply two thresholds:
// a big drop in backscatter AND a dark (water-like) after value.
var SMOOTH = 50;   // metres; boxcar (mean) speckle filter, applied in linear units
// Speckle = grainy noise in all SAR images. focalMean averages within a 50 m circle to reduce it.
var before = beforeCol.select('VV').mean().focalMean(SMOOTH, 'circle', 'meters').clip(aoi);   // mean of linear σ⁰
var after = afterCol.select('VV').min().focalMean(SMOOTH, 'circle', 'meters').clip(aoi);  // min = most water seen
var ratio = after.divide(before).rename('ratioVV');   // linear ratio (water darkens → ratio < 1)

// Both thresholds are written in dB (as in the literature) and converted to linear by dbToLin() before use.
// They are starting values — test others (see the Q on DIFF_T_DB below).
var DIFF_T_DB = -3;    // a 3 dB drop ...
var WATER_T_DB = -16;  // ... to calm open water, typically darker than −16 dB in VV
var flood = ratio.lt(dbToLin(DIFF_T_DB)).and(after.lt(dbToLin(WATER_T_DB)));   // compared in linear: 0.50 and 0.025

// Refinement masks
// Remove water that is always there (not flood) and steep ground (radar shadow there also looks dark).
var gsw = ee.Image('JRC/GSW1_4/GlobalSurfaceWater');
var permanent = gsw.select('seasonality').gte(10).unmask(0);   // water ≥ 10 months/year = permanent; unmask: no-data → 0
var slope = ee.Terrain.slope(ee.Image('NASA/NASADEM_HGT/001').select('elevation'));   // slope in degrees
flood = flood.and(permanent.not()).and(slope.lt(5));   // 5° is a starting value — floods sit on flat ground
// Remove speckle-sized specks: keep groups of ≥ 8 connected pixels (counting up to 25; true = 8-neighbour connection).
flood = flood.updateMask(flood.connectedPixelCount(25, true).gte(8)).selfMask().rename('flood');

// ---------- 4 Analysis ----------
// Flooded area: pixel area (m² ÷ 1e6 = km²) summed over flood pixels. scale 10 = Sentinel-1 GRD pixel size;
// maxPixels lifts the pixel limit; tileScale 4 uses smaller tiles to avoid memory errors.
var floodKm2 = ee.Image.pixelArea().divide(1e6).updateMask(flood)
  .reduceRegion({reducer: ee.Reducer.sum(), geometry: aoi, scale: 10, maxPixels: 1e11, tileScale: 4});
print('Flooded area (km²)', floodKm2);   // printed as {area: km²}

// Time series of mean VV over a floodplain point — shows the flood pulse
// A 1 km buffer around a floodplain point; each image's mean VV is computed in LINEAR units, then converted to dB.
var probe = ee.Geometry.Point([130.83, -17.45]).buffer(1000);
var pulse = s1.filterDate('2022-10-01', '2023-06-30').select('VV').map(function(img) {
  var meanLin = ee.Number(img.reduceRegion(ee.Reducer.mean(), probe, 10).get('VV'));   // mean in linear units
  return ee.Feature(null, {date: img.date().millis(), VV_dB: meanLin.log10().multiply(10)}); // converted for display
});
// Look for a sharp dip in VV (flooding) around late Feb–early Mar 2023. Note: all orbits are included here.
print(ui.Chart.feature.byFeature(pulse, 'date', 'VV_dB')
  .setOptions({title: 'Mean VV near Kalkarindji (mean of linear σ⁰, shown in dB)', pointSize: 3, hAxis: {format: 'MMM yyyy'}}));

// ---------- 5 Visualise ----------
// Display only: linear σ⁰ is converted to dB with toDb() so the contrast is easy to see. Dark = water/smooth surface.
Map.addLayer(toDb(before), {min: -25, max: 0}, 'VV before (dB)');
Map.addLayer(toDb(after), {min: -25, max: 0}, 'VV flood period (dB)');
// Blue = darker during the flood (likely new water), red = brighter (e.g. flooded woodland or towns, see the Q below).
Map.addLayer(toDb(ratio), {min: -8, max: 8, palette: ['#08519c', '#ffffff', '#a50f15']}, 'VV change, 10·log10(after/before) (dB)', false);
Map.addLayer(permanent.selfMask(), {palette: '#000080'}, 'JRC permanent water', false);
Map.addLayer(flood, {palette: '#00ffff'}, 'Flood extent');

// ---------- 6 Export ----------
// Flood map as a GeoTIFF (toByte = 1 byte per pixel, small file); scale 10 m;
// crs EPSG:32752 = WGS 84 / UTM zone 52S (metres; Kalkarindji is at ~130.8° E); maxPixels lifts the pixel limit.
// The flooded-area number is also exported as a one-row CSV. Start both in the Tasks tab.
Export.image.toDrive({image: flood.toByte(), description: 'Prac08b_flood_Kalkarindji_2023', folder: 'GEE_NT',
  region: aoi, scale: 10, crs: 'EPSG:32752', maxPixels: 1e11});
Export.table.toDrive({collection: ee.FeatureCollection([ee.Feature(null, floodKm2)]),
  description: 'Prac08b_flood_area', folder: 'GEE_NT'});

// Q: Why is SAR suited to wet-season flood mapping in the NT?
// Q: Why must the before and after images come from the same relative orbit?
// Q: Change DIFF_T_DB to -2 and -5 dB. How does the flooded area respond?
// Q: Why average σ⁰ in linear units? Average −10 dB and −20 dB in dB and in linear, then convert back: which is physically right?
// Q: Why are flooded woodlands and towns often missed (or appear brighter, not darker)?
// EXT: Replace fixed thresholds with Otsu or a bimodal split (Bmax Otsu) on the log-ratio image (Otsu on the histogram of
//      10·log10(ratio) is fine: the threshold is then converted back to linear before it is applied).
// EXT: Add HAND (height above nearest drainage, e.g. MERIT Hydro 'MERIT/Hydro/v1_0_1' band 'hnd') to remove false positives on high ground.
// EXT: Validate with a Sentinel-2 or Planet image (if cloud-free) or news/emergency-service reports; compute agreement.
```

</details>

<details>
<summary><strong>prac08c_mangrove_dynamics.js</strong> (146 lines)</summary>

```javascript
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
```

</details>

---

[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 07](prac07-fire-regime-burn-severity-frequency-and-seasonality.md) · [Prac 09 →](prac09-crocodile-biomass-modelling-with-sar-floodplain-inundation.md)
