# Acknowledgements


Google Earth Engine Developers

Google Earth Engine Team

UN-SPIDER @ [website](https://un-spider.org/advisory-support/recommended-practices/recommended-practice-google-earth-engine-flood-mapping/step-by-step)
<br> The scripts were originally written by the UN-SPIDER and were adapted for this project.

Tim Palmer (the methodology, including sharing GEE code)

Cameron Baker (supplied the crocodile data)



# Introduction

The Northern Territory is widely known for the crocodiles in her waterbodies. Until 1971, the population of estuarine crocodiles in the Northern Territory was in decline at an alarming rate owing to overexploitation and human encroachment on crocodile habitats (Webb et al., 1984; Letnic & Connors, 2006). However, in recent times the population of crocodiles has been increasing. Many drivers, such as  a hunting ban in 1971 (Fukuda et al., 2008) and tourism ( (Saalfeld et al., 2016), have been flagged. Floodplains provide a habitat for crocodiles to grow (Adame et al., 2018) and reproduce (Fukuda et al., 2008; Fukuda & Cuff, 2013). Changes in the size of floodplains and inundation duration may drive the productivity of estuarine crocodiles, this practical aims to investigate this.




# Learning Outcomes

- Import external data into Earth Engine

- Collect Sentinel-1 data

- Compute slope from a DEM

- Mask permanent water bodies

- Analyse Sentinel-1 data

- Determine inundation size

- Determine inundation duration

- Perform regression modelling




# Task

You are given a simulated crocodile biomass data for the following rivers in the Northern Territory.

- Mary River
- Adelaide River
- Daly River
- Liverpool
- Tomkinson
- Blyth
- Cadell
- Glyde

The data was collected from 2014 to 2023 and includes crocodile abundance and biomass per km. Given the issue of cloud cover during wet seasons, you are asked to:

1, use Sentinel-1 data to estimate floodplain size and inundation duration

2, use floodplain size and inundation duration to model crocodile biomass


## Workflow

The workflow below is for the Daly River only. You may have to modify the scripts to produce estimates for the other river systems.


### Import and load shapefiles into Code Editor 

Manually import all the shapefiles from your desktop to Assets. Once you have the shapefiles in Assets, programmatically load them into the Code Editor. Loading the shapefile for the Daly River would as shown below.


```JavaScript

var aoi = ee.FeatureCollection('projects/ee-niiazucrabbe/assets/Daly_River_Floodplain')
Map.addLayer(aoi, {}, 'AOI')
```


![image](https://github.com/user-attachments/assets/961eee2b-44f6-4d66-9dfe-0e40e2c0895f)




The figure above shows the feature collection. The collection is made up of many features, which are not connected. The gaps mean that you cannot retrieve pixels for the entire region of interest using the feature collection. To get around this problem, you must get the geometry of the feature collection



### Retrieve the geometry of a feature collection


```JavaScript
var aoi2 = aoi.geometry().convexHull() //the convexHull method is applied for a tight clip to the extent of the feature collections
Map.addLayer(aoi2, {}, 'AOI2')

```

The result may look like the figure below.


![image](https://github.com/user-attachments/assets/684074a9-21c9-4deb-a17a-cabf739aec4a)





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


![image](https://github.com/user-attachments/assets/2373aac2-fe32-4885-a8a9-0ecd70d2b121)  ![image](https://github.com/user-attachments/assets/ca114c5d-00bf-4e20-9116-9c163ed93a38)



The left is the baseline image (July 2017) while the right is a post-baseline date (August 2017).


Take the **Inspector** tool to explore the pixel values. What is the difference between dark and light pixels? You are right, the bright pixels have larger values showing higher reflectivity of the microwave energy. You may also observe that clearer water bodies are the darkest pixels with very low reflectivity. Why? Yes, because water absorbs radiation, especially long wavelength radiation.



### Speckle filtering





![image](https://github.com/user-attachments/assets/b75fba61-6b72-46b8-b139-2b564aa61886)




An inherent issue with radar remote sensing is speckles in the image. In the figure above, you can see speckles ("salt and pepper" grainy texture) almost everywhere in the image. The speckle can lower the quality of image, so it is ideal to minimise the effects of speckles by smoothing the image.
The smoothing algorithm averages out the pixels, using a moving window sometimes referred to as a kernel. The kernel shape can be a square or circular. Further reading on moving windows and applications in landscape ecology is [here](https://doi.org/10.1016/j.jag.2015.09.010). Through the filtering algorithm, spatial details, including speckles are lost. The code below smoothes the Sentinel-1 image to minimise speckle noise. 


```JavaScript

var smoothing_radius = 50;
var before_filtered = before.focal_mean(smoothing_radius, 'circle', 'meters');
var after_filtered = after.focal_mean(smoothing_radius, 'circle', 'meters');

//visualise the effect of the average smooting algorithm
Map.addLayer(after_filtered, {min:-25, max:-10}, 'Post-Speckle Filtering') 

```


![image](https://github.com/user-attachments/assets/c6bc4001-1929-4aff-9e6b-1c088b901a26)




You may zoom in to pixels to evaluate the effect of the spatial filtering. You may still speckles in the image, but the effect is minimised.




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

Pixels have been flagged as change detection (flooded). However, the accuracy can be minimised if perennial water pixels are not removed. The Digital Earth Australia's Water Observation Statistics data would be used. This is a Landsat product that classifies a pixel as 'wet', 'dry' or 'invalid' and provides the basic statistics about the classes. Read more about this data [here](https://knowledge.dea.ga.gov.au/data/product/dea-water-observations-statistics-landsat/)  and also in [EE](https://developers.google.com/earth-engine/datasets/catalog/projects_geoscience-aus-cat_assets_ga_ls_wo_fq_cyear_3)

To get this data, type "Australia" into the search bar and under **RASTERS** click **more >>**. Scroll through the results to find "DEA Water Observations Statistics 3.1.6". Click the name and a window that provides description on the data may pop up. Copy the **Collection Snippet** to programmatically load this data into the Code Editor.


Get the data into the Code Editor, programmatically.

```JavaScript
var deaWater = ee.ImageCollection("projects/geoscience-aus-cat/assets/ga_ls_wo_fq_cyear_3")
```

The DEA Water Observations Statistics is an image colllection, showing yearly data, and has three bands. The "frequency" is the most relevant for this project. This band shows what percentage of clear observations were detected as wet; the values range between 0 and 1.

Filter the data to last 10 years and the study area

```JavaScript
var deaWater = deaWater.filterDate('2014-01-01','2024-01-01').filterBounds(aoi2).select(['frequency'])
```

Next, mask perennial water pixels. The code below selects perennial water pixels and excludes them from the analysis.

```JavaScript
var permanentWater=deaWater.map(function permWater (img){
   var mask = img.gte(0.60) // you may vary this
   var img2 = img.updateMask(mask)
   return img2
   
 })
```



Mosaic the collection and clip to area of interest

```JavaScript

var permanentWater = permanentWater.mosaic().clip(aoi2)
Map.addLayer(permanentWater,{min:0.6, max:1, palette:['red',  'yellow', 'blue']},'permanent water' ) 
```


![image](https://github.com/user-attachments/assets/8888340b-e2bf-47bc-9fe2-c735d2f992da)



The perennial water bodies are identifed in red, yellow and blue colours.


Although the perennial water pixels have been identified, it is worth recalling these pixels are not required to be part of the analysis. Thus, we would assign zero to these pixel to mask their effect on the analysis. The perennial water pixels in the change image would be identified and removed. The code below does this.  

```JavaScript
var flooded_mask = difference_binary.where(permanentWater,0);
var flooded = flooded_mask.updateMask(flooded_mask);

//visualise the result
Map.addLayer(flooded, {}, 'PermanentWaterMasked')
```


The change image with perennial water pixels masked is shown below. Note, you must turn on the polygon for the study area and Google satellite imagery for a similar figure.



![image](https://github.com/user-attachments/assets/bf979c22-b434-4738-856f-46d3fe282ec6)




The potentially flooded pixels are the white pixels. You may also observe that some of the pixels are isolated. A contiguous flooded areas are more representative of reality. Thus, we would conduct a connectivity analysis to clump isolated pixels together as much as possible. The code below connects the isolated pixels.


```JavaScript
var connections = flooded.connectedPixelCount();    
var flooded = flooded.updateMask(connections.gte(8));

//visualise the result
Map.addLayer(flooded, {}, 'Connected Flooded Pixels')
```


![image](https://github.com/user-attachments/assets/84f6566a-426c-497a-8cf6-0caa6199c231)




Compared to the previous image, do you observe any effects of the connectivity analysis?




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




![image](https://github.com/user-attachments/assets/b0633917-a40f-4510-84bc-ee181684d9fb)




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

The size of floodplain in August 2017 is printed to the Console. What is the size? Correct, it is 10397 ha.



# Assignment





# Conclusion





# Code



**The End**







