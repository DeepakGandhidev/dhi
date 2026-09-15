# DHI International

Marketing and registration site for the DHI compensation plan, built with
Next.js (App Router) and MongoDB.

## Running it

```bash
npm install
cp .env.example .env.local   # then fill in MONGODB_URI
npm run dev                  # http://localhost:3000
```

If you do not have MongoDB installed, run a throwaway one in a second terminal:

```bash
npm run dev:db               # starts MongoDB on 127.0.0.1:27017, data is discarded
```

The marketing pages work without a database. Only registration and the member
list need `MONGODB_URI`.

### Environment

| Variable         | Purpose                                            |
| ---------------- | -------------------------------------------------- |
| `MONGODB_URI`    | Connection string (Atlas or local `mongod`)        |
| `ADMIN_PASSWORD` | Password for `/admin` and the member-list API      |
| `SESSION_SECRET` | Long random string signing member login cookies    |

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## The plan lives in one file

Every package, rate, percentage and the `1 PV = 500 FCFA` conversion is defined
in [`src/lib/plan.ts`](src/lib/plan.ts). Pages and calculators read from it, so
changing a rate there changes it everywhere — the site can never quote two
different numbers for the same thing.

The calculators are derived, not hard-coded:

- a pair is `25 PV` on each side, worth `25 × 500 = 12 500 FCFA`
- the binary bonus is your package rate on that, so Thumb earns
  `12 500 × 25% = 3 125 FCFA` per pair
- pairs are limited by the weaker leg: `min(left, right) ÷ 25`
- the direct bonus is your rate on the PV value of the package your recruit buys

## Pages

| Route         | What it does                                                   |
| ------------- | -------------------------------------------------------------- |
| `/`           | Hero (the interactive hand), products, rate matrix, binary calculator, generations, worked example |
| `/packages`   | The five packages side by side, plus the full rate table        |
| `/plan`       | Direct sponsorship, binary, generations, Fast Cumulative, discounts |
| `/calculator` | Direct sponsorship and binary matching calculators              |
| `/awards`     | Star → Emerald → Diamond → Sapphire                             |
| `/join`       | Registration form, places the member in the tree, returns a member code |
| `/login`      | Member sign-in with member code and password                    |
| `/dashboard`  | A member's own network: legs, tree, generations, direct recruits |
| `/admin`      | Member list for the DHI office, gated by `ADMIN_PASSWORD`       |

## Placement: sponsorship is not position

These are two different relationships, and conflating them is the usual way a
binary plan goes wrong.

- **Sponsor** (`sponsorCode`) — who introduced you. Earns the direct bonus.
- **Placement** (`placementParent` + `position`) — where you actually sit in
  the tree.

When someone registers, the sponsor names a leg. The system then walks down
that leg **breadth-first** and drops the new member into the first open slot,
left before right. If the sponsor's chosen leg is already full, the member
*spills over* and is placed under someone below the sponsor — which is what
lets a strong upline leg feed the people beneath it. The dashboard tells a
member when this has happened, so nobody thinks they were placed wrongly.

Two people can race for the same slot. A unique index on
`{ placementParent, position }` rejects the loser, and the placement search
re-runs, so concurrent registrations cannot produce two members in one
position. This is covered by a concurrency test described below.

The placement rule lives entirely in
[`src/lib/placement.ts`](src/lib/placement.ts) — if DHI confirms a different
rule (for example, the sponsor picking an exact slot), that is the only file
that changes.

## Member accounts

Passwords are hashed with bcrypt (cost 12). Sessions are a signed, HttpOnly,
SameSite=Lax cookie — an HMAC over the member code and an expiry, so the
contents cannot be edited by the client. Sign-in returns the same message for a
wrong password and an unknown member code, so the form cannot be used to
discover which member codes exist.

`/dashboard` is guarded server-side rather than by middleware; an anonymous or
forged cookie is redirected to `/login`.

## API

`POST /api/members` — registers a member. Validates the name, phone, email,
package and leg, checks the sponsor code against an existing member, and
allocates a unique `DHI-XXXXXX` code (retrying on collision). Returns `201` with
the code, `422` with per-field errors, or `503` if `MONGODB_URI` is unset.

`GET /api/members?key=<ADMIN_PASSWORD>` — the 200 most recent registrations.
Never returns password hashes.

`POST /api/auth/login` — member code and password, sets the session cookie.
`POST /api/auth/logout` — clears it.
`GET /api/auth/me` — whether a session cookie is present. Used only so the nav
can show the right label without making every page dynamically rendered.

## Design

The five packages are named after the fingers, so the hand is the identity: the
hero is a hand whose fingers are the packages, at real finger proportions (the
thumb is short and set apart, and it is also the strongest package). Palette is
West African indigo dye with marigold and a jade used only for growth and
matched volume. Type is Bricolage Grotesque for display and Instrument Sans for
body, with tabular figures everywhere a PV or FCFA amount appears.

Photography is swappable from one place: [`src/lib/images.ts`](src/lib/images.ts).
`Photo` falls back to a designed panel if an image fails to load, so the page
never shows a broken image.

## Deploying

The site is a standard Next.js app and deploys to Vercel with no extra config.

1. Import the repository at [vercel.com/new](https://vercel.com/new).
2. Add two environment variables in **Settings → Environment Variables**:
   `MONGODB_URI` and `ADMIN_PASSWORD`. They are not in the repository.
3. In MongoDB Atlas, open **Network Access** and allow `0.0.0.0/0`, otherwise
   Vercel's servers cannot reach the cluster.
4. Deploy.

`.env.local` is git-ignored and must never be committed — it holds the database
password.

## Before going live

- Replace the placeholder photography and the two member quotes on the home page
  with real DHI photography and real, attributable testimonials.
- Confirm the Fast Cumulative amount and the exact award-level conditions with
  the DHI office; the award requirements on `/awards` describe the network shape
  from the plan, not published payout figures.
- Registration records an intent to join; it does not take payment.
- **There is no PV or earnings tracking yet.** The dashboard shows the network
  — legs, tree, generations, direct recruits — but not volume or money. The
  calculators on the public pages are illustrations you drive by hand, not
  readings of live data. Paying real bonuses needs a PV ledger, per-cycle
  carry-over state and payout records, which is a separate piece of work.
- Members are created with `status: "pending"`. Nothing currently flips them to
  `"active"` — the office needs a way to confirm payment.
