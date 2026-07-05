-- Velora Studio initial schema
-- Run in Supabase SQL Editor, or via supabase CLI.

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  plan text,
  free_used int not null default 0,
  brand_memory jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.credits (
  user_id uuid primary key references public.users (id) on delete cascade,
  studio_balance int not null default 0,
  ad_balance int not null default 0,
  plan_period_end timestamptz
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  step text not null default 'start',
  choices jsonb not null default '{}'::jsonb,
  input_image_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null check (type in ('studio', 'ad')),
  source text not null check (source in ('free', 'paid')),
  input_url text,
  output_url text,
  choices jsonb,
  photoroom_mode text,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  amount_inr int not null,
  plan_id text,
  razorpay_id text,
  status text not null default 'created',
  created_at timestamptz not null default now()
);

create index if not exists generations_user_id_idx on public.generations (user_id);
create index if not exists payments_user_id_idx on public.payments (user_id);
create index if not exists conversations_user_id_idx on public.conversations (user_id);

-- Storage buckets (also create in Dashboard → Storage if preferred)
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true),
       ('outputs', 'outputs', true)
on conflict (id) do nothing;
