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
import { rehypeCodeHighlight } from './rehypeCodeHighlight';
import { CodeBlockRoot, CodeLabel, MarkdownRoot } from './styles';

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
    <CodeBlockRoot>
      <pre>{children}</pre>
      {label && (
        <CodeLabel className="code-label" aria-hidden>
          {auto != null ? `${label} · auto` : label}
        </CodeLabel>
      )}
    </CodeBlockRoot>
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
    <MarkdownRoot textSize={fontSize} imageMaxHeight={imageMaxHeight}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
        urlTransform={urlTransform}
      >
        {source}
      </ReactMarkdown>
    </MarkdownRoot>
  );
});
