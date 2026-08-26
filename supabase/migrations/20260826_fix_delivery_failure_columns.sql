-- ==============================================================================
-- DELIXA MIGRATION: Fix Delivery Failure Columns & PostgREST Schema Cache
-- ==============================================================================

-- 1. Ensure required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Add Delivery Failure & Audit Tracking Columns to public.orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS failed_by VARCHAR(255);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS failure_reason VARCHAR(100);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS failure_note TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS failure_notes TEXT;

-- 3. Add Operational Delivery Timestamps and Courier Tracking
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_by VARCHAR(255);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_by_courier_id UUID REFERENCES public.couriers(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_source VARCHAR(50);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_timestamp TIMESTAMP WITH TIME ZONE;

-- 4. Sync failure_note and failure_notes for backward & forward compatibility
UPDATE public.orders 
SET failure_note = COALESCE(failure_note, failure_notes),
    failure_notes = COALESCE(failure_notes, failure_note)
WHERE failure_note IS NOT NULL OR failure_notes IS NOT NULL;

-- 5. Ensure order_events table has all required columns and indices
CREATE TABLE IF NOT EXISTS public.order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    return_id UUID REFERENCES public.returns(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    actor VARCHAR(50) NOT NULL,
    actor_name VARCHAR(255),
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.order_events ADD COLUMN IF NOT EXISTS return_id UUID REFERENCES public.returns(id) ON DELETE SET NULL;
ALTER TABLE public.order_events ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE public.order_events ADD COLUMN IF NOT EXISTS actor_name VARCHAR(255);
ALTER TABLE public.order_events ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.order_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

CREATE INDEX IF NOT EXISTS idx_orders_failed_at ON public.orders(failed_at);
CREATE INDEX IF NOT EXISTS idx_orders_failure_reason ON public.orders(failure_reason);
CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON public.order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_company_id ON public.order_events(company_id);

-- 6. Reload PostgREST schema cache to instantly recognize the new columns
NOTIFY pgrst, 'reload schema';
