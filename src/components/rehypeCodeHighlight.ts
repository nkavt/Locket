import type { Element, ElementContent, Root, RootContent } from 'hast';
import { common, createLowlight } from 'lowlight';

const lowlight = createLowlight(common);

/** Tags that opt a block out of highlighting. */
const PLAIN_TAGS = new Set(['text', 'plain', 'plaintext', 'txt']);

/**
 * Languages an untagged block may be guessed as. highlight.js's detection is weak on short
 * snippets, so this leaves out grammars that match almost anything: css/less/scss (logs and
 * prose), php (stack traces), ini (HTML), vbnet, arduino, makefile and the like.
 */
const AUTO_LANGUAGES = [
  'typescript',
  'javascript',
  'python',
  'sql',
  'go',
  'rust',
  'java',
  'kotlin',
  'swift',
  'xml',
  'yaml',
  'bash',
  'shell',
  'csharp',
  'cpp',
  'ruby',
  'diff',
  'graphql',
].filter((l) => lowlight.registered(l));

/** highlight.js always picks *some* language; below these, a guess is shown as plain text. */
const MIN_AUTO_RELEVANCE = 5;
const MIN_AUTO_LINES = 2;
const MIN_AUTO_CHARS = 40;
/** Only the start of a block is used to guess, so a long log doesn't run every grammar. */
const AUTO_SCAN_LINES = 40;

/** Log and stack-trace lines, which grammars happily (and wrongly) claim. */
const LOG_LINE =
  /^\s*(\[?\d{4}-\d{2}-\d{2}[T ]\d|\[?\d{2}:\d{2}:\d{2}|at\s|File ".*", line \d|Traceback\b|[\w.]*(Error|Exception)\b)/;

function looksLikeLog(lines: string[]): boolean {
  const filled = lines.filter((l) => l.trim());
  return filled.filter((l) => LOG_LINE.test(l)).length * 2 >= filled.length;
}

function isJson(text: string): boolean {
  if (!/^[[{]/.test(text)) return false;
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

/** A confident guess at an untagged block's language, or undefined to leave it plain. */
function guessLanguage(text: string): string | undefined {
  const trimmed = text.trim();
  const lines = trimmed.split('\n');
  if (lines.length < MIN_AUTO_LINES && trimmed.length < MIN_AUTO_CHARS) return undefined;
  // JSON is the most common paste and can be checked exactly.
  if (isJson(trimmed)) return 'json';
  const head = lines.slice(0, AUTO_SCAN_LINES);
  if (looksLikeLog(head)) return undefined;
  const { language, relevance = 0 } =
    lowlight.highlightAuto(head.join('\n'), { subset: AUTO_LANGUAGES }).data ?? {};
  return language && relevance >= MIN_AUTO_RELEVANCE ? language : undefined;
}

function textOf(node: Element | ElementContent): string {
  if (node.type === 'text') return node.value;
  if (node.type === 'element') return node.children.map(textOf).join('');
  return '';
}

function languageOf(code: Element): string | undefined {
  const classes = code.properties.className;
  if (!Array.isArray(classes)) return undefined;
  for (const c of classes) {
    const s = String(c);
    if (s.startsWith('language-')) return s.slice('language-'.length);
  }
  return undefined;
}

/** The label and highlighted children for a block; no children leaves it as plain text. */
function highlight(
  text: string,
  lang: string | undefined,
): { label?: string; auto?: boolean; children?: RootContent[] } {
  if (lang) {
    const key = lang.toLowerCase();
    if (PLAIN_TAGS.has(key) || !lowlight.registered(key)) return { label: lang };
    return { label: lang, children: lowlight.highlight(key, text).children };
  }
  const guess = guessLanguage(text);
  if (!guess) return {};
  return { label: guess, auto: true, children: lowlight.highlight(guess, text).children };
}

function visit(node: Root | Element, fn: (pre: Element) => void): void {
  for (const child of node.children) {
    if (child.type !== 'element') continue;
    if (child.tagName === 'pre') fn(child);
    else visit(child, fn);
  }
}

/**
 * Highlights fenced code blocks with lowlight's `common` languages. Tagged fences use their
 * tag; untagged ones are guessed only when highlight.js is confident. Inline code is left alone.
 * The block's label goes on the `<pre>` as `data-language` (plus `data-auto` for a guess).
 */
export function rehypeCodeHighlight() {
  return (tree: Root) => {
    visit(tree, (pre) => {
      const code = pre.children.find(
        (c): c is Element => c.type === 'element' && c.tagName === 'code',
      );
      if (!code) return;
      const { label, auto, children } = highlight(textOf(code), languageOf(code));
      if (label) pre.properties.dataLanguage = label;
      if (auto) pre.properties.dataAuto = true;
      if (children) {
        code.properties.className = ['hljs', ...((code.properties.className as string[]) ?? [])];
        code.children = children as ElementContent[];
      }
    });
  };
}
