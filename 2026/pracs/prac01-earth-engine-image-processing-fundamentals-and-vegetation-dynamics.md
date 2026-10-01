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

```latex
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

```JavaScript
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

---

[Home](../README.md) · [Schedule](../schedule-2026.md) · [Prac 02 →](prac02-monitoring-vegetation-condition-trends-and-seasonality.md)
