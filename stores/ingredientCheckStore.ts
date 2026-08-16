import { create } from 'zustand';

interface IngredientCheckState {
  checkedByRecipe: Record<string, Record<number, boolean>>;
  toggle: (recipeId: string, index: number) => void;
  isChecked: (recipeId: string, index: number) => boolean;
  clear: (recipeId: string) => void;
}

/**
 * Which ingredient checkboxes are ticked, per recipe. Shared between the
 * recipe detail screen and Cook Mode so ticking an ingredient in one place
 * carries over to the other.
 */
export const useIngredientCheckStore = create<IngredientCheckState>((set, get) => ({
  checkedByRecipe: {},
  toggle: (recipeId, index) =>
    set((state) => {
      const current = state.checkedByRecipe[recipeId] ?? {};
      return {
        checkedByRecipe: {
          ...state.checkedByRecipe,
          [recipeId]: { ...current, [index]: !current[index] },
        },
      };
    }),
  isChecked: (recipeId, index) => !!get().checkedByRecipe[recipeId]?.[index],
  clear: (recipeId) =>
    set((state) => {
      const next = { ...state.checkedByRecipe };
      delete next[recipeId];
      return { checkedByRecipe: next };
    }),
}));
