# GM Fabrics POS System

- `backend/` — Express + Prisma + PostgreSQL API (deployed on Vercel)
- `gmfabrics/` — Next.js POS frontend (deployed on Vercel)

## Deploying the October 2026 update

The database schema gained new tables (khata ledger, stock adjustments, supplier payments,
cash sessions, audit log), new columns and indexes. All changes are additive — no existing data is removed.

1. Take a backup first: Dashboard → **Export Data → Excel**.
2. Apply the schema to the database (from `backend/`, with `DATABASE_URL` pointing at the live database):
   ```bash
   npx prisma db push
   ```
3. Backend environment variables (Vercel → backend project):
   - `JWT_SECRET` — required in production (a long random string).
   - `FRONTEND_URL` — the POS address, e.g. `https://gmfabrics.vercel.app` (CORS only allows this origin,
     its Vercel preview URLs, and `CORS_ORIGINS` — a comma-separated list of extra origins).
   - Optional: `RETURN_WINDOW_DAYS` (default 7), `SHOP_UTC_OFFSET_MINUTES` (default 300 = Pakistan).
4. Redeploy backend, then frontend.

After deploying, everyone must log in again once (tokens now carry a session version).

## Roles

- **Admin** — everything, including costs, profit, purchases, users, audit log, voiding bills, deleting returns.
- **Cashier** — POS, returns (within the return window), khata payments, customers, expenses, day open/close.

## Keyboard shortcuts

Press `Shift + ?` anywhere in the app to see all shortcuts. Hovering a button shows its shortcut.
