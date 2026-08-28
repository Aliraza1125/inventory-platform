/** Typed application error carrying an HTTP status code and a machine-readable code. */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }

  static badRequest(message: string, code = 'BAD_REQUEST', details?: unknown) {
    return new AppError(400, code, message, details);
  }
  static unauthorized(message: string, code = 'UNAUTHORIZED') {
    return new AppError(401, code, message);
  }
  static notFound(message: string, code = 'NOT_FOUND') {
    return new AppError(404, code, message);
  }
  static conflict(message: string, code = 'CONFLICT', details?: unknown) {
    return new AppError(409, code, message, details);
  }
  static unprocessable(message: string, code = 'UNPROCESSABLE', details?: unknown) {
    return new AppError(422, code, message, details);
  }
  static badGateway(message: string, code = 'UPSTREAM_ERROR', details?: unknown) {
    return new AppError(502, code, message, details);
  }
  static internal(message: string, code = 'INTERNAL_ERROR') {
    return new AppError(500, code, message);
  }
}
