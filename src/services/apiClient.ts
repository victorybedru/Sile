import type { UserRole } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
let activeRole: UserRole = 'resident';

export function setApiRole(role: UserRole): void {
  activeRole = role;
}

export function getApiRole(): UserRole {
  return activeRole;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-User-Role': activeRole,
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new ApiError('Cannot reach the Sile server. Check that the backend is running and try again.', 0);
  }

  const payload = await response.json().catch(() => null) as any;
  if (!response.ok || payload?.success === false) {
    const message = typeof payload?.error === 'string'
      ? payload.error
      : payload?.error?.message || payload?.message || `Request failed (${response.status}).`;
    throw new ApiError(message, response.status);
  }
  return payload as T;
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
