import { describe, expect, it } from 'vitest';
import { AboutCard } from './AboutCard';
import { APP_VERSION } from '@/data/constants';
import { installMockLocket } from '@/test/mockLocket';
import { renderWithProviders, screen, userEvent } from '@/test/render';

describe('AboutCard', () => {
  it('shows the real OS and architecture from the main process', async () => {
    installMockLocket();
    renderWithProviders(<AboutCard />);

    expect(await screen.findByText('macOS 26.7 · arm64')).toBeInTheDocument();
    expect(screen.getByText('Electron 45.2.3')).toBeInTheDocument();
    expect(screen.getByText('22.20.0')).toBeInTheDocument();
    expect(screen.queryByText(/MacIntel/)).not.toBeInTheDocument();
  });

  it('copies all details as one line for bug reports', async () => {
    installMockLocket();
    const user = userEvent.setup();
    renderWithProviders(<AboutCard />);

    await user.click(await screen.findByRole('button', { name: 'Copy details' }));
    expect(await navigator.clipboard.readText()).toBe(
      `Locket ${APP_VERSION} · Electron 45.2.3 · Node 22.20.0 · macOS 26.7 arm64`,
    );
    expect(await screen.findByText('Details copied')).toBeInTheDocument();
  });

  it('falls back to browser / unknown without the Electron bridge', () => {
    renderWithProviders(<AboutCard />);

    expect(screen.getByText('browser')).toBeInTheDocument();
    expect(screen.getByText('unknown')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy details' })).not.toBeInTheDocument();
  });
});
