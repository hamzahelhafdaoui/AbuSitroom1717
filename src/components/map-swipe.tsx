import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { snapshotUrl } from "@/lib/utils";

/**
 * Map-level before/after swipe using NASA GIBS browse for the current viewport.
 * Complements the site-panel SwipeCompare; does not invent pixels when GIBS is cloudy.
 */
export function MapSwipeOverlay() {
  const swipeOn = useAppStore((s) => s.swipeOn);
  const date = useAppStore((s) => s.date);
  const compareDate = useAppStore((s) => s.compareDate);
  const imagery = useAppStore((s) => s.imagery);
  const [pct, setPct] = useState(50);
  const [bbox, setBbox] = useState<{ west: number; south: number; east: number; north: number } | null>(null);

  useEffect(() => {
    if (!swipeOn) return;
    const sync = () => {
      const map = (window as unknown as {
        __ahsrMap?: { getBounds: () => { getWest: () => number; getSouth: () => number; getEast: () => number; getNorth: () => number } };
      }).__ahsrMap;
      if (!map) return;
      const b = map.getBounds();
      setBbox({ west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() });
    };
    sync();
    const map = (window as unknown as { __ahsrMap?: { on: (e: string, fn: () => void) => void; off: (e: string, fn: () => void) => void } }).__ahsrMap;
    if (!map) return;
    map.on("moveend", sync);
    return () => map.off("moveend", sync);
  }, [swipeOn, date, compareDate]);

  if (!swipeOn || !bbox) return null;

  const layer =
    imagery === "s2" || imagery === "s2cloudless"
      ? "HLS_S30_Nadir_BRDF_Adjusted_Reflectance"
      : "VIIRS_NOAA20_CorrectedReflectance_TrueColor";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-28 top-28 z-30 flex items-center justify-center px-4 md:inset-x-[22%] md:bottom-32 md:top-36">
      <div className="pointer-events-auto hud-panel w-full max-w-xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 text-[10px] uppercase tracking-wider text-subtle">
          <span>Map compare · {compareDate}</span>
          <span>{date}</span>
        </div>
        <div className="relative aspect-[16/9] bg-bg">
          <img
            src={snapshotUrl(compareDate, bbox, layer, 900)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <img
            src={snapshotUrl(date, bbox, layer, 900)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ clipPath: `inset(0 0 0 ${pct}%)` }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 w-px bg-accent"
            style={{ left: `${pct}%` }}
          />
          <input
            type="range"
            min={0}
            max={100}
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
            className="absolute inset-x-3 bottom-2"
            aria-label="Swipe before and after on map viewport"
          />
        </div>
        <p className="px-3 py-1.5 text-[10px] leading-snug text-subtle">
          GIBS browse for the current map frame. Cloudy granules stay empty — do not invent vehicles or damage.
        </p>
      </div>
    </div>
  );
}
