-- ==============================================================================
-- DELIXA MIGRATION: Fix brand_name in merchants and courier profiles
-- ==============================================================================

-- 1. Ensure brand_name column exists in merchants table
ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS brand_name VARCHAR(255);

-- 2. Ensure profiles table correctly references auth.users
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'auth_user_id'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Update handle_new_user trigger function to support Courier auth users without creating new companies
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_val TEXT;
  existing_company_id UUID;
  user_full_name TEXT;
  user_phone TEXT;
  user_company_name TEXT;
  user_address TEXT;
  new_company_id UUID;
BEGIN
  user_role_val := COALESCE(new.raw_user_meta_data->>'role', 'admin');
  user_full_name := COALESCE(new.raw_user_meta_data->>'full_name', 'مستخدم جديد');
  user_phone := COALESCE(new.raw_user_meta_data->>'phone', '');

  -- IF USER IS A COURIER:
  IF user_role_val = 'courier' THEN
    IF (new.raw_user_meta_data->>'company_id') IS NOT NULL THEN
      existing_company_id := (new.raw_user_meta_data->>'company_id')::uuid;
      
      -- Insert or update profile for courier
      INSERT INTO public.profiles (auth_user_id, company_id, full_name, phone, role)
      VALUES (
        new.id,
        existing_company_id,
        user_full_name,
        user_phone,
        'courier'
      )
      ON CONFLICT (auth_user_id) DO UPDATE 
      SET full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone;
    END IF;
    RETURN new;
  END IF;

  -- IF USER IS AN ADMIN (NEW COMPANY REGISTRATION):
  user_company_name := COALESCE(new.raw_user_meta_data->>'company_name', 'شركة شحن جديدة');
  user_address := COALESCE(new.raw_user_meta_data->>'address', 'جمهورية مصر العربية');

  -- Create company record
  INSERT INTO public.companies (name, phone, email, address, delivery_slots)
  VALUES (
    user_company_name,
    user_phone,
    COALESCE(new.email, user_phone || '@delixa.eg'),
    user_address,
    '[{"id":"slot-1","name":"الفترة الصباحية (Morning)","from_time":"10:00","to_time":"14:00","is_active":true},{"id":"slot-2","name":"الفترة المسائية (Evening)","from_time":"17:00","to_time":"21:00","is_active":true}]'::jsonb
  )
  RETURNING id INTO new_company_id;

  -- Create admin profile
  INSERT INTO public.profiles (auth_user_id, company_id, full_name, phone, role)
  VALUES (
    new.id,
    new_company_id,
    user_full_name,
    user_phone,
    'admin'
  )
  ON CONFLICT (auth_user_id) DO UPDATE
  SET company_id = new_company_id,
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Reload PostgREST schema cache to ensure brand_name and all columns are detected
NOTIFY pgrst, 'reload schema';
