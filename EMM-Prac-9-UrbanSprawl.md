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
Because of the multiplicative nature of speckle noise [1,20], it has been proven to be more effective to use the ratio operator than the difference operator [21,22] as a change-detection metric to compare two SAR temporal images [23,24,25].

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

//filter by orbit pass 
.filter(
  ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))

// filter by relative orbit number 
  .filter(ee.Filter.eq('relativeOrbitNumber_start', 45))
  
  //select the VV polarisation
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

// Compute image offset and direction.
var offset = displacement.select('dx').hypot(displacement.select('dy'));
var angle = displacement.select('dx').atan2(displacement.select('dy'));

//set the map centre to the point of interest
Map.setCenter(149.14,-35.18, 10);

//warping the image**

// Use the computed displacement to register all original bands.
var image2015_reg = image2015Orig.displace(displacement);

// Show the results of co-registering the images.
var visParams = {min:-15, max:-10};
Map.addLayer(image2025Orig, visParams, 'Reference');
Map.addLayer(image2015Orig, visParams, 'Before Registration');
Map.addLayer(image2015_reg, visParams, 'After Registration');

//Use the computed displacement to register the 2025 image
var image2025_reg = image2025Orig.displace(displacement);


//compute image ratio
var image_ratio =image2015_reg.divide(image2025_reg)
Map.addLayer(image_ratio, null, 'image ratio')


//log transform the ratio image to visually enhance change areas 
var image_logRatio =image_ratio.log()
Map.addLayer(image_logRatio,null, 'image_logRatio')
```
