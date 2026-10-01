# QGIS pathway (optional)

The Google Earth Engine Code Editor is the main environment for ENV306/506. The QGIS pathway suits students who prefer a desktop GIS, or who want to finish analysis and cartography locally. It has two parts:

1. **Earth Engine inside QGIS:** the [Google Earth Engine plugin](https://gee-community.github.io/qgis-earthengine-plugin/) runs the Python versions in [`../python`](../python) from the QGIS Python Console and adds layers straight to the QGIS map canvas.
2. **Native QGIS processing** of GeoTIFFs and shapefiles exported from Earth Engine (`GEE_NT` folder on Drive), using QGIS core tools, GRASS and SAGA (via Processing), and plugins.

## Setup (QGIS 3.34 LTR or newer)

1. **Plugins → Manage and Install Plugins:** install *Google Earth Engine*, *dzetsaka* (classification: RF, SVM, GMM), *Semi-Automatic Classification Plugin (SCP)* and *DataPlotly*.
2. In the OSGeo4W shell (Windows) or the system Python (macOS/Linux) used by QGIS, install the helpers: `pip install earthengine-api`. Then authenticate once: `earthengine authenticate`.
3. Open **Plugins → Python Console**. Then:
   ```python
   import ee
   from ee_plugin import Map
   ee.Initialize(project="YOUR-CLOUD-PROJECT")
   ```
4. To reuse a Python prac in QGIS, copy its Earth Engine code into the console editor. Replace `geemap.Map()` / `m.addLayer` with `Map.addLayer`, and `m.centerObject` with `Map.centerObject`. Charts are easier in Jupyter, or in QGIS with DataPlotly on exported tables.

## Prac-by-prac QGIS recipes

| Prac | Earth Engine step (plugin or export) | Native QGIS analysis | Tools |
| --- | --- | --- | --- |
| 01 Image processing | Export a Landsat 9 scene (6 bands) for Darwin–Adelaide River | **Enhancement:** Symbology → Min/Max, Cumulative count cut 2–98 %, Mean ± SD. **Rectification:** georeference a scanned historical map or air photo of Darwin with ≥ 6 GCPs in *Raster → Georeferencer*, then report RMSE and transformation type. **Filters:** GRASS `r.neighbors` (mean, median), SAGA *Simple filter*, *Edge detection*. **Transformation:** GRASS `i.pca`, `i.tasscap` (Landsat 8 / Sentinel-2 coefficients), Raster calculator NDVI | Georeferencer, GRASS, SAGA |
| 02 Trends and seasonality | Export the annual NDVI stack and the Sen slope / harmonic coefficient rasters | GRASS `r.series` (method `slope`, `detcoeff`) for linear trend; *Temporal Controller* for the annual stack | GRASS r.series |
| 03 Climate and drought | Export CHIRPS anomaly, VCI, TCI and VHI rasters, and the Darwin LST/NDVI composite | *Zonal statistics* of VHI by pastoral district or your tile; Raster calculator to reclassify VHI below 40; *Temporal Controller* to animate monthly VHI | Zonal statistics, Temporal Controller |
| 04 Land cover and metrics | Export the predictor stack (S2 dry/wet + indices) and a WorldCover reference | Digitise training polygons, classify with **dzetsaka** (RF and SVM) or **SCP**, and run the SCP *Accuracy* tool against your own validation points. **Landscape metrics:** GRASS `r.li.patchnum`, `r.li.mps`, `r.li.edgedensity`, `r.li.shannon` (set up with `r.li.setup`), compared across 10/30/90 m with *Align rasters* | dzetsaka, SCP, GRASS r.li |
| 05 Change detection | Export your two classified years (`prac05a`) and the LandTrendr year-of-disturbance raster | Bi-temporal differencing in Raster calculator; transition matrix with GRASS `r.stats -a` (or `r.coin`) on the two classified rasters; map from→to codes (from × 10 + to) | GRASS r.stats, Raster calculator |
| 06 Land clearing | Export the S2 clearing-year raster and patch shapefile | *Polygonize*, then use Field calculator `$area / 10000`; *Select by expression* `area_ha >= 1`; overlay with cadastral or pastoral lease boundaries (NT Government open data) to summarise clearing per lease | Polygonize, Field calculator, Overlay |
| 07 Fire regime | Export dNBR and fire-frequency rasters | *Reclassify by table* (Key & Benson classes); *Raster layer unique values report* for area per class; *Zonal histogram* of severity per land tenure | Reclassify by table, Zonal histogram |
| 08 SAR water and mangroves | Export the JRC occurrence, flood extent and mangrove dNDVI rasters | Flood map layout with OpenStreetMap roads and communities (Kalkarindji, Daguragu); *Raster calculator* for dieback; area per catchment with *Zonal statistics* | Print Layout, Raster calculator |
| 09 Crocodile biomass | Run the Prac 09 script; export the river × year table (CSV) and the Aug 2017 flood raster | Unzip `flooded_areas_shapefiles.zip` (Learnline, restricted); *Convex hull* of each river's polygons to make the floodplain zones; *Add delimited text layer* for `croc-biomass-data.csv` and the exported table; *Join attributes by field value* (River, Year); DataPlotly scatter of Biomass_km vs floodplain area, coloured by river; Print Layout of the zones | Convex hull, Join attributes, DataPlotly |
| 10 Urban sprawl | Export the built-up rasters (2016–2024) | *Polygonize*; buffer old urban by 100 m; *Overlap analysis* between new patches and the buffer to classify infill/edge/outlying (LEI); Print Layout of growth | Polygonize, Overlap analysis |
| 11 Lidar | Export GEDI rh98 footprints as points (`sample(..., geometries=True)` → SHP) and the predicted height raster | Graduated symbology of footprints; *Sample raster values* to compare predicted vs GEDI height; DataPlotly scatter; profile with the *Profile tool* plugin | Sample raster values, Profile tool |
| 12 Species distribution | Export the 12-band predictor stack and suitability maps | Import the ALA CSV (*Add delimited text layer*); remove duplicates within 1 km (*Snap points to grid* + *Delete duplicate geometries*); map suitability; *Zonal statistics* per land tenure | Delimited text, Snap to grid |
| 13 AlphaEarth | Export 2018 and 2024 embeddings (64 bands, small AOI) | SAGA *K-Means clustering for grids* or GRASS `i.cluster` + `i.maxlik`; compare clusters with WorldCover via *Raster layer zonal statistics* | SAGA, GRASS imagery |

## Cartography for AT2 and AT4 (all students)

Use **Project → New Print Layout** for publication-quality figures: map frame, legend, scale bar, north arrow, data source text, and **your student ID and tile code** (required for the assessment). Export at 300 dpi PNG or PDF.

## Evidence for assessment

QGIS work counts as process evidence when it is reproducible:

- Save the **Processing History** (Processing → History) or a **Graphical Model** (`.model3`).
- Include the Earth Engine export script that produced your input rasters.
- Report the check values from the Earth Engine script. Markers verify those values in Earth Engine.
