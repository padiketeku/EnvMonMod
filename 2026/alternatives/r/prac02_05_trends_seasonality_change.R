# Prac 02 and Prac 05 (R / rgee): Sen's slope + Mann–Kendall, harmonic regression (Prac 02); LandTrendr (Prac 05)
# R extra: check a single pixel with trend::mk.test and trend::sens.slope.
source("nt_common.R"); nt_init("YOUR-CLOUD-PROJECT")
NT <- nt_boundary()

# Annual NDVI 2001–2024, Sen's slope and Mann–Kendall ----------------------------------
years <- 2001:2024; n <- length(years)
modis <- ee$ImageCollection("MODIS/061/MOD13A3")$select("NDVI")
annual <- ee$ImageCollection(lapply(years, function(y)
  modis$filter(ee$Filter$calendarRange(y, y, "year"))$mean()$multiply(0.0001)$rename("NDVI")$
    set("year", y)$set("system:time_start", ee$Date$fromYMD(y, 7, 1)$millis())))
sens <- annual$map(function(i) ee$Image$constant(i$get("year"))$float()$rename("year")$addBands(i))$
  reduce(ee$Reducer$sensSlope())$clip(NT)
after <- ee$Filter$lessThan(leftField = "system:time_start", rightField = "system:time_start")
joined <- ee$ImageCollection(ee$Join$saveAll("after")$apply(primary = annual, secondary = annual, condition = after))
S <- ee$ImageCollection(joined$map(function(cur) {
  cur <- ee$Image(cur)
  ee$ImageCollection$fromImages(cur$get("after"))$map(function(j)
    ee$Image(j)$neq(cur)$multiply(ee$Image(j)$subtract(cur)$clamp(-1, 1))$int()$unmask(0))
})$flatten())$reduce("sum", 2L)
sdS <- sqrt(n * (n - 1) * (2 * n + 5) / 18)
Z <- ee$Image(0)$where(S$gt(0), S$subtract(1)$divide(sdS))$where(S$lt(0), S$add(1)$divide(sdS))
p <- ee$Image(1)$subtract(Z$abs()$divide(sqrt(2))$erf())$clip(NT)
Map$setCenter(133, -19, 5)
Map$addLayer(sens$select("slope")$updateMask(p$lt(0.05)),
             list(min = -0.006, max = 0.006, palette = c("#8c510a", "#f5f5f5", "#01665e")), "Sen slope (p<0.05)")

# Single-pixel check with the trend package
px <- series_df(annual, ee$Geometry$Point(c(131.19, -13.83)), 1000)
if (requireNamespace("trend", quietly = TRUE)) { print(trend::mk.test(px$NDVI)); print(trend::sens.slope(px$NDVI)) }

# Harmonic regression ---------------------------------------------------------------------
aoi <- ee$Geometry$Rectangle(c(130.70, -13.00, 131.40, -12.40))
col <- landsat89(aoi, "2014-01-01", "2025-01-01")$map(function(img) {
  t <- img$date()$difference(ee$Date("2014-01-01"), "year"); w <- ee$Image$constant(t)$multiply(2 * pi)
  img$normalizedDifference(c("nir", "red"))$rename("NDVI")$
    addBands(list(ee$Image$constant(1)$rename("constant"), ee$Image$constant(t)$float()$rename("t"),
                  w$cos()$rename("cos1"), w$sin()$rename("sin1")))$float()
})
ind <- c("constant", "t", "cos1", "sin1")
fit <- col$select(c(ind, "NDVI"))$reduce(ee$Reducer$linearRegression(numX = 4L, numY = 1L))
coefs <- fit$select("coefficients")$arrayProject(list(0L))$arrayFlatten(list(as.list(ind)))$clip(aoi)
amp <- coefs$select("cos1")$hypot(coefs$select("sin1"))
phase <- coefs$select("sin1")$atan2(coefs$select("cos1"))
Map$centerObject(aoi, 10)
Map$addLayer(phase$unitScale(-pi, pi)$addBands(amp$multiply(2.5))$addBands(coefs$select("constant"))$hsvToRgb(),
             list(), "Seasonality HSV")

# LandTrendr (year of greatest disturbance) ---------------------------------------------------
aoi3 <- ee$Geometry$Rectangle(c(131.10, -14.00, 131.40, -13.75))
p57 <- function(i) mask_scale_landsat(i)$select(c("SR_B4", "SR_B7"), c("nir", "swir2"))
p89 <- function(i) mask_scale_landsat(i)$select(c("SR_B5", "SR_B7"), c("nir", "swir2"))
ls <- ee$ImageCollection("LANDSAT/LT05/C02/T1_L2")$map(p57)$
  merge(ee$ImageCollection("LANDSAT/LC08/C02/T1_L2")$map(p89))$
  merge(ee$ImageCollection("LANDSAT/LC09/C02/T1_L2")$map(p89))$filterBounds(aoi3)
ann <- ee$ImageCollection(lapply(1988:2024, function(y) {
  c <- ls$filter(ee$Filter$calendarRange(y, y, "year"))$filter(ee$Filter$calendarRange(5, 9, "month"))
  c$median()$normalizedDifference(c("nir", "swir2"))$multiply(-1)$rename("NBR_inv")$
    set("system:time_start", ee$Date$fromYMD(y, 8, 1)$millis())$set("n", c$size())
}))$filter(ee$Filter$gt("n", 0))
lt <- ee$Algorithms$TemporalSegmentation$LandTrendr(timeSeries = ann, maxSegments = 6L, spikeThreshold = 0.9,
  vertexCountOvershoot = 3L, preventOneYearRecovery = TRUE, recoveryThreshold = 0.25, pvalThreshold = 0.05,
  bestModelProportion = 0.75, minObservationsNeeded = 6L)
arr <- lt$select("LandTrendr"); v <- arr$arrayMask(arr$arraySlice(0L, 3L, 4L))
L <- v$arraySlice(1L, 0L, -1L); R <- v$arraySlice(1L, 1L, NULL)
seg <- ee$Image$cat(list(L$arraySlice(0L, 0L, 1L), R$arraySlice(0L, 0L, 1L),
                         R$arraySlice(0L, 2L, 3L)$subtract(L$arraySlice(0L, 2L, 3L))))$toArray(0L)
gd <- seg$arraySort(seg$arraySlice(0L, 2L, 3L)$multiply(-1))$arraySlice(1L, 0L, 1L)$
  arrayProject(list(0L))$arrayFlatten(list(list("start", "end", "mag")))
yod <- gd$select("start")$add(1)$updateMask(gd$select("mag")$gt(0.15))$clip(aoi3)
Map$centerObject(aoi3, 11)
Map$addLayer(yod, list(min = 1990, max = 2024, palette = c("#9400D3", "#0000FF", "#00FF00", "#FFFF00", "#FF0000")), "Year of disturbance")
