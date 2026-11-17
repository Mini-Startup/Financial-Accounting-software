import { Request, Response, NextFunction } from 'express';

// ─── Custom HTTP Exceptions ────────────────────────

export class HttpException extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'HttpException';
  }
}

export class BadRequestException extends HttpException {
  constructor(message = 'Bad Request') {
    super(400, message);
    this.name = 'BadRequestException';
  }
}

export class NotFoundException extends HttpException {
  constructor(message = 'Not Found') {
    super(404, message);
    this.name = 'NotFoundException';
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message = 'Unauthorized') {
    super(401, message);
    this.name = 'UnauthorizedException';
  }
}

export class ForbiddenException extends HttpException {
  constructor(message = 'Forbidden') {
    super(403, message);
    this.name = 'ForbiddenException';
  }
}

export class ConflictException extends HttpException {
  constructor(message = 'Conflict') {
    super(409, message);
    this.name = 'ConflictException';
  }
}

// ─── Global Error Handler Middleware ────────────────

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpException) {
    res.status(err.statusCode).json({
      statusCode: err.statusCode,
      message: err.message,
    });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    statusCode: 500,
    message: 'Internal Server Error',
  });
}
