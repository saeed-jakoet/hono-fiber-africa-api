-- Documents table for linking Supabase Storage files to jobs/clients
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  job_id uuid not null,
  client_id uuid not null references public.clients(id) on delete cascade,
  category text not null check (category in ('as-built','planning','happy_letter')),
  file_path text not null,
  file_name text not null,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Indexes for faster queries
create index if not exists documents_job_idx on public.documents(job_type, job_id);
create index if not exists documents_client_idx on public.documents(client_id);
-- Optional: when linking to circuit numbers for drop_cable jobs
alter table public.documents add column if not exists circuit_number text;
create index if not exists documents_circuit_idx on public.documents(circuit_number);

-- Row Level Security (enable and example policies)
alter table public.documents enable row level security;

-- Example: allow owners (any signed-in user) to select their tenant's docs.
-- Adjust to your auth model. You can also allow all authenticated to read.
-- create policy "documents_read" on public.documents
--   for select
--   to authenticated
--   using (true);

-- Example: allow insert for authenticated users
-- create policy "documents_insert" on public.documents
--   for insert
--   to authenticated
--   with check (true);

-- Example: allow delete if you want
-- create policy "documents_delete" on public.documents
--   for delete
--   to authenticated
--   using (true);
