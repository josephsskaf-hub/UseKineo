-- KINEO-PILOT-99-2026-07-26 — expiry storage for the $99 / 7-day Autopilot pilot.
--
-- ⚠️ NOT APPLIED. This file is written but deliberately NOT executed against
-- production. Until someone runs it, the `autopilot_pilot` SKU is INERT: the
-- checkout builder refuses to create a Stripe session and the webhook refuses
-- to grant the plan (both fail CLOSED — see the notes at the bottom).
--
-- WHY A NEW COLUMN
-- ────────────────
-- public.profiles has 50 columns and NOT ONE of them can express "this plan
-- stops on date X" (verified column-by-column against production on
-- 2026-07-26). The nearest candidates are all wrong:
--   • has_paid            → boolean, permanently true once set, never expires
--   • offer290_used       → boolean, single-purpose one-shot marker
--   • stripe_subscription_id → the pilot is a one-time PAYMENT, there is no
--                              subscription object and therefore no
--                              current_period_end to read back from Stripe
-- Shipping the pilot without this column means selling a $299/month product
-- once, for $99, forever. That is the single most expensive bug available in
-- this repo, so the code refuses to run rather than guess.
--
-- WHAT THE CODE READS
-- ───────────────────
-- Column name, exactly: profiles.plan_expires_at  (timestamptz, nullable)
--   NULL  → the current plan has no end date (every subscription plan).
--   NOT NULL → the plan is entitled ONLY while now() < plan_expires_at.
-- Read by lib/autopilot/config.ts :: isAutopilotEntitled(), which is already
-- called by BOTH the cron (app/api/cron/autopilot-generate) and the schedules
-- API (app/api/autopilot/schedules). Written by the Stripe webhook.

alter table public.profiles
  add column if not exists plan_expires_at timestamptz;

comment on column public.profiles.plan_expires_at is
  'KINEO-PILOT-99-2026-07-26 — hard end date for a time-boxed plan (the $99 / 7-day autopilot_pilot). NULL = no expiry. Enforced in lib/autopilot/config.ts::isAutopilotEntitled, which the autopilot cron calls on every run.';

-- The cron sweeps every schedule hourly and re-reads the owner profile by id,
-- so this index is for the admin/expiry reporting queries ("who is mid-pilot",
-- "whose pilot ends today"), not for the hot path.
create index if not exists profiles_plan_expires_at_idx
  on public.profiles (plan_expires_at)
  where plan_expires_at is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- AFTER APPLYING, TWO EDITS OUTSIDE THIS AGENT'S FILE OWNERSHIP ARE REQUIRED
-- for the expiry to actually be enforced. Both are one-line `select` widenings:
--
--   1. app/api/cron/autopilot-generate/route.ts  (generatePass, ~line 420)
--        - .select('has_paid, plan, is_pro, video_credits')
--        + .select('has_paid, plan, is_pro, video_credits, plan_expires_at')
--
--   2. app/api/autopilot/schedules/route.ts  (resolveCaller, ~line 180)
--        - .select('has_paid, plan, is_pro, video_credits')
--        + .select('has_paid, plan, is_pro, video_credits, plan_expires_at')
--
--   3. app/api/autopilot/schedules/route.ts  (POST, posts_per_day)
--        - posts_per_day: normalizePostsPerDay(body.postsPerDay ?? 1)
--        + posts_per_day: clampPostsPerDayForPlan(body.postsPerDay ?? 1, caller.plan)
--      (import clampPostsPerDayForPlan from '@/lib/autopilot/config')
--      Without it a pilot buyer can set 3 posts/day and get 21+ Shorts for $99.
--
-- isAutopilotEntitled() fails CLOSED on an *undefined* plan_expires_at, which
-- is what a select that does not ask for the column returns. So without (1)
-- and (2) the pilot buyer gets ZERO Shorts, not infinite ones — the safe
-- failure, but still a refund. (1) and (2) are NOT optional: apply all three
-- edits together with this file.
--
-- NOTE ON THE WINDOW: the code writes now() + 7 days + AUTOPILOT_PILOT_GRACE_HOURS
-- (36h), not exactly 7 days. There is no run counter anywhere in the schema, so
-- the date is the only bound, and the 7 daily slots land in (T+6d, T+7d] — flush
-- against a 7×24h deadline. The grace guarantees the 7th Short; worst case it
-- delivers an 8th (~$0.40).
-- ─────────────────────────────────────────────────────────────────────────────
