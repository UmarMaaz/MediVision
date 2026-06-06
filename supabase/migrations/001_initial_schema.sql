-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Patients Table
create table if not exists patients (
  id uuid primary key default uuid_generate_v4(),
  first_name text not null,
  last_name text not null,
  dob date not null,
  gender text not null,
  mrn text unique,
  medical_history text,
  created_at timestamp with time zone default now()
);

-- Studies Table
create table if not exists studies (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references patients(id) on delete cascade,
  modality text not null,
  study_date timestamp with time zone default now(),
  status text default 'Draft',
  image_url text, -- Store URL or base64 (if small enough, though base64 in DB is not ideal, we can use Supabase Storage later)
  created_at timestamp with time zone default now()
);

-- Reports Table
create table if not exists reports (
  id uuid primary key default uuid_generate_v4(),
  study_id uuid references studies(id) on delete cascade unique,
  indication text,
  technique text,
  comparison text,
  findings text,
  impression text,
  created_at timestamp with time zone default now()
);

-- Enable RLS (Row Level Security)
alter table patients enable row level security;
alter table studies enable row level security;
alter table reports enable row level security;

-- Create policies to allow all operations for anonymous users (since we aren't using Supabase Auth yet)
create policy "Allow public read/write on patients" on patients for all using (true) with check (true);
create policy "Allow public read/write on studies" on studies for all using (true) with check (true);
create policy "Allow public read/write on reports" on reports for all using (true) with check (true);
