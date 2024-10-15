# Acknowledgements

Google Earth Engine Developers

Google Earth Engine Team

Sandra MacFadyen @ https://www0.sun.ac.za/biomath




# Introduction

Fire can start naturally or through human activities; the intensity can be high or low depending on the moisture condition and size of the fuel load at the time of the outbreak. Fire alters the landscape pattern and can be attributable to variability in ecosystems. In savanna ecosystems, fire is common and a key driver of ecological changes. In tropical Australia, the savanna ecosystem experiences fires, usually, in the dry season. Early dry season fires are normally prescribed burning and are not hot as the fuel moisture is just beginning to dip. However, late dry season fires are hot and can significantly change the tree and grass ratio. Fire regime of an ecosystem can be described as the frequency, intensity, spatial extent, duration, and seasonality of the wildfire  (Bradstock, 2010). In savanna Australia, fire regime drives vegetation composition in that fire insensitive species survive and dominate frequently burnt areas while less burnt areas may be a suitable habitat for fire sensitive species (Smit et al. 2013). Monitoring fire regime of Australia savanna is vitally important for biodiversity conservation assessment. However, direct measurement of the fire regime can be challenging for many resons, including danger to human life. The aim of this project is describe the fire regime of the Daly River Catchment in Australia using satellite imagery. 



# Learning Outcomes

- Access MODIS fire scar data
  
- Assess the fire frequency of an ecosystem

- Produce spatial layers and charts explaining fire frequency


# Task

You have been employed by the Northern Territory Government as *Senior Rangeland Monitoring Officer – Remote Sensing* and one of your KPIs is to produce and share information on the fire frequency of the Daly River Catchment (DRC) from 2001 to 2020. 
Because of consistency with existing data, you were tasked to use MODIS FireCC151, a data product developed as part of the European Space Agency (ESA) Climate Change Initiative (CCI) Programme. For a thorough analysis, you were asked to explore every image collected over the region of interest. 

# Workflow

//Get study area- Daly River catchment of the Northern Territory, Australia

var dalyNT = ee.FeatureCollection("projects/ee-niiazucrabbe/assets/DalyCatchment") //modify the path to your own GEE asset 



## MODIS Fire Data

- **Search for data**


Type into the search bar "MODIS fire" as shown below.

![image](https://github.com/user-attachments/assets/8599f15c-d70c-4c2a-995d-32a3373f6d93)

You may see a list of data under "RASTERS" and "TABLES", but click the search icon highlighted in red in the figure below.

![image](https://github.com/user-attachments/assets/43baece9-7b5e-4954-92c0-9461f260ce81)


The search result is as shown below, the data of interest highlighted in red polgyon.

![image](https://github.com/user-attachments/assets/d0b6dfaf-0016-4b70-a30b-2660e00680ac)


Once you click on the data filename : **FireCCI51: MODIS Fire_cci Burned Area Pixel Product, Version 5.1** , a figure like the one shown below may pop up.

![image](https://github.com/user-attachments/assets/40068c6a-f739-48fa-94a8-c83fe30136e9)


The "DESCRIPTION" gives users insight into the data. This is a monthly global fire data and the spatial resolution is approximately 250m. The dataset is available from 2001.
When you click the "BANDS" tab, you may notice that the collection has four bands, including BurnDate, ConfidenceLevel,  LandCover and ObservedFlag. See the band description, and take note of the Min and Max values for BurnDate and ConfidenceLevel as these are the two bands relevant for this project.


- **Import dataset**

It is possible to use the **IMPORT** to get the dataset into Code Editor. However, we would not use this approach. Rather, copy the **Collection Snippet** and then create a variable for the image collection. Your snippet should be as shown below.

```JavaScript
var fireData = ee.ImageCollection("ESA/CCI/FireCCI/5_1")
```

Let's be a bit greedy here in exploring all the data, so let's make a list for all years.


```JavaScript
var years = ee.List.sequence(2001, 2024);
```


- **Resize dataset**


Although we would explore all fire years in this data, only the **BurnDate** and **ConfidenceLevel** bands are useful for the task. Thus, we would select these bands. 

```JavaScript
var fireData = fireData

// select the relevant bands
.select(['BurnDate','ConfidenceLevel'])

//print result to the Console
print (fireData, 'fireData')
```

The collection has 240 images (as of 2024). Expand "features" to see the list of images (figure below). Explore the image properties and take note of "system: index:" for the product date. 




![image](https://github.com/user-attachments/assets/ad05ed08-696a-4a02-8180-5f982a989566)




In the next step, we would add two more items to the properties- 'year'and 'yrmnth'- for the purposes of producing monthly distribution of fire in the study area.


We would want to further trim the data to the study area; given the dataset is an image collection, every image in the collection must be trimmed to the study. A user-defined function would be used to do this. In this function, the additional image properties would be created.

```JavaScript
var fire = fireData.map(function(img) { 
      var date = ee.Date(img.get('system:time_start'));
      var year = date.get('year');
      var yrmnth = date.format('YYYY_MM');
      return img
              .clip(dalyNT) //trims image to study area
              .set('year', year) //sets a new property called 'year'
              .set('yrmnth', yrmnth); //sets a new property 'yrmnth'
    });  
```

Note that the function has been applied to the image collection , **fireData** , and this was achieved through the **.map** . Now, print the variable to see if the image properties have two additional items (year and yrmnth).

```JavaScript
print (fire, 'fire')
```

The properties of the first image in the collection is shown below. The new properties are highlighted using a red polgyon.


![image](https://github.com/user-attachments/assets/8b30f7da-db79-4718-9163-271c0dbcc216)



Optical imagery can be made less useful by cloud cover and thus, it is important to ensure 'bad' pixels (or data) is excluded from the analysis. Low quality data can skew results, so, for a robust study you must select the data with high ocnfidence level. We would filter the data again selecting fire pixels with confidence level no less than 95% (a statistical standard for ecological studies).


```JavaScript

var fireMask = fire.map(function(img) {
  var conf = img.select('ConfidenceLevel');
  var level = conf.gte(95);
  return img
      .updateMask(level)
      .select('BurnDate') //return only 'BurnDate' 
      .set('year', ee.Image(img).date().get('year'))
      .set('yrmnth', ee.Image(img).get('yrmnth'));
});
```


- **Data analysis**

This is the time to analyse the data to determine number of fires in a month, year, and the spatial distibution of the frequency. 

Count the number of fires in a year, the output is an image collection. 

```JavaScript

var fireCNT = ee.ImageCollection.fromImages(years.map(function(year) {
  return fireMask
    .filterMetadata('year', 'equals', year) // Filter image collection by year
    .select('BurnDate').reduce(ee.Reducer.countDistinct()) // Reduce image collection by counting distinct day of the year
    .set('year', year);
}));


```




Count the number of fires in a month, the output is an image collection. 

```JavaScript

var fireDOY = ee.ImageCollection.fromImages(years.map(function(year) {
  return fireMask
    .filterMetadata('year', 'equals', year) 
    .select('BurnDate').reduce(ee.Reducer.firstNonNull()) //returns the first of the non-null observation in BurnDate
    .set('year', year);
}));

//fire seasonality

var fireDOY = (fireMask.mode(), visDOY, 'Most frequently burnt DOY', true, 0.8);
```


- **Visualisation**



```JavaScript

// set map center to ensure the images would display to the study area

Map.centerObject(dalyNT, 10);

```

Fire frequency

Light colours are areas that burnt less frequently, dark colours are areas that burnt often

```JavaScript

var visCnt = {
    min:2, max:12, 
    palette:['eef5b7','99f74f','4ff7b0','4fc2f7','3940db',
            '7239db','db39db','db395c','7c1229']};

// Calculate overall fire frequencies "on-the-fly" and add to map

Map.addLayer(fireCNT, visCnt, 'Fire frequency', true, 0.8);

```


The fire frequency image may be like the one below:



![image](https://github.com/user-attachments/assets/2d1609bd-dfda-40ae-945a-167074043efc)






Fire seasonality (most frequently burnt day of the year)


Here, the mode (i.e., most frequuently occuring) function would be used.


```JavaScript

var visDOY = {
    min:1, max:366, 
    palette:['008000','00b050','92d050','c9ee12','ffd966','bf8f00',
    'bf8f00','ffd966','c9ee12','92d050','00b050','008000']}; // light colours represent early fires, dark colours are late fires

//visualise the result
Map.addLayer(fireMask.mode(), visDOY, 'Most frequently burnt DOY', true, 0.8);
```


![image](https://github.com/user-attachments/assets/a488415f-0c35-441c-9a96-c6fa55faa0f1)





Plot the results


In addition to the spatial distribution, we can prouce plots to support the observations.


1, Fire frequency- monthly step


```JavaScript

// Monthly fire frequencies per year for the whole area
 var opt_cntFireMonth = {
   title: 'Monthly fire frequencies: Daly River Catchment, 2001 to 2023',
   pointSize: 3,
   hAxis: {title: 'Year Month'},
   vAxis: {title: 'Number of fires'},
 };

// Plot day count of monthly fires (Line chart the number of days a fire occured from 2001 to 2023)
 var cntFireMonth_chart = ui.Chart.image.series({ 
   imageCollection: fireMask.select('BurnDate'), 
   xProperty: 'yrmnth',
   region: dalyNT,
   reducer: ee.Reducer.countDistinct(),
   scale: 250 
 }).setOptions(opt_cntFireMonth).setChartType('LineChart');
 print(cntFireMonth_chart, 'day count of monthly fires');
```


![image](https://github.com/user-attachments/assets/a8e5c18b-01ce-47ad-8995-e7f0ba3bc4fc)







Intepret the maps and the chart. Critique the observations.


# Conclusion

MODIS fire product, which is a global data of 250 resolution, was used to characterise the fire regime of the Daly River Catchment. Both spatial and non-spatial outputs were created, showing early and late dry season fires. 

Similar analysis with higher resolution imagery, such as Landsat, may improve the accuracy of the observations.


# Code

```JavaScript

 //region of interest is the Daly River catchment of the Northern Territory, Australia
var dalyNT = ee.FeatureCollection("projects/ee-niiazucrabbe/assets/DalyCatchment")

//let the computer display the base map to location of interest (i.e., Daly River)
Map.setCenter(130.6884, -13.694,9)

//create a symoblogy that makes the study boundary transparent and display this  
var symbology = {color: 'red', fillColor: '00000000'};

//apply the symbology to visualise the boundary of the study area
Map.addLayer(dalyNT.style(symbology), {}, 'Daly River Catchment');

//retrieve fire data for the project

var fireData= ee.ImageCollection('ESA/CCI/FireCCI/5_1');


//list of years to investigate
var years = ee.List.sequence(2001, 2024);


//filter collection
var fireData = fireData

// select the relevant bands
.select(['BurnDate','ConfidenceLevel'])

//print resultto the Console
print (fireData, 'fireData')

var fire = fireData.map(function(img) { 
      var date = ee.Date(img.get('system:time_start'));
      var year = date.get('year');
      var yrmnth = date.format('YYYY_MM');
      return img
              .clip(dalyNT) //trims image to study area
              .set('year', year) //sets a new property called 'year'
              .set('yrmnth', yrmnth); //sets a new property 'yrmnth'
    });  
    
print (fire, 'fire')



var fireMask = fire.map(function(img) {
  var conf = img.select('ConfidenceLevel');
  var level = conf.gte(95);
  return img
      .updateMask(level)
      .select('BurnDate') //return only 'BurnDate' 
      .set('year', ee.Image(img).date().get('year'))
      .set('yrmnth', ee.Image(img).get('yrmnth'));
});



var fireCNT = ee.ImageCollection.fromImages(years.map(function(year) {
  return fireMask
    .filterMetadata('year', 'equals', year) // Filter image collection by year
    .select('BurnDate').reduce(ee.Reducer.countDistinct()) // Reduce image collection by counting distinct day of the year
    .set('year', year);
}));



var fireDOY = ee.ImageCollection.fromImages(years.map(function(year) {
  return fireMask
    .filterMetadata('year', 'equals', year) 
    .select('BurnDate').reduce(ee.Reducer.firstNonNull()) //returns the first of the non-null observation in BurnDate
    .set('year', year);
}));

//fire seasonality

var fireDOY = (fireMask.mode(), visDOY, 'Most frequently burnt DOY', true, 0.8);


// set map center to ensure the images would display to the study area

Map.centerObject(dalyNT, 10);


var visCnt = {
    min:2, max:12, 
    palette:['eef5b7','99f74f','4ff7b0','4fc2f7','3940db',
            '7239db','db39db','db395c','7c1229']};

// Calculate overall fire frequencies "on-the-fly" and add to map

Map.addLayer(fireCNT, visCnt, 'Fire frequency', true, 0.8);



var visDOY = {
    min:1, max:366, 
    palette:['008000','00b050','92d050','c9ee12','ffd966','bf8f00',
    'bf8f00','ffd966','c9ee12','92d050','00b050','008000']}; // light colours represent early fires, dark colours are late fires

//visualise the result
Map.addLayer(fireMask.mode(), visDOY, 'Most frequently burnt DOY', true, 0.8);


// Monthly fire frequencies per year for the whole area
 var opt_cntFireMonth = {
   title: 'Monthly fire frequencies: Daly River Catchment, 2001 to 2020',
   pointSize: 3,
   hAxis: {title: 'Year Month'},
   vAxis: {title: 'Number of fires'},
 };

// Plot day count of monthly fires (Line chart the number of days a fire occured from 2001 to 2020)
 var cntFireMonth_chart = ui.Chart.image.series({ 
   imageCollection: fireMask.select('BurnDate'), 
   xProperty: 'yrmnth',
   region: dalyNT,
   reducer: ee.Reducer.countDistinct(),
   scale: 250 
 }).setOptions(opt_cntFireMonth).setChartType('LineChart');
 print(cntFireMonth_chart, 'day count of monthly fires');
 
 var opt_fireYr = {
   title: 'Count number of Fires per year',
   hAxis: {title: 'Time'},
   vAxis: {title: 'Fire Frequency'},
   colors: ['1d6b99', '39a8a7', '0f8755', '76b349']
 };

 
```


# Assignment


**Background**

You have been employed by the Northern Territory Government as *Senior Rangeland Monitoring Officer – Remote Sensing* and one of your KPIs is to produce and share information on the fire frequency of the Daly River Catchment (DRC) from 2001 to date. 
Because of consistency with existing data, you were tasked to use MODIS FireCC151, a data product developed as part of the European Space Agency (ESA) Climate Change Initiative (CCI) Programme. For a thorough analysis, you were asked to explore every image collected over the region of interest. Modify the scripts to produce a scientific article for this task. 

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
