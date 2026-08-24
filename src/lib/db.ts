import {
  Company,
  Profile,
  Courier,
  Merchant,
  Order,
  UserRole,
  CourierStatus,
  MerchantStatus,
  OrderStatus,
  DeliveryFailureReason,
  CustomerResponseStatus,
  OrderEvent,
  ReturnRecord,
  ReturnReason,
  ReturnStatus,
  ReturnCostPayer,
  MerchantTransaction,
  MerchantTransactionType,
  MerchantSettlement,
  MerchantSettlementType,
  MerchantFinancialSummary,
  AppNotification,
  DeliverySlot,
  NotificationType,
  CourierSettlement,
  CourierCollectionSummary,
} from '../types';
import { generateConfirmationToken } from './whatsapp';
import {
  hashPassword,
  verifyPassword,
  normalizeEmployeeId,
  normalizePassword,
} from './crypto';
import { supabase } from './supabase';

export const FAILURE_REASONS = [
  { key: 'customer_unavailable', labelAr: 'العميل غير متاح', labelEn: 'Customer unavailable' },
  { key: 'customer_no_answer', labelAr: 'العميل لا يجيب', labelEn: 'Customer did not answer' },
  { key: 'wrong_phone', labelAr: 'رقم الهاتف غير صحيح', labelEn: 'Wrong phone number' },
  { key: 'wrong_address', labelAr: 'العنوان غير صحيح', labelEn: 'Wrong address' },
  { key: 'customer_refused', labelAr: 'العميل رفض الاستلام', labelEn: 'Customer refused' },
  { key: 'customer_requested_reschedule', labelAr: 'العميل طلب التأجيل', labelEn: 'Customer requested reschedule' },
  { key: 'other', labelAr: 'سبب آخر', labelEn: 'Other' },
] as const;

export const RETURN_REASONS = [
  { key: 'customer_refused', labelAr: 'العميل رفض الاستلام', labelEn: 'Customer refused' },
  { key: 'wrong_address', labelAr: 'العنوان غير صحيح', labelEn: 'Wrong address' },
  { key: 'customer_unavailable', labelAr: 'العميل غير متاح', labelEn: 'Customer unavailable' },
  { key: 'damaged_shipment', labelAr: 'شحنة تالفة', labelEn: 'Damaged shipment' },
  { key: 'customer_cancellation', labelAr: 'طلب العميل الإلغاء', labelEn: 'Customer cancellation' },
  { key: 'merchant_request', labelAr: 'طلب التاجر الاسترجاع', labelEn: 'Merchant request' },
  { key: 'other', labelAr: 'سبب آخر', labelEn: 'Other' },
] as const;

export const DEFAULT_DELIVERY_SLOTS: DeliverySlot[] = [
  { id: 'slot-1', name: 'الفترة الصباحية (Morning)', from_time: '10:00', to_time: '14:00', is_active: true },
  { id: 'slot-2', name: 'الفترة المسائية (Evening)', from_time: '17:00', to_time: '21:00', is_active: true },
];

// Helper for generating UUID-like identifiers (still used for local IDs if needed, but Supabase will generate IDs)
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Real-time synchronization helper (keep as is, but now it will work with Supabase realtime)
const BROADCAST_EVENT = 'delixa-realtime-order-sync';
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('delixa_orders_channel');
  } catch (e) {
    // Ignore if not supported
  }
}

export function notifyOrderUpdated(orderId?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BROADCAST_EVENT, { detail: { orderId, timestamp: Date.now() } }));
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type: 'ORDER_UPDATED', orderId, timestamp: Date.now() });
      } catch (e) {
        // Fallback
      }
    }
  }
}

export function subscribeOrderUpdates(callback: (orderId?: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: any) => {
    callback(e.detail?.orderId);
  };

  const handleStorageEvent = (e: StorageEvent) => {
    // In Supabase we don't rely on storage events, but we keep for compatibility
    callback();
  };

  const handleBroadcastMessage = (e: MessageEvent) => {
    if (e.data?.type === 'ORDER_UPDATED') {
      callback(e.data?.orderId);
    }
  };

  window.addEventListener(BROADCAST_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcastMessage);
  }

  return () => {
    window.removeEventListener(BROADCAST_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcastMessage);
    }
  };
}

// ============================================================
//  DB OBJECT
// ============================================================
export const db = {
  // ----------------------------------------------------
  // COMPANIES
  // ----------------------------------------------------
  async getCompanies(): Promise<Company[]> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async getCompanyById(id: string): Promise<Company | null> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null; // not found
      throw new Error(error.message);
    }
    return data;
  },

  async createCompany(companyData: Omit<Company, 'id' | 'created_at' | 'updated_at'>): Promise<Company> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('companies')
      .insert({
        ...companyData,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateCompany(id: string, updates: Partial<Company>): Promise<Company | null> {
    const { data, error } = await supabase
      .from('companies')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  },

  // ----------------------------------------------------
  // PROFILES
  // ----------------------------------------------------
  async getProfiles(companyId?: string): Promise<Profile[]> {
    let query = supabase.from('profiles').select('*');
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async getProfileByAuthUserId(authUserId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', authUserId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  },

  async getProfileById(id: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  },

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  },

  async createProfile(profileData: Omit<Profile, 'id' | 'created_at' | 'updated_at'>): Promise<Profile> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        ...profileData,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  // ----------------------------------------------------
  // COURIERS (Enforcing company_id RLS)
  // ----------------------------------------------------
  async getCouriers(companyId: string): Promise<Courier[]> {
    if (!companyId) return [];
    const { data, error } = await supabase
      .from('couriers')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async getCourierById(companyId: string, id: string): Promise<Courier | null> {
    const { data, error } = await supabase
      .from('couriers')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  },

  async getCourierByEmployeeId(employeeId: string, companyId?: string): Promise<Courier | null> {
    if (!employeeId) return null;
    let query = supabase.from('couriers').select('*');
    const searchNorm = normalizeEmployeeId(employeeId);
    const searchNoHyphen = searchNorm.replace(/-/g, '');
    // We'll fetch all and filter in memory because we need flexible matching
    let { data, error } = await query;
    if (error) throw new Error(error.message);
    let couriers = data || [];
    if (companyId) {
      couriers = couriers.filter(c => c.company_id === companyId);
    }
    return couriers.find(c => {
      const cNorm = normalizeEmployeeId(c.employee_id);
      const cNoHyphen = cNorm.replace(/-/g, '');
      return cNorm === searchNorm || cNoHyphen === searchNoHyphen;
    }) || null;
  },

  async getCourierStats(companyId: string, courierId: string): Promise<{ assignedOrders: number; deliveredOrders: number; failedOrders: number }> {
    const orders = await this.getOrders(companyId, courierId);
    return {
      assignedOrders: orders.length,
      deliveredOrders: orders.filter(o => o.status === 'delivered').length,
      failedOrders: orders.filter(o => o.status === 'failed').length,
    };
  },

  async createCourier(companyId: string, courierData: {
    fullName: string;
    phone: string;
    area: string;
    employeeId: string;
    password?: string;
    status?: CourierStatus;
  }): Promise<{ courier: Courier; profile: Profile }> {
    const now = new Date().toISOString();
    const authUserId = generateId();

    const pwd = courierData.password?.trim() || '';
    if (pwd.length !== 6) {
      throw new Error('كلمة مرور المندوب يجب أن تتكون من 6 خانات تماماً');
    }

    // 1. Create Profile
    const profile = await this.createProfile({
      auth_user_id: authUserId,
      company_id: companyId,
      full_name: courierData.fullName,
      phone: courierData.phone,
      role: 'courier',
    });

    // 2. Check unique employee_id in company
    const existing = await this.getCourierByEmployeeId(courierData.employeeId, companyId);
    if (existing) {
      throw new Error(`كود الموظف (${courierData.employeeId}) مسجل مسبقاً في هذه الشركة`);
    }

    const { data, error } = await supabase
      .from('couriers')
      .insert({
        id: generateId(),
        company_id: companyId,
        profile_id: profile.id,
        employee_id: courierData.employeeId.trim().toUpperCase(),
        full_name: courierData.fullName.trim(),
        phone: courierData.phone.trim(),
        area: courierData.area.trim(),
        status: courierData.status || 'active',
        password: hashPassword(pwd),
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { courier: data, profile };
  },

  async updateCourier(companyId: string, id: string, updates: Partial<Courier>): Promise<Courier | null> {
    // Fetch current courier
    const current = await this.getCourierById(companyId, id);
    if (!current) return null;

    // If employee_id is being updated, verify uniqueness
    if (updates.employee_id && updates.employee_id.toUpperCase() !== current.employee_id.toUpperCase()) {
      const duplicate = await this.getCourierByEmployeeId(updates.employee_id, companyId);
      if (duplicate && duplicate.id !== id) {
        throw new Error(`كود الموظف (${updates.employee_id}) مسجل مسبقاً لمندوب آخر`);
      }
      updates.employee_id = updates.employee_id.trim().toUpperCase();
    }

    // Hash password if updating password
    if (updates.password) {
      const p = updates.password.trim();
      if (p.length !== 6 && !p.startsWith('dlx_hash_')) {
        throw new Error('كلمة المرور يجب أن تتكون من 6 خانات تماماً');
      }
      if (!p.startsWith('dlx_hash_')) {
        updates.password = hashPassword(p);
      }
    }

    const { data, error } = await supabase
      .from('couriers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    // Also update matching profile name/phone if changed
    if (updates.full_name || updates.phone) {
      const profileUpdates: Partial<Profile> = {};
      if (updates.full_name) profileUpdates.full_name = updates.full_name;
      if (updates.phone) profileUpdates.phone = updates.phone;
      if (Object.keys(profileUpdates).length > 0) {
        await this.updateProfile(current.profile_id, profileUpdates);
      }
    }

    return data;
  },

  async resetCourierPassword(companyId: string, id: string, newPassword: string): Promise<boolean> {
    const pwd = newPassword.trim();
    if (pwd.length !== 6) {
      throw new Error('كلمة المرور الجديدة يجب أن تكون 6 أحرف أو أرقام تماماً');
    }
    const { error } = await supabase
      .from('couriers')
      .update({ password: hashPassword(pwd), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', companyId);
    if (error) {
      if (error.code === 'PGRST116') return false;
      throw new Error(error.message);
    }
    return true;
  },

  verifyCourierPassword(courier: Courier, enteredPassword: string): boolean {
    if (!courier || !courier.password || !enteredPassword) return false;
    return verifyPassword(enteredPassword, courier.password, courier.employee_id);
  },

  async deleteCourier(companyId: string, id: string): Promise<boolean> {
    const { error } = await supabase
      .from('couriers')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);
    if (error) {
      if (error.code === 'PGRST116') return false;
      throw new Error(error.message);
    }
    return true;
  },

  // ----------------------------------------------------
  // MERCHANTS (Enforcing company_id RLS)
  // ----------------------------------------------------
  async getMerchants(companyId: string): Promise<Merchant[]> {
    if (!companyId) return [];
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async getMerchantById(companyId: string, id: string): Promise<Merchant | null> {
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  },

  async getMerchantStats(companyId: string, merchantId: string): Promise<{ ordersCount: number }> {
    const orders = await this.getOrders(companyId);
    const count = orders.filter(o => o.merchant_id === merchantId).length;
    return { ordersCount: count };
  },

  async createMerchant(companyId: string, merchantData: Omit<Merchant, 'id' | 'company_id' | 'created_at' | 'updated_at'>): Promise<Merchant> {
    if (!merchantData.store_name?.trim()) {
      throw new Error('اسم المتجر مطلوب');
    }
    if (!merchantData.phone?.trim()) {
      throw new Error('رقم هاتف المتجر مطلوب');
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('merchants')
      .insert({
        id: generateId(),
        company_id: companyId,
        store_name: merchantData.store_name.trim(),
        owner_name: merchantData.owner_name?.trim() || '',
        brand_name: merchantData.brand_name?.trim() || '',
        phone: merchantData.phone.trim(),
        whatsapp: merchantData.whatsapp?.trim() || '',
        email: merchantData.email?.trim() || '',
        address: merchantData.address?.trim() || '',
        logo_url: merchantData.logo_url?.trim() || '',
        notes: merchantData.notes?.trim() || '',
        status: merchantData.status || 'active',
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateMerchant(companyId: string, id: string, updates: Partial<Merchant>): Promise<Merchant | null> {
    const { data, error } = await supabase
      .from('merchants')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  },

  async deleteMerchant(companyId: string, id: string): Promise<boolean> {
    const { error } = await supabase
      .from('merchants')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);
    if (error) {
      if (error.code === 'PGRST116') return false;
      throw new Error(error.message);
    }
    return true;
  },

  // ----------------------------------------------------
  // ORDERS (Enforcing company_id & role-based courier RLS)
  // ----------------------------------------------------
  async getNextOrderNumber(companyId: string): Promise<string> {
    const { data, error } = await supabase
      .from('orders')
      .select('order_number')
      .eq('company_id', companyId)
      .order('order_number', { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    let maxNum = 0;
    if (data && data.length > 0) {
      const match = data[0].order_number?.match(/DLX-(\d+)/);
      if (match && match[1]) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n)) maxNum = n;
      }
    }
    const nextVal = maxNum + 1;
    return `DLX-${String(nextVal).padStart(6, '0')}`;
  },

  async getOrders(companyId: string, courierIdFilter?: string | null): Promise<Order[]> {
    if (!companyId) return [];
    let query = supabase.from('orders').select('*').eq('company_id', companyId);
    if (courierIdFilter) {
      query = query.eq('courier_id', courierIdFilter);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async getOrderById(companyId: string, id: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  },

  async createOrder(companyId: string, orderData: {
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
    delivery_date: string;
    delivery_from: string;
    delivery_to: string;
    notes?: string;
  }): Promise<Order> {
    if (!companyId) {
      throw new Error('معرف الشركة مطلوب');
    }

    // Verify merchant belongs to company
    const merchant = await this.getMerchantById(companyId, orderData.merchant_id);
    if (!merchant) {
      throw new Error('المتجر المحدد غير موجود في هذه الشركة');
    }

    // Verify courier if provided
    if (orderData.courier_id) {
      const courier = await this.getCourierById(companyId, orderData.courier_id);
      if (!courier) {
        throw new Error('المندوب المحدد غير موجود في هذه الشركة');
      }
    }

    // Validate other fields
    if (!orderData.customer_name?.trim()) throw new Error('اسم العميل مطلوب');
    if (!orderData.customer_phone?.trim()) throw new Error('رقم هاتف العميل مطلوب');
    if (!orderData.customer_address?.trim()) throw new Error('عنوان التوصيل مطلوب');
    if (orderData.cod_amount === undefined || isNaN(Number(orderData.cod_amount)) || Number(orderData.cod_amount) < 0) {
      throw new Error('مبلغ التحصيل (COD) غير صالح');
    }
    if (!orderData.delivery_date) throw new Error('تاريخ التوصيل مطلوب');
    if (!orderData.delivery_from || !orderData.delivery_to) throw new Error('نافذة التوصيل الزمني مطلوبة');
    if (orderData.delivery_from >= orderData.delivery_to) throw new Error('وقت بداية التوصيل يجب أن يكون قبل وقت النهاية');

    const orderNumber = orderData.order_number?.trim() || await this.getNextOrderNumber(companyId);

    // Prevent duplicate order numbers
    const existing = await supabase
      .from('orders')
      .select('id')
      .eq('company_id', companyId)
      .eq('order_number', orderNumber)
      .maybeSingle();
    if (existing.data) {
      throw new Error(`رقم الطلب ${orderNumber} مستخدم بالفعل داخل الشركة`);
    }

    const status: OrderStatus = orderData.courier_id ? 'assigned' : 'pending';
    const confirmationToken = generateConfirmationToken();

    // Ensure unique token
    let tokenExists = true;
    let attempts = 0;
    let token = confirmationToken;
    while (tokenExists && attempts < 5) {
      const { data } = await supabase
        .from('orders')
        .select('id')
        .eq('confirmation_token', token)
        .maybeSingle();
      if (!data) tokenExists = false;
      else {
        token = generateConfirmationToken();
        attempts++;
      }
    }
    if (tokenExists) {
      throw new Error('تعذر إنشاء رابط تأكيد فريد، يرجى المحاولة مرة أخرى');
    }

    const now = new Date().toISOString();
    const newOrder: Omit<Order, 'id'> = {
      company_id: companyId,
      merchant_id: merchant.id,
      courier_id: orderData.courier_id || null,
      order_number: orderNumber,
      customer_name: orderData.customer_name.trim(),
      customer_phone: orderData.customer_phone.trim(),
      governorate: orderData.governorate?.trim() || '',
      city_area: orderData.city_area?.trim() || '',
      customer_address: orderData.customer_address.trim(),
      customer_landmark: orderData.customer_landmark?.trim() || '',
      cod_amount: Number(orderData.cod_amount),
      delivery_date: orderData.delivery_date,
      delivery_from: orderData.delivery_from,
      delivery_to: orderData.delivery_to,
      notes: orderData.notes?.trim() || '',
      status,
      assigned_at: orderData.courier_id ? now : undefined,
      confirmation_token: token,
      confirmation_sent_at: undefined,
      customer_response_status: 'pending',
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('orders')
      .insert(newOrder)
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Add order event
    await this.addOrderEvent({
      order_id: data.id,
      company_id: companyId,
      event_type: 'created',
      actor: 'system',
      details: orderData.courier_id
        ? 'تم إنشاء الشحنة وتعيينها للمندوب وتوليد رابط التأكيد'
        : 'تم إنشاء الشحنة وتوليد رابط التأكيد القصير للعميل',
    });

    notifyOrderUpdated(data.id);
    return data;
  },

  async updateOrder(companyId: string, id: string, updates: Partial<Order>): Promise<Order | null> {
    // Validate delivery time if changed
    if (updates.delivery_from && updates.delivery_to && updates.delivery_from >= updates.delivery_to) {
      throw new Error('وقت بداية التوصيل يجب أن يكون قبل وقت النهاية');
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    notifyOrderUpdated(id);
    return data;
  },

  async updateOrderStatus(
    companyId: string,
    id: string,
    targetStatus: OrderStatus,
    options?: {
      courierId?: string | null;
      failureReason?: DeliveryFailureReason | string;
      failureNotes?: string;
      failureNote?: string;
      actorRole?: UserRole | 'customer' | 'system';
      actorName?: string;
    }
  ): Promise<Order> {
    const current = await this.getOrderById(companyId, id);
    if (!current) {
      throw new Error('الطلب غير موجود في قاعدة بيانات الشركة');
    }

    const now = new Date().toISOString();
    const updates: Partial<Order> = { updated_at: now };
    let eventType: OrderEvent['event_type'] = 'status_changed';
    let eventDetails = `تغيرت حالة الشحنة إلى (${targetStatus})`;

    // Transition rules
    if (targetStatus === 'assigned') {
      const courierId = options?.courierId !== undefined ? options.courierId : current.courier_id;
      if (!courierId) {
        throw new Error('لا يمكن تعيين حالة الطلب إلى "معين" بدون اختيار مندوب التوصيل');
      }
      // Verify courier belongs to company
      const courier = await this.getCourierById(companyId, courierId);
      if (!courier) {
        throw new Error('المندوب المحدد غير موجود في هذه الشركة');
      }
      updates.status = 'assigned';
      updates.courier_id = courierId;
      if (!current.assigned_at) {
        updates.assigned_at = now;
      }
      updates.failure_reason = undefined;
      updates.failure_note = undefined;
      updates.failure_notes = undefined;
      eventType = 'courier_assigned';
      eventDetails = 'تم إسناد الشحنة وتعيين المندوب';
    } else if (targetStatus === 'out_for_delivery') {
      if (current.status !== 'assigned' && current.status !== 'pending' && current.status !== 'failed') {
        throw new Error(`لا يمكن بدء التوصيل لطلب في حالة (${current.status})`);
      }
      updates.status = 'out_for_delivery';
      if (!current.delivery_started_at) {
        updates.delivery_started_at = now;
      }
      eventType = 'delivery_started';
      eventDetails = 'بدأ المندوب عملية التوصيل وتوجه للعميل';
    } else if (targetStatus === 'delivered') {
      if (current.status !== 'out_for_delivery' && current.status !== 'assigned') {
        throw new Error('لا يمكن تأكيد التسليم إلا بعد خروج الشحنة للتوصيل');
      }
      updates.status = 'delivered';
      if (!current.delivered_at) {
        updates.delivered_at = now;
      }
      updates.delivered_by = options?.actorName || current.courier_id || 'مندوب التوصيل';
      updates.delivered_by_courier_id = current.courier_id || undefined;
      updates.failure_reason = undefined;
      updates.failure_note = undefined;
      updates.failure_notes = undefined;
      eventType = 'delivered';
      eventDetails = `تم تسليم الشحنة بنجاح للعميل (${current.customer_name}) وتحصيل ${Number(current.cod_amount).toLocaleString()} ج.م`;
    } else if (targetStatus === 'failed') {
      if (!options?.failureReason) {
        throw new Error('يرجى تحديد سبب تعذر التسليم');
      }
      const noteText = (options.failureNote || options.failureNotes || '').trim();
      if (options.failureReason === 'other' && !noteText) {
        throw new Error('يرجى كتابة تفاصيل سبب تعذر التسليم في حقل الملاحظات');
      }
      updates.status = 'failed';
      updates.failed_at = now;
      updates.failed_by = options?.actorName || current.courier_id || 'مندوب التوصيل';
      updates.failure_reason = options.failureReason;
      // Keep both for compatibility
      updates.failure_note = noteText;
      updates.failure_notes = noteText;
      eventType = 'delivery_failed';
      const reasonLabel = FAILURE_REASONS[options.failureReason as DeliveryFailureReason] || options.failureReason;
      eventDetails = `تعذر تسليم الشحنة - السبب: ${reasonLabel}${noteText ? ` (${noteText})` : ''}`;
    } else if (targetStatus === 'cancelled') {
      if (current.status === 'delivered') {
        throw new Error('لا يمكن إلغاء شحنة تم تسليمها بالفعل');
      }
      updates.status = 'cancelled';
      eventType = 'status_changed';
      eventDetails = 'تم إلغاء الشحنة';
    } else if (targetStatus === 'pending') {
      updates.status = 'pending';
      updates.courier_id = null;
      eventType = 'status_changed';
      eventDetails = 'تم إلغاء تعيين المندوب وإعادة الشحنة لقيد الانتظار';
    } else {
      updates.status = targetStatus;
    }

    // Apply courier change if explicitly provided
    if (options?.courierId !== undefined) {
      updates.courier_id = options.courierId;
      if (options.courierId && !current.assigned_at) {
        updates.assigned_at = now;
      }
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();
    if (error) {
      if (error.code === 'PGRST116') throw new Error('الطلب غير موجود');
      throw new Error(error.message);
    }

    // Add event
    await this.addOrderEvent({
      order_id: id,
      company_id: companyId,
      event_type: eventType,
      actor: options?.actorRole === 'courier' ? 'courier' : 'admin',
      actor_name: options?.actorName,
      details: eventDetails,
    });

    notifyOrderUpdated(id);
    return data;
  },

  async deleteOrder(companyId: string, id: string): Promise<boolean> {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);
    if (error) {
      if (error.code === 'PGRST116') return false;
      throw new Error(error.message);
    }
    notifyOrderUpdated(id);
    return true;
  },

  // ----------------------------------------------------
  // ORDER AUDIT TRAIL / EVENTS
  // ----------------------------------------------------
  async getOrderEvents(orderId: string, companyId: string): Promise<OrderEvent[]> {
    // First verify order belongs to company
    const order = await this.getOrderById(companyId, orderId);
    if (!order) return [];

    const { data, error } = await supabase
      .from('order_events')
      .select('*')
      .eq('order_id', orderId)
      .order('timestamp', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async getAllOrderEvents(companyId: string, filter?: {
    actor?: string;
    eventType?: string;
    startDate?: string;
    endDate?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    limit?: number;
  }): Promise<OrderEvent[]> {
    if (!companyId) return [];
    let query = supabase
      .from('order_events')
      .select('*')
      .eq('company_id', companyId);

    if (filter?.actor && filter.actor !== 'all') {
      query = query.eq('actor', filter.actor);
    }
    if (filter?.eventType && filter.eventType !== 'all') {
      query = query.eq('event_type', filter.eventType);
    }

    const sDate = filter?.startDate || filter?.dateFrom;
    const eDate = filter?.endDate || filter?.dateTo;
    if (sDate) {
      query = query.gte('timestamp', sDate);
    }
    if (eDate) {
      query = query.lte('timestamp', eDate + 'T23:59:59.999Z');
    }

    if (filter?.search) {
      // We need to join with orders table to search by order_number, customer_name, etc.
      // Since we are using Supabase, we can use a more complex query or fetch all and filter in memory.
      // For simplicity, we will fetch all events for the company and then filter in memory.
      // This is acceptable for moderate data sizes.
      // Alternatively, we could use a view or a more complex query, but we'll keep it simple.
      // We'll fetch events and then filter in code.
    }

    const { data, error } = await query.order('timestamp', { ascending: false });
    if (error) throw new Error(error.message);

    let events = data || [];

    // Apply search filter in memory (if needed)
    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      // Get orders for this company to resolve order numbers and customer names
      const orders = await this.getOrders(companyId);
      const orderMap: Record<string, Order> = {};
      orders.forEach(o => { orderMap[o.id] = o; });

      events = events.filter(event => {
        const ord = orderMap[event.order_id];
        const matchOrderNumber = ord?.order_number?.toLowerCase().includes(q) || false;
        const matchCustomer = ord?.customer_name?.toLowerCase().includes(q) || false;
        const matchDetails = event.details?.toLowerCase().includes(q) || false;
        const matchActorName = event.actor_name?.toLowerCase().includes(q) || false;
        return matchOrderNumber || matchCustomer || matchDetails || matchActorName;
      });
    }

    if (filter?.limit && filter.limit > 0) {
      events = events.slice(0, filter.limit);
    }
    return events;
  },

  async addOrderEvent(eventData: Omit<OrderEvent, 'id' | 'timestamp'>): Promise<OrderEvent> {
    // Verify order belongs to company (if order_id provided)
    if (eventData.order_id) {
      const order = await this.getOrderById(eventData.company_id, eventData.order_id);
      if (!order) {
        throw new Error('الطلب غير موجود في هذه الشركة');
      }
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('order_events')
      .insert({
        id: generateId(),
        ...eventData,
        timestamp: now,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  // ----------------------------------------------------
  // PUBLIC / CUSTOMER SELF-SERVICE DELIVERY CONFIRMATION
  // ----------------------------------------------------
  async getOrderByToken(token: string): Promise<{ order: Order; merchant: Merchant | null; company: Company | null } | null> {
    if (!token?.trim()) return null;
    const cleanToken = token.trim();

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('confirmation_token', cleanToken)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) return null;

    const merchant = await this.getMerchantById(order.company_id, order.merchant_id);
    const company = await this.getCompanyById(order.company_id);

    return { order, merchant, company };
  },

  async recordCustomerLinkOpened(token: string): Promise<void> {
    const result = await this.getOrderByToken(token);
    if (!result) return;
    const { order } = result;

    // Check if link_opened event was already recorded in last 30 minutes
    const events = await this.getOrderEvents(order.id, order.company_id);
    const recentOpen = events.find(e => e.event_type === 'link_opened' && (Date.now() - new Date(e.timestamp).getTime() < 30 * 60 * 1000));
    if (!recentOpen) {
      await this.addOrderEvent({
        order_id: order.id,
        company_id: order.company_id,
        event_type: 'link_opened',
        actor: 'customer',
        details: 'قام العميل بفتح رابط متابعة وتأكيد الشحنة',
      });
      notifyOrderUpdated(order.id);
    }
  },

  async customerConfirmDelivery(token: string): Promise<{ success: boolean; order?: Order; error?: string }> {
    const result = await this.getOrderByToken(token);
    if (!result) {
      return { success: false, error: 'رابط الشحنة غير صالح أو منتهي الصلاحية' };
    }
    const { order } = result;

    const now = new Date().toISOString();
    const updates = {
      customer_response_status: 'confirmed' as CustomerResponseStatus,
      customer_responded_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', order.id)
      .eq('company_id', order.company_id)
      .select()
      .single();
    if (error) {
      return { success: false, error: error.message };
    }

    await this.addOrderEvent({
      order_id: order.id,
      company_id: order.company_id,
      event_type: 'customer_confirmed',
      actor: 'customer',
      details: `قام العميل بتأكيد استلام الشحنة في موعدها المقرر (${order.delivery_date || 'اليوم'} - من ${order.delivery_from} إلى ${order.delivery_to})`,
    });

    // Notify Admin
    await this.addNotification(order.company_id, {
      recipient_role: 'admin',
      type: 'customer_confirmed',
      title: 'تأكيد موعد استلام شحنة',
      message: `قام العميل (${order.customer_name}) بتأكيد موعد استلام الشحنة #${order.order_number}`,
      order_id: order.id,
      order_number: order.order_number,
    });

    if (order.courier_id) {
      await this.addNotification(order.company_id, {
        recipient_role: 'courier',
        recipient_courier_id: order.courier_id,
        type: 'customer_confirmed',
        title: 'العميل أكد موعد التسليم',
        message: `أكد العميل موعد استلام الشحنة #${order.order_number} اليوم (${order.delivery_from} - ${order.delivery_to})`,
        order_id: order.id,
        order_number: order.order_number,
      });
    }

    notifyOrderUpdated(order.id);
    return { success: true, order: data };
  },

  async customerRescheduleDelivery(
    token: string,
    newDate: string,
    newFrom: string,
    newTo: string,
    customerNote?: string
  ): Promise<{ success: boolean; order?: Order; error?: string }> {
    if (!newDate) return { success: false, error: 'يرجى اختيار تاريخ التوصيل الجديد' };
    if (!newFrom || !newTo || newFrom >= newTo) {
      return { success: false, error: 'يرجى اختيار نافذة زمنية صحيحة للتوصيل' };
    }

    const result = await this.getOrderByToken(token);
    if (!result) {
      return { success: false, error: 'رابط الشحنة غير صالح أو منتهي الصلاحية' };
    }
    const { order } = result;

    const now = new Date().toISOString();
    const updates = {
      customer_response_status: 'reschedule_requested' as CustomerResponseStatus,
      customer_selected_date: newDate,
      customer_selected_from: newFrom,
      customer_selected_to: newTo,
      customer_note: customerNote?.trim() || '',
      customer_responded_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', order.id)
      .eq('company_id', order.company_id)
      .select()
      .single();
    if (error) {
      return { success: false, error: error.message };
    }

    const noteDetails = customerNote?.trim() ? ` - ملاحظة العميل: "${customerNote.trim()}"` : '';
    await this.addOrderEvent({
      order_id: order.id,
      company_id: order.company_id,
      event_type: 'customer_rescheduled',
      actor: 'customer',
      details: `طلب العميل تعديل موعد التوصيل إلى (${newDate} من ${newFrom} إلى ${newTo})${noteDetails}`,
    });

    await this.addNotification(order.company_id, {
      recipient_role: 'admin',
      type: 'customer_rescheduled',
      title: 'طلب تعديل موعد شحنة',
      message: `طلب العميل (${order.customer_name}) تأجيل موعد تسليم الشحنة #${order.order_number} إلى ${newDate}`,
      order_id: order.id,
      order_number: order.order_number,
    });

    if (order.courier_id) {
      await this.addNotification(order.company_id, {
        recipient_role: 'courier',
        recipient_courier_id: order.courier_id,
        type: 'customer_rescheduled',
        title: 'طلب تأجيل من العميل',
        message: `طلب العميل تأجيل موعد الشحنة #${order.order_number} إلى ${newDate}`,
        order_id: order.id,
        order_number: order.order_number,
      });
    }

    notifyOrderUpdated(order.id);
    return { success: true, order: data };
  },

  async customerCancelDelivery(token: string): Promise<{ success: boolean; order?: Order; error?: string }> {
    const result = await this.getOrderByToken(token);
    if (!result) {
      return { success: false, error: 'رابط الشحنة غير صالح أو منتهي الصلاحية' };
    }
    const { order } = result;

    if (order.status === 'delivered') {
      return { success: false, error: 'لا يمكن إلغاء الشحنة لأنها مسلّمة بالفعل' };
    }

    const now = new Date().toISOString();
    const updates = {
      status: 'cancelled' as OrderStatus,
      customer_response_status: 'cancelled' as CustomerResponseStatus,
      cancellation_source: 'customer',
      cancellation_timestamp: now,
      customer_responded_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', order.id)
      .eq('company_id', order.company_id)
      .select()
      .single();
    if (error) {
      return { success: false, error: error.message };
    }

    await this.addOrderEvent({
      order_id: order.id,
      company_id: order.company_id,
      event_type: 'customer_cancelled',
      actor: 'customer',
      details: 'قام العميل بإلغاء الشحنة بنفسه عبر صفحة تأكيد التسليم',
    });

    await this.addNotification(order.company_id, {
      recipient_role: 'admin',
      type: 'customer_cancelled',
      title: 'إلغاء الشحنة من قبل العميل',
      message: `قام العميل (${order.customer_name}) بإلغاء الشحنة #${order.order_number}`,
      order_id: order.id,
      order_number: order.order_number,
    });

    if (order.courier_id) {
      await this.addNotification(order.company_id, {
        recipient_role: 'courier',
        recipient_courier_id: order.courier_id,
        type: 'customer_cancelled',
        title: 'تم إلغاء الشحنة من العميل',
        message: `قام العميل بإلغاء الشحنة #${order.order_number}`,
        order_id: order.id,
        order_number: order.order_number,
      });
    }

    notifyOrderUpdated(order.id);
    return { success: true, order: data };
  },

  async recordWhatsAppSent(companyId: string, orderId: string, actor: 'admin' | 'courier', actorName?: string): Promise<void> {
    const order = await this.getOrderById(companyId, orderId);
    if (!order) return;

    const now = new Date().toISOString();
    await supabase
      .from('orders')
      .update({ confirmation_sent_at: now, updated_at: now })
      .eq('id', orderId)
      .eq('company_id', companyId);

    await this.addOrderEvent({
      order_id: orderId,
      company_id: companyId,
      event_type: 'whatsapp_sent',
      actor,
      actor_name: actorName,
      details: `تم إرسال رابط تأكيد الاستلام عبر واتساب إلى العميل (${order.customer_phone})`,
    });

    notifyOrderUpdated(orderId);
  },

  // ----------------------------------------------------
  // RETURNS (Enforcing company_id & multi-tenant RLS)
  // ----------------------------------------------------
  async getNextReturnNumber(companyId: string): Promise<string> {
    const { data, error } = await supabase
      .from('returns')
      .select('return_number')
      .eq('company_id', companyId)
      .order('return_number', { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    let maxNum = 0;
    if (data && data.length > 0) {
      const match = data[0].return_number?.match(/DLX-RET-(\d+)/);
      if (match && match[1]) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n)) maxNum = n;
      }
    }
    const nextVal = maxNum + 1;
    return `DLX-RET-${String(nextVal).padStart(6, '0')}`;
  },

  async getReturns(companyId: string, courierIdFilter?: string | null, merchantIdFilter?: string | null): Promise<ReturnRecord[]> {
    if (!companyId) return [];
    let query = supabase.from('returns').select('*').eq('company_id', companyId);
    if (courierIdFilter) {
      query = query.eq('courier_id', courierIdFilter);
    }
    if (merchantIdFilter) {
      query = query.eq('merchant_id', merchantIdFilter);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async getReturnById(companyId: string, id: string): Promise<ReturnRecord | null> {
    const { data, error } = await supabase
      .from('returns')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  },

  async getReturnByOrderId(companyId: string, orderId: string): Promise<ReturnRecord | null> {
    const { data, error } = await supabase
      .from('returns')
      .select('*')
      .eq('order_id', orderId)
      .eq('company_id', companyId)
      .maybeSingle();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  },

  async createReturn(companyId: string, data: {
    order_id: string;
    customer_name: string;
    customer_phone: string;
    return_address: string;
    return_amount: number;
    return_shipping_cost: number;
    other_cost: number;
    return_cost_payer?: ReturnCostPayer;
    refundable_amount?: number;
    return_cost_amount?: number;
    return_reason: ReturnReason;
    other_reason?: string;
    notes?: string;
    courier_id?: string | null;
    created_by: string;
    actorName?: string;
  }): Promise<ReturnRecord> {
    // Verify order exists and belongs to company
    const order = await this.getOrderById(companyId, data.order_id);
    if (!order) {
      throw new Error('الشحنة الأصلية غير موجودة');
    }

    // Prevent duplicate returns
    const existing = await this.getReturnByOrderId(companyId, data.order_id);
    if (existing) {
      throw new Error(`يوجد بالفعل طلب إرجاع مسجل لهذه الشحنة برقم (${existing.return_number})`);
    }

    if (order.status !== 'delivered' && order.status !== 'failed') {
      throw new Error('لا يمكن تسجيل إرجاع إلا للشحنات المسلمة أو المتعثرة');
    }

    if (!data.customer_name?.trim()) throw new Error('اسم العميل مطلوب');
    if (!data.customer_phone?.trim()) throw new Error('رقم هاتف العميل مطلوب');
    if (!data.return_address?.trim()) throw new Error('عنوان الإرجاع مطلوب');
    if (!data.return_reason) throw new Error('يرجى تحديد سبب الإرجاع');
    if (data.return_reason === 'other' && !data.other_reason?.trim()) {
      throw new Error('يرجى توضيح سبب الإرجاع في حقل السبب الآخر');
    }

    // Verify courier if provided
    if (data.courier_id) {
      const courier = await this.getCourierById(companyId, data.courier_id);
      if (!courier) {
        throw new Error('المندوب المحدد غير موجود في هذه الشركة');
      }
    }

    const returnAmount = Math.max(0, Number(data.return_amount) || 0);
    const returnShippingCost = Math.max(0, Number(data.return_shipping_cost) || 0);
    const otherCost = Math.max(0, Number(data.other_cost) || 0);
    const totalReturnAmount = returnAmount + returnShippingCost + otherCost;

    const returnCostPayer: ReturnCostPayer = data.return_cost_payer || 'none';
    const refundableAmount = Math.max(0, Number(data.refundable_amount !== undefined ? data.refundable_amount : returnAmount) || 0);
    let returnCostAmount = Math.max(0, Number(data.return_cost_amount) || 0);
    let customerNetRefund = refundableAmount;
    let merchantChargeAmount = 0;

    if (returnCostPayer === 'customer') {
      if (returnCostAmount > refundableAmount) {
        throw new Error(`تكلفة الإرجاع (${returnCostAmount} ج.م) لا يمكن أن تتجاوز المبلغ القابل للاسترداد (${refundableAmount} ج.م)`);
      }
      customerNetRefund = Math.max(0, Math.round((refundableAmount - returnCostAmount) * 100) / 100);
      merchantChargeAmount = 0;
    } else if (returnCostPayer === 'merchant') {
      customerNetRefund = refundableAmount;
      merchantChargeAmount = returnCostAmount;
    } else {
      returnCostAmount = 0;
      customerNetRefund = refundableAmount;
      merchantChargeAmount = 0;
    }

    const returnNumber = await this.getNextReturnNumber(companyId);
    const initialStatus: ReturnStatus = data.courier_id ? 'with_courier' : 'created';
    const now = new Date().toISOString();

    const newReturn: Omit<ReturnRecord, 'id'> = {
      company_id: companyId,
      order_id: data.order_id,
      merchant_id: order.merchant_id,
      courier_id: data.courier_id || null,
      return_number: returnNumber,
      customer_name: data.customer_name.trim(),
      customer_phone: data.customer_phone.trim(),
      return_address: data.return_address.trim(),
      return_amount: returnAmount,
      return_shipping_cost: returnShippingCost,
      other_cost: otherCost,
      total_return_amount: totalReturnAmount,
      return_cost_payer: returnCostPayer,
      refundable_amount: refundableAmount,
      return_cost_amount: returnCostAmount,
      customer_net_refund: customerNetRefund,
      merchant_charge_amount: merchantChargeAmount,
      return_reason: data.return_reason,
      other_reason: data.other_reason?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      status: initialStatus,
      created_by: data.actorName || data.created_by || 'Admin',
      created_at: now,
      updated_at: now,
    };

    const { data: inserted, error } = await supabase
      .from('returns')
      .insert(newReturn)
      .select()
      .single();
    if (error) throw new Error(error.message);

    // If Merchant pays the return cost, record debit transaction
    if (returnCostPayer === 'merchant' && merchantChargeAmount > 0) {
      await this.addMerchantTransaction(companyId, {
        merchant_id: order.merchant_id,
        transaction_type: 'RETURN_COST',
        direction: 'debit',
        amount: merchantChargeAmount,
        reference_type: 'return',
        reference_id: inserted.id,
        order_id: order.id,
        order_number: order.order_number,
        return_id: inserted.id,
        return_number: returnNumber,
        description: `تكلفة إرجاع شحنة (#${order.order_number}) - إرجاع #${returnNumber}`,
        created_by: data.actorName || data.created_by || 'Admin',
      });
    }

    await this.addOrderEvent({
      order_id: data.order_id,
      return_id: inserted.id,
      company_id: companyId,
      event_type: 'return_created',
      actor: 'admin',
      actor_name: data.actorName || data.created_by,
      details: `تم إنشاء إرجاع برقم (${returnNumber}) - المبلغ: ${totalReturnAmount.toLocaleString()} ج.م - تحمّل التكلفة: ${
        returnCostPayer === 'customer' ? 'العميل' : returnCostPayer === 'merchant' ? 'التاجر' : 'بدون تكلفة'
      } - صافي استرداد العميل: ${customerNetRefund.toLocaleString()} ج.م${merchantChargeAmount > 0 ? ` - مديونية على التاجر: ${merchantChargeAmount.toLocaleString()} ج.م` : ''}`,
    });

    await this.addNotification(companyId, {
      recipient_role: 'admin',
      type: 'return_created',
      title: 'تسجيل طلب إرجاع جديد',
      message: `تم إنشاء طلب إرجاع رقم (${returnNumber}) للشحنة #${order.order_number}`,
      order_id: data.order_id,
      order_number: order.order_number,
      return_id: inserted.id,
      return_number: returnNumber,
    });

    if (data.courier_id) {
      await this.addNotification(companyId, {
        recipient_role: 'courier',
        recipient_courier_id: data.courier_id,
        type: 'return_assigned',
        title: 'إسناد شحنة مرتجعة',
        message: `تم إسناد الشحنة المرتجعة رقم (${returnNumber}) إليك لاستلامها من العميل`,
        order_id: data.order_id,
        order_number: order.order_number,
        return_id: inserted.id,
        return_number: returnNumber,
      });
    }

    notifyOrderUpdated(data.order_id);
    return inserted;
  },

  async updateReturn(
    companyId: string,
    id: string,
    updates: Partial<ReturnRecord>,
    actorContext: { role: UserRole; name?: string; courierId?: string; }
  ): Promise<ReturnRecord> {
    const current = await this.getReturnById(companyId, id);
    if (!current) {
      throw new Error('طلب الإرجاع غير موجود');
    }

    const now = new Date().toISOString();

    // Security constraint: Courier cannot modify financial fields
    if (actorContext.role === 'courier') {
      const forbidden = ['return_amount', 'return_shipping_cost', 'other_cost', 'total_return_amount',
        'return_cost_payer', 'refundable_amount', 'return_cost_amount', 'customer_net_refund',
        'merchant_charge_amount', 'customer_phone', 'merchant_id', 'order_id', 'company_id'];
      for (const key of forbidden) {
        delete (updates as any)[key];
      }
    }

    // Recalculate totals if financial figures changed by Admin
    let returnAmount = updates.return_amount !== undefined ? Math.max(0, Number(updates.return_amount) || 0) : current.return_amount;
    let shippingCost = updates.return_shipping_cost !== undefined ? Math.max(0, Number(updates.return_shipping_cost) || 0) : current.return_shipping_cost;
    let otherCost = updates.other_cost !== undefined ? Math.max(0, Number(updates.other_cost) || 0) : current.other_cost;
    let totalReturnAmount = returnAmount + shippingCost + otherCost;

    let returnCostPayer = updates.return_cost_payer || current.return_cost_payer || 'none';
    let refundableAmount = updates.refundable_amount !== undefined ? Math.max(0, Number(updates.refundable_amount) || 0) : (current.refundable_amount ?? returnAmount);
    let returnCostAmount = updates.return_cost_amount !== undefined ? Math.max(0, Number(updates.return_cost_amount) || 0) : (current.return_cost_amount ?? 0);
    let customerNetRefund = refundableAmount;
    let merchantChargeAmount = 0;

    if (returnCostPayer === 'customer') {
      customerNetRefund = Math.max(0, Math.round((refundableAmount - returnCostAmount) * 100) / 100);
      merchantChargeAmount = 0;
    } else if (returnCostPayer === 'merchant') {
      customerNetRefund = refundableAmount;
      merchantChargeAmount = returnCostAmount;
    } else {
      returnCostAmount = 0;
      customerNetRefund = refundableAmount;
      merchantChargeAmount = 0;
    }

    let newStatus = updates.status || current.status;
    if (updates.courier_id && current.status === 'created' && !updates.status) {
      newStatus = 'with_courier';
    }

    const payload = {
      ...updates,
      return_amount: returnAmount,
      return_shipping_cost: shippingCost,
      other_cost: otherCost,
      total_return_amount: totalReturnAmount,
      return_cost_payer: returnCostPayer,
      refundable_amount: refundableAmount,
      return_cost_amount: returnCostAmount,
      customer_net_refund: customerNetRefund,
      merchant_charge_amount: merchantChargeAmount,
      status: newStatus,
      updated_by: actorContext.name,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('returns')
      .update(payload)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();
    if (error) throw new Error(error.message);

    await this.addOrderEvent({
      order_id: current.order_id,
      return_id: current.id,
      company_id: companyId,
      event_type: 'return_updated',
      actor: actorContext.role === 'courier' ? 'courier' : 'admin',
      actor_name: actorContext.name,
      details: `تم تحديث بيانات الإرجاع (${current.return_number})`,
    });

    notifyOrderUpdated(current.order_id);
    return data;
  },

  async updateReturnStatus(
    companyId: string,
    id: string,
    targetStatus: ReturnStatus,
    actorContext: { role: UserRole; name?: string; courierId?: string; }
  ): Promise<ReturnRecord> {
    const current = await this.getReturnById(companyId, id);
    if (!current) {
      throw new Error('طلب الإرجاع غير موجود');
    }

    const now = new Date().toISOString();
    const updates: Partial<ReturnRecord> = { status: targetStatus, updated_at: now };

    let eventType: OrderEvent['event_type'] = 'return_updated';
    let eventDetails = `تغيرت حالة الإرجاع إلى (${targetStatus})`;

    if (targetStatus === 'with_courier') {
      eventType = 'return_started';
      eventDetails = `استلم المندوب (${actorContext.name || 'المندوب'}) الشحنة المرتجعة وبدأ نقلها`;
    } else if (targetStatus === 'returned') {
      updates.returned_at = now;
      updates.returned_by = actorContext.name || 'مندوب التوصيل';
      updates.returned_by_courier_id = actorContext.courierId || current.courier_id || undefined;
      eventType = 'return_completed';
      eventDetails = `تم إرجاع الشحنة بنجاح للمتجر/الشركة بواسطة (${updates.returned_by})`;
    } else if (targetStatus === 'cancelled') {
      if (actorContext.role === 'courier') {
        throw new Error('لا يملك المندوب صلاحية إلغاء طلب الإرجاع');
      }
      eventType = 'return_cancelled';
      eventDetails = 'تم إلغاء طلب الإرجاع من قبل الإدارة';
    }

    const { data, error } = await supabase
      .from('returns')
      .update(updates)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();
    if (error) throw new Error(error.message);

    await this.addOrderEvent({
      order_id: current.order_id,
      return_id: current.id,
      company_id: companyId,
      event_type: eventType,
      actor: actorContext.role === 'courier' ? 'courier' : 'admin',
      actor_name: actorContext.name,
      details: eventDetails,
    });

    if (targetStatus === 'returned') {
      await this.addNotification(companyId, {
        recipient_role: 'admin',
        type: 'return_completed',
        title: 'استكمال إرجاع الشحنة',
        message: `تم استكمال إرجاع الشحنة رقم (${current.return_number}) وتسليمها للشركة بنجاح`,
        order_id: current.order_id,
        return_id: current.id,
        return_number: current.return_number,
      });
    }

    notifyOrderUpdated(current.order_id);
    return data;
  },

  async getReturnMetrics(companyId: string, courierId?: string | null, merchantId?: string | null) {
    const list = await this.getReturns(companyId, courierId, merchantId);
    const createdCount = list.filter(r => r.status === 'created').length;
    const withCourierCount = list.filter(r => r.status === 'with_courier').length;
    const returnedCount = list.filter(r => r.status === 'returned').length;
    const cancelledCount = list.filter(r => r.status === 'cancelled').length;
    const totalReturnValue = list.reduce((sum, r) => sum + (Number(r.total_return_amount) || 0), 0);

    return {
      totalReturns: list.length,
      createdCount,
      withCourierCount,
      returnedCount,
      cancelledCount,
      totalReturnValue,
      activeReturnsCount: createdCount + withCourierCount,
    };
  },

  // ----------------------------------------------------
  // NOTIFICATIONS
  // ----------------------------------------------------
  async getNotifications(companyId: string, filter?: { role?: 'admin' | 'courier'; courierId?: string; unreadOnly?: boolean }): Promise<AppNotification[]> {
    if (!companyId) return [];
    let query = supabase.from('notifications').select('*').eq('company_id', companyId);

    if (filter?.role) {
      query = query.eq('recipient_role', filter.role);
    }
    if (filter?.courierId) {
      query = query.eq('recipient_courier_id', filter.courierId);
    }
    if (filter?.unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async addNotification(companyId: string, data: Omit<AppNotification, 'id' | 'created_at' | 'read' | 'company_id'>): Promise<AppNotification> {
    const now = new Date().toISOString();
    const { data: inserted, error } = await supabase
      .from('notifications')
      .insert({
        id: 'notif-' + generateId().slice(0, 8),
        company_id: companyId,
        created_at: now,
        read: false,
        ...data,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    notifyOrderUpdated(data.order_id);
    return inserted;
  },

  async markNotificationAsRead(companyId: string, notifId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notifId)
      .eq('company_id', companyId);
    if (error) {
      if (error.code === 'PGRST116') return false;
      throw new Error(error.message);
    }
    notifyOrderUpdated();
    return true;
  },

  async markAllNotificationsAsRead(companyId: string, filter?: { role?: 'admin' | 'courier'; courierId?: string }): Promise<boolean> {
    let query = supabase.from('notifications').update({ read: true }).eq('company_id', companyId);
    if (filter?.role) {
      query = query.eq('recipient_role', filter.role);
    }
    if (filter?.courierId) {
      query = query.eq('recipient_courier_id', filter.courierId);
    }
    const { error } = await query;
    if (error) throw new Error(error.message);
    notifyOrderUpdated();
    return true;
  },

  // ----------------------------------------------------
  // COMPANY DELIVERY SLOTS & SETTINGS
  // ----------------------------------------------------
  async getDeliverySlots(companyId: string): Promise<DeliverySlot[]> {
    const company = await this.getCompanyById(companyId);
    if (company && company.delivery_slots && company.delivery_slots.length > 0) {
      return company.delivery_slots;
    }
    return DEFAULT_DELIVERY_SLOTS;
  },

  async saveDeliverySlots(companyId: string, slots: DeliverySlot[]): Promise<Company> {
    const updated = await this.updateCompany(companyId, { delivery_slots: slots });
    if (!updated) throw new Error('الشركة غير موجودة');
    notifyOrderUpdated();
    return updated;
  },

  async updateDeliverySlots(companyId: string, slots: DeliverySlot[]): Promise<Company> {
    return this.saveDeliverySlots(companyId, slots);
  },

  async addDeliverySlot(companyId: string, slotData: Omit<DeliverySlot, 'id'>): Promise<DeliverySlot> {
    const currentSlots = await this.getDeliverySlots(companyId);
    const newSlot: DeliverySlot = {
      id: 'slot-' + generateId().slice(0, 6),
      ...slotData,
    };
    const updatedSlots = [...currentSlots, newSlot];
    await this.saveDeliverySlots(companyId, updatedSlots);
    return newSlot;
  },

  async updateDeliverySlot(companyId: string, slotId: string, updates: Partial<DeliverySlot>): Promise<DeliverySlot> {
    const currentSlots = await this.getDeliverySlots(companyId);
    const index = currentSlots.findIndex(s => s.id === slotId);
    if (index === -1) throw new Error('فترة التوصيل غير موجودة');
    const updatedSlot = { ...currentSlots[index], ...updates };
    currentSlots[index] = updatedSlot;
    await this.saveDeliverySlots(companyId, currentSlots);
    return updatedSlot;
  },

  async toggleDeliverySlot(companyId: string, slotId: string): Promise<DeliverySlot | null> {
    const currentSlots = await this.getDeliverySlots(companyId);
    const index = currentSlots.findIndex(s => s.id === slotId);
    if (index === -1) return null;
    currentSlots[index].is_active = !currentSlots[index].is_active;
    await this.saveDeliverySlots(companyId, currentSlots);
    return currentSlots[index];
  },

  async deleteDeliverySlot(companyId: string, slotId: string): Promise<boolean> {
    const currentSlots = await this.getDeliverySlots(companyId);
    const filtered = currentSlots.filter(s => s.id !== slotId);
    if (filtered.length === currentSlots.length) return false;
    await this.saveDeliverySlots(companyId, filtered);
    return true;
  },

  // ----------------------------------------------------
  // PROFILE & COMPANY UPDATES
  // ----------------------------------------------------
  async updateCompanyProfile(companyId: string, data: { name?: string; phone?: string; email?: string; address?: string; logo_url?: string }): Promise<Company> {
    const updated = await this.updateCompany(companyId, data);
    if (!updated) throw new Error('الشركة غير موجودة');
    notifyOrderUpdated();
    return updated;
  },

  async updateAdminProfile(companyId: string, profileId: string, data: { full_name?: string; phone?: string }): Promise<Profile> {
    const profile = await this.getProfileById(profileId);
    if (!profile || profile.company_id !== companyId) {
      throw new Error('الملف الشخصي غير موجود');
    }
    const updated = await this.updateProfile(profileId, data);
    if (!updated) throw new Error('فشل التحديث');
    notifyOrderUpdated();
    return updated;
  },

  async updateCourierSelfProfile(companyId: string, courierId: string, data: { full_name?: string; phone?: string; vehicle_type?: string; vehicle_plate?: string }): Promise<Courier> {
    const courier = await this.getCourierById(companyId, courierId);
    if (!courier) {
      throw new Error('حساب المندوب غير موجود');
    }
    const updated = await this.updateCourier(companyId, courierId, data);
    if (!updated) throw new Error('فشل التحديث');
    notifyOrderUpdated();
    return updated;
  },

  // ----------------------------------------------------
  // ACTIVITY LOGS / AUDIT TRAIL QUERY
  // ----------------------------------------------------
  async getOrderActivityLogs(
    companyId: string,
    filters?: {
      dateFrom?: string;
      dateTo?: string;
      actor?: string;
      eventType?: string;
      search?: string;
      limit?: number;
    }
  ): Promise<{ event: OrderEvent; order?: Order; returnRecord?: ReturnRecord }[]> {
    if (!companyId) return [];
    const events = await this.getAllOrderEvents(companyId, filters);

    const ordersMap = new Map<string, Order>();
    const returnsMap = new Map<string, ReturnRecord>();

    // Fetch orders and returns that appear in events
    const orderIds = [...new Set(events.map(e => e.order_id).filter(Boolean))];
    const returnIds = [...new Set(events.map(e => e.return_id).filter(Boolean))];

    if (orderIds.length > 0) {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .in('id', orderIds)
        .eq('company_id', companyId);
      if (!error && orders) {
        orders.forEach(o => ordersMap.set(o.id, o));
      }
    }

    if (returnIds.length > 0) {
      const { data: returns, error } = await supabase
        .from('returns')
        .select('*')
        .in('id', returnIds)
        .eq('company_id', companyId);
      if (!error && returns) {
        returns.forEach(r => returnsMap.set(r.id, r));
      }
    }

    return events.map(event => ({
      event,
      order: event.order_id ? ordersMap.get(event.order_id) : undefined,
      returnRecord: event.return_id ? returnsMap.get(event.return_id) : undefined,
    }));
  },

  // ----------------------------------------------------
  // COURIER COD COLLECTIONS & DEBT SETTLEMENTS (Strict Multi-Tenant RLS)
  // ----------------------------------------------------
  async getSettlements(companyId: string, courierId?: string): Promise<CourierSettlement[]> {
    if (!companyId) return [];
    let query = supabase.from('courier_settlements').select('*').eq('company_id', companyId);
    if (courierId) {
      query = query.eq('courier_id', courierId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  async getSettlementById(companyId: string, id: string): Promise<CourierSettlement | null> {
    if (!companyId || !id) return null;
    const { data, error } = await supabase
      .from('courier_settlements')
      .select('*')
      .eq('company_id', companyId)
      .or(`id.eq.${id},settlement_number.eq.${id}`)
      .maybeSingle();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  },

  async getCourierCollectionSummary(companyId: string, courierId: string): Promise<CourierCollectionSummary | null> {
    if (!companyId || !courierId) return null;
    const courier = await this.getCourierById(companyId, courierId);
    if (!courier) return null;

    const orders = await this.getOrders(companyId, courierId);
    const seenOrderIds = new Set<string>();
    const deliveredOrders = orders.filter(o => {
      if (o.status !== 'delivered') return false;
      if (seenOrderIds.has(o.id)) return false;
      seenOrderIds.add(o.id);
      return true;
    });

    const deliveredCodOrders = deliveredOrders.filter(o => (Number(o.cod_amount) || 0) > 0);
    const totalDeliveredCod = deliveredCodOrders.reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);

    const settlements = await this.getSettlements(companyId, courierId);
    const totalSettledAmount = settlements.reduce((sum, s) => sum + (Number(s.received_amount) || 0), 0);

    const currentOutstandingBalance = Math.max(0, Math.round((totalDeliveredCod - totalSettledAmount) * 100) / 100);
    const lastSettlementDate = settlements.length > 0 ? settlements[0].created_at : null;

    return {
      courier_id: courierId,
      courier,
      total_delivered_cod: totalDeliveredCod,
      total_settled_amount: totalSettledAmount,
      current_outstanding_balance: currentOutstandingBalance,
      delivered_cod_orders_count: deliveredCodOrders.length,
      delivered_cod_orders: deliveredCodOrders,
      settlements_count: settlements.length,
      last_settlement_date: lastSettlementDate,
    };
  },

  async getAllCouriersCollections(companyId: string): Promise<CourierCollectionSummary[]> {
    if (!companyId) return [];
    const couriers = await this.getCouriers(companyId);
    const summaries: CourierCollectionSummary[] = [];
    for (const courier of couriers) {
      const summary = await this.getCourierCollectionSummary(companyId, courier.id);
      if (summary) {
        summaries.push(summary);
      }
    }
    return summaries.sort((a, b) => b.current_outstanding_balance - a.current_outstanding_balance);
  },

  async getOutstandingCollectionsTotal(companyId: string): Promise<{ totalOutstanding: number; couriersWithDebtCount: number }> {
    const collections = await this.getAllCouriersCollections(companyId);
    const totalOutstanding = collections.reduce((sum, c) => sum + c.current_outstanding_balance, 0);
    const couriersWithDebtCount = collections.filter(c => c.current_outstanding_balance > 0).length;
    return {
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      couriersWithDebtCount,
    };
  },

  async createSettlement(
    companyId: string,
    data: {
      courierId: string;
      receivedAmount: number;
      settledBy: string;
      settledByProfileId?: string;
      notes?: string;
    }
  ): Promise<CourierSettlement> {
    if (!companyId) {
      throw new Error('معرف الشركة مطلوب لإجراء التسوية');
    }

    const courier = await this.getCourierById(companyId, data.courierId);
    if (!courier) {
      throw new Error('المندوب المحدد غير موجود في قاعدة بيانات الشركة');
    }

    const received = Number(data.receivedAmount);
    if (isNaN(received) || received <= 0) {
      throw new Error('مبلغ الاستلام يجب أن يكون رقماً موجباً أكبر من الصفر');
    }

    const summary = await this.getCourierCollectionSummary(companyId, data.courierId);
    if (!summary) {
      throw new Error('تعذر احتساب مبالغ التحصيلات الحالية للمندوب');
    }

    const expectedAmount = summary.current_outstanding_balance;
    if (expectedAmount <= 0) {
      throw new Error('لا توجد تحصيلات نقدية معلقة لتسويتها لهذا المندوب');
    }

    if (received > expectedAmount) {
      throw new Error('المبلغ المستلم لا يمكن أن يتجاوز إجمالي التحصيلات المعلقة');
    }

    const remainingAmount = Math.max(0, Math.round((expectedAmount - received) * 100) / 100);

    // Generate settlement number using count
    const { count, error: countError } = await supabase
      .from('courier_settlements')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);
    if (countError) throw new Error(countError.message);
    const seqNum = (count || 0) + 1;
    const settlementNumber = `SET-${String(seqNum).padStart(4, '0')}`;

    const now = new Date().toISOString();
    const newSettlement: Omit<CourierSettlement, 'id'> = {
      company_id: companyId,
      courier_id: courier.id,
      settlement_number: settlementNumber,
      expected_amount: expectedAmount,
      received_amount: received,
      remaining_amount: remainingAmount,
      settled_by: data.settledBy.trim() || 'الإدارة',
      settled_by_profile_id: data.settledByProfileId,
      notes: data.notes?.trim() || undefined,
      created_at: now,
    };

    const { data: inserted, error } = await supabase
      .from('courier_settlements')
      .insert(newSettlement)
      .select()
      .single();
    if (error) throw new Error(error.message);

    await this.addOrderEvent({
      order_id: '',
      company_id: companyId,
      event_type: 'settlement_created',
      timestamp: now,
      actor: 'admin',
      actor_name: data.settledBy,
      details: `تسوية تحصيلات نقدية للمندوب (${courier.full_name} - ${courier.employee_id}) برقم (${settlementNumber}) | المبلغ المستحق: ${expectedAmount.toLocaleString()} ج.م | المستلم: ${received.toLocaleString()} ج.م | المتبقي: ${remainingAmount.toLocaleString()} ج.م${data.notes ? ` - ملاحظات: ${data.notes}` : ''}`,
      metadata: {
        settlement_id: inserted.id,
        settlement_number: settlementNumber,
        courier_id: courier.id,
        courier_name: courier.full_name,
        employee_id: courier.employee_id,
        expected_amount: expectedAmount,
        received_amount: received,
        remaining_amount: remainingAmount,
      },
    });

    notifyOrderUpdated();
    return inserted;
  },

  // ----------------------------------------------------
  // MERCHANT FINANCIAL LEDGER & ACCOUNTING SYSTEM
  // ----------------------------------------------------
  async getMerchantTransactions(companyId: string, merchantId?: string): Promise<any[]> {
    if (!companyId) return [];
    let query = supabase.from('merchant_transactions').select('*').eq('company_id', companyId);
    if (merchantId) {
      query = query.eq('merchant_id', merchantId);
    }
    const { data, error } = await query.order('created_at', { ascending: true });
    if (error) throw new Error(error.message);

    const list = data || [];
    let currentBalance = 0;
    const withRunning = list.map(t => {
      if (t.direction === 'credit') {
        currentBalance += t.amount;
      } else {
        currentBalance -= t.amount;
      }
      return {
        ...t,
        type: t.direction,
        running_balance: Math.round(currentBalance * 100) / 100,
      };
    });

    return withRunning.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async addMerchantTransaction(
    companyId: string,
    data: Omit<MerchantTransaction, 'id' | 'company_id' | 'created_at'>
  ): Promise<MerchantTransaction> {
    if (!companyId || !data.merchant_id) {
      throw new Error('معرف الشركة ومعرف التاجر مطلوبان لإجراء المعاملة المالية');
    }

    // Verify merchant belongs to company
    const merchant = await this.getMerchantById(companyId, data.merchant_id);
    if (!merchant) {
      throw new Error('التاجر المحدد غير موجود في هذه الشركة');
    }

    const amount = Number(data.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('مبلغ المعاملة المالية يجب أن يكون رقماً موجباً أكبر من الصفر');
    }

    const now = new Date().toISOString();
    const newTx: Omit<MerchantTransaction, 'id'> = {
      company_id: companyId,
      merchant_id: data.merchant_id,
      transaction_type: data.transaction_type,
      direction: data.direction,
      amount: Math.round(amount * 100) / 100,
      reference_type: data.reference_type,
      reference_id: data.reference_id,
      order_id: data.order_id,
      order_number: data.order_number,
      return_id: data.return_id,
      return_number: data.return_number,
      settlement_id: data.settlement_id,
      settlement_number: data.settlement_number,
      description: data.description.trim(),
      created_by: data.created_by.trim() || 'Admin',
      created_at: now,
    };

    const { data: inserted, error } = await supabase
      .from('merchant_transactions')
      .insert(newTx)
      .select()
      .single();
    if (error) throw new Error(error.message);

    notifyOrderUpdated();
    return inserted;
  },

  async getMerchantSettlements(companyId: string, merchantId?: string): Promise<any[]> {
    if (!companyId) return [];
    let query = supabase.from('merchant_settlements').select('*').eq('company_id', companyId);
    if (merchantId) {
      query = query.eq('merchant_id', merchantId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    return (data || []).map(s => ({
      ...s,
      amount: s.paid_amount,
      type: s.settlement_type,
      created_by: s.settled_by,
      settlement_date: s.created_at,
    }));
  },

  async getNextMerchantSettlementNumber(companyId: string): Promise<string> {
    const { count, error } = await supabase
      .from('merchant_settlements')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);
    if (error) throw new Error(error.message);
    const seqNum = (count || 0) + 1;
    return `MSET-${String(seqNum).padStart(4, '0')}`;
  },

  async createMerchantSettlement(
    companyId: string,
    data: {
      merchantId: string;
      settlementType: MerchantSettlementType;
      amount: number;
      settledBy: string;
      settledByProfileId?: string;
      notes?: string;
      payment_method?: string;
      reference_number?: string;
    }
  ): Promise<MerchantSettlement> {
    if (!companyId) throw new Error('معرف الشركة مطلوب لإجراء التسوية');
    const merchant = await this.getMerchantById(companyId, data.merchantId);
    if (!merchant) throw new Error('التاجر المحدد غير موجود');

    const amount = Number(data.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('مبلغ التسوية يجب أن يكون رقماً موجباً أكبر من الصفر');
    }

    const summary = await this.getMerchantFinancialSummary(companyId, data.merchantId);
    if (!summary) throw new Error('تعذر احتساب الحساب المالي للتاجر');

    let expectedAmount = 0;
    if (data.settlementType === 'payout_to_merchant') {
      expectedAmount = summary.amount_due_to_merchant;
      if (expectedAmount <= 0) {
        throw new Error('لا توجد مستحقات معلقة للصرف لهذا التاجر');
      }
      if (amount > expectedAmount) {
        throw new Error(`المبلغ المصروف (${amount} ج.م) يتجاوز إجمالي المستحقات المعلقة (${expectedAmount} ج.م)`);
      }
    } else if (data.settlementType === 'debt_collection') {
      expectedAmount = summary.merchant_debt_to_company;
      if (expectedAmount <= 0) {
        throw new Error('لا توجد مديونية مستحقة للتحصيل من هذا التاجر');
      }
      if (amount > expectedAmount) {
        throw new Error(`المبلغ المحصل (${amount} ج.م) يتجاوز إجمالي المديونية المستحقة (${expectedAmount} ج.م)`);
      }
    } else {
      // net_settlement
      expectedAmount = Math.abs(summary.net_position);
      if (expectedAmount <= 0) {
        throw new Error('صافي الحساب المالي صفر بالفعل ولا توجد تسوية مطلوبة');
      }
      if (amount > expectedAmount) {
        throw new Error(`مبلغ التسوية (${amount} ج.م) يتجاوز صافي المركز المالي (${expectedAmount} ج.م)`);
      }
    }

    const remainingAmount = Math.max(0, Math.round((expectedAmount - amount) * 100) / 100);
    const settlementNumber = await this.getNextMerchantSettlementNumber(companyId);
    const now = new Date().toISOString();

    const newSettlement: Omit<MerchantSettlement, 'id'> = {
      company_id: companyId,
      merchant_id: merchant.id,
      settlement_number: settlementNumber,
      settlement_type: data.settlementType,
      type: data.settlementType,
      amount,
      expected_amount: expectedAmount,
      paid_amount: amount,
      remaining_amount: remainingAmount,
      payment_method: data.payment_method,
      reference_number: data.reference_number,
      settled_by: data.settledBy.trim() || 'الإدارة',
      created_by: data.settledBy.trim() || 'الإدارة',
      settlement_date: now,
      settled_by_profile_id: data.settledByProfileId,
      notes: data.notes?.trim() || undefined,
      created_at: now,
    };

    const { data: inserted, error } = await supabase
      .from('merchant_settlements')
      .insert(newSettlement)
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Record corresponding transaction
    let txType: MerchantTransactionType = 'MERCHANT_SETTLEMENT';
    let txDirection: 'credit' | 'debit' = 'debit';
    let txDesc = `تسوية صرف مستحقات للتاجر برقم (${settlementNumber})`;

    if (data.settlementType === 'debt_collection') {
      txType = 'MERCHANT_DEBT_PAYMENT';
      txDirection = 'credit';
      txDesc = `تحصيل مديونية من التاجر برقم (${settlementNumber})`;
    } else if (data.settlementType === 'net_settlement') {
      if (summary.net_position > 0) {
        txType = 'MERCHANT_SETTLEMENT';
        txDirection = 'debit';
        txDesc = `تسوية صافي مستحقات للتاجر برقم (${settlementNumber})`;
      } else {
        txType = 'MERCHANT_DEBT_PAYMENT';
        txDirection = 'credit';
        txDesc = `تسوية سداد مديونية التاجر برقم (${settlementNumber})`;
      }
    }

    await this.addMerchantTransaction(companyId, {
      merchant_id: merchant.id,
      transaction_type: txType,
      direction: txDirection,
      amount,
      reference_type: 'settlement',
      reference_id: inserted.id,
      settlement_id: inserted.id,
      settlement_number: settlementNumber,
      description: txDesc + (data.notes ? ` - ملاحظات: ${data.notes}` : ''),
      created_by: data.settledBy,
    });

    await this.addOrderEvent({
      order_id: '',
      company_id: companyId,
      event_type: 'settlement_created',
      timestamp: now,
      actor: 'admin',
      actor_name: data.settledBy,
      details: `تسوية مالية لمتجر (${merchant.store_name}) برقم (${settlementNumber}) | النوع: ${
        data.settlementType === 'payout_to_merchant' ? 'صرف مستحقات' : data.settlementType === 'debt_collection' ? 'تحصيل مديونية' : 'تسوية صافي'
      } | المبلغ: ${amount.toLocaleString()} ج.م | المتبقي: ${remainingAmount.toLocaleString()} ج.م`,
    });

    notifyOrderUpdated();
    return inserted;
  },

  async getMerchantFinancialSummary(companyId: string, merchantId: string): Promise<MerchantFinancialSummary | null> {
    if (!companyId || !merchantId) return null;
    const merchant = await this.getMerchantById(companyId, merchantId);
    if (!merchant) return null;

    const orders = await this.getOrders(companyId);
    const merchantOrders = orders.filter(o => o.merchant_id === merchantId);
    const deliveredOrders = merchantOrders.filter(o => o.status === 'delivered');
    const deliveredCodSum = deliveredOrders.reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);

    const transactions = await this.getMerchantTransactions(companyId, merchantId);
    const settlements = await this.getMerchantSettlements(companyId, merchantId);

    // Payouts (money paid to merchant)
    const payoutsSum = settlements
      .filter(s => s.settlement_type === 'payout_to_merchant')
      .reduce((sum, s) => sum + s.paid_amount, 0);

    // Manual credits
    const manualCredits = transactions
      .filter(t => t.transaction_type === 'CREDIT_TO_MERCHANT')
      .reduce((sum, t) => sum + t.amount, 0);

    // Amount Due = delivered COD + manual credits - payouts
    const amountDue = Math.max(0, Math.round((deliveredCodSum + manualCredits - payoutsSum) * 100) / 100);

    // Debits
    const returnCosts = transactions
      .filter(t => t.transaction_type === 'RETURN_COST')
      .reduce((sum, t) => sum + t.amount, 0);
    const shippingCharges = transactions
      .filter(t => t.transaction_type === 'SHIPPING_CHARGE')
      .reduce((sum, t) => sum + t.amount, 0);
    const manualDebits = transactions
      .filter(t => t.transaction_type === 'DEBIT_FROM_MERCHANT')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalDebits = returnCosts + shippingCharges + manualDebits;

    // Debt payments collected
    const debtPayments = settlements
      .filter(s => s.settlement_type === 'debt_collection')
      .reduce((sum, s) => sum + s.paid_amount, 0);

    // For net_settlement, we need to consider that net settlements affect both sides
    // We will treat net settlements as adjusting the balance directly.
    // Since we record transactions for net settlements, we can use them.
    // Let's compute net position using transactions and settlements.
    // However, we already have amountDue and merchantDebt. But net settlements are included in payouts/debt payments?
    // To be precise: net_settlement transaction is recorded as either MERCHANT_SETTLEMENT (debit) or MERCHANT_DEBT_PAYMENT (credit)
    // This will be reflected in transactions, so our calculations using transactions should be correct.
    // We need to ensure that we don't double count net settlements in both payouts and debt payments.
    // We'll handle it by not including net_settlement in payoutsSum or debtPayments separately; instead we rely on transactions.

    // Actually, our payoutsSum and debtPayments are based on settlement_type, ignoring net_settlement.
    // The net_settlement is handled via transactions. So amountDue and merchantDebt should be correct.

    const merchantDebt = Math.max(0, Math.round((totalDebits - debtPayments) * 100) / 100);

    // Net position = amountDue - merchantDebt
    const netPosition = Math.round((amountDue - merchantDebt) * 100) / 100;

    const returnsList = await this.getReturns(companyId);
    const merchantReturns = returnsList.filter(r => r.merchant_id === merchantId);

    const lastSettlementDate = settlements.length > 0 ? settlements[0].created_at : null;

    return {
      merchant_id: merchantId,
      merchant,
      amount_due_to_merchant: amountDue,
      merchant_debt_to_company: merchantDebt,
      net_position: netPosition,
      net_balance: netPosition,
      total_cod_earned: deliveredCodSum + manualCredits,
      total_delivered_orders: deliveredOrders.length,
      total_returns_debited: totalDebits,
      total_settled_paid: payoutsSum + debtPayments, // total settled (could be payouts or debt collections)
      total_orders_count: merchantOrders.length,
      total_orders: merchantOrders.length,
      delivered_orders_count: deliveredOrders.length,
      returns_count: merchantReturns.length,
      settlements_count: settlements.length,
      transactions_count: transactions.length,
      last_settlement_date: lastSettlementDate,
    };
  },

  async getAllMerchantsFinancialSummaries(companyId: string): Promise<MerchantFinancialSummary[]> {
    if (!companyId) return [];
    const merchants = await this.getMerchants(companyId);
    const summaries: MerchantFinancialSummary[] = [];
    for (const m of merchants) {
      const summary = await this.getMerchantFinancialSummary(companyId, m.id);
      if (summary) {
        summaries.push(summary);
      }
    }
    return summaries.sort((a, b) => b.total_orders_count - a.total_orders_count);
  },

  // ----------------------------------------------------
  // DASHBOARD METRICS
  // ----------------------------------------------------
  async getAdminMetrics(companyId: string) {
    const merchants = await this.getMerchants(companyId);
    const couriers = await this.getCouriers(companyId);
    const orders = await this.getOrders(companyId);
    const returnsMetrics = await this.getReturnMetrics(companyId);
    const returnsList = await this.getReturns(companyId);

    const activeCouriersCount = couriers.filter(c => c.status === 'active').length;
    const activeMerchantsCount = merchants.filter(m => m.status === 'active').length;
    const totalCodAmount = orders.reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);
    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    const deliveredCodAmount = deliveredOrders.reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);

    const completedOrFailed = orders.filter(o => o.status === 'delivered' || o.status === 'failed').length;
    const deliverySuccessRate = completedOrFailed > 0
      ? Math.round((deliveredOrders.length / completedOrFailed) * 100)
      : 0; // fixed: 0 instead of 100

    const outstandingCollections = await this.getOutstandingCollectionsTotal(companyId);

    const todayStr = new Date().toISOString().split('T')[0];
    // Use delivery_date = today or created_at = today (for pending orders)
    const todayOrders = orders.filter(o => o.delivery_date === todayStr || o.created_at.startsWith(todayStr));

    const todayDelivered = todayOrders.filter(o => o.status === 'delivered').length;
    const todayFailed = todayOrders.filter(o => o.status === 'failed').length;
    const todayAssigned = todayOrders.filter(o => o.status === 'assigned').length;
    const todayOutForDelivery = todayOrders.filter(o => o.status === 'out_for_delivery').length;
    const todayConfirmed = todayOrders.filter(o => o.customer_response_status === 'confirmed').length;
    const todayRescheduled = todayOrders.filter(o => o.customer_response_status === 'reschedule_requested').length;
    const todayCancelled = todayOrders.filter(o => o.status === 'cancelled').length;
    const completedToday = todayDelivered + todayFailed;
    const successRateToday = completedToday > 0 ? Math.round((todayDelivered / completedToday) * 100) : 0;

    const todayOverview = {
      total: todayOrders.length,
      totalScheduledToday: todayOrders.length,
      assigned: todayAssigned,
      out_for_delivery: todayOutForDelivery,
      outForDeliveryToday: todayOutForDelivery,
      delivered: todayDelivered,
      deliveredToday: todayDelivered,
      failed: todayFailed,
      failedToday: todayFailed,
      cancelled: todayCancelled,
      confirmedToday: todayConfirmed,
      rescheduledToday: todayRescheduled,
      successRateToday,
    };

    // Courier performance - today only
    const courierPerformance = await Promise.all(couriers.map(async courier => {
      const courierOrders = orders.filter(o => o.courier_id === courier.id);
      // Only today's orders for this courier
      const courierTodayOrders = courierOrders.filter(o => o.delivery_date === todayStr || o.created_at.startsWith(todayStr));
      // Use only today's orders, not fallback to all
      const target = courierTodayOrders; // no fallback
      const deliveredCount = target.filter(o => o.status === 'delivered').length;
      const failedCount = target.filter(o => o.status === 'failed').length;
      const totalDone = deliveredCount + failedCount;
      const successRate = totalDone > 0 ? Math.round((deliveredCount / totalDone) * 100) : 0;
      const collectedCod = target.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);

      return {
        id: courier.id,
        name: courier.full_name,
        employeeId: courier.employee_id,
        phone: courier.phone,
        courier,
        assignedCount: target.length,
        deliveredCount,
        failedCount,
        pendingCount: target.filter(o => o.status === 'assigned' || o.status === 'out_for_delivery').length,
        successRate,
        collectedCod,
      };
    }));
    courierPerformance.sort((a, b) => b.assignedCount - a.assignedCount);

    // Merchant performance
    const merchantPerformance = merchants.map(merchant => {
      const mOrders = orders.filter(o => o.merchant_id === merchant.id);
      const mReturns = returnsList.filter(r => r.merchant_id === merchant.id);
      const deliveredCount = mOrders.filter(o => o.status === 'delivered').length;
      const failedCount = mOrders.filter(o => o.status === 'failed').length;
      const totalDone = deliveredCount + failedCount;
      const successRate = totalDone > 0 ? Math.round((deliveredCount / totalDone) * 100) : 0;
      const totalCod = mOrders.reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);
      const totalReturnValue = mReturns.reduce((sum, r) => sum + (Number(r.total_return_amount) || 0), 0);

      return {
        id: merchant.id,
        name: merchant.store_name,
        merchant,
        totalOrders: mOrders.length,
        deliveredOrders: deliveredCount,
        deliveredCount,
        failedCount,
        cancelledCount: mOrders.filter(o => o.status === 'cancelled').length,
        returnsCount: mReturns.length,
        totalCod,
        totalReturnValue,
        successRate,
      };
    }).sort((a, b) => b.totalOrders - a.totalOrders);

    // Customer confirmation
    const customerConfirmedCount = orders.filter(o => o.customer_response_status === 'confirmed').length;
    const customerPendingCount = orders.filter(o => !o.customer_response_status || o.customer_response_status === 'pending').length;
    const customerRescheduledCount = orders.filter(o => o.customer_response_status === 'reschedule_requested').length;
    const customerCancelledCount = orders.filter(o => o.customer_response_status === 'cancelled').length;
    const confirmationRate = orders.length > 0 ? Math.round((customerConfirmedCount / orders.length) * 100) : 0;

    const recentActivity = await this.getAllOrderEvents(companyId, { limit: 10 });

    return {
      totalMerchants: merchants.length,
      activeMerchants: activeMerchantsCount,
      totalCouriers: couriers.length,
      activeCouriers: activeCouriersCount,
      totalOrders: orders.length,
      todayOrdersCount: todayOrders.length,
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      assignedOrders: orders.filter(o => o.status === 'assigned' || o.status === 'out_for_delivery').length,
      deliveredOrders: deliveredOrders.length,
      failedOrders: orders.filter(o => o.status === 'failed').length,
      cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
      totalCodAmount,
      deliveredCodAmount,
      deliverySuccessRate,
      outstandingCourierCollections: outstandingCollections.totalOutstanding,
      couriersWithOutstandingCount: outstandingCollections.couriersWithDebtCount,
      customerConfirmedCount,
      customerPendingCount,
      customerRescheduledCount,
      customerCancelledCount,
      confirmationMetrics: {
        confirmed: customerConfirmedCount,
        pending: customerPendingCount,
        reschedule_requested: customerRescheduledCount,
        cancelled: customerCancelledCount,
        confirmationRate,
      },
      totalReturns: returnsMetrics.totalReturns,
      returnsTotal: returnsMetrics.totalReturns,
      returnsCreated: returnsMetrics.createdCount,
      returnsWithCourier: returnsMetrics.withCourierCount,
      returnsReturned: returnsMetrics.returnedCount,
      returnsCancelled: returnsMetrics.cancelledCount,
      returnsTotalValue: returnsMetrics.totalReturnValue,
      activeReturns: returnsMetrics.activeReturnsCount,
      returnsActive: returnsMetrics.activeReturnsCount,
      todayOverview,
      courierPerformance,
      courierPerformanceToday: courierPerformance,
      merchantPerformance,
      recentActivity,
    };
  },

  async getCourierMetrics(companyId: string, courierId: string) {
    const todayStr = new Date().toISOString().split('T')[0];
    const orders = await this.getOrders(companyId, courierId);
    const returnsMetrics = await this.getReturnMetrics(companyId, courierId);
    const collectionSummary = await this.getCourierCollectionSummary(companyId, courierId);

    // Today's orders only (no fallback to all orders)
    const todayOrders = orders.filter(o => o.delivery_date === todayStr || o.created_at.startsWith(todayStr));
    const targetSet = todayOrders; // no fallback

    const todayConfirmed = targetSet.filter(o => o.customer_response_status === 'confirmed').length;
    const todayWaiting = targetSet.filter(o => (!o.customer_response_status || o.customer_response_status === 'pending') && o.status !== 'delivered' && o.status !== 'failed' && o.status !== 'cancelled').length;
    const todayRescheduled = targetSet.filter(o => o.customer_response_status === 'reschedule_requested').length;
    const todayOutForDelivery = targetSet.filter(o => o.status === 'out_for_delivery').length;
    const todayDelivered = targetSet.filter(o => o.status === 'delivered').length;
    const todayFailed = targetSet.filter(o => o.status === 'failed').length;
    const todayCancelled = targetSet.filter(o => o.status === 'cancelled' || o.customer_response_status === 'cancelled').length;

    // Overall stats (all time)
    const totalDelivered = orders.filter(o => o.status === 'delivered').length;
    const totalFailed = orders.filter(o => o.status === 'failed').length;
    const totalCancelled = orders.filter(o => o.status === 'cancelled').length;
    const totalOutForDelivery = orders.filter(o => o.status === 'out_for_delivery').length;
    const totalPendingAssigned = orders.filter(o => o.status === 'assigned').length;

    return {
      // Today
      todayTotal: targetSet.length,
      todayConfirmed,
      todayWaiting,
      todayRescheduled,
      todayOutForDelivery,
      todayDelivered,
      todayFailed,
      todayCancelled,
      todayAssigned: targetSet.length,
      todayCompleted: todayDelivered,

      // All time
      totalAssigned: orders.length,
      totalDelivered,
      totalFailed,
      totalCancelled,
      totalOutForDelivery,
      totalPendingAssigned,

      // Returns
      assignedReturnsCount: returnsMetrics.totalReturns,
      activeReturnsCount: returnsMetrics.activeReturnsCount,
      completedReturnsCount: returnsMetrics.returnedCount,

      // Financials
      totalCodToCollect: orders
        .filter(o => o.status === 'assigned' || o.status === 'out_for_delivery')
        .reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0),
      totalCodDelivered: collectionSummary?.total_delivered_cod || 0,
      currentCollections: collectionSummary?.current_outstanding_balance || 0,
      totalSettledAmount: collectionSummary?.total_settled_amount || 0,
      deliveredCodOrdersCount: collectionSummary?.delivered_cod_orders_count || 0,
      lastSettlementDate: collectionSummary?.last_settlement_date || null,

      // Legacy
      assignedOrdersCount: orders.length,
      todayAssignedCount: targetSet.length,
      pendingDeliveriesCount: orders.filter(o => o.status === 'assigned' || o.status === 'out_for_delivery').length,
      todayDeliveredCount: todayDelivered,
      todayFailedCount: todayFailed,
      completedDeliveriesCount: totalDelivered,
      failedDeliveriesCount: totalFailed,
      confirmedOrdersCount: orders.filter(o => o.customer_response_status === 'confirmed').length,
      rescheduleRequestedCount: orders.filter(o => o.customer_response_status === 'reschedule_requested').length,
    };
  },
};