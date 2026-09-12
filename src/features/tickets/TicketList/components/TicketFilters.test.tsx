import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TicketFilters } from './TicketFilters';
import { EMPTY_FILTERS } from '../../utils';

describe('TicketFilters', () => {
  it('emits search changes with the other filters intact', async () => {
    const onChange = vi.fn();
    render(<TicketFilters value={{ ...EMPTY_FILTERS, status: 'done' }} onChange={onChange} />);
    await userEvent.type(screen.getByPlaceholderText(/Search tickets/), 'x');
    expect(onChange).toHaveBeenCalledWith({ search: 'x', status: 'done', priority: 'all' });
  });

  it('shows translated defaults for the selects', () => {
    render(<TicketFilters value={EMPTY_FILTERS} onChange={vi.fn()} />);
    expect(screen.getByText('All statuses')).toBeInTheDocument();
    expect(screen.getByText('All priorities')).toBeInTheDocument();
  });
});
