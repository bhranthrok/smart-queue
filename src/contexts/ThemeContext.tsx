"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'default' | 'purple' | 'kawaii' | 'light' | 'forest' | 'bloody';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('default');

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('smartqueue-theme') as Theme;
    if (savedTheme && (savedTheme === 'default' || savedTheme === 'purple' || savedTheme === 'kawaii' || savedTheme === 'light' || savedTheme === 'forest' || savedTheme === 'bloody')) {
      setTheme(savedTheme);
    }
  }, []);

  // Apply theme to document root and save to localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('smartqueue-theme', theme);
    console.log(`🎨 Theme switched to: ${theme}`);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
