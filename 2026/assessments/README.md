[Home](../README.md) · [Schedule](../schedule-2026.md)

# ENV306/506 Summative assessment 2026

All four tasks use each student's own 20 km tile in the Daly River Catchment. AT2 explains vegetation condition and its climate drivers, and AT3 interprets land cover change; together they build the skills that AT4 applies to new questions in one integrated landscape assessment. AT4 does not reuse AT2 or AT3 work, so no analysis is marked twice. Personal tiles and years make every student's numbers unique, and check values, version history, a supervised AT3 and an ungraded AT4 verification check (viva) verify the work. Every task maps to all four ULOs. Confirm the due dates in Learnline.

| Task | Weight | Linked pracs | ENV306 length | ENV506 length | Due |
| --- | --- | --- | --- | --- | --- |
| AT1 Project proposal: the plan for your AT4 | 10 % | 01, plus the AT4 design | 700 words ± 10 % (630–770) | 1000 words ± 10 % (900–1100) | Fri 6 Nov 2026, 11:59 pm |
| AT2 Magazine article: vegetation condition and climate drivers | 30 % | 02, 03 | 700–1000 words | 1000–1500 words | Fri 20 Nov 2026, 11:59 pm |
| AT3 Critical assessment: short answers on land cover change | 10 % | 04, 05 | 400–500 words | 500–700 words | In class, Thu 5 Nov 2026, 3:30–4:30 pm |
| AT4 Integrated landscape assessment: scientific article + ungraded verification check (viva) | 50 % | All (core 02–08 and 11; one elective from 09, 10, 12 or 13) | 2000 words ± 10 % (1800–2200) | 3000 words ± 10 % (2700–3300) | Fri 11 Dec 2026, 11:59 pm; check-ins Mon 9, Tue 10, Thu 12 and Fri 13 Nov |

Word limits exclude the title, references, figure and table captions, and the appendix.

## Scenario: the Daly River Catchment monitoring program

The Daly River Catchment is under growing pressure from land clearing for agriculture, demand for irrigation water, changing fire regimes and a variable climate. It also holds valued river and floodplain ecosystems, and it is Country of deep cultural significance to its Traditional Owners. A catchment advisory group has commissioned a satellite monitoring program and divided the catchment into 20 km monitoring tiles. **You are the analyst responsible for one tile.**

| Task | Your role | What you deliver | Audience |
| --- | --- | --- | --- |
| AT1 | Analyst | A project plan for monitoring your tile | The program manager |
| AT2 | Analyst | A feature article on vegetation condition and climate drivers | Land managers and the interested public |
| AT3 | Analyst | A briefing note answering the program manager's questions on your change matrix (in class) | The program manager |
| AT4 | Analyst (ENV306) or senior analyst (ENV506) | A technical article with a recommendation, explained at two morning check-ins (an ungraded viva) | The advisory group and its scientific reviewers |

ENV506 students act as senior analysts: in AT4 they also advise on the design of the monitoring program and on how far its results can be relied on for decisions.

The advisory group, its program manager and the decisions they face are hypothetical. Real policies, plans and legislation can be cited as background, but the scenario does not describe any real agency's decisions.

**Note for staff:** before release, check how Aboriginal knowledge and interests are represented in the scenario with CDU's Indigenous academic staff or the relevant land council contacts.

## Personal parameters (Day 1, Assignment 1 briefing)

Each student runs [`prac00_my_study_tile.js`](../scripts/prac00_my_study_tile.js) with their student number and records:

- a 20 × 20 km **tile in the Daly River Catchment** (used in AT2, AT3 and AT4);
- an **AT2 focus year** (2005–2024), whose rainfall and vegetation condition they characterise;
- an **AT3 year pair** (2014–2024, 5–8 years apart);
- **AT4 parameters:** a clearing period (Part 2), a 10-year fire window (Part 3), and one setting for each elective (an assigned species, a pair of AlphaEarth years, a focal crocodile river system, and an urban site and year pair).

Staff keep the master allocation sheet and check, before allocation, that each listed species has enough Atlas of Living Australia records.

## Safeguards against AI-generated work

No take-home task can be made completely "AI-proof". This design follows TEQSA's *Assessment reform for the age of artificial intelligence* (Lodge et al., 2023): assess process, personalise data, and secure key outcomes under supervision.

| Safeguard | How it works | Applies to |
| --- | --- | --- |
| 1. Personalised tile and years | Results are unique to each student. | AT1–AT4 |
| 2. Re-runnable check values | A versioned Code Editor link (or a Python/R notebook, or a QGIS model plus its export script) and a results log with three check values at staff-specified coordinates. Markers re-run the work, and the values must match. | AT2, AT4 |
| 3. Process evidence | Version history across at least 3 dates, Tasks screenshots, and figures labelled with the student ID and tile code. | AT2, AT4 |
| 4. Supervised writing | AT3 is answered in class, with no generative AI, on unseen questions about the student's **own** transition matrix. | AT3 |
| 5. Oral verification | Two ungraded AT4 morning check-ins (ENV306 4 min; ENV506 5 min each), with a checkpoint record and the 50 % cap if the student cannot explain their work; and the ENV506 AT1 pitch. | AT1 (506), AT4 |
| 6. Internal consistency | AT4 parts reuse each other's numbers (e.g. woodland area in Part 1 and cleared area in Part 2). Markers cross-check them. | AT4 |
| 7. Feedback loop | A response-to-feedback table shows how AT1 feedback on the plan was applied in AT4. | AT4 |
| 8. Situated content | NT data, in-class references, and the student's own error analysis. | All |
| 9. Verifiable references | A DOI or stable URL for every reference. | All |
| 10. GenAI declaration | Permitted: debugging, grammar, explaining errors. Not permitted: generating analysis, interpretation, figures or references. | All |

**Viva gate (AT4):** the check-ins are ungraded: they add no marks. If the student still cannot reproduce or explain their workflow after the second check-in, or the article does not match the checkpoint record, the AT4 mark is capped at 50 % of the awarded mark, with a possible integrity referral.

**Restricted data:** the crocodile survey data and floodplain shapefiles come from Learnline only. Students must not post them publicly, and should share their assets only with markers.

**Grade bands:** HD 85–100 %, D 75–84 %, C 65–74 %, P 50–64 %, F below 50 % (confirm against the CDU grading policy). Each criterion is marked against its descriptors and weighted as shown; for ENV506, the descriptors also cover the extra elements named in brackets.

## AT1 — Project proposal (10 %)

**Role and audience:** as the analyst for your tile, you submit a project plan to the program manager.

Students plan their **integrated AT4** for their own tile. The elective named in AT1 is provisional and is confirmed by Fri 13 Nov.

- **ENV306 (700 words ± 10 %):** the management question for your tile and its end user; landscape-ecology framing; a Code Editor map of your tile with your student ID; a planning table giving the data and method for each AT4 part; your choice of Part 4 or an elective; validation plan; timeline; at least five references with DOIs; a working script link.
- **ENV506 (1000 words ± 10 %):** as for ENV306, plus:
  - testable hypotheses grounded in theory, including one on attribution (climate, fire or clearing);
  - a multi-sensor design (optical, SAR and lidar; Pracs 08–11);
  - a validation sample-size or spatial cross-validation design;
  - a plan for carrying uncertainty from Part 1 into Parts 2, 5 and 6;
  - the decision pathway;
  - at least eight references (at least five since 2020);
  - a **3-minute pitch with 2 minutes of Q&A** (Fri 6 Nov, Session 4).

| Criterion (ENV306 / ENV506 weight) | HD | D | C | P | F |
| --- | --- | --- | --- | --- | --- |
| Management question and landscape-ecology framing (25 % / 20 %; ENV506: plus hypotheses) | Sharp, decision-relevant question for your tile and end user, framed with landscape-ecology theory and current literature; ENV506 hypotheses are testable and include attribution | Clear question and end user, well framed with relevant concepts; ENV506 hypotheses sound with minor gaps | Reasonable question; framing relevant but general; ENV506 hypotheses loosely tied to theory | Question broad or weakly linked to your tile; limited framing; ENV506 hypotheses vague or untestable | No clear question or end user, or not about your tile; ENV506 no hypotheses |
| Data and methods for each part (30 % / 25 %; ENV506: plus multi-sensor design) | Every AT4 part has justified, feasible data and methods adapted to your tile and years; ENV506 optical–SAR–lidar design is coherent and justified | All parts planned with suitable data and methods; minor gaps in justification | Most parts planned appropriately; some choices generic or unjustified | Core parts planned superficially; feasibility unclear | Parts missing, unsuitable data or methods, or plan not tied to your tile |
| Validation and end user (20 % / 30 %; ENV506: plus sample-size design, uncertainty plan and decision pathway) | Specific validation for each part (reference data, sample size, metrics) and a clear path from results to the end user's decision; ENV506 elements all explicit | Sound validation for most parts and a clear end-user link; ENV506 elements mostly present and justified | Validation named but not specified; end-user link general | Minimal validation; end user mentioned only in passing | No validation plan or end user |
| Working script (15 % / 15 %; ENV506: plus pitch) | Shared script runs without errors, is tidy and commented, and shows your tile; ENV506 pitch clear, on time, questions handled confidently | Script runs with minor issues; ENV506 pitch clear, answers mostly sound | Script runs in part or needs fixes; ENV506 pitch adequate | Script incomplete but starts the workflow; ENV506 pitch unclear or over time | No working script or link; ENV506 no pitch |
| Communication and referencing (10 % / 10 %) | Concise, well organised, within the word limit; at least 5 (ENV506: 8) current references, all with DOIs or stable URLs, correctly cited | Clear and well organised; reference minimum met, minor citation errors | Generally clear; some structure or citation issues | Understandable but disorganised, or below the reference minimum | Hard to follow, outside the word limit, or references missing or unverifiable |

## AT2 — Magazine article: vegetation condition and climate drivers (30 %), from Pracs 02–03

**Role and audience:** the advisory group publishes a feature article from each analyst for land managers and the interested public. Write for readers who know the land but not remote sensing.

**Task:** *Is the vegetation in your tile changing, and is climate the reason?* Write a short scientific article for a magazine read by ecologists and land managers. Cover the background (including past studies), aim, study area, methods, results, discussion and references.

- **ENV306 (700–1000 words):**
  1. an NDVI or EVI trend map of your tile for 2001–2024 (MODIS), with Sen's slope and Mann–Kendall significance, and the area greening and browning;
  2. seasonality from harmonic regression (amplitude and timing of peak greenness) for at least two land covers in your tile;
  3. rainfall anomalies (CHIRPS) and VCI/VHI for your focus year, compared with the long-term record;
  4. an interpretation: is rainfall consistent with the trend, what else could explain it, and what does it mean for land managers?
- **ENV506 (1000–1500 words):** as for ENV306, plus:
  1. a Benjamini–Hochberg false-discovery-rate correction of the trend significance;
  2. a gamma-fitted SPI (3- and 12-month) and the lagged correlation between rainfall and NDVI;
  3. RESTREND: the trend in NDVI residuals after rainfall, mapping change that rainfall does not explain;
  4. LST and ET (or the evaporative stress index) to locate water stress in your focus year.

The appendix contains the script link, results log and check values, process evidence and the GenAI declaration.

| Criterion (ENV306 / ENV506 weight) | HD | D | C | P | F |
| --- | --- | --- | --- | --- | --- |
| Trend and seasonality analysis (25 % / 20 %) | Sen's slope, Mann–Kendall and harmonic analysis correct for your tile; significance reported and interpreted; greening and browning areas quantified | Correct analysis with minor gaps in reporting or interpretation | Mostly correct; significance or seasonality only partly interpreted | Basic trend map or series with errors, or no significance testing | Missing, incorrect, or not for your tile |
| Climate drivers: rainfall anomalies and drought indices (20 % / 15 %) | Rainfall anomalies and VCI/VHI for your focus year placed in the long-term record and convincingly linked to the trends | Drivers computed correctly and linked to the trends, with minor gaps | Drivers computed; link to the trends descriptive rather than analytical | Drivers partly computed or not linked to the trends | Drivers missing or incorrect |
| Figures and maps (15 % / 10 %) | Publication-quality maps and charts with legends, scales, units, student ID and tile code; every figure makes a point | Clear, complete figures with minor formatting issues | Adequate figures; some elements missing (legend, units, labels) | Figures hard to read or incomplete; labelling missing | Figures missing, unlabelled, or not from your own analysis |
| Interpretation and management relevance (15 % / 10 %) | Weighs climate against other explanations (clearing, fire, woody thickening) and gives specific, realistic implications for land managers | Sound interpretation with clear management implications | Reasonable interpretation; implications general | Mostly descriptive; little management relevance | No interpretation, or conclusions not supported by the results |
| ENV506: FDR correction, gamma SPI and lags, RESTREND, LST/ET (— / 25 %) | All four applied correctly and built into the argument | All four applied correctly; only partly built into the argument | Three applied correctly, or all four with some errors | One or two applied, or several with major errors | Missing or incorrect |
| Writing for the magazine audience (10 % / 5 %) | Engaging, accurate and accessible to readers who know the land but not remote sensing; within the word limit; correctly referenced | Clear and accessible, with minor lapses into jargon | Generally readable; some unexplained jargon or structure issues | Hard for the audience to follow, or poorly structured | Unsuitable for the audience, outside the word limit, or references missing |
| Verification and process evidence (15 % / 15 %) | Script, results log and check values all match on re-run; version history across at least 3 dates; complete GenAI declaration | Evidence complete; check values match, minor documentation gaps | Most evidence present; small discrepancies explained | Evidence incomplete, or check values partly unmatched | Evidence missing, or check values do not match (may lead to an integrity review) |

## AT3 — Critical assessment: short answers (10 %), from Pracs 04–05, supervised

**Role and audience:** the program manager has your transition matrix and calls you in for a briefing. Your answers form a briefing note: short, specific and honest about uncertainty.

**Before (Prac 05, Thu 5 Nov, Session 1):** run [`prac05a_transition_matrix.js`](../scripts/prac05a_transition_matrix.js) for your tile and AT3 year pair, using your Prac 04 training points, and export your transition matrix.

**In class (Thu 5 Nov, 3:30–4:30 pm, no generative AI, lockdown Learnline or paper):** answer the program manager's unseen questions about **your own** matrix, such as:

1. Report and explain the transition matrix.
2. Explain the relationship between woodland and agriculture.
3. Justify the uncertainty in the woodland–agriculture change, given that the data are remotely sensed.
4. Explain the relationship between water, agriculture and bare soil.
5. Discuss the sources of uncertainty in that change.

- **ENV306:** 400–500 words.
- **ENV506:** 500–700 words. Also quantify how a stated classification error rate (given in class) would change the woodland-loss estimate, and judge whether the matrix is fit for a named NT decision.

| Criterion (ENV306 / ENV506 weight) | HD | D | C | P | F |
| --- | --- | --- | --- | --- | --- |
| Correct reading of own transition matrix (30 % / 20 %) | Persistence and the main transitions reported accurately with correct areas and units; dominant change and any implausible transitions identified | Accurate reading with minor omissions | Mostly correct; some values misread or key transitions missed | Partly correct, with several errors | Matrix misread or not your own |
| Explanation of land cover relationships (30 % / 25 %) | Woodland–agriculture and water–agriculture–bare soil relationships explained with Daly-specific processes (clearing, irrigation, seasonality, fire) | Sound explanations with relevant processes | Plausible but general explanations | Limited or partly incorrect explanations | No explanation, or incorrect |
| Uncertainty and error sources (40 % / 30 %) | Specific error sources (classification error and how it compounds between two maps, image dates and phenology, training data) justified, with their likely effect on your numbers | Several relevant sources, soundly reasoned | Some relevant sources; reasoning general | Few sources; weak reasoning | Uncertainty not addressed |
| ENV506: quantified error impact and fitness for a decision (— / 25 %) | Correctly quantifies how the given error rate changes the woodland-loss estimate, and makes a well-argued judgement on fitness for the named decision | Correct quantification; judgement sound but brief | Quantification with minor errors; judgement general | Attempted, with major errors | Not attempted, or incorrect |

## AT4 — Integrated landscape assessment (50 %) + ungraded check-ins

**Role and audience:** the advisory group must make a decision that affects your tile. Your article goes to the group and its scientific reviewers, and you explain your analysis at two morning check-ins (an ungraded viva). ENV506 senior analysts also advise on the design of the monitoring program.

**Question:** *What is changing in your tile, why, and what should managers do?* Write a submission-ready article in the format of the MDPI *Remote Sensing* template: Abstract; Introduction (literature review, aims and objectives); Methods; Results; Discussion (with limitations); Conclusion; References. Figures and tables carry the results; method details go in the appendix.

| Part | Question | What you produce | Pracs |
| --- | --- | --- | --- |
| 1 Pattern | What is where, and how fragmented is it? | A Random Forest land cover map of your tile from your own training and validation points; error matrix, producer's and user's accuracy, area per class; at least two landscape metrics | 04 |
| 2 Change | What changed, when, and how fast? | Clearing and regrowth over your clearing period (Hansen GFC and Sentinel-2), and the disturbance history from LandTrendr or CCDC | 05, 06 |
| 3 Drivers | Is the change linked to climate or fire? | Climate over your clearing period and fire window (CHIRPS rainfall anomalies, or SPI/SPEI), tested against the year-to-year clearing, regrowth and burned area from Parts 2–3; fire frequency and seasonality over your 10-year window (MCD64A1 checked against ESA FireCCI51, `ESA/CCI/FireCCI/5_1`); burn severity for one fire year, with the NT season classes compared with Key & Benson | 02, 03, 07 |
| 4 Beyond optical | What do SAR and lidar add? | Sentinel-1 (linear units) for wet-season change, inundation or cloud-free clearing detection, and GEDI canopy height or biomass by land cover class | 08, 11 |
| 5 Elective (choose one) | A linked case study | (a) habitat suitability for your assigned species, with spatial-block cross-validation and the effect of your Part 2 clearing; (b) AlphaEarth embeddings tested against your Part 1 map and Part 2 change for your AlphaEarth years; (c) crocodile biomass vs floodplain inundation for your focal river within the multi-river model; (d) urban expansion at your assigned site and years with Sentinel-1 | 12, 13, 09, 10 |
| 6 Synthesis | What should a named NT decision-maker do, and how certain is that advice? | An integration of the parts, their uncertainties, and a recommendation for a named decision (e.g. a clearing permit, a fire management plan, water allocation) | All |

- **ENV306 (2000 words ± 10 %):** Parts 1, 2, 3 and 6, plus **either** Part 4 **or** one elective (Part 5). Each part needs a reproducible workflow and an accuracy or validation step; the Discussion covers limitations.
- **ENV506 (3000 words ± 10 %):** all six parts, plus:
  1. an attribution analysis: how much of the change in your tile is associated with climate, fire and clearing, with effect sizes;
  2. area-adjusted accuracy with 95 % confidence intervals, carried into the change and elective estimates;
  3. a sensitivity analysis of at least two parameters;
  4. a scale analysis (e.g. tile vs catchment, or 30 m vs 250 m) interpreted through landscape-ecology theory;
  5. a policy evaluation of the named NT decision;
  6. advice on the monitoring program: what to measure, how often and at what resolution, and how far the results can be relied on for decisions.

Numbers reused across parts must agree; explain any difference.

**Viva: two morning check-ins (ungraded verification)**

The viva carries no marks. It confirms, while the work is fresh, that your AT4 analysis is your own. Instead of one long viva after the course, you have **two short check-ins in the first hour of the morning, after the AT4 work has been taught**. Each check-in covers the AT4 parts taught so far.

Staff place you in Group A or Group B from the class list, balancing group size and the number of ENV306 and ENV506 students. Your group is posted in Learnline by Fri 6 Nov, and your poster group comes from the same check-in group.

| Check-in | Group A | Group B | What is covered |
| --- | --- | --- | --- |
| First | Mon 9 Nov, 9:00–10:00 | Tue 10 Nov, 9:00–10:00 | Part 1 (land cover and accuracy), Part 2 (clearing, and LandTrendr or CCDC) and the fire analysis in Part 3, as far as you have gone |
| Second | Thu 12 Nov, 9:00–10:00 | Fri 13 Nov, 9:00–10:00 | Part 3 (fire and climate), Part 4 (SAR and lidar), your elective so far, and your synthesis plan |

- **ENV306 (4 min per check-in):** open your saved script and its version history, explain one step and one decision, and interpret one figure.
- **ENV506 (5 min per check-in):** as for ENV306; at the second check-in, also defend a method choice against an alternative the examiner proposes.
- **Checkpoint record:** the examiner notes your key values (for example, woodland area, cleared hectares, burned area) on a checkpoint record. The numbers in your submitted article must match it, or you must explain any change.
- **Missed check-in:** if you miss a check-in for an approved reason (for example, illness), you do it in the make-up slot (Fri 13 Nov, 3:30–4:30 pm) or online within one week of the end of the course.

The outcome is recorded as *satisfactory* or *not satisfactory*. If you cannot explain a part at your first check-in, you get help and try again at your second. If the outcome is still *not satisfactory* after the second check-in, or your article's numbers do not match your checkpoint record and a short online follow-up does not resolve it, your AT4 mark is capped at 50 % of the mark awarded for the article, with a possible integrity referral.

| Criterion (ENV306 / ENV506 weight) | HD | D | C | P | F |
| --- | --- | --- | --- | --- | --- |
| Introduction, landscape-ecology framing and management question (10 % / 10 %) | Concise, literature-based introduction framing a clear management question for your tile in landscape-ecology terms; aims follow directly | Clear framing and question; minor gaps in the literature | Adequate introduction; question somewhat general | Limited framing; vague question | No clear question or framing |
| Methods and reproducibility across parts (20 % / 15 %) | Methods for every required part are appropriate, justified and fully reproducible from the script and appendix; the markers' re-run matches | Appropriate and reproducible, with minor gaps | Mostly appropriate; some steps unclear or not reproducible | Incomplete or partly inappropriate methods | Methods missing or not reproducible |
| Results and accuracy of each part (20 % / 15 %; ENV506: validation, uncertainty, sensitivity) | Results for each part correct, clearly presented and validated; ENV506 area-adjusted accuracy with 95 % confidence intervals and a two-parameter sensitivity analysis | Correct results, each part validated; minor gaps | Results mostly correct; one part lacks validation | Results incomplete; validation weak | Results missing, incorrect or unvalidated |
| Integration: consistency across parts and synthesis (15 % / 15 %) | The parts form one argument; shared numbers agree or differences are explained; the synthesis answers the management question | Parts well linked; minor inconsistencies explained | Parts linked but largely separate; some inconsistencies unexplained | Little integration; inconsistencies not addressed | Disconnected parts or contradictory numbers |
| ENV506: attribution and scale analysis (— / 15 %) | Attribution quantifies climate, fire and clearing with effect sizes and caveats; scale analysis interpreted through landscape-ecology theory | Both analyses sound; interpretation partial | Both attempted; one weak | One attempted, or both with major errors | Missing |
| Discussion and recommendation for a named decision (10 % / 10 %; ENV506: plus monitoring-program advice) | Specific, defensible recommendation for a named decision, with limitations and uncertainty weighed; ENV506 monitoring advice practical and justified | Clear recommendation with limitations stated | Recommendation general; limitations listed but not weighed | Weak recommendation; limitations minimal | No recommendation, or unsupported |
| Verification and process evidence (15 % / 10 %) | Script, results log and check values all match on re-run; version history across at least 3 dates; complete GenAI declaration | Evidence complete; check values match, minor documentation gaps | Most evidence present; small discrepancies explained | Evidence incomplete, or check values partly unmatched | Evidence missing, or check values do not match (may lead to an integrity review) |
| Communication and referencing (10 % / 10 %) | Follows the MDPI template; concise and within the word limit; figures and tables carry the results; all references current and verifiable | Well structured, with minor issues | Generally clear; some structure or citation issues | Disorganised, or several citation problems | Unstructured, outside the word limit, or references missing or unverifiable |
