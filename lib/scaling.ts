import type { Ingredient } from '@/lib/database.types';

/**
 * Rounds a scaled quantity to a sensible precision: eighths below 2 (common
 * for tsp/tbsp fractions), halves below 10, whole numbers above that.
 */
export function roundQuantity(value: number): number {
  if (value <= 0) return 0;
  if (value < 2) return Math.round(value * 8) / 8;
  if (value < 10) return Math.round(value * 2) / 2;
  return Math.round(value);
}

export function scaleIngredients(
  ingredients: Ingredient[],
  originalServings: number,
  targetServings: number
): Ingredient[] {
  if (originalServings <= 0 || targetServings === originalServings) return ingredients;
  const factor = targetServings / originalServings;

  return ingredients.map((ingredient) =>
    ingredient.quantity == null
      ? ingredient
      : { ...ingredient, quantity: roundQuantity(ingredient.quantity * factor) }
  );
}

export function formatQuantity(quantity: number): string {
  const whole = Math.floor(quantity);
  const fraction = quantity - whole;

  const fractionLabels: Record<string, string> = {
    '0.125': '⅛',
    '0.25': '¼',
    '0.333': '⅓',
    '0.375': '⅜',
    '0.5': '½',
    '0.625': '⅝',
    '0.667': '⅔',
    '0.75': '¾',
    '0.875': '⅞',
  };

  const fractionKey = fraction.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  const fractionLabel = fractionLabels[fractionKey] ?? fractionLabels[fraction.toFixed(3)];

  if (!fractionLabel) return String(Math.round(quantity * 100) / 100);
  return whole > 0 ? `${whole}${fractionLabel}` : fractionLabel;
}
