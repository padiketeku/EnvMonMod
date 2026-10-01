# %% [markdown]
# # Prac 11 (Python): GEDI lidar canopy height and optical–SAR–lidar fusion
# Optional Python version of `prac11_lidar_gedi_canopy.js`.
# Python extra: pull the GEDI training table locally and compare sensor sets with scikit-learn cross-validation.

# %%
import ee, geemap, pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import cross_val_score
import nt_common as nt
nt.init("YOUR-CLOUD-PROJECT")
aoi = ee.Geometry.Rectangle([130.90, -13.10, 131.50, -12.50])

# %% GEDI L2A rh98 (quality-filtered)
def qa(img):
    return (img.updateMask(img.select("quality_flag").eq(1)).updateMask(img.select("degrade_flag").eq(0))
            .updateMask(img.select("sensitivity").gt(0.95)))
gedi = ee.ImageCollection("LARSE/GEDI/GEDI02_A_002_MONTHLY").filterBounds(aoi).filterDate("2019-04-01", "2023-03-31") \
    .map(qa).select("rh98").mosaic().clip(aoi).rename("height")

# %% Predictors: optical, C-band SAR, L-band SAR, terrain
s2 = nt.s2_sr(aoi, "2021-05-01", "2021-09-30").median()
opt = s2.select(["B2", "B3", "B4", "B5", "B8", "B11", "B12"]).addBands(
    s2.normalizedDifference(["B8", "B4"]).rename("NDVI")).addBands(s2.normalizedDifference(["B8", "B11"]).rename("NDMI"))
s1 = nt.s1_grd(aoi, "2021-05-01", "2021-09-30").median()
sarC = s1.addBands(s1.select("VH").divide(s1.select("VV")).rename("VH_VV"))   # linear sigma0 and linear cross-pol ratio
pal = ee.ImageCollection("JAXA/ALOS/PALSAR/YEARLY/SAR_EPOCH").filterDate("2021-01-01", "2022-01-01").first()
sarL = pal.select(["HH", "HV"]).pow(2).multiply(10 ** -8.3).rename(["L_HH", "L_HV"])   # linear gamma0 = DN^2 * 10^-8.3
dem = ee.Image("NASA/NASADEM_HGT/001").select("elevation")
X = opt.addBands(sarC).addBands(sarL).addBands(dem).addBands(ee.Terrain.slope(dem)).clip(aoi).float()

# %% Training table at GEDI footprints → local comparison of sensor sets (5-fold CV)
df = nt.fc_to_df(X.addBands(gedi).sample(region=aoi, scale=25, numPixels=20000, seed=1, tileScale=4)).dropna()
print(len(df), "footprints")
sets = {"optical": ["B2", "B3", "B4", "B5", "B8", "B11", "B12", "NDVI", "NDMI"],
        "SAR (C+L)": ["VV", "VH", "VH_VV", "L_HH", "L_HV"]}
sets["all"] = sets["optical"] + sets["SAR (C+L)"] + ["elevation", "slope"]
for name, cols in sets.items():
    r2 = cross_val_score(RandomForestRegressor(200, min_samples_leaf=5, random_state=1, n_jobs=-1),
                         df[cols], df["height"], cv=5, scoring="r2")
    print(f"{name:10s} R² = {r2.mean():.3f} ± {r2.std():.3f}")

# %% Wall-to-wall map with the GEE RF (all predictors)
fc = X.addBands(gedi).sample(region=aoi, scale=25, numPixels=20000, seed=1, tileScale=4).filter(ee.Filter.notNull(["height"]))
rf = ee.Classifier.smileRandomForest(200, minLeafPopulation=5, seed=1).setOutputMode("REGRESSION").train(fc, "height", X.bandNames())
m = geemap.Map(center=[-12.8, 131.2], zoom=10)
vis = {"min": 0, "max": 30, "palette": ["#ffffcc", "#78c679", "#006837"]}
m.addLayer(X.classify(rf), vis, "Predicted canopy height (m)"); m.addLayer(gedi, vis, "GEDI rh98")
m
