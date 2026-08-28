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
  MerchantTransaction, 
  MerchantSettlement, 
  MerchantFinancialSummary,
  CourierCollectionSummary,
  OrderStatus,
  ReturnStatus,
  CustomerResponseStatus,
  DeliveryFailureReason,
  ReturnReason,
  MerchantTransactionType
} from '../types';

export const DEMO_COMPANY_ID = 'demo-company-cairo-express-01';
const DEMO_STORAGE_KEY = 'delixa_demo_database_v2';

interface DemoStore {
  companies: Company[];
  profiles: Profile[];
  couriers: Courier[];
  merchants: Merchant[];
  orders: Order[];
  orderEvents: OrderEvent[];
  returns: ReturnRecord[];
  notifications: AppNotification[];
  courierSettlements: CourierSettlement[];
  merchantTransactions: MerchantTransaction[];
  merchantSettlements: MerchantSettlement[];
}

function hashPassword(plain: string): string {
  let hash = 0;
  for (let i = 0; i < plain.length; i++) {
    const char = plain.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16)}`;
}

export function getInitialDemoData(): DemoStore {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const isoNow = now.toISOString();

  // 1. Company
  const demoCompany: Company = {
    id: DEMO_COMPANY_ID,
    name: 'شركة كايرو إكسبريس للشحن واللوجستيات',
    phone: '01012345678',
    email: 'admin@cairoexpress.eg',
    address: '15 شارع النصر، المعادي، القاهرة',
    logo_url: '',
    delivery_slots: [
      { id: 'slot-1', name: 'صباحي (10:00 ص - 02:00 م)', from_time: '10:00', to_time: '14:00', is_active: true },
      { id: 'slot-2', name: 'مسائي (02:00 م - 06:00 م)', from_time: '14:00', to_time: '18:00', is_active: true },
      { id: 'slot-3', name: 'ليلي (06:00 م - 10:00 م)', from_time: '18:00', to_time: '22:00', is_active: true },
    ],
    created_at: isoNow,
    updated_at: isoNow,
  };

  // 2. Profiles (Admin Profile)
  const adminProfile: Profile = {
    id: 'demo-profile-admin-01',
    auth_user_id: 'demo-auth-user-admin-01',
    company_id: DEMO_COMPANY_ID,
    full_name: 'أحمد محمود (المدير العام)',
    phone: '01012345678',
    role: 'admin',
    created_at: isoNow,
    updated_at: isoNow,
  };

  // 3. Couriers (3 Demo Couriers)
  const couriers: Courier[] = [
    {
      id: 'demo-courier-101',
      company_id: DEMO_COMPANY_ID,
      profile_id: 'demo-profile-courier-101',
      employee_id: 'CR-101',
      full_name: 'كريم عادل',
      phone: '01123456781',
      area: 'المعادي ودار السلام',
      status: 'active',
      password: hashPassword('123456'),
      created_at: isoNow,
      updated_at: isoNow,
    },
    {
      id: 'demo-courier-102',
      company_id: DEMO_COMPANY_ID,
      profile_id: 'demo-profile-courier-102',
      employee_id: 'CR-102',
      full_name: 'محمود حسن',
      phone: '01223456782',
      area: 'مدينة نصر والتجمع الخامس',
      status: 'active',
      password: hashPassword('123456'),
      created_at: isoNow,
      updated_at: isoNow,
    },
    {
      id: 'demo-courier-103',
      company_id: DEMO_COMPANY_ID,
      profile_id: 'demo-profile-courier-103',
      employee_id: 'CR-103',
      full_name: 'أحمد سامي',
      phone: '01023456783',
      area: 'الجيزة والدقي والمهندسين',
      status: 'active',
      password: hashPassword('123456'),
      created_at: isoNow,
      updated_at: isoNow,
    },
  ];

  // 4. Merchants
  const merchants: Merchant[] = [
    {
      id: 'demo-merchant-01',
      company_id: DEMO_COMPANY_ID,
      store_name: 'متجر الأناقة للملابس الجاهزة',
      owner_name: 'أحمد إبراهيم',
      brand_name: 'Elegance Store',
      phone: '01098765432',
      whatsapp: '01098765432',
      email: 'elegance@example.com',
      address: '22 شارع التسعين، التجمع الخامس',
      status: 'active',
      created_at: isoNow,
      updated_at: isoNow,
    },
    {
      id: 'demo-merchant-02',
      company_id: DEMO_COMPANY_ID,
      store_name: 'تيك زون للإلكترونيات والأجهزة',
      owner_name: 'سارة طارق',
      brand_name: 'TechZone EG',
      phone: '01198765431',
      whatsapp: '01198765431',
      email: 'techzone@example.com',
      address: 'مول العرب، 6 أكتوبر',
      status: 'active',
      created_at: isoNow,
      updated_at: isoNow,
    },
    {
      id: 'demo-merchant-03',
      company_id: DEMO_COMPANY_ID,
      store_name: 'بيت الجمال لمستحضرات التجميل',
      owner_name: 'نورهان فوزي',
      brand_name: 'Beauty House',
      phone: '01298765430',
      whatsapp: '01298765430',
      email: 'beauty@example.com',
      address: 'ميدان روكسي، مصر الجديدة',
      status: 'active',
      created_at: isoNow,
      updated_at: isoNow,
    },
  ];

  // 5. Orders (Diverse realistic statuses)
  const orders: Order[] = [
    {
      id: 'demo-order-101',
      company_id: DEMO_COMPANY_ID,
      merchant_id: 'demo-merchant-01',
      courier_id: 'demo-courier-101',
      order_number: 'DLX-801',
      customer_name: 'عمر خالد حسن',
      customer_phone: '01011122233',
      governorate: 'القاهرة',
      city_area: 'المعادي الجديدة',
      customer_address: 'عمارة 14، شارع النصر، الدور الثالث، شقة 6',
      customer_landmark: 'بجوار كارفور المعادي',
      cod_amount: 850,
      delivery_date: todayStr,
      delivery_from: '10:00',
      delivery_to: '14:00',
      status: 'out_for_delivery',
      confirmation_token: 'demo-tok-801',
      customer_response_status: 'confirmed',
      customer_responded_at: isoNow,
      whatsapp_sent_at: isoNow,
      notes: 'العميل متواجد طوال فترة الصباحية',
      created_at: isoNow,
      updated_at: isoNow,
    },
    {
      id: 'demo-order-102',
      company_id: DEMO_COMPANY_ID,
      merchant_id: 'demo-merchant-02',
      courier_id: 'demo-courier-101',
      order_number: 'DLX-802',
      customer_name: 'منى عبد الرحمن',
      customer_phone: '01122233344',
      governorate: 'القاهرة',
      city_area: 'المعادي - دجلة',
      customer_address: 'فيلا 8، شارع 250، دجلة المعادي',
      customer_landmark: 'أمام بنك CIB',
      cod_amount: 1450,
      delivery_date: todayStr,
      delivery_from: '14:00',
      delivery_to: '18:00',
      status: 'delivered',
      delivered_at: isoNow,
      delivered_by: 'كريم عادل',
      delivered_by_courier_id: 'demo-courier-101',
      confirmation_token: 'demo-tok-802',
      customer_response_status: 'confirmed',
      notes: 'تم الدفع كاش واستلام الفاتورة',
      created_at: isoNow,
      updated_at: isoNow,
    },
    {
      id: 'demo-order-103',
      company_id: DEMO_COMPANY_ID,
      merchant_id: 'demo-merchant-03',
      courier_id: 'demo-courier-101',
      order_number: 'DLX-803',
      customer_name: 'ياسمين ممدوح',
      customer_phone: '01233344455',
      governorate: 'القاهرة',
      city_area: 'دار السلام',
      customer_address: '10 شارع الفيوم، متفرع من شارع أحمد زكي',
      cod_amount: 420,
      delivery_date: todayStr,
      delivery_from: '10:00',
      delivery_to: '14:00',
      status: 'assigned',
      confirmation_token: 'demo-tok-803',
      customer_response_status: 'reschedule_requested',
      customer_reschedule_date: todayStr,
      customer_reschedule_note: 'يرجى التوصيل بعد الساعة 3 عصراً',
      created_at: isoNow,
      updated_at: isoNow,
    },
    {
      id: 'demo-order-104',
      company_id: DEMO_COMPANY_ID,
      merchant_id: 'demo-merchant-01',
      courier_id: 'demo-courier-102',
      order_number: 'DLX-804',
      customer_name: 'طارق صلاح الدين',
      customer_phone: '01044455566',
      governorate: 'القاهرة',
      city_area: 'مدينة نصر',
      customer_address: '45 شارع عباس العقاد، الدور الرابع',
      cod_amount: 1100,
      delivery_date: todayStr,
      delivery_from: '14:00',
      delivery_to: '18:00',
      status: 'delivered',
      delivered_at: isoNow,
      delivered_by: 'محمود حسن',
      delivered_by_courier_id: 'demo-courier-102',
      confirmation_token: 'demo-tok-804',
      customer_response_status: 'confirmed',
      created_at: isoNow,
      updated_at: isoNow,
    },
    {
      id: 'demo-order-105',
      company_id: DEMO_COMPANY_ID,
      merchant_id: 'demo-merchant-02',
      courier_id: 'demo-courier-103',
      order_number: 'DLX-805',
      customer_name: 'حازم السيد بدوي',
      customer_phone: '01155566677',
      governorate: 'الجيزة',
      city_area: 'الدقي',
      customer_address: '12 شارع مصدق، بجوار محطة المترو',
      cod_amount: 680,
      delivery_date: todayStr,
      delivery_from: '10:00',
      delivery_to: '14:00',
      status: 'pending',
      confirmation_token: 'demo-tok-805',
      customer_response_status: 'pending',
      created_at: isoNow,
      updated_at: isoNow,
    },
  ];

  // 6. Returns
  const returns: ReturnRecord[] = [
    {
      id: 'demo-return-01',
      company_id: DEMO_COMPANY_ID,
      order_id: 'demo-order-103',
      merchant_id: 'demo-merchant-03',
      courier_id: 'demo-courier-101',
      return_number: 'RET-101',
      customer_name: 'ياسمين ممدوح',
      customer_phone: '01233344455',
      return_address: '10 شارع الفيوم، دار السلام',
      return_amount: 420,
      return_shipping_cost: 30,
      other_cost: 0,
      total_return_amount: 420,
      return_cost_payer: 'customer',
      return_reason: 'customer_refused',
      notes: 'العميل رفض الاستلام لعدم مطابقة المقاس',
      status: 'created',
      created_by: 'أحمد محمود',
      created_at: isoNow,
      updated_at: isoNow,
    },
  ];

  // 7. Order Events
  const orderEvents: OrderEvent[] = [
    {
      id: 'demo-event-01',
      order_id: 'demo-order-101',
      company_id: DEMO_COMPANY_ID,
      event_type: 'out_for_delivery',
      timestamp: isoNow,
      created_at: isoNow,
      actor: 'courier',
      actor_name: 'كريم عادل',
      details: 'المندوب بدأ خط سير التوصيل للشحنة DLX-801',
    },
    {
      id: 'demo-event-02',
      order_id: 'demo-order-102',
      company_id: DEMO_COMPANY_ID,
      event_type: 'delivered',
      timestamp: isoNow,
      created_at: isoNow,
      actor: 'courier',
      actor_name: 'كريم عادل',
      details: 'تم تسليم الشحنة بنجاح وتحصيل مبلغ 1450 ج.م كاش',
    },
  ];

  // 8. Notifications
  const notifications: AppNotification[] = [
    {
      id: 'demo-notif-01',
      company_id: DEMO_COMPANY_ID,
      recipient_role: 'admin',
      type: 'customer_confirmed',
      title: 'تأكيد موعد الشحنة',
      message: 'قام العميل عمر خالد بتأكيد استلام الشحنة DLX-801 في الفترة الصباحية',
      order_id: 'demo-order-101',
      order_number: 'DLX-801',
      read: false,
      created_at: isoNow,
    },
  ];

  // 9. Courier Settlements
  const courierSettlements: CourierSettlement[] = [];

  // 10. Merchant Transactions
  const merchantTransactions: MerchantTransaction[] = [
    {
      id: 'demo-tx-01',
      company_id: DEMO_COMPANY_ID,
      merchant_id: 'demo-merchant-01',
      transaction_type: 'CREDIT_TO_MERCHANT',
      direction: 'credit',
      amount: 1100,
      category: 'order_delivered',
      reference_type: 'order',
      order_id: 'demo-order-104',
      order_number: 'DLX-804',
      description: 'تحصيل قيمة الشحنة المسلمة DLX-804 لصالح التاجر',
      created_by: 'النظام التجريبي',
      created_at: isoNow,
    },
  ];

  // 11. Merchant Settlements
  const merchantSettlements: MerchantSettlement[] = [];

  return {
    companies: [demoCompany],
    profiles: [adminProfile],
    couriers,
    merchants,
    orders,
    orderEvents,
    returns,
    notifications,
    courierSettlements,
    merchantTransactions,
    merchantSettlements,
  };
}

class DemoDatabase {
  private memoryStore: DemoStore | null = null;

  private getStore(): DemoStore {
    if (typeof localStorage === 'undefined') {
      if (!this.memoryStore) {
        this.memoryStore = getInitialDemoData();
      }
      return this.memoryStore;
    }
    try {
      const raw = localStorage.getItem(DEMO_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Error reading demo database from localStorage, resetting', e);
    }
    const initial = getInitialDemoData();
    this.saveStore(initial);
    return initial;
  }

  private saveStore(store: DemoStore): void {
    if (typeof localStorage === 'undefined') {
      this.memoryStore = store;
      return;
    }
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
      console.error('Error saving demo database to localStorage', e);
    }
  }

  resetDemoDatabase(): void {
    const initial = getInitialDemoData();
    this.saveStore(initial);
  }

  // Companies
  async getCompanies(): Promise<Company[]> {
    return this.getStore().companies;
  }

  async getCompanyById(id: string): Promise<Company | null> {
    return this.getStore().companies.find(c => c.id === id) || null;
  }

  async createCompany(data: { name: string; phone: string; email: string; address: string; logo_url?: string }): Promise<Company> {
    const store = this.getStore();
    const newCompany: Company = {
      id: `demo-comp-${Date.now()}`,
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      logo_url: data.logo_url || '',
      delivery_slots: [
        { id: 'slot-1', name: 'صباحي (10:00 ص - 02:00 م)', from_time: '10:00', to_time: '14:00', is_active: true },
        { id: 'slot-2', name: 'مسائي (02:00 م - 06:00 م)', from_time: '14:00', to_time: '18:00', is_active: true },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.companies.push(newCompany);
    this.saveStore(store);
    return newCompany;
  }

  async updateCompany(id: string, updates: Partial<Company>): Promise<Company | null> {
    const store = this.getStore();
    const idx = store.companies.findIndex(c => c.id === id);
    if (idx === -1) return null;
    store.companies[idx] = {
      ...store.companies[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.saveStore(store);
    return store.companies[idx];
  }

  async updateCompanyProfile(companyId: string, data: Partial<Company>): Promise<Company> {
    const updated = await this.updateCompany(companyId, data);
    if (!updated) throw new Error('Company not found');
    return updated;
  }

  // Profiles
  async getProfiles(companyId?: string): Promise<Profile[]> {
    const store = this.getStore();
    if (!companyId) return store.profiles;
    return store.profiles.filter(p => p.company_id === companyId);
  }

  async getProfileById(id: string): Promise<Profile | null> {
    return this.getStore().profiles.find(p => p.id === id) || null;
  }

  async getProfileByAuthUserId(authUserId: string): Promise<Profile | null> {
    return this.getStore().profiles.find(p => p.auth_user_id === authUserId || p.id === authUserId) || null;
  }

  async createProfile(data: { auth_user_id?: string; company_id: string; full_name: string; phone: string; role: 'admin' | 'courier' }): Promise<Profile> {
    const store = this.getStore();
    const newProfile: Profile = {
      id: `demo-profile-${Date.now()}`,
      auth_user_id: data.auth_user_id || `demo-auth-${Date.now()}`,
      company_id: data.company_id,
      full_name: data.full_name,
      phone: data.phone,
      role: data.role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.profiles.push(newProfile);
    this.saveStore(store);
    return newProfile;
  }

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile | null> {
    const store = this.getStore();
    const idx = store.profiles.findIndex(p => p.id === id || p.auth_user_id === id);
    if (idx === -1) return null;
    store.profiles[idx] = {
      ...store.profiles[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.saveStore(store);
    return store.profiles[idx];
  }

  async updateAdminProfile(companyId: string, profileId: string, data: Partial<Profile>): Promise<Profile> {
    const updated = await this.updateProfile(profileId, data);
    if (!updated) throw new Error('Profile not found');
    return updated;
  }

  // Couriers
  async getCouriers(companyId: string): Promise<Courier[]> {
    return this.getStore().couriers.filter(c => c.company_id === companyId);
  }

  async getCourierById(companyId: string, id: string): Promise<Courier | null> {
    return this.getStore().couriers.find(c => c.company_id === companyId && (c.id === id || c.employee_id === id)) || null;
  }

  async getCourierByEmployeeId(employeeId: string): Promise<Courier | null> {
    const cleanId = employeeId.trim().toUpperCase();
    return this.getStore().couriers.find(c => c.employee_id.toUpperCase() === cleanId) || null;
  }

  verifyCourierPassword(courier: Courier, enteredPassword?: string): boolean {
    if (!enteredPassword) return true;
    if (courier.password && courier.password.startsWith('h_')) {
      return courier.password === hashPassword(enteredPassword);
    }
    return courier.password === enteredPassword || enteredPassword === '123456';
  }

  async createCourier(companyId: string, data: { employee_id: string; full_name: string; phone: string; area: string; status?: 'active' | 'inactive'; password?: string }): Promise<Courier> {
    const store = this.getStore();
    const newCourier: Courier = {
      id: `demo-courier-${Date.now()}`,
      company_id: companyId,
      profile_id: `demo-profile-courier-${Date.now()}`,
      employee_id: data.employee_id.toUpperCase(),
      full_name: data.full_name,
      phone: data.phone,
      area: data.area,
      status: data.status || 'active',
      password: hashPassword(data.password || '123456'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.couriers.push(newCourier);
    this.saveStore(store);
    return newCourier;
  }

  async updateCourier(companyId: string, id: string, data: Partial<Courier> & { password?: string }): Promise<Courier | null> {
    const store = this.getStore();
    const idx = store.couriers.findIndex(c => c.company_id === companyId && c.id === id);
    if (idx === -1) return null;
    const current = store.couriers[idx];
    const password = data.password ? hashPassword(data.password) : current.password;
    store.couriers[idx] = {
      ...current,
      ...data,
      password,
      updated_at: new Date().toISOString(),
    };
    this.saveStore(store);
    return store.couriers[idx];
  }

  async deleteCourier(companyId: string, id: string): Promise<boolean> {
    const store = this.getStore();
    store.couriers = store.couriers.filter(c => !(c.company_id === companyId && c.id === id));
    this.saveStore(store);
    return true;
  }

  async updateCourierSelfProfile(companyId: string, courierId: string, data: { full_name?: string; phone?: string; vehicle_type?: string; vehicle_plate?: string }): Promise<Courier> {
    const updated = await this.updateCourier(companyId, courierId, data);
    if (!updated) throw new Error('Courier not found');
    return updated;
  }

  // Merchants
  async getMerchants(companyId: string): Promise<Merchant[]> {
    return this.getStore().merchants.filter(m => m.company_id === companyId);
  }

  async getMerchantById(companyId: string, id: string): Promise<Merchant | null> {
    return this.getStore().merchants.find(m => m.company_id === companyId && m.id === id) || null;
  }

  async createMerchant(companyId: string, data: { store_name: string; owner_name: string; brand_name?: string; phone: string; whatsapp?: string; email?: string; address: string; logo_url?: string; notes?: string; status?: 'active' | 'inactive' }): Promise<Merchant> {
    const store = this.getStore();
    const newMerchant: Merchant = {
      id: `demo-merchant-${Date.now()}`,
      company_id: companyId,
      store_name: data.store_name,
      owner_name: data.owner_name,
      brand_name: data.brand_name,
      phone: data.phone,
      whatsapp: data.whatsapp,
      email: data.email,
      address: data.address,
      logo_url: data.logo_url,
      notes: data.notes,
      status: data.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.merchants.push(newMerchant);
    this.saveStore(store);
    return newMerchant;
  }

  async updateMerchant(companyId: string, id: string, updates: Partial<Merchant>): Promise<Merchant | null> {
    const store = this.getStore();
    const idx = store.merchants.findIndex(m => m.company_id === companyId && m.id === id);
    if (idx === -1) return null;
    store.merchants[idx] = {
      ...store.merchants[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.saveStore(store);
    return store.merchants[idx];
  }

  async deleteMerchant(companyId: string, id: string): Promise<boolean> {
    const store = this.getStore();
    store.merchants = store.merchants.filter(m => !(m.company_id === companyId && m.id === id));
    this.saveStore(store);
    return true;
  }

  // Orders
  async getNextOrderNumber(companyId: string): Promise<string> {
    const orders = await this.getOrders(companyId);
    return `DLX-${orders.length + 806}`;
  }

  async getOrders(companyId: string, courierId?: string | null, merchantId?: string | null): Promise<Order[]> {
    let orders = this.getStore().orders.filter(o => o.company_id === companyId);
    if (courierId) orders = orders.filter(o => o.courier_id === courierId);
    if (merchantId) orders = orders.filter(o => o.merchant_id === merchantId);
    return orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getOrderById(companyId: string, id: string): Promise<Order | null> {
    return this.getStore().orders.find(o => o.company_id === companyId && o.id === id) || null;
  }

  async getOrderByToken(token: string): Promise<{ order: Order; company: Company; merchant?: Merchant; courier?: Courier } | null> {
    const store = this.getStore();
    const order = store.orders.find(o => o.confirmation_token === token || o.id === token);
    if (!order) return null;
    const company = store.companies.find(c => c.id === order.company_id) || store.companies[0];
    const merchant = store.merchants.find(m => m.id === order.merchant_id);
    const courier = order.courier_id ? store.couriers.find(c => c.id === order.courier_id) : undefined;
    return { order, company, merchant, courier };
  }

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
    delivery_date: string;
    delivery_from?: string;
    delivery_to?: string;
    notes?: string;
    status?: OrderStatus;
  }): Promise<Order> {
    const store = this.getStore();
    const orderNumber = data.order_number || (await this.getNextOrderNumber(companyId));
    const token = `demo-tok-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newOrder: Order = {
      id: `demo-order-${Date.now()}`,
      company_id: companyId,
      merchant_id: data.merchant_id,
      courier_id: data.courier_id || null,
      order_number: orderNumber,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      governorate: data.governorate || 'القاهرة (Cairo)',
      city_area: data.city_area || '',
      customer_address: data.customer_address,
      customer_landmark: data.customer_landmark,
      cod_amount: Number(data.cod_amount) || 0,
      shipping_fee: Number((data as any).shipping_fee) || 0,
      delivery_date: data.delivery_date || new Date().toISOString().split('T')[0],
      delivery_from: data.delivery_from || '10:00',
      delivery_to: data.delivery_to || '14:00',
      notes: data.notes,
      status: data.status || (data.courier_id ? 'assigned' : 'pending'),
      confirmation_token: token,
      customer_response_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.orders.unshift(newOrder);

    // Event
    store.orderEvents.unshift({
      id: `demo-event-${Date.now()}`,
      order_id: newOrder.id,
      company_id: companyId,
      event_type: 'created',
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      actor: 'admin',
      actor_name: 'النظام التجريبي',
      details: `تم إنشاء الشحنة رقم #${newOrder.order_number}`,
    });

    this.saveStore(store);
    return newOrder;
  }

  async updateOrder(companyId: string, id: string, updates: Partial<Order>): Promise<Order | null> {
    const store = this.getStore();
    const idx = store.orders.findIndex(o => o.company_id === companyId && o.id === id);
    if (idx === -1) return null;
    store.orders[idx] = {
      ...store.orders[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.saveStore(store);
    return store.orders[idx];
  }

  async updateOrderStatus(
    companyId: string, 
    orderId: string, 
    status: OrderStatus, 
    details?: {
      failureReason?: DeliveryFailureReason;
      rescheduledDate?: string;
      rescheduledTimeSlot?: string;
      notes?: string;
      actor?: 'admin' | 'courier' | 'customer';
      actorName?: string;
      courierId?: string;
    }
  ): Promise<Order | null> {
    const store = this.getStore();
    const idx = store.orders.findIndex(o => o.company_id === companyId && o.id === orderId);
    if (idx === -1) return null;

    const current = store.orders[idx];
    const updates: Partial<Order> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'delivered') {
      updates.delivered_at = new Date().toISOString();
      updates.delivered_by = details?.actorName || 'مندوب التوصيل';
      updates.delivered_by_courier_id = details?.courierId;
    } else if (status === 'failed') {
      updates.failed_at = new Date().toISOString();
      updates.failed_by = details?.actorName || 'مندوب التوصيل';
      updates.failure_reason = details?.failureReason;
      updates.failure_note = details?.notes;
      updates.failure_notes = details?.notes;
    }

    if (details?.courierId !== undefined) {
      updates.courier_id = details.courierId || undefined;
      updates.assigned_at = new Date().toISOString();
    }

    store.orders[idx] = {
      ...current,
      ...updates,
    };

    // Add event
    const mappedEventType: any = status === 'pending' ? 'status_changed' : status;
    store.orderEvents.unshift({
      id: `demo-event-${Date.now()}`,
      order_id: orderId,
      company_id: companyId,
      event_type: mappedEventType,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      actor: details?.actor || 'admin',
      actor_name: details?.actorName || 'النظام التجريبي',
      details: details?.notes || `تم تحديث حالة الشحنة إلى ${status}`,
    });

    this.saveStore(store);
    return store.orders[idx];
  }

  async deleteOrder(companyId: string, id: string): Promise<boolean> {
    const store = this.getStore();
    store.orders = store.orders.filter(o => !(o.company_id === companyId && o.id === id));
    this.saveStore(store);
    return true;
  }

  // Customer tracking actions
  async recordCustomerLinkOpened(token: string): Promise<void> {
    const result = await this.getOrderByToken(token);
    if (!result) return;
    const { order } = result;
    if (!order.confirmation_sent_at) {
      await this.updateOrder(order.company_id, order.id, {
        confirmation_sent_at: new Date().toISOString(),
      });
    }
  }

  async customerConfirmDelivery(token: string, note?: string): Promise<{ success: boolean; order?: Order; error?: string }> {
    const result = await this.getOrderByToken(token);
    if (!result) return { success: false, error: 'الشحنة غير موجودة' };
    const { order } = result;
    const updated = await this.updateOrder(order.company_id, order.id, {
      customer_response_status: 'confirmed',
      customer_responded_at: new Date().toISOString(),
      customer_note: note,
    });
    return { success: true, order: updated || undefined };
  }

  async customerRescheduleDelivery(token: string, newDate: string, newFrom: string, newTo: string, note?: string): Promise<{ success: boolean; order?: Order; error?: string }> {
    const result = await this.getOrderByToken(token);
    if (!result) return { success: false, error: 'الشحنة غير موجودة' };
    const { order } = result;
    const updated = await this.updateOrder(order.company_id, order.id, {
      customer_response_status: 'reschedule_requested',
      customer_responded_at: new Date().toISOString(),
      customer_reschedule_date: newDate,
      customer_reschedule_window: `${newFrom} - ${newTo}`,
      customer_reschedule_note: note,
      delivery_date: newDate,
      delivery_from: newFrom,
      delivery_to: newTo,
    });
    return { success: true, order: updated || undefined };
  }

  async customerCancelDelivery(token: string): Promise<{ success: boolean; order?: Order; error?: string }> {
    const result = await this.getOrderByToken(token);
    if (!result) return { success: false, error: 'الشحنة غير موجودة' };
    const { order } = result;
    const updated = await this.updateOrder(order.company_id, order.id, {
      customer_response_status: 'cancelled',
      customer_responded_at: new Date().toISOString(),
      status: 'cancelled',
    });
    return { success: true, order: updated || undefined };
  }

  async recordWhatsAppSent(companyId: string, orderId: string, actor: 'admin' | 'courier', actorName?: string): Promise<void> {
    await this.updateOrder(companyId, orderId, {
      whatsapp_sent_at: new Date().toISOString(),
      confirmation_sent_at: new Date().toISOString(),
    });
  }

  // Events
  async getOrderEvents(companyIdOrOrderId: string, maybeOrderId?: string): Promise<OrderEvent[]> {
    const targetOrderId = maybeOrderId || companyIdOrOrderId;
    return this.getStore().orderEvents.filter(e => e.order_id === targetOrderId).sort((a, b) => new Date(b.timestamp || b.created_at || '').getTime() - new Date(a.timestamp || a.created_at || '').getTime());
  }

  async getAllOrderEvents(companyId: string, options?: { limit?: number; actor?: string; eventType?: string; startDate?: string; endDate?: string; search?: string }): Promise<OrderEvent[]> {
    let events = this.getStore().orderEvents.filter(e => e.company_id === companyId);
    if (options?.actor) events = events.filter(e => e.actor === options.actor);
    if (options?.eventType) events = events.filter(e => e.event_type === options.eventType);
    if (options?.search) {
      const q = options.search.toLowerCase();
      events = events.filter(e => e.details?.toLowerCase().includes(q) || e.actor_name?.toLowerCase().includes(q));
    }
    return events.sort((a, b) => new Date(b.timestamp || b.created_at || '').getTime() - new Date(a.timestamp || a.created_at || '').getTime()).slice(0, options?.limit || 100);
  }

  async getOrderActivityLogs(companyId: string, filters?: { limit?: number; search?: string; actor?: string; eventType?: string; dateFrom?: string; dateTo?: string }): Promise<OrderEvent[]> {
    return this.getAllOrderEvents(companyId, filters);
  }

  async addOrderEvent(companyId: string, data: { order_id: string; return_id?: string; event_type: any; actor: any; actor_name?: string; details: string }): Promise<OrderEvent> {
    const store = this.getStore();
    const nowIso = new Date().toISOString();
    const newEvent: OrderEvent = {
      id: `demo-event-${Date.now()}`,
      order_id: data.order_id,
      return_id: data.return_id,
      company_id: companyId,
      event_type: data.event_type,
      timestamp: nowIso,
      created_at: nowIso,
      actor: data.actor,
      actor_name: data.actor_name || 'النظام التجريبي',
      details: data.details,
    };
    store.orderEvents.unshift(newEvent);
    this.saveStore(store);
    return newEvent;
  }

  // Returns
  async getNextReturnNumber(companyId: string): Promise<string> {
    const returns = await this.getReturns(companyId);
    return `RET-${returns.length + 101}`;
  }

  async getReturns(companyId: string, courierIdFilter?: string | null, merchantIdFilter?: string | null): Promise<ReturnRecord[]> {
    let returns = this.getStore().returns.filter(r => r.company_id === companyId);
    if (courierIdFilter) returns = returns.filter(r => r.courier_id === courierIdFilter);
    if (merchantIdFilter) returns = returns.filter(r => r.merchant_id === merchantIdFilter);
    return returns.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getReturnById(companyId: string, id: string): Promise<ReturnRecord | null> {
    return this.getStore().returns.find(r => r.company_id === companyId && r.id === id) || null;
  }

  async getReturnByOrderId(companyId: string, orderId: string): Promise<ReturnRecord | null> {
    return this.getStore().returns.find(r => r.company_id === companyId && r.order_id === orderId) || null;
  }

  async createReturn(companyId: string, data: {
    order_id: string;
    order_number: string;
    merchant_id: string;
    courier_id?: string;
    customer_name: string;
    customer_phone: string;
    return_address: string;
    return_reason: ReturnReason;
    other_reason?: string;
    return_shipping_cost?: number;
    return_amount?: number;
    total_return_amount?: number;
    notes?: string;
    status?: ReturnStatus;
    created_by?: string;
  }): Promise<ReturnRecord> {
    const store = this.getStore();
    const retNumber = await this.getNextReturnNumber(companyId);
    const returnAmount = Number(data.return_amount) || 0;
    const shippingCost = Number(data.return_shipping_cost) || 30;

    const newReturn: ReturnRecord = {
      id: `demo-return-${Date.now()}`,
      company_id: companyId,
      order_id: data.order_id,
      merchant_id: data.merchant_id,
      courier_id: data.courier_id || null,
      return_number: retNumber,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      return_address: data.return_address,
      return_amount: returnAmount,
      return_shipping_cost: shippingCost,
      other_cost: 0,
      total_return_amount: data.total_return_amount ?? (returnAmount + shippingCost),
      return_reason: data.return_reason,
      other_reason: data.other_reason,
      notes: data.notes,
      status: data.status || (data.courier_id ? 'with_courier' : 'created'),
      created_by: data.created_by || 'المدير التجريبي',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.returns.unshift(newReturn);
    this.saveStore(store);
    return newReturn;
  }

  async updateReturn(companyId: string, returnId: string, updates: Partial<ReturnRecord>, actorContext?: { role: string; name: string }): Promise<ReturnRecord | null> {
    const store = this.getStore();
    const idx = store.returns.findIndex(r => r.company_id === companyId && r.id === returnId);
    if (idx === -1) return null;
    store.returns[idx] = {
      ...store.returns[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.saveStore(store);
    return store.returns[idx];
  }

  async updateReturnStatus(companyId: string, returnId: string, targetStatus: ReturnStatus, actorContext?: { role: string; name: string }): Promise<ReturnRecord | null> {
    return this.updateReturn(companyId, returnId, { status: targetStatus }, actorContext);
  }

  async getReturnMetrics(companyId: string, courierId?: string | null, merchantId?: string | null) {
    const list = await this.getReturns(companyId, courierId, merchantId);
    return {
      totalReturns: list.length,
      createdCount: list.filter(r => r.status === 'created').length,
      withCourierCount: list.filter(r => r.status === 'with_courier').length,
      returnedCount: list.filter(r => r.status === 'returned').length,
      cancelledCount: list.filter(r => r.status === 'cancelled').length,
      totalReturnValue: list.reduce((sum, r) => sum + (Number(r.total_return_amount) || 0), 0),
      total: list.length,
      pendingPickup: list.filter(r => r.status === 'created').length,
      inTransit: list.filter(r => r.status === 'with_courier').length,
      inWarehouse: list.filter(r => r.status === 'created').length,
      returnedToMerchant: list.filter(r => r.status === 'returned').length,
      cancelled: list.filter(r => r.status === 'cancelled').length,
    };
  }

  // Notifications
  async getNotifications(companyId: string, filter?: { role?: 'admin' | 'courier'; courierId?: string; unreadOnly?: boolean }): Promise<AppNotification[]> {
    let notifs = this.getStore().notifications.filter(n => n.company_id === companyId);
    if (filter?.role) {
      notifs = notifs.filter(n => n.recipient_role === filter.role || n.recipient_role === 'all' || !n.recipient_role);
    }
    if (filter?.courierId) {
      notifs = notifs.filter(n => n.recipient_courier_id === filter.courierId || !n.recipient_courier_id);
    }
    if (filter?.unreadOnly) {
      notifs = notifs.filter(n => !n.read);
    }
    return notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async addNotification(companyId: string, data: Omit<AppNotification, 'id' | 'created_at' | 'read' | 'company_id'>): Promise<AppNotification> {
    const store = this.getStore();
    const newNotif: AppNotification = {
      id: `demo-notif-${Date.now()}`,
      company_id: companyId,
      recipient_role: data.recipient_role || 'admin',
      recipient_courier_id: data.recipient_courier_id,
      recipient_user_id: data.recipient_user_id,
      type: data.type,
      title: data.title,
      message: data.message,
      order_id: data.order_id,
      order_number: data.order_number,
      return_id: data.return_id,
      return_number: data.return_number,
      read: false,
      created_at: new Date().toISOString(),
    };
    store.notifications.unshift(newNotif);
    this.saveStore(store);
    return newNotif;
  }

  async markNotificationAsRead(companyId: string, notifId: string): Promise<boolean> {
    const store = this.getStore();
    const notif = store.notifications.find(n => n.company_id === companyId && n.id === notifId);
    if (notif) {
      notif.read = true;
      this.saveStore(store);
      return true;
    }
    return false;
  }

  async markAllNotificationsAsRead(companyId: string, role?: string, courierId?: string): Promise<boolean> {
    const store = this.getStore();
    store.notifications.forEach(n => {
      if (n.company_id === companyId) {
        if (!role || n.recipient_role === role || n.recipient_role === 'all') {
          if (!courierId || n.recipient_courier_id === courierId) {
            n.read = true;
          }
        }
      }
    });
    this.saveStore(store);
    return true;
  }

  // Delivery Slots
  async getDeliverySlots(companyId: string) {
    const company = await this.getCompanyById(companyId);
    return company?.delivery_slots || [
      { id: 'slot-1', name: 'صباحي (10:00 ص - 02:00 م)', from_time: '10:00', to_time: '14:00', is_active: true },
      { id: 'slot-2', name: 'مسائي (02:00 م - 06:00 م)', from_time: '14:00', to_time: '18:00', is_active: true },
      { id: 'slot-3', name: 'ليلي (06:00 م - 10:00 م)', from_time: '18:00', to_time: '22:00', is_active: true },
    ];
  }

  async saveDeliverySlots(companyId: string, slots: any[]) {
    return this.updateCompany(companyId, { delivery_slots: slots });
  }

  async updateDeliverySlots(companyId: string, slots: any[]) {
    return this.saveDeliverySlots(companyId, slots);
  }

  async addDeliverySlot(companyId: string, slotData: any) {
    const slots = await this.getDeliverySlots(companyId);
    const newSlot = {
      id: `slot-${Date.now()}`,
      ...slotData,
      is_active: slotData.is_active !== undefined ? slotData.is_active : true,
    };
    slots.push(newSlot);
    await this.saveDeliverySlots(companyId, slots);
    return newSlot;
  }

  async updateDeliverySlot(companyId: string, slotId: string, updates: any) {
    const slots = await this.getDeliverySlots(companyId);
    const idx = slots.findIndex(s => s.id === slotId);
    if (idx !== -1) {
      slots[idx] = { ...slots[idx], ...updates };
      await this.saveDeliverySlots(companyId, slots);
      return slots[idx];
    }
    return null;
  }

  async toggleDeliverySlot(companyId: string, slotId: string) {
    const slots = await this.getDeliverySlots(companyId);
    const idx = slots.findIndex(s => s.id === slotId);
    if (idx !== -1) {
      slots[idx].is_active = !slots[idx].is_active;
      await this.saveDeliverySlots(companyId, slots);
      return slots[idx];
    }
    return null;
  }

  async deleteDeliverySlot(companyId: string, slotId: string) {
    const slots = await this.getDeliverySlots(companyId);
    const filtered = slots.filter(s => s.id !== slotId);
    await this.saveDeliverySlots(companyId, filtered);
    return true;
  }

  // Shipping Pricing
  async getCompanyShippingPricing(companyId: string) {
    const company = await this.getCompanyById(companyId);
    return company?.shipping_pricing || {
      pricing_model: 'unified',
      default_shipping_fee: 50,
      governorate_rates: {
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
      }
    };
  }

  async saveCompanyShippingPricing(companyId: string, pricing: any) {
    const store = this.getStore();
    const cIdx = store.companies.findIndex(c => c.id === companyId);
    if (cIdx !== -1) {
      store.companies[cIdx].shipping_pricing = pricing;
      this.saveStore(store);
    }
    return true;
  }

  // Settlements & Collections
  async getSettlements(companyId: string, courierId?: string): Promise<CourierSettlement[]> {
    let list = this.getStore().courierSettlements.filter(s => s.company_id === companyId);
    if (courierId) list = list.filter(s => s.courier_id === courierId);
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getSettlementById(companyId: string, id: string): Promise<CourierSettlement | null> {
    return this.getStore().courierSettlements.find(s => s.company_id === companyId && s.id === id) || null;
  }

  async getNextSettlementNumber(companyId: string): Promise<string> {
    const rand = Math.floor(100 + Math.random() * 900);
    const timestamp = Date.now().toString().slice(-6);
    return `SET-CR-${timestamp}-${rand}`;
  }

  async getAllCouriersCollections(companyId: string): Promise<CourierCollectionSummary[]> {
    return this.getAllCouriersCollectionSummaries(companyId);
  }

  async createSettlement(companyId: string, data: { courier_id: string; received_amount: number; settled_by: string; notes?: string }): Promise<CourierSettlement> {
    const summary = await this.getCourierCollectionSummary(companyId, data.courier_id);
    const expected = summary?.current_outstanding_balance || data.received_amount;
    return this.createCourierSettlement(companyId, {
      courier_id: data.courier_id,
      expected_amount: expected,
      received_amount: data.received_amount,
      settled_by: data.settled_by,
      notes: data.notes,
    });
  }

  async getCourierCollectionSummary(companyId: string, courierId: string): Promise<CourierCollectionSummary | null> {
    const courier = await this.getCourierById(companyId, courierId);
    if (!courier) return null;

    const orders = await this.getOrders(companyId, courierId);
    const deliveredCodOrders = orders.filter(o => o.status === 'delivered');
    const totalDeliveredCod = deliveredCodOrders.reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);

    const settlements = await this.getSettlements(companyId, courierId);
    const totalSettledAmount = settlements.reduce((sum, s) => sum + (Number(s.received_amount) || 0), 0);
    const currentOutstandingBalance = Math.max(0, totalDeliveredCod - totalSettledAmount);

    return {
      courier_id: courierId,
      courier,
      total_delivered_cod: totalDeliveredCod,
      total_settled_amount: totalSettledAmount,
      current_outstanding_balance: currentOutstandingBalance,
      delivered_cod_orders_count: deliveredCodOrders.length,
      delivered_cod_orders: deliveredCodOrders,
      settlements_count: settlements.length,
      last_settlement_date: settlements.length > 0 ? settlements[0].created_at : null,
    };
  }

  async getAllCouriersCollectionSummaries(companyId: string): Promise<CourierCollectionSummary[]> {
    const couriers = await this.getCouriers(companyId);
    const summaries: CourierCollectionSummary[] = [];
    for (const c of couriers) {
      const summary = await this.getCourierCollectionSummary(companyId, c.id);
      if (summary) summaries.push(summary);
    }
    return summaries;
  }

  async getOutstandingCollectionsTotal(companyId: string) {
    const summaries = await this.getAllCouriersCollectionSummaries(companyId);
    const totalOutstanding = summaries.reduce((sum, s) => sum + s.current_outstanding_balance, 0);
    const couriersWithDebtCount = summaries.filter(s => s.current_outstanding_balance > 0).length;
    return {
      totalOutstanding,
      couriersWithDebtCount,
      totalDeliveredCod: summaries.reduce((sum, s) => sum + s.total_delivered_cod, 0),
      totalSettled: summaries.reduce((sum, s) => sum + s.total_settled_amount, 0),
    };
  }

  async getTotalOutstandingCollections(companyId: string) {
    return this.getOutstandingCollectionsTotal(companyId);
  }

  async createCourierSettlement(companyId: string, data: {
    courier_id: string;
    expected_amount: number;
    received_amount: number;
    settled_by: string;
    settled_by_profile_id?: string;
    notes?: string;
  }): Promise<CourierSettlement> {
    const store = this.getStore();
    const settlementNumber = `SET-${Date.now().toString().slice(-6)}`;
    const remaining = Math.max(0, data.expected_amount - data.received_amount);

    const newSettlement: CourierSettlement = {
      id: `demo-set-${Date.now()}`,
      company_id: companyId,
      courier_id: data.courier_id,
      settlement_number: settlementNumber,
      expected_amount: data.expected_amount,
      received_amount: data.received_amount,
      remaining_amount: remaining,
      settled_by: data.settled_by,
      settled_by_profile_id: data.settled_by_profile_id,
      notes: data.notes,
      created_at: new Date().toISOString(),
    };

    store.courierSettlements.unshift(newSettlement);
    this.saveStore(store);
    return newSettlement;
  }

  // Merchant Transactions & Financials
  async getMerchantTransactions(companyId: string, merchantId?: string): Promise<MerchantTransaction[]> {
    let txs = this.getStore().merchantTransactions.filter(t => t.company_id === companyId);
    if (merchantId) txs = txs.filter(t => t.merchant_id === merchantId);
    return txs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async addMerchantTransaction(companyId: string, data: {
    merchant_id: string;
    transaction_type: MerchantTransactionType;
    direction: 'credit' | 'debit';
    amount: number;
    category?: string;
    reference_type: 'order' | 'return' | 'settlement' | 'manual' | 'shipping_charge';
    reference_id?: string;
    order_id?: string;
    order_number?: string;
    return_id?: string;
    return_number?: string;
    description: string;
    created_by: string;
  }): Promise<MerchantTransaction> {
    const store = this.getStore();
    const newTx: MerchantTransaction = {
      id: `demo-tx-${Date.now()}`,
      company_id: companyId,
      merchant_id: data.merchant_id,
      transaction_type: data.transaction_type,
      direction: data.direction,
      amount: data.amount,
      category: data.category,
      reference_type: data.reference_type,
      reference_id: data.reference_id,
      order_id: data.order_id,
      order_number: data.order_number,
      return_id: data.return_id,
      return_number: data.return_number,
      description: data.description,
      created_by: data.created_by,
      created_at: new Date().toISOString(),
    };
    store.merchantTransactions.unshift(newTx);
    this.saveStore(store);
    return newTx;
  }

  async getMerchantSettlements(companyId: string, merchantId?: string): Promise<MerchantSettlement[]> {
    let settlements = this.getStore().merchantSettlements.filter(s => s.company_id === companyId);
    if (merchantId) settlements = settlements.filter(s => s.merchant_id === merchantId);
    return settlements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getNextMerchantSettlementNumber(companyId: string): Promise<string> {
    const rand = Math.floor(100 + Math.random() * 900);
    const timestamp = Date.now().toString().slice(-6);
    return `SET-M-${timestamp}-${rand}`;
  }

  async createMerchantSettlement(companyId: string, data: {
    merchant_id: string;
    settlement_type: any;
    expected_amount: number;
    paid_amount: number;
    payment_method?: string;
    reference_number?: string;
    settled_by: string;
    notes?: string;
  }): Promise<MerchantSettlement> {
    const store = this.getStore();
    const settlementNumber = `MSET-${Date.now().toString().slice(-6)}`;
    const remaining = Math.max(0, data.expected_amount - data.paid_amount);

    const newSettlement: MerchantSettlement = {
      id: `demo-mset-${Date.now()}`,
      company_id: companyId,
      merchant_id: data.merchant_id,
      settlement_number: settlementNumber,
      settlement_type: data.settlement_type || 'payout_to_merchant',
      expected_amount: data.expected_amount,
      paid_amount: data.paid_amount,
      remaining_amount: remaining,
      payment_method: data.payment_method,
      reference_number: data.reference_number,
      settled_by: data.settled_by,
      notes: data.notes,
      created_at: new Date().toISOString(),
    };

    store.merchantSettlements.unshift(newSettlement);
    this.saveStore(store);
    return newSettlement;
  }

  async getMerchantFinancialSummary(companyId: string, merchantId: string): Promise<MerchantFinancialSummary | null> {
    const merchant = await this.getMerchantById(companyId, merchantId);
    if (!merchant) return null;

    const orders = await this.getOrders(companyId, null, merchantId);
    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    const totalCodEarned = deliveredOrders.reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);

    const returns = await this.getReturns(companyId, null, merchantId);
    const completedReturns = returns.filter(r => r.status === 'returned');
    const totalReturnsDebited = completedReturns.reduce((sum, r) => sum + (Number(r.return_shipping_cost) || 30), 0);

    const settlements = await this.getMerchantSettlements(companyId, merchantId);
    const totalSettledPaid = settlements.reduce((sum, s) => sum + (Number(s.paid_amount) || 0), 0);

    const txs = await this.getMerchantTransactions(companyId, merchantId);

    const netPosition = totalCodEarned - totalReturnsDebited - totalSettledPaid;

    return {
      merchant_id: merchantId,
      merchant,
      amount_due_to_merchant: Math.max(0, netPosition),
      merchant_debt_to_company: Math.max(0, -netPosition),
      net_position: netPosition,
      net_balance: netPosition,
      total_cod_earned: totalCodEarned,
      total_delivered_orders: deliveredOrders.length,
      total_returns_debited: totalReturnsDebited,
      total_settled_paid: totalSettledPaid,
      total_orders_count: orders.length,
      delivered_orders_count: deliveredOrders.length,
      returns_count: returns.length,
      settlements_count: settlements.length,
      transactions_count: txs.length,
      last_settlement_date: settlements.length > 0 ? settlements[0].created_at : null,
    };
  }

  async getAllMerchantsFinancialSummaries(companyId: string): Promise<MerchantFinancialSummary[]> {
    const merchants = await this.getMerchants(companyId);
    const summaries: MerchantFinancialSummary[] = [];
    for (const m of merchants) {
      const s = await this.getMerchantFinancialSummary(companyId, m.id);
      if (s) summaries.push(s);
    }
    return summaries;
  }

  // Metrics
  async getAdminMetrics(companyId: string) {
    const orders = await this.getOrders(companyId);
    const returns = await this.getReturns(companyId);
    const couriers = await this.getCouriers(companyId);
    const merchants = await this.getMerchants(companyId);
    const colTotal = await this.getTotalOutstandingCollections(companyId);
    const recentEvents = await this.getAllOrderEvents(companyId, { limit: 10 });

    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(o => (o.delivery_date === todayStr) || (o.created_at && o.created_at.startsWith(todayStr)));

    const totalOrders = orders.length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const assignedOrders = orders.filter(o => o.status === 'assigned').length;
    const outForDeliveryOrders = orders.filter(o => o.status === 'out_for_delivery').length;
    const failedOrders = orders.filter(o => o.status === 'failed').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    const rescheduledOrders = orders.filter(o => o.customer_response_status === 'reschedule_requested').length;

    const totalCodAmount = orders.reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);
    const totalCodDelivered = orders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + (Number(o.cod_amount) || 0), 0);

    const activeCouriers = couriers.filter(c => c.status === 'active').length;
    const activeMerchants = merchants.filter(m => m.status === 'active').length;

    const todayDelivered = todayOrders.filter(o => o.status === 'delivered').length;
    const todayFailed = todayOrders.filter(o => o.status === 'failed').length;
    const todayAssigned = todayOrders.filter(o => o.status === 'assigned').length;
    const todayOutForDelivery = todayOrders.filter(o => o.status === 'out_for_delivery').length;
    const todayRescheduled = todayOrders.filter(o => o.customer_response_status === 'reschedule_requested').length;
    const todayCancelled = todayOrders.filter(o => o.status === 'cancelled').length;

    const deliverySuccessRate = (deliveredOrders + failedOrders) > 0 
      ? Math.round((deliveredOrders / (deliveredOrders + failedOrders)) * 100) 
      : 100;
    const successRateToday = (todayDelivered + todayFailed) > 0 
      ? Math.round((todayDelivered / (todayDelivered + todayFailed)) * 100) 
      : 100;

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
      deliveredOrders,
      pendingOrders,
      assignedOrders,
      outForDeliveryOrders,
      failedOrders,
      cancelledOrders,
      rescheduledOrders,
      totalCodAmount,
      deliveredCodAmount: totalCodDelivered,
      totalCodDelivered,
      deliverySuccessRate,
      activeCouriers,
      totalCouriers: couriers.length,
      activeMerchants,
      totalMerchants: merchants.length,
      activeReturns: returns.filter(r => r.status === 'created' || r.status === 'with_courier').length,
      totalReturns: returns.length,
      returnsTotal: returns.length,
      returnsCreated: returns.filter(r => r.status === 'created').length,
      returnsWithCourier: returns.filter(r => r.status === 'with_courier').length,
      returnsCompleted: returns.filter(r => r.status === 'returned').length,
      todayOrdersCount: todayOrders.length,
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
      courierPerformance,
      merchantPerformance,
      recentActivity: recentEvents,
    };
  }

  async getCourierMetrics(companyId: string, courierId: string) {
    const orders = await this.getOrders(companyId, courierId);
    const returns = await this.getReturns(companyId, courierId);
    const summary = await this.getCourierCollectionSummary(companyId, courierId);

    const totalAssigned = orders.length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const outForDelivery = orders.filter(o => o.status === 'out_for_delivery').length;
    const failed = orders.filter(o => o.status === 'failed').length;
    const pending = orders.filter(o => o.status === 'assigned' || o.status === 'pending').length;

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
      pendingSettlement: summary?.current_outstanding_balance || 0,
      returnsCount: returns.length,
    };
  }
}

export const demoDb = new DemoDatabase();
