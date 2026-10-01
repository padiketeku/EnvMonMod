[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 01](prac01-earth-engine-image-processing-fundamentals-and-vegetation-dynamics.md) · [Prac 03 →](prac03-climate-and-hydrology-drivers-rainfall-anomalies-drought-indices-lst-and-et.md)

# Prac 02: Monitoring vegetation condition: trends and seasonality

**When:** Tue 3 Nov 2026, Sessions 2–3 · **Scripts:** [`prac02a_trend_sens_mk.js`](../scripts/prac02a_trend_sens_mk.js), [`prac02b_harmonic_regression.js`](../scripts/prac02b_harmonic_regression.js) · **ULOs:** 1, 2, 3, 4

**Also available in:** Python [`prac02_05_trends_seasonality_change.py`](../alternatives/python/prac02_05_trends_seasonality_change.py) · R [`prac02_05_trends_seasonality_change.R`](../alternatives/r/prac02_05_trends_seasonality_change.R) · QGIS [recipe](../alternatives/qgis/README.md). The Code Editor remains the main environment.

**Purpose.** Find where NT vegetation is greening or browning, test whether the trends are significant, and describe seasonality. Adapted from the Earth Engine community tutorial *Monitoring forest vegetation condition* (pskoulgi).

## 1. Concept notes

**Vegetation condition** is the state of vegetation relative to what is expected for a place and season. Long time series of a vegetation index (NDVI, EVI) reveal two things:

- **Trends:** gradual change over years, such as woody thickening, degradation, clearing or recovery.
- **Seasonality:** the within-year cycle of green-up and senescence (phenology).

Separating the two is the first step in monitoring condition. In the NT, monsoonal seasonality is very strong, so a naive straight line through all observations is misleading.

**Trend analysis: Sen's slope and the Mann–Kendall test.** These are non-parametric methods. They are robust to outliers and to non-normal data, which is typical of NDVI.

```math
S=\sum_{i=1}^{n-1}\sum_{j=i+1}^{n}\operatorname{sgn}(x_j-x_i)\qquad \mathrm{Var}(S)=\frac{n(n-1)(2n+5)}{18}\qquad Z=\frac{S-\operatorname{sgn}(S)}{\sqrt{\mathrm{Var}(S)}}\qquad \beta_{Sen}=\operatorname{median}\!\left(\frac{x_j-x_i}{t_j-t_i}\right)
```

S counts increases minus decreases across all pairs of years, Z tests whether the trend is significant, and Sen's slope gives its magnitude in NDVI units per year.

**Seasonality: harmonic regression.** Model the seasonal cycle as sine and cosine waves. The amplitude says how strongly the vegetation greens and browns; the phase says *when* it peaks.

```math
\mathrm{NDVI}(t)=\beta_0+\beta_1t+\sum_{k=1}^{K}\left[\beta_{2k}\cos(2\pi kt)+\beta_{2k+1}\sin(2\pi kt)\right]\qquad A=\sqrt{\beta_2^2+\beta_3^2},\ \phi=\operatorname{atan2}(\beta_3,\beta_2)
```

**NT caveats.**

- Wet-season cloud leaves gaps, so harmonic fits rely on uneven sampling.
- Rainfall variability can masquerade as trend. RESTREND separates the climate-driven part of the signal from other drivers, and Prac 03 provides the rainfall data.
- Annual fires cause short-lived NDVI drops, which affect means but rarely long-term trends.

## 2. Practical activities

**Activity 2.1 – Trends (`prac02a`, Session 2).**

1. Build annual mean NDVI (MOD13A3) for the NT for 2001–2024.
2. Compute Sen's slope, the Mann–Kendall S statistic, Z, p-value and Kendall's tau.
3. Map significant slopes (p < 0.05), and calculate the area that is greening and browning.
4. Chart a probe pixel in the Douglas–Daly, then move the probe into **your Daly tile**.
5. **AT2:** clip the trend and significance maps to your tile, and calculate the area greening and browning.

**Activity 2.2 – Seasonality (`prac02b`, Session 3).**

1. Fit a first-order harmonic model to Landsat 8/9 NDVI (2014–2024) around the Darwin hinterland.
2. Map amplitude, phase (day of peak greenness) and the HSV seasonality composite.
3. Plot observed vs fitted values at savanna, floodplain and rural probes, then refit with `HARMONICS = 2` and compare RMSE.
4. **AT2:** fit the model in your tile, and compare amplitude and peak timing for at least two land covers.

## 3. Challenge questions (knowledge check)

**Core**

1. Why use Sen's slope and Mann–Kendall rather than ordinary least squares for NDVI?
2. Where is the NT greening or browning? Propose processes such as rainfall, woody thickening, clearing and fire.
3. What do the amplitude and phase tell a land manager about different land covers?
4. Why can a single dry-season composite not describe vegetation condition in the Top End?

**Extension (ENV506)**

1. With about 1.4 million pixels, about 5 % will be "significant" by chance. Apply a Benjamini–Hochberg false-discovery-rate correction in the Code Editor (see the script `EXT`).
2. Implement RESTREND, using NDVI residuals after regressing on rainfall from Prac 03, and compare the trend maps.
3. Fit harmonics for 2014–2018 and for 2020–2024, then map the shifts in phenology.
4. Test for serial autocorrelation, apply pre-whitening, and discuss its effect on significance.

## 4. Link to summative assessment

- **AT2:** the trend and seasonality maps of your tile are the core of your magazine article (ENV506: false-discovery-rate correction).
- **AT4 Part 3:** your AT2 results, revised after feedback, explain the drivers of change in your tile.

## 5. Reading

- Forkel, M., et al. (2013). Trend change detection in NDVI time series: Effects of inter-annual variability and methodology. *Remote Sensing, 5*(5), 2113–2144. https://doi.org/10.3390/rs5052113
- Burrell, A. L., Evans, J. P., & De Kauwe, M. G. (2020). Anthropogenic climate change has driven over 5 million km² of drylands towards desertification. *Nature Communications, 11*, 3853. https://doi.org/10.1038/s41467-020-17710-7
- Donohue, R. J., Roderick, M. L., McVicar, T. R., & Farquhar, G. D. (2013). Impact of CO₂ fertilization on maximum foliage cover across the globe's warm, arid environments. *Geophysical Research Letters, 40*, 3031–3035. https://doi.org/10.1002/grl.50563
- Ma, X., et al. (2013). Spatial patterns and temporal dynamics in savanna vegetation phenology across the North Australian Tropical Transect. *Remote Sensing of Environment, 139*, 97–115. https://doi.org/10.1016/j.rse.2013.07.030
- Earth Engine community tutorial: *Monitoring forest vegetation condition* (pskoulgi). https://developers.google.com/earth-engine/tutorials/community/forest-vegetation-condition

---

[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 01](prac01-earth-engine-image-processing-fundamentals-and-vegetation-dynamics.md) · [Prac 03 →](prac03-climate-and-hydrology-drivers-rainfall-anomalies-drought-indices-lst-and-et.md)
