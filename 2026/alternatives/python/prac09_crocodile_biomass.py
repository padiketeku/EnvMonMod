# %% [markdown]
# # Prac 09 (Python): floodplain inundation vs crocodile biomass across NT tidal rivers (2009–2022)
# Optional Python version of `prac09_crocodile_biomass.js`. The Code Editor is the main environment.
# You provide (download from Learnline; restricted, do not share or post publicly): croc-biomass-data.csv
# and flooded_areas_shapefiles.zip (floodplain polygons for the six river systems; unzip next to this file).
# Method adapted from UN-SPIDER; Tim Palmer; crocodile data supplied by Cameron Baker.
# Python extras: river fixed effects and mixed models with statsmodels.

# %%
import ee, geemap, geopandas as gpd, pandas as pd, matplotlib.pyplot as plt
import statsmodels.formula.api as smf
import nt_common as nt
nt.init("YOUR-CLOUD-PROJECT")

croc = pd.read_csv("croc-biomass-data.csv")
print(croc.groupby("River").Year.agg(["count", "min", "max"]))

# Floodplain zones = convex hull of each river's flooded-area polygons (flooded_areas_shapefiles.zip from Learnline)
D = "flooded_areas_shapefiles"
SHP = {"Adelaide": f"{D}/Adelaide_river_shapefile/flooded_Adelaide_river.shp",
       "Mary": f"{D}/Mary_river_shapefile/flooded_Mary_river.shp",
       "Daly": f"{D}/Daly_river_shapefile/flooded_Daly_river.shp",
       "Liverpool": f"{D}/Liverpool_Tomkinson_river_shapefile/flooded_Liverpool_river.shp",
       "Blyth": f"{D}/Blyth_Cadell_river_shapefile/flooded_Blyth_river.shp",
       "Glyde": f"{D}/Glyde_river_shapefile/flooded_Glyde_river.shp"}
SHP["Tomkinson"], SHP["Cadell"] = SHP["Liverpool"], SHP["Blyth"]     # tributaries share the floodplain zone
# The convex hull is computed locally (fast) and sent to Earth Engine as one polygon per river
ZONES = {r: ee.Geometry(gpd.read_file(f).to_crs(4326).geometry.union_all().convex_hull.__geo_interface__)
         for r, f in SHP.items()}

s1 = (ee.ImageCollection("COPERNICUS/S1_GRD_FLOAT").filter(ee.Filter.eq("instrumentMode", "IW"))
      .filter(ee.Filter.eq("orbitProperties_pass", "DESCENDING")).filter(ee.Filter.eq("resolution_meters", 10)).select("VH"))   # linear sigma0 (S1_GRD_FLOAT); dB only for display
permanent = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("seasonality").gte(10).unmask(0)
slope = ee.Terrain.slope(ee.Image("AU/GA/DEM_1SEC/v10/DEM-H").select("elevation"))
boxcar = lambda img: img.convolve(ee.Kernel.square(radius=1, units="pixels", normalize=True))   # 3 x 3 mean, linear units

def flood_map(before, after, drop_db=3):
    # linear ratio after/before; flood = darkening of at least drop_db (never a ratio of dB values)
    f = boxcar(after).divide(boxcar(before)).lt(nt.db_to_lin(-drop_db)).where(permanent, 0)
    f = f.updateMask(f)
    f = f.updateMask(f.connectedPixelCount().gte(8))
    return f.updateMask(slope.lte(5))

def area_ha(mask, region, scale):
    return ee.Image.pixelArea().divide(1e4).updateMask(mask).reduceRegion(
        ee.Reducer.sum(), region, scale, maxPixels=1e11, tileScale=8).getNumber("area")

# %% Part A: Adelaide River, August 2017 
aoiA = ZONES["Adelaide"]
fA = flood_map(s1.filterBounds(aoiA).filterDate("2017-07-01", "2017-08-01").mosaic().clip(aoiA),
               s1.filterBounds(aoiA).filterDate("2017-08-01", "2017-09-01").mosaic().clip(aoiA))
print("Aug 2017 flooded (ha):", round(area_ha(fA, aoiA, 10).getInfo()))

# %% Part B: floodplain metrics for each river-year
jrc = ee.ImageCollection("JRC/GSW1_4/YearlyHistory")
def metrics(river, year):
    region = ZONES[river]
    out = {}
    if year <= 2021:
        w = ee.Image(jrc.filter(ee.Filter.eq("year", year)).first()).select("waterClass")
        out["jrc_seasonal_ha"] = area_ha(w.eq(2), region, 30)
    if year >= 2016:
        col = s1.filterBounds(region)
        b = col.filterDate(f"{year-1}-09-01", f"{year-1}-11-01"); a = col.filterDate(f"{year}-01-01", f"{year}-05-01")
        if b.size().getInfo() and a.size().getInfo():
            out["s1_peak_ha"] = area_ha(flood_map(b.median().clip(region), a.min().clip(region)), region, 20)
    return out
rows = []
for r in croc.itertuples():
    m = metrics(r.River, int(r.Year))
    vals = ee.Dictionary(m).getInfo() if m else {}
    rows.append({"River": r.River, "Year": r.Year, **vals})
table = croc.merge(pd.DataFrame(rows), on=["River", "Year"])
table.to_csv("prac09_croc_floodplain_table.csv", index=False); print(table.head())

# %% Models: pooled, river fixed effects, and a mixed model with river random intercepts
d = table.dropna(subset=["jrc_seasonal_ha"]).copy()
d["flood_kha"] = d.jrc_seasonal_ha / 1000
pooled = smf.ols("Biomass_km ~ flood_kha", d).fit()
fixed = smf.ols("Biomass_km ~ flood_kha + C(River)", d).fit()
mixed = smf.mixedlm("Biomass_km ~ flood_kha", d, groups=d["River"]).fit()
print(pooled.summary().tables[1]); print(fixed.summary().tables[1]); print(mixed.summary())
for river, g in d.groupby("River"):
    plt.scatter(g.flood_kha, g.Biomass_km, label=river)
plt.xlabel("Seasonal floodplain water (thousand ha)"); plt.ylabel("Biomass (kg/km)"); plt.legend(fontsize=7); plt.show()
