-- OPTIONAL. The backend works without this. Run only if you want to keep the
-- extra data the old goheza_tests rows had.
alter table public.creator_social_accounts
  add column if not exists refresh_token_expires_at timestamptz null,
  add column if not exists last_error text null,
  add column if not exists updated_at timestamptz not null default now();
