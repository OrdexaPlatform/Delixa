import { Router, Request, Response, NextFunction } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { hashPassword, verifyPassword, generateSecureToken } from './crypto';

// In-memory fallback session store to guarantee continuous operation if remote session table is refreshing
const memorySessions = new Map<string, { admin: any; expires_at: Date }>();
// In-memory fallback presence store
const memoryPresence = new Map<string, any>();
// In-memory fallback analytics store (deduplicated by visitorId + date)
const memoryAnalytics = new Map<string, any>();
// Rate limiter map for Super Admin login protection
const failedLoginAttempts = new Map<string, { count: number; lockedUntil?: number }>();
// In-memory platform settings cache
let platformSettingsCache: any = {
  platform_name: 'DELIXA',
  support_email: 'support@delixa.eg',
  support_phone: '+201000000000',
  default_currency: 'EGP',
  default_trial_days: 14,
  default_timezone: 'Africa/Cairo',
  maintenance_mode: false,
  maintenance_message: 'النظام قيد التحديث والصيانة الدورية حالياً. سنعود للعمل خلال دقائق.',
};

export function setupSuperAdminRoutes(router: Router, getDbClient: () => SupabaseClient | null) {
  const DEFAULT_ADMIN_USERNAME = 'admin';
  const DEFAULT_ADMIN_PASSWORD = process.env.SUPER_ADMIN_INITIAL_PASSWORD || '200300';
  const DEFAULT_ADMIN_HASH = hashPassword(DEFAULT_ADMIN_PASSWORD);

  // Helper: Seed or ensure initial Super Admin in Supabase DB
  async function ensurePrimaryAdminInDb() {
    const supabase = getDbClient();
    if (!supabase) return;
    try {
      // Check if platform_admins table exists and has primary admin
      const { data, error } = await supabase
        .from('platform_admins')
        .select('*')
        .eq('username', DEFAULT_ADMIN_USERNAME)
        .maybeSingle();

      if (error) {
        console.warn('[DELIXA DB Warning] platform_admins query notice:', error.message);
        return;
      }

      if (!data) {
        await supabase.from('platform_admins').insert([
          {
            username: DEFAULT_ADMIN_USERNAME,
            password_hash: DEFAULT_ADMIN_HASH,
            full_name: 'Super Admin (المالك)',
            email: 'admin@delixa.eg',
            phone: '+201000000000',
            role: 'super_admin',
            permissions: ['*'],
            status: 'active',
            is_primary: true,
          }
        ]);
        console.log('[DELIXA DB] Primary Super Admin initialized in platform_admins.');
      }
    } catch (e) {
      console.warn('Super Admin seed exception:', e);
    }
  }

  // Trigger primary admin initialization
  ensurePrimaryAdminInDb();

  // Helper: Add Activity Log to Database
  async function logActivity(actor: string, action: string, targetType: string, targetId: string, details: string, metadata: any = {}, adminId?: string, companyId?: string) {
    const supabase = getDbClient();
    const logItem = {
      admin_id: adminId || null,
      admin_name: actor,
      actor,
      action,
      target_type: targetType,
      target_id: targetId || null,
      company_id: companyId || null,
      details,
      metadata,
      meta: metadata,
      created_at: new Date().toISOString(),
    };
    if (supabase) {
      try {
        await supabase.from('platform_activity_logs').insert([logItem]);
      } catch (err: any) {
        console.error('[DELIXA DB] Failed to record activity log in platform_activity_logs:', err?.message || err);
      }
    }
  }

  // Middleware: Authenticate Super Admin Bearer Token
  const requireSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

      if (!token) {
        return res.status(401).json({ success: false, error: 'غير مصرح: يرجى تسجيل الدخول كمسؤول للمنصة' });
      }

      let admin: any = null;

      // 1. Check in-memory cache first for high performance
      const mem = memorySessions.get(token);
      if (mem && mem.expires_at > new Date()) {
        admin = mem.admin;
      }

      // 2. Query persistent Database platform_sessions in Supabase
      if (!admin) {
        const supabase = getDbClient();
        if (supabase) {
          try {
            const { data: sessionData, error: sessError } = await supabase
              .from('platform_sessions')
              .select('*, platform_admins(*)')
              .eq('token', token)
              .gt('expires_at', new Date().toISOString())
              .maybeSingle();

            if (!sessError && sessionData && sessionData.platform_admins) {
              admin = sessionData.platform_admins;
              // Cache in memory
              memorySessions.set(token, {
                admin,
                expires_at: new Date(sessionData.expires_at),
              });
            }
          } catch (err) {
            console.error('[DELIXA Auth] Session verification database error:', err);
          }
        }
      }

      if (!admin || admin.status === 'disabled') {
        return res.status(401).json({ success: false, error: 'جلسة Super Admin منتهية أو تم تعطيل الحساب' });
      }

      (req as any).superAdmin = admin;
      (req as any).superAdminToken = token;
      next();
    } catch (err: any) {
      console.error('Super Admin Auth Middleware error:', err);
      return res.status(500).json({ success: false, error: 'حدث خطأ في الخادم أثناء التحقق من الصلاحيات' });
    }
  };

  // Helper: Permission checking middleware generator
  const requirePermission = (...requiredPerms: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const admin = (req as any).superAdmin;
      if (!admin) {
        return res.status(401).json({ success: false, error: 'غير مصرح' });
      }
      const permissions: string[] = admin.permissions || [];
      if (permissions.includes('*') || admin.role === 'super_admin') {
        return next();
      }

      // Check if user has ANY of the required permissions or their standard aliases
      const hasAccess = requiredPerms.some((perm) => {
        if (permissions.includes(perm)) return true;

        // Alias matching: .edit <-> .manage, audit.view <-> activity_logs.view
        const parts = perm.split('.');
        const domain = parts[0];
        const action = parts[1];

        if (action === 'edit' && permissions.includes(`${domain}.manage`)) return true;
        if (action === 'manage' && permissions.includes(`${domain}.edit`)) return true;
        if (action === 'delete' && permissions.includes(`${domain}.manage`)) return true;
        if (action === 'create' && (permissions.includes(`${domain}.manage`) || permissions.includes(`${domain}.edit`))) return true;
        if (perm === 'activity_logs.view' && permissions.includes('audit.view')) return true;
        if (perm === 'audit.view' && permissions.includes('activity_logs.view')) return true;

        return false;
      });

      if (hasAccess) {
        return next();
      }

      return res.status(403).json({
        success: false,
        error: `ليس لديك الصلاحية المطلوبة (${requiredPerms.join(' أو ')}) لتنفيذ هذا الإجراء`,
      });
    };
  };

  // Run initial seed check on startup
  setTimeout(() => {
    ensurePrimaryAdminInDb();
  }, 1500);

  // ============================================================================
  // 1. PUBLIC PRESENCE & ANALYTICS TRACKING APIS
  // ============================================================================

  // Heartbeat endpoint for active company users (called every 45-60 seconds)
  router.post('/api/presence/heartbeat', async (req, res) => {
    try {
      const { companyId, userId, userName, userRole } = req.body || {};
      if (!companyId) {
        return res.status(400).json({ success: false, error: 'companyId is required' });
      }

      const now = new Date().toISOString();
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      const presenceRecord = {
        company_id: companyId,
        user_id: userId || null,
        user_name: userName || 'مستخدم',
        user_role: userRole || 'admin',
        last_seen_at: now,
        session_started_at: now,
        ip_address: ip.slice(0, 100),
        user_agent: userAgent.slice(0, 255),
        is_online: true,
      };

      const key = `${companyId}_${userId || 'anonymous'}`;
      memoryPresence.set(key, presenceRecord);

      const supabase = getDbClient();
      if (supabase) {
        try {
          await supabase.from('platform_presence').upsert(
            {
              company_id: companyId,
              user_id: userId || null,
              user_name: userName || 'مستخدم',
              user_role: userRole || 'admin',
              last_seen_at: now,
              ip_address: ip.slice(0, 100),
              user_agent: userAgent.slice(0, 255),
              is_online: true,
            },
            { onConflict: 'company_id,user_id' }
          );
        } catch {
          // ignore table mismatch
        }
      }

      return res.json({ success: true, timestamp: now });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Daily unique visitor tracker (Unique by visitor_id + visit_date)
  router.post('/api/analytics/track', async (req, res) => {
    try {
      const { visitorId, page, device } = req.body || {};
      if (!visitorId) {
        return res.status(400).json({ success: false, error: 'visitorId is required' });
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const dedupeKey = `${visitorId}_${todayStr}`;
      const now = new Date().toISOString();

      const userAgent = req.headers['user-agent'] || '';
      let browser = 'Other';
      if (/chrome/i.test(userAgent)) browser = 'Chrome';
      else if (/safari/i.test(userAgent)) browser = 'Safari';
      else if (/firefox/i.test(userAgent)) browser = 'Firefox';
      else if (/edge/i.test(userAgent)) browser = 'Edge';

      let os = 'Other';
      if (/windows/i.test(userAgent)) os = 'Windows';
      else if (/android/i.test(userAgent)) os = 'Android';
      else if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS';
      else if (/macintosh|mac os/i.test(userAgent)) os = 'macOS';
      else if (/linux/i.test(userAgent)) os = 'Linux';

      const existingMem = memoryAnalytics.get(dedupeKey);
      if (existingMem) {
        existingMem.page_views = (existingMem.page_views || 1) + 1;
        existingMem.last_seen_at = now;
      } else {
        memoryAnalytics.set(dedupeKey, {
          visitor_id: visitorId,
          visit_date: todayStr,
          device_type: device || 'desktop',
          browser,
          os,
          top_page: page || '/',
          page_views: 1,
          first_seen_at: now,
          last_seen_at: now,
        });
      }

      const supabase = getDbClient();
      if (supabase) {
        try {
          await supabase.from('platform_analytics_daily').upsert(
            {
              visitor_id: visitorId,
              visit_date: todayStr,
              device_type: device || 'desktop',
              browser,
              os,
              top_page: page || '/',
              page_views: 1,
              last_seen_at: now,
            },
            { onConflict: 'visitor_id,visit_date' }
          );
        } catch {
          // ignore table mismatch
        }
      }

      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Public platform settings (Maintenance mode & Branding)
  router.get('/api/platform/public-settings', async (_req, res) => {
    try {
      const supabase = getDbClient();
      if (supabase) {
        const { data } = await supabase.from('platform_settings').select('value').eq('key', 'general').maybeSingle();
        if (data && data.value) {
          platformSettingsCache = { ...platformSettingsCache, ...data.value };
        }
      }
      return res.json({
        success: true,
        settings: platformSettingsCache,
      });
    } catch {
      return res.json({ success: true, settings: platformSettingsCache });
    }
  });

  // ============================================================================
  // 2. SUPER ADMIN AUTHENTICATION
  // ============================================================================

  router.post('/api/super-admin/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'يرجى إدخال اسم المستخدم وكلمة المرور',
        });
      }

      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
      const cleanUsername = username.trim().toLowerCase();
      const rateLimitKey = `${ip}_${cleanUsername}`;

      // Check if locked
      const attempt = failedLoginAttempts.get(rateLimitKey);
      if (attempt && attempt.lockedUntil && attempt.lockedUntil > Date.now()) {
        const remainingMin = Math.ceil((attempt.lockedUntil - Date.now()) / 60000);
        return res.status(429).json({
          success: false,
          error: `تم حظر محاولات الدخول مؤقتاً بسبب تكرار المحاولات الخاطئة. يرجى المحاولة بعد ${remainingMin} دقيقة.`,
        });
      }

      let matchedAdmin: any = null;

      // Check Supabase platform_admins
      const supabase = getDbClient();
      if (supabase) {
        try {
          let { data, error } = await supabase
            .from('platform_admins')
            .select('*')
            .ilike('username', cleanUsername)
            .maybeSingle();

          if (!data && cleanUsername === DEFAULT_ADMIN_USERNAME) {
            await ensurePrimaryAdminInDb();
            const retry = await supabase
              .from('platform_admins')
              .select('*')
              .ilike('username', cleanUsername)
              .maybeSingle();
            data = retry.data;
          }

          if (data) {
            matchedAdmin = data;
          }
        } catch (dbErr) {
          console.error('[DELIXA DB] Login database error:', dbErr);
        }
      }

      if (!matchedAdmin) {
        const prev = failedLoginAttempts.get(rateLimitKey) || { count: 0 };
        const newCount = prev.count + 1;
        failedLoginAttempts.set(rateLimitKey, {
          count: newCount,
          lockedUntil: newCount >= 5 ? Date.now() + 15 * 60 * 1000 : undefined,
        });
        return res.status(401).json({
          success: false,
          error: 'اسم المستخدم أو كلمة المرور غير صحيحة',
        });
      }

      if (matchedAdmin.status === 'disabled') {
        return res.status(403).json({
          success: false,
          error: 'تم تعطيل هذا الحساب من قبل مدير المنصة',
        });
      }

      const isMatch = verifyPassword(password, matchedAdmin.password_hash);
      if (!isMatch) {
        const prev = failedLoginAttempts.get(rateLimitKey) || { count: 0 };
        const newCount = prev.count + 1;
        failedLoginAttempts.set(rateLimitKey, {
          count: newCount,
          lockedUntil: newCount >= 5 ? Date.now() + 15 * 60 * 1000 : undefined,
        });
        return res.status(401).json({
          success: false,
          error: 'اسم المستخدم أو كلمة المرور غير صحيحة',
        });
      }

      // Success: clear rate limiter
      failedLoginAttempts.delete(rateLimitKey);

      // Generate Session Token (7 days validity)
      const token = generateSecureToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const userAgent = req.headers['user-agent'] || '';

      // Store in memory
      memorySessions.set(token, {
        admin: matchedAdmin,
        expires_at: expiresAt,
      });

      // Store in DB if available
      if (supabase) {
        try {
          await supabase.from('platform_sessions').insert([
            {
              admin_id: matchedAdmin.id,
              token,
              ip_address: ip.slice(0, 100),
              user_agent: userAgent.slice(0, 255),
              expires_at: expiresAt.toISOString(),
            }
          ]);

          await supabase
            .from('platform_admins')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', matchedAdmin.id);
        } catch {
          // safe
        }
      }

      // Record Activity
      logActivity(
        matchedAdmin.full_name,
        'super_admin_login',
        'auth',
        matchedAdmin.id,
        `تسجيل دخول ناجح للمسؤول ${matchedAdmin.full_name}`,
        { ip, userAgent: userAgent.slice(0, 100) },
        matchedAdmin.id
      );

      const safeAdmin = { ...matchedAdmin };
      delete safeAdmin.password_hash;

      return res.json({
        success: true,
        session: {
          token,
          admin: safeAdmin,
          expires_at: expiresAt.toISOString(),
        },
      });
    } catch (err: any) {
      console.error('Super Admin login exception:', err);
      return res.status(500).json({
        success: false,
        error: 'حدث خطأ في الخادم أثناء تسجيل الدخول',
      });
    }
  });

  // Get current logged-in Super Admin details
  router.get('/api/super-admin/auth/me', requireSuperAdmin, (req, res) => {
    const admin = { ...(req as any).superAdmin };
    delete admin.password_hash;
    return res.json({
      success: true,
      admin,
    });
  });

  // Logout Super Admin
  router.post('/api/super-admin/auth/logout', requireSuperAdmin, async (req, res) => {
    try {
      const token = (req as any).superAdminToken;
      const admin = (req as any).superAdmin;

      if (token) {
        memorySessions.delete(token);
        const supabase = getDbClient();
        if (supabase) {
          try {
            await supabase.from('platform_sessions').delete().eq('token', token);
          } catch {
            // safe
          }
        }
      }

      logActivity(
        admin?.full_name || 'Super Admin',
        'super_admin_logout',
        'auth',
        admin?.id,
        `تسجيل خروج المسؤول ${admin?.full_name || ''}`,
        {},
        admin?.id
      );

      return res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // 3. DASHBOARD METRICS & RECHARTS DATA
  // ============================================================================

  router.get('/api/super-admin/dashboard/stats', requireSuperAdmin, requirePermission('dashboard.view'), async (_req, res) => {
    try {
      const supabase = getDbClient();
      let companies: any[] = [];
      let orders: any[] = [];
      let couriers: any[] = [];
      let merchants: any[] = [];
      let profiles: any[] = [];
      let payments: any[] = [];
      let subscriptions: any[] = [];

      if (supabase) {
        const [compRes, ordRes, courRes, merRes, profRes, payRes, subRes] = await Promise.all([
          supabase.from('companies').select('*'),
          supabase.from('orders').select('id, company_id, cod_amount, status, created_at'),
          supabase.from('couriers').select('id, company_id, status'),
          supabase.from('merchants').select('id, company_id, status'),
          supabase.from('profiles').select('id, company_id, role'),
          supabase.from('platform_payments').select('*'),
          supabase.from('platform_subscriptions').select('*'),
        ]);

        companies = compRes.data || [];
        orders = ordRes.data || [];
        couriers = courRes.data || [];
        merchants = merRes.data || [];
        profiles = profRes.data || [];
        payments = payRes.data || [];
        subscriptions = subRes.data || [];
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const currentMonthStr = todayStr.substring(0, 7);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const sevenDaysFuture = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

      // Presence Calculation
      const onlineCompanyIds = new Set<string>();
      memoryPresence.forEach((pres) => {
        if (new Date(pres.last_seen_at) >= threeMinutesAgo) {
          onlineCompanyIds.add(pres.company_id);
        }
      });

      // Metrics calculation
      const totalCompanies = companies.length;
      const activeCompanies = companies.filter(c => (c.status || 'active') === 'active').length;
      const suspendedCompanies = companies.filter(c => c.status === 'suspended' || c.status === 'disabled').length;
      const trialCompanies = companies.filter(c => c.is_trial || c.status === 'trial').length;
      
      const expiredCompanies = companies.filter(c => {
        if (!c.subscription_end_date) return false;
        return new Date(c.subscription_end_date) < new Date(todayStr);
      }).length;

      const expiring7DaysCompanies = companies.filter(c => {
        if (!c.subscription_end_date) return false;
        const end = new Date(c.subscription_end_date);
        return end >= new Date(todayStr) && end <= sevenDaysFuture;
      }).length;

      const onlineCompaniesCount = onlineCompanyIds.size;

      // Platform User & Entity metrics
      const totalUsers = profiles.length + couriers.length;
      const totalCouriers = couriers.length;
      const totalMerchants = merchants.length;
      const totalOrders = orders.length;

      const ordersToday = orders.filter(o => o.created_at && o.created_at.startsWith(todayStr)).length;
      const ordersThisMonth = orders.filter(o => o.created_at && o.created_at.startsWith(currentMonthStr)).length;

      // Revenue Metrics (From platform payments)
      const successfulPayments = payments.filter(p => p.status === 'paid');
      const totalRevenue = successfulPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const revenueToday = successfulPayments
        .filter(p => p.payment_date && p.payment_date.startsWith(todayStr))
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const revenueThisMonth = successfulPayments
        .filter(p => p.payment_date && p.payment_date.startsWith(currentMonthStr))
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      // Subscriptions metrics
      const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
      const trialSubscriptions = subscriptions.filter(s => s.status === 'trial').length;
      const expiredSubscriptions = subscriptions.filter(s => s.status === 'expired').length;

      // Chart: 7 Days & 30 Days trend
      const dailyChartData: any[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dStr = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });

        const dayOrders = orders.filter(o => o.created_at && o.created_at.startsWith(dStr)).length;
        const dayRevenue = successfulPayments
          .filter(p => p.payment_date && p.payment_date.startsWith(dStr))
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const dayNewCompanies = companies.filter(c => c.created_at && c.created_at.startsWith(dStr)).length;

        dailyChartData.push({
          date: dStr,
          label: dayLabel,
          orders: dayOrders,
          revenue: dayRevenue,
          newCompanies: dayNewCompanies,
        });
      }

      // Chart: 12 Months Trend
      const monthlyChartData: any[] = [];
      for (let m = 11; m >= 0; m--) {
        const d = new Date();
        d.setMonth(d.getMonth() - m);
        const mStr = d.toISOString().substring(0, 7);
        const monthLabel = d.toLocaleDateString('ar-EG', { month: 'short', year: '2-digit' });

        const mOrders = orders.filter(o => o.created_at && o.created_at.startsWith(mStr)).length;
        const mRevenue = successfulPayments
          .filter(p => p.payment_date && p.payment_date.startsWith(mStr))
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const mNewCompanies = companies.filter(c => c.created_at && c.created_at.startsWith(mStr)).length;

        monthlyChartData.push({
          month: mStr,
          label: monthLabel,
          orders: mOrders,
          revenue: mRevenue,
          newCompanies: mNewCompanies,
        });
      }

      return res.json({
        success: true,
        stats: {
          totalCompanies,
          activeCompanies,
          suspendedCompanies,
          trialCompanies,
          expiredCompanies,
          expiring7DaysCompanies,
          onlineCompaniesCount,
          totalUsers,
          totalCouriers,
          totalMerchants,
          totalOrders,
          ordersToday,
          ordersThisMonth,
          totalRevenue,
          revenueToday,
          revenueThisMonth,
          totalPaymentsCount: payments.length,
          activeSubscriptions,
          trialSubscriptions,
          expiredSubscriptions,
        },
        charts: {
          daily: dailyChartData,
          monthly: monthlyChartData,
        }
      });
    } catch (err: any) {
      console.error('Super Admin Dashboard stats error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // 4. COMPANIES DIRECTORY & MANAGEMENT
  // ============================================================================

  router.get('/api/super-admin/companies', requireSuperAdmin, requirePermission('companies.view'), async (_req, res) => {
    try {
      const supabase = getDbClient();
      let companies: any[] = [];
      let couriers: any[] = [];
      let merchants: any[] = [];
      let orders: any[] = [];
      let profiles: any[] = [];
      let subscriptions: any[] = [];

      if (supabase) {
        const [compRes, courRes, merRes, ordRes, profRes, subRes] = await Promise.all([
          supabase.from('companies').select('*').order('created_at', { ascending: false }),
          supabase.from('couriers').select('id, company_id, status'),
          supabase.from('merchants').select('id, company_id, status'),
          supabase.from('orders').select('id, company_id, cod_amount'),
          supabase.from('profiles').select('id, company_id, full_name, phone, auth_user_id, role').eq('role', 'admin'),
          supabase.from('platform_subscriptions').select('*'),
        ]);

        companies = compRes.data || [];
        couriers = courRes.data || [];
        merchants = merRes.data || [];
        orders = ordRes.data || [];
        profiles = profRes.data || [];
        subscriptions = subRes.data || [];
      }

      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

      const enrichedCompanies = companies.map(comp => {
        const compCouriers = couriers.filter(c => c.company_id === comp.id);
        const compMerchants = merchants.filter(m => m.company_id === comp.id);
        const compOrders = orders.filter(o => o.company_id === comp.id);
        const compAdmin = profiles.find(p => p.company_id === comp.id);
        const compSub = subscriptions.find(s => s.company_id === comp.id);

        // Presence check
        let isOnline = false;
        let lastSeenAt: string | undefined;
        memoryPresence.forEach(pres => {
          if (pres.company_id === comp.id) {
            if (new Date(pres.last_seen_at) >= threeMinutesAgo) {
              isOnline = true;
            }
            if (!lastSeenAt || new Date(pres.last_seen_at) > new Date(lastSeenAt)) {
              lastSeenAt = pres.last_seen_at;
            }
          }
        });

        const totalCod = compOrders.reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);

        return {
          ...comp,
          status: comp.status || 'active',
          couriers_count: compCouriers.length,
          active_couriers_count: compCouriers.filter(c => c.status === 'active').length,
          merchants_count: compMerchants.length,
          orders_count: compOrders.length,
          total_cod_volume: totalCod,
          is_online: isOnline,
          last_seen_at: lastSeenAt,
          latest_subscription: compSub || null,
          admin_profile: compAdmin ? {
            full_name: compAdmin.full_name,
            email: comp.email,
            phone: compAdmin.phone || comp.phone,
          } : undefined,
        };
      });

      return res.json({
        success: true,
        companies: enrichedCompanies,
      });
    } catch (err: any) {
      console.error('Super Admin get companies error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get single company full details
  router.get('/api/super-admin/companies/:id', requireSuperAdmin, requirePermission('companies.view'), async (req, res) => {
    try {
      const companyId = req.params.id;
      const supabase = getDbClient();
      if (!supabase) {
        return res.status(404).json({ success: false, error: 'قاعدة البيانات غير متصلة' });
      }

      const [compRes, courRes, merRes, ordRes, profRes, subRes, payRes, actRes] = await Promise.all([
        supabase.from('companies').select('*').eq('id', companyId).maybeSingle(),
        supabase.from('couriers').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
        supabase.from('merchants').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
        supabase.from('orders').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(50),
        supabase.from('profiles').select('*').eq('company_id', companyId),
        supabase.from('platform_subscriptions').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
        supabase.from('platform_payments').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
        supabase.from('platform_activity_logs').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(30),
      ]);

      if (!compRes.data) {
        return res.status(404).json({ success: false, error: 'الشركة غير موجودة' });
      }

      const comp = compRes.data;
      const couriers = courRes.data || [];
      const merchants = merRes.data || [];
      const orders = ordRes.data || [];
      const profiles = profRes.data || [];
      const subscriptions = subRes.data || [];
      const payments = payRes.data || [];
      const activityLogs = actRes.data || [];

      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
      let isOnline = false;
      let lastSeenAt: string | undefined;
      let activeUsersCount = 0;

      memoryPresence.forEach(pres => {
        if (pres.company_id === companyId) {
          if (new Date(pres.last_seen_at) >= threeMinutesAgo) {
            isOnline = true;
            activeUsersCount++;
          }
          if (!lastSeenAt || new Date(pres.last_seen_at) > new Date(lastSeenAt)) {
            lastSeenAt = pres.last_seen_at;
          }
        }
      });

      return res.json({
        success: true,
        company: {
          ...comp,
          status: comp.status || 'active',
          is_online: isOnline,
          last_seen_at: lastSeenAt,
          active_users_online_count: activeUsersCount,
          couriers,
          merchants,
          recent_orders: orders,
          profiles,
          subscriptions,
          payments,
          activity_logs: activityLogs,
        }
      });
    } catch (err: any) {
      console.error('Super Admin get company details error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Change Company Status (Activate, Suspend, Disable, Reactivate)
  router.post('/api/super-admin/companies/:id/status', requireSuperAdmin, requirePermission('companies.suspend', 'companies.manage', 'companies.edit'), async (req, res) => {
    try {
      const companyId = req.params.id;
      const { status, reason } = req.body || {};
      const admin = (req as any).superAdmin;

      if (!['active', 'suspended', 'disabled', 'trial', 'expired'].includes(status)) {
        return res.status(400).json({ success: false, error: 'حالة الشركة غير صالحة' });
      }

      const supabase = getDbClient();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'قاعدة البيانات غير متصلة' });
      }

      const { data: comp, error: fetchError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (fetchError || !comp) {
        return res.status(404).json({ success: false, error: 'الشركة غير موجودة' });
      }

      const { data: updated, error: updateError } = await supabase
        .from('companies')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', companyId)
        .select('*')
        .single();

      if (updateError) {
        return res.status(500).json({ success: false, error: updateError.message });
      }

      // Log activity
      const statusLabels: Record<string, string> = {
        active: 'تفعيل',
        suspended: 'إيقاف مؤقت',
        disabled: 'تعطيل كامل',
        trial: 'فترة تجريبية',
        expired: 'انتهاء اشتراك',
      };

      logActivity(
        admin.full_name,
        `change_company_status_${status}`,
        'company',
        companyId,
        `تم ${statusLabels[status] || status} لشركة "${comp.name}" ${reason ? `(السبب: ${reason})` : ''}`,
        { oldStatus: comp.status, newStatus: status, reason },
        admin.id,
        companyId
      );

      return res.json({
        success: true,
        message: `تم تحديث حالة الشركة بنجاح إلى: ${statusLabels[status] || status}`,
        company: updated,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Extend or modify company subscription
  router.post('/api/super-admin/companies/:id/subscription', requireSuperAdmin, requirePermission('subscriptions.edit', 'subscriptions.manage'), async (req, res) => {
    try {
      const companyId = req.params.id;
      const { extensionDays, endDate, planCode, planName, isTrial } = req.body || {};
      const admin = (req as any).superAdmin;

      const supabase = getDbClient();
      if (!supabase) {
        return res.status(500).json({ success: false, error: 'قاعدة البيانات غير متصلة' });
      }

      const { data: comp } = await supabase.from('companies').select('*').eq('id', companyId).single();
      if (!comp) {
        return res.status(404).json({ success: false, error: 'الشركة غير موجودة' });
      }

      let newEndDate = endDate;
      if (extensionDays && Number(extensionDays) > 0) {
        const currentEnd = comp.subscription_end_date ? new Date(comp.subscription_end_date) : new Date();
        const baseDate = currentEnd > new Date() ? currentEnd : new Date();
        baseDate.setDate(baseDate.getDate() + Number(extensionDays));
        newEndDate = baseDate.toISOString().split('T')[0];
      }

      const updates: any = {
        updated_at: new Date().toISOString(),
        status: 'active',
      };

      if (newEndDate) updates.subscription_end_date = newEndDate;
      if (planCode) updates.plan_code = planCode;
      if (planName) updates.plan_name = planName;
      if (isTrial !== undefined) updates.is_trial = Boolean(isTrial);

      const { data: updated, error: updateError } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', companyId)
        .select('*')
        .single();

      if (updateError) {
        return res.status(500).json({ success: false, error: updateError.message });
      }

      // Upsert into platform_subscriptions
      await supabase.from('platform_subscriptions').insert([
        {
          company_id: companyId,
          plan_code: planCode || comp.plan_code || 'growth',
          plan_name: planName || comp.plan_name || 'باقة النمو (Growth)',
          start_date: new Date().toISOString().split('T')[0],
          end_date: newEndDate || comp.subscription_end_date,
          status: isTrial ? 'trial' : 'active',
          payment_status: 'paid',
        }
      ]);

      logActivity(
        admin.full_name,
        'modify_subscription',
        'subscription',
        companyId,
        `تم تعديل وتمديد اشتراك شركة "${comp.name}" حتى ${newEndDate}`,
        { extensionDays, newEndDate, planCode, planName },
        admin.id,
        companyId
      );

      return res.json({
        success: true,
        message: 'تم تمديد وتحديث اشتراك الشركة بنجاح',
        company: updated,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // 5. SUBSCRIPTIONS & PLANS MANAGEMENT
  // ============================================================================

  router.get('/api/super-admin/subscriptions', requireSuperAdmin, requirePermission('subscriptions.view'), async (_req, res) => {
    try {
      const supabase = getDbClient();
      let subscriptions: any[] = [];
      let plans: any[] = [];
      let companies: any[] = [];

      if (supabase) {
        const [subRes, planRes, compRes] = await Promise.all([
          supabase.from('platform_subscriptions').select('*').order('created_at', { ascending: false }),
          supabase.from('platform_subscription_plans').select('*').order('price', { ascending: true }),
          supabase.from('companies').select('id, name, email, phone, status, plan_code, plan_name, subscription_end_date, is_trial'),
        ]);

        subscriptions = subRes.data || [];
        plans = planRes.data || [];
        companies = compRes.data || [];
      }

      // Join company names
      const enrichedSubs = subscriptions.map(sub => {
        const comp = companies.find(c => c.id === sub.company_id);
        const daysRemaining = sub.end_date ? Math.ceil((new Date(sub.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
        return {
          ...sub,
          company_name: comp?.name || 'شركة غير محددة',
          company_email: comp?.email,
          company_phone: comp?.phone,
          days_remaining: daysRemaining,
        };
      });

      return res.json({
        success: true,
        subscriptions: enrichedSubs,
        plans,
        companies,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Create or Update Plan
  router.post('/api/super-admin/plans', requireSuperAdmin, requirePermission('subscriptions.edit', 'subscriptions.manage'), async (req, res) => {
    try {
      const { name, code, price, currency, billing_cycle, trial_days, order_limit, courier_limit, merchant_limit, features, is_active } = req.body || {};
      const admin = (req as any).superAdmin;

      if (!name || !code || price === undefined) {
        return res.status(400).json({ success: false, error: 'يرجى إدخال اسم وكود وسعر الخطة' });
      }

      const supabase = getDbClient();
      if (!supabase) return res.status(500).json({ success: false, error: 'قاعدة البيانات غير متصلة' });

      const newPlan = {
        name,
        code: code.trim().toLowerCase(),
        price: Number(price) || 0,
        currency: currency || 'EGP',
        billing_cycle: billing_cycle || 'monthly',
        trial_days: Number(trial_days) || 14,
        order_limit: Number(order_limit) || 1000,
        courier_limit: Number(courier_limit) || 10,
        merchant_limit: Number(merchant_limit) || 50,
        features: Array.isArray(features) ? features : [],
        is_active: is_active !== false,
      };

      const { data: created, error } = await supabase
        .from('platform_subscription_plans')
        .insert([newPlan])
        .select('*')
        .single();

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      logActivity(
        admin.full_name,
        'create_plan',
        'plan',
        created.id,
        `تم إنشاء باقة اشتراك جديدة: ${name} (${price} ${currency || 'EGP'})`,
        newPlan,
        admin.id
      );

      return res.json({ success: true, plan: created });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  router.put('/api/super-admin/plans/:id', requireSuperAdmin, requirePermission('subscriptions.edit', 'subscriptions.manage'), async (req, res) => {
    try {
      const planId = req.params.id;
      const raw = req.body || {};
      const admin = (req as any).superAdmin;

      const supabase = getDbClient();
      if (!supabase) return res.status(500).json({ success: false, error: 'قاعدة البيانات غير متصلة' });

      const updates: any = { updated_at: new Date().toISOString() };
      if (raw.name) updates.name = raw.name;
      if (raw.price !== undefined) updates.price = Number(raw.price);
      if (raw.currency) updates.currency = raw.currency;
      if (raw.billing_cycle) updates.billing_cycle = raw.billing_cycle;
      if (raw.trial_days !== undefined) updates.trial_days = Number(raw.trial_days);
      if (raw.order_limit !== undefined) updates.order_limit = Number(raw.order_limit);
      if (raw.courier_limit !== undefined) updates.courier_limit = Number(raw.courier_limit);
      if (raw.merchant_limit !== undefined) updates.merchant_limit = Number(raw.merchant_limit);
      if (Array.isArray(raw.features)) updates.features = raw.features;
      if (raw.is_active !== undefined) updates.is_active = Boolean(raw.is_active);

      const { data: updated, error } = await supabase
        .from('platform_subscription_plans')
        .update(updates)
        .eq('id', planId)
        .select('*')
        .single();

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      logActivity(
        admin.full_name,
        'update_plan',
        'plan',
        planId,
        `تم تعديل باقة الاشتراك: ${updated.name}`,
        updates,
        admin.id
      );

      return res.json({ success: true, plan: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // 6. PAYMENTS & REVENUE MANAGEMENT
  // ============================================================================

  router.get('/api/super-admin/payments', requireSuperAdmin, requirePermission('payments.view'), async (_req, res) => {
    try {
      const supabase = getDbClient();
      let payments: any[] = [];
      let companies: any[] = [];

      if (supabase) {
        const [payRes, compRes] = await Promise.all([
          supabase.from('platform_payments').select('*').order('payment_date', { ascending: false }),
          supabase.from('companies').select('id, name'),
        ]);
        payments = payRes.data || [];
        companies = compRes.data || [];
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const currentMonthStr = todayStr.substring(0, 7);

      const successful = payments.filter(p => p.status === 'paid');
      const totalRevenue = successful.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const revenueToday = successful.filter(p => p.payment_date && p.payment_date.startsWith(todayStr)).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const revenueThisMonth = successful.filter(p => p.payment_date && p.payment_date.startsWith(currentMonthStr)).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const pendingCount = payments.filter(p => p.status === 'pending').length;
      const failedCount = payments.filter(p => p.status === 'failed').length;
      const refundCount = payments.filter(p => p.status === 'refunded').length;

      const enriched = payments.map(p => {
        const comp = companies.find(c => c.id === p.company_id);
        return {
          ...p,
          company_name: comp?.name || 'شركة غير محددة',
        };
      });

      return res.json({
        success: true,
        payments: enriched,
        summary: {
          totalRevenue,
          revenueToday,
          revenueThisMonth,
          pendingCount,
          failedCount,
          refundCount,
          totalTransactions: payments.length,
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Create Manual Platform Payment Record
  router.post('/api/super-admin/payments', requireSuperAdmin, requirePermission('payments.edit', 'payments.manage', 'payments.create'), async (req, res) => {
    try {
      const { company_id, plan_name, amount, currency, payment_method, transaction_id, status, notes } = req.body || {};
      const admin = (req as any).superAdmin;

      if (!company_id || !amount) {
        return res.status(400).json({ success: false, error: 'يرجى تحديد الشركة وقيمة الدفعة' });
      }

      const supabase = getDbClient();
      if (!supabase) return res.status(500).json({ success: false, error: 'قاعدة البيانات غير متصلة' });

      const paymentNumber = `PAY-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      const newPayment = {
        payment_number: paymentNumber,
        company_id,
        plan_name: plan_name || 'اشتراك شهري',
        amount: Number(amount) || 0,
        currency: currency || 'EGP',
        payment_method: payment_method || 'instapay',
        transaction_id: transaction_id || null,
        status: status || 'paid',
        payment_date: new Date().toISOString(),
        created_by: admin.full_name,
        notes: notes || null,
      };

      const { data: created, error } = await supabase
        .from('platform_payments')
        .insert([newPayment])
        .select('*')
        .single();

      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      logActivity(
        admin.full_name,
        'create_payment',
        'payment',
        created.id,
        `تسجيل دفعة جديدة بقيمة ${amount} ${currency || 'EGP'} (رقم: ${paymentNumber})`,
        newPayment,
        admin.id,
        company_id
      );

      return res.json({ success: true, payment: created });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Refund or Update Payment Status
  router.post('/api/super-admin/payments/:id/status', requireSuperAdmin, requirePermission('payments.refund', 'payments.manage', 'payments.edit'), async (req, res) => {
    try {
      const paymentId = req.params.id;
      const { status, reason } = req.body || {};
      const admin = (req as any).superAdmin;

      const supabase = getDbClient();
      if (!supabase) return res.status(500).json({ success: false, error: 'قاعدة البيانات غير متصلة' });

      const { data: pay } = await supabase.from('platform_payments').select('*').eq('id', paymentId).single();
      if (!pay) return res.status(404).json({ success: false, error: 'العملية غير موجودة' });

      const { data: updated, error } = await supabase
        .from('platform_payments')
        .update({
          status,
          notes: reason ? `${pay.notes ? pay.notes + ' | ' : ''}تحديث الحالة: ${reason}` : pay.notes,
        })
        .eq('id', paymentId)
        .select('*')
        .single();

      if (error) return res.status(400).json({ success: false, error: error.message });

      logActivity(
        admin.full_name,
        `payment_status_${status}`,
        'payment',
        paymentId,
        `تعديل حالة الدفعة (${pay.payment_number}) إلى ${status}`,
        { oldStatus: pay.status, newStatus: status, reason },
        admin.id,
        pay.company_id
      );

      return res.json({ success: true, payment: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // 7. ONLINE PRESENCE DIRECTORY
  // ============================================================================

  router.get('/api/super-admin/presence', requireSuperAdmin, requirePermission('online.view', 'dashboard.view'), async (_req, res) => {
    try {
      const supabase = getDbClient();
      let companies: any[] = [];
      if (supabase) {
        const { data } = await supabase.from('companies').select('id, name');
        companies = data || [];
      }

      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
      const onlineSessions: any[] = [];

      memoryPresence.forEach((pres, key) => {
        const lastSeen = new Date(pres.last_seen_at);
        const isOnline = lastSeen >= threeMinutesAgo;
        const comp = companies.find(c => c.id === pres.company_id);
        const durationMinutes = Math.max(1, Math.round((Date.now() - new Date(pres.session_started_at || pres.last_seen_at).getTime()) / (1000 * 60)));

        onlineSessions.push({
          id: key,
          ...pres,
          company_name: comp?.name || 'شركة غير محددة',
          is_online: isOnline,
          session_duration_minutes: durationMinutes,
        });
      });

      // Sort online first, then latest seen
      onlineSessions.sort((a, b) => {
        if (a.is_online && !b.is_online) return -1;
        if (!a.is_online && b.is_online) return 1;
        return new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime();
      });

      return res.json({
        success: true,
        sessions: onlineSessions,
        onlineCount: onlineSessions.filter(s => s.is_online).length,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // 8. WEBSITE ANALYTICS (1st Party Unique Daily Visitors)
  // ============================================================================

  router.get('/api/super-admin/analytics', requireSuperAdmin, requirePermission('analytics.view'), async (_req, res) => {
    try {
      const supabase = getDbClient();
      let dbAnalytics: any[] = [];
      if (supabase) {
        const { data } = await supabase.from('platform_analytics_daily').select('*').order('visit_date', { ascending: false }).limit(5000);
        dbAnalytics = data || [];
      }

      // Merge with memoryAnalytics
      const allAnalyticsMap = new Map<string, any>();
      dbAnalytics.forEach(item => {
        allAnalyticsMap.set(`${item.visitor_id}_${item.visit_date}`, item);
      });
      memoryAnalytics.forEach((item, key) => {
        allAnalyticsMap.set(key, item);
      });

      const records = Array.from(allAnalyticsMap.values());

      const todayStr = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const currentMonthStr = todayStr.substring(0, 7);

      const todayVisitors = records.filter(r => r.visit_date === todayStr).length;
      const yesterdayVisitors = records.filter(r => r.visit_date === yesterday).length;
      const thisMonthVisitors = records.filter(r => r.visit_date && r.visit_date.startsWith(currentMonthStr)).length;
      const totalVisitors = records.length;

      // Unique visitor counts across entire history for new vs returning
      const visitorSeenDates = new Map<string, string[]>();
      records.forEach(r => {
        const dates = visitorSeenDates.get(r.visitor_id) || [];
        dates.push(r.visit_date);
        visitorSeenDates.set(r.visitor_id, dates);
      });

      let newVisitorsToday = 0;
      let returningVisitorsToday = 0;
      records.filter(r => r.visit_date === todayStr).forEach(r => {
        const dates = visitorSeenDates.get(r.visitor_id) || [];
        if (dates.length <= 1) newVisitorsToday++;
        else returningVisitorsToday++;
      });

      // Device breakdown
      const devices = { desktop: 0, mobile: 0, tablet: 0 };
      records.forEach(r => {
        const d = (r.device_type || 'desktop').toLowerCase();
        if (d === 'mobile') devices.mobile++;
        else if (d === 'tablet') devices.tablet++;
        else devices.desktop++;
      });

      // Top pages
      const pageCounts: Record<string, number> = {};
      records.forEach(r => {
        const p = r.top_page || '/';
        pageCounts[p] = (pageCounts[p] || 0) + (r.page_views || 1);
      });
      const topPages = Object.entries(pageCounts)
        .map(([page, views]) => ({ page, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      // Last 30 days graph
      const chart30Days: any[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dStr = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
        const count = records.filter(r => r.visit_date === dStr).length;
        chart30Days.push({
          date: dStr,
          label: dayLabel,
          visitors: count,
        });
      }

      return res.json({
        success: true,
        metrics: {
          todayVisitors,
          yesterdayVisitors,
          thisMonthVisitors,
          totalVisitors,
          newVisitorsToday,
          returningVisitorsToday,
          devices,
          topPages,
          chart: chart30Days,
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // 9. STAFF & SUB-ADMINS MANAGEMENT
  // ============================================================================

  router.get('/api/super-admin/staff', requireSuperAdmin, requirePermission('staff.view'), async (_req, res) => {
    try {
      const supabase = getDbClient();
      if (!supabase) return res.status(500).json({ success: false, error: 'قاعدة البيانات غير متصلة' });

      const { data, error } = await supabase.from('platform_admins').select('*').order('created_at', { ascending: false });
      if (error) {
        return res.status(500).json({ success: false, error: 'فشل جلب قائمة الموظفين من قاعدة البيانات: ' + error.message });
      }
      const staff = data || [];

      const safeStaff = staff.map(s => {
        const copy = { ...s };
        delete copy.password_hash;
        return copy;
      });

      return res.json({ success: true, staff: safeStaff });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Create Staff
  router.post('/api/super-admin/staff', requireSuperAdmin, requirePermission('staff.create', 'staff.manage'), async (req, res) => {
    try {
      const { username, password, full_name, email, phone, role, permissions } = req.body || {};
      const callerAdmin = (req as any).superAdmin;

      if (!username || !password || !full_name) {
        return res.status(400).json({ success: false, error: 'يرجى إدخال اسم المستخدم وكلمة المرور والاسم بالكامل' });
      }

      const cleanUsername = username.trim().toLowerCase();
      const supabase = getDbClient();
      if (!supabase) return res.status(500).json({ success: false, error: 'قاعدة البيانات غير متصلة' });

      const { data: existing } = await supabase.from('platform_admins').select('id').ilike('username', cleanUsername).maybeSingle();
      if (existing) {
        return res.status(400).json({ success: false, error: 'اسم المستخدم مسجل مسبقاً' });
      }

      function getDefaultPermissionsForRole(r: string): string[] {
        switch (r) {
          case 'super_admin':
            return ['*'];
          case 'operations':
            return [
              'dashboard.view',
              'companies.view',
              'companies.manage',
              'companies.edit',
              'online.view',
              'analytics.view',
              'audit.view',
              'activity_logs.view',
            ];
          case 'finance':
            return [
              'dashboard.view',
              'companies.view',
              'subscriptions.view',
              'subscriptions.edit',
              'subscriptions.manage',
              'payments.view',
              'payments.manage',
              'analytics.view',
            ];
          case 'support':
            return [
              'dashboard.view',
              'companies.view',
              'online.view',
              'settings.view',
            ];
          case 'viewer':
            return [
              'dashboard.view',
              'companies.view',
              'subscriptions.view',
              'payments.view',
              'online.view',
              'analytics.view',
              'audit.view',
              'activity_logs.view',
              'settings.view',
            ];
          default:
            return ['dashboard.view', 'companies.view'];
        }
      }

      const assignedRole = role || 'support';
      const assignedPermissions = Array.isArray(permissions) && permissions.length > 0
        ? permissions
        : getDefaultPermissionsForRole(assignedRole);

      const passwordHash = hashPassword(password);
      const newStaff: any = {
        username: cleanUsername,
        password_hash: passwordHash,
        full_name: full_name.trim(),
        email: email ? email.trim() : null,
        phone: phone ? phone.trim() : null,
        role: assignedRole,
        permissions: assignedPermissions,
        status: 'active',
        is_primary: false,
      };

      const { data, error } = await supabase.from('platform_admins').insert([newStaff]).select('*').single();
      if (error) {
        return res.status(500).json({ success: false, error: 'فشل حفظ الموظف في قاعدة البيانات: ' + error.message });
      }

      logActivity(
        callerAdmin.full_name,
        'create_staff',
        'staff',
        data.id,
        `تم إنشاء حساب موظف جديد: ${full_name} (${cleanUsername}) بدور ${role || 'staff'}`,
        { role, permissions },
        callerAdmin.id
      );

      const safe = { ...data };
      delete safe.password_hash;
      return res.json({ success: true, staff: safe });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Edit Staff (permissions, role, status)
  router.put('/api/super-admin/staff/:id', requireSuperAdmin, requirePermission('staff.edit', 'staff.manage'), async (req, res) => {
    try {
      const staffId = req.params.id;
      const { full_name, email, phone, role, permissions, status } = req.body || {};
      const callerAdmin = (req as any).superAdmin;

      const supabase = getDbClient();
      if (!supabase) return res.status(500).json({ success: false, error: 'قاعدة البيانات غير متصلة' });

      const { data: target } = await supabase.from('platform_admins').select('*').eq('id', staffId).single();
      if (!target) return res.status(404).json({ success: false, error: 'الموظف غير موجود' });

      // Protection: Primary Admin cannot be disabled or stripped of super_admin role
      if (target.is_primary && (status === 'disabled' || role !== 'super_admin')) {
        return res.status(403).json({ success: false, error: 'لا يمكن تعطيل أو خفض صلاحيات الحساب الرئيسي للمنصة' });
      }

      const updates: any = { updated_at: new Date().toISOString() };
      if (full_name) updates.full_name = full_name;
      if (email !== undefined) updates.email = email;
      if (phone !== undefined) updates.phone = phone;
      if (role && !target.is_primary) updates.role = role;
      if (Array.isArray(permissions) && !target.is_primary) updates.permissions = permissions;
      if (status && !target.is_primary) updates.status = status;

      const { data: updated, error } = await supabase
        .from('platform_admins')
        .update(updates)
        .eq('id', staffId)
        .select('*')
        .single();

      if (error) return res.status(400).json({ success: false, error: error.message });

      logActivity(
        callerAdmin.full_name,
        'update_staff',
        'staff',
        staffId,
        `تم تعديل بيانات وصلاحيات الموظف: ${target.full_name}`,
        updates,
        callerAdmin.id
      );

      const safe = { ...updated };
      delete safe.password_hash;
      return res.json({ success: true, staff: safe });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Reset Staff Password
  router.post('/api/super-admin/staff/:id/password', requireSuperAdmin, requirePermission('staff.edit', 'staff.manage'), async (req, res) => {
    try {
      const staffId = req.params.id;
      const { newPassword } = req.body || {};
      const callerAdmin = (req as any).superAdmin;

      if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ success: false, error: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' });
      }

      const supabase = getDbClient();
      if (!supabase) return res.status(500).json({ success: false, error: 'قاعدة البيانات غير متصلة' });

      const newHash = hashPassword(newPassword);
      const { error } = await supabase
        .from('platform_admins')
        .update({ password_hash: newHash, updated_at: new Date().toISOString() })
        .eq('id', staffId);

      if (error) return res.status(400).json({ success: false, error: error.message });

      logActivity(
        callerAdmin.full_name,
        'reset_staff_password',
        'staff',
        staffId,
        `تمت إعادة تعيين كلمة المرور للموظف`,
        {},
        callerAdmin.id
      );

      return res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete/Disable Staff
  router.delete('/api/super-admin/staff/:id', requireSuperAdmin, requirePermission('staff.delete', 'staff.manage'), async (req, res) => {
    try {
      const staffId = req.params.id;
      const callerAdmin = (req as any).superAdmin;

      const supabase = getDbClient();
      if (!supabase) return res.status(500).json({ success: false, error: 'قاعدة البيانات غير متصلة' });

      const { data: target } = await supabase.from('platform_admins').select('*').eq('id', staffId).single();
      if (!target) return res.status(404).json({ success: false, error: 'الموظف غير موجود' });

      if (target.is_primary) {
        return res.status(403).json({ success: false, error: 'لا يمكن حذف الحساب الرئيسي للمنصة' });
      }

      const { error } = await supabase.from('platform_admins').delete().eq('id', staffId);
      if (error) return res.status(400).json({ success: false, error: error.message });

      logActivity(
        callerAdmin.full_name,
        'delete_staff',
        'staff',
        staffId,
        `تم حذف حساب الموظف: ${target.full_name} (${target.username})`,
        {},
        callerAdmin.id
      );

      return res.json({ success: true, message: 'تم حذف حساب الموظف بنجاح' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // 10. ACTIVITY LOGS & AUDIT TRAIL
  // ============================================================================

  router.get('/api/super-admin/activity-logs', requireSuperAdmin, requirePermission('activity_logs.view'), async (req, res) => {
    try {
      const supabase = getDbClient();
      let logs: any[] = [];
      const limit = Number(req.query.limit) || 100;
      const targetType = req.query.targetType as string;

      if (supabase) {
        let query = supabase.from('platform_activity_logs').select('*').order('created_at', { ascending: false }).limit(limit);
        if (targetType && targetType !== 'all') {
          query = query.eq('target_type', targetType);
        }
        const { data } = await query;
        logs = data || [];
      }

      return res.json({ success: true, logs });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // 11. SYSTEM HEALTH DIAGNOSTICS
  // ============================================================================

  router.get('/api/super-admin/system-health', requireSuperAdmin, requirePermission('settings.view', 'dashboard.view'), async (_req, res) => {
    try {
      const supabase = getDbClient();
      let dbStatus: 'online' | 'warning' | 'error' = 'online';
      let supabaseStatus: 'online' | 'warning' | 'error' = 'online';
      let authStatus: 'online' | 'warning' | 'error' = 'online';
      let realtimeStatus: 'online' | 'warning' | 'error' = 'online';
      let storageStatus: 'online' | 'warning' | 'error' = 'online';

      if (!supabase) {
        dbStatus = 'warning';
        supabaseStatus = 'warning';
      } else {
        try {
          const { error } = await supabase.from('companies').select('id').limit(1);
          if (error) dbStatus = 'error';
        } catch {
          dbStatus = 'error';
        }
      }

      const memoryUsage = process.memoryUsage();
      const uptimeSeconds = Math.floor(process.uptime());

      return res.json({
        success: true,
        health: {
          database: dbStatus,
          supabase: supabaseStatus,
          auth: authStatus,
          realtime: realtimeStatus,
          storage: storageStatus,
          server_memory: {
            rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
            heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          },
          server_uptime_seconds: uptimeSeconds,
          checked_at: new Date().toISOString(),
        }
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // 12. PLATFORM SETTINGS & MAINTENANCE MODE
  // ============================================================================

  router.get('/api/super-admin/settings', requireSuperAdmin, requirePermission('settings.view'), async (_req, res) => {
    try {
      const supabase = getDbClient();
      if (supabase) {
        const { data } = await supabase.from('platform_settings').select('value').eq('key', 'general').maybeSingle();
        if (data && data.value) {
          platformSettingsCache = { ...platformSettingsCache, ...data.value };
        }
      }
      return res.json({ success: true, settings: platformSettingsCache });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  router.put('/api/super-admin/settings', requireSuperAdmin, requirePermission('settings.edit', 'settings.manage'), async (req, res) => {
    try {
      const raw = req.body || {};
      const admin = (req as any).superAdmin;

      platformSettingsCache = {
        ...platformSettingsCache,
        ...raw,
      };

      const supabase = getDbClient();
      if (supabase) {
        await supabase.from('platform_settings').upsert({
          key: 'general',
          value: platformSettingsCache,
          updated_at: new Date().toISOString(),
        });
      }

      logActivity(
        admin.full_name,
        'update_platform_settings',
        'settings',
        'general',
        `تحديث إعدادات المنصة العامة ${raw.maintenance_mode !== undefined ? `(وضع الصيانة: ${raw.maintenance_mode ? 'مفعل' : 'معطل'})` : ''}`,
        raw,
        admin.id
      );

      return res.json({ success: true, settings: platformSettingsCache });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // 13. GLOBAL SEARCH
  // ============================================================================

  router.get('/api/super-admin/search', requireSuperAdmin, requirePermission('dashboard.view', 'companies.view'), async (req, res) => {
    try {
      const q = ((req.query.q as string) || '').trim();
      if (!q || q.length < 2) {
        return res.json({ success: true, results: [] });
      }

      const supabase = getDbClient();
      if (!supabase) return res.json({ success: true, results: [] });

      const [compRes, ordRes, merRes, courRes, payRes] = await Promise.all([
        supabase.from('companies').select('id, name, phone, email, status').or(`name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`).limit(5),
        supabase.from('orders').select('id, order_number, customer_name, customer_phone, status, cod_amount, company_id').or(`order_number.ilike.%${q}%,customer_phone.ilike.%${q}%,customer_name.ilike.%${q}%`).limit(5),
        supabase.from('merchants').select('id, store_name, phone, company_id, status').or(`store_name.ilike.%${q}%,phone.ilike.%${q}%`).limit(5),
        supabase.from('couriers').select('id, full_name, employee_id, phone, company_id, status').or(`full_name.ilike.%${q}%,employee_id.ilike.%${q}%,phone.ilike.%${q}%`).limit(5),
        supabase.from('platform_payments').select('id, payment_number, amount, status, company_id').or(`payment_number.ilike.%${q}%`).limit(5),
      ]);

      const results: any[] = [];

      (compRes.data || []).forEach(c => results.push({ type: 'company', title: c.name, subtitle: `${c.email} | ${c.phone}`, id: c.id, status: c.status }));
      (ordRes.data || []).forEach(o => results.push({ type: 'order', title: `شحنة #${o.order_number}`, subtitle: `${o.customer_name} (${o.customer_phone}) - ${o.cod_amount} ج.م`, id: o.id, companyId: o.company_id, status: o.status }));
      (merRes.data || []).forEach(m => results.push({ type: 'merchant', title: `متجر: ${m.store_name}`, subtitle: `هاتف: ${m.phone}`, id: m.id, companyId: m.company_id, status: m.status }));
      (courRes.data || []).forEach(cr => results.push({ type: 'courier', title: `مندوب: ${cr.full_name} (${cr.employee_id})`, subtitle: `هاتف: ${cr.phone}`, id: cr.id, companyId: cr.company_id, status: cr.status }));
      (payRes.data || []).forEach(p => results.push({ type: 'payment', title: `دفعة: ${p.payment_number}`, subtitle: `${p.amount} ج.م - ${p.status}`, id: p.id, companyId: p.company_id, status: p.status }));

      return res.json({ success: true, results });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });
}
