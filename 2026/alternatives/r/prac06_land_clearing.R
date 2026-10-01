# Prac 06 (R / rgee): Hansen loss and annual Sentinel-2 clearing detection
source("nt_common.R"); nt_init("YOUR-CLOUD-PROJECT")
aoi <- ee$Geometry$Rectangle(c(130.9, -14.2, 131.6, -13.6))
ha <- ee$Image$pixelArea()$divide(1e4)

# Part A: Hansen loss by year at four canopy thresholds
gfc <- ee$Image("UMD/hansen/global_forest_change_2023_v1_11")$clip(aoi)
loss_df <- bind_rows(lapply(c(10, 20, 30, 50), function(thr) {
  loss <- gfc$select("loss")$And(gfc$select("treecover2000")$gte(thr))
  grouped_area(ha$updateMask(loss), gfc$select("lossyear"), aoi, 30, "year") %>% mutate(year = year + 2000, threshold = thr)
}))
ggplot(loss_df, aes(factor(year), area, fill = factor(threshold))) + geom_col(position = "dodge") +
  labs(x = NULL, y = "Loss (ha)", fill = "Canopy %") + theme_minimal() + theme(axis.text.x = element_text(angle = 90))

# Part B: Sentinel-2 clearing rules (NDVI drop, BSI rise, persistence, woody baseline)
YEARS <- 2018:2025
dry <- function(y) {
  c <- s2_sr(aoi, paste0(y, "-06-01"), paste0(y, "-09-30"))$median()
  c$normalizedDifference(c("B8", "B4"))$rename("NDVI")$addBands(
    c$expression("((S+R)-(N+B))/((S+R)+(N+B))", list(S = c$select("B11"), R = c$select("B4"),
                                                     N = c$select("B8"), B = c$select("B2")))$rename("BSI"))$clip(aoi)
}
comps <- lapply(YEARS, dry)
woody <- ee$ImageCollection("GOOGLE/DYNAMICWORLD/V1")$filterBounds(aoi)$filterDate("2018-05-01", "2018-09-30")$
  select("trees")$mean()$gt(0.4)$clip(aoi)
clear <- ee$Image(0)
for (i in 2:(length(YEARS) - 1)) {
  pv <- comps[[i - 1]]; cu <- comps[[i]]; nx <- comps[[i + 1]]
  cl <- pv$select("NDVI")$subtract(cu$select("NDVI"))$gt(0.20)$And(cu$select("NDVI")$lt(0.30))$
    And(cu$select("BSI")$subtract(pv$select("BSI"))$gt(0.05))$And(nx$select("NDVI")$lt(0.35))$And(woody)
  clear <- clear$where(cl$And(clear$eq(0)), YEARS[i])
}
clear <- clear$selfMask()$rename("clear_year")
clear <- clear$updateMask(clear$connectedPixelCount(200L, TRUE)$gte(100))
print(grouped_area(ha, clear, aoi, 10, "year"))

patches <- clear$toInt()$reduceToVectors(geometry = aoi, scale = 10, geometryType = "polygon",
  labelProperty = "clear_year", eightConnected = TRUE, maxPixels = 1e11, tileScale = 8L)$
  map(function(f) f$set("area_ha", f$area(1)$divide(1e4)))$filter(ee$Filter$gte("area_ha", 1))
patches_sf <- ee_as_sf(patches$limit(500L))            # sf object for mapping / analysis in R
print(head(patches_sf[order(-patches_sf$area_ha), ], 10))
Map$centerObject(aoi, 10)
Map$addLayer(clear, list(min = 2019, max = 2024, palette = c("#fee08b", "#f46d43", "#a50026")), "S2 clearing year")
