-- ==============================================================================
-- DELIXA - Complete Multi-Tenant Database Schema & RLS for Supabase
-- System: Shipping Operations & Last-Mile Delivery Management (Egypt)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. COMPANIES TABLE
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    logo_url TEXT,
    delivery_slots JSONB DEFAULT '[{"id":"slot-1","name":"الفترة الصباحية (Morning)","from_time":"10:00","to_time":"14:00","is_active":true},{"id":"slot-2","name":"الفترة المسائية (Evening)","from_time":"17:00","to_time":"21:00","is_active":true}]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PROFILES TABLE (Linked to auth.users and companies)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'courier');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    role user_role NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. COURIERS TABLE
DO $$ BEGIN
    CREATE TYPE courier_status AS ENUM ('active', 'inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.couriers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    employee_id VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    area VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    status courier_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_company_employee_id UNIQUE (company_id, employee_id)
);

-- 4. MERCHANTS TABLE
DO $$ BEGIN
    CREATE TYPE merchant_status AS ENUM ('active', 'inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. ORDERS TABLE
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'assigned', 'out_for_delivery', 'delivered', 'failed', 'returned', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE customer_response_status AS ENUM ('pending', 'confirmed', 'reschedule_requested', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    cod_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (cod_amount >= 0),
    delivery_date DATE,
    delivery_from TIME,
    delivery_to TIME,
    notes TEXT,
    status order_status NOT NULL DEFAULT 'pending',
    
    -- Confirmation & Tracking Token (Public Access)
    confirmation_token VARCHAR(64) UNIQUE,
    confirmation_sent_at TIMESTAMP WITH TIME ZONE,
    customer_response_status customer_response_status DEFAULT 'pending',
    customer_selected_date DATE,
    customer_selected_from TIME,
    customer_selected_to TIME,
    customer_note TEXT,
    customer_responded_at TIMESTAMP WITH TIME ZONE,

    -- Execution Timestamps & Audit
    assigned_at TIMESTAMP WITH TIME ZONE,
    delivery_started_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    delivered_by VARCHAR(255),
    delivered_by_courier_id UUID REFERENCES public.couriers(id),
    
    failed_at TIMESTAMP WITH TIME ZONE,
    failed_by VARCHAR(255),
    failure_reason VARCHAR(100),
    failure_note TEXT,
    failure_notes TEXT,

    cancellation_source VARCHAR(50),
    cancellation_timestamp TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_company_order_number UNIQUE (company_id, order_number)
);

-- 6. RETURNS TABLE
DO $$ BEGIN
    CREATE TYPE return_status AS ENUM ('created', 'with_courier', 'returned', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE return_reason AS ENUM (
        'customer_refused', 
        'wrong_address', 
        'customer_unavailable', 
        'damaged_shipment', 
        'customer_cancellation', 
        'merchant_request', 
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE RESTRICT,
    courier_id UUID REFERENCES public.couriers(id) ON DELETE SET NULL,
    return_number VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    return_address TEXT NOT NULL,
    return_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (return_amount >= 0),
    return_shipping_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (return_shipping_cost >= 0),
    other_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (other_cost >= 0),
    total_return_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_return_amount >= 0),
    return_reason return_reason NOT NULL,
    other_reason TEXT,
    notes TEXT,
    status return_status NOT NULL DEFAULT 'created',
    created_by VARCHAR(255) NOT NULL,
    returned_at TIMESTAMP WITH TIME ZONE,
    returned_by VARCHAR(255),
    returned_by_courier_id UUID REFERENCES public.couriers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_company_return_number UNIQUE (company_id, return_number),
    CONSTRAINT uq_order_return UNIQUE (order_id)
);

-- 7. ORDER AUDIT EVENTS TABLE
DO $$ BEGIN
    CREATE TYPE order_event_type AS ENUM (
        'created',
        'order_created',
        'status_changed',
        'courier_assigned',
        'whatsapp_sent',
        'link_opened',
        'customer_confirmed',
        'customer_rescheduled',
        'customer_cancelled',
        'delivery_started',
        'delivered',
        'delivery_failed',
        'return_created',
        'return_started',
        'return_updated',
        'return_completed',
        'return_cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.order_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    return_id UUID REFERENCES public.returns(id) ON DELETE CASCADE,
    event_type order_event_type NOT NULL,
    actor VARCHAR(50) NOT NULL, -- 'admin', 'courier', 'customer', 'system'
    actor_name VARCHAR(255),
    details TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. IN-APP NOTIFICATIONS TABLE
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'order_assigned',
        'customer_confirmed',
        'customer_rescheduled',
        'customer_cancelled',
        'return_created',
        'return_assigned',
        'return_completed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    recipient_role user_role NOT NULL,
    recipient_courier_id UUID REFERENCES public.couriers(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    order_number VARCHAR(100),
    return_id UUID REFERENCES public.returns(id) ON DELETE CASCADE,
    return_number VARCHAR(100),
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. COURIER SETTLEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.courier_settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    courier_id UUID NOT NULL REFERENCES public.couriers(id) ON DELETE CASCADE,
    settlement_number VARCHAR(100) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    received_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    expected_amount NUMERIC(12, 2) DEFAULT 0.00,
    remaining_amount NUMERIC(12, 2) DEFAULT 0.00,
    orders_count INTEGER NOT NULL DEFAULT 0,
    settled_by VARCHAR(255) NOT NULL,
    settled_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_company_courier_settlement_number UNIQUE (company_id, settlement_number)
);

ALTER TABLE public.courier_settlements ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.courier_settlements ADD COLUMN IF NOT EXISTS received_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.courier_settlements ADD COLUMN IF NOT EXISTS expected_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.courier_settlements ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.courier_settlements ADD COLUMN IF NOT EXISTS orders_count INTEGER DEFAULT 0;
ALTER TABLE public.courier_settlements ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.courier_settlements ADD COLUMN IF NOT EXISTS settled_by VARCHAR(255);
ALTER TABLE public.courier_settlements ADD COLUMN IF NOT EXISTS settled_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.courier_settlements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 10. MERCHANT TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.merchant_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'cod_delivered', 'return_shipping_fee', 'payout_settlement', 'adjustment_credit', 'adjustment_debit'
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    description TEXT NOT NULL,
    reference_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    reference_return_id UUID REFERENCES public.returns(id) ON DELETE SET NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. MERCHANT SETTLEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.merchant_settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    settlement_number VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'payout_to_merchant', -- 'payout_to_merchant', 'collection_from_merchant', 'debt_collection', 'net_settlement'
    settlement_type VARCHAR(50),
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_cod NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_shipping_fees NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    deducted_shipping_fees NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_return_costs NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_payout NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    expected_amount NUMERIC(12, 2) DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) DEFAULT 0.00,
    remaining_amount NUMERIC(12, 2) DEFAULT 0.00,
    orders_count INTEGER DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'cash',
    notes TEXT,
    settled_by VARCHAR(255) NOT NULL,
    settled_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_company_merchant_settlement_number UNIQUE (company_id, settlement_number)
);

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

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_couriers_company_id ON public.couriers(company_id);
CREATE INDEX IF NOT EXISTS idx_couriers_employee_id ON public.couriers(employee_id);
CREATE INDEX IF NOT EXISTS idx_merchants_company_id ON public.merchants(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON public.orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_courier_id ON public.orders(courier_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON public.orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_token ON public.orders(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_returns_company_id ON public.returns(company_id);
CREATE INDEX IF NOT EXISTS idx_returns_courier_id ON public.returns(courier_id);
CREATE INDEX IF NOT EXISTS idx_returns_order_id ON public.returns(order_id);
CREATE INDEX IF NOT EXISTS idx_events_order_id ON public.order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_events_company_id ON public.order_events(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company_recipient ON public.notifications(company_id, recipient_role, recipient_courier_id, read);
CREATE INDEX IF NOT EXISTS idx_courier_settlements_company_id ON public.courier_settlements(company_id);
CREATE INDEX IF NOT EXISTS idx_merchant_transactions_company_id ON public.merchant_transactions(company_id, merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_settlements_company_id ON public.merchant_settlements(company_id, merchant_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_settlements ENABLE ROW LEVEL SECURITY;

-- Helper Security Definer Functions
CREATE OR REPLACE FUNCTION public.get_auth_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_auth_courier_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT c.id FROM public.couriers c
  JOIN public.profiles p ON p.id = c.profile_id
  WHERE p.auth_user_id = auth.uid() LIMIT 1;
$$;

-- Companies Policies
CREATE POLICY "Admins can view their own company"
  ON public.companies FOR SELECT
  USING (id = public.get_auth_company_id());

CREATE POLICY "Public registration can insert company"
  ON public.companies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update their own company"
  ON public.companies FOR UPDATE
  USING (id = public.get_auth_company_id() AND public.is_company_admin())
  WITH CHECK (id = public.get_auth_company_id());

-- Profiles Policies
CREATE POLICY "Users can view company profiles"
  ON public.profiles FOR SELECT
  USING (company_id = public.get_auth_company_id() OR auth_user_id = auth.uid());

CREATE POLICY "Users can insert their initial profile or admin inserts"
  ON public.profiles FOR INSERT
  WITH CHECK (auth_user_id = auth.uid() OR (company_id = public.get_auth_company_id() AND public.is_company_admin()) OR auth_user_id IS NULL);

CREATE POLICY "Admins or self can update profile"
  ON public.profiles FOR UPDATE
  USING (auth_user_id = auth.uid() OR (company_id = public.get_auth_company_id() AND public.is_company_admin()));

-- Couriers Policies
CREATE POLICY "Couriers view policy"
  ON public.couriers FOR SELECT
  USING (
    company_id = public.get_auth_company_id() OR
    auth.uid() IS NULL -- Allow public courier auth lookup by employee ID if needed
  );

CREATE POLICY "Admins can insert couriers"
  ON public.couriers FOR INSERT
  WITH CHECK (company_id = public.get_auth_company_id() AND public.is_company_admin());

CREATE POLICY "Admins can update couriers"
  ON public.couriers FOR UPDATE
  USING (company_id = public.get_auth_company_id() AND public.is_company_admin());

CREATE POLICY "Admins can delete couriers"
  ON public.couriers FOR DELETE
  USING (company_id = public.get_auth_company_id() AND public.is_company_admin());

-- Merchants Policies
CREATE POLICY "Merchants view policy"
  ON public.merchants FOR SELECT
  USING (company_id = public.get_auth_company_id());

CREATE POLICY "Admins can insert merchants"
  ON public.merchants FOR INSERT
  WITH CHECK (company_id = public.get_auth_company_id() AND public.is_company_admin());

CREATE POLICY "Admins can update merchants"
  ON public.merchants FOR UPDATE
  USING (company_id = public.get_auth_company_id() AND public.is_company_admin());

CREATE POLICY "Admins can delete merchants"
  ON public.merchants FOR DELETE
  USING (company_id = public.get_auth_company_id() AND public.is_company_admin());

-- Orders Policies
CREATE POLICY "Orders view policy"
  ON public.orders FOR SELECT
  USING (
    company_id = public.get_auth_company_id() OR
    confirmation_token IS NOT NULL -- Allow public lookup via token RPC / query
  );

CREATE POLICY "Admins can insert orders"
  ON public.orders FOR INSERT
  WITH CHECK (company_id = public.get_auth_company_id());

CREATE POLICY "Orders update policy"
  ON public.orders FOR UPDATE
  USING (
    company_id = public.get_auth_company_id() OR
    confirmation_token IS NOT NULL
  );

CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE
  USING (company_id = public.get_auth_company_id() AND public.is_company_admin());

-- Returns Policies
CREATE POLICY "Returns view policy"
  ON public.returns FOR SELECT
  USING (company_id = public.get_auth_company_id());

CREATE POLICY "Returns insert policy"
  ON public.returns FOR INSERT
  WITH CHECK (company_id = public.get_auth_company_id());

CREATE POLICY "Returns update policy"
  ON public.returns FOR UPDATE
  USING (company_id = public.get_auth_company_id());

-- Events Policies
CREATE POLICY "Events view policy"
  ON public.order_events FOR SELECT
  USING (company_id = public.get_auth_company_id() OR auth.uid() IS NULL);

CREATE POLICY "Events insert policy"
  ON public.order_events FOR INSERT
  WITH CHECK (true);

-- Notifications Policies
CREATE POLICY "Notifications view policy"
  ON public.notifications FOR SELECT
  USING (company_id = public.get_auth_company_id());

CREATE POLICY "Notifications insert policy"
  ON public.notifications FOR INSERT
  WITH CHECK (company_id = public.get_auth_company_id());

CREATE POLICY "Notifications update policy"
  ON public.notifications FOR UPDATE
  USING (company_id = public.get_auth_company_id());

-- Settlements Policies
CREATE POLICY "Courier settlements view policy"
  ON public.courier_settlements FOR SELECT
  USING (company_id = public.get_auth_company_id());

CREATE POLICY "Courier settlements insert policy"
  ON public.courier_settlements FOR INSERT
  WITH CHECK (company_id = public.get_auth_company_id() AND public.is_company_admin());

-- Merchant Transactions Policies
CREATE POLICY "Merchant transactions view policy"
  ON public.merchant_transactions FOR SELECT
  USING (company_id = public.get_auth_company_id());

CREATE POLICY "Merchant transactions insert policy"
  ON public.merchant_transactions FOR INSERT
  WITH CHECK (company_id = public.get_auth_company_id() AND public.is_company_admin());

-- Merchant Settlements Policies
CREATE POLICY "Merchant settlements view policy"
  ON public.merchant_settlements FOR SELECT
  USING (company_id = public.get_auth_company_id());

CREATE POLICY "Merchant settlements insert policy"
  ON public.merchant_settlements FOR INSERT
  WITH CHECK (company_id = public.get_auth_company_id() AND public.is_company_admin());

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE orders, order_events, notifications;

-- ==============================================================================
-- 10. SUPER ADMIN PLATFORM TABLES
-- ==============================================================================

-- 10.1 Platform Admins
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

-- 10.2 Platform Sessions
CREATE TABLE IF NOT EXISTS public.platform_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR(255) UNIQUE NOT NULL,
    admin_id UUID NOT NULL REFERENCES public.platform_admins(id) ON DELETE CASCADE,
    ip_address VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 10.3 Platform Subscription Plans
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

-- 10.4 Platform Subscriptions
CREATE TABLE IF NOT EXISTS public.platform_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.platform_subscription_plans(id),
    plan_name VARCHAR(255) NOT NULL,
    plan_code VARCHAR(100) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
    billing_cycle VARCHAR(50) NOT NULL DEFAULT 'monthly',
    is_trial BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10.5 Platform Payments
CREATE TABLE IF NOT EXISTS public.platform_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.platform_subscriptions(id),
    plan_name VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
    payment_method VARCHAR(100) NOT NULL DEFAULT 'bank_transfer',
    transaction_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    invoice_number VARCHAR(100) UNIQUE,
    notes TEXT,
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10.6 Platform Activity Logs
CREATE TABLE IF NOT EXISTS public.platform_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID,
    admin_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(100) NOT NULL,
    target_id VARCHAR(255),
    details TEXT,
    meta JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10.7 Platform System Settings
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_by VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
