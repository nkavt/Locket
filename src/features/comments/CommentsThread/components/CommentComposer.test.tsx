import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CommentComposer } from './CommentComposer';

describe('CommentComposer', () => {
  it('shows the toolbar on focus and submits the text exactly as typed', async () => {
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
    expect(onSubmit).toHaveBeenCalledWith('  hello  ', []);
    expect(box).toHaveValue('');
  });

  it('inserts markdown snippets from the toolbar', async () => {
    render(<CommentComposer onSubmit={vi.fn()} />);
    const box = screen.getByRole('textbox', { name: 'New comment' });
    await userEvent.click(box);
    await userEvent.click(screen.getByRole('button', { name: 'Bold' }));
    expect(box).toHaveValue('**bold**');
  });

  it('writes a pasted image into the text at the caret under a tidy name', async () => {
    const onSubmit = vi.fn();
    render(<CommentComposer onSubmit={onSubmit} takenNames={new Set(['my-shot.png'])} />);
    const box = screen.getByRole('textbox', { name: 'New comment' }) as HTMLTextAreaElement;
    await userEvent.type(box, 'before after');
    box.setSelectionRange(6, 7);
    const file = new File([new Uint8Array([1, 2, 3])], 'My Shot.png', { type: 'image/png' });
    fireEvent.paste(box, {
      clipboardData: { items: [{ kind: 'file', getAsFile: () => file }] },
    });
    // The ticket already has my-shot.png, so this one is numbered.
    expect(await screen.findByRole('button', { name: 'View my-shot-2.png' })).toBeInTheDocument();
    expect(screen.getByText('my-shot-2.png')).toBeInTheDocument();
    expect(box.value).toBe('before![](my-shot-2.png)after');

    await userEvent.click(screen.getByRole('button', { name: 'Comment' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.stringContaining('![](my-shot-2.png)'), [
      expect.objectContaining({ name: 'my-shot-2.png', mime: 'image/png' }),
    ]);
    expect(onSubmit.mock.calls[0][1][0]).not.toHaveProperty('previewUrl');
  });

  it('keeps a picked image as a thumbnail that can be shown inline or deleted', async () => {
    const onSubmit = vi.fn();
    render(<CommentComposer onSubmit={onSubmit} />);
    const box = screen.getByRole('textbox', { name: 'New comment' }) as HTMLTextAreaElement;
    await userEvent.type(box, 'see');
    const file = new File([new Uint8Array([1])], 'a.png', { type: 'image/png' });
    fireEvent.drop(box.parentElement!, {
      dataTransfer: { types: ['Files'], files: [file] },
    });
    await screen.findByRole('button', { name: 'View a.png' });
    expect(box).toHaveValue('see');

    await userEvent.click(screen.getByRole('button', { name: 'Show a.png inline in text' }));
    expect(box.value).toBe('see![](a.png)');
    // In use, so it cannot be deleted until the text lets go of it.
    expect(screen.getByRole('button', { name: 'Delete a.png' })).toBeDisabled();

    await userEvent.clear(box);
    await userEvent.type(box, 'see');
    await userEvent.click(screen.getByRole('button', { name: 'Delete a.png' }));
    expect(screen.queryByRole('button', { name: 'View a.png' })).not.toBeInTheDocument();
  });

  it('keeps the draft when posting fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('nope'));
    render(<CommentComposer onSubmit={onSubmit} />);
    const box = screen.getByRole('textbox', { name: 'New comment' });
    await userEvent.type(box, 'draft');
    await userEvent.click(screen.getByRole('button', { name: 'Comment' }));
    expect(box).toHaveValue('draft');
  });

  it('cancel clears the draft', async () => {
    render(<CommentComposer onSubmit={vi.fn()} />);
    const box = screen.getByRole('textbox', { name: 'New comment' });
    await userEvent.type(box, 'draft');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(box).toHaveValue('');
  });
});
