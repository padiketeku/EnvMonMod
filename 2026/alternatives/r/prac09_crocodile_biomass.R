# Prac 09 (R / rgee): floodplain inundation vs crocodile biomass across NT tidal rivers (2009–2022)
# Optional R version of prac09_crocodile_biomass.js. You provide (from Learnline; restricted, do not share or post publicly)
# croc-biomass-data.csv and flooded_areas_shapefiles.zip (floodplain polygons for the six river systems). Method adapted from UN-SPIDER; Tim Palmer;
# crocodile data supplied by Cameron Baker. R extras: river fixed effects and lme4 mixed models.
source("nt_common.R"); nt_init("YOUR-CLOUD-PROJECT")

croc <- read.csv("croc-biomass-data.csv")
print(aggregate(Year ~ River, croc, function(y) c(n = length(y), from = min(y), to = max(y))))

# Floodplain zones = convex hull of each river's flooded-area polygons (flooded_areas_shapefiles.zip from Learnline)
D <- "flooded_areas_shapefiles"
SHP <- c(Adelaide = "Adelaide_river_shapefile/flooded_Adelaide_river.shp", Mary = "Mary_river_shapefile/flooded_Mary_river.shp",
         Daly = "Daly_river_shapefile/flooded_Daly_river.shp", Liverpool = "Liverpool_Tomkinson_river_shapefile/flooded_Liverpool_river.shp",
         Blyth = "Blyth_Cadell_river_shapefile/flooded_Blyth_river.shp", Glyde = "Glyde_river_shapefile/flooded_Glyde_river.shp")
SHP["Tomkinson"] <- SHP["Liverpool"]; SHP["Cadell"] <- SHP["Blyth"]     # tributaries share the floodplain zone
ZONES <- lapply(SHP, function(f) sf_as_ee(st_sf(geometry = st_convex_hull(st_union(st_transform(st_read(file.path(D, f), quiet = TRUE), 4326)))))$geometry())

s1 <- ee$ImageCollection("COPERNICUS/S1_GRD")$filter(ee$Filter$eq("instrumentMode", "IW"))$
  filter(ee$Filter$eq("orbitProperties_pass", "DESCENDING"))$filter(ee$Filter$eq("resolution_meters", 10))$select("VH")$
  map(to_linear)   # linear sigma0; dB only for display
permanent <- ee$Image("JRC/GSW1_4/GlobalSurfaceWater")$select("seasonality")$gte(10)$unmask(0)
slope <- ee$Terrain$slope(ee$Image("AU/GA/DEM_1SEC/v10/DEM-H")$select("elevation"))
boxcar <- function(img) img$convolve(ee$Kernel$square(radius = 1, units = "pixels", normalize = TRUE))   # 3 x 3 mean, linear
flood_map <- function(before, after, drop_db = 3) {
  # linear ratio after/before; flood = darkening of at least drop_db (never a ratio of dB values)
  f <- boxcar(after)$divide(boxcar(before))$lt(db_to_lin(-drop_db))$where(permanent, 0)
  f <- f$updateMask(f); f <- f$updateMask(f$connectedPixelCount()$gte(8)); f$updateMask(slope$lte(5))
}
area_ha <- function(mask, region, scale) ee$Image$pixelArea()$divide(1e4)$updateMask(mask)$
  reduceRegion(ee$Reducer$sum(), region, scale, maxPixels = 1e11, tileScale = 8L)$getNumber("area")

# Part A: Adelaide River, August 2017 
aoiA <- ZONES[["Adelaide"]]
fA <- flood_map(s1$filterBounds(aoiA)$filterDate("2017-07-01", "2017-08-01")$mosaic()$clip(aoiA),
                s1$filterBounds(aoiA)$filterDate("2017-08-01", "2017-09-01")$mosaic()$clip(aoiA))
cat("Aug 2017 flooded (ha):", round(area_ha(fA, aoiA, 10)$getInfo()), "\n")

# Part B: floodplain metrics per river-year
jrc <- ee$ImageCollection("JRC/GSW1_4/YearlyHistory")
metrics <- function(river, year) {
  region <- ZONES[[river]]; out <- list()
  if (year <= 2021) {
    w <- ee$Image(jrc$filter(ee$Filter$eq("year", year))$first())$select("waterClass")
    out$jrc_seasonal_ha <- area_ha(w$eq(2), region, 30)
  }
  if (year >= 2016) {
    col <- s1$filterBounds(region)
    b <- col$filterDate(paste0(year - 1, "-09-01"), paste0(year - 1, "-11-01"))
    a <- col$filterDate(paste0(year, "-01-01"), paste0(year, "-05-01"))
    if (b$size()$getInfo() > 0 && a$size()$getInfo() > 0)
      out$s1_peak_ha <- area_ha(flood_map(b$median()$clip(region), a$min()$clip(region)), region, 20)
  }
  if (length(out)) as.data.frame(ee$Dictionary(out)$getInfo()) else data.frame()
}
met <- do.call(dplyr::bind_rows, lapply(seq_len(nrow(croc)), function(i)
  cbind(croc[i, c("River", "Year")], metrics(croc$River[i], croc$Year[i]))))
tab <- merge(croc, met, by = c("River", "Year")); write.csv(tab, "prac09_croc_floodplain_table.csv", row.names = FALSE)

d <- subset(tab, !is.na(jrc_seasonal_ha)); d$flood_kha <- d$jrc_seasonal_ha / 1000
print(summary(lm(Biomass_km ~ flood_kha, d)))                 # pooled
print(summary(lm(Biomass_km ~ flood_kha + River, d)))         # river fixed effects
if (requireNamespace("lme4", quietly = TRUE)) print(summary(lme4::lmer(Biomass_km ~ flood_kha + (1 | River), d)))
ggplot(d, aes(flood_kha, Biomass_km, colour = River)) + geom_point(size = 2) +
  geom_smooth(aes(group = 1), method = "lm", colour = "black") +
  labs(x = "Seasonal floodplain water (thousand ha)", y = "Biomass (kg/km)") + theme_minimal()
