import { describe, expect, it, vi } from 'vitest';
import { render, screen, userEvent } from '@/test/render';
import { ColorPicker } from './ColorPicker';
import { IconPicker } from './IconPicker';
import { MAX_ICON_RESULTS, searchIcons } from './iconSearch';

describe('searchIcons', () => {
  it('ranks exact, then prefix, then substring matches, and reads spaces as underscores', () => {
    const names = ['bag', 'shopping_bag', 'bag_check', 'storefront'];
    expect(searchIcons('bag', names)).toEqual(['bag', 'bag_check', 'shopping_bag']);
    expect(searchIcons('shopping bag', names)).toEqual(['shopping_bag']);
    expect(searchIcons('  ', names)).toEqual([]);
  });

  it('searches the whole font by default', () => {
    expect(searchIcons('support_agent')[0]).toBe('support_agent');
  });
});

describe('IconPicker', () => {
  const suggestions = ['rocket_launch', 'bolt'];

  it('shows suggestions plus the current pick, and picks from a search', async () => {
    const onChange = vi.fn();
    render(
      <IconPicker value="storefront" onChange={onChange} suggestions={suggestions} color="#000" />,
    );
    expect(screen.getAllByRole('option').map((o) => o.getAttribute('aria-label'))).toEqual([
      'storefront',
      'rocket_launch',
      'bolt',
    ]);
    expect(screen.getByRole('option', { name: 'storefront' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await userEvent.type(screen.getByLabelText('Search icons'), 'support agent');
    await userEvent.click(screen.getByRole('option', { name: 'support_agent' }));
    expect(onChange).toHaveBeenCalledWith('support_agent');
  });

  it('caps long result lists and says when nothing matches', async () => {
    render(<IconPicker value="" onChange={vi.fn()} suggestions={suggestions} color="#000" />);
    await userEvent.type(screen.getByLabelText('Search icons'), 'a');
    expect(screen.getAllByRole('option')).toHaveLength(MAX_ICON_RESULTS);
    expect(screen.getByText(/Keep typing/)).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Search icons'));
    await userEvent.type(screen.getByLabelText('Search icons'), 'zzzzqqq');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText(/No icons match/)).toBeInTheDocument();
  });
});

describe('ColorPicker', () => {
  it('shows a colour outside the palette as an extra, selected swatch', () => {
    render(<ColorPicker value="#229ED9" onChange={vi.fn()} colors={['#1976d2', '#7b1fa2']} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Select color #229ED9' })).toBeInTheDocument();
  });

  it('adds nothing for a palette colour', () => {
    render(<ColorPicker value="#1976D2" onChange={vi.fn()} colors={['#1976d2', '#7b1fa2']} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });
});
