[Home](../README.md)

# Article review reading list and summary notes

Three article reviews run during the intensive. Each one is a guided discussion of three or four recent, peer-reviewed articles that connect the pracs to the research literature and to land management in the Northern Territory (NT). Read the articles for a session before it starts, and use these notes to guide your reading. The notes do not replace the articles: they point you to what matters for this unit and give you questions to bring to class.

All articles have a DOI and are available through the CDU Library: search the title or paste the DOI into the Library search.

The same notes are linked from the pracs: each relevant prac starts with a "Read first" box naming the notes to read, and "Reading link" boxes in the activities show where an article explains what you are doing. The "Used in the pracs" line under each article lists those places.

## How to read a research article

| Pass | What to do |
| --- | --- |
| First pass (10 min) | Read the title, abstract, figures and their captions, and the conclusion. Write one sentence on what the paper claims. |
| Second pass (20–30 min) | Read the methods and results. Note the data (sensor, resolution, period, study area), the method, and how the authors checked accuracy or uncertainty. |
| Third pass (10 min) | Ask: is the conclusion supported by the evidence? What would change if the study were done in your Daly River tile? What would you do differently? |
| Bring to class | Your one-sentence claim, one strength, one limitation, and one question for each article. |

## How the sessions run

Each session uses a jigsaw format. In the first 45 minutes, small "expert" groups each take one article and agree its claim, evidence and limitations. Groups then re-mix so each new group has an expert on every article, and the session closes with a whole-class discussion that links the articles to the pracs and to your assessments. ENV506 students lead the critique in each group and answer the extension questions.

## Article review 1: Landscape ecology and remote sensing

- **When:** Tue 3 Nov 2026, 9:00–10:30 (Session 1)
- **Learning outcomes:** ULO 1 (landscape ecology concepts and management relevance) and ULO 2 (image management and processing principles)
- **Linked pracs:** Prac 01 (Earth Engine, image processing, vegetation dynamics) and Prac 04 (land cover and landscape metrics)
- **Focus question:** Why is remote sensing central to landscape ecology, what can it measure well, and what can it not measure? This session sets up the pattern–process–scale thinking you will use in every prac and in AT4.

### 1.1 Remote sensing in landscape ecology

Foody, G. M. (2023). Remote sensing in landscape ecology. Landscape Ecology, 38(11), 2711–2716. https://doi.org/10.1007/s10980-023-01753-4

**Type:** Perspective (short review article) **Access:** CDU Library.

**Used in the pracs:** Prac 01 (Read first; Activities 1.1–1.2), Prac 04 (Read first; Activity 4.2) and Prac 13 (Read first; few-shot and similarity steps).

**Why we read it.** A short, readable overview of how landscape ecologists use remote sensing today. It explains why the field relies on satellite and drone data, and warns about the pitfalls of using imagery without specialist knowledge.

**Aim.** To review current trends in how remote sensing is used in landscape ecology, explain why it remains central to the discipline, and look at future prospects. The author starts from the 1983 Allerton Park workshop, where remote sensing and GIS were identified as essential tools for the new discipline.

**Data and methods.** A perspective based on recent articles published in Landscape Ecology and on developments in sensors, data access and analysis. There is no new data analysis.

**Key findings.**

- Landscape ecology still centres on spatial heterogeneity and scale: how landscape pattern affects ecological process across scales. Remote sensing is the main source of data on pattern.
- Three reasons for its continued use: (1) far more data are available, from sub-pixel to global scales and at many spatial, temporal and spectral resolutions; (2) it is easier to use, through analysis-ready data, free software and cloud platforms such as Google Earth Engine; (3) much of it is free (Landsat, Sentinel, MODIS) or cheap (archived commercial imagery, drones).
- The range of sources now includes the 50-year Landsat archive, the Sentinel constellation (optical and radar), lidar and GEDI for 3D structure, hyperspectral sensors, drones and commercial constellations such as Planet.
- Machine learning (random forests, support vector machines, neural networks), citizen science and cloud computing have expanded what can be analysed.
- Specialist knowledge still matters. Acquisition timing, sensor calibration and spatial resolution all affect results; for example, very fine resolution imagery can be less useful than imagery aggregated to a coarser grain for some applications.
- Future directions include near real-time monitoring, multi-sensor data fusion, new missions (for example Landsat Next) and artificial intelligence.

**Link to the NT and this unit.** In this unit you work at several grains and extents: 10 m Sentinel-2, 30 m Landsat, 250–500 m MODIS, and GEDI footprints, across a 20 km tile and the whole Daly catchment. Foody's point about choosing an appropriate resolution applies directly to your land cover map (Prac 04) and to the scale analysis in the ENV506 version of AT4.

**Limitations to think about.** A perspective, not a systematic review: the examples come mainly from one journal, and the article does not test how often the pitfalls it describes actually occur. Australian savanna applications are not discussed.

**Key terms.** spatial heterogeneity; scale (grain and extent); analysis-ready data; data fusion; spatial, temporal, spectral and radiometric resolution

**Discussion questions**

1. Foody gives three reasons why remote sensing remains central to landscape ecology. Which matters most for land management in the NT, and why?
2. Give one example from Prac 01 or Prac 04 where the grain of the data could change your conclusion about landscape pattern.
3. Foody argues that specialist knowledge "is unlikely to disappear". Which steps in your Earth Engine workflow (masking, scaling, compositing, classification) need that knowledge most?

> **Extension.** ENV506: Using Prac 04, explain how two landscape metrics of your choice would change if your land cover map were made at 10 m, 30 m and 250 m. Link your answer to scale theory in landscape ecology.

### 1.2 Global forest fragmentation change from 2000 to 2020

Ma, J., Li, J., Wu, W., & Liu, J. (2023). Global forest fragmentation change from 2000 to 2020. Nature Communications, 14, 3752. https://doi.org/10.1038/s41467-023-39221-x

**Type:** Research article **Access:** CDU Library (open access).

**Used in the pracs:** Prac 04 (Read first; Activities 4.1–4.2).

**Why we read it.** This is landscape pattern analysis at its largest scale. The authors calculate the same kind of landscape metrics you use in Prac 04 (edge density, patch density, mean patch area) from 30 m satellite forest maps for the whole globe, then ask what drives the changes. It shows how pattern metrics turn a land cover map into evidence for policy.

**Aim.** To map the distribution of forest fragmentation worldwide and how it changed between 2000 and 2020, and to identify the human and natural drivers of those changes, in order to guide forest protection, restoration and reforestation policy.

**Data and methods.** Binary forest maps for 2000 and 2020 at 30 m resolution (trees at least 5 m tall) from a global land cover and land use change dataset. Three landscape metrics, edge density, patch density and mean patch area, were calculated in 5 km × 5 km grid cells and combined into a single Forest Fragmentation Index (FFI). Change was measured as FFI(2020) − FFI(2000), and drivers such as cropland change, night-time lights and wildfire frequency were analysed.

**Key findings.**

- About 75 % of the world's forests showed decreasing fragmentation between 2000 and 2020, and about 25 % showed increasing fragmentation.
- Tropical forests were the least fragmented in 2000 but had the most severe increases in fragmentation, often together with forest loss (for example in the Amazon, the Congo Basin and South-East Asia).
- Subtropical forests were the most fragmented, but many showed recovery; temperate and boreal forests often gained cover and became less fragmented.
- Drivers differed between regions: cropland change and socioeconomic development (night-time lights) in some regions, and wildfire frequency in others, with wildfire reported as a strong influence in tropical Africa and Australia.

**Link to the NT and this unit.** Edge density, patch density and patch area are among the metrics you calculate for your Daly tile in Prac 04 and report in AT4 Part 1. The paper's approach (map land cover, compute metrics in a grid, compare two dates, then explain the change) is the same logic as AT4 Parts 1–3 at a much smaller extent.

**Limitations to think about.** Only two dates, so short-lived changes are missed. A 5 km grid hides fine-scale fragmentation such as narrow clearing lines. A tree-height threshold for "forest" does not suit open savanna woodland well. Most importantly, the result depends on the choice of metrics: a 2025 study using connectivity-based metrics (Zou et al., see Further reading) concluded that more than half of the world's forests became more fragmented over the same period.

**Key terms.** fragmentation; edge density; patch density; mean patch area; composite index; grain and extent; bi-temporal change; structural versus functional connectivity

**Discussion questions**

1. Why do you think the authors combined three metrics into one index rather than reporting each separately? What is lost by combining them?
2. Ma et al. (2023) found that most forests became less fragmented, while Zou et al. (2025) found that most became more fragmented. How can two studies of the same period disagree, and what does this teach you about choosing metrics in Prac 04?
3. Would a "forest" definition based on trees at least 5 m tall work for the savanna woodlands of your Daly tile? What would you change?

> **Extension.** ENV506: Calculate edge density, patch density and mean patch area for woodland in your tile at two dates and at two grid sizes. Explain how the conclusion about fragmentation changes with the grid size and with the choice of metric, using landscape-ecology theory on scale.

### 1.3 Priority list of biodiversity metrics to observe from space

Skidmore, A. K., Coops, N. C., Neinavaz, E., Ali, A., Schaepman, M. E., et al. (2021). Priority list of biodiversity metrics to observe from space. Nature Ecology & Evolution, 5, 896–906. https://doi.org/10.1038/s41559-021-01451-x

**Type:** Research article (expert review and ranking) **Access:** CDU Library.

**Used in the pracs:** Prac 01 (Read first; Activity 1.3), Prac 02 (Read first; Activities 2.1–2.2) and Prac 11 (Read first; Activities 11.1–11.2).

**Why we read it.** This paper asks which aspects of biodiversity can actually be monitored from space. It links remote sensing products to the essential biodiversity variable (EBV) framework and helps you judge what your satellite-based results can and cannot say about ecology.

**Aim.** To compile a prioritised list of remote sensing biodiversity products that can improve monitoring of biodiversity patterns, and to align them better with the EBV framework.

**Data and methods.** An expert review process that scored candidate remote sensing products for relevance, feasibility, accuracy and maturity, and then ranked them within the EBV classes.

**Key findings.**

- The ecosystem structure and ecosystem function EBV classes are the most relevant, feasible, accurate and mature for direct monitoring from satellites. These classes capture habitat structure and the biological effects of disturbance.
- Products that need finer-resolution sensing that is still being developed (for example, many species-trait products) receive lower priority.
- Some EBVs cannot be measured directly from space, especially genetic composition.
- Better alignment between the EBV framework and remote sensing products would allow satellite data to fill gaps between field observations.

**Link to the NT and this unit.** Most of what you measure in this unit falls in the "ecosystem structure" and "ecosystem function" classes: land cover and fragmentation (Prac 04), canopy height from GEDI (Prac 11), and vegetation condition, phenology and disturbance (Pracs 02, 06 and 07). The paper helps you frame what these results do and do not tell an ecologist, for example in your AT3 magazine article.

**Limitations to think about.** Rankings come from expert judgement, which may favour well-studied temperate and boreal systems. Feasibility and accuracy differ between ecosystems; for example, mapping canopy structure in an open savanna is harder than in a closed forest.

**Key terms.** essential biodiversity variables (EBVs); ecosystem structure; ecosystem function; species traits; remote sensing biodiversity products

**Discussion questions**

1. Place three products you use in the pracs into EBV classes. Which is the most direct measure of biodiversity?
2. Why can satellites not measure genetic composition? What would you need instead?
3. Is greening in a MODIS NDVI trend (Prac 02) evidence of better biodiversity condition? Use the paper to argue your answer.

> **Extension.** ENV506: Choose one EBV relevant to the Daly catchment and design a monitoring indicator for it using data from at least two sensor families (optical, SAR or lidar). State the indicator's main source of uncertainty.

## Article review 2: Land clearing and fire in northern Australia

- **When:** Mon 9 Nov 2026, 9:00–10:30. Group B discusses in small groups from 9:00 to 10:00 while Group A has AT4 check-ins; the whole class joins the wrap-up from 10:00 to 10:30. Group A: read the articles beforehand and bring your notes to the wrap-up.
- **Learning outcomes:** ULO 1 (landscape ecology and management) and ULO 3 (evaluating spatial technologies in policy and decision making)
- **Linked pracs:** Prac 05 (change detection), Prac 06 (land clearing) and Prac 07 (fire regime, burn severity and seasonality)
- **Focus question:** How have land clearing and fire management changed northern Australian landscapes, how do we measure these changes with satellites, and how well does the evidence support policy?

### 2.1 Delivering effective savanna fire management for defined biodiversity conservation outcomes: An Arnhem Land case study

Evans, J., & Russell-Smith, J. (2020). Delivering effective savanna fire management for defined biodiversity conservation outcomes: An Arnhem Land case study. International Journal of Wildland Fire, 29(5), 386–400. https://doi.org/10.1071/WF18126

**Type:** Research article **Access:** CDU Library.

**Used in the pracs:** Prac 07 (Read first; Activity 7.2).

**Why we read it.** An NT case study that tests whether a regional fire management program actually achieved its ecological targets. It shows how satellite fire mapping is turned into "ecological threshold" metrics, which links directly to your fire regime analysis in Prac 07 and AT4 Part 3.

**Aim.** To document changes in the fire regime of western Arnhem Land since active, conservation-based fire management began in 2006, and to assess whether ecological fire management targets are being met.

**Data and methods.** Analysis of 12 years of regional fire history (mapped fire scars), summarised as fire regime metrics: season of burning, fire size and frequency, and ecological threshold metrics such as the extent of longer-unburnt habitat.

**Key findings.**

- Over 12 years, the regional fire regime changed from one dominated by late dry season (LDS) wildfire to one in which most fires are small early dry season (EDS) prescribed burns.
- The overall area burnt did not decrease significantly.
- Most ecological threshold metrics improved, except those describing the maintenance of longer-unburnt habitat.
- Defining, delivering, monitoring and evaluating heterogeneity (patchiness) targets remains a challenge.

**Link to the NT and this unit.** This is the regional context for the EDS/LDS convention you compare with dNBR classes (Key & Benson) in Prac 07. It also shows why "area burnt" alone is a poor indicator, and why AT4 asks for frequency, seasonality and severity together.

**Limitations to think about.** A single region with a long-running, well-resourced program, so results may not transfer to pastoral land such as much of the Daly catchment. Fire-scar mapping from coarse sensors can miss small, patchy EDS burns, which affects patchiness and longer-unburnt metrics.

**Key terms.** early dry season (EDS) and late dry season (LDS) fire; prescribed burning; fire regime; ecological thresholds; longer-unburnt habitat; patchiness (heterogeneity)

**Discussion questions**

1. Area burnt did not fall, yet the authors report ecological improvement. How can both be true?
2. Why is longer-unburnt habitat hard to maintain under frequent EDS burning? Which species might depend on it?
3. How would the resolution of the fire product (MODIS at 500 m versus Landsat or Sentinel-2) affect the metrics in this paper?

> **Extension.** ENV506: Propose a measurable heterogeneity target for your tile (for example, the proportion of the tile unburnt for at least three years) and explain how you would monitor it with the products in Prac 07, including their uncertainty.

### 2.2 Transforming fire management in northern Australia through successful implementation of savanna burning emissions reductions projects

Edwards, A., Archer, R., De Bruyn, P., Evans, J., Lewis, B., Vigilante, T., Whyte, S., & Russell-Smith, J. (2021). Transforming fire management in northern Australia through successful implementation of savanna burning emissions reductions projects. Journal of Environmental Management, 290, 112568. https://doi.org/10.1016/j.jenvman.2021.112568

**Type:** Research article **Access:** CDU Library (an open access version is also available).

**Used in the pracs:** Prac 07 (Read first; Activity 7.2).

**Why we read it.** Savanna burning carbon projects now shape fire management across much of northern Australia. This paper tests, across the region, whether they changed fire regimes and what that means for biodiversity, so it gives the policy context for your fire analysis.

**Aim.** To assess how savanna burning emissions reduction projects have changed fire management in northern Australia, by comparing fire regimes at project and non-project sites.

**Data and methods.** Comparison of ecologically defined fire regime metrics at sites with and without projects, across different land uses, from 2000 to 2019, using regional fire mapping.

**Key findings.**

- At project sites, under all land uses, late dry season wildfire has fallen significantly since 2013, and prescribed burning has increased.
- Projects cannot meet all biodiversity conservation needs, particularly for fire-vulnerable species.
- Savanna burning projects provide an effective, funded operational framework for fire management, but they work best as part of broader landscape management rather than as a stand-alone conservation solution.

**Link to the NT and this unit.** Savanna burning projects earn carbon credits by shifting fire from the late to the early dry season, when fires are cooler and patchier and emit less methane and nitrous oxide. Your Prac 07 seasonality map shows the same EDS/LDS pattern these projects aim to change.

**Limitations to think about.** Project and non-project sites differ in more than project status (for example tenure, access and resourcing), so not every difference can be attributed to the projects. Emissions accounting relies on the same mapped fire scars, so mapping errors affect both the carbon and the ecological results.

**Key terms.** savanna burning methodology; emissions reduction; carbon credits; with-project and without-project comparison; fire-vulnerable species

**Discussion questions**

1. What is the logic of earning carbon credits from early dry season burning?
2. Why might a project succeed for carbon but not fully for biodiversity?
3. If you compared project and non-project areas yourself in Earth Engine, which confounding factors would you control for?

> **Extension.** ENV506: Design a with-project versus without-project comparison for the Daly catchment using MCD64A1 and FireCCI51 (Prac 07). Explain how you would match comparison areas and how you would report uncertainty.

### 2.3 A comparison and validation of satellite-derived fire severity mapping techniques in fire prone north Australian savannas: Extreme fires and tree stem mortality

Edwards, A. C., Russell-Smith, J., & Maier, S. W. (2018). A comparison and validation of satellite-derived fire severity mapping techniques in fire prone north Australian savannas: Extreme fires and tree stem mortality. Remote Sensing of Environment, 206, 287–299. https://doi.org/10.1016/j.rse.2017.12.038

**Type:** Research article **Access:** CDU Library.

**Used in the pracs:** Prac 05 (Activity 5.2) and Prac 07 (Read first; Activities 7.1 and 7.1b).

**Why we read it.** This is the paper behind the fire severity part of Prac 07. It tests satellite fire severity mapping against field measurements of tree death in NT savannas, so it shows how severity classes are validated and why season alone is not a complete measure of severity.

**Aim.** To compare and validate satellite-derived fire severity mapping methods in north Australian savannas, using field measurements of tree stem mortality after large, intense wildfires, and to estimate the extent of severe fire across the region.

**Data and methods.** Field surveys after three large late dry season wildfires (900–5,300 km²) in eucalypt savanna: 142 transects (100 m × 10 m) covering 2,445 tree stems. Fire severity was mapped with Landsat 8 (30 m) and MODIS (250–500 m) using the Normalized Burn Ratio (NBR), differenced NBR (dNBR), relative dNBR (RdNBR) and spectral mixture analysis, and an automated MODIS fire severity algorithm was applied across about 1.9 million km² of northern savanna.

**Key findings.**

- The fires caused very high tree stem mortality (about 24–55 %) and large losses of tree biomass (about 47–69 %) at the surveyed sites.
- Landsat and MODIS agreed on burnt area more than 90 % of the time, and on a binary severe versus non-severe classification more than 80 % of the time.
- The automated MODIS severity mapping had an overall reliability of about 75 % across the region.
- Severe fires affected about 15 % (2015) and 12 % (2016) of the northern tropical savannas; very severe fires caused large losses of living tree biomass.

**Link to the NT and this unit.** In Prac 07 you compute dNBR, classify it with the Key & Benson thresholds, and compare it with the NT convention that EDS fires are low severity and LDS fires high severity (Section 4b). This paper shows that severity can be mapped directly and validated with field data, and that LDS wildfires can cause very high tree death, which is the basis for that convention.

**Limitations to think about.** Validation comes from three wildfires in one year, all at the severe end of the range, so accuracy for low to moderate severity fires is less certain. Coarse MODIS pixels mix burnt and unburnt patches, which matters for patchy EDS burns. Tree stem mortality is only one measure of severity; effects on the grass layer and soils are not measured.

**Key terms.** fire severity; Normalized Burn Ratio (NBR); dNBR; RdNBR; spectral mixture analysis; tree stem mortality; validation; burnt area

**Discussion questions**

1. Why did the authors validate severity with tree stem mortality? What other field measures could be used?
2. Your Prac 07 kappa compares season-based and dNBR-based severity. Using this paper, explain when the two should agree and when they should not.
3. What is gained and lost by mapping severity with MODIS rather than Landsat across the whole of northern Australia?

> **Extension.** ENV506: Design a field validation for dNBR severity classes in your tile: sample size, stratification by class and season, timing after fire, and how you would report accuracy (error matrix and area-adjusted estimates).

### 2.4 Poor compliance and exemptions facilitate ongoing deforestation

Thomas, H., Ward, M., Simmonds, J., Taylor, M., & Maron, M. (2024). Poor compliance and exemptions facilitate ongoing deforestation. Conservation Biology, e14354. https://doi.org/10.1111/cobi.14354

**Type:** Research article **Access:** CDU Library (open access).

**Used in the pracs:** Prac 05 (Activity 5.2) and Prac 06 (Read first; Parts A and B).

**Why we read it.** A recent study of land clearing in northern Australia, including the NT, that combines satellite clearing data with legal records to ask whether clearing complied with the law. It is a direct example of ULO 3: using spatial technology to evaluate policy, which you will do with your own clearing results in Prac 06 and AT4 Part 2.

**Aim.** To assess whether land clearing in northern Australia between 2014 and 2021 complied with the state, territory and federal (EPBC Act) laws that applied to it, and how much clearing was approved, exempt or potentially non-compliant.

**Data and methods.** Satellite-mapped clearing events larger than 20 ha in northern Australia (about 1.5 million ha in total) were matched with the vegetation management, planning and environmental laws that applied to each site, and with public records of permits, exemptions and EPBC Act referrals.

**Key findings.**

- About 65 % of the clearing examined was potentially non-compliant with at least one applicable law.
- Of the clearing that was compliant, only about 19 % had explicit assessment and approval; the rest relied on exemptions.
- Less than a quarter (about 22 %) of clearing had publicly available evidence of a referral under the EPBC Act.
- Most clearing in the Northern Territory went through assessment, but assessed clearing was almost always approved, so better compliance alone may not reduce clearing rates. In Queensland, most clearing was exempt from assessment under state law.
- Agricultural development, especially pasture for beef cattle, was a major driver of clearing.

**Link to the NT and this unit.** Clearing for agriculture in the Daly catchment is the focus of Prac 06 and AT4 Part 2. This paper shows what happens next with clearing maps: they are compared with permits and threatened species habitat to test whether the law is working. Think about how your own clearing estimate could support (or fail to support) a decision by the hypothetical Daly advisory group.

**Limitations to think about.** Only clearing larger than 20 ha was assessed, so small or incremental clearing is missed. "Potentially non-compliant" is based on public records, which may be incomplete; it is not a legal finding. Results depend on the accuracy of the satellite clearing maps and on separating clearing from fire or regrowth.

**Key terms.** land clearing; compliance; exemptions; EPBC Act referral; regrowth clearing; vegetation management law

**Discussion questions**

1. Why do the authors say "potentially" non-compliant? What information would be needed to be certain?
2. The NT assessed most clearing but approved almost all of it. What does this suggest about the limits of monitoring alone?
3. How would you make sure that a clearing event mapped in your tile is permanent clearing and not fire or temporary canopy loss (Prac 05 and Prac 06)?

> **Extension.** ENV506: Using Olofsson et al. (2014), explain how an area-adjusted accuracy assessment of the clearing map would change the confidence in the 1.5 million ha figure, and what you would report alongside such an estimate in a policy brief.

## Article review 3: Species–landscape relationships

- **When:** Wed 11 Nov 2026, 9:00–10:30 (Session 1)
- **Learning outcomes:** ULO 1 (landscape ecology), ULO 3 (applying spatial technologies to management) and ULO 4 (spatial pattern analysis)
- **Linked pracs:** Prac 12 (species distribution modelling and spatial cross-validation), Prac 13 (AlphaEarth) and Prac 09 (crocodile biomass)
- **Focus question:** How do landscape pattern, disturbance and habitat condition shape where species occur, and how do we model these relationships with remote sensing without fooling ourselves?

### 3.1 Bottom-up and top-down processes influence contemporary patterns of mammal species richness in Australia's monsoonal tropics

Stobo-Wilson, A. M., Stokeld, D., Einoder, L. D., Davies, H. F., Fisher, A., Hill, B. M., Mahney, T., Murphy, B. P., Scroggie, M. P., Stevens, A., Woinarski, J. C. Z., Bawinanga Rangers, Warddeken Rangers, & Gillespie, G. R. (2020). Bottom-up and top-down processes influence contemporary patterns of mammal species richness in Australia's monsoonal tropics. Biological Conservation, 247, 108638. https://doi.org/10.1016/j.biocon.2020.108638

**Type:** Research article **Access:** CDU Library.

**Used in the pracs:** Prac 11 (Read first; Activities 11.1–11.2) and Prac 12 (Read first; Activities 12.1–12.2).

**Why we read it.** A large NT field study, carried out with Indigenous ranger groups, that links native mammal richness to habitat condition, fire, feral herbivores and predators. It shows the ecological processes behind the landscape patterns you map, in the same savannas as your study tile.

**Aim.** To identify which bottom-up (habitat and resources) and top-down (predators) factors best explain current patterns of native mammal species richness across the tropical savannas of the Top End, a region of severe recent mammal decline.

**Data and methods.** Camera-trapping and live-trapping across about 370,000 km² of the Top End (more than 1,500 camera traps and almost 7,500 live traps at about 300 sites), with richness modelled against fire, feral herbivores, dingoes, feral cats, habitat and rainfall.

**Key findings.**

- Feral herbivore abundance, dingo abundance and feral cat occupancy were the best predictors of small mammal richness; richness declined as each of these pressures increased.
- Frequent large fires and overgrazing by feral herbivores remove shelter and food for native mammals.
- Feral cats were less likely to occur where vegetation was more complex, so the impact of cats increases where frequent fire and grazing have degraded habitat.
- The authors conclude that long-term recovery of mammal diversity is unlikely without restoring habitat, especially through better management of fire and feral herbivores.

**Link to the NT and this unit.** Many of the drivers here can be mapped from space: fire frequency and seasonality (Prac 07), vegetation structure (Prac 11, GEDI), and grazing pressure through changes in ground cover and vegetation condition (Prac 02). The species in the AT4 elective (a) list, such as the northern quoll and black-footed tree-rat, belong to this declining fauna.

**Limitations to think about.** A correlative study: the predictors are linked and can stand in for each other (for example, fire and grazing both reduce ground cover). Richness can hide changes in individual species. Detection by cameras and traps varies between species and habitats.

**Key terms.** bottom-up and top-down processes; species richness; occupancy; camera-trapping; habitat complexity; feral herbivores; mesopredator

**Discussion questions**

1. Which of the drivers in this study can be measured from satellite data, and which need field data?
2. Why does habitat complexity change the impact of feral cats? How could you map habitat complexity from space?
3. How does this study change your view of the EDS/LDS fire results from Article review 2?

> **Extension.** ENV506: Choose one AT4 elective (a) species and build a conceptual model linking at least three remotely sensed predictors to its occurrence. Identify which predictors are correlated and how you would handle that in an SDM.

### 3.2 Monitoring biodiversity in the Anthropocene using remote sensing in species distribution models

Randin, C. F., Ashcroft, M. B., Bolliger, J., Cavender-Bares, J., Coops, N. C., Dullinger, S., Dirnböck, T., Eckert, S., Ellis, E., Fernández, N., Giuliani, G., Guisan, A., Jetz, W., Joost, S., Karger, D., Lembrechts, J., Lenoir, J., Luoto, M., Morin, X., Price, B., Rocchini, D., Schaepman, M., Schmid, B., Verburg, P., Wilson, A., Woodcock, P., Yoccoz, N., & Payne, D. (2020). Monitoring biodiversity in the Anthropocene using remote sensing in species distribution models. Remote Sensing of Environment, 239, 111626. https://doi.org/10.1016/j.rse.2019.111626

**Type:** Review article **Access:** CDU Library (an open access version is also available).

**Used in the pracs:** Prac 12 (Read first; Activity 12.1) and Prac 13 (Read first; few-shot and similarity steps).

**Why we read it.** A review of how remote sensing data can improve species distribution models (SDMs). It explains what satellite predictors add beyond climate, which is exactly what you test when you build the Gouldian finch model in Prac 12.

**Aim.** To survey the remote sensing data available to ecological modellers for predicting species distributions and range dynamics, and to discuss how ecological modelling and Earth observation communities can work together to monitor biodiversity.

**Data and methods.** A review by a large international team, covering remotely sensed information on climate variability, land cover change and disturbance, and how each can be used in SDMs.

**Key findings.**

- Remote sensing products can provide continuous information in space and time on key factors that drive species distributions, which can improve the use and accuracy of SDMs for management and planning.
- Satellite data can capture biophysical processes that climate-only models miss, including land cover change, habitat structure and disturbance.
- Closer collaboration between ecological modellers and the Earth observation community is needed to make biodiversity monitoring useful for global targets such as the UN Sustainable Development Goals and the post-2020 global biodiversity framework.

**Link to the NT and this unit.** In Prac 12 you combine climate layers with remotely sensed predictors (land cover, vegetation indices, fire history) to model the Gouldian finch. In Prac 13 you test whether AlphaEarth embeddings can replace hand-picked predictors. This review gives you the reasons for each choice.

**Limitations to think about.** A broad review: it does not test which predictors work best for any particular species or region. Remote sensing predictors bring their own errors (classification errors, cloud gaps, mismatched dates between records and imagery) that pass into the SDM.

**Key terms.** species distribution model (SDM); predictors (covariates); range dynamics; land cover change; disturbance; Earth observation

**Discussion questions**

1. List three remotely sensed predictors you could add to a climate-only model of the Gouldian finch, and say what ecological process each represents.
2. Records from the Atlas of Living Australia span decades. Why does the date of each record matter when you use satellite predictors?
3. Do AlphaEarth embeddings (Prac 13) fit the "process-based predictor" approach this review argues for? Why or why not?

> **Extension.** ENV506: Explain how classification error in a land cover predictor propagates into SDM predictions, and propose a way to test its effect on your Prac 12 model.

### 3.3 Einoder, L. D., Fisher, A., Hill, B. M., Buckley, K., de Laive, A., Woinarski, J. C. Z., & Gillespie, G. R. (2023). Long term monitoring reveals the importance of large, long unburnt areas and smaller fires in moderating mammal declines in fire-prone savanna of northern Australia. Journal of Applied Ecology.

Einoder, L. D., Fisher, A., Hill, B. M., Buckley, K., de Laive, A., Woinarski, J. C. Z., & Gillespie, G. R. (2023). Long term monitoring reveals the importance of large, long unburnt areas and smaller fires in moderating mammal declines in fire-prone savanna of northern Australia. Journal of Applied Ecology. https://doi.org/10.1111/1365-2664.14482

**Type:** Research article **Access:** CDU Library. The data are published in the Dryad repository (https://doi.org/10.5061/dryad.6m905qg4q).

**Used in the pracs:** Prac 07 (Read first; Activity 7.2) and Prac 12 (Read first; Activities 12.1–12.2).

**Why we read it.** A 24-year study in NT national parks that links mammal decline to the spatial pattern of fire: fire size, the amount of long-unburnt vegetation and the distance to large long-unburnt patches. It connects fire mosaics that you can map from satellites (Prac 07) directly to species outcomes, which is the core idea of species–landscape relationships.

**Aim.** To use long-term monitoring to test how fire regime and landscape factors relate to declines in native mammal richness and abundance in fire-prone savanna, and to identify fire management that could slow those declines.

**Data and methods.** Repeated surveys of mammals at monitoring sites in three large national parks in northern Australia over 24 years. Trends in richness and abundance were modelled with generalised linear mixed models against fire metrics (fire size, the extent of vegetation unburnt for at least 5 years, distance to large long-unburnt patches) and environmental gradients such as terrain ruggedness and habitat moisture.

**Key findings.**

- Mammal richness and abundance declined substantially over the monitoring period.
- Declines were stronger in less rugged terrain.
- Declines were more pronounced at sites exposed to larger fires, with less long-unburnt vegetation (at least 5 years without fire), and further from large long-unburnt patches.
- The authors recommend keeping relatively large, connected areas of long-unburnt habitat, together with smaller fires, rather than many small, scattered unburnt patches.

**Link to the NT and this unit.** Every fire metric in this paper can be derived from the burned-area products in Prac 07: fire size, time since fire, and distance to long-unburnt patches. Read it alongside Evans & Russell-Smith (2020) from Article review 2, who found that longer-unburnt habitat was the one target fire management was not meeting.

**Limitations to think about.** Monitoring sites are in national parks, so results may differ on pastoral land. The study is correlative: fire, grazing and predators act together (see Stobo-Wilson et al., 2020). Fire metrics depend on the resolution and accuracy of the fire mapping, and small patchy burns may be missed.

**Key terms.** long-term monitoring; long-unburnt habitat; fire size; pyrodiversity; patch isolation; generalised linear mixed models; terrain ruggedness (refugia)

**Discussion questions**

1. Why might rugged terrain protect mammals from decline?
2. Explain, in landscape-ecology terms, why one large long-unburnt patch may be better than several small ones with the same total area.
3. How would you map "distance to the nearest large long-unburnt patch" for your tile from MCD64A1 or FireCCI51 in Earth Engine?

> **Extension.** ENV506: Using Prac 07 data for your fire window, map time since fire for your tile and calculate the area and size distribution of patches unburnt for at least 5 years. Discuss what the result means for mammal conservation, citing this paper and its limitations.

## Further reading (optional)

- Zou, Y., et al. (2025). Fragmentation increased in over half of global forests from 2000 to 2020. Science. https://doi.org/10.1126/science.adr6450 (read with Ma et al., 2023: same period, different metrics, opposite headline).
- Wulder, M. A., Roy, D. P., Radeloff, V. C., Loveland, T. R., Anderson, M. C., et al. (2022). Fifty years of Landsat science and impacts. Remote Sensing of Environment, 280, 113195. https://doi.org/10.1016/j.rse.2022.113195
- Ward, M. S., Simmonds, J. S., Reside, A. E., Watson, J. E. M., Rhodes, J. R., Possingham, H. P., Trezise, J., Fletcher, R., File, L., & Taylor, M. (2019). Lots of loss with little scrutiny: The attrition of habitat critical for threatened species in Australia. Conservation Science and Practice, 1(11), e117. https://doi.org/10.1111/csp2.117
- Valavi, R., Guillera-Arroita, G., Lahoz-Monfort, J. J., & Elith, J. (2022). Predictive performance of presence-only species distribution models: A benchmark study with reproducible code. Ecological Monographs, 92(1), e01486. https://doi.org/10.1002/ecm.1486 (also on the Prac 12 reading list).
- Olofsson, P., Foody, G. M., Herold, M., Stehman, S. V., Woodcock, C. E., & Wulder, M. A. (2014). Good practices for estimating area and assessing accuracy of land change. Remote Sensing of Environment, 148, 42–57. https://doi.org/10.1016/j.rse.2014.02.015
