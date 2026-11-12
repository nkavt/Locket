import { useRef, type RefObject } from 'react';
import { attachmentMarkdown, insertAtCursor } from './files';

/** Take an image's inline reference out of `text`, and nothing else. */
export const withoutReference = (text: string, name: string): string =>
  text.split(attachmentMarkdown(name)).join('');

/** Remember the scroll position of `el` and everything around it, to put back later. */
const keepScroll = (el: HTMLElement): (() => void) => {
  const saved: Array<[Element, number]> = [];
  for (let n: Element | null = el; n; n = n.parentElement) saved.push([n, n.scrollTop]);
  const doc = document.scrollingElement;
  if (doc) saved.push([doc, doc.scrollTop]);
  return () => {
    for (const [n, top] of saved) if (n.scrollTop !== top) n.scrollTop = top;
  };
};

/**
 * Write image references into a textarea.
 *
 * - `insert` (a thumbnail's button) goes where the user last put the caret, or at the end
 *   if they never placed one, and leaves the scroll position alone so the view does not jump.
 * - `insertAtCaret` (a paste) goes exactly where the caret is right now.
 */
export function useInlineInsert(
  setText: (value: string) => void,
  textareaRef: RefObject<HTMLTextAreaElement | null>,
) {
  const placed = useRef(false);
  const mark = () => {
    placed.current = true;
  };

  const write = (names: string[], atCaret: boolean, keepView: boolean) => {
    const el = textareaRef.current;
    if (!el || !names.length) return;
    const restore = keepView ? keepScroll(el) : () => {};
    // Read the live DOM value: a paste resolves after the file is read, when the
    // text captured at render time may already be stale.
    const next = insertAtCursor(
      atCaret ? el : null,
      el.value,
      names.map(attachmentMarkdown).join('\n'),
    );
    setText(next.value);
    placed.current = true;
    requestAnimationFrame(() => {
      el.focus({ preventScroll: true });
      el.setSelectionRange(next.caret, next.caret);
      restore();
    });
  };

  return {
    insert: (name: string) => write([name], placed.current, true),
    insertAtCaret: (names: string[]) => write(names, true, false),
    /** Spread onto the textarea so caret placement is remembered. */
    caretProps: { onMouseUp: mark, onKeyUp: mark },
    forget: () => {
      placed.current = false;
    },
  };
}
