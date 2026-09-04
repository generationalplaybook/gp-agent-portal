-- Annuity field set (added 9/4) — mirrors schema.sql section 41. Run this once in Supabase's
-- SQL Editor.
--
-- Karina: an annuity's product form was showing the same fields as a term life policy (the term
-- checkbox, Face amount/Premium, life-insurance riders), none of which fit. This adds a
-- purpose-built set of fields, shown only when product_type = 'Annuity':
--
-- annuity_contribution_amount / annuity_contribution_frequency — an ongoing periodic
-- contribution (monthly/quarterly/semi-annual/annual), separate from the one-time initial
-- premium (which reuses the existing `premium` column — an annuity's "premium" is genuinely the
-- same real-world concept as a life-insurance premium, money paid into the contract).
--
-- contract_value — the current accumulation value, a manually-updated snapshot (annuities don't
-- have a "face amount" the way life insurance does).
--
-- annuity_surrender_end_date — when the carrier's own surrender-charge period ends. Distinct
-- from the IRS's 59 1/2 early-withdrawal penalty, which is tracked per-client below since it's
-- about the client's age, not any one policy's terms.
--
-- clients.turned_59_half_notice_sent — same one-time-only pattern as turned_18_notice_sent, for
-- a new daily cron milestone: a client who holds an Annuity product gets an advisor reminder the
-- day they turn 59 1/2, since the IRS's 10% early-withdrawal penalty no longer applies to their
-- annuity from that point on.

alter table public.client_products add column if not exists annuity_contribution_amount numeric;
alter table public.client_products add column if not exists annuity_contribution_frequency text;
alter table public.client_products add column if not exists contract_value numeric;
alter table public.client_products add column if not exists annuity_surrender_end_date date;
alter table public.clients add column if not exists turned_59_half_notice_sent boolean not null default false;
