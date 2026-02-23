# Betting App (React Native + Express + SQLite)

This app includes:
- Login/register with JWT auth
- Persistent user accounts
- Server-side wallet and bet history
- Real odds fetch via The Odds API (with fallback fixtures)
- Admin settlement workflow (`WIN` / `LOSE` / `VOID`)
- SQLite database with automatic migration from legacy JSON storage
- Security hardening (`helmet`, rate limits, input validation, CORS allowlist)

## Project Structure

- Mobile app: `/Users/bikashgupta/ReactNative/Project1`
- Backend API: `/Users/bikashgupta/ReactNative/Project1/server`
- SQLite DB: `/Users/bikashgupta/ReactNative/Project1/server/data/app.db`
- Legacy JSON (auto-migrated on first boot): `/Users/bikashgupta/ReactNative/Project1/server/data/db.json`

## 1) Start Backend

```sh
cd /Users/bikashgupta/ReactNative/Project1/server
cp .env.example .env
npm install
npm run dev
```

Backend runs on `http://localhost:4000`.

## 2) Configure Environment

Edit `/Users/bikashgupta/ReactNative/Project1/server/.env`:

```env
PORT=4000
JWT_SECRET=replace_with_a_long_random_secret
ODDS_API_KEY=your_odds_api_key
ODDS_REGION=uk
ODDS_CRICKET_SPORT_KEY=cricket_ipl
ODDS_FOOTBALL_SPORT_KEY=soccer_epl
ALLOWED_ORIGINS=
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@betapp.local
ADMIN_PASSWORD=Admin@12345
```

Notes:
- If `ODDS_API_KEY` is missing or API fails, fallback fixtures are served.
- `ALLOWED_ORIGINS` accepts comma-separated origins; blank allows all origins in dev.
- Admin user is auto-seeded on server startup using `ADMIN_*` values.

## 3) Start React Native App

```sh
cd /Users/bikashgupta/ReactNative/Project1
npm install
npm start
```

Then run:

```sh
npm run android
# or
npm run ios
```

## API Endpoints

Auth:
- `POST /api/auth/register`
- `POST /api/auth/login`

User:
- `GET /api/me`
- `GET /api/matches?sport=Cricket`
- `GET /api/matches?sport=Football`
- `GET /api/bets`
- `POST /api/bets`

Admin:
- `GET /api/admin/bets/open`
- `POST /api/admin/bets/:betId/settle`

All non-auth endpoints require `Authorization: Bearer <token>`.

## Mobile API base URL

Configured in `/Users/bikashgupta/ReactNative/Project1/App.tsx`:
- Android emulator: `http://10.0.2.2:4000/api`
- iOS simulator: `http://localhost:4000/api`

For physical devices, switch to your machine LAN IP.
