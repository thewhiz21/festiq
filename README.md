# FestiQ

Festival lineup trivia boards. Each festival is a room; each artist on the
lineup is a square on a bingo-style board. Answer trivia about an artist to
clear their square (pay-per-try); complete a full row, column, or diagonal
and you win a ticket to that festival. Miss and the square is dead for that
board — no retries.

This mirrors PropQuix's Solo Trivia system directly: same dark theme, fonts,
board hover/line-highlight behavior, guest demo board, and sequential
one-question-at-a-time quiz flow with instant per-answer grading and a
whole-quiz countdown clock. Simplified to a single stage (one line = one
ticket, no second-tier prize).

## What's here

- `server/db.js` — Postgres schema (users, wallets, festivals, artists,
  questions, boards, board_cells, pending_attempts, tickets_won). Creates
  the schema on boot if it doesn't exist.
- `server/board.js` — grid sizing + line-completion / bust logic, decoupled
  from the DB so it's unit-testable on its own.
- `server/seed.js` — one demo festival ("Sunset Waves Festival"), 9 fictional
  artists, 3 hand-written questions each. Swap for real lineups + real
  research before launch.
- `server/server.js` — Express API: auth, wallet, festival listing/detail,
  start/answer/submit quiz, ticket awarding.
- `public/index.html` — single-file vanilla JS frontend (no build step),
  styled to match PropQuix's Solo Trivia UI system.

## Running it locally

```
cp .env.example .env   # fill in a Postgres connection string + a JWT secret
npm install
npm start
```

Opens on `http://localhost:4200`. The demo festival auto-seeds on first run
if the `festivals` table is empty.

## Database

Runs on Postgres (via `pg`), same as PropQuix. `server/db.js` creates the
schema on boot if it doesn't exist, and `server/seed.js` seeds the one demo
festival if it isn't already there. Set `DATABASE_URL` (see `.env.example`)
— locally that can point at a local Postgres instance, and in production
it's whatever your host's managed Postgres connection string is (e.g.
Render's internal database URL).

## What's stubbed / not decided yet

- **Payments**: `/api/wallet/demo-buy-tokens` grants tokens instantly with
  no real charge — ticket sourcing and pricing aren't finalized yet, so
  there's nothing to wire Stripe to. When that's settled, swap this for a
  real Stripe Checkout session (same pattern as PropQuix's Solo token
  packs) and remove the demo endpoint.
- **Ticket fulfillment**: winning mints a claim code (`tickets_won` table)
  but nothing sends the actual ticket. Needs an admin view + email flow, same
  shape as PropQuix's winner claim-code queue.
- **Real content**: the demo lineup is fictional. A real festival needs
  actual artist facts researched and turned into a question bank per artist
  — this is the same pipeline shape as PropQuix's `question_bank`, just
  scoped to one festival's lineup instead of 10,000 trading questions.
- **Admin panel**: only a bare `/api/admin/reset-board` exists for testing.
  Creating festivals/lineups/questions is all direct DB inserts right now
  (see `server/seed.js`) — needs a real admin UI before non-technical lineup
  entry is possible.
- **Multi-festival hosting**: the "no instant section" framing (only Free
  Contests-style long-running boards, no PropQuix-style paid instant
  contests) is already how this is built — every festival is a standing
  board until its ticket(s) are claimed or the event passes.

## Deployment

Same split as PropQuix: Node/Express + managed Postgres on Render. The
static frontend is served directly by the same Express app (see
`public/index.html`), so one Render web service is enough — no separate
Vercel deploy needed unless traffic grows enough to want it split out.

Once the Render service is live, point `festiq.co` at it via your domain
registrar's DNS (a CNAME to the Render service's `.onrender.com` hostname,
or an ALIAS/ANAME record at the apex — Render's dashboard shows the exact
record to add once a custom domain is attached to the service).
