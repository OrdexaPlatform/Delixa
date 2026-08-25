import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthSession, Company, Profile, Courier, SessionMode } from '../types';
import { db, setDatabaseSessionMode, getDatabaseSessionMode, DEMO_COMPANY_ID, demoDb } from '../lib/db';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const DEMO_ACTIVE_SESSION_KEY = 'delixa_active_demo_session_v2';

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
  sessionMode: SessionMode;
  registerCompany: (params: RegisterCompanyParams) => Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean; message?: string }>;
  loginAdmin: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginCourier: (employeeId: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginDemoUser: (role: 'admin' | 'courier', identifier?: string) => Promise<{ success: boolean; error?: string }>;
  resetDemoData: () => void;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateCompanyProfile: (updates: Partial<Company>) => Promise<{ success: boolean; error?: string }>;
  switchDemoUser?: (type: 'adminCompanyA' | 'adminCompanyB' | 'courierA') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to save or clear active demo session
  const persistDemoSession = (sess: AuthSession | null) => {
    if (sess && sess.mode === 'demo') {
      try {
        localStorage.setItem(DEMO_ACTIVE_SESSION_KEY, JSON.stringify(sess));
      } catch (e) {
        console.warn('Could not persist demo session to localStorage', e);
      }
    } else {
      try {
        localStorage.removeItem(DEMO_ACTIVE_SESSION_KEY);
      } catch (e) {}
    }
  };

  // Restore session on mount: Prioritize active Demo session, else check Supabase Auth
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        // 1. Check for active Demo Session in localStorage
        const storedDemoSessionStr = localStorage.getItem(DEMO_ACTIVE_SESSION_KEY);
        if (storedDemoSessionStr) {
          try {
            const parsed = JSON.parse(storedDemoSessionStr) as AuthSession;
            if (parsed && parsed.company && parsed.profile) {
              setDatabaseSessionMode('demo');
              if (mounted) {
                setSession({
                  ...parsed,
                  mode: 'demo',
                });
                setLoading(false);
              }
              return;
            }
          } catch (demoParseErr) {
            localStorage.removeItem(DEMO_ACTIVE_SESSION_KEY);
          }
        }

        // 2. Otherwise check Supabase Auth for real production session
        setDatabaseSessionMode('production');

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
                const prodSession: AuthSession = {
                  mode: 'production',
                  user: {
                    id: authSession.user.id,
                    email: authSession.user.email || profile.phone,
                  },
                  profile,
                  company,
                  courier,
                };
                setSession(prodSession);
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

    // Supabase auth state change listener (Production only)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, authSession) => {
      // If we are currently in demo mode, ignore Supabase background events
      if (getDatabaseSessionMode() === 'demo' || localStorage.getItem(DEMO_ACTIVE_SESSION_KEY)) {
        return;
      }

      if (event === 'SIGNED_OUT' || !authSession) {
        if (mounted) {
          setSession((prev) => (prev?.profile?.role === 'courier' && !prev?.user?.id ? prev : null));
        }
      } else if (event === 'SIGNED_IN' && authSession.user) {
        const profile = await db.getProfileByAuthUserId(authSession.user.id);
        if (profile) {
          const company = await db.getCompanyById(profile.company_id);
          if (company && mounted) {
            setSession({
              mode: 'production',
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

  // 1. One-Click Instant Demo Login (Zero Supabase calls, isolated to LocalStorage)
  const loginDemoUser = async (role: 'admin' | 'courier', identifier?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setDatabaseSessionMode('demo');

      const company = await demoDb.getCompanyById(DEMO_COMPANY_ID) || (await demoDb.getCompanies())[0];
      if (!company) {
        throw new Error('بيانات الحساب التجريبي غير متوفرة');
      }

      if (role === 'admin') {
        const profiles = await demoDb.getProfiles(company.id);
        const adminProfile = profiles.find(p => p.role === 'admin') || profiles[0];

        const demoSession: AuthSession = {
          mode: 'demo',
          user: {
            id: adminProfile.auth_user_id || adminProfile.id,
            email: company.email,
          },
          profile: adminProfile,
          company,
        };

        persistDemoSession(demoSession);
        setSession(demoSession);
        return { success: true };
      } else {
        // Courier Demo Login
        const couriers = await demoDb.getCouriers(company.id);
        let targetCourier: Courier | undefined;

        if (identifier) {
          targetCourier = couriers.find(
            c => c.employee_id.toLowerCase() === identifier.trim().toLowerCase() || c.id === identifier
          );
        }

        if (!targetCourier) {
          targetCourier = couriers[0]; // fallback to first courier (كريم عادل)
        }

        const profile: Profile = {
          id: targetCourier.profile_id || `prof-${targetCourier.id}`,
          auth_user_id: targetCourier.id,
          company_id: company.id,
          full_name: targetCourier.full_name,
          phone: targetCourier.phone,
          role: 'courier',
          created_at: targetCourier.created_at,
          updated_at: targetCourier.updated_at,
        };

        const demoSession: AuthSession = {
          mode: 'demo',
          user: {
            id: targetCourier.id,
            email: `${targetCourier.employee_id.toLowerCase()}@delixa.eg`,
          },
          profile,
          company,
          courier: targetCourier,
        };

        persistDemoSession(demoSession);
        setSession(demoSession);
        return { success: true };
      }
    } catch (err: any) {
      console.error('Demo login error:', err);
      return { success: false, error: err.message || 'فشل فتح الحساب التجريبي' };
    } finally {
      setLoading(false);
    }
  };

  // Reset Demo Database to default state
  const resetDemoData = () => {
    demoDb.resetDemoDatabase();
    if (session?.mode === 'demo') {
      if (session.profile.role === 'admin') {
        loginDemoUser('admin');
      } else if (session.courier) {
        loginDemoUser('courier', session.courier.employee_id);
      }
    }
  };

  // 2. Register new shipping company (Creates Auth User + Company Record + Admin Profile in Supabase)
  const registerCompany = async (params: RegisterCompanyParams): Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean; message?: string }> => {
    try {
      setDatabaseSessionMode('production');
      persistDemoSession(null);

      if (!isSupabaseConfigured) {
        return { success: false, error: 'يرجى ضبط مفاتيح Supabase (VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY) لتسجيل الحسابات' };
      }

      const email = params.email.trim().toLowerCase();
      const password = params.password;

      // Step 1: Create Supabase Auth User with metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: params.adminFullName.trim(),
            phone: params.phone.trim(),
            company_name: params.companyName.trim(),
            address: params.address?.trim() || 'جمهورية مصر العربية',
          },
        },
      });

      if (authError) {
        if (authError.message?.includes('already registered') || (authError as any).status === 422) {
          return { success: false, error: 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول أو استخدام بريد إلكتروني آخر.' };
        }
        if (authError.message?.toLowerCase().includes('rate limit') || (authError as any).status === 429) {
          return { 
            success: false, 
            error: 'تم تجاوز الحد الأقصى لإرسال رسائل البريد الإلكتروني من مزود Supabase المجاني (Email rate limit exceeded). يرجى تفعيل Custom SMTP في Supabase أو الانتظار لفترة وجيزة.' 
          };
        }
        return { success: false, error: authError.message || 'فشل إنشاء المستخدم في Supabase Auth' };
      }

      const authUser = authData?.user;
      if (!authUser) {
        return { success: false, error: 'تعذر إنشاء حساب المستخدم في Supabase Auth' };
      }

      // Check if email confirmation is required (session is null)
      const hasImmediateSession = Boolean(authData.session);

      // Step 2 & 3: Attempt to create Company & Profile in Supabase
      try {
        let profile = await db.getProfileByAuthUserId(authUser.id);
        let company: Company | null = null;

        if (profile) {
          company = await db.getCompanyById(profile.company_id);
        }

        // If not created by trigger, create company and profile directly
        if (!company) {
          company = await db.createCompany({
            name: params.companyName.trim(),
            phone: params.phone.trim(),
            email,
            address: params.address?.trim() || 'جمهورية مصر العربية',
            logo_url: '',
          });
        }

        if (!profile && company) {
          profile = await db.createProfile({
            auth_user_id: authUser.id,
            company_id: company.id,
            full_name: params.adminFullName.trim(),
            phone: params.phone.trim(),
            role: 'admin',
          });
        }

        if (hasImmediateSession && profile && company) {
          const newSession: AuthSession = {
            mode: 'production',
            user: {
              id: authUser.id,
              email,
            },
            profile,
            company,
          };
          setSession(newSession);
          return { success: true };
        }
      } catch (dbErr: any) {
        console.warn('Direct company/profile insert notice during registration:', dbErr);
      }

      // If email confirmation is required by Supabase
      if (!hasImmediateSession) {
        return {
          success: true,
          requiresEmailConfirmation: true,
          message: 'تم تسجيل حساب الشركة بنجاح! تم إرسال رابط تأكيد إلى بريدك الإلكتروني، يرجى تفعيل الحساب لتسجيل الدخول.',
        };
      }

      return { success: true };
    } catch (err: any) {
      console.error('Registration exception:', err);
      return { success: false, error: err.message || 'حدث خطأ غير متوقع أثناء تسجيل الشركة' };
    }
  };

  // 3. Login Admin via Supabase Auth (Production)
  const loginAdmin = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Check if user is logging into the demo admin email directly from the form
      if (normalizedEmail === 'admin@cairoexpress.eg' || normalizedEmail === 'demo@delixa.eg') {
        return loginDemoUser('admin');
      }

      setDatabaseSessionMode('production');
      persistDemoSession(null);

      if (!isSupabaseConfigured) {
        return { success: false, error: 'يرجى ضبط إعدادات Supabase أولاً' };
      }

      if (!password) {
        return { success: false, error: 'كلمة المرور مطلوبة' };
      }

      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (authError || !authData.user) {
        if (authError?.message?.includes('Email not confirmed') || (authError as any)?.code === 'email_not_confirmed') {
          return { success: false, error: 'بريدك الإلكتروني غير مفعّل بعد. يرجى مراجعة صندوق الوارد والضغط على رابط تأكيد البريد الإلكتروني لتفعيل الحساب.' };
        }
        if (authError?.message?.includes('Invalid login credentials')) {
          return { success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
        }
        return { success: false, error: authError?.message || 'بيانات الدخول غير صحيحة' };
      }

      const authUser = authData.user;

      // Fetch Profile
      let profile = await db.getProfileByAuthUserId(authUser.id);
      
      // Fallback 1: If profile was created before linking auth_user_id, search by company email
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

      // Fallback 2: If profile does not exist yet, auto-provision now
      if (!profile) {
        const meta = authUser.user_metadata || {};
        const comp = await db.createCompany({
          name: meta.company_name || 'شركة الشحن',
          phone: meta.phone || '',
          email: normalizedEmail,
          address: meta.address || 'جمهورية مصر العربية',
        });
        profile = await db.createProfile({
          auth_user_id: authUser.id,
          company_id: comp.id,
          full_name: meta.full_name || 'المدير العام',
          phone: meta.phone || '',
          role: 'admin',
        });
      }

      if (!profile) {
        return { success: false, error: 'لم يتم العثور على ملف المدير المرتبط بهذا الحساب' };
      }

      const company = await db.getCompanyById(profile.company_id);
      if (!company) {
        return { success: false, error: 'شركة الشحن التابع لها الحساب غير متوفرة' };
      }

      const newSession: AuthSession = {
        mode: 'production',
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

  // 4. Login Courier using Employee ID + Password
  const loginCourier = async (employeeId: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!employeeId || !employeeId.trim()) {
        return { success: false, error: 'يرجى إدخال كود الموظف' };
      }

      const cleanEmpId = employeeId.trim().toUpperCase();

      // Check if this is one of the Demo couriers (CR-101, CR-102, CR-103)
      if (['CR-101', 'CR-102', 'CR-103'].includes(cleanEmpId)) {
        const demoCourier = await demoDb.getCourierByEmployeeId(cleanEmpId);
        if (demoCourier) {
          if (password) {
            const isMatch = demoDb.verifyCourierPassword(demoCourier, password);
            if (!isMatch) {
              return { success: false, error: 'كلمة المرور غير صحيحة' };
            }
          }
          return loginDemoUser('courier', cleanEmpId);
        }
      }

      // Otherwise look up in Production Supabase database
      setDatabaseSessionMode('production');
      persistDemoSession(null);

      const courier = await db.getCourierByEmployeeId(cleanEmpId);
      if (!courier) {
        return { success: false, error: 'كود الموظف غير صحيح أو غير مسجل' };
      }

      if (courier.status !== 'active') {
        return { success: false, error: 'حساب المندوب غير نشط، يرجى مراجعة إدارة الشركة' };
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

      // Format standard courier auth email
      const cleanCompanyFragment = courier.company_id.replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase();
      const cleanEmpFragment = cleanEmpId.replace(/[^a-z0-9]/gi, '').toLowerCase();
      const courierEmail = `${cleanEmpFragment}.${cleanCompanyFragment}@courier.delixa.app`;

      // 1. Verify password & authenticate with Supabase Auth
      let authUserId = profile?.auth_user_id;
      if (password) {
        // First try standard Supabase Auth Sign In
        if (isSupabaseConfigured) {
          const { data: authData } = await supabase.auth.signInWithPassword({
            email: courierEmail,
            password: password,
          });
          if (authData?.user) {
            authUserId = authData.user.id;
          }
        }

        // Verify password hash
        const isMatch = db.verifyCourierPassword(courier, password);
        if (!isMatch && !authUserId) {
          return { success: false, error: 'كلمة المرور غير صحيحة' };
        }
      }

      const newSession: AuthSession = {
        mode: 'production',
        user: {
          id: authUserId || profile.auth_user_id,
          email: courierEmail,
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

  // 5. Update Company Details
  const updateCompanyProfile = async (updates: Partial<Company>): Promise<{ success: boolean; error?: string }> => {
    if (!session || session.profile.role !== 'admin') {
      return { success: false, error: 'غير مصرح لك بتعديل بيانات الشركة' };
    }
    const updated = await db.updateCompany(session.company.id, updates);
    if (!updated) {
      return { success: false, error: 'فشل تحديث بيانات الشركة' };
    }
    const updatedSession = {
      ...session,
      company: updated,
    };
    if (session.mode === 'demo') {
      persistDemoSession(updatedSession);
    }
    setSession(updatedSession);
    return { success: true };
  };

  // 6. Password Reset Request via Supabase Auth
  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!isSupabaseConfigured) {
        return { success: false, error: 'يرجى ضبط مفاتيح Supabase أولاً' };
      }
      const normalizedEmail = email.trim().toLowerCase();
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        if (error.message?.includes('rate limit')) {
          return { success: false, error: 'تم تجاوز الحد الأقصى لإرسال رسائل البريد الإلكتروني. يرجى الانتظار بضع دقائق ثم المحاولة مجدداً.' };
        }
        return { success: false, error: error.message || 'فشل إرسال رابط استعادة كلمة المرور' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'حدث خطأ أثناء طلب استعادة كلمة المرور' };
    }
  };

  // 7. Logout (Clears Demo or Supabase Auth session)
  const logout = async () => {
    try {
      if (session?.mode === 'demo' || localStorage.getItem(DEMO_ACTIVE_SESSION_KEY)) {
        persistDemoSession(null);
        setDatabaseSessionMode('production');
      } else {
        if (isSupabaseConfigured) {
          await supabase.auth.signOut();
        }
      }
    } catch (e) {
      console.warn('Sign out notice:', e);
    } finally {
      setSession(null);
      setDatabaseSessionMode('production');
    }
  };

  // 8. Backward-compatible switchDemoUser
  const switchDemoUser = async (type: 'adminCompanyA' | 'adminCompanyB' | 'courierA') => {
    if (type === 'adminCompanyA' || type === 'adminCompanyB') {
      await loginDemoUser('admin');
    } else {
      await loginDemoUser('courier', 'CR-101');
    }
  };

  const value: AuthContextType = {
    session,
    loading,
    isConfigured: isSupabaseConfigured,
    sessionMode: session?.mode || getDatabaseSessionMode(),
    registerCompany,
    loginAdmin,
    loginCourier,
    loginDemoUser,
    resetDemoData,
    logout,
    resetPassword,
    updateCompanyProfile,
    switchDemoUser,
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
