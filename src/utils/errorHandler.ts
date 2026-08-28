/**
 * Unified Error Handler for DELIXA Platform
 * Guarantees that no error is ever shown as "[object Object]"
 * Provides user-friendly Arabic translations for system, Supabase, and network errors.
 */

export function getErrorMessage(error: unknown, fallback: string = 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'): string {
  if (error === null || error === undefined) {
    return fallback;
  }

  // 1. If it's already a clean string
  if (typeof error === 'string') {
    const trimmed = error.trim();
    if (!trimmed || trimmed === '[object Object]' || trimmed === 'null' || trimmed === 'undefined') {
      return fallback;
    }
    // Check if the string is stringified JSON containing error details
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        return getErrorMessage(parsed, fallback);
      } catch {
        // Not valid JSON, continue with translation
      }
    }
    return translateCommonErrors(trimmed);
  }

  // 2. If it's a standard JS Error object
  if (error instanceof Error) {
    if (error.message && error.message.trim() && error.message !== '[object Object]') {
      return translateCommonErrors(error.message);
    }
  }

  // 3. If it's an Object (Supabase error, Axios/Fetch error, or custom API payload)
  if (typeof error === 'object') {
    const obj = error as Record<string, any>;

    // Handle Supabase PostgREST error structure { message, details, hint, code }
    if (obj.message && typeof obj.message === 'string' && obj.message !== '[object Object]') {
      let combined = obj.message;
      if (obj.details && typeof obj.details === 'string' && obj.details.trim() && obj.details !== 'null') {
        combined += ` (${obj.details})`;
      }
      return translateCommonErrors(combined);
    }

    // Handle standard API responses { error: string | object, error_description?: string }
    if (obj.error) {
      if (typeof obj.error === 'string' && obj.error !== '[object Object]') {
        return translateCommonErrors(obj.error);
      }
      if (typeof obj.error === 'object') {
        return getErrorMessage(obj.error, fallback);
      }
    }

    if (obj.error_description && typeof obj.error_description === 'string') {
      return translateCommonErrors(obj.error_description);
    }

    if (obj.msg && typeof obj.msg === 'string') {
      return translateCommonErrors(obj.msg);
    }

    if (obj.details && typeof obj.details === 'string') {
      return translateCommonErrors(obj.details);
    }

    // Try JSON.stringify safely as last resort for known key extraction
    try {
      const keys = Object.keys(obj);
      if (keys.length > 0) {
        for (const k of ['message', 'error', 'description', 'title', 'reason', 'statusText']) {
          if (obj[k] && typeof obj[k] === 'string') {
            return translateCommonErrors(obj[k]);
          }
        }
      }
    } catch {
      // Fall through to default fallback
    }
  }

  return fallback;
}

/**
 * Translates common English technical errors to clear, professional Arabic messages
 */
function translateCommonErrors(msg: string): string {
  const lower = msg.toLowerCase();

  // Network & Server
  if (lower.includes('failed to fetch') || lower.includes('network error') || lower.includes('networkrequestfailed') || lower.includes('load failed')) {
    return 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مجدداً.';
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'استغرق الطلب وقتاً أطول من المتوقع. يرجى المحاولة مرة أخرى.';
  }
  if (lower.includes('500') || lower.includes('internal server error')) {
    return 'حدث خطأ في الخادم أثناء معالجة الطلب.';
  }
  if (lower.includes('404') || lower.includes('not found')) {
    return 'البيانات أو المسار المطلوب غير موجود.';
  }

  // Authentication & Supabase
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'بيانات تسجيل الدخول غير صحيحة (البريد الإلكتروني أو كلمة المرور).';
  }
  if (lower.includes('email not confirmed')) {
    return 'البريد الإلكتروني لم يتم تأكيده بعد.';
  }
  if (lower.includes('user already registered') || lower.includes('email already in use')) {
    return 'هذا البريد الإلكتروني مسجل مسبقاً في النظام.';
  }
  if (lower.includes('jwt expired') || lower.includes('token expired') || lower.includes('session expired')) {
    return 'انتهت صلاحية جلسة العمل. يرجى تسجيل الدخول مرة أخرى.';
  }
  if (lower.includes('row-level security') || lower.includes('permission denied')) {
    return 'ليس لديك الصلاحيات الكافية لتنفيذ هذه العملية.';
  }
  if (lower.includes('duplicate key') || lower.includes('unique constraint')) {
    return 'البيانات المدخلة مكررة أو مسجلة مسبقاً في النظام (مثل رقم الشحنة أو كود الموظف).';
  }
  if (lower.includes('invalid api key')) {
    return 'مفتاح الوصول غير صالح أو منتهي الصلاحية.';
  }

  // Pass sanitized original message if no specific translation rule matched
  return msg;
}
