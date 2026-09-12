import { Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { monoFontFamily } from '@/theme';

interface MarkdownProps {
  source: string;
  fontSize?: number;
}

export function Markdown({ source, fontSize = 14 }: MarkdownProps) {
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
        '& blockquote': {
          borderLeft: 3,
          borderColor: 'divider',
          margin: '0.7em 0',
          padding: '0.2em 0 0.2em 1em',
          color: 'text.secondary',
        },
        '& a': { color: 'primary.main', textDecoration: 'none' },
        '& a:hover': { textDecoration: 'underline' },
        '& img': { maxWidth: '100%', borderRadius: '6px', margin: '0.5em 0' },
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
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
    </Box>
  );
}
