# %% [markdown]
# # Prac 07 (Python): dNBR burn severity and fire regime (EDS vs LDS)
# Optional Python version of `prac06a` and `prac06b`.

# %%
import ee, geemap, pandas as pd, matplotlib.pyplot as plt
import nt_common as nt
nt.init("YOUR-CLOUD-PROJECT")
NT = nt.nt_boundary()

# %% 6.1 dNBR severity (eastern Kakadu / western Arnhem Land, 2023)
aoi = ee.Geometry.Rectangle([132.70, -13.00, 133.60, -12.30])
nbr = lambda c: c.median().normalizedDifference(["B8A", "B12"]).rename("NBR")
pre = nbr(nt.s2_sr(aoi, "2023-05-01", "2023-06-15")).clip(aoi)
post = nbr(nt.s2_sr(aoi, "2023-10-15", "2023-11-20")).clip(aoi)
dnbr = pre.subtract(post).rename("dNBR")
sev = (ee.Image(0).where(dnbr.lt(-0.25), 1).where(dnbr.gte(-0.25).And(dnbr.lt(-0.1)), 2)
       .where(dnbr.gte(-0.1).And(dnbr.lt(0.1)), 3).where(dnbr.gte(0.1).And(dnbr.lt(0.27)), 4)
       .where(dnbr.gte(0.27).And(dnbr.lt(0.44)), 5).where(dnbr.gte(0.44).And(dnbr.lt(0.66)), 6)
       .where(dnbr.gte(0.66), 7).updateMask(dnbr.mask()).clip(aoi))
names = {1: "Regrowth high", 2: "Regrowth low", 3: "Unburned", 4: "Low", 5: "Mod-low", 6: "Mod-high", 7: "High"}
df = nt.grouped_area(ee.Image.pixelArea().divide(1e4), sev, aoi, 20)
df["severity"] = df["class"].map(names); print(df)
m = geemap.Map(center=[-12.65, 133.15], zoom=9)
m.addLayer(sev, {"min": 1, "max": 7, "palette": ["#7a8737", "#acbe4d", "#0ae042", "#fff70b", "#ffaf38", "#ff641b", "#a41fd6"]}, "Severity")
m

# %% 6.2 Fire regime from MCD64A1 (2001–2024): EDS vs LDS burned area
mcd = ee.ImageCollection("MODIS/061/MCD64A1").select("BurnDate")
arnhem = ee.Geometry.Rectangle([133.0, -13.3, 134.3, -12.0])
km2 = ee.Image.pixelArea().divide(1e6)
recs = []
for y in range(2001, 2025):
    bd = mcd.filter(ee.Filter.calendarRange(y, y, "year")).max()
    eds = bd.gt(0).And(bd.lt(213)).unmask(0)
    lds = bd.gte(213).unmask(0)
    a = ee.Image.cat(km2.multiply(eds).rename("EDS"), km2.multiply(lds).rename("LDS")).reduceRegion(
        ee.Reducer.sum(), arnhem, 500, maxPixels=1e11)
    recs.append(ee.Feature(None, a).set("year", y))
df = nt.fc_to_df(ee.FeatureCollection(recs)).set_index("year")
df[["EDS", "LDS"]].plot.bar(stacked=True, color=["#4daf4a", "#e41a1c"], figsize=(11, 4),
                            title="Western Arnhem Land: burned area by season (km²)"); plt.show()
print("LDS share before/after 2006:", (df.LDS / (df.EDS + df.LDS)).groupby(df.index >= 2006).mean().to_dict())

# %% Fire frequency map
freq = ee.ImageCollection([mcd.filter(ee.Filter.calendarRange(y, y, "year")).max().gt(0).unmask(0)
                           for y in range(2001, 2025)]).sum().clip(NT)
m = geemap.Map(center=[-19, 133], zoom=5)
m.addLayer(freq.selfMask(), {"min": 1, "max": 20, "palette": ["#ffffb2", "#fd8d3c", "#bd0026"]}, "Fire frequency")
m
