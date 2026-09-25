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

export const today = (): string => new Date().toISOString().slice(0, 10);
