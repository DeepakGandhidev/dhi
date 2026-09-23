# DHI International

Public site, member portal, marketplace and back office for the DHI
compensation plan, built with Next.js (App Router) and MongoDB.

## Running it

```bash
npm install
cp .env.example .env.local   # then fill in MONGODB_URI
npm run dev                  # http://localhost:3000
```

If you do not have MongoDB installed, run a throwaway one in a second terminal:

```bash
npm run dev:db               # replica set on 127.0.0.1:27017, data is discarded
# MONGODB_URI="mongodb://127.0.0.1:27017/dhi?replicaSet=dev"
```

Every purchase, bonus and payout is written in a MongoDB **transaction**, and
MongoDB only allows transactions on a replica set. Atlas always is one; a plain
standalone `mongod` is not and will fail at the first activation.

```bash
npm test                     # 56 tests: calculations, engine, marketplace (in-memory replica set)
npm run db:migrate           # once, on an existing database: lineage + package orders + indexes
npm run db:seed              # demo categories and products (flagged demo: true)
npm run db:seed -- --network # plus a 31-member demo network with activity (dev only)
npm run db:seed -- --remove  # delete the demo products and categories
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

## Member portal, marketplace and back office

| Route | What it does |
| --- | --- |
| `/dashboard` | Accueil: member code, pack, PV, network, generations, both legs, wallet, award progress, referral link |
| `/dashboard/reseau` | Lazy-loaded binary tree, generations 1–8 with fill and PV, per-generation lists, direct recruits |
| `/dashboard/bonus` | One tab per mechanism, each with totals, this month, history and the calculation |
| `/dashboard/paiements` | Wallet, earnings by type, withdrawal requests, full history |
| `/dashboard/awards` | Star, Émeraude, Diamond, Sapphir: every requirement with its own progress bar |
| `/dashboard/affiliation` | Clicks, sales, commissions |
| `/dashboard/profil`, `/commandes`, `/notifications` | Profile (phone, email and password need the current password), orders, notifications |
| `/marketplace`, `/marketplace/[slug]` | Catalogue with search, categories, member prices; product page with Partagez & gagnez |
| `/marketplace/panier`, `/commande` | Cart and checkout, for members and guests |
| `/admin` | Queues, member activation, order lifecycle, payouts, products, reviews, award delivery, ledger inspection with corrections, versioned business rules |

Portal wording lives in [`src/i18n/fr.ts`](src/i18n/fr.ts).

### How the money flows

Registration opens a **package order**. Nothing is paid until the office confirms
the payment in `/admin`, which **activates** the member in one transaction:

1. the package PV goes into the PV ledger;
2. that PV is added to the left or right leg of every ancestor up to 7 levels up
   (generation 8, counting the ancestor as 1), and each ancestor's legs are
   matched: whole 25 PV pairs pay the package binary rate, the rest carries forward;
3. the sponsor's direct bonus is paid (pending if the sponsor's own pack is not yet confirmed);
4. Fast Cumulation and awards are re-evaluated up the line.

Marketplace orders follow `pending → confirmed (paid) → processing → shipped →
delivered`. Payment credits the buyer's PV and an affiliate commission as
*pending*; delivery makes the commission payable; cancellation or refund
restores stock and reverses both.

Every figure is a ledger entry with its source, the rate used and the rules
version: `PvEntry`, `VolumeEntry`, `BonusEntry`, `Payout`. Wallet balances are
kept in the same transactions and can be recomputed from the ledger
(`/admin` → Registre shows whether they match).

### Rules that were interpreted — confirm with DHI

All of these are single settings in `/admin` → Configuration or in [`plan.ts`](src/lib/plan.ts):

- **Generations** count the member as generation 1: eight generations = 254
  people below, 255 positions.
- **Award PV** is group volume: own PV plus downline PV within eight generations.
  Award packages are "at least" (a Thumb member qualifies for Middle requirements).
- **Fast Cumulation** unlocks at 254 active people within eight generations. Its
  amount is not published, so it is 0 (qualification recorded) until set.
- **Rounding**: amounts are whole FCFA and rates basis points; each payout is
  rounded down once (22.5% of one pair is 2 812 FCFA, not 2 812.5).
- **Direct bonus** is the sponsor's rate on the PV value of the recruit's package.
- **Affiliate commission** is 8% of what the customer paid, per product overridable,
  attributed for 30 days by a signed cookie, never to the buyer themselves.
- **Refunded PV** that was already matched and paid is not clawed back; the
  shortfall is recorded on the volume entry for review.

## Before going live

- Replace the placeholder photography and the two member quotes on the home page
  with real DHI photography and real, attributable testimonials.
- Confirm the Fast Cumulative amount and the exact award-level conditions with
  the DHI office; the award requirements on `/awards` describe the network shape
  from the plan, not published payout figures.
- Registration records an intent to join; it does not take payment.
- Run `npm run db:migrate` once against the production database before deploying
  this version, and `npm run db:seed -- --remove` once real products are in.
- There is no payment gateway: the office confirms Mobile Money / cash payments
  and pays withdrawals by hand, entering the transaction reference each time.
- Product photos are URLs entered in the admin; there is no upload storage.
- Set `SITE_URL` (e.g. `https://dhi.example`) so shared referral and product
  links use the public domain.
