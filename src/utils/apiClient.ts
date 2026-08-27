/**
 * Safe API Client for DELIXA Platform
 * Guarantees proper handling of HTTP status codes, Content-Type headers,
 * empty response bodies, and HTML fallback detection without throwing
 * unhandled SyntaxError ("Unexpected end of JSON input").
 */

export interface SafeApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
  code?: string;
}

/**
 * Safely fetches and parses JSON from an API endpoint.
 */
export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<SafeApiResponse<T>> {
  try {
    const res = await fetch(input, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.headers || {}),
      },
    });

    const contentType = res.headers.get('content-type') || '';
    const rawText = await res.text();
    const trimmed = rawText.trim();

    // 1. Handle completely empty response body
    if (!trimmed) {
      if (res.ok) {
        return {
          ok: true,
          status: res.status,
          data: null,
        };
      }
      return {
        ok: false,
        status: res.status,
        data: null,
        error: `استجابة فارغة من الخادم (رمز الحالة: ${res.status})`,
      };
    }

    // 2. Handle HTML responses (e.g. 404 fallback or server crash returning HTML)
    if (
      contentType.includes('text/html') ||
      trimmed.startsWith('<!DOCTYPE') ||
      trimmed.startsWith('<!doctype') ||
      trimmed.startsWith('<html') ||
      trimmed.startsWith('<?xml')
    ) {
      const is404 = res.status === 404;
      const errorMsg = is404
        ? 'مسار الـ API غير موجود على الخادم (404 Not Found)'
        : `استجابة غير متوقعة بتنسيق HTML (رمز الحالة: ${res.status})`;
      return {
        ok: false,
        status: res.status,
        data: null,
        error: errorMsg,
      };
    }

    // 3. Parse JSON safely
    try {
      const parsed = JSON.parse(trimmed);
      const isSuccess = res.ok && parsed.success !== false;
      const errorMsg =
        parsed.error ||
        (!res.ok ? `فشل الطلب مع رمز الحالة ${res.status}` : undefined);

      return {
        ok: isSuccess,
        status: res.status,
        data: parsed,
        error: errorMsg,
        code: parsed.code,
      };
    } catch {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: `تعذر قراءة بيانات JSON من الخادم (رمز الحالة: ${res.status})`,
      };
    }
  } catch (netErr: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: netErr?.message || 'فشل الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.',
    };
  }
}

/**
 * Convenience helper for API calls with token authorization
 */
export async function apiCall<T = any>(
  url: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: any;
    token?: string | null;
    headers?: Record<string, string>;
  } = {}
): Promise<SafeApiResponse<T>> {
  const { method = 'GET', body, token, headers = {} } = options;

  const requestHeaders: Record<string, string> = {
    ...headers,
  };

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  return safeFetchJson<T>(url, {
    method,
    headers: requestHeaders,
    body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  });
}
