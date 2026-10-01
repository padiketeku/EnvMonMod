# %% [markdown]
# # Prac 03 (Python): rainfall anomalies, drought indices, LST and ET
# Optional Python version of `prac02a`–`prac02c`.

# %%
import ee, geemap, pandas as pd, matplotlib.pyplot as plt
import nt_common as nt
nt.init("YOUR-CLOUD-PROJECT")
NT = nt.nt_boundary()

# %% 2.1 Wet-season (Oct–Apr) rainfall totals and anomalies (CHIRPS)
chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/PENTAD").select("precipitation")
def wet_season(y):
    y = ee.Number(y)
    s, e = ee.Date.fromYMD(y, 10, 1), ee.Date.fromYMD(y.add(1), 5, 1)
    return chirps.filterDate(s, e).sum().rename("wet_mm").set("season_start", y).set("system:time_start", s.millis())
seasons = ee.ImageCollection.fromImages(ee.List.sequence(1981, 2024).map(wet_season))
base = seasons.filter(ee.Filter.rangeContains("season_start", 1991, 2019))
mean, sd = base.mean(), base.reduce(ee.Reducer.stdDev())
target = seasons.filter(ee.Filter.eq("season_start", 2024)).first()
z = target.subtract(mean).divide(sd).rename("z").clip(NT)

sites = {"Darwin": [130.84, -12.46], "Katherine": [132.26, -14.47], "Tennant Creek": [134.19, -19.65],
         "Alice Springs": [133.88, -23.70]}
fig, ax = plt.subplots(figsize=(10, 4))
for n, xy in sites.items():
    df = nt.series_to_df(seasons, ee.Geometry.Point(xy).buffer(10000), 5566, date_prop="season_start")
    ax.plot(df["time"], df["wet_mm"], marker="o", ms=3, label=n)
ax.set_xlabel("Season starting"); ax.set_ylabel("Oct–Apr rainfall (mm)"); ax.legend(); plt.show()

m = geemap.Map(center=[-19, 133], zoom=5)
m.addLayer(z, {"min": -2, "max": 2, "palette": ["#b2182b", "#f7f7f7", "#2166ac"]}, "2024/25 standardised anomaly")
m

# %% 2.2 VCI, TCI, VHI for October 2019
ndvi = (ee.ImageCollection("MODIS/061/MOD13A3").filterDate("2001-01-01", "2025-01-01")
        .map(lambda i: i.select("NDVI").multiply(0.0001).copyProperties(i, ["system:time_start"])))
lst8 = ee.ImageCollection("MODIS/061/MOD11A2").filterDate("2001-01-01", "2025-01-01").select("LST_Day_1km")
months = ee.List.sequence(0, 24 * 12 - 1)
lst = ee.ImageCollection.fromImages(months.map(lambda n: lst8.filterDate(
    ee.Date("2001-01-01").advance(n, "month"), ee.Date("2001-01-01").advance(ee.Number(n).add(1), "month"))
    .mean().multiply(0.02).subtract(273.15).rename("LST")
    .set("system:time_start", ee.Date("2001-01-01").advance(n, "month").millis())))

def condition(col, date, inverse=False):
    m_ = date.get("month")
    same = col.filter(ee.Filter.calendarRange(m_, m_, "month"))
    mn, mx = same.min(), same.max()
    cur = col.filterDate(date, date.advance(1, "month")).first()
    idx = mx.subtract(cur).divide(mx.subtract(mn)) if inverse else cur.subtract(mn).divide(mx.subtract(mn))
    return ee.Image(idx).multiply(100)

T = ee.Date("2019-10-01")
vci = condition(ndvi, T).rename("VCI").clip(NT)
tci = condition(lst, T, inverse=True).rename("TCI").clip(NT)
vhi = vci.multiply(0.5).add(tci.multiply(0.5)).rename("VHI")
drought_km2 = ee.Image.pixelArea().divide(1e6).updateMask(vhi.lt(40)).reduceRegion(
    ee.Reducer.sum(), NT.geometry(), 1000, maxPixels=1e11).getInfo()
print("Area with VHI < 40 (km²):", drought_km2)
m = geemap.Map(center=[-19, 133], zoom=5)
ci = {"min": 0, "max": 100, "palette": ["#a50026", "#f46d43", "#fee08b", "#d9ef8b", "#66bd63", "#006837"]}
m.addLayer(vci, ci, "VCI"); m.addLayer(tci, ci, "TCI"); m.addLayer(vhi, ci, "VHI")
m

# %% 2.3 Darwin LST vs NDVI (Landsat surface temperature)
darwin = ee.Geometry.Rectangle([130.80, -12.52, 131.05, -12.33])
def lst_ndvi(img):
    q = img.select("QA_PIXEL")
    mask = q.bitwiseAnd(1 << 3).eq(0).And(q.bitwiseAnd(1 << 4).eq(0))
    st = img.select("ST_B10").multiply(0.00341802).add(149.0).subtract(273.15).rename("LST_C")
    sr = img.select(["SR_B4", "SR_B5"]).multiply(0.0000275).add(-0.2)
    return st.addBands(sr.normalizedDifference(["SR_B5", "SR_B4"]).rename("NDVI")).updateMask(mask)
comp = (ee.ImageCollection("LANDSAT/LC08/C02/T1_L2").merge(ee.ImageCollection("LANDSAT/LC09/C02/T1_L2"))
        .filterBounds(darwin).filterDate("2021-01-01", "2025-01-01")
        .filter(ee.Filter.calendarRange(9, 11, "month")).map(lst_ndvi).median().clip(darwin))
df = nt.fc_to_df(comp.sample(region=darwin, scale=30, numPixels=2000, seed=3))
ax = df.plot.scatter("NDVI", "LST_C", s=3, alpha=0.4, title="Darwin build-up season: LST vs NDVI"); plt.show()
print(df[["NDVI", "LST_C"]].corr())
