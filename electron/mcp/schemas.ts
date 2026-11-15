import { z } from 'zod';
import {
  HEX_COLOR_RE,
  ICON_EXAMPLES,
  isMaterialSymbol,
  unknownIconMessage,
} from '../projects/icons';
import { isStatusColor, STATUS_CATEGORIES, THEME_STATUS_COLORS } from '../workflows/rules';

// Each project's workflow decides its statuses, so this can't be a fixed enum: the service
// checks the value against the ticket's project and lists the allowed ones when it's wrong.
export const STATUS = z
  .string()
  .min(1)
  .describe(
    "Status id or name from the project's workflow (list_projects shows them). " +
      'Projects on the default workflow use todo, in_progress and done',
  );
export const STATUS_CATEGORY = z
  .enum(STATUS_CATEGORIES)
  .describe(
    'What the status means: todo (not started; new tickets start in the first one), active, ' +
      'done (counts as done), cancelled (closed but not done)',
  );
export const STATUS_COLOR = z
  .string()
  .refine(isStatusColor, `Hex colour like #1976d2, or one of ${THEME_STATUS_COLORS.join(', ')}`)
  .describe(`Hex colour like #1976d2, or a theme colour: ${THEME_STATUS_COLORS.join(', ')}`);
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
