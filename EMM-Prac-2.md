# Introduction

In this practical, you would apply Random Forest to classify an image with the objective of defining the main surface types of the Daly River Catchment.


## Learning Outcomes

- Import shapefile
- Visualise boundary of study area
- Mosaic images
- Classify an image
- Assess the classifier 



## Task


Environmental monitoring is a process in which time is an important phenomenon. The condition of an habitat 30 years ago may not be same as today. The Daly River Catchments in the Northern Terriotory of Australia is an important ecosystem for several reasons. The catchment is a habitat for many native plants, birds, reptiles, and mammals. The condition of the catchment is not the same ten years ago, but to understand the recent state of the catchment it is worth going back into time to have a baseline information. In this practical, your task is to classify the cardinal land cover types of the Daly River Catchment, ten years ago, using Landsat 8 imagery.


### Workflow


1, Upload the boundary (or shapefile) of the study area 

```JavaScript
var dalyNT = ee.FeatureCollection("projects/ee-niiazucrabbe/assets/DalyCatchment")
```

Usually, at the start of EE, the base map is centered on the US. If your study location is different you would have to re-set the base map to your region of interest. In our case, we would re-set the base map to the Daly River.

```JavaScript
//let the computer display the base map to location of interest (i.e., Daly River)
Map.setCenter(130.6884, -13.694,9)
```

You would want to display the boundary of the study area to be sure this is properly uploaded.

```JavaScript
//create a symoblogy that makes the study boundary transparent and display this  
var symbology = {color: 'red', fillColor: '00000000'};

//apply the symbology to visualise the boundary of the study area
Map.addLayer(dalyNT.style(symbology), {}, 'Daly River Catchment');
```
Zoom out a wee bit to see the entire size of the boundary layer. Your result should be similar to the figure below.



![image](https://github.com/user-attachments/assets/409533fe-17ca-4f02-b9e4-03964091f3e2)




Happy with the boundary layer? If so, you would like to find the Landsat 8 images in the database relevant for the given task.


2, Image Collection

The script below retrieves a collection of Landsat 8 images from the database and filters the collection by date and the polygon of the study area to ensure images were acquired in the dry season to minimise cloud cover while spanning the whole study area. 


```JavaScript

//get Landsat 8 collection; this is a surface reflectance product 
var landsatCol = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")

//filter by date
.filterDate('2013-04-1','2013-04-27')

//filter by study area
.filterBounds(dalyNT)

//print the image collection to the Console
print(landsatCol , 'landsatCol ')
```

Explore the result in the Console, always inspect the image properties taking note of cloud coverage. You may observe that there are images with cloud and cloud shadow pixels.


Question:

How many images are in the collection? Correct, 8 image scenes required to have data for the entire study area.

List down the Path and Row IDs for each image. Read more about Path and Row here: [The Landsat Worldwide Reference System](https://landsat.gsfc.nasa.gov/about/the-worldwide-reference-system/)
(accessed on 14/9/2024).


Explore the "landsatCol" in the Console, when you drop-down "features" the Path/Row ID would be in the image filename. The Path/Row IDs are:
104/069
104/070
104/071
105/069
105/070
105/071
106/069
106/070


```JavaScript
//visualise the collection
Map.addLayer(landsatCol, {bands:["SR_B4", "SR_B3", "SR_B2"], min:6000, max:12000})
```

You may observe that the image collection is displayed without an overlay of the study area polygon. To correct this, turn the polygon on as shown via the code below.

```JavaScript
//turn on the boundary of the study area again to overlay the collection
Map.addLayer(dalyNT.style(symbology), {}, 'Daly River Catchment');
```

The result should be as shown in the figure below.


![image](https://github.com/user-attachments/assets/a5570d30-6ce5-4e98-a5c9-d1e2facaf74d)


3, Remove cloud and cloud shadow pixels

```JavaScript

// define a function to mask cloud and shadow pixels.
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
```



4, [Mosaicking](https://en.wikipedia.org/wiki/Image_mosaic)

Although the image collection displays as a single image it is not. Rather, there are 8 individual images in the collection. Image collection cannot be an input for a classifier; **a classification analysis requires an image**. To this end, the image collection is turned into a single image by mosaicking the individual images together.

```JavaScript

//mosaic the collection to make an image as this is required for classification 
var imgCol2img = landsatCol.mosaic()

//print the mosaick to the Console
print(imgCol2img, 'Mosaicked image')
```

In the Console, you may observe that you have just one image with 19 bands. The bands include reflective, thermal and quality assessment bands.
The reflective bands are "SR_B1", "SR_B2", "SR_B3", "SR_B4","SR_B5", "SR_B6", "SR_B7". The SR is surface reflectance. **Look it up** : List the light the bands represent.

5, Trim the image

Since not all bands are required for this and the image size is larger than the study area, it is prudent to trim the data. Trimming the data means you minimise the chance of running into EE computation issues. Thus, let's select the relevant bands and clip the image to the study area to lower the file size

```JavaScript

//select the relevant bands, 2. trim the image to the study area, 3. print result to Console
var select_bands = imgCol2img.select("SR_B2", "SR_B3", "SR_B4", "SR_B5","SR_B6","SR_B7").clip(dalyNT)
print (select_bands, 'select_bands')

```


## Classification

There are different habitats within the Daly Catchments, which have to mapped for effective monitoring. In this task, the habitats would be catgeorised into broad themes: *infrastructure, agriculture, forest, wetlands and bareland*.

6, Predictor variables
For any modelling, variables that are known to be sensitive to the target are required. These are referred to as predictor variables. We have selected 6 bands to be the hpredictor variables. While it is OK to use these variables for the classification, it is perhaps best to create other variables out these bands to increase the number of predictor variables. Ideally, the additional variables created from the bands should be informed by existing literature. In this task, three vegetation indices that are commonly used to explain variation in such cover types would be created using the function below. [See this paper for further information on the vegetation indices](https://www.tandfonline.com/doi/pdf/10.1080/15324982.2016.1170076). 

```JavaScript

// a function that computes vegetation indices  
var vegetation_indices = function(image) {
  var blue = image.select('SR_B2'); // selects the blue band only
  var green = image.select('SR_B3'); // selects the green band
  var red = image.select('SR_B4');  // selects the red band
  var nir = image.select('SR_B5'); //selects the near infrared band
  var ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI');
  var ndwi = green.subtract(nir).divide(green.add(nir)).rename('NDWI');
  var savi = nir.subtract(red).divide(nir.add(red).add(0.5)).multiply(1.5).rename('SAVI'); 
  
  //add the output of a vegetation index as a band to the original bands and return an image with more bands
  return image.addBands(ndvi).addBands(ndwi).addBands(savi);
 
};

```

Now, the function would be called to create an image with mmore predictor variables


```JavaScript

// apply the vegetation indices function
var image2classify = vegetation_indices(select_bands);
print (image2classify, 'image2classify');
```


### Training Data

Field visits to collect reference data for the classes are ideal and important for classification tasks. However, sometimes for many reasons, it is not possible to have ground reference to validate image classification. Other methods can be used to obtain reference data for the classification. One of such methods is using higher resolution images. This approach is explored here as the reference classes would be obtained from high resolution Google satellite imagery.  

Creating Reference Classes

[To be able to do this, go to this page: **Feature collection- create polygons for surface types**](https://github.com/padiketeku/EarthObservation101-Practicals/blob/main/Activity-07-Characterizing%20the%20Spectral%20Profiles%20of%20Surface%20Types.md#feature-collection--create-polygons-for-surface-types) 

Merge feature collections

```JavaScript
//Merge feature collection
var reference = infrastructure.merge(agriculture).merge(forest).merge(wetland).merge(bareland)
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

The reference data must be partitioned into training and test sets. The data points for the training set should be significantly larger thann the test set as the more training points the better you are able to teach the model to be conversant with all possible cases, so the model is more likely to perform well on unknown data (i.e., test data). The data split is based on the the size of the reference data, but the 80-20 rule is often used. This means 80% of the reference data is used to teach the model while the 20% is kept away from the model and later used to evaluate the predictability of the model. We would explore this ratio in the task.

```JavaScript

// partition training areas into training and test sets: apply 80-20 rule
var sample_reference2 = sample_reference.randomColumn()
var trainingSample = sample_reference2.filter('random <= 0.8') //80% of the data would be for model training
var testSample = sample_reference2.filter('random > 0.8')  //20% of data for model testing

```

Since we now have the image to classify and training and test data, the next thing to do is to training a Random Forest classification model. Random Forest is a widely used machine learning algorithm in remote sensing classification tasks as it is less sensitive to over prediction [(Belgiu and Drăguţ, 2016)] (https://doi.org/10.1016/j.isprsjprs.2016.01.011)


```JavaScript
// parameterise a Random Forest classification algorithm
var rfClassification= ee.Classifier.smileRandomForest({
  numberOfTrees: 10,
  bagFraction: 0.6
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

The colours used to the cover types are purple(infrastructure), green(agriculture), yellow(forest), cyan(wetland), brown(bareland). This forms the legend of the classified image.

```JavaScript
// set the visualisaion parameter
var viz = {min: 0, max: 4, palette: ['purple', 'green', 'yellow', 'cyan', 'brown']};
```

```JavaScript
Map.addLayer(finalClassification, viz, 'Habitat Mapping Using Random Forest Classification ');
```

The classification image is shown below.

![image](https://github.com/user-attachments/assets/38f3410d-b95b-4c60-b6fe-8509633f597c)


## Evaluate the RF classifier

The RF classifier si assessed using error matrix, resulting in accuracy metrics such as overall accuracy, consumer accuracy, producer accuracy and F-score.
Further details on these accuracies can be found here: 


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


## Conclusion
