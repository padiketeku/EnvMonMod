[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 03](prac03-climate-and-hydrology-drivers-rainfall-anomalies-drought-indices-lst-and-et.md) · [Prac 05 →](prac05-change-detection-bi-temporal-transitions-landtrendr-and-ccdc.md)

# Prac 04: Land cover mapping and landscape metrics

**When:** Wed 4 Nov 2026, Sessions 1–2 · **Scripts:** [`prac04a_landcover_classification.js`](../scripts/prac04a_landcover_classification.js), [`prac04b_landscape_metrics.js`](../scripts/prac04b_landscape_metrics.js) · **ULOs:** 1, 2, 3, 4

**Also available in:** Python [`prac04_landcover_landscape_metrics.py`](../alternatives/python/prac04_landcover_landscape_metrics.py) · R [`prac04_landcover_landscape_metrics.R`](../alternatives/r/prac04_landcover_landscape_metrics.R) · QGIS [recipe](../alternatives/qgis/README.md). The Code Editor remains the main environment.

**Purpose.** Classify land cover with RF, CART and SVM, assess accuracy, and quantify landscape pattern with metrics, first for a teaching area and then for your own Daly tile.

## 1. Concept notes

### 1.1 Image classification

Supervised classification assigns every pixel to a class, using training samples of known class and predictor features: spectral bands, indices, seasonal composites, SAR backscatter and terrain.

| Classifier | How it works | Strengths | Watch out for |
| --- | --- | --- | --- |
| CART | A single decision tree that splits predictors at thresholds | Interpretable; fast | Overfits; unstable |
| Random Forest (RF) | Many trees on bootstrap samples and random predictor subsets, combined by majority vote | Robust; variable importance; no scaling needed | Inflated accuracy with spatially clustered samples |
| Support vector machine (SVM) | Maximum-margin boundary; the RBF kernel allows curved boundaries | Strong with small training sets | Standardise inputs; tune `gamma` and `cost` |

### 1.2 Accuracy assessment

- **Error (confusion) matrix:** rows = reference, columns = map.
- **Overall accuracy;** **producer's accuracy** = 1 − omission error; **user's accuracy** = 1 − commission error; F1.
- Kappa is reported by convention but is widely criticised (Pontius & Millones, 2011).
- **Good practice** (Olofsson et al., 2014): use a probability-based sample and report *area-adjusted* accuracy and area estimates with confidence intervals.

```math
\hat{p}_{\cdot k}=\sum_i W_i\frac{n_{ik}}{n_{i\cdot}} \qquad \hat{A}_k=A_{tot}\,\hat{p}_{\cdot k} \qquad W_i=\text{mapped area proportion of class } i
```

### 1.3 Spatial pattern analysis: landscape metrics

| Metric | Meaning |
| --- | --- |
| PLAND (%) | Share of the landscape occupied by a class |
| NP; MPS | Number of patches; mean patch size |
| LPI (%) | Largest patch as a share of the landscape |
| ED (m/ha) | Edge density |
| Core area | Habitat beyond an edge-effect distance |
| Isolation | Distance to the nearest habitat |
| Shannon diversity (H) | Local heterogeneity, −Σ p ln p |

*Habitat loss* reduces PLAND. *Fragmentation per se* breaks habitat into more, smaller and more isolated patches: NP and ED rise while MPS, LPI and core area fall. Metrics depend on grain, extent, the classification and the neighbour rule. This is why landscape ecologists report the scale of analysis.

## 2. Practical activities

**Activity 4.1 – Classification (`prac04a`), Darwin–Litchfield.**

1. Build predictors: Sentinel-2 dry and late-wet composites, NDVI, MNDWI, NDBI, elevation and slope.
2. Sample 300 points per class (7 classes, including mangrove) from WorldCover, a teaching shortcut, then split 70/30.
3. Train RF, CART and SVM; for SVM, standardise the inputs first. Compare confusion matrices, F1 and RF importance.
4. **Required:** digitise at least 30 polygons of your own with the geometry tools (section 2b), retrain RF and compare.

**Activity 4.2 – Landscape metrics (`prac04b`), Douglas–Daly.**

1. Define woodland habitat (Dynamic World trees + shrub). Compute PLAND, NP, MPS, LPI, ED, core area, isolation and Shannon H for 2017 and 2024.
2. Map habitat lost, edge, core and isolation, and chart the patch-size distribution.
3. Re-run at 10, 30 and 90 m grain and tabulate how each metric responds.
4. Repeat the 2017 vs 2024 comparison for **your tile**.

## 3. Challenge questions (knowledge check)

**Core**

1. Which classifier is most accurate here? Which two classes are confused most, and why spectrally?
2. Explain producer's vs user's accuracy using the mangrove class.
3. Why does SVM need standardised inputs but RF does not?
4. Did the Douglas–Daly experience habitat loss, fragmentation, or both? Use three metrics to justify your answer.
5. Which metrics are most sensitive to grain, and why?

**Extension (ENV506)**

1. Validating against WorldCover measures *agreement*, not accuracy. Design a stratified random sample, interpret it in the Code Editor, and report area-adjusted accuracy with 95 % CIs.
2. Compare a random train/test split with spatially blocked splits (5 km blocks), and explain the difference using spatial autocorrelation.
3. Tune RF and SVM by grid search, and report the validation curve.
4. Test how sensitive the metrics are to the Dynamic World probability threshold (0.4, 0.5, 0.6), and write a 300-word briefing for an NT clearing-assessment officer on which metrics to report.

## 4. Link to summative assessment

- **AT4 Part 1:** classify **your Daly tile** with your own training and validation points; report the error matrix, producer's and user's accuracy, area per class and at least two landscape metrics (ENV506: area-adjusted accuracy with 95 % confidence intervals).
- **AT3:** keep your training points; they are reused in Prac 05a.

## 5. Reading

- Belgiu, M., & Drăguţ, L. (2016). Random forest in remote sensing: A review of applications and future directions. *ISPRS Journal of Photogrammetry and Remote Sensing, 114*, 24–31. https://doi.org/10.1016/j.isprsjprs.2016.01.011
- Maxwell, A. E., Warner, T. A., & Fang, F. (2018). Implementation of machine-learning classification in remote sensing: An applied review. *International Journal of Remote Sensing, 39*(9), 2784–2817. https://doi.org/10.1080/01431161.2018.1433343
- Olofsson, P., et al. (2014). Good practices for estimating area and assessing accuracy of land change. *Remote Sensing of Environment, 148*, 42–57. https://doi.org/10.1016/j.rse.2014.02.015
- Pontius, R. G., & Millones, M. (2011). Death to Kappa. *International Journal of Remote Sensing, 32*(15), 4407–4429. https://doi.org/10.1080/01431161.2011.552923
- Brown, C. F., et al. (2022). Dynamic World, near real-time global 10 m land use land cover mapping. *Scientific Data, 9*, 251. https://doi.org/10.1038/s41597-022-01307-4
- Zanaga, D., et al. (2022). *ESA WorldCover 10 m 2021 v200*. Zenodo. https://doi.org/10.5281/zenodo.7254221
- Hesselbarth, M. H. K., et al. (2019). landscapemetrics: An open-source R tool to calculate landscape metrics. *Ecography, 42*, 1648–1657. https://doi.org/10.1111/ecog.04617 (concepts and metric definitions)

---

[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 03](prac03-climate-and-hydrology-drivers-rainfall-anomalies-drought-indices-lst-and-et.md) · [Prac 05 →](prac05-change-detection-bi-temporal-transitions-landtrendr-and-ccdc.md)
