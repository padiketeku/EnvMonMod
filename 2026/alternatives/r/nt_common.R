# Shared helpers for the ENV306/506 R versions (rgee). The GEE Code Editor is the main environment;
# these R scripts are optional alternatives that mirror the scripts in `scripts/`.
# Setup (once): install.packages(c("rgee","sf","dplyr","ggplot2","ranger","pROC")); rgee::ee_install()
# Then in each script: source("nt_common.R"); nt_init("your-cloud-project")

suppressPackageStartupMessages({ library(rgee); library(sf); library(dplyr); library(ggplot2) })

nt_init <- function(project) {
  ee_Initialize(project = project, drive = TRUE)   # drive = TRUE enables ee_as_rast/ee_as_sf via Google Drive
}

nt_boundary <- function() {
  ee$FeatureCollection("FAO/GAUL/2015/level1")$filter(ee$Filter$eq("ADM1_NAME", "Northern Territory"))
}

# Landsat C2 L2: mask dilated cloud (bit 1 = 2), cloud (bit 3 = 8), shadow (bit 4 = 16); scale SR to reflectance
mask_scale_landsat <- function(img) {
  qa <- img$select("QA_PIXEL")
  m <- qa$bitwiseAnd(2)$eq(0)$And(qa$bitwiseAnd(8)$eq(0))$And(qa$bitwiseAnd(16)$eq(0))
  sr <- img$select("SR_B.")$multiply(0.0000275)$add(-0.2)
  img$addBands(sr, NULL, TRUE)$updateMask(m)
}

landsat89 <- function(aoi, start, end) {
  ee$ImageCollection("LANDSAT/LC08/C02/T1_L2")$merge(ee$ImageCollection("LANDSAT/LC09/C02/T1_L2"))$
    filterBounds(aoi)$filterDate(start, end)$map(mask_scale_landsat)$
    select(c("SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B6", "SR_B7"),
           c("blue", "green", "red", "nir", "swir1", "swir2"))
}

s2_sr <- function(aoi, start, end, cs_threshold = 0.6) {
  cs <- ee$ImageCollection("GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED")
  ee$ImageCollection("COPERNICUS/S2_SR_HARMONIZED")$filterBounds(aoi)$filterDate(start, end)$
    linkCollection(cs, list("cs_cdf"))$
    map(function(img) {
      ee$Image(img$updateMask(img$select("cs_cdf")$gte(cs_threshold))$
        select(c("B2", "B3", "B4", "B5", "B6", "B7", "B8", "B8A", "B11", "B12"))$divide(10000)$
        copyProperties(img, list("system:time_start")))
    })
}

# SAR units: COPERNICUS/S1_GRD is stored in dB. All statistics and computations use LINEAR sigma0; dB is for display only.
to_linear <- function(img) {          # 10^(dB/10), keeps metadata (orbit, pass, date)
  img <- ee$Image(img)
  ee$Image(ee$Image(img$multiply(log(10) / 10)$exp()$copyProperties(img, list("system:time_start")))$copyProperties(img))
}
to_db <- function(img) ee$Image(img)$log10()$multiply(10)     # display only
db_to_lin <- function(x) 10^(x / 10)                           # thresholds quoted in dB -> linear

# Sentinel-1 IW GRD, VV + VH, returned in LINEAR sigma0
s1_grd <- function(aoi, start, end, pass = NULL) {
  col <- ee$ImageCollection("COPERNICUS/S1_GRD")$filterBounds(aoi)$filterDate(start, end)$
    filter(ee$Filter$eq("instrumentMode", "IW"))$
    filter(ee$Filter$listContains("transmitterReceiverPolarisation", "VH"))
  if (!is.null(pass)) col <- col$filter(ee$Filter$eq("orbitProperties_pass", pass))
  col$select(c("VV", "VH"))$map(to_linear)
}

# Reduce each image over a geometry → data.frame (one row per image)
series_df <- function(collection, geometry, scale, reducer = ee$Reducer$mean(), prop = "system:time_start") {
  fc <- ee$FeatureCollection(collection$map(function(img) {
    ee$Feature(NULL, img$reduceRegion(reducer = reducer, geometry = geometry, scale = scale,
                                      maxPixels = 1e10, bestEffort = TRUE))$set("time", img$get(prop))
  }))
  feats <- fc$getInfo()$features
  df <- bind_rows(lapply(feats, function(f) as.data.frame(lapply(f$properties, function(v) if (is.null(v)) NA else v))))
  if (prop == "system:time_start") df$date <- as.POSIXct(df$time / 1000, origin = "1970-01-01", tz = "UTC")
  df
}

fc_df <- function(fc) {
  feats <- fc$getInfo()$features
  bind_rows(lapply(feats, function(f) as.data.frame(lapply(f$properties, function(v) if (is.null(v)) NA else v))))
}

grouped_area <- function(area_img, class_img, geometry, scale, name = "class") {
  res <- area_img$addBands(class_img)$reduceRegion(
    reducer = ee$Reducer$sum()$group(groupField = 1L, groupName = name),
    geometry = geometry, scale = scale, maxPixels = 1e11, tileScale = 4L)$getInfo()
  bind_rows(lapply(res$groups, as.data.frame)) %>% rename(area = sum)
}
