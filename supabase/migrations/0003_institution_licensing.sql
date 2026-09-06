-- ==============================================================================
-- Migration: 0003_institution_licensing.sql
-- Institutional Domain Allowlist & Monetization Licensing Architecture
-- ==============================================================================

-- 1. Institutions table
create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  tier text check (tier in ('pilot', 'standard', 'enterprise')) default 'standard',
  status text check (status in ('active', 'trial', 'suspended', 'expired')) default 'active',
  max_seats int default 50,
  active_from timestamptz default now() not null,
  license_end timestamptz default (now() + interval '1 year') not null,
  billing_contact text,
  annual_contract_value numeric default 0,
  created_at timestamptz default now()
);

-- 2. Institution Authorized Domains table
create table if not exists public.institution_domains (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade not null,
  domain text not null unique, -- e.g. "ause.edu" (stored lowercase without '@')
  is_active boolean default true not null,
  created_at timestamptz default now()
);

-- 3. Enhance profiles with service provider role, institution link & super-admin flag
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('service_provider', 'admin', 'senior', 'junior'));

alter table public.profiles
  add column if not exists institution_id uuid references public.institutions(id) on delete set null,
  add column if not exists is_super_admin boolean default false;

-- 4. Enable Row Level Security
alter table public.institutions enable row level security;
alter table public.institution_domains enable row level security;

-- Read policies: authenticated users and anon can check domains for validation
create policy "Allow read access to active institution domains"
  on public.institution_domains for select
  using (is_active = true);

create policy "Allow read access to active institutions"
  on public.institutions for select
  using (status in ('active', 'trial'));

-- Super-admin write policies
create policy "Super admins can manage institutions"
  on public.institutions for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_super_admin = true
    )
  );

create policy "Super admins can manage institution domains"
  on public.institution_domains for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_super_admin = true
    )
  );

-- 5. Seed default licensed institutions (AUSE, MIT, Stanford)
insert into public.institutions (name, slug, tier, status, max_seats, active_from, license_end, billing_contact, annual_contract_value)
values
  ('American University of Science & Engineering', 'ause', 'enterprise', 'active', 150, '2024-01-10T00:00:00Z', '2027-01-10T00:00:00Z', 'provost@ause.edu', 48000),
  ('Massachusetts Institute of Technology', 'mit', 'enterprise', 'active', 300, '2023-09-01T00:00:00Z', '2026-09-01T00:00:00Z', 'academic-it@mit.edu', 72000),
  ('Stanford University', 'stanford', 'enterprise', 'active', 200, '2024-03-15T00:00:00Z', '2026-03-15T00:00:00Z', 'dean-eng@stanford.edu', 60000)
on conflict (slug) do nothing;

-- Link default domains
insert into public.institution_domains (institution_id, domain, is_active)
select id, 'ause.edu', true from public.institutions where slug = 'ause'
on conflict (domain) do nothing;

insert into public.institution_domains (institution_id, domain, is_active)
select id, 'mit.edu', true from public.institutions where slug = 'mit'
on conflict (domain) do nothing;

insert into public.institution_domains (institution_id, domain, is_active)
select id, 'stanford.edu', true from public.institutions where slug = 'stanford'
on conflict (domain) do nothing;
