import { describe, expect, it, vi } from 'vitest';
import { useTestDb } from '../test/db';
import type { PersistedData } from '../db/types';

vi.mock('electron', () => ({ app: { getVersion: () => '0.0.0-test' } }));

const { createProject, repairProjectIcons, updateProject } = await import('./projects');
const { readSnapshot, replaceSnapshot } = await import('./snapshot');
const { ValidationError } = await import('./errors');

const project = (id: string, icon: string, color = '#1976d2') => ({
  id,
  name: id,
  slug: id.split('-')[0],
  icon,
  color,
  description: '',
});

const SEED = (): PersistedData => ({
  projects: [project('kargi-ab12', 'storefront')],
  tickets: [],
  counters: { 'kargi-ab12': 0 },
});

describe('project icons and colours', () => {
  useTestDb(SEED);

  it('accepts any Material Symbols name on create and update', async () => {
    const p = await createProject({ name: 'Jobs', slug: 'jobs', icon: 'work' });
    expect(p.icon).toBe('work');
    expect((await updateProject(p.id, { icon: 'support_agent' })).icon).toBe('support_agent');
  });

  it('refuses unknown names with a clear error and examples', async () => {
    await expect(createProject({ name: 'X', slug: 'xx', icon: 'nope' })).rejects.toThrow(
      /Unknown icon "nope".*Material Symbols.*storefront/,
    );
    await expect(updateProject('kargi-ab12', { icon: 'nope' })).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect((await readSnapshot()).projects[0].icon).toBe('storefront');
  });

  it('accepts any hex colour and refuses anything else', async () => {
    expect((await updateProject('kargi-ab12', { color: '#229ED9' })).color).toBe('#229ED9');
    await expect(updateProject('kargi-ab12', { color: 'blue' })).rejects.toThrow(/hex colour/);
    await expect(createProject({ name: 'X', slug: 'xx', color: '#12345' })).rejects.toThrow(
      /hex colour/,
    );
  });

  it('on startup, resets names the font lacks and keeps the rest', async () => {
    const { getDataSource } = await import('../db');
    const { ProjectEntity } = await import('../db/entities/project.entity');
    // Rows written before icons were checked, straight into the table.
    await getDataSource()
      .getRepository(ProjectEntity)
      .insert([project('old-1234', 'not_an_icon'), project('jobs-1234', 'work')]);

    expect(await repairProjectIcons()).toEqual(['old-1234']);
    const icons = Object.fromEntries((await readSnapshot()).projects.map((p) => [p.id, p.icon]));
    expect(icons).toEqual({
      'kargi-ab12': 'storefront',
      'old-1234': 'rocket_launch',
      'jobs-1234': 'work',
    });
  });

  it('a snapshot replace keeps known names and resets the rest', async () => {
    await replaceSnapshot({
      projects: [project('a-1', 'shopping_bag'), project('b-1', 'nope')],
      tickets: [],
      counters: {},
    });
    expect((await readSnapshot()).projects.map((p) => p.icon)).toEqual([
      'shopping_bag',
      'rocket_launch',
    ]);
  });
});
