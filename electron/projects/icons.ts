/*
 * What a project's icon and colour may be. Shared by the main process and the renderer,
 * so it must stay free of Node and DOM APIs (like attachments/rules.ts).
 *
 * The `icon` field holds a Material Symbols name ("storefront"), drawn by the bundled font.
 */
import { MATERIAL_SYMBOL_NAMES } from './material-symbols';

export const DEFAULT_PROJECT_ICON = 'rocket_launch';
export const DEFAULT_PROJECT_COLOR = '#1976d2';

/** Shown in error messages and the MCP tool description. */
export const ICON_EXAMPLES = ['storefront', 'work', 'rocket_launch', 'support_agent', 'science'];

const NAMES = new Set(MATERIAL_SYMBOL_NAMES);

export const isMaterialSymbol = (icon: unknown): icon is string =>
  typeof icon === 'string' && NAMES.has(icon);

export const unknownIconMessage = (icon: string): string =>
  `Unknown icon "${icon}": use any Material Symbols name (https://fonts.google.com/icons), e.g. ${ICON_EXAMPLES.join(', ')}`;

export const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;
