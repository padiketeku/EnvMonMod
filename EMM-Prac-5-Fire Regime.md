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

# Workflow (!CAUTION THE WORKFLOW IS INCOMPLETE. WORK IN PROGRESS)

//Get study area- Daly River catchment of the Northern Territory, Australia

var dalyNT = ee.FeatureCollection("projects/ee-niiazucrabbe/assets/DalyCatchment") //modify the path to your own GEE asset 



## MODIS Fire Data

- **Search for data**


Type into the search bar "MODIS fire" as shown below.

![image](https://github.com/user-attachments/assets/8599f15c-d70c-4c2a-995d-32a3373f6d93)

You may see a list of data under "RASTERS" and "TABLES", click the search icon highlighted in red in the figure below.

![image](https://github.com/user-attachments/assets/43baece9-7b5e-4954-92c0-9461f260ce81)


The search result is as shown below, the data of interest highlighted with a red polgyon.

![image](https://github.com/user-attachments/assets/d0b6dfaf-0016-4b70-a30b-2660e00680ac)


Once you click on the data filename : **FireCCI51: MODIS Fire_cci Burned Area Pixel Product, Version 5.1** , a figure like the one shown below may pop up.

![image](https://github.com/user-attachments/assets/40068c6a-f739-48fa-94a8-c83fe30136e9)


The "DESCRIPTION" gives users insight into the data. This is a monthly global fire data and the spatial resolution is approximately 250m. The dataset is available from 2001.
When you click the "BANDS" tab, you may notice that the collection has four bands (see the figure below), including BurnDate, ConfidenceLevel,  LandCover and ObservedFlag. See the band description, and take note of the Min and Max values for BurnDate and ConfidenceLevel as these are the two bands relevant for this project.





![image](https://github.com/user-attachments/assets/4cefd564-e66a-4293-adf0-75255840fa81)






- **Import dataset**

It is possible to use the **IMPORT** to get the dataset into Code Editor. However, we would not use this approach. Rather, copy the **Collection Snippet** and then create a variable for the image collection. Your snippet should be as shown below.

```JavaScript
var fireData = ee.ImageCollection("ESA/CCI/FireCCI/5_1")
```

Let's be a bit greedy here in exploring all the data, so let's make a list for all years.


```JavaScript
var years = ee.List.sequence(2001, 2020);
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

The collection has 240 images (as of 2024 when data was first accessed). Expand "features" to see the list of images (figure below). Explore the image properties and take note of "system: index:" for the product date. 




![image](https://github.com/user-attachments/assets/ad05ed08-696a-4a02-8180-5f982a989566)




- **Adding new properties**

  
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

Note that the function has been applied to the image collection , **fireData** , and this was achieved through the **.map** . Now, print the variable to see if the image properties have the two new properties (year and yrmnth).

```JavaScript
print (fire, 'fire')
```

The properties of the first image in the collection is shown below. The new properties are highlighted using a red polgyon.


![image](https://github.com/user-attachments/assets/8b30f7da-db79-4718-9163-271c0dbcc216)



Optical imagery can be made less useful by cloud cover and thus, it is important to ensure 'bad' pixels (or data) is excluded from the analysis. Low quality data can skew results, so, for a robust study you must select the data with high confidence level. We would filter the data again selecting fire pixels with confidence level no less than 95% (a statistical standard for ecological studies).


```JavaScript

var burntPixels = fire.map(function(img) {
  var conf = img.select('ConfidenceLevel');
  var maskPixels = conf.gte(95);
  return img
      .updateMask(maskPixels)
      .select('BurnDate') //return only 'BurnDate' 
      .set('year', ee.Image(img).date().get('year'))
      .set('yrmnth', ee.Image(img).get('yrmnth'));
});

//print result to Console
print(burntPixels, 'burntPixels');
```



- **Visualise the data**


Now that you have your 'best'data for analysis, you would want to visualise the images in the collection to ensure you understand your data. It is only when you understand your data that you can employ the right methods to analyse it. There are 240 images in the collection. It is not computationally expedient to display all of the images; however, we need to have an insight into the collection. Thus, we would display the images for the first year (i.e., 2001). Given the data is in monthly time-step, we would display the first 12 images to represent 2001. The function below would take the image collection and display the first 12 images, one after the other, in the Layer Manager. 


```JavaScript

//a function to display each image in a collection
function addImage(image) { 
  var id = image.id
  var image = ee.Image(image.id)
  //visualise the image; be sure to clip image to ROI bands:['BurnDate', 'BurnDate', 'BurnDate']
  Map.addLayer(image.clip(dalyNT), {min:30, max:300}, 'FireScar 2001') //see the results in the Layer Manager
}

////apply the function to visualise the burnt date

//because of computation restrictions, display 2001 only (first 12 images)
var burntPixels_2001 = burntPixels.limit(12)

//apply the function using 'map'and 'evaluate' methods
//the code firstly applies (i.e., map) the function to each image in the collection and displays the results to Console (i.e., evaluate)
burntPixels_2001.evaluate(function(burntPixels_2001) {  
  
  // use map on client-side
  burntPixels_2001.features.map(addImage)
})


```


The result for each month is displayed in the figure below.




![image](https://github.com/user-attachments/assets/d052e58a-da2c-48b9-a2f7-41c1671cad3b)






What are the fire months for 2001? You are right, it's April to November.




- **EDS or LDS?**

The time of fire attack can be early or late dry season. It is important for rangeland managers to know the time of the dry season (day of the year) fire ouccurs as late dry season fires are usually hotter and must be avoided. The function below produces a map layer showing early and late dry season fires.


```JavaScript

//function that finds the DOY the satellite observed fire scars 
var f2FindBurnDate = function(year){
  return burntPixels 
  .filter(ee.Filter.eq('year', year))
  .select('BurnDate').reduce(ee.Reducer.firstNonNull())
  .set('year', year)
}

//apply the function to put all the yearly images into a collection
var burnDate = ee.ImageCollection.fromImages(years.map(f2FindBurnDate))
```

Now that we have all the images with distinct burn dates in a collection, it is time to visualise this to see EDS and LSD fires. EDS fires would be displayed with light colours and the LDS fires would be dark colours. To achieve this in a more intuitive way, the entire palette module would be required to select an appropriate colour group to use. You can read more about the colour palette used in EE [here](https://github.com/gee-community/ee-palettes). The code below sets up the visualisation parameters and is applied to visualise the data.

```JavaScript

//load the colour palette
var colourPalettes = require('users/gena/packages:palettes');

//define the palette to use
var visBurnDate = colourPalettes.crameri.lajolla[10]; //10 is the colour level

//display the burn date, apply the visualisation parameter
Map.addLayer(burnDate, {min:1, max:366, palette:visBurnDate}, 'Burn Date, DOY')

```

The result for the visualisation is shown below. Light colours represent EDS fires and dark colours are for LDS fires.





![image](https://github.com/user-attachments/assets/0b545cfa-b17a-4313-8375-f1af46039fa9)






- **Fire Frequency- number of fires in a year**


Rangelands managers are not only interest when the fires occured, but also the number of times fires occured is crucial for the assessment of management practices. If managment practices, such as early season prescribed burning, are efficient then the number of LDS fires is expected to be low. Below is a function to count the number of fires in a year.



```JavaScript

//function that counts the number of fires in a year
var f2CountFires = function(year){
  return burntPixels 
  .filter(ee.Filter.eq('year', year))
  .select('BurnDate').reduce(ee.Reducer.countDistinct())
  .set('year', year)
}

//apply the function, putting all the yearly images into a collection
var fireCount = ee.ImageCollection.fromImages(years.map(f2CountFires))
```

The fire frequency images are now available, let's visualise this.


```JavaScript

//sum the number of burns 
var fireCount_sum = fireCount.sum()

//visualise the result. 
Map.addLayer(fireCount_sum, {min:1, max:40, palette:['green', 'blue', 'yellow', 'purple', 'magenta', 'red']}, 'FireFrequency')
```

The result for fire frequency distribution is captured by the map displayed below. High frequency fires are the reddish pixels. 



![image](https://github.com/user-attachments/assets/2f1b5d74-534e-4c96-9038-b3f5c482b834)






Given you have fire frequency data, sites that are most often burnt would be helpful information for management. Let's visualise sites that recorded plenty fires; darker pixels represent highest fire frequency dates.



![image](https://github.com/user-attachments/assets/ba08c1a1-f483-4b24-b65c-fc30d75be131)






- **Chart Fire Frequency**


We have explored the spatial distribution of fire frequency. Now, let's chart the temporal variation of fire frequency. We would explore the monthly frequencies of fire for each year. The code below produces this chart. 

```JavaScript

// set map center to ensure the images would display to the study area
Map.centerObject(dalyNT, 7);

//set visualisation parameters
 var opt_cntFireMonth = {
   title: 'Monthly fire frequencies: Daly River Catchment, 2001 to 2020',
   pointSize: 3,
   hAxis: {title: 'Year Month'},
   vAxis: {title: 'Number of fires',  ticks: [0,4,8,12,16,20,24,28,32] },
 };

// Plot day count of monthly fires (Line chart the number of days fire occured from 2001 to 2020)
 var cntFireMonth_chart = ui.Chart.image.series({ 
   imageCollection: burntPixels.select('BurnDate'), 
   xProperty: 'yrmnth',
   region: dalyNT,
   reducer: ee.Reducer.countDistinct(),
   scale: 250 
 }).setOptions(opt_cntFireMonth).setChartType('LineChart');

/print the chart
 print(cntFireMonth_chart, 'day count of monthly fires');
 
```


The time series chart for monthly fire frequency is shown below. The y-axis shows the number of fires in a month and this is variable as some months recoord more fires than others. For instance, in 2021 the highest number of fires occured in September.



![image](https://github.com/user-attachments/assets/fedd49e6-4f83-4dc6-856f-a8295378ee59)




# Conclusion

MODIS global fire data was analysed to understand the fire regime of the Daly Region. Spatial and temporal results were produced to inform management decisions.






# Assignment


You have been employed by the Northern Territory Government as *Senior Rangeland Monitoring Officer – Remote Sensing* and one of your KPIs is to produce and share information on the fire frequency of the Daly River Catchment (DRC) from 2001 to 2020. 
Because of consistency with existing data, you were tasked to use MODIS FireCC151, a data product developed as part of the European Space Agency (ESA) Climate Change Initiative (CCI) Programme. For a thorough analysis, you were asked to explore every image collected over the region of interest. 


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


























