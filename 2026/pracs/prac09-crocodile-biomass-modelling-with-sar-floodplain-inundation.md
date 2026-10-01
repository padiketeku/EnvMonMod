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

---

[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 08](prac08-sar-and-water-surface-water-sentinel-1-flood-mapping-wetlands-and-mangroves.md) · [Prac 10 →](prac10-urban-sprawl-detection-with-sentinel-1.md)
