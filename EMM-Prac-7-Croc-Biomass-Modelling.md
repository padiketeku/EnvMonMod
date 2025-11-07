# Acknowledgements


Google Earth Engine Developers

Google Earth Engine Team

UN-SPIDER @ [website](https://un-spider.org/advisory-support/recommended-practices/recommended-practice-google-earth-engine-flood-mapping/step-by-step)
<br> The scripts were originally written by the UN-SPIDER and were adapted for this project.

Tim Palmer (the methodology, including sharing GEE code)

Cameron Baker (supplied the crocodile data)



# Introduction

The Northern Territory is widely known for the crocodiles in her waterbodies. Until 1971, the population of estuarine crocodiles in the Northern Territory was in decline at an alarming rate owing to overexploitation and human encroachment on crocodile habitats (Webb et al., 1984; Letnic & Connors, 2006). However, in recent times the population of crocodiles has been increasing. Many drivers, such as a hunting ban in 1971 (Fukuda et al., 2008) and tourism ( (Saalfeld et al., 2016), have been flagged. Floodplains provide a habitat for crocodiles to grow (Adame et al., 2018) and reproduce (Fukuda et al., 2008; Fukuda & Cuff, 2013). Changes in the size of floodplains may drive the productivity of estuarine crocodiles, this practical aims to investigate this.




# Learning Outcomes

- Import external data into Earth Engine

- Collect Sentinel-1 data

- Compute slope from a DEM

- Mask permanent water bodies

- Analyse Sentinel-1 data

- Determine inundation size

- Determine inundation duration

- Perform regression analysis in MS Excel




# Task

You are given a simulated crocodile biomass data for the Adelaide River in the Northern Territory. The data spans 2017-2023. Given the issue of cloud cover during wet seasons, you are asked to:

1, use Sentinel-1 data to estimate floodplain size 

2, investigate the linear relationship between floodplain size and crocodile biomass


## Workflow

The workflow below is for August 2017. You may have to modify the scripts to produce estimates for the other months. For the purposes of the study objective a seasonal calendar was used. So, a year starts from August and ends July the following year.


Non-Remote Sensing data for the task can be downloaded from this [site](https://zenodo.org/records/13910706). Download the "Adelaide_river_shapefile.zip" for this practical.


### Import and load shapefiles into Code Editor 

Manually import all the shapefiles from your desktop to Assets. Once you have the shapefiles in Assets, programmatically load them into the Code Editor. Loading the shapefile for the Adelaide River the code below can be used.


```JavaScript

var aoi = ee.FeatureCollection('projects/ee-niiazucrabbe/assets/Adelaide_River_Floodplain') // your path would be different to this

//display area of interest
Map.setCenter(131.27, -12.48)
Map.addLayer(aoi, {}, 'AOI')
```


![image](https://github.com/user-attachments/assets/2f7b4949-5511-490e-88f5-e0fb112c80a5)





The figure above shows the feature collection. The collection is made up of many features, which are not connected. The gaps mean that you cannot retrieve pixels for the entire region of interest using the feature collection. To get around this problem, you must get the geometry of the feature collection



### Retrieve the geometry of a feature collection


```JavaScript
var aoi2 = aoi.geometry().convexHull() //the convexHull method is applied for a tight clip to the extent of the feature collections
Map.addLayer(aoi2, {}, 'AOI2')

```

The result may look like the figure below.


![image](https://github.com/user-attachments/assets/d561e7b9-b868-4c9d-b107-dde6db7e09c4)






### Collect the Sentinel-1 imagery

The Sentinel-1 system does not produce optimal imagery. It is a radar system which functions by employing microwave energy, and penetrates through cloud cover. Thus, the Sentinel-1 data is most useful in wet seasons when the optical sensors become less useful. The Sentinel-1 has two bands: VV and VH. The VH is more suited to monitoring heterogenous environments. Also, the Sentinel-1 operates two passes, descending and ascending. Not every study area has data for both passes, but if your study site has data for both passes you must select one and keep to it if you aim for time series analysis.  Further reading on Sentinel-1 is [here](https://sentiwiki.copernicus.eu/web/s1-mission)


Now, let's collect the Sentinel-1 data for the area of interest.


```JavaScript

var collection= ee.ImageCollection('COPERNICUS/S1_GRD')
  .filter(ee.Filter.eq('instrumentMode','IW'))
  .filter(ee.Filter.eq('orbitProperties_pass',"DESCENDING")) //feel free to explore "ASCENDING" collections, too
  .filter(ee.Filter.eq('resolution_meters',10))
  .filterBounds(aoi2)
  .select("VH"); // more suited for flood monitoring

```

Next, trim the collection to pre-flood and post-flood dates. In this case, July 2017 is selected as the baseline date. It is assumed that the river systems are at their lowest levels at this date. Monthly Sentinel-1 data would be collected to determine inundation. 

The code below describes flooding in August 2017.

```JavaScript

//baseline date
var before_collection = collection.filterDate('2017-07-01', '2017-08-01');

//first month after the baseline date
var after_collection = collection.filterDate('2017-08-01', '2017-09-01');

``` 


Further trimming of the data. Given the study area spans multiple Sentinel-1 image scenes, the collection must be mosaicked and clipped to the study area.

```JavaScript
var before = before_collection.mosaic().clip(aoi2);
var after = after_collection.mosaic().clip(aoi2);
```


At this point, it is most ideal to visualise the data. The Sentinel-1 data, like all radar imagery, is not multispectral. The polarisation bands are displayed as a greyscale image. The code below visualises the baseline and post-baseline images.


```JavaScript
Map.addLayer(before, {min:-25, max:-10}, "S1 Baseline")
Map.addLayer(before, {min:-25, max:-10}, "S1 Post-Baseline")
```


![image](https://github.com/user-attachments/assets/846950b6-8a12-4518-86bb-518ec0011aa9) ![image](https://github.com/user-attachments/assets/605160d3-779c-4f80-bd48-b12ef46d7461)

  



The left is the baseline image (July 2017) while the right is a post-baseline date (August 2017).


Take the **Inspector** tool to explore the pixel values. What is the difference between dark and light pixels? You are right, the bright pixels have larger values showing higher reflectivity of the microwave energy. You may also observe that clearer water bodies are the darkest pixels with very low reflectivity. Why? Yes, because water absorbs radiation, especially long wavelength radiation.



### Speckle filtering


An inherent issue with radar remote sensing is speckles in the image. In the figure above, you can see speckles ("salt and pepper" grainy texture) almost everywhere in the image. The speckle can lower the quality of image, so it is ideal to minimise the effects of speckles by smoothing the image.The smoothing algorithm averages out the pixels, using a moving window sometimes referred to as a kernel. The kernel size is usually an odd number with 3 the minimum. Further reading on moving windows and applications in landscape ecology is [here](https://doi.org/10.1016/j.jag.2015.09.010). Through the filtering algorithm, spatial details, including speckles are lost. There are many filtering algorithms, simple and complex, available for use: [see this paper](https://www.mdpi.com/2072-4292/13/10/1954). We would use the Boxcar filter as it is simple to implement. The code below smoothes the Sentinel-1 image to minimise speckle noise. 


```JavaScript

//Boxcar filtering
var boxcar = function(image, KERNEL_SIZE) {
    var bandNames = image.bandNames().remove('angle');
    // Define a boxcar kernel
    var kernel = ee.Kernel.square({radius: (KERNEL_SIZE/2), units: 'pixels', normalize: true});
    // Apply boxcar
    var output = image.select(bandNames).convolve(kernel).rename(bandNames);
  return image.addBands(output, null, true)
};
```

```JavaScript

//apply the Boxcar filtering method
var before_filtered = boxcar(before, 3) //the kernel is 3
var after_filtered = boxcar(after, 3)

//visualise the image after applying the Boxcar filter
Map.addLayer(after_filtered, {min:-25, max:-10},' after_BoxCarApplied ')

```



![image](https://github.com/user-attachments/assets/1dfaeb87-103b-465b-a132-147eac5c341b)  ![image](https://github.com/user-attachments/assets/1a21809d-8e98-44f3-94de-9d3e5a153f3f)




Left image is before spatial filter is applied and Right image is post-filtering. You may observe that the image is blurry after the spatial filtering.




### Image differencing

The pixel values of the Sentinel-1 image are negative. This is because the original values were log transformed on the fly. The transformation is performed for visualisation purposes as the original pixel values can be very low, making it difficult to visually discern between pixels. To deal with the negative pixel values, the image differencing method is achieved by dividing the after-flood image by the baseline data.

```JavaScript
var difference = after_filtered.divide(before_filtered);
```


### Mask change image

To mask the change image, a threshold value is used. This value is based on trial and error method. It is subjective, so you can change this to a value that makes more sense to a study area.

```JavaScript

//threshold
var threshold = 1.25;

//mask the change image using the threshold
var difference_binary = difference.gt(threshold);

```

### Refine change detection image

Pixels have been flagged as change detection (flooded). However, the accuracy can be minimised if perennial water pixels are not removed. A global surface water data ([JRC Global Surface Water Mapping Layers](https://developers.google.com/earth-engine/datasets/catalog/JRC_GSW1_4_GlobalSurfaceWater#description)) would be used. This is a Landsat product that includes bands explaining number of months water is present and the frequency with which was present.  Read more about this data [here](https://developers.google.com/earth-engine/datasets/catalog/JRC_GSW1_4_GlobalSurfaceWater#description)  
To get this data, type "JRC Global Surface Water" into the search bar. Click the name and a window that provides description on the data may pop up. Copy the **Collection Snippet** to programmatically load this data into the Code Editor.


Get the data into the Code Editor, programmatically.

```JavaScript
var surfWater = ee.Image("JRC/GSW1_4/GlobalSurfaceWater")
```

The JRC Global Surface Water Mapping Layers is an image colllection, showing yearly data, and has three bands. The "seasonality" is the most relevant for this project. This band shows the number of months water is present; the values range between 0 and 12.

Select the seasonality band to determine permanent water surface. We would define permament water surface to be pixels that were observed to be covered by water for at least 10 months of the year.

Next, mask perennial water pixels. The code below selects perennial water pixels and excludes them from the analysis.

```JavaScript
//select the seasonality band to determine permanent water surfaces
var seasonalWater = surfWater.select("seasonality")
```

Take the seasonality band and create a mask layer based on the definition for permanent water surface above. This may result in having potentially permanent water surfaces only.


```JavaScript
//mask seasonal surface water 
var seasonalWaterMask = seasonalWater.gte(10)
```


Apply the mask layer to determine the permanent water surface areas.

```JavaScript
//update the seasonal water layer
var permanentWater = seasonalWater.updateMask(seasonalWaterMask)
print(permanentWater, 'permanent')
```

Clip the permanent water surface layer to the study area and visualise this.

```JavaScript

var permanentWater = permanentWater.clip(aoi2)
Map.addLayer(permanentWater,{min:10, max:12, palette:['red',  'yellow', 'blue']},'permanent water' ) 
```


<img width="543" height="668" alt="image" src="https://github.com/user-attachments/assets/f9fcdb48-4b95-4b41-9844-5b32d34c9e13" />




The perennial water bodies are identifed in red, yellow and blue colours.


Although the perennial water pixels have been identified, it is worth recalling these pixels are not required to be part of the analysis. Thus, we would assign zero to these pixel to mask their effect on the analysis. The perennial water pixels in the change image would be identified and removed. The code below does this.  

```JavaScript
var flooded_mask = difference_binary.where(permanentWater,0);
var flooded = flooded_mask.updateMask(flooded_mask);

//visualise the result
Map.addLayer(flooded, {}, 'PermanentWaterMasked')
```


The change image with perennial water pixels masked is shown below. Note, you must turn on the polygon for the study area and Google satellite imagery for a similar figure.



<img width="733" height="767" alt="image" src="https://github.com/user-attachments/assets/7780694b-a912-4162-832d-6d942ca59f4b" />






The potentially flooded pixels are the white pixels. You may also observe that some of the pixels are isolated. A contiguous flooded areas are more representative of reality. Thus, we would conduct a connectivity analysis to clump isolated pixels together. The code below connects the isolated pixels.


```JavaScript
var connections = flooded.connectedPixelCount();    
var flooded = flooded.updateMask(connections.gte(8));
```



## Select lowlying areas


Floodplains are lowlying lands so it is ideal to trim your data further to remove elevated areas from the analysis. To analyse flat land, only pixels with a maximum slope of 5% would be used.
A digital elevation model is required to describe the slope of the terrain. The Hydrologically Enforced Digital Elevation Model (DEM-H), which is provided by the Geoscience Australia, in EE catalogue would be used. You can read more about this DEM data [here](https://developers.google.com/earth-engine/datasets/catalog/AU_GA_DEM_1SEC_v10_DEM-H#description). Replicate the steps used to load up the DEA Water Observations Statistics to get the DEM into Code Editor.

```JavaScript

//load the DEM data
var DEM = ee.Image("AU/GA/DEM_1SEC/v10/DEM-H")

//characterise the terrain
var terrain = ee.Algorithms.Terrain(DEM); //produces slope, aspect and hillshade of the landscape

//select slope only
var slope = terrain.select('slope');

//mask pixels with slope larger than 5%
var flooded = flooded.updateMask(slope.lte(5));
```


Next, let's visualise pixels identified as flooded in August 2017.


```JavaScript
// Flooded areas
Map.addLayer(flooded,{palette:"0000FF"},'Flooded areas');
```

If you turn on the geometry for the study area and the baseline Google satellite imagery, your result may be as shown below. 




<img width="778" height="777" alt="image" src="https://github.com/user-attachments/assets/f2e228c3-b8a8-412c-9de3-b680c387337f" />





The blue pixels are the flooded areas.



### Spatial extent of floodplain


We know the spatial distribution of the flooded areas, however the size of the floodplain is not given. To do this we would use the following code.



```JavaScript

// create a raster layer containing the area information of each pixel 
var flood_pixelarea = flooded.select("VH").multiply(ee.Image.pixelArea());

// sum the areas of flooded pixels
var flood_stats = flood_pixelarea.reduceRegion({
  reducer: ee.Reducer.sum(),              
  geometry: aoi2,
  scale: 10, 
  maxPixels: 1e9
  });

// convert the flood extent to hectares 
var flood_area_ha = flood_stats
  .getNumber("VH")
  .divide(10000)
  .round();

print(flood_area_ha, 'extent in ha')
```

The size of floodplain in August 2017 is printed to the Console. What is the size? Correct, it is 7818 ha.



# Do It Yourself


The table shows monthly floodplain size and crocodile biomass per km for the Daly River for 2017. 
Only the flood plain size for Aug is given.

|Time| Floodplain size (ha) | Croc biomass (kg)
|----|---------------|-------------|
|Aug 2017|10894|187|
|Sep 2017|          |     145      |
|Oct 2017|            |      211       |
|Nov 2017|               |    219        |
|Dec 2017|               |     219        |
|Jan 2018|              |      301      |
|Feb 2018|              |        573      |
|Mar 2018|               |        571     |
|Apr 2018|              |            501  |
|May 2018|              |              165|
|Jun 2018|              |             138 |
|Jul 2018|              |             133 |


Key Tasks


1, Complete the table, provide the floodplain size for the other months of 2017.


2, Plot a time series chart for the floodplain data


3, Display the spatial distribution of flooded areas for lowest and peak months


4, Produce a linear regression relationship between floodpain size and crocodile biomass


5, Discuss the methods you applied to achieve the results


6, Appraise your key results






# Conclusion


Sentinel-1 image was used to estimate inundated areas of the Adelaide River. The relationship between the floodplain size and crocodile biomass was investigated to test the hypothesis that there is a positive linear relationship between the two (floodplain size and crocodile biomass). 


# Code



```JavaScript
//region of interest
var aoi =ee.FeatureCollection("projects/ee-racrabbe3/assets/Adelaide_River")

//display area of interest
Map.setCenter(131.27, -12.48)
Map.addLayer(aoi, {}, 'AOI')

//retrieve a solid geometry of the study area
var aoi2 = aoi.geometry().convexHull() //the convexHull method is applied for a tight clip to the extent of the feature collections
Map.addLayer(aoi2, {}, 'AOI2')


var collection= ee.ImageCollection('COPERNICUS/S1_GRD')
  .filter(ee.Filter.eq('instrumentMode','IW'))
  .filter(ee.Filter.eq('orbitProperties_pass',"DESCENDING")) //feel free to explore "ASCENDING" collections, too
  .filter(ee.Filter.eq('resolution_meters',10))
  .filterBounds(aoi2)
  .select("VH"); // more suited for flood monitoring

print(collection,"collection")

//baseline date
var before_collection = collection.filterDate('2018-08-01', '2018-09-01');
print(before_collection, "before_collection")


//first month after the baseline date
var after_collection = collection.filterDate('2018-09-01', '2018-10-01');
print(after_collection, "after_collection")

//mosaic
var before = before_collection.mosaic().clip(aoi2);
var after = after_collection.mosaic().clip(aoi2);

//visualisation
Map.addLayer(before, {min:-25, max:-10}, "S1 Baseline")
Map.addLayer(before, {min:-25, max:-10}, "S1 Post-Baseline")


//Boxcar filtering
var boxcar = function(image, KERNEL_SIZE) {
    var bandNames = image.bandNames().remove('angle');
    // Define a boxcar kernel
    var kernel = ee.Kernel.square({radius: (KERNEL_SIZE/2), units: 'pixels', normalize: true});
    // Apply boxcar
    var output = image.select(bandNames).convolve(kernel).rename(bandNames);
  return image.addBands(output, null, true)
};



//apply the Boxcar filtering method
var before_filtered = boxcar(before, 3) //the kernel is 3
var after_filtered = boxcar(after, 3)

//visualise the image after applying the Boxcar filter
Map.addLayer(before_filtered, {min:-25, max:-10},' before_BoxCarApplied ')
Map.addLayer(after_filtered, {min:-25, max:-10},' after_BoxCarApplied ')

//image differencing
var difference = after_filtered.divide(before_filtered);


//threshold
var threshold = 1.25;

//mask the change image using the threshold
var difference_binary = difference.gt(threshold);

//mask perennial water surfaces
//var deaWater = ee.ImageCollection("projects/geoscience-aus-cat/assets/ga_ls_wo_fq_cyear_3")
var surfWater = ee.Image("JRC/GSW1_4/GlobalSurfaceWater")
print (surfWater, "surfaceWater")

//select the seasonality band to determine permanent water surfaces
var seasonalWater = surfWater.select("seasonality")

//mask seasonal surface water 
var seasonalWaterMask = seasonalWater.gte(10)

//update the seasonal water layer
var permanentWater = seasonalWater.updateMask(seasonalWaterMask)
print(permanentWater, 'permanent')

//clip to ROI
var permanentWater = permanentWater.clip(aoi2)

//visualise the image
Map.addLayer(permanentWater,{min:10, max:12, palette:['red',  'yellow', 'blue']},'permanent water' ) 

//mask permanent water surfaces
var flooded_mask = difference_binary.where(permanentWater,0);
var flooded = flooded_mask.updateMask(flooded_mask);

//visualise the result
Map.addLayer(flooded, {}, 'PermanentWaterMasked')

//conected isolated pixels to have a contiguous floodplain
var connections = flooded.connectedPixelCount();    
var flooded = flooded.updateMask(connections.gte(8));

//visualise the result
Map.addLayer(flooded, {}, 'Connected Flooded Pixels')


//load the DEM data
var DEM = ee.Image("AU/GA/DEM_1SEC/v10/DEM-H")
print(DEM,"DEM")
//characterise the terrain
var terrain = ee.Algorithms.Terrain(DEM); 

//select slope only
var slope = terrain.select('slope');

//mask pixels with slope larger than 5%
var flooded = flooded.updateMask(slope.lte(5));

// Flooded areas
Map.addLayer(flooded,{palette:"0000FF"},'Flooded areas');


// create a raster layer containing the area information of each pixel 
var flood_pixelarea = flooded.select("VH").multiply(ee.Image.pixelArea());

// sum the areas of flooded pixels
var flood_stats = flood_pixelarea.reduceRegion({
  reducer: ee.Reducer.sum(),              
  geometry: aoi2,
  scale: 10, 
  maxPixels: 1e9
  });

// convert the flood extent to hectares 
var flood_area_ha = flood_stats
  .getNumber("VH")
  .divide(10000)
  .round();

print(flood_area_ha, 'extent in ha')
```


# Assignment


You are given a simulated crocodile biomass data for the Adelaide River in the Northern Territory. The data spans 2017-2023. Given the issue of cloud cover during wet seasons, you are asked to use Sentinel-1 data to estimate floodplain size and investigate the linear relationship between floodplain size and crocodile biomass


**Task**

Complete the image processing and spatiotemporal analysis required to address the task, and construct a scientific article to communicate your findings. Your scientific report should be prepared as a submission-ready document to the scientific journal and should include the following sections. You can use the formatting style of the [MDPI Remote Sensing](https://www.mdpi.com/journal/remotesensing/instructions) journal as a guide – see their Word or LaTeX [template](https://www.mdpi.com/journal/remotesensing/instructions).

- Abstract
- Introduction; include a brief literature review on the problem at hand, the aims and objectives
- Methods; include descriptions of datasets, processing steps and analysis applied
- Results; include appropriate maps, tables and charts to illustrate your findings
- Discussion; discuss your findings (linking back to the objectives) including any limitations of the study and suggestions for improvement
- Conclusion; succinct summary of the main findings
- References



**The End**







