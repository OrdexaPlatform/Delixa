/**
 * Client-side Platform Tracking (Heartbeat & Daily Unique Visitor Analytics)
 */

function getOrCreateVisitorId(): string {
  const KEY = 'delixa_vid_v1';
  let vid = localStorage.getItem(KEY);
  if (!vid) {
    vid = 'v_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem(KEY, vid);
  }
  return vid;
}

function detectDevice(): 'desktop' | 'mobile' | 'tablet' {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

/**
 * Record a page visit for platform analytics (1 unique visit per visitor per day)
 */
export function trackPageView(page?: string) {
  try {
    const visitorId = getOrCreateVisitorId();
    const currentPath = page || window.location.pathname;
    const device = detectDevice();

    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId,
        page: currentPath,
        device,
      }),
    }).catch(() => {
      // safe fallback
    });
  } catch {
    // silent
  }
}

/**
 * Send presence heartbeat for logged-in company users (Admin or Courier)
 */
export function sendPresenceHeartbeat(companyId: string, userId?: string, userName?: string, userRole: 'admin' | 'courier' = 'admin') {
  if (!companyId) return;
  try {
    fetch('/api/presence/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId,
        userId: userId || null,
        userName: userName || 'مستخدم',
        userRole,
      }),
    }).catch(() => {
      // safe fallback
    });
  } catch {
    // silent
  }
}
