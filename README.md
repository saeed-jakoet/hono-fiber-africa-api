To install dependencies:
```sh
bun install
```

To run:
```sh
bun run dev
```

open http://localhost:3000

## Staff module

Routes (super_admin only, enforced by cookies-based session and Supabase RLS):

- GET `/staff` — list all staff
- POST `/staff` — create staff row. Body must include `id` (UUID of existing auth.users record) and other fields.
- PATCH `/staff/:id` — update fields for a given staff id

All staff routes require an `accessToken` cookie for a logged-in user whose `user_metadata.role` is `super_admin`.

### Supabase table

```
create table public.staff (
	id uuid not null,
	first_name text not null,
	surname text not null,
	email text not null,
	phone_number text null,
	date_of_birth date null,
	address text null,
	position text null,
	department text null,
	hire_date date null,
	salary numeric null,
	employment_type text null,
	emergency_contact_name text null,
	emergency_contact_phone text null,
	national_id text null,
	notes text null,
	created_at timestamptz default timezone('utc'::text, now()),
	updated_at timestamptz default timezone('utc'::text, now()),
	constraint staff_pkey primary key (id),
	constraint staff_id_fkey foreign key (id) references auth.users (id) on delete cascade
);
```

### RLS policies

Enable RLS and create policies so only super_admin can SELECT/INSERT/UPDATE:

```
alter table public.staff enable row level security;

create policy "allow super_admin select"
on public.staff for select
using (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin');

create policy "allow super_admin insert"
on public.staff for insert
with check (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin');

create policy "allow super_admin update"
on public.staff for update
using (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin')
with check (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin');
```

Note: The API passes the session JWT from the `accessToken` cookie to Supabase, so these policies enforce access automatically.
