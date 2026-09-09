-- 0012: invite token storage for guardian links.
--
-- The token is stored hashed, never raw. If this table is ever exposed, a raw
-- token would let the reader claim guardianship of a minor — which is the one
-- thing the whole tiered-consent design exists to prevent. The raw value is
-- generated in the server route, emailed once, and never persisted.
--
-- Nullable: a link created by school_roster or staff_manual never has an
-- invite token, because no email redemption happens.

alter table public.guardian_links
  add column if not exists token_hash text,
  add column if not exists token_expires_at timestamptz,
  add column if not exists token_redeemed_at timestamptz;

create unique index if not exists guardian_links_token_hash_unique
  on public.guardian_links (token_hash)
  where token_hash is not null;

comment on column public.guardian_links.token_hash is
  'SHA-256 of the invite token. The raw token is emailed once and never stored.';
comment on column public.guardian_links.token_expires_at is
  'Invite expiry, 14 days from creation. A redemption attempt after this must fail.';
comment on column public.guardian_links.token_redeemed_at is
  'Set when the token is used. A second redemption attempt must fail even before expiry.';
