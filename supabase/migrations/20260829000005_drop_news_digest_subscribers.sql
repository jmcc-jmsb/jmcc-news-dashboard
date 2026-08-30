-- ABOUTME: Drops news_digest_subscribers — the weekly email digest was removed before it ever shipped.
-- ABOUTME: Safe to run unconditionally: the subscribe endpoint never reached production, so the table is empty.

-- The digest was built in sprint 4 and cut before merge. Delegates are meant to
-- come to the dashboard rather than have it pushed to them; the weekly AI
-- podcast will cover the push side later, on its own terms.
--
-- Nothing referenced this table by foreign key, and its RLS policy set was
-- empty by design (writes went through the secret key only), so there is no
-- policy to drop first.
drop table if exists news_digest_subscribers;
