import { ApplicationError } from '../../shared/domain/application-error.js';
export class ApiError extends ApplicationError {
  constructor(public status: number, code: string, message: string, revision?: string) { super(code, message, revision); }
}
export function statusFor(error: ApplicationError): number {
  if (error instanceof ApiError) return error.status;
  const statuses: Record<string, number> = {
    invalid_document: 400, authentication_required: 401, invalid_token: 401,
    email_unverified: 403, account_disabled: 403, work_not_found: 404,
    immutable_creation: 409, immutable_baseline: 409, immutable_progress: 409,
    expense_deletion: 409, idempotency_mismatch: 409, revision_conflict: 409,
    work_quota: 422, rate_limit: 429, auth_unavailable: 503, auth_not_configured: 503
  };
  return statuses[error.code] ?? 503;
}
