// Practical 1 


[Click link to go to the first part of practical 1:](https://github.com/padiketeku/EarthObservation101-Practicals/blob/main/Activity-01-Sign%20up%20for%20an%20Earth%20Engine%20Account.md)

[Click link to go to the second part of practical 1:](https://github.com/padiketeku/EarthObservation101-Practicals/blob/main/Activity-02-Understanding%20the%20Earth%20Engine%20Interface.md)

[Click link to go to the third part of practical 1:](https://github.com/padiketeku/EarthObservation101-Practicals/blob/main/Activity-03-Understanding%20Data%20Types%20and%20Conventions.md)


# Final Part of Practical 1

In this final part of the practical, which will also be relevant for the next practical activity, we will explore image collection. Image collection is created when at least 2 images are available in a folder. The individual images in the collection may contain multiple bands, represnting different information about the environment. Here, we will explore MODIS data. MODIS is a satellite system that collected data about the environment since 2000. MODIS provides global earth observation data, but we will focus on Daly River Catchment of the Northern Terrotor, Australia, as the study area. The MOD13Q1 V6.1 product, which provides a vegetation index (VI) value at a per pixel basis, will be explored. The pixel size for the MOD13Q1 is 250 m. Further details about this product are [here](https://developers.google.com/earth-engine/datasets/catalog/MODIS_061_MOD13Q1)

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




Happy with the boundary layer? If so, you would like to find the Landsat 8 imagery in the database relevant for the given task.


2, Image Collection

The script below retrieves a collection of Landsat 8 images from the database and filters the collection by date and the polygon of the study area to ensure images were acquired in the dry season to minimise cloud cover. 


```JavaScript

//get Landsat 8 collection; this is a surface reflectance product 
var landsatCol = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")

//filter by date
.filterDate('2013-07-11','2013-07-31')

//filter by study area
.filterBounds(dalyNT)

//print the image collection to the Console
print(landsatCol , 'landsatCol ')
```

Explore the result in the Console, always inspect the image properties taking note of cloud coverage. You may observe that there are images with cloud and cloud shadow pixels.


Question:

How many images are in the collection? Correct, eight Landsat 8 image scenes required to cover the entire study area.

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


![image](https://github.com/user-attachments/assets/ef339a31-0386-4867-9606-03c025d255a8)




3, Mask cloud and cloud shadow pixels

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




End of Practical 1
 
