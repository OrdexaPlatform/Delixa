-- ==============================================================================
-- DELIXA - Row Level Security (RLS) Policies
-- Multi-Tenant Data Isolation for Supabase / PostgreSQL
-- ==============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 2. Helper Security Definer Functions

-- Get company_id of the currently authenticated user
CREATE OR REPLACE FUNCTION public.get_auth_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Check if currently authenticated user is an admin of their company
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

-- Get courier ID of current authenticated user (if they are a courier)
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

-- ==============================================================================
-- COMPANIES POLICIES
-- ==============================================================================
CREATE POLICY "Admins can view their own company"
  ON public.companies
  FOR SELECT
  USING (id = public.get_auth_company_id());

CREATE POLICY "Admins can update their own company"
  ON public.companies
  FOR UPDATE
  USING (id = public.get_auth_company_id() AND public.is_company_admin())
  WITH CHECK (id = public.get_auth_company_id());

-- ==============================================================================
-- PROFILES POLICIES
-- ==============================================================================
CREATE POLICY "Users can view company profiles"
  ON public.profiles
  FOR SELECT
  USING (company_id = public.get_auth_company_id());

CREATE POLICY "Admins can insert company profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (company_id = public.get_auth_company_id() AND public.is_company_admin());

CREATE POLICY "Admins can update company profiles"
  ON public.profiles
  FOR UPDATE
  USING (company_id = public.get_auth_company_id() AND public.is_company_admin());

-- ==============================================================================
-- COURIERS POLICIES
-- ==============================================================================
CREATE POLICY "View couriers policy"
  ON public.couriers
  FOR SELECT
  USING (
    company_id = public.get_auth_company_id() AND (
      public.is_company_admin() OR id = public.get_auth_courier_id()
    )
  );

CREATE POLICY "Admins can insert couriers"
  ON public.couriers
  FOR INSERT
  WITH CHECK (company_id = public.get_auth_company_id() AND public.is_company_admin());

CREATE POLICY "Admins can update couriers"
  ON public.couriers
  FOR UPDATE
  USING (company_id = public.get_auth_company_id() AND public.is_company_admin())
  WITH CHECK (company_id = public.get_auth_company_id());

CREATE POLICY "Admins can delete couriers"
  ON public.couriers
  FOR DELETE
  USING (company_id = public.get_auth_company_id() AND public.is_company_admin());

-- ==============================================================================
-- MERCHANTS POLICIES
-- ==============================================================================
CREATE POLICY "Admins can view company merchants"
  ON public.merchants
  FOR SELECT
  USING (company_id = public.get_auth_company_id() AND public.is_company_admin());

CREATE POLICY "Admins can insert merchants"
  ON public.merchants
  FOR INSERT
  WITH CHECK (company_id = public.get_auth_company_id() AND public.is_company_admin());

CREATE POLICY "Admins can update merchants"
  ON public.merchants
  FOR UPDATE
  USING (company_id = public.get_auth_company_id() AND public.is_company_admin())
  WITH CHECK (company_id = public.get_auth_company_id());

CREATE POLICY "Admins can delete merchants"
  ON public.merchants
  FOR DELETE
  USING (company_id = public.get_auth_company_id() AND public.is_company_admin());

-- ==============================================================================
-- ORDERS POLICIES
-- ==============================================================================
CREATE POLICY "Orders view policy"
  ON public.orders
  FOR SELECT
  USING (
    company_id = public.get_auth_company_id() AND (
      public.is_company_admin() OR courier_id = public.get_auth_courier_id()
    )
  );

CREATE POLICY "Admins can insert orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (company_id = public.get_auth_company_id() AND public.is_company_admin());

CREATE POLICY "Admins can update orders"
  ON public.orders
  FOR UPDATE
  USING (company_id = public.get_auth_company_id() AND public.is_company_admin())
  WITH CHECK (company_id = public.get_auth_company_id());

CREATE POLICY "Couriers can update status of their assigned orders"
  ON public.orders
  FOR UPDATE
  USING (
    company_id = public.get_auth_company_id()
    AND courier_id = public.get_auth_courier_id()
  );

CREATE POLICY "Admins can delete orders"
  ON public.orders
  FOR DELETE
  USING (company_id = public.get_auth_company_id() AND public.is_company_admin());

-- ==============================================================================
-- RETURNS POLICIES
-- ==============================================================================
CREATE POLICY "Returns view policy"
  ON public.returns
  FOR SELECT
  USING (
    company_id = public.get_auth_company_id() AND (
      public.is_company_admin() OR courier_id = public.get_auth_courier_id()
    )
  );

CREATE POLICY "Admins can insert returns"
  ON public.returns
  FOR INSERT
  WITH CHECK (company_id = public.get_auth_company_id() AND public.is_company_admin());

CREATE POLICY "Admins can update returns"
  ON public.returns
  FOR UPDATE
  USING (company_id = public.get_auth_company_id() AND public.is_company_admin())
  WITH CHECK (company_id = public.get_auth_company_id());

CREATE POLICY "Couriers can update status of assigned returns"
  ON public.returns
  FOR UPDATE
  USING (
    company_id = public.get_auth_company_id()
    AND courier_id = public.get_auth_courier_id()
  );

-- ==============================================================================
-- ORDER AUDIT EVENTS POLICIES
-- ==============================================================================
CREATE POLICY "View audit events policy"
  ON public.order_events
  FOR SELECT
  USING (
    company_id = public.get_auth_company_id() AND (
      public.is_company_admin() OR EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = public.order_events.order_id 
          AND o.courier_id = public.get_auth_courier_id()
      )
    )
  );

CREATE POLICY "Insert audit events policy"
  ON public.order_events
  FOR INSERT
  WITH CHECK (company_id = public.get_auth_company_id());

-- ==============================================================================
-- NOTIFICATIONS POLICIES
-- ==============================================================================
CREATE POLICY "Users can view their notifications"
  ON public.notifications
  FOR SELECT
  USING (
    company_id = public.get_auth_company_id() AND (
      (recipient_role = 'admin' AND public.is_company_admin()) OR
      (recipient_role = 'courier' AND recipient_courier_id = public.get_auth_courier_id())
    )
  );

CREATE POLICY "Users can mark their notifications as read"
  ON public.notifications
  FOR UPDATE
  USING (
    company_id = public.get_auth_company_id() AND (
      (recipient_role = 'admin' AND public.is_company_admin()) OR
      (recipient_role = 'courier' AND recipient_courier_id = public.get_auth_courier_id())
    )
  );

-- ==============================================================================
-- PUBLIC CUSTOMER SELF-SERVICE RPC (SECURITY DEFINER)
-- Unauthenticated customers can only access their specific order via token
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_order_by_token(p_token VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'order', jsonb_build_object(
      'id', o.id,
      'order_number', o.order_number,
      'customer_name', o.customer_name,
      'customer_phone', o.customer_phone,
      'governorate', o.governorate,
      'city_area', o.city_area,
      'customer_address', o.customer_address,
      'customer_landmark', o.customer_landmark,
      'cod_amount', o.cod_amount,
      'delivery_date', o.delivery_date,
      'delivery_from', o.delivery_from,
      'delivery_to', o.delivery_to,
      'status', o.status,
      'customer_response_status', o.customer_response_status,
      'customer_selected_date', o.customer_selected_date,
      'customer_selected_from', o.customer_selected_from,
      'customer_selected_to', o.customer_selected_to,
      'customer_note', o.customer_note,
      'customer_responded_at', o.customer_responded_at
    ),
    'merchant', jsonb_build_object(
      'store_name', m.store_name,
      'phone', m.phone
    ),
    'company', jsonb_build_object(
      'name', c.name,
      'phone', c.phone,
      'delivery_slots', c.delivery_slots
    )
  ) INTO v_result
  FROM public.orders o
  JOIN public.companies c ON c.id = o.company_id
  LEFT JOIN public.merchants m ON m.id = o.merchant_id
  WHERE o.confirmation_token = trim(p_token);

  RETURN v_result;
END;
$$;
