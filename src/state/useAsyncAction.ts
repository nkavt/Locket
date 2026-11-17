import { useCallback, useState } from 'react';
import { useSnackbar } from './useSnackbar';

export interface AsyncActionOptions {
  /** Shown as a success snackbar once the work finishes. */
  success?: string;
  /** Turns the error message into the snackbar text; the raw message is shown otherwise. */
  error?: (message: string) => string;
}

/**
 * Run async work from a click: `busy` is true meanwhile, failures show as an error snackbar
 * and an optional success message follows a good run. `run` resolves to whether it worked,
 * so a caller can, say, close its dialog only on success.
 *
 * Use your own try/catch when a failure needs more than a message (undoing a draft, etc.).
 */
export function useAsyncAction() {
  const snack = useSnackbar();
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (work: () => Promise<unknown>, opts: AsyncActionOptions = {}): Promise<boolean> => {
      setBusy(true);
      try {
        await work();
        if (opts.success) snack(opts.success, { severity: 'success' });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        snack(opts.error ? opts.error(message) : message, { severity: 'error' });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [snack],
  );

  return { run, busy };
}
