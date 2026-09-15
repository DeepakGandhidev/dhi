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

| Variable         | Purpose                                          |
| ---------------- | ------------------------------------------------ |
| `MONGODB_URI`    | Connection string (Atlas or local `mongod`)      |
| `ADMIN_PASSWORD` | Password for `/admin` and the member-list API    |

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
| `/join`       | Registration form, writes to MongoDB, returns a member code     |
| `/admin`      | Member list, gated by `ADMIN_PASSWORD`                          |

## API

`POST /api/members` — registers a member. Validates the name, phone, email,
package and leg, checks the sponsor code against an existing member, and
allocates a unique `DHI-XXXXXX` code (retrying on collision). Returns `201` with
the code, `422` with per-field errors, or `503` if `MONGODB_URI` is unset.

`GET /api/members?key=<ADMIN_PASSWORD>` — the 200 most recent registrations.

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
