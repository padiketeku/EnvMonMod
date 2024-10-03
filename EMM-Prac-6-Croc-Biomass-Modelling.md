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

The Sentinel-1 system does not produce optimal imagery. It is a radar system which functions by employing microwave energy, and penetrate through cloud cover. Thus, the Sentinel-1 data is most useful in wet seasons when the optical sensors become ineffective. The Sentinel-1 has two bands: VV and VH. The VH is more suited to monitoring heterogenous environments. Also, the Sentinel-1 operated two passes, descending and ascending. Not every study area has data for both passes, but if your study site has data for both passes you have to select one and keep to it if you aim to compare results.  Further reading on Sentinel-1 is [here](https://sentiwiki.copernicus.eu/web/s1-mission)


Now, let's collect the Sentinel-1 data for the area of interest.


```JavaScript
var collection= ee.ImageCollection('COPERNICUS/S1_GRD')
  .filter(ee.Filter.eq('instrumentMode','IW'))
  .filter(ee.Filter.eq('orbitProperties_pass',"DESCENDING")) //feel free to explore "ASCENDING" collections, too
  .filter(ee.Filter.eq('resolution_meters',10))
  .filterBounds(aoi2)
  .select("VH"); // more suited for flood monitoring

```

Next, filter to collection to pre-flood and post-flood dates. In this case, July 2017 is selected as the baseline date. It is assumed that the river systems are at their lowest levels at this date. Monthly Sentinel-1 data would be collected post-baseline data to determine inundation. 

The code below describes flooding in August 2017.

```JavaScript

//baseline date
var before_collection = collection.filterDate('2017-07-01', '2017-08-01');

//first month after the baseline date
var after_collection = collection.filterDate('2017-08-01', '2017-09-01');

``` 


Given the study area spans multiple Sentinel-1 image scenes, the collection must be mosiacked and clipped to the study area.

```JavaScript
var before = before_collection.mosaic().clip(aoi2);
var after = after_collection.mosaic().clip(aoi2);
```


### Speckle filtering


An inherent issue with radar remote sensing is speckles in the image. The speckle can lower the quality of image, so it is ideal to minimise the effects of speckles by smoothing the image.
The smoothing algorithm averages out the pixels so spatial details, inclduing speckles are lost. The code below smoothes the Sentinel-1 image to minimise speckle noise. 

```JavaScript
var smoothing_radius = 50;
var before_filtered = before.focal_mean(smoothing_radius, 'circle', 'meters');
var after_filtered = after.focal_mean(smoothing_radius, 'circle', 'meters');

```


### Image differencing

The pixel values of the Sentinel-1 image are negative. This is because the original values were log transformed on the fly. The transformation is performed for visualisation purposes as the original pixel values can be very low, making it difficult to visually contrast between pixels. To deal with the negative pixel values, the image differencing method is achieved by dividing the after-image by pre-image.

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

Pixels have been flagged as change detection (flooded). However, the accuracy can be minimised if perennial water pixels are not removed. The Digital Earth Australia's Water Observation Statistics data would be used. This is a Landsat product that classifies a pixel as 'wet', 'dry' or 'invalid' and provides the basic statistics about the classes. Read more about this data [here](https://knowledge.dea.ga.gov.au/data/product/dea-water-observations-statistics-landsat/)  and via [EE](https://developers.google.com/earth-engine/datasets/catalog/projects_geoscience-aus-cat_assets_ga_ls_wo_fq_cyear_3)

The DEA Water Observations Statistics is an image colllection, showing yearly data, and has three bands. The "frequency" is the most relevant for this project. This band shows what percentage of clear observations were detected as wet; the values range between 0 and 1.




# Assignment





# Conclusion





# Code



**The End**







