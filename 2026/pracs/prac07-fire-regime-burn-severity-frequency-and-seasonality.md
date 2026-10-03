[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 06](prac06-monitoring-land-clearing.md) · [Prac 08 →](prac08-sar-and-water-surface-water-sentinel-1-flood-mapping-wetlands-and-mangroves.md)

# Prac 07: Fire regime: burn severity, frequency and seasonality

**When:** Fri 6 Nov 2026, Session 3 · **Scripts:** [`prac07a_dnbr_burn_severity.js`](../scripts/prac07a_dnbr_burn_severity.js), [`prac07b_fire_frequency.js`](../scripts/prac07b_fire_frequency.js) · **ULOs:** 1, 2, 3, 4

**Also available in:** Python [`prac07_fire_regime.py`](../alternatives/python/prac07_fire_regime.py) · R [`prac07_fire_regime.R`](../alternatives/r/prac07_fire_regime.R) · QGIS [recipe](../alternatives/qgis/README.md). The Code Editor remains the main environment.

**Purpose.** Map burn severity with dNBR and compare it with the NT season classes, then describe fire frequency and seasonality from MCD64A1, checked against ESA FireCCI51.

> **Read first (about 30 min).** Before you start, read these summary notes in the *Article review reading list and summary notes* (Learnline, and [reference/article-review-notes.md](../reference/article-review-notes.md)):
>
> - **2.1 Evans & Russell-Smith (2020)**, savanna fire management in western Arnhem Land
> - **2.2 Edwards et al. (2021)**, savanna burning emissions reduction projects
> - **2.3 Edwards, Russell-Smith & Maier (2018)**, validating satellite fire severity mapping
> - **3.3 Einoder et al. (2023)**, long-unburnt areas, fire size and mammal declines (a preview of Article review 3)
>
> **Carry these ideas into the prac:**
>
> - Fire management in the north aims to shift burning from the late dry season (LDS) to the early dry season (EDS); area burnt alone is a poor indicator of success (Evans & Russell-Smith; Edwards et al., 2021).
> - Severity can be mapped directly with dNBR and checked against field data such as tree stem mortality; LDS wildfires can kill a quarter to a half of tree stems (Edwards et al., 2018).
> - The spatial pattern of fire matters to wildlife: fire size, the amount of long-unburnt (at least 5 years) habitat and the distance to large long-unburnt patches (Einoder et al.).

## 1. Concept notes

**Fire as a disturbance regime.** A fire regime is defined by frequency, season, intensity or severity, extent and patchiness. Northern Australian savannas are among the most fire-prone landscapes on Earth, with much of the Top End burning every one to three years.

- **Early dry season (EDS) fires** (before 1 August) are cooler and patchier.
- **Late dry season (LDS) fires** are hotter, larger and emit more greenhouse gas.

Savanna burning projects such as the West Arnhem Land Fire Abatement (WALFA) project (28,000 km²) use Indigenous-led early burning to shift fire from the LDS to the EDS. This reduces emissions and earns carbon credits ([Clean Energy Regulator](https://cer.gov.au/news-and-media/case-studies/arnhem-land-fire-abatement)).

**Burn indices.**

```math
\mathrm{NBR}=\frac{\rho_{NIR}-\rho_{SWIR2}}{\rho_{NIR}+\rho_{SWIR2}}\qquad \mathrm{dNBR}=\mathrm{NBR}_{pre}-\mathrm{NBR}_{post}\qquad \mathrm{RdNBR}=\frac{\mathrm{dNBR}}{\sqrt{|\mathrm{NBR}_{pre}|}}
```

Fire removes green leaves, so NIR falls, and exposes char and soil, so SWIR rises. The bands are B8A and B12 for Sentinel-2, and SR\_B5 and SR\_B7 for Landsat 8/9.

| dNBR | Severity class (Key & Benson, 2006) |
| --- | --- |
| < −0.25 | Enhanced regrowth, high |
| −0.25 to −0.10 | Enhanced regrowth, low |
| −0.10 to 0.10 | Unburned |
| 0.10 to 0.27 | Low |
| 0.27 to 0.44 | Moderate–low |
| 0.44 to 0.66 | Moderate–high |
| ≥ 0.66 | High |

These thresholds were calibrated in US forests. Savanna grass fires fall mostly in the low classes.

**NT season classes vs Key & Benson.** NT fire management uses season as a proxy for severity: early dry season (EDS, before 1 August) fires count as low severity and late dry season (LDS) fires as high severity. Field data back the proxy: in 719 monitored fires, most EDS fires were of very low intensity, while LDS fires were typically much more severe (Russell-Smith & Edwards, 2006). LDS fires can kill 24–55 % of tree stems (Edwards et al., 2018).

The two systems can be compared, but they classify different things:

| | NT season classes | Key & Benson dNBR classes |
| --- | --- | --- |
| What is classified | When the fire burned (a proxy for intensity) | Spectral change from pre- to post-fire imagery (the fire's effect) |
| Classes | 2: EDS = low, LDS = high | 7, from enhanced regrowth to high |
| Calibrated with | Field plots in NT savanna (leaf-scorch height) | Composite Burn Index plots in US conifer forests |
| Unit | A fire, dated by its burn day | A pixel |

A fair comparison needs three things:

- **The same classes.** Reduce Key & Benson to severe vs not severe (dNBR ≥ 0.44, i.e. moderate–high and high), and test 0.27 and 0.66.
- **Event-matched images.** One May–November image pair misses EDS fires that burned before the pre-fire image, and lets others re-green before November. That biases EDS dNBR low.
- **Agreement statistics.** A 2 × 2 table (season × severe), overall agreement, Cohen's kappa, and the share of EDS area that is severe and of LDS area that is not.

Expect only partial agreement. Grass-layer surface fires give low dNBR in any season, and EDS fires in heavy, long-unburnt fuel can be severe. In NT savanna, the pre–post difference in shortwave infrared near 1.6 µm separated severity better than dNBR (Edwards et al., 2013).

**Burned-area products.** MODIS MCD64A1 (500 m, monthly) records the day of burning, which supports frequency, seasonality and time-since-fire mapping. Northern Australia's operational product is NAFI fire scars ([firenorth.org.au](https://firenorth.org.au)).

## 2. Practical activities

**Activity 7.1 – Burn severity (`prac07a`).**

1. Build Sentinel-2 composites for 2023 in eastern Kakadu and western Arnhem Land: pre-fire (May–mid-June) and post-fire (mid-October–November).
2. Compute NBR, dNBR and RdNBR, classify severity, and tabulate area per class.
3. Overlay MODIS early and late burn dates, and compare mean dNBR for early vs late fires.

> **Reading link (notes 2.3, Edwards et al. 2018).** Edwards et al. compared NBR, dNBR and RdNBR (step 2 of Activity 7.1) against tree stem mortality in the field, and found that Landsat and MODIS agreed on severe versus non-severe fire more than 80 % of the time. Your mean dNBR for early versus late fires (step 3) tests the same idea with Sentinel-2.

**Activity 7.1b – NT season classes vs Key & Benson (`prac07a`, Section 4b).**

1. Take each pixel's first burn date in the year from MCD64A1. Keep EDS fires that burned 11 May–14 July and LDS fires that burned 1 August–15 October.
2. Compute dNBR with event-matched windows: EDS pre 1 April–10 May, post 15–31 July; LDS pre July, post 15 October–20 November.
3. Classify with the Key & Benson thresholds, and cross-tabulate the area of each class within EDS and LDS fires.
4. Reduce to severe (dNBR ≥ 0.44) vs not severe. Report the 2 × 2 table, agreement and kappa, then repeat with 0.27 and 0.66.

> **Reading link (notes 2.3, Edwards et al. 2018).** Step 4 reduces severity to severe versus not severe, the same binary classification Edwards et al. validated. Late dry season wildfires in their study killed about 24–55 % of tree stems, which is the evidence behind the NT convention. Where your 2 × 2 table disagrees (for example, a severe EDS fire on a hot day, or a patchy LDS fire), explain why using the notes.

**Activity 7.2 – Fire regime (`prac07b`).**

1. Build annual burned, EDS and LDS masks from MCD64A1 for 2001–2024.
2. Map fire frequency, the share of fires in the LDS, and years since the last fire across the NT.
3. Chart stacked EDS and LDS burned area per year for the NT and western Arnhem Land.
4. Summarise the fire regime of **your tile** (frequency, LDS share, last fire).
5. Compare burned area in **your tile** from MCD64A1 and ESA FireCCI51 (2001–2020), year by year, and explain where they disagree.

> **Reading link (notes 2.1, 2.2 and 3.3, Evans & Russell-Smith 2020, Edwards et al. 2021 and Einoder et al. 2023).** The LDS share and the stacked EDS/LDS chart (steps 2–3 of Activity 7.2) show the regime shift Evans & Russell-Smith documented for western Arnhem Land and the post-2013 change at savanna burning project sites (Edwards et al., 2021). "Years since the last fire" is the basis of long-unburnt habitat (at least 5 years) in Einoder et al. In step 5, remember that coarse products such as MCD64A1 (500 m) can miss small, patchy EDS burns, which affects every patchiness and long-unburnt metric.

**Key code** (an excerpt from [`prac07a_dnbr_burn_severity.js`](../scripts/prac07a_dnbr_burn_severity.js); run the full script for the complete workflow):

```javascript
// dNBR from pre- and post-fire Sentinel-2 composites, classed with Key & Benson (2006)
// (pre and post are cloud-masked median composites built earlier in the script)
var nbr = function(img) { return img.normalizedDifference(['B8A', 'B12']); };
var dNBR = nbr(pre).subtract(nbr(post)).rename('dNBR');
var severity = ee.Image(0)
  .where(dNBR.gte(0.10).and(dNBR.lt(0.27)), 4)    // low
  .where(dNBR.gte(0.27).and(dNBR.lt(0.44)), 5)    // moderate–low
  .where(dNBR.gte(0.44).and(dNBR.lt(0.66)), 6)    // moderate–high
  .where(dNBR.gte(0.66), 7).selfMask();           // high
Map.addLayer(severity, {min: 4, max: 7, palette: ['#fff70b', '#ffaf38', '#ff641b', '#a41fd6']}, 'Burn severity');
```

## 3. Challenge questions (knowledge check)

**Core**

1. Why does NBR use SWIR? What happens physically to the surface after fire?
2. Why must post-fire imagery be acquired before the first wet-season storms?
3. Why do early-season fires show low dNBR in a November image? Give two reasons.
4. Do the NT season classes (EDS = low, LDS = high) agree with the Key & Benson classes in your results? Give three reasons why they can disagree.
5. Where does fire occur most often in the NT? Relate this to rainfall and grass fuel.
6. Describe the EDS/LDS split in western Arnhem Land before and after 2006.

**Extension (ENV506)**

1. Critique the use of the Key & Benson thresholds in savanna, and propose a local calibration. Repeat Activity 7.1b for three years and three severe thresholds, give kappa with a bootstrap confidence interval, and test the SWIR (S2 B11) difference as an alternative index.
2. Build a per-fire workflow: the last clear image before the MODIS BurnDate and the first clear image after it. Quantify how dNBR changes.
3. Test for a post-2006 shift in LDS share with Mann–Kendall (Prac 02), using a BACI comparison against a non-project area.
4. Validate MCD64A1 against NAFI scars for one year (load them as an uploaded asset), and report omission and commission errors by fire size.

## 4. Link to summative assessment

- **AT4 Part 3:** characterise fire frequency and seasonality in your tile over your 10-year window (MCD64A1 checked against ESA FireCCI51), and compare burn severity classes for one fire year (Activity 7.1b).

## 5. Reading

- Russell-Smith, J., et al. (2013). Managing fire regimes in north Australian savannas: Applying Aboriginal approaches to contemporary global problems. *Frontiers in Ecology and the Environment, 11*(s1), e55–e63. https://doi.org/10.1890/120251
- Edwards, A., et al. (2021). Transforming fire management in northern Australia through successful implementation of savanna burning emissions reductions projects. *Journal of Environmental Management, 290*, 112568. https://doi.org/10.1016/j.jenvman.2021.112568
- Giglio, L., Boschetti, L., Roy, D. P., Humber, M. L., & Justice, C. O. (2018). The Collection 6 MODIS burned area mapping algorithm and product. *Remote Sensing of Environment, 217*, 72–85. https://doi.org/10.1016/j.rse.2018.08.005
- Miller, J. D., & Thode, A. E. (2007). Quantifying burn severity in a heterogeneous landscape with a relative version of the delta Normalized Burn Ratio (dNBR). *Remote Sensing of Environment, 109*, 66–80. https://doi.org/10.1016/j.rse.2006.12.006
- Key, C. H., & Benson, N. C. (2006). *Landscape assessment: Ground measure of severity and remote sensing of fire severity* (RMRS-GTR-164-CD). USDA Forest Service.
- Russell-Smith, J., & Edwards, A. C. (2006). Seasonality and fire severity in savanna landscapes of monsoonal northern Australia. *International Journal of Wildland Fire, 15*(4), 541–550. https://doi.org/10.1071/WF05111
- Edwards, A. C., Maier, S. W., Hutley, L. B., Williams, R. J., & Russell-Smith, J. (2013). Spectral analysis of fire severity in north Australian tropical savannas. *Remote Sensing of Environment, 136*, 56–65. https://doi.org/10.1016/j.rse.2013.04.013
- Edwards, A. C., Russell-Smith, J., & Maier, S. W. (2018). A comparison and validation of satellite-derived fire severity mapping techniques in fire prone north Australian savannas: Extreme fires and tree stem mortality. *Remote Sensing of Environment, 206*, 287–299. https://doi.org/10.1016/j.rse.2017.12.038
- Evans, J., & Russell-Smith, J. (2020). Delivering effective savanna fire management for defined biodiversity conservation outcomes: An Arnhem Land case study. *International Journal of Wildland Fire, 29*(5), 386–400. https://doi.org/10.1071/WF18126 (article review notes)
- Einoder, L. D., et al. (2023). Long term monitoring reveals the importance of large, long unburnt areas and smaller fires in moderating mammal declines in fire-prone savanna of northern Australia. *Journal of Applied Ecology*. https://doi.org/10.1111/1365-2664.14482 (article review notes)

## Full scripts

Each script is copied here from [`scripts/`](../scripts) so this page has everything in one place. The `.js` file is the master copy: if the two ever differ, use the file. Click a heading to open the script, then use the copy button and paste it into a new script in the Code Editor.

<details>
<summary><strong>prac07a_dnbr_burn_severity.js</strong> (247 lines)</summary>

```javascript
/**** Prac 07a — Burned area and severity with dNBR (Arnhem Land / Kakadu, NT)
 * Data: Sentinel-2 SR (NBR from B8A and B12, 20 m), MODIS MCD64A1 for burn dates.
 * Approach: pre-fire (early dry season) vs post-fire (late dry season) composites for one year.
 * Section 4b compares the NT season-based severity convention (EDS = low, LDS = high; Russell-Smith & Edwards 2006)
 * with the Key & Benson (2006) dNBR classes, using event-matched pre/post windows for each season.
 *
 * WHAT THIS SCRIPT DOES:
 *   Maps where fire burned and how severe it was across eastern Kakadu / western Arnhem Land in one year.
 *   It compares Sentinel-2 NBR before and after the fire season (dNBR), classes the result with the
 *   Key & Benson thresholds, and uses MODIS burn dates to split fires into early and late dry season.
 *   Section 4b then tests the NT rule of thumb "EDS fires are low severity, LDS fires are high severity".
 *
 * NT FIRE SEASONS (used throughout):
 *   EDS = early dry season, fires before 1 August. Fuels are still partly green and nights are cool and humid,
 *         so fires are usually patchy and mild. Savanna burning programs light EDS fires on purpose.
 *   LDS = late dry season, fires from 1 August. Grass is fully cured and weather is hot, dry and windy,
 *         so fires are usually larger, hotter and more damaging. 1 August = day of year (DOY) 213 in a non-leap year.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) EDIT: YEAR (section 1); optionally aoi, the PRE/POST windows, and SEVERE_T (section 4b).
 *   (3) Click Run.
 *   (4) Read the Console (right panel) for scene counts, area tables, agreement and kappa; turn layers on/off
 *       in the Map's Layers list; start the export in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   - Map: pre- and post-fire Sentinel-2 SWIR false colour, dNBR, Key & Benson severity (with a legend),
 *     MODIS early vs late fires, and (section 4b) event-matched Key & Benson classes and the EDS/LDS fires tested.
 *   - Console: number of pre/post scenes, area (ha) per severity class, mean dNBR by season,
 *     a season × Key & Benson area table, a 2 × 2 agreement table, proportion agreement and Cohen's kappa.
 *
 * DATA:
 *   - Sentinel-2 surface reflectance, COPERNICUS/S2_SR_HARMONIZED, 20 m used (B8A, B12), windows within YEAR.
 *   - Cloud Score+, GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED, 10 m, matched to each Sentinel-2 image.
 *   - MODIS burned area, MODIS/061/MCD64A1, 500 m, monthly, band BurnDate (day of year), Jan–Dec of YEAR.
 *
 * LINKS: pracs/prac07-fire-regime-burn-severity-frequency-and-seasonality.md (course repository).
 *   Feeds Prac 07 and AT4 Part 3.
 *
 * KEY GEE IDEAS:
 *   - filterDate/filterBounds + map() to build cloud-masked collections; median() composites.
 *   - Building classes with ee.Image(0).where(...) and masking with updateMask/selfMask/blend.
 *   - Grouped reducers in reduceRegion (area per class) — and why scale (20 m vs 500 m) matters.
 *   - Server-side numbers (ee.Number) for agreement statistics; ui.Panel for a map legend; Export.image.toDrive.
 *
 * Q = core (ENV306 and ENV506). EXT = ENV506 extension.
 ****/

// ---------- 1 Study area & parameters ----------
// One rectangle, one year, and two date windows: PRE (start of the dry season) and POST (end of the dry season).
var aoi = ee.Geometry.Rectangle([132.70, -13.00, 133.60, -12.30]);  // eastern Kakadu / western Arnhem Land
var YEAR = 2023;   // EDIT: fire year to analyse
var PRE = [YEAR + '-05-01', YEAR + '-06-15'];   // early dry season: after the wet, before most fires
var POST = [YEAR + '-10-15', YEAR + '-11-20'];  // before the first wet-season green-up
Map.centerObject(aoi, 9);

// ---------- 2 Data ----------
// s2(start, end) returns cloud-masked Sentinel-2 images for a date window, each with an extra NBR band.
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
function s2(start, end) {
  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(aoi).filterDate(start, end)
    .linkCollection(csPlus, ['cs_cdf'])   // attach the matching Cloud Score+ band to each S2 image
    .map(function(img) {
      // cs_cdf: 0 = cloudy, 1 = clear; keep ≥ 0.6 (a starting value — test others). ÷ 10000 → reflectance 0–1.
      var r = img.updateMask(img.select('cs_cdf').gte(0.6)).divide(10000);
      // NBR = (NIR − SWIR2) / (NIR + SWIR2). B8A = narrow NIR (20 m), B12 = SWIR2 (20 m), so both share a pixel size.
      return r.addBands(r.normalizedDifference(['B8A', 'B12']).rename('NBR'));
    });
}
var preCol = s2(PRE[0], PRE[1]);
var postCol = s2(POST[0], POST[1]);
print('Pre / post scenes', preCol.size(), postCol.size());   // check there are enough images in each window
// Median composites are robust to residual cloud and smoke.
var pre = preCol.median().clip(aoi);
var post = postCol.median().clip(aoi);
// EXT: try a "most burnt" post-fire mosaic: postCol.map(function(i){return i.addBands(i.select('NBR').multiply(-1).rename('negNBR'));}).qualityMosaic('negNBR')

// ---------- 3 Processing ----------
// dNBR = NBR before − NBR after. Fire removes green leaves (NIR falls) and leaves dry, charred ground
// (SWIR2 rises), so NBR drops and dNBR is positive. Larger dNBR = more severe change. Unitless.
var dNBR = pre.select('NBR').subtract(post.select('NBR')).rename('dNBR');
// RdNBR (Miller & Thode 2007) — relative, less dependent on pre-fire cover
// Divides by √|pre-fire NBR|; max(0.001) stops division by zero where pre-fire NBR ≈ 0.
var RdNBR = dNBR.divide(pre.select('NBR').abs().sqrt().max(0.001)).rename('RdNBR');

// USGS FIREMON thresholds (Key & Benson 2006), developed in temperate forests.
// keyBenson(d) turns any dNBR image into classes 1–7 (see sevNames below). Each .where() overwrites
// pixels that fall in that dNBR range. updateMask keeps the input's no-data areas as no-data.
function keyBenson(d) {
  return ee.Image(0)
    .where(d.lt(-0.25), 1)
    .where(d.gte(-0.25).and(d.lt(-0.1)), 2)
    .where(d.gte(-0.1).and(d.lt(0.1)), 3)
    .where(d.gte(0.1).and(d.lt(0.27)), 4)
    .where(d.gte(0.27).and(d.lt(0.44)), 5)
    .where(d.gte(0.44).and(d.lt(0.66)), 6)
    .where(d.gte(0.66), 7)
    .updateMask(d.mask()).rename('severity');
}
// The same classes written out in full for the whole-season dNBR (identical thresholds to keyBenson()).
var sev = ee.Image(0)
  .where(dNBR.lt(-0.25), 1)
  .where(dNBR.gte(-0.25).and(dNBR.lt(-0.1)), 2)
  .where(dNBR.gte(-0.1).and(dNBR.lt(0.1)), 3)
  .where(dNBR.gte(0.1).and(dNBR.lt(0.27)), 4)
  .where(dNBR.gte(0.27).and(dNBR.lt(0.44)), 5)
  .where(dNBR.gte(0.44).and(dNBR.lt(0.66)), 6)
  .where(dNBR.gte(0.66), 7)
  .updateMask(dNBR.mask()).clip(aoi).rename('severity');
// Class names and colours, in order 1–7 (used for the legend and the 4b table).
var sevNames = ['Enhanced regrowth, high', 'Enhanced regrowth, low', 'Unburned', 'Low severity',
                'Moderate-low', 'Moderate-high', 'High severity'];
var sevPal = ['#7a8737', '#acbe4d', '#0ae042', '#fff70b', '#ffaf38', '#ff641b', '#a41fd6'];

// ---------- 4 Analysis ----------
// How much area falls in each severity class, and does severity differ between early and late fires?
var areaHa = ee.Image.pixelArea().divide(1e4);   // pixel area in m² ÷ 10 000 = hectares
// Grouped reducer: sum band 0 (ha) for each value of band 1 (severity class). scale 20 = S2 NBR pixel size;
// maxPixels lifts the pixel limit; tileScale 4 splits the job into smaller tiles to avoid memory errors.
var sevArea = areaHa.addBands(sev).reduceRegion({
  reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'class'}),
  geometry: aoi, scale: 20, maxPixels: 1e11, tileScale: 4});
print('Area (ha) by severity class 1–7', sevArea);

// MODIS burn date for the same year: early (Jan–Jul) vs late (Aug–Dec) dry season
// BurnDate = day of year (1–366) the 500 m pixel burned; 0 = not burned. max() keeps the LAST burn date of the year.
var burnDate = ee.ImageCollection('MODIS/061/MCD64A1').filterDate(YEAR + '-01-01', (YEAR + 1) + '-01-01')
  .select('BurnDate').max().clip(aoi);
// Season classes: 1 = EDS (burned before 1 August), 2 = LDS (burned from 1 August). selfMask hides unburnt (0) pixels.
var season = ee.Image(0).where(burnDate.gt(0).and(burnDate.lt(213)), 1)  // DOY 213 ≈ 1 Aug
  .where(burnDate.gte(213), 2).selfMask();

// Compare dNBR with burn timing — early fires may have partially recovered by November
// Mean dNBR per season. scale 500 = MODIS pixel size, so dNBR is averaged to match the burn-date grid.
var dnbrBySeason = dNBR.addBands(season).reduceRegion({
  reducer: ee.Reducer.mean().group({groupField: 1, groupName: 'season'}),
  geometry: aoi, scale: 500, maxPixels: 1e10});
print('Mean dNBR: season 1 = early dry, 2 = late dry', dnbrBySeason);
// Q: With ONE pre (May–Jun) and ONE post (Oct–Nov) image, why is this comparison biased against EDS fires?
//    (Hint: some EDS fires burn before or during the PRE window; others re-green or lose their ash before November.)

// ---------- 4b NT season-based severity vs Key & Benson dNBR classes (event-matched) ----------
// NT convention: EDS fires (before 1 Aug) are treated as low severity, LDS fires (from 1 Aug) as high severity.
// That is a PROXY for expected intensity (fuel curing, fire weather). Key & Benson classes measure the spectral
// EFFECT of the fire. Comparing them tests the convention: are LDS fires really more severe on the ground?
// Each season gets its own pre/post windows so both are measured soon after they burn.
// WHY EVENT-MATCHED WINDOWS: with the single PRE/POST pair above, an EDS fire in May may already be burnt in the
// PRE image (so dNBR misses it), and by November its ash has blown away and grass has re-sprouted (so dNBR is small).
// That would make EDS fires look mild even if they were not. Giving each season a "just before" and "just after"
// window measures every fire at a similar time since burning, so the EDS vs LDS comparison is fair.
// min() over the year keeps the FIRST burn date (DOY); the map() first masks 0 (unburnt) so it is not the minimum.
var firstBurn = ee.ImageCollection('MODIS/061/MCD64A1').filterDate(YEAR + '-01-01', (YEAR + 1) + '-01-01')
  .select('BurnDate').map(function(i) { return i.updateMask(i.gt(0)); }).min().clip(aoi);   // first burn of the year (DOY)
// Window pairs. EDS: pre 1 Apr–10 May, post 15–31 Jul. LDS: pre July, post = the main POST window (15 Oct–20 Nov).
var W = {EDS_PRE: [YEAR + '-04-01', YEAR + '-05-10'], EDS_POST: [YEAR + '-07-15', YEAR + '-07-31'],
         LDS_PRE: [YEAR + '-07-01', YEAR + '-07-31'], LDS_POST: POST};
function nbrMedian(w) { return s2(w[0], w[1]).select('NBR').median(); }   // median NBR for one window
// Only fires that burned BETWEEN their windows are tested: EDS DOY 131–195 (11 May–14 Jul); LDS DOY 213–288 (1 Aug–15 Oct)
var isEDS = firstBurn.gte(131).and(firstBurn.lte(195));
var isLDS = firstBurn.gte(213).and(firstBurn.lte(288));
// EDS dNBR (from EDS windows) inside EDS fires, blended with LDS dNBR (from LDS windows) inside LDS fires → one image.
var dNBR_event = ee.Image(nbrMedian(W.EDS_PRE).subtract(nbrMedian(W.EDS_POST))).updateMask(isEDS)
  .blend(nbrMedian(W.LDS_PRE).subtract(nbrMedian(W.LDS_POST)).updateMask(isLDS)).rename('dNBR_event').clip(aoi);
var kbEvent = keyBenson(dNBR_event);   // Key & Benson classes 1–7 for the event-matched dNBR
var seasonCls = ee.Image(0).where(isEDS, 1).where(isLDS, 2).selfMask().rename('season');   // 1 = EDS ("low"), 2 = LDS ("high")

// Cross-tabulation: area (ha) of each Key & Benson class within EDS and LDS fires
// Trick: code = season × 10 + class (e.g. 25 = LDS fire in class 5), so one grouped reducer gives every table cell.
var ct = areaHa.addBands(seasonCls.multiply(10).add(kbEvent).rename('code')).reduceRegion({
  reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'code'}),
  geometry: aoi, scale: 20, maxPixels: 1e11, tileScale: 8});
var ctFc = ee.FeatureCollection(ee.List(ct.get('groups')).map(function(d) { return ee.Feature(null, d); }));
// cell(code): area for one code, or 0 if that combination never occurs (ee.Algorithms.If is a server-side "if").
function cell(code) {
  var m = ctFc.filter(ee.Filter.eq('code', code));
  return ee.Number(ee.Algorithms.If(m.size().gt(0), m.first().get('sum'), 0));
}
// Build a 2-row table (EDS, LDS) with one column per burnt class 3–7, plus classes 1–2 lumped as regrowth/noise.
var table4b = ee.FeatureCollection([1, 2].map(function(sc) {
  var props = {season: sc === 1 ? 'EDS (NT: low)' : 'LDS (NT: high)'};
  [3, 4, 5, 6, 7].forEach(function(k) { props['KB' + k + '_' + sevNames[k - 1].replace(/[^A-Za-z]/g, '')] = cell(sc * 10 + k).round(); });
  props.regrowth_or_noise = cell(sc * 10 + 1).add(cell(sc * 10 + 2)).round();
  return ee.Feature(null, props);
}));
print('4b: Area (ha) by Key & Benson class within EDS and LDS fires', table4b);

// Binary agreement: NT "high" = LDS; Key & Benson "high" = moderate-high or high (dNBR ≥ SEVERE_T)
var SEVERE_T = 0.44;   // try 0.27 (moderate-low and above) and 0.66 (high only)
var sevBin = dNBR_event.gte(SEVERE_T);   // 1 = "severe" by Key & Benson
var lds = seasonCls.eq(2);               // 1 = LDS ("high" by the NT convention), 0 = EDS
// n(mask): total hectares where mask = 1. 'area' is the band name of ee.Image.pixelArea().
var n = function(maskImg) {
  return ee.Number(areaHa.updateMask(maskImg).reduceRegion({reducer: ee.Reducer.sum(), geometry: aoi, scale: 20,
    maxPixels: 1e11, tileScale: 8}).get('area'));
};
// The four cells of the 2 × 2 table (ha): a = LDS & severe, b = LDS & not, c = EDS & severe, d = EDS & not.
var a = n(lds.and(sevBin)), b = n(lds.and(sevBin.not())), c = n(lds.not().and(sevBin)), d = n(lds.not().and(sevBin.not()));
var N = a.add(b).add(c).add(d);
var po = a.add(d).divide(N);   // observed agreement: share of area where both systems say the same thing
// pe = agreement expected by chance from the row and column totals; kappa = (po − pe) / (1 − pe).
var pe = a.add(b).multiply(a.add(c)).add(c.add(d).multiply(b.add(d))).divide(N.pow(2));
print('4b: 2 × 2 (ha) [LDS&severe, LDS&not, EDS&severe, EDS&not]', [a, b, c, d]);
print('4b: Agreement (proportion) and Cohen\'s kappa', po, po.subtract(pe).divide(ee.Number(1).subtract(pe)));
print('4b: Share of EDS area that Key & Benson calls severe; share of LDS area that it calls severe',
  c.divide(c.add(d)), a.divide(a.add(b)));
Map.addLayer(kbEvent, {min: 1, max: 7, palette: ['#7a8737', '#acbe4d', '#0ae042', '#fff70b', '#ffaf38', '#ff641b', '#a41fd6']},
  '4b: Key & Benson class, event-matched windows', false);
Map.addLayer(seasonCls, {min: 1, max: 2, palette: ['#4daf4a', '#e41a1c']}, '4b: Tested fires: EDS (green) / LDS (red)', false);
// Q: Do the two systems agree? Which cell of the 2 × 2 table is largest after the diagonal, and what does it mean ecologically?
// Q: List three reasons they can disagree (surface vs crown fire, fuel load and time since fire, MODIS 500 m vs S2 20 m,
//    timing of the post image, US-forest thresholds, patchiness within an EDS fire).
// EXT: Repeat 4b for three years (wet and dry) and for SEVERE_T = 0.27, 0.44, 0.66; report kappa with a bootstrap CI.
// EXT: Replace dNBR with the pre–post difference in SWIR (S2 B11, ≈1.6 µm), which Edwards et al. (2013) found best in NT savanna,
//      and compare its agreement with the season classes.

// ---------- 5 Visualise ----------
// SWIR false colour (R = B12 SWIR2, G = B8A NIR, B = B4 red): healthy vegetation looks green,
// fresh burn scars look dark red to black. Reflectance 0–0.4 is stretched to full brightness.
var swir = {bands: ['B12', 'B8A', 'B4'], min: 0, max: 0.4};
Map.addLayer(pre, swir, 'Pre-fire S2 (SWIR false colour)');
Map.addLayer(post, swir, 'Post-fire S2 (SWIR false colour)');
Map.addLayer(dNBR, {min: -0.3, max: 0.7, palette: ['green', 'white', 'yellow', 'orange', 'red', 'purple']}, 'dNBR');
Map.addLayer(sev, {min: 1, max: 7, palette: sevPal}, 'Severity (Key & Benson)');
Map.addLayer(season, {min: 1, max: 2, palette: ['#4daf4a', '#e41a1c']}, 'MODIS: early (green) vs late (red) fire', false);

// Legend: one row per severity class (coloured box + name), placed in the bottom-left of the map.
var legend = ui.Panel({style: {position: 'bottom-left'}});
sevNames.forEach(function(n, i) {
  legend.add(ui.Panel([ui.Label('', {backgroundColor: sevPal[i], padding: '8px', margin: '2px'}),
    ui.Label(n, {margin: '4px'})], ui.Panel.Layout.Flow('horizontal')));
});
Map.add(legend);

// ---------- 6 Export ----------
// 3-band GeoTIFF (dNBR, RdNBR, severity) to Google Drive; start it in the Tasks tab. .float() gives all bands one type.
// scale 20 = S2 NBR pixel size; crs EPSG:32753 = WGS 84 / UTM zone 53S (metres; covers Kakadu/Arnhem Land);
// maxPixels lifts the default pixel limit.
Export.image.toDrive({image: dNBR.addBands(RdNBR).addBands(sev).float(), description: 'Prac07a_dNBR_' + YEAR,
  folder: 'GEE_NT', region: aoi, scale: 20, crs: 'EPSG:32753', maxPixels: 1e11});

// Q: Describe the spatial pattern of severity. Where are the high-severity patches (plateau, lowlands, riparian)?
// Q: Why use SWIR (B12) in NBR? What happens physically to NIR and SWIR after fire?
// Q: Why must post-fire imagery be acquired before the first wet-season storms?
// EXT: The Key & Benson thresholds were calibrated on US conifer forests (Composite Burn Index plots). Argue whether they apply to
//      NT grassy savanna, and propose a local calibration (e.g. leaf-scorch-height field plots, as in Russell-Smith & Edwards 2006).
// EXT: Compare dNBR and RdNBR across areas of different pre-fire cover. Which is better for savanna, and why?
// EXT: Build a per-fire workflow: pre = image just before the MODIS BurnDate, post = first clear image after it.
```

</details>

<details>
<summary><strong>prac07b_fire_frequency.js</strong> (137 lines)</summary>

```javascript
/**** Prac 07b — Fire frequency, seasonality and time since fire (Northern Territory)
 * Data: MODIS MCD64A1 v6.1 burned area (500 m, monthly, Nov 2000–present); ESA FireCCI51 (250 m, 2001–2020) as a cross-check.
 * NT savanna fire management splits the year at 1 August: early dry season (EDS) vs late dry season (LDS).
 *
 * WHAT THIS SCRIPT DOES:
 *   Describes the NT fire regime from 2001 to 2024: how often each place burns (frequency), how many years since it
 *   last burned, and what share of fires are late dry season (LDS). It charts area burned per year by season for the
 *   NT and western Arnhem Land, and compares two burned-area products (MCD64A1 vs FireCCI51) inside your tile.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) EDIT: TILE (section 4b) — paste your personal tile from prac00. Optionally START/END and the arnhem box.
 *   (3) Click Run. The NT-wide chart sums the whole Territory at 500 m and may take a minute.
 *   (4) Read the Console (right panel) for the charts, turn layers on/off in the Map's Layers list,
 *       and start the exports in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   - Map: fire frequency (number of years burned), share of fires in the LDS, years since last fire,
 *     and the western Arnhem Land box.
 *   - Console: stacked column charts of EDS/LDS area burned (km²) per year for western Arnhem Land and the NT,
 *     and a line chart comparing MCD64A1 and FireCCI51 burned area in your tile.
 *
 * DATA:
 *   - MODIS burned area MCD64A1 v6.1, MODIS/061/MCD64A1, 500 m, monthly, band BurnDate (day of year), 2001–2024 used.
 *   - ESA FireCCI51, ESA/CCI/FireCCI/5_1, 250 m, monthly, band BurnDate, 2001–2020.
 *   - FAO GAUL 2015 level 1 boundaries, FAO/GAUL/2015/level1 (NT outline).
 *
 * LINKS: pracs/prac07-fire-regime-burn-severity-frequency-and-seasonality.md (course repository).
 *   Feeds Prac 07 and AT4 Part 3.
 *
 * KEY GEE IDEAS:
 *   - Building an annual ImageCollection from a list of years with ee.List.sequence and map().
 *   - Summing yes/no (0/1) images over time to count events (frequency); max() to find the most recent year.
 *   - reduceRegion inside a map() over a collection to make a time series for a chart.
 *   - Equal-area projection (EPSG:3577) and scale choice in exports.
 *
 * Q = core (ENV306 and ENV506). EXT = ENV506 extension.
 ****/

// ---------- 1 Study area ----------
// The whole NT (from an administrative boundary dataset) plus a smaller box over western Arnhem Land.
var nt = ee.FeatureCollection('FAO/GAUL/2015/level1').filter(ee.Filter.eq('ADM1_NAME', 'Northern Territory'));
// Approximate western Arnhem Land box (digitise the WALFA boundary for real analysis)
var arnhem = ee.Geometry.Rectangle([133.0, -13.3, 134.3, -12.0]);   // [west, south, east, north] in degrees
Map.centerObject(nt, 5);

var START = 2001, END = 2024;   // EDIT: years analysed (MCD64A1 starts Nov 2000, so 2001 is the first full year)
var years = ee.List.sequence(START, END);   // server-side list [2001, 2002, …, 2024]

// ---------- 2 Data ----------
// Monthly MODIS burned area. BurnDate = day of year (1–366) a 500 m pixel burned; 0 = not burned that month.
var mcd = ee.ImageCollection('MODIS/061/MCD64A1').select('BurnDate');

// ---------- 3 Processing: one image per year ----------
// For each year, make 0/1 bands: burned at all, burned in the EDS, burned in the LDS, plus the year if burned.
// Summing these 0/1 images over all years later gives fire frequency.
var annual = ee.ImageCollection.fromImages(years.map(function(y) {
  y = ee.Number(y);   // inside a server-side map() the year arrives as a generic object; cast it to a number
  var bd = mcd.filter(ee.Filter.calendarRange(y, y, 'year')).max();   // day of year burned (0 = not burned)
  // Note: max() keeps the LAST burn date, so a pixel burnt in both EDS and LDS of one year counts as LDS.
  var burned = bd.gt(0).unmask(0).rename('burned');   // unmask(0): treat no-data as "not burned" so sums work
  var eds = bd.gt(0).and(bd.lt(213)).unmask(0).rename('eds');   // DOY < 213 = before 1 August (EDS)
  var lds = bd.gte(213).unmask(0).rename('lds');                // DOY ≥ 213 = from 1 August (LDS)
  var lastYear = burned.multiply(y).rename('yearBurned');       // the year if burned, else 0
  return burned.addBands([eds, lds, lastYear]).set('year', y)
    .set('system:time_start', ee.Date.fromYMD(y, 7, 1).millis());   // date stamp (1 July) so charts/filters work
}));

var frequency = annual.select('burned').sum().clip(nt).rename('fire_frequency');   // number of years burned (0–24)
var ldsFreq = annual.select('lds').sum().clip(nt);                                  // number of years burned in the LDS
var lastFire = annual.select('yearBurned').max().selfMask();   // most recent burn year; selfMask hides never-burned (0)
var timeSinceFire = ee.Image(END).subtract(lastFire).clip(nt).rename('years_since_fire');   // 0 = burned in END
// Proportion of fires that occur late in the dry season
var ldsShare = ldsFreq.divide(frequency).updateMask(frequency.gt(0)).rename('LDS_share');   // 0–1; masked where never burned

// ---------- 4 Analysis: area burned per year, EDS vs LDS ----------
// For each year, total the km² burned in the EDS and LDS inside a region, then chart them as stacked columns.
var areaKm2 = ee.Image.pixelArea().divide(1e6);   // pixel area in m² ÷ 1 000 000 = km²
function areaSeries(region, label) {
  var fc = annual.map(function(img) {
    // 0/1 band × pixel area = km² burned in that pixel; sum over the region. scale 500 = MODIS pixel size.
    var a = img.select(['eds', 'lds']).multiply(areaKm2).reduceRegion({
      reducer: ee.Reducer.sum(), geometry: region, scale: 500, maxPixels: 1e11});
    return ee.Feature(null, {year: img.get('year'), EDS_km2: a.get('eds'), LDS_km2: a.get('lds')});
  });
  print(ui.Chart.feature.byFeature(fc, 'year', ['EDS_km2', 'LDS_km2']).setChartType('ColumnChart')
    .setOptions({title: 'Area burned by season: ' + label, isStacked: true,
                 colors: ['#4daf4a', '#e41a1c'], vAxis: {title: 'km²'}}));   // green = EDS, red = LDS
  return fc;   // returned so the table can be exported in section 6
}
var arnhemSeries = areaSeries(arnhem, 'western Arnhem Land (approx.)');
var ntSeries = areaSeries(nt.geometry(), 'Northern Territory');

// ---------- 4b Product comparison: MCD64A1 vs ESA FireCCI51 (2001–2020) ----------
// FireCCI51 (250 m, MODIS red/NIR) maps smaller fires than MCD64A1 (500 m). AT4 Part 3 uses this check for your tile.
var TILE = ee.Geometry.Rectangle([131.0, -14.2, 131.2, -14.0]);   // replace with your tile from prac00
var cci = ee.ImageCollection('ESA/CCI/FireCCI/5_1');
// One feature per year with km² burned by each product, and km² where BOTH say burned (their overlap).
var compare = ee.FeatureCollection(ee.List.sequence(START, 2020).map(function(y) {
  y = ee.Number(y);
  var cciBurn = cci.filter(ee.Filter.calendarRange(y, y, 'year')).select('BurnDate').max().gt(0).unmask(0);   // 0/1
  var mcdBurn = mcd.filter(ee.Filter.calendarRange(y, y, 'year')).max().gt(0).unmask(0);                      // 0/1
  // scale 250 = the finer FireCCI pixel, so FireCCI is not coarsened; MCD64A1 pixels are simply resampled.
  var a = areaKm2.multiply(mcdBurn).rename('MCD64A1_km2')
    .addBands(areaKm2.multiply(cciBurn).rename('FireCCI51_km2'))
    .addBands(areaKm2.multiply(mcdBurn.and(cciBurn)).rename('both_km2'))
    .reduceRegion({reducer: ee.Reducer.sum(), geometry: TILE, scale: 250, maxPixels: 1e10});
  return ee.Feature(null, a).set('year', y);
}));
print(ui.Chart.feature.byFeature(compare, 'year', ['MCD64A1_km2', 'FireCCI51_km2', 'both_km2'])
  .setOptions({title: 'Burned area in your tile: MCD64A1 vs FireCCI51', vAxis: {title: 'km²'}, pointSize: 3}));
// Q: In which years do the products disagree most? Relate this to fire size and the season of burning.

// ---------- 5 Visualise ----------
// Map layers. Frequency uses selfMask so never-burned pixels are transparent.
Map.addLayer(frequency.selfMask(), {min: 1, max: 20, palette: ['#ffffb2', '#fecc5c', '#fd8d3c', '#f03b20', '#bd0026']},
  'Fire frequency ' + START + '–' + END + ' (years burned)');
// Green = mostly EDS fires, yellow = mixed, red = mostly LDS fires.
Map.addLayer(ldsShare, {min: 0, max: 1, palette: ['#1a9641', '#ffffbf', '#d7191c']}, 'Share of fires in late dry season', false);
// Red = burned recently, green = long unburnt (15+ years).
Map.addLayer(timeSinceFire, {min: 0, max: 15, palette: ['#d7191c', '#fdae61', '#a6d96a', '#1a9641']}, 'Years since last fire', false);
Map.addLayer(ee.Image().paint(arnhem, 0, 2), {palette: 'blue'}, 'Western Arnhem Land box');   // outline only

// ---------- 6 Export ----------
// One 3-band GeoTIFF for the NT and two CSV tables, all to Google Drive. Start each in the Tasks tab.
// region = NT bounding box; scale 500 = MODIS pixel size; .float() gives all bands one data type.
Export.image.toDrive({image: frequency.addBands(ldsShare).addBands(timeSinceFire).float(),
  description: 'Prac07b_fire_regime_NT', folder: 'GEE_NT', region: nt.geometry().bounds(),
  scale: 500, crs: 'EPSG:3577', maxPixels: 1e11});   // EPSG:3577 = GDA94 / Australian Albers (equal area)
Export.table.toDrive({collection: arnhemSeries, description: 'Prac07b_Arnhem_EDS_LDS', folder: 'GEE_NT'});   // CSV by default
Export.table.toDrive({collection: compare, description: 'Prac07b_tile_MCD64A1_vs_FireCCI51', folder: 'GEE_NT'});

// Q: Where in the NT do fires occur most often? Relate the pattern to rainfall and fuel (grass) production.
// Q: Describe the trend in the EDS vs LDS split in western Arnhem Land since 2006 (start of WALFA). What might explain it?
// Q: Why does the 500 m MODIS product miss many small early-season fires?
// EXT: Test whether the LDS share decreased after 2006 (Mann–Kendall, Prac 02a), and compare inside vs outside the project area (BACI-style design).
// EXT: Validate MCD64A1 against NAFI fire scars (Landsat/Sentinel-derived, firenorth.org.au) for one year; report omission and commission.
```

</details>

---

[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 06](prac06-monitoring-land-clearing.md) · [Prac 08 →](prac08-sar-and-water-surface-water-sentinel-1-flood-mapping-wetlands-and-mangroves.md)
