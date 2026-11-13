const API_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

export interface ApiEnvelope<T> {
  data: T;
  meta: Record<string, unknown>;
  errors: ApiErrorBody | [];
}

export interface ApiErrorBody {
  code: string;
  message: string;
  fields?: Record<string, string[]>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string[]>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.fields = body.fields ?? {};
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const response = await fetch(url, {
    ...rest,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      'X-Requested-With': 'XMLHttpRequest',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || payload === null) {
    const error = payload && !Array.isArray(payload.errors) ? payload.errors : null;

    throw new ApiError(
      response.status,
      error ?? {
        code: 'network_error',
        message: 'La requête a échoué. Réessayez dans un instant.',
      },
    );
  }

  return payload.data;
}
