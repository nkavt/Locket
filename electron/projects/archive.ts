/*
 * Archiving rules shared by the main process and the renderer (like icons.ts), so they must
 * stay free of Node and DOM APIs.
 *
 * A project is archived when `archivedAt` holds the ISO time it was archived; `null` (or, in
 * payloads saved before archiving existed, a missing field) means active.
 */

interface Archivable {
  name: string;
  archivedAt?: string | null;
}

export const isArchived = (p: Pick<Archivable, 'archivedAt'>): boolean => !!p.archivedAt;

/**
 * The `archivedAt` a project gets from an `archived` flag in a patch. Archiving an already
 * archived project keeps its original time, so the Archived section's order doesn't jump.
 */
export const nextArchivedAt = (
  current: Pick<Archivable, 'archivedAt'>,
  archived: boolean,
  now: string,
): string | null => (archived ? (current.archivedAt ?? now) : null);

/** Why a ticket can't be created in an archived project. */
export const archivedProjectMessage = (p: Pick<Archivable, 'name'>): string =>
  `Project "${p.name}" is archived. Unarchive it first.`;

/** Archived projects, most recently archived first. */
export const byArchivedAtDesc = <T extends Pick<Archivable, 'archivedAt'>>(a: T, b: T): number =>
  (b.archivedAt ?? '').localeCompare(a.archivedAt ?? '');
