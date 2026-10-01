# Prac 10 (R / rgee): urban sprawl detection with Sentinel-1 (Darwin–Palmerston)
source("nt_common.R"); nt_init("YOUR-CLOUD-PROJECT")
aoi <- ee$Geometry$Rectangle(c(130.80, -12.62, 131.12, -12.33))
YEARS <- c(2016, 2018, 2020, 2022, 2024); VV_T_DB <- -8; VH_T_DB <- -15; CV_T <- 0.5   # dB thresholds converted to linear; CV of linear VV
s1 <- s1_grd(aoi, "2016-01-01", "2025-01-01", "DESCENDING")
water <- ee$Image("JRC/GSW1_4/GlobalSurfaceWater")$select("occurrence")$gt(50)$unmask(0)
slope <- ee$Terrain$slope(ee$Image("NASA/NASADEM_HGT/001")$select("elevation"))

built_up <- function(y) {
  c <- s1$filterDate(paste0(y, "-05-01"), paste0(y, "-10-31"))
  med <- c$median(); cv <- c$select("VV")$reduce(ee$Reducer$stdDev())$divide(c$select("VV")$mean())   # linear sigma0
  b <- med$select("VV")$gt(db_to_lin(VV_T_DB))$And(med$select("VH")$gt(db_to_lin(VH_T_DB)))$And(cv$lt(CV_T))$And(water$Not())$And(slope$lt(10))$focalMode(1)
  b$updateMask(b$connectedPixelCount(50L, TRUE)$gte(10))$unmask(0)$clip(aoi)
}
built <- lapply(YEARS, built_up)
for (i in 2:length(built)) built[[i]] <- built[[i]]$Or(built[[i - 1]])
km2 <- ee$Image$pixelArea()$divide(1e6)
area <- sapply(built, function(b) km2$updateMask(b)$reduceRegion(ee$Reducer$sum(), aoi, 10, maxPixels = 1e11, tileScale = 4L)$get("area")$getInfo())
df <- data.frame(year = YEARS, built_km2 = area); print(df)
cat("Annual growth rate (%/yr):", 100 * log(tail(area, 1) / area[1]) / (tail(YEARS, 1) - YEARS[1]), "\n")
ggplot(df, aes(factor(year), built_km2)) + geom_col(fill = "grey40") + labs(x = NULL, y = "Built-up (km²)") + theme_minimal()

old <- built[[1]]; new <- built[[length(built)]]$And(old$Not())
share <- old$reduceNeighborhood(ee$Reducer$mean(), ee$Kernel$circle(100, "meters"))
lei <- ee$Image(0)$where(new$And(share$gt(0.5)), 1)$where(new$And(share$gt(0))$And(share$lte(0.5)), 2)$
  where(new$And(share$eq(0)), 3)$selfMask()
print(grouped_area(km2, lei, aoi, 10, "type"))        # 1 infill, 2 edge-expansion, 3 outlying
Map$centerObject(aoi, 11)
Map$addLayer(old$selfMask(), list(palette = "#636363"), "Built 2016") +
  Map$addLayer(lei, list(min = 1, max = 3, palette = c("#fdae61", "#d7191c", "#7b3294")), "New urban by LEI type")
