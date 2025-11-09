# Urban Sprawl

# Introduction
Growth in the human population and the concomitant social needs drive the expansion of urbanisation. Sprawl is characterized as low-density, haphazard development that spirals outward from urban centres ([Burchell et al. 1998](https://onlinepubs.trb.org/onlinepubs/tcrp/tcrp_rpt_39-a.pdf)). The Australian Capital Territory (ACT), which hosts Canberra, the federal capital city of Australia, is geographically small compared to other cities, such as Sydney, Melbourne and Brisbane. However, urban development has been on the rise at a rate nearly matching that of the big cities. Recently, urbanisation is expanding into conservation lands, and this is concerning. The recent expansion of urban and suburban developments is concentrated in Gungahlin, the Molonglo Valley, and Belconnen. Urban sprawl causes habitat fragmentation, the loss of productive land, an increase in environmental pollution, and the degradation of natural habitats, among other adverse effects. The detection of urban sprawl is a first principle of managing urbanisation. In this tutorial, we will explore Sentinel-1 data and change detection techniques to detect recent urban areas in ACT, using Gungahlin as the study area. 


# Learning outcomes

- Filter image collectiom <br>
- Register two Sentinel-1 images <br>
- Compute log ratio <br>
- Interpret changes in Sentinel- imagery


  # Task

  New homes have been developed in the Gungahlin since 2015. You are required to compare the Sentinel-1 images in 2015 and 2025 to detect the new homes that have emerged in the last ten years at Gungahlin.

  # Workflow

The log ratio method was used to overcome the multiplicative effect of speckle noise. Studies have shown that it is more effective to use the image ratio method to identify changegs in SAR images.

Pont of interest: 

```JavaScript
var poi = ee.Geometry.Point([149.13796346428305, -35.1836945608286]),
```


The region of interest, Gungahlin, is defined by the polygon below:

```JavaScript
var roi = 
    ee.Geometry.Polygon(
        [[[149.11592258305404, -35.13796974819787],
          [149.07335056156967, -35.18119507773261],
          [149.122434654112, -35.203643279133686],
          [149.1387471348693, -35.21065607585413],
          [149.15437473149154, -35.21542221072321],
          [149.18596042485086, -35.19297981696291],
          [149.15642289495338, -35.1637969844723]]]);
```

Get the S1 image collection and filter this.

```JavaScript
//get the S1 GRD collection
var s1col = ee.ImageCollection("COPERNICUS/S1_GRD")


//filter the collection to requirements
var s1col2 = s1col

//filter by date
.filterDate('2014-06-01', '2025-06-01')
//filter by point of interest
.filterBounds(poi)

//filter by orbit pass to make sure you have scenes from the same orbit pass 
.filter(
  ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))

// filter by relative orbit number to make sure the images are from same incidence angle
  .filter(ee.Filter.eq('relativeOrbitNumber_start', 45))
  
  //select the VV polarisation as it is more sensive to vertical objects such as buildings
  .select('VV')

```

Print the result to the console. 

```JavaScript 
print(s1col2, 's1col2')
```

The rest of the workflows is captured by the scripts below.

```JavaScript
//convert collection to a list
var col_list = s1col2.toList(283)
print(col_list,"col_list")

//select the 2015 image
var col_list_2015 = col_list.slice(2,3)
print(col_list_2015,"col_list_2015")


//convert the list to an image object: 2015
var image2015 = ee.Image(col_list_2015.get(0))
print(image2015, "image2015")

//select the 2025 image
var col_list_2025 = col_list.slice(282,283)
print(col_list_2025,"col_list_2025")


//convert the list to an image object: 2025
var image2025 = ee.Image(col_list_2025.get(0))
print(image2025, "image2025")

//visualise the selected images
Map.addLayer(image2015, {min:-15, max:-10}, 'image2015')
Map.addLayer(image2025, {min:-15, max:-10}, 'image2025')

//clip the two images to the study area
var image2015c = image2015.clip(roi)
var image2025c = image2025.clip(roi)

//visualise clipped images
Map.addLayer(image2015c, {min:-15, max:-10}, 'image2015 clipped')
Map.addLayer(image2025c, {min:-15, max:-10}, 'image2025 cliped')
```


The SAR images before and after urban expansion in the last 10 years are displayed below. The areas with large urban development have been highlighted with a red polygon. Try to discern other areas that experienced urban expansion.












<img width="1836" height="878" alt="image" src="https://github.com/user-attachments/assets/fb37e58b-f78f-48b2-9b9e-fd65ace126b5" />


























## Image registration

The image above might not be well aligned as they were collected at different dates. To be sure the pixels between the images are comparable, you must register the two images- a master (or reference image) and a slave (or servant image). The 2015 image is the reference in this case. This method is performed to ensure the pixels of both images precisely match onto each other. To do this, we require the shift between the two images; this is called displacement. Once you have the displacement values you would apply these to the original images. use the values of the reference imagery to warp the pixels of the other image to align with the master image.  


```JavaScript

//***register the two images

// use bicubic resampling during registration.
var image2015Orig = image2015c.resample('bicubic');
var image2025Orig = image2025c.resample('bicubic');

// determine the displacement 
var displacement = image2015Orig.displacement({
  referenceImage: image2025Orig,
  maxOffset: 50.0,
  patchWidth: 100.0
});



//**warping the images**

// Use the computed displacement to register all original bands.


//to do this: apply displacement to 2015 data
var image2015_reg = image2015Orig.displace(displacement);


//also, apply displacement to the 2025 data 
var image2025_reg = image2025Orig.displace(displacement);

```


## Change detection

We will compute the ratio between the two images and transform this through natural log to make the change areas more apparent. The new urban areas in the last 10 years would be readily detected via the bright pixels.


```JavaScript

//set the map centre to the point of interest
Map.setCenter(149.14,-35.18, 10);

//compute image ratio
var image_ratio =image2015_reg.divide(image2025_reg)
Map.addLayer(image_ratio, null, 'image ratio')


//log transform the ratio image to visually enhance change areas 
var image_logRatio =image_ratio.log()
Map.addLayer(image_logRatio,null, 'image_logRatio')
```

The figure below is the result of the ratio and log transformed change maps. Bright pixels in the log transformed image represent the new developed homes and offices. Throsby and Moncrieff are the new urbanised suburbs.




<img width="1823" height="904" alt="image" src="https://github.com/user-attachments/assets/4747d607-93a1-4651-be83-3e659ff8327d" />






# Do It Yourself

Identify another location in the ACT (or another area of your choice) that has experienced urban expansion in the last ten years, and map the change using Sentinel-1 data and the log ratio method.
Write up a report on this work, include introduction to the topic, aim and objective of the work, the data and methods leveraged, results, discussion and references. 



