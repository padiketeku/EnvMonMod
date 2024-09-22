# Introduction



# Learning Outcomes



# Task



# Workflow



## MODIS Fire Data

1, Type into the search bar "MODIS fire" as shown below.

![image](https://github.com/user-attachments/assets/8599f15c-d70c-4c2a-995d-32a3373f6d93)

You may see a list of data under "RASTERS" and "TABLES", but click the search icon highlighted in red in the figure below.

![image](https://github.com/user-attachments/assets/43baece9-7b5e-4954-92c0-9461f260ce81)


The search result is as shown below, the data of interest highlighted in red polgyon.

![image](https://github.com/user-attachments/assets/d0b6dfaf-0016-4b70-a30b-2660e00680ac)


Once you click on the data filename : **FireCCI51: MODIS Fire_cci Burned Area Pixel Product, Version 5.1** , a figure like the one shown below may pop up.

![image](https://github.com/user-attachments/assets/40068c6a-f739-48fa-94a8-c83fe30136e9)


The "DESCRIPTION" gives users insight into the data. This is a monthly global fire data and the spatial resolution is approximately 250m. The dataset is available from 2001 to date.
When you click the "BANDS" tab, you may notice that the collection has four bands, including BurnDate, ConfidenceLevel,  LandCover and ObservedFlag. See the band description, and take note of the Min and Max values for BurnDate and ConfidenceLevel as these are the two bands relevant for this project.

2, Import dataset

It is possible to use the **IMPORT** to get the dataset into Code Editor. However, we would not use this approach. Rather, copy the **Collection Snippet** and then create a variable for the image collection. Your snippet should be as shown below.

```JavaScript
var fireData = ee.ImageCollection("ESA/CCI/FireCCI/5_1")
```

We are interested in all acquisition dates, so let's make a list of all the years of interest

```JavaScript
var years = ee.List.sequence(2001, 2024);
```


3, Resize dataset


Although we would explore all fire years in this data, only the **BurnDate** and **ConfidenceLevel** bands are useful for the task. Thus we would select these bands. 

```JavaScript
var fireData = fireData

// select the relevant bands
.select(['BurnDate','ConfidenceLevel'])

//print resultto the Console
print (fireData, 'fireData')
```

The collection has 240 images (as of 2024). Drop-down "features" to see the list of images (fgure below). Explore the image properties and take note of "system: index:" for the product date. 




![image](https://github.com/user-attachments/assets/ad05ed08-696a-4a02-8180-5f982a989566)




In the next step, would add two more items to the properties- 'year'and 'yrmnth'- for the purposes of producing monthly distibution of fire in the study area.


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

Note that the function has been applied to the image collection , **fireData** , and this achieved through the **.map** . Now, print the variable to see if the image properties have two additional items (year and yrmnth).

```JavaScript
print (fire, 'fire')
```

The properties of the first image in the collection is shown below. The new properties are highlighted using a red polgyon.


![image](https://github.com/user-attachments/assets/8b30f7da-db79-4718-9163-271c0dbcc216)



Optical imagery can be made less useful by cloud cover and thus it is important to ensure 'bad' pixels (or data) is excluded from the analysis. Low quality data can skew results so for a robust study you must select the data with high ocnfidence level. We would filter the data again selecting fire pixels with confidence level no less than 95% (a standard for ecological studies).

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


4, Data analysis

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

```




