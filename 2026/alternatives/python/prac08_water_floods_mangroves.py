# %% [markdown]
# # Prac 08 (Python): surface water, Sentinel-1 flood mapping, mangrove dieback
# Optional Python version of `prac11a`–`prac11c`. Python extra: Otsu threshold with scikit-image.

# %%
import ee, geemap, pandas as pd, numpy as np, matplotlib.pyplot as plt
from skimage.filters import threshold_otsu
import nt_common as nt
nt.init("YOUR-CLOUD-PROJECT")

# %% 11.1 JRC seasonal vs permanent water per year (Kakadu / Mary River floodplains)
aoi = ee.Geometry.Rectangle([131.60, -12.95, 132.70, -12.10])
yearly = ee.ImageCollection("JRC/GSW1_4/YearlyHistory")
km2 = ee.Image.pixelArea().divide(1e6)
recs = []
for y in range(1990, 2022):
    w = yearly.filter(ee.Filter.eq("year", y)).first().select("waterClass")
    d = km2.addBands(w).reduceRegion(ee.Reducer.sum().group(1, "cls"), aoi, 30, maxPixels=1e11, tileScale=4)
    recs.append(ee.Feature(None, {"year": y, "groups": d.get("groups")}))
rows = []
for f in ee.FeatureCollection(recs).getInfo()["features"]:
    g = {int(x["cls"]): x["sum"] for x in f["properties"]["groups"]}
    rows.append({"year": f["properties"]["year"], "seasonal": g.get(2, 0), "permanent": g.get(3, 0)})
pd.DataFrame(rows).set_index("year").plot.bar(stacked=True, figsize=(11, 4), title="JRC water (km²)"); plt.show()

# %% 11.2 Sentinel-1 flood: Victoria River at Kalkarindji, Feb–Mar 2023
aoi2 = ee.Geometry.Rectangle([130.40, -17.80, 131.20, -17.00])
s1 = nt.s1_grd(aoi2, "2022-10-01", "2023-03-15")
after_col = s1.filterDate("2023-02-25", "2023-03-15")
orbit = after_col.first().get("relativeOrbitNumber_start")
before = s1.filterDate("2022-10-01", "2022-11-30").filter(ee.Filter.eq("relativeOrbitNumber_start", orbit)) \
    .select("VV").mean().focalMean(50, "circle", "meters").clip(aoi2)      # linear sigma0 (nt.s1_grd)
after = after_col.filter(ee.Filter.eq("relativeOrbitNumber_start", orbit)).select("VV").min() \
    .focalMean(50, "circle", "meters").clip(aoi2)
ratio = after.divide(before)                                                # linear change ratio
# Otsu threshold: found on the histogram of 10*log10(ratio), then converted back to linear before use
vals = np.array(nt.fc_to_df(nt.to_db(ratio).rename("d").sample(region=aoi2, scale=30, numPixels=20000, seed=1))["d"])
t = threshold_otsu(vals); print("Otsu threshold (dB):", round(t, 2), "= linear ratio", round(nt.db_to_lin(t), 3), " (fixed rule: −3 dB = 0.50)")
perm = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("seasonality").gte(10).unmask(0)
flood = ratio.lt(nt.db_to_lin(t)).And(after.lt(nt.db_to_lin(-16))).And(perm.Not()).selfMask()
print("Flooded km²:", km2.updateMask(flood).reduceRegion(ee.Reducer.sum(), aoi2, 10, maxPixels=1e11, tileScale=4).getInfo())
m = geemap.Map(center=[-17.43, 130.83], zoom=10)
m.addLayer(nt.to_db(after), {"min": -25, "max": 0}, "VV flood period (dB)"); m.addLayer(flood, {"palette": "cyan"}, "Flood (Otsu)")
m

# %% 11.3 Mangrove dieback at Limmen Bight: dry-season NDVI inside the 2000 mangrove extent
aoi3 = ee.Geometry.Rectangle([135.30, -15.60, 136.60, -14.60])
mang = ee.ImageCollection("LANDSAT/MANGROVE_FORESTS").filterBounds(aoi3).mosaic().clip(aoi3).selfMask()
ls = nt.landsat89(aoi3, "2014-01-01", "2025-01-01")
annual = ee.ImageCollection([ls.filter(ee.Filter.calendarRange(y, y, "year")).filter(ee.Filter.calendarRange(6, 10, "month"))
                             .median().normalizedDifference(["nir", "red"]).rename("NDVI").updateMask(mang)
                             .set("system:time_start", ee.Date.fromYMD(y, 8, 1).millis()) for y in range(2014, 2025)])
df = nt.series_to_df(annual, aoi3, 30)
plt.plot(df.date.dt.year, df.NDVI, marker="o"); plt.title("Mangrove NDVI, Limmen Bight"); plt.show()
