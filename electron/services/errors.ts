export class NotFoundError extends Error {
  constructor(what: string, id: string) {
    super(`${what} "${id}" not found`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/** The current moment as a full ISO timestamp, e.g. "2026-11-13T17:50:12.345Z". */
export const nowIso = (): string => new Date().toISOString();
