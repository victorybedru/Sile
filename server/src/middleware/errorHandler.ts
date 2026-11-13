/**
 * Centralized Error & Not-Found Handlers
 * File: server/src/middleware/errorHandler.ts
 * 
 * Provides consistent error payloads and maps service/database exceptions
 * to semantic HTTP status codes without exposing internal secrets or stack traces.
 */

import { NextFunction, Request, Response } from 'express';

export interface AppError extends Error {
  status?: number;
  statusCode?: number;
}

/**
 * Maps error messages to appropriate HTTP status codes
 */
function determineStatusCode(err: AppError): number {
  if (err.statusCode && typeof err.statusCode === 'number') {
    return err.statusCode;
  }
  if (err.status && typeof err.status === 'number') {
    return err.status;
  }

  const message = (err.message || '').toLowerCase();

  if (message.includes('supabase configuration error') || message.includes('missing required environment variable')) return 503;
  if (message.includes('unexpected end of json input') || message.includes('json') && message.includes('parse')) return 400;

  // 404 Not Found
  if (message.includes('not found')) {
    return 404;
  }

  // 409 Conflict (State machine violations, duplicate collisions, terminal states)
  if (
    message.includes('invalid status transition') ||
    message.includes('already in') ||
    message.includes('terminal status') ||
    message.includes('id collision') ||
    message.includes('content mismatch') ||
    message.includes('terminal state') ||
    message.includes('cannot assign a report in "draft"')
  ) {
    return 409;
  }

  // 403 Forbidden
  if (message.includes('unauthorized') || message.includes('coordinator role required')) {
    return 403;
  }

  // 400 Bad Request (Validation failures)
  if (
    message.includes('validation error') ||
    message.includes('cannot be empty') ||
    message.includes('invalid category') ||
    message.includes('invalid sub-city') ||
    message.includes('invalid priority') ||
    message.includes('invalid target status') ||
    message.includes('at least') ||
    message.includes('must provide') ||
    message.includes('required')
  ) {
    return 400;
  }

  return 500;
}

/**
 * Centralized Express Error Handling Middleware
 */
export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = determineStatusCode(err);
  const rawMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';

  // Sanitize message: never expose internal database passwords or service role keys
  const sanitizedMessage = statusCode >= 500 && process.env.NODE_ENV === 'production'
    ? 'An unexpected server error occurred.'
    : rawMessage.replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '[REDACTED]');

  if (statusCode >= 500) {
    console.error(`[Server Error ${statusCode}]`, err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message: sanitizedMessage,
    },
  });
}

/**
 * 404 Catch-All Middleware for unhandled routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      message: `Resource not found: ${req.method} ${req.originalUrl}`,
    },
  });
}
