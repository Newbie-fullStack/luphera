const API_URL = import.meta.env.VITE_API_URL ?? '/api/v1';
const API_ORIGIN = API_URL.startsWith('http') ? new URL(API_URL).origin : '';
const CSRF_URL = `${API_ORIGIN}/sanctum/csrf-cookie`;

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

/**
 * Sanctum stateful requests need the XSRF-TOKEN cookie echoed as a header.
 * The cookie endpoint is fetched once per page load, lazily.
 */
let csrfRequest: Promise<void> | null = null;

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));

  return match?.[1] === undefined ? null : decodeURIComponent(match[1]);
}

function ensureCsrfCookie(): Promise<void> {
  csrfRequest ??= fetch(CSRF_URL, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
    .then(() => undefined)
    .catch(() => {
      csrfRequest = null;
    });

  return csrfRequest;
}

async function requestEnvelope<T>(path: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  const { body, headers, ...rest } = options;
  const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const method = (rest.method ?? 'GET').toUpperCase();

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    await ensureCsrfCookie();
  }

  const xsrf = readCookie('XSRF-TOKEN');

  const response = await fetch(url, {
    ...rest,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(xsrf !== null ? { 'X-XSRF-TOKEN': xsrf } : {}),
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

  return payload;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const payload = await requestEnvelope<T>(path, options);

  return payload.data;
}

export async function apiRequestWithMeta<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; meta: Record<string, unknown> }> {
  const payload = await requestEnvelope<T>(path, options);

  return { data: payload.data, meta: payload.meta };
}

/**
 * Binary download (invoice PDF). Errors keep the JSON envelope shape so the
 * caller can show the same messages as the rest of the site.
 */
export async function apiDownload(path: string): Promise<Blob> {
  const response = await fetch(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    credentials: 'include',
    headers: { Accept: 'application/pdf', 'X-Requested-With': 'XMLHttpRequest' },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiEnvelope<null> | null;
    const error = payload && !Array.isArray(payload.errors) ? payload.errors : null;

    throw new ApiError(
      response.status,
      error ?? {
        code: 'network_error',
        message: 'Le téléchargement a échoué. Réessayez dans un instant.',
      },
    );
  }

  return response.blob();
}
