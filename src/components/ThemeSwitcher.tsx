import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { getAllThemes, ThemeType } from '../themes';

export const ThemeSwitcher: React.FC = () => {
  const { currentTheme, themeId, setTheme, isThemeLoading } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const themes = getAllThemes();

  const handleThemeChange = (newThemeId: ThemeType) => {
    setTheme(newThemeId);
    setIsOpen(false);
  };

  const getThemeIcon = (themeId: ThemeType) => {
    switch (themeId) {
      case 'lighthouse':
        return '◉';
      case 'chimera':
        return '◈';
      case 'mana':
        return '✦';
      default:
        return '◉';
    }
  };

  return (
    <div className="theme-switcher">
      <button
        className="theme-switcher-button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'transparent',
          border: `1px solid ${currentTheme.colors.primary}`,
          color: currentTheme.colors.primary,
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontFamily: currentTheme.fonts.body,
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.3s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = currentTheme.colors.primary;
          e.currentTarget.style.color = currentTheme.colors.background;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = currentTheme.colors.primary;
        }}
      >
        <span style={{ fontSize: '16px' }}>{getThemeIcon(themeId)}</span>
        <span>{currentTheme.name}</span>
        <span style={{ marginLeft: '4px' }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="theme-switcher-overlay"
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
          />
          <div
            className="theme-switcher-dropdown"
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              background: currentTheme.colors.surface,
              border: `1px solid ${currentTheme.colors.border}`,
              borderRadius: '8px',
              padding: '8px',
              minWidth: '200px',
              zIndex: 1000,
              boxShadow: `0 4px 20px rgba(0,0,0,0.3)`,
            }}
          >
            {themes.map((theme) => (
              <button
                key={theme.id}
                className={`theme-option ${theme.id === themeId ? 'active' : ''}`}
                onClick={() => handleThemeChange(theme.id)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: theme.id === themeId 
                    ? `${theme.colors.primary}20` 
                    : 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  color: theme.id === themeId 
                    ? theme.colors.primary 
                    : theme.colors.text,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: theme.fonts.body,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.2s',
                  marginBottom: '4px',
                }}
                onMouseEnter={(e) => {
                  if (theme.id !== themeId) {
                    e.currentTarget.style.background = `${theme.colors.primary}10`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (theme.id !== themeId) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{ 
                  fontSize: '20px',
                  color: theme.colors.primary,
                }}>
                  {getThemeIcon(theme.id)}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{theme.name}</div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: theme.colors.textSecondary,
                    marginTop: '2px',
                  }}>
                    {theme.description}
                  </div>
                </div>
                {theme.id === themeId && (
                  <span style={{ color: theme.colors.primary }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {isThemeLoading && (
        <div
          className="theme-loading"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              padding: '20px 40px',
              background: currentTheme.colors.surface,
              border: `1px solid ${currentTheme.colors.border}`,
              borderRadius: '8px',
              color: currentTheme.colors.primary,
              fontFamily: currentTheme.fonts.body,
            }}
          >
            切换主题中...
          </div>
        </div>
      )}
    </div>
  );
};
