import { createFileRoute } from "@tanstack/react-router";
import { DocPage } from "@/components/doc-page";

export const Route = createFileRoute("/methods")({ component: Methods });

function Methods() {
  return (
    <DocPage kicker="Methods appendix" title="How this archive sees, and what it cannot see">
      <p>
        Abu Hureirah Situation Room uses only publicly available satellite browse, thermal anomaly feeds, and
        unfiltered-or-public ADS-B aggregators. It is a documentation workbench for journalists,
        researchers, human-rights archivists, and humanitarian analysts. It is not a fire-control
        system.
      </p>

      <h2>God's Eye View layers</h2>
      <p>
        On top of the Sudan desk: MapLibre globe projection (GLOBE), a spy-telescope HUD, CARTO Dark
        Matter OSM streets, NASA Black Marble night lights, USGS M2.5+ quakes, ISS via Where The ISS
        At / CelesTrak, NASA EONET natural events, and Launch Library 2 upcoming pads. Same public-source
        idea as bilawalsidhu/gods-eye-view. No Google 3D tiles, no CCTV, no ALPR, no TeleGeography
        (non-commercial). Contacts within 250 km of the camera are a roster, not a track file.
      </p>
      <h2>Civilian change scan + DrishX freight</h2>
      <p>
        <strong>AUTO CHANGE SCAN</strong> pulls real Sentinel-2 L2A COGs from Element 84 Earth Search
        (no upload, no key), pairs before/after on the same MGRS tile, masks SCL cloud/shadow/water,
        and surfaces at most 30 land-change candidates for human review. IndexedDB stores reviews.
        That is change screening, not a damage inventory.
      </p>
      <p>
        <strong>FREIGHT SCAN</strong> is the DrishX / Fisser 2022 B02–B04 motion-smear extractor on
        OSM motorway/trunk/primary buffers. It counts large-vehicle smear candidates, with speed and
        heading from smear geometry. It cannot ID cars, cargo, or military vs civilian trucks. The
        original RF pickle is not in the browser; this is the spectral object extractor on public COGs.
      </p>
      <h2>Optical browse</h2>
      <p>
        Four public stacks, switched in the workspace: <strong>Sentinel-2 HLS</strong> (NASA
        GIBS <code>HLS_S30_Nadir_BRDF_Adjusted_Reflectance</code>, GoogleMapsCompatible Level 12,
        ~30 m, dated, latency typically 2–4 days), <strong>VIIRS daily</strong> (NOAA-20 true color,
        ~250 m), <strong>Sentinel-2 cloudless</strong> (EOX 2024 mosaic — morphology only, not a
        dated overpass), and <strong>high-res</strong> (Esri World Imagery for yards and roofs).
        HLS granules are not global every day; empty or cloudy tiles stay empty. Higher-resolution
        change notes in the archive still assume Sentinel-2 L2A at 10 m when an analyst has a
        lawfully obtained scene. Commercial Maxar/Airbus/Planet is not scraped.
      </p>
      <p>
        Object counting at 10 m is an estimate band, not a census. The interface stores ranges
        (for example 12–25 large vehicles) and states that pickups, technicals, and civilian 4x4s
        are not separable at this resolution.
      </p>

      <h2>Thermal / FIRMS</h2>
      <p>
        NASA FIRMS VIIRS 375 m (NOAA-20 and NOAA-21 public CSVs, 24 h / 48 h / 7 d, MODIS if VIIRS
        is empty) is ingested server-side, clipped to the Sudan-plus-corridors box, and deduped at
        about 375 m. No FIRMS_MAP_KEY is required for those CSVs. If the host is unreachable, the
        CSV has no header, or the box contains no rows, the health chip turns red and states the
        reason. A quiet zero while other feeds move is a desk failure, not a result. FIRMS is a
        thermal-anomaly feed, not a strike feed. Each point is classified agricultural, industrial,
        urban structure fire, possible explosive/combat-related, or unknown. Combat-related does not
        exceed “possible” without optical follow-up. Agricultural burning, oil flares, brick kilns,
        and gas flares are first-class negative evidence.
      </p>

      <h2>Flights</h2>
      <p>
        Live positions are requested from public ADS-B aggregators (adsb.lol, then adsb.fi) with
        OpenSky Network as a last-resort anonymous bbox query — the same public-source cascade
        documented by open dashboards such as World Monitor, reimplemented here without copying
        their code. We log registration, ICAO hex, type, operator if known, time over the AOI, and
        nearest airfield. We never claim cargo. Category (pax / cargo / bizjet / tanker / unknown)
        is typical for the airframe.
      </p>
      <p>
        ADS-B coverage in Darfur, Kordofan, Blue Nile, and the Libya desert tracks is sparse.
        Absence of a track is not absence of a flight. Coverage gaps are marked on the health
        chips. Scheduled passenger services are low priority unless they divert to unusual fields.
      </p>

      <h2>Ships — live AIS versus lane markers</h2>
      <p>
        Two layers, on purpose. <strong>Vessels (AIS)</strong> are positions from a public feed
        with an update age. The only keyless live feed wired today is the Strait of Hormuz Ship
        Monitor (Persian Gulf, Hormuz, Gulf of Oman). Those contacts are not Red Sea ships.
        Named corridors — Port Sudan, Suakin, Tokar, Trinkitat, Jeddah, Yanbu, Bab el-Mandeb —
        stay an <strong>AIS gap</strong> until a licensed public stream (AISStream or equivalent)
        is configured. The desk says “AIS not configured” rather than inventing hulls. Kufra is
        land; freight smear and ADS-B cover it, not drawings of ships.
      </p>
      <p>
        <strong>Lane markers</strong> crawl along documented corridors so the sea is not a blank.
        They are labeled NOT LIVE AIS. Category on a real AIS contact is typical-for-type
        (tanker, cargo, other). It is never a claim about cargo contents or arms.
      </p>

      <h2>Sentinel-1</h2>
      <p>
        Sentinel-1 RTC browse (public Planetary Computer scene, not a commercial SAR stack) sits
        next to optical in the basemap row. It is there for cloud gaps over Darfur and Kordofan.
        A cloudy Sentinel-2 granule is a coverage gap, not a negative, and the cloud chip says so.
        S1 does not identify vehicles, does not prove a damage type, and speckle is not wreckage.
        DET boxes do not run on this layer. One scene is not a mosaic.
      </p>

      <h2 id="colab">Train a better chip model on Google Colab</h2>
      <p>
        The sitroom’s auto-find is a weak-supervised linear classifier on seven chip stats
        (blobs, HV edges, edge density, excess-green, red, bitemporal delta, mean luminance).
        Confirm / Reject in the queue is the training step. That is not YOLO. To fit a stronger
        model on the same blueprint classes, use Colab:
      </p>
      <ol>
        <li>In the imagery sweep panel, press <strong>Export labels</strong> (your Confirm/Reject chips) and <strong>Export weights</strong> (current priors).</li>
        <li>Download <a href="/sudan-chip-train.ipynb">sudan-chip-train.ipynb</a> from this workbench.</li>
        <li>Open <a href="https://colab.research.google.com/">Google Colab</a> → File → Upload notebook → the ipynb.</li>
        <li>Runtime → Change runtime type → GPU (T4 is enough).</li>
        <li>Upload <code>ahsr-chip-samples.json</code> when the notebook asks. It trains a multinomial logistic model on the seven features (and optionally pulls Sentinel-2 HLS chips around each lat/lon if you enable Path B).</li>
        <li>The last cell writes <code>ahsr-chip-weights.json</code>. Download it.</li>
        <li>Back in the sitroom, <strong>Import Colab JSON</strong>. The next sweep uses those weights. Confirm/Reject still updates them online.</li>
      </ol>
      <p>
        Blueprint classes: <code>camp</code>, <code>veh</code>, <code>berm</code>, <code>burn</code>,{" "}
        <code>wreck_air</code>, <code>wreck_bldg</code>, <code>cargo</code>, <code>none</code>.
        Label morphology, not weapons. A burn scar is a scar. A pad is a pad. Occupancy and cargo
        remain human calls.
      </p>

      <h2>What was borrowed from the other workbenches</h2>
      <p>
        Public-code ideas only — not their brand, not their keys, not targeting:
      </p>
      <ul>
        <li><strong>War-Probability-OSINT</strong> — multi-domain fusion of weak signals (airlift, tankers, thermal, GDELT, headlines, UAE→Africa tracks) as a coincidence meter, not a war forecast.</li>
        <li><strong>IRONSIGHT</strong> — theater-scoped public RSS + ADS-B.lol + FIRMS, no keys. Already how this desk ingest works.</li>
        <li><strong>OSINT-War-Room</strong> — GDELT pulse + OSM military as observation layers.</li>
        <li><strong>aegis-osint-map / Shadowbroker / velocity</strong> — live flights/ships/bases on one dark map; inspect-to-yard zoom; human HITL before any claim.</li>
      </ul>
      <h2>Six-hour analytical engine</h2>
      <p>
        Every sweep compiles a commander one-pager in the Brief tab from the live ingest and the
        change log. The engine is a civilian OSINT curriculum: observation is not identification,
        identification is not assessment, assessment is not judgment. Ten recrawls of one Telegram
        clip remain one origin. Official statements are evidence that an actor claimed X.
        Confidence (quality of the judgment) is not probability (how likely an event is).
      </p>
      <p>
        Academic vocabulary is drawn from public teaching texts — US joint levels of war
        (tactical / operational / strategic) as in Jordan et al., <em>Understanding Modern Warfare</em>,
        and unclassified FM 3-90 (May 2023, unlimited distribution) labels for offensive types
        (movement to contact, attack, exploitation, pursuit) and the note that offense typically
        costs more sustainment than defense. Those words are descriptive labels for publicly
        reported activity. They are not employment guidance. Terrain discussion stays conceptual.
        The product still refuses targeting, fire-control, and kill-chain language.
      </p>
      <p>
        Pressing <strong>AI 48h</strong> is optional: a Grok pass over public reporting that may
        overlay the bottom line. The one-pager does not wait on that button. Actor profiles
        (SAF, RSF, neighbors) persist and update only when public evidence changes.
      </p>

      <h2>Open reporting & control</h2>
      <p>
        Google News RSS (Sudan + RSF/SAF/Darfur/Kordofan query, last 4 days) is geocoded against a
        town gazetteer. Pins are named-place centroids — not incident coordinates. The news panel
        says so. A Grok analyst brief runs only when you press the button; it is a lead list, not
        confirmation. Territorial control polygons are a coarse regional snapshot with an as-of
        date and a source list. They are not a live frontline.
      </p>
      <p>
        Open conflict cites are a shipped citation file of already-published points (dataset id,
        date, type, source URL). They are corroboration only — not live ACLED or UCDP, not
        verified by AHSR, and they cannot open a confirmed alert by themselves. If an official
        public token is later configured it may replace the file; a blocked API is not scraped.
      </p>
      <p>
        Seeded OSINT reports (Asosa IL-76, ENDF compound change detection, Bahir Dar shelters,
        Wadi Sayyidna hangar damage, El Fasher, Zamzam, Kurmuk) are published posts by named
        accounts, ingested as documentation — not original assessments by this archive. The card,
        the map popup, and the export say “ingested published post — not an AHSR assessment.”
      </p>

      <h2>Alerts</h2>
      <p>
        An alert card opens only when two or more indicator families co-occur, or when change
        exceeds a threshold the analyst set. Auto-text stays observational. Nothing is labelled
        “confirmed” without a human click. Default new detections to confidence 1 or 2.
      </p>

      <h2>Confidence rubric</h2>
      <ol className="list-decimal space-y-1 pl-5">
        <li>Single weak indicator.</li>
        <li>Repeated same indicator, no corroboration.</li>
        <li>Two indicator families, same site, multi-date.</li>
        <li>Three families plus consistent open-source reporting.</li>
        <li>High-res or ground media + multi-date satellite + reporting + movement chain.</li>
      </ol>

      <h2>Automated finding (DET)</h2>
      <p>
        The DET toggle runs a civilian chip pipeline adapted from the public playbook{" "}
        <a href="https://github.com/satellite-image-deep-learning/techniques" target="_blank" rel="noopener noreferrer">
          satellite-image-deep-learning/techniques
        </a>
        — tiling, image-quality and cloud gates, co-registered bitemporal difference, RGB stand-ins for
        NDVI/NBR, OSM weak labels, xView2-style damage <em>bins</em> (not classes), multimodal fusion
        with FIRMS, ADS-B, AIS-typical shipping, news/GDELT wire cues, and a plain-language explanation
        on every box. The hunt list is a GEOINT desk: BDA, cargo, air, sea, vehicle parks, compounds,
        non-army pads, earthworks, POL, camps, crossings, desert tracks, foreign-linked nodes, OSM gaps.
        We do not load YOLO,
        mmrotate, U-Net, Prithvi, or Clay weights; those need a GPU and still would only produce
        candidates. Default confidence is 1–2. A box is an observation, not an identification.
      </p>
      <p>
        Resolution gate: HLS is ~30 m. Compact bright pixels are labelled unresolved objects, never
        a vehicle or aircraft census. High-res Esri is morphology only and is not a dated scene.
        Sentinel-1 is available as a separate cloud-gap layer and is not used for vehicle census
        or DET boxes. Freight smear on OSM roads is “possible moving vehicles · not a count.”
        Agricultural FIRMS is negative evidence. Confirm / reject / needs-imagery is the
        active-learning loop. Auto boxes stay confidence 1 or 2 until a human confirms.
      </p>

      <h2>Reproducibility</h2>
      <p>
        Each observation stores sensor, scene ID, time, cloud percentage, notes, indicator
        families, and confidence. Exports (GeoJSON, CSV, briefing) print a limitations footer on
        every page. Party-label changes write an audit row with reason.
      </p>

      <h2>Free public feeds (no paid keys)</h2>
      <p>
        Live desk ingest uses keyless public sources by default: NASA FIRMS global CSV, adsb.lol /
        adsb.fi (OpenSky fallback), Hormuz Ship Monitor AIS (Gulf), Google News / Guardian / BBC /
        Al Jazeera / NYT Africa RSS, USGS / EONET where enabled, and NASA GIBS browse. AI leads
        cascade xAI → Groq → Gemini → OpenRouter → Pollinations → news-compiled so a Grok quota miss
        does not blank the Brief tab.
      </p>

      <h2>What we pulled from open dashboards</h2>
      <p>
        World Monitor (koala73/worldmonitor, AGPL) is a useful map of public sources: NASA FIRMS,
        ADS-B aggregators, OpenSky, GIBS-class browse, ACLED/UCDP as corroboration. This archive
        reuses those public contracts — gold-standard server-side ingest, freshness metadata,
        coverage-gap warnings — and does not copy their application code or targeting-adjacent
        language. Their military-flight seeder is intentionally not reproduced; we classify
        airframes, we do not hunt a party.
      </p>
    </DocPage>
  );
}
