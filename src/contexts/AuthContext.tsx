import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthSession, Company, Profile, Courier } from '../types';
import { db } from '../lib/db';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface RegisterCompanyParams {
  companyName: string;
  adminFullName: string;
  email: string;
  phone: string;
  password: string;
  address?: string;
}

interface AuthContextType {
  session: AuthSession | null;
  loading: boolean;
  isConfigured: boolean;
  registerCompany: (params: RegisterCompanyParams) => Promise<{ success: boolean; error?: string }>;
  loginAdmin: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginCourier: (employeeId: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateCompanyProfile: (updates: Partial<Company>) => Promise<{ success: boolean; error?: string }>;
  switchDemoUser?: (type: 'adminCompanyA' | 'adminCompanyB' | 'courierA') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Restore session from Supabase Auth
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        if (!isSupabaseConfigured) {
          if (mounted) setLoading(false);
          return;
        }

        const { data: { session: authSession } } = await supabase.auth.getSession();

        if (authSession?.user) {
          const profile = await db.getProfileByAuthUserId(authSession.user.id);
          if (profile) {
            const company = await db.getCompanyById(profile.company_id);
            if (company) {
              let courier: Courier | undefined = undefined;
              if (profile.role === 'courier') {
                const couriers = await db.getCouriers(company.id);
                courier = couriers.find(c => c.profile_id === profile.id) || undefined;
              }

              if (mounted) {
                setSession({
                  user: {
                    id: authSession.user.id,
                    email: authSession.user.email || profile.phone,
                  },
                  profile,
                  company,
                  courier,
                });
              }
            }
          }
        }
      } catch (err) {
        console.error('Session restoration error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initSession();

    // Supabase auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, authSession) => {
      if (event === 'SIGNED_OUT' || !authSession) {
        if (mounted) {
          // If not a courier-only session
          setSession((prev) => (prev?.profile?.role === 'courier' && !prev?.user?.id ? prev : null));
        }
      } else if (event === 'SIGNED_IN' && authSession.user) {
        const profile = await db.getProfileByAuthUserId(authSession.user.id);
        if (profile) {
          const company = await db.getCompanyById(profile.company_id);
          if (company && mounted) {
            setSession({
              user: {
                id: authSession.user.id,
                email: authSession.user.email || profile.phone,
              },
              profile,
              company,
            });
          }
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 1. Register new shipping company (Creates Auth User + Company Record + Admin Profile)
  const registerCompany = async (params: RegisterCompanyParams): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!isSupabaseConfigured) {
        return { success: false, error: 'يرجى ربط مفاتيح Supabase (VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY) لتسجيل الحسابات' };
      }

      const email = params.email.trim().toLowerCase();
      const password = params.password;

      // Step 1: Create Supabase Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: params.adminFullName.trim(),
            phone: params.phone.trim(),
            company_name: params.companyName.trim(),
          },
        },
      });

      if (authError) {
        return { success: false, error: authError.message || 'فشل إنشاء المستخدم في Supabase Auth' };
      }

      const authUser = authData.user;
      if (!authUser) {
        return { success: false, error: 'تعذر الحصول على حساب المستخدم المسجل' };
      }

      // Step 2: Create Company in Supabase
      const company = await db.createCompany({
        name: params.companyName.trim(),
        phone: params.phone.trim(),
        email,
        address: params.address?.trim() || 'جمهورية مصر العربية',
        logo_url: '',
      });

      // Step 3: Create Admin Profile in Supabase
      const profile = await db.createProfile({
        auth_user_id: authUser.id,
        company_id: company.id,
        full_name: params.adminFullName.trim(),
        phone: params.phone.trim(),
        role: 'admin',
      });

      // Step 4: Establish Session
      const newSession: AuthSession = {
        user: {
          id: authUser.id,
          email,
        },
        profile,
        company,
      };

      setSession(newSession);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'حدث خطأ أثناء تسجيل الشركة' };
    }
  };

  // 2. Login Admin via Supabase Auth
  const loginAdmin = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!isSupabaseConfigured) {
        return { success: false, error: 'يرجى ضبط إعدادات Supabase أولاً' };
      }

      if (!password) {
        return { success: false, error: 'كلمة المرور مطلوبة' };
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (authError || !authData.user) {
        return { success: false, error: authError?.message || 'بيانات الدخول غير صحيحة' };
      }

      const authUser = authData.user;

      // Fetch Profile
      let profile = await db.getProfileByAuthUserId(authUser.id);
      
      // Fallback: If profile by auth_user_id was not linked yet, search by company email
      if (!profile) {
        const companies = await db.getCompanies();
        const comp = companies.find(c => c.email.toLowerCase() === normalizedEmail);
        if (comp) {
          const profiles = await db.getProfiles(comp.id);
          const adminProf = profiles.find(p => p.role === 'admin');
          if (adminProf) {
            await db.updateProfile(adminProf.id, { auth_user_id: authUser.id });
            profile = { ...adminProf, auth_user_id: authUser.id };
          }
        }
      }

      if (!profile) {
        return { success: false, error: 'لم يتم العثور على ملف المدير المرتبط بهذا الحساب' };
      }

      const company = await db.getCompanyById(profile.company_id);
      if (!company) {
        return { success: false, error: 'شركة الشحن التابع لها الحساب غير متوفرة' };
      }

      const newSession: AuthSession = {
        user: {
          id: authUser.id,
          email: normalizedEmail,
        },
        profile,
        company,
      };

      setSession(newSession);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'فشل تسجيل الدخول' };
    }
  };

  // 3. Login Courier using Employee ID + Password
  const loginCourier = async (employeeId: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!employeeId || !employeeId.trim()) {
        return { success: false, error: 'يرجى إدخال كود الموظف' };
      }

      const courier = await db.getCourierByEmployeeId(employeeId);
      if (!courier) {
        return { success: false, error: 'كود الموظف غير صحيح أو غير مسجل' };
      }

      if (courier.status !== 'active') {
        return { success: false, error: 'حساب المندوب غير نشط، يرجى مراجعة إدارة الشركة' };
      }

      if (password) {
        const isMatch = db.verifyCourierPassword(courier, password);
        if (!isMatch) {
          return { success: false, error: 'كلمة المرور غير صحيحة' };
        }
      }

      const company = await db.getCompanyById(courier.company_id);
      if (!company) {
        return { success: false, error: 'شركة الشحن التابع لها المندوب غير متوفرة' };
      }

      let profile = courier.profile_id ? await db.getProfileById(courier.profile_id) : null;
      if (!profile) {
        profile = {
          id: courier.profile_id || courier.id,
          auth_user_id: courier.id,
          company_id: courier.company_id,
          full_name: courier.full_name,
          phone: courier.phone,
          role: 'courier',
          created_at: courier.created_at,
          updated_at: courier.updated_at,
        };
      }

      const newSession: AuthSession = {
        user: {
          id: profile.auth_user_id || courier.id,
          email: `${courier.employee_id.toLowerCase()}@delixa.eg`,
        },
        profile,
        company,
        courier,
      };

      setSession(newSession);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'فشل تسجيل دخول المندوب' };
    }
  };

  // 4. Update Company Details
  const updateCompanyProfile = async (updates: Partial<Company>): Promise<{ success: boolean; error?: string }> => {
    if (!session || session.profile.role !== 'admin') {
      return { success: false, error: 'غير مصرح لك بتعديل بيانات الشركة' };
    }
    const updated = await db.updateCompany(session.company.id, updates);
    if (!updated) {
      return { success: false, error: 'فشل تحديث بيانات الشركة' };
    }
    setSession({
      ...session,
      company: updated,
    });
    return { success: true };
  };

  const logout = async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    setSession(null);
  };

  const value: AuthContextType = {
    session,
    loading,
    isConfigured: isSupabaseConfigured,
    registerCompany,
    loginAdmin,
    loginCourier,
    logout,
    updateCompanyProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
