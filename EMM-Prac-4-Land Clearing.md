# Introduction

Land clearing can be broadly defined but in the context of this project it is the removal of native vegetation. Land clearing in the Daly River Catchment has often been in the news. Agricultural expansion is regarded as a main driver of clearing in the catchment. The importance of agricultural production cannot be esimated, however, rampant clearing of woody vegetation and shrubs may exacerbate drought, loss of biodiversity, and other ecological problems. Information on the extent of clearing is required for effective management of this problem. The use of free satellite imagery for the monitoring of land clearing can be more cost-efficient. The goal of this project is to explore Landsat imagery for the detection of land clearing in the Daly River Catchment. 

It is assumed that previous practical sessions have been completed prior to taking this project. 


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

Land clearing is the removal of vegetation, so vegetation pixels must be identified to investigate land clearing. There are many approaches to detect vegetation pixels, but the NDVI method would be used. A function to compute NDVI is given below. Before the NDVI was computed, the bands were transformed to have surface reflectance values normalised. [The scale factor and offest values are in this metadata file](https://developers.google.com/earth-engine/datasets/catalog/LANDSAT_LC08_C02_T1_L2)

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

Now that we have the NDVI layer we would use this to identify the vegetation pixels. A subjective NDVI threshold value of 0.4 was used with the hope that only woodland and shrubs would be available for the investigation.

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

A simple approach to detect change is to subtract two layers. In this task, the difference (i.e. change) in NDVI (i.e., vegetation) between a baseline (2014) and target years would be computed. 
The change is limited to the study area.

```JavaScript
var c15 = img2014_veg.select('NDVI').subtract(img2015_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT)
var c16 = img2014_veg.select('NDVI').subtract(img2016_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT)
var c17 = img2014_veg.select('NDVI').subtract(img2017_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT)
var c18 = img2014_veg.select('NDVI').subtract(img2018_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT)
var c19 = img2014_veg.select('NDVI').subtract(img2019_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT) 
```


Visualise the change in vegetation, you need to do this for every year. The vegetation change for 2016 is displayed below. The black pixels are where vegetation change is observed.

```JavaScript
//visualise the long-term change n vegetation
Map.addLayer(c16, {},'deltaNDVI_2016')
```

![image](https://github.com/user-attachments/assets/83a2064d-ac44-45ca-8c7c-2b17fa761fbe)



### Image histogram

Aside from the spatial distribution of change, you may also want to chart the frequency distirbution using a histogram. Although a histogram for each year can be produced, only the one for 2016 is shown using the code below. You may modify this code to get the histograms for the other years.

```JavaScript
//histogram for the 2016 change
var histogram_deltaNDVI2016=
    ui.Chart.image.histogram({
      image: c16,
      region: dalyNT.geometry(), 
      scale: 5000,
      minBucketWidth: 0.0001
    })
        .setOptions({
          title: 'A histogram for change in 2016 ',
          hAxis: {
            //title: 'histogram',
            titleTextStyle: {italic: false, bold: true},
          },
          vAxis:
              {title: 'Count', titleTextStyle: {italic: false, bold: true}},
          colors: ['cf513e', '1d6b99', 'f0af07']
        });
print(histogram_deltaNDVI2016, 'histogram_deltaNDVI2016');
```

The histogram pops up in the Console, but you may have to click the expander for the figure to open in a new window. Your result may be as the figure below.


![image](https://github.com/user-attachments/assets/defd5265-bfa3-4e2e-9710-62fb284eb607)



The x-axis is the deltaNDVI, while the y-axis is the number of pixels (i.e., count) for a deltaNDVI. Majority of the change pixels fall between -0.1 and 0.1.


## Detect land clearing

We would use mean and standard deviation to detect pixels that were cleared. Before this, let's combine the deltaNDVI images into one collection.

```JavaScript
//collection of deltaNDVI images
var deltaNDVIcol = ee.ImageCollection.fromImages([c15,c16,c17,c18,c19])
```

 A change analysis based off long observations is more robust. Because of this, the long-term (2015-2023) average of the deltaNDVI is required.

```JavaScript
//average the images in the collection
var mean_deltaNDVIcol =ee.ImageCollection(deltaNDVIcol.mean())
```
 
To detect land clearing we would use a method in this [paper](https://doi.org/10.3832/IFOR0909-007).
It is a threshold method in which land clearing pixels are defined by subtracting 1.5 standard deviation (SD) from mean: mean-(1.5xSD). Corollary, the threshold for growth or regrowth (regrowth is when an identified cleared pixel recovers post-clearing) is mean+(1.5xSD). To satify this threshold, we would have to compute the mean and SD for the deltaNDVI images.

```JavaScript
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

var mean_stdev = mean_deltaNDVIcol.map(meanSD);

print( mean_stdev, 'statistics');
```

In the Console, expand the image properties to view the mean and SD values. Your screen may be as shown below. 


![image](https://github.com/user-attachments/assets/4141c713-6bc7-4b12-9a5a-5aa0d75dd09e)



### Land clearing and regrowth thresholds

Use the image statistics to define the thresholds based off the method described above.


```JavaScript
var clearing = -0.00509-(1.5*1.45876)  
var regrowth = -0.00509+(1.5*1.45876)  
print(clearing, regrowth)
```

What is the threshold for clearing and regrowth? You are right, clearing = -2.1932 and regrowth = 2.1831



### Detect land clearing

```JavaScript
//detect land clearing
var mask1_LC= c15.lt( clearing)
var imgLC_2015=c15.updateMask(mask1_LC)
Map.addLayer(imgLC_2015,{}, 'Clearing2015')

var mask2_LC= c16.lt( clearing)
var imgLC_2016=c16.updateMask(mask2_LC)
Map.addLayer( imgLC_2016,{}, 'Clearing2016')

var mask3_LC= c17.lt( clearing)
var imgLC_2017=c17.updateMask(mask3_LC)
Map.addLayer( imgLC_2017,{}, 'Clearing2017')

var mask4_LC= c18.lt( clearing)
var imgLC_2018=c18.updateMask(mask4_LC)
Map.addLayer( imgLC_2018,{}, 'Clearing2018')

var mask5_LC= c19.lt( clearing)
var imgLC_2019=c19.updateMask(mask5_LC)
Map.addLayer( imgLC_2019,{}, 'Clearing2019')
```

You have five layers in the Layer Manager, the figure below is the the layer showing land clearing for 2016. Zoom in on the change detection pixels (red pixels). 



![image](https://github.com/user-attachments/assets/0e315a63-44d9-447c-8ffb-7d5ac3e9e2dd)



### Detect growth 

Out of curiosity and also to have a complete story you would want to know any growth or regrowth pattern in the catchment. The best approach to detect regrowth is firstly to identify land clearing areas and monitor these pixels post-clearing. This approach is not directly implemented in this task as it is beyond the scope of the activity.

The code below detect growth in the study area. 

```JavaScript

//detect growth
var mask1_G= c15.gt(regrowth)
var imgG_2015=c15.updateMask(mask1_G)
Map.addLayer(imgG_2015,{}, 'Growth2015')

var mask2_G= c16.gt(regrowth)
var imgG_2016=c16.updateMask(mask1_G)
Map.addLayer(imgG_2016,{}, 'Growth2016')

var mask3_G= c17.gt(regrowth)
var imgG_2017=c17.updateMask(mask3_G)
Map.addLayer(imgG_2017,{}, 'Growth2017')

var mask4_G= c18.gt(regrowth)
var imgG_2018=c18.updateMask(mask4_G)
Map.addLayer(imgG_2018,{}, 'Growth2018')

var mask5_G= c19.gt(regrowth)
var imgG_2019=c19.updateMask(mask5_G)
Map.addLayer(imgG_2019,{}, 'Growth2019')
```

### Visualise land clearing and growth

In the Layer Manager, you have all the land clearing and growth images that can be displayed separately. However, it is best to visualise land clearing and growth (and of course no-change) at the same time. To achieve this, we would explore the deltaNDVI images using conditional statements. The task demonstrates 2016 change only.

```JavaScript

//first set up the colour palette
var palette = ['yellow', 'red', 'green']; //white = no change; red = clearing, green = regrowth

var classes = c16.expression(

    "(b(0) > 2.1831) ? 2" + //Regrowth

      ": (b(0) < -2.1932) ? 1" + // LAND CLEARING

        ": 0" //NO CHANGE

);

print(classes, '3-classes')

Map.addLayer(classes.clip(dalyNT),

             {min: 0, max: 2, palette: palette},

             'Clearing,Regrowth,NoChange2016');

```

The land clearing, regrowth and no-change map for 2016 may look like the one below. 



![image](https://github.com/user-attachments/assets/18aebc57-4091-44f5-8819-caba472a8847)



You may observe that land clearing (red pixels) was more dominant than regrowth in 2016. The clearing is concentrated in the highland areas (north-east). 



## Spatial extent of change

What is the extent of land clearing and growth? At this point we know by the spatial information that there was more land clearing than regrowth in 2016. However, we need to quantify this. 

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
print(total_area_cleared, 'Potential Total Area Cleared, 2016')

//size of growth between 2014-2018 (in hectares)
var select_growth =  classes.select('constant').eq(2)
var area_growth_ha =  select_growth.multiply(ee.Image.pixelArea()).divide(1e4);
var total_area_growth = area_growth_ha.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: dalyNT.geometry(),
  scale: 30,
  maxPixels: 1e12
});
print(total_area_growth, 'Potential Total Regrowth, 2016')

```


Your result in the Console may be as the figure shown below.


![image](https://github.com/user-attachments/assets/1d8568e8-79f6-4c27-81fc-5d053b3ce1ec)




The extent of land clearing and growth was approximately 65ha and 4ha, respectively.

To determine the total land clearing and regrowth for 2015-2023 you must add values up.



# Conclusion

This activity has explored Landsat 8 data for the detection of land clearing and regrowth in the Daly River Catchment, NT. 


# Code

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


//cloud cover present in images, especially the 2017 collection
//mask cloud and cloud shadow; and select relevant bands
var landsatCol2014 =landsatCol2014.map(fmask).select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
var landsatCol2015 =landsatCol2015.map(fmask).select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
var landsatCol2016 =landsatCol2016.map(fmask).select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
var landsatCol2017 =landsatCol2017.map(fmask).select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
var landsatCol2018 =landsatCol2018.map(fmask).select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])


//mosaic images in the collection
var img2014 = landsatCol2014.mosaic()
var img2015 = landsatCol2015.mosaic()
var img2016 = landsatCol2016.mosaic()
var img2017 = landsatCol2017.mosaic()
var img2018 = landsatCol2018.mosaic()


//mask non vegetation and burnt pixels-we would use NDVI 
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

//apply the vegetation indices function to the images
var img2014 =vegetation_indices(img2014)
var img2015 =vegetation_indices(img2015)
var img2016 =vegetation_indices(img2016)
var img2017 =vegetation_indices(img2017)
var img2018 =vegetation_indices(img2018)


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


//delta NDVI
// difference in NDVI between two successive years, rename band and clip to study area
var deltaNDVI2014_2015 = img2014_veg.select('NDVI').subtract(img2015_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT)
print(deltaNDVI2014_2015, 'deltaNDVI2014')
Map.addLayer(deltaNDVI2014_2015, {},'deltaNDVI2014')

var deltaNDVI2015_2016 = img2015_veg.select('NDVI').subtract(img2016_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT)
var deltaNDVI2016_2017 = img2016_veg.select('NDVI').subtract(img2017_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT)
var deltaNDVI2017_2018 = img2017_veg.select('NDVI').subtract(img2018_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT)
var deltaNDVI2014_2018 = img2014_veg.select('NDVI').subtract(img2018_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT) //five year change

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

//analysis to determine land clearing and growth
//first, put the images together as a collection

//collection of deltaNDVI images
var deltaNDVIcol = ee.ImageCollection.fromImages([deltaNDVI2014_2015, deltaNDVI2015_2016, deltaNDVI2016_2017, deltaNDVI2017_2018, deltaNDVI2014_2018])


//now that we have the daltaNDVI we can use a threshold method again considering the mean and standard deviation
//values. we would follow this method to specify thresholds: mean+1.5SD for regrowth and mean-1.5SD for clearing, else no-change

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

//define thresholds to determine clearing and regrowth

//land clearing thresholds
var thresh1_LC = -0.0016-(1.5*0.1844) //2014-15
var thresh2_LC = -0.0544-(1.5*5.7151) //2015-16
var thresh3_LC = 0.0523-(1.5*4.2287) //2016-17
var thresh4_LC = 0.0095-(1.5*0.3937) //2017-18
var thresh5_LC = 0.01809-(1.5*0.3487) //2014-18


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
Map.addLayer( imgLC_2014_2018,{color:'red'}, 'Land Clearing 2014-2018')

// detect growth
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
//print(imgG_2014_2018, 'imgG_2014_2018')

//clearing and growth
var palette = ['white', 'red', 'green']; //white = no change; red = clearing, green = regrowth

var classes = deltaNDVI2014_2018.expression(

    "(b(0) > 0.54114) ? 2" + //Regrowth

      ": (b(0) < -0.50496) ? 1" + // LAND CLEARING

        ": 0" //NO CHANGE

);

print(classes, '3-classes')

Map.addLayer(classes.clip(dalyNT),

             {min: 0, max: 2, palette: palette},

             'Clearing,Growth,NoChange 2014-2018');
			 

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


# Assignment

Modify the scripts to produce inter-annual and long term (2014-2023) changes in spatial extent of land clearing and growth in the Daly River Catchment.
Make a report of 1000 words that answer the following: <br>
1, How did you detect land clearing and growth, include justification of the methods used <br>
2, Produce maps for the inter-annual and long-term clearing and growth. Only include maps that show significant changes <br>
3, Produce a table showing the extent of clearing and growth for the inter-annual analysis <br>
4, Interpret your maps and tables <br>
5, Critically evaluate the task, include what you have learned, the challenges encountered (solved or pending), and how the results can be improved

**The End**
