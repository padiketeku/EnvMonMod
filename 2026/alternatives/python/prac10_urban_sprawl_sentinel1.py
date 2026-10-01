# %% [markdown]
# # Prac 10 (Python): urban sprawl detection with Sentinel-1 (Darwin–Palmerston)
# Optional Python version of `prac10_urban_sprawl_sentinel1.js`.

# %%
import ee, geemap, pandas as pd, matplotlib.pyplot as plt, math
import nt_common as nt
nt.init("YOUR-CLOUD-PROJECT")
aoi = ee.Geometry.Rectangle([130.80, -12.62, 131.12, -12.33])
YEARS = [2016, 2018, 2020, 2022, 2024]
VV_T_DB, VH_T_DB, CV_T = -8, -15, 0.5   # thresholds in dB (converted to linear); CV of linear VV
s1 = nt.s1_grd(aoi, "2016-01-01", "2025-01-01", "DESCENDING")
water = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("occurrence").gt(50).unmask(0)
slope = ee.Terrain.slope(ee.Image("NASA/NASADEM_HGT/001").select("elevation"))

def built_up(y):
    c = s1.filterDate(f"{y}-05-01", f"{y}-10-31")
    med = c.median()                                                   # linear sigma0 (nt.s1_grd)
    cv = c.select("VV").reduce(ee.Reducer.stdDev()).divide(c.select("VV").mean())
    b = (med.select("VV").gt(nt.db_to_lin(VV_T_DB)).And(med.select("VH").gt(nt.db_to_lin(VH_T_DB))).And(cv.lt(CV_T))
         .And(water.Not()).And(slope.lt(10))).focalMode(1)
    return b.updateMask(b.connectedPixelCount(50, True).gte(10)).unmask(0).clip(aoi)

built = [built_up(y) for y in YEARS]
for i in range(1, len(built)):
    built[i] = built[i].Or(built[i - 1])          # monotonic urbanisation
km2 = ee.Image.pixelArea().divide(1e6)
areas = [km2.updateMask(b).reduceRegion(ee.Reducer.sum(), aoi, 10, maxPixels=1e11, tileScale=4).get("area") for b in built]
df = pd.DataFrame({"year": YEARS, "built_km2": ee.List(areas).getInfo()}).set_index("year")
df.plot.bar(legend=False, title="Built-up area (km²), Sentinel-1"); plt.show()
print("Annual growth rate (%/yr):", 100 * math.log(df.built_km2.iloc[-1] / df.built_km2.iloc[0]) / (YEARS[-1] - YEARS[0]))

# %% Landscape Expansion Index (pixel approximation)
old, new = built[0], built[-1].And(built[0].Not())
share = old.reduceNeighborhood(ee.Reducer.mean(), ee.Kernel.circle(100, "meters"))
lei = ee.Image(0).where(new.And(share.gt(0.5)), 1).where(new.And(share.gt(0)).And(share.lte(0.5)), 2) \
    .where(new.And(share.eq(0)), 3).selfMask()
print(nt.grouped_area(km2, lei, aoi, 10, "type").replace({"type": {1: "infill", 2: "edge", 3: "outlying"}}))
m = geemap.Map(center=[-12.47, 130.96], zoom=11)
m.addLayer(old.selfMask(), {"palette": "#636363"}, "Built 2016")
m.addLayer(lei, {"min": 1, "max": 3, "palette": ["#fdae61", "#d7191c", "#7b3294"]}, "New urban: infill/edge/outlying")
m
