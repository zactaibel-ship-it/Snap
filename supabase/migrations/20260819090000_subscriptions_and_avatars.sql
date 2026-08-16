-- RevenueCat entitlement mirror (kept in sync by the revenuecat-webhook edge
-- function) plus the monthly free-tier extraction counter, and a public
-- storage bucket for profile avatar uploads.

alter table public.users
  add column is_pro boolean not null default false,
  add column pro_product_id text,
  add column pro_expires_at timestamptz,
  add column extraction_count int not null default 0,
  add column extraction_reset_date date;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar images are publicly readable" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Users can upload their own avatar" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own avatar" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own avatar" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
