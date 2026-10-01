# %% [markdown]
# # Prac 01 (Python): GEE basics, image processing fundamentals, vegetation dynamics
# Optional Python version of `prac01a`, `prac01b` and `prac01c`. The Code Editor is the main environment.
# Requires: `pip install earthengine-api geemap pandas matplotlib`. Run cell by cell in Jupyter or VS Code.

# %%
import ee, geemap, matplotlib.pyplot as plt
import nt_common as nt
nt.init("YOUR-CLOUD-PROJECT")          # <-- edit

# %% 1.1 GEE basics: Landsat 8/9 and Sentinel-2 composites, NDVI, statistics
aoi = ee.Geometry.Point([130.8456, -12.4634]).buffer(20000)
ls = nt.landsat89(aoi, "2024-05-01", "2024-09-30")
s2 = nt.s2_sr(aoi, "2024-05-01", "2024-09-30")
print("Landsat scenes:", ls.size().getInfo(), " Sentinel-2 scenes:", s2.size().getInfo())
s2c = s2.median().clip(aoi)
ndvi = s2c.normalizedDifference(["B8", "B4"]).rename("NDVI")
stats = ndvi.reduceRegion(ee.Reducer.mean().combine(ee.Reducer.stdDev(), None, True), aoi, 10, maxPixels=1e10)
print("NDVI mean/SD:", stats.getInfo())

m = geemap.Map(center=[-12.46, 130.85], zoom=10)
m.addLayer(ls.median().clip(aoi), {"bands": ["red", "green", "blue"], "min": 0, "max": 0.3}, "Landsat true colour")
m.addLayer(s2c, {"bands": ["B4", "B3", "B2"], "min": 0, "max": 0.3}, "S2 true colour")
m.addLayer(ndvi, {"min": 0, "max": 0.8, "palette": ["#a6611a", "#f5f5f5", "#018571"]}, "NDVI")
m

# %% Export to Drive (same as the Code Editor Export tab)
task = ee.batch.Export.image.toDrive(image=ndvi, description="Prac01a_NDVI_Darwin_2024_py", folder="GEE_NT",
                                     region=aoi, scale=10, crs="EPSG:32752", maxPixels=1e10)
task.start(); print("Export started:", task.status()["state"])

# %% 1.2 Image management: metadata and tiers
l9 = ee.ImageCollection("LANDSAT/LC09/C02/T1_L2").filterBounds(aoi).filterDate("2024-01-01", "2025-01-01")
print("Cloud cover per scene:", l9.aggregate_array("CLOUD_COVER").getInfo())
scene = ee.Image(l9.sort("CLOUD_COVER").first())
print("Geometric RMSE (m):", scene.get("GEOMETRIC_RMSE_MODEL").getInfo())

# %% 1.2 Registration: Landsat 9 vs Sentinel-2 offset
img = nt.mask_scale_landsat(scene).select(["SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B6", "SR_B7"],
                                          ["blue", "green", "red", "nir", "swir1", "swir2"]).clip(aoi)
s2one = ee.Image(ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED").filterBounds(aoi)
                 .filterDate(scene.date().advance(-10, "day"), scene.date().advance(10, "day"))
                 .sort("CLOUDY_PIXEL_PERCENTAGE").first())
disp = img.select("red").resample("bicubic").displacement(
    referenceImage=s2one.select("B4").divide(10000).resample("bicubic"), maxOffset=60, patchWidth=300)
offset = disp.select("dx").hypot(disp.select("dy"))
print("Mean offset (m):", offset.reduceRegion(ee.Reducer.mean(), aoi, 90).getInfo())

# %% 1.2 Enhancement (percentile stretch) and transformation (PCA)
pct = img.select(["red", "green", "blue"]).reduceRegion(ee.Reducer.percentile([2, 98]), aoi, 60).getInfo()
vis = {"bands": ["red", "green", "blue"], "min": [pct["red_p2"], pct["green_p2"], pct["blue_p2"]],
       "max": [pct["red_p98"], pct["green_p98"], pct["blue_p98"]]}
bands = img.bandNames()
means = img.reduceRegion(ee.Reducer.mean(), aoi, 60)
centered = img.subtract(ee.Image.constant(means.values(bands)))
arrays = centered.toArray()
covar = arrays.reduceRegion(ee.Reducer.centeredCovariance(), aoi, 60, maxPixels=1e9)
eig = ee.Array(covar.get("array")).eigen()
evals, evecs = eig.slice(1, 0, 1), eig.slice(1, 1)
pcs = ee.Image(evecs).matrixMultiply(arrays.toArray(1)).arrayProject([0]).arrayFlatten(
    [["PC1", "PC2", "PC3", "PC4", "PC5", "PC6"]])
ev = [v[0] for v in evals.getInfo()]
print("Proportion of variance:", [round(v / sum(ev), 3) for v in ev])
m2 = geemap.Map(center=[-12.55, 131.1], zoom=10)
m2.addLayer(img, vis, "2–98% stretch")
m2.addLayer(pcs, {"bands": ["PC1", "PC2", "PC3"], "min": [-0.5, -0.15, -0.08], "max": [0.5, 0.15, 0.08]}, "PCA 1-2-3")
m2

# %% 1.3 Vegetation dynamics: MODIS NDVI/EVI time series at three sites
sites = {"Howard Springs": [131.1501, -12.4952], "Douglas-Daly": [131.19, -13.83], "Alice Springs": [133.88, -23.70]}
modis = (ee.ImageCollection("MODIS/061/MOD13Q1").filterDate("2001-01-01", "2026-01-01")
         .map(lambda i: i.select(["NDVI", "EVI"]).multiply(0.0001).updateMask(i.select("SummaryQA").lte(1))
              .copyProperties(i, ["system:time_start"])))
fig, ax = plt.subplots(figsize=(11, 4))
for name, xy in sites.items():
    df = nt.series_to_df(modis.select("NDVI"), ee.Geometry.Point(xy), 250)
    ax.plot(df["date"], df["NDVI"], lw=0.8, label=name)
ax.set_ylabel("NDVI"); ax.set_title("MODIS NDVI 2001–2025"); ax.legend(); plt.show()

# %% Your tile: replace the point with the centroid of your tile from prac00 and re-run the cell above.
# Q / EXT questions: see pracs/prac01-...md
