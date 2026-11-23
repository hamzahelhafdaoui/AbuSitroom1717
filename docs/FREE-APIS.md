# Free / public APIs used by the sitroom

No paid keys required for the core desk. Optional keys only improve the AI leads cascade.

| Domain | Source | Key? |
|--------|--------|------|
| Thermal | NASA FIRMS public VIIRS/MODIS CSV | No (`FIRMS_MAP_KEY` optional for area API later) |
| Aviation | adsb.lol, adsb.fi, OpenSky fallback | No |
| Maritime | Hormuz Ship Monitor AIS (Gulf); Red Sea lanes schematic | No |
| News | Google News RSS, Guardian Sudan, BBC Africa, Al Jazeera, NYT Africa | No |
| Corroboration | Guardian / BBC / UN News RSS (ReliefWeb needs approved appname) | No |
| Optical browse | NASA GIBS WMS / HLS | No |
| Change scan | Element 84 Earth Search STAC + COGs | No |
| AI leads | xAI → Groq → Gemini → OpenRouter → OpenAI → Pollinations → news-compiled | Optional except Pollinations / news |

Optional env (server only, never `VITE_`): `XAI_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY` / `GOOGLE_API_KEY`, `OPENROUTER_API_KEY`, `OPENAI_API_KEY`.
