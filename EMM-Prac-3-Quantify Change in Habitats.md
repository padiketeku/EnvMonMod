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


Simply, you can compare these estimates against baseline (see figures below) to observe increase or decrease in spatial extent for cover classes


![image](https://github.com/user-attachments/assets/7c140820-1376-431f-b12e-d3018e0ea9e3) ![image](https://github.com/user-attachments/assets/5149f934-047c-4333-a3bf-ca65359e4c83)


Changes between cover types (from-to change analysis)

The results above show changes in the spatial extent of a habitat. However, we would step up this analysis to observe changes between classes inclduing the spatial extent of the change.
For instance if woodland pixels changed to other cover, what cover was that and what was the spatial extent for this change. 

Relabel the classification images

To perform the change matrix analysis, we must ensure the labels start from 1. This is not the case for the two classification images, so we would have to relabel.

```JavaScript
var imageBaseline = finalClassification.remap([0,1,2,3,4,5], [1,2,3,4,5,6])
var image2024 = finalClassification2024.remap([0,1,2,3,4,5], [1,2,3,4,5,6])
```

Image differencing

This is subtracting one image from another to assess the residual for change and no-change. No-change pixels would have a value of zero. In this task,  we are only interested in change, so pixels with value of zero must be sidelined.

```JavaScript
var changedAreas = image2024.subtract(imageBaseline).neq(0) // changed pixels would be assigned 1
```

Change Matrix

A pixel of class 1 (e.g., water) in 2013 may change to class 2 (e.g., infrastructure) in a recent year, the matrix would capture this as 12. Alternatively, class 4 (woodland) may change to class 5 (agriculture) and this would appear on the matrix as 45. We would use this logic to transform the two classification images for a change matrix.

```JavaScript

//between-class changes; a cover change to a different cover

var change_FromTo =imageBaseline.multiply(10).add(image2024).rename('FromToChange')

```

Well, at this you might be keen to know the number of pixels for each matrix. Also, you may like to  see the matrix. To do this, we would use the frequency histogram tool.

```JavaScript
var changeMatrix_sum_pixels = change_FromTo.reduceRegion({
  reducer:ee.Reducer.frequencyHistogram(),
  scale:30,
  geometry:dalyNT,
  bestEffort: true

})

//print the result to Console
print( changeMatrix_sum_pixels.get('FromToChange'), ' ChangeMatrix Total Pixels')
```

You are expected to have an object with 66 items. Your resultt may be as shown below.



![image](https://github.com/user-attachments/assets/486aee69-5062-4bd2-8a61-db23a46ae9cd)



You should be able to interpret the result. Water to baresoil (16) has 158 pixels while over 298,000 pixels recorded for woodland to agriculture.

Similarly, we can compute the extent of change between cover classes. 

```
var changeMatrixSqKm = ee.Image.pixelArea().addBands(change_FromTo).divide(1e6)
                  .reduceRegion({
                    reducer: ee.Reducer.sum().group(1),
                    geometry: dalyNT,
                    scale:30,
                    bestEffort: true
                  })
                  

print(changeMatrixSqKm, 'changeMatrixSqKm')
```

Your result should be an object with 36 elements in the Console. Make sure you drop-down to see the size for each between-class change. The first ten results are shown below.


![image](https://github.com/user-attachments/assets/c8de4761-9f7c-4af2-9bdb-8b265fea4474)


From the figure above, the spatial extent of the first change element (12): water to infrastructure, was 1.4 km<sup>2</sup>



# Conclusion

The practical shows the techniques involved in performing bi-temporal image differencing to estimate change.

# Code

```JavaScript
//get recent Landsat 8 collection 
var landsatCol2 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")

//filter by date 
.filterDate('2024-07-11','2024-07-30') 

//filter by study area
.filterBounds(dalyNT)
//print the image collection to the Console
print(landsatCol2 , 'landsatCol2 ')


//visualise the collection
//Map.addLayer(landsatCol2, {bands:["SR_B4", "SR_B3", "SR_B2"], min:6000, max:12000})

//turn on the boundary of the study area again to overlay on the collection
//Map.addLayer(dalyNT.style(symbology), {}, 'Daly River Catchment');


//mask cloud and shadow pixels

var landsatCol2 = landsatCol2.map(fmask)


//mosaic the collection to make an image as this is required for classification 
var imgCol2img_2 = landsatCol2.mosaic()


//select the relevant bands, 2. trim the image to the study area, 3. print result to Console
var select_bands_2 = imgCol2img_2.select("SR_B2", "SR_B3", "SR_B4", "SR_B5","SR_B6","SR_B7").clip(dalyNT)
//print (select_bands_2, 'select_bands')


// apply the vegetation indices function
var image2classify_2024 = vegetation_indices(select_bands_2);
//print (image2classify_2024, 'image2classify 2024');

//visualise the image to be classified
//Map.addLayer(image2classify_2024, {bands:["SR_B4", "SR_B3", "SR_B2"], min:6000, max:12000}, 'Mosaicked-2')

// apply the model to classify the image
var finalClassification2024 = image2classify_2024.classify(rfClassification);

//visualise the classified image 2024
//Map.addLayer(finalClassification2024, viz, 'Habitat Mapping 2024');

//compute area for each class
var habitat_all_2024 = ee.Image.pixelArea().addBands(finalClassification2024).divide(1e6)
                  .reduceRegion({
                    reducer: ee.Reducer.sum().group(1),
                    geometry: dalyNT,
                    scale:30,
                    bestEffort: true
                  })

print(habitat_all_2024,'habitat_all_2024')

//image differencing

//now subtract the baseline image from the current image to observe changed areas, thus, zero must be masked as it means no-change
var changedAreas = image2024.subtract(imageBaseline).neq(0) // changed pixels would be assigned 1
//Map.addLayer(changedAreas, {min:0, max:1, palette:['gray', 'red']}, 'Changed Areas')

//let's find the between-class changes; a cover change to a different cover
var change_FromTo =imageBaseline.multiply(10).add(image2024).rename('FromToChange')
print(change_FromTo, 'change_FromTo')

//how many pixels in each change matrix? let's compute this using the frequency histogram

var changeMatrix_sum_pixels = change_FromTo.reduceRegion({
  reducer:ee.Reducer.frequencyHistogram(),
  scale:30,
  geometry:dalyNT,
  bestEffort: true

})

//print the result to Console

print( changeMatrix_sum_pixels.get('FromToChange'), ' ChangeMatrix Total Pixels')


//compute spatial extent in square kilometer for each class

var changeMatrixSqKm = ee.Image.pixelArea().addBands(change_FromTo).divide(1e6)
                  .reduceRegion({
                    reducer: ee.Reducer.sum().group(1),
                    geometry: dalyNT,
                    scale:30,
                    bestEffort: true
                  })
                  

print(changeMatrixSqKm, 'changeMatrixSqKm')

```

The End
