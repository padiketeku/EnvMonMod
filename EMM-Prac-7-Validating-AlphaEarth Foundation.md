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

```JavaScript

```


Conclusion
We have modelled abovegorund biomass (AGB) using random forest regression, leveraging Satellite Embedding, GEDI LiDAR, global DEM and land cover datasets.
AGB for unknown locations were estiamted as well as the total AGB.


# Code

See below for the complete code.

Note, all feature data required for the project must be available for the code to run successfully.
```JavaScript
// a function that computes vegetation indices  
var vegetation_indices = function(image) {
  var blue = image.select('SR_B2'); // selects the blue band only
  var green = image.select('SR_B3'); // selects the green band
  var red = image.select('SR_B4');  // selects the red band
  var nir = image.select('SR_B5'); //selects the near infrared band
  var swir1 =image.select('SR_B6'); //selects shorter wavelength swir
  var swir2 =image.select('SR_B7'); //selects longer wavelength swir
  var ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI');
  var ndwi = green.subtract(nir).divide(green.add(nir)).rename('NDWI');
  var savi = nir.subtract(red).divide(nir.add(red).add(0.5)).multiply(1.5).rename('SAVI');
  var nbr = nir.subtract(swir2).divide(nir.add(swir2)).rename('NBR') //sensitive to firescar
  var mirbi = (swir1.multiply(10)).subtract (swir2.multiply(9.8)).add(2).rename('MIRBI')//sensitive to firescar
  
  //add the output of a vegetation index as a band to the original bands of the image and return an image with more bands
  return image.addBands(ndvi).addBands(ndwi).addBands(savi).addBands(nbr).addBands(mirbi);
 
};
```



```JavaScript

