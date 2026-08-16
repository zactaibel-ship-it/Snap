import type { ShoppingListItem } from '@/lib/database.types';

export type Retailer = 'tesco' | 'sainsburys';

// TODO: replace with a real Awin-issued tracking id once the Tesco affiliate
// application is approved — this is a placeholder so the link shape is ready.
const TESCO_AFFILIATE_TAG = 'snip';

export function buildTescoSearchUrl(item: ShoppingListItem): string {
  const query = [item.ingredient_name, item.quantity, item.unit].filter(Boolean).join(' ');
  return `https://www.tesco.com/groceries/en-GB/search?query=${encodeURIComponent(query)}&affil=${TESCO_AFFILIATE_TAG}`;
}

export function buildSainsburysSearchUrl(item: ShoppingListItem): string {
  return `https://www.sainsburys.co.uk/gol-ui/SearchResults/${encodeURIComponent(item.ingredient_name)}`;
}

export function buildRetailerSearchUrl(retailer: Retailer, item: ShoppingListItem): string {
  return retailer === 'tesco' ? buildTescoSearchUrl(item) : buildSainsburysSearchUrl(item);
}

export const RETAILER_LABELS: Record<Retailer, string> = {
  tesco: 'Tesco',
  sainsburys: "Sainsbury's",
};
