import express from 'express';
import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { setupSuperAdminRoutes } from './superAdminRoutes';

dotenv.config();

function normalizeUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let trimmed = rawUrl.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (!trimmed.includes('.') && !trimmed.includes('/')) {
    return `https://${trimmed}.supabase.co`;
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.origin;
    }
  } catch (_) {
    return '';
  }
  return '';
}

export function createExpressApp(): express.Express {
  const app = express();

  // Basic CORS & Pre-flight
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    if (req.method === 'OPTIONS') {
      return res.status(200).json({ status: 'ok' });
    }
    next();
  });

  app.use(express.json());

  // Safe Request Logger (never logs passwords or tokens)
  app.use('/api', (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[API] ${req.method} ${req.originalUrl || req.url} -> ${res.statusCode} (${duration}ms)`);
    });
    next();
  });

  const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseUrl = normalizeUrl(rawUrl);
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

  // 1. Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'delixa-backend',
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================================================
  // CUSTOMER SHIPMENT CONFIRMATION & SELF-SERVICE PUBLIC API ENDPOINTS
  // ============================================================================

  function formatPublicShipment(order: any, merchant: any = null, company: any = null) {
    return {
      token: order.confirmation_token,
      order_number: order.order_number,
      status: order.status,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_address: order.customer_address,
      city_area: order.city_area,
      governorate: order.governorate,
      customer_landmark: order.customer_landmark,
      cod_amount: Number(order.cod_amount) || 0,
      delivery_date: order.delivery_date,
      delivery_from: order.delivery_from,
      delivery_to: order.delivery_to,
      customer_response_status: order.customer_response_status || 'pending',
      customer_responded_at: order.customer_responded_at,
      customer_selected_date: order.customer_selected_date,
      customer_selected_from: order.customer_selected_from,
      customer_selected_to: order.customer_selected_to,
      customer_note: order.customer_note,
      customer_cancellation_reason: order.customer_cancellation_reason,
      created_at: order.created_at,
      link_opened_at: order.link_opened_at,
      last_link_opened_at: order.last_link_opened_at,
      link_open_count: order.link_open_count || 0,
      merchant: merchant ? {
        store_name: merchant.store_name,
        brand_name: merchant.brand_name || null,
        phone: merchant.phone || null,
        whatsapp: merchant.whatsapp || null,
        logo_url: merchant.logo_url || null,
      } : null,
      company: company ? {
        name: company.name || 'Delixa Logistics',
        phone: company.phone || null,
      } : null,
    };
  }

  // GET /api/customer/shipment/:token -> Fetch shipment details & record link open
  app.get('/api/customer/shipment/:token', async (req, res) => {
    try {
      const rawToken = (req.params.token || '').trim();
      if (!rawToken) {
        return res.status(400).json({ success: false, code: 'INVALID_TOKEN', error: 'رمز الرابط غير صالح' });
      }

      if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(503).json({ success: false, code: 'DB_UNAVAILABLE', error: 'خدمة قاعدة البيانات غير متوفرة حالياً' });
      }

      const dbClient = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // 1. Fetch Order by confirmation_token
      const { data: order, error: orderError } = await dbClient
        .from('orders')
        .select('*')
        .eq('confirmation_token', rawToken)
        .maybeSingle();

      if (orderError) {
        console.error('Customer shipment fetch error:', orderError);
        return res.status(500).json({ success: false, code: 'SERVER_ERROR', error: 'حدث خطأ أثناء جلب بيانات الشحنة' });
      }

      if (!order) {
        return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'لم يتم العثور على الشحنة. قد يكون الرابط خاطئاً أو غير موجود.' });
      }

      // 2. Check Expiration
      if (order.confirmation_token_expires_at) {
        const expiresAt = new Date(order.confirmation_token_expires_at).getTime();
        if (!isNaN(expiresAt) && expiresAt < Date.now()) {
          return res.status(410).json({ success: false, code: 'EXPIRED', error: 'عذراً، هذا الرابط انتهت صلاحيته. يرجى التواصل مع المتجر أو شركة التوصيل.' });
        }
      }

      // 3. Record Link Opened in DB (Increment counter & update timestamps)
      const nowIso = new Date().toISOString();
      const newOpenCount = (order.link_open_count || 0) + 1;
      const updateData: Record<string, any> = {
        link_open_count: newOpenCount,
        last_link_opened_at: nowIso,
      };
      if (!order.link_opened_at) {
        updateData.link_opened_at = nowIso;
      }

      await dbClient.from('orders').update(updateData).eq('id', order.id);

      // Record Order Event in order_events table
      try {
        await dbClient.from('order_events').insert([{
          company_id: order.company_id,
          order_id: order.id,
          event_type: 'link_opened',
          actor: 'customer',
          actor_name: order.customer_name || 'العميل',
          details: `فتح العميل رابط التأكيد والتتبع من هاتفه (الفتح رقم ${newOpenCount})`,
          created_at: nowIso,
        }]);
      } catch (err: any) {
        console.warn('Order event link_opened log warning:', err?.message || err);
      }

      // 4. Fetch Merchant & Company info
      const [merchantRes, companyRes] = await Promise.all([
        order.merchant_id
          ? dbClient.from('merchants').select('store_name, brand_name, phone, whatsapp, logo_url').eq('id', order.merchant_id).maybeSingle()
          : Promise.resolve({ data: null }),
        order.company_id
          ? dbClient.from('companies').select('name, phone').eq('id', order.company_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const publicData = formatPublicShipment(
        { ...order, ...updateData },
        merchantRes.data,
        companyRes.data
      );

      return res.json({
        success: true,
        shipment: publicData,
      });
    } catch (err: any) {
      console.error('Customer shipment API exception:', err);
      return res.status(500).json({ success: false, code: 'SERVER_ERROR', error: err.message || 'حدث خطأ داخلي' });
    }
  });

  // POST /api/customer/shipment/:token/confirm -> Confirm delivery today
  app.post('/api/customer/shipment/:token/confirm', async (req, res) => {
    try {
      const rawToken = (req.params.token || '').trim();
      if (!rawToken) {
        return res.status(400).json({ success: false, code: 'INVALID_TOKEN', error: 'رمز الرابط غير صالح' });
      }

      const dbClient = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: order } = await dbClient.from('orders').select('*').eq('confirmation_token', rawToken).maybeSingle();
      if (!order) {
        return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'لم يتم العثور على الشحنة' });
      }

      if (order.status === 'delivered') {
        return res.status(400).json({ success: false, code: 'ALREADY_DELIVERED', error: 'تم تسليم هذه الشحنة بالفعل' });
      }
      if (order.status === 'cancelled') {
        return res.status(400).json({ success: false, code: 'ALREADY_CANCELLED', error: 'تم إلغاء هذه الشحنة مسبقاً' });
      }

      const note = typeof req.body?.note === 'string' ? req.body.note.trim() : null;
      const nowIso = new Date().toISOString();
      const updates: Record<string, any> = {
        customer_response_status: 'confirmed',
        customer_responded_at: nowIso,
        updated_at: nowIso,
      };
      if (note) updates.customer_note = note;

      const { data: updatedOrder, error: updateErr } = await dbClient
        .from('orders')
        .update(updates)
        .eq('id', order.id)
        .select('*')
        .single();

      if (updateErr) {
        return res.status(500).json({ success: false, error: updateErr.message });
      }

      try {
        await dbClient.from('order_events').insert([{
          company_id: order.company_id,
          order_id: order.id,
          event_type: 'customer_confirmed',
          actor: 'customer',
          actor_name: order.customer_name || 'العميل',
          details: note ? `أكد العميل استلام الشحنة اليوم. ملاحظة العميل: ${note}` : 'أكد العميل استلام الشحنة في الموعد المحدد اليوم',
          created_at: nowIso,
        }]);
      } catch (_) {}

      const [merchantRes, companyRes] = await Promise.all([
        order.merchant_id ? dbClient.from('merchants').select('store_name, brand_name, phone, whatsapp, logo_url').eq('id', order.merchant_id).maybeSingle() : Promise.resolve({ data: null }),
        order.company_id ? dbClient.from('companies').select('name, phone').eq('id', order.company_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);

      return res.json({
        success: true,
        message: 'تم تأكيد موعد استلام الشحنة بنجاح',
        shipment: formatPublicShipment(updatedOrder, merchantRes.data, companyRes.data),
      });
    } catch (err: any) {
      console.error('Customer confirm API exception:', err);
      return res.status(500).json({ success: false, error: err.message || 'حدث خطأ داخلي أثناء التأكيد' });
    }
  });

  // POST /api/customer/shipment/:token/reschedule -> Reschedule delivery date/slot
  app.post('/api/customer/shipment/:token/reschedule', async (req, res) => {
    try {
      const rawToken = (req.params.token || '').trim();
      if (!rawToken) {
        return res.status(400).json({ success: false, code: 'INVALID_TOKEN', error: 'رمز الرابط غير صالح' });
      }

      const { new_date, new_from, new_to, note } = req.body || {};
      if (!new_date) {
        return res.status(400).json({ success: false, error: 'يرجى اختيار تاريخ التوصيل الجديد' });
      }

      const dbClient = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: order } = await dbClient.from('orders').select('*').eq('confirmation_token', rawToken).maybeSingle();
      if (!order) {
        return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'لم يتم العثور على الشحنة' });
      }

      if (order.status === 'delivered') {
        return res.status(400).json({ success: false, code: 'ALREADY_DELIVERED', error: 'تم تسليم هذه الشحنة بالفعل ولا يمكن إعادة جدولتها' });
      }
      if (order.status === 'cancelled') {
        return res.status(400).json({ success: false, code: 'ALREADY_CANCELLED', error: 'تم إلغاء هذه الشحنة مسبقاً' });
      }

      const nowIso = new Date().toISOString();
      const slotFrom = new_from || '12:00';
      const slotTo = new_to || '16:00';
      const updates: Record<string, any> = {
        delivery_date: new_date,
        delivery_from: slotFrom,
        delivery_to: slotTo,
        customer_selected_date: new_date,
        customer_selected_from: slotFrom,
        customer_selected_to: slotTo,
        customer_response_status: 'reschedule_requested',
        customer_responded_at: nowIso,
        updated_at: nowIso,
      };
      if (typeof note === 'string' && note.trim()) {
        updates.customer_note = note.trim();
      }

      const { data: updatedOrder, error: updateErr } = await dbClient
        .from('orders')
        .update(updates)
        .eq('id', order.id)
        .select('*')
        .single();

      if (updateErr) {
        return res.status(500).json({ success: false, error: updateErr.message });
      }

      try {
        await dbClient.from('order_events').insert([{
          company_id: order.company_id,
          order_id: order.id,
          event_type: 'customer_rescheduled',
          actor: 'customer',
          actor_name: order.customer_name || 'العميل',
          details: `طلب العميل تأجيل موعد الاستلام إلى ${new_date} (بين ${slotFrom} و ${slotTo})${note ? ` - ملاحظة: ${note}` : ''}`,
          created_at: nowIso,
        }]);
      } catch (_) {}

      const [merchantRes, companyRes] = await Promise.all([
        order.merchant_id ? dbClient.from('merchants').select('store_name, brand_name, phone, whatsapp, logo_url').eq('id', order.merchant_id).maybeSingle() : Promise.resolve({ data: null }),
        order.company_id ? dbClient.from('companies').select('name, phone').eq('id', order.company_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);

      return res.json({
        success: true,
        message: 'تم تسجيل طلب تعديل موعد الاستلام بنجاح',
        shipment: formatPublicShipment(updatedOrder, merchantRes.data, companyRes.data),
      });
    } catch (err: any) {
      console.error('Customer reschedule API exception:', err);
      return res.status(500).json({ success: false, error: err.message || 'حدث خطأ داخلي أثناء إعادة الجدولة' });
    }
  });

  // POST /api/customer/shipment/:token/cancel -> Cancel shipment
  app.post('/api/customer/shipment/:token/cancel', async (req, res) => {
    try {
      const rawToken = (req.params.token || '').trim();
      if (!rawToken) {
        return res.status(400).json({ success: false, code: 'INVALID_TOKEN', error: 'رمز الرابط غير صالح' });
      }

      const dbClient = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: order } = await dbClient.from('orders').select('*').eq('confirmation_token', rawToken).maybeSingle();
      if (!order) {
        return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'لم يتم العثور على الشحنة' });
      }

      if (order.status === 'delivered') {
        return res.status(400).json({ success: false, code: 'ALREADY_DELIVERED', error: 'لا يمكن إلغاء شحنة تم تسليمها بالفعل' });
      }

      const reason = typeof req.body?.reason === 'string' && req.body.reason.trim()
        ? req.body.reason.trim()
        : 'إلغاء بطلب من العميل عبر رابط التأكيد';

      const nowIso = new Date().toISOString();
      const updates: Record<string, any> = {
        status: 'cancelled',
        customer_response_status: 'cancelled',
        customer_cancellation_reason: reason,
        cancellation_source: 'customer',
        cancellation_timestamp: nowIso,
        customer_responded_at: nowIso,
        updated_at: nowIso,
      };

      const { data: updatedOrder, error: updateErr } = await dbClient
        .from('orders')
        .update(updates)
        .eq('id', order.id)
        .select('*')
        .single();

      if (updateErr) {
        return res.status(500).json({ success: false, error: updateErr.message });
      }

      try {
        await dbClient.from('order_events').insert([{
          company_id: order.company_id,
          order_id: order.id,
          event_type: 'customer_cancelled',
          actor: 'customer',
          actor_name: order.customer_name || 'العميل',
          details: `قام العميل بإلغاء الشحنة عبر رابط التأكيد. السبب: ${reason}`,
          created_at: nowIso,
        }]);
      } catch (_) {}

      const [merchantRes, companyRes] = await Promise.all([
        order.merchant_id ? dbClient.from('merchants').select('store_name, brand_name, phone, whatsapp, logo_url').eq('id', order.merchant_id).maybeSingle() : Promise.resolve({ data: null }),
        order.company_id ? dbClient.from('companies').select('name, phone').eq('id', order.company_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);

      return res.json({
        success: true,
        message: 'تم إلغاء الشحنة بناءً على طلبك',
        shipment: formatPublicShipment(updatedOrder, merchantRes.data, companyRes.data),
      });
    } catch (err: any) {
      console.error('Customer cancel API exception:', err);
      return res.status(500).json({ success: false, error: err.message || 'حدث خطأ داخلي أثناء إلغاء الشحنة' });
    }
  });

  // 2. Admin Create Courier Endpoint
  app.post('/api/admin/create-courier', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

      if (!token || !supabaseUrl || !supabaseAnonKey) {
        return res.status(401).json({
          success: false,
          error: 'غير مصرح: يرجى تسجيل الدخول كمدير شركة واستخدام رمز مصادقة صالح',
        });
      }

      const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: userData, error: userError } = await callerClient.auth.getUser(token);

      if (userError || !userData?.user) {
        return res.status(401).json({
          success: false,
          error: 'جلسة تسجيل الدخول منتهية أو غير صالحة. يرجى إعادة تسجيل الدخول.',
        });
      }

      const adminAuthUserId = userData.user.id;

      const dbClient = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: adminProfile, error: profError } = await dbClient
        .from('profiles')
        .select('*')
        .eq('auth_user_id', adminAuthUserId)
        .maybeSingle();

      if (profError || !adminProfile || adminProfile.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'غير مصرح: حسابك لا يملك صلاحيات المدير لإنشاء المناديب',
        });
      }

      const companyId = adminProfile.company_id;

      const { data: companyRecord } = await dbClient
        .from('companies')
        .select('id, name, status')
        .eq('id', companyId)
        .maybeSingle();

      if (companyRecord && (companyRecord.status === 'suspended' || companyRecord.status === 'disabled')) {
        return res.status(403).json({
          success: false,
          error: 'حساب شركتك موقوف حاليًا. يرجى التواصل مع إدارة DELIXA.',
        });
      }

      const { employee_id, full_name, phone, area, password, status } = req.body;

      if (!employee_id || !full_name || !phone || !area) {
        return res.status(400).json({
          success: false,
          error: 'يرجى استكمال جميع بيانات المندوب (كود الموظف، الاسم، الهاتف، منطقة التغطية)',
        });
      }

      const cleanEmpId = employee_id.trim().toUpperCase();

      const { data: existingCourier } = await dbClient
        .from('couriers')
        .select('id')
        .eq('company_id', companyId)
        .ilike('employee_id', cleanEmpId)
        .maybeSingle();

      if (existingCourier) {
        return res.status(400).json({
          success: false,
          error: `كود الموظف (${cleanEmpId}) مسجل مسبقاً في هذه الشركة`,
        });
      }

      const cleanCompanyFragment = companyId.replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase();
      const cleanEmpFragment = cleanEmpId.replace(/[^a-z0-9]/gi, '').toLowerCase();
      const courierEmail = `${cleanEmpFragment}.${cleanCompanyFragment}@courier.delixa.app`;
      const courierPassword = password || '123456';

      let courierAuthUserId: string | null = null;

      if (supabaseServiceKey) {
        const { data: createdAuthUser, error: authCreateErr } = await dbClient.auth.admin.createUser({
          email: courierEmail,
          password: courierPassword,
          email_confirm: true,
          user_metadata: {
            role: 'courier',
            company_id: companyId,
            employee_id: cleanEmpId,
            full_name: full_name.trim(),
            phone: phone.trim(),
          },
        });

        if (authCreateErr) {
          if (authCreateErr.message?.includes('already registered') || authCreateErr.message?.includes('exists')) {
            const { data: listData } = await dbClient.auth.admin.listUsers();
            const existingUser = (listData?.users || []).find((u: any) => u.email === courierEmail);
            if (existingUser) {
              courierAuthUserId = existingUser.id;
            } else {
              return res.status(400).json({ success: false, error: authCreateErr.message });
            }
          } else {
            return res.status(400).json({ success: false, error: authCreateErr.message });
          }
        } else if (createdAuthUser?.user) {
          courierAuthUserId = createdAuthUser.user.id;
        }
      } else {
        const unpersistedClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        });

        const { data: signUpData, error: signUpErr } = await unpersistedClient.auth.signUp({
          email: courierEmail,
          password: courierPassword,
          options: {
            data: {
              role: 'courier',
              company_id: companyId,
              employee_id: cleanEmpId,
              full_name: full_name.trim(),
              phone: phone.trim(),
            },
          },
        });

        if (signUpErr && !signUpData?.user) {
          return res.status(400).json({
            success: false,
            error: signUpErr.message || 'فشل إنشاء حساب المصادقة للمندوب في Supabase Auth',
          });
        }

        if (signUpData?.user) {
          courierAuthUserId = signUpData.user.id;
        }
      }

      if (!courierAuthUserId) {
        return res.status(500).json({
          success: false,
          error: 'تعذر إنشاء أو استرجاع معرف المصادقة UUID للمندوب',
        });
      }

      let profileRecord: any = null;
      const { data: existingProfile } = await dbClient
        .from('profiles')
        .select('*')
        .eq('auth_user_id', courierAuthUserId)
        .maybeSingle();

      if (existingProfile) {
        profileRecord = existingProfile;
      } else {
        const { data: newProfile, error: profileInsertErr } = await dbClient
          .from('profiles')
          .insert([{
            auth_user_id: courierAuthUserId,
            company_id: companyId,
            full_name: full_name.trim(),
            phone: phone.trim(),
            role: 'courier',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }])
          .select('*')
          .single();

        if (profileInsertErr) {
          return res.status(400).json({
            success: false,
            error: `فشل إنشاء الملف الشخصي للمندوب: ${profileInsertErr.message}`,
          });
        }
        profileRecord = newProfile;
      }

      const newCourierData = {
        company_id: companyId,
        profile_id: profileRecord.id,
        employee_id: cleanEmpId,
        full_name: full_name.trim(),
        phone: phone.trim(),
        area: area.trim(),
        status: status || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: createdCourier, error: courierInsertErr } = await dbClient
        .from('couriers')
        .insert([newCourierData])
        .select('*')
        .single();

      if (courierInsertErr) {
        return res.status(400).json({
          success: false,
          error: `فشل حفظ المندوب في قاعدة البيانات: ${courierInsertErr.message}`,
        });
      }

      return res.json({
        success: true,
        courier: createdCourier,
      });
    } catch (err: any) {
      console.error('API create-courier exception:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'حدث خطأ داخلي أثناء إنشاء المندوب',
      });
    }
  });

  // 3. Admin Create Merchant Endpoint
  app.post('/api/admin/create-merchant', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

      if (!token || !supabaseUrl || !supabaseAnonKey) {
        return res.status(401).json({
          success: false,
          error: 'غير مصرح: يرجى تسجيل الدخول كمدير شركة واستخدام رمز مصادقة صالح',
        });
      }

      const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: userData, error: userError } = await callerClient.auth.getUser(token);

      if (userError || !userData?.user) {
        return res.status(401).json({
          success: false,
          error: 'جلسة تسجيل الدخول منتهية أو غير صالحة',
        });
      }

      const dbClient = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: adminProfile, error: profError } = await dbClient
        .from('profiles')
        .select('*')
        .eq('auth_user_id', userData.user.id)
        .maybeSingle();

      if (profError || !adminProfile || adminProfile.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'غير مصرح: حسابك لا يملك صلاحيات المدير لإنشاء المتاجر',
        });
      }

      const companyId = adminProfile.company_id;

      const { data: companyRecord } = await dbClient
        .from('companies')
        .select('id, name, status')
        .eq('id', companyId)
        .maybeSingle();

      if (companyRecord && (companyRecord.status === 'suspended' || companyRecord.status === 'disabled')) {
        return res.status(403).json({
          success: false,
          error: 'حساب شركتك موقوف حاليًا. يرجى التواصل مع إدارة DELIXA.',
        });
      }

      const { store_name, owner_name, brand_name, phone, whatsapp, email, address, logo_url, notes, status } = req.body;

      if (!store_name || !owner_name || !phone || !address) {
        return res.status(400).json({
          success: false,
          error: 'يرجى استكمال جميع بيانات المتجر الأساسية (اسم المتجر، اسم المالك، الهاتف، العنوان)',
        });
      }

      const newMerchant: Record<string, any> = {
        company_id: companyId,
        store_name: store_name.trim(),
        owner_name: owner_name.trim(),
        brand_name: typeof brand_name === 'string' && brand_name.trim() ? brand_name.trim() : null,
        phone: phone.trim(),
        whatsapp: typeof whatsapp === 'string' && whatsapp.trim() ? whatsapp.trim() : null,
        email: typeof email === 'string' && email.trim() ? email.trim() : null,
        address: address.trim(),
        logo_url: typeof logo_url === 'string' && logo_url.trim() ? logo_url.trim() : null,
        notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
        status: status === 'inactive' ? 'inactive' : 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: createdMerchant, error: insertError } = await dbClient
        .from('merchants')
        .insert([newMerchant])
        .select('*')
        .single();

      if (insertError) {
        console.error('API create-merchant db error:', insertError);
        return res.status(400).json({ success: false, error: insertError.message });
      }

      return res.json({
        success: true,
        merchant: createdMerchant,
      });
    } catch (err: any) {
      console.error('API create-merchant exception:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'حدث خطأ داخلي أثناء إنشاء المتجر',
      });
    }
  });

  // 4. Admin Update Merchant Endpoint
  app.put('/api/admin/update-merchant/:id', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
      const merchantId = req.params.id;

      if (!token || !supabaseUrl || !supabaseAnonKey || !merchantId) {
        return res.status(401).json({
          success: false,
          error: 'غير مصرح أو معرف المتجر غير صالح',
        });
      }

      const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: userData, error: userError } = await callerClient.auth.getUser(token);

      if (userError || !userData?.user) {
        return res.status(401).json({
          success: false,
          error: 'جلسة تسجيل الدخول منتهية أو غير صالحة',
        });
      }

      const dbClient = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: adminProfile, error: profError } = await dbClient
        .from('profiles')
        .select('*')
        .eq('auth_user_id', userData.user.id)
        .maybeSingle();

      if (profError || !adminProfile || adminProfile.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'غير مصرح: حسابك لا يملك صلاحيات المدير لتعديل المتاجر',
        });
      }

      const companyId = adminProfile.company_id;

      const { data: companyRecord } = await dbClient
        .from('companies')
        .select('id, name, status')
        .eq('id', companyId)
        .maybeSingle();

      if (companyRecord && (companyRecord.status === 'suspended' || companyRecord.status === 'disabled')) {
        return res.status(403).json({
          success: false,
          error: 'حساب شركتك موقوف حاليًا. يرجى التواصل مع إدارة DELIXA.',
        });
      }

      const raw = req.body || {};
      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (raw.store_name !== undefined) updates.store_name = raw.store_name.trim();
      if (raw.owner_name !== undefined) updates.owner_name = raw.owner_name.trim();
      if (raw.brand_name !== undefined) updates.brand_name = typeof raw.brand_name === 'string' && raw.brand_name.trim() ? raw.brand_name.trim() : null;
      if (raw.phone !== undefined) updates.phone = raw.phone.trim();
      if (raw.whatsapp !== undefined) updates.whatsapp = typeof raw.whatsapp === 'string' && raw.whatsapp.trim() ? raw.whatsapp.trim() : null;
      if (raw.email !== undefined) updates.email = typeof raw.email === 'string' && raw.email.trim() ? raw.email.trim() : null;
      if (raw.address !== undefined) updates.address = raw.address.trim();
      if (raw.logo_url !== undefined) updates.logo_url = typeof raw.logo_url === 'string' && raw.logo_url.trim() ? raw.logo_url.trim() : null;
      if (raw.notes !== undefined) updates.notes = typeof raw.notes === 'string' && raw.notes.trim() ? raw.notes.trim() : null;
      if (raw.status !== undefined) updates.status = raw.status === 'inactive' ? 'inactive' : 'active';

      const { data: updatedMerchant, error: updateError } = await dbClient
        .from('merchants')
        .update(updates)
        .eq('id', merchantId)
        .eq('company_id', companyId)
        .select('*')
        .single();

      if (updateError) {
        console.error('API update-merchant db error:', updateError);
        return res.status(400).json({ success: false, error: updateError.message });
      }

      return res.json({
        success: true,
        merchant: updatedMerchant,
      });
    } catch (err: any) {
      console.error('API update-merchant exception:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'حدث خطأ داخلي أثناء تعديل بيانات المتجر',
      });
    }
  });

  // 4b. Admin Create Order Endpoint
  app.post('/api/admin/create-order', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

      if (!token || !supabaseUrl || !supabaseAnonKey) {
        return res.status(401).json({
          success: false,
          error: 'غير مصرح: يرجى تسجيل الدخول واستخدام رمز مصادقة صالح',
        });
      }

      const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: userData, error: userError } = await callerClient.auth.getUser(token);

      if (userError || !userData?.user) {
        return res.status(401).json({
          success: false,
          error: 'جلسة تسجيل الدخول منتهية أو غير صالحة',
        });
      }

      const dbClient = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: profile, error: profError } = await dbClient
        .from('profiles')
        .select('*')
        .eq('auth_user_id', userData.user.id)
        .maybeSingle();

      if (profError || !profile || (profile.role !== 'admin' && profile.role !== 'courier')) {
        return res.status(403).json({
          success: false,
          error: 'غير مصرح لإنشاء الشحنات',
        });
      }

      const companyId = profile.company_id;

      const { data: companyRecord } = await dbClient
        .from('companies')
        .select('id, name, status, subscription_end_date, plan_name')
        .eq('id', companyId)
        .maybeSingle();

      if (companyRecord && (companyRecord.status === 'suspended' || companyRecord.status === 'disabled')) {
        return res.status(403).json({
          success: false,
          error: 'حساب شركتك موقوف حاليًا. يرجى التواصل مع إدارة DELIXA.',
        });
      }

      if (companyRecord && companyRecord.subscription_end_date) {
        const isExpired = new Date(companyRecord.subscription_end_date) < new Date();
        if (isExpired && companyRecord.status === 'expired') {
          return res.status(403).json({
            success: false,
            error: 'انتهت فترة اشتراك شركتك. يرجى تجديد الاشتراك لمتابعة إنشاء الشحنات.',
          });
        }
      }

      const body = req.body || {};
      const {
        merchant_id,
        courier_id,
        order_number,
        customer_name,
        customer_phone,
        governorate,
        city_area,
        customer_address,
        customer_landmark,
        cod_amount,
        shipping_fee,
        delivery_date,
        delivery_from,
        delivery_to,
        notes,
        status,
      } = body;

      if (!merchant_id || !customer_name || !customer_phone || !customer_address) {
        return res.status(400).json({
          success: false,
          error: 'يرجى استكمال جميع بيانات الشحنة الإلزامية (التاجر، اسم العميل، رقم الهاتف، العنوان)',
        });
      }

      const { data: merchant } = await dbClient
        .from('merchants')
        .select('id')
        .eq('id', merchant_id)
        .eq('company_id', companyId)
        .maybeSingle();

      if (!merchant) {
        return res.status(400).json({
          success: false,
          error: 'التاجر المحدد غير تابع لهذه الشركة أو غير موجود',
        });
      }

      if (courier_id) {
        const { data: courier } = await dbClient
          .from('couriers')
          .select('id')
          .eq('id', courier_id)
          .eq('company_id', companyId)
          .maybeSingle();

        if (!courier) {
          return res.status(400).json({
            success: false,
            error: 'المندوب المحدد غير تابع لهذه الشركة',
          });
        }
      }

      const genOrderNum = order_number?.trim() || `ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      const confirmationToken = crypto.randomBytes(16).toString('hex');
      const initialStatus = status || (courier_id ? 'assigned' : 'pending');

      const newOrderData: Record<string, any> = {
        company_id: companyId,
        merchant_id,
        courier_id: courier_id || null,
        order_number: genOrderNum,
        customer_name: customer_name.trim(),
        customer_phone: customer_phone.trim(),
        governorate: governorate || 'القاهرة (Cairo)',
        city_area: city_area || 'مدينة نصر',
        customer_address: customer_address.trim(),
        customer_landmark: customer_landmark?.trim() || null,
        cod_amount: Number(cod_amount) || 0,
        shipping_fee: Number(shipping_fee) || 0,
        delivery_date: delivery_date || new Date().toISOString().split('T')[0],
        delivery_from: delivery_from || '10:00',
        delivery_to: delivery_to || '18:00',
        notes: notes?.trim() || null,
        status: initialStatus,
        confirmation_token: confirmationToken,
        customer_response_status: 'pending',
        assigned_at: courier_id ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let createdOrder: any = null;
      const { data: insertedOrder, error: insertError } = await dbClient
        .from('orders')
        .insert([newOrderData])
        .select('*')
        .single();

      if (insertError) {
        if (insertError.message?.includes('shipping_fee')) {
          const { shipping_fee: _fee, ...safeOrder } = newOrderData;
          const retryRes = await dbClient.from('orders').insert([safeOrder]).select('*').single();
          if (retryRes.error) {
            return res.status(400).json({ success: false, error: retryRes.error.message });
          }
          createdOrder = retryRes.data;
        } else {
          return res.status(400).json({ success: false, error: insertError.message });
        }
      } else {
        createdOrder = insertedOrder;
      }

      await dbClient.from('order_events').insert([{
        company_id: companyId,
        order_id: createdOrder.id,
        event_type: 'created',
        actor: profile.role || 'admin',
        actor_name: profile.full_name || 'مدير النظام',
        details: `تم إنشاء الشحنة رقم ${createdOrder.order_number} بنجاح`,
        created_at: new Date().toISOString(),
      }]);

      return res.json({
        success: true,
        order: createdOrder,
      });
    } catch (err: any) {
      console.error('API create-order exception:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'حدث خطأ أثناء إنشاء الشحنة',
      });
    }
  });

  // 4c. Admin Create Return Endpoint (Strictly forbidden for couriers -> returns 403)
  app.post('/api/admin/create-return', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

      if (!token || !supabaseUrl || !supabaseAnonKey) {
        return res.status(401).json({
          success: false,
          error: 'غير مصرح: يرجى تسجيل الدخول واستخدام رمز مصادقة صالح',
        });
      }

      const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: userData, error: userError } = await callerClient.auth.getUser(token);

      if (userError || !userData?.user) {
        return res.status(401).json({
          success: false,
          error: 'جلسة تسجيل الدخول منتهية أو غير صالحة',
        });
      }

      const dbClient = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: profile, error: profError } = await dbClient
        .from('profiles')
        .select('*')
        .eq('auth_user_id', userData.user.id)
        .maybeSingle();

      if (profError || !profile) {
        return res.status(401).json({
          success: false,
          error: 'لم يتم العثور على الملف الشخصي للمستخدم',
        });
      }

      // CRITICAL: Couriers are strictly forbidden from creating returns -> 403
      if (profile.role !== 'admin') {
        return res.status(403).json({
          success: false,
          code: 'FORBIDDEN',
          error: 'غير مصرح: إنشاء المرتجعات متاح فقط لمديري النظام (Admin). لا يملك المندوب صلاحية إنشاء مرتجع.',
        });
      }

      const companyId = profile.company_id;

      const { data: companyRecord } = await dbClient
        .from('companies')
        .select('id, name, status')
        .eq('id', companyId)
        .maybeSingle();

      if (companyRecord && (companyRecord.status === 'suspended' || companyRecord.status === 'disabled')) {
        return res.status(403).json({
          success: false,
          error: 'حساب شركتك موقوف حاليًا. يرجى التواصل مع إدارة DELIXA.',
        });
      }

      const body = req.body || {};
      const {
        order_id,
        courier_id,
        return_type,
        return_shipping_cost,
        other_cost,
        total_return_amount,
        return_reason,
        other_reason,
        notes,
        status,
      } = body;

      if (!order_id || !return_reason) {
        return res.status(400).json({
          success: false,
          error: 'يرجى تحديد الشحنة وسبب الإرجاع',
        });
      }

      // Verify order belongs to this company
      const { data: order, error: orderFetchErr } = await dbClient
        .from('orders')
        .select('*')
        .eq('id', order_id)
        .eq('company_id', companyId)
        .maybeSingle();

      if (orderFetchErr || !order) {
        return res.status(404).json({
          success: false,
          error: 'الشحنة غير موجودة أو غير تابعة لهذه الشركة',
        });
      }

      // Generate return number
      const returnNumber = `RET-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      const newReturnRecord = {
        company_id: companyId,
        return_number: returnNumber,
        order_id: order.id,
        merchant_id: order.merchant_id,
        courier_id: courier_id || order.courier_id || null,
        return_type: return_type || 'full_return',
        return_shipping_cost: Number(return_shipping_cost) || 0,
        other_cost: Number(other_cost) || 0,
        total_return_amount: Number(total_return_amount) || 0,
        return_reason,
        other_reason: other_reason?.trim() || null,
        notes: notes?.trim() || null,
        status: status || 'created',
        created_by: profile.full_name || 'مدير النظام',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: createdReturn, error: returnInsertErr } = await dbClient
        .from('returns')
        .insert([newReturnRecord])
        .select('*')
        .single();

      if (returnInsertErr) {
        console.error('API create-return insert error:', returnInsertErr);
        return res.status(400).json({ success: false, error: returnInsertErr.message });
      }

      // If merchant debit applies
      if (order.merchant_id && Number(return_shipping_cost) > 0) {
        try {
          await dbClient.from('merchant_transactions').insert([{
            company_id: companyId,
            merchant_id: order.merchant_id,
            transaction_type: 'RETURN_COST',
            direction: 'debit',
            amount: Number(return_shipping_cost),
            reference_type: 'return',
            reference_id: createdReturn.id,
            return_id: createdReturn.id,
            return_number: createdReturn.return_number,
            description: `تكلفة شحن مرتجع رقم ${createdReturn.return_number}`,
            created_by: profile.full_name || 'مدير النظام',
            created_at: new Date().toISOString(),
          }]);
        } catch (mErr: any) {
          console.warn('Merchant transaction debit warning:', mErr?.message || mErr);
        }
      }

      try {
        await dbClient.from('order_events').insert([{
          company_id: companyId,
          order_id: order.id,
          return_id: createdReturn.id,
          event_type: 'return_created',
          actor: 'admin',
          actor_name: profile.full_name || 'مدير النظام',
          details: `تم إنشاء طلب إرجاع رقم ${createdReturn.return_number} (السبب: ${return_reason})`,
          created_at: new Date().toISOString(),
        }]);
      } catch (_) {}

      return res.json({
        success: true,
        return: createdReturn,
      });
    } catch (err: any) {
      console.error('API create-return exception:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'حدث خطأ داخلي أثناء إنشاء المرتجع',
      });
    }
  });

  // 5. Company Status Verification Endpoint
  app.get('/api/company/verify-status', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

      if (!token || !supabaseUrl || !supabaseAnonKey) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: userData, error: userError } = await callerClient.auth.getUser(token);

      if (userError || !userData?.user) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
      }

      const dbClient = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: profile } = await dbClient
        .from('profiles')
        .select('company_id, role')
        .eq('auth_user_id', userData.user.id)
        .maybeSingle();

      if (!profile?.company_id) {
        return res.status(404).json({ success: false, error: 'Profile or company not found' });
      }

      const { data: company } = await dbClient
        .from('companies')
        .select('id, name, status, subscription_end_date, plan_name')
        .eq('id', profile.company_id)
        .maybeSingle();

      const isSuspended = company ? (company.status === 'suspended' || company.status === 'disabled') : false;

      return res.json({
        success: true,
        company: company || null,
        isSuspended,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // SUPER ADMIN & PLATFORM MANAGEMENT ROUTES
  // ============================================================================
  const getDbClient = (): SupabaseClient | null => {
    if (!supabaseUrl || (!supabaseServiceKey && !supabaseAnonKey)) return null;
    try {
      return createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    } catch {
      return null;
    }
  };

  setupSuperAdminRoutes(app, getDbClient);

  // ============================================================================
  // CATCH-ALL JSON 404 HANDLER FOR ANY UNMATCHED /api/* ROUTE
  // ============================================================================
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      code: 'API_NOT_FOUND',
      error: `المسار غير موجود في الخادم: ${req.method} ${req.originalUrl || req.url}`,
    });
  });

  // ============================================================================
  // GLOBAL JSON ERROR HANDLER FOR /api/*
  // ============================================================================
  app.use('/api', (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[DELIXA Server API Error]', err);
    res.status(err.status || 500).json({
      success: false,
      code: err.code || 'INTERNAL_SERVER_ERROR',
      error: err.message || 'حدث خطأ داخلي غير متوقع في الخادم',
    });
  });

  return app;
}
