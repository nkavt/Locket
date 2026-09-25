import { mutate, readData } from '../db/store';
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

export const listProjects = async (): Promise<ProjectSummary[]> => {
  const data = await readData();
  return data.projects.map((p) => ({
    ...p,
    ticketCount: data.tickets.filter((t) => t.projectId === p.id).length,
  }));
};

export const getProject = async (id: string): Promise<PersistedProject> => {
  const data = await readData();
  const project = data.projects.find((p) => p.id === id);
  if (!project) throw new NotFoundError('Project', id);
  return project;
};

export const createProject = (input: NewProjectInput): Promise<PersistedProject> =>
  mutate((data) => {
    if (!SLUG_RE.test(input.slug)) {
      throw new ValidationError(`Invalid slug "${input.slug}": use 2-12 chars of a-z, 0-9 or "-"`);
    }
    if (data.projects.some((p) => p.slug === input.slug)) {
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
    data.projects.push(project);
    data.counters[project.id] = 0;
    return project;
  });

export const updateProject = (id: string, patch: ProjectPatch): Promise<PersistedProject> =>
  mutate((data) => {
    const project = data.projects.find((p) => p.id === id);
    if (!project) throw new NotFoundError('Project', id);
    Object.assign(project, patch);
    return project;
  });

/** Delete a project and every ticket in it. */
export const deleteProject = (id: string): Promise<{ deletedTickets: number }> =>
  mutate((data) => {
    const idx = data.projects.findIndex((p) => p.id === id);
    if (idx === -1) throw new NotFoundError('Project', id);
    data.projects.splice(idx, 1);
    const before = data.tickets.length;
    data.tickets = data.tickets.filter((t) => t.projectId !== id);
    delete data.counters[id];
    return { deletedTickets: before - data.tickets.length };
  });
