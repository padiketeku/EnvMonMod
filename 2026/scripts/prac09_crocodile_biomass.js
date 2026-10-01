/**** Prac 09 — Crocodile biomass modelling with SAR floodplain inundation (eight NT tidal rivers, 2009–2022)
 * ENV306/506 Environmental Monitoring and Modelling (2026)
 * Question: does wet-season floodplain inundation explain crocodile biomass per km of river,
 *           between rivers and between years?
 * Part A: Sentinel-1 flood-mapping workflow (Adelaide River, August 2017) — after UN-SPIDER.
 * Units: SAR statistics in linear σ⁰; dB for display only (see the SAR units convention below).
 * Part B: floodplain metrics (JRC optical, Sentinel-1 SAR) for every river × survey-year record → regression.
 *
 * DATA (restricted — download from Learnline; do NOT post publicly or commit to GitHub):
 *   croc-biomass-data.csv            River, Year, Distance_surveyed, Crocodiles_seen, Total_biomass, Abundance, Biomass_km
 *   flooded_areas_shapefiles.zip     flooded_<River>_river polygons for Adelaide, Mary, Daly, Glyde, Liverpool, Blyth
 * Activity 9.0: upload the CSV (no geometry columns) and the six shapefiles as assets, then edit ROOT.
 *
 * Acknowledgements: Google Earth Engine developers and team; UN-SPIDER Recommended Practice on Sentinel-1
 * flood mapping in GEE (adapted); Tim Palmer (methodology and original GEE code); Cameron Baker (crocodile data).
 * Q = core (ENV306 and ENV506).  EXT = ENV506 extension.
 ****/

// ---------- 0 Parameters: EDIT ROOT ----------
var ROOT = 'projects/YOUR_PROJECT/assets/';           // your asset folder (with trailing slash)
var CROC_ASSET = ROOT + 'croc-biomass-data';
var FLOOD_ASSETS = {
  Adelaide:  ROOT + 'flooded_Adelaide_river',
  Mary:      ROOT + 'flooded_Mary_river',
  Daly:      ROOT + 'flooded_Daly_river',
  Liverpool: ROOT + 'flooded_Liverpool_river',
  Tomkinson: ROOT + 'flooded_Liverpool_river',   // Tomkinson shares the Liverpool floodplain zone
  Blyth:     ROOT + 'flooded_Blyth_river',
  Cadell:    ROOT + 'flooded_Blyth_river',       // Cadell shares the Blyth floodplain zone
  Glyde:     ROOT + 'flooded_Glyde_river'
};
var RIVERS = Object.keys(FLOOD_ASSETS);

// Sentinel-1 flood-mapping settings (Part A; reused in Part B)
var BAND = 'VH', PASS = 'DESCENDING', KERNEL = 3;   // boxcar window size in pixels (3 × 3)
var DROP_DB = 3;           // flood = VH darkens by at least 3 dB: linear after ÷ before < dbToLin(−3) = 0.50
var PERM_MONTHS = 10;      // JRC seasonality ≥ this = permanent water (removed)
var MAX_SLOPE = 5;         // degrees
var MIN_CONNECTED = 8;     // pixels

// Floodplain zone of each river = convex hull of its flooded-area polygons
var ZONES = {};
RIVERS.forEach(function(r) {
  ZONES[r] = ee.FeatureCollection(FLOOD_ASSETS[r]).geometry().convexHull(100);
});

var dem = ee.Image('AU/GA/DEM_1SEC/v10/DEM-H').select('elevation');
var slope = ee.Terrain.slope(dem);
var permanent = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('seasonality').gte(PERM_MONTHS).unmask(0);
var haImg = ee.Image.pixelArea().divide(1e4);

// ---------- SAR units convention (ENV306/506) ----------
// COPERNICUS/S1_GRD stores backscatter (σ⁰) in dB. Averages, medians of composites, ratios, filters, thresholds and
// all statistics are computed in LINEAR power units; dB is used ONLY for display (map layers, chart axes).
// Thresholds quoted in dB in the literature are converted to linear with dbToLin().
function toLinear(img) {   // 10^(dB/10); keeps metadata (orbit, pass, date) for later filters
  img = ee.Image(img);
  return ee.Image(img.multiply(Math.LN10 / 10).exp().copyProperties(img, ['system:time_start'])).copyProperties(img);
}
function toDb(img) { return ee.Image(img).log10().multiply(10); }                                                    // display only
function dbToLin(x) { return Math.pow(10, x / 10); }

var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.eq('orbitProperties_pass', PASS))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', BAND))
  .filter(ee.Filter.eq('resolution_meters', 10))
  .select(BAND)
  .map(toLinear);   // linear σ⁰ from here on

// Flood map from two linear-σ⁰ mosaics (UN-SPIDER workflow, linear-unit ratio)
function floodMap(before, after) {
  // 3 × 3 boxcar mean on LINEAR σ⁰ to reduce speckle (averaging must be done in linear power)
  var r = (KERNEL - 1) / 2;
  var b = before.focalMean({radius: r, kernelType: 'square', units: 'pixels'});
  var a = after.focalMean({radius: r, kernelType: 'square', units: 'pixels'});
  // Change ratio in linear units: open water is specular and dark, so after ÷ before falls well below 1.
  // (A ratio of dB values is not a ratio of backscatter, so always divide linear values.)
  var ratio = a.divide(b);
  var flood = ratio.lt(dbToLin(-DROP_DB))
    .where(permanent, 0)
    .selfMask();
  flood = flood.updateMask(flood.connectedPixelCount(MIN_CONNECTED + 1, true).gte(MIN_CONNECTED));
  flood = flood.updateMask(slope.lte(MAX_SLOPE));
  return flood.rename('flood');
}
function areaHa(maskImg, region, scale) {
  return ee.Number(haImg.updateMask(maskImg).reduceRegion({
    reducer: ee.Reducer.sum(), geometry: region, scale: scale, maxPixels: 1e11, tileScale: 8
  }).get('area'));
}

// ======================= Part A — Adelaide River, August 2017 =======================
var adel = ZONES.Adelaide;
Map.centerObject(adel, 9);
Map.addLayer(ee.FeatureCollection(FLOOD_ASSETS.Adelaide).style({color: '#08519c', fillColor: '6baed655'}), {}, 'A: Adelaide flooded-area polygons');
Map.addLayer(ee.FeatureCollection([ee.Feature(adel)]).style({color: 'black', fillColor: '00000000'}), {}, 'A: Adelaide floodplain zone (convex hull)');

var beforeA = s1.filterBounds(adel).filterDate('2017-07-01', '2017-07-31').mosaic().clip(adel);
var afterA  = s1.filterBounds(adel).filterDate('2017-08-01', '2017-08-31').mosaic().clip(adel);
Map.addLayer(toDb(beforeA), {min: -25, max: -10}, 'A: VH before (Jul 2017, dB)', false);
Map.addLayer(toDb(afterA),  {min: -25, max: -10}, 'A: VH after (Aug 2017, dB)', false);
Map.addLayer(toDb(afterA.divide(beforeA)), {min: -8, max: 8, palette: ['#08519c', '#ffffff', '#a50f15']}, 'A: VH change 10·log10(after/before) (dB)', false);
var floodA = floodMap(beforeA, afterA).clip(adel);
Map.addLayer(floodA, {palette: '#2171b5'}, 'A: Flooded area Aug 2017');
print('A: Flooded area, Adelaide Aug 2017 (ha)', areaHa(floodA, adel, 10));
// Q: Some published scripts divide dB values and test > 1.25. Show with before = −15 dB that this equals a 3.75 dB drop, but with
//    before = −10 dB only a 2.5 dB drop. Why is a ratio of linear σ⁰ (a fixed dB drop) the physically consistent choice?
// Q: Vary DROP_DB (2, 3, 4). How much does the flooded area change, and which other settings matter most?

// ======================= Part B — eight rivers, 2009–2022 =======================
// ---------- B1 Floodplain zones ----------
var zoneFc = ee.FeatureCollection(RIVERS.map(function(r) {
  return ee.Feature(ZONES[r], {River: r, zone_km2: ZONES[r].area(100).divide(1e6)});
}));
print('B1: Floodplain zones (km²) — note shared zones', zoneFc.select(['River', 'zone_km2'], null, false));
Map.addLayer(zoneFc.style({color: 'black', fillColor: '00000000', width: 1}), {}, 'B1: All floodplain zones', false);

// ---------- B2 Survey table + floodplain metrics ----------
var croc = ee.FeatureCollection(CROC_ASSET);
// If ingestion kept a byte-order mark, the first column may be named '﻿River'. Check the printed property names.
print('B2: Croc records (expect 42)', croc.size(), 'properties', croc.first().propertyNames());

var zoneDict = ee.Dictionary(RIVERS.reduce(function(d, r) { d[r] = ZONES[r]; return d; }, {}));
var jrcYearly = ee.ImageCollection('JRC/GSW1_4/YearlyHistory');   // waterClass: 1 not water, 2 seasonal, 3 permanent

function addMetrics(f) {
  var river = ee.String(f.get('River'));
  var year = ee.Number.parse(ee.String(ee.Number(f.get('Year')).format('%d'))).int();
  var zone = ee.Geometry(zoneDict.get(river));

  // JRC seasonal water (optical, 1984–2021) for the calendar year of the survey
  var jy = year.min(2021);
  var jImg = jrcYearly.filter(ee.Filter.calendarRange(jy, jy, 'year')).first();
  var jrcHa = ee.Algorithms.If(year.gt(2021), null,
    areaHa(ee.Image(jImg).select('waterClass').eq(2), zone, 30));

  // Sentinel-1 peak inundation: darkest VH Jan–Apr of the survey year vs Sep–Oct baseline of the previous year
  var ys = year.max(2016);
  var base = s1.filterBounds(zone).filterDate(ee.Date.fromYMD(ys.subtract(1), 9, 1), ee.Date.fromYMD(ys.subtract(1), 11, 1));
  var wet  = s1.filterBounds(zone).filterDate(ee.Date.fromYMD(ys, 1, 1), ee.Date.fromYMD(ys, 5, 1));
  var s1Ha = ee.Algorithms.If(year.lt(2016), null,
    ee.Algorithms.If(base.size().eq(0).or(wet.size().eq(0)), null,
      areaHa(floodMap(base.median(), wet.min()), zone, 30)));

  return f.set({Year: year, zone_km2: zone.area(100).divide(1e6),
                jrc_seasonal_ha: jrcHa, s1_peak_ha: s1Ha});
}
var table = croc.map(addMetrics);
print('B2: River × year table with floodplain metrics', table);
Export.table.toDrive({collection: table, description: 'Prac09_croc_floodplain_table', folder: 'GEE_NT',
  selectors: ['River', 'Year', 'Distance_surveyed', 'Crocodiles_seen', 'Total_biomass', 'Abundance', 'Biomass_km',
              'zone_km2', 'jrc_seasonal_ha', 's1_peak_ha']});

// ---------- B3 Explore and model ----------
var jrcOk = table.filter(ee.Filter.notNull(['jrc_seasonal_ha']));
var s1Ok = table.filter(ee.Filter.notNull(['s1_peak_ha']));
print(ui.Chart.feature.groups(jrcOk, 'jrc_seasonal_ha', 'Biomass_km', 'River').setChartType('ScatterChart')
  .setOptions({title: 'Biomass per km vs JRC seasonal floodplain water (by river)', pointSize: 5,
               hAxis: {title: 'Seasonal water in zone (ha)'}, vAxis: {title: 'Biomass (kg/km)'}}));
print(ui.Chart.feature.byFeature(table.filter(ee.Filter.eq('River', 'Adelaide')).sort('Year'), 'Year', ['Biomass_km'])
  .setOptions({title: 'Adelaide River: biomass per km by survey year', pointSize: 4}));

function regress(fc, xName, label) {
  var fit = fc.reduceColumns(ee.Reducer.linearFit(), [xName, 'Biomass_km']);
  var cor = fc.reduceColumns(ee.Reducer.pearsonsCorrelation(), [xName, 'Biomass_km']);
  print(label + ' (n = ', fc.size(), ') slope, intercept:', fit, 'Pearson r and two-sided p:', cor);
}
regress(jrcOk, 'jrc_seasonal_ha', 'B3: All rivers, JRC');
regress(s1Ok, 's1_peak_ha', 'B3: All rivers, Sentinel-1');
regress(jrcOk.filter(ee.Filter.eq('River', 'Adelaide')), 'jrc_seasonal_ha', 'B3: Adelaide only, JRC');

// ---------- B4 Optical vs SAR ----------
var both = table.filter(ee.Filter.notNull(['jrc_seasonal_ha', 's1_peak_ha']));
print(ui.Chart.feature.byFeature(both, 'jrc_seasonal_ha', 's1_peak_ha').setChartType('ScatterChart')
  .setOptions({title: 'JRC seasonal water vs Sentinel-1 peak inundation (2016–2021)', pointSize: 5, trendlines: {0: {}},
               hAxis: {title: 'JRC (ha)'}, vAxis: {title: 'Sentinel-1 (ha)'}}));

// Q: Why is Sentinel-1 needed in the wet season? Why VH, one pass, a boxcar filter, and a ratio rather than a difference?
// Q: Why is Biomass_km a better response than Total_biomass?
// Q: Is the relationship the same between rivers (pooled) and within the Adelaide over time? Why might they differ?
// Q: Liverpool/Tomkinson and Blyth/Cadell share a zone. What does that do to the independence of the records?
// Q: Why might JRC (optical) and Sentinel-1 (SAR) disagree in the wet season?
// EXT: Export the table and fit river fixed effects and river random intercepts (Python/R versions). How does the slope change?
// EXT: Test lags of 1–2 wet seasons (shift the year used for the metrics). Which lag fits best, and is it plausible?
// EXT: Replace the convex-hull zone with the flooded polygons themselves and with a 1 km buffer; quantify coefficient sensitivity.
// EXT: Express inundation as a share of zone area (ha / zone_km2) and compare. Which is defensible, and why (MAUP)?
