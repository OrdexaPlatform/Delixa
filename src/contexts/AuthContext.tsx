import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthSession, UserRole, Company, Profile, Courier } from '../types';
import { db, generateId } from '../lib/db';

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
  registerCompany: (params: RegisterCompanyParams) => Promise<{ success: boolean; error?: string }>;
  loginAdmin: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginCourier: (employeeId: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateCompanyProfile: (updates: Partial<Company>) => Promise<{ success: boolean; error?: string }>;
  switchDemoUser: (type: 'adminCompanyA' | 'adminCompanyB' | 'courierA') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'delixa_auth_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Restore session from localStorage on app boot
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedSession) {
        const parsed = JSON.parse(savedSession) as AuthSession;
        // Verify company & profile still exist in DB
        const company = db.getCompanyById(parsed.company.id);
        const profile = db.getProfileById(parsed.profile.id);
        if (company && profile) {
          let courier: Courier | undefined = undefined;
          if (profile.role === 'courier') {
            courier = db.getCourierById(company.id, parsed.courier?.id || '') || undefined;
          }
          setSession({
            user: parsed.user,
            profile,
            company,
            courier,
          });
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
    } catch (e) {
      console.error('Failed to parse auth session:', e);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSession = (newSession: AuthSession | null) => {
    setSession(newSession);
    if (newSession) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newSession));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  // 1. Register new shipping company (Public Registration -> creates Company + Admin Profile)
  const registerCompany = async (params: RegisterCompanyParams): Promise<{ success: boolean; error?: string }> => {
    try {
      // Validate unique email among profiles
      const existingProfiles = db.getProfiles();
      const existing = existingProfiles.find(p => p.phone === params.phone);
      if (existing) {
        return { success: false, error: 'رقم الهاتف مسجل مسبقاً في النظام' };
      }

      // Step 1: Create Company
      const company = db.createCompany({
        name: params.companyName.trim(),
        phone: params.phone.trim(),
        email: params.email.trim().toLowerCase(),
        address: params.address?.trim() || 'جمهورية مصر العربية',
        logo_url: '',
      });

      // Step 2: Create Auth User & Admin Profile
      const authUserId = generateId();
      const profile = db.createProfile({
        auth_user_id: authUserId,
        company_id: company.id,
        full_name: params.adminFullName.trim(),
        phone: params.phone.trim(),
        role: 'admin',
      });

      // Step 3: Establish Session
      const newSession: AuthSession = {
        user: {
          id: authUserId,
          email: params.email.trim().toLowerCase(),
        },
        profile,
        company,
      };

      saveSession(newSession);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'حدث خطأ أثناء تسجيل الشركة' };
    }
  };

  // 2. Login Admin
  const loginAdmin = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      // Find company by email or find profiles
      const companies = db.getCompanies();
      const company = companies.find(c => c.email.toLowerCase() === normalizedEmail);

      if (!company) {
        // Look up by profile email / credentials if any
        return { success: false, error: 'البريد الإلكتروني غير مسجل لأي شركة شحن' };
      }

      // Get admin profile for this company
      const profiles = db.getProfiles(company.id);
      const adminProfile = profiles.find(p => p.role === 'admin');

      if (!adminProfile) {
        return { success: false, error: 'لم يتم العثور على حساب مدير مسجل لهذه الشركة' };
      }

      const newSession: AuthSession = {
        user: {
          id: adminProfile.auth_user_id,
          email: company.email,
        },
        profile: adminProfile,
        company,
      };

      saveSession(newSession);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'فشل تسجيل الدخول' };
    }
  };

  // 3. Login Courier using Employee ID
  const loginCourier = async (employeeId: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!employeeId || !employeeId.trim()) {
        return { success: false, error: 'يرجى إدخال كود الموظف' };
      }

      const courier = db.getCourierByEmployeeId(employeeId);

      if (!courier) {
        return { success: false, error: 'كود الموظف غير صحيح أو غير مسجل' };
      }

      if (courier.status !== 'active') {
        return { success: false, error: 'حساب المندوب غير نشط، يرجى مراجعة إدارة الشركة' };
      }

      if (password && courier.password) {
        const isMatch = db.verifyCourierPassword(courier, password);
        if (!isMatch) {
          return { success: false, error: 'كلمة المرور غير صحيحة' };
        }
      }

      const company = db.getCompanyById(courier.company_id);
      if (!company) {
        return { success: false, error: 'شركة الشحن التابع لها المندوب غير متوفرة' };
      }

      const profile = db.getProfileById(courier.profile_id);
      if (!profile) {
        return { success: false, error: 'ملف المندوب غير موجود' };
      }

      const newSession: AuthSession = {
        user: {
          id: profile.auth_user_id,
          email: `${courier.employee_id.toLowerCase()}@${company.id.substring(0, 8)}.delixa.eg`,
        },
        profile,
        company,
        courier,
      };

      saveSession(newSession);
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
    const updated = db.updateCompany(session.company.id, updates);
    if (!updated) {
      return { success: false, error: 'فشل تحديث بيانات الشركة' };
    }
    const newSession = {
      ...session,
      company: updated,
    };
    saveSession(newSession);
    return { success: true };
  };

  // 5. Quick Switcher for Testing / Demonstration
  const switchDemoUser = (type: 'adminCompanyA' | 'adminCompanyB' | 'courierA') => {
    if (type === 'adminCompanyA') {
      loginAdmin('admin@cairoexpress.eg');
    } else if (type === 'adminCompanyB') {
      loginAdmin('admin@alexfastcargo.eg');
    } else if (type === 'courierA') {
      loginCourier('CR-101', 'CR101K');
    }
  };

  const logout = () => {
    saveSession(null);
  };

  const value: AuthContextType = {
    session,
    loading,
    registerCompany,
    loginAdmin,
    loginCourier,
    logout,
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
