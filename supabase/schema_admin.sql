-- Admin Module Schema for ShopOS
-- System announcements/banners shown to customer portals

create table if not exists system_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  type text default 'info' check (type in ('info','warning','maintenance','critical')),
  target text default 'all' check (target in ('all','trial','active','specific')),
  target_org_ids uuid[] default '{}',
  is_active boolean default true,
  show_from timestamptz default now(),
  show_until timestamptz,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_announcements_active on system_announcements(is_active, show_from, show_until);
create index if not exists idx_announcements_target on system_announcements using gin(target_org_ids);

-- No RLS needed — announcements are fetched via /api/announcements with org filtering in backend
