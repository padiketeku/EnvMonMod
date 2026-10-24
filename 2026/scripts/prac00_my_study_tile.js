/**** Prac 00 — My study tile and years (run this first, in Prac 01, Session 4)
 * ENV306/506 Environmental Monitoring and Modelling (2026)
 * Every student gets a personal 20 km tile in the Daly River catchment and personal years / sites for the
 * summative assessments. The values are reproducible from your student number, so markers can re-run this
 * script (and the staff check-value coordinates) and check that your figures and numbers came from YOUR tile (AT1, AT3, AT4).
 * Paste your outputs into your AT2 proposal. Do not swap tiles or years without written approval.
 *
 * WHAT THIS SCRIPT DOES:
 *   Works out YOUR study area and YOUR years for the assessments. It splits the Daly River catchment (NT) into
 *   20 km × 20 km squares ("tiles"), then uses your student number to choose one tile, plus years, a species,
 *   a river and an urban site. Nothing is random: the same student number always gives the same answers.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository (File > Save as).
 *   (2) Edit ONE line only: STUDENT_NUMBER in section 0 (look for the line marked "EDIT HERE").
 *       Type your digits only — for s123456 type 123456. Do not change COHORT_SALT.
 *   (3) Click Run.
 *   (4) Read the Console (right panel) and copy every printed value into your AT2 proposal.
 *       Turn layers on/off in the Map's Layers list. Optionally start the "Prac00_my_tile" export in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   Map: the Daly catchment outline (blue), the 20 km tile grid (grey, off by default) and MY TILE (red).
 *   Console: number of tiles, your tile index and TILE_ID, your AT1/AT3/AT4 years, elective sites and species,
 *   an allocation code for the staff master sheet, and your tile's corner coordinates.
 *
 * DATA:
 *   'WWF/HydroATLAS/v1/Basins/level05 — HydroATLAS level-5 river basins (vector polygons, derived from ~15 arc-second
 *   (~500 m) elevation data; static, no time period). Only used to get the Daly catchment outline.
 *
 * LINKS:
 *   Prac page: pracs/prac01-earth-engine-image-processing-fundamentals-and-vegetation-dynamics.md (Session 4).
 *   Assessment: AT1–AT4 (your personal tile, years and AT4 settings).
 *
 * KEY GEE IDEAS:
 *   - FeatureCollection filtering with filterBounds (keep the basin that touches a point).
 *   - coveringGrid in a chosen projection (EPSG:3577 at 20 km) to make a regular tile grid.
 *   - Server-side ee.Number / ee.List maths: values are computed on Google's servers, then shown with print().
 *   - Exporting a feature to your Assets with Export.table.toAsset (start it in the Tasks tab).
 *   - Inspect data coverage of your site and identify areas of tile overlap
 *
 * Q = core (ENV306 and ENV506).  EXT = ENV506 extension.
 ****/

// ---------- 0 EDIT: your student number (digits only, e.g. s123456 → 123456) ----------
// This is the ONLY line you need to change. Replace 123456 with your own student number (no "s", no quotes).
// Everything below is calculated from this number, so a typo here gives you someone else's tile.
var STUDENT_NUMBER = 123456;   // <-- EDIT HERE
var COHORT_SALT = 2026;   // staff: change each year so tiles and years rotate between cohorts
// COHORT_SALT ("salt" = an extra number mixed in) is set by staff. Students: leave it alone.
// Because it changes each year, the same student number gets a different tile in a different year.

// ---------- 1 Daly River catchment and the 20 km tile grid ----------
// Find the Daly River catchment, then cover it with a grid of 20 km squares. Only squares lying almost
// fully inside the catchment are kept, so every tile is a fair, complete study area.
// HydroATLAS level-5 basin containing the Daly River near Oolloo. Staff: check the outline each year.
var daly = ee.FeatureCollection('WWF/HydroATLAS/v1/Basins/level05')
  .filterBounds(ee.Geometry.Point([131.25, -14.07]));   // keep only the basin that contains this point (near Oolloo)
var dalyGeom = daly.geometry();   // turn the basin feature(s) into one geometry (an outline) we can measure against
var proj = ee.Projection('EPSG:3577').atScale(20000);   // GDA94 / Australian Albers, 20 km cells
// EPSG:3577 is an equal-area projection for Australia (units are metres), so every 20 km cell has the same area.
var gridAlbers = dalyGeom.coveringGrid(proj)   // make a grid of 20 km squares that covers the whole catchment
  .map(function(cell) {   // map() runs this function on every grid cell
    // inside = fraction of the cell's area that falls inside the catchment (0 = none, 1 = all).
    // The "100" values are the error margin (in metres) GEE may use when computing the shapes and areas.
    var inside = cell.geometry().intersection(dalyGeom, 100).area(100).divide(cell.geometry().area(100));
    return cell.set('inside', inside);   // store the fraction as a property of the cell
  })
  .filter(ee.Filter.gt('inside', 0.99))   // keep only cells more than 99% inside the catchment (drops edge cells)
  .sort('system:index');   // put the tiles in a fixed order, so "tile number 5" always means the same square

// The Australian Albers projection lets us confidently establish equal 20 km cells.
// However, our cells inheret the projected coordinate system describing a flattened surface covering Australia.
// To ensure our cells can be accuratley positioned on the globe from corner coordinates we transform the grid to WGS84,
// a geographic coordinate system common across sensors (e.g. Landsat, Sentinel) using lat lon to descibe the globe.
var grid = gridAlbers.map(function(cell){    // .map() to again apply the function to all grid cells
  // Each cell is returned with geometry set to the WGS 84 transform (i.e. 'EPSG:4326').
  // A tolerance of 10 is set to keep corners without adding extra points where edges curve to fit the globe. 
  return cell.setGeometry(cell.geometry().transform('EPSG:4326', 10));
}).sort('system:index'); // retain the order we specified earlier

var n = grid.size();   // how many tiles are available to choose from

// ---------- 2 Deterministic picks ----------
// "Deterministic" means: no randomness. The same student number always gives the same picks.
// The idea: multiply your student number by a fixed number, add the cohort salt, then take the remainder
// after dividing by the length of the list (that is what mod() does). The remainder is always between 0 and
// (length − 1), so it can be used as a position in the list. Example: list of 4 years, remainder 2 → the 3rd year.
// Each pick uses a different multiplier (k), so your tile, years and sites do not all move together.
function pick(list, k) {
  list = ee.List(list);   // make sure the list is a server-side ee.List
  // position = (STUDENT_NUMBER × k + COHORT_SALT) mod (number of items); then return the item at that position
  return list.get(ee.Number(STUDENT_NUMBER).multiply(k).add(COHORT_SALT).mod(list.length()));
}
// Your tile: same recipe, using the multiplier 7919 (a prime number, which spreads students across tiles).
var tileIndex = ee.Number(STUDENT_NUMBER).multiply(7919).add(COHORT_SALT).mod(n);   // a number from 0 to n − 1
var tile = ee.Feature(grid.toList(n).get(tileIndex));   // take the tile at that position in the sorted grid
var TILE = tile.geometry();   // your tile's square outline — later scripts call this TILE

// Your assessment years and sites. Each line picks one item from a list using pick(list, multiplier).
var at3Year = ee.Number(pick(ee.List.sequence(2005, 2024), 31));          // AT3 focus year
var at1Gap = ee.Number(pick([5, 6, 7, 8], 17));   // number of years between your two AT1 dates
var at1YearA = ee.Number(pick(ee.List.sequence(2014, ee.Number(2024).subtract(at1Gap)), 37));   // Landsat 8/9 era
// YEAR_A is chosen from 2014 up to (2024 − gap), so that YEAR_B = YEAR_A + gap is never later than 2024.
var at1YearB = at1YearA.add(at1Gap);                                                               // ≤ 2024
var clearingStart = ee.Number(pick([2016, 2017, 2018, 2019], 13));   // first year of your 5-year clearing period
var fireStart = ee.Number(pick([2003, 2005, 2007, 2009, 2011, 2013], 11));   // first year of your 10-year fire window
var crocRiver = pick(['Adelaide', 'Mary', 'Daly', 'Liverpool', 'Blyth', 'Glyde'], 19);   // elective (c) river system
var urbanSite = pick(['Palmerston', 'Darwin northern suburbs', 'Litchfield rural fringe', 'Katherine', 'Alice Springs', 'Nhulunbuy'], 23);
// Elective (d): urbanSite (above) is your town; urbanPair (below) is your [start year, end year].
var urbanPair = ee.List(pick([[2016, 2024], [2017, 2025], [2018, 2025], [2016, 2023]], 29));
// Elective (a) species: staff check Atlas of Living Australia record counts (and coordinate generalisation of
// sensitive species) before the cohort starts, and edit this list if needed.
var species = pick(['Gouldian finch (Erythrura gouldiae)', 'Partridge pigeon (Geophaps smithii)',
                    'Northern quoll (Dasyurus hallucatus)', 'Black-footed tree-rat (Mesembriomys gouldii)',
                    'Brush-tailed rabbit-rat (Conilurus penicillatus)', 'Red goshawk (Erythrotriorchis radiatus)'], 43);
var alphaPair = ee.List(pick([[2017, 2024], [2018, 2024], [2017, 2023], [2019, 2024]], 41));   // elective (b) year pair

// ---------- 3 Print (copy these into your AT2 proposal) ----------
// print() sends each value to the Console. The values are worked out on Google's servers, so they may take
// a few seconds to appear. Copy all of them into your AT2 proposal.
print('Student number', STUDENT_NUMBER, 'cohort', COHORT_SALT);   // check this is YOUR number before copying anything
print('Tiles available in the Daly catchment', n);
print('Your tile index', tileIndex, 'tile centroid (lon, lat)', TILE.centroid(1).coordinates());   // centre point, degrees
print('AT1 transition years (Prac 05): YEAR_A, YEAR_B', at1YearA, at1YearB);
print('AT3 focus year (Pracs 02–03)', at3Year);
print('AT4 Part 2 clearing period (Prac 06)', clearingStart, '→', clearingStart.add(4));   // 5 years, inclusive
print('AT4 Part 3 fire window (Prac 07)', fireStart, '→', fireStart.add(9));   // 10 years, inclusive
print('AT4 elective (a) species (Prac 12)', species);
print('AT4 elective (b) AlphaEarth years (Prac 13)', alphaPair);
print('AT4 elective (c) focal river system (Prac 09)', crocRiver);
print('AT4 elective (d) urban site and years (Prac 10)', urbanSite, urbanPair);
// TILE_ID is your tile index written with 3 digits, e.g. tile 7 → "DALY-007".
// AT4 check-in group (A or B) is allocated by staff from the class list and posted in Learnline by Fri 6 Nov.
print('AT4 morning check-in group', 'see Learnline. Group A: Mon 9 and Thu 12 Nov; Group B: Tue 10 and Fri 13 Nov (9:00–10:00)');
var TILE_ID = ee.String('DALY-').cat(tileIndex.int().format('%03d'));
print('Your TILE_ID (label every figure with it and your student ID)', TILE_ID);
// Allocation code = tile index × 1000 + (last two digits of AT3 year) × 10 + AT1 gap. Staff use it to check your allocation.
print('Allocation code (staff master sheet)', tileIndex.multiply(1000).add(at3Year.mod(100).multiply(10)).add(at1Gap));

// ---------- 4 Map ----------
// Draw the catchment, the grid and your tile so you can see where you will be working.
Map.centerObject(TILE, 10);   // zoom to your tile (zoom level 10 ≈ the whole 20 km square on screen)
// style() draws outlines; fillColor '00000000' is fully transparent (the last two hex digits are opacity).
Map.addLayer(daly.style({color: '#08519c', fillColor: '00000000', width: 2}), {}, 'Daly catchment (HydroATLAS level 5)');
// The grid layer starts switched off (false); MY TILE has a light red, mostly see-through fill ('ff000022').
Map.addLayer(grid.style({color: '#999999', fillColor: '00000000', width: 1}), {}, '20 km tile grid', false);
Map.addLayer(ee.FeatureCollection([tile]).style({color: 'red', fillColor: 'ff000022', width: 3}), {}, 'MY TILE');
Map.setOptions('HYBRID');   // satellite basemap with labels

// Save TILE for other scripts: Export the tile as an asset (optional), or copy its corner coordinates.
print('Your tile corners (paste into later scripts as ee.Geometry.Polygon)', TILE.coordinates());   // lon, lat pairs
print('Note you have 5 coordinates for 4 corners. The first is the same as the last to close the the tile polygon');
// This export does not run by itself: open the Tasks tab and click RUN next to "Prac00_my_tile".
// It saves your tile as a table called "my_tile" in your Assets, which later scripts can load.
Export.table.toAsset({collection: ee.FeatureCollection([tile]), description: 'Prac00_my_tile', assetId: 'my_tile'});

// ---------- 5 Inspect Data Coverage ----------

// Satellite imagery is acquired over multiple orbits and often delivered as individual tiles.
// To ensure full coverage, tiles often have areas of overlap which can hold exact duplicates of the neighbouring tile.
// These areas of overlap can cause issues for landscape-scale anaylsis.
// Knowing where they are and how they affect your site is the first step in solving these problems. 
// The below code will highlight the geometric footprints of Landsat and Sentinel-2 imagery over the Daly.
// In prep for your assignments, we'll help identify any problem areas for your TILE and the steps needed to correct them. 

// We'll start with Sentinel-2, which delivers imagery based on the Military Grid Reference System (MGRS).

// Over a given year, we can be quite confident that all tiles will be imaged for a given region, here 2024 and the Daly catchment
var s2 = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED").filterBounds(daly).filterDate('2024-01-01', '2025-01-01');
// Metadata structures are reliably constant. To inspect metadata properties from a dataset we can inspect any random image
// or we can use the search bar at the top of your screen, select the dataset, and select the properties tab
// print the first image in the 2024 S2 dataset and inspect the metadata (click drop down arrow > properties)
print('First S2 image to inspect metadata:', s2.first());
// First we want to know how many different orbit paths occur over the Daly ('SENSING_ORBIT_NUMBER' value in metadata)
// aggregate_array filters on a metadata property and distinct() lets us see all unique values for that property
print('S2 orbits', s2.aggregate_array('SENSING_ORBIT_NUMBER').distinct()); // for the Daly we have orbits 131 and 31
// We can also check which specific tiles cover the site
print('S2 tiles:', s2.aggregate_array('MGRS_TILE').distinct()); // 16 S2 tiles cover the Daly

// MGRS is a global gridding system that doesn't reflect satellite acquisitions, we need to check them by specific orbit
// We want to know the tiles that belong to orbit 131. We also want a list of them that we can use in later code
// ee.List() gives us a list to use later. Filter.eq() returns only images where 'SENSING_ORBIT_NUMBER' = 131
var tiles131 = ee.List(s2.filter(ee.Filter.eq('SENSING_ORBIT_NUMBER', 131))
// now we're only looking at imagery from orbit 131, we can aggregate for distinct MGRS_TILE labels
  .aggregate_array('MGRS_TILE').distinct());
// print the list to see which tiles belong to orbit 131
print('Orbit 131 tiles:', tiles131); // 13 tiles for orbit 131

// Same steps as above, but for orbit 31
var tiles31 = ee.List(s2.filter(ee.Filter.eq('SENSING_ORBIT_NUMBER', 31))
  .aggregate_array('MGRS_TILE').distinct());
print('Orbit 31 tiles list:', tiles31); // 6 tiles for orbit 31. 
// 13 + 6 = 19? If we had 16 total over the Daly we clearly have overlap

// See which tiles are in both orbits using the .inList() filter
var sharedTiles = tiles131.filter(ee.Filter.inList('item', tiles31));
print('Tiles in both orbit 131 and 31:', sharedTiles); // 3 shared, that explains the 19 tiles

// To visualise tile boundaries we'll use the footprint geometry for each
// this function takes an orbit number as input and give us footprint polygon for each tile
function s2Footprint(orbit) {
  return function(mgrs_tile) {
    var image = s2
      .filter(ee.Filter.eq('SENSING_ORBIT_NUMBER', orbit))
      .filter(ee.Filter.eq('MGRS_TILE', mgrs_tile))
      .first();
    return ee.Feature(image.geometry());
  };
}
// Specify the output as a feature collection (collection of vectors not of images) and specify each orbit
var fp131 = ee.FeatureCollection(tiles131.map(s2Footprint(131)));
var fp31  = ee.FeatureCollection(tiles31.map(s2Footprint(31)));

// Add tile footprints from each S2 orbit to the map. Orbit 131 tiles are orange and orbit 31 tiles are purple
Map.addLayer(fp131.style({color: 'orange', fillColor: '00000000', width: 2}), {}, 'S2 orbit 131 tiles', false);
Map.addLayer(fp31.style({color: 'purple', fillColor: '00000000', width: 2}), {}, 'S2 orbit 31 tiles', false);

// You should be able to clearly see the tiles that require partial coverage from both orbits for full data coverage.
// You might also notice the overlap in orbit 131's Eastern most tile rows.
// This is due to a shift in UTM zone (52 to 53) in the MGRS grid.
// If this seems annoying, that's only because it is!
// Bauer-Marschallinger & Falkner state in no uncertain terms just how wasteful the MGRS system is in their 2023 paper:
// "Wasting petabytes: A survey of the Sentinel-2 UTM tiling grid and its spatial overhead" 
//  https://www.sciencedirect.com/science/article/pii/S0924271623001971?via%3Dihub
// The positive trade off is that S2 imagery is delivered in constant tile geometries. 


// Landsat uses a system specific World Reference System (WRS), based on path and row.
// This is also a static grid but scenes can shift slightly.
// Using the same imagery footprint trick we can still get a good idea of general coverage.

// Because WRS is defined by a separate PATH and ROW value, it can be annoying to filter.
// To make life easier, we can give each tile a unique ID by combining both
// this function joins the WRS_PATH and WRS_ROW value (to 3 digits each) and gives us a single Tile_ID
function IDl8(image) {
  var path = ee.Number(image.get('WRS_PATH')).format('%03d');
  var row = ee.Number(image.get('WRS_ROW')).format('%03d');
  var ID = ee.String(path).cat('_').cat(row);
  return image.set({'Tile_ID': ID});
}
// Filter landsat 8 imagery to the same year, site, and map the Tile_ID function over the images
var l8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2").filterBounds(daly).filterDate('2024-01-01', '2025-01-01').map(IDl8);
// Check out original WRS values and the Tile_ID value we added to the metadata
print('First L8 image to inspect metadata:', l8.first());
// Check how many tiles we have and their names - NOTE: Orbit is WRS_PATH so we don't need to filter to orbit for Landsat
var l8tiles = ee.List(l8.aggregate_array('Tile_ID').distinct());
print(l8tiles, 'l8 tiles');

// To visualise tile boundaries we'll use the footprint geometry for each image
// this function takes a single Tile_ID and returns the footprint of the first image for that tile
function l8Footprint(wrs_tile) {
  var image = l8
    .filter(ee.Filter.eq('Tile_ID', wrs_tile))
    .first();
  return ee.Feature(image.geometry(), {Tile_ID: wrs_tile});
}
// Map over the list of tile IDs
var l8fp = ee.FeatureCollection(l8tiles.map(l8Footprint));
Map.addLayer(l8fp.style({color: 'yellow', fillColor: '00000000', width: 2}), {}, 'L8 tiles', false);


// ---------- 6 Inspect YOUR TILE Coverage ---------- 
// How do potential tile overlaps affect YOUR TILE?
// You can simply change .filterBounds() regions from 'Daly' to 'TILE' on lines 169 for s2 and 242 for L8.
// Hit 'Run' after these changes and see how your tile is affected by data overlaps. 
// NOTE: you may get some errors or empty lists, specifically for Sentinel 2 orbits no longer relevant to your tile. 


