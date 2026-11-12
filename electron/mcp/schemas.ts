import { z } from 'zod';
import {
  HEX_COLOR_RE,
  ICON_EXAMPLES,
  isMaterialSymbol,
  unknownIconMessage,
} from '../projects/icons';

export const STATUS = z.enum(['todo', 'in_progress', 'done']);
export const PRIORITY = z.enum(['low', 'medium', 'high']);
export const DATE = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')
  .describe('Due date as YYYY-MM-DD');
export const SLUG = z.string().regex(/^[a-z0-9-]{2,12}$/);

// Checked against every name the font knows. A z.enum of ~4,000 names would bloat every tool
// listing; a refine isn't written into the JSON schema, so agents only see the description.
export const ICON_SCHEMA = z
  .string()
  .refine(isMaterialSymbol, { error: (issue) => unknownIconMessage(String(issue.input)) })
  .describe(
    `Any Material Symbols icon name (https://fonts.google.com/icons), e.g. ${ICON_EXAMPLES.join(', ')}`,
  );
export const COLOR_SCHEMA = z
  .string()
  .regex(HEX_COLOR_RE, 'Hex colour like #1976d2')
  .describe('Hex colour, e.g. #1976d2');
