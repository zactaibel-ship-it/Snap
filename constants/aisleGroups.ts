/** Display groups the shopping list is organised into, in aisle-walk order. */
export const AISLE_GROUPS = [
  'Produce',
  'Meat & Fish',
  'Dairy',
  'Bakery',
  'Tinned & Dry',
  'Frozen',
  'Condiments',
  'Other',
] as const;

export type AisleGroup = (typeof AISLE_GROUPS)[number];

const AISLE_TO_GROUP: Record<string, AisleGroup> = {
  produce: 'Produce',
  meat: 'Meat & Fish',
  dairy: 'Dairy',
  bakery: 'Bakery',
  tinned: 'Tinned & Dry',
  'dry-goods': 'Tinned & Dry',
  frozen: 'Frozen',
  condiments: 'Condiments',
  alcohol: 'Other',
  other: 'Other',
};

/** The internal aisle code an item is saved with when a user manually picks a display group. */
const GROUP_TO_AISLE: Record<AisleGroup, string> = {
  Produce: 'produce',
  'Meat & Fish': 'meat',
  Dairy: 'dairy',
  Bakery: 'bakery',
  'Tinned & Dry': 'dry-goods',
  Frozen: 'frozen',
  Condiments: 'condiments',
  Other: 'other',
};

export function getAisleGroup(aisle: string | null): AisleGroup {
  if (!aisle) return 'Other';
  return AISLE_TO_GROUP[aisle] ?? 'Other';
}

export function getAisleForGroup(group: AisleGroup): string {
  return GROUP_TO_AISLE[group];
}
