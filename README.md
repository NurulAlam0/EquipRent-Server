# Rentora API

Rentora is an equipment-rental marketplace connecting people who need
equipment with owners who want to rent it out. This repository contains
the Express API; the Next.js frontend runs separately in
[EqupRent-Client](https://github.com/NurulAlam0/EqupRent-Client).

## Live API

[https://equip-rent-server-pi.vercel.app/](https://equip-rent-server-pi.vercel.app/)
— `GET /` returns `{"status":"ok","service":"rentora-api"}`.

## Purpose

- Email/password and Google authentication with JWT access tokens
  (`access_token` cookie + `Authorization: Bearer` support) and
  role-based access control (`verifyToken`, `verifyRenter`,
  `verifyOwner`, `verifyAdmin`).
- Equipment catalogue with server-side search, filtering, sorting and
  pagination; owner listings with approve/reject workflow.
- Rental bookings with Stripe Checkout, webhooks and a `payments`
  collection; favorites, reviews, and admin/owner analytics.

## Key features

- JWT auth: register, login, logout, profile, Google OAuth, and
  `POST /api/auth/become-owner` for customers switching to owner.
- Equipment: list (approved only, public), featured, popular, details,
  create/update/delete (owner), image upload via imgbb, admin
  approve/reject.
- Bookings: availability-checked checkout, Stripe Checkout Session,
  webhook completion, verify/cancel, customer + owner views.
- Favorites, reviews (after a paid + completed rental), admin users /
  equipment / rentals management, admin + owner analytics.
- Cron: release of expired unpaid reservations.

## Tech stack / npm packages used

Express 4, Mongoose 8 (MongoDB), TypeScript, `tsx`, `jsonwebtoken`,
`bcryptjs`, `cors`, `cookie-parser`, `dotenv`, `stripe`, plus
`@types/*` dev packages. See `package.json` for exact versions.

## Getting started

```bash
npm install
cp .env.example .env   # fill in your own values, never commit .env
npm run dev            # tsx watch src/server.ts (default :5050)
npm run seed           # seed owner + admin + 26 approved items + 4 reviews
npm run typecheck
node scripts/smoke.mjs # API smoke test (needs the API running)
```

## Environment variables

See `.env.example`: `PORT`, `CLIENT_URL`, `SERVER_URL`,
`MONGODB_URI`, `JWT_SECRET`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `IMGBB_API_KEY`,
`CRON_SECRET`.

## Demo accounts (seeded — change the passwords after seeding)

- Owner: `owner@rentora.com` / `OwnerPass123`
- Admin: `admin@rentora.com` / `AdminPass123` (added with the auth
  unification fix; create it by running `npm run seed` — the script
  is idempotent and will not duplicate existing accounts)

## API overview

Base: `/api` — `/auth`, `/equipment`, `/bookings`, `/reviews`,
`/favorites`, `/owner`, `/admin`, `/cron`. Public reads are open;
writes require a JWT and the matching role.
