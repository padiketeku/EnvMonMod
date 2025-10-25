// Practical 1 


[Click link to go to the first part of practical 1:](https://github.com/padiketeku/EarthObservation101-Practicals/blob/main/Activity-01-Sign%20up%20for%20an%20Earth%20Engine%20Account.md)

[Click link to go to the second part of practical 1:](https://github.com/padiketeku/EarthObservation101-Practicals/blob/main/Activity-02-Understanding%20the%20Earth%20Engine%20Interface.md)

[Click link to go to the third part of practical 1:](https://github.com/padiketeku/EarthObservation101-Practicals/blob/main/Activity-03-Understanding%20Data%20Types%20and%20Conventions.md)


# Final Part of Practical 1

In this final part of the practical, which will also be relevant for the next practical activity, we will explore image collection. Image collection is created when at least 2 images are available in a folder. The individual images in the collection may contain multiple bands, represnting different information about the environment. Here, we will explore image collection through MODIS data. MODIS is a satellite system that collected data about the environment since 2000. MODIS provides global earth observation data, but we will focus on Daly River Catchment of the Northern Terrotor, Australia, as the study area. The MOD13Q1 V6.1 product, which provides a vegetation index (VI) value at a per pixel basis, will be explored. The pixel size for the MOD13Q1 is 250 m. Further details about this product are [here](https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MOD13Q1)

## Workflow


Non-Remote Sensing data for the task can be downloaded from this [site](https://zenodo.org/records/13910706). Download the "Daly_data.zip" for this practical.


1, Upload the boundary (or shapefile) of the study area 

```JavaScript
var dalyNT = ee.FeatureCollection("projects/ee-niiazucrabbe/assets/DalyCatchment") //modify the path to your own EE asset 
```

Usually, at the start of EE, the base map is centered on the US. If your study location is different you would have to re-set the base map to your region of interest. In our case, we would re-set the base map to the Daly River.

```JavaScript
//let the computer display the base map to location of interest (i.e., Daly River)
Map.setCenter(130.6884, -13.694,9)
```

You would want to display the boundary of the study area to be sure this is properly uploaded.

```JavaScript
//create a symbology that makes the study boundary transparent and display this  
var symbology = {color: 'red', fillColor: '00000000'};

//apply the symbology to visualise the boundary of the study area
Map.addLayer(dalyNT.style(symbology), {}, 'Daly River Catchment');
```


Zoom out a wee bit to see the entire size of the boundary layer. Your result should be similar to the figure below.



![image](https://github.com/user-attachments/assets/409533fe-17ca-4f02-b9e4-03964091f3e2)




Happy with the boundary layer? If so, you would like to fetch the MODIS data for the given task.


```JavaScript
/*
The MOD13Q1 V6.1 product provides a Vegetation Index (VI) value at a per pixel basis. 
There are two primary vegetation layers. The first is the Normalized Difference 
Vegetation Index (NDVI) which is referred to as the continuity index to the 
existing National Oceanic and Atmospheric Administration-Advanced Very High 
Resolution Radiometer (NOAA-AVHRR) derived NDVI. 
The second vegetation layer is the Enhanced Vegetation Index (EVI) 
that minimizes canopy background variations and maintains sensitivity 
over dense vegetation conditions. The EVI also uses the blue band 
to remove residual atmosphere contamination caused by smoke 
and sub-pixel thin cloud clouds. The MODIS NDVI and EVI products 
are computed from atmospherically corrected bi-directional surface
reflectances that have been masked for water, clouds, heavy aerosols, and cloud shadows.
*/


// load the MODIS product
var modis = ee.ImageCollection("MODIS/061/MOD13Q1")

//print the result to the console
print (modis, "MODIS VI product") //the texts in quotes will be the identifier of the item in the console

//inspect the image collection printed to the console, 
//take note of the number of images and the bands
//we have 590 images in the collection

//select the NDVI band
//there are many bands in the colllection; let's select the NDVI band

var modisNDVI = modis.select("NDVI")

print(modisNDVI, "modisNDVI")

/*
The NDVI values have been transformed, making it to range from -2000 to 10000.
However, the true NDVI values range from -1 to +1, where positive values approaching 1 
suggests the vegetation landscape is healthy.
We will transform the NDVI values back to the true range using 
the given scale factor: 0.0001
*/

// create a user-defined function that multiplies each NDVI image 
//in the collection by the scale factor: 0.0001
var multiplier = function(image){
  return image.multiply(0.0001).copyProperties(image, ['system:time_start']) //transforms the NDVI image
}

//apply the user defined function to the image collection using .map()
var modisNDVI = modisNDVI.map(multiplier)

/*
Since the MODIS data is a global product, let's clip it to the area of interest.
To do this, we have to create another user-defined function. This is because the
clip function does not directly work on image collection. Clip function works on
an image.
*/

//create a user-defined function that clips each image
var clipImage = function(image){
  return image.clip(dalyNT).copyProperties(image, ['system:time_start'])
}

//apply the user-defined clip function to clip the images in the collection
var aoiNDVI = modisNDVI.map(clipImage)
print(aoiNDVI,'aoiNDVI')
//In the console, explore the image properties

//visualise
Map.addLayer(aoiNDVI, null, 'NDVI') // the 'null' means no visualisation parameters are specified

//if you zoom out you may see brighter and darker pixels.
//brighter pixels have higher NDVI values

//visualise, include setting the visualisation parameters
//here, we will modify "null"
Map.addLayer(aoiNDVI, {min:-0.01, max:0.5, palette:["red", "pink", "purple", "yellow", "green"]}, 'NDVI-2')

var chartNDVI = ui.Chart.image.series({
  
  //specify the variable representing image collection
  imageCollection: aoiNDVI,
  
  //specify the bounds of the study area
  region: dalyNT.geometry().bounds(),
  
  //specify the statistic of interest, usually average
  reducer: ee.Reducer.mean(),
  
  //specify the image property to be used for the x-axis
  //time is usually used
  xProperty: 'system:time_start',
  
  //specify the scale for the analysis
  scale: 250
  
}).setSeriesNames(['NDVI'])
        .setOptions({
          
          //figure caption
          title: 'Average NDVI Value for Daly River Catchment',
          
          //label the x-axis
          hAxis: {title: 'Date', titleTextStyle: {italic: false, bold: true}},
          
          //label the y-axis
          vAxis: {
            title: 'NDVI Value',
            titleTextStyle: {italic: false, bold: true}
          },
          
          //specify the thickness of the plot line
          lineWidth: 2,
          
          //specify the colour of the plot line
          colors: ['green']
        });
  
print(chartNDVI, 'chartNDVI')

```

# Do It Yourself

The MOD13Q1 contains EVI (enhanced vegetation index), which functions similarly as the NDVI in that the EVI also tells us about the greenness or health of the landscape. Select the EVI and produce a time series chart for the DR Catchment. Hint: Copy the code used for the NDVI analysis and modify this, i.e., replacing the "NDVI" with "EVI". Compare your EVI chart with the NDVI chart. What did you observe?


End of Practical 1
 
