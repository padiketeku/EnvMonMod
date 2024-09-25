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

Land clearing is the removal of vegetation, so vegetation pixels must be retrieved to investigate land clearing. There are many approaches to detect vegetation pixels, but the NDVI method would be used. A function to compute NDVI is given below. Before the NDVI, the bands were transformed to have surface reflectance values normalised between 0-1. [The scale factor and offest values are in this metadata file](https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC08_C02_T1_L2)

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

## Image differencing

A simple approach to detect change is subtract two layers. In this task, the difference (i.e. change) in NDVI (i.e., vegetation) between two successive years would be computed for inter-annual and long-term changes. 
The change is limited to the study area.

```JavaScript
var deltaNDVI2014_2015 = img2014_veg.select('NDVI').subtract(img2015_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT)
var deltaNDVI2015_2016 = img2015_veg.select('NDVI').subtract(img2016_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT)
var deltaNDVI2016_2017 = img2016_veg.select('NDVI').subtract(img2017_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT)
var deltaNDVI2017_2018 = img2017_veg.select('NDVI').subtract(img2018_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT)
var deltaNDVI2014_2018 = img2014_veg.select('NDVI').subtract(img2018_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT) //five year change
```


Visualise the change in vegetation between years, the 5 year change is displayed below. The black pixels are where vegetation change is observed.

```JavaScript
//visualise the long-term change n vegetation
Map.addLayer(deltaNDVI2014_2018, {},'deltaNDVI2014_2018')
```

![image](https://github.com/user-attachments/assets/b94e21ad-f0fe-4f21-b53c-7a02938521f6)


### Image histogram

Aside from the spatial distribution of change, you may also want to chart the frequency distirbution using a histogram.

```JavaScript
//visualise the long-term change n vegetation
Map.addLayer(deltaNDVI2014_2018, {},'deltaNDVI2014_2018')

//histogram for the 2014-2018 change
var histogram_deltaNDVI2014_2018=
    ui.Chart.image.histogram({
      image: deltaNDVI2014_2018,
      region: dalyNT.geometry(), 
      scale: 5000,
      minBucketWidth: 0.0001
      //maxPixels:1e12
      //maxBuckets: 2
    })
        .setOptions({
          title: 'A histogram for the 2014-2018 change ',
          hAxis: {
            //title: 'histogram',
            titleTextStyle: {italic: false, bold: true},
          },
          vAxis:
              {title: 'Count', titleTextStyle: {italic: false, bold: true}},
          colors: ['cf513e', '1d6b99', 'f0af07']
        });
print(histogram_deltaNDVI2014_2018, 'histogram_deltaNDVI2014_2018');

```


![image](https://github.com/user-attachments/assets/5776886a-d085-4a66-85ed-edb6e5c6f21c)


If you explore the histogram, the deltaNDVI values -0.032 to 0.042 are dominant (i.e., largest frequency/count).


## Detect land clearing

We would use mean and standard deviation to detect pixels that were cleared. Before this, let's combine the deltaNDVI images into one collection.

```JavaScript
//collection of deltaNDVI images
var deltaNDVIcol = ee.ImageCollection.fromImages([deltaNDVI2014_2015, deltaNDVI2015_2016, deltaNDVI2016_2017, deltaNDVI2017_2018, deltaNDVI2014_2018])
```

To detect land clearing we would use a method in this paper.
It is a threshold methods in which land clearing pixels is defined by subtracting 1.5 standard deviation (SD) from mean: mean-(1.5xSD). Corollary, the threshold for growth or regrowth (regrwoth is when an identified cleared pixel recovers post-clearing) is mean+(1.5xSD). To satify this threshold, we would have to compute the mean and SD for the deltaNDVI images.

```JavaScript
//function to comupte mean and standard deviation of deltaNDVI
var meanSD = function(image) {
  
  var reducers = ee.Reducer.mean().combine({
  reducer2: ee.Reducer.stdDev(),
  sharedInputs: true
  });

  var stats1 = ee.Image(image).reduceRegion({
    reducer: reducers,
    geometry: dalyNT.geometry(),
    scale: 30,
    bestEffort: true
  });
  
  return ee.Image(image).set(stats1);

};

var mean_stdev = deltaNDVIcol.map(meanSD);

print( mean_stdev, 'statistics');
```

In the Console, expand the image properties to view the meand and SD values. Your screen may be as shown below. 

![image](https://github.com/user-attachments/assets/03f5f3b2-9077-47be-b7fc-aa64099edf0c)



### Land clearing thresholds

Use the image statistics to define the thresholds based off the method described above.


```JavaScript
//land clearing thresholds
var thresh1_LC = -0.0016-(1.5*0.1844) //2014-15
var thresh2_LC = -0.0544-(1.5*5.7151) //2015-16
var thresh3_LC = 0.0523-(1.5*4.2287) //2016-17
var thresh4_LC = 0.0095-(1.5*0.3937) //2017-18
var thresh5_LC = 0.01809-(1.5*0.3487) //2014-18

```

### Detect land clearing

```JavaScript
//detect land clearing
var mask1_LC= deltaNDVI2014_2015.lt(thresh1_LC)
var imgLC_2014_2015=deltaNDVI2014_2015.updateMask(mask1_LC)
Map.addLayer(imgLC_2014_2015,{}, 'Land Clearing 2014-2015')
print(imgLC_2014_2015, 'imgLC_2014_2015')

var mask2_LC= deltaNDVI2015_2016.lt(thresh2_LC)
var imgLC_2015_2016=deltaNDVI2015_2016.updateMask(mask2_LC)
Map.addLayer( imgLC_2015_2016,{}, 'Land Clearing 2015-2016')

var mask3_LC= deltaNDVI2016_2017.lt(thresh3_LC)
var imgLC_2016_2017=deltaNDVI2016_2017.updateMask(mask3_LC)
Map.addLayer( imgLC_2016_2017,{}, 'Land Clearing 2016-2017')

var mask4_LC= deltaNDVI2017_2018.lt(thresh4_LC)
var imgLC_2017_2018=deltaNDVI2017_2018.updateMask(mask4_LC)
Map.addLayer( imgLC_2017_2018,{}, 'Land Clearing 2017-2018')

var mask5_LC= deltaNDVI2014_2018.lt(thresh5_LC)
var imgLC_2014_2018=deltaNDVI2014_2018 .updateMask(mask5_LC)
Map.addLayer( imgLC_2014_2018,{}, 'Land Clearing 2014-2018')
```

You have five layers in the layer manager, the figure below is the the layer showing land clearing over the 5 years. Given the change observed was significantly small, you must zoom in on the pixels as shown below. The change pixels are the dark pixels.
Explore the other change images for the interannual clearing. Which years did you observe land clearing?



![image](https://github.com/user-attachments/assets/e444aeb0-d66e-4176-9865-e0d57fd7284e)


### Detect growth 

Out of curiosity and also to have a complete story you would want to know any growth or regrowth pattern in the catchment. The code below detect grwoth in the study area.

```JavaScript

//growth thresholds
var thresh1_G = -0.0016+(1.5*0.1844) //2014-15
var thresh2_G = -0.0544+(1.5*5.7151) //2015-16
var thresh3_G = 0.0523+(1.5*4.2287) //2016-17
var thresh4_G = 0.0095+(1.5*0.3937) //2017-18
var thresh5_G = 0.01809+(1.5*0.3487) //2014-18

//detect growth
var mask1_G= deltaNDVI2014_2015.gt(thresh1_G)
var imgG_2014_2015=deltaNDVI2014_2015.updateMask(mask1_G)
Map.addLayer(imgG_2014_2015,{}, 'Growth 2014-2015')
print(imgG_2014_2015, 'imgG_2014_2015')

var mask2_G= deltaNDVI2015_2016.gt(thresh2_G)
var imgG_2015_2016=deltaNDVI2015_2016.updateMask(mask2_G)
Map.addLayer( imgG_2015_2016,{}, 'Growth 2015-2016')

var mask3_G= deltaNDVI2016_2017.gt(thresh3_G)
var imgG_2016_2017=deltaNDVI2016_2017.updateMask(mask3_G)
Map.addLayer( imgG_2016_2017,{}, 'Growth 2016-2017')

var mask4_G= deltaNDVI2017_2018.gt(thresh4_G)
var imgG_2017_2018=deltaNDVI2017_2018.updateMask(mask4_G)
Map.addLayer( imgG_2017_2018,{}, 'Growth 2017-2018')

var mask5_G= deltaNDVI2014_2018.gt(thresh5_G)
var imgG_2014_2018=deltaNDVI2014_2018 .updateMask(mask5_G)
Map.addLayer( imgG_2014_2018,{}, 'Growth 2014-2018')

```

### Visualisation clearing and growth

In the Layer Manager, you have all the land clearing and growth images that can be displayed separately. However, it is best to visualise land clearing and growth (and of course no-change) at the same time. To achieve this, we would explore the deltaNDVI images using conditional statements. The task demonstrates the long-term (2014-2018) change only.

```JavaScript

//firest set up the colour palette
var palette = ['white', 'red', 'green']; //white = no change; red = clearing, green = regrowth

var classes = deltaNDVI2014_2018.expression(

    "(b(0) > 0.54114) ? 2" + //Regrowth

      ": (b(0) < -0.50496) ? 1" + // LAND CLEARING

        ": 0" //NO CHANGE

);
```

Now, visualise the change classes using the code below

```JavaScript
Map.addLayer(classes.clip(dalyNT),

             {min: 0, max: 2, palette: palette},

             'Clearing,Growth,NoChange 2014-2018');
```

You may quickly observe land clearing and growth pixels are hardly visible as there number of pixels was very small. You must explore your change image to find red and green pixels, this means you must zoom in on these pixels. A mixture of land clearing and growth may be found near Edith.


![image](https://github.com/user-attachments/assets/9047b49a-6f97-4421-a578-ab75320fb06b)


## Spatial extent of change

What is the extent of land clearing and growth? At this point we know by the spatial information that land clearing and growth for 2014-2018 was small. However, we need to quantify this

```JavaScript
//size of land cleared between 2014-2018 (in hectares)
var select_landClearing =  classes.select('constant').eq(1)
var area_landClearing_ha =  select_landClearing.multiply(ee.Image.pixelArea()).divide(1e4);
var total_area_cleared = area_landClearing_ha.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: dalyNT.geometry(),
  scale: 30,
  maxPixels: 1e12
});
print(total_area_cleared, 'Total Area Cleared, 2014-2018')

//size of growth between 2014-2018 (in hectares)
var select_growth =  classes.select('constant').eq(2)
var area_growth_ha =  select_growth.multiply(ee.Image.pixelArea()).divide(1e4);
var total_area_growth = area_growth_ha.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: dalyNT.geometry(),
  scale: 30,
  maxPixels: 1e12
});
print(total_area_growth, 'Total Growth, 2014-2018')

```


Your result in the Console may be as the figure shown below.

![image](https://github.com/user-attachments/assets/1648e359-274d-4835-8e49-6b0368d39515)



The extent of land clearing and growth was approximately 65ha and 4ha, respectively.


# Conclusion




# Code





**The End**
