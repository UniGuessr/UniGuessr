# Multi-University Support Design

**Date:** 2026-06-20  
**Status:** Approved  

## Context

ConUGuessr is currently hard-coded for Concordia University. This spec covers adding McGill University as a second university, allowing players to choose which campus to play at (or "All" for a mixed game). The change must flow through sessions, leaderboard, and multiplayer without breaking existing functionality.

---

## Data Model

Add a nullable `university` TEXT column to three tables. `NULL` means "all campuses" — avoids magic strings and keeps the "All" concept clean.

| Table | New Column | Values |
|---|---|---|
| `locations` | `university TEXT` | `'concordia'`, `'mcgill'`, `NULL` |
| `sessions` | `university TEXT` | `'concordia'`, `'mcgill'`, `NULL` |
| `leaderboard` | `university TEXT` | `'concordia'`, `'mcgill'`, `NULL` |

`get_random_locations` RPC gains an optional `p_university` parameter:

```sql
CREATE OR REPLACE FUNCTION get_random_locations(n INTEGER, p_university TEXT DEFAULT NULL)
RETURNS SETOF locations LANGUAGE SQL STABLE AS $$
  SELECT * FROM locations
  WHERE (p_university IS NULL OR university = p_university OR university IS NULL)
  ORDER BY RANDOM() LIMIT n;
$$;
```

Passing `NULL` → pulls from all locations. Passing `'concordia'` → only Concordia locations (plus any untagged `NULL` locations for backwards compatibility during migration).

---

## Backend Changes

### Models

- `LocationCreate`: add `university: Optional[str] = None`
- `Location`: add `university: Optional[str] = None`
- `SessionCreate`: add `university: Optional[str] = None`
- `Session`: add `university: Optional[str] = None`
- `LeaderboardEntryCreate`: add `university: Optional[str] = None`
- `LeaderboardEntry`: add `university: Optional[str] = None`
- `LobbyCreate`: add `university: Optional[str] = None`
- `Lobby`: add `university: Optional[str] = None`

### Services

**LocationService.get_random_locations:** Pass `p_university` to RPC.

**SessionService.create_session:** Accept `university` from `SessionCreate`, pass to location fetch, store on session row.

**LeaderboardService.get_top_scores / count_entries / get_user_rank:** Accept optional `university` param. When provided, filter `WHERE university = p_university`. When `NULL`, return global (all rows regardless of university value). University-specific boards never include "All" scores (`university IS NULL` rows).

**MultiplayerService.create_lobby / start_game:** Propagate `university` from `LobbyCreate` through to `get_random_locations` call.

### API Endpoints

| Endpoint | New Param |
|---|---|
| `POST /api/sessions` | `university` in body |
| `GET /api/leaderboard` | `university` query param |
| `GET /api/leaderboard/user/{username}/rank` | `university` query param |
| `GET /api/leaderboard/count` | `university` query param |
| `POST /api/multiplayer/lobbies` | `university` in `LobbyCreate` body |

---

## Frontend Changes

### Game Start Screen (`/app/single-player`)

Add university picker as the first selection step, before rounds and timer:

```
[ Concordia ]  [ McGill ]  [ All ]
```

Selected value passed as `university` field in `createSession` call. Default: `null` (All).

### Lobby Create (`/app/multiplayer`)

Same university picker in lobby creation form. University value included in `LobbyCreate` payload. Lobby details view shows which university is being played so all players see it before the game starts.

### Leaderboard (`/app/leaderboard`)

New university filter row above the existing rounds/difficulty filters:

```
[ All ]  [ Concordia ]  [ McGill ]
```

- "All" tab → passes no `university` param → global leaderboard (includes only `university IS NULL` scores, i.e. games played on "All")
- University tabs → passes `university='concordia'` or `'mcgill'` → filtered board

### TypeScript Types

Update `Session`, `LeaderboardEntry`, and relevant create/request interfaces in `frontend/lib/api.ts` and `frontend/types/` to include optional `university?: string | null`.

---

## Schema Migration

```sql
ALTER TABLE locations     ADD COLUMN IF NOT EXISTS university TEXT;
ALTER TABLE sessions      ADD COLUMN IF NOT EXISTS university TEXT;
ALTER TABLE leaderboard   ADD COLUMN IF NOT EXISTS university TEXT;

-- Index for leaderboard filtering
CREATE INDEX IF NOT EXISTS idx_leaderboard_university ON leaderboard (university);

-- Update RPC (replace existing)
CREATE OR REPLACE FUNCTION get_random_locations(n INTEGER, p_university TEXT DEFAULT NULL)
RETURNS SETOF locations LANGUAGE SQL STABLE AS $$
  SELECT * FROM locations
  WHERE (p_university IS NULL OR university = p_university OR university IS NULL)
  ORDER BY RANDOM() LIMIT n;
$$;
```

Existing locations stay `NULL` (appear in "All" games). Tag them with university values via the admin upload flow or a seed script update.

---

## Out of Scope

- Campus-level selection (SGW vs Loyola within Concordia) — university level only
- Upload page university tagging UI — manual DB update or seed script
- Per-university stats on homepage
- Adding more than 2 universities in this iteration
