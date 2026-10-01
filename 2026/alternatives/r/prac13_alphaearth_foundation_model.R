# Prac 13 (R / rgee): validating AlphaEarth satellite embeddings
# R extra: learning curves with class::knn and ranger on embeddings pulled locally.
source("nt_common.R"); nt_init("YOUR-CLOUD-PROJECT")
library(ranger); library(class)

aoi <- ee$Geometry$Rectangle(c(130.80, -12.75, 131.30, -12.35))
emb <- ee$ImageCollection("GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL")
E <- function(y) emb$filterDate(paste0(y, "-01-01"), paste0(y + 1, "-01-01"))$filterBounds(aoi)$mosaic()$clip(aoi)
e24 <- E(2024); e18 <- E(2018); A <- sprintf("A%02d", 0:63)

wc <- ee$ImageCollection("ESA/WorldCover/v200")$first()$clip(aoi)
labels <- wc$remap(c(10, 20, 30, 40, 50, 60, 80, 90, 95), c(0, 1, 1, 2, 3, 4, 5, 1, 0))$rename("class")
s2 <- s2_sr(aoi, "2024-05-01", "2024-09-30")$median()$select(c("B2", "B3", "B4", "B5", "B6", "B7", "B8", "B11", "B12"))
pool <- na.omit(fc_df(e24$addBands(s2)$addBands(labels)$stratifiedSample(numPoints = 400L, classBand = "class",
                                                                         region = aoi, scale = 10, seed = 7L, tileScale = 4L)))
set.seed(9); te_i <- sample(nrow(pool), round(0.4 * nrow(pool))); te <- pool[te_i, ]; trp <- pool[-te_i, ]
S2B <- c("B2", "B3", "B4", "B5", "B6", "B7", "B8", "B11", "B12")
curve <- do.call(rbind, lapply(c(5, 10, 25, 50, 100), function(n) {
  tr <- trp %>% group_by(class) %>% slice_head(n = n) %>% ungroup()
  accE <- mean(knn(tr[, A], te[, A], factor(tr$class), k = 3) == te$class)
  rf <- ranger(x = tr[, S2B], y = factor(tr$class), num.trees = 100, seed = 1)
  accS <- mean(predict(rf, te[, S2B])$predictions == te$class)
  data.frame(labels_per_class = n, embeddings_kNN = accE, S2_RF = accS)
}))
print(curve)
ggplot(tidyr::pivot_longer(curve, -labels_per_class), aes(labels_per_class, value, colour = name)) +
  geom_line() + geom_point() + scale_x_log10() + labs(y = "Overall accuracy", colour = NULL) + theme_minimal()

clusters <- e24$cluster(ee$Clusterer$wekaKMeans(8L)$train(e24$sample(region = aoi, scale = 10, numPixels = 5000L, seed = 1L)))
change <- e18$multiply(e24)$reduce("sum")
Map$centerObject(aoi, 11)
Map$addLayer(clusters$randomVisualizer(), list(), "k-means") +
  Map$addLayer(change, list(min = 0.3, max = 1, palette = c("red", "orange", "white")), "Similarity 2018 vs 2024")
