create table if not exists desk_admin (
  id integer primary key,
  user_id text not null,
  claimed_at timestamptz not null default now()
);

create table if not exists control_city (
  id text primary key,
  name text not null,
  lat double precision not null,
  lon double precision not null,
  faction text not null,
  as_of text not null,
  confidence text not null,
  note text not null default '',
  source text not null default ''
);

create table if not exists control_zone_edit (
  id text primary key,
  faction text not null,
  label text not null,
  note text not null default '',
  confidence text not null
);
