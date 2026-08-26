-- ==============================================================================
-- DELIXA MIGRATION: Customer Shipment Confirmation Link System & Security RPCs
-- ==============================================================================

-- 1. Ensure required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Add Customer Confirmation & Link Analytics Columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmation_token VARCHAR(128);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmation_token_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS link_opened_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS last_link_opened_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS link_open_count INTEGER DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_response_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_responded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_selected_date DATE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_selected_from VARCHAR(50);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_selected_to VARCHAR(50);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_note TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_cancellation_reason TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_source VARCHAR(50);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_timestamp TIMESTAMP WITH TIME ZONE;

-- 3. Ensure Unique and Fast Lookups on confirmation_token
CREATE INDEX IF NOT EXISTS idx_orders_confirmation_token ON public.orders(confirmation_token);

-- 4. Ensure order_events table exists
CREATE TABLE IF NOT EXISTS public.order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    actor VARCHAR(50) NOT NULL,
    actor_name VARCHAR(255),
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON public.order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_company_id ON public.order_events(company_id);

-- 5. Secure PostgreSQL RPC: Fetch Public Shipment Details by Token (Without Exposing Internal IDs or Secrets)
CREATE OR REPLACE FUNCTION public.get_public_shipment_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order record;
    v_merchant record;
    v_company record;
    v_clean_token text;
    v_now timestamptz := timezone('utc'::text, now());
BEGIN
    v_clean_token := trim(p_token);
    IF v_clean_token IS NULL OR v_clean_token = '' THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_TOKEN', 'error', 'رمز الرابط غير صالح');
    END IF;

    -- Lookup Order
    SELECT * INTO v_order
    FROM public.orders
    WHERE confirmation_token = v_clean_token
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'error', 'لم يتم العثور على الشحنة');
    END IF;

    -- Check Expiration
    IF v_order.confirmation_token_expires_at IS NOT NULL AND v_order.confirmation_token_expires_at < v_now THEN
        RETURN jsonb_build_object('success', false, 'code', 'EXPIRED', 'error', 'عذراً، هذا الرابط انتهت صلاحيته');
    END IF;

    -- Update open counters
    UPDATE public.orders
    SET 
        link_open_count = COALESCE(link_open_count, 0) + 1,
        last_link_opened_at = v_now,
        link_opened_at = COALESCE(link_opened_at, v_now)
    WHERE id = v_order.id;

    -- Record Order Event
    INSERT INTO public.order_events (company_id, order_id, event_type, actor, actor_name, details, created_at)
    VALUES (
        v_order.company_id,
        v_order.id,
        'link_opened',
        'customer',
        COALESCE(v_order.customer_name, 'العميل'),
        'فتح العميل رابط التأكيد والتتبع من هاتفه (المرة رقم ' || (COALESCE(v_order.link_open_count, 0) + 1)::text || ')',
        v_now
    );

    -- Fetch Merchant Info
    IF v_order.merchant_id IS NOT NULL THEN
        SELECT store_name, brand_name, phone, whatsapp, logo_url INTO v_merchant
        FROM public.merchants
        WHERE id = v_order.merchant_id
        LIMIT 1;
    END IF;

    -- Fetch Company Info
    IF v_order.company_id IS NOT NULL THEN
        SELECT name, phone INTO v_company
        FROM public.companies
        WHERE id = v_order.company_id
        LIMIT 1;
    END IF;

    -- Return strictly sanitized JSON
    RETURN jsonb_build_object(
        'success', true,
        'shipment', jsonb_build_object(
            'token', v_order.confirmation_token,
            'order_number', v_order.order_number,
            'status', v_order.status,
            'customer_name', v_order.customer_name,
            'customer_phone', v_order.customer_phone,
            'customer_address', v_order.customer_address,
            'city_area', v_order.city_area,
            'governorate', v_order.governorate,
            'customer_landmark', v_order.customer_landmark,
            'cod_amount', v_order.cod_amount,
            'delivery_date', v_order.delivery_date,
            'delivery_from', v_order.delivery_from,
            'delivery_to', v_order.delivery_to,
            'customer_response_status', COALESCE(v_order.customer_response_status, 'pending'),
            'customer_responded_at', v_order.customer_responded_at,
            'customer_selected_date', v_order.customer_selected_date,
            'customer_selected_from', v_order.customer_selected_from,
            'customer_selected_to', v_order.customer_selected_to,
            'customer_note', v_order.customer_note,
            'customer_cancellation_reason', v_order.customer_cancellation_reason,
            'created_at', v_order.created_at,
            'link_opened_at', v_order.link_opened_at,
            'link_open_count', COALESCE(v_order.link_open_count, 0) + 1,
            'merchant', jsonb_build_object(
                'store_name', COALESCE(v_merchant.store_name, 'المتجر'),
                'brand_name', v_merchant.brand_name,
                'phone', v_merchant.phone,
                'whatsapp', v_merchant.whatsapp,
                'logo_url', v_merchant.logo_url
            ),
            'company', jsonb_build_object(
                'name', COALESCE(v_company.name, 'Delixa Logistics'),
                'phone', v_company.phone
            )
        )
    );
END;
$$;

-- Grant execution to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_public_shipment_by_token(text) TO anon, authenticated, service_role;
