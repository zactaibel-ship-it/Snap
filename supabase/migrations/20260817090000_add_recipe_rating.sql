-- Adds a post-cook star rating (1-5), set from the Cook Mode completion screen.

alter table public.recipes
  add column rating int check (rating between 1 and 5);
