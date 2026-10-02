# Alternative environments: Python, R and QGIS (optional)

The **Google Earth Engine Code Editor is the main environment** for ENV306/506. All teaching, demonstrations and Code Editor scripts ([`../scripts`](../scripts)) use it, and it is the default for assessment evidence. These alternatives give students options and let them combine Earth Engine with each language's statistics and GIS tools.

| Environment | Folder | Earth Engine access | What it adds | Best for |
| --- | --- | --- | --- | --- |
| **Python** | [`python/`](python) | `earthengine-api` + `geemap` (Jupyter / VS Code, `# %%` cells) | scikit-learn, statsmodels, scikit-image (Otsu), pymannkendall, GeoPandas | Data science careers; local ML and statistics |
| **R** | [`r/`](r) | `rgee` | ggplot2, sf, ranger, pROC, trend, landscapemetrics | Ecology and statistics students |
| **QGIS** | [`qgis/`](qgis) | Google Earth Engine plugin (Python console) + exported GeoTIFFs | Georeferencer, GRASS/SAGA tools (i.pca, i.tasscap, r.li), dzetsaka/SCP classification, Print Layout | Desktop GIS workflows; cartography |

Each Python and R file covers the **core activities** of one prac and mirrors the Code Editor logic. The Code Editor scripts remain the complete reference, including the extension (`// EXT:`) tasks.

## SAR units

Sentinel-1 (and ALOS PALSAR-2) backscatter is used as **linear σ⁰ for every computation and statistic** (composites, filters, ratios, CV, regression predictors, areas); dB is used only for display. `nt_common.py` / `nt_common.R` provide `to_linear`, `to_db` and `db_to_lin`, and `s1_grd()` loads `COPERNICUS/S1_GRD_FLOAT`, which is already linear σ⁰. In QGIS, export linear rasters and style them with a `10 * log10()` expression (Raster calculator) for viewing only.

## Setup

**Python**

```bash
pip install earthengine-api geemap pandas matplotlib scikit-learn statsmodels scikit-image pymannkendall geopandas
earthengine authenticate
```

Then, in each notebook or script: `import nt_common as nt; nt.init("YOUR-CLOUD-PROJECT")` (keep `nt_common.py` in the same folder).

**R**

```r
install.packages(c("rgee", "sf", "dplyr", "tidyr", "ggplot2", "ranger", "pROC", "trend", "class"))
rgee::ee_install()                       # creates the Python environment rgee needs (once)
source("nt_common.R"); nt_init("YOUR-CLOUD-PROJECT")
```

rgee depends on a working Python environment. If installation fails on a lab machine, use the Code Editor or the Python pathway instead.

**QGIS:** see [qgis/README.md](qgis/README.md).

## File map

| Prac | Python | R | QGIS |
| --- | --- | --- | --- |
| 01 | `prac01_basics_image_processing_vegetation.py` | `prac01_basics_image_processing_vegetation.R` | Georeferencer, i.pca, i.tasscap |
| 02 | `prac02_05_trends_seasonality_change.py` (Sen/MK, harmonics) | `prac02_05_trends_seasonality_change.R` | r.series |
| 03 | `prac03_climate_hydrology_drought.py` | `prac03_climate_hydrology_drought.R` | Zonal statistics, Temporal Controller |
| 04 | `prac04_landcover_landscape_metrics.py` | `prac04_landcover_landscape_metrics.R` | dzetsaka/SCP, r.li |
| 05 | `prac02_05_trends_seasonality_change.py` (LandTrendr); transition matrix is Code Editor only | `prac02_05_trends_seasonality_change.R` | Raster calculator, cross-tabulation |
| 06 | `prac06_land_clearing.py` | `prac06_land_clearing.R` | Polygonize, overlay |
| 07 | `prac07_fire_regime.py` | `prac07_fire_regime.R` | Reclassify, zonal histogram |
| 08 | `prac08_water_floods_mangroves.py` | `prac08_water_floods_mangroves.R` | Flood map layout |
| 09 | `prac09_crocodile_biomass.py` | `prac09_crocodile_biomass.R` | Convex hull, join, DataPlotly |
| 10 | `prac10_urban_sprawl_sentinel1.py` | `prac10_urban_sprawl_sentinel1.R` | Overlap analysis (LEI) |
| 11 | `prac11_lidar_gedi_canopy.py` | `prac11_lidar_gedi_canopy.R` | Sample raster values |
| 12 | `prac12_species_distribution_model.py` | `prac12_species_distribution_model.R` | Point cleaning, mapping |
| 13 | `prac13_alphaearth_foundation_model.py` | `prac13_alphaearth_foundation_model.R` | k-means for grids |

## Assessment evidence with alternative environments

You may complete AT2, AT3 and AT4 in Python, R or QGIS. Your evidence must remain **re-runnable**:

- **Python/R:** submit the notebook or script, with outputs, and its Git history or dated versions. Report the three **check values**. Markers re-run the code with their own Earth Engine credentials.
- **QGIS:** submit the Earth Engine export script, the Processing History or graphical model, and the check values.
- The **viva** (AT4) and **supervised AT1** are the same for everyone.
