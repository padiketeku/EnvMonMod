[Home](../README.md)

# Datasets, troubleshooting and repository layout

## Datasets used

| Family | Theme | GEE ID | Resolution / period | Pracs |
| --- | --- | --- | --- | --- |
| Optical | Landsat 5/7/8/9 SR and ST | `LANDSAT/LT05`, `LE07`, `LC08`, `LC09/C02/T1_L2` | 30 m; 1984–present | 01–06, 08 |
| Optical | Sentinel-2 SR + Cloud Score+ | `COPERNICUS/S2_SR_HARMONIZED`, `GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED` | 10–20 m; 2017–present | 01, 04, 06–08, 10, 11, 13 |
| Optical | MODIS VI, LST, ET, tree cover, burned area | `MODIS/061/MOD13Q1`, `MOD13A3`, `MOD11A2`, `MOD16A2`, `MOD44B`, `MCD64A1` | 250 m – 1 km | 01–03, 07, 12 |
| Optical | ESA FireCCI51 burned area | `ESA/CCI/FireCCI/5_1` | 250 m; 2001–2020 | 07 (AT4 Part 3) |
| SAR | Sentinel-1 GRD (C-band), linear σ⁰ | `COPERNICUS/S1_GRD_FLOAT` | 10 m; 2014–present | 08–11 |
| SAR | ALOS PALSAR-2 yearly mosaic (L-band) | `JAXA/ALOS/PALSAR/YEARLY/SAR_EPOCH` | 25 m; 2015–present | 11 |
| Lidar | GEDI L2A, L4A (monthly), L4B (gridded) | `LARSE/GEDI/GEDI02_A_002_MONTHLY`, `LARSE/GEDI/GEDI04_A_002_MONTHLY`, `LARSE/GEDI/GEDI04_B_002` | 25 m footprints; 1 km; 2019– | 11 |
| Foundation model | AlphaEarth satellite embeddings | `GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL` | 10 m; 2017–2024 | 13 |
| Land cover | ESA WorldCover; Dynamic World | `ESA/WorldCover/v200`; `GOOGLE/DYNAMICWORLD/V1` | 10 m | 04, 06, 10, 13 |
| Forest change | Hansen GFC | `UMD/hansen/global_forest_change_2023_v1_11` (check for newer) | 30 m; 2000–2023 | 06 |
| Built-up | GHSL built surface | `JRC/GHSL/P2023A/GHS_BUILT_S` | 100 m | 10 |
| Water and mangroves | JRC Global Surface Water; Giri 2000 mangroves | `JRC/GSW1_4/GlobalSurfaceWater`, `YearlyHistory`; `LANDSAT/MANGROVE_FORESTS` | 30 m | 08–10, 12 |
| Climate | CHIRPS; TerraClimate; WorldClim | `UCSB-CHG/CHIRPS/PENTAD`; `IDAHO_EPSCOR/TERRACLIMATE`; `WORLDCLIM/V1/BIO` | 0.05°; \~4 km; 1 km | 03, 12 |
| Terrain and hydrology | NASADEM; DEM-H; HydroSHEDS; MERIT Hydro | `NASA/NASADEM_HGT/001`; `AU/GA/DEM_1SEC/v10/DEM-H`; `WWF/HydroSHEDS/v1/Basins/hybas_4`, `hybas_5`; `MERIT/Hydro/v1_0_1` | 30–90 m | Many |
| Learnline (restricted) | Crocodile survey data; river floodplain shapefiles | `croc-biomass-data.csv`; `flooded_areas_shapefiles.zip` | Table; vector | 09 |
| Uploaded by students | Gouldian finch occurrences | [Atlas of Living Australia](https://www.ala.org.au) | Points | 12 |

## Troubleshooting in the Code Editor

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `Computation timed out` / `User memory limit exceeded` | Too many pixels in `reduceRegion` or a chart | Coarser `scale`, `tileScale: 4`, smaller area, or `Export` |
| Blank or black layer | Data not scaled or wrong visualisation range | Apply scale factors; check with the Inspector; set `min` / `max` |
| Collection `size` is 0 | Wrong dates, bounds or property | `print(collection.size())` after each filter |
| Chart has no time axis | `system:time_start` lost in `map()` | `.copyProperties(img, ['system:time_start'])` |
| Cloud and smoke in Top End imagery | Wet-season or burning-season dates | Dry-season windows, Cloud Score+ ≥ 0.6, or SAR |
| SAR noisy or inconsistent | Speckle; mixed orbits | Boxcar or focal median; filter to one pass or relative orbit |
| GEDI layer mostly empty | Sparse footprints; strict filter | Zoom in; widen dates; check `sensitivity` |
| `Asset not found` | Wrong path or not shared | Copy the path from the Assets tab; share with markers only |

## Core texts

- Turner, M. G., & Gardner, R. H. (2015). *Landscape ecology in theory and practice* (2nd ed.). Springer. https://doi.org/10.1007/978-1-4939-2794-4
- Cardille, J. A., et al. (Eds.). (2024). *Cloud-based remote sensing with Google Earth Engine*. Springer (open access). https://doi.org/10.1007/978-3-031-26588-4
- Richards, J. A. (2022). *Remote sensing digital image analysis* (6th ed.). Springer. https://doi.org/10.1007/978-3-030-82327-6
- Flores-Anderson, A. I., et al. (Eds.). (2019). *The SAR handbook*. NASA SERVIR. https://doi.org/10.25966/nr2c-s697
- Lodge, J. M., Howard, S., Bearman, M., Dawson, P., & Associates. (2023). *Assessment reform for the age of artificial intelligence*. TEQSA. https://www.teqsa.gov.au/sites/default/files/2023-09/assessment-reform-age-artificial-intelligence-discussion-paper.pdf

Prac-specific readings appear in section 5 of each prac, and together in [reference/reading-list.md](../reference/reading-list.md).

## GitHub repository layout (`EnvMonMod/2026/`)

| Path | Contents |
| --- | --- |
| `README.md` | Unit overview, ULOs, the learning sequence, prac index, Code Editor setup |
| `schedule-2026.md` | The 2026 timetable (2–13 Nov) and assessment dates |
| `pracs/prac01-…md` – `prac13-…md` | One page per prac: concept notes, activities, challenge questions, assessment link, reading |
| `scripts/prac00_…js` – `prac13_…js` | Code Editor scripts (the main environment), including the personal tile allocator (`prac00`) |
| `alternatives/python/`, `alternatives/r/`, `alternatives/qgis/` | Optional Python (earthengine-api + geemap), R (rgee) and QGIS versions |
| `assessments/README.md` | AT1–AT4: separate ENV306 and ENV506 briefs and rubrics; AI-resilient design |
| `reference/` | Reading list; datasets and troubleshooting |

Restricted data (crocodile survey CSV, floodplain shapefiles) are distributed via Learnline only and are never committed to the repository.
