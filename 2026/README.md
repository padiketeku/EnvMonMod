# ENV306/506 Environmental Monitoring and Modelling

**Charles Darwin University · Intensive mode · Monday 2 November – Friday 13 November 2026 · 9:00 am – 4:30 pm daily**

ENV306 (AQF 7, undergraduate) and ENV506 (AQF 9, postgraduate) are taught together as one intensive from **Mon 2 Nov to Fri 13 Nov 2026, 9:00 am – 4:30 pm**. The unit teaches landscape ecology, digital image processing and spatial modelling through Northern Territory (NT) case studies. **The Google Earth Engine (GEE) Code Editor is the main environment, so there is nothing to install. Optional Python (earthengine-api + geemap), R (rgee) and QGIS (Earth Engine plugin + GRASS/SAGA/dzetsaka) versions of every prac are in [`alternatives/`](alternatives).**

| Data family | Sensors | Pracs |
| --- | --- | --- |
| **Optical** (passive, reflected sunlight) | Landsat 5/7/8/9, Sentinel-2, MODIS | 01–08, 13 (and as predictors in 09–12) |
| **SAR** (active microwave, all-weather) | Sentinel-1 C-band, ALOS PALSAR-2 L-band | 08, 09, 10, 11 |
| **Lidar** (active laser, 3-D structure) | GEDI spaceborne waveform lidar | 11 (and in the AlphaEarth inputs, Prac 13) |

## Unit learning outcomes

| ULO | Statement |
| --- | --- |
| 1 | Understand the basic concepts of landscape ecology and its relevance to environmental management. |
| 2 | Understand the principles of image enhancement, image management, image rectification and registration, image transformation, image analysis and image classification techniques. |
| 3 | Apply these techniques to a variety of natural and environmental resource management issues, enabling students to evaluate spatial technologies and their role in assisting policy and decision making. |
| 4 | Acquire technical competency in the use of digital image processing, GIS and spatial pattern analysis techniques. |

ENV306 students complete the **Core** activities and questions. ENV506 students also complete the **Extension (ENV506)** items, which require critique, independent design, uncertainty quantification and synthesis with the literature. ENV506 students also sit their own, more demanding version of each of the four assessments.

## How each prac is organised

1. **Concept notes:** the theory, key formulas and NT context.
2. **Practical activities:** step-by-step, hands-on work in the Code Editor with a ready-to-run script.
3. **Challenge questions (knowledge check):** Core questions for everyone, plus Extension (ENV506) questions.
4. **Link to summative assessment:** how the prac feeds AT1–AT4.
5. **Reading:** recent, findable references with DOIs or stable links.

Scripts follow the layout **1 Study area → 2 Data → 3 Processing → 4 Analysis → 5 Visualise → 6 Export**. Core questions appear as `// Q:` comments and ENV506 extensions as `// EXT:`. Students save their own copy in their Code Editor **Owner** repository, because the version history is assessment evidence.

## The learning sequence

The course moves from tools to drivers, then to change, sensors and finally models. Each prac uses skills from the one before. The full timetable is in [schedule-2026.md](schedule-2026.md).

| Stage | Pracs | Question it answers |
| --- | --- | --- |
| 1 Foundations | 01 | How do I get, process and read satellite images in Earth Engine? |
| 2 Vegetation condition and its drivers | 02, 03 | Is the vegetation changing (trends, seasonality), and how do rainfall, drought, heat and water use explain it? |
| 3 Pattern and change | 04, 05 | What is where (land cover, landscape pattern), and what changed between dates and over decades? |
| 4 Disturbance applications | 06, 07 | How much clearing and fire, and where and when? |
| 5 Beyond optical: SAR and lidar | 08, 09, 10, 11 | How do radar and lidar see water, floodplains, cities and canopy structure? |
| 6 Modelling and AI | 12, 13 | Where is suitable habitat, and can foundation models do this better or faster? |

## Practicals in teaching order

| Prac | Topic | Scripts |
| --- | --- | --- |
| [01](pracs/prac01-earth-engine-image-processing-fundamentals-and-vegetation-dynamics.md) | Earth Engine, image processing fundamentals, vegetation dynamics | `prac00`, `prac01a`–`c` |
| [02](pracs/prac02-monitoring-vegetation-condition-trends-and-seasonality.md) | Vegetation condition: trends (Sen's slope, Mann–Kendall) and seasonality (harmonic regression) (AT2) | `prac02a`, `prac02b` |
| [03](pracs/prac03-climate-and-hydrology-drivers-rainfall-anomalies-drought-indices-lst-and-et.md) | Climate and hydrology drivers: rainfall anomalies, drought indices, LST, ET (AT2) | `prac03a`–`c` |
| [04](pracs/prac04-land-cover-mapping-and-landscape-metrics.md) | Land cover mapping (RF, CART, SVM) and landscape metrics (AT3 input; AT4 Part 1) | `prac04a`, `prac04b` |
| [05](pracs/prac05-change-detection-bi-temporal-transitions-landtrendr-and-ccdc.md) | Change detection: transition matrix (AT3), LandTrendr, CCDC (AT4 Part 2) | `prac05a`, `prac05b` |
| [06](pracs/prac06-monitoring-land-clearing.md) | Monitoring land clearing (AT4 Part 2) | `prac06` |
| [07](pracs/prac07-fire-regime-burn-severity-frequency-and-seasonality.md) | Fire regime: severity, frequency, seasonality (AT4 Part 3) | `prac07a`, `prac07b` |
| [08](pracs/prac08-sar-and-water-surface-water-sentinel-1-flood-mapping-wetlands-and-mangroves.md) | SAR and water: surface water, Sentinel-1 floods, wetlands, mangroves (AT4 Part 4) | `prac08a`–`c` |
| [09](pracs/prac09-crocodile-biomass-modelling-with-sar-floodplain-inundation.md) | Crocodile biomass modelling (AT4 elective) | `prac09` |
| [10](pracs/prac10-urban-sprawl-detection-with-sentinel-1.md) | Urban sprawl with Sentinel-1 (AT4 elective) | `prac10` |
| [11](pracs/prac11-lidar-gedi-canopy-structure-and-optical-sar-lidar-fusion.md) | Lidar: GEDI canopy structure and sensor fusion (AT4 Part 4) | `prac11` |
| [12](pracs/prac12-species-distribution-modelling-gouldian-finch.md) | Species distribution modelling (AT4 elective) | `prac12` |
| [13](pracs/prac13-geospatial-foundation-models-validating-alphaearth.md) | Geospatial foundation models: validating AlphaEarth (AT4 elective) | `prac13` |

Code Editor scripts are in [`scripts/`](scripts). Run [`prac00_my_study_tile.js`](scripts/prac00_my_study_tile.js) first (Prac 01, Session 4) to get your personal Daly tile, years and AT4 parameters.

- **Summative assessments** (AT1–AT4, ENV306 and ENV506 versions, AI-resilient design): [assessments/README.md](assessments/README.md)
- **Reading list:** [reference/reading-list.md](reference/reading-list.md)
- **Datasets and troubleshooting:** [reference/datasets-and-troubleshooting.md](reference/datasets-and-troubleshooting.md)
- **Python, R and QGIS options:** [alternatives/README.md](alternatives/README.md)

## How the unit is designed

- **A logical sequence:** foundations, then vegetation condition and its climate drivers, then pattern and change, disturbance, SAR and lidar, and finally modelling and AI. SAR flood mapping (Prac 08) is taught before it is applied to crocodiles (Prac 09) and cities (Prac 10). AlphaEarth comes last, so it is judged against methods students already know.
- **NT throughout:** every prac uses Northern Territory case studies.
- **Three data families:** optical, SAR and lidar, combined in Prac 11 and in AT4.
- **Rigorous science:** significance testing, accuracy assessment, spatial cross-validation and uncertainty run through every prac.
- **Assessment as a chain:** AT2 (drivers), AT3 (change) and AT4 (integration) all use the student's own tile, and are verified by check values, version history, a supervised AT3 and an ungraded verification check (viva). ENV506 versions are more demanding.
- **Choice of environment:** optional Python, R and QGIS versions; the Code Editor remains the main environment.
- **Consistent structure:** every prac has concept notes, activities, challenge questions, an assessment link and recent readings.

## Getting the scripts into the Code Editor

1. Sign up for Earth Engine with a Google account and select or create a Cloud project (noncommercial and academic use is free).
2. Open the shared course repository in the Code Editor (**Scripts → Reader**), or create a new script and paste in any file from [`scripts/`](scripts). Each prac page also ends with a **Full scripts** section holding a copy of every script for that prac.
3. **Save as** your own copy in your **Owner** repository before editing. The Code Editor version history is assessment evidence.
4. Create a Google Drive folder called `GEE_NT`. All exports go there.

## Licence and data

The course materials are for teaching use at CDU. Datasets belong to their providers (see the Earth Engine catalogue pages).
**Restricted data:** the crocodile survey data (`croc-biomass-data.csv`) and the river floodplain shapefiles (`flooded_areas_shapefiles.zip`) for Prac 09 are distributed through **Learnline only**. They are not in this repository; do not commit or share them publicly. Students upload them to their own Earth Engine assets (Activity 9.0).
