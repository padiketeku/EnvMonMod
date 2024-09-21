# Introduction

This activity is building on practical 2 in that the output from that activity is used as a baseline data to estimate changes in habitat. This practical activity considers change in habitat between two time periods. The baseline habitat map was created for 2013 and this would be compared the most recent habitat map (i.e., 2024, note- this should be changed to the time you were performing this activity). In this activity, it is assumed that practical 2 is already completed.

# Learning Outcomes

- Replicate existing techniques to prepare data for classification
- Apply existing trained Random Forest classification model to new data
- Reclassify classification images
- Identify changed areas
- Transition between cover classes
- Estimate changes in habitats using a baseline data

# Task
You have been provided a baseline habitat map of the Daly River Catchment, this is a product from the practical 2 activity, to estimate the latest changes in the spatial extent of habitats.  
Collect the recent Landsat imagery (this should be surface reflectance product) of the study area with acquisition dates similar to baseline data and produce a new habitat map using Random Forest classification. Once you have the new habitat map, estimate changes in the spatial extent of the cover types. Critically evaluate your results, including:

- description of the task
- description of the methods you applied to complete the task
- description of the results obtained
- discuss the results you agree and/or disagree (and why)
- discuss how you think the results can be improved
- provide a conclusion on this task you have done

# Workflow

```JavaScript

//get recent Landsat 8 collection 
var landsatCol2 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")

//filter by date 
.filterDate('2024-07-11','2024-07-30') //for consistency with baseline

//filter by study area
.filterBounds(dalyNT)

//print the image collection to the Console
print(landsatCol2 , 'landsatCol2 ')


//visualise the collection
Map.addLayer(landsatCol2, {bands:["SR_B4", "SR_B3", "SR_B2"], min:6000, max:12000})

//turn on the boundary of the study area again to overlay on the collection
Map.addLayer(dalyNT.style(symbology), {}, 'Daly River Catchment');


//mask cloud and shadow pixels

var landsatCol2 = landsatCol2.map(fmask)


//mosaic the collection to make an image as this is required for classification 
var imgCol2img_2 = landsatCol2.mosaic()


//1.select the relevant bands, 2. trim the image to the study area, 3. print result to Console
var select_bands_2 = imgCol2img_2.select("SR_B2", "SR_B3", "SR_B4", "SR_B5","SR_B6","SR_B7").clip(dalyNT)

// apply the vegetation indices function
var image2classify_2024 = vegetation_indices(select_bands_2);
print (image2classify_2024, 'image2classify 2024');

//visualise the image to be classified
Map.addLayer(image2classify_2024, {bands:["SR_B4", "SR_B3", "SR_B2"], min:6000, max:12000}, 'Mosaicked-2')

```

![image](https://github.com/user-attachments/assets/048326c2-5c0e-46df-aec7-ef14b09a5d2b)


```JavaScript

// apply the model to classify the image
var finalClassification2024 = image2classify_2024.classify(rfClassification);

//visualise the classified image 2024
Map.addLayer(finalClassification2024, viz, 'Habitat Mapping 2024');
```

![image](https://github.com/user-attachments/assets/6f5aa783-629b-4395-ab8e-ac60ed216901)




Quantify change

```JavaScript

//compute area for each class
var habitat_all_2024 = ee.Image.pixelArea().addBands(finalClassification2024).divide(1e6)
                  .reduceRegion({
                    reducer: ee.Reducer.sum().group(1),
                    geometry: dalyNT,
                    scale:30,
                    bestEffort: true
                  })

print(habitat_all_2024,'habitat_all_2024')

```



![image](https://github.com/user-attachments/assets/7c140820-1376-431f-b12e-d3018e0ea9e3) ![image](https://github.com/user-attachments/assets/5149f934-047c-4333-a3bf-ca65359e4c83)

