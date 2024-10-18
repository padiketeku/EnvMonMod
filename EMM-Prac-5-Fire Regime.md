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

I'M AWARE THIS IS NOT AVAILABLE. I'M WORKING ON IT. FEEL FREE TO MOVE TO PRAC 6. THANKS
