import type { LiveMeta } from "@/lib/types";
import { cn } from "@/lib/utils";

function zulu(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}Z`;
}

function feedChip(label: string, meta: LiveMeta | null | undefined, okWhen: boolean): string {
  const t = zulu(meta?.fetchedAt);
  if (!meta) return `${label} gap · ${t}`;
  if (meta.status === "error" || meta.status === "empty" || meta.status === "gap" || !okWhen) {
    return `${label} gap · ${t}`;
  }
  if (meta.status === "stale") return `${label} stale · ${t}`;
  return `${label} ok · ${t}`;
}

/**
 * Bottom/status strip: archive counts + public-feed health + DOCS ONLY badge.
 * Matches the civilian documentation chrome (not a targeting HUD).
 */
export function StatusStrip({
  pins,
  maritime,
  records,
  firmsMeta,
  firmsN,
  flightsMeta,
  flightsLive,
  vesselsMeta,
  vesselsLive,
  osmMeta,
  osmN,
  className,
}: {
  pins: number;
  maritime: number;
  records: number;
  firmsMeta: LiveMeta | null;
  firmsN: number;
  flightsMeta: LiveMeta | null;
  flightsLive: number;
  vesselsMeta: LiveMeta | null;
  vesselsLive: number;
  osmMeta: LiveMeta | null;
  osmN: number;
  className?: string;
}) {
  const chips = [
    feedChip("FIRMS", firmsMeta, firmsN > 0),
    feedChip("ADS-B", flightsMeta, flightsLive > 0),
    feedChip("AIS", vesselsMeta, vesselsLive > 0),
    feedChip("OSM", osmMeta, osmN > 0),
  ];

  return (
    <div
      className={cn(
        "hud-panel flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2 text-[11px] leading-none",
        className,
      )}
      role="status"
      aria-label="Archive counts and public feed health"
    >
      <p className="font-mono tabular-nums text-muted">
        <span>{pins} pins</span>
        <span className="mx-1.5 text-subtle">·</span>
        <span>{maritime} maritime</span>
        <span className="mx-1.5 text-subtle">·</span>
        <span>{records} records</span>
      </p>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 font-mono tabular-nums text-thermal">
        {chips.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
      <span
        className="shrink-0 rounded-full border border-rsf/70 bg-rsf/25 px-2.5 py-1 font-mono text-[10px] tracking-wider text-fg"
        title="Civilian documentation archive. No targeting, fire control, or strike planning."
      >
        DOCS ONLY
      </span>
    </div>
  );
}
