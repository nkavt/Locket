import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeModeProvider } from './ThemeModeProvider';
import { useThemeMode } from './useThemeMode';

/** Fake `prefers-color-scheme` that tests can flip. */
function mockSystem(initialDark: boolean) {
  let dark = initialDark;
  const listeners = new Set<() => void>();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      get matches() {
        return dark;
      },
      addEventListener: (_: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    })),
  );
  return {
    set(next: boolean) {
      dark = next;
      act(() => listeners.forEach((cb) => cb()));
    },
  };
}

const render = () => renderHook(() => useThemeMode(), { wrapper: ThemeModeProvider });

describe('ThemeModeProvider', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('follows the system mode by default', () => {
    mockSystem(true);
    expect(render().result.current.mode).toBe('dark');
  });

  it('switches live when the system mode changes', () => {
    const system = mockSystem(false);
    const { result } = render();
    expect(result.current.mode).toBe('light');
    system.set(true);
    expect(result.current.mode).toBe('dark');
  });

  it('keeps a toggled choice over the system mode', () => {
    const system = mockSystem(false);
    const { result } = render();
    act(() => result.current.toggle());
    expect(result.current.mode).toBe('dark');
    expect(localStorage.getItem('locket-theme-v2')).toBe('dark');
    system.set(false);
    expect(result.current.mode).toBe('dark');
  });

  it('goes back to following the system when toggled to match it', () => {
    const system = mockSystem(false);
    const { result } = render();
    act(() => result.current.toggle());
    act(() => result.current.toggle());
    expect(result.current.mode).toBe('light');
    expect(localStorage.getItem('locket-theme-v2')).toBeNull();
    system.set(true);
    expect(result.current.mode).toBe('dark');
  });

  it('restores a stored choice', () => {
    mockSystem(false);
    localStorage.setItem('locket-theme-v2', 'dark');
    expect(render().result.current.mode).toBe('dark');
  });

  it('migrates a legacy dark choice but drops the legacy light default', () => {
    mockSystem(true);
    localStorage.setItem('locket-theme-v1', 'light');
    expect(render().result.current.mode).toBe('dark');
    expect(localStorage.getItem('locket-theme-v1')).toBeNull();

    mockSystem(false);
    localStorage.setItem('locket-theme-v1', 'dark');
    expect(render().result.current.mode).toBe('dark');
    expect(localStorage.getItem('locket-theme-v2')).toBe('dark');
  });

  it('falls back to light without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(render().result.current.mode).toBe('light');
  });

  it('throws outside the provider', () => {
    expect(() => renderHook(() => useThemeMode())).toThrow(/ThemeModeProvider/);
  });
});
