import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/**
 * Tracks whether a scroll container has more content above and/or below what is visible.
 * Attach `ref` and `onScroll` to the container; pass anything that changes its content height
 * (e.g. the number of rows) as `contentKey` so the edges are re-measured.
 */
export function useScrollEdges<T extends HTMLElement>(contentKey: unknown) {
  const ref = useRef<T>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const top = el.scrollTop > 0;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    setEdges((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
  }, []);

  useLayoutEffect(() => {
    measure();
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, contentKey]);

  return { ref, onScroll: measure, ...edges };
}

const FADE = 16;

/** CSS mask that fades the container's top and/or bottom edge when it can scroll that way. */
export const scrollFadeMask = ({ top, bottom }: { top: boolean; bottom: boolean }): string =>
  top || bottom
    ? `linear-gradient(to bottom, transparent 0, #000 ${top ? FADE : 0}px, #000 calc(100% - ${bottom ? FADE : 0}px), transparent 100%)`
    : 'none';
