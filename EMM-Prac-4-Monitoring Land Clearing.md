# Acknowledgements

Google Earth Engine Developers

Google Earth Engine Team

Cristina Calirgos Rodriguez



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

You are required to use Landsat 8 acquired over the Daly River Catchment to detect land clearing from 2014 to 2023. Use the Landsat 8 images acquired in the dry season to minimise the presence of cloud cover and detect land clearing between years (i.e., interannual change) and estimate the total land clearing and regrowth. Although, the main objective is to detect land clearing, as a residual task, your boss asked you to report regrowth of vegetation.



# Workflow


## Study area and cloud masking code

This code is used in previous practical activities and relevant for this project, hence carried across. You may not need this.

```JavaScript
//region of interest is the Daly River catchment of the Northern Territory, Australia
var dalyNT = ee.FeatureCollection("projects/ee-niiazucrabbe/assets/DalyCatchment") //modify the path to your own GEE asset 

//let the computer display the base map to location of interest (i.e., Daly River)
Map.setCenter(130.6884, -13.694,9)

//create a symoblogy that makes the study boundary transparent and display this  
var symbology = {color: 'black', fillColor: '00000000'};

//apply the symbology to visualise the boundary of the study area
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
```

**Project Begins**


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

//get Landsat 8 collection for 2019
var landsatCol2019 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")

//filter by date 
.filterDate('2019-06-01','2019-06-17')
//filter by dry season
.filter(ee.Filter.calendarRange(6, 6, 'month'))

//filter by study area
.filterBounds(dalyNT)
print(landsatCol2019 , 'landsatCol2019 ')

//get Landsat 8 collection for 2020
var landsatCol2020 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")

//filter by date 
.filterDate('2020-06-01','2020-06-17')
//filter by dry season
.filter(ee.Filter.calendarRange(6, 6, 'month'))

//filter by study area
.filterBounds(dalyNT)
//print the image collection to the Console
print(landsatCol2020 , 'landsatCol2020 ')

//get Landsat 8 collection for 2021
var landsatCol2021 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")

//filter by date 
.filterDate('2021-06-01','2021-06-17')
//filter by dry season
.filter(ee.Filter.calendarRange(6, 6, 'month'))

//filter by study area
.filterBounds(dalyNT)

//print the image collection to the Console
print(landsatCol2021 , 'landsatCol2021 ')


//get Landsat 8 collection for 2022
var landsatCol2022 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")

//filter by date 
//.filterDate('2018-01-01','2019-01-01') 
.filterDate('2022-06-01','2022-06-17')
//filter by dry season
.filter(ee.Filter.calendarRange(6, 6, 'month'))

//filter by study area
.filterBounds(dalyNT)
//print the image collection to the Console
print(landsatCol2022 , 'landsatCol2022 ')

//get Landsat 8 collection for 2023
var landsatCol2023 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")

//filter by date 
.filterDate('2023-06-01','2023-06-17')
//filter by dry season
.filter(ee.Filter.calendarRange(6, 6, 'month'))

//filter by study area
.filterBounds(dalyNT)
//print the image collection to the Console
print(landsatCol2023 , 'landsatCol2023 ')
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
var landsatCol2019 =landsatCol2019.map(fmask).select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
var landsatCol2020 =landsatCol2020.map(fmask).select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
var landsatCol2021 =landsatCol2021.map(fmask).select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
var landsatCol2022 =landsatCol2022.map(fmask).select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
var landsatCol2023 =landsatCol2023.map(fmask).select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
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
var img2019 = landsatCol2019.mosaic()
var img2020 = landsatCol2020.mosaic()
var img2021 = landsatCol2021.mosaic()
var img2022 = landsatCol2022.mosaic()
var img2023 = landsatCol2023.mosaic()
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
var img2019 =vegetation_indices(img2019)
var img2020 =vegetation_indices(img2020)
var img2021 =vegetation_indices(img2021)
var img2022 =vegetation_indices(img2022)
var img2023 =vegetation_indices(img2023)
```

Now that we have the NDVI layer we would use this to identify the vegetation pixels. A subjective NDVI threshold value of 0.4 was used with the hope that only woodland and shrubs would be available for the investigation.

Ideally, you must explore literature to find the best threshold as this can be site specific.

```JavaScript
//mask non-vegetation pixels

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

//2019
var img2019_veg = img2019.select('NDVI').gte(0.4) //mask layer
var img2019_veg = img2019.updateMask(img2019_veg) //apply mask 


//2020
var img2020_veg = img2020.select('NDVI').gte(0.4) //mask layer
var img2020_veg = img2020.updateMask(img2020_veg) //apply mask 


//2021
var img2021_veg = img2021.select('NDVI').gte(0.4) //mask layer
var img2021_veg = img2021.updateMask(img2021_veg) //apply mask


//2022
var img2022_veg = img2022.select('NDVI').gte(0.4) //mask layer
var img2022_veg = img2022.updateMask(img2022_veg) //apply mask 


//2023
var img2023_veg = img2023.select('NDVI').gte(0.4) //mask layer
var img2023_veg = img2023.updateMask(img2023_veg) //apply mask 

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
var c20 = img2014_veg.select('NDVI').subtract(img2020_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT)
var c21 = img2014_veg.select('NDVI').subtract(img2021_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT)
var c22 = img2014_veg.select('NDVI').subtract(img2022_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT)
var c23 = img2014_veg.select('NDVI').subtract(img2023_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT)
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

Land clearing and regrowth for the first 5 years (2015-2019) is presented here. However, you are required to analyse the whole 9 years (2015-2023) to the complete assessment.



### The 2015-2019 Analysis


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
//size of potential land cleared in 2016 (in hectares)
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




The table shows clearing and regrowth from 2015 to 2019. 

The extent of clearing and regrowth.

|Year| Clearing (ha) | Regrowth (ha)
|----|---------------|-------------|
|2015|39|0.87|
|2016| 4342          |0.35          |
|2017| 0.43           | 1.13            |
|2018|  10             | 0.52            |
|2019|    585           |      0.26       |


To determine the total land clearing and regrowth for 2015-2023 you must add the values up.



# Conclusion

This activity has explored Landsat 8 data for the detection of land clearing and regrowth in the Daly River Catchment, NT. 


# Code

```JavaScript

//region of interest is the Daly River catchment of the Northern Territory, Australia
var dalyNT = ee.FeatureCollection("projects/ee-niiazucrabbe/assets/DalyCatchment") //modify the path to your own GEE asset 

//let the computer display the base map to location of interest (i.e., Daly River)
Map.setCenter(130.6884, -13.694,9)

//create a symoblogy that makes the study boundary transparent and display this  
var symbology = {color: 'black', fillColor: '00000000'};

//apply the symbology to visualise the boundary of the study area
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
```

**Project Begins**


//get study area
var dalyNT = ee.FeatureCollection("projects/ee-niiazucrabbe/assets/DalyCatchment")
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

//get Landsat 8 collection for 2019
var landsatCol2019 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")

//filter by date 
.filterDate('2019-06-01','2019-06-17')
//filter by dry season
.filter(ee.Filter.calendarRange(6, 6, 'month'))

//filter by study area
.filterBounds(dalyNT)
print(landsatCol2019 , 'landsatCol2019 ')

//get Landsat 8 collection for 2020
var landsatCol2020 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")

//filter by date 
.filterDate('2020-06-01','2020-06-17')
//filter by dry season
.filter(ee.Filter.calendarRange(6, 6, 'month'))

//filter by study area
.filterBounds(dalyNT)
//print the image collection to the Console
print(landsatCol2020 , 'landsatCol2020 ')

//get Landsat 8 collection for 2021
var landsatCol2021 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")

//filter by date 
.filterDate('2021-06-01','2021-06-17')
//filter by dry season
.filter(ee.Filter.calendarRange(6, 6, 'month'))

//filter by study area
.filterBounds(dalyNT)

//print the image collection to the Console
print(landsatCol2021 , 'landsatCol2021 ')


//get Landsat 8 collection for 2022
var landsatCol2022 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")

//filter by date 
//.filterDate('2018-01-01','2019-01-01') 
.filterDate('2022-06-01','2022-06-17')
//filter by dry season
.filter(ee.Filter.calendarRange(6, 6, 'month'))

//filter by study area
.filterBounds(dalyNT)
//print the image collection to the Console
print(landsatCol2022 , 'landsatCol2022 ')

//get Landsat 8 collection for 2023
var landsatCol2023 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")

//filter by date 
.filterDate('2023-06-01','2023-06-17')
//filter by dry season
.filter(ee.Filter.calendarRange(6, 6, 'month'))

//filter by study area
.filterBounds(dalyNT)
//print the image collection to the Console
print(landsatCol2023 , 'landsatCol2023 ')

//cloud cover present in images, especially the 2017 collection
//mask cloud and cloud shadow; and select relevant bands
var landsatCol2014 =landsatCol2014.map(fmask).select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
var landsatCol2015 =landsatCol2015.map(fmask).select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
var landsatCol2016 =landsatCol2016.map(fmask).select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
var landsatCol2017 =landsatCol2017.map(fmask).select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
var landsatCol2018 =landsatCol2018.map(fmask).select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
var landsatCol2019 =landsatCol2019.map(fmask).select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
var landsatCol2020 =landsatCol2020.map(fmask).select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
var landsatCol2021 =landsatCol2021.map(fmask).select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
var landsatCol2022 =landsatCol2022.map(fmask).select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
var landsatCol2023 =landsatCol2023.map(fmask).select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])

//mosaic images in the collection
var img2014 = landsatCol2014.mosaic()
var img2015 = landsatCol2015.mosaic()
var img2016 = landsatCol2016.mosaic()
var img2017 = landsatCol2017.mosaic()
var img2018 = landsatCol2018.mosaic()
var img2019 = landsatCol2019.mosaic()
var img2020 = landsatCol2020.mosaic()
var img2021 = landsatCol2021.mosaic()
var img2022 = landsatCol2022.mosaic()
var img2023 = landsatCol2023.mosaic()

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
var img2019 =vegetation_indices(img2019)
var img2020 =vegetation_indices(img2020)
var img2021 =vegetation_indices(img2021)
var img2022 =vegetation_indices(img2022)
var img2023 =vegetation_indices(img2023)

//mask non-vegetation pixels
//2014
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

//2019
var img2019_veg = img2019.select('NDVI').gte(0.4) //mask layer
var img2019_veg = img2019.updateMask(img2019_veg) //apply mask 


//2020
var img2020_veg = img2020.select('NDVI').gte(0.4) //mask layer
var img2020_veg = img2020.updateMask(img2020_veg) //apply mask 


//2021
var img2021_veg = img2021.select('NDVI').gte(0.4) //mask layer
var img2021_veg = img2021.updateMask(img2021_veg) //apply mask


//2022
var img2022_veg = img2022.select('NDVI').gte(0.4) //mask layer
var img2022_veg = img2022.updateMask(img2022_veg) //apply mask 


//2023
var img2023_veg = img2023.select('NDVI').gte(0.4) //mask layer
var img2023_veg = img2023.updateMask(img2023_veg) //apply mask 

//delta NDVI
// difference in NDVI between two layers, rename band and clip to study area
var c15 = img2014_veg.select('NDVI').subtract(img2015_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT)
var c16 = img2014_veg.select('NDVI').subtract(img2016_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT)
var c17 = img2014_veg.select('NDVI').subtract(img2017_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT)
var c18 = img2014_veg.select('NDVI').subtract(img2018_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT)
var c19 = img2014_veg.select('NDVI').subtract(img2019_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT) 
var c20 = img2014_veg.select('NDVI').subtract(img2020_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT)
var c21 = img2014_veg.select('NDVI').subtract(img2021_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT)
var c22 = img2014_veg.select('NDVI').subtract(img2022_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT)
var c23 = img2014_veg.select('NDVI').subtract(img2023_veg.select('NDVI')).rename('deltaNDVI').clip(dalyNT)


//visualise the change in 2016
Map.addLayer(c16, {},'deltaNDVI_2016')

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


//analysis to determine land clearing and growth
//first, put the images together as a collection

//collection of deltaNDVI images
var deltaNDVIcol = ee.ImageCollection.fromImages([c15,c16,c17,c18,c19])

//average the images in the collection
var mean_deltaNDVIcol =ee.ImageCollection(deltaNDVIcol.mean())

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

var mean_stdev = mean_deltaNDVIcol.map(meanSD);

print( mean_stdev, 'statistics');

//based on the statistics define thresholds for clearing and regrowth 
var clearing = -0.00509-(1.5*1.45876) // = -2.1932
var regrowth = -0.00509+(1.5*1.45876)  // = 2.18305
print(clearing, regrowth)

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


//mapping clearing and growth
var palette = ['yellow', 'red', 'green']; //white = no change; red = clearing, green = regrowth

var classes = c15.expression(

    "(b(0) > 2.1831) ? 2" + //Regrowth

      ": (b(0) < -2.1932) ? 1" + // LAND CLEARING

        ": 0" //NO CHANGE

);

print(classes, '3-classes')

Map.addLayer(classes.clip(dalyNT),

             {min: 0, max: 2, palette: palette},

             'Clearing,Regrowth,NoChange2016');


//size of potential land cleared in 2016 (in hectares)
var select_landClearing =  classes.select('constant').eq(1)
var area_landClearing_ha =  select_landClearing.multiply(ee.Image.pixelArea()).divide(1e4);
var total_area_cleared = area_landClearing_ha.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: dalyNT.geometry(),
  scale: 30,
  maxPixels: 1e12
});
print(total_area_cleared, 'Potential Total Area Cleared, 2016')

//size of potential regrowth in 2016 (in hectares)
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




# Assignment

Modify the scripts to characterise the spatial extent of potential land clearing and regrowth in the Daly River Catchment from 2019 to 2023.
Produce a report of 1000 words answering the following questions: <br>

1, How did you detect land clearing and regrowth, include justification of the methods used <br>
2, Produce maps for the inter-annual clearing and regrowth. Only include maps that show significant or visible clearing and regrowth <br>
3, Produce a table showing inter-annual clearing and regrowth  <br>
4, Interpret your maps and tables <br>
5, Critically evaluate the task, include what you have learned, the challenges encountered (solved or pending), and how the results can be improved


**The End**
