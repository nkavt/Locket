import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TruncatedText } from './TruncatedText';

// jsdom has no layout, so fake the widths that tell whether the text is cut.
const setWidths = (scrollWidth: number, clientWidth: number) => {
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(scrollWidth);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(clientWidth);
};

describe('TruncatedText', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows the full text on hover when it is cut', async () => {
    setWidths(300, 120);
    render(<TruncatedText>Customer Support Inbox Improvements</TruncatedText>);
    await userEvent.hover(screen.getByText('Customer Support Inbox Improvements'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Customer Support Inbox Improvements',
    );
  });

  it('shows no tooltip when the text fits', async () => {
    setWidths(60, 120);
    render(<TruncatedText>Docs</TruncatedText>);
    await userEvent.hover(screen.getByText('Docs'));
    await new Promise((r) => setTimeout(r, 200));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
