# Prac 12 (R / rgee): Gouldian finch SDM with spatial-block cross-validation
# R extras: ALA CSV via read.csv (or the galah package); AUC with pROC.
source("nt_common.R"); nt_init("YOUR-CLOUD-PROJECT")
library(pROC)
NT <- nt_boundary(); region <- NT$geometry(); SCALE <- 1000

occ_df <- read.csv("gouldian_finch_ALA.csv")
occ_df <- occ_df[!is.na(occ_df$decimalLongitude), ]
if ("coordinateUncertaintyInMeters" %in% names(occ_df))
  occ_df <- occ_df[is.na(occ_df$coordinateUncertaintyInMeters) | occ_df$coordinateUncertaintyInMeters < 1000, ]
occ <- sf_as_ee(st_as_sf(occ_df[, c("decimalLongitude", "decimalLatitude")], coords = 1:2, crs = 4326))$filterBounds(region)

bio <- ee$Image("WORLDCLIM/V1/BIO"); dem <- ee$Image("NASA/NASADEM_HGT/001")$select("elevation")
mod13 <- ee$ImageCollection("MODIS/061/MOD13A3")$filterDate("2015-01-01", "2025-01-01")$select("NDVI")
mcd <- ee$ImageCollection("MODIS/061/MCD64A1")$select("BurnDate")
yr <- function(f) ee$ImageCollection(lapply(2005:2024, function(y) f(mcd$filter(ee$Filter$calendarRange(y, y, "year"))$max())))$sum()
water <- ee$Image("JRC/GSW1_4/GlobalSurfaceWater")$select("occurrence")$gt(50)$unmask(0)
X <- ee$Image$cat(list(
  bio$select("bio01")$divide(10)$rename("temp_mean"), bio$select("bio05")$divide(10)$rename("temp_max"),
  bio$select("bio12")$rename("rain"), bio$select("bio15")$rename("rain_seas"), dem$rename("elev"),
  ee$Terrain$slope(dem)$rename("slope"), mod13$mean()$multiply(1e-4)$rename("ndvi"),
  mod13$filter(ee$Filter$calendarRange(8, 10, "month"))$mean()$multiply(1e-4)$rename("ndvi_dry"),
  ee$ImageCollection("MODIS/061/MOD44B")$filterDate("2015-01-01", "2024-12-31")$select("Percent_Tree_Cover")$mean()$rename("tree"),
  yr(function(b) b$gt(0)$unmask(0))$rename("fire_freq"), yr(function(b) b$gte(213)$unmask(0))$rename("late_fire"),
  water$fastDistanceTransform(500L)$sqrt()$multiply(ee$Image$pixelArea()$sqrt())$rename("dist_water")))$
  clip(region)$reproject(crs = "EPSG:3577", scale = SCALE)
bands <- unlist(X$bandNames()$getInfo())

pres <- X$sampleRegions(collection = occ$map(function(f) f$set("pa", 1)), properties = list("pa"), scale = SCALE, geometries = TRUE)
bg <- X$sample(region = region, scale = SCALE, numPixels = 10000L, seed = 11L, geometries = TRUE)$limit(5000L)$map(function(f) f$set("pa", 0))
d <- st_transform(ee_as_sf(pres$merge(bg), maxFeatures = 20000), 3577) %>% na.omit()
xy <- st_coordinates(d)
d$cell <- paste(xy[, 1] %/% SCALE, xy[, 2] %/% SCALE); d$block <- paste(xy[, 1] %/% 50000, xy[, 2] %/% 50000)
d <- rbind(d[d$pa == 1 & !duplicated(d$cell), ], d[d$pa == 0, ])
set.seed(1); test_blocks <- sample(unique(d$block), length(unique(d$block)) %/% 3)
tr <- d[!d$block %in% test_blocks, ]; te <- d[d$block %in% test_blocks, ]

rf <- ee$Classifier$smileRandomForest(500L, minLeafPopulation = 5L, seed = 1L)$setOutputMode("PROBABILITY")$
  train(sf_as_ee(st_transform(tr[, c(bands, "pa")], 4326)), "pa", bands)
sc <- fc_df(sf_as_ee(st_transform(te[, c(bands, "pa")], 4326))$classify(rf, "score"))
r <- roc(sc$pa, sc$score, quiet = TRUE); cat("Spatial-block test AUC (RF):", round(auc(r), 3), "\n"); plot(r)

Map$setCenter(133, -16, 5)
Map$addLayer(X$classify(rf), list(min = 0, max = 1, palette = c("#f7fcf5", "#74c476", "#00441b")), "Suitability (RF)")
