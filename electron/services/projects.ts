import { repos, withReader, withTransaction } from '../db';
import {
  SLUG_RE,
  type NewProjectInput,
  type PersistedProject,
  type ProjectPatch,
} from '../db/types';
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

export const createProject = (input: NewProjectInput): Promise<PersistedProject> =>
  withTransaction(async (em) => {
    if (!SLUG_RE.test(input.slug)) {
      throw new ValidationError(`Invalid slug "${input.slug}": use 2-12 chars of a-z, 0-9 or "-"`);
    }
    if (await repos.projects.findBySlug(em, input.slug)) {
      throw new ValidationError(`Slug "${input.slug}" already in use`);
    }
    const project: PersistedProject = {
      id: `${input.slug}-${Math.random().toString(36).slice(2, 6)}`,
      name: input.name,
      slug: input.slug,
      icon: input.icon ?? 'rocket_launch',
      color: input.color ?? '#1976d2',
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
    return { deletedTickets: ticketIds.length };
  });
