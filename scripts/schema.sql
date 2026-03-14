-- Elizabeth Wightwick Website — Database Schema
-- Run this in Supabase SQL Editor before seeding

create extension if not exists "uuid-ossp";

-- Properties table
create table if not exists public.properties (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  address_line_1 text not null,
  address_line_2 text,
  city text not null,
  postcode text not null,
  description text not null default '',
  department text not null check (department in ('sales', 'lettings')),
  property_type text not null check (property_type in ('house', 'flat', 'studio', 'land')),
  price numeric not null default 0,
  price_qualifier text check (price_qualifier in ('OIEO', 'OIRO', 'POA', 'guide_price', 'fixed')),
  rent_period text,
  status text not null check (status in ('available', 'let_agreed', 'sold', 'under_offer')),
  bedrooms integer not null default 0,
  bathrooms integer not null default 0,
  reception_rooms integer,
  features text[] not null default '{}',
  images text[] not null default '{}',
  main_image text not null default '',
  floor_plan_url text,
  brochure_url text,
  epc_rating text,
  council_tax_band text,
  tenure text,
  lease_length integer,
  service_charge numeric,
  ground_rent numeric,
  latitude numeric,
  longitude numeric,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sold_let_date timestamptz
);

-- Inquiries table
create table if not exists public.inquiries (
  id uuid primary key default uuid_generate_v4(),
  type text not null check (type in ('viewing', 'info', 'general')),
  property_id uuid references public.properties(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  message text,
  preferred_time text,
  created_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new', 'read', 'replied', 'closed'))
);

-- Valuations table
create table if not exists public.valuations (
  id uuid primary key default uuid_generate_v4(),
  address text not null,
  property_type text check (property_type in ('house', 'flat', 'studio', 'land')),
  bedrooms integer,
  name text not null,
  email text not null,
  phone text not null,
  best_time text,
  additional_info text,
  created_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new', 'contacted', 'booked', 'completed'))
);

-- Registrations table
create table if not exists public.registrations (
  id uuid primary key default uuid_generate_v4(),
  department text not null check (department in ('sales', 'lettings')),
  property_type text check (property_type in ('house', 'flat', 'studio', 'land')),
  min_bedrooms integer,
  max_bedrooms integer,
  min_price numeric,
  max_price numeric,
  locations text[],
  features text[],
  name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now(),
  active boolean not null default true
);

-- Enable Row Level Security
alter table public.properties enable row level security;
alter table public.inquiries enable row level security;
alter table public.valuations enable row level security;
alter table public.registrations enable row level security;

-- Public read access for properties
create policy "Public can read properties"
  on public.properties for select
  using (true);

-- Public can insert inquiries/valuations/registrations
create policy "Public can insert inquiries"
  on public.inquiries for insert
  with check (true);

create policy "Public can insert valuations"
  on public.valuations for insert
  with check (true);

create policy "Public can insert registrations"
  on public.registrations for insert
  with check (true);

-- Service role has full access (used by admin + seed script)
create policy "Service role full access to properties"
  on public.properties for all
  using (auth.role() = 'service_role');

create policy "Service role full access to inquiries"
  on public.inquiries for all
  using (auth.role() = 'service_role');

create policy "Service role full access to valuations"
  on public.valuations for all
  using (auth.role() = 'service_role');

create policy "Service role full access to registrations"
  on public.registrations for all
  using (auth.role() = 'service_role');

-- Storage bucket for property images (admin uploads)
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;
