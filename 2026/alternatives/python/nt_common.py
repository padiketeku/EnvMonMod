"""Shared helpers for the ENV306/506 Python (earthengine-api + geemap) versions of the pracs.

The Google Earth Engine Code Editor is the main environment for the unit. These Python versions are optional
alternatives that mirror the Code Editor scripts in `scripts/`. Usage in a notebook or script:

    import nt_common as nt
    nt.init("your-cloud-project-id")
"""
import math
import ee
import pandas as pd

NT_NAME = "Northern Territory"


def init(project):
    """Authenticate (first time only) and initialise Earth Engine with your Cloud project."""
    try:
        ee.Initialize(project=project)
    except Exception:
        ee.Authenticate()
        ee.Initialize(project=project)


def nt_boundary():
    return ee.FeatureCollection("FAO/GAUL/2015/level1").filter(ee.Filter.eq("ADM1_NAME", NT_NAME))


# ---------------------------------------------------------------- optical
def mask_scale_landsat(img):
    """Landsat C2 L2: mask cloud (bit 3), shadow (4), dilated cloud (1); scale SR bands to reflectance."""
    qa = img.select("QA_PIXEL")
    mask = (qa.bitwiseAnd(1 << 1).eq(0)
            .And(qa.bitwiseAnd(1 << 3).eq(0))
            .And(qa.bitwiseAnd(1 << 4).eq(0)))
    sr = img.select("SR_B.").multiply(0.0000275).add(-0.2)
    return img.addBands(sr, None, True).updateMask(mask)


def landsat89(aoi, start, end):
    """Landsat 8 + 9 SR renamed to common band names."""
    col = (ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
           .merge(ee.ImageCollection("LANDSAT/LC09/C02/T1_L2"))
           .filterBounds(aoi).filterDate(start, end).map(mask_scale_landsat))
    return col.select(["SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B6", "SR_B7"],
                      ["blue", "green", "red", "nir", "swir1", "swir2"])


def s2_sr(aoi, start, end, cs_threshold=0.6):
    """Sentinel-2 SR with Cloud Score+ masking, scaled to reflectance (keeps original band names)."""
    cs = ee.ImageCollection("GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED")
    col = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED").filterBounds(aoi).filterDate(start, end)
           .linkCollection(cs, ["cs_cdf"]))
    return col.map(lambda img: ee.Image(
        img.updateMask(img.select("cs_cdf").gte(cs_threshold))
        .select(["B2", "B3", "B4", "B5", "B6", "B7", "B8", "B8A", "B11", "B12"]).divide(10000)
        .copyProperties(img, ["system:time_start"])))


# ---------------------------------------------------------------- SAR units
# COPERNICUS/S1_GRD_FLOAT is stored as LINEAR sigma0 (COPERNICUS/S1_GRD holds the same values in dB).
# All statistics and computations use linear sigma0; dB is for display only. to_linear() is only needed for dB data.
def to_linear(img):
    """dB -> linear power, 10^(dB/10); keeps metadata (orbit, pass, date)."""
    img = ee.Image(img)
    return ee.Image(img.multiply(math.log(10) / 10).exp().copyProperties(img, ["system:time_start"])).copyProperties(img)


def to_db(img):
    """linear -> dB, for map display and chart axes only."""
    return ee.Image(img).log10().multiply(10)


def db_to_lin(x):
    """Convert a threshold quoted in dB to linear units."""
    return 10 ** (x / 10)


def s1_grd(aoi, start, end, pass_direction=None):
    """Sentinel-1 IW GRD, VV + VH, returned in LINEAR sigma0."""
    col = (ee.ImageCollection("COPERNICUS/S1_GRD_FLOAT").filterBounds(aoi).filterDate(start, end)
           .filter(ee.Filter.eq("instrumentMode", "IW"))
           .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VH")))
    if pass_direction:
        col = col.filter(ee.Filter.eq("orbitProperties_pass", pass_direction))
    return col.select(["VV", "VH"])   # already linear sigma0


# ---------------------------------------------------------------- data out
def series_to_df(collection, geometry, scale, reducer=None, date_prop="system:time_start"):
    """Reduce every image over a geometry and return a pandas DataFrame (one row per image)."""
    reducer = reducer or ee.Reducer.mean()

    def per_image(img):
        stats = img.reduceRegion(reducer=reducer, geometry=geometry, scale=scale, maxPixels=1e10, bestEffort=True)
        return ee.Feature(None, stats).set("time", img.get(date_prop))

    fc = ee.FeatureCollection(collection.map(per_image))
    rows = fc.getInfo()["features"]
    df = pd.DataFrame([r["properties"] for r in rows])
    if "time" in df and date_prop == "system:time_start":
        df["date"] = pd.to_datetime(df["time"], unit="ms")
    return df


def fc_to_df(fc):
    """FeatureCollection → DataFrame of properties (small collections only)."""
    return pd.DataFrame([f["properties"] for f in fc.getInfo()["features"]])


def grouped_area(img_area, class_img, geometry, scale, name="class"):
    """Area (in units of img_area) per class value of class_img → DataFrame."""
    res = img_area.addBands(class_img).reduceRegion(
        reducer=ee.Reducer.sum().group(groupField=1, groupName=name),
        geometry=geometry, scale=scale, maxPixels=1e11, tileScale=4).getInfo()
    return pd.DataFrame(res["groups"]).rename(columns={"sum": "area"})
