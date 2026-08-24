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
  CourierCollectionSummary
} from '../types';
import { generateConfirmationToken } from './whatsapp';
import { 
  hashPassword, 
  verifyPassword, 
  normalizeEmployeeId, 
  normalizePassword 
} from './crypto';

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

const STORAGE_KEYS = {
  COMPANIES: 'delixa_db_companies',
  PROFILES: 'delixa_db_profiles',
  COURIERS: 'delixa_db_couriers',
  MERCHANTS: 'delixa_db_merchants',
  ORDERS: 'delixa_db_orders',
  RETURNS: 'delixa_db_returns',
  ORDER_EVENTS: 'delixa_db_order_events',
  NOTIFICATIONS: 'delixa_db_notifications',
  SETTLEMENTS: 'delixa_db_courier_settlements',
  MERCHANT_TRANSACTIONS: 'delixa_db_merchant_transactions',
  MERCHANT_SETTLEMENTS: 'delixa_db_merchant_settlements',
  CURRENT_SESSION: 'delixa_auth_session',
  LANGUAGE: 'delixa_pref_language'
};

// Real-time synchronization helper across tabs & components
const BROADCAST_EVENT = 'delixa-realtime-order-sync';
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('delixa_orders_channel');
  } catch (e) {
    // Ignore if not supported in sandbox
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
    if (e.key === STORAGE_KEYS.ORDERS || e.key === STORAGE_KEYS.ORDER_EVENTS) {
      callback();
    }
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

// Helper for generating UUID-like identifiers
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Initial Seeds to provide a working out-of-the-box experience for testing
function seedInitialData() {
  const existingCompanies = localStorage.getItem(STORAGE_KEYS.COMPANIES);
  if (existingCompanies && JSON.parse(existingCompanies).length > 0) {
    return; // Already initialized
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // Seed Company A: Cairo Express Logistics (شركة كايرو إكسبريس للشحن)
  const companyAId = 'c1111111-1111-4111-a111-111111111111';
  const companyA: Company = {
    id: companyAId,
    name: 'كايرو إكسبريس للخدمات اللوجستية (Cairo Express)',
    phone: '01012345678',
    email: 'admin@cairoexpress.eg',
    address: 'شارع التسعين الجنوبي، التجمع الخامس، القاهرة الجديدة',
    logo_url: '',
    created_at: new Date('2026-01-10T10:00:00Z').toISOString(),
    updated_at: new Date('2026-01-10T10:00:00Z').toISOString(),
  };

  // Admin for Company A
  const adminAProfileId = 'p1111111-1111-4111-a111-111111111111';
  const adminA: Profile = {
    id: adminAProfileId,
    auth_user_id: 'u1111111-1111-4111-a111-111111111111',
    company_id: companyAId,
    full_name: 'أحمد محمود القاضي (Admin Ahmed)',
    phone: '01012345678',
    role: 'admin',
    created_at: new Date('2026-01-10T10:00:00Z').toISOString(),
    updated_at: new Date('2026-01-10T10:00:00Z').toISOString(),
  };

  // Couriers for Company A
  const courier1ProfileId = 'p2222222-2222-4222-a222-222222222222';
  const courier1Profile: Profile = {
    id: courier1ProfileId,
    auth_user_id: 'u2222222-2222-4222-a222-222222222222',
    company_id: companyAId,
    full_name: 'كريم عادل الشريف (Courier Karim)',
    phone: '01123456789',
    role: 'courier',
    created_at: new Date('2026-01-15T09:00:00Z').toISOString(),
    updated_at: new Date('2026-01-15T09:00:00Z').toISOString(),
  };

  const courier1: Courier = {
    id: 'cr111111-1111-4111-a111-111111111111',
    company_id: companyAId,
    profile_id: courier1ProfileId,
    employee_id: 'CR-101',
    full_name: 'كريم عادل الشريف',
    phone: '01123456789',
    area: 'مدينة نصر ومصر الجديدة',
    status: 'active',
    password: hashPassword('CR101K'), // Securely hashed 6-character PIN
    created_at: new Date('2026-01-15T09:00:00Z').toISOString(),
    updated_at: new Date('2026-01-15T09:00:00Z').toISOString(),
  };

  const courier2ProfileId = 'p3333333-3333-4333-a333-333333333333';
  const courier2Profile: Profile = {
    id: courier2ProfileId,
    auth_user_id: 'u3333333-3333-4333-a333-333333333333',
    company_id: companyAId,
    full_name: 'مصطفى حسين النجار (Courier Mostafa)',
    phone: '01234567890',
    role: 'courier',
    created_at: new Date('2026-01-20T09:00:00Z').toISOString(),
    updated_at: new Date('2026-01-20T09:00:00Z').toISOString(),
  };

  const courier2: Courier = {
    id: 'cr222222-2222-4222-a222-222222222222',
    company_id: companyAId,
    profile_id: courier2ProfileId,
    employee_id: 'CR-102',
    full_name: 'مصطفى حسين النجار',
    phone: '01234567890',
    area: 'المعادي وحلوان',
    status: 'active',
    password: hashPassword('CR102M'), // Securely hashed 6-character PIN
    created_at: new Date('2026-01-20T09:00:00Z').toISOString(),
    updated_at: new Date('2026-01-20T09:00:00Z').toISOString(),
  };

  // Merchants for Company A
  const merchantA1: Merchant = {
    id: 'm1111111-1111-4111-a111-111111111111',
    company_id: companyAId,
    store_name: 'براند زارا ستور إيجيبت (Zara Store EG)',
    owner_name: 'طارق حسني',
    phone: '01099887766',
    address: 'مول سيتي ستارز، الدور الثاني، مدينة نصر',
    notes: 'شحنات ملابس سريعة التوصيل - استلام يومياً الساعة 2 ظهراً',
    status: 'active',
    created_at: new Date('2026-01-12T11:00:00Z').toISOString(),
    updated_at: new Date('2026-01-12T11:00:00Z').toISOString(),
  };

  const merchantA2: Merchant = {
    id: 'm2222222-2222-4222-a222-222222222222',
    company_id: companyAId,
    store_name: 'تك هوب للإلكترونيات (TechHub Electronics)',
    owner_name: 'م. سامح فوزي',
    phone: '01188776655',
    address: 'شارع البستان، وسط البلد، القاهرة',
    notes: 'بضائع إلكترونية حساسة - تتطلب توقيع واستلام نقدي فوري',
    status: 'active',
    created_at: new Date('2026-01-14T14:30:00Z').toISOString(),
    updated_at: new Date('2026-01-14T14:30:00Z').toISOString(),
  };

  const merchantA3: Merchant = {
    id: 'm3333333-3333-4333-a333-333333333333',
    company_id: companyAId,
    store_name: 'عطور ومستحضرات لافندر (Lavender Perfumes)',
    owner_name: 'سارة عبد الرحمن',
    phone: '01277665544',
    address: 'شارع النصر، المعادي الجديدة',
    notes: 'شحنات مستحضرات تجميل - كراتين محكمة الإغلاق',
    status: 'active',
    created_at: new Date('2026-01-25T16:00:00Z').toISOString(),
    updated_at: new Date('2026-01-25T16:00:00Z').toISOString(),
  };

  // Orders for Company A
  const orderA1: Order = {
    id: 'ord-1001',
    company_id: companyAId,
    merchant_id: merchantA1.id,
    courier_id: courier1.id,
    order_number: 'DLX-000001',
    customer_name: 'محمود عبد السلام',
    customer_phone: '01065432198',
    governorate: 'القاهرة',
    city_area: 'مدينة نصر',
    customer_address: 'عمارة 14، شارع عباس العقاد، الدور الرابع',
    customer_landmark: 'بجوار بنك مصر',
    cod_amount: 850.00,
    delivery_date: todayStr,
    delivery_from: '12:00',
    delivery_to: '16:00',
    notes: 'الاتصال قبل الوصول بـ 15 دقيقة',
    status: 'assigned',
    confirmation_token: '8XK29M',
    confirmation_sent_at: new Date('2026-08-19T10:15:00Z').toISOString(),
    customer_response_status: 'confirmed',
    customer_responded_at: new Date('2026-08-19T10:45:00Z').toISOString(),
    created_at: new Date('2026-08-19T10:00:00Z').toISOString(),
    updated_at: new Date('2026-08-19T10:45:00Z').toISOString(),
  };

  const orderA2: Order = {
    id: 'ord-1002',
    company_id: companyAId,
    merchant_id: merchantA2.id,
    courier_id: courier1.id,
    order_number: 'DLX-000002',
    customer_name: 'ياسمين حسن توفيق',
    customer_phone: '01144332211',
    governorate: 'القاهرة',
    city_area: 'مصر الجديدة',
    customer_address: 'شارع الميرغني، أمام محطة مترو كلية البنات',
    customer_landmark: 'برج الأطباء الدور الرابع',
    cod_amount: 1450.00,
    delivery_date: todayStr,
    delivery_from: '14:00',
    delivery_to: '18:00',
    notes: 'الدفع نقدي عند الاستلام',
    status: 'out_for_delivery',
    confirmation_token: '7mK9pQ',
    confirmation_sent_at: new Date('2026-08-19T11:40:00Z').toISOString(),
    customer_response_status: 'pending',
    created_at: new Date('2026-08-19T11:30:00Z').toISOString(),
    updated_at: new Date('2026-08-20T08:00:00Z').toISOString(),
  };

  const orderA3: Order = {
    id: 'ord-1003',
    company_id: companyAId,
    merchant_id: merchantA3.id,
    courier_id: courier2.id,
    order_number: 'DLX-000003',
    customer_name: 'عمر خالد الدسوقي',
    customer_phone: '01299881122',
    governorate: 'القاهرة',
    city_area: 'المعادي',
    customer_address: 'شارع 9، فيلا 3، المعادي، القاهرة',
    customer_landmark: 'خلف كارفور المعادي',
    cod_amount: 520.00,
    delivery_date: todayStr,
    delivery_from: '10:00',
    delivery_to: '14:00',
    notes: 'التسليم لأمن العمارة في حال عدم التواجد',
    status: 'delivered',
    delivered_at: new Date('2026-08-20T11:45:00Z').toISOString(),
    delivered_by_courier_id: courier2.id,
    confirmation_token: '4NV81Z',
    confirmation_sent_at: new Date('2026-08-18T14:10:00Z').toISOString(),
    customer_response_status: 'confirmed',
    customer_responded_at: new Date('2026-08-18T14:30:00Z').toISOString(),
    created_at: new Date('2026-08-18T14:00:00Z').toISOString(),
    updated_at: new Date('2026-08-20T11:45:00Z').toISOString(),
  };

  const orderA4: Order = {
    id: 'ord-1004',
    company_id: companyAId,
    merchant_id: merchantA1.id,
    courier_id: courier1.id,
    order_number: 'DLX-000004',
    customer_name: 'حازم عادل السعيد',
    customer_phone: '01011223344',
    governorate: 'القاهرة',
    city_area: 'مدينة نصر',
    customer_address: 'شارع مكرم عبيد، بجوار سيتي سنتر',
    customer_landmark: 'أمام بنك الأهلي',
    cod_amount: 980.00,
    delivery_date: todayStr,
    delivery_from: '11:00',
    delivery_to: '15:00',
    notes: 'معاينة المقاس قبل الاستلام',
    status: 'failed',
    failure_reason: 'customer_unavailable',
    failure_notes: 'العميل مسافر ولم يتمكن أحد من الاستلام',
    confirmation_token: '2PW99A',
    confirmation_sent_at: new Date('2026-08-19T09:15:00Z').toISOString(),
    customer_response_status: 'reschedule_requested',
    customer_selected_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    customer_selected_from: '14:00',
    customer_selected_to: '18:00',
    customer_note: 'يرجى التوصيل غداً بعد العصر لعدم وجود أحد بالمنزل اليوم',
    customer_responded_at: new Date('2026-08-19T09:40:00Z').toISOString(),
    created_at: new Date('2026-08-19T09:00:00Z').toISOString(),
    updated_at: new Date('2026-08-20T13:10:00Z').toISOString(),
  };

  const orderA5: Order = {
    id: 'ord-1005',
    company_id: companyAId,
    merchant_id: merchantA1.id,
    courier_id: null,
    order_number: 'DLX-000005',
    customer_name: 'هدير أشرف زكي',
    customer_phone: '01511223344',
    governorate: 'الجيزة',
    city_area: 'الدقي',
    customer_address: 'حي الدقي، شارع مصدق، الجيزة',
    customer_landmark: 'بجوار صيدلية العزبي',
    cod_amount: 630.00,
    delivery_date: todayStr,
    delivery_from: '13:00',
    delivery_to: '17:00',
    notes: 'طلب فحص المنتج قبل الاستلام',
    status: 'pending',
    confirmation_token: '5KT72B',
    customer_response_status: 'pending',
    created_at: new Date('2026-08-20T07:00:00Z').toISOString(),
    updated_at: new Date('2026-08-20T07:00:00Z').toISOString(),
  };

  // Seed initial events for Company A orders
  const initialEvents: OrderEvent[] = [
    {
      id: generateId(),
      order_id: orderA1.id,
      company_id: companyAId,
      event_type: 'link_generated',
      timestamp: new Date('2026-08-19T10:00:00Z').toISOString(),
      actor: 'system',
      details: 'تم توليد رابط التأكيد القصير والفريد للشحنة'
    },
    {
      id: generateId(),
      order_id: orderA1.id,
      company_id: companyAId,
      event_type: 'whatsapp_sent',
      timestamp: new Date('2026-08-19T10:15:00Z').toISOString(),
      actor: 'admin',
      actor_name: 'أحمد محمود (Admin)',
      details: 'تم إرسال رسالة التأكيد عبر واتساب إلى 01065432198'
    },
    {
      id: generateId(),
      order_id: orderA1.id,
      company_id: companyAId,
      event_type: 'link_opened',
      timestamp: new Date('2026-08-19T10:40:00Z').toISOString(),
      actor: 'customer',
      details: 'قام العميل بفتح صفحة الشحنة من الهاتف'
    },
    {
      id: generateId(),
      order_id: orderA1.id,
      company_id: companyAId,
      event_type: 'customer_confirmed',
      timestamp: new Date('2026-08-19T10:45:00Z').toISOString(),
      actor: 'customer',
      details: 'قام العميل بتأكيد موعد استلام الشحنة المحدد بنجاح'
    },
    {
      id: generateId(),
      order_id: orderA4.id,
      company_id: companyAId,
      event_type: 'link_generated',
      timestamp: new Date('2026-08-19T09:00:00Z').toISOString(),
      actor: 'system',
      details: 'تم توليد رابط التأكيد القصير والفريد للشحنة'
    },
    {
      id: generateId(),
      order_id: orderA4.id,
      company_id: companyAId,
      event_type: 'customer_rescheduled',
      timestamp: new Date('2026-08-19T09:40:00Z').toISOString(),
      actor: 'customer',
      details: 'طلب العميل إعادة جدولة التوصيل إلى الغد - ملاحظة: يرجى التوصيل بعد العصر'
    }
  ];

  // Seed Company B: Alexandria Fast Cargo (شركة الإسكندرية للشحن السريع)
  // Demonstrating multi-tenant isolation!
  const companyBId = 'c2222222-2222-4222-b222-222222222222';
  const companyB: Company = {
    id: companyBId,
    name: 'الإسكندرية للشحن السريع (Alexandria Fast Cargo)',
    phone: '01298765432',
    email: 'admin@alexfastcargo.eg',
    address: 'شارع فؤاد، محطة الرمل، الإسكندرية',
    logo_url: '',
    created_at: new Date('2026-02-01T08:00:00Z').toISOString(),
    updated_at: new Date('2026-02-01T08:00:00Z').toISOString(),
  };

  const adminBProfile: Profile = {
    id: 'p4444444-4444-4444-b444-444444444444',
    auth_user_id: 'u4444444-4444-4444-b444-444444444444',
    company_id: companyBId,
    full_name: 'إبراهيم سمير الشاذلي (Admin Ibrahim)',
    phone: '01298765432',
    role: 'admin',
    created_at: new Date('2026-02-01T08:00:00Z').toISOString(),
    updated_at: new Date('2026-02-01T08:00:00Z').toISOString(),
  };

  const merchantB1: Merchant = {
    id: 'mb111111-1111-4111-b111-111111111111',
    company_id: companyBId,
    store_name: 'متجر سحر الإسكندرية للأحذية',
    owner_name: 'وليد غانم',
    phone: '01233445566',
    address: 'سموحة، الإسكندرية',
    notes: 'متجر خاص بالشركة الثانية فقط',
    status: 'active',
    created_at: new Date('2026-02-05T10:00:00Z').toISOString(),
    updated_at: new Date('2026-02-05T10:00:00Z').toISOString(),
  };

  // Seed initial sample return for Company A
  const sampleReturn1: ReturnRecord = {
    id: 'ret-1001',
    company_id: companyAId,
    order_id: orderA4.id,
    merchant_id: merchantA1.id,
    courier_id: courier1.id,
    return_number: 'DLX-RET-000001',
    customer_name: 'حازم عادل السعيد',
    customer_phone: '01011223344',
    return_address: 'شارع مكرم عبيد، بجوار سيتي سنتر، مدينة نصر، القاهرة',
    return_amount: 980,
    return_shipping_cost: 45,
    other_cost: 0,
    total_return_amount: 1025,
    return_reason: 'customer_unavailable',
    notes: 'العميل مسافر ولم يتمكن أحد من الاستلام - إعادة الشحنة للمتجر',
    status: 'with_courier',
    created_by: 'أحمد محمود القاضي (Admin Ahmed)',
    created_at: new Date('2026-08-20T10:00:00Z').toISOString(),
    updated_at: new Date('2026-08-20T10:00:00Z').toISOString(),
  };

  // Write to storage
  localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify([companyA, companyB]));
  localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify([adminA, courier1Profile, courier2Profile, adminBProfile]));
  localStorage.setItem(STORAGE_KEYS.COURIERS, JSON.stringify([courier1, courier2]));
  localStorage.setItem(STORAGE_KEYS.MERCHANTS, JSON.stringify([merchantA1, merchantA2, merchantA3, merchantB1]));
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([orderA1, orderA2, orderA3, orderA4, orderA5]));
  localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify([sampleReturn1]));
  localStorage.setItem(STORAGE_KEYS.ORDER_EVENTS, JSON.stringify(initialEvents));
}

// Backfill helper for existing orders without tokens or customer status
function backfillOrderConfirmationFields() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (!raw) return;
    const orders: Order[] = JSON.parse(raw);
    let modified = false;

    const updatedOrders = orders.map(o => {
      let changed = false;
      const copy = { ...o };
      if (!copy.confirmation_token) {
        copy.confirmation_token = generateConfirmationToken();
        changed = true;
      }
      if (!copy.customer_response_status) {
        copy.customer_response_status = 'pending';
        changed = true;
      }
      if (changed) modified = true;
      return copy;
    });

    if (modified) {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updatedOrders));
    }
  } catch (e) {
    // Ignore error in parsing
  }
}

// Backfill helper for returns storage
function backfillReturns() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RETURNS);
    if (!raw || JSON.parse(raw).length === 0) {
      const ordersRaw = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (!ordersRaw) return;
      const orders: Order[] = JSON.parse(ordersRaw);
      const companyAOrders = orders.filter(o => o.status === 'failed' || o.status === 'delivered');
      if (companyAOrders.length > 0) {
        const targetOrder = companyAOrders.find(o => o.status === 'failed') || companyAOrders[0];
        const initialReturn: ReturnRecord = {
          id: 'ret-1001',
          company_id: targetOrder.company_id,
          order_id: targetOrder.id,
          merchant_id: targetOrder.merchant_id,
          courier_id: targetOrder.courier_id || null,
          return_number: 'DLX-RET-000001',
          customer_name: targetOrder.customer_name,
          customer_phone: targetOrder.customer_phone,
          return_address: targetOrder.customer_address,
          return_amount: Number(targetOrder.cod_amount) || 0,
          return_shipping_cost: 45,
          other_cost: 0,
          total_return_amount: (Number(targetOrder.cod_amount) || 0) + 45,
          return_reason: 'customer_unavailable',
          notes: 'إرجاع مسجل للشحنة المتعثرة',
          status: 'with_courier',
          created_by: 'إدارة النظام',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify([initialReturn]));
      }
    }
  } catch (e) {
    // Ignore
  }
}

export const DEFAULT_DELIVERY_SLOTS: DeliverySlot[] = [
  { id: 'slot-1', name: 'الفترة الصباحية (Morning)', from_time: '10:00', to_time: '14:00', is_active: true },
  { id: 'slot-2', name: 'الفترة المسائية (Evening)', from_time: '17:00', to_time: '21:00', is_active: true },
];

// Backfill helper for delivery slots
function backfillDeliverySlots() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMPANIES);
    if (!raw) return;
    const companies: Company[] = JSON.parse(raw);
    let modified = false;

    const updated = companies.map(c => {
      if (!c.delivery_slots || c.delivery_slots.length === 0) {
        modified = true;
        return {
          ...c,
          delivery_slots: DEFAULT_DELIVERY_SLOTS,
        };
      }
      return c;
    });

    if (modified) {
      localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(updated));
    }
  } catch (e) {
    // Ignore
  }
}

// Backfill helper for notifications storage
function backfillNotifications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (!raw || JSON.parse(raw).length === 0) {
      const companyAId = 'c1111111-1111-4111-a111-111111111111';
      const courier1Id = 'cr111111-1111-4111-a111-111111111111';
      const now = new Date();
      const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

      const initialNotifications: AppNotification[] = [
        {
          id: 'notif-1',
          company_id: companyAId,
          recipient_role: 'admin',
          type: 'customer_confirmed',
          title: 'تأكيد موعد استلام شحنة',
          message: 'قام العميل محمود عبد السلام بتأكيد استلام الشحنة (#DLX-000001) في الموعد المحدد اليوم.',
          order_id: 'ord-1001',
          order_number: 'DLX-000001',
          read: false,
          created_at: tenMinsAgo,
        },
        {
          id: 'notif-2',
          company_id: companyAId,
          recipient_role: 'admin',
          type: 'return_created',
          title: 'تسجيل إرجاع جديد',
          message: 'تم تسجيل طلب إرجاع رقم (#DLX-RET-000001) وإسناده للمندوب كريم عادل.',
          return_id: 'ret-1001',
          return_number: 'DLX-RET-000001',
          order_id: 'ord-1004',
          order_number: 'DLX-000004',
          read: false,
          created_at: oneHourAgo,
        },
        {
          id: 'notif-3',
          company_id: companyAId,
          recipient_role: 'courier',
          recipient_courier_id: courier1Id,
          type: 'order_assigned',
          title: 'إسناد شحنة جديدة',
          message: 'تم إسناد الشحنة رقم (#DLX-000001) بقيمة 850 ج.م في مدينة نصر.',
          order_id: 'ord-1001',
          order_number: 'DLX-000001',
          read: false,
          created_at: oneHourAgo,
        },
        {
          id: 'notif-4',
          company_id: companyAId,
          recipient_role: 'courier',
          recipient_courier_id: courier1Id,
          type: 'customer_confirmed',
          title: 'تأكيد العميل لموعد الشحنة',
          message: 'العميل أكد موعد استلام الشحنة (#DLX-000001).',
          order_id: 'ord-1001',
          order_number: 'DLX-000001',
          read: false,
          created_at: tenMinsAgo,
        }
      ];

      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(initialNotifications));
    }
  } catch (e) {
    // Ignore
  }
}

// Backfill helper to migrate any plaintext courier passwords to secure hashes
function backfillHashedCourierPasswords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COURIERS);
    if (!raw) return;
    const couriers: Courier[] = JSON.parse(raw);
    let modified = false;

    const updated = couriers.map(c => {
      if (c.password && !c.password.startsWith('dlx_hash_')) {
        modified = true;
        return {
          ...c,
          password: hashPassword(c.password),
        };
      }
      return c;
    });

    if (modified) {
      localStorage.setItem(STORAGE_KEYS.COURIERS, JSON.stringify(updated));
    }
  } catch (e) {
    // Ignore
  }
}

// Backfill helper for merchant ledger and transactions
function backfillMerchantLedgers() {
  try {
    const rawTx = localStorage.getItem(STORAGE_KEYS.MERCHANT_TRANSACTIONS);
    if (!rawTx || JSON.parse(rawTx).length === 0) {
      const companyAId = 'c1111111-1111-4111-a111-111111111111';
      const merchantA1Id = 'm1111111-1111-4111-a111-111111111111';
      const merchantA2Id = 'm2222222-2222-4222-a222-222222222222';
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      const initialTransactions: MerchantTransaction[] = [
        {
          id: 'mtx-1001',
          company_id: companyAId,
          merchant_id: merchantA1Id,
          transaction_type: 'RETURN_COST',
          direction: 'debit',
          amount: 45,
          reference_type: 'return',
          reference_id: 'ret-1001',
          order_id: 'ord-1004',
          order_number: 'DLX-000004',
          return_id: 'ret-1001',
          return_number: 'DLX-RET-000001',
          description: 'تكلفة إرجاع شحنة (#DLX-000004) - إرجاع #DLX-RET-000001',
          created_by: 'أحمد محمود القاضي (Admin)',
          created_at: twoDaysAgo,
        },
        {
          id: 'mtx-1002',
          company_id: companyAId,
          merchant_id: merchantA2Id,
          transaction_type: 'RETURN_COST',
          direction: 'debit',
          amount: 40,
          reference_type: 'return',
          description: 'تكلفة إرجاع شحنة متعثرة لمتجر إلكترونيات تيك زون',
          created_by: 'أحمد محمود القاضي (Admin)',
          created_at: yesterday,
        }
      ];

      localStorage.setItem(STORAGE_KEYS.MERCHANT_TRANSACTIONS, JSON.stringify(initialTransactions));
    }
  } catch (e) {
    // Ignore
  }
}

// Auto seed and backfill on load
seedInitialData();
backfillOrderConfirmationFields();
backfillReturns();
backfillDeliverySlots();
backfillNotifications();
backfillHashedCourierPasswords();
backfillMerchantLedgers();

export const db = {
  // ----------------------------------------------------
  // COMPANIES
  // ----------------------------------------------------
  getCompanies(): Company[] {
    const data = localStorage.getItem(STORAGE_KEYS.COMPANIES);
    return data ? JSON.parse(data) : [];
  },

  getCompanyById(id: string): Company | null {
    const list = this.getCompanies();
    return list.find(c => c.id === id) || null;
  },

  createCompany(companyData: Omit<Company, 'id' | 'created_at' | 'updated_at'>): Company {
    const list = this.getCompanies();
    const now = new Date().toISOString();
    const newCompany: Company = {
      id: generateId(),
      ...companyData,
      created_at: now,
      updated_at: now,
    };
    list.push(newCompany);
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(list));
    return newCompany;
  },

  updateCompany(id: string, updates: Partial<Company>): Company | null {
    const list = this.getCompanies();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) return null;

    const updated = {
      ...list[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    list[index] = updated;
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(list));
    return updated;
  },

  // ----------------------------------------------------
  // PROFILES
  // ----------------------------------------------------
  getProfiles(companyId?: string): Profile[] {
    const data = localStorage.getItem(STORAGE_KEYS.PROFILES);
    const list: Profile[] = data ? JSON.parse(data) : [];
    if (companyId) {
      return list.filter(p => p.company_id === companyId);
    }
    return list;
  },

  getProfileByAuthUserId(authUserId: string): Profile | null {
    const list = this.getProfiles();
    return list.find(p => p.auth_user_id === authUserId) || null;
  },

  getProfileById(id: string): Profile | null {
    const list = this.getProfiles();
    return list.find(p => p.id === id) || null;
  },

  updateProfile(id: string, updates: Partial<Profile>): Profile | null {
    const list = this.getProfiles();
    const index = list.findIndex(p => p.id === id);
    if (index === -1) return null;

    const updated = {
      ...list[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    list[index] = updated;
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(list));
    return updated;
  },

  createProfile(profileData: Omit<Profile, 'id' | 'created_at' | 'updated_at'>): Profile {
    const list = this.getProfiles();
    const now = new Date().toISOString();
    const newProfile: Profile = {
      id: generateId(),
      ...profileData,
      created_at: now,
      updated_at: now,
    };
    list.push(newProfile);
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(list));
    return newProfile;
  },

  // ----------------------------------------------------
  // COURIERS (Enforcing company_id RLS)
  // ----------------------------------------------------
  getCouriers(companyId: string): Courier[] {
    if (!companyId) return [];
    const data = localStorage.getItem(STORAGE_KEYS.COURIERS);
    const list: Courier[] = data ? JSON.parse(data) : [];
    // Strict isolation: only return couriers belonging to this company
    return list.filter(c => c.company_id === companyId);
  },

  getCourierById(companyId: string, id: string): Courier | null {
    const list = this.getCouriers(companyId);
    return list.find(c => c.id === id) || null;
  },

  getCourierByEmployeeId(employeeId: string, companyId?: string): Courier | null {
    if (!employeeId) return null;
    const data = localStorage.getItem(STORAGE_KEYS.COURIERS);
    const list: Courier[] = data ? JSON.parse(data) : [];
    
    const searchNorm = normalizeEmployeeId(employeeId);
    const searchNoHyphen = searchNorm.replace(/-/g, '');

    return list.find(c => {
      if (companyId && c.company_id !== companyId) return false;
      const cNorm = normalizeEmployeeId(c.employee_id);
      const cNoHyphen = cNorm.replace(/-/g, '');
      return cNorm === searchNorm || cNoHyphen === searchNoHyphen;
    }) || null;
  },

  getCourierStats(companyId: string, courierId: string): { assignedOrders: number; deliveredOrders: number; failedOrders: number } {
    const orders = this.getOrders(companyId, courierId);
    return {
      assignedOrders: orders.length,
      deliveredOrders: orders.filter(o => o.status === 'delivered').length,
      failedOrders: orders.filter(o => o.status === 'failed').length,
    };
  },

  createCourier(companyId: string, courierData: {
    fullName: string;
    phone: string;
    area: string;
    employeeId: string;
    password?: string;
    status?: CourierStatus;
  }): { courier: Courier; profile: Profile } {
    const now = new Date().toISOString();
    const authUserId = generateId();

    // Password validation: exactly 6 characters, alphanumeric
    const pwd = courierData.password?.trim() || '';
    if (pwd.length !== 6) {
      throw new Error('كلمة مرور المندوب يجب أن تتكون من 6 خانات تماماً');
    }

    // 1. Create Profile
    const profile = this.createProfile({
      auth_user_id: authUserId,
      company_id: companyId,
      full_name: courierData.fullName,
      phone: courierData.phone,
      role: 'courier',
    });

    // 2. Create Courier record
    const allCouriers: Courier[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.COURIERS) || '[]');
    
    // Validate unique employee_id in company
    const existing = allCouriers.find(
      c => c.company_id === companyId && c.employee_id.toUpperCase() === courierData.employeeId.trim().toUpperCase()
    );
    if (existing) {
      throw new Error(`كود الموظف (${courierData.employeeId}) مسجل مسبقاً في هذه الشركة`);
    }

    const newCourier: Courier = {
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
    };

    allCouriers.push(newCourier);
    localStorage.setItem(STORAGE_KEYS.COURIERS, JSON.stringify(allCouriers));
    return { courier: newCourier, profile };
  },

  updateCourier(companyId: string, id: string, updates: Partial<Courier>): Courier | null {
    const allCouriers: Courier[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.COURIERS) || '[]');
    const index = allCouriers.findIndex(c => c.id === id && c.company_id === companyId);
    if (index === -1) return null;

    // If employee_id is being updated, verify uniqueness
    if (updates.employee_id && updates.employee_id.toUpperCase() !== allCouriers[index].employee_id.toUpperCase()) {
      const duplicate = allCouriers.find(
        c => c.company_id === companyId && c.id !== id && c.employee_id.toUpperCase() === updates.employee_id!.trim().toUpperCase()
      );
      if (duplicate) {
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

    const updated = {
      ...allCouriers[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    allCouriers[index] = updated;
    localStorage.setItem(STORAGE_KEYS.COURIERS, JSON.stringify(allCouriers));

    // Also update matching profile name/phone if changed
    if (updates.full_name || updates.phone) {
      const allProfiles: Profile[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFILES) || '[]');
      const pIndex = allProfiles.findIndex(p => p.id === updated.profile_id);
      if (pIndex !== -1) {
        if (updates.full_name) allProfiles[pIndex].full_name = updates.full_name;
        if (updates.phone) allProfiles[pIndex].phone = updates.phone;
        allProfiles[pIndex].updated_at = new Date().toISOString();
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(allProfiles));
      }
    }

    return updated;
  },

  resetCourierPassword(companyId: string, id: string, newPassword: string): boolean {
    const pwd = newPassword.trim();
    if (pwd.length !== 6) {
      throw new Error('كلمة المرور الجديدة يجب أن تكون 6 أحرف أو أرقام تماماً');
    }
    const allCouriers: Courier[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.COURIERS) || '[]');
    const index = allCouriers.findIndex(c => c.id === id && c.company_id === companyId);
    if (index === -1) return false;

    allCouriers[index].password = hashPassword(pwd);
    allCouriers[index].updated_at = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.COURIERS, JSON.stringify(allCouriers));
    return true;
  },

  verifyCourierPassword(courier: Courier, enteredPassword: string): boolean {
    if (!courier || !courier.password || !enteredPassword) return false;
    return verifyPassword(enteredPassword, courier.password, courier.employee_id);
  },

  deleteCourier(companyId: string, id: string): boolean {
    const allCouriers: Courier[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.COURIERS) || '[]');
    const filtered = allCouriers.filter(c => !(c.id === id && c.company_id === companyId));
    if (filtered.length === allCouriers.length) return false;

    localStorage.setItem(STORAGE_KEYS.COURIERS, JSON.stringify(filtered));
    return true;
  },

  // ----------------------------------------------------
  // MERCHANTS (Enforcing company_id RLS)
  // ----------------------------------------------------
  getMerchants(companyId: string): Merchant[] {
    if (!companyId) return [];
    const data = localStorage.getItem(STORAGE_KEYS.MERCHANTS);
    const list: Merchant[] = data ? JSON.parse(data) : [];
    // Strict isolation: only merchants belonging to this company
    return list.filter(m => m.company_id === companyId);
  },

  getMerchantById(companyId: string, id: string): Merchant | null {
    const list = this.getMerchants(companyId);
    return list.find(m => m.id === id) || null;
  },

  getMerchantStats(companyId: string, merchantId: string): { ordersCount: number } {
    const orders = this.getOrders(companyId).filter(o => o.merchant_id === merchantId);
    return {
      ordersCount: orders.length,
    };
  },

  createMerchant(companyId: string, merchantData: Omit<Merchant, 'id' | 'company_id' | 'created_at' | 'updated_at'>): Merchant {
    if (!merchantData.store_name?.trim()) {
      throw new Error('اسم المتجر مطلوب');
    }
    if (!merchantData.phone?.trim()) {
      throw new Error('رقم هاتف المتجر مطلوب');
    }

    const allMerchants: Merchant[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MERCHANTS) || '[]');
    const now = new Date().toISOString();

    const newMerchant: Merchant = {
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
    };

    allMerchants.push(newMerchant);
    localStorage.setItem(STORAGE_KEYS.MERCHANTS, JSON.stringify(allMerchants));
    return newMerchant;
  },

  updateMerchant(companyId: string, id: string, updates: Partial<Merchant>): Merchant | null {
    const allMerchants: Merchant[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MERCHANTS) || '[]');
    const index = allMerchants.findIndex(m => m.id === id && m.company_id === companyId);
    if (index === -1) return null;

    const updated = {
      ...allMerchants[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    allMerchants[index] = updated;
    localStorage.setItem(STORAGE_KEYS.MERCHANTS, JSON.stringify(allMerchants));
    return updated;
  },

  deleteMerchant(companyId: string, id: string): boolean {
    const allMerchants: Merchant[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.MERCHANTS) || '[]');
    const filtered = allMerchants.filter(m => !(m.id === id && m.company_id === companyId));
    if (filtered.length === allMerchants.length) return false;

    localStorage.setItem(STORAGE_KEYS.MERCHANTS, JSON.stringify(filtered));
    return true;
  },

  // ----------------------------------------------------
  // ORDERS (Enforcing company_id & role-based courier RLS)
  // ----------------------------------------------------
  getNextOrderNumber(companyId: string): string {
    const orders = this.getOrders(companyId);
    let maxNum = 0;
    orders.forEach(o => {
      const match = o.order_number?.match(/DLX-(\d+)/);
      if (match && match[1]) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n > maxNum) {
          maxNum = n;
        }
      }
    });
    const nextVal = (maxNum || orders.length) + 1;
    return `DLX-${String(nextVal).padStart(6, '0')}`;
  },

  getOrders(companyId: string, courierIdFilter?: string | null): Order[] {
    if (!companyId) return [];
    const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
    const list: Order[] = data ? JSON.parse(data) : [];
    
    // Step 1: Filter strictly by company_id
    let companyOrders = list.filter(o => o.company_id === companyId);

    // Step 2: If courier role is accessing, only return assigned orders
    if (courierIdFilter) {
      companyOrders = companyOrders.filter(o => o.courier_id === courierIdFilter);
    }

    return companyOrders;
  },

  getOrderById(companyId: string, id: string): Order | null {
    const list = this.getOrders(companyId);
    return list.find(o => o.id === id) || null;
  },

  createOrder(companyId: string, orderData: {
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
  }): Order {
    if (!orderData.merchant_id) {
      throw new Error('يرجى اختيار المتجر');
    }
    if (!orderData.customer_name?.trim()) {
      throw new Error('اسم العميل مطلوب');
    }
    if (!orderData.customer_phone?.trim()) {
      throw new Error('رقم هاتف العميل مطلوب');
    }
    if (!orderData.customer_address?.trim()) {
      throw new Error('عنوان التوصيل مطلوب');
    }
    if (orderData.cod_amount === undefined || isNaN(Number(orderData.cod_amount)) || Number(orderData.cod_amount) < 0) {
      throw new Error('مبلغ التحصيل (COD) غير صالح');
    }
    if (!orderData.delivery_date) {
      throw new Error('تاريخ التوصيل مطلوب');
    }
    if (!orderData.delivery_from || !orderData.delivery_to) {
      throw new Error('نافذة التوصيل الزمني مطلوبة');
    }
    if (orderData.delivery_from >= orderData.delivery_to) {
      throw new Error('وقت بداية التوصيل يجب أن يكون قبل وقت النهاية');
    }

    const allOrders: Order[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
    const now = new Date().toISOString();

    const orderNumber = orderData.order_number?.trim() || this.getNextOrderNumber(companyId);
    
    // Status rule: if courier is assigned at creation, status is 'assigned', otherwise 'pending'
    const status: OrderStatus = orderData.courier_id ? 'assigned' : 'pending';

    // Generate secure random short token for public customer confirmation page
    const confirmationToken = generateConfirmationToken();

    const newOrder: Order = {
      id: generateId(),
      company_id: companyId,
      merchant_id: orderData.merchant_id,
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
      confirmation_token: confirmationToken,
      customer_response_status: 'pending',
      created_at: now,
      updated_at: now,
    };

    allOrders.push(newOrder);
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(allOrders));

    // Record initial event for order creation and token generation
    this.addOrderEvent({
      order_id: newOrder.id,
      company_id: companyId,
      event_type: 'created',
      actor: 'system',
      details: orderData.courier_id ? 'تم إنشاء الشحنة وتعيينها للمندوب وتوليد رابط التأكيد' : 'تم إنشاء الشحنة وتوليد رابط التأكيد القصير للعميل'
    });

    notifyOrderUpdated(newOrder.id);
    return newOrder;
  },

  updateOrder(companyId: string, id: string, updates: Partial<Order>): Order | null {
    const allOrders: Order[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
    const index = allOrders.findIndex(o => o.id === id && o.company_id === companyId);
    if (index === -1) return null;

    // Validate delivery time if changed
    const current = allOrders[index];
    const newFrom = updates.delivery_from ?? current.delivery_from;
    const newTo = updates.delivery_to ?? current.delivery_to;
    if (newFrom && newTo && newFrom >= newTo) {
      throw new Error('وقت بداية التوصيل يجب أن يكون قبل وقت النهاية');
    }

    const updated = {
      ...allOrders[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    allOrders[index] = updated;
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(allOrders));
    notifyOrderUpdated(id);
    return updated;
  },

  // Centralized Status Transition Method
  updateOrderStatus(
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
  ): Order {
    const allOrders: Order[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
    const index = allOrders.findIndex(o => o.id === id && o.company_id === companyId);
    if (index === -1) {
      throw new Error('الطلب غير موجود في قاعدة بيانات الشركة');
    }

    const currentOrder = allOrders[index];
    const now = new Date().toISOString();
    const updates: Partial<Order> = {
      updated_at: now,
    };

    let eventType: OrderEvent['event_type'] = 'status_changed';
    let eventDetails = `تغيرت حالة الشحنة إلى (${targetStatus})`;

    // Transition rules:
    // 1. Pending -> Assigned (requires or maintains courier_id)
    if (targetStatus === 'assigned') {
      const courierId = options?.courierId !== undefined ? options.courierId : currentOrder.courier_id;
      if (!courierId) {
        throw new Error('لا يمكن تعيين حالة الطلب إلى "معين" بدون اختيار مندوب التوصيل');
      }
      updates.status = 'assigned';
      updates.courier_id = courierId;
      if (!currentOrder.assigned_at) {
        updates.assigned_at = now;
      }
      updates.failure_reason = undefined;
      updates.failure_note = undefined;
      updates.failure_notes = undefined;
      eventType = 'courier_assigned';
      eventDetails = 'تم إسناد الشحنة وتعيين المندوب';
    } 
    // 2. Assigned -> Out for Delivery (Courier start delivery)
    else if (targetStatus === 'out_for_delivery') {
      if (currentOrder.status !== 'assigned' && currentOrder.status !== 'pending' && currentOrder.status !== 'failed') {
        throw new Error(`لا يمكن بدء التوصيل لطلب في حالة (${currentOrder.status})`);
      }
      updates.status = 'out_for_delivery';
      if (!currentOrder.delivery_started_at) {
        updates.delivery_started_at = now;
      }
      eventType = 'delivery_started';
      eventDetails = 'بدأ المندوب عملية التوصيل وتوجه للعميل';
    } 
    // 3. Out for Delivery -> Delivered
    else if (targetStatus === 'delivered') {
      if (currentOrder.status !== 'out_for_delivery' && currentOrder.status !== 'assigned') {
        throw new Error('لا يمكن تأكيد التسليم إلا بعد خروج الشحنة للتوصيل');
      }
      updates.status = 'delivered';
      if (!currentOrder.delivered_at) {
        updates.delivered_at = now;
      }
      updates.delivered_by = options?.actorName || currentOrder.courier_id || 'مندوب التوصيل';
      updates.delivered_by_courier_id = currentOrder.courier_id || undefined;
      updates.failure_reason = undefined;
      updates.failure_note = undefined;
      updates.failure_notes = undefined;
      eventType = 'delivered';
      eventDetails = `تم تسليم الشحنة بنجاح للعميل (${currentOrder.customer_name}) وتحصيل ${Number(currentOrder.cod_amount).toLocaleString()} ج.م`;
    } 
    // 4. Out for Delivery -> Failed
    else if (targetStatus === 'failed') {
      if (!options?.failureReason) {
        throw new Error('يرجى تحديد سبب تعذر التسليم');
      }
      const noteText = (options.failureNote || options.failureNotes || '').trim();
      if (options.failureReason === 'other' && !noteText) {
        throw new Error('يرجى كتابة تفاصيل سبب تعذر التسليم في حقل الملاحظات');
      }
      updates.status = 'failed';
      updates.failed_at = now;
      updates.failed_by = options?.actorName || currentOrder.courier_id || 'مندوب التوصيل';
      updates.failure_reason = options.failureReason;
      updates.failure_note = noteText;
      updates.failure_notes = noteText;
      eventType = 'delivery_failed';
      const reasonLabel = FAILURE_REASONS[options.failureReason as DeliveryFailureReason] || options.failureReason;
      eventDetails = `تعذر تسليم الشحنة - السبب: ${reasonLabel}${noteText ? ` (${noteText})` : ''}`;
    } 
    // 5. Cancelled
    else if (targetStatus === 'cancelled') {
      if (currentOrder.status === 'delivered') {
        throw new Error('لا يمكن إلغاء شحنة تم تسليمها بالفعل');
      }
      updates.status = 'cancelled';
      eventType = 'status_changed';
      eventDetails = 'تم إلغاء الشحنة';
    } 
    // 6. Pending (Unassign courier)
    else if (targetStatus === 'pending') {
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
      if (options.courierId && !currentOrder.assigned_at) {
        updates.assigned_at = now;
      }
    }

    const updatedOrder = {
      ...currentOrder,
      ...updates,
    };
    allOrders[index] = updatedOrder;
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(allOrders));

    // Add status transition event log
    this.addOrderEvent({
      order_id: id,
      company_id: companyId,
      event_type: eventType,
      actor: options?.actorRole === 'courier' ? 'courier' : 'admin',
      actor_name: options?.actorName,
      details: eventDetails
    });

    notifyOrderUpdated(id);
    return updatedOrder;
  },

  deleteOrder(companyId: string, id: string): boolean {
    const allOrders: Order[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
    const filtered = allOrders.filter(o => !(o.id === id && o.company_id === companyId));
    if (filtered.length === allOrders.length) return false;

    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(filtered));
    notifyOrderUpdated(id);
    return true;
  },

  // ----------------------------------------------------
  // ORDER AUDIT TRAIL / EVENTS
  // ----------------------------------------------------
  getOrderEvents(orderId: string): OrderEvent[] {
    const data = localStorage.getItem(STORAGE_KEYS.ORDER_EVENTS);
    const list: OrderEvent[] = data ? JSON.parse(data) : [];
    return list.filter(e => e.order_id === orderId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  getAllOrderEvents(companyId: string, filter?: {
    actor?: string;
    eventType?: string;
    startDate?: string;
    endDate?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    limit?: number;
  }): OrderEvent[] {
    if (!companyId) return [];
    const data = localStorage.getItem(STORAGE_KEYS.ORDER_EVENTS);
    const list: OrderEvent[] = data ? JSON.parse(data) : [];
    
    // Also load orders map for search by order number
    const orders = this.getOrders(companyId);
    const orderMap: Record<string, Order> = {};
    orders.forEach(o => { orderMap[o.id] = o; });

    const sDate = filter?.startDate || filter?.dateFrom;
    const eDate = filter?.endDate || filter?.dateTo;

    const filtered = list.filter(event => {
      if (event.company_id && event.company_id !== companyId) return false;
      
      // If event doesn't have company_id directly, check via order
      if (!event.company_id) {
        const ord = orderMap[event.order_id];
        if (!ord || ord.company_id !== companyId) return false;
      }

      if (filter?.actor && filter.actor !== 'all' && event.actor !== filter.actor) {
        return false;
      }

      if (filter?.eventType && filter.eventType !== 'all' && event.event_type !== filter.eventType) {
        return false;
      }

      const eventDate = event.timestamp.split('T')[0];
      if (sDate && eventDate < sDate) {
        return false;
      }
      if (eDate && eventDate > eDate) {
        return false;
      }

      if (filter?.search) {
        const q = filter.search.toLowerCase().trim();
        const ord = orderMap[event.order_id];
        const matchOrderNumber = ord?.order_number.toLowerCase().includes(q) || false;
        const matchCustomer = ord?.customer_name.toLowerCase().includes(q) || false;
        const matchDetails = event.details?.toLowerCase().includes(q) || false;
        const matchActorName = event.actor_name?.toLowerCase().includes(q) || false;

        if (!matchOrderNumber && !matchCustomer && !matchDetails && !matchActorName) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (filter?.limit && filter.limit > 0) {
      return filtered.slice(0, filter.limit);
    }
    return filtered;
  },

  addOrderEvent(eventData: Omit<OrderEvent, 'id' | 'timestamp'>): OrderEvent {
    const data = localStorage.getItem(STORAGE_KEYS.ORDER_EVENTS);
    const list: OrderEvent[] = data ? JSON.parse(data) : [];
    const newEvent: OrderEvent = {
      id: generateId(),
      ...eventData,
      timestamp: new Date().toISOString(),
    };
    list.push(newEvent);
    localStorage.setItem(STORAGE_KEYS.ORDER_EVENTS, JSON.stringify(list));
    return newEvent;
  },

  // ----------------------------------------------------
  // PUBLIC / CUSTOMER SELF-SERVICE DELIVERY CONFIRMATION
  // ----------------------------------------------------
  /**
   * Retrieves shipment details safely by token for unauthenticated customers.
   * Strips internal company secrets and returns only customer-facing info.
   */
  getOrderByToken(token: string): { order: Order; merchant: Merchant | null; company: Company | null } | null {
    if (!token?.trim()) return null;
    const cleanToken = token.trim();
    const allOrders: Order[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
    const order = allOrders.find(o => o.confirmation_token === cleanToken);
    if (!order) return null;

    const merchants = this.getMerchants(order.company_id);
    const merchant = merchants.find(m => m.id === order.merchant_id) || null;

    const company = this.getCompanyById(order.company_id);

    return { order, merchant, company };
  },

  /**
   * Records when the customer opens the public link for the first time
   */
  recordCustomerLinkOpened(token: string) {
    const result = this.getOrderByToken(token);
    if (!result) return;
    const { order } = result;

    // Check if link_opened event was already recorded in last 30 minutes to avoid spamming
    const events = this.getOrderEvents(order.id);
    const recentOpen = events.find(e => e.event_type === 'link_opened' && (Date.now() - new Date(e.timestamp).getTime() < 30 * 60 * 1000));
    if (!recentOpen) {
      this.addOrderEvent({
        order_id: order.id,
        company_id: order.company_id,
        event_type: 'link_opened',
        actor: 'customer',
        details: 'قام العميل بفتح رابط متابعة وتأكيد الشحنة'
      });
      notifyOrderUpdated(order.id);
    }
  },

  /**
   * Customer Action 1: Confirm Delivery at Scheduled Window
   */
  customerConfirmDelivery(token: string): { success: boolean; order?: Order; error?: string } {
    const allOrders: Order[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
    const index = allOrders.findIndex(o => o.confirmation_token === token.trim());
    if (index === -1) {
      return { success: false, error: 'رابط الشحنة غير صالح أو منتهي الصلاحية' };
    }

    const order = allOrders[index];
    const now = new Date().toISOString();

    const updatedOrder: Order = {
      ...order,
      customer_response_status: 'confirmed',
      customer_responded_at: now,
      updated_at: now,
    };

    allOrders[index] = updatedOrder;
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(allOrders));

    this.addOrderEvent({
      order_id: order.id,
      company_id: order.company_id,
      event_type: 'customer_confirmed',
      actor: 'customer',
      details: `قام العميل بتأكيد استلام الشحنة في موعدها المقرر (${order.delivery_date || 'اليوم'} - من ${order.delivery_from} إلى ${order.delivery_to})`
    });

    // Notify Admin
    this.addNotification(order.company_id, {
      recipient_role: 'admin',
      type: 'customer_confirmed',
      title: 'تأكيد موعد استلام شحنة',
      message: `قام العميل (${order.customer_name}) بتأكيد موعد استلام الشحنة #${order.order_number}`,
      order_id: order.id,
      order_number: order.order_number,
    });

    // Notify Courier if assigned
    if (order.courier_id) {
      this.addNotification(order.company_id, {
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
    return { success: true, order: updatedOrder };
  },

  /**
   * Customer Action 2: Request Reschedule Date/Time Window & optional note
   */
  customerRescheduleDelivery(
    token: string,
    newDate: string,
    newFrom: string,
    newTo: string,
    customerNote?: string
  ): { success: boolean; order?: Order; error?: string } {
    if (!newDate) {
      return { success: false, error: 'يرجى اختيار تاريخ التوصيل الجديد' };
    }
    if (!newFrom || !newTo || newFrom >= newTo) {
      return { success: false, error: 'يرجى اختيار نافذة زمنية صحيحة للتوصيل' };
    }

    const allOrders: Order[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
    const index = allOrders.findIndex(o => o.confirmation_token === token.trim());
    if (index === -1) {
      return { success: false, error: 'رابط الشحنة غير صالح أو منتهي الصلاحية' };
    }

    const order = allOrders[index];
    const now = new Date().toISOString();

    const updatedOrder: Order = {
      ...order,
      customer_response_status: 'reschedule_requested',
      customer_selected_date: newDate,
      customer_selected_from: newFrom,
      customer_selected_to: newTo,
      customer_note: customerNote?.trim() || '',
      customer_responded_at: now,
      updated_at: now,
    };

    allOrders[index] = updatedOrder;
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(allOrders));

    const noteDetails = customerNote?.trim() ? ` - ملاحظة العميل: "${customerNote.trim()}"` : '';
    this.addOrderEvent({
      order_id: order.id,
      company_id: order.company_id,
      event_type: 'customer_rescheduled',
      actor: 'customer',
      details: `طلب العميل تعديل موعد التوصيل إلى (${newDate} من ${newFrom} إلى ${newTo})${noteDetails}`
    });

    // Notify Admin
    this.addNotification(order.company_id, {
      recipient_role: 'admin',
      type: 'customer_rescheduled',
      title: 'طلب تعديل موعد شحنة',
      message: `طلب العميل (${order.customer_name}) تأجيل موعد تسليم الشحنة #${order.order_number} إلى ${newDate}`,
      order_id: order.id,
      order_number: order.order_number,
    });

    // Notify Courier if assigned
    if (order.courier_id) {
      this.addNotification(order.company_id, {
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
    return { success: true, order: updatedOrder };
  },

  /**
   * Customer Action 3: Cancel Order
   */
  customerCancelDelivery(token: string): { success: boolean; order?: Order; error?: string } {
    const allOrders: Order[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
    const index = allOrders.findIndex(o => o.confirmation_token === token.trim());
    if (index === -1) {
      return { success: false, error: 'رابط الشحنة غير صالح أو منتهي الصلاحية' };
    }

    const order = allOrders[index];
    if (order.status === 'delivered') {
      return { success: false, error: 'لا يمكن إلغاء الشحنة لأنها مسلّمة بالفعل' };
    }

    const now = new Date().toISOString();
    const updatedOrder: Order = {
      ...order,
      status: 'cancelled',
      customer_response_status: 'cancelled',
      cancellation_source: 'customer',
      cancellation_timestamp: now,
      customer_responded_at: now,
      updated_at: now,
    };

    allOrders[index] = updatedOrder;
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(allOrders));

    this.addOrderEvent({
      order_id: order.id,
      company_id: order.company_id,
      event_type: 'customer_cancelled',
      actor: 'customer',
      details: 'قام العميل بإلغاء الشحنة بنفسه عبر صفحة تأكيد التسليم'
    });

    // Notify Admin
    this.addNotification(order.company_id, {
      recipient_role: 'admin',
      type: 'customer_cancelled',
      title: 'إلغاء الشحنة من قبل العميل',
      message: `قام العميل (${order.customer_name}) بإلغاء الشحنة #${order.order_number}`,
      order_id: order.id,
      order_number: order.order_number,
    });

    // Notify Courier if assigned
    if (order.courier_id) {
      this.addNotification(order.company_id, {
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
    return { success: true, order: updatedOrder };
  },

  /**
   * Records WhatsApp Confirmation Sent by Admin or Courier
   */
  recordWhatsAppSent(companyId: string, orderId: string, actor: 'admin' | 'courier', actorName?: string) {
    const allOrders: Order[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
    const index = allOrders.findIndex(o => o.id === orderId && o.company_id === companyId);
    if (index === -1) return;

    const now = new Date().toISOString();
    allOrders[index].confirmation_sent_at = now;
    allOrders[index].updated_at = now;
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(allOrders));

    this.addOrderEvent({
      order_id: orderId,
      company_id: companyId,
      event_type: 'whatsapp_sent',
      actor,
      actor_name: actorName,
      details: `تم إرسال رابط تأكيد الاستلام عبر واتساب إلى العميل (${allOrders[index].customer_phone})`
    });

    notifyOrderUpdated(orderId);
  },

  // ----------------------------------------------------
  // RETURNS (Enforcing company_id & multi-tenant RLS)
  // ----------------------------------------------------
  getNextReturnNumber(companyId: string): string {
    const returnsList = this.getReturns(companyId);
    let maxNum = 0;
    returnsList.forEach(r => {
      const match = r.return_number?.match(/RET-(\d+)/);
      if (match && match[1]) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n > maxNum) {
          maxNum = n;
        }
      }
    });
    const nextVal = (maxNum || returnsList.length) + 1;
    return `DLX-RET-${String(nextVal).padStart(6, '0')}`;
  },

  getReturns(companyId: string, courierIdFilter?: string | null, merchantIdFilter?: string | null): ReturnRecord[] {
    if (!companyId) return [];
    const data = localStorage.getItem(STORAGE_KEYS.RETURNS);
    const list: ReturnRecord[] = data ? JSON.parse(data) : [];

    // Step 1: Filter strictly by company_id (RLS)
    let companyReturns = list.filter(r => r.company_id === companyId);

    // Step 2: Courier filter
    if (courierIdFilter) {
      companyReturns = companyReturns.filter(r => r.courier_id === courierIdFilter);
    }

    // Step 3: Merchant filter
    if (merchantIdFilter) {
      companyReturns = companyReturns.filter(r => r.merchant_id === merchantIdFilter);
    }

    return companyReturns;
  },

  getReturnById(companyId: string, id: string): ReturnRecord | null {
    const list = this.getReturns(companyId);
    return list.find(r => r.id === id) || null;
  },

  getReturnByOrderId(companyId: string, orderId: string): ReturnRecord | null {
    const list = this.getReturns(companyId);
    return list.find(r => r.order_id === orderId) || null;
  },

  createReturn(companyId: string, data: {
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
  }): ReturnRecord {
    // 1. Verify original order exists
    const order = this.getOrderById(companyId, data.order_id);
    if (!order) {
      throw new Error('الشحنة الأصلية غير موجودة');
    }

    // 2. Prevent duplicate returns
    const existing = this.getReturnByOrderId(companyId, data.order_id);
    if (existing) {
      throw new Error(`يوجد بالفعل طلب إرجاع مسجل لهذه الشحنة برقم (${existing.return_number})`);
    }

    // 3. Return Eligibility: Delivered or Failed
    if (order.status !== 'delivered' && order.status !== 'failed') {
      throw new Error('لا يمكن تسجيل إرجاع إلا للشحنات المسلمة أو المتعثرة');
    }

    // 4. Validate fields
    if (!data.customer_name?.trim()) {
      throw new Error('اسم العميل مطلوب');
    }
    if (!data.customer_phone?.trim()) {
      throw new Error('رقم هاتف العميل مطلوب');
    }
    if (!data.return_address?.trim()) {
      throw new Error('عنوان الإرجاع مطلوب');
    }
    if (!data.return_reason) {
      throw new Error('يرجى تحديد سبب الإرجاع');
    }
    if (data.return_reason === 'other' && !data.other_reason?.trim()) {
      throw new Error('يرجى توضيح سبب الإرجاع في حقل السبب الآخر');
    }

    const returnAmount = Math.max(0, Number(data.return_amount) || 0);
    const returnShippingCost = Math.max(0, Number(data.return_shipping_cost) || 0);
    const otherCost = Math.max(0, Number(data.other_cost) || 0);
    const totalReturnAmount = returnAmount + returnShippingCost + otherCost;

    // Return Cost Payer Calculations
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
      // none
      returnCostAmount = 0;
      customerNetRefund = refundableAmount;
      merchantChargeAmount = 0;
    }

    const allReturns: ReturnRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.RETURNS) || '[]');
    const now = new Date().toISOString();
    const returnNumber = this.getNextReturnNumber(companyId);

    const initialStatus: ReturnStatus = data.courier_id ? 'with_courier' : 'created';

    const newReturn: ReturnRecord = {
      id: generateId(),
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

    allReturns.push(newReturn);
    localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify(allReturns));

    // If Merchant pays the return cost, automatically record a debit transaction in the Merchant Ledger
    if (returnCostPayer === 'merchant' && merchantChargeAmount > 0) {
      this.addMerchantTransaction(companyId, {
        merchant_id: order.merchant_id,
        transaction_type: 'RETURN_COST',
        direction: 'debit',
        amount: merchantChargeAmount,
        reference_type: 'return',
        reference_id: newReturn.id,
        order_id: order.id,
        order_number: order.order_number,
        return_id: newReturn.id,
        return_number: returnNumber,
        description: `تكلفة إرجاع شحنة (#${order.order_number}) - إرجاع #${returnNumber}`,
        created_by: data.actorName || data.created_by || 'Admin',
      });
    }

    // Audit log
    this.addOrderEvent({
      order_id: data.order_id,
      return_id: newReturn.id,
      company_id: companyId,
      event_type: 'return_created',
      actor: 'admin',
      actor_name: data.actorName || data.created_by,
      details: `تم إنشاء إرجاع برقم (${returnNumber}) - المبلغ: ${totalReturnAmount.toLocaleString()} ج.م - تحمّل التكلفة: ${
        returnCostPayer === 'customer' ? 'العميل' : returnCostPayer === 'merchant' ? 'التاجر' : 'بدون تكلفة'
      } - صافي استرداد العميل: ${customerNetRefund.toLocaleString()} ج.م${merchantChargeAmount > 0 ? ` - مديونية على التاجر: ${merchantChargeAmount.toLocaleString()} ج.م` : ''}`
    });

    // Notify Admin
    this.addNotification(companyId, {
      recipient_role: 'admin',
      type: 'return_created',
      title: 'تسجيل طلب إرجاع جديد',
      message: `تم إنشاء طلب إرجاع رقم (${returnNumber}) للشحنة #${order.order_number}`,
      order_id: data.order_id,
      order_number: order.order_number,
      return_id: newReturn.id,
      return_number: returnNumber,
    });

    // Notify Courier if assigned
    if (data.courier_id) {
      this.addNotification(companyId, {
        recipient_role: 'courier',
        recipient_courier_id: data.courier_id,
        type: 'return_assigned',
        title: 'إسناد شحنة مرتجعة',
        message: `تم إسناد الشحنة المرتجعة رقم (${returnNumber}) إليك لاستلامها من العميل`,
        order_id: data.order_id,
        order_number: order.order_number,
        return_id: newReturn.id,
        return_number: returnNumber,
      });
    }

    notifyOrderUpdated(data.order_id);
    return newReturn;
  },

  updateReturn(
    companyId: string,
    id: string,
    updates: Partial<ReturnRecord>,
    actorContext: { role: UserRole; name?: string; courierId?: string; }
  ): ReturnRecord {
    const allReturns: ReturnRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.RETURNS) || '[]');
    const index = allReturns.findIndex(r => r.id === id && r.company_id === companyId);
    if (index === -1) {
      throw new Error('طلب الإرجاع غير موجود');
    }

    const currentReturn = allReturns[index];
    const now = new Date().toISOString();

    // Security constraint: Courier CANNOT modify financial fields or merchant/order/phone
    if (actorContext.role === 'courier') {
      delete updates.return_amount;
      delete updates.return_shipping_cost;
      delete updates.other_cost;
      delete updates.total_return_amount;
      delete updates.return_cost_payer;
      delete updates.refundable_amount;
      delete updates.return_cost_amount;
      delete updates.customer_net_refund;
      delete updates.merchant_charge_amount;
      delete updates.customer_phone;
      delete updates.merchant_id;
      delete updates.order_id;
      delete updates.company_id;
    }

    // Recalculate totals if financial figures changed by Admin
    let returnAmount = updates.return_amount !== undefined ? Math.max(0, Number(updates.return_amount) || 0) : currentReturn.return_amount;
    let shippingCost = updates.return_shipping_cost !== undefined ? Math.max(0, Number(updates.return_shipping_cost) || 0) : currentReturn.return_shipping_cost;
    let otherCost = updates.other_cost !== undefined ? Math.max(0, Number(updates.other_cost) || 0) : currentReturn.other_cost;
    let totalReturnAmount = returnAmount + shippingCost + otherCost;

    let returnCostPayer = updates.return_cost_payer || currentReturn.return_cost_payer || 'none';
    let refundableAmount = updates.refundable_amount !== undefined ? Math.max(0, Number(updates.refundable_amount) || 0) : (currentReturn.refundable_amount ?? returnAmount);
    let returnCostAmount = updates.return_cost_amount !== undefined ? Math.max(0, Number(updates.return_cost_amount) || 0) : (currentReturn.return_cost_amount ?? 0);
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

    // Courier assignment transition
    let newStatus = updates.status || currentReturn.status;
    if (updates.courier_id && currentReturn.status === 'created' && !updates.status) {
      newStatus = 'with_courier';
    }

    const updatedReturn: ReturnRecord = {
      ...currentReturn,
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

    allReturns[index] = updatedReturn;
    localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify(allReturns));

    this.addOrderEvent({
      order_id: currentReturn.order_id,
      return_id: currentReturn.id,
      company_id: companyId,
      event_type: 'return_updated',
      actor: actorContext.role === 'courier' ? 'courier' : 'admin',
      actor_name: actorContext.name,
      details: `تم تحديث بيانات الإرجاع (${currentReturn.return_number})`
    });

    notifyOrderUpdated(currentReturn.order_id);
    return updatedReturn;
  },

  updateReturnStatus(
    companyId: string,
    id: string,
    targetStatus: ReturnStatus,
    actorContext: { role: UserRole; name?: string; courierId?: string; }
  ): ReturnRecord {
    const allReturns: ReturnRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.RETURNS) || '[]');
    const index = allReturns.findIndex(r => r.id === id && r.company_id === companyId);
    if (index === -1) {
      throw new Error('طلب الإرجاع غير موجود');
    }

    const currentReturn = allReturns[index];
    const now = new Date().toISOString();

    const updates: Partial<ReturnRecord> = {
      status: targetStatus,
      updated_at: now,
    };

    let eventType: OrderEvent['event_type'] = 'return_updated';
    let eventDetails = `تغيرت حالة الإرجاع إلى (${targetStatus})`;

    if (targetStatus === 'with_courier') {
      eventType = 'return_started';
      eventDetails = `استلم المندوب (${actorContext.name || 'المندوب'}) الشحنة المرتجعة وبدأ نقلها`;
    } else if (targetStatus === 'returned') {
      updates.returned_at = now;
      updates.returned_by = actorContext.name || 'مندوب التوصيل';
      updates.returned_by_courier_id = actorContext.courierId || currentReturn.courier_id || undefined;
      eventType = 'return_completed';
      eventDetails = `تم إرجاع الشحنة بنجاح للمتجر/الشركة بواسطة (${updates.returned_by})`;
    } else if (targetStatus === 'cancelled') {
      if (actorContext.role === 'courier') {
        throw new Error('لا يملك المندوب صلاحية إلغاء طلب الإرجاع');
      }
      eventType = 'return_cancelled';
      eventDetails = 'تم إلغاء طلب الإرجاع من قبل الإدارة';
    }

    const updatedReturn: ReturnRecord = {
      ...currentReturn,
      ...updates,
    };

    allReturns[index] = updatedReturn;
    localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify(allReturns));

    this.addOrderEvent({
      order_id: currentReturn.order_id,
      return_id: currentReturn.id,
      company_id: companyId,
      event_type: eventType,
      actor: actorContext.role === 'courier' ? 'courier' : 'admin',
      actor_name: actorContext.name,
      details: eventDetails
    });

    if (targetStatus === 'returned') {
      this.addNotification(companyId, {
        recipient_role: 'admin',
        type: 'return_completed',
        title: 'استكمال إرجاع الشحنة',
        message: `تم استكمال إرجاع الشحنة رقم (${currentReturn.return_number}) وتسليمها للشركة بنجاح`,
        order_id: currentReturn.order_id,
        return_id: currentReturn.id,
        return_number: currentReturn.return_number,
      });
    }

    notifyOrderUpdated(currentReturn.order_id);
    return updatedReturn;
  },

  getReturnMetrics(companyId: string, courierId?: string | null, merchantId?: string | null) {
    const list = this.getReturns(companyId, courierId, merchantId);
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
  getNotifications(companyId: string, filter?: { role?: 'admin' | 'courier'; courierId?: string; unreadOnly?: boolean }): AppNotification[] {
    if (!companyId) return [];
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    const list: AppNotification[] = raw ? JSON.parse(raw) : [];
    
    return list.filter(n => {
      if (n.company_id !== companyId) return false;
      if (filter?.role && n.recipient_role !== filter.role) return false;
      if (filter?.courierId && n.recipient_role === 'courier' && n.recipient_courier_id !== filter.courierId) return false;
      if (filter?.unreadOnly && n.read) return false;
      return true;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  addNotification(companyId: string, data: Omit<AppNotification, 'id' | 'created_at' | 'read' | 'company_id'>): AppNotification {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    const list: AppNotification[] = raw ? JSON.parse(raw) : [];
    
    const newNotif: AppNotification = {
      id: 'notif-' + generateId().slice(0, 8),
      company_id: companyId,
      created_at: new Date().toISOString(),
      read: false,
      ...data,
    };

    list.unshift(newNotif);
    // Keep last 100 notifications to prevent unbounded growth
    const trimmed = list.slice(0, 100);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(trimmed));
    
    notifyOrderUpdated(data.order_id);
    return newNotif;
  },

  markNotificationAsRead(companyId: string, notifId: string): boolean {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    const list: AppNotification[] = raw ? JSON.parse(raw) : [];
    const index = list.findIndex(n => n.id === notifId && n.company_id === companyId);
    if (index === -1) return false;

    list[index].read = true;
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
    notifyOrderUpdated();
    return true;
  },

  markAllNotificationsAsRead(companyId: string, filter?: { role?: 'admin' | 'courier'; courierId?: string }): boolean {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    const list: AppNotification[] = raw ? JSON.parse(raw) : [];

    let updated = false;
    const newList = list.map(n => {
      if (n.company_id === companyId) {
        if (!filter?.role || n.recipient_role === filter.role) {
          if (!filter?.courierId || n.recipient_courier_id === filter.courierId) {
            if (!n.read) {
              updated = true;
              return { ...n, read: true };
            }
          }
        }
      }
      return n;
    });

    if (updated) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(newList));
      notifyOrderUpdated();
    }
    return updated;
  },

  // ----------------------------------------------------
  // COMPANY DELIVERY SLOTS & SETTINGS
  // ----------------------------------------------------
  getDeliverySlots(companyId: string): DeliverySlot[] {
    const company = this.getCompanyById(companyId);
    if (company && company.delivery_slots && company.delivery_slots.length > 0) {
      return company.delivery_slots;
    }
    return DEFAULT_DELIVERY_SLOTS;
  },

  saveDeliverySlots(companyId: string, slots: DeliverySlot[]): Company {
    const allCompanies = this.getCompanies();
    const index = allCompanies.findIndex(c => c.id === companyId);
    if (index === -1) throw new Error('الشركة غير موجودة');

    const updated = {
      ...allCompanies[index],
      delivery_slots: slots,
      updated_at: new Date().toISOString(),
    };
    allCompanies[index] = updated;
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(allCompanies));
    notifyOrderUpdated();
    return updated;
  },

  updateDeliverySlots(companyId: string, slots: DeliverySlot[]): Company {
    return this.saveDeliverySlots(companyId, slots);
  },

  addDeliverySlot(companyId: string, slotData: Omit<DeliverySlot, 'id'>): DeliverySlot {
    const currentSlots = this.getDeliverySlots(companyId);
    const newSlot: DeliverySlot = {
      id: 'slot-' + generateId().slice(0, 6),
      ...slotData,
    };
    const updatedSlots = [...currentSlots, newSlot];
    this.saveDeliverySlots(companyId, updatedSlots);
    return newSlot;
  },

  updateDeliverySlot(companyId: string, slotId: string, updates: Partial<DeliverySlot>): DeliverySlot {
    const currentSlots = this.getDeliverySlots(companyId);
    const index = currentSlots.findIndex(s => s.id === slotId);
    if (index === -1) throw new Error('فترة التوصيل غير موجودة');

    const updatedSlot = { ...currentSlots[index], ...updates };
    currentSlots[index] = updatedSlot;
    this.saveDeliverySlots(companyId, currentSlots);
    return updatedSlot;
  },

  toggleDeliverySlot(companyId: string, slotId: string): DeliverySlot | null {
    const currentSlots = this.getDeliverySlots(companyId);
    const index = currentSlots.findIndex(s => s.id === slotId);
    if (index === -1) return null;
    currentSlots[index].is_active = !currentSlots[index].is_active;
    this.saveDeliverySlots(companyId, currentSlots);
    return currentSlots[index];
  },

  deleteDeliverySlot(companyId: string, slotId: string): boolean {
    const currentSlots = this.getDeliverySlots(companyId);
    const filtered = currentSlots.filter(s => s.id !== slotId);
    if (filtered.length === currentSlots.length) return false;

    this.saveDeliverySlots(companyId, filtered);
    return true;
  },

  // ----------------------------------------------------
  // PROFILE & COMPANY UPDATES
  // ----------------------------------------------------
  updateCompanyProfile(companyId: string, data: { name?: string; phone?: string; email?: string; address?: string; logo_url?: string }): Company {
    const allCompanies = this.getCompanies();
    const index = allCompanies.findIndex(c => c.id === companyId);
    if (index === -1) throw new Error('الشركة غير موجودة');

    const updated: Company = {
      ...allCompanies[index],
      ...data,
      updated_at: new Date().toISOString(),
    };
    allCompanies[index] = updated;
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(allCompanies));
    notifyOrderUpdated();
    return updated;
  },

  updateAdminProfile(companyId: string, profileId: string, data: { full_name?: string; phone?: string }): Profile {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILES);
    const profiles: Profile[] = raw ? JSON.parse(raw) : [];
    const index = profiles.findIndex(p => p.id === profileId && p.company_id === companyId);
    if (index === -1) throw new Error('الملف الشخصي غير موجود');

    const updated: Profile = {
      ...profiles[index],
      ...data,
      updated_at: new Date().toISOString(),
    };
    profiles[index] = updated;
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
    notifyOrderUpdated();
    return updated;
  },

  updateCourierSelfProfile(companyId: string, courierId: string, data: { full_name?: string; phone?: string; vehicle_type?: string; vehicle_plate?: string }): Courier {
    const raw = localStorage.getItem(STORAGE_KEYS.COURIERS);
    const couriers: Courier[] = raw ? JSON.parse(raw) : [];
    const index = couriers.findIndex(c => c.id === courierId && c.company_id === companyId);
    if (index === -1) throw new Error('حساب المندوب غير موجود');

    const updated: Courier = {
      ...couriers[index],
      ...data,
      updated_at: new Date().toISOString(),
    };
    couriers[index] = updated;
    localStorage.setItem(STORAGE_KEYS.COURIERS, JSON.stringify(couriers));

    // Also update associated profile if name/phone changed
    if (data.full_name || data.phone) {
      const pRaw = localStorage.getItem(STORAGE_KEYS.PROFILES);
      const profiles: Profile[] = pRaw ? JSON.parse(pRaw) : [];
      const pIndex = profiles.findIndex(p => p.id === couriers[index].profile_id);
      if (pIndex !== -1) {
        profiles[pIndex] = {
          ...profiles[pIndex],
          full_name: data.full_name || profiles[pIndex].full_name,
          phone: data.phone || profiles[pIndex].phone,
          updated_at: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
      }
    }

    notifyOrderUpdated();
    return updated;
  },

  // ----------------------------------------------------
  // ACTIVITY LOGS / AUDIT TRAIL QUERY
  // ----------------------------------------------------
  getOrderActivityLogs(
    companyId: string,
    filters?: {
      dateFrom?: string;
      dateTo?: string;
      actor?: string;
      eventType?: string;
      search?: string;
      limit?: number;
    }
  ): { event: OrderEvent; order?: Order; returnRecord?: ReturnRecord }[] {
    if (!companyId) return [];
    const eventsRaw = localStorage.getItem(STORAGE_KEYS.ORDER_EVENTS);
    const events: OrderEvent[] = eventsRaw ? JSON.parse(eventsRaw) : [];
    const orders = this.getOrders(companyId);
    const returnsList = this.getReturns(companyId);

    const ordersMap = new Map<string, Order>();
    orders.forEach(o => ordersMap.set(o.id, o));

    const returnsMap = new Map<string, ReturnRecord>();
    returnsList.forEach(r => returnsMap.set(r.id, r));

    let result = events
      .filter(e => e.company_id === companyId)
      .map(event => {
        const order = event.order_id ? ordersMap.get(event.order_id) : undefined;
        const returnRecord = event.return_id ? returnsMap.get(event.return_id) : undefined;
        return { event, order, returnRecord };
      });

    if (filters?.dateFrom) {
      const fromTime = new Date(filters.dateFrom).getTime();
      result = result.filter(item => new Date(item.event.timestamp).getTime() >= fromTime);
    }
    if (filters?.dateTo) {
      const toTime = new Date(filters.dateTo).setHours(23, 59, 59, 999);
      result = result.filter(item => new Date(item.event.timestamp).getTime() <= toTime);
    }
    if (filters?.actor && filters.actor !== 'all') {
      result = result.filter(item => item.event.actor === filters.actor);
    }
    if (filters?.eventType && filters.eventType !== 'all') {
      result = result.filter(item => item.event.event_type === filters.eventType);
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter(item => {
        const orderNum = item.order?.order_number?.toLowerCase() || '';
        const retNum = item.returnRecord?.return_number?.toLowerCase() || '';
        const custName = item.order?.customer_name?.toLowerCase() || '';
        const details = item.event.details?.toLowerCase() || '';
        const actorName = item.event.actor_name?.toLowerCase() || '';
        return orderNum.includes(q) || retNum.includes(q) || custName.includes(q) || details.includes(q) || actorName.includes(q);
      });
    }

    result.sort((a, b) => new Date(b.event.timestamp).getTime() - new Date(a.event.timestamp).getTime());

    if (filters?.limit && filters.limit > 0) {
      result = result.slice(0, filters.limit);
    }

    return result;
  },

  // ----------------------------------------------------
  // COURIER COD COLLECTIONS & DEBT SETTLEMENTS (Strict Multi-Tenant RLS)
  // ----------------------------------------------------
  getSettlements(companyId: string, courierId?: string): CourierSettlement[] {
    if (!companyId) return [];
    const data = localStorage.getItem(STORAGE_KEYS.SETTLEMENTS);
    const list: CourierSettlement[] = data ? JSON.parse(data) : [];
    
    // Strict isolation: only settlements for this company
    let filtered = list.filter(s => s.company_id === companyId);
    if (courierId) {
      filtered = filtered.filter(s => s.courier_id === courierId);
    }
    
    // Sort newest first
    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getSettlementById(companyId: string, id: string): CourierSettlement | null {
    if (!companyId || !id) return null;
    const list = this.getSettlements(companyId);
    return list.find(s => s.id === id || s.settlement_number === id) || null;
  },

  getCourierCollectionSummary(companyId: string, courierId: string): CourierCollectionSummary | null {
    if (!companyId || !courierId) return null;
    const courier = this.getCourierById(companyId, courierId);
    if (!courier) return null;

    const allOrders = this.getOrders(companyId, courierId);
    
    // Distinct delivered orders (avoid duplicate counting)
    const seenOrderIds = new Set<string>();
    const deliveredOrders = allOrders.filter(o => {
      if (o.status !== 'delivered') return false;
      if (seenOrderIds.has(o.id)) return false;
      seenOrderIds.add(o.id);
      return true;
    });

    // Only orders with positive COD amount
    const deliveredCodOrders = deliveredOrders.filter(o => (Number(o.cod_amount) || 0) > 0);
    const totalDeliveredCod = deliveredCodOrders.reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);

    // Settlements for this courier
    const settlements = this.getSettlements(companyId, courierId);
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

  getAllCouriersCollections(companyId: string): CourierCollectionSummary[] {
    if (!companyId) return [];
    const couriers = this.getCouriers(companyId);
    const summaries: CourierCollectionSummary[] = [];

    for (const courier of couriers) {
      const summary = this.getCourierCollectionSummary(companyId, courier.id);
      if (summary) {
        summaries.push(summary);
      }
    }

    // Sort couriers with highest outstanding balance first
    return summaries.sort((a, b) => b.current_outstanding_balance - a.current_outstanding_balance);
  },

  getOutstandingCollectionsTotal(companyId: string): { totalOutstanding: number; couriersWithDebtCount: number } {
    const collections = this.getAllCouriersCollections(companyId);
    const totalOutstanding = collections.reduce((sum, c) => sum + c.current_outstanding_balance, 0);
    const couriersWithDebtCount = collections.filter(c => c.current_outstanding_balance > 0).length;

    return {
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      couriersWithDebtCount,
    };
  },

  createSettlement(
    companyId: string, 
    data: { 
      courierId: string; 
      receivedAmount: number; 
      settledBy: string; 
      settledByProfileId?: string;
      notes?: string; 
    }
  ): CourierSettlement {
    if (!companyId) {
      throw new Error('معرف الشركة مطلوب لإجراء التسوية');
    }

    const courier = this.getCourierById(companyId, data.courierId);
    if (!courier) {
      throw new Error('المندوب المحدد غير موجود في قاعدة بيانات الشركة');
    }

    const received = Number(data.receivedAmount);
    if (isNaN(received) || received <= 0) {
      throw new Error('مبلغ الاستلام يجب أن يكون رقماً موجباً أكبر من الصفر');
    }

    // Calculate current live outstanding collections
    const summary = this.getCourierCollectionSummary(companyId, data.courierId);
    if (!summary) {
      throw new Error('تعذر احتساب مبالغ التحصيلات الحالية للمندوب');
    }

    const expectedAmount = summary.current_outstanding_balance;
    if (expectedAmount <= 0) {
      throw new Error('لا توجد تحصيلات نقدية معلقة لتسويتها لهذا المندوب');
    }

    // Overpayment protection
    if (received > expectedAmount) {
      throw new Error('المبلغ المستلم لا يمكن أن يتجاوز إجمالي التحصيلات المعلقة');
    }

    const remainingAmount = Math.max(0, Math.round((expectedAmount - received) * 100) / 100);

    // Sequence number generation (e.g. SET-0001)
    const existingSettlements = this.getSettlements(companyId);
    const seqNum = existingSettlements.length + 1;
    const settlementNumber = `SET-${String(seqNum).padStart(4, '0')}`;

    const now = new Date().toISOString();
    const newSettlement: CourierSettlement = {
      id: generateId(),
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

    // Save to permanent immutable storage
    const allSettlementsRaw = localStorage.getItem(STORAGE_KEYS.SETTLEMENTS);
    const allSettlements: CourierSettlement[] = allSettlementsRaw ? JSON.parse(allSettlementsRaw) : [];
    allSettlements.push(newSettlement);
    localStorage.setItem(STORAGE_KEYS.SETTLEMENTS, JSON.stringify(allSettlements));

    // Log Activity Event for Audit Trail
    this.addOrderEvent({
      order_id: '',
      company_id: companyId,
      event_type: 'settlement_created',
      timestamp: now,
      actor: 'admin',
      actor_name: data.settledBy,
      details: `تسوية تحصيلات نقدية للمندوب (${courier.full_name} - ${courier.employee_id}) برقم (${settlementNumber}) | المبلغ المستحق: ${expectedAmount.toLocaleString()} ج.م | المستلم: ${received.toLocaleString()} ج.م | المتبقي: ${remainingAmount.toLocaleString()} ج.م${data.notes ? ` - ملاحظات: ${data.notes}` : ''}`,
      metadata: {
        settlement_id: newSettlement.id,
        settlement_number: settlementNumber,
        courier_id: courier.id,
        courier_name: courier.full_name,
        employee_id: courier.employee_id,
        expected_amount: expectedAmount,
        received_amount: received,
        remaining_amount: remainingAmount,
      }
    });

    // Broadcast sync to all active views and tabs
    notifyOrderUpdated();

    return newSettlement;
  },

  // ----------------------------------------------------
  // MERCHANT FINANCIAL LEDGER & ACCOUNTING SYSTEM
  // ----------------------------------------------------
  getMerchantTransactions(companyId: string, merchantId?: string): MerchantTransaction[] {
    if (!companyId) return [];
    const data = localStorage.getItem(STORAGE_KEYS.MERCHANT_TRANSACTIONS);
    const list: MerchantTransaction[] = data ? JSON.parse(data) : [];

    let filtered = list.filter(t => t.company_id === companyId);
    if (merchantId) {
      filtered = filtered.filter(t => t.merchant_id === merchantId);
    }

    // Sort ascending first to compute running balance correctly
    const ascending = filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    let currentBalance = 0;
    const withRunning = ascending.map(t => {
      if (t.direction === 'credit') {
        currentBalance += t.amount;
      } else {
        currentBalance -= t.amount;
      }
      return {
        ...t,
        type: t.direction,
        running_balance: Math.round(currentBalance * 100) / 100
      };
    });

    // Return newest first
    return withRunning.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  addMerchantTransaction(
    companyId: string, 
    data: Omit<MerchantTransaction, 'id' | 'company_id' | 'created_at'>
  ): MerchantTransaction {
    if (!companyId || !data.merchant_id) {
      throw new Error('معرف الشركة ومعرف التاجر مطلوبان لإجراء المعاملة المالية');
    }

    const amount = Number(data.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('مبلغ المعاملة المالية يجب أن يكون رقماً موجباً أكبر من الصفر');
    }

    const allTxRaw = localStorage.getItem(STORAGE_KEYS.MERCHANT_TRANSACTIONS);
    const allTx: MerchantTransaction[] = allTxRaw ? JSON.parse(allTxRaw) : [];
    const now = new Date().toISOString();

    const newTx: MerchantTransaction = {
      id: generateId(),
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

    allTx.push(newTx);
    localStorage.setItem(STORAGE_KEYS.MERCHANT_TRANSACTIONS, JSON.stringify(allTx));

    notifyOrderUpdated();
    return newTx;
  },

  getMerchantSettlements(companyId: string, merchantId?: string): MerchantSettlement[] {
    if (!companyId) return [];
    const data = localStorage.getItem(STORAGE_KEYS.MERCHANT_SETTLEMENTS);
    const list: MerchantSettlement[] = data ? JSON.parse(data) : [];

    let filtered = list.filter(s => s.company_id === companyId);
    if (merchantId) {
      filtered = filtered.filter(s => s.merchant_id === merchantId);
    }

    return filtered
      .map(s => ({
        ...s,
        amount: s.paid_amount,
        type: s.settlement_type,
        created_by: s.settled_by,
        settlement_date: s.created_at,
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getNextMerchantSettlementNumber(companyId: string): string {
    const settlements = this.getMerchantSettlements(companyId);
    const count = settlements.length + 1;
    return `MSET-${String(count).padStart(4, '0')}`;
  },

  createMerchantSettlement(
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
  ): MerchantSettlement {
    if (!companyId) throw new Error('معرف الشركة مطلوب لإجراء التسوية');
    const merchant = this.getMerchantById(companyId, data.merchantId);
    if (!merchant) throw new Error('التاجر المحدد غير موجود');

    const amount = Number(data.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('مبلغ التسوية يجب أن يكون رقماً موجباً أكبر من الصفر');
    }

    const summary = this.getMerchantFinancialSummary(companyId, data.merchantId);
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
    const settlementNumber = this.getNextMerchantSettlementNumber(companyId);
    const now = new Date().toISOString();

    const newSettlement: MerchantSettlement = {
      id: generateId(),
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

    const allSettlementsRaw = localStorage.getItem(STORAGE_KEYS.MERCHANT_SETTLEMENTS);
    const allSettlements: MerchantSettlement[] = allSettlementsRaw ? JSON.parse(allSettlementsRaw) : [];
    allSettlements.push(newSettlement);
    localStorage.setItem(STORAGE_KEYS.MERCHANT_SETTLEMENTS, JSON.stringify(allSettlements));

    // Record corresponding transaction in ledger
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

    this.addMerchantTransaction(companyId, {
      merchant_id: merchant.id,
      transaction_type: txType,
      direction: txDirection,
      amount,
      reference_type: 'settlement',
      reference_id: newSettlement.id,
      settlement_id: newSettlement.id,
      settlement_number: settlementNumber,
      description: txDesc + (data.notes ? ` - ملاحظات: ${data.notes}` : ''),
      created_by: data.settledBy,
    });

    // Audit log
    this.addOrderEvent({
      order_id: '',
      company_id: companyId,
      event_type: 'settlement_created',
      timestamp: now,
      actor: 'admin',
      actor_name: data.settledBy,
      details: `تسوية مالية لمتجر (${merchant.store_name}) برقم (${settlementNumber}) | النوع: ${
        data.settlementType === 'payout_to_merchant' ? 'صرف مستحقات' : data.settlementType === 'debt_collection' ? 'تحصيل مديونية' : 'تسوية صافي'
      } | المبلغ: ${amount.toLocaleString()} ج.م | المتبقي: ${remainingAmount.toLocaleString()} ج.م`
    });

    notifyOrderUpdated();
    return newSettlement;
  },

  getMerchantFinancialSummary(companyId: string, merchantId: string): MerchantFinancialSummary | null {
    if (!companyId || !merchantId) return null;
    const merchant = this.getMerchantById(companyId, merchantId);
    if (!merchant) return null;

    const orders = this.getOrders(companyId).filter(o => o.merchant_id === merchantId);
    const returnsList = this.getReturns(companyId).filter(r => r.merchant_id === merchantId);
    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    const deliveredCodSum = deliveredOrders.reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);

    const transactions = this.getMerchantTransactions(companyId, merchantId);
    const settlements = this.getMerchantSettlements(companyId, merchantId);

    // Sum of payouts to merchant (money paid to merchant from company)
    const payoutsSum = settlements
      .filter(s => s.settlement_type === 'payout_to_merchant' || (s.settlement_type === 'net_settlement' && s.expected_amount > 0))
      .reduce((sum, s) => sum + s.paid_amount, 0);

    // Additional manual credit transactions to merchant
    const manualCredits = transactions
      .filter(t => t.transaction_type === 'CREDIT_TO_MERCHANT')
      .reduce((sum, t) => sum + t.amount, 0);

    // Amount Due to Merchant = (Delivered COD + Manual Credits) - Payouts
    const amountDueToMerchant = Math.max(0, Math.round((deliveredCodSum + manualCredits - payoutsSum) * 100) / 100);

    // Debits against merchant (Return costs + shipping charges + manual debits)
    const returnCostsCharged = transactions
      .filter(t => t.transaction_type === 'RETURN_COST')
      .reduce((sum, t) => sum + t.amount, 0);

    const shippingCharges = transactions
      .filter(t => t.transaction_type === 'SHIPPING_CHARGE')
      .reduce((sum, t) => sum + t.amount, 0);

    const manualDebits = transactions
      .filter(t => t.transaction_type === 'DEBIT_FROM_MERCHANT')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalDebits = returnCostsCharged + shippingCharges + manualDebits;

    // Debt payments collected from merchant
    const debtPaymentsCollected = settlements
      .filter(s => s.settlement_type === 'debt_collection')
      .reduce((sum, s) => sum + s.paid_amount, 0);

    // Merchant Debt to Company = Total Debits - Debt Payments
    const merchantDebtToCompany = Math.max(0, Math.round((totalDebits - debtPaymentsCollected) * 100) / 100);

    // Net Position = Amount Due - Debt
    const netPosition = Math.round((amountDueToMerchant - merchantDebtToCompany) * 100) / 100;

    const lastSettlementDate = settlements.length > 0 ? settlements[0].created_at : null;

    return {
      merchant_id: merchantId,
      merchant,
      amount_due_to_merchant: amountDueToMerchant,
      merchant_debt_to_company: merchantDebtToCompany,
      net_position: netPosition,
      net_balance: netPosition,
      total_cod_earned: deliveredCodSum + manualCredits,
      total_delivered_orders: deliveredOrders.length,
      total_returns_debited: totalDebits,
      total_settled_paid: payoutsSum,
      total_orders_count: orders.length,
      total_orders: orders.length,
      delivered_orders_count: deliveredOrders.length,
      returns_count: returnsList.length,
      settlements_count: settlements.length,
      transactions_count: transactions.length,
      last_settlement_date: lastSettlementDate,
    };
  },

  getAllMerchantsFinancialSummaries(companyId: string): MerchantFinancialSummary[] {
    if (!companyId) return [];
    const merchants = this.getMerchants(companyId);
    const summaries: MerchantFinancialSummary[] = [];

    for (const m of merchants) {
      const summary = this.getMerchantFinancialSummary(companyId, m.id);
      if (summary) {
        summaries.push(summary);
      }
    }

    return summaries.sort((a, b) => b.total_orders_count - a.total_orders_count);
  },

  // ----------------------------------------------------
  // DASHBOARD METRICS (Real Database Computations)
  // ----------------------------------------------------
  getAdminMetrics(companyId: string) {
    const merchants = this.getMerchants(companyId);
    const couriers = this.getCouriers(companyId);
    const orders = this.getOrders(companyId);
    const returnsMetrics = this.getReturnMetrics(companyId);
    const returnsList = this.getReturns(companyId);

    const activeCouriersCount = couriers.filter(c => c.status === 'active').length;
    const activeMerchantsCount = merchants.filter(m => m.status === 'active').length;
    const totalCodAmount = orders.reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);
    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    const deliveredCodAmount = deliveredOrders.reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);

    const completedOrFailed = orders.filter(o => o.status === 'delivered' || o.status === 'failed').length;
    const deliverySuccessRate = completedOrFailed > 0 
      ? Math.round((deliveredOrders.length / completedOrFailed) * 100) 
      : 100;

    // Courier Collections KPI
    const outstandingCollections = this.getOutstandingCollectionsTotal(companyId);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(o => o.delivery_date === todayStr || o.created_at.startsWith(todayStr));

    // Today's delivery breakdown
    const todayDelivered = todayOrders.filter(o => o.status === 'delivered').length;
    const todayFailed = todayOrders.filter(o => o.status === 'failed').length;
    const todayAssigned = todayOrders.filter(o => o.status === 'assigned').length;
    const todayOutForDelivery = todayOrders.filter(o => o.status === 'out_for_delivery').length;
    const todayConfirmed = todayOrders.filter(o => o.customer_response_status === 'confirmed').length;
    const todayRescheduled = todayOrders.filter(o => o.customer_response_status === 'reschedule_requested').length;
    const todayCancelled = todayOrders.filter(o => o.status === 'cancelled').length;
    const completedToday = todayDelivered + todayFailed;
    const successRateToday = completedToday > 0 ? Math.round((todayDelivered / completedToday) * 100) : 100;

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

    // Courier performance today
    const courierPerformance = couriers.map(courier => {
      const courierOrders = orders.filter(o => o.courier_id === courier.id);
      const courierTodayOrders = courierOrders.filter(o => o.delivery_date === todayStr || (!o.delivery_date && (o.status === 'assigned' || o.status === 'out_for_delivery')));
      const target = courierTodayOrders.length > 0 ? courierTodayOrders : courierOrders;
      const deliveredCount = target.filter(o => o.status === 'delivered').length;
      const failedCount = target.filter(o => o.status === 'failed').length;
      const totalDone = deliveredCount + failedCount;
      const successRate = totalDone > 0 ? Math.round((deliveredCount / totalDone) * 100) : 100;
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
    }).sort((a, b) => b.assignedCount - a.assignedCount);

    const courierPerformanceToday = courierPerformance;

    // Merchant performance
    const merchantPerformance = merchants.map(merchant => {
      const mOrders = orders.filter(o => o.merchant_id === merchant.id);
      const mReturns = returnsList.filter(r => r.merchant_id === merchant.id);
      const deliveredCount = mOrders.filter(o => o.status === 'delivered').length;
      const failedCount = mOrders.filter(o => o.status === 'failed').length;
      const totalDone = deliveredCount + failedCount;
      const successRate = totalDone > 0 ? Math.round((deliveredCount / totalDone) * 100) : 100;
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

    // Customer confirmation breakdown
    const customerConfirmedCount = orders.filter(o => o.customer_response_status === 'confirmed').length;
    const customerPendingCount = orders.filter(o => !o.customer_response_status || o.customer_response_status === 'pending').length;
    const customerRescheduledCount = orders.filter(o => o.customer_response_status === 'reschedule_requested').length;
    const customerCancelledCount = orders.filter(o => o.customer_response_status === 'cancelled').length;
    const totalWithResponse = customerConfirmedCount + customerRescheduledCount + customerCancelledCount;
    const confirmationRate = orders.length > 0 ? Math.round((customerConfirmedCount / orders.length) * 100) : 0;

    // Recent activity (latest 10 items)
    const recentActivity = this.getAllOrderEvents(companyId, { limit: 10 });

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
      // Outstanding Collections KPI (Prompt 4 Section 19)
      outstandingCourierCollections: outstandingCollections.totalOutstanding,
      couriersWithOutstandingCount: outstandingCollections.couriersWithDebtCount,
      // Customer Confirmation metrics
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
      // Returns metrics
      totalReturns: returnsMetrics.totalReturns,
      returnsTotal: returnsMetrics.totalReturns,
      returnsCreated: returnsMetrics.createdCount,
      returnsWithCourier: returnsMetrics.withCourierCount,
      returnsReturned: returnsMetrics.returnedCount,
      returnsCancelled: returnsMetrics.cancelledCount,
      returnsTotalValue: returnsMetrics.totalReturnValue,
      activeReturns: returnsMetrics.activeReturnsCount,
      returnsActive: returnsMetrics.activeReturnsCount,
      // Today & Performance tables
      todayOverview,
      courierPerformance,
      courierPerformanceToday,
      merchantPerformance,
      recentActivity,
    };
  },

  getCourierMetrics(companyId: string, courierId: string) {
    const todayStr = new Date().toISOString().split('T')[0];
    const orders = this.getOrders(companyId, courierId);
    const returnsMetrics = this.getReturnMetrics(companyId, courierId);
    const collectionSummary = this.getCourierCollectionSummary(companyId, courierId);
    
    // If orders have delivery_date matching today, or fallback to all active assigned orders if none strictly today
    const todayOrders = orders.filter(o => o.delivery_date === todayStr || (!o.delivery_date && (o.status === 'assigned' || o.status === 'out_for_delivery')));
    // Alternatively, calculate for all orders assigned to courier today + active orders
    const targetSet = todayOrders.length > 0 ? todayOrders : orders;

    const todayConfirmed = targetSet.filter(o => o.customer_response_status === 'confirmed').length;
    const todayWaiting = targetSet.filter(o => (!o.customer_response_status || o.customer_response_status === 'pending') && o.status !== 'delivered' && o.status !== 'failed' && o.status !== 'cancelled').length;
    const todayRescheduled = targetSet.filter(o => o.customer_response_status === 'reschedule_requested').length;
    const todayOutForDelivery = targetSet.filter(o => o.status === 'out_for_delivery').length;
    const todayDelivered = targetSet.filter(o => o.status === 'delivered').length;
    const todayFailed = targetSet.filter(o => o.status === 'failed').length;
    const todayCancelled = targetSet.filter(o => o.status === 'cancelled' || o.customer_response_status === 'cancelled').length;

    return {
      // Today's Deliveries (Section 3)
      todayTotal: targetSet.length,
      todayConfirmed,
      todayWaiting,
      todayRescheduled,
      todayOutForDelivery,
      todayDelivered,
      todayFailed,
      todayCancelled,

      // Performance stats (Section 20)
      todayAssigned: targetSet.length,
      todayCompleted: todayDelivered,
      
      // Overall Performance
      totalAssigned: orders.length,
      totalDelivered: orders.filter(o => o.status === 'delivered').length,
      totalFailed: orders.filter(o => o.status === 'failed').length,
      totalCancelled: orders.filter(o => o.status === 'cancelled').length,
      totalOutForDelivery: orders.filter(o => o.status === 'out_for_delivery').length,
      totalPendingAssigned: orders.filter(o => o.status === 'assigned').length,

      // Returns for Courier
      assignedReturnsCount: returnsMetrics.totalReturns,
      activeReturnsCount: returnsMetrics.activeReturnsCount,
      completedReturnsCount: returnsMetrics.returnedCount,

      // Financials & COD Collections (Prompt 4 Sections 1, 2, 3, 13)
      totalCodToCollect: orders
        .filter(o => o.status === 'assigned' || o.status === 'out_for_delivery')
        .reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0),
      totalCodDelivered: collectionSummary?.total_delivered_cod || 0,
      currentCollections: collectionSummary?.current_outstanding_balance || 0,
      totalSettledAmount: collectionSummary?.total_settled_amount || 0,
      deliveredCodOrdersCount: collectionSummary?.delivered_cod_orders_count || 0,
      lastSettlementDate: collectionSummary?.last_settlement_date || null,

      // Legacy compatibility keys
      assignedOrdersCount: orders.length,
      todayAssignedCount: targetSet.length,
      pendingDeliveriesCount: orders.filter(o => o.status === 'assigned' || o.status === 'out_for_delivery').length,
      todayDeliveredCount: todayDelivered,
      todayFailedCount: todayFailed,
      completedDeliveriesCount: orders.filter(o => o.status === 'delivered').length,
      failedDeliveriesCount: orders.filter(o => o.status === 'failed').length,
      confirmedOrdersCount: orders.filter(o => o.customer_response_status === 'confirmed').length,
      rescheduleRequestedCount: orders.filter(o => o.customer_response_status === 'reschedule_requested').length,
    };
  }
};
