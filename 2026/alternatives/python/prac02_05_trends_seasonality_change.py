# %% [markdown]
# # Prac 02 and Prac 05 (Python): Sen's slope + Mann–Kendall, harmonic regression (Prac 02); LandTrendr (Prac 05)
# Optional Python version of `prac04a`–`prac04c`. Python extra: pymannkendall for single-pixel checks
# (`pip install pymannkendall`).

# %%
import ee, geemap, math, numpy as np, matplotlib.pyplot as plt
import nt_common as nt
nt.init("YOUR-CLOUD-PROJECT")
NT = nt.nt_boundary()

# %% 4.2 Annual NDVI, Sen's slope and Mann–Kendall (server side, whole NT)
modis = ee.ImageCollection("MODIS/061/MOD13A3").select("NDVI")
years = list(range(2001, 2025)); n = len(years)
annual = ee.ImageCollection([modis.filter(ee.Filter.calendarRange(y, y, "year")).mean().multiply(0.0001)
                             .rename("NDVI").set("year", y).set("system:time_start", ee.Date.fromYMD(y, 7, 1).millis())
                             for y in years])
sens = annual.map(lambda i: ee.Image.constant(i.get("year")).float().rename("year").addBands(i)) \
    .reduce(ee.Reducer.sensSlope()).clip(NT)
after = ee.Filter.lessThan(leftField="system:time_start", rightField="system:time_start")
joined = ee.ImageCollection(ee.Join.saveAll("after").apply(primary=annual, secondary=annual, condition=after))
def signs(cur):
    cur = ee.Image(cur)
    return ee.ImageCollection.fromImages(cur.get("after")).map(
        lambda j: ee.Image(j).neq(cur).multiply(ee.Image(j).subtract(cur).clamp(-1, 1)).int().unmask(0))
S = ee.ImageCollection(joined.map(signs).flatten()).reduce("sum", 2)
varS = n * (n - 1) * (2 * n + 5) / 18
Z = ee.Image(0).where(S.gt(0), S.subtract(1).divide(math.sqrt(varS))).where(S.lt(0), S.add(1).divide(math.sqrt(varS)))
p = ee.Image(1).subtract(Z.abs().divide(math.sqrt(2)).erf()).clip(NT)
m = geemap.Map(center=[-19, 133], zoom=5)
m.addLayer(sens.select("slope").updateMask(p.lt(0.05)),
           {"min": -0.006, "max": 0.006, "palette": ["#8c510a", "#f5f5f5", "#01665e"]}, "Sen slope, p<0.05")
m

# %% Check one pixel locally with pymannkendall
import pymannkendall as mk
df = nt.series_to_df(annual, ee.Geometry.Point([131.19, -13.83]), 1000)
print(mk.original_test(df["NDVI"].values))

# %% 4.3 Harmonic regression (first order) on Landsat NDVI — Darwin hinterland
aoi = ee.Geometry.Rectangle([130.70, -13.00, 131.40, -12.40])
def add_vars(img):
    t = img.date().difference(ee.Date("2014-01-01"), "year")
    w = ee.Image.constant(t).multiply(2 * math.pi)
    nd = img.normalizedDifference(["nir", "red"]).rename("NDVI")
    return nd.addBands([ee.Image.constant(1).rename("constant"), ee.Image.constant(t).float().rename("t"),
                        w.cos().rename("cos1"), w.sin().rename("sin1")]).float()
col = nt.landsat89(aoi, "2014-01-01", "2025-01-01").map(add_vars)
ind = ["constant", "t", "cos1", "sin1"]
fit = col.select(ind + ["NDVI"]).reduce(ee.Reducer.linearRegression(numX=4, numY=1))
coefs = fit.select("coefficients").arrayProject([0]).arrayFlatten([ind]).clip(aoi)
amp = coefs.select("cos1").hypot(coefs.select("sin1"))
phase = coefs.select("sin1").atan2(coefs.select("cos1"))
m = geemap.Map(center=[-12.7, 131.05], zoom=10)
m.addLayer(phase.unitScale(-math.pi, math.pi).addBands(amp.multiply(2.5)).addBands(coefs.select("constant")).hsvToRgb(),
           {}, "Seasonality HSV")
m

# %% 4.4 LandTrendr: year of greatest disturbance (Douglas–Daly)
aoi3 = ee.Geometry.Rectangle([131.10, -14.00, 131.40, -13.75])
def prep57(i):
    return nt.mask_scale_landsat(i).select(["SR_B4", "SR_B7"], ["nir", "swir2"])
def prep89(i):
    return nt.mask_scale_landsat(i).select(["SR_B5", "SR_B7"], ["nir", "swir2"])
ls = (ee.ImageCollection("LANDSAT/LT05/C02/T1_L2").map(prep57)
      .merge(ee.ImageCollection("LANDSAT/LC08/C02/T1_L2").map(prep89))
      .merge(ee.ImageCollection("LANDSAT/LC09/C02/T1_L2").map(prep89)).filterBounds(aoi3))
ann = []
for y in range(1988, 2025):
    c = ls.filter(ee.Filter.calendarRange(y, y, "year")).filter(ee.Filter.calendarRange(5, 9, "month"))
    nbr = c.median().normalizedDifference(["nir", "swir2"])
    ann.append(nbr.multiply(-1).rename("NBR_inv").set("system:time_start", ee.Date.fromYMD(y, 8, 1).millis()).set("n", c.size()))
ann = ee.ImageCollection(ann).filter(ee.Filter.gt("n", 0))
lt = ee.Algorithms.TemporalSegmentation.LandTrendr(timeSeries=ann, maxSegments=6, spikeThreshold=0.9,
    vertexCountOvershoot=3, preventOneYearRecovery=True, recoveryThreshold=0.25, pvalThreshold=0.05,
    bestModelProportion=0.75, minObservationsNeeded=6)
arr = lt.select("LandTrendr")
v = arr.arrayMask(arr.arraySlice(0, 3, 4))
L, R = v.arraySlice(1, 0, -1), v.arraySlice(1, 1, None)
seg = ee.Image.cat([L.arraySlice(0, 0, 1), R.arraySlice(0, 0, 1),
                    R.arraySlice(0, 2, 3).subtract(L.arraySlice(0, 2, 3))]).toArray(0)
best = seg.arraySort(seg.arraySlice(0, 2, 3).multiply(-1)).arraySlice(1, 0, 1)
gd = best.arrayProject([0]).arrayFlatten([["start", "end", "mag"]])
yod = gd.select("start").add(1).updateMask(gd.select("mag").gt(0.15)).clip(aoi3)
m = geemap.Map(center=[-13.88, 131.25], zoom=11)
m.addLayer(yod, {"min": 1990, "max": 2024, "palette": ["#9400D3", "#0000FF", "#00FF00", "#FFFF00", "#FF0000"]}, "Year of disturbance")
m
