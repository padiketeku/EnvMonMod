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
.filterDate('2013-07-11','2013-07-31')

//filter by study area
.filterBounds(dalyNT)

//print the image collection to the Console
print(landsatCol , 'landsatCol ')

Question:

How many images in the collection? Correct, 8 image scenes required to have data for the entire study area.

List down the Path and Row IDs for each image. Read mmore about Path and Row here: (The Landsat Worldwide Reference System)[https://landsat.gsfc.nasa.gov/about/the-worldwide-reference-system/]

Explore the "landsatCol" in the Console and when you drop-down "features" the Path/Row ID is found in the image filename. The Path/Row IDs are:
104/069
104/070
104/071
105/069
105/070
105/071
106/069
106/070



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





## Assessment



## Conclusion
