# Prac 07 (R / rgee): dNBR burn severity and fire regime (EDS vs LDS)
source("nt_common.R"); nt_init("YOUR-CLOUD-PROJECT")
NT <- nt_boundary()

# dNBR severity, 2023
aoi <- ee$Geometry$Rectangle(c(132.70, -13.00, 133.60, -12.30))
nbr <- function(col) col$median()$normalizedDifference(c("B8A", "B12"))$rename("NBR")
pre <- nbr(s2_sr(aoi, "2023-05-01", "2023-06-15"))$clip(aoi)
post <- nbr(s2_sr(aoi, "2023-10-15", "2023-11-20"))$clip(aoi)
d <- pre$subtract(post)
sev <- ee$Image(0)$where(d$lt(-0.25), 1)$where(d$gte(-0.25)$And(d$lt(-0.1)), 2)$where(d$gte(-0.1)$And(d$lt(0.1)), 3)$
  where(d$gte(0.1)$And(d$lt(0.27)), 4)$where(d$gte(0.27)$And(d$lt(0.44)), 5)$where(d$gte(0.44)$And(d$lt(0.66)), 6)$
  where(d$gte(0.66), 7)$updateMask(d$mask())$clip(aoi)
print(grouped_area(ee$Image$pixelArea()$divide(1e4), sev, aoi, 20))
Map$centerObject(aoi, 9)
Map$addLayer(sev, list(min = 1, max = 7, palette = c("#7a8737", "#acbe4d", "#0ae042", "#fff70b", "#ffaf38", "#ff641b", "#a41fd6")), "Severity")

# Fire regime: EDS vs LDS burned area, western Arnhem Land, 2001–2024
mcd <- ee$ImageCollection("MODIS/061/MCD64A1")$select("BurnDate")
arnhem <- ee$Geometry$Rectangle(c(133.0, -13.3, 134.3, -12.0))
km2 <- ee$Image$pixelArea()$divide(1e6)
fc <- ee$FeatureCollection(lapply(2001:2024, function(y) {
  bd <- mcd$filter(ee$Filter$calendarRange(y, y, "year"))$max()
  a <- ee$Image$cat(km2$multiply(bd$gt(0)$And(bd$lt(213))$unmask(0))$rename("EDS"),
                    km2$multiply(bd$gte(213)$unmask(0))$rename("LDS"))$reduceRegion(ee$Reducer$sum(), arnhem, 500, maxPixels = 1e11)
  ee$Feature(NULL, a)$set("year", y)
}))
fire <- fc_df(fc) %>% tidyr::pivot_longer(c(EDS, LDS), names_to = "season", values_to = "km2")
ggplot(fire, aes(year, km2, fill = season)) + geom_col() + scale_fill_manual(values = c("#4daf4a", "#e41a1c")) +
  geom_vline(xintercept = 2005.5, linetype = 2) + labs(title = "Western Arnhem Land burned area", y = "km²") + theme_minimal()
