'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { apiFetch } from '@/utils/apiClient';

export interface UserPermission {
  feature: string;
  action: string;
  key: string;
}

export interface UserRoleInfo {
  id: string | null;
  name: string;
  isOwner: boolean;
  isAdmin: boolean;
}

export interface AuthPermissionsContextType {
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  role: UserRoleInfo | null;
  roleName: string;
  isOwner: boolean;
  isAdmin: boolean;
  permissions: Set<string>;
  loading: boolean;
  hasPermission: (feature: string, action: string) => boolean;
  hasFeature: (feature: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const AuthPermissionsContext = createContext<AuthPermissionsContextType>({
  userId: null,
  userName: null,
  userEmail: null,
  role: null,
  roleName: 'Viewer',
  isOwner: false,
  isAdmin: false,
  permissions: new Set(),
  loading: true,
  hasPermission: () => false,
  hasFeature: () => false,
  refreshPermissions: async () => {},
});

export function AuthPermissionsProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState<UserRoleInfo | null>(null);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async (currentUserId: string) => {
    try {
      if (typeof window !== 'undefined') {
        (window as any).__BIZZMATE_USER_ID__ = currentUserId;
      }

      const res = await apiFetch('/users/me', {
        userId: currentUserId,
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        setRole(data.role);
        const permSet = new Set<string>();
        if (Array.isArray(data.permissions)) {
          for (const p of data.permissions) {
            permSet.add(p.key || `${p.feature}:${p.action}`);
          }
        }
        setPermissions(permSet);
      }
    } catch (err) {
      console.error('Failed to load user permissions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    if (user?.id) {
      fetchProfile(user.id);
    } else {
      setRole(null);
      setPermissions(new Set());
      setLoading(false);
      if (typeof window !== 'undefined') {
        delete (window as any).__BIZZMATE_USER_ID__;
      }
    }
  }, [user?.id, isLoaded, fetchProfile]);

  const refreshPermissions = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  const isOwner = Boolean(role?.isOwner);
  const isAdmin = Boolean(role?.isAdmin || isOwner);
  const roleName = role?.name || 'Viewer';

  const hasPermission = useCallback(
    (feature: string, action: string): boolean => {
      if (isOwner) return true; // Owner always passes
      return permissions.has(`${feature}:${action}`);
    },
    [isOwner, permissions]
  );

  const hasFeature = useCallback(
    (feature: string): boolean => {
      if (isOwner) return true; // Owner always passes
      return hasPermission(feature, 'VIEW');
    },
    [isOwner, hasPermission]
  );

  return (
    <AuthPermissionsContext.Provider
      value={{
        userId: user?.id || null,
        userName: user?.fullName || user?.firstName || null,
        userEmail: user?.primaryEmailAddress?.emailAddress || null,
        role,
        roleName,
        isOwner,
        isAdmin,
        permissions,
        loading,
        hasPermission,
        hasFeature,
        refreshPermissions,
      }}
    >
      {children}
    </AuthPermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(AuthPermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within an AuthPermissionsProvider');
  }
  return context;
}

