import { describe, expect, it, vi } from 'vitest';
import { fireEvent, renderWithProviders, screen, userEvent, waitFor } from '@/test/render';
import { DescriptionEditor } from './DescriptionEditor';

const shown = { name: 'inline.png', mime: 'image/png', size: 3 };
const loose = { name: 'loose.png', mime: 'image/png', size: 3 };
const fromComment = { name: 'quoted.png', mime: 'image/png', size: 3 };

describe('DescriptionEditor attachments', () => {
  it('lists every image by name and only lets unused ones be deleted', async () => {
    const onRemove = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(
      <DescriptionEditor
        // The older attachment: form still counts as using the image.
        value="Intro\n\n![inline.png](attachment:inline.png)"
        onSave={vi.fn()}
        attachments={[shown, loose, fromComment]}
        commentBodies={['look: ![](quoted.png)']}
        onAttach={vi.fn()}
        onRemoveAttachment={onRemove}
      />,
    );
    await screen.findByRole('list', { name: 'Attachments' });
    // Shown inline and still listed, with its name, so it can be referenced elsewhere.
    expect(screen.getByRole('button', { name: 'View inline.png' })).toBeInTheDocument();
    expect(screen.getByText('loose.png')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Delete inline.png' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete quoted.png' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete loose.png' }));
    expect(onRemove).toHaveBeenCalledWith('loose.png');
  });

  it('inserts a thumbnail into the text at the end when no caret was placed', async () => {
    renderWithProviders(
      <DescriptionEditor
        value="Intro"
        onSave={vi.fn()}
        attachments={[loose]}
        onAttach={vi.fn()}
        onRemoveAttachment={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Show loose.png inline in text' }));
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue('Intro![](loose.png)');
    expect(screen.getByRole('button', { name: 'Delete loose.png' })).toBeDisabled();
  });

  it('writes a pasted image into the text and saves it to the ticket straight away', async () => {
    const onAttach = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(
      <DescriptionEditor
        value=""
        onSave={vi.fn()}
        attachments={[{ name: 'image.png', mime: 'image/png', size: 1 }]}
        onAttach={onAttach}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const box = screen.getByRole('textbox', { name: 'Description' });
    const file = new File([new Uint8Array([5])], 'image.png', { type: 'image/png' });
    fireEvent.paste(box, {
      clipboardData: { items: [{ kind: 'file', getAsFile: () => file }] },
    });
    await waitFor(() =>
      expect(onAttach).toHaveBeenCalledWith([
        expect.objectContaining({ name: 'image-2.png', mime: 'image/png' }),
      ]),
    );
    expect(box).toHaveValue('![](image-2.png)');
    expect(await screen.findByText('Image attached')).toBeInTheDocument();
  });

  it('takes a pasted image back out of the text when saving it fails', async () => {
    const onAttach = vi.fn().mockRejectedValue(new Error('disk full'));
    renderWithProviders(
      <DescriptionEditor value="Text" onSave={vi.fn()} attachments={[]} onAttach={onAttach} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const box = screen.getByRole('textbox', { name: 'Description' }) as HTMLTextAreaElement;
    box.setSelectionRange(4, 4);
    const file = new File([new Uint8Array([5])], 'p.png', { type: 'image/png' });
    fireEvent.paste(box, {
      clipboardData: { items: [{ kind: 'file', getAsFile: () => file }] },
    });
    expect(await screen.findByText('Could not save images: disk full')).toBeInTheDocument();
    expect(box).toHaveValue('Text');
  });
});
