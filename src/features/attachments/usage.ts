import type { GridItem } from './AttachmentGrid';
import { referencedNames } from './files';

/**
 * Where a ticket image is shown inline: in the description, in a comment, or nowhere.
 * Names are unique per ticket, so any image can be shown from any of them, and an image
 * in use cannot be deleted until the text lets go of it.
 */
export function imageUsage(
  description: string,
  commentBodies: string[],
): (name: string) => GridItem['usedIn'] {
  const inDescription = referencedNames(description);
  const inComments = referencedNames(...commentBodies);
  return (name) =>
    inDescription.has(name) ? 'description' : inComments.has(name) ? 'comment' : undefined;
}
