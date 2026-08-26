-- ==============================================================================
-- DELIXA SUPER ADMIN & PLATFORM MANAGEMENT SCHEMA MIGRATION
-- Multi-Tenant Platform Level Infrastructure
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Alter public.companies to add SaaS subscription & status attributes
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS plan_code VARCHAR(100) DEFAULT 'growth';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS plan_name VARCHAR(255) DEFAULT 'باقة النمو (Growth)';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS subscription_start_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS subscription_end_date DATE DEFAULT (CURRENT_DATE + INTERVAL '30 days');
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS max_orders INTEGER DEFAULT 1000;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS max_couriers INTEGER DEFAULT 10;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS max_merchants INTEGER DEFAULT 50;

-- 3. PLATFORM ADMINS TABLE (Super Admin & Platform Staff)
CREATE TABLE IF NOT EXISTS public.platform_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL DEFAULT 'super_admin', -- 'super_admin', 'finance', 'support', 'operations', 'staff'
    permissions JSONB NOT NULL DEFAULT '["*"]'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'disabled'
    is_primary BOOLEAN NOT NULL DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_admins_username ON public.platform_admins(username);
CREATE INDEX IF NOT EXISTS idx_platform_admins_status ON public.platform_admins(status);

-- 4. PLATFORM SESSIONS TABLE (Encrypted Session Tokens)
CREATE TABLE IF NOT EXISTS public.platform_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.platform_admins(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(100),
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_sessions_token ON public.platform_sessions(token);
CREATE INDEX IF NOT EXISTS idx_platform_sessions_expires_at ON public.platform_sessions(expires_at);

-- 5. PLATFORM SUBSCRIPTION PLANS TABLE
CREATE TABLE IF NOT EXISTS public.platform_subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
    billing_cycle VARCHAR(50) NOT NULL DEFAULT 'monthly', -- 'monthly', 'quarterly', 'yearly'
    trial_days INTEGER NOT NULL DEFAULT 14,
    order_limit INTEGER DEFAULT 500,
    courier_limit INTEGER DEFAULT 5,
    merchant_limit INTEGER DEFAULT 20,
    features JSONB NOT NULL DEFAULT '["تتبع الطلبات", "إدارة المناديب", "إدارة المتاجر", "تسويات مالية", "رابط تأكيد العميل"]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed Default Plans if empty
INSERT INTO public.platform_subscription_plans (name, code, price, currency, billing_cycle, trial_days, order_limit, courier_limit, merchant_limit, features, is_active)
VALUES 
('الباقة الأساسية (Starter)', 'starter', 499.00, 'EGP', 'monthly', 14, 300, 3, 10, '["إدارة الطلبات", "3 مناديب توصيل", "10 متاجر", "رابط تأكيد الشحنة للعميل", "تسويات المناديب"]'::jsonb, true),
('باقة النمو (Growth)', 'growth', 999.00, 'EGP', 'monthly', 14, 1500, 10, 50, '["طلبات غير محدودة نسبياً", "10 مناديب توصيل", "50 متجر", "تسعير مخصص للمحافظات", "تسويات التجار المتقدمة", "تقارير مالية وتحليلات"]'::jsonb, true),
('باقة الشركات (Enterprise)', 'enterprise', 1999.00, 'EGP', 'monthly', 30, 5000, 30, 200, '["إمكانيات غير محدودة", "30 مندوب توصيل", "200 متجر", "دعم فني مخصص 24/7", "لوجو وهوية مخصصة للشركة", "تكاملات API خاصة"]'::jsonb, true)
ON CONFLICT (code) DO NOTHING;

-- 6. PLATFORM SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.platform_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.platform_subscription_plans(id) ON DELETE SET NULL,
    plan_code VARCHAR(100) NOT NULL DEFAULT 'growth',
    plan_name VARCHAR(255) NOT NULL DEFAULT 'باقة النمو (Growth)',
    price NUMERIC(12, 2) NOT NULL DEFAULT 999.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
    billing_cycle VARCHAR(50) NOT NULL DEFAULT 'monthly',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'trial', 'expired', 'suspended', 'cancelled'
    payment_status VARCHAR(50) NOT NULL DEFAULT 'paid', -- 'paid', 'pending', 'overdue'
    auto_renewal BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_company_id ON public.platform_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_status ON public.platform_subscriptions(status);

-- 7. PLATFORM PAYMENTS TABLE (Platform Revenue Management)
CREATE TABLE IF NOT EXISTS public.platform_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number VARCHAR(100) UNIQUE NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.platform_subscriptions(id) ON DELETE SET NULL,
    plan_name VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
    payment_method VARCHAR(50) NOT NULL DEFAULT 'instapay', -- 'instapay', 'vodafone_cash', 'fawry', 'card', 'bank_transfer', 'paymob', 'stripe', 'cash'
    transaction_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'paid', -- 'paid', 'pending', 'failed', 'refunded', 'cancelled'
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by VARCHAR(255) DEFAULT 'Super Admin',
    notes TEXT,
    gateway_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_payments_company_id ON public.platform_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_platform_payments_status ON public.platform_payments(status);
CREATE INDEX IF NOT EXISTS idx_platform_payments_payment_date ON public.platform_payments(payment_date);

-- 8. PLATFORM PRESENCE & HEARTBEAT TABLE
CREATE TABLE IF NOT EXISTS public.platform_presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID,
    user_name VARCHAR(255),
    user_role VARCHAR(50) DEFAULT 'admin',
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    session_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    ip_address VARCHAR(100),
    user_agent TEXT,
    is_online BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT uq_presence_company_user UNIQUE (company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_presence_company_id ON public.platform_presence(company_id);
CREATE INDEX IF NOT EXISTS idx_platform_presence_last_seen ON public.platform_presence(last_seen_at);

-- 9. PLATFORM DAILY ANALYTICS TABLE (Unique Device Visitor Tracking)
CREATE TABLE IF NOT EXISTS public.platform_analytics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id VARCHAR(100) NOT NULL,
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    device_type VARCHAR(50) DEFAULT 'desktop', -- 'desktop', 'mobile', 'tablet'
    browser VARCHAR(50),
    os VARCHAR(50),
    top_page VARCHAR(255) DEFAULT '/',
    page_views INTEGER NOT NULL DEFAULT 1,
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_analytics_visitor_date UNIQUE (visitor_id, visit_date)
);

CREATE INDEX IF NOT EXISTS idx_platform_analytics_visit_date ON public.platform_analytics_daily(visit_date);
CREATE INDEX IF NOT EXISTS idx_platform_analytics_visitor ON public.platform_analytics_daily(visitor_id);

-- 10. PLATFORM ACTIVITY & AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.platform_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.platform_admins(id) ON DELETE SET NULL,
    actor VARCHAR(100) NOT NULL DEFAULT 'Super Admin',
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(100) NOT NULL, -- 'company', 'subscription', 'payment', 'staff', 'plan', 'settings'
    target_id VARCHAR(255),
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    details TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_activity_created_at ON public.platform_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_platform_activity_company_id ON public.platform_activity_logs(company_id);

-- 11. PLATFORM SETTINGS TABLE (Global SaaS Configurations & Maintenance Mode)
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.platform_settings (key, value)
VALUES 
('general', '{"platform_name":"DELIXA","support_email":"support@delixa.eg","support_phone":"+201000000000","default_currency":"EGP","default_trial_days":14,"default_timezone":"Africa/Cairo","maintenance_mode":false,"maintenance_message":"النظام قيد التحديث والصيانة الدورية حالياً. سنعود للعمل خلال دقائق."}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 12. ROW LEVEL SECURITY POLICIES FOR PLATFORM TABLES
-- Protect Super Admin tables from any regular company tenant access
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Note: All Super Admin modifications pass through Backend Server / Service Role APIs
-- Regular authenticated company admins cannot read platform_admins, platform_payments, or other companies' presence.
-- Public read for active subscription plans
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public can view active plans" ON public.platform_subscription_plans;
    CREATE POLICY "Public can view active plans" ON public.platform_subscription_plans FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Reload schema cache in PostgREST
NOTIFY pgrst, 'reload schema';
