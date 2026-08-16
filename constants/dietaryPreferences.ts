import type { SupermarketPreference } from '@/lib/database.types';

// User-level cooking preferences captured during onboarding (and editable
// later from Profile) — distinct from constants/recipeTags.ts, which labels
// individual extracted recipes.
export const DIETARY_PREFERENCE_OPTIONS = [
  { value: 'omnivore', label: 'Omnivore' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten-free', label: 'Gluten-free' },
  { value: 'dairy-free', label: 'Dairy-free' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
  { value: 'low-carb', label: 'Low-carb' },
  { value: 'high-protein', label: 'High-protein' },
] as const;

export const SUPERMARKET_OPTIONS: { label: string; value: SupermarketPreference }[] = [
  { label: 'Tesco', value: 'tesco' },
  { label: "Sainsbury's", value: 'sainsburys' },
  { label: 'Both', value: 'both' },
];
