[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 02](prac02-monitoring-vegetation-condition-trends-and-seasonality.md) · [Prac 04 →](prac04-land-cover-mapping-and-landscape-metrics.md)

# Prac 03: Climate and hydrology drivers: rainfall anomalies, drought indices, LST and ET

**When:** Tue 3 Nov 2026, Session 4 (rainfall and drought) and Wed 4 Nov 2026, Session 3 (LST and ET) · **Scripts:** [`prac03a_rainfall_anomaly.js`](../scripts/prac03a_rainfall_anomaly.js), [`prac03b_drought_indices.js`](../scripts/prac03b_drought_indices.js), [`prac03c_lst_et.js`](../scripts/prac03c_lst_et.js) · **ULOs:** 1, 3, 4

**Also available in:** Python [`prac03_climate_hydrology_drought.py`](../alternatives/python/prac03_climate_hydrology_drought.py) · R [`prac03_climate_hydrology_drought.R`](../alternatives/r/prac03_climate_hydrology_drought.R) · QGIS [recipe](../alternatives/qgis/README.md). The Code Editor remains the main environment.

**Purpose.** Explain the climate drivers behind the vegetation trends of Prac 02, and supply rainfall for RESTREND. With Prac 02, this prac is the basis of AT2.

## 1. Concept notes

Vegetation condition is the state of vegetation relative to what is expected for that place and season. In the NT, condition is driven by rainfall amount and *reliability*. Mean rainfall falls from more than 1,500 mm at Darwin to less than 300 mm at Alice Springs, while variability rises southward.

**Rainfall anomalies.** An anomaly can be expressed in mm, as a % of the mean, as a z-score or as a decile. All are measured against a baseline period (WMO standard 1991–2020).

```latex
z=\frac{P-\bar P_{1991\text{–}2020}}{\sigma_{1991\text{–}2020}}
```

**Drought types and indices.**

| Drought type | What is short | Indices used here |
| --- | --- | --- |
| Meteorological | Rainfall | 3-month SPI-type index (CHIRPS) |
| Agricultural / ecological | Soil moisture, plant water | VCI, TCI, VHI, evaporative stress index |
| Hydrological | Streams, groundwater | 12-month SPI-type index, PDSI (TerraClimate) |

```latex
\mathrm{VCI}=100\frac{\mathrm{NDVI}-\mathrm{NDVI}_{min}}{\mathrm{NDVI}_{max}-\mathrm{NDVI}_{min}}\quad
\mathrm{TCI}=100\frac{\mathrm{LST}_{max}-\mathrm{LST}}{\mathrm{LST}_{max}-\mathrm{LST}_{min}}\quad
\mathrm{VHI}=0.5\,\mathrm{VCI}+0.5\,\mathrm{TCI}
```

VCI and TCI are computed per calendar month, so the normal dry season is not mistaken for drought. A VHI below 40 is conventionally classed as drought (Kogan, 1995). The year 2019 was Australia's driest on record, which makes it a useful test case.

**Land surface temperature (LST) and evapotranspiration (ET).**

- LST is the radiometric skin temperature of the surface, which differs from air temperature. Landsat thermal (100 m, resampled to 30 m) suits urban heat studies; MODIS (1 km, daily/8-day) suits regional monitoring.
- ET links the water and energy balances. The evaporative stress index is ESI = 1 − ET/PET.
- In the Daly River, dry-season flow is sustained by groundwater from limestone aquifers, which makes ET relevant to water allocation.

## 2. Practical activities

**Activity 3.1 – Rainfall anomalies (`prac03a`).**

1. Sum CHIRPS Oct–Apr rainfall for each wet season from 1981/82 to 2024/25, and chart it for Darwin, Katherine, Tennant Creek and Alice Springs.
2. Map the 1991–2020 mean and the coefficient of variation.
3. Map the 2024/25 anomaly (% of mean, z-score, decile), and chart the Alice Springs standardised anomaly series.

**Activity 3.2 – Vegetation condition and drought (`prac03b`).**

1. Compute VCI (MOD13A3), TCI (MOD11A2) and VHI for Oct 2019, plus 3- and 12-month SPI-type indices and PDSI.
2. Chart VCI, TCI and VHI for 2017–2021 around Alice Springs, and calculate the NT area with VHI below 40.
3. Change `TARGET` to a month in your AT2 focus year (AT2), and repeat for **your tile**.

**Activity 3.3 – LST and ET (`prac03c`).**

1. Part A: map Darwin build-up season LST (Landsat `ST_B10`), and plot LST against NDVI.
2. Part B: chart monthly rainfall, ET and PET for the Daly basin, then map the late-dry-season ESI and annual ET.
3. **AT2 (ENV506):** map LST and ESI for your tile in your focus year.

## 3. Challenge questions (knowledge check)

**Core**

1. Describe the NT rainfall gradient and its variability. How do these shape vegetation, fire and land use?
2. Why is a z-score better than mm for comparing Darwin and Alice Springs?
3. Where was vegetation stress greatest in Oct 2019? Do VCI and TCI agree?
4. Which SPI timescale reflects which type of drought?
5. Which Darwin land covers are hottest? Suggest two urban planning responses.
6. In which months does PET exceed rainfall in the Daly basin, and what sustains dry-season flow?

**Extension (ENV506)**

1. Implement a gamma-fitted SPI in the Code Editor (method-of-moments gamma, `gammainc`, `erfInv`; see the script `EXT`) and compare it with the z-score version.
2. CHIRPS uses sparse gauges in central Australia. Discuss the bias this introduces and how you would detect it.
3. Evaluate VHI and the SPI-type index as triggers for pastoral drought assistance, considering lag, false alarms and resolution.
4. Discuss what MOD16 ET uncertainty means for Daly River water allocation decisions.

## 4. Link to summative assessment

- **AT2:** rainfall anomalies and drought indices for your focus year explain your vegetation trends (ENV506: gamma SPI, lags, RESTREND, LST and ET).
- **AT4 Part 3:** the same driver analysis supports your attribution of change.

## 5. Reading

- Funk, C., et al. (2015). The climate hazards infrared precipitation with stations — a new environmental record for monitoring extremes. *Scientific Data, 2*, 150066. https://doi.org/10.1038/sdata.2015.66
- West, H., Quinn, N., & Horswell, M. (2019). Remote sensing for drought monitoring & impact assessment: Progress, past challenges and future opportunities. *Remote Sensing of Environment, 232*, 111291. https://doi.org/10.1016/j.rse.2019.111291
- Kogan, F. N. (1995). Application of vegetation index and brightness temperature for drought detection. *Advances in Space Research, 15*(11), 91–100.
- Abatzoglou, J. T., et al. (2018). TerraClimate, a high-resolution global dataset of monthly climate and climatic water balance from 1958–2015. *Scientific Data, 5*, 170191. https://doi.org/10.1038/sdata.2017.191
- Ermida, S. L., et al. (2020). Google Earth Engine open-source code for land surface temperature estimation from the Landsat series. *Remote Sensing, 12*(9), 1471. https://doi.org/10.3390/rs12091471
- Mu, Q., Zhao, M., & Running, S. W. (2011). Improvements to a MODIS global terrestrial evapotranspiration algorithm. *Remote Sensing of Environment, 115*, 1781–1800. https://doi.org/10.1016/j.rse.2011.02.019

---

[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 02](prac02-monitoring-vegetation-condition-trends-and-seasonality.md) · [Prac 04 →](prac04-land-cover-mapping-and-landscape-metrics.md)
