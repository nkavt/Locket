import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CommentComposer } from './CommentComposer';

describe('CommentComposer', () => {
  it('shows the toolbar on focus and submits trimmed text', async () => {
    const onSubmit = vi.fn();
    render(<CommentComposer onSubmit={onSubmit} />);
    expect(screen.queryByRole('button', { name: 'Comment' })).not.toBeInTheDocument();

    const box = screen.getByRole('textbox', { name: 'New comment' });
    await userEvent.click(box);
    const submit = screen.getByRole('button', { name: 'Comment' });
    expect(submit).toBeDisabled();

    await userEvent.type(box, '  hello  ');
    expect(submit).toBeEnabled();
    await userEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledWith('hello');
    expect(box).toHaveValue('');
  });

  it('inserts markdown snippets from the toolbar', async () => {
    render(<CommentComposer onSubmit={vi.fn()} />);
    const box = screen.getByRole('textbox', { name: 'New comment' });
    await userEvent.click(box);
    await userEvent.click(screen.getByRole('button', { name: 'Bold' }));
    expect(box).toHaveValue('**bold**');
  });

  it('cancel clears the draft', async () => {
    render(<CommentComposer onSubmit={vi.fn()} />);
    const box = screen.getByRole('textbox', { name: 'New comment' });
    await userEvent.type(box, 'draft');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(box).toHaveValue('');
  });
});
