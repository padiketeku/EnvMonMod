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

**SAR units in this unit: dB to look, linear to compute.** Sentinel-1 values in GEE are stored in dB, so they are negative. Backscatter is a power, and dB is a logarithm of it, so averaging or filtering dB values gives the wrong answer (the mean of −10 dB and −20 dB is −15 dB in dB, but −12.6 dB in power). Every script therefore converts to linear σ⁰ first, and uses dB only for map layers and chart axes:

```latex
\sigma^0_{\mathrm{lin}}=10^{\,\sigma^0_{\mathrm{dB}}/10}\qquad \sigma^0_{\mathrm{dB}}=10\log_{10}\sigma^0_{\mathrm{lin}}\qquad \text{ratio}=\frac{\sigma^0_{\mathrm{after}}}{\sigma^0_{\mathrm{before}}}\;(\text{shown as }10\log_{10}\text{ratio dB})
```

Composites, speckle filters, ratios, standard deviations, regression predictors and areas all use linear values. Thresholds quoted in dB are converted before use: a 3 dB drop is a linear ratio of 0.50, and −16 dB is 0.025. A darker, wetter "after" image gives a ratio below 1. Medians and minima are the same in either unit, but means, standard deviations and ratios are not.

### Water in NT landscapes

**Hydrological connectivity.** Water links NT landscapes: monsoonal floods connect rivers to floodplains and billabongs, and tides connect mangroves to saltpans. Connectivity governs the movement of fish, sediment, nutrients and salt. Floodplains of the Mary River and Kakadu are internationally important wetlands, threatened by saltwater intrusion and weeds.

**Optical water indices.**

```latex
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

---

[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 07](prac07-fire-regime-burn-severity-frequency-and-seasonality.md) · [Prac 09 →](prac09-crocodile-biomass-modelling-with-sar-floodplain-inundation.md)
