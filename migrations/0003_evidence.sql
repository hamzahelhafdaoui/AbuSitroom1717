-- Core documentation entities for the Sudan sitroom (public-data archive).
-- Rows are world-readable documentation artifacts. Party labels still require
-- a human reason via the audit_log. Nothing is "confirmed" without review_state.

create table if not exists site (
  site_id text primary key,
  name text not null,
  lat double precision not null,
  lon double precision not null,
  admin1 text not null default '',
  admin2 text not null default '',
  kind text not null,
  party_assessment text not null default 'unknown',
  confidence smallint not null default 1 check (confidence between 1 and 5),
  first_seen timestamptz,
  last_seen timestamptz,
  status text not null default 'unclear',
  civilian_baseline text not null default '',
  notes text not null default ''
);

create table if not exists observation (
  observation_id text primary key,
  site_id text not null references site(site_id) on delete cascade,
  observed_at timestamptz not null,
  sensor text not null,
  scene_id text not null,
  cloud_pct real,
  notes text not null default '',
  indicators text[] not null default '{}',
  vehicle_estimate jsonb,
  damage_flag boolean not null default false,
  confidence smallint not null default 1 check (confidence between 1 and 5)
);

create table if not exists alert (
  alert_id text primary key,
  alert_type text not null,
  score real not null default 0,
  title text not null,
  body text not null default '',
  site_ids text[] not null default '{}',
  observation_ids text[] not null default '{}',
  lat double precision not null,
  lon double precision not null,
  observed_at timestamptz not null,
  families text[] not null default '{}',
  confidence smallint not null default 1 check (confidence between 1 and 5),
  review_state text not null default 'unreviewed',
  negative_evidence text
);

create table if not exists flight_event (
  flight_id text primary key,
  hex text not null,
  reg text not null default '',
  type_code text not null default '',
  operator text not null default '',
  category text not null default 'unknown',
  origin text not null default '',
  dest text not null default '',
  first_seen timestamptz not null,
  last_seen timestamptz not null,
  lat double precision not null,
  lon double precision not null,
  alt_ft real,
  nearest_airfield text not null default '',
  notes text not null default '',
  confidence smallint not null default 1 check (confidence between 1 and 5),
  relevant boolean not null default false,
  screenshot_path text
);

create table if not exists evidence_bundle (
  bundle_id text primary key,
  created_at timestamptz not null default now(),
  kind text not null,
  title text not null,
  lat double precision not null,
  lon double precision not null,
  site_id text,
  alert_id text,
  flight_id text,
  scene_ids text[] not null default '{}',
  acquisition_times text[] not null default '{}',
  bbox jsonb not null,
  processing jsonb not null,
  firms_subset jsonb not null default '[]',
  flight_json jsonb,
  citations jsonb not null default '[]',
  geojson jsonb not null,
  notes text not null default '',
  confidence smallint not null default 1 check (confidence between 1 and 5),
  screenshot_path text,
  caveats text not null default ''
);

create table if not exists audit_log (
  audit_id text primary key,
  at timestamptz not null default now(),
  actor text not null,
  action text not null,
  target text not null,
  reason text not null
);

create index if not exists observation_site_idx on observation (site_id);
create index if not exists alert_review_idx on alert (review_state);
create index if not exists flight_hex_idx on flight_event (hex);
create index if not exists audit_at_idx on audit_log (at desc);
