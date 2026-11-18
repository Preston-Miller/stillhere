# OffGrid AI document coverage audit

Audit date: November 16, 2026. Scope: the current Desktop/OffGridAI library, its browser-app index and ingestion/search code. Read-only inspection; no app, model, index, source document or retrieval setting was changed.

## Main conclusion

The library is a useful foundation for short-term disaster response, but is not yet a comprehensive reference for sustaining people through a prolonged loss of services. The largest content gaps are prolonged patient care, water-source assessment, practical power/utility systems and communications. Several other apparent gaps already have material in the collection and require better extraction, source selection and retrieval preparation rather than another download.

The most urgent issue is source quality: the browser app retrieves raw old manuals alongside newer guidance, without the review/eligibility distinctions used by the separate prototype package. More documents alone will not solve that.

## What actually exists now

- 25 original/local knowledge PDFs, including a newly added Army first-aid manual.
- 12 acquired reference PDFs, including the complete eight-part USDA canning set and the updated CDC disaster messaging guide.
- 27 offline web snapshots.
- The live browser-app database records 1,912 passages: 1,728 PDF passages from 37 PDFs, 158 web passages from 27 snapshots and 26 authored guide sections from eight documents. Build timestamp: November 16, 2026, 20:24, as recorded by the index.
- The browser app uses hybrid keyword/embedding retrieval, with qwen3-embedding:0.6b recorded in its index. The older rag-package manifest saying no vector index is built describes the separate prototype; it does not describe the current app.

Evidence: app/data/library.sqlite, app/README.md, app/build_index.py, app/library.py and app/server.py. Counts are index records, not a measure of validated knowledge or detail completeness.

## Priority findings

| Priority | Area | Existing coverage | Important gap | Recommended next source/work |
|---|---|---|---|---|
| Critical | Conflicting/outdated instructions | Both older manuals and newer public guidance are searchable | The app does not distinguish historical material from preferred current procedures | Add edition/date/audience/conflict metadata and isolate outdated sections before adding more overlapping medical manuals |
| Highest content priority | Care when help is delayed for hours or days | First aid, trauma chapters and short wound-care material | Continuing observation, care logs, basic nursing/hygiene, dressing/splint follow-up, resource planning and handoff | Assess the 2025 HJF/USU layperson prolonged-casualty-care guide; separate layperson content from advanced clinical procedures |
| High | Drinking-water source assessment | Boiling, bleach dosing, storage; non-potable rainwater harvesting | Roof/runoff/container contamination, rainwater testing, flooded wells/cisterns, selecting verified filters/UV and maintenance | CDC rainwater/well/cistern guidance plus exact manufacturer manuals; keep chemical-contamination exclusions beside treatment instructions |
| High | Practical power, heating and utilities | Outage checklists and CO prevention | Generator installation boundaries, transfer equipment, battery/inverter/solar limits, safe alternative heat, water/gas/electric shutoffs | Manufacturer manuals and official utility/fire/electrical safety documents; avoid generic repair instructions where models differ |
| High | Current first-aid baseline | 2019 St. John guide, historical Army manuals, individual current web references | One consistent contemporary adult/child/infant procedure set, accurate diagrams and version conflict resolution | Current authoritative first-aid/CPR source set, with independent medical review; refresh rather than just add more old manuals |
| High | Radio communications without internet/cellular service | General preparedness mentions radios; Army signaling chapter | Radio controls, power planning, antenna limitations, check-in/message procedures and jurisdiction-specific channel rules | Official public-service/communications references and chosen radio manuals |
| Medium-high | Sanitation across a prolonged outage | Bucket toilets, handwashing, diapering and shelter hygiene | Multi-day waste storage/disposal, local permission, sewage backup/septic failure and sustainable facilities | Current public-health emergency toilet/waste guidance plus local utility rules; develop the existing CDC material |
| Medium | Dental and everyday illness | Limited dental-trauma material and basic illness references | Dental pain/swelling, common prolonged-care problems and clear escalation boundaries | Current layperson dental/emergency-health references; avoid improvised invasive treatment |
| Medium | Field shelter and practical outdoor skills | Detailed older Army shelter/fire/navigation material; offline maps being built | Modern corroboration, original usable diagrams and equipment-specific limits | A traceable complete survival reference and current park/search-and-rescue guidance; this is not an entirely absent topic |

The searches found no matches for terms such as “prolonged casualty,” “charge controller,” “inverter,” “transfer switch,” “GMRS” or “amateur radio” in the app index. These are signals of thin coverage, not proof that every synonymous concept is absent. Topic judgments also used document purposes, contents and existing guide boundaries.

## Important strengths: do not redownload these blindly

### Food preservation

All USDA canning sections are present: [introduction](../reference-sources/USDA-Canning-Introduction-2015.pdf), [principles](../reference-sources/USDA-Canning-Guide-1-2015.pdf), [fruit](../reference-sources/USDA-Canning-Guide-2-2015.pdf), [tomatoes](../reference-sources/USDA-Canning-Guide-3-2015.pdf), [vegetables](../reference-sources/USDA-Canning-Guide-4-2015.pdf), [meat/poultry/seafood](../reference-sources/USDA-Canning-Guide-5-2015.pdf), [fermented/pickled foods](../reference-sources/USDA-Canning-Guide-6-2015.pdf) and [jams/jellies](../reference-sources/USDA-Canning-Guide-7-2015.pdf). The main work is preserving complete recipes, table headers, altitude adjustments, jar sizes and processing prerequisites across retrieval boundaries. Do not infer that the lack of approved recipe chunks means the underlying source is missing.

### Broader disaster public health

[CDC Preparedness and Safety Messaging, Second Edition, updated 2025](../reference-sources/CDC-Disaster-Preparedness-Safety-Messaging.pdf) is 68 pages. Its contents include medications/insulin (PDF pp. 28–29), shelter hygiene and diapering (pp. 30–33), pregnant/postpartum people and infants (pp. 47–52), older adults and chronic conditions (pp. 54–63), and pets (p. 65). It also covers cleanup, food/water, electrical hazards, bites and coping. These are not empty subject areas. They need to be developed and supplemented where specific equipment, care plans or prolonged care exceed its scope.

### Disaster checklists and immediate response

Earthquake, flood, hurricane, tornado, wildfire, extreme heat, outages and initial radiation protection are represented. Greater depth and source reconciliation matter more than collecting another set of similar two-page checklists.

## Newly added Army first-aid manual

[Army-First-Aid-FM-4-25-11.pdf](../knowledge/Army-First-Aid-FM-4-25-11.pdf) is 227 pages and 2,621,944 bytes. Its base publication is **First Aid, FM 4-25.11, December 23, 2002**, with **Change 1 dated July 15, 2004**. The later date is not a modern medical revision. Its contents cover trauma, airway/breathing, bleeding, burns, fractures, climatic injuries, bites, chemical/biological/radiation settings and psychological first aid. It adds illustrations and depth, but does not close the current-guideline or prolonged-care gaps merely by being added. The index already includes its 227 pages as 235 passages.

## RAG issues that look like document gaps

1. **Historical advice is available as current-looking evidence.** The raw older Army survival manual's PDF p. 25 says a buddy can periodically release a tourniquet. The current Red Cross reference says not to loosen/remove it except by medical professionals. The raw page is in app/data/library.sqlite; this is confirmed availability for retrieval, not a claim that a particular live answer used it.
2. **Source preference is not encoded.** The browser app's SYSTEM prompt says to follow an excerpt when it conflicts with model knowledge, but the database has no edition/review/obsolete-section fields. A matching citation is evidence of origin, not evidence of factual currency.
3. **A professional protocol can look like lay instructions.** Military and clinical material needs audience metadata. More clinical text does not automatically provide an appropriate procedure for an untrained person.
4. **Some pages are not meaningfully extracted.** Emergency-Childbirth.pdf has garbled text despite producing index records. First-Aid.pdf has 320 of 340 pages represented; low-text pages are skipped. Skipped pages may be blank/illustrated; this is not proof of lost instructions, but warrants visual/OCR review.
5. **Fixed windows and page boundaries can detach instructions.** The app uses 320-word windows with 60-word overlap, groups matches by page and sends up to three windows per source. A multi-page canning recipe, figure or qualification can remain outside the retrieved evidence. It also indexes guide procedure_text rather than the full context text carrying shared limits.
6. **The no-source path generates from model knowledge.** The UI distinguishes model knowledge from cited library text, which is useful transparency, but it is not a substitute for a missing document or proof that the unsupported answer is safe.

These findings are an audit, not a request to remove all older documents. Historical sources can be retained for comparison while limiting which sections support actionable answers.

## Useful sources verified during this audit

- [HJF/USU announcement: A Practical Guide to Prolonged Casualty Care](https://www.hjf.org/news/new-guide-layperson-providing-prolonged-casualty-care-hjf-and-usu), September 22, 2025. Explicitly intended for laypeople assisting casualties for hours to days. Candidate to acquire/review, not already cleared or ingested.
- [CDC rainwater collection and health](https://www.cdc.gov/drinking-water/about/collecting-rainwater-and-your-health-an-overview.html), reviewed November 10, 2026. Addresses collection surfaces, chemicals/germs, maintenance, first-flush diversion and testing.
- [CDC well-water testing](https://www.cdc.gov/drinking-water/safety/guidelines-for-testing-well-water.html) and [treatment](https://www.cdc.gov/drinking-water/safety/guidelines-for-treating-well-water.html). Candidates for the missing assessment/verification layer.
- [FDA safe drug use after disasters](https://www.fda.gov/drugs/emergency-preparedness-drugs/safe-drug-use-after-natural-disaster) and [emergency insulin storage](https://www.fda.gov/drugs/emergency-preparedness-drugs/information-regarding-insulin-storage-and-switching-between-products-emergency). Supplement existing CDC medication coverage, rather than starting it from zero.
- [FEMA utility shutoff/preparedness](https://www.fema.gov/pdf/areyouready/basic_preparedness.pdf). Local utility and equipment instructions still matter.
- [Red Cross tourniquet guidance](https://www.redcross.org/take-a-class/resources/articles/how-to-apply-a-tourniquet), used to verify the concrete historical conflict.

## Suggested next sequence

1. Establish current-source precedence and section-level exclusions in the actual browser-app ingestion path.
2. Add rainwater/well assessment and a modern prolonged-care reference.
3. Add power/utility and communications manuals.
4. Convert existing CDC family/chronic-care/sanitation material and USDA recipes into complete, reviewed retrieval units.
5. Evaluate representative questions against the browser app, including conflicting-source and missing-source cases. Citation presence and invented-number checks alone are insufficient.

This audit does not certify medical guidance, complete commercial rights, every PDF figure/table, equipment safety or actual model-answer behavior. It identifies source and preparation priorities from the inspected collection.
