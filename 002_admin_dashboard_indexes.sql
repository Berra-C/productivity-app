-- Admin dashboard sorgularını hızlandıran indeksler.
-- Mevcut tabloları/verileri değiştirmez.
create index if not exists app_sessions_last_seen_idx
  on public.app_sessions(last_seen_at desc);

create index if not exists app_sessions_account_last_seen_idx
  on public.app_sessions(account_id, last_seen_at desc);

create index if not exists app_states_updated_idx
  on public.app_states(updated_at desc);

create index if not exists app_accounts_last_login_idx
  on public.app_accounts(last_login_at desc);
