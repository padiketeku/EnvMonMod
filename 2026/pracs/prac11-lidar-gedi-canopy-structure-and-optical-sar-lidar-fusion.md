[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 10](prac10-urban-sprawl-detection-with-sentinel-1.md) · [Prac 12 →](prac12-species-distribution-modelling-gouldian-finch.md)

# Prac 11: Lidar: GEDI canopy structure and optical–SAR–lidar fusion

**When:** Tue 10 Nov 2026, Sessions 3–4 · **Script:** [`prac11_lidar_gedi_canopy.js`](../scripts/prac11_lidar_gedi_canopy.js) · **ULOs:** 1, 2, 3, 4

**Also available in:** Python [`prac11_lidar_gedi_canopy.py`](../alternatives/python/prac11_lidar_gedi_canopy.py) · R [`prac11_lidar_gedi_canopy.R`](../alternatives/r/prac11_lidar_gedi_canopy.R) · QGIS [recipe](../alternatives/qgis/README.md). The Code Editor remains the main environment.

**Purpose.** Complete the three data families: after optical (Pracs 01–07) and SAR (Pracs 08–10), measure vegetation height directly, then combine all three sensors.

## 1. Concept notes

**Lidar** times laser pulses to reconstruct **3-D vegetation structure**: canopy height, vertical layering, cover and, through allometry, biomass.

| Platform | Example | Coverage | Use |
| --- | --- | --- | --- |
| Airborne (ALS) | NT and Geoscience Australia surveys (ELVIS portal) | Full coverage, < 1 m point spacing, small areas | Detailed canopy and terrain models; validation |
| Spaceborne waveform | GEDI on the International Space Station (2019–2023, resumed 2024) | \~25 m footprints along tracks, 51.6° N–S | Height (rh metrics), cover, biomass |
| Spaceborne photon-counting | ICESat-2 | Global tracks | Height profiles (not in the GEE catalogue) |

**GEDI in GEE.**

- **L2A:** relative-height metrics. `rh98` is the height below which 98 % of returned energy lies, a proxy for canopy top height.
- **L2B:** cover and plant area index.
- **L4A:** footprint aboveground biomass density (Mg/ha).
- **L4B:** 1 km gridded mean biomass.

Filter with `quality_flag = 1`, `degrade_flag = 0` and `sensitivity > 0.95`.

**Why fuse sensors?** GEDI samples footprints, not every pixel. Wall-to-wall maps come from training a model on GEDI heights with predictors that cover every pixel:

- **optical** (greenness, moisture);
- **C-band SAR** (canopy volume);
- **L-band SAR** (branches and trunks; less saturation);
- **terrain**.

This is the logic behind global canopy height products (Potapov et al., 2021; Lang et al., 2023), and it reuses the Random Forest workflow from Prac 04, now in regression mode.

**Landscape relevance.** Savanna structure varies along the NT rainfall gradient (Prac 03). It shapes fire behaviour (Prac 07), habitat such as hollow-bearing trees (Prac 12), and the carbon stocks used in savanna-burning accounting.

## 2. Practical activities

**Activity 11.1 – Explore GEDI (Session 3).**

1. Display quality-filtered `rh98` and L4A biomass footprints for Darwin–Litchfield, and the L4B 1 km biomass for the NT.
2. Summarise rh98 (median, 90th percentile, footprint count) at Darwin, Katherine, Daly Waters and Tennant Creek, and chart canopy height along the rainfall gradient.

**Activity 11.2 – Sensor fusion (Sessions 3–4).**

1. Build predictors: Sentinel-2 bands, NDVI and NDMI; Sentinel-1 VV, VH and VH/VV; ALOS PALSAR-2 HH/HV, all in linear units (shown in dB on the map); elevation and slope.
2. Train RF regression on GEDI footprints with optical-only, SAR-only, and optical + SAR + terrain predictors. Compare RMSE and R².
3. Predict canopy height at 10 m, and plot observed vs predicted values.
4. **Your tile:** summarise GEDI footprints in your Daly tile, and judge what canopy height adds to your AT4 assessment (Part 4).

**Key code** (an excerpt from [`prac11_lidar_gedi_canopy.js`](../scripts/prac11_lidar_gedi_canopy.js); run the full script for the complete workflow):

```javascript
// GEDI canopy height (rh98) as training data for wall-to-wall Random Forest regression
// (predictors stacks Sentinel-2, linear Sentinel-1 and PALSAR-2, and terrain, as in the script)
var aoi = ee.Geometry.Rectangle([130.90, -13.10, 131.50, -12.50]);
var gedi = ee.ImageCollection('LARSE/GEDI/GEDI02_A_002_MONTHLY').filterBounds(aoi)
  .map(function(img) {
    return img.updateMask(img.select('quality_flag').eq(1)).updateMask(img.select('degrade_flag').eq(0))
      .updateMask(img.select('sensitivity').gt(0.95));
  }).select('rh98').mosaic().rename('height');
var samples = predictors.addBands(gedi).sample({region: aoi, scale: 25, numPixels: 20000, seed: 1, tileScale: 4})
  .filter(ee.Filter.notNull(['height']));
var rf = ee.Classifier.smileRandomForest({numberOfTrees: 200, minLeafPopulation: 5, seed: 1})
  .setOutputMode('REGRESSION').train(samples, 'height', predictors.bandNames());
Map.addLayer(predictors.classify(rf), {min: 0, max: 30, palette: ['#ffffcc', '#78c679', '#006837']}, 'Canopy height (m)');
```

## 3. Challenge questions (knowledge check)

**Core**

1. How do lidar, SAR and optical sensors "see" vegetation differently (height, structure and moisture, greenness)?
2. How does canopy height change along the rainfall gradient? Link this to savanna structure and fire.
3. Which sensor combination predicts height best? Why does L-band help more than C-band in woodland?
4. Where does the model under-predict tall riparian forest? Explain this in terms of saturation.

**Extension (ENV506)**

1. GEDI geolocation error is about 10 m. Test whether aggregating predictors to 30 m improves the model, and explain why.
2. Model GEDI L4A biomass instead of height, and discuss its use and limits for savanna carbon accounting.
3. Design an airborne-lidar validation of the map: sampling, error metrics and the cost–benefit case.

## 4. Link to summative assessment

- **AT4 Part 4:** summarise GEDI canopy height or biomass by land cover class in your tile; ENV506 students meet the multi-sensor requirement here.
- **AT1:** every proposal must justify its choice of optical, SAR and lidar data. This prac gives the basis for that choice.

## 5. Reading

- Dubayah, R., et al. (2020). The Global Ecosystem Dynamics Investigation: High-resolution laser ranging of the Earth's forests and topography. *Science of Remote Sensing, 1*, 100002. https://doi.org/10.1016/j.srs.2020.100002
- Potapov, P., et al. (2021). Mapping global forest canopy height through integration of GEDI and Landsat data. *Remote Sensing of Environment, 253*, 112165. https://doi.org/10.1016/j.rse.2020.112165
- Lang, N., Jetz, W., Schindler, K., & Wegner, J. D. (2023). A high-resolution canopy height model of the Earth. *Nature Ecology & Evolution, 7*, 1778–1789. https://doi.org/10.1038/s41559-023-02206-6
- Tolan, J., et al. (2024). Very high resolution canopy height maps from RGB imagery using self-supervised vision transformer and convolutional decoder trained on aerial lidar. *Remote Sensing of Environment, 300*, 113888. https://doi.org/10.1016/j.rse.2023.113888
- Shimada, M., et al. (2014). New global forest/non-forest maps from ALOS PALSAR data (2007–2010). *Remote Sensing of Environment, 155*, 13–31. https://doi.org/10.1016/j.rse.2014.04.014

---

[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 10](prac10-urban-sprawl-detection-with-sentinel-1.md) · [Prac 12 →](prac12-species-distribution-modelling-gouldian-finch.md)
