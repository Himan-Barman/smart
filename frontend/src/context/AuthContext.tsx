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
  pendingPassword: string;

  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  startSignup: (email: string, identifier: string) => Promise<{ success: boolean; message: string; person?: RegisteredPerson }>;
  verifyOTP: (code: string, password: string) => Promise<{ success: boolean; message: string }>;
  resendOTP: () => Promise<void>;
  logout: () => void;
  setAuthStep: (step: AuthStep) => void;
  setCurrentUser: (user: User) => void;
  updateProfile: (updates: { name?: string; email?: string; phone?: string }) => Promise<User>;

  uploadPersons: (persons: RegisteredPerson[]) => Promise<number>;
  removeRegisteredPerson: (id: string) => Promise<void>;
  refreshAdminData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authStep, setAuthStep] = useState<AuthStep>('login');
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [registeredPersons, setRegisteredPersons] = useState<RegisteredPerson[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [otpEmail, setOtpEmail] = useState('');
  const [pendingSignup, setPendingSignup] = useState<RegisteredPerson | null>(null);
  const [pendingPassword] = useState('');

  const setCurrentUser = useCallback((user: User) => {
    setCurrentUserState(user);
  }, []);

  const refreshAdminData = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      return;
    }

    const [persons, users] = await Promise.all([
      api.users.listRegisteredPersons(),
      api.users.listRegisteredUsers(),
    ]);

    setRegisteredPersons(persons);
    setRegisteredUsers(users);
  }, [currentUser]);

  useEffect(() => {
    const init = async () => {
      const token = tokenStore.get();
      if (!token) return;

      try {
        const me = await api.auth.me();
        setCurrentUserState(me.user);
        setAuthStep('authenticated');

        if (me.user.role === 'admin') {
          const [persons, users] = await Promise.all([
            api.users.listRegisteredPersons(),
            api.users.listRegisteredUsers(),
          ]);
          setRegisteredPersons(persons);
          setRegisteredUsers(users);
        }
      } catch {
        tokenStore.clear();
      }
    };

    void init();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await api.auth.login({ email, password });
      tokenStore.set(response.token);
      setCurrentUserState(response.user);
      setAuthStep('authenticated');

      if (response.user.role === 'admin') {
        const [persons, users] = await Promise.all([
          api.users.listRegisteredPersons(),
          api.users.listRegisteredUsers(),
        ]);
        setRegisteredPersons(persons);
        setRegisteredUsers(users);
      }

      return { success: true, message: response.message };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }, []);

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

  const verifyOTP = useCallback(async (code: string, password: string) => {
    try {
      if (!otpEmail) {
        return { success: false, message: 'Session expired. Please try signing up again.' };
      }

      const response = await api.auth.verifySignup({ email: otpEmail, code, password });
      tokenStore.set(response.token);
      setCurrentUserState(response.user);
      setPendingSignup(null);
      setOtpEmail('');
      setAuthStep('authenticated');

      if (response.user.role === 'admin') {
        const [persons, users] = await Promise.all([
          api.users.listRegisteredPersons(),
          api.users.listRegisteredUsers(),
        ]);
        setRegisteredPersons(persons);
        setRegisteredUsers(users);
      }

      return { success: true, message: response.message };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'OTP verification failed',
      };
    }
  }, [otpEmail]);

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
  }, []);

  const uploadPersons = useCallback(async (persons: RegisteredPerson[]) => {
    const response = await api.users.uploadRegisteredPersons(persons);
    await refreshAdminData();
    return response.count;
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
        pendingPassword,
        login,
        startSignup,
        verifyOTP,
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
