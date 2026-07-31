# OkayNow Owner Console (`admin-frontend`)

Independent Next.js app for **platform owners** (ADMIN role). Sibling to the marketplace
`frontend` — not nested routes inside it.

## Stack

- Next.js 16.2.10 · React 19 · Tailwind CSS 4 · TanStack Query
- Auth against the shared Spring Boot API (`POST /api/auth/login` + refresh)
- Runs on **port 3001**

## Setup

```bash
cd admin-frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL (default `http://localhost:8080`) |
| `NEXT_PUBLIC_MARKETPLACE_APP_URL` | Link to marketplace app (default `http://localhost:3000`) |

## Auth

- Login only — no registration page
- Non-ADMIN roles are rejected after login; session is cleared and an error is shown
- Access/refresh tokens with automatic refresh on 401
- `proxy.ts` protects all routes except `/login` (cookie `ona-auth-role=ADMIN`)

## Routes

| Path | Description |
|---|---|
| `/` | Dashboard KPIs (shift status counts, pay/bill/margin estimates, claims count) |
| `/shifts` | Searchable / filterable shift table |
| `/shifts/new` | Create shift |
| `/shifts/[id]` | Detail + cancel/delete; start/complete when applicable |
| `/claims` | Claims table with confirm/cancel |
| `/users` | Search/filter users, change account status, create owners |
| `/login` | Owner sign-in |

## Expected booking / admin APIs

Aligned with current shift CRUD plus:

- `GET /api/admin/claims` (paged)
- `POST /api/admin/claims/{id}/confirm`
- `POST /api/admin/claims/{id}/cancel`
- `POST /api/admin/shifts/{id}/start`
- `POST /api/admin/shifts/{id}/cancel`
- `POST /api/admin/shifts/{id}/complete`
- `GET /api/admin/users`
- `PATCH /api/admin/users/{id}/status`
- `POST /api/admin/users/owners`

## Scripts

```bash
npm run dev    # next dev -p 3001
npm run build
npm start      # next start -p 3001
npm run lint
```
# okaynow-dashboard
