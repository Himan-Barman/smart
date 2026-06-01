import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type {
  User,
  RegisteredPerson,
  AuthStep,
} from '../types';
import { api, tokenStore } from '../api';

interface AuthContextType {
  authStep: AuthStep;
  currentUser: User | null;
  registeredPersons: RegisteredPerson[];
  registeredUsers: User[];
  otpEmail: string;
  pendingSignup: RegisteredPerson | null;
  verifiedOtpCode: string;

  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  startSignup: (email: string, identifier: string) => Promise<{ success: boolean; message: string; person?: RegisteredPerson }>;
  verifyOTPOnly: (code: string) => Promise<{ success: boolean; message: string }>;
  completeSignup: (password: string) => Promise<{ success: boolean; message: string }>;
  resendOTP: () => Promise<void>;
  logout: () => void;
  setAuthStep: (step: AuthStep) => void;
  setCurrentUser: (user: User) => void;
  updateProfile: (updates: { name?: string; email?: string; phone?: string }) => Promise<User>;

  uploadPersons: (persons: RegisteredPerson[]) => Promise<{ count: number; errors: string[]; duplicates: string[] }>;
  removeRegisteredPerson: (id: string) => Promise<void>;
  refreshAdminData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const accountToRegisteredPerson = (user: User): RegisteredPerson => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
  enrollmentNo: user.enrollmentNo,
  employeeId: user.employeeId,
  semester: user.semester,
  course: user.course,
  subjects: user.subjects,
  phone: user.phone,
  createdAt: user.createdAt,
  isVerified: true,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authStep, setAuthStep] = useState<AuthStep>('login');
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [registeredPersons, setRegisteredPersons] = useState<RegisteredPerson[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [otpEmail, setOtpEmail] = useState('');
  const [pendingSignup, setPendingSignup] = useState<RegisteredPerson | null>(null);
  const [verifiedOtpCode, setVerifiedOtpCode] = useState('');

  const setCurrentUser = useCallback((user: User) => {
    setCurrentUserState(user);
  }, []);

  const loadAdminData = useCallback(async () => {
    const [personsResult, usersResult] = await Promise.allSettled([
      api.users.listRegisteredPersons(),
      api.users.listRegisteredUsers(),
    ]);

    if (usersResult.status === 'fulfilled') {
      setRegisteredUsers(usersResult.value);
    }

    if (personsResult.status === 'fulfilled') {
      setRegisteredPersons(personsResult.value);
      return;
    }

    if (usersResult.status === 'fulfilled') {
      setRegisteredPersons(usersResult.value.map(accountToRegisteredPerson));
      return;
    }

    console.warn('Unable to load admin user data', {
      personsError: personsResult.reason,
      usersError: usersResult.reason,
    });
  }, []);

  const refreshAdminData = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      return;
    }

    await loadAdminData();
  }, [currentUser, loadAdminData]);

  useEffect(() => {
    const init = async () => {
      const token = tokenStore.get();
      if (!token) return;

      try {
        const me = await api.auth.me();
        setCurrentUserState(me.user);
        setAuthStep('authenticated');

        if (me.user.role === 'admin') {
          await loadAdminData();
        }
      } catch {
        tokenStore.clear();
      }
    };

    void init();
  }, [loadAdminData]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await api.auth.login({ email, password });
      tokenStore.set(response.token);
      setCurrentUserState(response.user);
      setAuthStep('authenticated');

      if (response.user.role === 'admin') {
        await loadAdminData();
      }

      return { success: true, message: response.message };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }, [loadAdminData]);

  const startSignup = useCallback(async (email: string, identifier: string) => {
    try {
      const response = await api.auth.startSignup({ email, identifier });
      setOtpEmail(response.otpEmail);
      setPendingSignup(response.person);
      setAuthStep('otp');

      return { success: true, message: response.message, person: response.person };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Signup failed',
      };
    }
  }, []);

  // Step 2: Verify OTP only → move to password page
  const verifyOTPOnly = useCallback(async (code: string) => {
    try {
      if (!otpEmail) {
        return { success: false, message: 'Session expired. Please try signing up again.' };
      }

      await api.auth.verifyOtpOnly({ email: otpEmail, code });
      setVerifiedOtpCode(code);
      setAuthStep('password');

      return { success: true, message: 'OTP verified!' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'OTP verification failed',
      };
    }
  }, [otpEmail]);

  // Step 3: Set password & create account
  const completeSignup = useCallback(async (password: string) => {
    try {
      if (!otpEmail || !verifiedOtpCode) {
        return { success: false, message: 'Session expired. Please try signing up again.' };
      }

      const response = await api.auth.verifySignup({ email: otpEmail, code: verifiedOtpCode, password });
      tokenStore.set(response.token);
      setCurrentUserState(response.user);
      setPendingSignup(null);
      setOtpEmail('');
      setVerifiedOtpCode('');
      setAuthStep('authenticated');

      if (response.user.role === 'admin') {
        await loadAdminData();
      }

      return { success: true, message: response.message };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Account creation failed',
      };
    }
  }, [otpEmail, verifiedOtpCode, loadAdminData]);

  const resendOTP = useCallback(async () => {
    if (!otpEmail) return;

    try {
      await api.auth.resendSignupOtp({ email: otpEmail });
    } catch {
      // silently keep existing OTP for UI fallback
    }
  }, [otpEmail]);

  const logout = useCallback(() => {
    tokenStore.clear();
    setCurrentUserState(null);
    setRegisteredPersons([]);
    setRegisteredUsers([]);
    setAuthStep('login');
    setOtpEmail('');
    setPendingSignup(null);
    setVerifiedOtpCode('');
  }, []);

  const uploadPersons = useCallback(async (persons: RegisteredPerson[]) => {
    const response = await api.users.uploadRegisteredPersons(persons);
    await refreshAdminData();
    return {
      count: response.count,
      errors: response.errors ?? [],
      duplicates: response.duplicates,
    };
  }, [refreshAdminData]);

  const removeRegisteredPerson = useCallback(async (id: string) => {
    await api.users.removeRegisteredPerson(id);
    setRegisteredPersons((prev) => prev.filter((person) => person.id !== id));
  }, []);

  const updateProfile = useCallback(async (updates: { name?: string; email?: string; phone?: string }) => {
    const updatedUser = await api.profile.update(updates);
    setCurrentUserState(updatedUser);

    if (updatedUser.role === 'admin') {
      await refreshAdminData();
    }

    return updatedUser;
  }, [refreshAdminData]);

  return (
    <AuthContext.Provider
      value={{
        authStep,
        currentUser,
        registeredPersons,
        registeredUsers,
        otpEmail,
        pendingSignup,
        verifiedOtpCode,
        login,
        startSignup,
        verifyOTPOnly,
        completeSignup,
        resendOTP,
        logout,
        setAuthStep,
        setCurrentUser,
        updateProfile,
        uploadPersons,
        removeRegisteredPerson,
        refreshAdminData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
