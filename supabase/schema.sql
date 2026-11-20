-- Guestbook table for the portfolio site. Run once in the Supabase SQL editor.
create table if not exists public.guestbook (
  id          bigint generated always as identity primary key,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  message     text not null check (char_length(btrim(message)) between 1 and 500),
  created_at  timestamptz not null default now()
);

alter table public.guestbook enable row level security;

-- Anyone may read entries.
drop policy if exists "guestbook read" on public.guestbook;
create policy "guestbook read" on public.guestbook
  for select to anon, authenticated using (true);

-- Anyone may add an entry; length limits are enforced by the check constraints.
drop policy if exists "guestbook insert" on public.guestbook;
create policy "guestbook insert" on public.guestbook
  for insert to anon, authenticated with check (true);

-- No update/delete policies: visitors cannot edit or remove entries.
-- Moderate from the Supabase dashboard (Table editor) instead.
revoke update, delete on public.guestbook from anon, authenticated;
grant select, insert on public.guestbook to anon, authenticated;
