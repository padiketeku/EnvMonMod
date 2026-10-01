# %% [markdown]
# # Prac 13 (Python): validating AlphaEarth satellite embeddings
# Optional Python version of `prac13_alphaearth_foundation_model.js`.
# Python extra: download a sample of embeddings and explore them with scikit-learn (PCA, t-SNE, kNN curves).

# %%
import ee, geemap, pandas as pd, matplotlib.pyplot as plt
from sklearn.neighbors import KNeighborsClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import nt_common as nt
nt.init("YOUR-CLOUD-PROJECT")
aoi = ee.Geometry.Rectangle([130.80, -12.75, 131.30, -12.35])
emb = ee.ImageCollection("GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL")
E = lambda y: emb.filterDate(f"{y}-01-01", f"{y+1}-01-01").filterBounds(aoi).mosaic().clip(aoi)
e24, e18 = E(2024), E(2018)
A = [f"A{i:02d}" for i in range(64)]

# %% Sample embeddings + S2 bands + WorldCover labels, then learning curves locally
wc = ee.ImageCollection("ESA/WorldCover/v200").first().clip(aoi)
labels = wc.remap([10, 20, 30, 40, 50, 60, 80, 90, 95], [0, 1, 1, 2, 3, 4, 5, 1, 0]).rename("class")
s2 = nt.s2_sr(aoi, "2024-05-01", "2024-09-30").median().select(["B2", "B3", "B4", "B5", "B6", "B7", "B8", "B11", "B12"])
pool = nt.fc_to_df(e24.addBands(s2).addBands(labels).stratifiedSample(
    numPoints=400, classBand="class", region=aoi, scale=10, seed=7, tileScale=4)).dropna()
test = pool.sample(frac=0.4, random_state=9); trainpool = pool.drop(test.index)
S2B = ["B2", "B3", "B4", "B5", "B6", "B7", "B8", "B11", "B12"]
rows = []
for n in [5, 10, 25, 50, 100]:
    tr = trainpool.groupby("class").head(n)
    accE = accuracy_score(test["class"], KNeighborsClassifier(3).fit(tr[A], tr["class"]).predict(test[A]))
    accS = accuracy_score(test["class"], RandomForestClassifier(100, random_state=1).fit(tr[S2B], tr["class"]).predict(test[S2B]))
    rows.append({"labels_per_class": n, "embeddings_kNN": accE, "S2_RF": accS})
curve = pd.DataFrame(rows).set_index("labels_per_class"); print(curve)
curve.plot(logx=True, marker="o", title="Accuracy vs labels per class"); plt.show()

# %% Clustering in GEE and change detection (dot product 2018 vs 2024)
clusters = e24.cluster(ee.Clusterer.wekaKMeans(8).train(e24.sample(region=aoi, scale=10, numPixels=5000, seed=1)))
change = e18.multiply(e24).reduce("sum").rename("cosine_2018_2024")
m = geemap.Map(center=[-12.5, 131.0], zoom=11)
m.addLayer(e24, {"bands": ["A01", "A16", "A09"], "min": -0.3, "max": 0.3}, "Embedding 2024")
m.addLayer(clusters.randomVisualizer(), {}, "k-means (8)")
m.addLayer(change, {"min": 0.3, "max": 1, "palette": ["red", "orange", "white"]}, "Similarity 2018 vs 2024")
m

# %% Similarity search from a reference point
ref = e24.reduceRegion(ee.Reducer.mean(), ee.Geometry.Point([131.05, -12.55]).buffer(30), 10)
sim = e24.multiply(ee.Image.constant(ref.values(A)).rename(A)).reduce("sum")
m.addLayer(sim.gt(0.9).selfMask(), {"palette": "magenta"}, "Similarity > 0.9")
