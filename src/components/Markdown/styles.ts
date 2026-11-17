import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { monoFontFamily } from '@/theme';

interface MarkdownRootProps {
  /** Base font size; everything else is sized in `em` from it. */
  textSize: number;
  /** Tallest an inline image is drawn. */
  imageMaxHeight: number;
}

/** Rendered markdown: typography, code (with highlight.js token colours), tables and images. */
export const MarkdownRoot = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'textSize' && prop !== 'imageMaxHeight',
})<MarkdownRootProps>(({ theme, textSize, imageMaxHeight }) => {
  const { palette } = theme;
  const { syntax } = palette;
  return {
    fontSize: textSize,
    lineHeight: 1.65,
    color: palette.text.primary,
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
      background: palette.action.hover,
      padding: '0.15em 0.4em',
      borderRadius: '4px',
      fontSize: '0.88em',
    },
    '& pre': {
      fontFamily: monoFontFamily,
      background: palette.action.hover,
      padding: '12px 14px',
      borderRadius: '6px',
      overflowX: 'auto',
    },
    '& pre code': { background: 'none', padding: 0 },
    // highlight.js classes, coloured from the theme so they follow light / dark live.
    '& .hljs-keyword, & .hljs-doctag, & .hljs-template-tag, & .hljs-template-variable, & .hljs-type, & .hljs-variable.language_, & .hljs-meta .hljs-keyword':
      { color: syntax.keyword },
    '& .hljs-string, & .hljs-regexp, & .hljs-meta .hljs-string': { color: syntax.string },
    '& .hljs-number, & .hljs-literal, & .hljs-variable, & .hljs-operator, & .hljs-meta, & .hljs-selector-id, & .hljs-selector-class, & .hljs-selector-attr, & .hljs-section':
      { color: syntax.number },
    '& .hljs-title': { color: syntax.title },
    '& .hljs-attr, & .hljs-attribute, & .hljs-property, & .hljs-built_in, & .hljs-symbol, & .hljs-bullet, & .hljs-params':
      { color: syntax.attr },
    '& .hljs-name, & .hljs-selector-tag, & .hljs-selector-pseudo, & .hljs-quote': {
      color: syntax.tag,
    },
    '& .hljs-comment, & .hljs-formula': { color: syntax.comment },
    '& .hljs-section, & .hljs-strong': { fontWeight: 600 },
    '& .hljs-emphasis': { fontStyle: 'italic' },
    // Diff lines: tint the whole line, not just its text.
    '& .hljs-addition, & .hljs-deletion': { display: 'inline-block', minWidth: '100%' },
    '& .hljs-addition': { color: syntax.addition.fg, background: syntax.addition.bg },
    '& .hljs-deletion': { color: syntax.deletion.fg, background: syntax.deletion.bg },
    '& blockquote': {
      borderLeft: `3px solid ${palette.divider}`,
      margin: '0.7em 0',
      padding: '0.2em 0 0.2em 1em',
      color: palette.text.secondary,
    },
    '& a': { color: palette.primary.main, textDecoration: 'none' },
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
      borderTop: `1px solid ${palette.divider}`,
      margin: '1.5em 0',
    },
    '& table': { borderCollapse: 'collapse', margin: '0.7em 0' },
    '& th, & td': {
      border: `1px solid ${palette.divider}`,
      padding: '6px 10px',
      textAlign: 'left',
    },
    '& th': { background: palette.action.hover },
    '& input[type="checkbox"]': { marginRight: '0.4em' },
  };
});

/** Wraps a `<pre>` so its language label stays in the corner when the code scrolls sideways. */
export const CodeBlockRoot = styled(Box)({
  position: 'relative',
  margin: '1em 0',
  '& pre': { margin: 0 },
});

/** The small, dim language label in a code block's top-right corner. */
export const CodeLabel = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 4,
  right: 10,
  fontFamily: monoFontFamily,
  fontSize: '0.72em',
  color: theme.palette.text.secondary,
  pointerEvents: 'none',
  userSelect: 'none',
}));
