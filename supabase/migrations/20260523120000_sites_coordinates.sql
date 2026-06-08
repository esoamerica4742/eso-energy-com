-- Site coordinates for fleet map (Sites tab only).
alter table public.sites
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

create index if not exists sites_company_coords_idx
  on public.sites (company_id)
  where latitude is not null and longitude is not null;
