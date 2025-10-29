# Acknowledgements

Google Earth Engine Developers

Google Earth Engine Team


# Introduction

In this practical, you will learn about the Google's AlphaEarth Foundation (AEF) model through the Satellite Embedding Dataset in Earth Engine. Google AEF is one of the recent Geospatial Foundation Models created through Artificial Intelligence algorithms leveraging a range of earth observation data. Further details on the AEF have been reported in the paper [here](https://arxiv.org/pdf/2507.22291).


# Learning Outcomes

- Learn the fundamentals of the Satellite Embedding Dataset (SED)

- Visualise the SED

- Perform cluster analysis using the SED





# Description of SED

The Google Satellite Embedding dataset is a global, analysis-ready collection of learned geospatial embeddings. Each 10-meter pixel in this dataset is a 64-dimensional representation, or "embedding vector," that encodes temporal trajectories of surface conditions at and around that pixel as measured by various Earth observation instruments and datasets, over a single calendar year. Unlike conventional spectral inputs and indices, where bands correspond to physical measurements, embeddings are feature vectors that summarize relationships across multi-source, multi-modal observations in a less directly interpretable, but more powerful way.
The dataset covers terrestrial land surfaces and shallow waters, including intertidal and reef zones, inland waterways, and coastal waterways. Coverage at the poles is limited by satellite orbits and instrument coverage.

The collection is composed of images covering approximately 163,840 meters by 163,840 meters, and each image has 64 bands {A00, A01, …, A63}, one for each axis of the 64D embedding space. All bands should be used for downstream analysis as they collectively refer to a 64D coordinate in the embedding space and are not independently interpretable.

All images are generated in their local Universal Transverse Mercator projection as indicated by the UTM_ZONE property, and have system:time_start and system:time_end properties that reflect the calendar year summarized by the embeddings; for example, an embedding image for 2021 will have a system:start_time equal to ee.Date('2021-01-01 00:00:00') and a system:end_time equal to ee.Date('2022-01-01 00:00:00').

The embeddings are unit-length, meaning they have a magnitude of 1 and do not require any additional normalization, and are distributed across the unit sphere, making them well-suited for use with clustering algorithms and tree-based classifiers. The embedding space is also consistent across years, and embeddings from different years can be used for condition change detection by considering the dot product or angle between two embedding vectors. Furthermore, the embeddings are designed to be linearly composable, i.e., they can be aggregated to produce embeddings at coarser spatial resolutions or transformed with vector arithmetic, and still retain their semantic meaning and distance relationships.

The Satellite Embedding dataset was produced by AlphaEarth Foundations, a geospatial embedding model that assimilates multiple datastreams including optical, radar, LiDAR, and other sources (Brown, Kazmierski, Pasquarella et al., in review; preprint available here).

Because representations are learned across many sensors and images, embedding representations generally overcome common issues such as clouds, scan lines, sensor artifacts, or missing data, providing seamless analysis-ready features that can be directly substituted for other Earth Observation image sources in classification, regression, and change detection analyses.

## Understanding the embeddings

Embeddings are a way to compress large amounts of information into a smaller set of features that represent meaningful semantics. The AlphaEarth Foundations model takes time series of images from sensors including Sentinel-2, Sentinel-1, and Landsat and learns how to uniquely represent the mutual information between sources and targets with just 64 numbers. The input data stream contains thousands of image bands from multiple sensors and the model takes this high dimensional input and turns it into a lower dimensional representation.

A good mental model to understand how AlphaEarth Foundations works is a technique called Principal Component Analysis (PCA). PCA also helps reduce the dimensionality of the data for machine learning applications. While PCA is a statistical technique and can compress tens of input bands into a handful of principal components, AlphaEarth Foundations is a deep-learning model that can take thousands of input dimensions of multi-sensor time-series datasets and learns to create a 64-band representation that uniquely captures the spatial and temporal variability of that pixel.

An embedding field is the continuous array or “field” of learned embeddings. Images in the embedding fields collections represent space-time trajectories covering an entire year and have 64 bands (one for each embedding dimension).



<img width="629" height="417" alt="image" src="https://github.com/user-attachments/assets/de1bcdd1-7b88-4852-869a-9e5de4522a3a" />



You can read more about the AEF in this [paper](https://arxiv.org/pdf/2507.22291).




### Access the Satellite Embedding dataset

The SED is an image collection containing annual images from the years 2017 onward (e.g., 2017, 2018, 2019…). Each image has 64 bands where each pixel is the embedding vector representing the multi-sensor time-series for the given year.


To access the SED you can use the script below.


```JavaScript
var embeddings = ee.ImageCollection('GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL');
```



### Define region of interest

The SED is a global dataset, so often you would have to specify your region of interest. In this case, we will explore the Daly River Catchment.



```JavaScript

//set the satellite basemap
Map.setOptions('SATELLITE')

//define the region of interest
var dalyNT= ee.FeatureCollection("projects/ee-racrabbe3/assets/DRC").geometry()

//centre basemap to your study area
Map.centerObject(dalyNT, 10)

```



### Prepare the SED
Each year’s images are split into tiles for easy access. We apply filters and find the images for our chosen year and region.

```JavaScript
var year = 2024;
var startDate = ee.Date.fromYMD(year, 1, 1);
var endDate = startDate.advance(1, 'year');

var filteredEmbeddings = embeddings
  .filter(ee.Filter.date(startDate, endDate))
  .filter(ee.Filter.bounds(dalyNT));

```

Satellite Embedding images are gridded into tiles of up to 163,840 m x 163,840 m each and served in the projection for the UTM zones for the tile. As a result, we get multiple Satellite Embedding tiles covering the region of interest. We can use the mosaic() function to combine multiple tiles into a single image. Let’s print the resulting image to see the bands.

!Tip: ***Using mosaic() loses the original UTM projection and the resulting image will be set to a Default Projection, which is WGS84 with a 1-degree scale. This is fine for most cases, and you can specify the scale and projection suitable for your region when sampling data or exporting the results. For example, if you specify the crs as EPSG:3857 and scale as 10m, Earth Engine will reproject all the inputs to that projection and ensure the operation occurs in that projection. However, in some cases–especially for global-scale analyses, where no ideal projection exists and you do not want pixels in a geographic CRS–it may be more effective to leverage the built-in tiling structure by using map() on the collection. This approach retains the original UTM projection of each tile and can yield more accurate results***.


```JavaScript
var embeddingsImage = filteredEmbeddings.mosaic();
print('Satellite Embedding Image', embeddingsImage);
```


You will see that the image has 64 bands, named A00, A01, … , A63. Each band contains the value of the embedding vector for the given year in that dimension or axis. Unlike spectral bands or indices, individual bands have no independent meaning – rather, each band represents one axis of the embedding space. You would use all of the 64 bands as inputs for your downstream applications.


<img width="437" height="677" alt="image" src="https://github.com/user-attachments/assets/cee7048a-c0dc-4ad6-8336-df4e7e2c1268" />



### Visulaisie the SED

As we just saw, our image contains 64 bands. There is no easy way to visualise all the information contained in all the bands since we can only view a combination of three bands at a time.

We can pick any three bands to visualize three axes of the embedding space as an RGB image.

```JavaScript
var visParams = {min: -0.1, max: 0.1, bands: ['A01', 'A16', 'A09']};
Map.addLayer(embeddingsImage.clip(dalyNT), visParams, 'Embeddings Image');
```


<img width="614" height="528" alt="image" src="https://github.com/user-attachments/assets/ef765751-4061-4eb0-82b0-51b2eb8ea4cc" />

***Figure: RGB Visualization of 3 axes of the embedding space***


An alternative way to visualize this information is by using it to group pixels with similar embeddings and use these groupings to understand how the model has learnt the spatial and temporal variability of a landscape.

We can use unsupervised clustering techniques to group the pixels in 64-dimensional space into groups or "clusters" of similar values. For this, we first sample some pixel values and train an **ee.Clusterer**.

```JavaScript
var nSamples = 1000;
var training = embeddingsImage.sample({
  region: dalyNT,
  scale: 10,
  numPixels: nSamples,
  seed: 100
});
print(training.first());

```

If you print the values of the first sample, you’ll see it has 64 band values defining the embedding vector for that pixel. The embedding vector is designed to have a unit length (i.e., the length of the vector from the origin (0,0,....0) to the values of the vector will be 1). The first 12 bands shown below.



<img width="636" height="510" alt="image" src="https://github.com/user-attachments/assets/e0179bc4-321d-497c-8e15-3f02c9088868" />

***Figure: Extracted embedding vector***


We can now train an unsupervised model to group the samples into the desired number of clusters. Each cluster would represent pixels of similar embeddings.

```JavaScript
// Function to train a model for desired number of clusters
var getClusters = function(nClusters) {
  var clusterer = ee.Clusterer.wekaKMeans({nClusters: nClusters})
    .train(training);

  // Cluster the image
  var clustered = embeddingsImage.cluster(clusterer);
  return clustered;
};

```

We can now cluster the larger embedding image to see groups of pixels having similar embeddings. Before we do that, it is important to understand that the model has captured the full temporal trajectory of each pixel for the year - that means if two pixels have similar spectral values in all images but at different times - they can be separated.

Let’s visualise the Satellite Embedding images by segmenting the landscape into 3 clusters,

```JavaScript
var cluster3 = getClusters(3);
Map.addLayer(cluster3.randomVisualizer().clip(dalyNT), {}, '3 clusters');

```

<img width="637" height="571" alt="image" src="https://github.com/user-attachments/assets/e9171a78-a79d-4756-a2b6-2592c035dae0" />


***Figure: Satellite Embedding image with 3 clusters***

You will notice that the resulting clusters have clean boundaries. This is because the embeddings inherently include spatial context - pixels within the same object would be expected to have relatively similar embedding vectors. One of the clusters includes areas with seasonal water around the Daly River. This is due to the temporal context that is captured in the embedding vector that allows us to detect such pixels with similar temporal patterns.

Let’s see if we can further refine the clusters by grouping the pixels into 9 clusters.

```JavaScript
var cluster9 = getClusters(9);
Map.addLayer(cluster9.randomVisualizer().clip(dalyNT), {}, '9 clusters');

```

<img width="654" height="543" alt="image" src="https://github.com/user-attachments/assets/713e5321-b75e-4bb4-9867-62bfca14921e" />

***Figure: Satellite Embedding image with 9 clusters***

There are a lot of details emerging and we can see different types of bareland being grouped into different clusters. Cleared lands and farming lands are captured. Also, permanent and seasonal wetlands are captured as well as riparian vegetations. The southern tip captures the savanna vegetation (orange pixels). More details in the landscape will be revealed if you increase the number of clusters.


The scripts for this practical:
```JavaScript
var embeddings = ee.ImageCollection('GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL');

//set the satellite basemap
Map.setOptions('SATELLITE')

//define the region of interest
var dalyNT= ee.FeatureCollection("projects/ee-racrabbe3/assets/DRC").geometry()

//centre to basemap to your study area
Map.centerObject(dalyNT, 10)

//filter parameters
var year = 2024;
var startDate = ee.Date.fromYMD(year, 1, 1);
var endDate = startDate.advance(1, 'year');

//filter the collection
var filteredEmbeddings = embeddings
  .filter(ee.Filter.date(startDate, endDate))
  .filter(ee.Filter.bounds(dalyNT));

//mosaic the collection
var embeddingsImage = filteredEmbeddings.mosaic();
print('Satellite Embedding Image', embeddingsImage);

//visualise the embeddings
var visParams = {min: -0.1, max: 0.1, bands: ['A01', 'A16', 'A09']};
Map.addLayer(embeddingsImage.clip(dalyNT), visParams, 'Embeddings Image');

//randomly sample some pixels for the clustering
var nSamples = 1000;
var training = embeddingsImage.sample({
  region: dalyNT,
  scale: 10,
  numPixels: nSamples,
  seed: 100
});
print(training.first());

// Function to train a model for desired number of clusters
var getClusters = function(nClusters) {
  var clusterer = ee.Clusterer.wekaKMeans({nClusters: nClusters})
    .train(training);

  // Cluster the image
  var clustered = embeddingsImage.cluster(clusterer);
  return clustered;
};

//visualise 3 clusters
var cluster3 = getClusters(3);
Map.addLayer(cluster3.randomVisualizer().clip(dalyNT), {}, '3 clusters');


//visualise  9 clusters
var cluster9 = getClusters(9);
Map.addLayer(cluster9.randomVisualizer().clip(dalyNT), {}, '9 clusters');

```



### Regression Analysis- Modelling Aboveground Biomass

Embedding fields can be used as feature inputs/predictors for regression in the same way they’re used for classification.
In this tutorial, we will learn how to use the 64D embedding field layers as inputs to a multiple regression analysis predicting above-ground biomass (AGB).
NASA’s Global Ecosystem Dynamics Investigation (GEDI) mission collects LIDAR measurements along ground transects at 30 m spatial resolution at 60 m intervals. We will use the GEDI L4A Raster Aboveground Biomass Density dataset containing point estimates of above ground biomass density (AGBD) that will be used as the predicted variable in the regression model.

The learning outcomes include: <br>

Select a study region <br>
Select a time period <br>
Prepare the Satellite Embedding dataset <br>
Prepare GEDI L4A Mosaic data <br>
Resample and aggregate inputs <br>
Extract training features<br>
Train a regression model <br>
Generate prediction for unknown values<br>
Estimaate total biomass

#### Select a study region

Let’s start by defining a region of interest. For this tutorial, we will pick a region in the Western Ghats of India and define a polygon as the geometry variable. Alternatively, you can use the Drawing Tools in the Code Editor to draw a polygon around the region of interest that will be saved as the geometry variable in the Imports. We also use the Satellite basemap, which makes it easy to locate vegetated areas.

```JavaScript
var geometry = ee.Geometry.Polygon([[
  [74.322, 14.981],
  [74.322, 14.765],
  [74.648, 14.765],
  [74.648, 14.980]
]]);

// Use the satellite basemap
Map.setOptions('SATELLITE');

```

#### Select a time period
Pick a year for which we want to run the regression. Remember that Satellite Embeddings are aggregated at yearly intervals so we define the period for the entire year.
```JavaScript
var startDate = ee.Date.fromYMD(2022, 1, 1);
var endDate = startDate.advance(1, 'year');
```

#### Prepare the Satellite Embedding dataset

The 64-band Satellite Embedding Images will be used as the predictor for the regression. We load the Satellite Embedding dataset, filter for images for the chosen year and region.

```JavaScript
var embeddings = ee.ImageCollection('GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL');

var embeddingsFiltered = embeddings
  .filter(ee.Filter.date(startDate, endDate))
  .filter(ee.Filter.bounds(geometry));
```

Satellite Embedding images are gridded into tiles and served in the projection for the UTM zones for the tile. As a result, we get multiple Satellite Embedding tiles covering the region of interest. To get a single image, we need to mosaic them. In Earth Engine, a mosaic of input images is assigned the default projection, which is WGS84 with a 1-degree scale. As we will be aggregating and reprojecting this mosaic later in the tutorial, it is helpful to retain the original projection. We can extract the projection information from one of the tiles and set it on the mosaic using the setDefaultProjection() function.

```JavaScript
// Extract the projection of the first band of the first image
var embeddingsProjection = ee.Image(embeddingsFiltered.first()).select(0).projection();

// Set the projection of the mosaic to the extracted projection
var embeddingsImage = embeddingsFiltered.mosaic()
  .setDefaultProjection(embeddingsProjection);

```


#### Prepare the GEDI L4A mosaic

As the GEDI biomass estimates will be used to train our regression model, it is critical to filter out invalid or unreliable GEDI data before using it. We apply several masks to remove potentially erroneous measurements.

    Remove all measurements not meeting quality requirement (l4_quality_flag = 0 and degrade_flag > 0)
    Remove all measurements with high relative error ('agbd_se' / 'agbd' > 50%)
    Remove all measurements on slopes > 30% based on the Copernicus GLO-30 Digital Elevation Mode (DEM)

Finally, we select all remaining measurements for the time period and region of interest and create a mosaic.


```JavaScript
var gedi = ee.ImageCollection('LARSE/GEDI/GEDI04_A_002_MONTHLY');
// Function to select the highest quality GEDI data
var qualityMask = function(image) {
  return image.updateMask(image.select('l4_quality_flag').eq(1))
      .updateMask(image.select('degrade_flag').eq(0));
};

// Function to mask unreliable GEDI measurements
// with a relative standard error > 50%
// agbd_se / agbd > 0.5
var errorMask = function(image) {
  var relative_se = image.select('agbd_se')
    .divide(image.select('agbd'));
  return image.updateMask(relative_se.lte(0.5));
};

// Function to mask GEDI measurements on slopes > 30%

var slopeMask = function(image) {
  // Use Copernicus GLO-30 DEM for calculating slope
  var glo30 = ee.ImageCollection('COPERNICUS/DEM/GLO30');

  var glo30Filtered = glo30
    .filter(ee.Filter.bounds(geometry))
    .select('DEM');

  // Extract the projection
  var demProj = glo30Filtered.first().select(0).projection();

  // The dataset consists of individual images
  // Create a mosaic and set the projection
  var elevation = glo30Filtered.mosaic().rename('dem')
    .setDefaultProjection(demProj);

  // Compute the slope
  var slope = ee.Terrain.slope(elevation);

  return image.updateMask(slope.lt(30));
};

var gediFiltered = gedi
  .filter(ee.Filter.date(startDate, endDate))
  .filter(ee.Filter.bounds(geometry));

var gediProjection = ee.Image(gediFiltered.first())
  .select('agbd').projection();

var gediProcessed = gediFiltered
  .map(qualityMask)
  .map(errorMask)
  .map(slopeMask);

var gediMosaic = gediProcessed.mosaic()
  .select('agbd').setDefaultProjection(gediProjection);

// Visualize the GEDI Mosaic
var gediVis = {
  min: 0,
  max: 200,
  palette: ['#edf8fb', '#b2e2e2', '#66c2a4', '#2ca25f', '#006d2c'],
  bands: ['agbd']
};

Map.addLayer(gediMosaic, gediVis, 'GEDI L4A (Filtered)', false);

```




<img width="912" height="683" alt="image" src="https://github.com/user-attachments/assets/5853f168-919c-4848-a960-8263c4926ab9" />




#### Resample and aggregate inputs

Before sampling pixels to train a regression model, we resample and reproject the inputs to the same pixel grid. GEDI measurements have a horizontal accuracy of +/- 9 m. This is problematic when matching the GEDI AGB values to Satellite Embedding pixels. To overcome this, we resample and aggregate all input images to a larger pixel grid with mean values from the original pixels. This also helps remove noise from the data and helps build a better machine-learning model.


```JavaScript
// Choose the grid size and projection
var gridScale = 100;
var gridProjection = ee.Projection('EPSG:3857')
  .atScale(gridScale);

// Create a stacked image with predictor and predicted variables
var stacked = embeddingsImage.addBands(gediMosaic);

//  Set the resampling mode
var stacked = stacked.resample('bilinear');

// Aggregate pixels with 'mean' statistics
var stackedResampled = stacked
  .reduceResolution({
    reducer: ee.Reducer.mean(),
    maxPixels: 1024
  })
  .reproject({
    crs: gridProjection
});

// As larger GEDI pixels contain masked original
// pixels, it has a transparency mask.
// We update the mask to remove the transparency
var stackedResampled = stackedResampled
  .updateMask(stackedResampled.mask().gt(0));
```

Reprojecting and aggregating pixels is an expensive operation, and it is a good practice to export the resulting stacked image as an Asset and use the pre-computed image in subsequent steps. This will help overcome computation timed out or user memory exceeded errors when working with large regions.


```JavaScript

//make sure you specifyy the path to your own GEE Assets. Using this code without modifying the assetId may throw out error messages.
Export.image.toAsset({
  image: stackedResampled.clip(geometry),
  description: 'GEDI_Mosaic_Export',
  assetId: "users/racrabbe/EMM_GEDI_Mosaic_Export", //'projects/ee-racrabbe3/assets/compositeLayer3'
  scale:gridScale,
  region: geometry,
  maxPixels:1e10
});

```


Start the export task and wait until it finishes. Once done, we import the Asset and continue building the model.

```JavaScript
// load the exported asset
var stackedResampled = ee.Image('users/racrabbe/EMM_GEDI_Mosaic_Export');

```


#### Extract training features

We have our input data ready for extracting training features. We use the Satellite Embedding bands as dependent variables (predictors) and GEDI AGBD values as Independent Variable (predicted) in the regression model. We can extract the coincident values at each pixel and prepare our training dataset. Our GEDI image is mostly masked and contains values at only a small subset of pixels. If we use `sample()` it will return mostly empty values. To overcome this, we create a class band from the GEDI mask and use stratifiedSample() to ensure we sample from the non-masked pixels.

```JavaScript
var predictors = embeddingsImage.bandNames();
var predicted = gediMosaic.bandNames().get(0);
print('predictors', predictors);
print('predicted', predicted);

var predictorImage = stackedResampled.select(predictors);
var predictedImage = stackedResampled.select([predicted]);

var classMask = predictedImage.mask().toInt().rename('class');

var numSamples = 1000;

// We set classPoints to [0, numSamples]
// This will give us 0 points for class 0 (masked areas)
// and numSample points for class 1 (non-masked areas)
var training = stackedResampled.addBands(classMask)
  .stratifiedSample({
    numPoints: numSamples,
    classBand: 'class',
    region: geometry,
    scale: gridScale,
    classValues: [0, 1],
    classPoints: [0, numSamples],
    dropNulls: true,
    tileScale: 16,
});

print('Number of Features Extracted', training.size());
print('Sample Training Feature', training.first());

```


#### Train a regression model

We are now ready to train the model. Many classifiers in Earth Engine can be used for both classification and regression tasks. Since we want to predict a numeric value (instead of a class) – we can set the classifier to run in the `REGRESSION` mode and train using the training data. Once the model is trained, we can compare the model’s prediction against input values and compute the root-mean square error (`rmse`) and correlation coefficient `r^2` to check the model’s performance.


```JavaScript

// Use the RandomForest classifier and set the
// output mode to REGRESSION
var model = ee.Classifier.smileRandomForest(50)
  .setOutputMode('REGRESSION')
  .train({
    features: training,
    classProperty: predicted,
    inputProperties: predictors
  });

// Get model's predictions for training samples
var predicted = training.classify({
  classifier: model,
  outputName: 'agbd_predicted'
});

// Calculate RMSE
var calculateRmse = function(input) {
    var observed = ee.Array(
      input.aggregate_array('agbd'));
    var predicted = ee.Array(
      input.aggregate_array('agbd_predicted'));
    var rmse = observed.subtract(predicted).pow(2)
      .reduce('mean', [0]).sqrt().get([0]);
    return rmse;
};
var rmse = calculateRmse(predicted);
print('RMSE', rmse); //result was approximately 28.55

// Create a plot of observed vs. predicted values
var chart = ui.Chart.feature.byFeature({
  features: predicted.select(['agbd', 'agbd_predicted']),
  xProperty: 'agbd',
  yProperties: ['agbd_predicted'],
}).setChartType('ScatterChart')
  .setOptions({
    title: 'Aboveground Biomass Density (Mg/Ha)',
    dataOpacity: 0.8,
    hAxis: {'title': 'Observed'},
    vAxis: {'title': 'Predicted'},
    legend: {position: 'right'},
    series: {
      0: {
        visibleInLegend: false,
        color: '#525252',
        pointSize: 3,
        pointShape: 'triangle',
      },
    },
    trendlines: {
      0: {
        type: 'linear',
        color: 'black',
        lineWidth: 1,
        pointSize: 0,
        labelInLegend: 'Linear Fit',
        visibleInLegend: true,
        showR2: true
      }
    },
    chartArea: {left: 100, bottom: 100, width: '50%'},

});
print(chart);

```


<img width="898" height="623" alt="image" src="https://github.com/user-attachments/assets/16dd9180-2739-4838-af43-b692d4cee116" />




#### Generate predictions for unknown values


Once we are happy with the model, we can use the trained model to generate predictions at unknown locations from the image containing predictor bands.

```JavaScript
// We set the band name of the output image as 'agbd'
var predictedImage = stackedResampled.classify({
  classifier: model,
  outputName: 'agbd'
});

```


The image containing predicted AGBD values at each pixel is now ready for export. We will use this in the next part to visualize the results.


```JavaScript
//export data to assets
Export.image.toAsset({
  image: predictedImage.clip(geometry),
  description: 'GEDI_RegressionModel',
  assetId: "users/racrabbe/EMM_AGB_RegressionModel", //'projects/ee-racrabbe3/assets/compositeLayer3'
  scale:gridScale,
  region: geometry,
  maxPixels:1e10
});

```

Start the export task and wait until it finishes. Once done, we import the Asset and visualize the results.



```  JavaScript
//import/load the predicted image
var predictedImage = ee.Image('users/racrabbe/EMM_AGB_RegressionModel');

// Visualize the image
var gediVis = {
  min: 0,
  max: 200,
  palette: ['#edf8fb', '#b2e2e2', '#66c2a4', '#2ca25f', '#006d2c'],
  bands: ['agbd']
};

Map.addLayer(predictedImage, gediVis, 'Predicted AGBD');

```




<img width="940" height="687" alt="image" src="https://github.com/user-attachments/assets/79b57240-2da7-4dcb-97b8-2e0830c722f6" />









#### Estimate total biomass



We now have predicted AGBD values for each pixel of the image and that can be used to estimate the total aboveground biomass (AGB) stock in the region. But we must first remove all pixels belonging to non-vegetated areas. We can use the ESA WorldCover landcover dataset and select vegetated pixels.




```JavaScript

// GEDI data is processed only for certain landcovers
// from Plant Functional Types (PFT) classification
// https://doi.org/10.1029/2022EA002516

// Here we use ESA WorldCover v200 product to
// select landcovers representing vegetated areas
var worldcover = ee.ImageCollection('ESA/WorldCover/v200').first();

// Aggregate pixels to the same grid as other dataset
// with 'mode' value.
// i.e. The landcover with highest occurrence within the grid
var worldcoverResampled = worldcover
  .reduceResolution({
    reducer: ee.Reducer.mode(),
    maxPixels: 1024
  })
  .reproject({
    crs: gridProjection
});

// Select grids for the following classes
// | Class Name | Value |
// | Forests    | 10    |
// | Shrubland  | 20    |
// | Grassland  | 30    |
// | Cropland   | 40    |
// | Mangroves  | 95    |
var landCoverMask = worldcoverResampled.eq(10)
    .or(worldcoverResampled.eq(20))
    .or(worldcoverResampled.eq(30))
    .or(worldcoverResampled.eq(40))
    .or(worldcoverResampled.eq(95));

var predictedImageMasked = predictedImage
  .updateMask(landCoverMask);
Map.addLayer(predictedImageMasked, gediVis, 'Predicted AGBD (Masked)');

```








<img width="933" height="683" alt="image" src="https://github.com/user-attachments/assets/a191b4e4-8e64-4ad1-825c-90a9fe541406" />












The units of GEDI AGBD values are megagrams per hectare (Mg/ha). To get the total AGB, we multiply each pixel by its area in hectares and sum their values.


```JavaSript

var pixelAreaHa = ee.Image.pixelArea().divide(10000);
var predictedAgb = predictedImageMasked.multiply(pixelAreaHa);

var stats = predictedAgb.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: geometry,
  scale: gridScale,
  maxPixels: 1e10,
  tileScale: 16
});

// Result is a dictionary with key for each band
var totalAgb = stats.getNumber('agbd');

print('Total AGB (Mg)', totalAgb);

```


<img width="516" height="97" alt="image" src="https://github.com/user-attachments/assets/e1b6c2ee-e6c4-4c4f-8ff4-0b91caf0fed9" />







**Conclusion**

We have modelled abovegorund biomass (AGB) using random forest regression, leveraging Satellite Embedding, GEDI LiDAR, global DEM and land cover datasets.
AGB for unknown locations were estiamted as well as the total AGB.


# Code

See below for the complete scripts.

Note, all feature data required for the project must be available for the scripts to run successfully.
```JavaScript
//select region of interest
var geometry = ee.Geometry.Polygon([[
  [74.322, 14.981],
  [74.322, 14.765],
  [74.648, 14.765],
  [74.648, 14.980]
]]);

// Use the satellite basemap
Map.setOptions('SATELLITE');

//select a time period
var startDate = ee.Date.fromYMD(2022, 1, 1);
var endDate = startDate.advance(1, 'year');

//prepare the SED
var embeddings = ee.ImageCollection('GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL');

var embeddingsFiltered = embeddings
  .filter(ee.Filter.date(startDate, endDate))
  .filter(ee.Filter.bounds(geometry));
  
// Extract the projection of the first band of the first image
var embeddingsProjection = ee.Image(embeddingsFiltered.first()).select(0).projection();

// Set the projection of the mosaic to the extracted projection
var embeddingsImage = embeddingsFiltered.mosaic()
  .setDefaultProjection(embeddingsProjection);


//prepare the GEDI L4A mosaic
var gedi = ee.ImageCollection('LARSE/GEDI/GEDI04_A_002_MONTHLY');
// Function to select the highest quality GEDI data
var qualityMask = function(image) {
  return image.updateMask(image.select('l4_quality_flag').eq(1))
      .updateMask(image.select('degrade_flag').eq(0));
};

// Function to mask unreliable GEDI measurements
// with a relative standard error > 50%
// agbd_se / agbd > 0.5
var errorMask = function(image) {
  var relative_se = image.select('agbd_se')
    .divide(image.select('agbd'));
  return image.updateMask(relative_se.lte(0.5));
};

// Function to mask GEDI measurements on slopes > 30%

var slopeMask = function(image) {
  // Use Copernicus GLO-30 DEM for calculating slope
  var glo30 = ee.ImageCollection('COPERNICUS/DEM/GLO30');

  var glo30Filtered = glo30
    .filter(ee.Filter.bounds(geometry))
    .select('DEM');

  // Extract the projection
  var demProj = glo30Filtered.first().select(0).projection();

  // The dataset consists of individual images
  // Create a mosaic and set the projection
  var elevation = glo30Filtered.mosaic().rename('dem')
    .setDefaultProjection(demProj);

  // Compute the slope
  var slope = ee.Terrain.slope(elevation);

  return image.updateMask(slope.lt(30));
};

var gediFiltered = gedi
  .filter(ee.Filter.date(startDate, endDate))
  .filter(ee.Filter.bounds(geometry));

var gediProjection = ee.Image(gediFiltered.first())
  .select('agbd').projection();

var gediProcessed = gediFiltered
  .map(qualityMask)
  .map(errorMask)
  .map(slopeMask);

var gediMosaic = gediProcessed.mosaic()
  .select('agbd').setDefaultProjection(gediProjection);

// Visualize the GEDI Mosaic
var gediVis = {
  min: 0,
  max: 200,
  palette: ['#edf8fb', '#b2e2e2', '#66c2a4', '#2ca25f', '#006d2c'],
  bands: ['agbd']
};

Map.setCenter(74.648, 14.765, 12);
Map.addLayer(gediMosaic, gediVis, 'GEDI L4A (Filtered)', false);


//resample and aggregate inputs
// Choose the grid size and projection
var gridScale = 100;
var gridProjection = ee.Projection('EPSG:3857')
  .atScale(gridScale);


// Create a stacked image with predictor and predicted variables
var stacked = embeddingsImage.addBands(gediMosaic);

//  Set the resampling mode
var stacked = stacked.resample('bilinear');

// Aggregate pixels with 'mean' statistics
var stackedResampled = stacked
  .reduceResolution({
    reducer: ee.Reducer.mean(),
    maxPixels: 1024
  })
  .reproject({
    crs: gridProjection
});

// As larger GEDI pixels contain masked original
// pixels, it has a transparency mask.
// We update the mask to remove the transparency
var stackedResampled = stackedResampled
  .updateMask(stackedResampled.mask().gt(0));

//export data to assets
Export.image.toAsset({
  image: stackedResampled.clip(geometry),
  description: 'GEDI_Mosaic_Export',
  assetId: "users/racrabbe/EMM_GEDI_Mosaic_Export", //'projects/ee-racrabbe3/assets/compositeLayer3'
  scale:gridScale,
  region: geometry,
  maxPixels:1e10
});


// load the exported asset
var stackedResampled = ee.Image('users/racrabbe/EMM_GEDI_Mosaic_Export');


//Extract tranining features
var predictors = embeddingsImage.bandNames();
var predicted = gediMosaic.bandNames().get(0);
print('predictors', predictors);
print('predicted', predicted);

var predictorImage = stackedResampled.select(predictors);
var predictedImage = stackedResampled.select([predicted]);

var classMask = predictedImage.mask().toInt().rename('class');

var numSamples = 1000;

// We set classPoints to [0, numSamples]
// This will give us 0 points for class 0 (masked areas)
// and numSample points for class 1 (non-masked areas)
var training = stackedResampled.addBands(classMask)
  .stratifiedSample({
    numPoints: numSamples,
    classBand: 'class',
    region: geometry,
    scale: gridScale,
    classValues: [0, 1],
    classPoints: [0, numSamples],
    dropNulls: true,
    tileScale: 16,
});

print('Number of Features Extracted', training.size());
print('Sample Training Feature', training.first());


//Training a regression model
// Use the RandomForest classifier and set the
// output mode to REGRESSION
var model = ee.Classifier.smileRandomForest(50)
  .setOutputMode('REGRESSION')
  .train({
    features: training,
    classProperty: predicted,
    inputProperties: predictors
  });

// Get model's predictions for training samples
var predicted = training.classify({
  classifier: model,
  outputName: 'agbd_predicted'
});

// Calculate RMSE
var calculateRmse = function(input) {
    var observed = ee.Array(
      input.aggregate_array('agbd'));
    var predicted = ee.Array(
      input.aggregate_array('agbd_predicted'));
    var rmse = observed.subtract(predicted).pow(2)
      .reduce('mean', [0]).sqrt().get([0]);
    return rmse;
};
var rmse = calculateRmse(predicted);
print('RMSE', rmse);

// Create a plot of observed vs. predicted values
var chart = ui.Chart.feature.byFeature({
  features: predicted.select(['agbd', 'agbd_predicted']),
  xProperty: 'agbd',
  yProperties: ['agbd_predicted'],
}).setChartType('ScatterChart')
  .setOptions({
    title: 'Aboveground Biomass Density (Mg/Ha)',
    dataOpacity: 0.8,
    hAxis: {'title': 'Observed'},
    vAxis: {'title': 'Predicted'},
    legend: {position: 'right'},
    series: {
      0: {
        visibleInLegend: false,
        color: '#525252',
        pointSize: 3,
        pointShape: 'triangle',
      },
    },
    trendlines: {
      0: {
        type: 'linear',
        color: 'black',
        lineWidth: 1,
        pointSize: 0,
        labelInLegend: 'Linear Fit',
        visibleInLegend: true,
        showR2: true
      }
    },
    chartArea: {left: 100, bottom: 100, width: '50%'},

});
print(chart);


//Generate predictions for unknown values
// We set the band name of the output image as 'agbd'
var predictedImage = stackedResampled.classify({
  classifier: model,
  outputName: 'agbd'
});

//Export the predicted image
//export data to assets
Export.image.toAsset({
  image: predictedImage.clip(geometry),
  description: 'GEDI_RegressionModel',
  assetId: "users/racrabbe/EMM_AGB_RegressionModel", //'projects/ee-racrabbe3/assets/compositeLayer3'
  scale:gridScale,
  region: geometry,
  maxPixels:1e10
});

//import/load the predicted image
var predictedImage = ee.Image('users/racrabbe/EMM_AGB_RegressionModel');

// Visualize the image
var gediVis = {
  min: 0,
  max: 200,
  palette: ['#edf8fb', '#b2e2e2', '#66c2a4', '#2ca25f', '#006d2c'],
  bands: ['agbd']
};

Map.addLayer(predictedImage, gediVis, 'Predicted AGBD');

//Estimate total biomass
// GEDI data is processed only for certain landcovers
// from Plant Functional Types (PFT) classification
// https://doi.org/10.1029/2022EA002516

// Here we use ESA WorldCover v200 product to
// select landcovers representing vegetated areas
var worldcover = ee.ImageCollection('ESA/WorldCover/v200').first();

// Aggregate pixels to the same grid as other dataset
// with 'mode' value.
// i.e. The landcover with highest occurrence within the grid
var worldcoverResampled = worldcover
  .reduceResolution({
    reducer: ee.Reducer.mode(),
    maxPixels: 1024
  })
  .reproject({
    crs: gridProjection
});

// Select grids for the following classes
// | Class Name | Value |
// | Forests    | 10    |
// | Shrubland  | 20    |
// | Grassland  | 30    |
// | Cropland   | 40    |
// | Mangroves  | 95    |
var landCoverMask = worldcoverResampled.eq(10)
    .or(worldcoverResampled.eq(20))
    .or(worldcoverResampled.eq(30))
    .or(worldcoverResampled.eq(40))
    .or(worldcoverResampled.eq(95));

var predictedImageMasked = predictedImage
  .updateMask(landCoverMask);
Map.addLayer(predictedImageMasked, gediVis, 'Predicted AGBD (Masked)');


/*total biomass
The units of GEDI AGBD values are megagrams per hectare (Mg/ha). 
To get the total AGB, we multiply each pixel by its area in hectares and sum their values.

*/
var pixelAreaHa = ee.Image.pixelArea().divide(10000);
var predictedAgb = predictedImageMasked.multiply(pixelAreaHa);

var stats = predictedAgb.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: geometry,
  scale: gridScale,
  maxPixels: 1e10,
  tileScale: 16
});

// Result is a dictionary with key for each band
var totalAgb = stats.getNumber('agbd');

print('Total AGB (Mg)', totalAgb);
```





