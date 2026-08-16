-- Links imported recipes back to the creator that produced them, and adds
-- a place to store each user's Expo push token for creator-update
-- notifications.

alter table public.recipes
  add column followed_creator_id uuid references public.followed_creators (id) on delete set null;

create index recipes_followed_creator_id_idx on public.recipes (followed_creator_id);

alter table public.users
  add column push_token text;
