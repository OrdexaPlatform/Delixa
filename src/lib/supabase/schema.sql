-- ==============================================================================
-- DELIXA - Multi-Tenant Database Schema for Supabase / PostgreSQL
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
CREATE TYPE user_role AS ENUM ('admin', 'courier');

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    role user_role NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. COURIERS TABLE
CREATE TYPE courier_status AS ENUM ('active', 'inactive');

CREATE TABLE IF NOT EXISTS public.couriers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
CREATE TYPE merchant_status AS ENUM ('active', 'inactive');

CREATE TABLE IF NOT EXISTS public.merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    store_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    notes TEXT,
    status merchant_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. ORDERS TABLE
CREATE TYPE order_status AS ENUM ('pending', 'assigned', 'out_for_delivery', 'delivered', 'failed', 'returned', 'cancelled');
CREATE TYPE customer_response_status AS ENUM ('pending', 'confirmed', 'reschedule_requested', 'cancelled');
CREATE TYPE delivery_failure_reason AS ENUM (
    'customer_unavailable', 
    'customer_no_answer', 
    'wrong_phone', 
    'wrong_address', 
    'customer_refused', 
    'customer_requested_reschedule', 
    'other'
);

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
    failure_notes TEXT,

    cancellation_source VARCHAR(50),
    cancellation_timestamp TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_company_order_number UNIQUE (company_id, order_number)
);

-- 6. RETURNS TABLE
CREATE TYPE return_status AS ENUM ('created', 'with_courier', 'returned', 'cancelled');
CREATE TYPE return_reason AS ENUM (
    'customer_refused', 
    'wrong_address', 
    'customer_unavailable', 
    'damaged_shipment', 
    'customer_cancellation', 
    'merchant_request', 
    'other'
);

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
CREATE TYPE order_event_type AS ENUM (
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
CREATE TYPE notification_type AS ENUM (
    'order_assigned',
    'customer_confirmed',
    'customer_rescheduled',
    'customer_cancelled',
    'return_created',
    'return_assigned',
    'return_completed'
);

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

-- INDEXES for fast multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_couriers_company_id ON public.couriers(company_id);
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
