//#region node_modules/.nitro/vite/services/ssr/assets/osint-wXO3XaAY.js
var CATEGORY_META = {
	"strike-damage": { label: "Strike / damage" },
	"vehicle-buildup": { label: "Vehicles / cargo" },
	"air-activity": { label: "Air activity" },
	"control-change": { label: "Control change" },
	displacement: { label: "Displacement" },
	other: { label: "Other" }
};
var GAZETTEER = [
	{
		name: "Khartoum",
		aliases: [
			"khartoum",
			"omdurman",
			"bahri",
			"khartoum north"
		],
		lat: 15.5007,
		lon: 32.5599,
		precise: true
	},
	{
		name: "El Fasher",
		aliases: [
			"el fasher",
			"al-fashir",
			"el-fasher",
			"al fashir",
			"fasher"
		],
		lat: 13.6279,
		lon: 25.3494,
		precise: true
	},
	{
		name: "Nyala",
		aliases: ["nyala"],
		lat: 12.0489,
		lon: 24.8807,
		precise: true
	},
	{
		name: "El Geneina",
		aliases: [
			"geneina",
			"el geneina",
			"ag geneina"
		],
		lat: 13.4526,
		lon: 22.4471,
		precise: true
	},
	{
		name: "Zalingei",
		aliases: ["zalingei"],
		lat: 12.9096,
		lon: 23.4706,
		precise: true
	},
	{
		name: "Ed Daein",
		aliases: [
			"ed daein",
			"el daein",
			"daein"
		],
		lat: 11.4614,
		lon: 26.1256,
		precise: true
	},
	{
		name: "El Obeid",
		aliases: [
			"el obeid",
			"el-obeid",
			"al-ubayyid",
			"obeid"
		],
		lat: 13.1833,
		lon: 30.2167,
		precise: true
	},
	{
		name: "Kadugli",
		aliases: ["kadugli"],
		lat: 11.0111,
		lon: 29.7167,
		precise: true
	},
	{
		name: "Dilling",
		aliases: ["dilling"],
		lat: 12.0497,
		lon: 29.6472,
		precise: true
	},
	{
		name: "Babanusa",
		aliases: ["babanusa", "babanousa"],
		lat: 11.3324,
		lon: 27.8079,
		precise: true
	},
	{
		name: "Port Sudan",
		aliases: ["port sudan"],
		lat: 19.6158,
		lon: 37.2164,
		precise: true
	},
	{
		name: "Kassala",
		aliases: ["kassala"],
		lat: 15.451,
		lon: 36.4,
		precise: true
	},
	{
		name: "Gedaref",
		aliases: [
			"gedaref",
			"al-qadarif",
			"gadaref"
		],
		lat: 14.0354,
		lon: 35.3837,
		precise: true
	},
	{
		name: "Wad Madani",
		aliases: [
			"wad madani",
			"wad medani",
			"madani"
		],
		lat: 14.4013,
		lon: 33.5199,
		precise: true
	},
	{
		name: "Sennar",
		aliases: ["sennar"],
		lat: 13.5667,
		lon: 33.6167,
		precise: true
	},
	{
		name: "Kosti",
		aliases: ["kosti"],
		lat: 13.1629,
		lon: 32.6635,
		precise: true
	},
	{
		name: "Atbara",
		aliases: ["atbara"],
		lat: 17.7022,
		lon: 33.9865,
		precise: true
	},
	{
		name: "Merowe",
		aliases: ["merowe"],
		lat: 18.4667,
		lon: 31.8167,
		precise: true
	},
	{
		name: "Dongola",
		aliases: ["dongola"],
		lat: 19.1683,
		lon: 30.4757,
		precise: true
	},
	{
		name: "Kurmuk",
		aliases: ["kurmuk"],
		lat: 10.55,
		lon: 34.28,
		precise: true
	},
	{
		name: "Damazin",
		aliases: [
			"damazin",
			"ed damazin",
			"blue nile"
		],
		lat: 11.7891,
		lon: 34.3592,
		precise: true
	},
	{
		name: "Tawila",
		aliases: ["tawila"],
		lat: 13.7,
		lon: 24.85,
		precise: true
	},
	{
		name: "Kabkabiya",
		aliases: ["kabkabiya"],
		lat: 13.65,
		lon: 24.08,
		precise: true
	},
	{
		name: "Asosa",
		aliases: [
			"asosa",
			"assosa",
			"benishangul"
		],
		lat: 10.0186,
		lon: 34.586,
		precise: true
	},
	{
		name: "Bahir Dar",
		aliases: ["bahir dar", "bahirdar"],
		lat: 11.6008,
		lon: 37.3217,
		precise: true
	},
	{
		name: "Kordofan",
		aliases: [
			"kordofan",
			"kurdufan",
			"north kordofan",
			"south kordofan",
			"west kordofan"
		],
		lat: 12.5,
		lon: 29.5,
		precise: false
	},
	{
		name: "Darfur",
		aliases: [
			"darfur",
			"north darfur",
			"south darfur",
			"west darfur",
			"central darfur",
			"east darfur"
		],
		lat: 13,
		lon: 24,
		precise: false
	},
	{
		name: "Gezira",
		aliases: [
			"gezira",
			"al jazirah",
			"al-jazirah"
		],
		lat: 14.5,
		lon: 33.4,
		precise: false
	},
	{
		name: "Chad border",
		aliases: [
			"chad",
			"chadian border",
			"adre",
			"tine"
		],
		lat: 13.8,
		lon: 22.3,
		precise: false
	},
	{
		name: "Libya border",
		aliases: ["libya", "libyan border"],
		lat: 20,
		lon: 24,
		precise: false
	},
	{
		name: "Al Dhafra",
		aliases: ["al dhafra", "dhafra"],
		lat: 24.2483,
		lon: 54.5478,
		precise: true
	},
	{
		name: "Jebel Ali",
		aliases: ["jebel ali", "jebel-ali"],
		lat: 24.985,
		lon: 55.027,
		precise: true
	},
	{
		name: "Abu Dhabi",
		aliases: [
			"abu dhabi",
			"uae",
			"united arab emirates"
		],
		lat: 24.4539,
		lon: 54.3773,
		precise: false
	},
	{
		name: "Berenice",
		aliases: ["berenice", "ras banas"],
		lat: 23.9711,
		lon: 35.4603,
		precise: true
	},
	{
		name: "Aswan",
		aliases: ["aswan"],
		lat: 23.9644,
		lon: 32.82,
		precise: true
	},
	{
		name: "Suez",
		aliases: ["suez", "suez canal"],
		lat: 29.9668,
		lon: 32.5498,
		precise: true
	},
	{
		name: "Kufra",
		aliases: [
			"kufra",
			"al-kufrah",
			"al jawf"
		],
		lat: 24.1787,
		lon: 23.314,
		precise: true
	},
	{
		name: "Benghazi",
		aliases: ["benghazi", "benina"],
		lat: 32.1167,
		lon: 20.0667,
		precise: true
	},
	{
		name: "Tobruk",
		aliases: ["tobruk"],
		lat: 32.0836,
		lon: 23.9764,
		precise: true
	},
	{
		name: "N'Djamena",
		aliases: [
			"n'djamena",
			"ndjamena",
			"n djamena"
		],
		lat: 12.1348,
		lon: 15.0557,
		precise: true
	},
	{
		name: "Abéché",
		aliases: ["abeche", "abéché"],
		lat: 13.847,
		lon: 20.8444,
		precise: true
	},
	{
		name: "Adré",
		aliases: ["adre", "adré"],
		lat: 13.4667,
		lon: 22.2,
		precise: true
	},
	{
		name: "Berbera",
		aliases: ["berbera"],
		lat: 10.4396,
		lon: 45.0143,
		precise: true
	},
	{
		name: "Bosaso",
		aliases: ["bosaso", "boosaaso"],
		lat: 11.2842,
		lon: 49.1816,
		precise: true
	},
	{
		name: "Mogadishu",
		aliases: ["mogadishu", "muqdisho"],
		lat: 2.0469,
		lon: 45.3182,
		precise: true
	},
	{
		name: "Assab",
		aliases: ["assab", "aseb"],
		lat: 13.0092,
		lon: 42.7394,
		precise: true
	},
	{
		name: "Massawa",
		aliases: ["massawa", "mitsiwa"],
		lat: 15.6097,
		lon: 39.45,
		precise: true
	},
	{
		name: "Metema",
		aliases: ["metema", "gallabat"],
		lat: 12.954,
		lon: 36.155,
		precise: true
	},
	{
		name: "Gondar",
		aliases: ["gondar", "gonder"],
		lat: 12.6,
		lon: 37.4667,
		precise: true
	}
];
function geocodePlace(location, fallback) {
	const haystacks = [location, fallback].filter(Boolean).map((s) => s.toLowerCase());
	let region = null;
	for (const hay of haystacks) for (const g of GAZETTEER) {
		if (!g.aliases.some((a) => hay.includes(a))) continue;
		if (g.precise) return g;
		if (!region) region = g;
	}
	return region;
}
function imageryLinks(lat, lon) {
	const la = lat.toFixed(5);
	const ln = lon.toFixed(5);
	return [
		{
			label: "Copernicus Browser",
			href: `https://browser.dataspace.copernicus.eu/?zoom=14&lat=${la}&lng=${ln}&themeId=DEFAULT-THEME`
		},
		{
			label: "Sentinel Hub EO Browser",
			href: `https://apps.sentinel-hub.com/eo-browser/?lat=${la}&lng=${ln}&zoom=14`
		},
		{
			label: "Google Earth",
			href: `https://earth.google.com/web/@${la},${ln},0a,2500d,35y,0h,0t,0r`
		},
		{
			label: "Google Maps satellite",
			href: `https://www.google.com/maps/@${la},${ln},2500m/data=!3m1!1e3`
		}
	];
}
var CONTROL_AS_OF = "2026-08-01";
var CONTROL_SOURCE = "Aggregated from open-source assessments (Sudan War Monitor, ACLED, ISW, Liveuamap). Approximate regional control — re-verify before use. Not a live frontline.";
var FACTION_META = {
	saf: {
		label: "SAF — north, center & east",
		color: "#3d9bb8"
	},
	rsf: {
		label: "RSF — Darfur",
		color: "#c45c32"
	},
	"splm-n": {
		label: "SPLM-N (al-Hilu) — Nuba",
		color: "#5a8f5e"
	},
	contested: {
		label: "Contested — Kordofan belt",
		color: "#d4a017",
		dashed: true
	}
};
var CONTROL_ZONES = [
	{
		id: "saf-north-east",
		faction: "saf",
		label: "SAF — north, center & east",
		note: "Northern & River Nile states, Khartoum, Red Sea/Port Sudan, Gezira and the eastern states.",
		confidence: "moderate",
		polygon: [
			[22, 24.5],
			[22, 37.3],
			[18.2, 38.6],
			[15, 37],
			[11.6, 35.6],
			[11.3, 33.9],
			[13.3, 32.9],
			[15.7, 33.3],
			[16.6, 32],
			[16.2, 30],
			[18.2, 28.4],
			[20.2, 26.8],
			[21.2, 25.2]
		]
	},
	{
		id: "rsf-darfur",
		faction: "rsf",
		label: "RSF — Darfur",
		note: "Five Darfur states, including El Fasher after its fall in open reporting. RSF rear area — occupancy is time-bounded.",
		confidence: "moderate",
		polygon: [
			[16, 22],
			[16.3, 25.2],
			[14.5, 26.9],
			[12, 27.3],
			[10, 26.1],
			[9.7, 24],
			[10.6, 22.2],
			[13, 22]
		]
	},
	{
		id: "contested-kordofan",
		faction: "contested",
		label: "Contested — Kordofan belt",
		note: "North/West/South Kordofan: the main active front. Control fluctuates. Low confidence.",
		confidence: "low",
		polygon: [
			[16.2, 27],
			[16, 30.2],
			[13, 31],
			[11.3, 30.5],
			[11.1, 28],
			[12.6, 27],
			[14.6, 26.95]
		]
	},
	{
		id: "splmn-south-kordofan",
		faction: "splm-n",
		label: "SPLM-N (al-Hilu) — Nuba Mountains",
		note: "Parts of South Kordofan. Periodically aligned or clashing with other actors.",
		confidence: "low",
		polygon: [
			[12.2, 29.2],
			[12, 31],
			[10.6, 31.2],
			[10.2, 29.8],
			[11, 29]
		]
	}
];
var SEED_REPORTS = [
	{
		id: "wadi-sayyidna-2026-08-14",
		title: "Burn scars & drone-hangar damage, Wadi Sayyidna Airbase",
		lat: 15.9625,
		lon: 32.5525,
		place: "Wadi Sayyidna Airbase",
		country: "Sudan",
		date: "2026-08-14",
		category: "strike-damage",
		party: "unknown",
		confidence: 3,
		summary: "Published imagery reported at least two burn scars and visible damage consistent with a strike near drone hangars. Origin undetermined from imagery alone.",
		sourceLabel: "@AfriMEOSINT (X)",
		sourceUrl: "https://x.com/AfriMEOSINT",
		imageUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-D2CDD188-XMfc0fiN6GP6FS7vHeT73WV1sEuvlq.jpeg"
	},
	{
		id: "asosa-il76-2026-09-07",
		title: "IL-76TD cargo aircraft at Asosa Airport",
		lat: 10.0186,
		lon: 34.586,
		place: "Asosa Airport",
		country: "Ethiopia",
		date: "2026-09-07",
		category: "air-activity",
		party: "other_armed",
		confidence: 2,
		summary: "Published Sentinel-2 imagery reported a ~50 m-length / ~55 m-wingspan object consistent with an IL-76TD heavy cargo aircraft on the apron. Airframe type only — operator and cargo unconfirmed.",
		sourceLabel: "@AfriMEOSINT (X)",
		sourceUrl: "https://x.com/AfriMEOSINT",
		imageUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-DED89DCA-JvcXJfV3Q73oSXp3Ucl6jaWBK7C0X1.jpeg"
	},
	{
		id: "asosa-endf-2025-12-29",
		title: "New technicals, trailers & tents at alleged ENDF base, Asosa",
		lat: 10.05,
		lon: 34.55,
		place: "Outskirts of Asosa",
		country: "Ethiopia",
		date: "2025-12-29",
		category: "vehicle-buildup",
		party: "other_armed",
		confidence: 3,
		summary: "Planet imagery (08 Nov–29 Dec 2025) reported ~120 new light technical vehicles, ~16 blue car-carriers, 5 new tents and 10 fuel tanks not present in earlier imagery. Attribution undetermined absent a movement link into Sudan.",
		sourceLabel: "OSINT post (Planet Labs imagery)",
		imageUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-5AC5709E-emLVhqThcOmgUQTcQacOjCKhxr7d3z.jpeg"
	},
	{
		id: "asosa-endf-3panel-2026-05-21",
		title: "Change detection at ENDF base, Asosa (Apr–May 2026)",
		lat: 10.048,
		lon: 34.552,
		place: "ENDF Base, Asosa",
		country: "Ethiopia",
		date: "2026-05-21",
		category: "vehicle-buildup",
		party: "other_armed",
		confidence: 3,
		summary: "Airbus/Vantor imagery (14 Apr–21 May 2026) reported ~1.6 m dark objects consistent with 50-cal machine guns and 12 light technicals appearing, moving, and being removed across dates at Location A.",
		sourceLabel: "OSINT post (Airbus / Vantor imagery)",
		imageUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-F77104B6-nR782W7DZC9qvgpp3tzraq5kdFZVHq.jpeg"
	},
	{
		id: "bahir-dar-2026-05-30",
		title: "Likely new drone shelters, Bahir Dar Airport",
		lat: 11.6008,
		lon: 37.3217,
		place: "Bahir Dar Airport military apron",
		country: "Ethiopia",
		date: "2026-05-30",
		category: "air-activity",
		party: "other_armed",
		confidence: 2,
		summary: "Sentinel-2 L2A sequence (20/25/30 May 2026) reported the appearance of structures described as likely drone shelters on the military apron.",
		sourceLabel: "@AfriMEOSINT (X)",
		sourceUrl: "https://x.com/AfriMEOSINT",
		imageUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-EB34E6E6-LsNorE8sffjpU8BAonQ0RQ5NexOtWs.jpeg"
	},
	{
		id: "bahir-dar-shelter-2026-05-27",
		title: "Likely new drone shelter beside existing hangars, Bahir Dar",
		lat: 11.602,
		lon: 37.323,
		place: "Bahir Dar Airport",
		country: "Ethiopia",
		date: "2026-05-27",
		category: "air-activity",
		party: "other_armed",
		confidence: 1,
		summary: "Sentinel-2 imagery reported a new structure beside existing aircraft hangars, described as a likely drone shelter. Low confidence at 10 m resolution.",
		sourceLabel: "@AfriMEOSINT (X)",
		sourceUrl: "https://x.com/AfriMEOSINT",
		imageUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-FB31794F-7SDPAsfU1OgD2xekixbNsGQVVHmGw5.jpeg"
	},
	{
		id: "kurmuk-2026-03-23",
		title: "RSF & SPLM-N assault on Kurmuk, Blue Nile State",
		lat: 10.5497,
		lon: 34.2836,
		place: "Kurmuk",
		country: "Sudan",
		date: "2026-03-23",
		category: "control-change",
		party: "mixed",
		confidence: 2,
		summary: "Telegram control-map update reported heavy RSF/SPLM-N attacks on Kurmuk, framed as an attempt to open an eastern front in Blue Nile State.",
		sourceLabel: "Sudan News Network (Telegram)",
		imageUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-66C9376A-NcGy6nFsRULBeFX6cVjAlJkk5INn8l.jpeg"
	},
	{
		id: "ch95-runway",
		title: "CH-95 drone reported near a runway",
		lat: 12,
		lon: 24.85,
		place: "Airfield (approx.)",
		country: "Sudan",
		date: "2026-06-01",
		category: "air-activity",
		party: "unknown",
		confidence: 1,
		summary: "Arabic-captioned OSINT post reported an object identified as a CH-95 UAV near a runway. Location approximate; identification unverified.",
		sourceLabel: "Arabic OSINT post (Telegram)",
		imageUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image-5E888C90-p2003BRRphyaFKpBUYBnMBUSSy43L6.jpeg"
	},
	{
		id: "libya-se-camp-2026-06",
		title: "SE Libya camp: ~300 technicals in published imagery",
		lat: 22.35,
		lon: 23.05,
		place: "SE Libya desert camp (approx.)",
		country: "Libya",
		date: "2026-06-01",
		category: "vehicle-buildup",
		party: "rsf",
		confidence: 2,
		summary: "@AfriMEOSINT published satellite stills of a desert camp in SE Libya with at least ~300 technicals, plus fuel/water trailers and container trucks described as staged before a Kordofan push. Location approximate. RSF-linked in open reporting — not a weapons identification, not a movement chain until the vehicles are seen entering Sudan.",
		sourceLabel: "@AfriMEOSINT (X)",
		sourceUrl: "https://x.com/AfriMEOSINT/status/2098986948584980880"
	},
	{
		id: "kufra-il76-2026-09-08",
		title: "Three IL-76TD-typical airframes at Kufra Airport",
		lat: 24.1787,
		lon: 23.314,
		place: "Kufra / Al Jawf Airport",
		country: "Libya",
		date: "2026-09-08",
		category: "air-activity",
		party: "other_armed",
		confidence: 2,
		summary: "@AfriMEOSINT: 8 Sep satellite stills showed around three IL-76TD-typical airframes on the Kufra apron plus an ATR-72-typical. Airframe type is not payload. Follows reported vehicle massing at the nearby Subul al-Salam compound.",
		sourceLabel: "@AfriMEOSINT (X)",
		sourceUrl: "https://x.com/AfriMEOSINT/status/2098546872570851768"
	},
	{
		id: "pecotox-benghazi-2026-09-09",
		title: "Pecotox-Air 747-409F Al Ain → Benghazi in public tracks",
		lat: 32.0968,
		lon: 20.2695,
		place: "Benina / Benghazi",
		country: "Libya",
		date: "2026-09-09",
		category: "air-activity",
		party: "other_armed",
		confidence: 2,
		summary: "@AfriMEOSINT: ER-MDR (Pecotox-Air Boeing 747-409F) Al Ain → Benghazi 9 Sep, also reported in a 09:31 UTC satellite still. UAE-linked operator in open reporting. Category is airframe-typical — cargo contents unclaimed.",
		sourceLabel: "@AfriMEOSINT (X)",
		sourceUrl: "https://x.com/AfriMEOSINT/status/2098934519835279755"
	},
	{
		id: "subul-salam-2026-09-08",
		title: "Vehicle massing, Subul al-Salam compound, Kufra",
		lat: 24.22,
		lon: 23.28,
		place: "Subul al-Salam compound, Kufra",
		country: "Libya",
		date: "2026-09-08",
		category: "vehicle-buildup",
		party: "other_armed",
		confidence: 2,
		summary: "@AfriMEOSINT: satellite sequence Aug–8 Sep showed technicals and trailers massing at the LNA Subul al-Salam Battalion compound in Kufra, plus two new structures. LNA facility in open maps — not an RSF identification. Change is the observation.",
		sourceLabel: "@AfriMEOSINT (X)",
		sourceUrl: "https://x.com/AfriMEOSINT/status/2098588375158497766"
	},
	{
		id: "asosa-il76-4ship-2026-09-07",
		title: "Four IL-76TD-typical airframes, Asosa Airport (20 Aug–7 Sep)",
		lat: 10.0186,
		lon: 34.586,
		place: "Asosa Airport",
		country: "Ethiopia",
		date: "2026-09-07",
		category: "air-activity",
		party: "other_armed",
		confidence: 2,
		summary: "@AfriMEOSINT: Sentinel-2 sequence 20 Aug–7 Sep showed around four IL-76TD-typical airframes on the Asosa apron. Open reporting links some rotations to Al Ain. Airbridge is a hypothesis until a movement chain into Sudan is shown. Type ≠ payload.",
		sourceLabel: "@AfriMEOSINT (X)",
		sourceUrl: "https://x.com/AfriMEOSINT/status/2098462642910220459"
	},
	{
		id: "oweinat-a400m-2026-09-10",
		title: "TuAF A400M into East Oweinat, Egypt",
		lat: 22.5806,
		lon: 28.7208,
		place: "East Oweinat airbase",
		country: "Egypt",
		date: "2026-09-10",
		category: "air-activity",
		party: "other_armed",
		confidence: 2,
		summary: "@AfriMEOSINT: Turkish Air Force A400M 15-0051 / TUAF775 Tekirdağ Çorlu → East Oweinat. Open reporting places Akinci-typical UAV operations at this field. SAF-aligned picture in open sources — not a strike claim from this track.",
		sourceLabel: "@AfriMEOSINT (X)",
		sourceUrl: "https://x.com/AfriMEOSINT/status/2098110435996086328"
	},
	{
		id: "port-sudan-skyvision-2026-09-17",
		title: "Sky Vision A321-231F Cairo → Port Sudan",
		lat: 19.4336,
		lon: 37.2342,
		place: "Port Sudan Airport",
		country: "Sudan",
		date: "2026-09-17",
		category: "air-activity",
		party: "saf",
		confidence: 2,
		summary: "@AfriMEOSINT: Sky Vision Airlines A321-231F SU-SKF / 0S4902 Cairo → Port Sudan. Open reporting frames a surge of cargo-typical flights from Turkey, Egypt and Belarus toward Port Sudan as SAF-aligned supply. Airframe type is not payload.",
		sourceLabel: "@AfriMEOSINT (X)",
		sourceUrl: "https://x.com/AfriMEOSINT/status/2100471384036020234"
	},
	{
		id: "rubystar-il76-cairo-2026-09-17",
		title: "Rubystar IL-76TD Tekirdağ → Cairo",
		lat: 30.1219,
		lon: 31.4056,
		place: "Cairo",
		country: "Egypt",
		date: "2026-09-17",
		category: "air-activity",
		party: "saf",
		confidence: 1,
		summary: "@AfriMEOSINT: Rubystar IL-76TD EW-383TH / RSB7684 Tekirdağ Çorlu → Cairo. Open reporting hypothesizes a drone-delivery link for SAF. Track is the observation — cargo unclaimed.",
		sourceLabel: "@AfriMEOSINT (X)",
		sourceUrl: "https://x.com/AfriMEOSINT/status/2100523175251436002"
	},
	{
		id: "gulfwings-ndjamena-2026-09-15",
		title: "Gulf Wings Challenger 605 Abu Dhabi → N'Djamena",
		lat: 12.1337,
		lon: 15.034,
		place: "N'Djamena",
		country: "Chad",
		date: "2026-09-15",
		category: "air-activity",
		party: "other_armed",
		confidence: 2,
		summary: "@AfriMEOSINT: A6-YES (Gulf Wings, IWG / UAE-based) Al Bateen → N'Djamena. Bizjet track only. Open reporting places Chad on RSF-rear logistics stories — this flight is not a cargo or occupancy claim.",
		sourceLabel: "@AfriMEOSINT (X)",
		sourceUrl: "https://x.com/AfriMEOSINT/status/2100522110024085927"
	},
	{
		id: "skyvision-teksudan-2026-09-16",
		title: "Sky Vision A320-232F Tekirdağ → Port Sudan (repeat)",
		lat: 19.4336,
		lon: 37.2342,
		place: "Port Sudan Airport",
		country: "Sudan",
		date: "2026-09-16",
		category: "air-activity",
		party: "saf",
		confidence: 2,
		summary: "@AfriMEOSINT: SU-SKD Tekirdağ Çorlu → Port Sudan, one of five cargo-typical rotations in ~24h framed as Bayraktar-linked SAF supply. Type ≠ payload. Count is from the publisher.",
		sourceLabel: "@AfriMEOSINT (X)",
		sourceUrl: "https://x.com/AfriMEOSINT/status/2100467791417524551"
	},
	{
		id: "baykar-jet-khartoum-2026-09-16",
		title: "Baykar-linked Global 6500 Istanbul → Khartoum",
		lat: 15.5895,
		lon: 32.5532,
		place: "Khartoum International",
		country: "Sudan",
		date: "2026-09-16",
		category: "air-activity",
		party: "saf",
		confidence: 2,
		summary: "@AfriMEOSINT: TC-CVA (Cevheri Havacılık / Baykar-owned charter) Istanbul → Khartoum. Bizjet, not a cargo airframe. Publisher linked it to the same 24h drone-delivery picture. Operator link is open reporting, not a payload claim.",
		sourceLabel: "@AfriMEOSINT (X)",
		sourceUrl: "https://x.com/AfriMEOSINT/status/2100128604390662285"
	},
	{
		id: "libya-rsf-camp-thread-2026-09-13",
		title: "SE Libya RSF camp thread: trailers + containers",
		lat: 22.35,
		lon: 23.05,
		place: "SE Libya desert camp (approx.)",
		country: "Libya",
		date: "2026-09-13",
		category: "vehicle-buildup",
		party: "rsf",
		confidence: 2,
		summary: "@AfriMEOSINT thread on the June stills: 3–4 technical types, six semi-trailers (fuel/water + containers) described as staged before a Kordofan push. Location approximate. Not a movement chain into Sudan until the vehicles are seen crossing.",
		sourceLabel: "@AfriMEOSINT (X)",
		sourceUrl: "https://x.com/AfriMEOSINT/status/2098986948584980880"
	}
];
function reportsToLog(reports) {
	return reports.map((r) => ({
		id: `log-rpt-${r.id}`,
		firstSeen: `${r.date}T00:00:00Z`,
		lastSeen: `${r.date}T00:00:00Z`,
		title: r.title,
		body: `${r.summary} Source: ${r.sourceLabel}. Published OSINT — a lead until independently corroborated.`,
		siteId: void 0,
		siteName: r.place,
		families: r.category === "vehicle-buildup" ? ["vehicles"] : r.category === "air-activity" ? ["flight"] : r.category === "strike-damage" ? ["damage"] : r.category === "control-change" ? ["corridor"] : ["reporting"],
		source: "archive",
		confidence: r.confidence,
		lat: r.lat,
		lon: r.lon
	}));
}
//#endregion
export { FACTION_META as a, imageryLinks as c, CONTROL_ZONES as i, reportsToLog as l, CONTROL_AS_OF as n, SEED_REPORTS as o, CONTROL_SOURCE as r, geocodePlace as s, CATEGORY_META as t };
