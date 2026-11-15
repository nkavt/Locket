import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AttachmentScope } from '@/features/attachments/AttachmentScope';
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

  it('treats a bare file name on a ticket as one of its images, YouTrack style', () => {
    render(
      <AttachmentScope value="t-1">
        <Markdown source="![](login-screen.png)" />
      </AttachmentScope>,
    );
    // No store in this test, so the image resolves as missing rather than becoming a link.
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText(/login-screen\.png/)).toBeInTheDocument();
  });

  it('leaves a bare file name as a link outside a ticket', () => {
    render(<Markdown source="![](login-screen.png)" />);
    expect(screen.getByRole('link', { name: 'login-screen.png' })).toBeInTheDocument();
  });
});

const fence = (lang: string, body: string) => '```' + lang + '\n' + body + '\n```';

describe('Markdown code highlighting', () => {
  const blockOf = (container: HTMLElement) => container.querySelector('pre code')!;
  const labelOf = (container: HTMLElement) =>
    container.querySelector('.code-label')?.textContent ?? null;

  it.each([
    ['json', '{"id": 1, "done": false}', 'hljs-attr'],
    ['ts', 'const x: number = 1;', 'hljs-keyword'],
    ['bash', 'npm install # deps', 'hljs-comment'],
    ['yml', 'name: locket\nenabled: true', 'hljs-attr'],
    ['diff', '-old\n+new', 'hljs-addition'],
  ])('highlights a %s fence and labels it', (lang, body, token) => {
    const { container } = render(<Markdown source={fence(lang, body)} />);
    expect(blockOf(container).querySelector(`.${token}`)).not.toBeNull();
    expect(labelOf(container)).toBe(lang);
  });

  it('detects a confident untagged block and marks the label as a guess', () => {
    const json = '{\n  "name": "locket",\n  "private": true,\n  "version": "0.2.1"\n}';
    const { container } = render(<Markdown source={fence('', json)} />);
    expect(blockOf(container).querySelector('.hljs-attr')).not.toBeNull();
    expect(labelOf(container)).toBe('json · auto');
  });

  it('detects untagged TypeScript', () => {
    const ts = 'export function add(a: number, b: number): number {\n  // sum\n  return a + b;\n}';
    const { container } = render(<Markdown source={fence('', ts)} />);
    expect(blockOf(container).querySelector('.hljs-keyword')).not.toBeNull();
    expect(labelOf(container)).toBe('typescript · auto');
  });

  const log = Array.from(
    { length: 500 },
    (_, i) => `2026-11-15T20:00:00.123Z ERROR [mcp] request ${i} failed: ECONNRESET`,
  ).join('\n');

  it.each([
    ['a one-liner', 'ok'],
    ['prose', 'This is just a sentence someone pasted\ninto a code block for no reason at all.'],
    ['log', log],
    [
      'stack trace',
      "TypeError: Cannot read properties of undefined (reading 'id')\n    at call (file:///x.mjs:10:37)\n    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)",
    ],
    [
      'Python traceback',
      'Traceback (most recent call last):\n  File "main.py", line 3, in <module>\n    foo()\nNameError: name \'foo\' is not defined',
    ],
    ['invalid JSON', '{ "name": "locket",\n  oops }'],
  ])('leaves an untagged %s plain', (_, body) => {
    const { container } = render(<Markdown source={fence('', body)} />);
    expect(blockOf(container).querySelector('span')).toBeNull();
    expect(labelOf(container)).toBeNull();
  });

  it.each(['text', 'plain', 'foo'])('keeps a %s fence plain, with its tag as the label', (lang) => {
    const { container } = render(<Markdown source={fence(lang, 'const x = 1;')} />);
    expect(blockOf(container).querySelector('span')).toBeNull();
    expect(labelOf(container)).toBe(lang);
  });

  it('never highlights inline code', () => {
    const { container } = render(<Markdown source="Run `const x = 1;` first." />);
    expect(container.querySelector('code')!.innerHTML).toBe('const x = 1;');
    expect(labelOf(container)).toBeNull();
  });
});
