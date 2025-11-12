# Species Distribution Modelling


The context for this tutorial is found in this [study](https://onlinelibrary.wiley.com/doi/full/10.1111/ddi.13491). Make sure you read the paper before or alongside working through the tutorial for detail comprehension of the task.

There are three case studies in the paper, but only the first case study you are required to work through in this unit. The scripts and other details to complete this selected case study - habitat suitability mapping of the brown-throated sloth (Bradypus variegatus).

The below scripts can also be accessed through the GEE repository for this study: [HERE](https://code.earthengine.google.com/?accept_repo=users/ramirocrego84/SDM_Manuscript)


```JavaScript

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Implementation of Species Distribution Models in Google Earth Engine
//
// Ramiro D. Crego, Jared A. Stabach and Grant Connette
//
// Smithsonian National Zoo and Conservation Biology Institute, Conservation Ecology Center, 1500 Remount Rd, Front Royal, VA 22630, USA.
// Working Land and Seascapes, Conservation Commons, Smithsonian Institution, Washington, DC 20013, USA
// 
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Case study 1: SDM with presence only data

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Section 1 - Species data
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Load presence data
var Data = ee.FeatureCollection('users/ramirocrego84/BradypusVariegatus');
print('Original data size:', Data.size());
```


What is the data size? 571?

There are potentially duplicates of data and this must be dealt with. The following function does this for you.


```JavaScript
// Define spatial resolution to work with (m)
var GrainSize = 1000;

function RemoveDuplicates(data){
  var randomraster = ee.Image.random().reproject('EPSG:4326', null, GrainSize);
  var randpointvals = randomraster.sampleRegions({collection:ee.FeatureCollection(data), scale: 10, geometries: true});
  return randpointvals.distinct('random');
}

//apply the function to remove duplicate
var Data = RemoveDuplicates(Data);
print('Final data size:', Data.size());
```




```JavaScript
// Add two maps to the screen.
var left = ui.Map();
var right = ui.Map();
ui.root.clear();
ui.root.add(left);
ui.root.add(right);

// Link maps, so when you drag one map, the other will be moved in sync.
ui.Map.Linker([left, right], 'change-bounds');

// Visualize presence points on the map
//right.addLayer(Data, {color:'red'}, 'Presence', 1);
//left.addLayer(Data, {color:'red'}, 'Presence', 1);
```

Your result in the Map console may be like the one below.






<img width="1206" height="395" alt="image" src="https://github.com/user-attachments/assets/62403c59-57ee-4b6c-819b-a51b2c46525a" />








```JavaScript

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Section 2 - Define Area of Interest (Extent)
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Define the AOI
var AOI = Data.geometry().bounds().buffer({distance:50000, maxError:1000});

// Add border of study area to the map
var outline = ee.Image().byte().paint({
  featureCollection: AOI, color: 1, width: 3});
right.addLayer(outline, {palette: 'FF0000'}, "Study Area");
left.addLayer(outline, {palette: 'FF0000'}, "Study Area");

// Center map to the area of interest
right.centerObject(AOI, 4); //Number indicates the zoom level
left.centerObject(AOI, 4); //Number indicates the zoom level

```

The AOI is displayed as shown below.





<img width="1292" height="349" alt="image" src="https://github.com/user-attachments/assets/af9061cb-a4df-40b4-be0e-606248739b59" />








```JavaScript
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Section 3 - Selectiong Predictor Variables
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Load WorldClim BIO Variables (a multiband image) from the data catalog
var BIO = ee.Image("WORLDCLIM/V1/BIO");

// Load elevation data from the data catalog and calculate slope, aspect, and a simple hillshade from the terrain Digital Elevation Model.
var Terrain = ee.Algorithms.Terrain(ee.Image("USGS/SRTMGL1_003"));

// Load NDVI 250 m collection and estimate median annual tree cover value per pixel
var MODIS = ee.ImageCollection("MODIS/006/MOD44B");
var MedianPTC = MODIS.filterDate('2003-01-01', '2020-12-31').select(['Percent_Tree_Cover']).median();

// Combine bands into a single multi-band image
var predictors = BIO.addBands(Terrain).addBands(MedianPTC);

// Mask out ocean pixels from the predictor variable image
var watermask =  Terrain.select('elevation').gt(0); //Create a water mask
var predictors = predictors.updateMask(watermask).clip(AOI);

// Select subset of bands to keep for habitat suitability modeling
var bands = ['bio04','bio05','bio06','bio12','elevation','Percent_Tree_Cover'];
var predictors = predictors.select(bands);

// Display layers on the map
right.addLayer(predictors, {bands:['elevation'], min: 0, max: 5000,  palette: ['000000','006600', '009900','33CC00','996600','CC9900','CC9966','FFFFFF',]}, 'Elevation (m)', 0);
right.addLayer(predictors, {bands:['bio05'], min: 190, max: 400, palette:'white,red'}, 'Temperature seasonality', 0); 
right.addLayer(predictors, {bands:['bio12'], min: 0, max: 4000, palette:'white,blue'}, 'Annual Mean Precipitation (mm)', 0); 
right.addLayer(predictors, {bands:['Percent_Tree_Cover'], min: 1, max: 100, palette:'white,yellow,green'}, 'Percent_Tree_Cover', 0); 
```


Turn these layers on/off in the layer manager for visualisation.





 ```JavaScript

// Estimate correlation among predictor variables

// Extract local covariate values from multiband predictor image at 5000 random points
var DataCor = predictors.sample({scale: GrainSize, numPixels: 5000, geometries: true}); //Generate 5000 random points
var PixelVals = predictors.sampleRegions({collection: DataCor, scale: GrainSize, tileScale: 16}); //Extract covariate values

// To check all pairwise correlations we need to map the reduceColumns function across all pairwise combinations of predictors
var CorrAll = predictors.bandNames().map(function(i){
    var tmp1 = predictors.bandNames().map(function(j){
      var tmp2 = PixelVals.reduceColumns({
        reducer: ee.Reducer.spearmansCorrelation(),
        selectors: [i, j]
      });
    return tmp2.get('correlation');
    });
    return tmp1;
  });
//print('Variables correlation matrix',CorrAll);
```

The result for the  correlation matrix will be in the Console. Extract of the results in the Console is shown below. 




<img width="464" height="496" alt="image" src="https://github.com/user-attachments/assets/80430bba-ed51-485b-8e92-2adb860934ff" />








```JavaScript
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Section 4 - Defining area for pseudo-absences and spatial blocks for model fitting and cross validation
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Make an image out of the presence locations. The pixels where we have presence locations will be removed from the area to generate pseudo-absences.
// This will prevent having presence and pseudo-absences in the same pixel. 
var mask = Data
  .reduceToImage({
    properties: ['random'],
    reducer: ee.Reducer.first()
}).reproject('EPSG:4326', null, ee.Number(GrainSize)).mask().neq(1).selfMask();

// Option 1: Simple random pseudo-absence selection across the entire area of interest.
// var AreaForPA = mask.updateMask(watermask).clip(AOI);

// Option 2: Spatially constrained pseudo-absence selection to a buffer around presence points.
//var buffer = 500000; // Distance in meters.
//var AreaForPA = Data.geometry().buffer({distance:buffer, maxError:1000});
//var AreaForPA = mask.clip(AreaForPA).updateMask(watermask).clip(AOI);
//right.addLayer(AreaForPA, {},'Area to create pseudo-absences', 0);

//Option 3: Environmental pseudo-absences selection (environmental profiling)
// Extract environmental values for the a random subset of presence data
var PixelVals = predictors.sampleRegions({collection: Data.randomColumn().sort('random').limit(200), properties: [], tileScale: 16, scale: GrainSize});
// Perform k-means clusteringthe clusterer and train it using based on Euclidean distance.
var clusterer = ee.Clusterer.wekaKMeans({nClusters:2, distanceFunction:"Euclidean"}).train(PixelVals);
// Assign pixels to clusters using the trained clusterer
var Clresult = predictors.cluster(clusterer);
// Display cluster results and identify the cluster IDs for pixels similar and dissimilar to the presence data
right.addLayer(Clresult.randomVisualizer(), {}, 'Clusters', 0);
// Mask out pixels that are dissimilar to presence data.
// Obtain the ID of the cluster similar to the presence data and use the opposite cluster to define the allowable area to for creatinge pseudo-absences
var clustID = Clresult.sampleRegions({collection: Data.randomColumn().sort('random').limit(200), properties: [], tileScale: 16, scale: GrainSize});
clustID = ee.FeatureCollection(clustID).reduceColumns(ee.Reducer.mode(),['cluster']);
clustID = ee.Number(clustID.get('mode')).subtract(1).abs();
var mask2 = Clresult.select(['cluster']).eq(clustID);
var AreaForPA = mask.updateMask(mask2).clip(AOI);

// Display area for creation of pseudo-absence
right.addLayer(AreaForPA, {},'Area to create pseudo-absences', 0);
```

```JavaScript

// Define a function to create a grid over AOI
function makeGrid(geometry, scale) {
  // pixelLonLat returns an image with each pixel labeled with longitude and
  // latitude values.
  var lonLat = ee.Image.pixelLonLat();
  // Select the longitude and latitude bands, multiply by a large number then
  // truncate them to integers.
  var lonGrid = lonLat
    .select('longitude')
    .multiply(100000)
    .toInt();
  var latGrid = lonLat
    .select('latitude')
    .multiply(100000)
    .toInt();
  return lonGrid
    .multiply(latGrid)
    .reduceToVectors({
      geometry: geometry.buffer({distance:20000,maxError:1000}), //The buffer allows you to make sure the grid includes the borders of the AOI.
      scale: scale,
      geometryType: 'polygon',
    });
}
// Create grid and remove cells outside AOI
var Scale = 200000; // Set range in m to create spatial blocks
var grid = makeGrid(AOI, Scale);
var Grid = watermask.reduceRegions({collection: grid, reducer: ee.Reducer.mean()}).filter(ee.Filter.neq('mean',null));
right.addLayer(Grid, {},'Grid for spatil block cross validation', 0);
```



```JavaScript
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Section 5 - Fitting SDM models
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Define function to generate a vector of random numbers between 1 and 1000
function runif(length) {
    return Array.apply(null, Array(length)).map(function() {
        return Math.round(Math.random() * (1000 - 1) + 1);
    });
}

// Define SDM function
// Activate the desired classifier, random forest or gradient boosting. 
// Note that other algorithms are available in GEE. See ee.Classifiers on the documentation for more information.

function SDM(x) {
    var Seed = ee.Number(x);
    
    // Randomly split blocks for training and validation
    var GRID = ee.FeatureCollection(Grid).randomColumn({seed:Seed}).sort('random');
    var TrainingGrid = GRID.filter(ee.Filter.lt('random', split));  // Filter points with 'random' property < split percentage
    var TestingGrid = GRID.filter(ee.Filter.gte('random', split));  // Filter points with 'random' property >= split percentage

    // Presence
    var PresencePoints = ee.FeatureCollection(Data);
    PresencePoints = PresencePoints.map(function(feature){return feature.set('PresAbs', 1)});
    var TrPresencePoints = PresencePoints.filter(ee.Filter.bounds(TrainingGrid));  // Filter points with 'random' property < split percentage
    var TePresencePoints = PresencePoints.filter(ee.Filter.bounds(TestingGrid));  // Filter points with 'random' property >= split percentage

    // Pseudo-absences
    var TrPseudoAbsPoints = AreaForPA.sample({region: TrainingGrid, scale: GrainSize, numPixels: TrPresencePoints.size().add(300), seed:Seed, geometries: true, tileScale: 16}); // We add extra points to account for those points that land in masked areas of the raster and are discarded. This ensures a balanced presence/pseudo-absence data set
    TrPseudoAbsPoints = TrPseudoAbsPoints.randomColumn().sort('random').limit(ee.Number(TrPresencePoints.size())); //Randomly retain the same number of pseudo-absences as presence data 
    TrPseudoAbsPoints = TrPseudoAbsPoints.map(function(feature){
        return feature.set('PresAbs', 0);
        });
    
    var TePseudoAbsPoints = AreaForPA.sample({region: TestingGrid, scale: GrainSize, numPixels: TePresencePoints.size().add(100), seed:Seed, geometries: true, tileScale: 16}); // We add extra points to account for those points that land in masked areas of the raster and are discarded. This ensures a balanced presence/pseudo-absence data set
    TePseudoAbsPoints = TePseudoAbsPoints.randomColumn().sort('random').limit(ee.Number(TePresencePoints.size())); //Randomly retain the same number of pseudo-absences as presence data 
    TePseudoAbsPoints = TePseudoAbsPoints.map(function(feature){
        return feature.set('PresAbs', 0);
        });

    // Merge presence and pseudo-absence points
    var trainingPartition = TrPresencePoints.merge(TrPseudoAbsPoints);
    var testingPartition = TePresencePoints.merge(TePseudoAbsPoints);

    // Extract local covariate values from multiband predictor image at training points
    var trainPixelVals = predictors.sampleRegions({collection: trainingPartition, properties: ['PresAbs'], scale: GrainSize, tileScale: 16});

    // Classify using random forest
    var Classifier = ee.Classifier.smileRandomForest({
       numberOfTrees: 500, //The number of decision trees to create.
       variablesPerSplit: null, //The number of variables per split. If unspecified, uses the square root of the number of variables.
       minLeafPopulation: 10,//Only create nodes whose training set contains at least this many points. Integer, default: 1
       bagFraction: 0.5,//The fraction of input to bag per tree. Default: 0.5.
       maxNodes: null,//The maximum number of leaf nodes in each tree. If unspecified, defaults to no limit.
       seed: Seed//The randomization seed.
      });
    
    // Classify using a gradient boosting
    // var Classifier = ee.Classifier.smileGradientTreeBoost({
    //   numberOfTrees:500, //The number of decision trees to create.
    //   shrinkage: 0.005, //The shrinkage parameter in (0, 1) controls the learning rate of procedure. Default: 0.005
    //   samplingRate: 0.7, //The sampling rate for stochastic tree boosting. Default 0.07
    //   maxNodes: null, //The maximum number of leaf nodes in each tree. If unspecified, defaults to no limit.
    //   loss: "LeastAbsoluteDeviation", //Loss function for regression. One of: LeastSquares, LeastAbsoluteDeviation, Huber.
    //   seed:Seed //The randomization seed.
    // });
  
    // Presence probability 
    var ClassifierPr = Classifier.setOutputMode('PROBABILITY').train(trainPixelVals, 'PresAbs', bands); 
    var ClassifiedImgPr = predictors.select(bands).classify(ClassifierPr);
    
    // Binary presence/absence map
    var ClassifierBin = Classifier.setOutputMode('CLASSIFICATION').train(trainPixelVals, 'PresAbs', bands); 
    var ClassifiedImgBin = predictors.select(bands).classify(ClassifierBin);
   
    return ee.List([ClassifiedImgPr, ClassifiedImgBin, trainingPartition, testingPartition]);
}

// Define partition for training and testing data
var split = 0.70;  // The proportion of the blocks used to select training data

// Define number of repetitions
var numiter = 10;

// Fit SDM 
//var RanSeeds = runif(numiter);
//var results = ee.List(RanSeeds).map(SDM);

// While the runif function can be used to generate random seeds, we map the SDM function over random created numbers for reproducibility of results
var results = ee.List([35,68,43,54,17,46,76,88,24,12]).map(SDM);

// Extract results from list
var results = results.flatten();
//print(results); //Activate this line to visualize all elements

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Section 6 - Extracting and displaying model prediction results
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Habitat suitability

// Set visualization parameters
var visParams = {
  min: 0,
  max: 1,
  palette: ["#440154FF","#482677FF","#404788FF","#33638DFF","#287D8EFF",
  "#1F968BFF","#29AF7FFF","#55C667FF","#95D840FF","#DCE319FF"],
};

// Extract all model predictions
var images = ee.List.sequence(0,ee.Number(numiter).multiply(4).subtract(1),4).map(function(x){
  return results.get(x)});

// You can add all the individual model predictions to the map. The number of layers to add will depend on how many iterations you selected.

// left.addLayer(ee.Image(images.get(0)), visParams, 'Run1');
// left.addLayer(ee.Image(image.get(1)), visParams, 'Run2');

// Calculate mean of all individual model runs
var ModelAverage = ee.ImageCollection.fromImages(images).mean();

// Add final habitat suitability layer and presence locations to the map
left.addLayer(ModelAverage, visParams, 'Habitat Suitability');
left.addLayer(Data, {color:'red'}, 'Presence', 1);

// Create legend for habitat suitability map.
var legend = ui.Panel({style: {position: 'bottom-left', padding: '8px 15px'}});

legend.add(ui.Label({
  value: "Habitat suitability",
  style: {fontWeight: 'bold', fontSize: '18px', margin: '0 0 4px 0', padding: '0px'}
}));

legend.add(ui.Thumbnail({
  image: ee.Image.pixelLonLat().select(0),
  params: {
    bbox: [0,0,1,0.1],
    dimensions: '200x20',
    format: 'png',
    min: 0,
    max: 1,
    palette: ["#440154FF","#482677FF","#404788FF","#33638DFF","#287D8EFF",
  "#1F968BFF","#29AF7FFF","#55C667FF","#95D840FF","#DCE319FF"]
  },
  style: {stretch: 'horizontal', margin: '8px 8px', maxHeight: '40px'},
}));

legend.add(ui.Panel({
  widgets: [
    ui.Label('Low', {margin: '0px 0px', textAlign: 'left', stretch: 'horizontal'}),
    ui.Label('Medium', {margin: '0px 0px', textAlign: 'center', stretch: 'horizontal'}),
    ui.Label('High', {margin: '0px 0px', textAlign: 'right', stretch: 'horizontal'}),
    ],layout: ui.Panel.Layout.Flow('horizontal')
}));

legend.add(ui.Panel(
  [ui.Label({value: "Presence locations",style: {fontWeight: 'bold', fontSize: '16px', margin: '4px 0 4px 0'}}),
   ui.Label({style:{color:"red",margin: '4px 0 0 4px'}, value:'◉'})],
  ui.Panel.Layout.Flow('horizontal')));

left.add(legend);


// Distribution map

// Extract all model predictions
var images2 = ee.List.sequence(1,ee.Number(numiter).multiply(4).subtract(1),4).map(function(x){
  return results.get(x)});

// Calculate mean of all indivudual model runs
var DistributionMap = ee.ImageCollection.fromImages(images2).mode();

// Add final distribution map and presence locations to the map
right.addLayer(DistributionMap, 
  {palette: ["white", "green"], min: 0, max: 1}, 
  'Potential distribution');
right.addLayer(Data, {color:'red'}, 'Presence', 1);

// Create legend for distribution map
var legend2 = ui.Panel({style: {position: 'bottom-left',padding: '8px 15px'}});
legend2.add(ui.Label({
  value: "Potential distribution map",
  style: {fontWeight: 'bold',fontSize: '18px',margin: '0 0 4px 0',padding: '0px'}
}));

var colors2 = ["green","white"];
var names2 = ['Presence', 'Absence'];
var entry2;
for (var x = 0; x<2; x++){
  entry2 = [
    ui.Label({style:{color:colors2[x],margin: '4px 0 4px 0'}, value:'██'}),
    ui.Label({value: names2[x],style: {margin: '4px 0 4px 4px'}})
  ];
  legend2.add(ui.Panel(entry2, ui.Panel.Layout.Flow('horizontal')));
}

legend2.add(ui.Panel(
  [ui.Label({value: "Presence locations",style: {fontWeight: 'bold', fontSize: '16px', margin: '0 0 4px 0'}}),
   ui.Label({style:{color:"red",margin: '0 0 4px 4px'}, value:'◉'})],
  ui.Panel.Layout.Flow('horizontal')));

right.add(legend2);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Section 7 - Accuracy assessment
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Extract testing/validation datasets
var TestingDatasets = ee.List.sequence(3,ee.Number(numiter).multiply(4).subtract(1),4).map(function(x){
                      return results.get(x)});

// Double check that you have a satisfactory number of points for model validation
print('Number of presence and pseudo-absence points for model validation', ee.List.sequence(0,ee.Number(numiter).subtract(1),1)
.map(function(x){
  return ee.List([ee.FeatureCollection(TestingDatasets.get(x)).filter(ee.Filter.eq('PresAbs',1)).size(),
         ee.FeatureCollection(TestingDatasets.get(x)).filter(ee.Filter.eq('PresAbs',0)).size()]);
})
);

// Define functions to estimate sensitivity, specificity and precision.
function getAcc(img,TP){
  var Pr_Prob_Vals = img.sampleRegions({collection: TP, properties: ['PresAbs'], scale: GrainSize, tileScale: 16});
  var seq = ee.List.sequence({start: 0, end: 1, count: 25});
  return ee.FeatureCollection(seq.map(function(cutoff) {
  var Pres = Pr_Prob_Vals.filterMetadata('PresAbs','equals',1);
  // true-positive and true-positive rate, sensitivity  
  var TP =  ee.Number(Pres.filterMetadata('classification','greater_than',cutoff).size());
  var TPR = TP.divide(Pres.size());
  var Abs = Pr_Prob_Vals.filterMetadata('PresAbs','equals',0);
  // false-negative
  var FN = ee.Number(Pres.filterMetadata('classification','less_than',cutoff).size());
  // true-negative and true-negative rate, specificity  
  var TN = ee.Number(Abs.filterMetadata('classification','less_than',cutoff).size());
  var TNR = TN.divide(Abs.size());
  // false-positive and false-positive rate
  var FP = ee.Number(Abs.filterMetadata('classification','greater_than',cutoff).size());
  var FPR = FP.divide(Abs.size());
  // precision
  var Precision = TP.divide(TP.add(FP));
  // sum of sensitivity and specificity
  var SUMSS = TPR.add(TNR);
  return ee.Feature(null,{cutoff: cutoff, TP:TP, TN:TN, FP:FP, FN:FN, TPR:TPR, TNR:TNR, FPR:FPR, Precision:Precision, SUMSS:SUMSS});
  }));
}

// Calculate AUC of the Receiver Operator Characteristic
function getAUCROC(x){
  var X = ee.Array(x.aggregate_array('FPR'));
  var Y = ee.Array(x.aggregate_array('TPR')); 
  var X1 = X.slice(0,1).subtract(X.slice(0,0,-1));
  var Y1 = Y.slice(0,1).add(Y.slice(0,0,-1));
  return X1.multiply(Y1).multiply(0.5).reduce('sum',[0]).abs().toList().get(0);
}

function AUCROCaccuracy(x){
  var HSM = ee.Image(images.get(x));
  var TData = ee.FeatureCollection(TestingDatasets.get(x));
  var Acc = getAcc(HSM, TData);
  return getAUCROC(Acc);
}


var AUCROCs = ee.List.sequence(0,ee.Number(numiter).subtract(1),1).map(AUCROCaccuracy);
print('AUC-ROC:', AUCROCs);
print('Mean AUC-ROC', AUCROCs.reduce(ee.Reducer.mean()));

// Calculate AUC of Precision Recall Curve

function getAUCPR(roc){
  var X = ee.Array(roc.aggregate_array('TPR'));
  var Y = ee.Array(roc.aggregate_array('Precision')); 
  var X1 = X.slice(0,1).subtract(X.slice(0,0,-1));
  var Y1 = Y.slice(0,1).add(Y.slice(0,0,-1));
  return X1.multiply(Y1).multiply(0.5).reduce('sum',[0]).abs().toList().get(0);
}

function AUCPRaccuracy(x){
  var HSM = ee.Image(images.get(x));
  var TData = ee.FeatureCollection(TestingDatasets.get(x));
  var Acc = getAcc(HSM, TData);
  return getAUCPR(Acc);
}

var AUCPRs = ee.List.sequence(0,ee.Number(numiter).subtract(1),1).map(AUCPRaccuracy);
print('AUC-PR:', AUCPRs);
print('Mean AUC-PR', AUCPRs.reduce(ee.Reducer.mean()));

// Function to extract other metrics
function getMetrics(x){
  var HSM = ee.Image(images.get(x));
  var TData = ee.FeatureCollection(TestingDatasets.get(x));
  var Acc = getAcc(HSM, TData);
  return Acc.sort({property:'SUMSS',ascending:false}).first();
}

// Extract sensitivity, specificity and mean threshold values
var Metrics = ee.List.sequence(0,ee.Number(numiter).subtract(1),1).map(getMetrics);
print('Sensitivity:', ee.FeatureCollection(Metrics).aggregate_array("TPR"));
print('Specificity:', ee.FeatureCollection(Metrics).aggregate_array("TNR"));

var MeanThresh = ee.Number(ee.FeatureCollection(Metrics).aggregate_array("cutoff").reduce(ee.Reducer.mean()));
print('Mean threshold:', MeanThresh);


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Section 8 - Create a custom binary distribution map based on best threshold
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Calculating the potential distribution map based on the threshold 
// that maximizes the sum of sensitivity and specificity is computationally intensive and
// for large number of iterations may need to be executed using batch mode.
// In batch mode, the final image needs to exported to Google Drive and opened in 
// another software for visualization (or imported to GEE as an asset for visualization.

// Transform probability model output into a binary map using the defined threshold and set NA into -9999
var DistributionMap2 = ModelAverage.gte(MeanThresh);

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Section 9 - Export outputs
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Export final model predictions to drive

// Averaged habitat suitability
Export.image.toDrive({
  image: ModelAverage, //Object to export
  description: 'HSI', //Name of the file
  scale: GrainSize, //Spatial resolution of the exported raster
  maxPixels: 1e10,
  region: AOI //Area of interest
});

// Export final binary model based on a mayority vote
Export.image.toDrive({
  image: DistributionMap, //Object to export
  description: 'PotentialDistribution', //Name of the file
  scale: GrainSize, //Spatial resolution of the exported raster
  maxPixels: 1e10,
  region: AOI //Area of interest
});

// Export final binary model based on the threshold that maximises the sum of specificity and sensitivity
Export.image.toDrive({
  image: DistributionMap2.unmask(-9999),
  description: 'PotentialDistributionThreshold',
  scale: GrainSize,
  maxPixels: 1e10,
  region: AOI
});


// Export Accuracy Assessment Metrics

Export.table.toDrive({
  collection: ee.FeatureCollection(AUCROCs
                        .map(function(element){
                        return ee.Feature(null,{AUCROC:element})})),
  description: 'AUCROC',
  fileFormat: 'CSV',
});

Export.table.toDrive({
  collection: ee.FeatureCollection(AUCPRs
                        .map(function(element){
                        return ee.Feature(null,{AUCPR:element})})),
  description: 'AUCPR',
  fileFormat: 'CSV',
});

Export.table.toDrive({
  collection: ee.FeatureCollection(Metrics),
  description: 'Metrics',
  fileFormat: 'CSV',
});

// Export training and validation data sets

// Extract training datasets
var TrainingDatasets = ee.List.sequence(1,ee.Number(numiter).multiply(4).subtract(1),4).map(function(x){
  return results.get(x)});

// If you are interested in exporting any of the training or testing datasets used for modeling,
// you need to extract the feature collections from the SDM output list and export them.
// Here is an example for exporting the training and validation data sets from the first iteration. 
// For other iterations you need to change the number in the get function. In JavaScript the first element of the list is indexed by 0.

Export.table.toDrive({
  collection: TrainingDatasets.get(0),
  description: 'TestingDataRun1',
  fileFormat: 'CSV',
});

Export.table.toDrive({
  collection: TestingDatasets.get(0),
  description: 'TestingDataRun1',
  fileFormat: 'CSV',
});
/*
*/

```
