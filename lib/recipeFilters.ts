import type { Recipe, VideoPlatform } from '@/lib/database.types';

export type CookTimeFilter = 'all' | 'under15' | 'under30' | 'under60';
export type SortOption = 'newest' | 'quickest' | 'alphabetical';
export type PlatformFilter = VideoPlatform | 'all';

export interface RecipeFilters {
  platform: PlatformFilter;
  dietary: string[];
  cookTime: CookTimeFilter;
  sort: SortOption;
}

export const DEFAULT_FILTERS: RecipeFilters = {
  platform: 'all',
  dietary: [],
  cookTime: 'all',
  sort: 'newest',
};

const COOK_TIME_MAX_MINUTES: Record<Exclude<CookTimeFilter, 'all'>, number> = {
  under15: 15,
  under30: 30,
  under60: 60,
};

function matchesSearch(recipe: Recipe, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  if (recipe.title.toLowerCase().includes(needle)) return true;
  if (recipe.creator_name?.toLowerCase().includes(needle)) return true;
  if (recipe.dietary_tags.some((tag) => tag.toLowerCase().includes(needle))) return true;
  if (recipe.ingredients.some((ingredient) => ingredient.name.toLowerCase().includes(needle))) return true;
  return false;
}

function matchesFilters(recipe: Recipe, filters: RecipeFilters): boolean {
  if (filters.platform !== 'all' && recipe.video_platform !== filters.platform) return false;

  if (filters.dietary.length > 0 && !filters.dietary.every((tag) => recipe.dietary_tags.includes(tag))) {
    return false;
  }

  if (filters.cookTime !== 'all') {
    const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);
    if (totalTime === 0 || totalTime > COOK_TIME_MAX_MINUTES[filters.cookTime]) return false;
  }

  return true;
}

function sortRecipes(recipes: Recipe[], sort: SortOption): Recipe[] {
  const sorted = [...recipes];

  switch (sort) {
    case 'quickest':
      return sorted.sort((a, b) => {
        const aTime = (a.prep_time_minutes ?? 0) + (a.cook_time_minutes ?? 0) || Infinity;
        const bTime = (b.prep_time_minutes ?? 0) + (b.cook_time_minutes ?? 0) || Infinity;
        return aTime - bTime;
      });
    case 'alphabetical':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'newest':
    default:
      return sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

export function applyRecipeFiltersAndSearch(recipes: Recipe[], search: string, filters: RecipeFilters): Recipe[] {
  const filtered = recipes.filter((recipe) => matchesSearch(recipe, search) && matchesFilters(recipe, filters));
  return sortRecipes(filtered, filters.sort);
}

export function countActiveFilters(filters: RecipeFilters): number {
  let count = 0;
  if (filters.platform !== 'all') count += 1;
  count += filters.dietary.length;
  if (filters.cookTime !== 'all') count += 1;
  if (filters.sort !== 'newest') count += 1;
  return count;
}
