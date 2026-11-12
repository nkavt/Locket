import { useEffect, useRef, useState, type RefObject } from 'react';
import type { GridItem } from './AttachmentGrid';
import { referencedNames, releasePreview, toNewAttachment, type PendingAttachment } from './files';
import { useImageInput } from './useImageInput';
import { useInlineInsert } from './useInlineInsert';

/**
 * Images picked in an editor before the ticket or comment is saved. A pasted image is
 * written into the text at the caret; picked or dropped ones stay as attachments until
 * the user inserts them. `taken` are names already used on the ticket.
 */
export function usePendingAttachments(
  text: string,
  setText: (value: string) => void,
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  taken: Set<string> = new Set(),
) {
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const { insert, insertAtCaret, caretProps, forget } = useInlineInsert(setText, textareaRef);
  const input = useImageInput(
    (images, source) => {
      setPending((list) => [...list, ...images]);
      if (source === 'paste') insertAtCaret(images.map((a) => a.name));
    },
    () => new Set([...taken, ...pending.map((a) => a.name)]),
  );

  // Free every preview when the editor goes away.
  const latest = useRef(pending);
  useEffect(() => {
    latest.current = pending;
  }, [pending]);
  useEffect(() => () => latest.current.forEach(releasePreview), []);

  const inText = referencedNames(text);

  /** Only images the text does not use can be removed (the grid disables the rest). */
  const remove = (item: GridItem) => {
    if (inText.has(item.name)) return;
    setPending((list) => {
      list.filter((a) => a.name === item.name).forEach(releasePreview);
      return list.filter((a) => a.name !== item.name);
    });
  };

  /** Forget everything without saving. */
  const reset = () => {
    pending.forEach(releasePreview);
    setPending([]);
    forget();
  };

  return {
    ...input,
    pending,
    /** Spread onto <AttachmentGrid>: every pending image, with insert and delete. */
    grid: {
      items: pending.map((a): GridItem => ({
        name: a.name,
        url: a.previewUrl,
        usedIn: inText.has(a.name) ? 'text' : undefined,
      })),
      onInsert: (item: GridItem) => insert(item.name),
      onRemove: remove,
    },
    caretProps,
    reset,
    /** What to send to the backend. */
    toSave: () => pending.map(toNewAttachment),
  };
}
