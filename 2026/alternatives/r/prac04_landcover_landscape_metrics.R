# Prac 04 (R / rgee): RF/CART/SVM classification and landscape metrics
# R extra: confusion matrices with base R; landscapemetrics on a downloaded raster (optional).
source("nt_common.R"); nt_init("YOUR-CLOUD-PROJECT")

aoi <- ee$Geometry$Rectangle(c(130.60, -13.10, 131.20, -12.40))
comp <- function(s, e, sfx) {
  c <- s2_sr(aoi, s, e)$median()$select(c("B2", "B3", "B4", "B5", "B6", "B7", "B8", "B11", "B12"))
  out <- c$addBands(c$normalizedDifference(c("B8", "B4"))$rename("NDVI"))$
    addBands(c$normalizedDifference(c("B3", "B11"))$rename("MNDWI"))$
    addBands(c$normalizedDifference(c("B11", "B8"))$rename("NDBI"))
  out$rename(out$bandNames()$map(ee_utils_pyfunc(function(b) ee$String(b)$cat(sfx))))
}
dem <- ee$Image("NASA/NASADEM_HGT/001")$select("elevation")
X <- comp("2021-05-01", "2021-09-30", "_dry")$addBands(comp("2021-03-01", "2021-04-30", "_wet"))$
  addBands(dem)$addBands(ee$Terrain$slope(dem))$clip(aoi)
bands <- X$bandNames()

wc <- ee$ImageCollection("ESA/WorldCover/v200")$first()$clip(aoi)
labels <- wc$remap(c(10, 20, 30, 40, 50, 60, 80, 90, 95), c(0, 1, 1, 2, 3, 4, 5, 1, 6))$rename("class")
samples <- X$addBands(labels)$stratifiedSample(numPoints = 300L, classBand = "class", region = aoi, scale = 10,
                                                seed = 42L, geometries = TRUE, tileScale = 4L)$randomColumn("r", 7L)
train <- samples$filter(ee$Filter$lt("r", 0.7)); test <- samples$filter(ee$Filter$gte("r", 0.7))

rf   <- ee$Classifier$smileRandomForest(numberOfTrees = 200L, seed = 1L)$train(train, "class", bands)
cart <- ee$Classifier$smileCart(minLeafPopulation = 5L)$train(train, "class", bands)
for (nm in c("rf", "cart")) {
  d <- fc_df(test$classify(get(nm))$select(c("class", "classification")))
  cat("\n==", toupper(nm), "== overall accuracy:", round(mean(d$class == d$classification), 3), "\n")
  print(table(reference = d$class, predicted = d$classification))
}
imp <- unlist(ee$Dictionary(rf$explain()$get("importance"))$getInfo())
print(head(sort(imp, decreasing = TRUE), 10))

Map$centerObject(aoi, 10)
Map$addLayer(X$classify(rf), list(min = 0, max = 6, palette = c("#006400", "#ffbb22", "#f096ff", "#fa0000",
                                                                 "#b4b4b4", "#0064c8", "#00cf75")), "RF")

# 3.2 Landscape metrics (Dynamic World woodland, Douglas–Daly) --------------------------
aoi2 <- ee$Geometry$Rectangle(c(131.05, -14.05, 131.45, -13.65))
proj <- ee$Projection("EPSG:32752")$atScale(30)
habitat <- function(y) {
  lc <- ee$ImageCollection("GOOGLE/DYNAMICWORLD/V1")$filterBounds(aoi2)$
    filterDate(paste0(y, "-05-01"), paste0(y, "-09-30"))$select("label")$mode()$clip(aoi2)
  lc$eq(1)$Or(lc$eq(5))$reproject(proj)
}
metrics <- function(hab) {
  p <- hab$selfMask()$reduceToVectors(geometry = aoi2, crs = proj, geometryType = "polygon",
                                      eightConnected = TRUE, maxPixels = 1e10, tileScale = 4L)$
    map(function(f) f$set(list(area_ha = f$area(1)$divide(1e4), perim_m = f$perimeter(1))))
  tot <- ee$Number(aoi2$area(1))$divide(1e4); habha <- ee$Number(p$aggregate_sum("area_ha"))
  unlist(ee$Dictionary(list(PLAND_pct = habha$divide(tot)$multiply(100), NP = p$size(),
                            MPS_ha = habha$divide(p$size()),
                            LPI_pct = ee$Number(p$aggregate_max("area_ha"))$divide(tot)$multiply(100),
                            ED_m_per_ha = ee$Number(p$aggregate_sum("perim_m"))$divide(tot)))$getInfo())
}
print(rbind(`2017` = metrics(habitat(2017)), `2024` = metrics(habitat(2024))))
# Optional: download the 2024 habitat raster (ee_as_rast) and run landscapemetrics::calculate_lsm() for the full suite.
