import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { db, DEFAULT_DELIVERY_SLOTS, DEFAULT_SHIPPING_PRICING, EGYPT_GOVERNORATES } from '../../lib/db';
import { DeliverySlot, ShippingPricingSettings, PricingModel } from '../../types';
import { getErrorMessage } from '../../utils/errorHandler';
import { 
  Settings, 
  Building2, 
  Database, 
  ShieldCheck, 
  Copy, 
  Check, 
  Mail, 
  Phone, 
  MapPin, 
  Layers,
  Terminal,
  Code,
  Clock,
  Plus,
  Trash2,
  Lock,
  User,
  LogOut,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Coins,
  DollarSign,
  Calculator,
  Percent,
} from 'lucide-react';

type SettingsTab = 'company' | 'pricing' | 'slots' | 'profile' | 'database';

export const SettingsPage: React.FC = () => {
  const { session, updateCompanyProfile, logout } = useAuth();
  const { t, isRTL } = useLanguage();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<SettingsTab>('company');

  // Company profile form
  const [name, setName] = useState(session?.company.name || '');
  const [phone, setPhone] = useState(session?.company.phone || '');
  const [email, setEmail] = useState(session?.company.email || '');
  const [address, setAddress] = useState(session?.company.address || '');
  const [logoUrl, setLogoUrl] = useState(session?.company.logo_url || '');
  const [savingCompany, setSavingCompany] = useState(false);

  // Shipping Pricing state
  const [shippingPricing, setShippingPricing] = useState<ShippingPricingSettings>(DEFAULT_SHIPPING_PRICING);
  const [savingPricing, setSavingPricing] = useState(false);
  const [bulkRateValue, setBulkRateValue] = useState<number>(50);

  // Delivery Slots state
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [newSlotName, setNewSlotName] = useState('');
  const [newFromTime, setNewFromTime] = useState('09:00');
  const [newToTime, setNewToTime] = useState('13:00');
  const [isAddingSlot, setIsAddingSlot] = useState(false);

  // Admin Profile form
  const [adminName, setAdminName] = useState(session?.profile.full_name || '');
  const [adminPhone, setAdminPhone] = useState(session?.profile.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingAdmin, setSavingAdmin] = useState(false);

  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (session) {
      setName(session.company.name || '');
      setPhone(session.company.phone || '');
      setEmail(session.company.email || '');
      setAddress(session.company.address || '');
      setLogoUrl(session.company.logo_url || '');
      setAdminName(session.profile.full_name || '');
      setAdminPhone(session.profile.phone || '');

      db.getDeliverySlots(session.company.id).then(currentSlots => {
        setSlots(currentSlots);
      });

      db.getCompanyShippingPricing(session.company.id).then(pricing => {
        if (pricing) {
          setShippingPricing(pricing);
          if (pricing.default_shipping_fee) {
            setBulkRateValue(pricing.default_shipping_fee);
          }
        }
      });
    }
  }, [session]);

  if (!session) return null;

  // Save Shipping Pricing
  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPricing(true);
    try {
      await db.saveCompanyShippingPricing(session.company.id, shippingPricing);
      showToast('success', 'تم حفظ إعدادات تسعير الشحن بنجاح');
    } catch (err: any) {
      showToast('error', 'تعذر حفظ إعدادات التسعير', getErrorMessage(err));
    } finally {
      setSavingPricing(false);
    }
  };

  const handleApplyBulkRate = () => {
    const updatedRates: Record<string, number> = {};
    EGYPT_GOVERNORATES.forEach(gov => {
      updatedRates[gov] = bulkRateValue;
    });
    setShippingPricing(prev => ({
      ...prev,
      governorate_rates: updatedRates
    }));
    showToast('success', `تم تطبيق سعر ${bulkRateValue} ج.م على جميع المحافظات`);
  };

  const handleGovernorateRateChange = (gov: string, value: number) => {
    setShippingPricing(prev => ({
      ...prev,
      governorate_rates: {
        ...(prev.governorate_rates || {}),
        [gov]: Math.max(0, value)
      }
    }));
  };

  // Save Company Profile
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'اسم الشركة مطلوب');
      return;
    }
    setSavingCompany(true);
    const res = await updateCompanyProfile({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      logo_url: logoUrl.trim(),
    });
    setSavingCompany(false);

    if (res.success) {
      showToast('success', 'تم حفظ بيانات الشركة بنجاح');
    } else {
      showToast('error', 'تعذر حفظ البيانات', res.error);
    }
  };

  // Add Delivery Slot
  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotName.trim()) {
      showToast('error', 'اسم نافذة التوصيل مطلوب');
      return;
    }
    if (!newFromTime || !newToTime) {
      showToast('error', 'يرجى تحديد أوقات البدء والانتهاء');
      return;
    }

    try {
      const created = await db.addDeliverySlot(session.company.id, {
        name: newSlotName.trim(),
        from_time: newFromTime,
        to_time: newToTime,
        is_active: true,
      });
      setSlots(prev => [...prev, created]);
      setNewSlotName('');
      setNewFromTime('09:00');
      setNewToTime('13:00');
      setIsAddingSlot(false);
      showToast('success', 'تمت إضافة نافذة التوصيل بنجاح');
    } catch (err: any) {
      showToast('error', 'تعذر إضافة النافذة', getErrorMessage(err));
    }
  };

  // Toggle Slot Active
  const handleToggleSlot = async (slotId: string) => {
    const updated = await db.toggleDeliverySlot(session.company.id, slotId);
    if (updated) {
      setSlots(prev => prev.map(s => s.id === slotId ? updated : s));
      showToast('success', updated.is_active ? 'تم تفعيل النافذة' : 'تم تعطيل النافذة');
    }
  };

  // Delete Slot
  const handleDeleteSlot = async (slotId: string) => {
    if (slots.length <= 1) {
      showToast('error', 'يجب الاحتفاظ بنافذة توصيل واحدة على الأقل');
      return;
    }
    await db.deleteDeliverySlot(session.company.id, slotId);
    setSlots(prev => prev.filter(s => s.id !== slotId));
    showToast('success', 'تم حذف نافذة التوصيل');
  };

  // Restore Default Slots
  const handleResetSlots = async () => {
    await db.updateDeliverySlots(session.company.id, DEFAULT_DELIVERY_SLOTS);
    setSlots(DEFAULT_DELIVERY_SLOTS);
    showToast('success', 'تمت استعادة النوافذ الافتراضية');
  };

  // Save Admin Profile & Password
  const handleSaveAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAdmin(true);

    try {
      if (!adminName.trim()) {
        showToast('error', 'اسم المسؤول مطلوب');
        setSavingAdmin(false);
        return;
      }

      // Update name & phone
      await db.updateProfile(session.profile.id, {
        full_name: adminName.trim(),
        phone: adminPhone.trim(),
      });

      // Handle password change if filled
      if (newPassword.trim()) {
        if (newPassword.length < 6) {
          showToast('error', 'كلمة المرور الجديدة يجب أن تكون 6 خانات على الأقل');
          setSavingAdmin(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          showToast('error', 'كلمة المرور الجديدة غير متطابقة مع التأكيد');
          setSavingAdmin(false);
          return;
        }
        
        const { supabase } = await import('../../lib/supabase');
        if (supabase) {
          await supabase.auth.updateUser({ password: newPassword });
        }

        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }

      showToast('success', 'تم تحديث الملف الشخصي بنجاح');
    } catch (err: any) {
      showToast('error', 'فشل التحديث', getErrorMessage(err));
    } finally {
      setSavingAdmin(false);
    }
  };

  const sqlDDLCode = `-- DELIXA PostgreSQL DDL & Multi-Tenant RLS Policies
-- Execute in Supabase SQL Editor

-- 1. COMPANIES
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. PROFILES
CREATE TYPE user_role AS ENUM ('admin', 'courier');
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    role user_role NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. COURIERS
CREATE TYPE courier_status AS ENUM ('active', 'inactive');
CREATE TABLE IF NOT EXISTS public.couriers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    employee_id VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    area VARCHAR(255) NOT NULL,
    status courier_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT uq_company_employee_id UNIQUE (company_id, employee_id)
);

-- 4. MERCHANTS
CREATE TYPE merchant_status AS ENUM ('active', 'inactive');
CREATE TABLE IF NOT EXISTS public.merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    store_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    brand_name VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    whatsapp VARCHAR(50),
    email VARCHAR(255),
    address TEXT NOT NULL,
    logo_url TEXT,
    notes TEXT,
    status merchant_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 5. ORDERS
CREATE TYPE order_status AS ENUM ('pending', 'assigned', 'out_for_delivery', 'delivered', 'failed', 'cancelled');
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE RESTRICT,
    courier_id UUID REFERENCES public.couriers(id) ON DELETE SET NULL,
    order_number VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    governorate VARCHAR(100) DEFAULT 'القاهرة',
    city_area VARCHAR(100) DEFAULT 'مدينة نصر',
    customer_address TEXT NOT NULL,
    customer_landmark TEXT,
    cod_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    shipping_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    delivery_date DATE,
    delivery_from TIME,
    delivery_to TIME,
    notes TEXT,
    status order_status NOT NULL DEFAULT 'pending',
    
    -- Confirmation Token
    confirmation_token VARCHAR(255) NOT NULL,
    customer_response_status VARCHAR(50) DEFAULT 'pending',
    
    -- Delivery Lifecycle & Failure Tracking
    assigned_at TIMESTAMPTZ,
    delivery_started_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    delivered_by VARCHAR(255),
    delivered_by_courier_id UUID REFERENCES public.couriers(id) ON DELETE SET NULL,
    failed_at TIMESTAMPTZ,
    failed_by VARCHAR(255),
    failure_reason VARCHAR(100),
    failure_note TEXT,
    failure_notes TEXT,
    cancellation_source VARCHAR(50),
    cancellation_timestamp TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT uq_company_order_number UNIQUE (company_id, order_number)
);

-- 6. RETURNS
CREATE TYPE return_status AS ENUM ('created', 'with_courier', 'returned', 'cancelled');
CREATE TABLE IF NOT EXISTS public.returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    courier_id UUID REFERENCES public.couriers(id) ON DELETE SET NULL,
    return_number VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    return_address TEXT NOT NULL,
    return_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    return_shipping_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    other_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_return_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    return_reason VARCHAR(100) NOT NULL,
    status return_status NOT NULL DEFAULT 'created',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT uq_company_return_number UNIQUE (company_id, return_number)
);

-- 7. COURIER SETTLEMENTS & COLLECTIONS
CREATE TABLE IF NOT EXISTS public.courier_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    courier_id UUID NOT NULL REFERENCES public.couriers(id) ON DELETE RESTRICT,
    settlement_number VARCHAR(100) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    received_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    expected_amount NUMERIC(12, 2) DEFAULT 0.00,
    remaining_amount NUMERIC(12, 2) DEFAULT 0.00,
    orders_count INTEGER DEFAULT 0,
    settled_by VARCHAR(255) NOT NULL,
    settled_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Safety column migrations for courier_settlements:
ALTER TABLE public.courier_settlements ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.courier_settlements ADD COLUMN IF NOT EXISTS received_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.courier_settlements ADD COLUMN IF NOT EXISTS expected_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.courier_settlements ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.courier_settlements ADD COLUMN IF NOT EXISTS orders_count INTEGER DEFAULT 0;
ALTER TABLE public.courier_settlements ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.courier_settlements ADD COLUMN IF NOT EXISTS settled_by VARCHAR(255);
ALTER TABLE public.courier_settlements ADD COLUMN IF NOT EXISTS settled_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.courier_settlements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 8. MERCHANT SETTLEMENTS & TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.merchant_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE RESTRICT,
    settlement_number VARCHAR(100) NOT NULL,
    type VARCHAR(50) DEFAULT 'payout_to_merchant',
    settlement_type VARCHAR(50),
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_payout NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    expected_amount NUMERIC(12, 2) DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) DEFAULT 0.00,
    remaining_amount NUMERIC(12, 2) DEFAULT 0.00,
    total_cod NUMERIC(12, 2) DEFAULT 0.00,
    total_shipping_fees NUMERIC(12, 2) DEFAULT 0.00,
    deducted_shipping_fees NUMERIC(12, 2) DEFAULT 0.00,
    total_return_costs NUMERIC(12, 2) DEFAULT 0.00,
    orders_count INTEGER DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'cash',
    settled_by VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Safety column migrations for merchant_settlements:
ALTER TABLE public.merchant_settlements ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'payout_to_merchant';
ALTER TABLE public.merchant_settlements ADD COLUMN IF NOT EXISTS settlement_type VARCHAR(50);
ALTER TABLE public.merchant_settlements ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.merchant_settlements ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.merchant_settlements ADD COLUMN IF NOT EXISTS net_paid_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.merchant_settlements ADD COLUMN IF NOT EXISTS net_payout NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.merchant_settlements ADD COLUMN IF NOT EXISTS expected_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.merchant_settlements ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.merchant_settlements ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.merchant_settlements ADD COLUMN IF NOT EXISTS total_cod NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.merchant_settlements ADD COLUMN IF NOT EXISTS total_shipping_fees NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.merchant_settlements ADD COLUMN IF NOT EXISTS deducted_shipping_fees NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.merchant_settlements ADD COLUMN IF NOT EXISTS total_return_costs NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.merchant_settlements ADD COLUMN IF NOT EXISTS orders_count INTEGER DEFAULT 0;
ALTER TABLE public.merchant_settlements ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cash';
ALTER TABLE public.merchant_settlements ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.merchant_settlements ADD COLUMN IF NOT EXISTS settled_by VARCHAR(255);
ALTER TABLE public.merchant_settlements ADD COLUMN IF NOT EXISTS settled_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.merchant_settlements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_settlements ENABLE ROW LEVEL SECURITY;

-- Helper Security Definer function
CREATE OR REPLACE FUNCTION public.get_auth_company_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT company_id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- RLS Isolation Policies
CREATE POLICY "Strict Tenant Isolation for Orders"
  ON public.orders FOR ALL
  USING (company_id = public.get_auth_company_id());

CREATE POLICY "Strict Tenant Isolation for Returns"
  ON public.returns FOR ALL
  USING (company_id = public.get_auth_company_id());`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlDDLCode);
    setCopiedSql(true);
    showToast('success', t.copiedSql);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const navTabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'company', label: 'بيانات الشركة (Company)', icon: Building2 },
    { id: 'pricing', label: 'تسعير الشحن (Pricing)', icon: Coins },
    { id: 'slots', label: 'نوافذ ومواعيد التوصيل (Slots)', icon: Clock },
    { id: 'profile', label: 'الحساب والأمان (Security)', icon: User },
    { id: 'database', label: 'قاعدة البيانات و RLS', icon: Database },
  ];

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <Settings className="w-6 h-6 text-slate-700" />
              <span>{t.navSettings}</span>
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
              {session.company.name}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            إدارة الملف التعريفي للشركة، نوافذ التوصيل الزمنية، الحسابات والأمان
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => logout('admin')}
            className="px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>

      {/* 2. Navigation Tabs Bar */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 bg-white px-4 pt-2 rounded-t-2xl">
        {navTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`settings-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Tab 1: Company Profile Form */}
      {activeTab === 'company' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-3xl">
          <div className="mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span>بيانات ملف الشركة</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              البيانات الأساسية التي تظهر في فواتير الشحن وبوالص التوصيل ورسائل العملاء
            </p>
          </div>

          <form onSubmit={handleSaveCompany} className="space-y-4 text-xs">
            
            {/* Company Name */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                اسم الشركة <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="company-name"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold"
              />
            </div>

            {/* Grid: Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  رقم هاتف الشركة
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    id="company-phone"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="company-email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                عنوان المقر الرئيسي
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="company-address"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="المقر الرئيسي، العنوان، المدينة..."
                  className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
              </div>
            </div>

            {/* Logo URL */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                رابط شعار الشركة (Logo URL)
              </label>
              <input
                type="url"
                id="company-logo"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
              />
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                id="save-company-btn"
                disabled={savingCompany}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingCompany ? 'جاري الحفظ...' : t.saveChanges}</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* 3.1 Tab: Shipping Pricing System */}
      {activeTab === 'pricing' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-4xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-600" />
                <span>نظام تسعير مصاريف الشحن (Shipping Pricing System)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                تحديد طريقة احتساب تكلفة الشحن (سعر موحد أو مخصص لكل محافظة)، وتطبيقها تلقائياً عند إنشاء الشحنات وتأثيرها على مستحقات المتاجر.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShippingPricing(DEFAULT_SHIPPING_PRICING);
                  showToast('info', 'تم استعادة التسعير الافتراضي');
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة الافتراضي</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSavePricing} className="space-y-6">
            
            {/* Pricing Model Selection */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                اختر نموذج التسعير المعتمد في شركتك:
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Unified Option */}
                <label
                  onClick={() => setShippingPricing(prev => ({ ...prev, pricing_model: 'unified' }))}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                    shippingPricing.pricing_model === 'unified'
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        shippingPricing.pricing_model === 'unified' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                      }`}>
                        {shippingPricing.pricing_model === 'unified' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="font-bold text-xs text-slate-900">سعر موحد لكل المحافظات (Unified Rate)</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">بسيط & سريع</span>
                  </div>
                  <p className="text-[11px] text-slate-500 ps-6">
                    يتم تطبيق نفس تكلفة الشحن على جميع الشحنات بغض النظر عن المحافظة المختارة.
                  </p>
                </label>

                {/* Per-Governorate Option */}
                <label
                  onClick={() => setShippingPricing(prev => ({ ...prev, pricing_model: 'governorate' }))}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                    shippingPricing.pricing_model === 'governorate'
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        shippingPricing.pricing_model === 'governorate' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                      }`}>
                        {shippingPricing.pricing_model === 'governorate' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="font-bold text-xs text-slate-900">سعر مخصص لكل محافظة (Per-Governorate)</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">دقيق & مرن</span>
                  </div>
                  <p className="text-[11px] text-slate-500 ps-6">
                    تحديد سعر شحن مستقل لكل محافظة من محافظات مصر الـ 27 تلقائياً.
                  </p>
                </label>
              </div>
            </div>

            {/* If Unified: Single Input */}
            {shippingPricing.pricing_model === 'unified' && (
              <div className="p-5 bg-emerald-50/40 rounded-2xl border border-emerald-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span>قيمة مصاريف الشحن الموحدة (ج.م)</span>
                    </h3>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      سيتم ملء خانة مصاريف الشحن تلقائياً بهذه القيمة عند إضافة أي طلب جديد.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="5"
                      required
                      value={shippingPricing.default_shipping_fee || 50}
                      onChange={e => setShippingPricing(prev => ({
                        ...prev,
                        default_shipping_fee: Number(e.target.value) || 0
                      }))}
                      className="w-32 px-3 py-2 bg-white rounded-xl border border-emerald-300 font-bold text-emerald-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center"
                    />
                    <span className="font-bold text-xs text-emerald-900">ج.م</span>
                  </div>
                </div>
              </div>
            )}

            {/* If Per-Governorate: Interactive Grid / Table */}
            {shippingPricing.pricing_model === 'governorate' && (
              <div className="space-y-4">
                
                {/* Bulk Apply Bar */}
                <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-blue-900">
                    <span className="font-bold">تطبيق سريع:</span> تعيين سعر موحد كأساس لجميع المحافظات دفعة واحدة
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={bulkRateValue}
                      onChange={e => setBulkRateValue(Number(e.target.value) || 0)}
                      className="w-24 px-2.5 py-1.5 bg-white rounded-lg border border-blue-300 font-bold text-blue-900 text-xs text-center"
                    />
                    <span className="text-xs font-bold text-blue-900">ج.م</span>
                    <button
                      type="button"
                      onClick={handleApplyBulkRate}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      تطبيق على الكل
                    </button>
                  </div>
                </div>

                {/* Rates Table / Grid */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>المحافظة (Governorate)</span>
                    <span>سعر الشحن (ج.م)</span>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto bg-white p-1">
                    {EGYPT_GOVERNORATES.map(gov => {
                      const rate = shippingPricing.governorate_rates?.[gov] ?? shippingPricing.default_shipping_fee ?? 50;
                      return (
                        <div key={gov} className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors">
                          <span className="text-xs font-medium text-slate-800">{gov}</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              step="5"
                              value={rate}
                              onChange={e => handleGovernorateRateChange(gov, Number(e.target.value) || 0)}
                              className="w-24 px-2.5 py-1 bg-slate-50 hover:bg-white border border-slate-200 focus:border-emerald-500 rounded-lg text-xs font-bold text-emerald-800 text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <span className="text-[11px] text-slate-400 font-bold">ج.م</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* Save Button */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                id="save-pricing-btn"
                disabled={savingPricing}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingPricing ? 'جاري الحفظ...' : 'حفظ إعدادات التسعير'}</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* 4. Tab 2: Delivery Slots Management */}
      {activeTab === 'slots' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-4xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <span>إعدادات وتخصيص نوافذ التوصيل (Delivery Time Slots)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                الفترات الزمنية المتاحة للتوصيل والتي يختار منها العميل أو مسؤول الشحن عند إنشاء الشحنة
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetSlots}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1"
                title="استعادة الفترتين الافتراضيتين (صباحية / مسائية)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة الافتراضي</span>
              </button>

              <button
                id="add-slot-btn"
                onClick={() => setIsAddingSlot(!isAddingSlot)}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة نافذة جديدة</span>
              </button>
            </div>
          </div>

          {/* Add New Slot Inline Form */}
          {isAddingSlot && (
            <form onSubmit={handleAddSlot} className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-200 text-xs space-y-3">
              <h3 className="font-bold text-indigo-900">إضافة نافذة زمنية جديدة</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم الفترة (مثلاً: المسائية)</label>
                  <input
                    type="text"
                    required
                    placeholder="الفترة الليلية / المسائية..."
                    value={newSlotName}
                    onChange={e => setNewSlotName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">من الساعة</label>
                  <input
                    type="time"
                    required
                    value={newFromTime}
                    onChange={e => setNewFromTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">إلى الساعة</label>
                  <input
                    type="time"
                    required
                    value={newToTime}
                    onChange={e => setNewToTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingSlot(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-xs"
                >
                  حفظ النافذة
                </button>
              </div>
            </form>
          )}

          {/* Slots List Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-bold">
                  <th className="pb-3 text-start">اسم الفترة</th>
                  <th className="pb-3 text-start">النطاق الزمني</th>
                  <th className="pb-3 text-center">الحالة</th>
                  <th className="pb-3 text-end">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slots.map(slot => (
                  <tr key={slot.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-bold text-slate-900">
                      {slot.name}
                    </td>
                    <td className="py-3 font-mono font-bold text-indigo-700">
                      {slot.from_time} - {slot.to_time}
                    </td>
                    <td className="py-3 text-center">
                      <button
                        onClick={() => handleToggleSlot(slot.id)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                          slot.is_active
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        {slot.is_active ? 'مفعلة' : 'معطلة'}
                      </button>
                    </td>
                    <td className="py-3 text-end">
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="حذف النافذة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Tab 3: Admin Profile & Password Change */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-2xl">
          <div className="mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-600" />
              <span>إعدادات حساب المسؤول وكلمة المرور</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              تعديل بيانات الحساب الشخصي وتغيير كلمة مرور الدخول
            </p>
          </div>

          <form onSubmit={handleSaveAdminProfile} className="space-y-4 text-xs">
            
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                اسم المسؤول الكامل
              </label>
              <input
                type="text"
                required
                value={adminName}
                onChange={e => setAdminName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                رقم الهاتف
              </label>
              <input
                type="tel"
                value={adminPhone}
                onChange={e => setAdminPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
              />
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-slate-500" />
                <span>تغيير كلمة المرور (اختياري)</span>
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    placeholder="6 أحرف أو أرقام على الأقل"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">تأكيد كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    placeholder="إعادة كتابة كلمة المرور"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                disabled={savingAdmin}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingAdmin ? 'جاري الحفظ...' : 'تحديث الحساب'}</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* 6. Tab 4: Database & Multi-Tenant RLS Schemas */}
      {activeTab === 'database' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                <span>مخطط قاعدة بيانات PostgreSQL وسياسات العزل (RLS Architecture)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                كود SQL الكامل متوافق مع Supabase لتنفيذ العزل التام بين شركات الشحن والمناديب
              </p>
            </div>

            <button
              onClick={handleCopySql}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copiedSql ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiedSql ? t.copiedSql : t.copySql}</span>
            </button>
          </div>

          {/* Security Features Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>عزل متعدد الشركات (Multi-Tenancy)</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                كل جدول يحتوي على <code className="text-indigo-600 font-bold">company_id</code> إلزامي مع سياسة RLS لضمان عدم رؤية أي شركة لبيانات غيرها.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-blue-600" />
                <span>أمان المناديب والتتبع</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                المناديب مقيدون برؤية الشحنات والمرتجعات المسندة إليهم فقط في نطاق شركتهم.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>توليد التوكنات العامة</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                روابط تأكيد العملاء تستخدم <code className="text-purple-600 font-bold">confirmation_token</code> فريد وآمن بدون كشف بيانات حساسة.
              </p>
            </div>
          </div>

          {/* SQL Code Block */}
          <div className="relative rounded-2xl bg-slate-900 p-4 font-mono text-[11px] text-slate-200 overflow-x-auto max-h-[420px] shadow-inner border border-slate-800">
            <pre className="leading-relaxed">
              <code>{sqlDDLCode}</code>
            </pre>
          </div>
        </div>
      )}

    </div>
  );
};
