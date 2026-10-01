[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 11](prac11-lidar-gedi-canopy-structure-and-optical-sar-lidar-fusion.md) · [Prac 13 →](prac13-geospatial-foundation-models-validating-alphaearth.md)

# Prac 12: Species distribution modelling: Gouldian finch

**When:** Wed 11 Nov 2026, Sessions 2–3 (article review 3 on species–landscape relationships in Session 1; poster making in Session 4; posters presented Thu 12 Nov, Session 1) · **Script:** [`prac12_species_distribution_model.js`](../scripts/prac12_species_distribution_model.js) · **ULOs:** 1, 3, 4

**Also available in:** Python [`prac12_species_distribution_model.py`](../alternatives/python/prac12_species_distribution_model.py) · R [`prac12_species_distribution_model.R`](../alternatives/r/prac12_species_distribution_model.R) · QGIS [recipe](../alternatives/qgis/README.md). The Code Editor remains the main environment.

**Purpose.** Model habitat suitability with predictors from earlier pracs (climate from Prac 03, tree cover and canopy height from Pracs 04 and 11, fire from Prac 07, water from Prac 08), then test it with spatial cross-validation and model comparison.

## 1. Concept notes

**Species distribution models (SDMs)** relate where a species occurs to environmental predictors, then predict **relative habitat suitability** across a landscape. They link landscape pattern to species and are used in threatened-species planning, reserve design and impact assessment.

| Component | In this prac |
| --- | --- |
| Response | Presence records from the Atlas of Living Australia (ALA), with **background** points instead of true absences |
| Predictors | Climate (WorldClim), terrain, NDVI (mean and dry season), MODIS tree cover, fire frequency, late-fire frequency, distance to permanent water |
| Algorithms | Random Forest (probability) and Maxent (`ee.Classifier.amnhMaxent`) |
| Evaluation | ROC curve and AUC on held-out data, random vs **spatial-block** cross-validation; variable importance |

**Gouldian finch** (*Erythrura gouldiae*) is a threatened granivore of tropical savanna. It depends on seeding grasses, hollow-bearing eucalypts for nesting, and daily access to surface water. Frequent late dry season fires and grazing reduce its food, so fire-regime predictors are ecologically relevant.

**Pitfalls.**

- **Sampling bias:** records cluster near roads and towns. Thin the records, and consider a target-group background.
- **Spatial autocorrelation:** random cross-validation inflates AUC, so use spatial blocks (Roberts et al., 2017).
- **Presence-background output:** the model gives *relative* suitability, not probability of occurrence.
- **Equilibrium:** the model assumes the species occupies all suitable habitat.
- **Transferability:** predictions to new times or places are risky.

## 2. Practical activities

**Activity 12.1 – Build and fit the model (Session 2).**

1. Download Gouldian finch records from [ala.org.au](https://www.ala.org.au) (2000 onwards, coordinate uncertainty under 1 km), and upload them via **Assets → NEW → CSV**. Edit `OCC_ASSET`.
2. Build the 12-band predictor stack at 1 km (EPSG:3577), and justify each predictor ecologically.
3. Thin presences to one per cell, draw 5,000 background points, and split 70/30.
4. Fit RF and Maxent, then compare ROC curves, AUC, variable importance and the maps.

**Activity 12.2 – Validation and model comparison (Session 3).**

1. Replace the random split with 50 km spatial blocks, and record how much AUC drops.
2. Report the mean suitability of your Daly tile, and the share of it above 0.5.
3. **Group poster:** each group changes one element and reports its effect:
   - **A:** spatial blocks vs random split.
   - **B:** target-group background.
   - **C:** predictor set without fire.
   - **D:** Maxent feature types.

## 3. Challenge questions (knowledge check)

**Core**

1. Why do SDMs use background points rather than absences with ALA data?
2. Which predictors matter most? Does that fit Gouldian finch ecology (fire, seeding grasses, water, hollows)?
3. Why does AUC drop with spatial blocks, and which estimate should a manager trust?
4. Where do RF and Maxent disagree, and why might the models over-predict near towns?
5. How could NT fire managers use the map, and what must they be told about its limits?

**Extension (ENV506)**

1. Correct sampling bias with a target-group background (other ALA savanna bird records), and compare the maps.
2. Add GEDI canopy height (Prac 11) as a proxy for hollow-bearing trees. Does it improve the model?
3. Project the model under +1.5 °C, and critique SDM transferability.

## 4. Link to summative assessment

- **AT4 elective (a), habitat suitability:** model your assigned species in the Daly River Catchment with spatial-block cross-validation, and test the effect of the clearing you mapped in Part 2.
- The poster Q&A is practice for the AT4 viva.

## 5. Reading

- Crego, R. D., Stabach, J. A., & Connette, G. (2022). Implementation of species distribution models in Google Earth Engine. *Diversity and Distributions, 28*(5), 904–916. https://doi.org/10.1111/ddi.13491
- Valavi, R., Guillera-Arroita, G., Lahoz-Monfort, J. J., & Elith, J. (2022). Predictive performance of presence-only species distribution models: A benchmark study with reproducible code. *Ecological Monographs, 92*(1), e01486. https://doi.org/10.1002/ecm.1486
- Elith, J., et al. (2011). A statistical explanation of MaxEnt for ecologists. *Diversity and Distributions, 17*, 43–57. https://doi.org/10.1111/j.1472-4642.2010.00725.x
- Roberts, D. R., et al. (2017). Cross-validation strategies for data with temporal, spatial, hierarchical, or phylogenetic structure. *Ecography, 40*, 913–929. https://doi.org/10.1111/ecog.02881
- Phillips, S. J., Anderson, R. P., & Schapire, R. E. (2006). Maximum entropy modeling of species geographic distributions. *Ecological Modelling, 190*, 231–259. https://doi.org/10.1016/j.ecolmodel.2005.03.026

---

[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 11](prac11-lidar-gedi-canopy-structure-and-optical-sar-lidar-fusion.md) · [Prac 13 →](prac13-geospatial-foundation-models-validating-alphaearth.md)
