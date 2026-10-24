import { useMemo, useState } from "react";
import { Check, Copy, Download, FileText, Printer, Share2, X } from "lucide-react";
import { filesForExport, saveExport, type ExportFile } from "@/lib/export";
import { copyText } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import type { FlightEvent, ThermalEvent } from "@/lib/types";
import { Button } from "@/components/ui/button";

type Kind = "geojson" | "csv" | "briefing";

export function ExportSheet({
  open,
  onClose,
  flights,
  firms,
}: {
  open: boolean;
  onClose: () => void;
  flights: FlightEvent[];
  firms: ThermalEvent[];
}) {
  const log = useAppStore((s) => s.changeLog);
  const files = useMemo(() => filesForExport(flights, firms, log), [flights, firms, log]);
  const [kind, setKind] = useState<Kind>("geojson");
  const [status, setStatus] = useState<string | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  if (!open) return null;

  const file: ExportFile = files[kind];
  const blobUrl = URL.createObjectURL(new Blob([file.body], { type: file.mime }));

  async function runSave() {
    const r = await saveExport(file);
    setStatus(r === "shared" ? "Share sheet opened" : r === "downloaded" ? "Save started — if nothing appeared, tap the link below or Copy" : "Ready");
  }

  async function runCopy() {
    const ok = await copyText(file.body);
    setStatus(ok ? "Copied to clipboard" : "Copy blocked — select the preview and copy");
  }

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-bg/70 p-3 sm:items-center">
      <div className="hud-panel flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.18em] text-subtle">EXPORT</p>
            <h2 className="font-medium">Take the archive with you</h2>
          </div>
          <button type="button" className="flex size-10 items-center justify-center text-muted hover:text-fg" onClick={onClose} aria-label="Close export">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex gap-1 px-3 pt-3">
          {([
            ["geojson", "GeoJSON"],
            ["csv", "CSV"],
            ["briefing", "Briefing"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => { setKind(id); setStatus(null); }}
              className={
                kind === id
                  ? "h-9 rounded-lg bg-accent px-3 text-xs text-accent-fg"
                  : "h-9 rounded-lg px-3 text-xs text-muted hover:bg-raised"
              }
            >
              {label}
            </button>
          ))}
        </div>
        <p className="px-4 pt-2 text-[11px] leading-snug text-subtle">
          {kind === "geojson"
            ? "Sites, control polygons, city markers and watch boxes. Opens in QGIS / geojson.io."
            : kind === "csv"
              ? "Sites, alerts, control cities and the first 400 log rows. Spreadsheet-ready."
              : "Printable HTML briefing (File → Print → PDF) with caveat, methods appendix, control picture, unreviewed queue and recent log."}
        </p>
        <pre className="mx-3 mt-2 max-h-40 overflow-auto rounded-lg border border-border bg-raised p-2 font-mono text-[10px] leading-relaxed text-muted">
          {file.body.slice(0, 1800)}
          {file.body.length > 1800 ? "\n…" : ""}
        </pre>
        {status ? (
          <p className="flex items-center gap-1.5 px-4 pt-2 text-xs text-civilian">
            <Check className="size-3.5" /> {status}
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-1.5 p-3">
          <Button size="sm" onClick={() => void runSave()}>
            <Share2 className="size-3.5" /> Save / share
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void runCopy()}>
            <Copy className="size-3.5" /> Copy
          </Button>
          <a
            href={blobUrl}
            download={file.filename}
            className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-border bg-raised px-3 text-xs font-medium text-fg hover:bg-surface"
          >
            <Download className="size-3.5" /> {file.filename}
          </a>
          {kind === "briefing" ? (
            <Button size="sm" variant="secondary" onClick={() => setPrintOpen(true)}>
              <Printer className="size-3.5" /> View & print
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={onClose}>
              Done
            </Button>
          )}
        </div>
      </div>
      {printOpen ? (
        <div className="absolute inset-0 z-10 flex flex-col bg-paper text-bg">
          <div className="flex items-center gap-2 border-b border-border/40 bg-bg px-3 py-2 text-fg print:hidden">
            <FileText className="size-4" />
            <span className="flex-1 text-sm">Briefing preview</span>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="size-3.5" /> Print
            </Button>
            <button type="button" className="size-9 text-muted" onClick={() => setPrintOpen(false)} aria-label="Close preview">
              <X className="mx-auto size-4" />
            </button>
          </div>
          <iframe title="Briefing" srcDoc={file.body} className="min-h-0 flex-1 bg-paper" />
        </div>
      ) : null}
    </div>
  );
}
