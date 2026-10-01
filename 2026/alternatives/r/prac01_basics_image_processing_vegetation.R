# Prac 01 (R / rgee): GEE basics, image processing fundamentals, vegetation dynamics
# Optional R version of prac01a–c. The GEE Code Editor is the main environment.
source("nt_common.R"); nt_init("YOUR-CLOUD-PROJECT")

# 1.1 Composites, NDVI, statistics -------------------------------------------------
aoi <- ee$Geometry$Point(c(130.8456, -12.4634))$buffer(20000)
ls  <- landsat89(aoi, "2024-05-01", "2024-09-30")
s2  <- s2_sr(aoi, "2024-05-01", "2024-09-30")
cat("Landsat scenes:", ls$size()$getInfo(), " S2 scenes:", s2$size()$getInfo(), "\n")
s2c  <- s2$median()$clip(aoi)
ndvi <- s2c$normalizedDifference(c("B8", "B4"))$rename("NDVI")
print(ndvi$reduceRegion(ee$Reducer$mean()$combine(ee$Reducer$stdDev(), NULL, TRUE), aoi, 10)$getInfo())

Map$centerObject(aoi, 10)
Map$addLayer(s2c, list(bands = c("B4", "B3", "B2"), min = 0, max = 0.3), "S2 true colour") +
  Map$addLayer(ndvi, list(min = 0, max = 0.8, palette = c("#a6611a", "#f5f5f5", "#018571")), "NDVI")

# Download NDVI as a terra/stars raster via Drive (small areas), or export to Drive
task <- ee_image_to_drive(image = ndvi, description = "Prac01a_NDVI_R", folder = "GEE_NT",
                          region = aoi, scale = 10, crs = "EPSG:32752", maxPixels = 1e10)
task$start()

# 1.2 Image management and PCA ------------------------------------------------------
l9 <- ee$ImageCollection("LANDSAT/LC09/C02/T1_L2")$filterBounds(aoi)$filterDate("2024-01-01", "2025-01-01")
print(unlist(l9$aggregate_array("CLOUD_COVER")$getInfo()))
scene <- ee$Image(l9$sort("CLOUD_COVER")$first())
img <- mask_scale_landsat(scene)$select(c("SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B6", "SR_B7"),
                                        c("blue", "green", "red", "nir", "swir1", "swir2"))$clip(aoi)
bands <- img$bandNames()
centered <- img$subtract(ee$Image$constant(img$reduceRegion(ee$Reducer$mean(), aoi, 60)$values(bands)))
arrays <- centered$toArray()
covar <- arrays$reduceRegion(ee$Reducer$centeredCovariance(), aoi, 60, maxPixels = 1e9)
eig <- ee$Array(covar$get("array"))$eigen()
ev <- unlist(eig$slice(1L, 0L, 1L)$getInfo())
cat("Proportion of variance per PC:", round(ev / sum(ev), 3), "\n")

# 1.3 MODIS NDVI time series at three sites -----------------------------------------
modis <- ee$ImageCollection("MODIS/061/MOD13Q1")$filterDate("2001-01-01", "2026-01-01")$
  map(function(i) i$select("NDVI")$multiply(0.0001)$updateMask(i$select("SummaryQA")$lte(1))$
        copyProperties(i, list("system:time_start")))
sites <- list("Howard Springs" = c(131.1501, -12.4952), "Douglas-Daly" = c(131.19, -13.83),
              "Alice Springs" = c(133.88, -23.70))
ts <- bind_rows(lapply(names(sites), function(n)
  series_df(modis, ee$Geometry$Point(sites[[n]]), 250) %>% mutate(site = n)))
ggplot(ts, aes(date, NDVI, colour = site)) + geom_line(linewidth = 0.3) +
  labs(title = "MODIS NDVI 2001–2025", x = NULL) + theme_minimal()
