[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 12](prac12-species-distribution-modelling-gouldian-finch.md)

# Prac 13: Geospatial foundation models: validating AlphaEarth

**When:** Thu 12 Nov 2026, Session 2 (introduction to geospatial foundation models), Session 3 (prac) and Session 4 (poster making); posters presented Fri 13 Nov, Session 1 · **Script:** [`prac13_alphaearth_foundation_model.js`](../scripts/prac13_alphaearth_foundation_model.js) · **ULOs:** 2, 3, 4

**Also available in:** Python [`prac13_alphaearth_foundation_model.py`](../alternatives/python/prac13_alphaearth_foundation_model.py) · R [`prac13_alphaearth_foundation_model.R`](../alternatives/r/prac13_alphaearth_foundation_model.R) · QGIS [recipe](../alternatives/qgis/README.md). The Code Editor remains the main environment.

**Purpose.** Judge a geospatial foundation model against the methods you now know: spectral classification (Prac 04), change detection (Pracs 05–06), urban SAR mapping (Prac 10) and habitat modelling (Prac 12).

## 1. Concept notes

**What is a geospatial foundation model (GeoFM)?** A foundation model is a large model pre-trained on broad data with self-supervision, and adaptable to many downstream tasks (Bommasani et al., 2021). GeoFMs are pre-trained on large volumes of satellite data and learn general-purpose representations of the land surface.

| Model | Inputs | What users get | Access |
| --- | --- | --- | --- |
| AlphaEarth Foundations (Google DeepMind, 2025) | Optical (Sentinel-2, Landsat), SAR (Sentinel-1), lidar (GEDI), climate, elevation and more | Annual 64-dimensional embeddings at 10 m (2017–2024) | GEE: `GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL` |
| Prithvi-EO-2.0 (NASA & IBM, 2024) | Multi-temporal Harmonized Landsat Sentinel-2 | Model weights to fine-tune | Hugging Face; conceptual only in this unit |

**Embeddings.** Each 10 m pixel and year has a 64-number, **unit-length** vector (bands A00–A63) that summarises its surface and its seasonal pattern. The axes have no physical meaning, but similar places have similar vectors. Because the vectors are unit length, the dot product is the cosine similarity:

```math
\cos\theta=\mathbf{e}_a\cdot\mathbf{e}_b=\sum_{i=0}^{63}e_{a,i}\,e_{b,i}\qquad (1=\text{identical},\ 0=\text{unrelated})
```

Typical uses are clustering, few-shot classification, similarity search, change detection (low similarity between years) and regression.

**Why validate?** A land manager needs evidence for *their* landscape. NT savannas, floodplains and fire dynamics may be under-represented in training data. Embeddings are also opaque, which raises questions of transparency, reproducibility and accountability when they inform regulatory decisions. Validation means testing against independent references, comparing with a conventional baseline, and checking for failure modes.

## 2. Practical activities

1. **Explore:** display three embedding axes as RGB for Darwin–Palmerston (2024), and compare vectors for mangrove, CBD and savanna with the Inspector.
2. **Cluster:** run k-means (K = 8), and cross-tabulate the clusters against WorldCover. Which classes split or merge?
3. **Few-shot classification:** build learning curves (5, 10, 25, 50, 100 labels per class) for embeddings with kNN vs Sentinel-2 with RF (the Prac 04 baseline).
4. **Similarity search:** move `refPoint` to a feature of interest (for example, a mango orchard, a solar farm or a mangrove stand), and threshold the cosine similarity. What does it find, and what does it miss?
5. **Change detection:** compute the dot product of the 2018 and 2024 embeddings, and validate it against new built-up land (Dynamic World) and your Prac 10 urban map.
6. **Your tile:** run steps 2 and 5 for your Daly tile, and compare the result with your Prac 05 transition matrix or Prac 06 clearing patches.
7. **Group poster:** validate one use-case against 20 points per class that your group digitises itself.

**Key code** (an excerpt from [`prac13_alphaearth_foundation_model.js`](../scripts/prac13_alphaearth_foundation_model.js); run the full script for the complete workflow):

```javascript
// AlphaEarth embeddings: few-shot classification and change between years
var aoi = ee.Geometry.Rectangle([130.80, -12.75, 131.30, -12.35]);
var emb = ee.ImageCollection('GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL');
function embYear(y) { return emb.filterDate(y + '-01-01', (y + 1) + '-01-01').filterBounds(aoi).mosaic().clip(aoi); }
var e2024 = embYear(2024), e2018 = embYear(2018);
// Embeddings are unit vectors, so the dot product is the cosine similarity (1 = unchanged)
var similarity = e2018.multiply(e2024).reduce('sum').rename('cosine');
Map.addLayer(similarity, {min: 0.3, max: 1, palette: ['red', 'orange', 'white']}, 'Embedding similarity 2018 vs 2024');
// Few-shot: kNN on 64 embedding bands, trained on a handful of labelled points (train25 in the script)
// var knn = ee.Classifier.smileKNN(3).train(train25, 'class', e2024.bandNames());
```

## 3. Challenge questions (knowledge check)

**Core**

1. What is an embedding? Why can't you interpret band A12 the way you interpret NIR?
2. At 5–10 labels per class, which approach wins? At 100? Why?
3. What fraction of new built-up land does the embedding change map detect? What else does it flag (fire, clearing, a wet or dry year)?
4. Name two risks of using a GeoFM trained mostly outside Australia for NT decisions.

**Extension (ENV506)**

1. Re-validate the few-shot map with independent points, and explain the difference from the WorldCover-based estimate.
2. In your Daly tile, compute omission and commission errors of embedding change against your Prac 06 clearing patches.
3. Write a 300-word position statement on when an NT regulator should accept embedding-based evidence.

## 4. Link to summative assessment

- **AT4 elective (b), foundation model:** test AlphaEarth embeddings against your Part 1 map and Part 2 change for your AlphaEarth years, with a conventional baseline.
- The poster Q&A is practice for the AT4 viva.

## 5. Reading

- Brown, C. F., Kazmierski, M. R., Pasquarella, V. J., et al. (2025). AlphaEarth Foundations: An embedding field model for accurate and efficient global mapping from sparse label data. *arXiv:2507.22291*. https://doi.org/10.48550/arXiv.2507.22291
- Google Earth Engine (2025). *Introduction to the Satellite Embedding dataset* (tutorial). https://developers.google.com/earth-engine/tutorials/community/satellite-embedding-01-introduction
- Szwarcman, D., et al. (2024). Prithvi-EO-2.0: A versatile multi-temporal foundation model for Earth observation applications. *arXiv:2412.02732*. https://arxiv.org/abs/2412.02732
- Jakubik, J., et al. (2023). Foundation models for generalist geospatial artificial intelligence. *arXiv:2310.18660*. https://arxiv.org/abs/2310.18660
- Bommasani, R., et al. (2021). On the opportunities and risks of foundation models. *arXiv:2108.07258*. https://arxiv.org/abs/2108.07258

---

[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 12](prac12-species-distribution-modelling-gouldian-finch.md)
