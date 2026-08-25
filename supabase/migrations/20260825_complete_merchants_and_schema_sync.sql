-- ==============================================================================
-- DELIXA MIGRATION: Complete Merchants Table Schema Synchronization & RLS Hardening
-- ==============================================================================

-- 1. Ensure required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Ensure merchant_status ENUM exists safely
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'merchant_status') THEN
        CREATE TYPE merchant_status AS ENUM ('active', 'inactive');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Ensure merchants table exists with full base structure
CREATE TABLE IF NOT EXISTS public.merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    store_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255),
    brand_name VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    whatsapp VARCHAR(50),
    email VARCHAR(255),
    address TEXT NOT NULL,
    logo_url TEXT,
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Idempotently add all columns to public.merchants to match Merchant interface exactly
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS store_name VARCHAR(255);
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255);
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS brand_name VARCHAR(255);
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50);
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 5. Backfill/migrate legacy column names if any existed
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'merchants' AND column_name = 'business_name'
    ) THEN
        UPDATE public.merchants 
        SET store_name = COALESCE(store_name, business_name) 
        WHERE store_name IS NULL OR store_name = '';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'merchants' AND column_name = 'name'
    ) THEN
        UPDATE public.merchants 
        SET store_name = COALESCE(store_name, name) 
        WHERE store_name IS NULL OR store_name = '';
    END IF;
END $$;

-- 6. Ensure indices for query performance
CREATE INDEX IF NOT EXISTS idx_merchants_company_id ON public.merchants(company_id);
CREATE INDEX IF NOT EXISTS idx_merchants_status ON public.merchants(status);
CREATE INDEX IF NOT EXISTS idx_merchants_phone ON public.merchants(phone);

-- 7. Enable Row Level Security (RLS) and enforce strict multi-tenant isolation
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

-- Helper security functions
CREATE OR REPLACE FUNCTION public.get_auth_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  RETURN v_company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  RETURN (v_role = 'admin');
END;
$$;

-- Drop and recreate clear, secure RLS policies for merchants table
DROP POLICY IF EXISTS "Admins can view company merchants" ON public.merchants;
DROP POLICY IF EXISTS "Admins can insert merchants" ON public.merchants;
DROP POLICY IF EXISTS "Admins can update merchants" ON public.merchants;
DROP POLICY IF EXISTS "Admins can delete merchants" ON public.merchants;

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

-- 8. Reload PostgREST schema cache to ensure all columns (email, whatsapp, brand_name, etc.) are instantly recognized
NOTIFY pgrst, 'reload schema';
