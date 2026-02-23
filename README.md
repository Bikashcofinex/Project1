# Betting App (React Native + Express)

This project now includes:
- React Native app with login/register
- Persistent user accounts and session token
- Wallet and bet history persisted server-side
- Express backend with auth + betting APIs
- Real odds feed integration via The Odds API (fallback fixtures included)

## Project Structure

- Mobile app: `/Users/bikashgupta/ReactNative/Project1`
- Backend API: `/Users/bikashgupta/ReactNative/Project1/server`
- JSON DB file: `/Users/bikashgupta/ReactNative/Project1/server/data/db.json`

## 1) Start Backend

```sh
cd /Users/bikashgupta/ReactNative/Project1/server
cp .env.example .env
npm install
npm run dev
```

Backend runs on `http://localhost:4000`.

### Odds API setup (real matches/odds)

In `/Users/bikashgupta/ReactNative/Project1/server/.env`:

```env
ODDS_API_KEY=your_key_here
ODDS_REGION=uk
```

If `ODDS_API_KEY` is missing or API fails, backend returns fallback sample matches.

## 2) Start React Native App

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

## API Notes

- Auth:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
- User:
  - `GET /api/me`
- Markets:
  - `GET /api/matches?sport=Cricket`
  - `GET /api/matches?sport=Football`
- Bets:
  - `GET /api/bets`
  - `POST /api/bets`

All `/api/*` endpoints except `/api/auth/*` require `Authorization: Bearer <token>`.

## Mobile API base URL

Configured in `/Users/bikashgupta/ReactNative/Project1/App.tsx`:
- Android emulator: `http://10.0.2.2:4000/api`
- iOS simulator: `http://localhost:4000/api`

For a physical device, replace with your machine LAN IP.
