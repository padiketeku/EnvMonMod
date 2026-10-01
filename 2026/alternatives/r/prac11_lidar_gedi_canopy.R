# Prac 11 (R / rgee): GEDI canopy height and optical–SAR–lidar fusion
# R extra: compare sensor sets with ranger out-of-bag R² on the GEDI training table.
source("nt_common.R"); nt_init("YOUR-CLOUD-PROJECT")
library(ranger)
aoi <- ee$Geometry$Rectangle(c(130.90, -13.10, 131.50, -12.50))

qa <- function(img) img$updateMask(img$select("quality_flag")$eq(1))$updateMask(img$select("degrade_flag")$eq(0))$
  updateMask(img$select("sensitivity")$gt(0.95))
gedi <- ee$ImageCollection("LARSE/GEDI/GEDI02_A_002_MONTHLY")$filterBounds(aoi)$filterDate("2019-04-01", "2023-03-31")$
  map(qa)$select("rh98")$mosaic()$clip(aoi)$rename("height")

s2 <- s2_sr(aoi, "2021-05-01", "2021-09-30")$median()
opt <- s2$select(c("B2", "B3", "B4", "B5", "B8", "B11", "B12"))$addBands(s2$normalizedDifference(c("B8", "B4"))$rename("NDVI"))$
  addBands(s2$normalizedDifference(c("B8", "B11"))$rename("NDMI"))
s1 <- s1_grd(aoi, "2021-05-01", "2021-09-30")$median()
sarC <- s1$addBands(s1$select("VH")$divide(s1$select("VV"))$rename("VH_VV"))   # linear sigma0 and linear cross-pol ratio
pal <- ee$ImageCollection("JAXA/ALOS/PALSAR/YEARLY/SAR_EPOCH")$filterDate("2021-01-01", "2022-01-01")$first()
sarL <- pal$select(c("HH", "HV"))$pow(2)$multiply(10^-8.3)$rename(c("L_HH", "L_HV"))   # linear gamma0 = DN^2 * 10^-8.3
dem <- ee$Image("NASA/NASADEM_HGT/001")$select("elevation")
X <- opt$addBands(sarC)$addBands(sarL)$addBands(dem)$addBands(ee$Terrain$slope(dem))$clip(aoi)$float()

tab <- na.omit(fc_df(X$addBands(gedi)$sample(region = aoi, scale = 25, numPixels = 20000L, seed = 1L, tileScale = 4L)))
sets <- list(optical = c("B2", "B3", "B4", "B5", "B8", "B11", "B12", "NDVI", "NDMI"), SAR = c("VV", "VH", "VH_VV", "L_HH", "L_HV"))
sets$all <- c(sets$optical, sets$SAR, "elevation", "slope")
print(sapply(sets, function(v) ranger(x = tab[, v], y = tab$height, num.trees = 200, min.node.size = 5, seed = 1)$r.squared))

fc <- X$addBands(gedi)$sample(region = aoi, scale = 25, numPixels = 20000L, seed = 1L, tileScale = 4L)$filter(ee$Filter$notNull(list("height")))
rf <- ee$Classifier$smileRandomForest(200L, minLeafPopulation = 5L, seed = 1L)$setOutputMode("REGRESSION")$train(fc, "height", X$bandNames())
vis <- list(min = 0, max = 30, palette = c("#ffffcc", "#78c679", "#006837"))
Map$centerObject(aoi, 10)
Map$addLayer(X$classify(rf), vis, "Predicted canopy height (m)") + Map$addLayer(gedi, vis, "GEDI rh98")
