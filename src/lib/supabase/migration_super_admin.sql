-- ==============================================================================
-- DELIXA Super Admin & Platform Core Database Migration for Supabase
-- Tables: platform_admins, platform_sessions, platform_activity_logs, 
--         platform_subscription_plans, platform_subscriptions, 
--         platform_payments, platform_settings
-- Full Idempotent Script with RLS, Security Policies, Indexes & Reload
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. Extend Companies Table with Subscription & Status Fields
-- ==============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='status') THEN
        ALTER TABLE public.companies ADD COLUMN status VARCHAR(50) DEFAULT 'active';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='plan_code') THEN
        ALTER TABLE public.companies ADD COLUMN plan_code VARCHAR(100) DEFAULT 'starter';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='plan_name') THEN
        ALTER TABLE public.companies ADD COLUMN plan_name VARCHAR(255) DEFAULT 'الباقة الأساسية';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='subscription_end_date') THEN
        ALTER TABLE public.companies ADD COLUMN subscription_end_date TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='is_trial') THEN
        ALTER TABLE public.companies ADD COLUMN is_trial BOOLEAN DEFAULT false;
    END IF;
END $$;

-- ==============================================================================
-- 2. Platform Admins Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.platform_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    permissions JSONB NOT NULL DEFAULT '["dashboard.view"]'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    is_primary BOOLEAN NOT NULL DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Idempotent column check for platform_admins
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='platform_admins' AND column_name='is_primary') THEN
        ALTER TABLE public.platform_admins ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- ==============================================================================
-- 3. Platform Sessions Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.platform_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR(255) UNIQUE NOT NULL,
    admin_id UUID NOT NULL REFERENCES public.platform_admins(id) ON DELETE CASCADE,
    ip_address VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- ==============================================================================
-- 4. Platform Subscription Plans
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.platform_subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
    billing_cycle VARCHAR(50) NOT NULL DEFAULT 'monthly',
    trial_days INT NOT NULL DEFAULT 14,
    order_limit INT NOT NULL DEFAULT 1000,
    courier_limit INT NOT NULL DEFAULT 10,
    merchant_limit INT NOT NULL DEFAULT 50,
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 5. Platform Subscriptions (History & Renewals)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.platform_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.platform_subscription_plans(id),
    plan_name VARCHAR(255) NOT NULL,
    plan_code VARCHAR(100) NOT NULL,
    start_date VARCHAR(50) NOT NULL,
    end_date VARCHAR(50) NOT NULL,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
    billing_cycle VARCHAR(50) NOT NULL DEFAULT 'monthly',
    is_trial BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    payment_status VARCHAR(50) DEFAULT 'paid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Idempotent column check for platform_subscriptions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='platform_subscriptions' AND column_name='payment_status') THEN
        ALTER TABLE public.platform_subscriptions ADD COLUMN payment_status VARCHAR(50) DEFAULT 'paid';
    END IF;
END $$;

-- ==============================================================================
-- 6. Platform Payments Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.platform_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(100) UNIQUE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.platform_subscriptions(id),
    plan_name VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
    payment_method VARCHAR(100) NOT NULL DEFAULT 'bank_transfer',
    transaction_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    invoice_number VARCHAR(100),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_by VARCHAR(255),
    notes TEXT,
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Idempotent column checks for platform_payments
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='platform_payments' AND column_name='payment_number') THEN
        ALTER TABLE public.platform_payments ADD COLUMN payment_number VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='platform_payments' AND column_name='payment_date') THEN
        ALTER TABLE public.platform_payments ADD COLUMN payment_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='platform_payments' AND column_name='created_by') THEN
        ALTER TABLE public.platform_payments ADD COLUMN created_by VARCHAR(255);
    END IF;
END $$;

-- ==============================================================================
-- 7. Platform Activity Logs (Audit Trail)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.platform_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID,
    admin_name VARCHAR(255),
    actor VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(100) NOT NULL,
    target_id VARCHAR(255),
    company_id UUID,
    details TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    meta JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Idempotent column checks for platform_activity_logs
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='platform_activity_logs' AND column_name='actor') THEN
        ALTER TABLE public.platform_activity_logs ADD COLUMN actor VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='platform_activity_logs' AND column_name='company_id') THEN
        ALTER TABLE public.platform_activity_logs ADD COLUMN company_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='platform_activity_logs' AND column_name='metadata') THEN
        ALTER TABLE public.platform_activity_logs ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- ==============================================================================
-- 8. Platform System Settings
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_by VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 9. Performance Indexes
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_platform_admins_username ON public.platform_admins(username);
CREATE INDEX IF NOT EXISTS idx_platform_admins_role ON public.platform_admins(role);
CREATE INDEX IF NOT EXISTS idx_platform_sessions_token ON public.platform_sessions(token);
CREATE INDEX IF NOT EXISTS idx_platform_sessions_expires_at ON public.platform_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_company_id ON public.platform_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_platform_payments_company_id ON public.platform_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_platform_payments_payment_number ON public.platform_payments(payment_number);
CREATE INDEX IF NOT EXISTS idx_platform_activity_logs_created_at ON public.platform_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_activity_logs_target ON public.platform_activity_logs(target_type, target_id);

-- ==============================================================================
-- 10. Default Seed Data (Idempotent)
-- ==============================================================================
INSERT INTO public.platform_settings (key, value)
VALUES 
    ('general', '{"platform_name":"DELIXA","support_email":"support@delixa.eg","support_phone":"+201000000000","default_currency":"EGP","default_trial_days":14,"default_timezone":"Africa/Cairo","maintenance_mode":false,"maintenance_message":"النظام قيد التحديث والصيانة الدورية حالياً. سنعود للعمل خلال دقائق."}'::jsonb),
    ('security', '{"session_timeout_days":7,"max_failed_logins":5,"lockout_duration_minutes":15}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.platform_subscription_plans (code, name, price, currency, billing_cycle, trial_days, order_limit, courier_limit, merchant_limit, features, is_active)
VALUES
    ('starter', 'الباقة الأساسية', 299, 'EGP', 'monthly', 14, 500, 5, 20, '["إدارة الشحنات","تتبع المناديب","تقارير أساسية","دعم فني عبر البريد"]'::jsonb, true),
    ('professional', 'باقة الأعمال والنمو', 599, 'EGP', 'monthly', 14, 2500, 20, 100, '["إدارة شحنات متقدمة","تتبع فوري عبر الخريطة","حسابات وتسويات التجار","رسائل واتساب للمستلمين","دعم فني متميز"]'::jsonb, true),
    ('enterprise', 'باقة الشركات الكبرى', 1299, 'EGP', 'monthly', 30, 10000, 100, 500, '["شحنات ومناديب غير محدودة تقريباً","ربط API مخصص","تسويات مالية متعددة الفروع","لوحة تحكم وتحليلات ذكية","دعم فني هاتفي على مدار الساعة"]'::jsonb, true)
ON CONFLICT (code) DO NOTHING;

-- ==============================================================================
-- 11. Row Level Security (RLS) & Multi-Tenant Protection
-- Super Admin tables must NEVER be directly readable or writable by normal tenants via public SDK
-- ==============================================================================
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing public policies on platform tables if any
DROP POLICY IF EXISTS "Deny all public access to platform_admins" ON public.platform_admins;
DROP POLICY IF EXISTS "Deny all public access to platform_sessions" ON public.platform_sessions;
DROP POLICY IF EXISTS "Public read access to active plans" ON public.platform_subscription_plans;
DROP POLICY IF EXISTS "Deny public write to platform_subscription_plans" ON public.platform_subscription_plans;
DROP POLICY IF EXISTS "Company read own platform_subscriptions" ON public.platform_subscriptions;
DROP POLICY IF EXISTS "Company read own platform_payments" ON public.platform_payments;
DROP POLICY IF EXISTS "Deny all public access to platform_activity_logs" ON public.platform_activity_logs;
DROP POLICY IF EXISTS "Public read general platform_settings" ON public.platform_settings;

-- 11.1 platform_admins: Strict Deny for anon and authenticated users (Server Service Role only)
CREATE POLICY "Deny all public access to platform_admins" 
ON public.platform_admins FOR ALL 
TO anon, authenticated 
USING (false) 
WITH CHECK (false);

-- 11.2 platform_sessions: Strict Deny for anon and authenticated users
CREATE POLICY "Deny all public access to platform_sessions" 
ON public.platform_sessions FOR ALL 
TO anon, authenticated 
USING (false) 
WITH CHECK (false);

-- 11.3 platform_subscription_plans: Public read for active plans (so merchants/companies can view options)
CREATE POLICY "Public read access to active plans" 
ON public.platform_subscription_plans FOR SELECT 
TO anon, authenticated 
USING (is_active = true);

-- 11.4 platform_subscriptions: Company can only view its own subscription record
CREATE POLICY "Company read own platform_subscriptions" 
ON public.platform_subscriptions FOR SELECT 
TO authenticated 
USING (company_id = public.get_auth_company_id());

-- 11.5 platform_payments: Company can only view its own payment receipts
CREATE POLICY "Company read own platform_payments" 
ON public.platform_payments FOR SELECT 
TO authenticated 
USING (company_id = public.get_auth_company_id());

-- 11.6 platform_activity_logs: Strict Deny for anon and authenticated users (Audit logs are confidential)
CREATE POLICY "Deny all public access to platform_activity_logs" 
ON public.platform_activity_logs FOR ALL 
TO anon, authenticated 
USING (false) 
WITH CHECK (false);

-- 11.7 platform_settings: Public read for 'general' settings (platform name, support info)
CREATE POLICY "Public read general platform_settings" 
ON public.platform_settings FOR SELECT 
TO anon, authenticated 
USING (key = 'general');

-- ==============================================================================
-- 12. PostgREST Schema Reload
-- ==============================================================================
NOTIFY pgrst, 'reload schema';
