# Pilot walkthrough — script for the VP Academics video

A shot-by-shot script for a screen recording that shows every function of the
dashboard. Target length **8–10 minutes**. Written to be read aloud, or
paraphrased, while you drive.

---

## Before you record

**1. Start the app in demo mode.** Sample data is what makes the video possible
— without it three of the four tabs are empty:

    PUBLIC_USE_FIXTURES=true npm run dev

Every screen will carry a yellow "sample data" banner. **Leave it visible.** It
is the honest thing to do and it saves you from a VP quoting an invented revenue
figure back at you in a meeting.

**2. Set up the window.**

- Browser at 1440×900 or wider — the layout goes single-column below 980px and
  the rail disappears.
- Zoom at 100%. Close other tabs; the tab bar is in the frame.
- Light theme to start. You will switch to dark on camera.
- Have `src/content/sponsors.json` open in an editor in a second window for the
  last section.

**3. Recording tool.** Windows has two built in, no install:

- **Xbox Game Bar** — `Win + G`, then the record button. Captures one window,
  includes microphone. Saves to `Videos\Captures`.
- **Clipchamp** — also ships with Windows 11, records screen + mic and edits in
  the same app. Better if you want to trim or add captions afterward.

Either is fine. Game Bar is faster; Clipchamp is easier to fix mistakes in.

---

## The script

### 00:00 — What this is (30s)

> "This is the JMCC News and Resources Dashboard. It has one job: keep delegates
> current on what's happening in their competition discipline, without becoming
> another thing they have to study. A headline and a link, refreshed daily.
> Case-prep depth lives in the Technical Specs tab and in Case History — not in
> the feed."

Point out the header strip: edition number, date, "JMCC Internal · Public".

> "It's public and anonymous. No login, no account. That's deliberate — the
> friction of an account is the reason a tool like this dies in October."

### 00:30 — The discipline bar (45s)

Click through the four competition sections first, then three or four
disciplines within one. Let the feed reload each time.

> "Four competition sections across the top — JDC and JDCC share one, since
> their disciplines are nearly identical, then SMNG, FO and Happening
> Marketing. Picking a section swaps the disciplines below it; picking a
> discipline filters everything under that. The discipline is in the URL and
> the section follows from it, so a coach can send a delegate one link straight
> to their case's feed."

Copy the URL from the address bar and show it.

### 01:15 — The feed itself (90s)

> "Each item is a source, a date, a headline, and a one-line summary. That's on
> purpose — we link out and never reproduce the article. Copyright, and also
> we're not trying to replace reading the source."

Demonstrate, in order:

1. **Read article** — opens the publisher in a new tab. Come back.
2. **The bookmark icon** — save one. Point out the count appearing on the Saved
   tab in the nav.
3. **Refresh** — click it. Note the "last refresh" line under the heading.

> "Refresh re-queries our own database, not the news APIs. The browser never
> calls an external service. That matters for cost — we're on a free tier with a
> daily credit budget."

4. **Load more** — scroll to the bottom, click it.

### 02:45 — The AI Angle filter (60s)

Switch to **Digital Strategy** so the filter has something to show.

> "Every article is checked at ingest for whether it has an AI angle, and
> flagged if so. You see the badge on the card here."

Point at an `AI` badge. Then click **AI Angle** next to Refresh.

> "And this filters the feed to just those. Note the count — five — so you know
> before you click whether there's anything there. And note that it filters; it
> does not reorder. The most recent story is always at the top whether the
> filter is on or off, because a feed that silently rearranges itself is a feed
> people stop trusting."

Click it off again.

### 03:45 — The rail (45s)

Scroll the right-hand column.

> "Consulting reports and insights — the longer-form stuff, from the firms that
> actually judge these competitions. Same rules: headline, summary, link out."

If Sponsor Watch is visible, point it out:

> "And when a competition has sponsors, articles about those sponsors surface
> here automatically."

### 04:30 — Technical Specs (90s)

Click the **Technical Specs** tab. Stay on Finance.

> "This is the reference layer, and it's the one the coaches own. Three sections
> per discipline — key frameworks, key metrics, and recommended sources."

Scroll through all three. Use the numbered table of contents on the left to jump
to Recommended Sources.

**Say the important part plainly:**

> "What you're seeing here is placeholder — generic textbook material, which is
> why there's a banner at the top. The real content comes from the discipline
> coaches, and until a coach signs off on a discipline, it shows an
> 'in development' message rather than half-finished bullets. If no discipline
> is ready, this tab doesn't appear at all. That's the thing I'd want your input
> on: getting coaches to fill these in is the gating item, not the code."

Click to **Accounting** to show the in-development state.

### 06:00 — Sponsor Tracker (2 min)

Click the **Sponsors** tab.

> "This is the newest piece. When a company sponsors a competition, delegates
> should be able to walk into the room knowing who they're presenting to."

Walk through, top to bottom:

1. **The comparison charts.**

   > "These build themselves. If two or more sponsors report the same figure in
   > the same unit, it becomes a chart. Nobody configures that."

2. **A sponsor card** — name, sector, head office, founding year, what they do.

3. **The stat tiles.** Hover one, then click through to its source.

   > "Every number is a link to the page it came from. A delegate quoting a
   > revenue figure in a pitch can get to the filing in one click — and if a
   > judge asks 'where'd you get that', there's an answer."

4. **Stated goals and stated values.**

   > "This is the part that actually wins cases. If a sponsor has publicly
   > committed to electrifying their fleet by 2030, a recommendation that
   > ignores that is a recommendation that loses."

5. **The footer** — "figures as of" and the source list.

   > "Everything is dated. A revenue number without a date is a liability."

**Then the honest caveat:**

> "Same as the specs tab — these three companies are invented. Real profiles go
> in once sponsorship closes."

### 08:00 — Saved and Case History (60s)

Click the **Saved** tab.

> "Anything a delegate bookmarks lands here, and they can promote it into Case
> History with their own notes and tags — which case it was for, what they used
> it to argue."

Demonstrate adding a note to one saved item.

> "This is per-device right now — it lives in the browser. When this gets folded
> into the Delegate Portal it moves to their account, and the data shape is
> already built to make that a lift-and-shift rather than a rewrite."

### 09:00 — Theme and close (45s)

Click the theme toggle. Let the dark theme land.

> "Light and dark, remembered per device. Accessibility is a requirement here,
> not a nice-to-have — everything passes WCAG AA and the last Lighthouse run
> scored 100 on accessibility."

Close with what you need from them:

> "So — what I'd want from you: first, help getting the discipline coaches to
> write the Technical Specs content, because that tab is empty without them.
> Second, a decision on which competitions and sponsors go in first. Third, a
> couple of delegates to test the link I'll send you."

---

## What NOT to do on camera

- **Don't turn off the sample-data banners** to make it look more finished. If
  the VP screenshots a slide with an invented revenue figure on it and it ends
  up in a sponsorship deck, that is a real problem.
- **Don't demo the newsletter.** There isn't one, deliberately — see "Why there
  is no newsletter" in the README. If asked, the answer is that the weekly
  AI podcast replaces it.
- **Don't show the Supabase dashboard or any `.env` file.** Keys are on screen
  there.

---

## Sending it

Recordings from Game Bar land in `Videos\Captures` as MP4. A 10-minute 1080p
capture is roughly 300–600 MB — too big for email. Upload to the JMCC Google
Drive and share the link, or trim it in Clipchamp first.
