import { useContext, useEffect, useState } from 'react';
import { AppStateContext } from '@/state/AppStateContext';
import { useAttachmentScope } from './AttachmentScope';
import { ticketAttachments } from '@/data/attachments';

export type AttachmentUrl =
  { status: 'loading' } | { status: 'ready'; url: string } | { status: 'missing' };

/**
 * Resolve a saved attachment of the surrounding ticket (see `AttachmentScope`) to something
 * an <img> can show. Pass `known` for images that already have a local preview (not saved
 * yet) and the store is never asked.
 *
 * Only images the workspace lists are fetched, and the lookup is keyed on the image's size
 * too: a reference resolves as soon as its image is added, and a name reused by a new image
 * (after the old one was deleted) loads the new one.
 */
export function useAttachmentUrl(name: string, known?: string): AttachmentUrl {
  const store = useContext(AppStateContext);
  const ticketId = useAttachmentScope();
  const meta = ticketAttachments(store?.state.tickets.find((t) => t.id === ticketId)).find(
    (a) => a.name === name,
  );
  const key = meta ? `${ticketId}/${name}/${meta.size}` : null;
  const [resolved, setResolved] = useState<{ key: string; url: string | null } | null>(null);

  useEffect(() => {
    if (known || !store || !ticketId || !key) return;
    let live = true;
    void store.attachmentUrl(ticketId, name).then((url) => live && setResolved({ key, url }));
    return () => {
      live = false;
    };
    // The store object changes with every state update; the lookup only depends on the key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, known]);

  if (known) return { status: 'ready', url: known };
  if (!store || !ticketId || !key) return { status: 'missing' };
  if (!resolved || resolved.key !== key) return { status: 'loading' };
  return resolved.url ? { status: 'ready', url: resolved.url } : { status: 'missing' };
}
