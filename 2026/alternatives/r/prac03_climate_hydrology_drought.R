# Prac 03 (R / rgee): rainfall anomalies, drought indices (VCI, TCI, VHI), Darwin LST
source("nt_common.R"); nt_init("YOUR-CLOUD-PROJECT")
NT <- nt_boundary()

# 2.1 Wet-season totals and anomalies (CHIRPS) ----------------------------------------
chirps <- ee$ImageCollection("UCSB-CHG/CHIRPS/PENTAD")$select("precipitation")
seasons <- ee$ImageCollection$fromImages(ee$List$sequence(1981, 2024)$map(ee_utils_pyfunc(function(y) {
  y <- ee$Number(y)
  s <- ee$Date$fromYMD(y, 10, 1)
  chirps$filterDate(s, ee$Date$fromYMD(y$add(1), 5, 1))$sum()$rename("wet_mm")$
    set("season_start", y)$set("system:time_start", s$millis())
})))
base <- seasons$filter(ee$Filter$rangeContains("season_start", 1991, 2019))
z <- seasons$filter(ee$Filter$eq("season_start", 2024))$first()$subtract(base$mean())$
  divide(base$reduce(ee$Reducer$stdDev()))$clip(NT)

sites <- list(Darwin = c(130.84, -12.46), Katherine = c(132.26, -14.47), `Alice Springs` = c(133.88, -23.70))
rain <- bind_rows(lapply(names(sites), function(n)
  series_df(seasons, ee$Geometry$Point(sites[[n]])$buffer(10000), 5566, prop = "season_start") %>% mutate(site = n)))
ggplot(rain, aes(time, wet_mm, colour = site)) + geom_line() + geom_point(size = 0.8) +
  labs(x = "Season starting", y = "Oct–Apr rainfall (mm)") + theme_minimal()
Map$setCenter(133, -19, 5)
Map$addLayer(z, list(min = -2, max = 2, palette = c("#b2182b", "#f7f7f7", "#2166ac")), "2024/25 z-score")

# 2.2 VCI / TCI / VHI for October 2019 -------------------------------------------------
ndvi <- ee$ImageCollection("MODIS/061/MOD13A3")$filterDate("2001-01-01", "2025-01-01")$
  map(function(i) i$select("NDVI")$multiply(0.0001)$copyProperties(i, list("system:time_start")))
lst8 <- ee$ImageCollection("MODIS/061/MOD11A2")$filterDate("2001-01-01", "2025-01-01")$select("LST_Day_1km")
start <- ee$Date("2001-01-01")
lst <- ee$ImageCollection$fromImages(ee$List$sequence(0, 287)$map(ee_utils_pyfunc(function(n) {
  d <- start$advance(n, "month")
  lst8$filterDate(d, d$advance(1, "month"))$mean()$multiply(0.02)$subtract(273.15)$rename("LST")$
    set("system:time_start", d$millis())
})))
condition <- function(col, date, inverse = FALSE) {
  m <- date$get("month"); same <- col$filter(ee$Filter$calendarRange(m, m, "month"))
  mn <- same$min(); mx <- same$max(); cur <- ee$Image(col$filterDate(date, date$advance(1, "month"))$first())
  idx <- if (inverse) mx$subtract(cur)$divide(mx$subtract(mn)) else cur$subtract(mn)$divide(mx$subtract(mn))
  idx$multiply(100)
}
T0 <- ee$Date("2019-10-01")
vci <- condition(ndvi, T0)$rename("VCI")$clip(NT)
tci <- condition(lst, T0, TRUE)$rename("TCI")$clip(NT)
vhi <- vci$multiply(0.5)$add(tci$multiply(0.5))$rename("VHI")
print(ee$Image$pixelArea()$divide(1e6)$updateMask(vhi$lt(40))$
        reduceRegion(ee$Reducer$sum(), NT$geometry(), 1000, maxPixels = 1e11)$getInfo())
ci <- list(min = 0, max = 100, palette = c("#a50026", "#f46d43", "#fee08b", "#d9ef8b", "#66bd63", "#006837"))
Map$addLayer(vci, ci, "VCI") + Map$addLayer(vhi, ci, "VHI")

# 2.3 Darwin LST vs NDVI ---------------------------------------------------------------
darwin <- ee$Geometry$Rectangle(c(130.80, -12.52, 131.05, -12.33))
comp <- ee$ImageCollection("LANDSAT/LC08/C02/T1_L2")$merge(ee$ImageCollection("LANDSAT/LC09/C02/T1_L2"))$
  filterBounds(darwin)$filterDate("2021-01-01", "2025-01-01")$filter(ee$Filter$calendarRange(9, 11, "month"))$
  map(function(img) {
    q <- img$select("QA_PIXEL"); m <- q$bitwiseAnd(8)$eq(0)$And(q$bitwiseAnd(16)$eq(0))
    st <- img$select("ST_B10")$multiply(0.00341802)$add(149)$subtract(273.15)$rename("LST_C")
    sr <- img$select(c("SR_B4", "SR_B5"))$multiply(0.0000275)$add(-0.2)
    st$addBands(sr$normalizedDifference(c("SR_B5", "SR_B4"))$rename("NDVI"))$updateMask(m)
  })$median()$clip(darwin)
pts <- fc_df(comp$sample(region = darwin, scale = 30, numPixels = 2000L, seed = 3L))
ggplot(pts, aes(NDVI, LST_C)) + geom_point(alpha = 0.3, size = 0.6) + geom_smooth(method = "lm") + theme_minimal()
