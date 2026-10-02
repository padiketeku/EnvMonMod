[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 08](prac08-sar-and-water-surface-water-sentinel-1-flood-mapping-wetlands-and-mangroves.md) · [Prac 10 →](prac10-urban-sprawl-detection-with-sentinel-1.md)

# Prac 09: Crocodile biomass modelling with SAR floodplain inundation

**When:** Mon 9 Nov 2026, Session 3; group posters Session 4, presented Tue 10 Nov, Session 1 · **Script:** [`prac09_crocodile_biomass.js`](../scripts/prac09_crocodile_biomass.js) · **ULOs:** 1, 2, 3, 4

**Also available in:** Python [`prac09_crocodile_biomass.py`](../alternatives/python/prac09_crocodile_biomass.py) · R [`prac09_crocodile_biomass.R`](../alternatives/r/prac09_crocodile_biomass.R) · QGIS [recipe](../alternatives/qgis/README.md). The Code Editor remains the main environment.

**Purpose.** Test whether wet-season floodplain inundation explains crocodile biomass, using 42 river-year survey records from eight NT tidal rivers.

**Acknowledgements:** Google Earth Engine developers and team; UN-SPIDER ([Recommended Practice: flood mapping with Sentinel-1 in GEE](https://un-spider.org/advisory-support/recommended-practices/recommended-practice-google-earth-engine-flood-mapping/step-by-step)), whose scripts were adapted for this prac; Tim Palmer (methodology and original GEE code); Cameron Baker (crocodile data).

## 1. Concept notes

### 1.1 SAR recap

This prac applies the Sentinel-1 flood-mapping concepts from **Prac 08**: specular reflection from calm water (dark), double-bounce from flooded vegetation (bright), the VH polarisation, a single orbit pass, speckle filtering, and ratio change detection. Revise the SAR fundamentals table in Prac 08 before starting.

### 1.2 Crocodiles, floodplains and landscape ecology

Until protection in 1971, estuarine crocodiles in the NT were declining because of over-exploitation and habitat loss. Numbers and biomass in tidal rivers have since increased greatly (Fukuda et al., 2011), but **rivers differ in carrying capacity** for reasons not fully understood. Floodplains provide habitat for growth and reproduction, and floodplain swamp vegetation is key nesting habitat (Fukuda & Cuff, 2013). The extent and duration of wet-season inundation may therefore explain differences in crocodile biomass **between rivers** and **between years**.

**Hypothesis:** crocodile biomass per km of river increases with the area of floodplain inundated in the wet season before the dry-season survey.

```math
B_{r,t}=\beta_0+\beta_1F_{r,t}\;(+\,u_r)+\varepsilon_{r,t}\qquad F_{r,t}=\text{floodplain inundation for river } r \text{ in the wet season before survey year } t
```

Here u\_r is a river-specific effect (ENV506), which captures each river's unmeasured carrying capacity.

### 1.3 Data you will upload

1. **`croc-biomass-data.csv`** (download from **Learnline**; restricted data, not to be shared or posted publicly, including in AT submissions' public repositories): 42 dry-season spotlight-survey records for eight NT tidal rivers, 2009–2022. Records per river: Adelaide 14, Mary 7, Daly 6, and 3–4 each for Liverpool, Tomkinson, Blyth, Cadell and Glyde.
2. **`flooded_areas_shapefiles.zip`** (download from **Learnline**; restricted): flooded-area polygons for the six river systems, namely Adelaide, Mary, Daly, Glyde, Liverpool (also used for the Tomkinson) and Blyth (also used for the Cadell). Each river's **floodplain zone** is the convex hull of its polygons. Zone sizes are about 3,400 km² (Adelaide), 3,000 (Daly), 2,000 (Mary and Glyde), 1,300 (Blyth/Cadell) and 600 (Liverpool/Tomkinson).

| CSV column | Meaning |
| --- | --- |
| `River` | Adelaide, Mary, Daly, Liverpool, Tomkinson, Blyth, Cadell, Glyde |
| `Year` | Survey year |
| `Distance_surveyed` | River length surveyed (km) |
| `Crocodiles_seen` | Non-hatchling crocodiles sighted |
| `Total_biomass` | Estimated total biomass (kg) |
| `Abundance` | Relative density (crocodiles per km, as supplied) |
| `Biomass_km` | Biomass per km of river (kg/km): **the response variable** |

Two floodplain metrics are computed for each river-year:

- **JRC seasonal water** (Landsat-based, optical, 1984–2021): the area of seasonal water within each river's floodplain zone.
- **Sentinel-1 peak inundation** (SAR, from 2016): the darkest VH from January–April of the survey year against a September–October baseline, using the Part A method.

## 2. Practical activities

**Activity 9.0 – Upload the data yourself (20 min).** Download `croc-biomass-data.csv` and `flooded_areas_shapefiles.zip` from Learnline, and unzip the shapefiles. In the Code Editor, open **Assets → NEW**:

- **CSV file (.csv)** → `croc-biomass-data.csv`. It has no coordinates, so leave the geometry columns blank.
- **Shape files** → each of the six rivers in turn (`flooded_Adelaide_river`, `flooded_Mary_river`, `flooded_Daly_river`, `flooded_Glyde_river`, `flooded_Liverpool_river`, `flooded_Blyth_river`). Select all parts of each one: `.shp`, `.shx`, `.dbf`, `.prj` and `.cpg`.

Wait for the seven ingestion tasks in the **Tasks** tab, then edit `ROOT` (your asset folder). Print the table and check the 42 records and that `Year` is numeric. These are restricted data: keep your assets private, and share them only with markers.

**Part A – Sentinel-1 flood-mapping workflow (Adelaide River, August 2017).**

1. Filter Sentinel-1 to IW mode, the DESCENDING pass, 10 m resolution and the VH band. Use the convex hull of the Adelaide flooded-area polygons as the region.
2. Mosaic the baseline (July 2017) and August images, and inspect them at −25 to −10 dB.
3. Convert to linear σ⁰ and apply a 3 × 3 boxcar filter.
4. Flag pixels that darken by at least 3 dB: linear after ÷ before < 0.50. A ratio of dB values is not a ratio of backscatter, so always divide linear values.
5. Remove permanent water (JRC seasonality ≥ 10 months) and isolated pixels (< 8 connected), then keep low slopes (DEM-H ≤ 5°).
6. Calculate the flooded area, and record it for your group poster.

**Part B – Eight rivers, 2009–2022.**

1. **B1 – Floodplain zones.** Display each river's flooded-area polygons and its convex-hull zone, and print the zone areas. Liverpool/Tomkinson and Blyth/Cadell share a zone; discuss what that means for the analysis.
2. **B2 – Build the river × year table.** Add the JRC and Sentinel-1 metrics to every record, print the table, and export it to Drive.
3. **B3 – Explore and model.**
   1. Plot biomass per km against seasonal floodplain water, coloured by river, and plot the Adelaide time series.
   2. Fit the pooled linear model (all rivers), then the Adelaide-only model.
   3. Report the slope, intercept, Pearson's r, p and n for each.
4. **B4 – Optical vs SAR.** Compare the JRC and Sentinel-1 metrics for the years that have both.

**Group poster (Sessions 3–4, presented Tue 10 Nov).** Each group tests one factor:

- **A:** floodplain zone design (convex hull vs the flooded polygons themselves vs a 1 km buffer around them).
- **B:** JRC vs Sentinel-1 as the predictor.
- **C:** between-river vs within-river relationships (pooled vs Adelaide-only vs river effects).
- **D:** lags (inundation 1–2 wet seasons before the survey).

**Key code** (an excerpt from [`prac09_crocodile_biomass.js`](../scripts/prac09_crocodile_biomass.js); run the full script for the complete workflow):

```javascript
// Floodplain inundation for one river-year: darkest wet-season VH vs a dry-season baseline (linear units)
// (s1 is a linear-σ⁰ VH collection; zone is the river's convex-hull floodplain zone; permanent and slope as in the script)
function floodMap(before, after) {
  var b = before.focalMean({radius: 1, kernelType: 'square', units: 'pixels'});   // 3 × 3 boxcar
  var a = after.focalMean({radius: 1, kernelType: 'square', units: 'pixels'});
  var flood = a.divide(b).lt(Math.pow(10, -3 / 10)).where(permanent, 0).selfMask();  // ≥ 3 dB darker
  flood = flood.updateMask(flood.connectedPixelCount(9, true).gte(8));
  return flood.updateMask(slope.lte(5));
}
var inundated = floodMap(s1.filterDate('2018-09-01', '2018-11-01').median(),
                         s1.filterDate('2019-01-01', '2019-05-01').min());
var ha = ee.Image.pixelArea().divide(1e4).updateMask(inundated)
  .reduceRegion({reducer: ee.Reducer.sum(), geometry: zone, scale: 30, maxPixels: 1e11, tileScale: 8});
print('Peak inundation 2019 (ha)', ha);
```

## 3. Challenge questions (knowledge check)

**Core**

1. Why is Sentinel-1 needed for wet-season floodplain mapping? Why use VH, one orbit pass, a boxcar filter, and a ratio rather than a difference?
2. Why is `Biomass_km` a better response than `Total_biomass`?
3. Why does zone design matter (the modifiable areal unit problem)? Should inundation be expressed in hectares or as a share of the zone?
4. Is biomass per km related to floodplain inundation across rivers? Within the Adelaide over time? Are the answers the same?
5. Why might the optical (JRC) and SAR (Sentinel-1) metrics disagree in the wet season?

**Extension (ENV506)**

1. Rivers differ in carrying capacity. Fit models with river fixed effects and with river random intercepts (Python or R versions), and explain how the floodplain effect changes. Relate this to the ecological fallacy (between-river vs within-river inference).
2. Test lags. Recruitment and growth to surveyable size take years, so which lag fits best, and is it ecologically plausible?
3. Compare convex-hull zones with the flooded polygons themselves (or a buffer around them), and quantify the sensitivity of the coefficients.
4. Add habitat composition (mangrove and paperbark-swamp extent from Prac 04 or Prac 08) as predictors, and discuss collinearity with floodplain area.
5. With n = 42 records across 8 rivers, unbalanced years and autocorrelation, what can and cannot be concluded? Recommend a monitoring design for the NT Government.

## 4. Link to summative assessment

- **AT4 elective (c), crocodile biomass:** a within-river analysis of your focal river system (from `prac00`), set within the multi-river model.
    - **ENV306:** pooled and focal-river models.
    - **ENV506:** river effects, lags, a zone-design sensitivity test, and an optical vs SAR comparison.
- The poster Q&A is practice for the AT4 viva.

## 5. Reading

- UN-SPIDER. *Recommended Practice: Flood mapping and damage assessment using Sentinel-1 SAR data in Google Earth Engine*. https://un-spider.org/advisory-support/recommended-practices/recommended-practice-google-earth-engine-flood-mapping/step-by-step
- Flores-Anderson, A. I., Herndon, K. E., Thapa, R. B., & Cherrington, E. (Eds.). (2019). *The SAR handbook*. NASA SERVIR. https://doi.org/10.25966/nr2c-s697
- Pekel, J.-F., Cottam, A., Gorelick, N., & Belward, A. S. (2016). High-resolution mapping of global surface water and its long-term changes. *Nature, 540*, 418–422. https://doi.org/10.1038/nature20584
- Fukuda, Y., et al. (2011). Recovery of saltwater crocodiles following unregulated hunting in tidal rivers of the Northern Territory, Australia. *Journal of Wildlife Management, 75*(6), 1253–1266. https://doi.org/10.1002/jwmg.191
- Fukuda, Y., & Cuff, N. (2013). Vegetation communities as nesting habitat for the saltwater crocodile in the Northern Territory of Australia. *Herpetological Conservation and Biology, 8*(3). https://www.herpconbio.org/Volume\_8/Issue\_3/Fukuda\_Cuff\_2013.pdf
- Fukuda, Y., Saalfeld, K., et al. (2013). Standardised method of spotlight surveys for crocodiles in the tidal rivers of the Northern Territory, Australia. *Northern Territory Naturalist, 24*, 14–32. https://ntfieldnaturalists.org.au/site/assets/files/1331/ntn24\_14-32\_fukuda\_et\_al\_crocodile\_survey\_methods.pdf
- Crabbe, R. (2024). *Habitat mapping and crocodile biomass, Northern Territory, Australia* \[Data set\]. Zenodo. https://doi.org/10.5281/zenodo.13910706

## Full scripts

Each script is copied here from [`scripts/`](../scripts) so this page has everything in one place. The `.js` file is the master copy: if the two ever differ, use the file. Click a heading to open the script, then use the copy button and paste it into a new script in the Code Editor.

<details>
<summary><strong>prac09_crocodile_biomass.js</strong> (286 lines)</summary>

```javascript
/**** Prac 09 — Crocodile biomass modelling with SAR floodplain inundation (eight NT tidal rivers, 2009–2022)
 * ENV306/506 Environmental Monitoring and Modelling (2026)
 * Question: does wet-season floodplain inundation explain crocodile biomass per km of river,
 *           between rivers and between years?
 * Part A: Sentinel-1 flood-mapping workflow (Adelaide River, August 2017) — after UN-SPIDER.
 * Units: SAR statistics in linear σ⁰; dB for display only (see the SAR units convention below).
 * Part B: floodplain metrics (JRC optical, Sentinel-1 SAR) for every river × survey-year record → regression.
 *
 * !!! RESTRICTED DATA — READ THIS FIRST !!!
 *   The crocodile survey table and flooded-area shapefiles are NOT public. Download them from Learnline only.
 *   Do NOT share them, post them publicly, make your assets public, or commit them to GitHub.
 *   This script will not run until you have uploaded them as YOUR OWN assets and edited ROOT (section 0).
 *
 * DATA (restricted — download from Learnline; do NOT post publicly or commit to GitHub):
 *   croc-biomass-data.csv            River, Year, Distance_surveyed, Crocodiles_seen, Total_biomass, Abundance, Biomass_km
 *   flooded_areas_shapefiles.zip     flooded_<River>_river polygons for Adelaide, Mary, Daly, Glyde, Liverpool, Blyth
 * Activity 9.0: upload the CSV (no geometry columns) and the six shapefiles as assets, then edit ROOT.
 *
 * WHAT THIS SCRIPT DOES:
 *   Tests whether rivers (and years) with more wet-season floodplain inundation carry more crocodile biomass per km.
 *   Part A maps one flood (Adelaide River, Aug 2017) with a Sentinel-1 before/after ratio. Part B measures flooded
 *   area for every river × survey year (JRC optical and Sentinel-1 SAR) and regresses Biomass_km on it.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) Upload the restricted data and EDIT ROOT (section 0), step by step:
 *       a. Download croc-biomass-data.csv and flooded_areas_shapefiles.zip from Learnline. Unzip the shapefiles.
 *       b. In the Code Editor, open the Assets tab (left panel) → NEW → "CSV file (.csv)". Choose the CSV and
 *          name the asset exactly  croc-biomass-data . Leave any geometry/lat-lon columns empty (it has none).
 *       c. NEW → "Shape files". Select ALL the files of one shapefile together (.shp, .shx, .dbf, .prj; or its .zip).
 *          Name it exactly as in FLOOD_ASSETS, e.g. flooded_Adelaide_river. Repeat for all six rivers.
 *       d. Watch the Tasks tab until every upload has finished (blue = done, red = failed — click to see why).
 *       e. Click one uploaded asset in the Assets tab. Copy its "Table ID", e.g. projects/my-project/assets/croc-biomass-data
 *       f. In ROOT, replace the text inside the quotes with everything up to and including "assets/" —
 *          e.g. 'projects/my-project/assets/'. Keep the trailing slash. If you put the assets in a sub-folder,
 *          include it too, e.g. 'projects/my-project/assets/prac09/'.
 *       g. Keep your assets private (do not change their sharing settings).
 *   (3) Click Run.
 *   (4) Read the Console (tables, charts and regression results), turn layers on/off in the Map's Layers list,
 *       and start the table export in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   Map (Part A): Adelaide flooded-area polygons and floodplain zone; VH before/after and change (dB, off);
 *   Flooded area Aug 2017 (blue). Part B: all floodplain zones (off).
 *   Console: Part A flooded area (ha); zone areas (km²); record count and property names; the river × year table;
 *   two charts (biomass vs JRC water by river; Adelaide biomass by year); regression slope/intercept and Pearson r, p;
 *   a JRC vs Sentinel-1 scatter chart.
 *
 * DATA (from the code):
 *   - Your uploaded assets: croc-biomass-data (table, 42 river × year records) and flooded_<River>_river polygons.
 *   - COPERNICUS/S1_GRD_FLOAT — linear σ⁰; Sentinel-1 C-band SAR, IW mode, 10 m, VH, descending pass (used 2016–2022; Part A 2017).
 *   - JRC/GSW1_4/GlobalSurfaceWater ('seasonality') and JRC/GSW1_4/YearlyHistory ('waterClass') — 30 m, 1984–2021.
 *   - AU/GA/DEM_1SEC/v10/DEM-H — Geoscience Australia hydrologically enforced DEM, 1 arc-second (~30 m).
 *
 * LINKS: pracs/prac09-crocodile-biomass-modelling-with-sar-floodplain-inundation.md
 *   Feeds Prac 09 and AT4 elective (c). Restricted data from Learnline.
 *
 * KEY GEE IDEAS:
 *   - Loading your own uploaded assets (FeatureCollection from an asset path).
 *   - map() over a FeatureCollection to add computed properties to every row (feature).
 *   - Server-side conditionals (ee.Algorithms.If) and null handling (Filter.notNull).
 *   - reduceRegion for areas, and reduceColumns (linearFit, pearsonsCorrelation) for statistics on a table.
 *
 * Acknowledgements: Google Earth Engine developers and team; UN-SPIDER Recommended Practice on Sentinel-1
 * flood mapping in GEE (adapted); Tim Palmer (methodology and original GEE code); Cameron Baker (crocodile data).
 * Q = core (ENV306 and ENV506).  EXT = ENV506 extension.
 ****/

// ---------- 0 Parameters: EDIT ROOT ----------
// The ONLY line you must edit is ROOT. Every asset path below is built as ROOT + asset name, so if ROOT is wrong
// you will see "Asset not found" or "not found" errors in the Console. See HOW TO USE IT step (2) above.
// EDIT ROOT: e.g. 'projects/my-project/assets/' — copy from your asset's ID, keep the trailing slash.
var ROOT = 'projects/YOUR_PROJECT/assets/';           // your asset folder (with trailing slash)
var CROC_ASSET = ROOT + 'croc-biomass-data';   // the uploaded CSV must have exactly this asset name
// River name → flooded-area asset. Names must match your uploaded asset names exactly (case-sensitive).
var FLOOD_ASSETS = {
  Adelaide:  ROOT + 'flooded_Adelaide_river',
  Mary:      ROOT + 'flooded_Mary_river',
  Daly:      ROOT + 'flooded_Daly_river',
  Liverpool: ROOT + 'flooded_Liverpool_river',
  Tomkinson: ROOT + 'flooded_Liverpool_river',   // Tomkinson shares the Liverpool floodplain zone
  Blyth:     ROOT + 'flooded_Blyth_river',
  Cadell:    ROOT + 'flooded_Blyth_river',       // Cadell shares the Blyth floodplain zone
  Glyde:     ROOT + 'flooded_Glyde_river'
};
var RIVERS = Object.keys(FLOOD_ASSETS);   // client-side list of the eight river names

// Sentinel-1 flood-mapping settings (Part A; reused in Part B)
// VH (cross-polarised) separates open water from vegetation well. Using one pass direction (descending) keeps
// the viewing geometry the same in before and after images, so changes reflect the ground, not the satellite.
var BAND = 'VH', PASS = 'DESCENDING', KERNEL = 3;   // boxcar window size in pixels (3 × 3)
var DROP_DB = 3;           // flood = VH darkens by at least 3 dB: linear after ÷ before < dbToLin(−3) = 0.50
// DROP_DB is a starting value — test others (Part A question).
var PERM_MONTHS = 10;      // JRC seasonality ≥ this = permanent water (removed)
var MAX_SLOPE = 5;         // degrees
// MAX_SLOPE: floods sit on flat ground; steeper pixels are removed (dark radar shadow on slopes can look like water).
var MIN_CONNECTED = 8;     // pixels
// MIN_CONNECTED: flood patches smaller than 8 connected pixels are treated as speckle noise and removed.

// Floodplain zone of each river = convex hull of its flooded-area polygons
// convexHull(100) wraps all the polygons in one outer boundary (100 = allowed error in metres).
// This builds a client-side JS object: river name → zone geometry.
var ZONES = {};
RIVERS.forEach(function(r) {
  ZONES[r] = ee.FeatureCollection(FLOOD_ASSETS[r]).geometry().convexHull(100);
});

var dem = ee.Image('AU/GA/DEM_1SEC/v10/DEM-H').select('elevation');   // elevation in metres, ~30 m pixels
var slope = ee.Terrain.slope(dem);   // slope in degrees, compared with MAX_SLOPE
// JRC 'seasonality' = number of months per year with water (0–12). ≥ 10 months = permanent water (rivers, lakes).
// We remove it so only NEW floodwater is counted. unmask(0) fills no-data with 0 (not permanent) so masks don't spread.
var permanent = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('seasonality').gte(PERM_MONTHS).unmask(0);
var haImg = ee.Image.pixelArea().divide(1e4);   // pixel area in m² ÷ 10,000 = hectares

// ---------- SAR units convention (ENV306/506) ----------
// COPERNICUS/S1_GRD_FLOAT stores backscatter (σ⁰) as LINEAR power (its twin, COPERNICUS/S1_GRD, stores the same
// values in dB). So the data arrive in linear units: averages, medians of composites, ratios, filters, thresholds and
// all statistics are computed in LINEAR power units; dB is used ONLY for display (map layers, chart axes).
// Thresholds quoted in dB in the literature are converted to linear with dbToLin().
// Why: dB is a log scale. The mean of dB values is not the dB of the mean power, so statistics in dB are biased.
// Rule of thumb: −3 dB ≈ half the power (×0.5); −10 dB = one tenth (×0.1).
function toDb(img) { return ee.Image(img).log10().multiply(10); }                                                    // display only
function dbToLin(x) { return Math.pow(10, x / 10); }   // client-side number conversion, e.g. dbToLin(-3) ≈ 0.50

// Sentinel-1 collection: each filter keeps only images that match, so every image is comparable.
var s1 = ee.ImageCollection('COPERNICUS/S1_GRD_FLOAT')
  .filter(ee.Filter.eq('instrumentMode', 'IW'))   // Interferometric Wide swath, the standard mode over land
  .filter(ee.Filter.eq('orbitProperties_pass', PASS))   // one pass direction only (see BAND/PASS above)
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', BAND))   // image must include VH
  .filter(ee.Filter.eq('resolution_meters', 10))   // 10 m pixels
  .select(BAND);
// The collection is already in linear σ⁰ (S1_GRD_FLOAT), so no dB-to-linear conversion is needed.

// Flood map from two linear-σ⁰ mosaics (UN-SPIDER workflow, linear-unit ratio)
// Steps: smooth speckle → ratio after/before → threshold → remove permanent water, tiny patches and slopes.
function floodMap(before, after) {
  // 3 × 3 boxcar mean on LINEAR σ⁰ to reduce speckle (averaging must be done in linear power)
  var r = (KERNEL - 1) / 2;   // radius 1 pixel either side of centre = a 3 × 3 window
  var b = before.focalMean({radius: r, kernelType: 'square', units: 'pixels'});
  var a = after.focalMean({radius: r, kernelType: 'square', units: 'pixels'});
  // Change ratio in linear units: open water is specular and dark, so after ÷ before falls well below 1.
  // (A ratio of dB values is not a ratio of backscatter, so always divide linear values.)
  var ratio = a.divide(b);
  var flood = ratio.lt(dbToLin(-DROP_DB))   // 1 where backscatter fell by at least DROP_DB dB
    .where(permanent, 0)   // set permanent water to 0 (not a flood)
    .selfMask();   // hide the 0s
  // connectedPixelCount(9, true) counts each patch's size (up to 9, 8-neighbour connection); keep patches ≥ 8 pixels.
  flood = flood.updateMask(flood.connectedPixelCount(MIN_CONNECTED + 1, true).gte(MIN_CONNECTED));
  flood = flood.updateMask(slope.lte(MAX_SLOPE));   // keep flat ground only
  return flood.rename('flood');
}
// areaHa(): total hectares of unmasked pixels in a region.
// scale = pixel size in metres for the sum (10 m in Part A; 30 m in Part B to keep many rivers × years fast).
// maxPixels raises the default cap; tileScale: 8 splits the job into smaller pieces to avoid memory errors.
function areaHa(maskImg, region, scale) {
  return ee.Number(haImg.updateMask(maskImg).reduceRegion({
    reducer: ee.Reducer.sum(), geometry: region, scale: scale, maxPixels: 1e11, tileScale: 8
  }).get('area'));   // pixelArea's band is named 'area'
}

// ======================= Part A — Adelaide River, August 2017 =======================
// One worked flood map: compare July (before) and August (after) 2017 on the Adelaide floodplain.
// Inspect each layer in turn to see how the ratio and the clean-up steps build the final flood map.
var adel = ZONES.Adelaide;
Map.centerObject(adel, 9);
// style() draws vectors: outline colour, and fill colour as hex RRGGBBAA (the last two digits are transparency).
Map.addLayer(ee.FeatureCollection(FLOOD_ASSETS.Adelaide).style({color: '#08519c', fillColor: '6baed655'}), {}, 'A: Adelaide flooded-area polygons');
Map.addLayer(ee.FeatureCollection([ee.Feature(adel)]).style({color: 'black', fillColor: '00000000'}), {}, 'A: Adelaide floodplain zone (convex hull)');

// filterBounds keeps scenes over the zone; filterDate keeps one month (end date is exclusive).
// mosaic() stitches that month's scenes into one image (the latest scene sits on top where they overlap).
var beforeA = s1.filterBounds(adel).filterDate('2017-07-01', '2017-07-31').mosaic().clip(adel);
var afterA  = s1.filterBounds(adel).filterDate('2017-08-01', '2017-08-31').mosaic().clip(adel);
// Display in dB (−25 to −10 dB): dark = smooth surfaces such as open water. Data stay linear for the analysis.
Map.addLayer(toDb(beforeA), {min: -25, max: -10}, 'A: VH before (Jul 2017, dB)', false);
Map.addLayer(toDb(afterA),  {min: -25, max: -10}, 'A: VH after (Aug 2017, dB)', false);
// Change in dB = 10·log10 of the linear ratio. Blue = darker after (possible new water), red = brighter after.
Map.addLayer(toDb(afterA.divide(beforeA)), {min: -8, max: 8, palette: ['#08519c', '#ffffff', '#a50f15']}, 'A: VH change 10·log10(after/before) (dB)', false);
var floodA = floodMap(beforeA, afterA).clip(adel);
Map.addLayer(floodA, {palette: '#2171b5'}, 'A: Flooded area Aug 2017');
print('A: Flooded area, Adelaide Aug 2017 (ha)', areaHa(floodA, adel, 10));   // 10 m = Sentinel-1 pixel size
// Q: Some published scripts divide dB values and test > 1.25. Show with before = −15 dB that this equals a 3.75 dB drop, but with
//    before = −10 dB only a 2.5 dB drop. Why is a ratio of linear σ⁰ (a fixed dB drop) the physically consistent choice?
// Q: Vary DROP_DB (2, 3, 4). How much does the flooded area change, and which other settings matter most?

// ======================= Part B — eight rivers, 2009–2022 =======================
// Repeat the measurement for every river × survey-year record, then test the inundation–biomass relationship.

// ---------- B1 Floodplain zones ----------
// Turn the zones into a FeatureCollection (one feature per river) and report each zone's area.
// area(100) returns m² (100 m allowed error); ÷ 1e6 = km².
var zoneFc = ee.FeatureCollection(RIVERS.map(function(r) {
  return ee.Feature(ZONES[r], {River: r, zone_km2: ZONES[r].area(100).divide(1e6)});
}));
// select(..., null, false) prints only these properties and drops the geometry, so the Console table is easy to read.
print('B1: Floodplain zones (km²) — note shared zones', zoneFc.select(['River', 'zone_km2'], null, false));
Map.addLayer(zoneFc.style({color: 'black', fillColor: '00000000', width: 1}), {}, 'B1: All floodplain zones', false);

// ---------- B2 Survey table + floodplain metrics ----------
// Load your uploaded survey table and add two inundation metrics to every row:
// JRC seasonal water (optical) and Sentinel-1 peak inundation (SAR, linear σ⁰).
var croc = ee.FeatureCollection(CROC_ASSET);   // fails here if ROOT or the asset name is wrong
// If ingestion kept a byte-order mark, the first column may be named '﻿River'. Check the printed property names.
print('B2: Croc records (expect 42)', croc.size(), 'properties', croc.first().propertyNames());

// Copy the client-side ZONES object into a server-side ee.Dictionary so it can be looked up inside map() below.
var zoneDict = ee.Dictionary(RIVERS.reduce(function(d, r) { d[r] = ZONES[r]; return d; }, {}));
var jrcYearly = ee.ImageCollection('JRC/GSW1_4/YearlyHistory');   // waterClass: 1 not water, 2 seasonal, 3 permanent

// addMetrics(): runs on the server for each survey record f (one river in one year) and returns it with new properties.
function addMetrics(f) {
  var river = ee.String(f.get('River'));
  // Make Year a whole number however it was ingested (e.g. 2017 or 2017.0): format as text, then parse back.
  var year = ee.Number.parse(ee.String(ee.Number(f.get('Year')).format('%d'))).int();
  var zone = ee.Geometry(zoneDict.get(river));   // this river's floodplain zone

  // JRC seasonal water (optical, 1984–2021) for the calendar year of the survey
  var jy = year.min(2021);   // JRC ends in 2021; cap the year so the image lookup always finds an image
  var jImg = jrcYearly.filter(ee.Filter.calendarRange(jy, jy, 'year')).first();
  // ee.Algorithms.If is a server-side if/else: surveys after 2021 get null (no JRC data), others get seasonal water (ha).
  var jrcHa = ee.Algorithms.If(year.gt(2021), null,
    areaHa(ee.Image(jImg).select('waterClass').eq(2), zone, 30));   // class 2 = seasonal water; 30 m = JRC pixels

  // Sentinel-1 peak inundation: darkest VH Jan–Apr of the survey year vs Sep–Oct baseline of the previous year
  var ys = year.max(2016);   // this workflow uses Sentinel-1 from 2016 on; earlier years get null below
  // Baseline: Sep–Oct of the previous year (late dry season, floodplain driest). End date (1 Nov) is exclusive.
  var base = s1.filterBounds(zone).filterDate(ee.Date.fromYMD(ys.subtract(1), 9, 1), ee.Date.fromYMD(ys.subtract(1), 11, 1));
  // Wet season: Jan–Apr of the survey year. End date (1 May) is exclusive.
  var wet  = s1.filterBounds(zone).filterDate(ee.Date.fromYMD(ys, 1, 1), ee.Date.fromYMD(ys, 5, 1));
  // Null if before 2016 or if either period has no images. Otherwise compare the baseline median (typical dry state)
  // with the per-pixel minimum of the wet season (darkest = most flooded moment). Both are in linear σ⁰.
  var s1Ha = ee.Algorithms.If(year.lt(2016), null,
    ee.Algorithms.If(base.size().eq(0).or(wet.size().eq(0)), null,
      areaHa(floodMap(base.median(), wet.min()), zone, 30)));   // 30 m keeps 42 records × large zones fast

  return f.set({Year: year, zone_km2: zone.area(100).divide(1e6),
                jrc_seasonal_ha: jrcHa, s1_peak_ha: s1Ha});
}
var table = croc.map(addMetrics);   // map() applies addMetrics to every record
print('B2: River × year table with floodplain metrics', table);
// Export the table as CSV to Google Drive (start it in the Tasks tab). selectors = the columns to keep, in order.
// The exported CSV contains restricted survey data — keep it private, like the original.
Export.table.toDrive({collection: table, description: 'Prac09_croc_floodplain_table', folder: 'GEE_NT',
  selectors: ['River', 'Year', 'Distance_surveyed', 'Crocodiles_seen', 'Total_biomass', 'Abundance', 'Biomass_km',
              'zone_km2', 'jrc_seasonal_ha', 's1_peak_ha']});

// ---------- B3 Explore and model ----------
// Plot biomass per km against inundation, then fit simple linear regressions (pooled and Adelaide only).
// Drop records with no metric (null) first, otherwise charts and reducers fail or mislead.
var jrcOk = table.filter(ee.Filter.notNull(['jrc_seasonal_ha']));
var s1Ok = table.filter(ee.Filter.notNull(['s1_peak_ha']));
// groups(): one coloured series per River, so you can see between-river and within-river patterns.
print(ui.Chart.feature.groups(jrcOk, 'jrc_seasonal_ha', 'Biomass_km', 'River').setChartType('ScatterChart')
  .setOptions({title: 'Biomass per km vs JRC seasonal floodplain water (by river)', pointSize: 5,
               hAxis: {title: 'Seasonal water in zone (ha)'}, vAxis: {title: 'Biomass (kg/km)'}}));
print(ui.Chart.feature.byFeature(table.filter(ee.Filter.eq('River', 'Adelaide')).sort('Year'), 'Year', ['Biomass_km'])
  .setOptions({title: 'Adelaide River: biomass per km by survey year', pointSize: 4}));

// regress(): least-squares fit of Biomass_km on one inundation metric, plus Pearson correlation.
// linearFit returns 'scale' (slope, kg/km per ha) and 'offset' (intercept). pearsonsCorrelation returns r and p-value.
function regress(fc, xName, label) {
  var fit = fc.reduceColumns(ee.Reducer.linearFit(), [xName, 'Biomass_km']);   // [x, y] column order matters
  var cor = fc.reduceColumns(ee.Reducer.pearsonsCorrelation(), [xName, 'Biomass_km']);
  print(label + ' (n = ', fc.size(), ') slope, intercept:', fit, 'Pearson r and two-sided p:', cor);
}
regress(jrcOk, 'jrc_seasonal_ha', 'B3: All rivers, JRC');
regress(s1Ok, 's1_peak_ha', 'B3: All rivers, Sentinel-1');
regress(jrcOk.filter(ee.Filter.eq('River', 'Adelaide')), 'jrc_seasonal_ha', 'B3: Adelaide only, JRC');

// ---------- B4 Optical vs SAR ----------
// Compare the two inundation metrics where both exist (2016–2021). Points far from the trendline show disagreement.
var both = table.filter(ee.Filter.notNull(['jrc_seasonal_ha', 's1_peak_ha']));
print(ui.Chart.feature.byFeature(both, 'jrc_seasonal_ha', 's1_peak_ha').setChartType('ScatterChart')
  .setOptions({title: 'JRC seasonal water vs Sentinel-1 peak inundation (2016–2021)', pointSize: 5, trendlines: {0: {}},
               hAxis: {title: 'JRC (ha)'}, vAxis: {title: 'Sentinel-1 (ha)'}}));

// Q: Why is Sentinel-1 needed in the wet season? Why VH, one pass, a boxcar filter, and a ratio rather than a difference?
// Q: Why is Biomass_km a better response than Total_biomass?
// Q: Is the relationship the same between rivers (pooled) and within the Adelaide over time? Why might they differ?
// Q: Liverpool/Tomkinson and Blyth/Cadell share a zone. What does that do to the independence of the records?
// Q: Why might JRC (optical) and Sentinel-1 (SAR) disagree in the wet season?
// Hint: think about cloud cover, water under vegetation canopy, and wind-roughened water surfaces.
// EXT: Export the table and fit river fixed effects and river random intercepts (Python/R versions). How does the slope change?
// EXT: Test lags of 1–2 wet seasons (shift the year used for the metrics). Which lag fits best, and is it plausible?
// EXT: Replace the convex-hull zone with the flooded polygons themselves and with a 1 km buffer; quantify coefficient sensitivity.
// EXT: Express inundation as a share of zone area (ha / zone_km2) and compare. Which is defensible, and why (MAUP)?
```

</details>

---

[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 08](prac08-sar-and-water-surface-water-sentinel-1-flood-mapping-wetlands-and-mangroves.md) · [Prac 10 →](prac10-urban-sprawl-detection-with-sentinel-1.md)
