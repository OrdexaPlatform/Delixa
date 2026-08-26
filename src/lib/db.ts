import { createClient } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, supabaseUrl, supabaseAnonKey } from './supabase';
import { 
  Company, 
  Profile, 
  Courier, 
  Merchant, 
  Order, 
  OrderEvent, 
  ReturnRecord, 
  AppNotification, 
  CourierSettlement, 
  CourierCollectionSummary,
  MerchantTransaction,
  MerchantSettlement,
  MerchantFinancialSummary,
  DeliverySlot,
  ShippingPricingSettings,
  PricingModel,
  OrderStatus,
  CustomerResponseStatus,
  ReturnStatus,
  ReturnReason,
  DeliveryFailureReason,
  SessionMode
} from '../types';
import { hashPassword, verifyPassword, normalizeEmployeeId } from './crypto';
import { demoDb, DEMO_COMPANY_ID } from './demoDb';

// Session Mode Control for clean data separation
let currentSessionMode: SessionMode = 'production';

export function setDatabaseSessionMode(mode: SessionMode) {
  currentSessionMode = mode;
}

export function getDatabaseSessionMode(): SessionMode {
  return currentSessionMode;
}

export function isDemoScope(companyId?: string | null): boolean {
  if (currentSessionMode === 'demo') return true;
  if (companyId && (companyId === DEMO_COMPANY_ID || companyId.startsWith('demo-'))) return true;
  return false;
}

export { DEMO_COMPANY_ID, demoDb };

export interface FailureReasonItem {
  id: DeliveryFailureReason;
  label: string;
  enLabel: string;
}

export const FAILURE_REASONS: FailureReasonItem[] = [
  { id: 'customer_unavailable', label: 'العميل غير متاح / لم يتم الرد', enLabel: 'Customer unavailable / No answer' },
  { id: 'customer_no_answer', label: 'العميل لا يرد على الهاتف', enLabel: 'Customer no answer' },
  { id: 'wrong_phone', label: 'رقم الهاتف غير صحيح أو مغلق', enLabel: 'Wrong or closed phone' },
  { id: 'wrong_address', label: 'العنوان غير واضح / خاطئ', enLabel: 'Wrong or unclear address' },
  { id: 'customer_refused', label: 'رفض العميل استلام الشحنة', enLabel: 'Customer refused delivery' },
  { id: 'customer_requested_reschedule', label: 'طلب العميل تأجيل الاستلام', enLabel: 'Customer requested reschedule' },
  { id: 'other', label: 'سبب آخر', enLabel: 'Other reason' }
];

export const FAILURE_REASONS_MAP: Record<string, string> = {
  customer_unavailable: 'العميل غير متاح / لم يتم الرد',
  customer_no_answer: 'العميل لا يرد على الهاتف',
  wrong_phone: 'رقم الهاتف غير صحيح أو مغلق',
  wrong_address: 'العنوان غير واضح / خاطئ',
  customer_refused: 'رفض العميل استلام الشحنة',
  customer_requested_reschedule: 'طلب العميل تأجيل الاستلام',
  other: 'سبب آخر',
};

export function getFailureReasonLabel(reasonId?: string, isRtl: boolean = true): string {
  if (!reasonId) return '';
  const item = FAILURE_REASONS.find(r => r.id === reasonId);
  if (item) return isRtl ? item.label : item.enLabel;
  return FAILURE_REASONS_MAP[reasonId] || reasonId;
}

export interface ReturnReasonItem {
  id: ReturnReason;
  label: string;
  enLabel: string;
}

export const RETURN_REASONS: ReturnReasonItem[] = [
  { id: 'customer_refused', label: 'رفض العميل الاستلام (عدم الرغبة)', enLabel: 'Customer refused (No desire)' },
  { id: 'damaged_shipment', label: 'تلف أو عيب في المنتج', enLabel: 'Damaged or defective item' },
  { id: 'wrong_address', label: 'تعذر الوصول / خطأ في العنوان', enLabel: 'Address unreachable / wrong' },
  { id: 'customer_unavailable', label: 'العميل غير متواجد ومغلق', enLabel: 'Customer unavailable / phone closed' },
  { id: 'customer_cancellation', label: 'إلغاء الطلب من قبل العميل', enLabel: 'Customer cancellation' },
  { id: 'merchant_request', label: 'طلب استرجاع من التاجر', enLabel: 'Merchant recall request' },
  { id: 'other', label: 'أسباب أخرى', enLabel: 'Other reason' }
];

export const RETURN_REASONS_MAP: Record<string, string> = {
  customer_refused: 'رفض العميل الاستلام (عدم الرغبة)',
  damaged_shipment: 'تلف أو عيب في المنتج',
  wrong_address: 'تعذر الوصول / خطأ في العنوان',
  customer_unavailable: 'العميل غير متواجد ومغلق',
  customer_cancellation: 'إلغاء الطلب من قبل العميل',
  merchant_request: 'طلب استرجاع من التاجر',
  other: 'أسباب أخرى',
};

export function getReturnReasonLabel(reasonId?: string, isRtl: boolean = true): string {
  if (!reasonId) return '';
  const item = RETURN_REASONS.find(r => r.id === reasonId);
  if (item) return isRtl ? item.label : item.enLabel;
  return RETURN_REASONS_MAP[reasonId] || reasonId;
}

export const EGYPT_GOVERNORATES = [
  'القاهرة (Cairo)',
  'الجيزة (Giza)',
  'الإسكندرية (Alexandria)',
  'القليوبية (Qalyubia)',
  'الشرقية (Sharqia)',
  'الدقهلية (Dakahlia)',
  'الغربية (Gharbia)',
  'المنوفية (Monufia)',
  'البحيرة (Beheira)',
  'دمياط (Damietta)',
  'بورسعيد (Port Said)',
  'الإسماعيلية (Ismailia)',
  'السويس (Suez)',
  'كفر الشيخ (Kafr El Sheikh)',
  'الفيوم (Fayoum)',
  'بني سويف (Beni Suef)',
  'المنيا (Minya)',
  'أسيوط (Asyut)',
  'سوهاج (Sohag)',
  'قنا (Qena)',
  'الأقصر (Luxor)',
  'أسوان (Aswan)',
  'البحر الأحمر (Red Sea)',
  'مطروح (Matrouh)',
  'شمال سيناء (North Sinai)',
  'جنوب سيناء (South Sinai)',
  'الوادي الجديد (New Valley)'
];

export const DEFAULT_GOVERNORATE_RATES: Record<string, number> = {
  'القاهرة (Cairo)': 45,
  'الجيزة (Giza)': 45,
  'القليوبية (Qalyubia)': 50,
  'الإسكندرية (Alexandria)': 60,
  'الشرقية (Sharqia)': 60,
  'الدقهلية (Dakahlia)': 60,
  'الغربية (Gharbia)': 60,
  'المنوفية (Monufia)': 60,
  'البحيرة (Beheira)': 65,
  'دمياط (Damietta)': 65,
  'بورسعيد (Port Said)': 65,
  'الإسماعيلية (Ismailia)': 65,
  'السويس (Suez)': 65,
  'كفر الشيخ (Kafr El Sheikh)': 65,
  'الفيوم (Fayoum)': 65,
  'بني سويف (Beni Suef)': 70,
  'المنيا (Minya)': 75,
  'أسيوط (Asyut)': 80,
  'سوهاج (Sohag)': 85,
  'قنا (Qena)': 90,
  'الأقصر (Luxor)': 95,
  'أسوان (Aswan)': 100,
  'البحر الأحمر (Red Sea)': 110,
  'مطروح (Matrouh)': 110,
  'شمال سيناء (North Sinai)': 120,
  'جنوب سيناء (South Sinai)': 120,
  'الوادي الجديد (New Valley)': 120,
};

export const DEFAULT_SHIPPING_PRICING: ShippingPricingSettings = {
  pricing_model: 'unified',
  default_shipping_fee: 50,
  governorate_rates: DEFAULT_GOVERNORATE_RATES,
};

export function calculateShippingFee(pricing?: ShippingPricingSettings | null, governorate?: string): number {
  const p = pricing || DEFAULT_SHIPPING_PRICING;
  if (p.pricing_model === 'unified') {
    return Number(p.default_shipping_fee) || 50;
  }
  if (!governorate) {
    return Number(p.default_shipping_fee) || 50;
  }
  const direct = p.governorate_rates[governorate];
  if (direct !== undefined) return Number(direct);

  const matched = Object.keys(p.governorate_rates).find(k => 
    k.includes(governorate) || governorate.includes(k) ||
    governorate.split(' ')[0] === k.split(' ')[0]
  );
  if (matched && p.governorate_rates[matched] !== undefined) {
    return Number(p.governorate_rates[matched]);
  }
  return Number(p.default_shipping_fee) || 50;
}

export const DEFAULT_DELIVERY_SLOTS: DeliverySlot[] = [
  { id: 'slot-1', name: 'الفترة الصباحية (Morning)', from_time: '10:00', to_time: '14:00', is_active: true },
  { id: 'slot-2', name: 'الفترة المسائية (Evening)', from_time: '17:00', to_time: '21:00', is_active: true },
];

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateToken(length: number = 24): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// REALTIME SUBSCRIPTIONS
const BROADCAST_EVENT = 'delixa-realtime-order-sync';

export function notifyOrderUpdated(orderId?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BROADCAST_EVENT, { detail: { orderId } }));
  }
}

export function subscribeOrderUpdates(callback: (orderId?: string) => void): () => void {
  const handleCustomEvent = (e: any) => {
    callback(e.detail?.orderId);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(BROADCAST_EVENT, handleCustomEvent);
  }

  // Supabase Realtime Channel
  let channel: any = null;
  if (isSupabaseConfigured) {
    try {
      channel = supabase
        .channel('delixa-live-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
          callback((payload.new as any)?.id || (payload.old as any)?.id);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
          callback();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'order_events' }, (payload) => {
          callback((payload.new as any)?.order_id);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'returns' }, (payload) => {
          callback((payload.new as any)?.order_id);
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime channel subscription notice:', e);
    }
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener(BROADCAST_EVENT, handleCustomEvent);
    }
    if (channel && isSupabaseConfigured) {
      supabase.removeChannel(channel);
    }
  };
}

// Format merchant rows from database
function formatMerchantRow(m: any): Merchant {
  if (!m) return m;
  return {
    ...m,
    brand_name: m.brand_name || undefined,
    whatsapp: m.whatsapp || undefined,
    email: m.email || undefined,
    logo_url: m.logo_url || undefined,
    notes: m.notes || undefined,
  } as Merchant;
}

// DATABASE LAYER IMPLEMENTATION (SUPABASE PRODUCTION)
const supabaseDb = {
  // ==========================================
  // COMPANIES
  // ==========================================
  async getCompanies(): Promise<Company[]> {
    const { data, error } = await supabase.from('companies').select('*');
    if (error) {
      console.error('Error fetching companies:', error);
      return [];
    }
    return (data || []) as Company[];
  },

  async getCompanyById(id: string): Promise<Company | null> {
    if (!id) return null;
    const { data, error } = await supabase.from('companies').select('*').eq('id', id).single();
    if (error) return null;
    return data as Company;
  },

  async createCompany(data: { name: string; phone: string; email: string; address: string; logo_url?: string }): Promise<Company> {
    const newCompany = {
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email.trim().toLowerCase(),
      address: data.address.trim(),
      logo_url: data.logo_url || '',
      delivery_slots: DEFAULT_DELIVERY_SLOTS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: created, error } = await supabase.from('companies').insert([newCompany]).select().single();
    if (error) throw new Error(error.message || 'فشل إنشاء سجل الشركة في Supabase');
    return created as Company;
  },

  async updateCompany(id: string, updates: Partial<Company>): Promise<Company | null> {
    const { data, error } = await supabase
      .from('companies')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return null;
    notifyOrderUpdated();
    return data as Company;
  },

  async updateCompanyProfile(companyId: string, data: { name?: string; phone?: string; email?: string; address?: string; logo_url?: string }): Promise<Company> {
    const { data: updated, error } = await supabase
      .from('companies')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', companyId)
      .select()
      .single();
    if (error || !updated) throw new Error(error?.message || 'فشل تحديث بيانات الشركة');
    notifyOrderUpdated();
    return updated as Company;
  },

  // ==========================================
  // PROFILES
  // ==========================================
  async getProfiles(companyId?: string): Promise<Profile[]> {
    let query = supabase.from('profiles').select('*');
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching profiles:', error);
      return [];
    }
    return (data || []) as Profile[];
  },

  async getProfileById(id: string): Promise<Profile | null> {
    if (!id) return null;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (error) return null;
    return data as Profile;
  },

  async getProfileByAuthUserId(authUserId: string): Promise<Profile | null> {
    if (!authUserId) return null;
    const { data, error } = await supabase.from('profiles').select('*').eq('auth_user_id', authUserId).single();
    if (error) return null;
    return data as Profile;
  },

  async createProfile(data: { auth_user_id: string; company_id: string; full_name: string; phone: string; role: 'admin' | 'courier' }): Promise<Profile> {
    if (!data.auth_user_id) {
      throw new Error('معرف المستخدم auth_user_id مطلوب لإنشاء الملف الشخصي');
    }

    const newProfile = {
      auth_user_id: data.auth_user_id,
      company_id: data.company_id,
      full_name: data.full_name.trim(),
      phone: data.phone.trim(),
      role: data.role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: created, error } = await supabase.from('profiles').insert([newProfile]).select().single();
    if (error) throw new Error(error.message || 'فشل إنشاء الملف الشخصي');
    return created as Profile;
  },

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return null;
    notifyOrderUpdated();
    return data as Profile;
  },

  async updateAdminProfile(companyId: string, profileId: string, data: { full_name?: string; phone?: string }): Promise<Profile> {
    const { data: updated, error } = await supabase
      .from('profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', profileId)
      .eq('company_id', companyId)
      .select()
      .single();
    if (error || !updated) throw new Error(error?.message || 'فشل تحديث بيانات المدير');
    notifyOrderUpdated();
    return updated as Profile;
  },

  // ==========================================
  // COURIERS
  // ==========================================
  async getCouriers(companyId: string): Promise<Courier[]> {
    if (!companyId) return [];
    const { data, error } = await supabase.from('couriers').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching couriers:', error);
      return [];
    }
    return (data || []) as Courier[];
  },

  async getCourierById(companyId: string, id: string): Promise<Courier | null> {
    if (!id) return null;
    let query = supabase.from('couriers').select('*').eq('id', id);
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    const { data, error } = await query.single();
    if (error) return null;
    return data as Courier;
  },

  async getCourierByEmployeeId(employeeId: string): Promise<Courier | null> {
    if (!employeeId) return null;
    const cleanId = normalizeEmployeeId(employeeId);
    const { data, error } = await supabase.from('couriers').select('*').ilike('employee_id', cleanId).single();
    if (error || !data) {
      // Try exact or without dashes
      const { data: fallback } = await supabase.from('couriers').select('*').eq('employee_id', employeeId.trim()).single();
      return (fallback || null) as Courier | null;
    }
    return data as Courier;
  },

  verifyCourierPassword(courier: Courier, enteredPassword?: string): boolean {
    if (!enteredPassword || !courier) return false;
    const storedHash = (courier as any).password_hash || courier.password || '';
    return verifyPassword(enteredPassword, storedHash, courier.employee_id);
  },

  async createCourier(companyId: string, data: { employee_id: string; full_name: string; phone: string; area: string; password?: string; status?: 'active' | 'inactive' }): Promise<Courier> {
    if (!companyId) throw new Error('معرف الشركة مطلوب');
    
    // Check existing employee ID
    const cleanEmpId = normalizeEmployeeId(data.employee_id);
    const { data: existing } = await supabase
      .from('couriers')
      .select('id')
      .eq('company_id', companyId)
      .ilike('employee_id', cleanEmpId)
      .maybeSingle();
      
    if (existing) {
      throw new Error(`كود المندوب (${data.employee_id}) مسجل مسبقاً في هذه الشركة`);
    }

    const courierPassword = data.password ? data.password.trim() : '123456';
    const pwdHash = hashPassword(courierPassword);

    // Option 1: Try creating via secure server-side endpoint if available
    try {
      const { data: sessData } = await supabase.auth.getSession();
      const token = sessData?.session?.access_token;
      if (token && typeof window !== 'undefined') {
        const res = await fetch('/api/admin/create-courier', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            employee_id: cleanEmpId,
            full_name: data.full_name.trim(),
            phone: data.phone.trim(),
            area: data.area.trim(),
            password: courierPassword,
            status: data.status || 'active',
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.courier) {
            notifyOrderUpdated();
            return json.courier as Courier;
          }
        }
      }
    } catch (serverErr) {
      console.warn('Backend create-courier endpoint notice (using direct Supabase Auth client):', serverErr);
    }

    // Option 2: Direct Supabase Auth user registration with isolated client
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('إعدادات Supabase غير متوفرة لإنشاء حساب المندوب');
    }

    const unpersistedAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const cleanCompanyFragment = companyId.replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase();
    const cleanEmpFragment = cleanEmpId.replace(/[^a-z0-9]/gi, '').toLowerCase();
    const courierEmail = `${cleanEmpFragment}.${cleanCompanyFragment}@courier.delixa.app`;

    const { data: authData, error: authError } = await unpersistedAuthClient.auth.signUp({
      email: courierEmail,
      password: courierPassword,
      options: {
        data: {
          role: 'courier',
          company_id: companyId,
          employee_id: cleanEmpId,
          full_name: data.full_name.trim(),
          phone: data.phone.trim(),
        },
      },
    });

    if (authError && !authData?.user) {
      // If user already exists in auth
      if (!authError.message?.includes('already registered')) {
        throw new Error(authError.message || 'فشل إنشاء حساب المصادقة للمندوب في Supabase Auth');
      }
    }

    const authUserId = authData?.user?.id;
    if (!authUserId) {
      throw new Error('تعذر الحصول على معرف المستخدم الحقيقي من Supabase Auth');
    }

    // 2. Fetch or create Profile with real auth_user_id
    let profile = await this.getProfileByAuthUserId(authUserId);
    if (!profile) {
      profile = await this.createProfile({
        auth_user_id: authUserId,
        company_id: companyId,
        full_name: data.full_name.trim(),
        phone: data.phone.trim(),
        role: 'courier',
      });
    }

    // 3. Create Courier record linking to profile_id and company_id
    const newCourier = {
      company_id: companyId,
      profile_id: profile.id,
      employee_id: cleanEmpId,
      full_name: data.full_name.trim(),
      phone: data.phone.trim(),
      area: data.area.trim(),
      password_hash: pwdHash,
      status: data.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: created, error } = await supabase.from('couriers').insert([newCourier]).select().single();
    if (error) {
      throw new Error(error.message || 'فشل حفظ المندوب في قاعدة البيانات');
    }
    notifyOrderUpdated();
    return created as Courier;
  },

  async updateCourier(companyId: string, id: string, data: Partial<Courier> & { password?: string }): Promise<Courier | null> {
    const updates: any = {
      ...data,
      updated_at: new Date().toISOString(),
    };
    if (data.employee_id) {
      updates.employee_id = normalizeEmployeeId(data.employee_id);
    }
    if (data.password) {
      updates.password_hash = hashPassword(data.password);
      delete updates.password;
    }

    const { data: updated, error } = await supabase
      .from('couriers')
      .update(updates)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) return null;
    notifyOrderUpdated();
    return updated as Courier;
  },

  async deleteCourier(companyId: string, id: string): Promise<boolean> {
    const { error } = await supabase.from('couriers').delete().eq('id', id).eq('company_id', companyId);
    if (error) return false;
    notifyOrderUpdated();
    return true;
  },

  async updateCourierSelfProfile(companyId: string, courierId: string, data: { full_name?: string; phone?: string; vehicle_type?: string; vehicle_plate?: string }): Promise<Courier> {
    const courier = await this.getCourierById(companyId, courierId);
    if (!courier) throw new Error('حساب المندوب غير موجود');

    const { data: updated, error } = await supabase
      .from('couriers')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', courierId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error || !updated) throw new Error('فشل تحديث بيانات المندوب');
    notifyOrderUpdated();
    return updated as Courier;
  },

  // ==========================================
  // MERCHANTS
  // ==========================================
  async getMerchants(companyId: string): Promise<Merchant[]> {
    if (!companyId) return [];
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching merchants:', error);
      return [];
    }
    return (data || []).map(formatMerchantRow);
  },

  async getMerchantById(companyId: string, id: string): Promise<Merchant | null> {
    if (!id) return null;
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error || !data) return null;
    return formatMerchantRow(data);
  },

  async createMerchant(companyId: string, data: { store_name: string; owner_name: string; brand_name?: string; phone: string; whatsapp?: string; email?: string; address: string; logo_url?: string; notes?: string; status?: 'active' | 'inactive' }): Promise<Merchant> {
    if (!companyId) throw new Error('معرف الشركة مطلوب');

    const payload = {
      company_id: companyId,
      store_name: data.store_name.trim(),
      owner_name: data.owner_name.trim(),
      brand_name: typeof data.brand_name === 'string' && data.brand_name.trim() ? data.brand_name.trim() : null,
      phone: data.phone.trim(),
      whatsapp: typeof data.whatsapp === 'string' && data.whatsapp.trim() ? data.whatsapp.trim() : null,
      email: typeof data.email === 'string' && data.email.trim() ? data.email.trim() : null,
      address: data.address.trim(),
      logo_url: typeof data.logo_url === 'string' && data.logo_url.trim() ? data.logo_url.trim() : null,
      notes: typeof data.notes === 'string' && data.notes.trim() ? data.notes.trim() : null,
      status: data.status === 'inactive' ? 'inactive' : 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // First, try server-side creation route if token exists
    const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('delixa_auth_session') : null;
    let token = '';
    try {
      if (sessionStr) {
        const parsed = JSON.parse(sessionStr);
        token = parsed?.token || '';
      }
    } catch (_) {}

    // Check supabase active session token as well
    if (!token && isSupabaseConfigured) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.access_token) {
          token = sessionData.session.access_token;
        }
      } catch (_) {}
    }

    if (token) {
      try {
        const apiRes = await fetch('/api/admin/create-merchant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const apiJson = await apiRes.json();
        if (apiJson.success && apiJson.merchant) {
          notifyOrderUpdated();
          return formatMerchantRow(apiJson.merchant);
        } else if (apiJson.error) {
          throw new Error(apiJson.error);
        }
      } catch (e: any) {
        if (e.message && !e.message.includes('fetch')) {
          throw e;
        }
        console.warn('Server API create-merchant attempt passed to client supabase directly:', e);
      }
    }

    // Direct Supabase Client Creation
    const { data: created, error } = await supabase
      .from('merchants')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error creating merchant in Supabase:', error);
      throw new Error(error.message || 'فشل حفظ بيانات التاجر في قاعدة البيانات');
    }

    notifyOrderUpdated();
    return formatMerchantRow(created);
  },

  async updateMerchant(companyId: string, id: string, data: Partial<Merchant>): Promise<Merchant | null> {
    if (!companyId || !id) return null;

    const raw = data || {};
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

    // First try server API if token is present
    const sessionStr = typeof window !== 'undefined' ? localStorage.getItem('delixa_auth_session') : null;
    let token = '';
    try {
      if (sessionStr) {
        const parsed = JSON.parse(sessionStr);
        token = parsed?.token || '';
      }
    } catch (_) {}

    if (!token && isSupabaseConfigured) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.access_token) {
          token = sessionData.session.access_token;
        }
      } catch (_) {}
    }

    if (token) {
      try {
        const apiRes = await fetch(`/api/admin/update-merchant/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        });
        const apiJson = await apiRes.json();
        if (apiJson.success && apiJson.merchant) {
          notifyOrderUpdated();
          return formatMerchantRow(apiJson.merchant);
        } else if (apiJson.error) {
          throw new Error(apiJson.error);
        }
      } catch (e: any) {
        if (e.message && !e.message.includes('fetch')) {
          throw e;
        }
        console.warn('Server API update-merchant attempt passed to client supabase directly:', e);
      }
    }

    const { data: updated, error } = await supabase
      .from('merchants')
      .update(updates)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error updating merchant in Supabase:', error);
      throw new Error(error.message || 'فشل تحديث بيانات التاجر في قاعدة البيانات');
    }

    notifyOrderUpdated();
    return formatMerchantRow(updated);
  },

  async deleteMerchant(companyId: string, id: string): Promise<boolean> {
    const { error } = await supabase.from('merchants').delete().eq('id', id).eq('company_id', companyId);
    if (error) return false;
    notifyOrderUpdated();
    return true;
  },

  // ==========================================
  // ORDERS
  // ==========================================
  async getNextOrderNumber(companyId: string): Promise<string> {
    const prefix = 'ORD';
    const rand = Math.floor(100 + Math.random() * 900);
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}-${rand}`;
  },

  async getOrders(companyId: string, courierId?: string | null, merchantId?: string | null): Promise<Order[]> {
    if (!companyId) return [];
    let query = supabase.from('orders').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
    if (courierId) {
      query = query.eq('courier_id', courierId);
    }
    if (merchantId) {
      query = query.eq('merchant_id', merchantId);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
    return (data || []) as Order[];
  },

  async getOrderById(companyId: string, id: string): Promise<Order | null> {
    if (!id) return null;
    let query = supabase.from('orders').select('*').eq('id', id);
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    const { data, error } = await query.single();
    if (error) return null;
    return data as Order;
  },

  async getOrderByToken(token: string): Promise<{ order: Order; merchant?: Merchant | null; company?: Company | null } | null> {
    if (!token || !token.trim()) return null;
    const cleanToken = token.trim();
    const { data: order, error } = await supabase.from('orders').select('*').eq('confirmation_token', cleanToken).single();
    if (error || !order) return null;

    const [compRes, merchRes] = await Promise.all([
      supabase.from('companies').select('*').eq('id', order.company_id).maybeSingle(),
      supabase.from('merchants').select('*').eq('id', order.merchant_id).maybeSingle(),
    ]);

    return {
      order: order as Order,
      company: (compRes.data || null) as Company | null,
      merchant: (merchRes.data || null) as Merchant | null,
    };
  },

  async createOrder(companyId: string, data: {
    merchant_id: string;
    courier_id?: string | null;
    order_number?: string;
    customer_name: string;
    customer_phone: string;
    governorate?: string;
    city_area?: string;
    customer_address: string;
    customer_landmark?: string;
    cod_amount: number;
    shipping_fee?: number;
    delivery_date: string;
    delivery_from: string;
    delivery_to: string;
    notes?: string;
    status?: OrderStatus;
  }): Promise<Order> {
    if (!companyId) throw new Error('معرف الشركة مطلوب لإنشاء الشحنة');

    // 1. Verify merchant belongs to company
    const merchant = await this.getMerchantById(companyId, data.merchant_id);
    if (!merchant) throw new Error('التاجر المحدد غير تابع لهذه الشركة أو غير موجود');

    // 2. Verify courier belongs to company if assigned
    if (data.courier_id) {
      const courier = await this.getCourierById(companyId, data.courier_id);
      if (!courier) throw new Error('المندوب المحدد غير تابع لهذه الشركة');
    }

    const orderNumber = data.order_number?.trim() || await this.getNextOrderNumber(companyId);
    const token = generateToken(32);
    const initialStatus = data.status || (data.courier_id ? 'assigned' : 'pending');

    const newOrder: Record<string, any> = {
      company_id: companyId,
      merchant_id: data.merchant_id,
      courier_id: data.courier_id || null,
      order_number: orderNumber,
      customer_name: data.customer_name.trim(),
      customer_phone: data.customer_phone.trim(),
      governorate: data.governorate || 'القاهرة (Cairo)',
      city_area: data.city_area || 'مدينة نصر',
      customer_address: data.customer_address.trim(),
      customer_landmark: data.customer_landmark?.trim() || null,
      cod_amount: Number(data.cod_amount) || 0,
      shipping_fee: Number(data.shipping_fee) || 0,
      delivery_date: data.delivery_date,
      delivery_from: data.delivery_from,
      delivery_to: data.delivery_to,
      notes: data.notes?.trim() || null,
      status: initialStatus,
      confirmation_token: token,
      customer_response_status: 'pending' as CustomerResponseStatus,
      assigned_at: data.courier_id ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let created: any = null;
    const { data: resData, error } = await supabase.from('orders').insert([newOrder]).select().single();
    if (error) {
      // If shipping_fee column doesn't exist yet in Supabase, retry without it
      if (error.message?.includes('shipping_fee')) {
        const { shipping_fee, ...safeOrder } = newOrder;
        const retryRes = await supabase.from('orders').insert([safeOrder]).select().single();
        if (retryRes.error) throw new Error(retryRes.error.message || 'فشل حفظ الشحنة في قاعدة البيانات');
        created = retryRes.data;
      } else {
        throw new Error(error.message || 'فشل حفظ الشحنة في قاعدة البيانات');
      }
    } else {
      created = resData;
    }

    // 3. Create initial audit event
    await this.addOrderEvent(companyId, {
      order_id: created.id,
      event_type: 'created',
      actor: 'admin',
      actor_name: 'مدير النظام',
      details: `تم إنشاء الشحنة رقم ${created.order_number} بنجاح`,
    });

    if (data.courier_id) {
      await this.addOrderEvent(companyId, {
        order_id: created.id,
        event_type: 'courier_assigned',
        actor: 'admin',
        actor_name: 'مدير النظام',
        details: 'تم تعيين المندوب لتوصيل الشحنة',
      });
      await this.addNotification(companyId, {
        recipient_role: 'courier',
        recipient_courier_id: data.courier_id,
        type: 'order_assigned',
        title: 'شحنة جديدة مسندة إليك',
        message: `تم إسناد الشحنة رقم ${created.order_number} إليك للتوصيل`,
        order_id: created.id,
        order_number: created.order_number,
      });
    }

    notifyOrderUpdated(created.id);
    return created as Order;
  },

  async updateOrder(companyId: string, id: string, data: Partial<Order>): Promise<Order | null> {
    const { data: updated, error } = await supabase
      .from('orders')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) return null;
    notifyOrderUpdated(id);
    return updated as Order;
  },

  async updateOrderStatus(
    companyId: string, 
    orderId: string, 
    newStatus: OrderStatus, 
    options?: {
      courierId?: string | null;
      actorName?: string;
      actorRole?: 'admin' | 'courier' | 'customer';
      failureReason?: DeliveryFailureReason | string;
      failureNotes?: string;
      cancellationSource?: 'admin' | 'courier' | 'customer' | 'merchant';
    }
  ): Promise<Order | null> {
    const order = await this.getOrderById(companyId, orderId);
    if (!order) throw new Error('الشحنة غير موجودة');

    const updates: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (options?.courierId !== undefined) {
      updates.courier_id = options.courierId;
      if (options.courierId && !order.assigned_at) {
        updates.assigned_at = new Date().toISOString();
      }
    }

    if (newStatus === 'out_for_delivery') {
      updates.delivery_started_at = new Date().toISOString();
    } else if (newStatus === 'delivered') {
      updates.delivered_at = new Date().toISOString();
      updates.delivered_by = options?.actorName || 'مندوب التوصيل';
      updates.delivered_by_courier_id = options?.courierId || order.courier_id;

      // Automatically add merchant COD credit transaction
      await this.addMerchantTransaction(companyId, {
        merchant_id: order.merchant_id,
        transaction_type: 'CREDIT_TO_MERCHANT',
        direction: 'credit',
        amount: order.cod_amount,
        reference_type: 'order',
        reference_id: order.id,
        order_id: order.id,
        order_number: order.order_number,
        description: `تحصيل مبلغ COD للشحنة المسلمة رقم ${order.order_number}`,
        created_by: options?.actorName || 'نظام التوصيل',
      }).catch(err => console.warn('Transaction record warning:', err));
    } else if (newStatus === 'failed') {
      updates.failed_at = new Date().toISOString();
      updates.failed_by = options?.actorName || 'مندوب التوصيل';
      updates.failure_reason = options?.failureReason || 'other';
      updates.failure_notes = options?.failureNotes || null;
      updates.failure_note = options?.failureNotes || null;
    } else if (newStatus === 'cancelled') {
      updates.cancellation_timestamp = new Date().toISOString();
      updates.cancellation_source = options?.cancellationSource || 'admin';
    }

    const { data: updated, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error || !updated) throw new Error(error?.message || 'فشل تحديث حالة الشحنة');

    // Audit Event
    let eventType: any = 'status_changed';
    let detailMsg = `تم تغيير حالة الشحنة إلى ${newStatus}`;
    if (newStatus === 'out_for_delivery') {
      eventType = 'delivery_started';
      detailMsg = 'المندوب خرج لتسليم الشحنة للعميل';
    } else if (newStatus === 'delivered') {
      eventType = 'delivered';
      detailMsg = `تم تسليم الشحنة بنجاح واستلام مبلغ ${order.cod_amount} ج.م`;
    } else if (newStatus === 'failed') {
      eventType = 'delivery_failed';
      detailMsg = `تعذر التسليم: ${options?.failureNotes || options?.failureReason || 'فشل المحاولة'}`;
    }

    await this.addOrderEvent(companyId, {
      order_id: orderId,
      event_type: eventType,
      actor: options?.actorRole || 'admin',
      actor_name: options?.actorName || 'مدير النظام',
      details: detailMsg,
    });

    notifyOrderUpdated(orderId);
    return updated as Order;
  },

  async deleteOrder(companyId: string, id: string): Promise<boolean> {
    const { error } = await supabase.from('orders').delete().eq('id', id).eq('company_id', companyId);
    if (error) return false;
    notifyOrderUpdated(id);
    return true;
  },

  // ==========================================
  // CUSTOMER CONFIRMATION & SELF SERVICE
  // ==========================================
  async recordCustomerLinkOpened(token: string): Promise<void> {
    const res = await this.getOrderByToken(token);
    if (!res) return;
    await this.addOrderEvent(res.order.company_id, {
      order_id: res.order.id,
      event_type: 'link_opened',
      actor: 'customer',
      actor_name: res.order.customer_name,
      details: 'فتح العميل رابط التأكيد والتتبع من هاتفه',
    });
  },

  async customerConfirmDelivery(token: string, note?: string): Promise<{ success: boolean; order?: Order; error?: string }> {
    const res = await this.getOrderByToken(token);
    if (!res) return { success: false, error: 'رابط الشحنة غير صالح' };
    const order = res.order;

    const updates = {
      customer_response_status: 'confirmed' as CustomerResponseStatus,
      customer_note: note?.trim() || order.customer_note || null,
      customer_responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', order.id)
      .select()
      .single();

    if (error || !updated) return { success: false, error: 'تعذر تأكيد الموعد' };

    await this.addOrderEvent(order.company_id, {
      order_id: order.id,
      event_type: 'customer_confirmed',
      actor: 'customer',
      actor_name: order.customer_name,
      details: `أكد العميل موعد الاستلام المجدول${note ? ` (ملاحظة: ${note})` : ''}`,
    });

    await this.addNotification(order.company_id, {
      recipient_role: 'admin',
      type: 'customer_confirmed',
      title: 'تأكيد موعد استلام من العميل',
      message: `قام العميل ${order.customer_name} بتأكيد استلام الشحنة #${order.order_number}`,
      order_id: order.id,
      order_number: order.order_number,
    });

    if (order.courier_id) {
      await this.addNotification(order.company_id, {
        recipient_role: 'courier',
        recipient_courier_id: order.courier_id,
        type: 'customer_confirmed',
        title: 'تأكيد موعد استلام',
        message: `أكد العميل ${order.customer_name} موعد الشحنة #${order.order_number}`,
        order_id: order.id,
        order_number: order.order_number,
      });
    }

    notifyOrderUpdated(order.id);
    return { success: true, order: updated as Order };
  },

  async customerRescheduleDelivery(token: string, newDate: string, newFrom: string, newTo: string, note?: string): Promise<{ success: boolean; order?: Order; error?: string }> {
    const res = await this.getOrderByToken(token);
    if (!res) return { success: false, error: 'رابط الشحنة غير صالح' };
    const order = res.order;

    const updates = {
      delivery_date: newDate,
      delivery_from: newFrom,
      delivery_to: newTo,
      customer_selected_date: newDate,
      customer_selected_from: newFrom,
      customer_selected_to: newTo,
      customer_response_status: 'reschedule_requested' as CustomerResponseStatus,
      customer_note: note?.trim() || null,
      customer_responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', order.id)
      .select()
      .single();

    if (error || !updated) return { success: false, error: 'تعذر تعديل موعد الاستلام' };

    await this.addOrderEvent(order.company_id, {
      order_id: order.id,
      event_type: 'customer_rescheduled',
      actor: 'customer',
      actor_name: order.customer_name,
      details: `طلب العميل تعديل الموعد إلى ${newDate} (${newFrom} - ${newTo})${note ? ` - ملاحظة: ${note}` : ''}`,
    });

    await this.addNotification(order.company_id, {
      recipient_role: 'admin',
      type: 'customer_rescheduled',
      title: 'طلب تأجيل موعد استلام',
      message: `طلب العميل ${order.customer_name} تأجيل الشحنة #${order.order_number} لتاريخ ${newDate}`,
      order_id: order.id,
      order_number: order.order_number,
    });

    notifyOrderUpdated(order.id);
    return { success: true, order: updated as Order };
  },

  async customerCancelDelivery(token: string): Promise<{ success: boolean; order?: Order; error?: string }> {
    const res = await this.getOrderByToken(token);
    if (!res) return { success: false, error: 'رابط الشحنة غير صالح' };
    const order = res.order;

    if (order.status === 'delivered') {
      return { success: false, error: 'لا يمكن إلغاء شحنة تم تسليمها بالفعل' };
    }

    const updates = {
      status: 'cancelled' as OrderStatus,
      customer_response_status: 'cancelled' as CustomerResponseStatus,
      cancellation_source: 'customer',
      cancellation_timestamp: new Date().toISOString(),
      customer_responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', order.id)
      .select()
      .single();

    if (error || !updated) return { success: false, error: 'تعذر إلغاء الشحنة' };

    await this.addOrderEvent(order.company_id, {
      order_id: order.id,
      event_type: 'customer_cancelled',
      actor: 'customer',
      actor_name: order.customer_name,
      details: 'قام العميل بإلغاء طلب الشحنة من خلال رابط التتبع',
    });

    await this.addNotification(order.company_id, {
      recipient_role: 'admin',
      type: 'customer_cancelled',
      title: 'إلغاء شحنة من قبل العميل',
      message: `قام العميل ${order.customer_name} بإلغاء الشحنة #${order.order_number}`,
      order_id: order.id,
      order_number: order.order_number,
    });

    notifyOrderUpdated(order.id);
    return { success: true, order: updated as Order };
  },

  async recordWhatsAppSent(companyId: string, orderId: string, actor: 'admin' | 'courier', actorName?: string): Promise<void> {
    await supabase.from('orders').update({
      whatsapp_sent_at: new Date().toISOString(),
      confirmation_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', orderId).eq('company_id', companyId);

    await this.addOrderEvent(companyId, {
      order_id: orderId,
      event_type: 'whatsapp_sent',
      actor,
      actor_name: actorName || (actor === 'admin' ? 'مدير النظام' : 'المندوب'),
      details: 'تم إرسال رسالة واتساب برابط التأكيد والتتبع للعميل',
    });

    notifyOrderUpdated(orderId);
  },

  // ==========================================
  // ORDER EVENTS & ACTIVITY LOGS
  // ==========================================
  async getOrderEvents(orderId: string): Promise<OrderEvent[]> {
    if (!orderId) return [];
    const { data, error } = await supabase
      .from('order_events')
      .select('*')
      .eq('order_id', orderId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching order events:', error);
      return [];
    }
    return (data || []) as OrderEvent[];
  },

  async getAllOrderEvents(companyId: string, options?: { limit?: number; actor?: string; eventType?: string; startDate?: string; endDate?: string; search?: string }): Promise<OrderEvent[]> {
    if (!companyId) return [];
    let query = supabase.from('order_events').select('*').eq('company_id', companyId).order('timestamp', { ascending: false });
    if (options?.actor && options.actor !== 'all') {
      query = query.eq('actor', options.actor);
    }
    if (options?.eventType && options.eventType !== 'all') {
      query = query.eq('event_type', options.eventType);
    }
    if (options?.startDate) {
      query = query.gte('timestamp', options.startDate + 'T00:00:00.000Z');
    }
    if (options?.endDate) {
      query = query.lte('timestamp', options.endDate + 'T23:59:59.999Z');
    }
    if (options?.search) {
      query = query.ilike('details', `%${options.search}%`);
    }
    if (options?.limit && options.limit > 0) {
      query = query.limit(options.limit);
    }
    const { data, error } = await query;
    if (error) return [];
    return (data || []) as OrderEvent[];
  },

  async getOrderActivityLogs(companyId: string, filters?: { limit?: number; search?: string; actor?: string; eventType?: string; dateFrom?: string; dateTo?: string }): Promise<OrderEvent[]> {
    return this.getAllOrderEvents(companyId, filters);
  },

  async addOrderEvent(companyId: string, data: { order_id: string; return_id?: string; event_type: any; actor: any; actor_name?: string; details: string }): Promise<OrderEvent> {
    const newEvent = {
      company_id: companyId,
      order_id: data.order_id,
      return_id: data.return_id || null,
      event_type: data.event_type,
      actor: data.actor,
      actor_name: data.actor_name || null,
      details: data.details,
      timestamp: new Date().toISOString(),
    };

    const { data: created, error } = await supabase.from('order_events').insert([newEvent]).select().single();
    if (error) {
      console.warn('Failed to insert order event:', error);
    }
    return (created || newEvent) as OrderEvent;
  },

  // ==========================================
  // RETURNS
  // ==========================================
  async getNextReturnNumber(companyId: string): Promise<string> {
    const rand = Math.floor(100 + Math.random() * 900);
    const timestamp = Date.now().toString().slice(-6);
    return `RET-${timestamp}-${rand}`;
  },

  async getReturns(companyId: string, courierIdFilter?: string | null, merchantIdFilter?: string | null): Promise<ReturnRecord[]> {
    if (!companyId) return [];
    let query = supabase.from('returns').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
    if (courierIdFilter) {
      query = query.eq('courier_id', courierIdFilter);
    }
    if (merchantIdFilter) {
      query = query.eq('merchant_id', merchantIdFilter);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching returns:', error);
      return [];
    }
    return (data || []) as ReturnRecord[];
  },

  async getReturnById(companyId: string, id: string): Promise<ReturnRecord | null> {
    if (!id) return null;
    const { data, error } = await supabase.from('returns').select('*').eq('id', id).eq('company_id', companyId).single();
    if (error) return null;
    return data as ReturnRecord;
  },

  async getReturnByOrderId(companyId: string, orderId: string): Promise<ReturnRecord | null> {
    if (!orderId) return null;
    const { data, error } = await supabase.from('returns').select('*').eq('order_id', orderId).eq('company_id', companyId).maybeSingle();
    if (error) return null;
    return data as ReturnRecord;
  },

  async createReturn(companyId: string, data: {
    order_id: string;
    return_number?: string;
    merchant_id?: string;
    courier_id?: string | null;
    customer_name: string;
    customer_phone: string;
    return_address: string;
    return_amount: number;
    return_shipping_cost: number;
    other_cost?: number;
    total_return_amount: number;
    return_reason: ReturnReason;
    other_reason?: string;
    notes?: string;
    created_by: string;
    status?: ReturnStatus;
  }): Promise<ReturnRecord> {
    const returnNumber = data.return_number || await this.getNextReturnNumber(companyId);
    
    // Get original order for merchant
    const order = await this.getOrderById(companyId, data.order_id);
    const merchantId = data.merchant_id || order?.merchant_id || '';

    const newReturn = {
      company_id: companyId,
      order_id: data.order_id,
      merchant_id: merchantId,
      courier_id: data.courier_id || null,
      return_number: returnNumber,
      customer_name: data.customer_name.trim(),
      customer_phone: data.customer_phone.trim(),
      return_address: data.return_address.trim(),
      return_amount: Number(data.return_amount) || 0,
      return_shipping_cost: Number(data.return_shipping_cost) || 0,
      other_cost: Number(data.other_cost) || 0,
      total_return_amount: Number(data.total_return_amount) || 0,
      return_reason: data.return_reason,
      other_reason: data.other_reason?.trim() || null,
      notes: data.notes?.trim() || null,
      status: data.status || 'created',
      created_by: data.created_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: created, error } = await supabase.from('returns').insert([newReturn]).select().single();
    if (error) throw new Error(error.message || 'فشل إنشاء طلب الإرجاع');

    // Add debit transaction to merchant for return costs if applicable
    if (merchantId && Number(data.return_shipping_cost) > 0) {
      await this.addMerchantTransaction(companyId, {
        merchant_id: merchantId,
        transaction_type: 'RETURN_COST',
        direction: 'debit',
        amount: Number(data.return_shipping_cost),
        reference_type: 'return',
        reference_id: created.id,
        return_id: created.id,
        return_number: created.return_number,
        description: `تكلفة شحن مرتجع رقم ${created.return_number}`,
        created_by: data.created_by,
      }).catch(err => console.warn('Return cost transaction error:', err));
    }

    await this.addOrderEvent(companyId, {
      order_id: data.order_id,
      return_id: created.id,
      event_type: 'return_created',
      actor: 'admin',
      actor_name: data.created_by,
      details: `تم إنشاء طلب إرجاع رقم ${created.return_number}`,
    });

    notifyOrderUpdated(data.order_id);
    return created as ReturnRecord;
  },

  async updateReturn(companyId: string, id: string, updates: Partial<ReturnRecord>, actorContext?: { role: string; name: string }): Promise<ReturnRecord | null> {
    const { data: updated, error } = await supabase
      .from('returns')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) return null;
    notifyOrderUpdated(updated.order_id);
    return updated as ReturnRecord;
  },

  async updateReturnStatus(companyId: string, returnId: string, targetStatus: ReturnStatus, actorContext?: { role: string; name: string }): Promise<ReturnRecord | null> {
    const updates: any = {
      status: targetStatus,
      updated_at: new Date().toISOString(),
    };
    if (targetStatus === 'returned') {
      updates.returned_at = new Date().toISOString();
      updates.returned_by = actorContext?.name || 'مندوب التوصيل';
    }

    const { data: updated, error } = await supabase
      .from('returns')
      .update(updates)
      .eq('id', returnId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error || !updated) throw new Error('فشل تحديث حالة المرتجع');
    notifyOrderUpdated(updated.order_id);
    return updated as ReturnRecord;
  },

  async getReturnMetrics(companyId: string, courierId?: string | null, merchantId?: string | null) {
    const list = await this.getReturns(companyId, courierId, merchantId);
    return {
      totalReturns: list.length,
      createdCount: list.filter(r => r.status === 'created').length,
      withCourierCount: list.filter(r => r.status === 'with_courier').length,
      returnedCount: list.filter(r => r.status === 'returned').length,
      cancelledCount: list.filter(r => r.status === 'cancelled').length,
      totalReturnValue: list.reduce((sum, r) => sum + (Number(r.total_return_amount) || 0), 0),
    };
  },

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  async getNotifications(companyId: string, filter?: { role?: 'admin' | 'courier'; courierId?: string; unreadOnly?: boolean }): Promise<AppNotification[]> {
    if (!companyId) return [];
    let query = supabase.from('notifications').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
    if (filter?.role) {
      query = query.eq('recipient_role', filter.role);
    }
    if (filter?.courierId) {
      query = query.eq('recipient_courier_id', filter.courierId);
    }
    if (filter?.unreadOnly) {
      query = query.eq('read', false);
    }
    const { data, error } = await query;
    if (error) return [];
    return (data || []) as AppNotification[];
  },

  async addNotification(companyId: string, data: Omit<AppNotification, 'id' | 'created_at' | 'read' | 'company_id'>): Promise<AppNotification> {
    const newNotif = {
      ...data,
      company_id: companyId,
      read: false,
      created_at: new Date().toISOString(),
    };

    const { data: created, error } = await supabase.from('notifications').insert([newNotif]).select().single();
    if (error) {
      console.warn('Notification insert error:', error);
    }
    notifyOrderUpdated(data.order_id);
    return (created || newNotif) as AppNotification;
  },

  async markNotificationAsRead(companyId: string, notifId: string): Promise<boolean> {
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notifId).eq('company_id', companyId);
    if (error) return false;
    notifyOrderUpdated();
    return true;
  },

  async markAllNotificationsAsRead(companyId: string, filter?: { role?: 'admin' | 'courier'; courierId?: string }): Promise<boolean> {
    let query = supabase.from('notifications').update({ read: true }).eq('company_id', companyId).eq('read', false);
    if (filter?.role) {
      query = query.eq('recipient_role', filter.role);
    }
    if (filter?.courierId) {
      query = query.eq('recipient_courier_id', filter.courierId);
    }
    const { error } = await query;
    if (error) return false;
    notifyOrderUpdated();
    return true;
  },

  // ==========================================
  // DELIVERY SLOTS (STORED IN COMPANY RECORD)
  // ==========================================
  async getDeliverySlots(companyId: string): Promise<DeliverySlot[]> {
    const company = await this.getCompanyById(companyId);
    if (company && company.delivery_slots && Array.isArray(company.delivery_slots) && company.delivery_slots.length > 0) {
      return company.delivery_slots;
    }
    return DEFAULT_DELIVERY_SLOTS;
  },

  async saveDeliverySlots(companyId: string, slots: DeliverySlot[]): Promise<Company> {
    const updated = await this.updateCompany(companyId, { delivery_slots: slots });
    if (!updated) throw new Error('فشل حفظ فترات التوصيل');
    return updated;
  },

  async updateDeliverySlots(companyId: string, slots: DeliverySlot[]): Promise<Company> {
    return this.saveDeliverySlots(companyId, slots);
  },

  async addDeliverySlot(companyId: string, slotData: Omit<DeliverySlot, 'id'>): Promise<DeliverySlot> {
    const slots = await this.getDeliverySlots(companyId);
    const newSlot: DeliverySlot = {
      id: `slot-${Date.now()}`,
      ...slotData,
    };
    slots.push(newSlot);
    await this.saveDeliverySlots(companyId, slots);
    return newSlot;
  },

  async updateDeliverySlot(companyId: string, slotId: string, updates: Partial<DeliverySlot>): Promise<DeliverySlot> {
    const slots = await this.getDeliverySlots(companyId);
    const index = slots.findIndex(s => s.id === slotId);
    if (index === -1) throw new Error('فترة التوصيل غير موجودة');
    slots[index] = { ...slots[index], ...updates };
    await this.saveDeliverySlots(companyId, slots);
    return slots[index];
  },

  async toggleDeliverySlot(companyId: string, slotId: string): Promise<DeliverySlot | null> {
    const slots = await this.getDeliverySlots(companyId);
    const index = slots.findIndex(s => s.id === slotId);
    if (index === -1) return null;
    slots[index].is_active = !slots[index].is_active;
    await this.saveDeliverySlots(companyId, slots);
    return slots[index];
  },

  async deleteDeliverySlot(companyId: string, slotId: string): Promise<boolean> {
    const slots = await this.getDeliverySlots(companyId);
    const filtered = slots.filter(s => s.id !== slotId);
    if (filtered.length === slots.length) return false;
    await this.saveDeliverySlots(companyId, filtered);
    return true;
  },

  // ==========================================
  // SHIPPING PRICING SETTINGS
  // ==========================================
  async getCompanyShippingPricing(companyId: string): Promise<ShippingPricingSettings> {
    if (!companyId) return DEFAULT_SHIPPING_PRICING;
    // Check localStorage cache first
    try {
      const cached = localStorage.getItem(`delixa_shipping_pricing_${companyId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.pricing_model) return parsed;
      }
    } catch (_) {}

    const company = await this.getCompanyById(companyId);
    if (company && company.shipping_pricing) {
      return company.shipping_pricing;
    }
    return DEFAULT_SHIPPING_PRICING;
  },

  async saveCompanyShippingPricing(companyId: string, pricing: ShippingPricingSettings): Promise<boolean> {
    if (!companyId) return false;
    try {
      localStorage.setItem(`delixa_shipping_pricing_${companyId}`, JSON.stringify(pricing));
    } catch (_) {}

    const { error } = await supabase.from('companies').update({
      shipping_pricing: pricing,
      updated_at: new Date().toISOString()
    }).eq('id', companyId);

    if (error) {
      console.warn('Company shipping pricing update notice:', error.message);
    }
    return true;
  },

  // ==========================================
  // COURIER SETTLEMENTS & COLLECTIONS
  // ==========================================
  async getSettlements(companyId: string, courierId?: string): Promise<CourierSettlement[]> {
    if (!companyId) return [];
    let query = supabase.from('courier_settlements').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
    if (courierId) {
      query = query.eq('courier_id', courierId);
    }
    const { data, error } = await query;
    if (error) return [];
    return (data || []) as CourierSettlement[];
  },

  async getSettlementById(companyId: string, id: string): Promise<CourierSettlement | null> {
    if (!companyId || !id) return null;
    const { data, error } = await supabase.from('courier_settlements').select('*').eq('id', id).eq('company_id', companyId).single();
    if (error) return null;
    return data as CourierSettlement;
  },

  async getNextSettlementNumber(companyId: string): Promise<string> {
    const rand = Math.floor(100 + Math.random() * 900);
    const timestamp = Date.now().toString().slice(-6);
    return `SET-CR-${timestamp}-${rand}`;
  },

  async getCourierCollectionSummary(companyId: string, courierId: string): Promise<CourierCollectionSummary | null> {
    if (!companyId || !courierId) return null;
    const courier = await this.getCourierById(companyId, courierId);
    if (!courier) return null;

    const [orders, settlements] = await Promise.all([
      this.getOrders(companyId, courierId),
      this.getSettlements(companyId, courierId),
    ]);

    const deliveredCodOrders = orders.filter(o => o.status === 'delivered');
    const totalDeliveredCod = deliveredCodOrders.reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);
    const totalSettledAmount = settlements.reduce((sum, s) => sum + (Number((s as any).total_amount || s.received_amount) || 0), 0);
    const currentOutstandingBalance = Math.max(0, totalDeliveredCod - totalSettledAmount);
    const lastSettlementDate = settlements.length > 0 ? settlements[0].created_at : null;

    return {
      courier_id: courier.id,
      courier,
      total_delivered_cod: Math.round(totalDeliveredCod * 100) / 100,
      total_settled_amount: Math.round(totalSettledAmount * 100) / 100,
      current_outstanding_balance: Math.round(currentOutstandingBalance * 100) / 100,
      delivered_cod_orders_count: deliveredCodOrders.length,
      delivered_cod_orders: deliveredCodOrders,
      settlements_count: settlements.length,
      last_settlement_date: lastSettlementDate,
    };
  },

  async getAllCouriersCollections(companyId: string): Promise<CourierCollectionSummary[]> {
    if (!companyId) return [];
    const couriers = await this.getCouriers(companyId);
    const summaries = await Promise.all(
      couriers.map(c => this.getCourierCollectionSummary(companyId, c.id))
    );
    return summaries.filter((s): s is CourierCollectionSummary => s !== null);
  },

  async getOutstandingCollectionsTotal(companyId: string): Promise<{ totalOutstanding: number; couriersWithDebtCount: number }> {
    const summaries = await this.getAllCouriersCollections(companyId);
    const totalOutstanding = summaries.reduce((sum, s) => sum + s.current_outstanding_balance, 0);
    const couriersWithDebtCount = summaries.filter(s => s.current_outstanding_balance > 0).length;
    return {
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      couriersWithDebtCount,
    };
  },

  async createSettlement(
    companyId: string,
    data: {
      courier_id: string;
      received_amount: number;
      settled_by: string;
      notes?: string;
    }
  ): Promise<CourierSettlement> {
    if (!companyId) throw new Error('معرف الشركة مطلوب لإجراء التسوية');
    const summary = await this.getCourierCollectionSummary(companyId, data.courier_id);
    if (!summary) throw new Error('تعذر احتساب مبالغ التحصيلات الحالية للمندوب');

    const received = Number(data.received_amount);
    if (isNaN(received) || received <= 0) {
      throw new Error('يرجى إدخال مبلغ توريد صحيح أكبر من الصفر');
    }

    const settlementNumber = await this.getNextSettlementNumber(companyId);

    const newSettlement: Record<string, any> = {
      company_id: companyId,
      courier_id: data.courier_id,
      settlement_number: settlementNumber,
      total_amount: received,
      orders_count: summary.delivered_cod_orders_count,
      notes: data.notes?.trim() || null,
      settled_by: data.settled_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let created: any = null;
    const { data: resData, error } = await supabase.from('courier_settlements').insert([newSettlement]).select().single();
    if (error) {
      if (error.message?.includes('orders_count') || error.message?.includes('schema cache')) {
        const { orders_count, ...safeSettlement } = newSettlement;
        const retryRes = await supabase.from('courier_settlements').insert([safeSettlement]).select().single();
        if (retryRes.error) throw new Error(retryRes.error.message || 'فشل تسجيل التسوية في قاعدة البيانات');
        created = retryRes.data;
      } else {
        throw new Error(error.message || 'فشل تسجيل التسوية في قاعدة البيانات');
      }
    } else {
      created = resData;
    }

    notifyOrderUpdated();
    return {
      id: created?.id || generateId(),
      company_id: companyId,
      courier_id: data.courier_id,
      settlement_number: settlementNumber,
      expected_amount: summary.current_outstanding_balance,
      received_amount: received,
      remaining_amount: Math.max(0, summary.current_outstanding_balance - received),
      settled_by: data.settled_by,
      notes: data.notes,
      created_at: created?.created_at || new Date().toISOString(),
    };
  },

  // ==========================================
  // MERCHANT TRANSACTIONS & SETTLEMENTS
  // ==========================================
  async getMerchantTransactions(companyId: string, merchantId?: string): Promise<MerchantTransaction[]> {
    if (!companyId) return [];
    let query = supabase.from('merchant_transactions').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
    if (merchantId) {
      query = query.eq('merchant_id', merchantId);
    }
    const { data, error } = await query;
    if (error) return [];
    return (data || []) as MerchantTransaction[];
  },

  async addMerchantTransaction(
    companyId: string,
    data: {
      merchant_id: string;
      transaction_type: any;
      direction: 'credit' | 'debit';
      amount: number;
      reference_type?: any;
      reference_id?: string;
      order_id?: string;
      order_number?: string;
      return_id?: string;
      return_number?: string;
      description: string;
      created_by: string;
    }
  ): Promise<MerchantTransaction> {
    const newTx = {
      company_id: companyId,
      merchant_id: data.merchant_id,
      type: data.transaction_type,
      amount: Number(data.amount) || 0,
      description: data.description,
      reference_order_id: data.order_id || (data.reference_type === 'order' ? data.reference_id : null),
      reference_return_id: data.return_id || (data.reference_type === 'return' ? data.reference_id : null),
      created_by: data.created_by,
      created_at: new Date().toISOString(),
    };

    const { data: created, error } = await supabase.from('merchant_transactions').insert([newTx]).select().single();
    if (error) {
      console.warn('Merchant transaction insert notice:', error);
    }
    notifyOrderUpdated();
    return {
      id: created?.id || generateId(),
      company_id: companyId,
      merchant_id: data.merchant_id,
      transaction_type: data.transaction_type,
      direction: data.direction,
      amount: Number(data.amount) || 0,
      reference_type: data.reference_type || 'manual',
      description: data.description,
      created_by: data.created_by,
      created_at: created?.created_at || new Date().toISOString(),
    };
  },

  async getMerchantSettlements(companyId: string, merchantId?: string): Promise<MerchantSettlement[]> {
    if (!companyId) return [];
    let query = supabase.from('merchant_settlements').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
    if (merchantId) {
      query = query.eq('merchant_id', merchantId);
    }
    const { data, error } = await query;
    if (error) return [];
    return (data || []) as MerchantSettlement[];
  },

  async getNextMerchantSettlementNumber(companyId: string): Promise<string> {
    const rand = Math.floor(100 + Math.random() * 900);
    const timestamp = Date.now().toString().slice(-6);
    return `SET-M-${timestamp}-${rand}`;
  },

  async createMerchantSettlement(
    companyId: string,
    data: {
      merchant_id: string;
      settlementType: 'payout_to_merchant' | 'debt_collection' | 'net_settlement';
      amount: number;
      payment_method?: string;
      reference_number?: string;
      notes?: string;
      settled_by: string;
    }
  ): Promise<MerchantSettlement> {
    const settlementNumber = await this.getNextMerchantSettlementNumber(companyId);
    const amount = Number(data.amount) || 0;

    const newSet: Record<string, any> = {
      company_id: companyId,
      merchant_id: data.merchant_id,
      settlement_number: settlementNumber,
      type: data.settlementType,
      amount,
      net_paid_amount: amount,
      payment_method: data.payment_method || 'cash',
      notes: data.notes?.trim() || null,
      settled_by: data.settled_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let created: any = null;
    const { data: resData, error } = await supabase.from('merchant_settlements').insert([newSet]).select().single();
    if (error) {
      if (error.message?.includes('net_paid_amount') || error.message?.includes('schema cache')) {
        const { net_paid_amount, ...safeSet } = newSet;
        const retryRes = await supabase.from('merchant_settlements').insert([safeSet]).select().single();
        if (retryRes.error) throw new Error(retryRes.error.message || 'فشل حفظ تسوية التاجر');
        created = retryRes.data;
      } else {
        throw new Error(error.message || 'فشل حفظ تسوية التاجر');
      }
    } else {
      created = resData;
    }

    // Also record transaction
    await this.addMerchantTransaction(companyId, {
      merchant_id: data.merchant_id,
      transaction_type: 'MERCHANT_SETTLEMENT',
      direction: data.settlementType === 'payout_to_merchant' ? 'debit' : 'credit',
      amount,
      description: `تسوية حساب تاجر رقم ${settlementNumber}`,
      created_by: data.settled_by,
    }).catch(err => console.warn('Transaction record warning:', err));

    notifyOrderUpdated();
    return {
      id: created?.id || generateId(),
      company_id: companyId,
      merchant_id: data.merchant_id,
      settlement_number: settlementNumber,
      settlement_type: data.settlementType,
      expected_amount: amount,
      paid_amount: amount,
      remaining_amount: 0,
      payment_method: data.payment_method,
      settled_by: data.settled_by,
      notes: data.notes,
      created_at: created?.created_at || new Date().toISOString(),
    };
  },

  async getMerchantFinancialSummary(companyId: string, merchantId: string): Promise<MerchantFinancialSummary | null> {
    if (!companyId || !merchantId) return null;
    const merchant = await this.getMerchantById(companyId, merchantId);
    if (!merchant) return null;

    const [orders, returns, settlements, txs] = await Promise.all([
      this.getOrders(companyId, null, merchantId),
      this.getReturns(companyId, null, merchantId),
      this.getMerchantSettlements(companyId, merchantId),
      this.getMerchantTransactions(companyId, merchantId),
    ]);

    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    const deliveredCodSum = deliveredOrders.reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);
    const deliveredShippingFees = deliveredOrders.reduce((sum, o) => sum + (Number(o.shipping_fee) || 0), 0);

    const totalReturnFees = returns.reduce((sum, r) => sum + (Number(r.return_shipping_cost) || 0), 0);
    const payoutsSum = settlements.reduce((sum, s) => sum + (Number((s as any).amount || s.paid_amount) || 0), 0);

    const netPosition = deliveredCodSum - deliveredShippingFees - totalReturnFees - payoutsSum;
    const lastSettlement = settlements.length > 0 ? settlements[0].created_at : null;

    return {
      merchant_id: merchant.id,
      merchant,
      amount_due_to_merchant: netPosition > 0 ? netPosition : 0,
      merchant_debt_to_company: netPosition < 0 ? Math.abs(netPosition) : 0,
      net_position: netPosition,
      net_balance: netPosition,
      total_cod_earned: deliveredCodSum,
      total_delivered_orders: deliveredOrders.length,
      total_returns_debited: totalReturnFees,
      total_settled_paid: payoutsSum,
      total_orders_count: orders.length,
      delivered_orders_count: deliveredOrders.length,
      returns_count: returns.length,
      settlements_count: settlements.length,
      transactions_count: txs.length,
      last_settlement_date: lastSettlement,
    };
  },

  async getAllMerchantsFinancialSummaries(companyId: string): Promise<MerchantFinancialSummary[]> {
    if (!companyId) return [];
    const merchants = await this.getMerchants(companyId);
    const summaries = await Promise.all(
      merchants.map(m => this.getMerchantFinancialSummary(companyId, m.id))
    );
    return summaries.filter((s): s is MerchantFinancialSummary => s !== null);
  },

  // ==========================================
  // METRICS & DASHBOARDS
  // ==========================================
  async getAdminMetrics(companyId: string) {
    const [orders, returns, couriers, merchants, colTotal, recentEvents] = await Promise.all([
      this.getOrders(companyId),
      this.getReturns(companyId),
      this.getCouriers(companyId),
      this.getMerchants(companyId),
      this.getOutstandingCollectionsTotal(companyId),
      this.getOrderEvents(companyId, { limit: 15 }),
    ]);

    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const assignedOrders = orders.filter(o => o.status === 'assigned').length;
    const outForDeliveryOrders = orders.filter(o => o.status === 'out_for_delivery').length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
    const failedOrders = orders.filter(o => o.status === 'failed').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

    const totalCodAmount = orders.reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);
    const totalCodDelivered = orders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);

    const activeCouriers = couriers.filter(c => c.status === 'active').length;
    const activeMerchants = merchants.filter(m => m.status === 'active').length;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(o => o.delivery_date === todayStr || (o.created_at && o.created_at.startsWith(todayStr)));
    const todayDelivered = todayOrders.filter(o => o.status === 'delivered').length;
    const todayFailed = todayOrders.filter(o => o.status === 'failed').length;
    const todayAssigned = todayOrders.filter(o => o.status === 'assigned').length;
    const todayOutForDelivery = todayOrders.filter(o => o.status === 'out_for_delivery').length;
    const todayRescheduled = todayOrders.filter(o => o.customer_response_status === 'reschedule_requested').length;
    const todayCancelled = todayOrders.filter(o => o.status === 'cancelled').length;
    const successRateToday = todayDelivered + todayFailed > 0 ? Math.round((todayDelivered / (todayDelivered + todayFailed)) * 100) : 100;
    const deliverySuccessRate = deliveredOrders + failedOrders > 0 ? Math.round((deliveredOrders / (deliveredOrders + failedOrders)) * 100) : 100;

    const customerConfirmedCount = orders.filter(o => o.customer_response_status === 'confirmed').length;
    const customerPendingCount = orders.filter(o => o.customer_response_status === 'pending').length;
    const customerRescheduledCount = orders.filter(o => o.customer_response_status === 'reschedule_requested').length;
    const customerCancelledCount = orders.filter(o => o.customer_response_status === 'cancelled').length;
    const confirmationRate = totalOrders > 0 ? Math.round((customerConfirmedCount / totalOrders) * 100) : 0;

    const courierPerformance = couriers.map(c => {
      const cOrders = orders.filter(o => o.courier_id === c.id);
      const cDelivered = cOrders.filter(o => o.status === 'delivered').length;
      const cFailed = cOrders.filter(o => o.status === 'failed').length;
      const cCod = cOrders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);
      const successRate = cDelivered + cFailed > 0 ? Math.round((cDelivered / (cDelivered + cFailed)) * 100) : 100;
      return {
        id: c.id,
        name: c.full_name,
        employeeId: c.employee_id,
        phone: c.phone,
        area: c.area,
        status: c.status,
        assignedOrders: cOrders.length,
        assignedCount: cOrders.length,
        deliveredOrders: cDelivered,
        deliveredCount: cDelivered,
        failedOrders: cFailed,
        failedCount: cFailed,
        successRate,
        totalCod: cCod,
        collectedCod: cCod,
      };
    });

    const merchantPerformance = merchants.map(m => {
      const mOrders = orders.filter(o => o.merchant_id === m.id);
      const mDelivered = mOrders.filter(o => o.status === 'delivered').length;
      const mCod = mOrders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);
      const successRate = mOrders.length > 0 ? Math.round((mDelivered / mOrders.length) * 100) : 0;
      return {
        id: m.id,
        name: m.store_name || m.owner_name || m.brand_name || 'متجر',
        phone: m.phone,
        totalOrders: mOrders.length,
        deliveredOrders: mDelivered,
        totalCod: mCod,
        successRate,
      };
    });

    return {
      totalOrders,
      pendingOrders,
      assignedOrders,
      outForDeliveryOrders,
      deliveredOrders,
      failedOrders,
      cancelledOrders,
      totalCodAmount,
      deliveredCodAmount: totalCodDelivered,
      totalCodDelivered,
      deliverySuccessRate,
      activeCouriers,
      totalCouriers: couriers.length,
      activeMerchants,
      totalMerchants: merchants.length,
      outstandingCollections: colTotal.totalOutstanding,
      outstandingCourierCollections: colTotal.totalOutstanding,
      couriersWithDebtCount: colTotal.couriersWithDebtCount,
      couriersWithOutstandingCount: colTotal.couriersWithDebtCount,
      todayOverview: {
        total: todayOrders.length,
        totalScheduledToday: todayOrders.length,
        delivered: todayDelivered,
        deliveredToday: todayDelivered,
        failed: todayFailed,
        failedToday: todayFailed,
        assigned: todayAssigned,
        outForDelivery: todayOutForDelivery,
        outForDeliveryToday: todayOutForDelivery,
        rescheduled: todayRescheduled,
        rescheduledToday: todayRescheduled,
        confirmed: todayOrders.filter(o => o.customer_response_status === 'confirmed').length,
        confirmedToday: todayOrders.filter(o => o.customer_response_status === 'confirmed').length,
        cancelled: todayCancelled,
        successRateToday,
      },
      customerConfirmationOverview: {
        confirmed: customerConfirmedCount,
        pending: customerPendingCount,
        rescheduled: customerRescheduledCount,
        cancelled: customerCancelledCount,
        confirmationRate,
      },
      confirmationMetrics: {
        confirmed: customerConfirmedCount,
        pending: customerPendingCount,
        reschedule_requested: customerRescheduledCount,
        rescheduled: customerRescheduledCount,
        cancelled: customerCancelledCount,
        confirmationRate,
      },
      totalReturns: returns.length,
      activeReturns: returns.filter(r => r.status === 'created' || r.status === 'with_courier').length,
      returnsTotal: returns.length,
      returnsCreated: returns.filter(r => r.status === 'created').length,
      returnsWithCourier: returns.filter(r => r.status === 'with_courier').length,
      returnsCompleted: returns.filter(r => r.status === 'returned').length,
      courierPerformance,
      merchantPerformance,
      recentActivity: recentEvents,
    };
  },

  async getCourierMetrics(companyId: string, courierId: string) {
    const orders = await this.getOrders(companyId, courierId);
    const summary = await this.getCourierCollectionSummary(companyId, courierId);

    const totalAssigned = orders.length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const failed = orders.filter(o => o.status === 'failed').length;
    const outForDelivery = orders.filter(o => o.status === 'out_for_delivery').length;
    const pending = orders.filter(o => o.status === 'pending' || o.status === 'assigned').length;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(o => o.delivery_date === todayStr || (o.created_at && o.created_at.startsWith(todayStr)));
    const todayDelivered = todayOrders.filter(o => o.status === 'delivered').length;
    const todayFailed = todayOrders.filter(o => o.status === 'failed').length;
    const todayOutForDelivery = todayOrders.filter(o => o.status === 'out_for_delivery').length;
    const todayRescheduled = todayOrders.filter(o => o.customer_response_status === 'reschedule_requested').length;
    const todayConfirmed = todayOrders.filter(o => o.customer_response_status === 'confirmed').length;
    const todayWaiting = todayOrders.filter(o => o.customer_response_status === 'pending').length;
    const todayCancelled = todayOrders.filter(o => o.status === 'cancelled').length;

    const totalCodToCollect = orders
      .filter(o => o.status === 'assigned' || o.status === 'out_for_delivery')
      .reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);
    const totalCodDelivered = deliveredOrders => deliveredOrders.reduce((sum: number, o: any) => sum + (Number(o.cod_amount) || 0), 0);
    const totalCodDeliveredVal = orders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);

    const deliverySuccessRate = delivered + failed > 0 ? Math.round((delivered / (delivered + failed)) * 100) : 100;

    return {
      totalAssigned,
      delivered,
      failed,
      outForDelivery,
      pending,
      deliverySuccessRate,
      todayTotal: todayOrders.length,
      todayConfirmed,
      todayWaiting,
      todayRescheduled,
      todayOutForDelivery,
      todayDelivered,
      todayFailed,
      todayCancelled,
      totalCodToCollect,
      totalCodDelivered: totalCodDeliveredVal,
      totalCodCollected: summary?.total_delivered_cod || totalCodDeliveredVal,
      totalSettled: summary?.total_settled_amount || 0,
      outstandingCashBalance: summary?.current_outstanding_balance || 0,
      outstandingCash: summary?.current_outstanding_balance || 0,
    };
  },
};

// =========================================================================
// ROUTING DB LAYER: STRICTLY SEPARATES DEMO VS PRODUCTION SESSIONS
// =========================================================================
export const db = {
  // Companies
  getCompanies: () => (currentSessionMode === 'demo' ? demoDb.getCompanies() : supabaseDb.getCompanies()),
  getCompanyById: (id: string) => (isDemoScope(id) ? demoDb.getCompanyById(id) : supabaseDb.getCompanyById(id)),
  createCompany: (data: any) => (currentSessionMode === 'demo' ? demoDb.createCompany(data) : supabaseDb.createCompany(data)),
  updateCompany: (id: string, updates: any) => (isDemoScope(id) ? demoDb.updateCompany(id, updates) : supabaseDb.updateCompany(id, updates)),
  updateCompanyProfile: (companyId: string, data: any) => (isDemoScope(companyId) ? demoDb.updateCompanyProfile(companyId, data) : supabaseDb.updateCompanyProfile(companyId, data)),

  // Profiles
  getProfiles: (companyId?: string) => (isDemoScope(companyId) ? demoDb.getProfiles(companyId) : supabaseDb.getProfiles(companyId)),
  getProfileById: (id: string) => (isDemoScope(id) || id?.startsWith('demo-') ? demoDb.getProfileById(id) : supabaseDb.getProfileById(id)),
  getProfileByAuthUserId: (authUserId: string) => (currentSessionMode === 'demo' || authUserId?.startsWith('demo-') ? demoDb.getProfileByAuthUserId(authUserId) : supabaseDb.getProfileByAuthUserId(authUserId)),
  createProfile: (data: any) => (isDemoScope(data.company_id) ? demoDb.createProfile(data) : supabaseDb.createProfile(data)),
  updateProfile: (id: string, updates: any) => (id?.startsWith('demo-') || currentSessionMode === 'demo' ? demoDb.updateProfile(id, updates) : supabaseDb.updateProfile(id, updates)),
  updateAdminProfile: (companyId: string, profileId: string, data: any) => (isDemoScope(companyId) ? demoDb.updateAdminProfile(companyId, profileId, data) : supabaseDb.updateAdminProfile(companyId, profileId, data)),

  // Couriers
  getCouriers: (companyId: string) => (isDemoScope(companyId) ? demoDb.getCouriers(companyId) : supabaseDb.getCouriers(companyId)),
  getCourierById: (companyId: string, id: string) => (isDemoScope(companyId) || id?.startsWith('demo-') ? demoDb.getCourierById(companyId, id) : supabaseDb.getCourierById(companyId, id)),
  getCourierByEmployeeId: (employeeId: string) => (currentSessionMode === 'demo' ? demoDb.getCourierByEmployeeId(employeeId) : supabaseDb.getCourierByEmployeeId(employeeId)),
  verifyCourierPassword: (courier: Courier, enteredPassword?: string) => supabaseDb.verifyCourierPassword(courier, enteredPassword),
  createCourier: (companyId: string, data: any) => (isDemoScope(companyId) ? demoDb.createCourier(companyId, data) : supabaseDb.createCourier(companyId, data)),
  updateCourier: (companyId: string, id: string, data: any) => (isDemoScope(companyId) ? demoDb.updateCourier(companyId, id, data) : supabaseDb.updateCourier(companyId, id, data)),
  deleteCourier: (companyId: string, id: string) => (isDemoScope(companyId) ? demoDb.deleteCourier(companyId, id) : supabaseDb.deleteCourier(companyId, id)),
  updateCourierSelfProfile: (companyId: string, courierId: string, data: any) => (isDemoScope(companyId) ? demoDb.updateCourierSelfProfile(companyId, courierId, data) : supabaseDb.updateCourierSelfProfile(companyId, courierId, data)),

  // Merchants
  getMerchants: (companyId: string) => (isDemoScope(companyId) ? demoDb.getMerchants(companyId) : supabaseDb.getMerchants(companyId)),
  getMerchantById: (companyId: string, id: string) => (isDemoScope(companyId) || id?.startsWith('demo-') ? demoDb.getMerchantById(companyId, id) : supabaseDb.getMerchantById(companyId, id)),
  createMerchant: (companyId: string, data: any) => (isDemoScope(companyId) ? demoDb.createMerchant(companyId, data) : supabaseDb.createMerchant(companyId, data)),
  updateMerchant: (companyId: string, id: string, data: any) => (isDemoScope(companyId) ? demoDb.updateMerchant(companyId, id, data) : supabaseDb.updateMerchant(companyId, id, data)),
  deleteMerchant: (companyId: string, id: string) => (isDemoScope(companyId) ? demoDb.deleteMerchant(companyId, id) : supabaseDb.deleteMerchant(companyId, id)),

  // Orders
  getNextOrderNumber: (companyId: string) => (isDemoScope(companyId) ? demoDb.getNextOrderNumber(companyId) : supabaseDb.getNextOrderNumber(companyId)),
  getOrders: (companyId: string, courierId?: string | null, merchantId?: string | null) => (isDemoScope(companyId) ? demoDb.getOrders(companyId, courierId, merchantId) : supabaseDb.getOrders(companyId, courierId, merchantId)),
  getOrderById: (companyId: string, id: string) => (isDemoScope(companyId) || id?.startsWith('demo-') ? demoDb.getOrderById(companyId, id) : supabaseDb.getOrderById(companyId, id)),
  getOrderByToken: async (token: string) => {
    const demo = await demoDb.getOrderByToken(token);
    if (demo) return demo;
    if (currentSessionMode === 'demo') return null;
    return supabaseDb.getOrderByToken(token);
  },
  createOrder: (companyId: string, data: any) => (isDemoScope(companyId) ? demoDb.createOrder(companyId, data) : supabaseDb.createOrder(companyId, data)),
  updateOrder: (companyId: string, id: string, data: any) => (isDemoScope(companyId) || id?.startsWith('demo-') ? demoDb.updateOrder(companyId, id, data) : supabaseDb.updateOrder(companyId, id, data)),
  updateOrderStatus: (companyId: string, orderId: string, status: any, details?: any) => (isDemoScope(companyId) || orderId?.startsWith('demo-') ? demoDb.updateOrderStatus(companyId, orderId, status, details) : supabaseDb.updateOrderStatus(companyId, orderId, status, details)),
  deleteOrder: (companyId: string, id: string) => (isDemoScope(companyId) || id?.startsWith('demo-') ? demoDb.deleteOrder(companyId, id) : supabaseDb.deleteOrder(companyId, id)),

  // Customer Actions
  recordCustomerLinkOpened: async (token: string) => {
    const demo = await demoDb.getOrderByToken(token);
    if (demo) return demoDb.recordCustomerLinkOpened(token);
    return supabaseDb.recordCustomerLinkOpened(token);
  },
  customerConfirmDelivery: async (token: string, note?: string) => {
    const demo = await demoDb.getOrderByToken(token);
    if (demo) return demoDb.customerConfirmDelivery(token, note);
    return supabaseDb.customerConfirmDelivery(token, note);
  },
  customerRescheduleDelivery: async (token: string, newDate: string, newFrom: string, newTo: string, note?: string) => {
    const demo = await demoDb.getOrderByToken(token);
    if (demo) return demoDb.customerRescheduleDelivery(token, newDate, newFrom, newTo, note);
    return supabaseDb.customerRescheduleDelivery(token, newDate, newFrom, newTo, note);
  },
  customerCancelDelivery: async (token: string) => {
    const demo = await demoDb.getOrderByToken(token);
    if (demo) return demoDb.customerCancelDelivery(token);
    return supabaseDb.customerCancelDelivery(token);
  },
  recordWhatsAppSent: (companyId: string, orderId: string, actor: any, actorName?: string) => (isDemoScope(companyId) ? demoDb.recordWhatsAppSent(companyId, orderId, actor, actorName) : supabaseDb.recordWhatsAppSent(companyId, orderId, actor, actorName)),

  // Order Events & Audit
  getOrderEvents: (orderId: string) => (currentSessionMode === 'demo' || orderId?.startsWith('demo-') ? demoDb.getOrderEvents(orderId) : supabaseDb.getOrderEvents(orderId)),
  getAllOrderEvents: (companyId: string, options?: any) => (isDemoScope(companyId) ? demoDb.getAllOrderEvents(companyId, options) : supabaseDb.getAllOrderEvents(companyId, options)),
  getOrderActivityLogs: (companyId: string, filters?: any) => (isDemoScope(companyId) ? demoDb.getOrderActivityLogs(companyId, filters) : supabaseDb.getOrderActivityLogs(companyId, filters)),
  addOrderEvent: (companyId: string, data: any) => (isDemoScope(companyId) ? demoDb.addOrderEvent(companyId, data) : supabaseDb.addOrderEvent(companyId, data)),

  // Returns
  getNextReturnNumber: (companyId: string) => (isDemoScope(companyId) ? demoDb.getNextReturnNumber(companyId) : supabaseDb.getNextReturnNumber(companyId)),
  getReturns: (companyId: string, courierId?: any, merchantId?: any) => (isDemoScope(companyId) ? demoDb.getReturns(companyId, courierId, merchantId) : supabaseDb.getReturns(companyId, courierId, merchantId)),
  getReturnById: (companyId: string, id: string) => (isDemoScope(companyId) || id?.startsWith('demo-') ? demoDb.getReturnById(companyId, id) : supabaseDb.getReturnById(companyId, id)),
  getReturnByOrderId: (companyId: string, orderId: string) => (isDemoScope(companyId) || orderId?.startsWith('demo-') ? demoDb.getReturnByOrderId(companyId, orderId) : supabaseDb.getReturnByOrderId(companyId, orderId)),
  createReturn: (companyId: string, data: any) => (isDemoScope(companyId) ? demoDb.createReturn(companyId, data) : supabaseDb.createReturn(companyId, data)),
  updateReturn: (companyId: string, id: string, updates: any, actorContext?: any) => (isDemoScope(companyId) || id?.startsWith('demo-') ? demoDb.updateReturn(companyId, id, updates, actorContext) : supabaseDb.updateReturn(companyId, id, updates, actorContext)),
  updateReturnStatus: (companyId: string, returnId: string, targetStatus: any, actorContext?: any) => (isDemoScope(companyId) || returnId?.startsWith('demo-') ? demoDb.updateReturnStatus(companyId, returnId, targetStatus, actorContext) : supabaseDb.updateReturnStatus(companyId, returnId, targetStatus, actorContext)),
  getReturnMetrics: (companyId: string, courierId?: any, merchantId?: any) => (isDemoScope(companyId) ? demoDb.getReturnMetrics(companyId, courierId, merchantId) : supabaseDb.getReturnMetrics(companyId, courierId, merchantId)),

  // Notifications
  getNotifications: (companyId: string, filter?: any) => (isDemoScope(companyId) ? demoDb.getNotifications(companyId, filter) : supabaseDb.getNotifications(companyId, filter)),
  addNotification: (companyId: string, data: any) => (isDemoScope(companyId) ? demoDb.addNotification(companyId, data) : supabaseDb.addNotification(companyId, data)),
  markNotificationAsRead: (companyId: string, notifId: string) => (isDemoScope(companyId) || notifId?.startsWith('demo-') ? demoDb.markNotificationAsRead(companyId, notifId) : supabaseDb.markNotificationAsRead(companyId, notifId)),
  markAllNotificationsAsRead: (companyId: string, filter?: any) => (isDemoScope(companyId) ? demoDb.markAllNotificationsAsRead(companyId, filter) : supabaseDb.markAllNotificationsAsRead(companyId, filter)),

  // Delivery Slots
  getDeliverySlots: (companyId: string) => (isDemoScope(companyId) ? demoDb.getDeliverySlots(companyId) : supabaseDb.getDeliverySlots(companyId)),
  saveDeliverySlots: (companyId: string, slots: any) => (isDemoScope(companyId) ? demoDb.saveDeliverySlots(companyId, slots) : supabaseDb.saveDeliverySlots(companyId, slots)),
  updateDeliverySlots: (companyId: string, slots: any) => (isDemoScope(companyId) ? demoDb.updateDeliverySlots(companyId, slots) : supabaseDb.updateDeliverySlots(companyId, slots)),
  addDeliverySlot: (companyId: string, slotData: any) => (isDemoScope(companyId) ? demoDb.addDeliverySlot(companyId, slotData) : supabaseDb.addDeliverySlot(companyId, slotData)),
  updateDeliverySlot: (companyId: string, slotId: string, updates: any) => (isDemoScope(companyId) ? demoDb.updateDeliverySlot(companyId, slotId, updates) : supabaseDb.updateDeliverySlot(companyId, slotId, updates)),
  toggleDeliverySlot: (companyId: string, slotId: string) => (isDemoScope(companyId) ? demoDb.toggleDeliverySlot(companyId, slotId) : supabaseDb.toggleDeliverySlot(companyId, slotId)),
  deleteDeliverySlot: (companyId: string, slotId: string) => (isDemoScope(companyId) ? demoDb.deleteDeliverySlot(companyId, slotId) : supabaseDb.deleteDeliverySlot(companyId, slotId)),

  // Shipping Pricing
  getCompanyShippingPricing: (companyId: string) => (isDemoScope(companyId) ? demoDb.getCompanyShippingPricing(companyId) : supabaseDb.getCompanyShippingPricing(companyId)),
  saveCompanyShippingPricing: (companyId: string, pricing: any) => (isDemoScope(companyId) ? demoDb.saveCompanyShippingPricing(companyId, pricing) : supabaseDb.saveCompanyShippingPricing(companyId, pricing)),

  // Settlements
  getSettlements: (companyId: string, courierId?: string) => (isDemoScope(companyId) ? demoDb.getSettlements(companyId, courierId) : supabaseDb.getSettlements(companyId, courierId)),
  getSettlementById: (companyId: string, id: string) => (isDemoScope(companyId) || id?.startsWith('demo-') ? demoDb.getSettlementById(companyId, id) : supabaseDb.getSettlementById(companyId, id)),
  getNextSettlementNumber: (companyId: string) => (isDemoScope(companyId) ? demoDb.getNextSettlementNumber(companyId) : supabaseDb.getNextSettlementNumber(companyId)),
  getCourierCollectionSummary: (companyId: string, courierId: string) => (isDemoScope(companyId) ? demoDb.getCourierCollectionSummary(companyId, courierId) : supabaseDb.getCourierCollectionSummary(companyId, courierId)),
  getAllCouriersCollections: (companyId: string) => (isDemoScope(companyId) ? demoDb.getAllCouriersCollections(companyId) : supabaseDb.getAllCouriersCollections(companyId)),
  getOutstandingCollectionsTotal: (companyId: string) => (isDemoScope(companyId) ? demoDb.getOutstandingCollectionsTotal(companyId) : supabaseDb.getOutstandingCollectionsTotal(companyId)),
  createSettlement: (companyId: string, data: any) => (isDemoScope(companyId) ? demoDb.createSettlement(companyId, data) : supabaseDb.createSettlement(companyId, data)),

  // Merchant Transactions & Settlements
  getMerchantTransactions: (companyId: string, merchantId?: string) => (isDemoScope(companyId) ? demoDb.getMerchantTransactions(companyId, merchantId) : supabaseDb.getMerchantTransactions(companyId, merchantId)),
  addMerchantTransaction: (companyId: string, data: any) => (isDemoScope(companyId) ? demoDb.addMerchantTransaction(companyId, data) : supabaseDb.addMerchantTransaction(companyId, data)),
  getMerchantSettlements: (companyId: string, merchantId?: string) => (isDemoScope(companyId) ? demoDb.getMerchantSettlements(companyId, merchantId) : supabaseDb.getMerchantSettlements(companyId, merchantId)),
  getNextMerchantSettlementNumber: (companyId: string) => (isDemoScope(companyId) ? demoDb.getNextMerchantSettlementNumber(companyId) : supabaseDb.getNextMerchantSettlementNumber(companyId)),
  createMerchantSettlement: (companyId: string, data: any) => (isDemoScope(companyId) ? demoDb.createMerchantSettlement(companyId, data) : supabaseDb.createMerchantSettlement(companyId, data)),
  getMerchantFinancialSummary: (companyId: string, merchantId: string) => (isDemoScope(companyId) ? demoDb.getMerchantFinancialSummary(companyId, merchantId) : supabaseDb.getMerchantFinancialSummary(companyId, merchantId)),
  getAllMerchantsFinancialSummaries: (companyId: string) => (isDemoScope(companyId) ? demoDb.getAllMerchantsFinancialSummaries(companyId) : supabaseDb.getAllMerchantsFinancialSummaries(companyId)),

  // Metrics
  getAdminMetrics: (companyId: string) => (isDemoScope(companyId) ? demoDb.getAdminMetrics(companyId) : supabaseDb.getAdminMetrics(companyId)),
  getCourierMetrics: (companyId: string, courierId: string) => (isDemoScope(companyId) ? demoDb.getCourierMetrics(companyId, courierId) : supabaseDb.getCourierMetrics(companyId, courierId)),
};
