import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SnackbarContext } from './SnackbarContext';
import { useAsyncAction } from './useAsyncAction';

const setup = () => {
  const snack = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SnackbarContext.Provider value={snack}>{children}</SnackbarContext.Provider>
  );
  const { result } = renderHook(() => useAsyncAction(), { wrapper });
  return { snack, result };
};

describe('useAsyncAction', () => {
  it('is busy while the work runs, then shows the success message', async () => {
    const { snack, result } = setup();
    let finish!: () => void;
    let done!: Promise<boolean>;
    act(() => {
      done = result.current.run(() => new Promise<void>((r) => (finish = r)), {
        success: 'Saved',
      });
    });
    expect(result.current.busy).toBe(true);

    await act(async () => {
      finish();
      expect(await done).toBe(true);
    });
    expect(result.current.busy).toBe(false);
    expect(snack).toHaveBeenCalledWith('Saved', { severity: 'success' });
  });

  it('stays quiet on success without a message', async () => {
    const { snack, result } = setup();
    await act(async () => {
      expect(await result.current.run(async () => {})).toBe(true);
    });
    expect(snack).not.toHaveBeenCalled();
  });

  it('shows the error message and resolves to false when the work fails', async () => {
    const { snack, result } = setup();
    await act(async () => {
      expect(await result.current.run(() => Promise.reject(new Error('Disk full')))).toBe(false);
    });
    expect(result.current.busy).toBe(false);
    expect(snack).toHaveBeenCalledWith('Disk full', { severity: 'error' });
  });

  it('lets the caller word the error', async () => {
    const { snack, result } = setup();
    await act(async () => {
      await result.current.run(() => Promise.reject(new Error('port in use')), {
        success: 'Started',
        error: (m) => `Could not start: ${m}`,
      });
    });
    expect(snack).toHaveBeenCalledTimes(1);
    expect(snack).toHaveBeenCalledWith('Could not start: port in use', { severity: 'error' });
  });

  it('handles non-Error rejections', async () => {
    const { snack, result } = setup();
    await act(async () => {
      await result.current.run(() => Promise.reject('nope'));
    });
    expect(snack).toHaveBeenCalledWith('nope', { severity: 'error' });
  });
});
