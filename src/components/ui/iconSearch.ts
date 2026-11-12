import { MATERIAL_SYMBOL_NAMES } from '@/data/projectIcons';

/** How many matches to draw at once; typing more narrows it down. */
export const MAX_ICON_RESULTS = 60;

/** Names matching `query` ("shopping bag" finds shopping_bag): exact, then prefix, then anywhere. */
export function searchIcons(query: string, names: readonly string[] = MATERIAL_SYMBOL_NAMES) {
  const q = query
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (!q) return [];
  const exact: string[] = [];
  const prefix: string[] = [];
  const inside: string[] = [];
  for (const n of names) {
    if (n === q) exact.push(n);
    else if (n.startsWith(q)) prefix.push(n);
    else if (n.includes(q)) inside.push(n);
  }
  return [...exact, ...prefix, ...inside];
}
