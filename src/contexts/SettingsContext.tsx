'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface SettingsContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
  notifications: {
    matches: boolean;
    messages: boolean;
    likes: boolean;
    promotions: boolean;
  };
  updateNotification: (key: keyof SettingsContextType['notifications'], value: boolean) => void;
  privacy: {
    showOnlineStatus: boolean;
    showLastSeen: boolean;
    showReadReceipts: boolean;
    discoverableByEmail: boolean;
  };
  updatePrivacy: (key: keyof SettingsContextType['privacy'], value: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState({
    matches: true,
    messages: true,
    likes: true,
    promotions: false
  });
  const [privacy, setPrivacy] = useState({
    showOnlineStatus: true,
    showLastSeen: true,
    showReadReceipts: true,
    discoverableByEmail: false
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('frinder_darkMode');
    const savedNotifications = localStorage.getItem('frinder_notifications');
    const savedPrivacy = localStorage.getItem('frinder_privacy');

    if (savedDarkMode) setDarkMode(JSON.parse(savedDarkMode));
    if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
    if (savedPrivacy) setPrivacy(JSON.parse(savedPrivacy));
  }, []);

  // Apply dark mode to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('frinder_darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const updateNotification = (key: keyof typeof notifications, value: boolean) => {
    setNotifications(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('frinder_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const updatePrivacy = (key: keyof typeof privacy, value: boolean) => {
    setPrivacy(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('frinder_privacy', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <SettingsContext.Provider
      value={{
        darkMode,
        toggleDarkMode,
        notifications,
        updateNotification,
        privacy,
        updatePrivacy
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
