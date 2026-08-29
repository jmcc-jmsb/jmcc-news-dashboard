# Editing Sponsor Tracker content

The Sponsors tab is driven entirely by one file:

    src/content/sponsors.json

You do not need to be a developer to edit it, and you do not need to touch any
other file. This guide is everything you need.

---

## The rules, in short

1. **Only `published` sponsors appear on the site.** Anything marked `draft` or
   `review` is counted in the "N more in development" line but is never named
   and never rendered. An unannounced sponsor stays confidential.
2. **If no sponsor is `published`, the Sponsors tab disappears entirely.** That
   is the state the file ships in, and it is correct.
3. **Never invent a figure.** Every number needs a `source` URL you actually
   read it on. If you cannot source it, leave it out — an incomplete profile is
   fine, a made-up one is not.
4. **Date everything.** `asOf` is the date you did the research. It is printed
   at the bottom of every card so nobody quotes a two-year-old revenue figure
   as current.

---

## What the file looks like

The file starts as `{}`. Each sponsor is one entry, keyed by a short slug you
choose (lowercase, no spaces):

```json
{
  "northwind": {
    "status": "draft",
    "name": "Northwind Advisory",
    "legalName": "Northwind Advisory Group Inc.",
    "sector": "Management consulting",
    "hq": "Toronto, ON",
    "founded": 1988,
    "website": "https://www.northwind.example",
    "competitions": ["Competition 1 — November 2026"],
    "asOf": "2026-08-29",
    "summary": "One or two sentences on what the company actually does.",
    "metrics": [
      {
        "label": "Revenue",
        "value": 4.1,
        "unit": "B CAD",
        "source": "https://www.northwind.example/annual-report-2025"
      },
      {
        "label": "Headcount",
        "value": 12400,
        "source": "https://www.northwind.example/careers"
      }
    ],
    "goals": [
      "Double the public-sector advisory practice by 2029"
    ],
    "values": [
      "Client outcomes over billable hours"
    ],
    "sources": [
      "https://www.northwind.example/annual-report-2025"
    ]
  }
}
```

### Every field

| Field | Required | What it is |
|---|---|---|
| `status` | yes | `"draft"`, `"review"`, or `"published"`. Nothing else. |
| `name` | yes | What the company is called. Appears as the card heading. |
| `legalName` | no | The full legal entity, if it differs. |
| `sector` | yes | Free text, e.g. `"Asset management"`. Counted in the header. |
| `hq` | yes | City, province/state. |
| `founded` | no | A year, as a number. Not a metric — see below. |
| `website` | yes | Full URL including `https://`. |
| `competitions` | yes | Which JMCC competitions they sponsor. Free text, can be empty `[]`. |
| `asOf` | yes | `YYYY-MM-DD`, the date you did the research. |
| `summary` | yes | One or two plain sentences. Not marketing copy. |
| `metrics` | yes | The numbers. Can be empty `[]`. See below. |
| `goals` | yes | Stated goals, one string each. Can be empty `[]`. |
| `values` | yes | Stated values, one string each. Can be empty `[]`. |
| `sources` | yes | General reference URLs for the profile. Can be empty `[]`. |

### Metrics

Each metric is a number with a label and the page it came from:

- `label` — e.g. `"Revenue"`. **Spelling matters** — see the charts section.
- `value` — a number. No commas, no `$`, no `"` quotes around it.
- `unit` — optional, e.g. `"B CAD"`. Leave it out for plain counts.
- `source` — required. The page you read the figure on.
- `note` — optional. Shown when hovering the tile.

**A founding year is not a metric.** Use the `founded` field. A bar chart drawn
from zero to 1988 would imply a company founded in 1988 is twice one founded in
994, which is meaningless — so years live in their own field and are never
charted.

---

## How the comparison charts work

The charts at the top of the tab are built automatically. There is nothing to
configure:

> A metric is charted when **two or more published sponsors report the same
> `label` in the same `unit`.**

So if three sponsors each have a `"Revenue"` metric in `"B CAD"`, you get one
Revenue chart ranking all three. A metric only one sponsor reports stays on that
sponsor's own card instead of becoming a pointless one-bar chart.

Two consequences worth knowing:

- **Spelling and capitalisation matter.** `"Revenue"` and `"revenue"` are two
  different charts. So are `"Headcount"` and `"Employees"`.
- **Units are part of the match.** `"Revenue"` in `"B CAD"` and `"Revenue"` in
  `"B USD"` deliberately do *not* chart together — plotting them side by side
  would say the taller bar is the bigger company, which would be wrong. Convert
  to one currency yourself and say which in the `unit`.

---

## Where to find the information

All of it is public. In rough order of reliability:

1. **Annual report / investor relations** — revenue, headcount, segments. Public
   companies only.
2. **The company's own About and Careers pages** — headcount, offices, founding
   year, stated values. Private firms usually publish these too.
3. **Newsroom / press releases** — stated goals, strategy announcements.
4. **The sponsorship contact themselves** — for a private firm this is often
   faster and more accurate than guessing from the website.

Link to the specific page, not the homepage. A delegate clicking through from a
stat tile should land on the thing that proves the number.

---

## After you edit

The file is checked when the site builds. If something is wrong — a missing
field, a metric with no source, a bad date — **the build fails with a message
naming the problem.** It will not quietly publish a broken profile.

To check your work before committing:

    npm run typecheck

To see it on screen locally:

    npm run dev

---

## Seeing the layout before you have real sponsors

There is a set of invented sample companies for exactly this:

    PUBLIC_USE_FIXTURES=true npm run dev

Every sample source URL points at `example.com` and a banner across the top says
the data is invented. **Never turn this on in production** — it is off by
default and must stay that way.
