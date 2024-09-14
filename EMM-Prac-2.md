# Introduction

In this practical, you would apply Random Forest to classify an image with the objective of defining the main surface types of the Daly River Catchment.


## Learning Outcomes

- Import shapefile
- Visualise boundary of study area
- Mosaic images
- Classify an image
- Assess the classifier 



## Task


Environmental monitoring is a process in which time is an important phenomenon. The condition of an habitat 30 years ago may not be same as today. The Daly River Catchments in the Northern Terriotory of Australia is an important ecosystem for several reasons. The catchment is a habitat for many native plants, birds, reptiles, and mammals. The condition of the catchment is not the same ten years ago, but to understand the recent state of the catchment it is worth going back into time to have a baseline information. In this practical, your task is to classify the cardinal land cover types of the Daly River Catchment, ten years ago, using Landsat 8 imagery.


### Workflow


1, Upload the boundary (or shapefile) of the study area 

```JavaScript
var dalyNT = ee.FeatureCollection("projects/ee-niiazucrabbe/assets/DalyCatchment")
```

At the start of EE, the base map is centered on the US. If your study location is different you would have to re-set the base map to your region of interest. In our case, we would re-set the base map to the Daly River.

```JavaScript
//let the computer display the base map to location of interest (i.e., Daly River)
Map.setCenter(130.6884, -13.694,10)
```

## Assessment



## Conclusion
