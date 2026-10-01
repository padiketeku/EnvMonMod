# Prac 08 (R / rgee): JRC surface water, Sentinel-1 flood mapping, mangrove NDVI
source("nt_common.R"); nt_init("YOUR-CLOUD-PROJECT")
km2 <- ee$Image$pixelArea()$divide(1e6)

# JRC seasonal vs permanent water (Kakadu / Mary River floodplains)
aoi <- ee$Geometry$Rectangle(c(131.60, -12.95, 132.70, -12.10))
yearly <- ee$ImageCollection("JRC/GSW1_4/YearlyHistory")
water <- bind_rows(lapply(seq(1990, 2021, 3), function(y) {
  w <- ee$Image(yearly$filter(ee$Filter$eq("year", y))$first())$select("waterClass")
  grouped_area(km2, w, aoi, 30, "cls") %>% filter(cls %in% c(2, 3)) %>% mutate(year = y)
}))
ggplot(water, aes(year, area, fill = factor(cls, labels = c("seasonal", "permanent")))) + geom_col() +
  labs(fill = NULL, y = "km²") + theme_minimal()

# Sentinel-1 flood, Victoria River at Kalkarindji (Feb–Mar 2023)
aoi2 <- ee$Geometry$Rectangle(c(130.40, -17.80, 131.20, -17.00))
s1 <- s1_grd(aoi2, "2022-10-01", "2023-03-15")
aft <- s1$filterDate("2023-02-25", "2023-03-15"); orbit <- aft$first()$get("relativeOrbitNumber_start")
before <- s1$filterDate("2022-10-01", "2022-11-30")$filter(ee$Filter$eq("relativeOrbitNumber_start", orbit))$
  select("VV")$mean()$focalMean(50, "circle", "meters")$clip(aoi2)          # linear sigma0 (s1_grd)
after <- aft$filter(ee$Filter$eq("relativeOrbitNumber_start", orbit))$select("VV")$min()$focalMean(50, "circle", "meters")$clip(aoi2)
ratio <- after$divide(before)                                                # linear change ratio
perm <- ee$Image("JRC/GSW1_4/GlobalSurfaceWater")$select("seasonality")$gte(10)$unmask(0)
flood <- ratio$lt(db_to_lin(-3))$And(after$lt(db_to_lin(-16)))$And(perm$Not())$selfMask()   # −3 dB drop; water < −16 dB
print(km2$updateMask(flood)$reduceRegion(ee$Reducer$sum(), aoi2, 10, maxPixels = 1e11, tileScale = 4L)$getInfo())
Map$setCenter(130.83, -17.43, 10)
Map$addLayer(to_db(after), list(min = -25, max = 0), "VV flood period (dB)") + Map$addLayer(flood, list(palette = "cyan"), "Flood")

# Mangrove dieback, Limmen Bight
aoi3 <- ee$Geometry$Rectangle(c(135.30, -15.60, 136.60, -14.60))
mang <- ee$ImageCollection("LANDSAT/MANGROVE_FORESTS")$filterBounds(aoi3)$mosaic()$clip(aoi3)$selfMask()
ls <- landsat89(aoi3, "2014-01-01", "2025-01-01")
ann <- ee$ImageCollection(lapply(2014:2024, function(y)
  ls$filter(ee$Filter$calendarRange(y, y, "year"))$filter(ee$Filter$calendarRange(6, 10, "month"))$median()$
    normalizedDifference(c("nir", "red"))$rename("NDVI")$updateMask(mang)$set("system:time_start", ee$Date$fromYMD(y, 8, 1)$millis())))
mg <- series_df(ann, aoi3, 30)
ggplot(mg, aes(date, NDVI)) + geom_line() + geom_point() + labs(title = "Mangrove NDVI, Limmen Bight") + theme_minimal()
