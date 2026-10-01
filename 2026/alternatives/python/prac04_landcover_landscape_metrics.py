# %% [markdown]
# # Prac 04 (Python): land cover classification (RF, CART, SVM) and landscape metrics
# Optional Python version of `prac03a` and `prac03b`. Python lets you finish the accuracy statistics
# locally with scikit-learn (`pip install scikit-learn`).

# %%
import ee, geemap, pandas as pd
from sklearn.metrics import confusion_matrix, classification_report
import nt_common as nt
nt.init("YOUR-CLOUD-PROJECT")

# %% Predictors (Darwin–Litchfield)
aoi = ee.Geometry.Rectangle([130.60, -13.10, 131.20, -12.40])
def comp(s, e, suffix):
    c = nt.s2_sr(aoi, s, e).median().select(["B2", "B3", "B4", "B5", "B6", "B7", "B8", "B11", "B12"])
    idx = ee.Image.cat(c.normalizedDifference(["B8", "B4"]).rename("NDVI"),
                       c.normalizedDifference(["B3", "B11"]).rename("MNDWI"),
                       c.normalizedDifference(["B11", "B8"]).rename("NDBI"))
    out = c.addBands(idx)
    return out.rename(out.bandNames().map(lambda b: ee.String(b).cat(suffix)))
dem = ee.Image("NASA/NASADEM_HGT/001").select("elevation")
X = comp("2021-05-01", "2021-09-30", "_dry").addBands(comp("2021-03-01", "2021-04-30", "_wet")) \
    .addBands(dem).addBands(ee.Terrain.slope(dem)).clip(aoi)
bands = X.bandNames()

# %% Labels (WorldCover teaching shortcut) and samples
wc = ee.ImageCollection("ESA/WorldCover/v200").first().clip(aoi)
labels = wc.remap([10, 20, 30, 40, 50, 60, 80, 90, 95], [0, 1, 1, 2, 3, 4, 5, 1, 6]).rename("class")
names = ["Tree", "Shrub/grass", "Cropland", "Built", "Bare", "Water", "Mangrove"]
samples = X.addBands(labels).stratifiedSample(numPoints=300, classBand="class", region=aoi, scale=10,
                                              seed=42, geometries=True, tileScale=4).randomColumn("r", 7)
train, test = samples.filter(ee.Filter.lt("r", 0.7)), samples.filter(ee.Filter.gte("r", 0.7))

# %% Train three classifiers (standardise for SVM)
rf = ee.Classifier.smileRandomForest(numberOfTrees=200, seed=1).train(train, "class", bands)
cart = ee.Classifier.smileCart(minLeafPopulation=5).train(train, "class", bands)
mu = X.reduceRegion(ee.Reducer.mean(), aoi, 100, maxPixels=1e10)
sd = X.reduceRegion(ee.Reducer.stdDev(), aoi, 100, maxPixels=1e10)
Xz = X.subtract(ee.Image.constant(mu.values(bands)).rename(bands)).divide(ee.Image.constant(sd.values(bands)).rename(bands))
sz = Xz.addBands(labels).sampleRegions(collection=samples.select(["class", "r"]), properties=["class", "r"], scale=10, tileScale=4)
svm = ee.Classifier.libsvm(kernelType="RBF", gamma=0.05, cost=10).train(sz.filter(ee.Filter.lt("r", 0.7)), "class", bands)

# %% Accuracy with scikit-learn
for name, clf, ts in [("RF", rf, test), ("CART", cart, test), ("SVM", svm, sz.filter(ee.Filter.gte("r", 0.7)))]:
    df = nt.fc_to_df(ts.classify(clf).select(["class", "classification"]))
    print(f"\n=== {name} ===")
    print(classification_report(df["class"], df["classification"], target_names=names, zero_division=0))
print(pd.Series(ee.Dictionary(rf.explain().get("importance")).getInfo()).sort_values(ascending=False).head(10))

m = geemap.Map(center=[-12.75, 130.9], zoom=10)
m.addLayer(X.classify(rf), {"min": 0, "max": 6, "palette": ["#006400", "#ffbb22", "#f096ff", "#fa0000", "#b4b4b4", "#0064c8", "#00cf75"]}, "RF")
m

# %% 3.2 Landscape metrics: woodland habitat, Douglas–Daly, 2017 vs 2024
aoi2 = ee.Geometry.Rectangle([131.05, -14.05, 131.45, -13.65])
proj = ee.Projection("EPSG:32752").atScale(30)
def habitat(year):
    lc = ee.ImageCollection("GOOGLE/DYNAMICWORLD/V1").filterBounds(aoi2).filterDate(f"{year}-05-01", f"{year}-09-30") \
        .select("label").mode().clip(aoi2)
    return lc.eq(1).Or(lc.eq(5)).reproject(proj)
def metrics(hab):
    p = hab.selfMask().reduceToVectors(geometry=aoi2, crs=proj, geometryType="polygon", eightConnected=True,
                                       maxPixels=1e10, tileScale=4)
    p = p.map(lambda f: f.set({"area_ha": f.area(1).divide(1e4), "perim_m": f.perimeter(1)}))
    tot = ee.Number(aoi2.area(1)).divide(1e4)
    habha = ee.Number(p.aggregate_sum("area_ha"))
    return ee.Dictionary({"PLAND_pct": habha.divide(tot).multiply(100), "NP": p.size(),
                          "MPS_ha": habha.divide(p.size()),
                          "LPI_pct": ee.Number(p.aggregate_max("area_ha")).divide(tot).multiply(100),
                          "ED_m_per_ha": ee.Number(p.aggregate_sum("perim_m")).divide(tot)}).getInfo()
print(pd.DataFrame({"2017": metrics(habitat(2017)), "2024": metrics(habitat(2024))}))
