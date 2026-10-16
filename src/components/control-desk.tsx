import { useEffect, useState, type FormEvent } from "react";
import { authClient, GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { claimDesk, deskRole, getDesk, saveDesk } from "@/lib/control-admin";
import { CONTROL_CITIES, type ControlCity, type ControlConfidence, seedZoneEdits, type ZoneEdit } from "@/lib/control";
import { FACTION_META, type Faction } from "@/lib/osint";
import { useAppStore } from "@/lib/store";

const FACTION_IDS = Object.keys(FACTION_META) as Faction[];

export function ControlDeskLoader() {
  const setDeskCities = useAppStore((s) => s.setDeskCities);
  const setDeskZones = useAppStore((s) => s.setDeskZones);
  useEffect(() => {
    getDesk()
      .then((d) => {
        setDeskCities(d.cities);
        setDeskZones(d.zones);
      })
      .catch(() => {
        /* seed shading stays */
      });
  }, [setDeskCities, setDeskZones]);
  return null;
}

export function AccountSignIn() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res =
        mode === "up"
          ? await authClient.signUp.email({ email, password, name: name || email, callbackURL: "/" })
          : await authClient.signIn.email({ email, password, callbackURL: "/" });
      if (res.error) throw new Error(res.error.message || "Sign-in failed");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] leading-snug text-muted">
        Researchers can look without an account. Editing needs a sign-in, and only the account that locks the desk can save.
      </p>
      {GROK_PROVIDERS.map((p) => (
        <button
          key={p.providerId}
          type="button"
          onClick={() => signIn(p.providerId, { callbackURL: "/" })}
          className="h-9 w-full border border-border text-xs hover:bg-raised"
        >
          Continue with {p.label}
        </button>
      ))}
      <form onSubmit={(e) => void submit(e)} className="space-y-2 border-t border-border pt-2">
        {mode === "up" ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="h-9 w-full border border-border bg-transparent px-2 text-sm"
          />
        ) : null}
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          className="h-9 w-full border border-border bg-transparent px-2 text-sm"
        />
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (8+ characters)"
          autoComplete={mode === "up" ? "new-password" : "current-password"}
          className="h-9 w-full border border-border bg-transparent px-2 text-sm"
        />
        {err ? <p className="text-[11px] text-damage">{err}</p> : null}
        <button type="submit" disabled={busy} className="h-9 w-full bg-accent text-xs font-medium text-accent-fg disabled:opacity-60">
          {busy ? "Working…" : mode === "up" ? "Create admin account" : "Sign in with email"}
        </button>
        <button
          type="button"
          className="text-[11px] text-muted underline-offset-2 hover:underline"
          onClick={() => setMode(mode === "up" ? "in" : "up")}
        >
          {mode === "up" ? "Already have an account? Sign in" : "No account yet? Create one"}
        </button>
      </form>
    </div>
  );
}

export function ControlDesk({ onClose }: { onClose: () => void }) {
  const { user, isPending } = useCurrentUserState();
  const cities = useAppStore((s) => s.deskCities);
  const zones = useAppStore((s) => s.deskZones);
  const setDeskCities = useAppStore((s) => s.setDeskCities);
  const setDeskZones = useAppStore((s) => s.setDeskZones);
  const searchPin = useAppStore((s) => s.searchPin);
  const [role, setRole] = useState<{ isAdmin: boolean; claimed: boolean } | null>(null);
  const [roleErr, setRoleErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [town, setTown] = useState("");

  const list = cities ?? CONTROL_CITIES;
  const zoneList = zones ?? seedZoneEdits();

  useEffect(() => {
    if (!user) {
      setRole(null);
      return;
    }
    deskRole()
      .then((r) => {
        setRole(r);
        setRoleErr(null);
      })
      .catch(() => setRoleErr("Could not check the admin lock."));
  }, [user]);

  function patchCity(id: string, patch: Partial<ControlCity>) {
    setDeskCities(list.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function patchZone(id: string, patch: Partial<ZoneEdit>) {
    setDeskZones(zoneList.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  }

  async function lock() {
    setBusy(true);
    setMsg(null);
    try {
      await claimDesk();
      setRole({ isAdmin: true, claimed: true });
      setMsg("This account is now the only one that can edit. Do this again on the published site — the preview lock does not carry over.");
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Could not lock editing.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const saved = await saveDesk({ data: { cities: list, zones: zoneList } });
      setDeskCities(saved.cities);
      setDeskZones(saved.zones);
      setMsg("Saved. Anyone who opens the desk sees this. Only this account can change it.");
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  function addTown() {
    if (!searchPin) {
      setMsg("Search a town or paste coordinates first. Then add that place.");
      return;
    }
    const row: ControlCity = {
      id: `cc-${Date.now()}`,
      name: town.trim() || searchPin.label,
      lat: searchPin.lat,
      lon: searchPin.lon,
      faction: "saf",
      asOf: new Date().toISOString().slice(0, 10),
      confidence: "low",
      note: "Marked by the desk admin from open reporting. Not a survey.",
      source: "Desk admin",
    };
    setDeskCities([row, ...list]);
    setTown("");
    setMsg(`Added ${row.name}. Save to publish it.`);
  }

  const canEdit = Boolean(role?.isAdmin);

  return (
    <div className="hud-panel pointer-events-auto flex max-h-[min(34rem,calc(100dvh-10rem))] flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2">
        <div>
          <p className="font-mono text-[10px] tracking-[0.16em] text-accent">CONTROL DESK</p>
          <p className="text-[11px] leading-snug text-muted">
            Open-source sketch, not a live front. Colored fills stay on the dark map. Town dots and outlines stay on satellite.
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-xs text-muted hover:text-fg">
          Close
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-2">
        {isPending ? <p className="text-xs text-muted">Checking account…</p> : null}
        {!isPending && !user ? <AccountSignIn /> : null}
        {user ? (
          <div className="space-y-2">
            <UserButton />
            {roleErr ? <p className="text-[11px] text-damage">{roleErr}</p> : null}
            {role && !role.claimed ? (
              <button type="button" disabled={busy} onClick={() => void lock()} className="h-9 w-full bg-accent text-xs font-medium text-accent-fg">
                Lock editing to this account
              </button>
            ) : null}
            {role?.claimed && !role.isAdmin ? (
              <p className="text-[11px] leading-snug text-muted">Read only. Another account already locked map edits.</p>
            ) : null}
            {canEdit ? (
              <div className="space-y-2 border border-border p-2">
                <p className="font-mono text-[10px] tracking-wider text-muted">ADD A TOWN</p>
                <p className="text-[11px] text-muted">
                  {searchPin ? `Using search pin: ${searchPin.label}` : "Search a place first so the pin is the town you mean."}
                </p>
                <input
                  value={town}
                  onChange={(e) => setTown(e.target.value)}
                  placeholder="Town name"
                  className="h-8 w-full border border-border bg-transparent px-2 text-sm"
                />
                <button type="button" onClick={addTown} className="h-8 w-full border border-border text-xs hover:bg-raised">
                  Add the searched place
                </button>
              </div>
            ) : null}
            <p className="font-mono text-[10px] tracking-wider text-muted">TOWNS</p>
            {list.map((c) => (
              <div key={c.id} className="grid grid-cols-[1fr_auto] gap-1 border-b border-border py-1">
                <div className="min-w-0">
                  <p className="truncate text-sm">{c.name}</p>
                  <p className="font-mono text-[10px] text-subtle">
                    {c.lat.toFixed(2)}, {c.lon.toFixed(2)}
                  </p>
                </div>
                <select
                  disabled={!canEdit}
                  value={c.faction}
                  onChange={(e) => patchCity(c.id, { faction: e.target.value as Faction })}
                  className="h-8 border border-border bg-bg text-xs"
                >
                  {FACTION_IDS.map((id) => (
                    <option key={id} value={id}>
                      {FACTION_META[id].label.split("—")[0]?.trim()}
                    </option>
                  ))}
                </select>
                {canEdit ? (
                  <input
                    type="date"
                    value={c.asOf}
                    onChange={(e) => patchCity(c.id, { asOf: e.target.value })}
                    className="col-span-2 h-8 border border-border bg-transparent px-2 text-xs"
                  />
                ) : (
                  <p className="col-span-2 text-[10px] text-subtle">{c.asOf} · {c.confidence}</p>
                )}
              </div>
            ))}
            <p className="font-mono text-[10px] tracking-wider text-muted">REGIONS</p>
            {zoneList.map((z) => (
              <label key={z.id} className="block space-y-1 border-b border-border py-1">
                <span className="text-sm">{z.label}</span>
                <select
                  disabled={!canEdit}
                  value={z.faction}
                  onChange={(e) => patchZone(z.id, { faction: e.target.value as Faction, confidence: "low" as ControlConfidence })}
                  className="h-8 w-full border border-border bg-bg text-xs"
                >
                  {FACTION_IDS.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            {canEdit ? (
              <button type="button" disabled={busy} onClick={() => void save()} className="h-9 w-full bg-accent text-xs font-medium text-accent-fg disabled:opacity-60">
                {busy ? "Saving…" : "Save control"}
              </button>
            ) : null}
            {msg ? <p className="text-[11px] leading-snug text-muted">{msg}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
