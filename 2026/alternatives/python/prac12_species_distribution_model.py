# %% [markdown]
# # Prac 12 (Python): Gouldian finch species distribution model
# Optional Python version of `prac12_species_distribution_model.js`.
# Python extras: read ALA records directly from CSV; compute ROC/AUC with scikit-learn; spatial-block CV.

# %%
import ee, geemap, pandas as pd, geopandas as gpd, numpy as np, matplotlib.pyplot as plt
from sklearn.metrics import roc_auc_score, roc_curve
import nt_common as nt
nt.init("YOUR-CLOUD-PROJECT")
NT = nt.nt_boundary(); region = NT.geometry(); SCALE = 1000

# %% Occurrences from an ALA CSV download (decimalLongitude / decimalLatitude)
occ_df = pd.read_csv("gouldian_finch_ALA.csv").dropna(subset=["decimalLongitude", "decimalLatitude"])
if "coordinateUncertaintyInMeters" in occ_df:
    occ_df = occ_df[occ_df["coordinateUncertaintyInMeters"].fillna(0) < 1000]
occ = geemap.gdf_to_ee(gpd.GeoDataFrame(occ_df[["decimalLongitude", "decimalLatitude"]],
      geometry=gpd.points_from_xy(occ_df.decimalLongitude, occ_df.decimalLatitude), crs=4326)).filterBounds(region)

# %% Predictors (same as the Code Editor version)
bio = ee.Image("WORLDCLIM/V1/BIO"); dem = ee.Image("NASA/NASADEM_HGT/001").select("elevation")
mod13 = ee.ImageCollection("MODIS/061/MOD13A3").filterDate("2015-01-01", "2025-01-01").select("NDVI")
mcd = ee.ImageCollection("MODIS/061/MCD64A1").select("BurnDate")
fires = ee.ImageCollection([mcd.filter(ee.Filter.calendarRange(y, y, "year")).max().gt(0).unmask(0) for y in range(2005, 2025)]).sum()
late = ee.ImageCollection([mcd.filter(ee.Filter.calendarRange(y, y, "year")).max().gte(213).unmask(0) for y in range(2005, 2025)]).sum()
water = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("occurrence").gt(50).unmask(0)
X = ee.Image.cat([bio.select("bio01").divide(10).rename("temp_mean"), bio.select("bio05").divide(10).rename("temp_max"),
                  bio.select("bio12").rename("rain"), bio.select("bio15").rename("rain_seas"), dem.rename("elev"),
                  ee.Terrain.slope(dem).rename("slope"), mod13.mean().multiply(1e-4).rename("ndvi"),
                  mod13.filter(ee.Filter.calendarRange(8, 10, "month")).mean().multiply(1e-4).rename("ndvi_dry"),
                  ee.ImageCollection("MODIS/061/MOD44B").filterDate("2015-01-01", "2024-12-31").select("Percent_Tree_Cover").mean().rename("tree"),
                  fires.rename("fire_freq"), late.rename("late_fire"),
                  water.fastDistanceTransform(500).sqrt().multiply(ee.Image.pixelArea().sqrt()).rename("dist_water")]) \
    .clip(region).reproject(crs="EPSG:3577", scale=SCALE)
bands = X.bandNames()

# %% Presence (thinned by distinct cell) + background, sampled in GEE then pulled locally
pres = X.sampleRegions(collection=occ.map(lambda f: f.set("pa", 1)), properties=["pa"], scale=SCALE, geometries=True)
bg = X.sample(region=region, scale=SCALE, numPixels=10000, seed=11, geometries=True).limit(5000).map(lambda f: f.set("pa", 0))
gdf = geemap.ee_to_gdf(pres.merge(bg)).dropna()
gdf = gdf.to_crs(3577); gdf["cell"] = (gdf.geometry.x // SCALE).astype(int).astype(str) + "_" + (gdf.geometry.y // SCALE).astype(int).astype(str)
gdf = pd.concat([gdf[gdf.pa == 1].drop_duplicates("cell"), gdf[gdf.pa == 0]])
# Spatial blocks of 50 km for cross-validation
gdf["block"] = (gdf.geometry.x // 50000).astype(int) * 1000 + (gdf.geometry.y // 50000).astype(int)
rng = np.random.default_rng(1); blocks = gdf.block.unique(); test_blocks = rng.choice(blocks, size=len(blocks) // 3, replace=False)
gdf["split"] = np.where(gdf.block.isin(test_blocks), "test", "train")

# %% Fit RF (probability) in GEE on the training split; evaluate AUC locally
train_fc = geemap.gdf_to_ee(gdf[gdf.split == "train"].to_crs(4326)[list(bands.getInfo()) + ["pa", "geometry"]])
rf = ee.Classifier.smileRandomForest(500, minLeafPopulation=5, seed=1).setOutputMode("PROBABILITY").train(train_fc, "pa", bands)
test_fc = geemap.gdf_to_ee(gdf[gdf.split == "test"].to_crs(4326)[list(bands.getInfo()) + ["pa", "geometry"]])
scored = nt.fc_to_df(test_fc.classify(rf, "score"))
auc = roc_auc_score(scored.pa, scored.score); print("Spatial-block test AUC (RF):", round(auc, 3))
fpr, tpr, _ = roc_curve(scored.pa, scored.score); plt.plot(fpr, tpr); plt.plot([0, 1], [0, 1], "--")
plt.title(f"ROC, spatial-block CV (AUC={auc:.2f})"); plt.xlabel("FPR"); plt.ylabel("TPR"); plt.show()

suit = X.classify(rf)
m = geemap.Map(center=[-16, 133], zoom=5)
m.addLayer(suit, {"min": 0, "max": 1, "palette": ["#f7fcf5", "#74c476", "#00441b"]}, "Suitability (RF)")
m
