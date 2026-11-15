import { Box } from '@mui/material';
import { memo, type ComponentPropsWithoutRef } from 'react';
import ReactMarkdown, {
  defaultUrlTransform,
  type Components,
  type ExtraProps,
  type UrlTransform,
} from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AttachmentImage } from '@/features/attachments/AttachmentImage';
import { useAttachmentScope } from '@/features/attachments/AttachmentScope';
import { ATTACHMENT_SCHEME, attachmentNameOf } from '@/features/attachments/files';
import { monoFontFamily } from '@/theme';
import { rehypeCodeHighlight } from './rehypeCodeHighlight';

interface MarkdownProps {
  source: string;
  fontSize?: number;
  /** Tallest an inline image is drawn; click it to see it full size. */
  imageMaxHeight?: number;
}

/**
 * Only stored attachments and inline data: images render, so viewing a ticket never makes a
 * network request. Any other source shows its alt text as a link, which the main process
 * opens in the browser.
 */
export function MarkdownImage({ src, alt, title }: ComponentPropsWithoutRef<'img'>) {
  const ticketId = useAttachmentScope();
  // A bare file name is one of the ticket's images (only on a ticket, where names resolve).
  const name = typeof src === 'string' ? attachmentNameOf(src) : null;
  if (name && (ticketId || String(src).startsWith(ATTACHMENT_SCHEME))) {
    return <AttachmentImage name={name} alt={alt} title={title} />;
  }
  if (typeof src === 'string' && src.startsWith('data:image/')) {
    return <img src={src} alt={alt} title={title} />;
  }
  if (!src) return <>{alt}</>;
  return (
    <a href={String(src)} title={title} target="_blank" rel="noreferrer">
      {alt || String(src)}
    </a>
  );
}

type PreProps = ComponentPropsWithoutRef<'pre'> &
  ExtraProps & { 'data-language'?: string; 'data-auto'?: boolean | string };

/** A code block with its language in the corner; a guessed language is marked as one. */
function CodeBlock({ children, 'data-language': label, 'data-auto': auto }: PreProps) {
  return (
    <Box className="code-block" sx={{ position: 'relative' }}>
      <pre>{children}</pre>
      {label && (
        <Box component="span" className="code-label" aria-hidden>
          {auto != null ? `${label} · auto` : label}
        </Box>
      )}
    </Box>
  );
}

const components: Components = { img: MarkdownImage, pre: CodeBlock };
const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeCodeHighlight];

// The default transform strips data: and attachment: URLs; keep them for image sources only.
// Bare file names are relative URLs, which it keeps anyway.
const urlTransform: UrlTransform = (url, key, node) =>
  node.tagName === 'img' &&
  key === 'src' &&
  (url.startsWith('data:image/') || url.startsWith(ATTACHMENT_SCHEME))
    ? url
    : defaultUrlTransform(url);

/** Memoised so typing elsewhere on the page doesn't re-parse and re-highlight the source. */
export const Markdown = memo(function Markdown({
  source,
  fontSize = 14,
  imageMaxHeight = 480,
}: MarkdownProps) {
  return (
    <Box
      sx={{
        fontSize,
        lineHeight: 1.65,
        color: 'text.primary',
        '& h1, & h2, & h3': {
          margin: '1.2em 0 0.5em',
          fontWeight: 500,
          lineHeight: 1.3,
        },
        '& h1': { fontSize: '1.75em' },
        '& h2': { fontSize: '1.4em' },
        '& h3': { fontSize: '1.15em' },
        '& p': { margin: '0.7em 0' },
        '& ul, & ol': { margin: '0.5em 0', paddingLeft: '1.6em' },
        '& li': { margin: '0.25em 0' },
        '& code': {
          fontFamily: monoFontFamily,
          background: (t) => t.palette.action.hover,
          padding: '0.15em 0.4em',
          borderRadius: '4px',
          fontSize: '0.88em',
        },
        '& pre': {
          fontFamily: monoFontFamily,
          background: (t) => t.palette.action.hover,
          padding: '12px 14px',
          borderRadius: '6px',
          overflowX: 'auto',
        },
        '& pre code': { background: 'none', padding: 0 },
        '& .code-block': { margin: '1em 0' },
        '& .code-block pre': { margin: 0 },
        '& .code-label': {
          position: 'absolute',
          top: 4,
          right: 10,
          fontFamily: monoFontFamily,
          fontSize: '0.72em',
          color: 'text.secondary',
          pointerEvents: 'none',
          userSelect: 'none',
        },
        // highlight.js classes, coloured from the theme so they follow light / dark live.
        '& .hljs-keyword, & .hljs-doctag, & .hljs-template-tag, & .hljs-template-variable, & .hljs-type, & .hljs-variable.language_, & .hljs-meta .hljs-keyword':
          { color: 'syntax.keyword' },
        '& .hljs-string, & .hljs-regexp, & .hljs-meta .hljs-string': { color: 'syntax.string' },
        '& .hljs-number, & .hljs-literal, & .hljs-variable, & .hljs-operator, & .hljs-meta, & .hljs-selector-id, & .hljs-selector-class, & .hljs-selector-attr, & .hljs-section':
          { color: 'syntax.number' },
        '& .hljs-title': { color: 'syntax.title' },
        '& .hljs-attr, & .hljs-attribute, & .hljs-property, & .hljs-built_in, & .hljs-symbol, & .hljs-bullet, & .hljs-params':
          { color: 'syntax.attr' },
        '& .hljs-name, & .hljs-selector-tag, & .hljs-selector-pseudo, & .hljs-quote': {
          color: 'syntax.tag',
        },
        '& .hljs-comment, & .hljs-formula': { color: 'syntax.comment' },
        '& .hljs-section, & .hljs-strong': { fontWeight: 600 },
        '& .hljs-emphasis': { fontStyle: 'italic' },
        // Diff lines: tint the whole line, not just its text.
        '& .hljs-addition, & .hljs-deletion': { display: 'inline-block', minWidth: '100%' },
        '& .hljs-addition': {
          color: 'syntax.addition.fg',
          bgcolor: 'syntax.addition.bg',
        },
        '& .hljs-deletion': {
          color: 'syntax.deletion.fg',
          bgcolor: 'syntax.deletion.bg',
        },
        '& blockquote': {
          borderLeft: 3,
          borderColor: 'divider',
          margin: '0.7em 0',
          padding: '0.2em 0 0.2em 1em',
          color: 'text.secondary',
        },
        '& a': { color: 'primary.main', textDecoration: 'none' },
        '& a:hover': { textDecoration: 'underline' },
        // Width and height stay auto, so a capped image keeps its aspect ratio.
        '& img': {
          maxWidth: '100%',
          maxHeight: imageMaxHeight,
          borderRadius: '6px',
          margin: '0.5em 0',
        },
        '& hr': {
          border: 'none',
          borderTop: '1px solid',
          borderColor: 'divider',
          margin: '1.5em 0',
        },
        '& table': { borderCollapse: 'collapse', margin: '0.7em 0' },
        '& th, & td': {
          border: '1px solid',
          borderColor: 'divider',
          padding: '6px 10px',
          textAlign: 'left',
        },
        '& th': { background: (t) => t.palette.action.hover },
        '& input[type="checkbox"]': { marginRight: '0.4em' },
      }}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
        urlTransform={urlTransform}
      >
        {source}
      </ReactMarkdown>
    </Box>
  );
});
