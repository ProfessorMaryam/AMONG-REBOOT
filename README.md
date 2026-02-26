# Among Reboot

An Among Us-inspired real-time multiplayer game built for the Reboot01 community. Players log in with their Reboot01 credentials and participate in a social deduction game with impostors, voting rounds, and mini-games.

## Tech Stack

- **Frontend:** React 19 + Vite
- **Backend:** Node.js HTTP server + WebSocket (`ws`)
- **Auth:** Reboot01 JWT via Basic Auth, server-side sessions

## Getting Started

### Prerequisites

- Node.js 18+
- A Reboot01 account (or use the dev test account)

### Install

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root (optional — defaults are provided for dev):

```env
PORT=3001
ADMIN_USERNAME=sbucheer
REBOOT_SIGNIN=https://learn.reboot01.com/api/auth/signin
REBOOT_GQL=https://learn.reboot01.com/api/graphql-engine/v1/graphql
ALLOWED_ORIGIN=*
```

### Run (development)

```bash
npm run dev
```

This starts both the WebSocket/HTTP server (port 3001) and the Vite dev server concurrently.

### Run (production)

```bash
npm run build
NODE_ENV=production npm run server:prod
```

## Game Flow

| Phase | Description |
|-------|-------------|
| `lobby` | Players join and wait for the admin to start |
| `story` | Story intro is shown |
| `wallet` | Mini-game: Wallet task (80s) |
| `puzzle` | Mini-game: Puzzle task |
| `lab` | Mini-game: Lab task |
| `slidepuzzle` | Mini-game: Slide puzzle |
| `discuss` | Discussion phase (60s) |
| `vote` | Voting phase — players vote to eliminate a suspect (30s) |
| `result` | Vote result revealed |
| `gameover` | Game ends |

## Admin

Log in with the configured `ADMIN_USERNAME` to access the Admin Dashboard, which lets you control game phases, kick players, start votes, and reveal results.

## Dev Test Account

In development (`NODE_ENV` ≠ `production`), you can log in with:

- **Username:** `testuser`
- **Password:** `test123`
