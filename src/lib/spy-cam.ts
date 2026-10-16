/** Cinematic camera — GEV-style slew / orbit / lock, MapLibre. */

export type SlewPhase = "idle" | "slewing" | "lock";

export interface SlewDetail {
  phase: SlewPhase;
  label?: string;
  duration?: number;
}

export function spyEase(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function pitchForZoom(z: number) {
  if (z < 6.2) return 0;
  return Math.min(48, (z - 6.2) * 4.2);
}

export function aglKm(lat: number, zoom: number) {
  const gsd = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
  return (gsd * 720) / 1000;
}

export function flyMs(fromZ: number, toZ: number, distDeg: number) {
  const reduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return 180;
  return Math.min(4200, Math.max(1400, 900 + Math.abs(toZ - fromZ) * 320 + distDeg * 140));
}

export function emitSlew(detail: SlewDetail) {
  window.dispatchEvent(new CustomEvent<SlewDetail>("ahsr-slew", { detail }));
}

type FlyMap = {
  getCenter: () => { lat: number; lng: number };
  getZoom: () => number;
  getBearing: () => number;
  flyTo: (o: Record<string, unknown>) => void;
  easeTo?: (o: Record<string, unknown>) => void;
  stop?: () => void;
  loaded?: () => boolean | void;
  isStyleLoaded?: () => boolean | void;
  fitBounds?: (b: [[number, number], [number, number]], o: Record<string, unknown>) => void;
  once: (ev: string, fn: () => void) => void;
  off: (ev: string, fn: () => void) => void;
};

export function cinematicFly(
  map: FlyMap,
  opts: { lon: number; lat: number; zoom: number; label?: string; flat?: boolean },
) {
  let ran = false;
  const go = () => {
    if (ran) return;
    ran = true;
    try {
      map.stop?.();
    } catch {
      /* optional */
    }
    const from = map.getCenter();
    const dist = Math.hypot(opts.lat - from.lat, opts.lon - from.lng);
    const duration = opts.flat
      ? Math.min(1100, Math.max(320, 260 + dist * 28))
      : flyMs(map.getZoom(), opts.zoom, dist);
    const inward = opts.zoom > map.getZoom() + 0.2;
    const bearing = opts.flat ? 0 : map.getBearing() + (inward ? 22 + Math.min(24, dist * 6) : -10);
    emitSlew({ phase: "slewing", label: opts.label, duration });
    const onEnd = () => {
      map.off("moveend", onEnd);
      emitSlew({ phase: "lock", label: opts.label });
      window.setTimeout(() => emitSlew({ phase: "idle" }), 1800);
    };
    map.once("moveend", onEnd);
    const cam = {
      center: [opts.lon, opts.lat],
      zoom: opts.zoom,
      pitch: opts.flat ? 0 : pitchForZoom(opts.zoom),
      bearing,
      duration,
      easing: spyEase,
      essential: true,
    };
    if (map.easeTo) map.easeTo(cam);
    else map.flyTo({ ...cam, curve: 1.7, speed: 0.42 });
  };
  const ready = map.isStyleLoaded?.() || map.loaded?.();
  if (ready === false) {
    map.once("style.load", go);
    map.once("load", go);
    window.setTimeout(go, 2500);
    return;
  }
  go();
}

export function cinematicFit(
  map: FlyMap,
  opts: { west: number; south: number; east: number; north: number; zoom: number; label?: string },
) {
  if (!map.fitBounds) {
    cinematicFly(map, {
      lon: (opts.west + opts.east) / 2,
      lat: (opts.south + opts.north) / 2,
      zoom: opts.zoom,
      label: opts.label,
    });
    return;
  }
  const duration = flyMs(map.getZoom(), opts.zoom, 0.45);
  emitSlew({ phase: "slewing", label: opts.label, duration });
  const onEnd = () => {
    map.off("moveend", onEnd);
    emitSlew({ phase: "lock", label: opts.label });
    window.setTimeout(() => emitSlew({ phase: "idle" }), 1400);
  };
  map.once("moveend", onEnd);
  map.fitBounds(
    [
      [opts.west, opts.south],
      [opts.east, opts.north],
    ],
    {
      padding: 90,
      maxZoom: opts.zoom,
      duration,
      pitch: pitchForZoom(opts.zoom),
      bearing: map.getBearing() + 10,
      essential: true,
      easing: spyEase,
    },
  );
}
