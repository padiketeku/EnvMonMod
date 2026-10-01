/**** Prac 07b — Fire frequency, seasonality and time since fire (Northern Territory)
 * Data: MODIS MCD64A1 v6.1 burned area (500 m, monthly, Nov 2000–present); ESA FireCCI51 (250 m, 2001–2020) as a cross-check.
 * NT savanna fire management splits the year at 1 August: early dry season (EDS) vs late dry season (LDS).
 *
 * WHAT THIS SCRIPT DOES:
 *   Describes the NT fire regime from 2001 to 2024: how often each place burns (frequency), how many years since it
 *   last burned, and what share of fires are late dry season (LDS). It charts area burned per year by season for the
 *   NT and western Arnhem Land, and compares two burned-area products (MCD64A1 vs FireCCI51) inside your tile.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) EDIT: TILE (section 4b) — paste your personal tile from prac00. Optionally START/END and the arnhem box.
 *   (3) Click Run. The NT-wide chart sums the whole Territory at 500 m and may take a minute.
 *   (4) Read the Console (right panel) for the charts, turn layers on/off in the Map's Layers list,
 *       and start the exports in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   - Map: fire frequency (number of years burned), share of fires in the LDS, years since last fire,
 *     and the western Arnhem Land box.
 *   - Console: stacked column charts of EDS/LDS area burned (km²) per year for western Arnhem Land and the NT,
 *     and a line chart comparing MCD64A1 and FireCCI51 burned area in your tile.
 *
 * DATA:
 *   - MODIS burned area MCD64A1 v6.1, MODIS/061/MCD64A1, 500 m, monthly, band BurnDate (day of year), 2001–2024 used.
 *   - ESA FireCCI51, ESA/CCI/FireCCI/5_1, 250 m, monthly, band BurnDate, 2001–2020.
 *   - FAO GAUL 2015 level 1 boundaries, FAO/GAUL/2015/level1 (NT outline).
 *
 * LINKS: pracs/prac07-fire-regime-burn-severity-frequency-and-seasonality.md (course repository).
 *   Feeds Prac 07 and AT4 Part 3.
 *
 * KEY GEE IDEAS:
 *   - Building an annual ImageCollection from a list of years with ee.List.sequence and map().
 *   - Summing yes/no (0/1) images over time to count events (frequency); max() to find the most recent year.
 *   - reduceRegion inside a map() over a collection to make a time series for a chart.
 *   - Equal-area projection (EPSG:3577) and scale choice in exports.
 *
 * Q = core (ENV306 and ENV506). EXT = ENV506 extension.
 ****/

// ---------- 1 Study area ----------
// The whole NT (from an administrative boundary dataset) plus a smaller box over western Arnhem Land.
var nt = ee.FeatureCollection('FAO/GAUL/2015/level1').filter(ee.Filter.eq('ADM1_NAME', 'Northern Territory'));
// Approximate western Arnhem Land box (digitise the WALFA boundary for real analysis)
var arnhem = ee.Geometry.Rectangle([133.0, -13.3, 134.3, -12.0]);   // [west, south, east, north] in degrees
Map.centerObject(nt, 5);

var START = 2001, END = 2024;   // EDIT: years analysed (MCD64A1 starts Nov 2000, so 2001 is the first full year)
var years = ee.List.sequence(START, END);   // server-side list [2001, 2002, …, 2024]

// ---------- 2 Data ----------
// Monthly MODIS burned area. BurnDate = day of year (1–366) a 500 m pixel burned; 0 = not burned that month.
var mcd = ee.ImageCollection('MODIS/061/MCD64A1').select('BurnDate');

// ---------- 3 Processing: one image per year ----------
// For each year, make 0/1 bands: burned at all, burned in the EDS, burned in the LDS, plus the year if burned.
// Summing these 0/1 images over all years later gives fire frequency.
var annual = ee.ImageCollection.fromImages(years.map(function(y) {
  y = ee.Number(y);   // inside a server-side map() the year arrives as a generic object; cast it to a number
  var bd = mcd.filter(ee.Filter.calendarRange(y, y, 'year')).max();   // day of year burned (0 = not burned)
  // Note: max() keeps the LAST burn date, so a pixel burnt in both EDS and LDS of one year counts as LDS.
  var burned = bd.gt(0).unmask(0).rename('burned');   // unmask(0): treat no-data as "not burned" so sums work
  var eds = bd.gt(0).and(bd.lt(213)).unmask(0).rename('eds');   // DOY < 213 = before 1 August (EDS)
  var lds = bd.gte(213).unmask(0).rename('lds');                // DOY ≥ 213 = from 1 August (LDS)
  var lastYear = burned.multiply(y).rename('yearBurned');       // the year if burned, else 0
  return burned.addBands([eds, lds, lastYear]).set('year', y)
    .set('system:time_start', ee.Date.fromYMD(y, 7, 1).millis());   // date stamp (1 July) so charts/filters work
}));

var frequency = annual.select('burned').sum().clip(nt).rename('fire_frequency');   // number of years burned (0–24)
var ldsFreq = annual.select('lds').sum().clip(nt);                                  // number of years burned in the LDS
var lastFire = annual.select('yearBurned').max().selfMask();   // most recent burn year; selfMask hides never-burned (0)
var timeSinceFire = ee.Image(END).subtract(lastFire).clip(nt).rename('years_since_fire');   // 0 = burned in END
// Proportion of fires that occur late in the dry season
var ldsShare = ldsFreq.divide(frequency).updateMask(frequency.gt(0)).rename('LDS_share');   // 0–1; masked where never burned

// ---------- 4 Analysis: area burned per year, EDS vs LDS ----------
// For each year, total the km² burned in the EDS and LDS inside a region, then chart them as stacked columns.
var areaKm2 = ee.Image.pixelArea().divide(1e6);   // pixel area in m² ÷ 1 000 000 = km²
function areaSeries(region, label) {
  var fc = annual.map(function(img) {
    // 0/1 band × pixel area = km² burned in that pixel; sum over the region. scale 500 = MODIS pixel size.
    var a = img.select(['eds', 'lds']).multiply(areaKm2).reduceRegion({
      reducer: ee.Reducer.sum(), geometry: region, scale: 500, maxPixels: 1e11});
    return ee.Feature(null, {year: img.get('year'), EDS_km2: a.get('eds'), LDS_km2: a.get('lds')});
  });
  print(ui.Chart.feature.byFeature(fc, 'year', ['EDS_km2', 'LDS_km2']).setChartType('ColumnChart')
    .setOptions({title: 'Area burned by season: ' + label, isStacked: true,
                 colors: ['#4daf4a', '#e41a1c'], vAxis: {title: 'km²'}}));   // green = EDS, red = LDS
  return fc;   // returned so the table can be exported in section 6
}
var arnhemSeries = areaSeries(arnhem, 'western Arnhem Land (approx.)');
var ntSeries = areaSeries(nt.geometry(), 'Northern Territory');

// ---------- 4b Product comparison: MCD64A1 vs ESA FireCCI51 (2001–2020) ----------
// FireCCI51 (250 m, MODIS red/NIR) maps smaller fires than MCD64A1 (500 m). AT4 Part 3 uses this check for your tile.
var TILE = ee.Geometry.Rectangle([131.0, -14.2, 131.2, -14.0]);   // replace with your tile from prac00
var cci = ee.ImageCollection('ESA/CCI/FireCCI/5_1');
// One feature per year with km² burned by each product, and km² where BOTH say burned (their overlap).
var compare = ee.FeatureCollection(ee.List.sequence(START, 2020).map(function(y) {
  y = ee.Number(y);
  var cciBurn = cci.filter(ee.Filter.calendarRange(y, y, 'year')).select('BurnDate').max().gt(0).unmask(0);   // 0/1
  var mcdBurn = mcd.filter(ee.Filter.calendarRange(y, y, 'year')).max().gt(0).unmask(0);                      // 0/1
  // scale 250 = the finer FireCCI pixel, so FireCCI is not coarsened; MCD64A1 pixels are simply resampled.
  var a = areaKm2.multiply(mcdBurn).rename('MCD64A1_km2')
    .addBands(areaKm2.multiply(cciBurn).rename('FireCCI51_km2'))
    .addBands(areaKm2.multiply(mcdBurn.and(cciBurn)).rename('both_km2'))
    .reduceRegion({reducer: ee.Reducer.sum(), geometry: TILE, scale: 250, maxPixels: 1e10});
  return ee.Feature(null, a).set('year', y);
}));
print(ui.Chart.feature.byFeature(compare, 'year', ['MCD64A1_km2', 'FireCCI51_km2', 'both_km2'])
  .setOptions({title: 'Burned area in your tile: MCD64A1 vs FireCCI51', vAxis: {title: 'km²'}, pointSize: 3}));
// Q: In which years do the products disagree most? Relate this to fire size and the season of burning.

// ---------- 5 Visualise ----------
// Map layers. Frequency uses selfMask so never-burned pixels are transparent.
Map.addLayer(frequency.selfMask(), {min: 1, max: 20, palette: ['#ffffb2', '#fecc5c', '#fd8d3c', '#f03b20', '#bd0026']},
  'Fire frequency ' + START + '–' + END + ' (years burned)');
// Green = mostly EDS fires, yellow = mixed, red = mostly LDS fires.
Map.addLayer(ldsShare, {min: 0, max: 1, palette: ['#1a9641', '#ffffbf', '#d7191c']}, 'Share of fires in late dry season', false);
// Red = burned recently, green = long unburnt (15+ years).
Map.addLayer(timeSinceFire, {min: 0, max: 15, palette: ['#d7191c', '#fdae61', '#a6d96a', '#1a9641']}, 'Years since last fire', false);
Map.addLayer(ee.Image().paint(arnhem, 0, 2), {palette: 'blue'}, 'Western Arnhem Land box');   // outline only

// ---------- 6 Export ----------
// One 3-band GeoTIFF for the NT and two CSV tables, all to Google Drive. Start each in the Tasks tab.
// region = NT bounding box; scale 500 = MODIS pixel size; .float() gives all bands one data type.
Export.image.toDrive({image: frequency.addBands(ldsShare).addBands(timeSinceFire).float(),
  description: 'Prac07b_fire_regime_NT', folder: 'GEE_NT', region: nt.geometry().bounds(),
  scale: 500, crs: 'EPSG:3577', maxPixels: 1e11});   // EPSG:3577 = GDA94 / Australian Albers (equal area)
Export.table.toDrive({collection: arnhemSeries, description: 'Prac07b_Arnhem_EDS_LDS', folder: 'GEE_NT'});   // CSV by default
Export.table.toDrive({collection: compare, description: 'Prac07b_tile_MCD64A1_vs_FireCCI51', folder: 'GEE_NT'});

// Q: Where in the NT do fires occur most often? Relate the pattern to rainfall and fuel (grass) production.
// Q: Describe the trend in the EDS vs LDS split in western Arnhem Land since 2006 (start of WALFA). What might explain it?
// Q: Why does the 500 m MODIS product miss many small early-season fires?
// EXT: Test whether the LDS share decreased after 2006 (Mann–Kendall, Prac 02a), and compare inside vs outside the project area (BACI-style design).
// EXT: Validate MCD64A1 against NAFI fire scars (Landsat/Sentinel-derived, firenorth.org.au) for one year; report omission and commission.
