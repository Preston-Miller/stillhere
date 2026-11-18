# OffGrid AI — content rights audit

Checked November 16, 2026. Screening assumption: a paid offline product distributed in the United States.

**Finding: the current library is not cleared for commercial release.** Free downloads, government hosting, attribution, and AI paraphrasing do not by themselves supply distribution or adaptation rights. This audit records evidence and remaining conditions; it is not a legal opinion or a worldwide clearance certificate.

Reviewed 94 local source assets (51 PDFs and 43 readable web snapshots), 19 additional citation-only records, and the source dependencies of 63 authored RAG units. HTML companions are the same source, not separate publications. Working originals represent archived duplicates; archives are not separately cleared. Software, model weights and dependency licenses are outside this content audit. Map data is addressed separately below.

## Decisions

| Local source category | Count | Meaning |
|---|---:|---|
| Conditional text reuse basis | 51 | A public-domain or permissive text basis exists, but notices, attribution, exact scope and product behavior still need to meet conditions. Whole PDFs, logos and images are not blanket-cleared. |
| Restricted / permission needed | 11 | An explicit restriction, reserved copyright or permission requirement prevents treating the download as commercial-product permission. |
| Unresolved; hold | 32 | Exact-file authorship or an applicable commercial grant has not been established. This is uncertainty, not a finding of illegality. |

No asset is marked final commercial-release-approved. This intentionally distinguishes a plausible permitted text use from a finished product that satisfies all applicable conditions.

## Confirmed restrictions

| Material | Evidence | Product decision |
|---|---|---|
| St. John First Aid Reference Guide, 2019 (`First-Aid.pdf`) | PDF p4 reserves adaptation, derivative-work and electronic-distribution rights. | Obtain written permission or replace. |
| A Practical Guide to Prolonged Casualty Care, 2025 | PDF p4: CC BY-NC-SA 4.0, Henry M. Jackson Foundation. Government-purpose rights are not a commercial license to us. | Keep out of commercial package unless separately licensed. |
| RDPO Emergency Toilet Guidebook | PDF p9 and publisher reproduction policy prohibit commercial use. | Obtain permission or replace. |
| MSKTC Wound Care After Burn Injury, August 2023 (`Burn-Care.pdf`) | PDF p5 requires prior permission for fee-based materials, despite allowing free attributed distribution. | Obtain permission for paid-product inclusion or replace. |
| DONCEAP flood guide (`Flood-Response.pdf`) | PDF p12: LifeCare, Inc., copyright 2013, all rights reserved. | Government-facing branding is not federal authorship. Obtain permission or replace. |
| USDR wildfire guide (`Wildfire-Response.pdf`) | PDF p5: copyright 2025, all rights reserved. | Obtain permission or replace. |
| Red Cross CPR, heat, tornado and outage checklists | Publisher terms allow personal noncommercial downloading; no commercial RAG redistribution grant. Outage sheet visually verified as Red Cross, copyright 2009. | Obtain product-specific permission or replace. |
| AHA 2025 CPR/ECC highlights and AHA cited pages | Copyright notices and AHA permission policy. Public access is not permission for commercial extraction/distribution. | Licensing must cover intended electronic use or replace. |
| WHO cholera Q&A cited by authored material | WHO website terms restrict commercial use without permission. No local cached copy found. | Resolve authored-source dependency; use CDC alternative where appropriate. |

Policy sources: [AHA](https://www.heart.org/en/about-us/statements-and-policies/copyright-permission-guidelines), [Red Cross](https://www.redcross.org/terms-of-use.html), [RDPO](https://rdpo.net/emergency-toilet), [WHO](https://www.who.int/about/policies/terms-of-use), [CC BY-NC-SA](https://creativecommons.org/licenses/by-nc-sa/4.0/). Local PDF notices are indexed by page in the JSON register; a copyright statement is not inferred from the filename.

## Conditional sources we can build around

**CDC:** Its policy supports reuse of qualifying agency public-domain content, subject to agency credit, a prominent nonendorsement disclaimer, notice of free availability and preservation of substantive content. Contractor, grantee and third-party exceptions exist. Keep AI-authored explanations distinct from official material; do not present an altered excerpt as CDC’s own. Figure and logo rights require separate treatment. [CDC policy](https://www.cdc.gov/other/agencymaterials.html).

**NHS:** Covered article text can be commercially reused under OGL v3.0 with NHS-specific conditions. Unchanged dated copies use the prescribed NHS attribution; adapted content follows a different attribution route. The terms limit charging specifically for NHS content and exclude some images and other assets. An offline dated-copy route exists; do not incorrectly assume everything must refresh weekly, or that AI adaptations retain NHS clinical approval. The burns citation and three dental pages fall within the body-text candidate scope, not a whole-site license. [Terms](https://www.nhs.uk/our-policies/terms-and-conditions/), [exclusions](https://www.nhs.uk/our-policies/terms-and-conditions/content-not-licensed-for-re-use/).

**FDA and NWS:** Their policies provide a text-reuse basis, subject to noted exceptions. NWS requires credit and forbids representing modified material as official. FDA says its website content is public domain unless otherwise noted. [FDA](https://www.fda.gov/about-fda/about-website/website-policies), [NWS](https://www.weather.gov/disclaimer).

**Other federal text:** Original federal-authored FEMA, USFA, CISA, military, NPS and regulatory text generally has a U.S. public-domain basis. This does not clear contractor content, privately authored contributions, agency branding or all illustrations. FM 4-25.11 includes an unlimited public-release statement; that statement is not by itself a copyright license for third-party components. [USAGov explanation](https://www.usa.gov/government-copyright), [NPS disclaimer](https://www.nps.gov/aboutus/disclaimer.htm), [GovInfo notice](https://www.govinfo.gov/about).

## Unresolved material

The register holds university slides, the NH childcare disease handbook, NYC childbirth protocol, an unattributed fractures deck, rainwater landscaping material, the private sanitation handout, Dragons earthquake planning material, the edited Army survival reprint, food-preservation chapter, and several collaborations. The childbirth protocol’s issuer was identified visually; text extraction alone was garbled. Missing notices do not establish public-domain status.

The USDA 2015 canning set credits university and grant-supported contributions. Its tested facts and procedures can inform independently written instructions, but this audit did not establish blanket rights to all wording, artwork and contributed material in the exact edition. The USDA/ICN food-safety pocket guide and FEMA/USDA/Red Cross food-and-water collaboration have the same authorship issue. This is a conservative release hold, not a claim that USDA canning facts are privately owned.

EPA sources also remain on hold for exact-file authorship and component checks. EPA explicitly cautions that individual documents can have different copyright conditions, so EPA hosting is insufficient as a blanket commercial clearance. State and county web sources similarly do not acquire federal public-domain status merely by ending in .gov. [EPA policy](https://www.epa.gov/web-policies-and-procedures/epa-disclaimers).

## Actual AI usage at audit time

The browser app database contained 2,732 passages. It included **452 passages from 10 restricted assets**, and 1,152 passages from 32 unresolved assets. Counts describe exposure, not adjudicated infringement.

The prolonged-care guide is already excluded by the index builder and had zero live passages. The RDPO guidebook and AHA highlights were live. The builder currently excludes only the prolonged-care guide by name and does not enforce the complete rights register. Earlier statements that incoming files were outside the index no longer describe the current app.

No source files, active database passages or app code were deleted or changed during this audit. The register is a release review record, **not an enforced runtime filter**. Do not distribute the existing folders, index, extracted passages or prior exports as a rights-cleared commercial package. Private possession and permitted personal use are separate questions from commercial bundling.

Active restricted sources:

- `knowledge/Burn-Care.pdf` — 11 passages.
- `knowledge/CPR.pdf` — 1 passages.
- `knowledge/Extreme-Heat-Response.pdf` — 5 passages.
- `knowledge/First-Aid.pdf` — 329 passages.
- `knowledge/Flood-Response.pdf` — 22 passages.
- `knowledge/PowerOutage-Response.pdf` — 5 passages.
- `knowledge/Tornado-Response.pdf` — 4 passages.
- `knowledge/Wildfire-Response.pdf` — 6 passages.
- `reference-sources/incoming/2026-11-16-coverage/current-first-aid/AHA-2025-CPR-ECC-Highlights.pdf` — 57 passages.
- `reference-sources/incoming/2026-11-16-coverage/sanitation/RDPO-Emergency-Toilet-Guidebook.pdf` — 12 passages.

## Authored guide dependencies

| Review result | Units |
|---|---:|
| conditions_and_authorship_review | 32 |
| unresolved_source_dependency | 19 |
| restricted_source_dependency | 12 |

Every authored unit is mapped to its cited sources in the register. A restricted citation does not automatically make independently written facts infringing. Conversely, changing words does not automatically clear close paraphrases, copied structure, selection, tables, figures or retained source passages. [Copyright Office: underlying methods versus expression](https://www.copyright.gov/circs/circ33.pdf).

Our commercial RAG design must separately consider (1) source/PDF bundling, (2) extracted text storage and searchable indexes, (3) user-visible excerpts, and (4) authored or AI-generated adaptations. Do not assume RAG or fair use supplies universal permission. Where permission is sought, describe each intended use, quantity, audience, territories, distribution format and paid-product context. No permission requests were sent.

## Offline map data — supplemental finding

The Utah map package and search database derive from OpenStreetMap/Protomaps. OSM’s ODbL permits commercial reuse with attribution and database-license obligations. The map UI includes an OSM copyright link and Protomaps credit, and the catalog records attribution. Before shipping, include an offline-readable license/notice and establish compliance for the distributed regional data and derived search database, including applicable share-alike/source-offer obligations. Do not assume these obligations apply to the entire app’s proprietary code. Map fonts/sprites have separate OFL/MIT notices in the asset tree and need preservation in packaging. [OSM license page](https://www.openstreetmap.org/copyright), [Protomaps terms](https://protomaps.com/legal). This is a data-rights check, not a complete software-dependency audit.

## Recommended release path

1. Build the commercial corpus from positively identified permitted text, keeping exact file hashes, source/edition, attribution and applicable conditions.
2. Replace restricted sources with suitable federal-authored or expressly commercially licensed alternatives; obtain written licenses only where the restricted work adds essential value.
3. Resolve unknown contributions/illustrations or leave them out. Never treat a missing license record as approval.
4. Review authored units for retained expression and source conditions; preserve procedural details while writing independently from verified facts.
5. Enforce an explicit allowlist in ingestion, retrieval, document viewing and export. Existing embeddings, full-text indexes, archived exports and user-visible excerpts must follow the same decision.
6. Verify required source credits, license texts, notices and no-endorsement statements in the actual offline UI and release package. Have remaining disputed/uncertain rights reviewed before commercial distribution.

## Complete local asset decisions

| Asset | Status | Live passages |
|---|---|---:|
| `knowledge/Army-First-Aid-FM-4-25-11.pdf` | conditional_text | 235 |
| `knowledge/Army-Manual.pdf` | hold | 389 |
| `knowledge/Bleeding-And-Wound-Care.pdf` | hold | 36 |
| `knowledge/Broken-Bones.pdf` | hold | 13 |
| `knowledge/Burn-Care.pdf` | restricted | 11 |
| `knowledge/CPR.pdf` | restricted | 1 |
| `knowledge/Disease.pdf` | hold | 134 |
| `knowledge/Emergency-Childbirth.pdf` | hold | 3 |
| `knowledge/Environmental-Injuries.pdf` | hold | 33 |
| `knowledge/Extreme-Heat-Response.pdf` | restricted | 5 |
| `knowledge/First-Aid.pdf` | restricted | 329 |
| `knowledge/Flood-Response.pdf` | restricted | 22 |
| `knowledge/Food-Preservation.pdf` | hold | 16 |
| `knowledge/Food-Safety.pdf` | hold | 72 |
| `knowledge/Food-Water.pdf` | hold | 8 |
| `knowledge/Hurricane-Response.pdf` | conditional_text | 4 |
| `knowledge/Nuclear-Response.pdf` | conditional_text | 3 |
| `knowledge/PowerOutage-Response.pdf` | restricted | 5 |
| `knowledge/Rainwater-Harvesting.pdf` | hold | 36 |
| `knowledge/Sanitation-in-a-Disaster.pdf` | hold | 4 |
| `knowledge/Tornado-Response.pdf` | restricted | 4 |
| `knowledge/Water-Disinfection.pdf` | hold | 5 |
| `knowledge/Water-Purification.pdf` | hold | 9 |
| `knowledge/Wildfire-Response.pdf` | restricted | 6 |
| `knowledge/earthquake-response.pdf` | hold | 3 |
| `reference-sources/CDC-Disaster-Preparedness-Safety-Messaging.pdf` | conditional_text | 107 |
| `reference-sources/CDC-Emergency-Wound-Care.pdf` | conditional_text | 2 |
| `reference-sources/CDC-Heat-Related-Illness.pdf` | conditional_text | 1 |
| `reference-sources/EPA-Cleaner-Air-Room-2026.pdf` | hold | 4 |
| `reference-sources/USDA-Canning-Guide-1-2015.pdf` | hold | 48 |
| `reference-sources/USDA-Canning-Guide-2-2015.pdf` | hold | 55 |
| `reference-sources/USDA-Canning-Guide-3-2015.pdf` | hold | 28 |
| `reference-sources/USDA-Canning-Guide-4-2015.pdf` | hold | 19 |
| `reference-sources/USDA-Canning-Guide-5-2015.pdf` | hold | 15 |
| `reference-sources/USDA-Canning-Guide-6-2015.pdf` | hold | 38 |
| `reference-sources/USDA-Canning-Guide-7-2015.pdf` | hold | 14 |
| `reference-sources/USDA-Canning-Introduction-2015.pdf` | hold | 11 |
| `reference-sources/incoming/2026-11-16-coverage/communications/CISA-AUXFOG-2016.pdf` | conditional_text | 117 |
| `reference-sources/incoming/2026-11-16-coverage/communications/CISA-NIFOG-2.02-2025.pdf` | conditional_text | 187 |
| `reference-sources/incoming/2026-11-16-coverage/communications/GovInfo-47-CFR-Part95-2025.pdf` | conditional_text | 201 |
| `reference-sources/incoming/2026-11-16-coverage/communications/Indiana-Emergency-Communication-Planning.txt` | hold | 3 |
| `reference-sources/incoming/2026-11-16-coverage/current-first-aid/AHA-2025-CPR-ECC-Highlights.pdf` | restricted | 57 |
| `reference-sources/incoming/2026-11-16-coverage/dental/NHS-Dental-Abscess.txt` | conditional_text | 3 |
| `reference-sources/incoming/2026-11-16-coverage/dental/NHS-Knocked-Out-Tooth.txt` | conditional_text | 3 |
| `reference-sources/incoming/2026-11-16-coverage/dental/NHS-Toothache.txt` | conditional_text | 3 |
| `reference-sources/incoming/2026-11-16-coverage/field-shelter-and-rescue/NPS-Outdoor-Emergency-Plan.pdf` | conditional_text | 5 |
| `reference-sources/incoming/2026-11-16-coverage/field-shelter-and-rescue/NPS-Ten-Essentials.txt` | conditional_text | 4 |
| `reference-sources/incoming/2026-11-16-coverage/medication-continuity/FDA-Insulin-Storage-and-Emergency-Switching.txt` | conditional_text | 8 |
| `reference-sources/incoming/2026-11-16-coverage/medication-continuity/FDA-Safe-Drug-Use-After-Disaster.txt` | conditional_text | 4 |
| `reference-sources/incoming/2026-11-16-coverage/power-and-utilities/FEMA-Basic-Preparedness-Utilities.pdf` | conditional_text | 32 |
| `reference-sources/incoming/2026-11-16-coverage/power-and-utilities/USFA-Heating-Fire-Safety.pdf` | conditional_text | 1 |
| `reference-sources/incoming/2026-11-16-coverage/power-and-utilities/USFA-Lithium-Ion-Battery-Safety.pdf` | conditional_text | 1 |
| `reference-sources/incoming/2026-11-16-coverage/power-and-utilities/USFA-Portable-Generator-Safety.pdf` | conditional_text | 1 |
| `reference-sources/incoming/2026-11-16-coverage/power-and-utilities/Victron-Wiring-Unlimited.pdf` | hold | 109 |
| `reference-sources/incoming/2026-11-16-coverage/prolonged-care/USU-Practical-Guide-Prolonged-Casualty-Care-2025.pdf` | restricted | 0 |
| `reference-sources/incoming/2026-11-16-coverage/sanitation/King-County-Emergency-Toilets.txt` | hold | 5 |
| `reference-sources/incoming/2026-11-16-coverage/sanitation/RDPO-Emergency-Toilet-Guidebook.pdf` | restricted | 12 |
| `reference-sources/incoming/2026-11-16-coverage/sanitation/Washington-DOH-Emergency-Toilets.txt` | hold | 4 |
| `reference-sources/incoming/2026-11-16-coverage/water-assessment/CDC-Choosing-Home-Water-Filters.txt` | conditional_text | 7 |
| `reference-sources/incoming/2026-11-16-coverage/water-assessment/CDC-Cistern-Safety-and-Disasters.txt` | conditional_text | 6 |
| `reference-sources/incoming/2026-11-16-coverage/water-assessment/CDC-Home-Water-Treatment-Systems.txt` | conditional_text | 5 |
| `reference-sources/incoming/2026-11-16-coverage/water-assessment/CDC-Rainwater-Collection-and-Health.txt` | conditional_text | 5 |
| `reference-sources/incoming/2026-11-16-coverage/water-assessment/CDC-Well-Disinfection-After-Emergency.txt` | conditional_text | 12 |
| `reference-sources/incoming/2026-11-16-coverage/water-assessment/CDC-Well-Water-Testing.txt` | conditional_text | 7 |
| `reference-sources/incoming/2026-11-16-coverage/water-assessment/CDC-Well-Water-Treatment.txt` | conditional_text | 4 |
| `reference-sources/incoming/2026-11-16-coverage/water-assessment/EPA-Private-Well-After-Flood.pdf` | hold | 3 |
| `reference-sources/incoming/2026-11-16-coverage/water-assessment/EPA-Selecting-Water-Treatment-Systems-2025.pdf` | hold | 13 |
| `reference-sources/web/src-037ecbe5f65ae0.txt` | conditional_text | 1 |
| `reference-sources/web/src-06174d692f1b23.txt` | conditional_text | 4 |
| `reference-sources/web/src-0908cb50b8f14b.txt` | conditional_text | 5 |
| `reference-sources/web/src-0e3d568e886729.txt` | conditional_text | 6 |
| `reference-sources/web/src-1e80d8463390e1.txt` | conditional_text | 5 |
| `reference-sources/web/src-237fcdfcd9ea69.txt` | conditional_text | 9 |
| `reference-sources/web/src-2393c9c565ce55.txt` | conditional_text | 8 |
| `reference-sources/web/src-372d89271404bd.txt` | conditional_text | 9 |
| `reference-sources/web/src-40af8fc4603fe0.txt` | conditional_text | 9 |
| `reference-sources/web/src-52d53f987b420e.txt` | hold | 5 |
| `reference-sources/web/src-7228150f0031bc.txt` | conditional_text | 5 |
| `reference-sources/web/src-72d658ee9dc459.txt` | conditional_text | 4 |
| `reference-sources/web/src-7acf4b4f44606e.txt` | hold | 8 |
| `reference-sources/web/src-8a065409bc528c.txt` | conditional_text | 4 |
| `reference-sources/web/src-8c5567780f8de8.txt` | conditional_text | 5 |
| `reference-sources/web/src-a18271af15b30f.txt` | conditional_text | 5 |
| `reference-sources/web/src-ae3ef0050d89a1.txt` | hold | 9 |
| `reference-sources/web/src-b74b256cd0f020.txt` | conditional_text | 4 |
| `reference-sources/web/src-bde5b3bbb0075f.txt` | conditional_text | 3 |
| `reference-sources/web/src-bf709ea714e360.txt` | conditional_text | 3 |
| `reference-sources/web/src-c3cc1cfaad64d3.txt` | conditional_text | 3 |
| `reference-sources/web/src-c4925d1caf53b7.txt` | conditional_text | 5 |
| `reference-sources/web/src-cd82c1a895ab11.txt` | conditional_text | 6 |
| `reference-sources/web/src-ce4e4288982d45.txt` | conditional_text | 4 |
| `reference-sources/web/src-cfeb059483560c.txt` | conditional_text | 5 |
| `reference-sources/web/src-de8fb0c0ae01fa.txt` | conditional_text | 6 |
| `reference-sources/web/src-fe5c1e7b306918.txt` | conditional_text | 16 |

The companion CSV/JSON contains owner/publisher, source URL, hash, local notice pages, reuse basis, required actions, citation-only sources and all 63 authored-unit dependencies. Policy captures are stored under `reports/rights-evidence-2026-11-16`; AHA and Red Cross policies were verified through browser retrieval because direct archival requests returned 403.
