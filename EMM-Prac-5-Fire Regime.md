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

The collection has 240 images (as of 2024). Drop-down "features" to see the list of images. Explore the image properties and take note of "system: index:" for the product date. In the next step, would add two more items to the properties- 'year'and 'yrmnth'- for the purposes of producing monthly distibution of fire in the study area.


![image](https://github.com/user-attachments/assets/ad05ed08-696a-4a02-8180-5f982a989566)


In addition, we would want to further trim the data to the study area; given the dataset is an image collection, every image in the collection must be trimmed to the study. A user-defined function would be used to do this. In this function, additional properties, i.e., 'year' and 'year_month', would be created as the project aims to analyse fires in monthly time step.

```JavaScript
function(img){
return img.clip(dalyNT)

//add 'year'as a property to image
.set('year', ee.Image(img).date().get('year'))

//add year and month ('yrmnth') as a property to image
.set('yrmnth',ee.Date.parse('YYYY_MM_DD', (img.get('system:index'))).format('YYYY_MM'));
}
```






