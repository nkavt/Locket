import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Markdown } from './Markdown';

const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

describe('Markdown images', () => {
  it('renders data: images inline', () => {
    render(<Markdown source={`![pixel](${PIXEL})`} />);
    expect(screen.getByRole('img', { name: 'pixel' })).toHaveAttribute('src', PIXEL);
  });

  it('turns remote images into links instead of loading them', () => {
    render(<Markdown source="![Diagram](https://example.com/d.png)" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Diagram' })).toHaveAttribute(
      'href',
      'https://example.com/d.png',
    );
  });

  it('falls back to the URL when there is no alt text', () => {
    render(<Markdown source="![](https://example.com/d.png)" />);
    expect(screen.getByRole('link', { name: 'https://example.com/d.png' })).toBeInTheDocument();
  });

  it('does not render relative or file images either', () => {
    render(<Markdown source="![local](file:///tmp/x.png)" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('does not render non-image data: sources', () => {
    render(<Markdown source="![page](data:text/html;base64,PHNjcmlwdD4=)" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
