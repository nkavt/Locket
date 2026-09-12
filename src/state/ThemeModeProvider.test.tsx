import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeModeProvider } from './ThemeModeProvider';
import { useThemeMode } from './useThemeMode';

describe('ThemeModeProvider', () => {
  it('defaults to light, toggles, and persists', () => {
    const { result } = renderHook(() => useThemeMode(), { wrapper: ThemeModeProvider });
    expect(result.current.mode).toBe('light');
    act(() => result.current.toggle());
    expect(result.current.mode).toBe('dark');
    expect(localStorage.getItem('locket-theme-v1')).toBe('dark');
  });

  it('restores the stored mode', () => {
    localStorage.setItem('locket-theme-v1', 'dark');
    const { result } = renderHook(() => useThemeMode(), { wrapper: ThemeModeProvider });
    expect(result.current.mode).toBe('dark');
  });

  it('throws outside the provider', () => {
    expect(() => renderHook(() => useThemeMode())).toThrow(/ThemeModeProvider/);
  });
});
