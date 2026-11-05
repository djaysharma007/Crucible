'use client';

import * as React from 'react';
import { UserSummary, LoginInput, RegisterInput } from '@crucible/shared';
import { apiClient } from './api-client';

interface AuthContextType {
  user: UserSummary | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const refreshUser = React.useCallback(async () => {
    try {
      const data = await apiClient<{ user: UserSummary }>('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (input: LoginInput) => {
    const data = await apiClient<{ user: UserSummary }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setUser(data.user);
  };

  const register = async (input: RegisterInput) => {
    const data = await apiClient<{ user: UserSummary }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setUser(data.user);
  };

  const logout = async () => {
    await apiClient('/auth/logout', { method: 'POST' });
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
