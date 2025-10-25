# Acknowledgements

Google Earth Engine Developers

Google Earth Engine Team


# Introduction

In this practical, you will learn about the Google's AlphaEarth Foundation (AEF) model through the Satellite Embedding Dataset in Earthh Engine. Google AEF is one of the recent Geospatial Foundation Models created through Artificial Intelligence algorithms leveraging a range of earth observation data. Further details on the AEF have been reported in the paper [here](https://arxiv.org/pdf/2507.22291).


# Learning Outcomes

- Learn the fundamentals of the Satellite Embedding Dataset (SED)

- Visualise the SED

- Perform cluster analysis using the SED





# Description of SED

Google’s AlphaEarth Foundations is a geospatial embedding model trained on a variety of Earth observation (EO) datasets. The model has been run on annual time-series of images and the resulting embeddings are available as an analysis-ready dataset in Earth Engine. This dataset enables users to build any number of fine-tuning applications or other tasks without running computationally expensive deep learning models. The result is a general-purpose dataset that can be used for a number of different downstream tasks, such as Classification, Regression, Change detection and Similarity search

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










### Classification

There are different habitats within the Daly Catchments, which have to be mapped for effective monitoring. In this task, the landcover/use would be categorised into broad themes: *water,infrastructure, woodland, agriculture, and baresoil*. Given fire is an important management tool in this area, fire scar is common in this catchment, hence, fire scar would be detected as another cover class. Thus, six cover classes would be mapped.

6, Predictor variables

For any modelling, variables that are known to be sensitive to the target are required. These are referred to as predictor variables. We have selected 6 bands to be the predictor variables. While it is OK to use these variables for the classification, it is perhaps best to create other variables out of these bands to increase the number of predictor variables. Ideally, the additional variables created from the bands should be informed by existing literature. In this task, three vegetation indices that are commonly used to explain variation in these cover types would be created using the function below. [See this paper for further information on vegetation indices](https://www.tandfonline.com/doi/pdf/10.1080/15324982.2016.1170076). 



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

Now, the function would be called to create an image with mmore predictor variables


```JavaScript

// apply the vegetation indices function
var image2classify = vegetation_indices(select_bands);
print (image2classify, 'image2classify');
```

Normalise data
Data normalisation is 'forcing' the data values to be in a certain range, e.g., 0-1. Ideally in machine learning, the data to be classified must be normalised, especially if the data variables are of different units of measurement. If the data is not normalised it may affect the classification or prediction results. Given the image file is large it is not possible to normalise this data within EE as you may run out of server space. Thus, the data is not normalised.

#### Training Data

Field visits to collect reference data for the classes are ideal and important for classification tasks. However, sometimes for many reasons, it is not possible to have ground reference data to validate image classification. Other methods can be used to obtain reference data for the classification. One of such methods is using higher resolution imagery. This approach is explored here as the reference classes would be obtained from high resolution Google satellite imagery.  

Creating Reference Classes

[To be able to do this, go to this page: **Sample surface types using point feature collections**](https://github.com/padiketeku/EarthObservation101-Practicals/blob/main/Activity-10-Classification%20of%20Surface%20Types.md) 


For machine learning algorithms, it is best to have the same number of reference pixels for each cover class. 

Merge feature collections

```JavaScript
//Merge feature collection
var reference = infrastructure.merge(agriculture).merge(woodland).merge(water).merge(baresoil).merge(firescar)
```

Sample training areas for the model

Next,  the analyst needs to gather a sample of reference spectral profiles for the cover classes. This is useful for the model training process.

```JavaScript

// sample training areas
var sample_reference = image2classify.sampleRegions({
  collection: reference,
  properties: ['label'],
  scale: 30
  //tileScale: 16
});

```
Data partitioning

The reference data must be partitioned into training and test sets. The data points for the training set should be significantly larger than the test set as the more training points the better you are able to teach the model to be conversant with all possible cases, so the model is more likely to perform well on unknown data (i.e., test data). The data split is based on the size of the reference data, but the 80-20 rule is often used. This means 80% of the reference data is used to teach the model while the 20% is kept away from the model and later used to evaluate the predictability of the model. We would explore this ratio in the task.

```JavaScript

// partition training areas into training and test sets: apply 80-20 rule
var sample_reference2 = sample_reference.randomColumn()
var trainingSample = sample_reference2.filter('random <= 0.8') //80% of the data would be for model training
var testSample = sample_reference2.filter('random > 0.8')  //20% of data for model testing

```

Since we now have the image to classify and training and test data, the next thing to do is to train a Random Forest classification model. Random Forest is a widely used machine learning algorithm in remote sensing classification tasks, as it is less sensitive to over prediction [(Belgiu and Drăguţ, 2016)] (https://doi.org/10.1016/j.isprsjprs.2016.01.011). You can read more about random forest via the resources [here](https://einsteinmed.edu/uploadedfiles/centers/ictr/new/intro-to-random-forest.pdf) and [there](https://www.sciencedirect.com/science/article/pii/S0924271616000265).


```JavaScript
// parameterise a Random Forest classification algorithm
var rfClassification= ee.Classifier.smileRandomForest({
  numberOfTrees: 40,
  bagFraction: 0.4
}).train({
  features: trainingSample,  
  classProperty: 'label',
  inputProperties: image2classify.bandNames()
});

```

Apply the trained RF algorithm

```JavaScript
// apply the model to classify the image
var finalClassification = image2classify.classify(rfClassification);
```

Display the classified image

The colours used to represent the cover classes are blue(water), cyan(infrastructure), black(firescar), darkgreen(woodland), lightgreen(agriculture), brown(baresoil). This forms the legend of the classified image.

```JavaScript
// set the visualisaion parameter
var viz = {min: 0, max: 5, palette: ['blue', 'cyan', 'black', 'darkgreen', 'lightgreen', 'brown']};
```

```JavaScript
//display the classified image
Map.addLayer(finalClassification, viz, 'Habitat Mapping Using Random Forest Classification ');
```

The classification image is shown below.

![image](https://github.com/user-attachments/assets/aa5d38c9-fda3-49a9-b230-1973256c2002)
|:--:|
| *A Random Forest classification image with blue pixels representing water, cyan (infrastructure), black (firescar), darkgreen (woodland), lightgreen (agriculture), brown (baresoil) .*|


Display the unclassified/original image and use this to visually assess the performance. Do you reckon the Random Forest did a good job? Where are the problem areas? What do you reckon can be done to make the results more believable?

What you have done so far is a qualitative assessment of the RF model. A qualitative assessment of the model is really useful, particularly if you are familiar with the surface types in the study area. It is, however, also useful to quantatively evaluate the performance of the classifier.


#### Quantitative evaluation of the RF classifier

The RF classifier is assessed using error matrix, resulting in accuracy metrics such as overall accuracy, consumer accuracy, producer accuracy and F1-score.
Further details on these accuracies can be found here: [Hurskainen et al. 2019](https://doi.org/10.1016/j.rse.2019.111354)


```JavaScript

// assesss performance of the RF model 
var accuracy2 = testSample
      .classify(rfClassification)
      .errorMatrix('label', 'classification')
```


```JavaScript
//Print the user's accuracy to the console
print('Validation Overall accuracy: ', accuracy2.accuracy())
print('Validation Consumer accuracy: ', accuracy2.consumersAccuracy())
print('Validation Producer accuracy: ', accuracy2.producersAccuracy())
print('Validation fscore: ', accuracy2.fscore(1))
```

The results appear in the Console. You may click on the drop-down to see the results as shown below:

![image](https://github.com/user-attachments/assets/9bcc8929-a962-4f86-b4cf-c45d0f236a0e)



The overall accuracy is 98%, but that can be misleading if you are interested in just a cover type. The other metrics have accuracy value for each class, making it more useful for those interested in a specific class. If you are after wetlands, the consumer and prodcuer accuracies are about 98% and of course the average of producer and consumer accuracies (i.e., the fscore) is also 98%. Interpret the remaining classes. Critique the results.

Compute the spatial extent of cover classes in square kilometer 

```JavaScript
//compute area for each class
var habitat_all = ee.Image.pixelArea().addBands(finalClassification).divide(1e6)
                  .reduceRegion({
                    reducer: ee.Reducer.sum().group(1),
                    geometry: dalyNT,
                    scale:30,
                    bestEffort: true //without this computation may time out
                  })

print(habitat_all, 'habitat_all')
```

The results should be as shown below. The unit is square kilometers. Note you may need to click on the drop-down to see the results.



![image](https://github.com/user-attachments/assets/7d297e8b-0b5b-4f8d-8740-e5f562f808d7)




Export classification image to Google Drive

Finally, you would like to export the classification image to your Google Drive to bring it down to your desktop for further use, such as adding map properties and including this in a report.
Note that the classified image is a very large file, so if you do not have enough space in your drive the export may fail.

```JavaScript
//export classification image to google drive

Export.image.toDrive({
    image: finalClassification.visualize(viz),
    description: 'Classification-Map-DalyCatchment',
    scale: 5000, // so the file can be saved to your drive, if your drive is limited in space this may not work. you might have to increase the scale to have a smaller file size.
    crs: 'EPSG:4326',
    maxPixels: 1e13
});
```


# Conclusion

We have created baseline landcover map for the Daly River Catchment. In the next activity, this baseline data will be used to monitor change in habitats.


# Code

See below for the complete code.

Note, all feature data required for the project must be available for the code to run successfully.

```JavaScript
//region of interest is the Daly River catchment of the Northern Territory, Australia
var dalyNT = ee.FeatureCollection("projects/ee-niiazucrabbe/assets/DalyCatchment")

//let the computer display the base map to location of interest (i.e., Daly River)
Map.setCenter(130.6884, -13.694,9)

//create a symoblogy that makes the study boundary transparent and display this  
var symbology = {color: 'red', fillColor: '00000000'};

//apply the symbology to visualise the boundary of the study area
Map.addLayer(dalyNT.style(symbology), {}, 'Daly River Catchment');


//get Landsat 8 collection; this is a surface reflectance product 
var landsatCol = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")

//filter by date 
.filterDate('2013-07-11','2013-07-31')

//filter by study area
.filterBounds(dalyNT)

//print the image collection to the Console
print(landsatCol , 'landsatCol ')


//visualise the collection
Map.addLayer(landsatCol, {bands:["SR_B4", "SR_B3", "SR_B2"], min:6000, max:12000})

//turn on the boundary of the study area again to overlay on the collection
Map.addLayer(dalyNT.style(symbology), {}, 'Daly River Catchment');


//eliminate pixels that represent cloud and cloud shadow
// First, define the function to mask cloud and shadow pixels.
function fmask(img) {
  var cloudShadowBitMask = 1 << 3;
  var cloudsBitMask = 1 << 5;
  var qa = img.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
    .and(qa.bitwiseAnd(cloudsBitMask).eq(0));
  return img.updateMask(mask);
}

//apply the function to mask the cloud and shadow pixels

var landsatCol = landsatCol.map(fmask)
Map.addLayer(landsatCol, {bands:["SR_B4", "SR_B3", "SR_B2"], min:6000, max:12000}, 'cloudMasked')

//mosaic the collection to make an image as this is required for classification 
var imgCol2img = landsatCol.mosaic()

//print the mosaick to the Console
print(imgCol2img, 'Mosaicked image')

//visualise the mosaicked image
Map.addLayer(imgCol2img.clip(dalyNT), {bands:["SR_B4", "SR_B3", "SR_B2"], min:7000, max:13000}, 'Mosaicked')
Map.addLayer(imgCol2img.clip(dalyNT), {bands:["SR_B7", "SR_B5", "SR_B6"], min:7000, max:13000}, 'Mosaicked-FCC')

//select the relevant bands, 2. trim the image to the study area, 3. print result to console
var select_bands = imgCol2img.select("SR_B2", "SR_B3", "SR_B4", "SR_B5","SR_B6","SR_B7").clip(dalyNT)
print (select_bands, 'select_bands')


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
  var nbr = nir.subtract(swir2).divide(nir.add(swir2)).rename('NBR')
  var mirbi = (swir1.multiply(10)).subtract (swir2.multiply(9.8)).add(2).rename('MIRBI')
  
  //add the output of a vegetation index as a band to the original bands of the image and return an image with more bands
  return image.addBands(ndvi).addBands(ndwi).addBands(savi).addBands(nbr).addBands(mirbi);
 
};

// apply the vegetation indices function
var image2classify = vegetation_indices(select_bands);
print (image2classify, 'image2classify');

// create reference classes
//Use the link below to complete this bit 
//https://github.com/padiketeku/EarthObservation101-Practicals/blob/main/Activity-07-Characterizing%20the%20Spectral%20Profiles%20of%20Surface%20Types.md#feature-collection--create-polygons-for-surface-types

//Merge feature collection
var reference = infrastructure.merge(agriculture).merge(woodland).merge(water).merge(baresoil).merge(firescar)

// sample training areas
var sample_reference = image2classify.sampleRegions({
  collection: reference,
  properties: ['label'],
  scale: 30
  //tileScale: 16
});
print(sample_reference.size(), 'sample_reference')

// partition training areas into training and test sets: apply 80-20 rule
var sample_reference2 = sample_reference.randomColumn()
var trainingSample = sample_reference2.filter('random <= 0.8') //80% of the data would be for model training
var testSample = sample_reference2.filter('random > 0.8')  //20% of data for model testing


// parameterise a Random Forest classification algorithm
var rfClassification= ee.Classifier.smileRandomForest({
  numberOfTrees: 40,
  bagFraction: 0.4
}).train({
  features: trainingSample,  
  classProperty: 'label',
  inputProperties: image2classify.bandNames()
});


// apply the model to classify the image
var finalClassification = image2classify.classify(rfClassification);


// display the classified image
// set the visualisaion parameter
var viz = {min: 0, max: 5, palette: ['blue', 'cyan', 'black', 'darkgreen', 'lightgreen', 'brown']};
Map.addLayer(finalClassification, viz, 'Habitat Mapping Using Random Forest Classification '); 


// assesss performance of the RF model 
var accuracy2 = testSample
      .classify(rfClassification)
      .errorMatrix('label', 'classification')


//Print the user's accuracy to the console
print('Validation Overall accuracy: ', accuracy2.accuracy())
print('Validation Consumer accuracy: ', accuracy2.consumersAccuracy())
print('Validation Producer accuracy: ', accuracy2.producersAccuracy())
//print('Validation Kappa: ', accuracy2.kappa())
print('Validation fscore: ', accuracy2.fscore(1))


//compute spatial extent for each class in square kilometer
var habitat_all = ee.Image.pixelArea().addBands(finalClassification).divide(1e6)
                  .reduceRegion({
                    reducer: ee.Reducer.sum().group(1),
                    geometry: dalyNT,
                    scale:30,
                    bestEffort: true //without this computation may time out
                  })

print(habitat_all, 'habitat_all')



//export classification image to google drive

Export.image.toDrive({
    image: finalClassification.visualize(viz),
    description: 'Classification-Map-DalyCatchment',
    scale: 5000,
    crs: 'EPSG:4326',
    maxPixels: 1e13
});

```
