export class ApplicationError extends Error {
  constructor(public code: string, message: string, public revision?: string) { super(message); }
}
export const invalid = (message: string): never => { throw new ApplicationError('invalid_document', message); };
