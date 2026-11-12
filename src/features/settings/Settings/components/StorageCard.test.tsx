import { describe, expect, it, vi } from 'vitest';
import { StorageCard } from './StorageCard';
import { installMockLocket } from '@/test/mockLocket';
import { renderWithProviders, screen, userEvent } from '@/test/render';

describe('StorageCard images', () => {
  it('measures only when asked, then offers to clean up leftovers', async () => {
    const mock = installMockLocket();
    const usage = vi.spyOn(mock.bridge.attachments, 'usage').mockResolvedValue({
      files: 3,
      bytes: 2048,
      unusedFiles: 1,
      unusedBytes: 1024,
    });
    const cleanUp = vi
      .spyOn(mock.bridge.attachments, 'cleanUp')
      .mockResolvedValue({ removedFiles: 1, freedBytes: 1024 });
    renderWithProviders(<StorageCard />);

    // Opening Settings measures nothing.
    const calculate = screen.getByRole('button', { name: 'Calculate' });
    expect(usage).not.toHaveBeenCalled();

    await userEvent.click(calculate);
    expect(await screen.findByText(/3 images/)).toBeInTheDocument();
    expect(screen.getByText(/1 leftover from deleted tickets or comments/)).toBeInTheDocument();

    usage.mockResolvedValue({ files: 2, bytes: 1024, unusedFiles: 0, unusedBytes: 0 });
    await userEvent.click(screen.getByRole('button', { name: 'Clean up' }));
    expect(cleanUp).toHaveBeenCalled();
    expect(await screen.findByText(/no leftovers/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clean up' })).not.toBeInTheDocument();
  });
});
