import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TitleEditor } from './TitleEditor';

describe('TitleEditor', () => {
  it('saves a trimmed title on Enter', async () => {
    const onSave = vi.fn();
    render(<TitleEditor value="Old" onSave={onSave} />);
    await userEvent.click(screen.getByRole('heading', { name: 'Old' }));
    const input = screen.getByRole('textbox', { name: 'Ticket title' });
    await userEvent.clear(input);
    await userEvent.type(input, '  New title  {Enter}');
    expect(onSave).toHaveBeenCalledWith('New title');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('does not save an unchanged or empty title', async () => {
    const onSave = vi.fn();
    render(<TitleEditor value="Same" onSave={onSave} />);
    await userEvent.click(screen.getByRole('heading', { name: 'Same' }));
    await userEvent.keyboard('{Enter}');
    await userEvent.click(screen.getByRole('heading', { name: 'Same' }));
    await userEvent.clear(screen.getByRole('textbox'));
    await userEvent.keyboard('{Enter}');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('cancels on Escape', async () => {
    const onSave = vi.fn();
    render(<TitleEditor value="Keep" onSave={onSave} />);
    await userEvent.click(screen.getByRole('heading', { name: 'Keep' }));
    await userEvent.type(screen.getByRole('textbox'), 'zzz{Escape}');
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Keep' })).toBeInTheDocument();
  });
});
