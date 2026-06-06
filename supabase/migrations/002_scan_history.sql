-- Create Scan Sessions Table for storing history
create table if not exists scan_sessions (
  id text primary key,
  patient_id uuid references patients(id) on delete cascade,
  session_data jsonb not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table scan_sessions enable row level security;

-- Create policy to allow public read/write since there is no auth yet
create policy "Allow public read/write on scan_sessions" on scan_sessions for all using (true) with check (true);
