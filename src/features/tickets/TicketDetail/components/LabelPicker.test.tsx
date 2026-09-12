import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LabelPicker } from './LabelPicker';

describe('LabelPicker', () => {
  it('removes a label from its chip', async () => {
    const onChange = vi.fn();
    render(<LabelPicker value={['bug', 'docs']} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove label bug' }));
    expect(onChange).toHaveBeenCalledWith(['docs']);
  });

  it('adds and toggles labels from the menu', async () => {
    const onChange = vi.fn();
    render(<LabelPicker value={['bug']} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /Add label/ }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /feature/ }));
    expect(onChange).toHaveBeenLastCalledWith(['bug', 'feature']);
    await userEvent.click(screen.getByRole('menuitem', { name: /bug/ }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
});
