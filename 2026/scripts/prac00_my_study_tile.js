/**** Prac 00 — My study tile and years (run this first, in Prac 01, Session 4)
 * ENV306/506 Environmental Monitoring and Modelling (2026)
 * Every student gets a personal 20 km tile in the Daly River catchment and personal years / sites for the
 * summative assessments. The values are reproducible from your student number, so markers can re-run this
 * script (and the staff check-value coordinates) and check that your figures and numbers came from YOUR tile (AT2, AT3, AT4).
 * Paste your outputs into your AT1 proposal. Do not swap tiles or years without written approval.
 ****/

// ---------- 0 EDIT: your student number (digits only, e.g. s123456 → 123456) ----------
var STUDENT_NUMBER = 123456;
var COHORT_SALT = 2026;   // staff: change each year so tiles and years rotate between cohorts

// ---------- 1 Daly River catchment and the 20 km tile grid ----------
// HydroSHEDS level-4 basin containing the Daly River near Oolloo. Staff: check the outline each year.
var daly = ee.FeatureCollection('WWF/HydroSHEDS/v1/Basins/hybas_4')
  .filterBounds(ee.Geometry.Point([131.25, -14.07]));
var dalyGeom = daly.geometry();
var proj = ee.Projection('EPSG:3577').atScale(20000);   // GDA94 / Australian Albers, 20 km cells
var grid = dalyGeom.coveringGrid(proj)
  .map(function(cell) {
    var inside = cell.geometry().intersection(dalyGeom, 100).area(100).divide(cell.geometry().area(100));
    return cell.set('inside', inside);
  })
  .filter(ee.Filter.gt('inside', 0.99))
  .sort('system:index');
var n = grid.size();

// ---------- 2 Deterministic picks ----------
function pick(list, k) {
  list = ee.List(list);
  return list.get(ee.Number(STUDENT_NUMBER).multiply(k).add(COHORT_SALT).mod(list.length()));
}
var tileIndex = ee.Number(STUDENT_NUMBER).multiply(7919).add(COHORT_SALT).mod(n);
var tile = ee.Feature(grid.toList(n).get(tileIndex));
var TILE = tile.geometry();

var at2Year = ee.Number(pick(ee.List.sequence(2005, 2024), 31));          // AT2 focus year
var at3Gap = ee.Number(pick([5, 6, 7, 8], 17));
var at3YearA = ee.Number(pick(ee.List.sequence(2014, ee.Number(2024).subtract(at3Gap)), 37));   // Landsat 8/9 era
var at3YearB = at3YearA.add(at3Gap);                                                               // ≤ 2024
var clearingStart = ee.Number(pick([2016, 2017, 2018, 2019], 13));
var fireStart = ee.Number(pick([2003, 2005, 2007, 2009, 2011, 2013], 11));
var crocRiver = pick(['Adelaide', 'Mary', 'Daly', 'Liverpool', 'Blyth', 'Glyde'], 19);
var urbanSite = pick(['Palmerston', 'Darwin northern suburbs', 'Litchfield rural fringe', 'Katherine', 'Alice Springs', 'Nhulunbuy'], 23);
var urbanPair = ee.List(pick([[2016, 2024], [2017, 2025], [2018, 2025], [2016, 2023]], 29));
// Elective (a) species: staff check Atlas of Living Australia record counts (and coordinate generalisation of
// sensitive species) before the cohort starts, and edit this list if needed.
var species = pick(['Gouldian finch (Erythrura gouldiae)', 'Partridge pigeon (Geophaps smithii)',
                    'Northern quoll (Dasyurus hallucatus)', 'Black-footed tree-rat (Mesembriomys gouldii)',
                    'Brush-tailed rabbit-rat (Conilurus penicillatus)', 'Red goshawk (Erythrotriorchis radiatus)'], 43);
var alphaPair = ee.List(pick([[2017, 2024], [2018, 2024], [2017, 2023], [2019, 2024]], 41));

// ---------- 3 Print (copy these into your AT1 proposal) ----------
print('Student number', STUDENT_NUMBER, 'cohort', COHORT_SALT);
print('Tiles available in the Daly catchment', n);
print('Your tile index', tileIndex, 'tile centroid (lon, lat)', TILE.centroid(1).coordinates());
print('AT2 focus year (Pracs 02–03)', at2Year);
print('AT3 transition years (Prac 05): YEAR_A, YEAR_B', at3YearA, at3YearB);
print('AT4 Part 2 clearing period (Prac 06)', clearingStart, '→', clearingStart.add(4));
print('AT4 Part 3 fire window (Prac 07)', fireStart, '→', fireStart.add(9));
print('AT4 elective (a) species (Prac 12)', species);
print('AT4 elective (b) AlphaEarth years (Prac 13)', alphaPair);
print('AT4 elective (c) focal river system (Prac 09)', crocRiver);
print('AT4 elective (d) urban site and years (Prac 10)', urbanSite, urbanPair);
var TILE_ID = ee.String('DALY-').cat(tileIndex.int().format('%03d'));
print('Your TILE_ID (label every figure with it and your student ID)', TILE_ID);
print('Allocation code (staff master sheet)', tileIndex.multiply(1000).add(at2Year.mod(100).multiply(10)).add(at3Gap));

// ---------- 4 Map ----------
Map.centerObject(TILE, 10);
Map.addLayer(daly.style({color: '#08519c', fillColor: '00000000', width: 2}), {}, 'Daly catchment (HydroSHEDS level 4)');
Map.addLayer(grid.style({color: '#999999', fillColor: '00000000', width: 1}), {}, '20 km tile grid', false);
Map.addLayer(ee.FeatureCollection([tile]).style({color: 'red', fillColor: 'ff000022', width: 3}), {}, 'MY TILE');
Map.setOptions('HYBRID');

// Save TILE for other scripts: Export the tile as an asset (optional), or copy its corner coordinates.
print('Your tile corners (paste into later scripts as ee.Geometry.Polygon)', TILE.coordinates());
Export.table.toAsset({collection: ee.FeatureCollection([tile]), description: 'Prac00_my_tile', assetId: 'my_tile'});
