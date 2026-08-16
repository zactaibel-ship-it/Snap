/**
 * Seed list for the Discover tab's "Suggested" section. Most entries pin a
 * verified YouTube channel ID; a couple use an @handle instead where a
 * channel ID couldn't be confidently verified — search-creators resolves
 * handles to channels via the Data API's forHandle lookup, so either form
 * works the same way at runtime.
 */
export interface SuggestedCreator {
  name: string;
  channelRef: string;
}

export const SUGGESTED_CREATORS: SuggestedCreator[] = [
  { name: 'Jamie Oliver', channelRef: 'UCpSgg_ECBj25s9moCDfSTsA' },
  { name: 'Ottolenghi', channelRef: 'UCcGwOXXxu6XDGCx_LDE1O4A' },
  { name: 'Nigella Lawson', channelRef: 'UC7jM43otyf2_Ye_DBrQYKfg' },
  { name: 'SortedFood', channelRef: 'UCfyehHM_eo4g5JUyWmms2LA' },
  { name: 'Joshua Weissman', channelRef: 'UChBEbMKI1eCcejTtmI32UEw' },
  { name: 'Gennaro Contaldo', channelRef: 'gennarocontaldo' },
  { name: 'Binging with Babish', channelRef: 'UCJHA_jMfCvEnv-3kRjTCQXw' },
  { name: 'Mob Kitchen', channelRef: 'UCZh_x46-uGGM7PN4Nrq1-bQ' },
];
