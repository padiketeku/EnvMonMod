# %% [markdown]
# # Prac 06 (Python): monitoring land clearing (Hansen + Sentinel-2)
# Optional Python version of `prac06_land_clearing.js`. Python extra: export patches as GeoJSON/GeoPandas.

# %%
import ee, geemap, pandas as pd, matplotlib.pyplot as plt
import nt_common as nt
nt.init("YOUR-CLOUD-PROJECT")
aoi = ee.Geometry.Rectangle([130.9, -14.2, 131.6, -13.6])
area_ha = ee.Image.pixelArea().divide(1e4)

# %% Part A: Hansen loss by year at several canopy thresholds
gfc = ee.Image("UMD/hansen/global_forest_change_2023_v1_11").clip(aoi)
rows = []
for thr in [10, 20, 30, 50]:
    loss = gfc.select("loss").And(gfc.select("treecover2000").gte(thr))
    df = nt.grouped_area(area_ha.updateMask(loss), gfc.select("lossyear"), aoi, 30, "year")
    df["year"] += 2000; df["threshold"] = thr; rows.append(df)
loss_df = pd.concat(rows)
loss_df.pivot(index="year", columns="threshold", values="area").plot.bar(figsize=(11, 4), title="Hansen loss (ha) by canopy threshold")
plt.show()

# %% Part B: annual Sentinel-2 clearing detection
YEARS = list(range(2018, 2026))
def dry(y):
    c = nt.s2_sr(aoi, f"{y}-06-01", f"{y}-09-30").median()
    ndvi = c.normalizedDifference(["B8", "B4"]).rename("NDVI")
    bsi = c.expression("((S+R)-(N+B))/((S+R)+(N+B))", {"S": c.select("B11"), "R": c.select("B4"),
                                                        "N": c.select("B8"), "B": c.select("B2")}).rename("BSI")
    return ndvi.addBands(bsi).clip(aoi)
comps = [dry(y) for y in YEARS]
woody = ee.ImageCollection("GOOGLE/DYNAMICWORLD/V1").filterBounds(aoi).filterDate("2018-05-01", "2018-09-30") \
    .select("trees").mean().gt(0.4).clip(aoi)
clear = ee.Image(0)
for i in range(1, len(YEARS) - 1):
    prev, cur, nxt = comps[i - 1], comps[i], comps[i + 1]
    c = (prev.select("NDVI").subtract(cur.select("NDVI")).gt(0.20)
         .And(cur.select("NDVI").lt(0.30))
         .And(cur.select("BSI").subtract(prev.select("BSI")).gt(0.05))
         .And(nxt.select("NDVI").lt(0.35)).And(woody))
    clear = clear.where(c.And(clear.eq(0)), YEARS[i])
clear = clear.selfMask().rename("clear_year")
clear = clear.updateMask(clear.connectedPixelCount(200, True).gte(100))
print(nt.grouped_area(area_ha, clear, aoi, 10, "year"))

# %% Patches to GeoPandas (small areas only) and to Drive
patches = clear.toInt().reduceToVectors(geometry=aoi, scale=10, geometryType="polygon", labelProperty="clear_year",
                                        eightConnected=True, maxPixels=1e11, tileScale=8) \
    .map(lambda f: f.set("area_ha", f.area(1).divide(1e4))).filter(ee.Filter.gte("area_ha", 1))
gdf = geemap.ee_to_gdf(patches.limit(500))
print(gdf.sort_values("area_ha", ascending=False).head(10))
ee.batch.Export.table.toDrive(collection=patches, description="Prac06_patches_py", folder="GEE_NT", fileFormat="SHP").start()

m = geemap.Map(center=[-13.9, 131.25], zoom=10)
m.addLayer(clear, {"min": 2019, "max": 2024, "palette": ["#fee08b", "#f46d43", "#a50026"]}, "S2 clearing year")
m
