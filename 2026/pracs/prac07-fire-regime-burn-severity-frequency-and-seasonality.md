[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 06](prac06-monitoring-land-clearing.md) · [Prac 08 →](prac08-sar-and-water-surface-water-sentinel-1-flood-mapping-wetlands-and-mangroves.md)

# Prac 07: Fire regime: burn severity, frequency and seasonality

**When:** Fri 6 Nov 2026, Session 3 · **Scripts:** [`prac07a_dnbr_burn_severity.js`](../scripts/prac07a_dnbr_burn_severity.js), [`prac07b_fire_frequency.js`](../scripts/prac07b_fire_frequency.js) · **ULOs:** 1, 2, 3, 4

**Also available in:** Python [`prac07_fire_regime.py`](../alternatives/python/prac07_fire_regime.py) · R [`prac07_fire_regime.R`](../alternatives/r/prac07_fire_regime.R) · QGIS [recipe](../alternatives/qgis/README.md). The Code Editor remains the main environment.

**Purpose.** Map burn severity with dNBR and compare it with the NT season classes, then describe fire frequency and seasonality from MCD64A1, checked against ESA FireCCI51.

## 1. Concept notes

**Fire as a disturbance regime.** A fire regime is defined by frequency, season, intensity or severity, extent and patchiness. Northern Australian savannas are among the most fire-prone landscapes on Earth, with much of the Top End burning every one to three years.

- **Early dry season (EDS) fires** (before 1 August) are cooler and patchier.
- **Late dry season (LDS) fires** are hotter, larger and emit more greenhouse gas.

Savanna burning projects such as the West Arnhem Land Fire Abatement (WALFA) project (28,000 km²) use Indigenous-led early burning to shift fire from the LDS to the EDS. This reduces emissions and earns carbon credits ([Clean Energy Regulator](https://cer.gov.au/news-and-media/case-studies/arnhem-land-fire-abatement)).

**Burn indices.**

```math
\mathrm{NBR}=\frac{\rho_{NIR}-\rho_{SWIR2}}{\rho_{NIR}+\rho_{SWIR2}}\qquad \mathrm{dNBR}=\mathrm{NBR}_{pre}-\mathrm{NBR}_{post}\qquad \mathrm{RdNBR}=\frac{\mathrm{dNBR}}{\sqrt{|\mathrm{NBR}_{pre}|}}
```

Fire removes green leaves, so NIR falls, and exposes char and soil, so SWIR rises. The bands are B8A and B12 for Sentinel-2, and SR\_B5 and SR\_B7 for Landsat 8/9.

| dNBR | Severity class (Key & Benson, 2006) |
| --- | --- |
| < −0.25 | Enhanced regrowth, high |
| −0.25 to −0.10 | Enhanced regrowth, low |
| −0.10 to 0.10 | Unburned |
| 0.10 to 0.27 | Low |
| 0.27 to 0.44 | Moderate–low |
| 0.44 to 0.66 | Moderate–high |
| ≥ 0.66 | High |

These thresholds were calibrated in US forests. Savanna grass fires fall mostly in the low classes.

**NT season classes vs Key & Benson.** NT fire management uses season as a proxy for severity: early dry season (EDS, before 1 August) fires count as low severity and late dry season (LDS) fires as high severity. Field data back the proxy: in 719 monitored fires, most EDS fires were of very low intensity, while LDS fires were typically much more severe (Russell-Smith & Edwards, 2006). LDS fires can kill 24–55 % of tree stems (Edwards et al., 2018).

The two systems can be compared, but they classify different things:

| | NT season classes | Key & Benson dNBR classes |
| --- | --- | --- |
| What is classified | When the fire burned (a proxy for intensity) | Spectral change from pre- to post-fire imagery (the fire's effect) |
| Classes | 2: EDS = low, LDS = high | 7, from enhanced regrowth to high |
| Calibrated with | Field plots in NT savanna (leaf-scorch height) | Composite Burn Index plots in US conifer forests |
| Unit | A fire, dated by its burn day | A pixel |

A fair comparison needs three things:

- **The same classes.** Reduce Key & Benson to severe vs not severe (dNBR ≥ 0.44, i.e. moderate–high and high), and test 0.27 and 0.66.
- **Event-matched images.** One May–November image pair misses EDS fires that burned before the pre-fire image, and lets others re-green before November. That biases EDS dNBR low.
- **Agreement statistics.** A 2 × 2 table (season × severe), overall agreement, Cohen's kappa, and the share of EDS area that is severe and of LDS area that is not.

Expect only partial agreement. Grass-layer surface fires give low dNBR in any season, and EDS fires in heavy, long-unburnt fuel can be severe. In NT savanna, the pre–post difference in shortwave infrared near 1.6 µm separated severity better than dNBR (Edwards et al., 2013).

**Burned-area products.** MODIS MCD64A1 (500 m, monthly) records the day of burning, which supports frequency, seasonality and time-since-fire mapping. Northern Australia's operational product is NAFI fire scars ([firenorth.org.au](https://firenorth.org.au)).

## 2. Practical activities

**Activity 7.1 – Burn severity (`prac07a`).**

1. Build Sentinel-2 composites for 2023 in eastern Kakadu and western Arnhem Land: pre-fire (May–mid-June) and post-fire (mid-October–November).
2. Compute NBR, dNBR and RdNBR, classify severity, and tabulate area per class.
3. Overlay MODIS early and late burn dates, and compare mean dNBR for early vs late fires.

**Activity 7.1b – NT season classes vs Key & Benson (`prac07a`, Section 4b).**

1. Take each pixel's first burn date in the year from MCD64A1. Keep EDS fires that burned 11 May–14 July and LDS fires that burned 1 August–15 October.
2. Compute dNBR with event-matched windows: EDS pre 1 April–10 May, post 15–31 July; LDS pre July, post 15 October–20 November.
3. Classify with the Key & Benson thresholds, and cross-tabulate the area of each class within EDS and LDS fires.
4. Reduce to severe (dNBR ≥ 0.44) vs not severe. Report the 2 × 2 table, agreement and kappa, then repeat with 0.27 and 0.66.

**Activity 7.2 – Fire regime (`prac07b`).**

1. Build annual burned, EDS and LDS masks from MCD64A1 for 2001–2024.
2. Map fire frequency, the share of fires in the LDS, and years since the last fire across the NT.
3. Chart stacked EDS and LDS burned area per year for the NT and western Arnhem Land.
4. Summarise the fire regime of **your tile** (frequency, LDS share, last fire).
5. Compare burned area in **your tile** from MCD64A1 and ESA FireCCI51 (2001–2020), year by year, and explain where they disagree.

## 3. Challenge questions (knowledge check)

**Core**

1. Why does NBR use SWIR? What happens physically to the surface after fire?
2. Why must post-fire imagery be acquired before the first wet-season storms?
3. Why do early-season fires show low dNBR in a November image? Give two reasons.
4. Do the NT season classes (EDS = low, LDS = high) agree with the Key & Benson classes in your results? Give three reasons why they can disagree.
5. Where does fire occur most often in the NT? Relate this to rainfall and grass fuel.
6. Describe the EDS/LDS split in western Arnhem Land before and after 2006.

**Extension (ENV506)**

1. Critique the use of the Key & Benson thresholds in savanna, and propose a local calibration. Repeat Activity 7.1b for three years and three severe thresholds, give kappa with a bootstrap confidence interval, and test the SWIR (S2 B11) difference as an alternative index.
2. Build a per-fire workflow: the last clear image before the MODIS BurnDate and the first clear image after it. Quantify how dNBR changes.
3. Test for a post-2006 shift in LDS share with Mann–Kendall (Prac 02), using a BACI comparison against a non-project area.
4. Validate MCD64A1 against NAFI scars for one year (load them as an uploaded asset), and report omission and commission errors by fire size.

## 4. Link to summative assessment

- **AT4 Part 3:** characterise fire frequency and seasonality in your tile over your 10-year window (MCD64A1 checked against ESA FireCCI51), and compare burn severity classes for one fire year (Activity 7.1b).

## 5. Reading

- Russell-Smith, J., et al. (2013). Managing fire regimes in north Australian savannas: Applying Aboriginal approaches to contemporary global problems. *Frontiers in Ecology and the Environment, 11*(s1), e55–e63. https://doi.org/10.1890/120251
- Edwards, A., et al. (2021). Transforming fire management in northern Australia through successful implementation of savanna burning emissions reductions projects. *Journal of Environmental Management, 290*, 112568. https://doi.org/10.1016/j.jenvman.2021.112568
- Giglio, L., Boschetti, L., Roy, D. P., Humber, M. L., & Justice, C. O. (2018). The Collection 6 MODIS burned area mapping algorithm and product. *Remote Sensing of Environment, 217*, 72–85. https://doi.org/10.1016/j.rse.2018.08.005
- Miller, J. D., & Thode, A. E. (2007). Quantifying burn severity in a heterogeneous landscape with a relative version of the delta Normalized Burn Ratio (dNBR). *Remote Sensing of Environment, 109*, 66–80. https://doi.org/10.1016/j.rse.2006.12.006
- Key, C. H., & Benson, N. C. (2006). *Landscape assessment: Ground measure of severity and remote sensing of fire severity* (RMRS-GTR-164-CD). USDA Forest Service.
- Russell-Smith, J., & Edwards, A. C. (2006). Seasonality and fire severity in savanna landscapes of monsoonal northern Australia. *International Journal of Wildland Fire, 15*(4), 541–550. https://doi.org/10.1071/WF05111
- Edwards, A. C., Maier, S. W., Hutley, L. B., Williams, R. J., & Russell-Smith, J. (2013). Spectral analysis of fire severity in north Australian tropical savannas. *Remote Sensing of Environment, 136*, 56–65. https://doi.org/10.1016/j.rse.2013.04.013
- Edwards, A. C., Russell-Smith, J., & Maier, S. W. (2018). A comparison and validation of satellite-derived fire severity mapping techniques in fire prone north Australian savannas: Extreme fires and tree stem mortality. *Remote Sensing of Environment, 206*, 287–299. https://doi.org/10.1016/j.rse.2017.12.038

---

[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 06](prac06-monitoring-land-clearing.md) · [Prac 08 →](prac08-sar-and-water-surface-water-sentinel-1-flood-mapping-wetlands-and-mangroves.md)
