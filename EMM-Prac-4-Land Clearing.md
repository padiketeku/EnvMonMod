# Introduction

Land clearing can be broadly defined but in the context of this project it is the removal of native vegetation. Land clearing in the Daly River Catchment has often been in the news. Agricultural expansion is regarded as a main driver of clearing in the catchment. The importance of agricultural production cannot be esimated, however, rampant clearing of woody vegetation and shrubs may exacerbate drought, loss of biodiversity, and other ecological problems. Information on the extent of clearing is required for effective management of this problem. The use of free satellite imagery for the monitoring of land clearing can be more cost-efficient. The goal of this project is to explore Landsat imagery for the detection of land clearing in the Daly River Catchment. 


# Learning Outcomes

- mosaicking images

- masking pixels

- rescaling bands

- image differencing

- image statistics

- detect land clearing and (re)growth

- compute spatial extent



# Task

You are required to use Landsat 8 acquired over the Daly River Catchment to detect land clearing from 2014 to 2023. Use the Landsat 8 images acquired in the dry season to minimise the presence of cloud cover and detect land clearing between years (i.e., interannual change) and the 10 year change (long-term change, i.e. 2014-2023). Although, the main objective is to detect land clearing, as a residual task, your boss asked you to report regrowth post-clearing.



# Workflow

The workflow is only for the change in 2014-2018. You are required to modify this workflow to produce a report for the required time series (i.e., 2014-2023)

## Get Landsat 8 data 

Explore the Landsat images acquired in the dry season for each year and decide on the best month to use. In this case, the first 16 days of June was selected. Note, Landsat has 16-day repeat pass.

```JavaScript
//get Landsat 8 collection for 2014
var landsatCol2014 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")

//filter by date 
.filterDate('2014-06-01','2014-06-17') 
//filter by dry season
.filter(ee.Filter.calendarRange(6, 6, 'month'))

//filter by study area
.filterBounds(dalyNT)

print(landsatCol2014 , 'landsatCol2014 ')

//get Landsat 8 collection for 2015
var landsatCol2015 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")

//filter by date 
.filterDate('2015-06-01','2015-06-17') 
//filter by dry season
.filter(ee.Filter.calendarRange(6, 6, 'month'))

//filter by study area
.filterBounds(dalyNT)

print(landsatCol2015 , 'landsatCol2015 ')

//get Landsat 8 collection for 2016
var landsatCol2016 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")

//filter by date 
.filterDate('2016-06-01','2016-06-17')
//filter by dry season
.filter(ee.Filter.calendarRange(6, 6, 'month'))

//filter by study area
.filterBounds(dalyNT)

print(landsatCol2016 , 'landsatCol2016 ')

//get Landsat 8 collection for 2017
var landsatCol2017 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")

//filter by date
.filterDate('2017-06-01','2017-06-17')
//filter by dry season
.filter(ee.Filter.calendarRange(6, 6, 'month'))

//filter by study area
.filterBounds(dalyNT)

print(landsatCol2017 , 'landsatCol2017 ')

//get Landsat 8 collection for 2018
var landsatCol2018 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")

//filter by date 
.filterDate('2018-06-01','2018-06-17')
//filter by dry season
.filter(ee.Filter.calendarRange(6, 6, 'month'))

//filter by study area
.filterBounds(dalyNT)

print(landsatCol2018 , 'landsatCol2018 ')
```

## Mask cloud cover and select bands

When your print the collection to the Console, you may observe that there are 8 images in the collection. This is because 8 Land scenes required to completely cover the study area.
Explore the image properties and you may observe that some of the images are affected by coud cover, especially the 2017 collection. Also, there bands that are not relevant to the project. To this end, mask the cloud cover and select the appropriate bands.

```JavaScript
//mask cloud and cloud shadow; and select relevant bands
var landsatCol2014 =landsatCol2014.map(fmask).select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
var landsatCol2015 =landsatCol2015.map(fmask).select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
var landsatCol2016 =landsatCol2016.map(fmask).select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
var landsatCol2017 =landsatCol2017.map(fmask).select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
var landsatCol2018 =landsatCol2018.map(fmask).select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])

```

## Mosaic images

Mosaick the 8 images in a collection to have a single image.

```JavaScript
//mosaic images in the collection
var img2014 = landsatCol2014.mosaic()
var img2015 = landsatCol2015.mosaic()
var img2016 = landsatCol2016.mosaic()
var img2017 = landsatCol2017.mosaic()
var img2018 = landsatCol2018.mosaic()
```

## Remove non-vegetation surfaces

Land clearing is the removal of vegetation, so vegetation pixels must be retrieved to investigate land clearing. There are many approaches to detect vegetation pixels, but the NDVI method would be used. A function to compute NDVI is given below. Before the NDVI, the bands were transformed to have surface reflectance values normalised between 0-1. [The scale factor and offest values are in the metadata file](https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC08_C02_T1_L2)

```JavaScript
// a function that computes vegetation indices  
var vegetation_indices = function(image) {
  var blue = image.select('SR_B2').multiply(0.0000275).add(-0.2); // selects band and re-scales it
  var green = image.select('SR_B3').multiply(0.0000275).add(-0.2); // 
  var red = image.select('SR_B4').multiply(0.0000275).add(-0.2);  // 
  var nir = image.select('SR_B5').multiply(0.0000275).add(-0.2); //
  var swir1 =image.select('SR_B6').multiply(0.0000275).add(-0.2); //
  var swir2 =image.select('SR_B7').multiply(0.0000275).add(-0.2); //
  var ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI');
  
  //adds NDVI as band to existing six bands 
  return image.addBands(ndvi);
 
};
```
Apply the function to images.

```JavaScript
//apply the vegetation indices function to the images
var img2014 =vegetation_indices(img2014)
var img2015 =vegetation_indices(img2015)
var img2016 =vegetation_indices(img2016)
var img2017 =vegetation_indices(img2017)
var img2018 =vegetation_indices(img2018)
```

Now that we have the NDVI layer we would use this to retrieve the vegetation pixels. A subjective NDVI threshold value of 0.4 was used with the hope that only woodland and shrubs would be available for investigation.
Ideally, you must explore literature to find the best threshold as this can be site specific.

```JavaScript
//mask non-vegetation pixels

//20214
var img2014_veg = img2014.select('NDVI').gte(0.4) //mask layer
var img2014_veg = img2014.updateMask(img2014_veg) //apply mask 

//visualise the layer with only vegetation pixels; these are the white pixels you see
Map.addLayer(img2014_veg, { min:0.3, max:0.7}, 'img2014_veg')


//2015
var img2015_veg = img2015.select('NDVI').gte(0.4) //mask layer
var img2015_veg = img2015.updateMask(img2015_veg) //apply mask 


//2016
var img2016_veg = img2016.select('NDVI').gte(0.4) //mask layer
var img2016_veg = img2016.updateMask(img2016_veg) //apply mask


//2017
var img2017_veg = img2017.select('NDVI').gte(0.4) //mask layer
var img2017_veg = img2017.updateMask(img2017_veg) //apply mask 


//2018
var img2018_veg = img2018.select('NDVI').gte(0.4) //mask layer
var img2018_veg = img2018.updateMask(img2018_veg) //apply mask 
print(img2018_veg, 'img2018_veg')

```


# Conclusion




# Code





**The End**
