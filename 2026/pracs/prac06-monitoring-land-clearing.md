[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 05](prac05-change-detection-bi-temporal-transitions-landtrendr-and-ccdc.md) · [Prac 07 →](prac07-fire-regime-burn-severity-frequency-and-seasonality.md)

# Prac 06: Monitoring land clearing

**When:** Fri 6 Nov 2026, Session 2 · **Script:** [`prac06_land_clearing.js`](../scripts/prac06_land_clearing.js) · **ULOs:** 1, 2, 3, 4

**Also available in:** Python [`prac06_land_clearing.py`](../alternatives/python/prac06_land_clearing.py) · R [`prac06_land_clearing.R`](../alternatives/r/prac06_land_clearing.R) · QGIS [recipe](../alternatives/qgis/README.md). The Code Editor remains the main environment.

**Purpose.** Map historic and recent land clearing in the Daly River Catchment with Hansen GFC and annual Sentinel-2 detection with persistence rules, and produce clearing patches for compliance checks.

## 1. Concept notes

**Why it matters.** Clearing of native vegetation is the main driver of habitat loss and fragmentation in Australia (Evans, 2016). Much of the habitat lost for threatened species has had little regulatory scrutiny (Ward et al., 2019). In the NT, clearing generally requires approval: under the *Planning Act 1999* on freehold land, and under the *Pastoral Land Act 1992* on pastoral leases. Agricultural development in the Douglas–Daly, Katherine and Ord regions has made clearing a live policy issue. Satellite monitoring supports approvals, compliance checks and national greenhouse accounting.

**What counts as clearing?** Clearing is the removal of woody vegetation (trees and shrubs) that persists. Remote sensing must separate it from three other things:

- **Fire:** NBR and NDVI drop, then recover within one wet season.
- **Drought:** temporary greenness loss.
- **Crop and pasture cycles:** land that is already cleared changing state.

The usual tools to separate them are *persistence rules* (the low NDVI must persist into the next year), *bare-soil indices*, and a baseline mask of woody vegetation.

```math
\mathrm{BSI}=\frac{(\rho_{SWIR1}+\rho_{Red})-(\rho_{NIR}+\rho_{Blue})}{(\rho_{SWIR1}+\rho_{Red})+(\rho_{NIR}+\rho_{Blue})}
```

**Defining forest in a savanna.** Hansen Global Forest Change defines trees as vegetation taller than 5 m. The canopy-cover threshold is the user's choice, and in open woodland (10–30 % cover) that choice decides the answer.

**Minimum mapping unit (MMU).** Patches below the MMU (here 1 ha) are dropped, which reduces noise but omits small clearing.

## 2. Practical activities

**Part A – Historic loss (Hansen, 2001–2023).**

1. Map tree cover in 2000, loss and loss year at a 20 % canopy threshold, then chart loss per year.
2. Cross-check with Landsat dry-season dNDVI (2005 → 2023).
3. Re-run at 10, 30 and 50 % canopy thresholds.

**Part B – Annual clearing detection with Sentinel-2 (2018–2025).**

1. Build dry-season (Jun–Sep) composites of NDVI and BSI for each year, and a woody baseline (Dynamic World trees, 2018).
2. Apply the rules: an NDVI drop of more than 0.20, NDVI below 0.30, a BSI rise of more than 0.05, and NDVI still below 0.35 the next year. Then apply an MMU of 1 ha.
3. Chart clearing per year, vectorise the patches, and inspect the ten largest with the satellite basemap.
4. Export the patches as a shapefile and as an Earth Engine asset.
5. Run Part B for **your tile**.

## 3. Challenge questions (knowledge check)

**Core**

1. How does total Hansen loss change with the canopy threshold? What does that say about "forest" in a savanna?
2. Why is the persistence rule essential in the Top End?
3. Compare Hansen and Sentinel-2 results for 2019–2023. Where do they disagree, and why (resolution, definitions, thresholds)?
4. What replaced the woodland in the three largest patches (cropping, pasture, mining, infrastructure)?

**Extension (ENV506)**

1. Calibrate `NDVI_DROP` and `BSI_RISE` with 30 cleared and 30 uncleared points you digitise yourself, choosing the values that maximise F1.
2. Estimate area-adjusted clearing with a stratified random sample (Olofsson et al., 2014).
3. Design a monthly near-real-time clearing alert for an NT regulator. Specify the latency, MMU and acceptable false-alarm rate, and justify each against the legal and compliance context.

## 4. Link to summative assessment

- **AT4 Part 2:** map clearing and regrowth in your Daly tile over your clearing period (from `prac00`).

## 5. Reading

- Hansen, M. C., et al. (2013). High-resolution global maps of 21st-century forest cover change. *Science, 342*, 850–853. https://doi.org/10.1126/science.1244693
- Evans, M. C. (2016). Deforestation in Australia: Drivers, trends and policy responses. *Pacific Conservation Biology, 22*(2), 130–150. https://doi.org/10.1071/PC15052
- Ward, M. S., et al. (2019). Lots of loss with little scrutiny: The attrition of habitat critical for threatened species in Australia. *Conservation Science and Practice, 1*, e117. https://doi.org/10.1111/csp2.117
- Olofsson, P., et al. (2014). Good practices for estimating area and assessing accuracy of land change. *Remote Sensing of Environment, 148*, 42–57. https://doi.org/10.1016/j.rse.2014.02.015
- Brown, C. F., et al. (2022). Dynamic World, near real-time global 10 m land use land cover mapping. *Scientific Data, 9*, 251. https://doi.org/10.1038/s41597-022-01307-4

---

[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 05](prac05-change-detection-bi-temporal-transitions-landtrendr-and-ccdc.md) · [Prac 07 →](prac07-fire-regime-burn-severity-frequency-and-seasonality.md)
