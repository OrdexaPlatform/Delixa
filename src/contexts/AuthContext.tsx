import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { AuthSession, Company, Profile, Courier, SessionMode } from '../types';
import { db, setDatabaseSessionMode, getDatabaseSessionMode, DEMO_COMPANY_ID, demoDb } from '../lib/db';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { normalizeEmployeeId } from '../lib/crypto';

// Separate storage keys for complete isolation between Admin and Courier
const ADMIN_STORAGE_KEY = 'delixa_admin_session_v3';
const COURIER_STORAGE_KEY = 'delixa_courier_session_v3';

interface RegisterCompanyParams {
  companyName: string;
  adminFullName: string;
  email: string;
  phone: string;
  password: string;
  address?: string;
}

interface AuthContextType {
  // Active context-aware session
  session: AuthSession | null;
  adminSession: AuthSession | null;
  courierSession: AuthSession | null;
  activeRole: 'admin' | 'courier' | null;
  loading: boolean;
  isConfigured: boolean;
  sessionMode: SessionMode;

  // Actions
  registerCompany: (params: RegisterCompanyParams) => Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean; message?: string }>;
  loginAdmin: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginCourier: (employeeId: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginDemoUser: (role: 'admin' | 'courier', identifier?: string) => Promise<{ success: boolean; error?: string }>;
  resetDemoData: () => void;
  logout: (targetRole?: 'admin' | 'courier') => Promise<void>;
  logoutAdmin: () => Promise<void>;
  logoutCourier: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateCompanyProfile: (updates: Partial<Company>) => Promise<{ success: boolean; error?: string }>;
  switchDemoUser?: (type: 'adminCompanyA' | 'adminCompanyB' | 'courierA') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminSession, setAdminSession] = useState<AuthSession | null>(null);
  const [courierSession, setCourierSession] = useState<AuthSession | null>(null);
  const [activeRole, setActiveRole] = useState<'admin' | 'courier' | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Persistence helpers
  const saveAdminStorage = (sess: AuthSession | null) => {
    try {
      if (sess && sess.profile.role === 'admin') {
        localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(sess));
      } else {
        localStorage.removeItem(ADMIN_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Could not save admin session to localStorage', e);
    }
  };

  const saveCourierStorage = (sess: AuthSession | null) => {
    try {
      if (sess && sess.profile.role === 'courier') {
        localStorage.setItem(COURIER_STORAGE_KEY, JSON.stringify(sess));
      } else {
        localStorage.removeItem(COURIER_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Could not save courier session to localStorage', e);
    }
  };

  // Determine current active session based on context & route
  const getContextAwareSession = useCallback((): AuthSession | null => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isCourierRoute = currentPath.startsWith('/courier');
    const isAdminRoute = currentPath.startsWith('/admin') || 
      currentPath === '/dashboard' || 
      currentPath === '/merchants' || 
      currentPath === '/couriers' || 
      currentPath === '/orders' || 
      currentPath === '/collections' || 
      currentPath === '/returns' || 
      currentPath === '/reports' || 
      currentPath === '/activity' || 
      currentPath === '/settings';

    if (isCourierRoute) {
      return courierSession;
    }
    if (isAdminRoute) {
      return adminSession;
    }
    if (activeRole === 'courier') {
      return courierSession;
    }
    if (activeRole === 'admin') {
      return adminSession;
    }
    return courierSession || adminSession;
  }, [adminSession, courierSession, activeRole]);

  // Session Restoration on Mount
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        const isCourierRoute = currentPath.startsWith('/courier') || currentPath === '/login/courier' || currentPath === '/courier-login';
        
        let loadedCourier: AuthSession | null = null;
        let loadedAdmin: AuthSession | null = null;

        // 1. Restore Courier Session from dedicated storage
        const storedCourierStr = localStorage.getItem(COURIER_STORAGE_KEY);
        if (storedCourierStr) {
          try {
            const parsed = JSON.parse(storedCourierStr) as AuthSession;
            if (parsed && parsed.profile && parsed.profile.role === 'courier' && parsed.company) {
              loadedCourier = parsed;
            }
          } catch (e) {
            localStorage.removeItem(COURIER_STORAGE_KEY);
          }
        }

        // 2. Restore Admin Session from storage or Supabase Auth
        const storedAdminStr = localStorage.getItem(ADMIN_STORAGE_KEY);
        if (storedAdminStr) {
          try {
            const parsed = JSON.parse(storedAdminStr) as AuthSession;
            if (parsed && parsed.profile && parsed.profile.role === 'admin' && parsed.company) {
              loadedAdmin = parsed;
            }
          } catch (e) {
            localStorage.removeItem(ADMIN_STORAGE_KEY);
          }
        }

        // If no stored admin in localStorage, check Supabase Auth for active production session
        if (!loadedAdmin && isSupabaseConfigured) {
          try {
            const { data: { session: authSession } } = await supabase.auth.getSession();
            if (authSession?.user) {
              const profile = await db.getProfileByAuthUserId(authSession.user.id);
              if (profile && profile.role === 'admin') {
                const company = await db.getCompanyById(profile.company_id);
                if (company) {
                  loadedAdmin = {
                    mode: 'production',
                    user: {
                      id: authSession.user.id,
                      email: authSession.user.email || profile.phone,
                    },
                    profile,
                    company,
                  };
                  saveAdminStorage(loadedAdmin);
                }
              }
            }
          } catch (supErr) {
            console.warn('Supabase auth session check notice:', supErr);
          }
        }

        if (mounted) {
          setCourierSession(loadedCourier);
          setAdminSession(loadedAdmin);

          if (isCourierRoute) {
            setActiveRole('courier');
            setDatabaseSessionMode(loadedCourier?.mode || 'production');
          } else if (loadedAdmin) {
            setActiveRole('admin');
            setDatabaseSessionMode(loadedAdmin.mode || 'production');
          } else if (loadedCourier) {
            setActiveRole('courier');
            setDatabaseSessionMode(loadedCourier.mode || 'production');
          } else {
            setActiveRole(null);
            setDatabaseSessionMode('production');
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    // Supabase auth state change listener (Handles production Admin ONLY)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, authSession) => {
      if (event === 'SIGNED_OUT' || !authSession) {
        if (mounted) {
          setAdminSession((prev) => (prev?.mode === 'production' ? null : prev));
          localStorage.removeItem(ADMIN_STORAGE_KEY);
        }
      } else if (event === 'SIGNED_IN' && authSession.user) {
        try {
          const profile = await db.getProfileByAuthUserId(authSession.user.id);
          if (profile && profile.role === 'admin') {
            const company = await db.getCompanyById(profile.company_id);
            if (company && mounted) {
              const prodAdminSession: AuthSession = {
                mode: 'production',
                user: {
                  id: authSession.user.id,
                  email: authSession.user.email || profile.phone,
                },
                profile,
                company,
              };
              setAdminSession(prodAdminSession);
              saveAdminStorage(prodAdminSession);
            }
          }
        } catch (e) {
          console.warn('Supabase auth state change profile sync error:', e);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 1. One-Click Instant Demo Login
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

        const demoAdminSession: AuthSession = {
          mode: 'demo',
          user: {
            id: adminProfile.auth_user_id || adminProfile.id,
            email: company.email,
          },
          profile: adminProfile,
          company,
        };

        saveAdminStorage(demoAdminSession);
        setAdminSession(demoAdminSession);
        setActiveRole('admin');
        return { success: true };
      } else {
        // Courier Demo Login
        const couriers = await demoDb.getCouriers(company.id);
        let targetCourier: Courier | undefined;

        if (identifier) {
          const cleanId = normalizeEmployeeId(identifier);
          targetCourier = couriers.find(
            c => normalizeEmployeeId(c.employee_id) === cleanId || c.id === identifier
          );
        }

        if (!targetCourier) {
          targetCourier = couriers[0]; // fallback to first courier (كريم عادل CR-101)
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

        const demoCourierSession: AuthSession = {
          mode: 'demo',
          user: {
            id: targetCourier.id,
            email: `${targetCourier.employee_id.toLowerCase()}@delixa.eg`,
          },
          profile,
          company,
          courier: targetCourier,
          courier_id: targetCourier.id,
          employee_id: targetCourier.employee_id,
        };

        saveCourierStorage(demoCourierSession);
        setCourierSession(demoCourierSession);
        setActiveRole('courier');
        return { success: true };
      }
    } catch (err: any) {
      console.error('Demo login error:', err);
      return { success: false, error: err.message || 'فشل فتح الحساب التجريبي' };
    } finally {
      setLoading(false);
    }
  };

  // Reset Demo Database
  const resetDemoData = () => {
    demoDb.resetDemoDatabase();
    if (activeRole === 'courier' && courierSession?.mode === 'demo') {
      loginDemoUser('courier', courierSession.courier?.employee_id || 'CR-101');
    } else if (adminSession?.mode === 'demo') {
      loginDemoUser('admin');
    }
  };

  // 2. Register New Shipping Company
  const registerCompany = async (params: RegisterCompanyParams): Promise<{ success: boolean; error?: string; requiresEmailConfirmation?: boolean; message?: string }> => {
    try {
      setDatabaseSessionMode('production');

      if (!isSupabaseConfigured) {
        return { success: false, error: 'يرجى ضبط مفاتيح Supabase (VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY) لتسجيل الحسابات' };
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

      const hasImmediateSession = Boolean(authData.session);

      // Step 2: Create Company & Admin Profile in Supabase
      try {
        const company = await db.createCompany({
          name: params.companyName.trim(),
          phone: params.phone.trim(),
          email: email,
          address: params.address?.trim() || 'جمهورية مصر العربية',
        });

        const profile = await db.createProfile({
          auth_user_id: authUser.id,
          company_id: company.id,
          full_name: params.adminFullName.trim(),
          phone: params.phone.trim(),
          role: 'admin',
        });

        if (hasImmediateSession) {
          const newSession: AuthSession = {
            mode: 'production',
            user: {
              id: authUser.id,
              email: authUser.email || email,
            },
            profile,
            company,
          };
          saveAdminStorage(newSession);
          setAdminSession(newSession);
          setActiveRole('admin');
          return { success: true };
        } else {
          return {
            success: true,
            requiresEmailConfirmation: true,
            message: 'تم إنشاء حساب الشركة بنجاح! يرجى مراجعة بريدك الإلكتروني لتأكيد الحساب ثم تسجيل الدخول.',
          };
        }
      } catch (dbErr: any) {
        console.error('Database provisioning error after auth signup:', dbErr);
        if (hasImmediateSession) {
          return { success: true };
        }
        return { 
          success: true, 
          requiresEmailConfirmation: true,
          message: 'تم تسجيل الحساب في نظام المصادقة. يرجى تأكيد بريدك الإلكتروني ثم تسجيل الدخول.',
        };
      }
    } catch (err: any) {
      console.error('Company registration exception:', err);
      return { success: false, error: err.message || 'فشل تسجيل الشركة' };
    }
  };

  // 3. Admin Login using Email + Password (Supabase Auth)
  const loginAdmin = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setDatabaseSessionMode('production');

      if (!isSupabaseConfigured) {
        return { success: false, error: 'يرجى ضبط مفاتيح Supabase أولاً أو استخدام الحساب التجريبي (Demo)' };
      }

      const normalizedEmail = email.trim().toLowerCase();
      if (!password) {
        return { success: false, error: 'كلمة المرور مطلوبة' };
      }

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

      // Fetch Admin Profile
      let profile = await db.getProfileByAuthUserId(authUser.id);
      
      // Fallback 1: Search by company email if unlinked
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

      // Fallback 2: Auto-provision profile from auth metadata if not found
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

      if (profile.role !== 'admin') {
        await supabase.auth.signOut();
        return { success: false, error: 'هذا الحساب ليس لديه صلاحيات إدارة. لتسجيل دخول المندوب يرجى استخدام صفحة دخول المناديب.' };
      }

      const company = await db.getCompanyById(profile.company_id);
      if (!company) {
        return { success: false, error: 'شركة الشحن التابع لها الحساب غير متوفرة' };
      }

      const newAdminSession: AuthSession = {
        mode: 'production',
        user: {
          id: authUser.id,
          email: normalizedEmail,
        },
        profile,
        company,
      };

      saveAdminStorage(newAdminSession);
      setAdminSession(newAdminSession);
      setActiveRole('admin');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'فشل تسجيل الدخول' };
    }
  };

  // 4. Courier Login using Employee ID + Password (Completely independent from Supabase Auth)
  const loginCourier = async (employeeId: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!employeeId || !employeeId.trim()) {
        return { success: false, error: 'يرجى إدخال كود الموظف' };
      }

      const cleanEmpId = normalizeEmployeeId(employeeId);

      // Check if this is a Demo Courier (CR-101, CR-102, CR-103)
      if (['CR-101', 'CR-102', 'CR-103', 'CR101', 'CR102', 'CR103'].includes(cleanEmpId)) {
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

      // Real / Production Courier Verification:
      setDatabaseSessionMode('production');

      const courier = await db.getCourierByEmployeeId(cleanEmpId);
      if (!courier) {
        return { success: false, error: 'كود الموظف غير صحيح أو غير مسجل' };
      }

      if (courier.status !== 'active') {
        return { success: false, error: 'حساب المندوب غير نشط، يرجى مراجعة إدارة الشركة' };
      }

      if (!password) {
        return { success: false, error: 'يرجى إدخال كلمة المرور' };
      }

      const isMatch = db.verifyCourierPassword(courier, password);
      if (!isMatch) {
        return { success: false, error: 'كلمة المرور غير صحيحة' };
      }

      const company = await db.getCompanyById(courier.company_id);
      if (!company) {
        return { success: false, error: 'شركة الشحن التابع لها المندوب غير متوفرة' };
      }

      // Construct dedicated Courier Profile
      const courierProfile: Profile = {
        id: courier.profile_id || `prof-${courier.id}`,
        auth_user_id: courier.id,
        company_id: courier.company_id,
        full_name: courier.full_name,
        phone: courier.phone,
        role: 'courier',
        created_at: courier.created_at,
        updated_at: courier.updated_at,
      };

      const cleanCompanyFragment = courier.company_id.replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase();
      const courierVirtualEmail = `${cleanEmpId.toLowerCase()}.${cleanCompanyFragment}@courier.delixa.app`;

      const newCourierSession: AuthSession = {
        mode: 'production',
        user: {
          id: courier.id,
          email: courier.phone || courierVirtualEmail,
        },
        profile: courierProfile,
        company,
        courier,
        courier_id: courier.id,
        employee_id: courier.employee_id,
      };

      // Save strictly to courier storage
      saveCourierStorage(newCourierSession);
      setCourierSession(newCourierSession);
      setActiveRole('courier');
      return { success: true };
    } catch (err: any) {
      console.error('Courier login exception:', err);
      return { success: false, error: err.message || 'فشل تسجيل دخول المندوب' };
    }
  };

  // 5. Update Company Profile (Admin Only)
  const updateCompanyProfile = async (updates: Partial<Company>): Promise<{ success: boolean; error?: string }> => {
    if (!adminSession || adminSession.profile.role !== 'admin') {
      return { success: false, error: 'غير مصرح لك بتعديل بيانات الشركة' };
    }
    const updated = await db.updateCompany(adminSession.company.id, updates);
    if (!updated) {
      return { success: false, error: 'فشل تحديث بيانات الشركة' };
    }
    const updatedSession: AuthSession = {
      ...adminSession,
      company: updated,
    };
    saveAdminStorage(updatedSession);
    setAdminSession(updatedSession);
    return { success: true };
  };

  // 6. Password Reset Request (Admin Email)
  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!isSupabaseConfigured) {
        return { success: false, error: 'يرجى ضبط مفاتيح Supabase أولاً' };
      }
      const normalizedEmail = email.trim().toLowerCase();
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/login/admin` : undefined;
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

  // 7. Dedicated Admin Logout
  const logoutAdmin = async () => {
    try {
      saveAdminStorage(null);
      setAdminSession(null);
      if (adminSession?.mode === 'production' && isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('Admin logout notice:', e);
    } finally {
      if (activeRole === 'admin') {
        setActiveRole(courierSession ? 'courier' : null);
      }
      setDatabaseSessionMode(courierSession?.mode || 'production');
    }
  };

  // 8. Dedicated Courier Logout
  const logoutCourier = async () => {
    try {
      saveCourierStorage(null);
      setCourierSession(null);
    } catch (e) {
      console.warn('Courier logout notice:', e);
    } finally {
      if (activeRole === 'courier') {
        setActiveRole(adminSession ? 'admin' : null);
      }
      setDatabaseSessionMode(adminSession?.mode || 'production');
    }
  };

  // 9. General Logout Dispatcher
  const logout = async (targetRole?: 'admin' | 'courier') => {
    const roleToLogout = targetRole || activeRole || (courierSession ? 'courier' : 'admin');
    if (roleToLogout === 'courier') {
      await logoutCourier();
    } else {
      await logoutAdmin();
    }
  };

  // 10. Backward-compatible switchDemoUser
  const switchDemoUser = async (type: 'adminCompanyA' | 'adminCompanyB' | 'courierA') => {
    if (type === 'adminCompanyA' || type === 'adminCompanyB') {
      await loginDemoUser('admin');
    } else {
      await loginDemoUser('courier', 'CR-101');
    }
  };

  const activeSession = useMemo(() => {
    return getContextAwareSession();
  }, [getContextAwareSession]);

  const value: AuthContextType = {
    session: activeSession,
    adminSession,
    courierSession,
    activeRole,
    loading,
    isConfigured: isSupabaseConfigured,
    sessionMode: activeSession?.mode || getDatabaseSessionMode(),
    registerCompany,
    loginAdmin,
    loginCourier,
    loginDemoUser,
    resetDemoData,
    logout,
    logoutAdmin,
    logoutCourier,
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
