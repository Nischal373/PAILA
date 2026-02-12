## Paila · Nepal Pothole Radar

Community-powered pothole intelligence for the Kathmandu Valley. Residents drop pins with evidence photos, vote like Reddit to escalate urgent craters, and hold road departments accountable with live leaderboards and fix-time stats.

### Highlights
- **Live map grid** (MapLibre + OpenStreetMap) refreshing every 15 seconds.
- **Tap-to-report UX**: drop a pin on the map, add context, and attach photos.
- **Reddit-style voting + crew status** so residents and departments stay in sync.
- **Leaderboard & slow-fix tracker** ranking potholes by net votes and time open.
- **Department scoreboard** summarizing completion counts and average fix hours.
- **Supabase Postgres + Storage** for durable pothole records and media uploads.

## Getting Started

```bash
cp .env.example .env.local   # provide Supabase keys + bucket name
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) once the dev server boots.

### Supabase configuration
1. **Create project** — grab the project URL and API keys.
2. **Run schema** — paste the SQL below in the Supabase SQL editor:

```sql
create table if not exists public.potholes (
	id uuid primary key,
	title text not null,
	description text,
	latitude double precision not null,
	longitude double precision not null,
	ward text,
	department text not null,
	severity text not null default 'medium',
	status text not null default 'reported',
	reporterName text,
	reportTime timestamptz not null,
	fixedTime timestamptz,
	imageUrl text,
	upvotes int not null default 0,
	downvotes int not null default 0
);

alter table public.potholes enable row level security;
create policy "public read" on public.potholes for select using (true);
create policy "server writes" on public.potholes for insert with check (auth.role() = 'service_role');
create policy "server updates" on public.potholes for update using (auth.role() = 'service_role');
```

3. **Run comments migration** — execute [scripts/supabase/pothole_comments.sql](scripts/supabase/pothole_comments.sql) in the Supabase SQL editor.

> If you see `new row violates row-level security policy for table "potholes"`, re-run the policies above or temporarily allow server inserts:

```sql
drop policy if exists "server writes" on public.potholes;
create policy "server writes" on public.potholes for insert
	with check (auth.role() = 'service_role');
```

4. **Configure env vars (`.env.local`)**

```
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key>"
SUPABASE_STORAGE_BUCKET="pothole-images"
```

5. **Create a storage bucket** — under *Storage → Buckets* add `pothole-images`, enable "Public" access (or adjust policies if you prefer signed URLs).
6. **Seed data (optional)** — import `data/potholes.json` or manually add a few rows via the Supabase table editor.

### File uploads
Photo evidence is uploaded directly to Supabase Storage (`<bucket>/potholes/...`). If you change the bucket name, update `SUPABASE_STORAGE_BUCKET`. For private buckets, swap `getPublicUrl` with signed URLs.

### Map style tokens
The dashboard uses the Carto Positron base map (no API key required). Swap `MAP_STYLE` in `src/components/dashboard/MapPanel.tsx` if you prefer Mapbox, MapTiler, etc.

## API surface

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/potholes` | List all potholes. |
| `POST` | `/api/potholes` | Create a pothole (accepts `multipart/form-data`). |
| `POST` | `/api/potholes/:id/vote` | Body `{ direction: "up" \| "down" }`. |
| `PATCH` | `/api/potholes/:id/status` | Body `{ status: "reported" \| "scheduled" \| "in_progress" \| "fixed", fixedTime? }`. |

All endpoints talk to Supabase via the helpers in `src/lib/potholeStore.ts`.

## Project structure

```
src/
	app/
		api/                → JSON + upload endpoints
		page.tsx            → Server component providing initial data
		layout.tsx          → Fonts + metadata
		globals.css         → Theme tokens + gradients
	components/
		dashboard/*         → Map, form, cards, leaderboard, stats
	lib/
		supabaseServer.ts   → Server-only Supabase admin client + storage config
		potholeStore.ts     → Supabase Postgres + Storage helpers
		potholeTypes.ts     → Shared TypeScript contracts
data/potholes.json      → Optional seed data (not used at runtime)
public/uploads          → Legacy local upload folder (unused once on Supabase)
```

## Future improvements
1. Device-based auth / OTP to prevent vote spam and allow department logins.
2. Websocket or Supabase Realtime channel for instant map refresh without polling.
3. Supabase Storage signed URLs for private evidence-sharing workflows.
4. Automated SLA alerts when `openDurationHours` exceeds thresholds.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js (Turbopack) in dev mode. |
| `npm run build` | Production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | ESLint via `next lint`. |

Happy road fixing—let departments know how long each crater has been haunting your commute. 🚧
