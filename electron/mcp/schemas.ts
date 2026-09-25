import { z } from 'zod';

export const STATUS = z.enum(['todo', 'in_progress', 'done']);
export const PRIORITY = z.enum(['low', 'medium', 'high']);
export const DATE = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')
  .describe('Due date as YYYY-MM-DD');
export const SLUG = z.string().regex(/^[a-z0-9-]{2,12}$/);
