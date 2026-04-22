import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, ThemeType, getTheme, defaultTheme } from '../themes';

interface ThemeContextType {
  currentTheme: Theme;
  themeId: ThemeType;
  setTheme: (themeId: ThemeType) => void;
  isThemeLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themeId, setThemeId] = useState<ThemeType>(defaultTheme);
  const [isThemeLoading, setIsThemeLoading] = useState(false);

  const currentTheme = getTheme(themeId);

  const setTheme = (newThemeId: ThemeType) => {
    console.log('ThemeContext: setTheme called with', newThemeId, 'current theme is', themeId);
    if (newThemeId === themeId) {
      console.log('ThemeContext: Same theme, skipping');
      return;
    }
    
    setIsThemeLoading(true);
    setThemeId(newThemeId);
    
    // Apply theme to document immediately
    applyThemeToDocument(newThemeId);
    
    console.log('ThemeContext: Theme changed to', newThemeId);
    
    // Force a small delay to show loading state
    setTimeout(() => {
      setIsThemeLoading(false);
    }, 300);
  };

  const applyThemeToDocument = (themeId: ThemeType) => {
    const theme = getTheme(themeId);
    const root = document.documentElement;
    
    // Set CSS variables
    root.style.setProperty('--theme-primary', theme.colors.primary);
    root.style.setProperty('--theme-secondary', theme.colors.secondary);
    root.style.setProperty('--theme-accent', theme.colors.accent);
    root.style.setProperty('--theme-background', theme.colors.background);
    root.style.setProperty('--theme-surface', theme.colors.surface);
    root.style.setProperty('--theme-text', theme.colors.text);
    root.style.setProperty('--theme-text-secondary', theme.colors.textSecondary);
    root.style.setProperty('--theme-border', theme.colors.border);
    root.style.setProperty('--theme-success', theme.colors.success);
    root.style.setProperty('--theme-warning', theme.colors.warning);
    root.style.setProperty('--theme-danger', theme.colors.danger);
    
    // Set fonts
    root.style.setProperty('--theme-font-heading', theme.fonts.heading);
    root.style.setProperty('--theme-font-body', theme.fonts.body);
    
    // Set theme class on body
    document.body.className = `theme-${themeId}`;
    
    // Load Google Fonts if needed
    loadThemeFonts(themeId);
  };

  const loadThemeFonts = (themeId: ThemeType) => {
    const fontLinks: Record<ThemeType, string | null> = {
      classic: null,
      lighthouse: 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&display=swap',
      chimera: 'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap',
      mana: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&display=swap',
    };
    
    // If no external font needed (classic theme), just remove old links
    if (!fontLinks[themeId]) {
      const oldLinks = document.querySelectorAll('link[data-theme-font]');
      oldLinks.forEach(link => link.remove());
      return;
    }

    // Remove old font links
    const oldLinks = document.querySelectorAll('link[data-theme-font]');
    oldLinks.forEach(link => link.remove());

    // Add new font link
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontLinks[themeId];
    link.setAttribute('data-theme-font', themeId);
    document.head.appendChild(link);
  };

  // Apply theme on mount
  useEffect(() => {
    applyThemeToDocument(themeId);
  }, []);

  return (
    <ThemeContext.Provider value={{ currentTheme, themeId, setTheme, isThemeLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
