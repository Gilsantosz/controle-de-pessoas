import { create } from 'zustand';
import type { UserProfile, Company, SystemSettings, Notification } from '../types';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';

interface AppState {
  currentUser: UserProfile | null;
  currentCompany: Company | null;
  currentSettings: SystemSettings | null;
  notifications: Notification[];
  isAuthLoading: boolean;
  
  setCurrentUser: (user: UserProfile | null) => void;
  setCurrentCompany: (company: Company | null) => void;
  setCurrentSettings: (settings: SystemSettings | null) => void;
  setNotifications: (notifications: Notification[]) => void;
  setIsAuthLoading: (loading: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  
  logout: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  currentCompany: null,
  currentSettings: null,
  notifications: [],
  isAuthLoading: true,
  sidebarCollapsed: false,
  mobileSidebarOpen: false,

  setCurrentUser: (user) => set({ currentUser: user }),
  setCurrentCompany: (company) => set({ currentCompany: company }),
  setCurrentSettings: (settings) => set({ currentSettings: settings }),
  setNotifications: (notifications) => set({ notifications }),
  setIsAuthLoading: (loading) => set({ isAuthLoading: loading }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

  logout: async () => {
    await signOut(auth);
    set({
      currentUser: null,
      currentCompany: null,
      currentSettings: null,
      notifications: [],
      isAuthLoading: false,
      sidebarCollapsed: false,
      mobileSidebarOpen: false
    });
  }
}));
