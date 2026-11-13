/**
 * Prototype Role Middleware
 * File: server/src/middleware/auth.ts
 * 
 * ============================================================================
 * PROTOTYPE SECURITY & ROLE BOUNDARY NOTICE:
 * This software is an academic graduation prototype. Role switching
 * (Resident vs. Coordinator) is controlled via the frontend UI toggle and the
 * 'X-User-Role' HTTP header.
 * 
 * - Client-supplied role markers are NOT cryptographic authentication.
 * - This must NOT be mistaken for production authentication.
 * - In production, this must be replaced with Supabase Auth (JWT bearer tokens),
 *   verified coordinator logins (email/password or SSO), and database Row Level
 *   Security (RLS) policies checking auth.uid().
 * ============================================================================
 */

import { NextFunction, Request, Response } from 'express';
import { UserRole } from '../types/index.js';

// Extend Express Request interface to include prototype role context
declare global {
  namespace Express {
    interface Request {
      userRole?: UserRole;
    }
  }
}

/**
 * Extracts and normalizes the active role from the prototype demonstration header.
 */
export function extractUserRole(req: Request, _res: Response, next: NextFunction): void {
  const roleHeader = req.headers['x-user-role'];

  if (typeof roleHeader === 'string' && roleHeader.toLowerCase() === 'coordinator') {
    req.userRole = 'coordinator';
  } else if (typeof roleHeader === 'string' && roleHeader.toLowerCase() === 'resident') {
    req.userRole = 'resident';
  } else {
    // Default to resident in prototype mode if unspecified
    req.userRole = 'resident';
  }

  next();
}

/**
 * Prototype guard middleware for coordinator-only endpoints.
 * Blocks requests when the active demonstration role is explicitly 'resident'.
 */
export function requireCoordinator(req: Request, res: Response, next: NextFunction): void {
  const roleHeader = req.headers['x-user-role'];
  const isCoordinator =
    (typeof roleHeader === 'string' && roleHeader.toLowerCase() === 'coordinator') ||
    req.userRole === 'coordinator';

  if (!isCoordinator) {
    res.status(403).json({
      success: false,
      error: {
        message: "Coordinator role required for this operation. In prototype mode, set header 'X-User-Role: coordinator'.",
      },
    });
    return;
  }

  req.userRole = 'coordinator';
  next();
}
