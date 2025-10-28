## Hono Fiber Africa API (Backend)

Fast, type-safe REST API built with Hono + Bun, integrated with Supabase for auth/storage and Zod for validation. Exposes endpoints for auth, staff, clients, inventory, fleet, logs, documents, and drop-cable jobs.

## Quick Start

1) Install dependencies
```bash
bun install
```

2) Configure environment (.env)
```env
PORT=3001
SUPABASE_URL=...your supabase url...
SUPABASE_SERVICE_KEY=...service role key...
RESEND_API_KEY=...optional for emails...
FRONTEND_ORIGINS=http://localhost:3000
```

3) Run the server (hot reload)
```bash
bun run dev
```
Server will listen on http://localhost:3001 (adjust PORT if needed).

## Architecture
- Hono app with route modules under `src/routes/*`
- Controllers in `src/controllers/*` and SQL in `src/queries/*`
- Middleware `requireRole` reads role from Supabase JWT and enforces RBAC
- Cookies `accessToken` and `refreshToken` are read centrally in `src/index.ts`
- Zod validation via `@hono/zod-validator`

## CORS & Cookies
`src/index.ts` sets CORS with credentials for:
```ts
cors({ origin: ["http://localhost:3000"], credentials: true })
```
Update origins or use `FRONTEND_ORIGINS` to inject your domain(s).

## Routes Overview
- `GET /health` – health check
- `/_` Mounted routers:
	- `/auth` – sign in/up, logout, refresh, reset password, fetch auth account
	- `/staff` – staff CRUD, grant/revoke access (protected)
	- `/client` – client CRUD
	- `/inventory` – inventory CRUD
	- `/fleet` – fleet CRUD
	- `/drop-cable` – drop-cable job flows and documents
	- `/documents` – documents storage metadata
	- `/log` – activity/logs

### Auth
- `POST /auth/signin` – login, sets cookies (access/refresh)
- `POST /auth/signup` – register a user
- `GET /auth/me` – whoami (requires cookie)
- `GET /auth/refresh-token` – issues a fresh access token from refresh cookie
- `POST /auth/logout` – clears cookies
- `POST /auth/forgot-password` – request reset
- `POST /auth/reset-password` – finalize reset (server-side token validation)
- `PUT /auth` – update auth user (e.g., role)
- `GET /auth/accounts/:id` – fetch auth profile (admin/super_admin)

### Staff
- `GET /staff` – list
- `POST /staff` – create
- `PUT /staff/:id` – update
- `POST /staff/:id/grant-access` – create Supabase auth user + link
- `DELETE /staff/:id/access` – revoke access

RLS: Only `super_admin` (from JWT `user_metadata.role`) may read/write staff. See schema below.

### Clients
- `GET /client` – list
- `GET /client/:id` – get
- `POST /client` – create
- `PUT /client/:id` – update

### Inventory
- `GET /inventory` – list
- `GET /inventory/:id` – get
- `POST /inventory` – create
- `PUT /inventory/:id` – update

### Fleet
- `GET /fleet` – list
- `POST /fleet` – create
- `PUT /fleet/:id` – update

### Documents
See `README_documents.sql` for suggested schema and RLS policies for storing metadata linking to Supabase Storage paths.

## Supabase: Staff Table Example
```sql
create table if not exists public.staff (
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

alter table public.staff enable row level security;

create policy "allow super_admin select" on public.staff for select
	using (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin');
create policy "allow super_admin insert" on public.staff for insert
	with check (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin');
create policy "allow super_admin update" on public.staff for update
	using (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin')
	with check (auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin');
```

## Authentication Flow
1. Frontend calls `/auth/signin`, backend sets `accessToken` (short-lived) and `refreshToken` cookies.
2. On each API request, middleware attaches these cookies to context for controllers.
3. Protected routes verify role via Supabase RLS (database JWT) and middleware where needed.
4. Frontend uses SWR with `withCredentials` axios instance so cookies flow automatically.

## Password Reset Flow (Fixed)
1. `POST /auth/forgot-password` sends a reset link (email provider optional).
2. Frontend reset page collects token and new password.
3. `POST /auth/reset-password` validates token server-side using Supabase Admin API and updates password.

## Local Development (Frontend + Backend)
- Backend: `bun run dev` serves on http://localhost:3001 (set PORT)
- Frontend: set `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001` and run `npm run dev`

## Troubleshooting
- CORS errors: ensure origins include your frontend and `credentials: true` is set.
- 401/403: verify cookies are sent and the user role satisfies RLS/middleware.
- Supabase Admin: service role key is required for server-side password reset and privileged ops.
