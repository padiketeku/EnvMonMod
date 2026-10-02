[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 02](prac02-monitoring-vegetation-condition-trends-and-seasonality.md) · [Prac 04 →](prac04-land-cover-mapping-and-landscape-metrics.md)

# Prac 03: Climate and hydrology drivers: rainfall anomalies, drought indices, LST and ET

**When:** Tue 3 Nov 2026, Session 4 (rainfall and drought) and Wed 4 Nov 2026, Session 3 (LST and ET) · **Scripts:** [`prac03a_rainfall_anomaly.js`](../scripts/prac03a_rainfall_anomaly.js), [`prac03b_drought_indices.js`](../scripts/prac03b_drought_indices.js), [`prac03c_lst_et.js`](../scripts/prac03c_lst_et.js) · **ULOs:** 1, 3, 4

**Also available in:** Python [`prac03_climate_hydrology_drought.py`](../alternatives/python/prac03_climate_hydrology_drought.py) · R [`prac03_climate_hydrology_drought.R`](../alternatives/r/prac03_climate_hydrology_drought.R) · QGIS [recipe](../alternatives/qgis/README.md). The Code Editor remains the main environment.

**Purpose.** Explain the climate drivers behind the vegetation trends of Prac 02, and supply rainfall for RESTREND. With Prac 02, this prac is the basis of AT3.

## 1. Concept notes

Vegetation condition is the state of vegetation relative to what is expected for that place and season. In the NT, condition is driven by rainfall amount and *reliability*. Mean rainfall falls from more than 1,500 mm at Darwin to less than 300 mm at Alice Springs, while variability rises southward.

**Rainfall anomalies.** An anomaly can be expressed in mm, as a % of the mean, as a z-score or as a decile. All are measured against a baseline period (WMO standard 1991–2020).

```math
z=\frac{P-\bar P_{1991\text{–}2020}}{\sigma_{1991\text{–}2020}}
```

**Drought types and indices.**

| Drought type | What is short | Indices used here |
| --- | --- | --- |
| Meteorological | Rainfall | 3-month SPI-type index (CHIRPS) |
| Agricultural / ecological | Soil moisture, plant water | VCI, TCI, VHI, evaporative stress index |
| Hydrological | Streams, groundwater | 12-month SPI-type index, PDSI (TerraClimate) |

```math
\mathrm{VCI}=100\frac{\mathrm{NDVI}-\mathrm{NDVI}_{min}}{\mathrm{NDVI}_{max}-\mathrm{NDVI}_{min}}\quad
\mathrm{TCI}=100\frac{\mathrm{LST}_{max}-\mathrm{LST}}{\mathrm{LST}_{max}-\mathrm{LST}_{min}}\quad
\mathrm{VHI}=0.5\,\mathrm{VCI}+0.5\,\mathrm{TCI}
```

VCI and TCI are computed per calendar month, so the normal dry season is not mistaken for drought. A VHI below 40 is conventionally classed as drought (Kogan, 1995). The year 2019 was Australia's driest on record, which makes it a useful test case.

**Land surface temperature (LST) and evapotranspiration (ET).**

- LST is the radiometric skin temperature of the surface, which differs from air temperature. Landsat thermal (100 m, resampled to 30 m) suits urban heat studies; MODIS (1 km, daily/8-day) suits regional monitoring.
- ET links the water and energy balances. The evaporative stress index is ESI = 1 − ET/PET.
- In the Daly River, dry-season flow is sustained by groundwater from limestone aquifers, which makes ET relevant to water allocation.

## 2. Practical activities

**Activity 3.1 – Rainfall anomalies (`prac03a`).**

1. Sum CHIRPS Oct–Apr rainfall for each wet season from 1981/82 to 2024/25, and chart it for Darwin, Katherine, Tennant Creek and Alice Springs.
2. Map the 1991–2020 mean and the coefficient of variation.
3. Map the 2024/25 anomaly (% of mean, z-score, decile), and chart the Alice Springs standardised anomaly series.

**Activity 3.2 – Vegetation condition and drought (`prac03b`).**

1. Compute VCI (MOD13A3), TCI (MOD11A2) and VHI for Oct 2019, plus 3- and 12-month SPI-type indices and PDSI.
2. Chart VCI, TCI and VHI for 2017–2021 around Alice Springs, and calculate the NT area with VHI below 40.
3. Change `TARGET` to a month in your AT3 focus year (AT3), and repeat for **your tile**.

**Activity 3.3 – LST and ET (`prac03c`).**

1. Part A: map Darwin build-up season LST (Landsat `ST_B10`), and plot LST against NDVI.
2. Part B: chart monthly rainfall, ET and PET for the Daly basin, then map the late-dry-season ESI and annual ET.
3. **AT3 (ENV506):** map LST and ESI for your tile in your focus year.

**Key code** (an excerpt from [`prac03a_rainfall_anomaly.js`](../scripts/prac03a_rainfall_anomaly.js); run the full script for the complete workflow):

```javascript
// Wet-season (Oct–Apr) rainfall anomaly as a z-score against 1991–2020 (CHIRPS)
var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD').select('precipitation');
function wetSeason(y) {   // y = year the wet season ends
  return chirps.filterDate(ee.Date.fromYMD(ee.Number(y).subtract(1), 10, 1), ee.Date.fromYMD(y, 5, 1)).sum();
}
var base = ee.ImageCollection.fromImages(ee.List.sequence(1992, 2020).map(wetSeason));
var z = wetSeason(2025).subtract(base.mean()).divide(base.reduce(ee.Reducer.stdDev())).rename('z');
Map.addLayer(z, {min: -2, max: 2, palette: ['#8c510a', '#f5f5f5', '#01665e']}, 'Wet-season rainfall z-score 2024/25');
```

## 3. Challenge questions (knowledge check)

**Core**

1. Describe the NT rainfall gradient and its variability. How do these shape vegetation, fire and land use?
2. Why is a z-score better than mm for comparing Darwin and Alice Springs?
3. Where was vegetation stress greatest in Oct 2019? Do VCI and TCI agree?
4. Which SPI timescale reflects which type of drought?
5. Which Darwin land covers are hottest? Suggest two urban planning responses.
6. In which months does PET exceed rainfall in the Daly basin, and what sustains dry-season flow?

**Extension (ENV506)**

1. Implement a gamma-fitted SPI in the Code Editor (method-of-moments gamma, `gammainc`, `erfInv`; see the script `EXT`) and compare it with the z-score version.
2. CHIRPS uses sparse gauges in central Australia. Discuss the bias this introduces and how you would detect it.
3. Evaluate VHI and the SPI-type index as triggers for pastoral drought assistance, considering lag, false alarms and resolution.
4. Discuss what MOD16 ET uncertainty means for Daly River water allocation decisions.

## 4. Link to summative assessment

- **AT3:** rainfall anomalies and drought indices for your focus year explain your vegetation trends (ENV506: gamma SPI, lags, RESTREND, LST and ET).
- **AT4 Part 3:** rainfall anomalies and drought indices over your clearing period and fire window test whether climate explains the change and fire in your tile.

## 5. Reading

- Funk, C., et al. (2015). The climate hazards infrared precipitation with stations — a new environmental record for monitoring extremes. *Scientific Data, 2*, 150066. https://doi.org/10.1038/sdata.2015.66
- West, H., Quinn, N., & Horswell, M. (2019). Remote sensing for drought monitoring & impact assessment: Progress, past challenges and future opportunities. *Remote Sensing of Environment, 232*, 111291. https://doi.org/10.1016/j.rse.2019.111291
- Kogan, F. N. (1995). Application of vegetation index and brightness temperature for drought detection. *Advances in Space Research, 15*(11), 91–100.
- Abatzoglou, J. T., et al. (2018). TerraClimate, a high-resolution global dataset of monthly climate and climatic water balance from 1958–2015. *Scientific Data, 5*, 170191. https://doi.org/10.1038/sdata.2017.191
- Ermida, S. L., et al. (2020). Google Earth Engine open-source code for land surface temperature estimation from the Landsat series. *Remote Sensing, 12*(9), 1471. https://doi.org/10.3390/rs12091471
- Mu, Q., Zhao, M., & Running, S. W. (2011). Improvements to a MODIS global terrestrial evapotranspiration algorithm. *Remote Sensing of Environment, 115*, 1781–1800. https://doi.org/10.1016/j.rse.2011.02.019

## Full scripts

Each script is copied here from [`scripts/`](../scripts) so this page has everything in one place. The `.js` file is the master copy: if the two ever differ, use the file. Click a heading to open the script, then use the copy button and paste it into a new script in the Code Editor.

<details>
<summary><strong>prac03a_rainfall_anomaly.js</strong> (147 lines)</summary>

```javascript
/**** Prac 03a — Rainfall variability and anomalies (Northern Territory)
 * Data: CHIRPS v2.0 pentad (0.05°, 1981–present). Baseline 1991–2020 (WMO standard normal).
 * NT wet season = October–April.
 *
 * WHAT THIS SCRIPT DOES:
 *   Asks: was a chosen wet season (default 2024/25) wetter or drier than normal across the NT, and how reliable is
 *   NT rainfall? It sums CHIRPS rainfall for each Oct–Apr wet season (1981/82–2024/25), builds a 1991–2020 baseline,
 *   and maps the target season as an anomaly (mm), % of mean, z-score and decile. Charts compare Darwin, Katherine,
 *   Tennant Creek and Alice Springs along the north–south rainfall gradient.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) Optional EDIT: change TARGET (section 3) to map a different wet season (the year it starts, 1981–2024).
 *   (3) Click Run.
 *   (4) Read the charts in the Console (right panel), turn layers on/off in the Map's Layers list, and start the
 *       export in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   Map layers: mean Oct–Apr rainfall (mm), coefficient of variation (%), target season % of mean, standardised
 *   anomaly (z) and decile (the last three for TARGET).
 *   Console charts: wet-season totals per site 1981–2024; Alice Springs z-score bar chart; mean monthly rainfall per site.
 *
 * DATA:
 *   UCSB-CHG/CHIRPS/PENTAD — CHIRPS v2.0 rainfall, 5-day (pentad) totals in mm, 0.05° (~5.5 km), 1981–present.
 *   FAO/GAUL/2015/level1 — state boundaries (used to select and clip to the Northern Territory).
 *
 * LINKS:
 *   Prac page: pracs/prac03-climate-and-hydrology-drivers-rainfall-anomalies-drought-indices-lst-and-et.md
 *   Assessment: Prac 03; AT3 (climate drivers); AT4 Part 3.
 *
 * KEY GEE IDEAS:
 *   - Building a new ImageCollection by mapping a function over a list of years (ee.List.sequence(...).map()).
 *   - Collection reducers: sum(), mean(), reduce(ee.Reducer.stdDev()) collapse many images into one.
 *   - Image maths is pixel by pixel: subtract(), divide() give an anomaly in every pixel.
 *   - Charts (ui.Chart.image.*) run a reducer over regions at a given scale and print to the Console.
 *
 * Q = core (ENV306 and ENV506).  EXT = ENV506 extension.
 ****/

// ---------- 1 Study area ----------
// The NT boundary (for clipping and the export region) and four towns along the north–south rainfall gradient.
// Each town is a 10 km buffer so the charts average several CHIRPS pixels instead of reading one.
// keep only the NT polygon
var nt = ee.FeatureCollection('FAO/GAUL/2015/level1').filter(ee.Filter.eq('ADM1_NAME', 'Northern Territory'));
var sites = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([130.84, -12.46]).buffer(10000), {name: 'Darwin'}),   // [longitude, latitude]; buffer in metres
  ee.Feature(ee.Geometry.Point([132.26, -14.47]).buffer(10000), {name: 'Katherine'}),
  ee.Feature(ee.Geometry.Point([134.19, -19.65]).buffer(10000), {name: 'Tennant Creek'}),
  ee.Feature(ee.Geometry.Point([133.88, -23.70]).buffer(10000), {name: 'Alice Springs'})
]);   // the 'name' property labels each line in the charts
Map.centerObject(nt, 5);   // zoom level 5 shows the whole NT

// ---------- 2 Data ----------
// CHIRPS pentad images hold rainfall totals (mm) for about 5 days each; summing them gives seasonal totals.
var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD').select('precipitation');   // band units: mm per pentad

// ---------- 3 Processing: wet-season totals (Oct of year y to Apr of y+1) ----------
// One image per wet season, then a 1991–2020 baseline (mean and standard deviation) to compare a target season against.
// Results are expressed four ways: anomaly in mm, % of mean, z-score and decile (the BoM uses deciles in its drought reports).
function wetSeason(y) {
  y = ee.Number(y);   // y arrives as a server-side number from ee.List.sequence
  var start = ee.Date.fromYMD(y, 10, 1), end = ee.Date.fromYMD(y.add(1), 5, 1);   // 1 Oct y to 1 May y+1 (end date is exclusive)
  return chirps.filterDate(start, end).sum().rename('wet_mm')   // sum of all pentads in the season = season total (mm)
    .set('season_start', y).set('system:time_start', start.millis());   // properties used for filtering and chart x-axes
}
var seasons = ee.ImageCollection.fromImages(ee.List.sequence(1981, 2024).map(wetSeason));   // 44 seasons: 1981/82–2024/25
var baseline = seasons.filter(ee.Filter.rangeContains('season_start', 1991, 2019));  // 1991/92–2019/20 (29 seasons)
var mean = baseline.mean().rename('mean');   // long-term mean wet-season total (mm) in each pixel
var sd = baseline.reduce(ee.Reducer.stdDev()).rename('sd');   // year-to-year spread (mm) in each pixel

// EDIT (optional): the year the target wet season starts.
var TARGET = 2024;   // 2024/25 wet season
var target = seasons.filter(ee.Filter.eq('season_start', TARGET)).first();   // first() turns the 1-image collection into an image
var anomMm = target.subtract(mean).rename('anomaly_mm').clip(nt);   // mm above (+) or below (−) the mean
var pctNormal = target.divide(mean).multiply(100).rename('pct_of_mean').clip(nt);   // 100 = average; 50 = half the usual rain
var zScore = target.subtract(mean).divide(sd).rename('z').clip(nt);   // anomaly in standard deviations; comparable between sites

// Decile ranking (BoM style): where does the target season rank among all seasons 1981–2024?
// For each season, 1 where it was drier than the target; the sum counts how many seasons the target beat.
var rank = seasons.map(function(img) { return img.lt(target).rename('lt'); }).sum();
// Rank as a fraction of all seasons, scaled to 1–10. Decile 1 = among the driest 10 %, 10 = among the wettest.
// max(1) stops the driest season scoring 0
var decile = rank.divide(seasons.size()).multiply(10).ceil().max(1).rename('decile').clip(nt);

// ---------- 4 Analysis ----------
// Charts summarise the maps at the four towns. Each chart averages pixels inside each buffer (reducer: mean)
// at scale 5566 m, roughly the CHIRPS pixel size (0.05°), so GEE does not resample to a finer grid.
print(ui.Chart.image.seriesByRegion({imageCollection: seasons, regions: sites, reducer: ee.Reducer.mean(),
  band: 'wet_mm', scale: 5566, xProperty: 'season_start', seriesProperty: 'name'})   // one line per town
  // '####' stops 1,981-style labels
  .setOptions({title: 'Oct–Apr rainfall (mm), CHIRPS', hAxis: {title: 'Season starting', format: '####'}}));

// Standardised anomaly series for Alice Springs (bar chart)
// Converts every season (not just TARGET) to a z-score against the 1991–2020 baseline.
var alice = sites.filter(ee.Filter.eq('name', 'Alice Springs'));
var zSeries = seasons.map(function(img) {
  // keep dates for the x-axis
  return img.subtract(mean).divide(sd).rename('z').copyProperties(img, ['season_start', 'system:time_start']);
});
print(ui.Chart.image.series(zSeries, alice, ee.Reducer.mean(), 5566, 'season_start').setChartType('ColumnChart')
  // bars above 0 = wetter than normal
  .setOptions({title: 'Alice Springs: standardised wet-season rainfall anomaly', legend: {position: 'none'}}));

// Monthly climatology per site
// For each month, total that month's rain in each year 1991–2020, then average the 30 totals = mean monthly rainfall (mm).
var monthly = ee.ImageCollection.fromImages(ee.List.sequence(1, 12).map(function(m) {
  var yearsSum = ee.List.sequence(1991, 2020).map(function(y) {
    // calendarRange picks images by calendar year and calendar month
    return chirps.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month')).sum();
  });
  return ee.ImageCollection.fromImages(yearsSum).mean().rename('mm').set('month', m);
}));
print(ui.Chart.image.seriesByRegion({imageCollection: monthly, regions: sites, reducer: ee.Reducer.mean(),
  band: 'mm', scale: 5566, xProperty: 'month', seriesProperty: 'name'}).setChartType('ColumnChart')
  .setOptions({title: 'Mean monthly rainfall 1991–2020 (mm)'}));

// Coefficient of variation (rainfall reliability) — an important driver of NT landscapes
// CV = SD / mean × 100. High CV = unreliable rain (big swings between years), typical of the arid south.
var cv = sd.divide(mean).multiply(100).rename('CV_pct').clip(nt);

// ---------- 5 Visualise ----------
// Layers are drawn in order; later layers sit on top. Layers added with 'false' start switched off — tick them in Layers.
// min/max set the colour stretch; values outside are shown in the end colours.
Map.addLayer(mean.clip(nt), {min: 100, max: 1800, palette: ['#fff7bc', '#fec44f', '#41b6c4', '#225ea8', '#081d58']}, 'Mean Oct–Apr rainfall (mm)');
// green = reliable, red = variable
Map.addLayer(cv, {min: 15, max: 60, palette: ['#1a9850', '#ffffbf', '#d73027']}, 'Coefficient of variation (%)', false);
// Brown = drier than normal, white ≈ normal (100 %), blue-green = wetter.
Map.addLayer(pctNormal, {min: 40, max: 160, palette: ['#8c510a', '#d8b365', '#f5f5f5', '#5ab4ac', '#01665e']}, TARGET + '/' + (TARGET + 1) + ' % of mean');
// ±2 SD
Map.addLayer(zScore, {min: -2, max: 2, palette: ['#b2182b', '#ef8a62', '#f7f7f7', '#67a9cf', '#2166ac']}, 'Standardised anomaly (z)', false);
// Deciles 4–7 are white (near average); 1–3 red/orange (below average), 8–10 green (above average).
Map.addLayer(decile, {min: 1, max: 10, palette: ['#a50026', '#f46d43', '#fee08b', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#d9ef8b', '#66bd63', '#006837']}, 'Decile', false);

// ---------- 6 Export ----------
// Writes a 4-band GeoTIFF (anomaly_mm, pct_of_mean, z, decile) to the GEE_NT folder in your Google Drive.
// Nothing happens until you click Run on the task in the Tasks tab.
// float() gives all bands one data type
Export.image.toDrive({image: anomMm.addBands(pctNormal).addBands(zScore).addBands(decile).float(),
  description: 'Prac03a_rain_anomaly_' + TARGET, folder: 'GEE_NT', region: nt.geometry().bounds(), scale: 5566, crs: 'EPSG:4326'});
  // region: the NT's bounding rectangle; scale: native CHIRPS resolution (m);
  // EPSG:4326 = latitude/longitude (WGS 84), the grid CHIRPS is stored in

// Q: Describe the north–south rainfall gradient and the gradient in variability (CV). How do they shape NT landscapes?
// Q: Was the target wet season wetter or drier than normal at each site? Which decile?
// Q: Why is a z-score better than mm for comparing Darwin and Alice Springs?
// EXT: CHIRPS blends satellite and gauge data; gauges are sparse in central Australia. Compare CHIRPS with BoM station data (Climate Data Online) for one site and quantify bias.
// EXT: Relate wet-season rainfall anomalies to ENSO (Niño 3.4) and the Indian Ocean Dipole over 1981–2024.
```

</details>

<details>
<summary><strong>prac03b_drought_indices.js</strong> (153 lines)</summary>

```javascript
/**** Prac 03b — Drought indices: VCI, TCI, VHI, SPI-type index and PDSI (Northern Territory)
 * Focus: 2019 — Australia's driest year on record — in central Australia (Alice Springs region).
 * Data: MODIS MOD13A3 (monthly NDVI, 1 km), MOD11A2 (8-day LST, 1 km), CHIRPS pentad, TerraClimate.
 *
 * WHAT THIS SCRIPT DOES:
 *   Asks: how severe and how widespread was drought in the NT in October 2019, and do different drought indices agree?
 *   It maps satellite vegetation and temperature indices (VCI, TCI, VHI), a rainfall-based SPI-type index over 3 and
 *   12 months, and the Palmer Drought Severity Index, then charts VHI for the Alice Springs region over 2017–2021.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) Optional EDIT: TARGET (section 1) sets the month to map (first day of the month, 2001–2024).
 *   (3) Click Run.
 *   (4) Read the chart and drought area in the Console (right panel), turn layers on/off in the Map's Layers list,
 *       and start the export in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   Map layers (0–100, red = stressed, green = healthy): VCI, TCI, VHI. Also SPI-type 3- and 12-month maps and PDSI
 *   (brown = dry, teal = wet) and the Alice Springs region outline.
 *   Console: a VCI/TCI/VHI time-series chart (Alice Springs region, 2017–2021) and the NT area (km²) with VHI < 40.
 *
 * DATA:
 *   MODIS/061/MOD13A3 — monthly NDVI, 1 km, 2001–2024 used here (scale factor 0.0001).
 *   MODIS/061/MOD11A2 — 8-day daytime land surface temperature, 1 km, 2001–2024 used here (scale 0.02, kelvin).
 *   UCSB-CHG/CHIRPS/PENTAD — rainfall, 5-day totals (mm), 0.05° (~5.5 km); 1991–2020 baseline plus the target period.
 *   IDAHO_EPSCOR/TERRACLIMATE — monthly PDSI, ~4 km (1/24°), target month only (scale 0.01).
 *   FAO/GAUL/2015/level1 — state boundaries (NT outline).
 *
 * LINKS:
 *   Prac page: pracs/prac03-climate-and-hydrology-drivers-rainfall-anomalies-drought-indices-lst-and-et.md
 *   Assessment: Prac 03; AT3 (climate drivers); AT4 Part 3.
 *
 * KEY GEE IDEAS:
 *   - Scale factors: MODIS bands are stored as integers and must be multiplied (and offset) to get real units.
 *   - Calendar filtering: ee.Filter.calendarRange compares a month only with the same month in other years.
 *   - Reusable functions that return images, called many times inside map() to build a time series.
 *   - reduceRegion with ee.Image.pixelArea() to turn a mask into an area (km²).
 *
 * Q = core (ENV306 and ENV506).  EXT = ENV506 extension.
 ****/

// ---------- 1 Study area & parameters ----------
// The NT outline, a rectangle around Alice Springs for the time series, the month to map, and the baseline period.
var nt = ee.FeatureCollection('FAO/GAUL/2015/level1').filter(ee.Filter.eq('ADM1_NAME', 'Northern Territory'));
var alice = ee.Geometry.Rectangle([132.5, -24.5, 135.5, -22.5]);   // [west, south, east, north] in degrees
// EDIT (optional): the month to map. Use the first day of a month.
var TARGET = ee.Date('2019-10-01');   // month to map
var BASE = ['2001-01-01', '2025-01-01'];   // baseline record (end date exclusive) used for the min/max in VCI and TCI
Map.centerObject(nt, 5);

// ---------- 2 Data: monthly NDVI and LST ----------
// Both indices need one image per month. MOD13A3 is already monthly; MOD11A2 (8-day) is averaged into months here.
var ndvi = ee.ImageCollection('MODIS/061/MOD13A3').filterDate(BASE[0], BASE[1])
  // Scale factor 0.0001 converts stored integers to NDVI (−1 to 1). copyProperties keeps the date, which select() drops.
  .map(function(img) { return img.select('NDVI').multiply(0.0001).copyProperties(img, ['system:time_start']); });

var lst8 = ee.ImageCollection('MODIS/061/MOD11A2').filterDate(BASE[0], BASE[1]).select('LST_Day_1km');   // daytime LST
// A list of month numbers 0, 1, 2, ... (one per month in BASE: 288 months)
var months = ee.List.sequence(0, ee.Date(BASE[1]).difference(ee.Date(BASE[0]), 'month').subtract(1));
var lst = ee.ImageCollection.fromImages(months.map(function(n) {
  var s = ee.Date(BASE[0]).advance(n, 'month');   // first day of month n
  // Mean of the 8-day images in that month; × 0.02 gives kelvin; − 273.15 gives °C
  return lst8.filterDate(s, s.advance(1, 'month')).mean().multiply(0.02).subtract(273.15)
    .rename('LST').set('system:time_start', s.millis());
}));

// ---------- 3 Processing: VCI, TCI, VHI per calendar month ----------
// Kogan's indices rescale the current value between the record minimum and maximum FOR THE SAME CALENDAR MONTH,
// so a dry-season October is compared with other Octobers, not with the wet season. 0 = worst on record, 100 = best.
function condition(col, band, date, inverse) {
  var m = date.get('month');   // calendar month (1–12) of the date
  var sameMonth = col.filter(ee.Filter.calendarRange(m, m, 'month'));   // that month in every year 2001–2024
  var mn = sameMonth.min(), mx = sameMonth.max();   // per-pixel record low and high for that month
  var cur = col.filterDate(date, date.advance(1, 'month')).first();   // the image for the month being assessed
  // inverse = true for temperature: a HOT month is stressful, so (max − current) / (max − min) gives low TCI when hot.
  var idx = inverse ? mx.subtract(cur).divide(mx.subtract(mn)) : cur.subtract(mn).divide(mx.subtract(mn));
  return idx.multiply(100).rename(band);   // 0–100 scale
}
var vci = condition(ndvi, 'VCI', TARGET, false).clip(nt);   // Vegetation Condition Index (greenness)
var tci = condition(lst, 'TCI', TARGET, true).clip(nt);     // Temperature Condition Index (heat)
// Vegetation Health Index: equal-weight average of VCI and TCI
var vhi = vci.multiply(0.5).add(tci.multiply(0.5)).rename('VHI');

// ---------- SPI-type index: standardised 3- and 12-month precipitation (z-score of totals) ----------
// Rainfall over the last 3 (or 12) months ending with the target month, expressed as a z-score against the
// same window in 1991–2020. Short windows track meteorological drought; long windows track hydrological drought.
var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD').select('precipitation');
function spa(date, nMonths) {
  var end = date.advance(1, 'month');   // window ends at the end of the target month (end date is exclusive)
  var current = chirps.filterDate(end.advance(-nMonths, 'month'), end).sum();   // current nMonths rainfall total (mm)
  // The same window in each baseline year 1991–2020 (30 totals)
  var hist = ee.ImageCollection.fromImages(ee.List.sequence(1991, 2020).map(function(y) {
    var e = ee.Date.fromYMD(y, end.get('month'), 1);
    return chirps.filterDate(e.advance(-nMonths, 'month'), e).sum();
  }));
  return current.subtract(hist.mean()).divide(hist.reduce(ee.Reducer.stdDev())).rename('SPA' + nMonths);   // z = (x − mean) / SD
}
var spa3 = spa(TARGET, 3).clip(nt);    // Aug–Oct 2019 by default
var spa12 = spa(TARGET, 12).clip(nt);  // Nov 2018–Oct 2019 by default

// ---------- TerraClimate Palmer Drought Severity Index (scale 0.01) ----------
// PDSI is a modelled soil-water balance index. About −4 or lower = extreme drought; +4 or higher = extremely wet.
var pdsi = ee.ImageCollection('IDAHO_EPSCOR/TERRACLIMATE').select('pdsi')
  // × 0.01 converts stored integers to PDSI units
  .filterDate(TARGET, TARGET.advance(1, 'month')).first().multiply(0.01).clip(nt);

// ---------- 4 Analysis: VHI time series for the Alice Springs region ----------
// Recomputes VCI, TCI and VHI for each of 60 months (Jan 2017 – Dec 2021) to show the drought building and breaking.
var vhiSeries = ee.ImageCollection.fromImages(ee.List.sequence(0, 59).map(function(n) {
  var d = ee.Date('2017-01-01').advance(n, 'month');
  var v = condition(ndvi, 'VCI', d, false), t = condition(lst, 'TCI', d, true);
  // 3 bands = 3 chart lines
  return v.multiply(0.5).add(t.multiply(0.5)).rename('VHI').addBands(v).addBands(t).set('system:time_start', d.millis());
}));
// Mean over the Alice Springs rectangle at 5000 m: coarser than the 1 km data, which keeps the chart quick to compute.
print(ui.Chart.image.series(vhiSeries, alice, ee.Reducer.mean(), 5000)
  .setOptions({title: 'Alice Springs region: VCI, TCI, VHI 2017–2021', vAxis: {viewWindow: {min: 0, max: 100}}}));

// Drought area: VHI < 40 = drought (Kogan's convention)
// pixelArea() gives each pixel's area in m²; ÷ 1e6 = km². The mask keeps only drought pixels, then sum() adds them up.
var droughtKm2 = ee.Image.pixelArea().divide(1e6).updateMask(vhi.lt(40))
  .reduceRegion({reducer: ee.Reducer.sum(), geometry: nt.geometry(), scale: 1000, maxPixels: 1e11});
  // scale 1000 m = MODIS resolution; maxPixels raised because the NT holds well over the default 10 million pixels
print('NT area with VHI < 40 in target month (km²)', droughtKm2);   // the result is a dictionary, key 'area'

// ---------- 5 Visualise ----------
// One shared 0–100 palette for VCI, TCI and VHI (red = poor condition, green = good).
// Z-score and PDSI layers use brown (dry) to teal (wet). Layers with 'false' start off — tick them in Layers.
var ci = {min: 0, max: 100, palette: ['#a50026', '#f46d43', '#fee08b', '#d9ef8b', '#66bd63', '#006837']};
Map.addLayer(vci, ci, 'VCI');
Map.addLayer(tci, ci, 'TCI', false);
Map.addLayer(vhi, ci, 'VHI');
Map.addLayer(spa3, {min: -2, max: 2, palette: ['#8c510a', '#f5f5f5', '#01665e']}, 'SPI-type 3-month', false);
Map.addLayer(spa12, {min: -2, max: 2, palette: ['#8c510a', '#f5f5f5', '#01665e']}, 'SPI-type 12-month', false);
Map.addLayer(pdsi, {min: -4, max: 4, palette: ['#8c510a', '#f5f5f5', '#01665e']}, 'PDSI (TerraClimate)', false);
// paint(geometry, colour, width) draws an outline only
Map.addLayer(ee.Image().paint(alice, 0, 2), {palette: 'black'}, 'Alice Springs region');

// ---------- 6 Export ----------
// A 5-band GeoTIFF (VCI, TCI, VHI, SPA3, SPA12) to the GEE_NT folder in Google Drive. Start it in the Tasks tab.
Export.image.toDrive({image: vci.addBands(tci).addBands(vhi).addBands(spa3).addBands(spa12).float(),
  description: 'Prac03b_drought_indices_201910', folder: 'GEE_NT', region: nt.geometry().bounds(), scale: 1000, crs: 'EPSG:3577', maxPixels: 1e11});
  // EPSG:3577 = GDA94 / Australian Albers, an equal-area projection suited to measuring areas across Australia.
  // The file name says 201910; change the description if you change TARGET.

// Q: Where was vegetation stress greatest in Oct 2019? Do VCI and TCI agree?
// Q: Compare the 3- and 12-month SPI-type maps. Which reflects meteorological and which hydrological/agricultural drought?
// Q: Why are VCI/TCI computed per calendar month rather than across all months?
// EXT: Our SPI-type index is a z-score of totals. True SPI fits a gamma distribution, then transforms to a standard normal.
//      Implement it in the Code Editor: method-of-moments shape k = mean²/var and scale θ = var/mean from the 1991–2020 totals;
//      G = current.divide(θ).gammainc(k)  (regularised lower incomplete gamma);  SPI = √2 · erfInv(2G − 1)  (ee.Image.erfInv).
//      Compare the gamma SPI map with the z-score map and explain the differences in arid central Australia.
// EXT: Evaluate each index as a trigger for drought assistance to pastoralists: lag, false alarms and spatial resolution.
```

</details>

<details>
<summary><strong>prac03c_lst_et.js</strong> (134 lines)</summary>

```javascript
/**** Prac 03c — Land surface temperature and evapotranspiration (Northern Territory)
 * Part A: Darwin urban heat (Landsat 8/9 surface temperature, 30 m resampled from 100 m TIRS)
 * Part B: Daly River basin LST and ET seasonality (MODIS MOD11A2, MOD16A2)
 *
 * WHAT THIS SCRIPT DOES:
 *   Part A asks: which parts of Darwin are hottest in the build-up (Sep–Nov), and how does surface temperature relate
 *   to vegetation? It builds a median Landsat LST and NDVI composite for 2021–2024 and plots LST against NDVI.
 *   Part B asks: how do rainfall, evapotranspiration (ET) and temperature change through the year in the Daly River
 *   basin? It builds monthly climatologies (2003–2024) and maps late-dry-season evaporative stress and annual ET.
 *
 * HOW TO USE IT:
 *   (1) Save a copy in your Owner repository.
 *   (2) No EDIT lines are required. You may change the dates (START, END or the filterDate lines) to explore.
 *   (3) Click Run.
 *   (4) Read the charts and basin area in the Console (right panel), turn layers on/off in the Map's Layers list,
 *       and start the export in the Tasks tab.
 *
 * WHAT YOU WILL SEE:
 *   Map layers: A: LST (°C) and NDVI for Darwin; B: Daly basin outline, evaporative stress (1 − ET/PET) Sep–Oct 2023,
 *   annual ET 2023 (mm). The map opens on Darwin; zoom out to the south-west to see the Daly basin.
 *   Console: Darwin LST vs NDVI scatter plot; Daly basin area (km²); monthly P/ET/PET chart; monthly day/night LST chart.
 *
 * DATA:
 *   LANDSAT/LC08/C02/T1_L2 and LANDSAT/LC09/C02/T1_L2 — Landsat 8/9 Collection 2 Level 2 surface reflectance and
 *     surface temperature, 30 m (thermal band collected at 100 m), Sep–Nov 2021–2024.
 *   WWF/HydroSHEDS/v1/Basins/hybas_5 — HydroSHEDS level 5 river basins (vector).
 *   MODIS/061/MOD11A2 — 8-day day and night LST, 1 km, 2003–2024.
 *   MODIS/061/MOD16A2 — 8-day actual ET and potential ET, 500 m, 2003–2024.
 *   UCSB-CHG/CHIRPS/PENTAD — rainfall, 5-day totals (mm), 0.05° (~5.5 km), 2003–2024.
 *
 * LINKS:
 *   Prac page: pracs/prac03-climate-and-hydrology-drivers-rainfall-anomalies-drought-indices-lst-and-et.md
 *   Assessment: Prac 03; AT3 (climate drivers); AT4 Part 3.
 *
 * KEY GEE IDEAS:
 *   - Cloud masking with bitwiseAnd on a QA band, and scale factors/offsets to convert stored integers to real units.
 *   - map() a function over every image in a collection, then median() to make a cloud-reduced composite.
 *   - Monthly climatologies with ee.Filter.calendarRange, built inside ee.List.sequence(1, 12).map().
 *   - reduceRegion over a basin, and Export.table.toDrive to save the numbers as a CSV.
 *
 * Q = core (ENV306 and ENV506).  EXT = ENV506 extension.
 ****/

// ======================= Part A — Darwin urban heat =======================
// Landsat surface temperature shows how hot the ground surface gets (not air temperature).
// Roofs, roads and bare ground heat up; trees and water stay cooler. We test this with an LST–NDVI plot.
var darwin = ee.Geometry.Rectangle([130.80, -12.52, 131.05, -12.33]);   // [west, south, east, north]
Map.centerObject(darwin, 11);

// prep() is applied to every Landsat image: mask cloud, convert to °C and reflectance, add NDVI.
function prep(img) {
  var qa = img.select('QA_PIXEL');   // bit-packed quality band
  // Bit 3 = cloud, bit 4 = cloud shadow. (1 << 3) is 8, i.e. only bit 3 set; .eq(0) keeps pixels where the bit is off.
  var mask = qa.bitwiseAnd(1 << 3).eq(0).and(qa.bitwiseAnd(1 << 4).eq(0));
  // Collection 2 surface temperature: × 0.00341802 + 149.0 gives kelvin; − 273.15 gives °C
  var stC = img.select('ST_B10').multiply(0.00341802).add(149.0).subtract(273.15).rename('LST_C');
  var sr = img.select(['SR_B4', 'SR_B5']).multiply(0.0000275).add(-0.2);   // red and NIR to reflectance (0–1)
  // NDVI = (NIR − red) / (NIR + red)
  return stC.addBands(sr.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI')).updateMask(mask)
    .copyProperties(img, ['system:time_start']);   // keep the acquisition date
}
// pool Landsat 8 and 9
var ls = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2').merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
  .filterBounds(darwin).filter(ee.Filter.calendarRange(9, 11, 'month'))   // build-up season
  .filterDate('2021-01-01', '2025-01-01').map(prep);   // four build-up seasons, 2021–2024
// Median, not mean: it ignores the occasional too-hot or too-cold value left by missed cloud or haze.
var lstDarwin = ls.median().clip(darwin);
Map.addLayer(lstDarwin.select('LST_C'), {min: 30, max: 55, palette: ['#313695', '#74add1', '#ffffbf', '#f46d43', '#a50026']}, 'A: LST (°C) Sep–Nov median');
Map.addLayer(lstDarwin.select('NDVI'), {min: 0, max: 0.8, palette: ['white', 'green']}, 'A: NDVI', false);

// LST vs NDVI relationship (sample)
// 2000 random 30 m pixels (seed: 3 makes the sample repeatable); geometries: false because only the values are needed.
var sample = lstDarwin.sample({region: darwin, scale: 30, numPixels: 2000, seed: 3, geometries: false});
print(ui.Chart.feature.byFeature(sample, 'NDVI', 'LST_C').setChartType('ScatterChart')   // x = NDVI, y = LST
  // trendlines adds a linear fit
  .setOptions({title: 'Darwin: LST vs NDVI (build-up season)', pointSize: 2, trendlines: {0: {}}}));

// ======================= Part B — Daly River basin =======================
// Monthly averages over 2003–2024 show the wet–dry cycle in rainfall, ET and temperature for a whole catchment.
// The basin is the HydroSHEDS level 5 polygon that contains a point on the Daly River near Oolloo.
var basin = ee.FeatureCollection('WWF/HydroSHEDS/v1/Basins/hybas_5')
  .filterBounds(ee.Geometry.Point([131.25, -14.07]));   // Daly River near Oolloo — check the basin outline
// '00000000' = transparent fill
Map.addLayer(basin.style({color: 'blue', fillColor: '00000000'}), {}, 'B: HydroSHEDS basin (level 5)');
print('Basin area (km²)', basin.geometry().area(100).divide(1e6));   // area() in m² (100 m max error); ÷ 1e6 = km²

var START = '2003-01-01', END = '2025-01-01';   // 22 full years (END is exclusive)
var lstM = ee.ImageCollection('MODIS/061/MOD11A2').filterDate(START, END).select(['LST_Day_1km', 'LST_Night_1km']);
var et = ee.ImageCollection('MODIS/061/MOD16A2').filterDate(START, END).select(['ET', 'PET']);   // actual and potential ET
var rain = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD').filterDate(START, END).select('precipitation');

// Monthly climatologies
// One image per calendar month (1–12), each holding mean day/night LST (°C), ET and PET (mm/month) and rainfall (mm/month).
var clim = ee.ImageCollection.fromImages(ee.List.sequence(1, 12).map(function(m) {
  // MODIS LST scale 0.02 → kelvin → °C
  var l = lstM.filter(ee.Filter.calendarRange(m, m, 'month')).mean().multiply(0.02).subtract(273.15);
  // MOD16A2: 8-day sums, scale 0.1 mm. Mean 8-day value × (days in month / 8) ≈ monthly total.
  // 30.4 = average days per month
  var e = et.filter(ee.Filter.calendarRange(m, m, 'month')).mean().multiply(0.1).multiply(30.4 / 8);
  var nYears = 22;   // number of years in START–END
  // Sum of all of this month's pentads over 22 years ÷ 22 = mean monthly rainfall (mm)
  var p = rain.filter(ee.Filter.calendarRange(m, m, 'month')).sum().divide(nYears).rename('P_mm');
  return l.addBands(e.rename(['ET_mm', 'PET_mm'])).addBands(p).set('month', m);
}));
// Basin-mean values by month. scale 1000 m matches the coarsest MODIS layer (LST) and keeps the reduction quick.
print(ui.Chart.image.series(clim.select(['P_mm', 'ET_mm', 'PET_mm']), basin, ee.Reducer.mean(), 1000, 'month')
  .setOptions({title: 'Daly basin: rainfall, actual ET and potential ET (mm/month)', hAxis: {title: 'Month'}}));
print(ui.Chart.image.series(clim.select(['LST_Day_1km', 'LST_Night_1km']), basin, ee.Reducer.mean(), 1000, 'month')
  .setOptions({title: 'Daly basin: day and night LST (°C)', hAxis: {title: 'Month'}}));

// Evaporative stress index for the late dry season: 1 − ET/PET
// ET/PET near 1 = plants have water to evaporate as fast as the air demands; near 0 = water-limited.
// So ESI near 1 = high stress. Scale factors cancel in the ratio, so no × 0.1 is needed here.
var lateDry = et.filter(ee.Filter.calendarRange(9, 10, 'month')).filterDate('2023-01-01', '2024-01-01').mean();   // Sep–Oct 2023
var esi = ee.Image(1).subtract(lateDry.select('ET').divide(lateDry.select('PET'))).rename('ESI').clip(basin);
Map.addLayer(esi, {min: 0.3, max: 1, palette: ['#1a9850', '#ffffbf', '#d73027']}, 'B: Evaporative stress (1 − ET/PET), Sep–Oct 2023', false);
// Sum of all 8-day ET totals in 2023, × 0.1 → mm per year
var annualET = et.select('ET').filterDate('2023-01-01', '2024-01-01').sum().multiply(0.1).clip(basin);
Map.addLayer(annualET, {min: 200, max: 1200, palette: ['#ffffcc', '#41b6c4', '#0c2c84']}, 'B: Annual ET 2023 (mm)', false);

// ---------- Export ----------
// Turns each monthly climatology image into a table row of basin means, then saves the 12 rows as a CSV
// (the default format) to the GEE_NT folder in Google Drive. Start it in the Tasks tab; use the CSV for your own graphs.
Export.table.toDrive({collection: clim.map(function(img) {
    // reduceRegion arguments in order: reducer, geometry, scale (1000 m), crs (null = default), crsTransform (null),
    // bestEffort (false), maxPixels (1e10)
    return ee.Feature(null, img.reduceRegion(ee.Reducer.mean(), basin.geometry(), 1000, null, null, false, 1e10)).set('month', img.get('month'));
  }), description: 'Prac03c_Daly_climatology', folder: 'GEE_NT'});   // ee.Feature(null, ...) = a table row with no geometry

// Q: Which Darwin land covers are hottest and coolest? Quantify the LST–NDVI relationship and suggest urban planning responses.
// Q: In which months does PET exceed rainfall in the Daly basin? What sustains dry-season river flow (hint: groundwater from limestone aquifers)?
// Q: Where is evaporative stress highest late in the dry season? Relate this to riparian vegetation and irrigation.
// EXT: Compare MOD16 ET with ET from a second product (e.g. PML_V2 'CAS/IGSNRR/PML/V2_v018' if available) and discuss uncertainty for water allocation planning.
// EXT: Compute a simple basin water balance P − ET over 2003–2024 and compare with gauged discharge (NT Water Data portal).
```

</details>

---

[Home](../README.md) · [Schedule](../schedule-2026.md) · [← Prac 02](prac02-monitoring-vegetation-condition-trends-and-seasonality.md) · [Prac 04 →](prac04-land-cover-mapping-and-landscape-metrics.md)
