# Editing Technical Specs content

The Technical Specs tab is driven entirely by one file:

    src/content/specs.json

You do not need to be a developer to edit it, and you do not need to touch any
other file. This guide is everything you need.

---

## The rules, in short

1. **Only `published` disciplines appear on the site.** Anything marked `draft`
   or `review` shows a short "still in development" message instead.
2. **If no discipline is `published`, the Technical Specs tab disappears
   entirely.** That is the current state, and it is correct — the dashboard is
   fully usable without any specs content.
3. **Never invent filler content.** An empty section is the right answer until
   the real material exists. Half-real bullets are worse than none.

---

## What the file looks like

One entry per discipline. All eleven are already there:

```json
{
  "finance": {
    "status": "draft",
    "frameworks": [],
    "metrics": [],
    "sources": []
  }
}
```

- `status` — one of `"draft"`, `"review"`, or `"published"`. Nothing else.
- `frameworks` — Key Frameworks, a list of short text items.
- `metrics` — Key Metrics, a list of short text items.
- `sources` — Recommended Sources, a list of short text items.

There are **three sections and no more**. Overview and Glossary were removed on
purpose; adding them back will fail the build.

---

## Filling one in

```json
  "finance": {
    "status": "published",
    "frameworks": [
      "DCF Valuation",
      "WACC & CAPM",
      "LBO Modeling"
    ],
    "metrics": [
      "EV/EBITDA",
      "ROIC vs WACC spread",
      "Net Debt / EBITDA"
    ],
    "sources": [
      "Damodaran Online (NYU Stern)",
      "CFA Curriculum — Equity Investments"
    ]
  },
```

Set `status` to `"published"` only when the content is final. Disciplines can go
live one at a time — there is no need to wait for all eleven.

---

## The formatting rules JSON cares about

- Every piece of text is wrapped in `"double quotes"`.
- Items in a list are separated by commas. **The last item has no comma.**
- Entries are separated by commas too, except the last one.
- If your text contains a double quote, write it as `\"`.
- Apostrophes, accents, em dashes, and `&` are all fine as-is.

---

## Checking your work

Run:

    npm run build

If the file is valid, the build succeeds. If it is not, the build stops and
prints what is wrong — a missing comma, a misspelled status, an unexpected
section. **A broken file can never reach the live site**, so it is safe to
experiment.

If you would rather check before building, paste the file into
<https://jsonlint.com> — it will point at the exact line.

---

## The eleven discipline keys

These are fixed. Do not rename, add, or remove any of them:

`finance`, `accounting`, `tax`, `marketing`, `strategy`, `digital-strategy`,
`entrepreneurship`, `hr`, `pom`, `sustainability`, `international`
