import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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

  // 2. Admin Create Courier Endpoint (Server-Side with Auth Verification)
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

      // Step A: Verify calling admin session via Supabase Auth
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

      // Use service role if available; otherwise use anon with elevated context
      const dbClient = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // Step B: Verify the caller is an Admin and get their company_id
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
      const { employee_id, full_name, phone, area, password, status } = req.body;

      if (!employee_id || !full_name || !phone || !area) {
        return res.status(400).json({
          success: false,
          error: 'يرجى استكمال جميع بيانات المندوب (كود الموظف، الاسم، الهاتف، منطقة التغطية)',
        });
      }

      const cleanEmpId = employee_id.trim().toUpperCase();

      // Check if employee_id already exists in this company
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

      // Generate standard courier email
      const cleanCompanyFragment = companyId.replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase();
      const cleanEmpFragment = cleanEmpId.replace(/[^a-z0-9]/gi, '').toLowerCase();
      const courierEmail = `${cleanEmpFragment}.${cleanCompanyFragment}@courier.delixa.app`;
      const courierPassword = password || '123456';

      let courierAuthUserId: string | null = null;

      // Step C: Create Supabase Auth User
      if (supabaseServiceKey) {
        // High-privilege creation via Admin API (pre-confirms email)
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
        // Fallback creation via isolated signUp
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

      // Step D: Create or find Courier Profile
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

      // Step E: Create Couriers Record
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

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Delixa server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
