import { useEffect, useState } from 'react';

export const DEFAULT_USER = 'You';

let cached: string | null = null;

export function useCurrentUser(): string {
  const [name, setName] = useState(cached ?? DEFAULT_USER);

  useEffect(() => {
    if (cached !== null) return;
    if (typeof window === 'undefined' || !window.locket?.user) return;
    void window.locket.user.get().then((n) => {
      if (n) {
        cached = n;
        setName(n);
      }
    });
  }, []);

  return name;
}
