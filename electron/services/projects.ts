import * as store from '../attachments/store';
import { repos, withReader, withTransaction } from '../db';
import {
  SLUG_RE,
  type NewProjectInput,
  type PersistedProject,
  type ProjectPatch,
} from '../db/types';
import {
  DEFAULT_PROJECT_COLOR,
  DEFAULT_PROJECT_ICON,
  HEX_COLOR_RE,
  isMaterialSymbol,
  unknownIconMessage,
} from '../projects/icons';
import { NotFoundError, ValidationError } from './errors';

export interface ProjectSummary extends PersistedProject {
  ticketCount: number;
}

export const listProjects = (): Promise<ProjectSummary[]> =>
  withReader(async (em) => {
    const [projects, counts] = await Promise.all([
      repos.projects.findAll(em),
      repos.tickets.countByProject(em),
    ]);
    return projects.map((p) => ({ ...p, ticketCount: counts[p.id] ?? 0 }));
  });

export const getProject = (id: string): Promise<PersistedProject> =>
  withReader(async (em) => {
    const project = await repos.projects.findById(em, id);
    if (!project) throw new NotFoundError('Project', id);
    return project;
  });

/** Icon and colour rules shared by MCP and the app. */
const checkLook = ({ icon, color }: { icon?: string; color?: string }): void => {
  if (icon !== undefined && !isMaterialSymbol(icon)) {
    throw new ValidationError(unknownIconMessage(String(icon)));
  }
  if (color !== undefined && !(typeof color === 'string' && HEX_COLOR_RE.test(color))) {
    throw new ValidationError(`Invalid colour "${String(color)}": use a hex colour like #1976d2`);
  }
};

export const createProject = (input: NewProjectInput): Promise<PersistedProject> =>
  withTransaction(async (em) => {
    if (!SLUG_RE.test(input.slug)) {
      throw new ValidationError(`Invalid slug "${input.slug}": use 2-12 chars of a-z, 0-9 or "-"`);
    }
    checkLook(input);
    if (await repos.projects.findBySlug(em, input.slug)) {
      throw new ValidationError(`Slug "${input.slug}" already in use`);
    }
    const project: PersistedProject = {
      id: `${input.slug}-${Math.random().toString(36).slice(2, 6)}`,
      name: input.name,
      slug: input.slug,
      icon: input.icon ?? DEFAULT_PROJECT_ICON,
      color: input.color ?? DEFAULT_PROJECT_COLOR,
      description: input.description ?? `# ${input.name}\n\n`,
    };
    await repos.projects.insert(em, project);
    await repos.counters.set(em, project.id, 0);
    return project;
  });

export const updateProject = (id: string, patch: ProjectPatch): Promise<PersistedProject> =>
  withTransaction(async (em) => {
    const project = await repos.projects.findById(em, id);
    if (!project) throw new NotFoundError('Project', id);
    checkLook(patch);
    await repos.projects.update(em, id, patch);
    return { ...project, ...patch };
  });

/** Delete a project and every ticket (and comment) in it. */
export const deleteProject = (id: string): Promise<{ deletedTickets: number }> =>
  withTransaction(async (em) => {
    if (!(await repos.projects.findById(em, id))) throw new NotFoundError('Project', id);
    const ticketIds = await repos.tickets.findIdsByProject(em, id);
    await repos.comments.removeByTicketIds(em, ticketIds);
    await repos.tickets.removeByIds(em, ticketIds);
    await repos.counters.remove(em, id);
    await repos.projects.remove(em, id);
    await store.removeTickets(ticketIds);
    return { deletedTickets: ticketIds.length };
  });

/**
 * Point every project at an icon the app can show: names the font doesn't know (from
 * before icons were checked) become the default. Runs on startup; returns the ids it changed.
 */
export const repairProjectIcons = (): Promise<string[]> =>
  withTransaction(async (em) => {
    const fixed: string[] = [];
    for (const p of await repos.projects.findAll(em)) {
      if (isMaterialSymbol(p.icon)) continue;
      await repos.projects.update(em, p.id, { icon: DEFAULT_PROJECT_ICON });
      fixed.push(p.id);
    }
    return fixed;
  });
