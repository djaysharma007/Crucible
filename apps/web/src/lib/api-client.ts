import { ApiResponseError } from '@crucible/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let errorData: ApiResponseError | null = null;
    try {
      errorData = (await response.json()) as ApiResponseError;
    } catch {
      // Non-JSON error
    }

    const code = errorData?.error?.code || `HTTP_${response.status}`;
    const message =
      errorData?.error?.message || response.statusText || 'An unexpected error occurred';
    throw new ApiError(code, message, errorData?.error?.details);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

apiClient.get = <T>(endpoint: string, options?: RequestInit) =>
  apiClient<T>(endpoint, { ...options, method: 'GET' });

apiClient.post = <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
  apiClient<T>(endpoint, {
    ...options,
    method: 'POST',
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });

apiClient.patch = <T>(endpoint: string, data?: unknown, options?: RequestInit) =>
  apiClient<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });

apiClient.delete = <T>(endpoint: string, options?: RequestInit) =>
  apiClient<T>(endpoint, { ...options, method: 'DELETE' });
