-- Snip initial schema: users, recipes, meal planning, shopping list, followed creators.
-- Matches the shape of lib/database.types.ts.

create extension if not exists pgcrypto;

-- users --------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  dietary_preferences text[] not null default '{}',
  supermarket_preference text not null default 'both'
    check (supermarket_preference in ('tesco', 'sainsburys', 'both')),
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can insert own profile" on public.users
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

-- recipes --------------------------------------------------------------------

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text,
  source_url text not null,
  video_platform text not null check (video_platform in ('youtube', 'tiktok', 'instagram')),
  thumbnail_url text,
  ingredients jsonb not null default '[]',
  steps jsonb not null default '[]',
  servings int not null default 1,
  prep_time_minutes int,
  cook_time_minutes int,
  dietary_tags text[] not null default '{}',
  creator_name text,
  extracted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index recipes_user_id_idx on public.recipes (user_id);

alter table public.recipes enable row level security;

create policy "Users can view own recipes" on public.recipes
  for select using (auth.uid() = user_id);

create policy "Users can insert own recipes" on public.recipes
  for insert with check (auth.uid() = user_id);

create policy "Users can update own recipes" on public.recipes
  for update using (auth.uid() = user_id);

create policy "Users can delete own recipes" on public.recipes
  for delete using (auth.uid() = user_id);

-- meal_plans --------------------------------------------------------------------

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  week_start_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_start_date)
);

alter table public.meal_plans enable row level security;

create policy "Users can view own meal plans" on public.meal_plans
  for select using (auth.uid() = user_id);

create policy "Users can insert own meal plans" on public.meal_plans
  for insert with check (auth.uid() = user_id);

create policy "Users can update own meal plans" on public.meal_plans
  for update using (auth.uid() = user_id);

create policy "Users can delete own meal plans" on public.meal_plans
  for delete using (auth.uid() = user_id);

-- meal_plan_slots --------------------------------------------------------------------

create table public.meal_plan_slots (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_plans (id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner')),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  unique (meal_plan_id, day_of_week, meal_type)
);

create index meal_plan_slots_meal_plan_id_idx on public.meal_plan_slots (meal_plan_id);

alter table public.meal_plan_slots enable row level security;

create policy "Users can view own meal plan slots" on public.meal_plan_slots
  for select using (
    exists (
      select 1 from public.meal_plans
      where meal_plans.id = meal_plan_slots.meal_plan_id and meal_plans.user_id = auth.uid()
    )
  );

create policy "Users can insert own meal plan slots" on public.meal_plan_slots
  for insert with check (
    exists (
      select 1 from public.meal_plans
      where meal_plans.id = meal_plan_slots.meal_plan_id and meal_plans.user_id = auth.uid()
    )
  );

create policy "Users can update own meal plan slots" on public.meal_plan_slots
  for update using (
    exists (
      select 1 from public.meal_plans
      where meal_plans.id = meal_plan_slots.meal_plan_id and meal_plans.user_id = auth.uid()
    )
  );

create policy "Users can delete own meal plan slots" on public.meal_plan_slots
  for delete using (
    exists (
      select 1 from public.meal_plans
      where meal_plans.id = meal_plan_slots.meal_plan_id and meal_plans.user_id = auth.uid()
    )
  );

-- shopping_list_items --------------------------------------------------------------------

create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  ingredient_name text not null,
  quantity numeric,
  unit text,
  aisle text,
  checked boolean not null default false,
  source_recipe_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index shopping_list_items_user_id_idx on public.shopping_list_items (user_id);

alter table public.shopping_list_items enable row level security;

create policy "Users can view own shopping list items" on public.shopping_list_items
  for select using (auth.uid() = user_id);

create policy "Users can insert own shopping list items" on public.shopping_list_items
  for insert with check (auth.uid() = user_id);

create policy "Users can update own shopping list items" on public.shopping_list_items
  for update using (auth.uid() = user_id);

create policy "Users can delete own shopping list items" on public.shopping_list_items
  for delete using (auth.uid() = user_id);

-- followed_creators --------------------------------------------------------------------

create table public.followed_creators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  platform text not null check (platform in ('youtube', 'tiktok')),
  platform_creator_id text not null,
  creator_name text not null,
  creator_handle text not null,
  avatar_url text,
  auto_import boolean not null default true,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, platform, platform_creator_id)
);

alter table public.followed_creators enable row level security;

create policy "Users can view own followed creators" on public.followed_creators
  for select using (auth.uid() = user_id);

create policy "Users can insert own followed creators" on public.followed_creators
  for insert with check (auth.uid() = user_id);

create policy "Users can update own followed creators" on public.followed_creators
  for update using (auth.uid() = user_id);

create policy "Users can delete own followed creators" on public.followed_creators
  for delete using (auth.uid() = user_id);
