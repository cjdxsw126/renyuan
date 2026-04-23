import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { getAllThemes, ThemeType } from '../themes';

export const SimpleThemeSwitcher: React.FC = () => {
  const { currentTheme, themeId, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const themes = getAllThemes();

  const getThemeIcon = (id: ThemeType) => {
    switch (id) {
      case 'classic': return '◎';
      case 'lighthouse': return '◉';
      case 'chimera': return '◈';
      case 'mana': return '✦';
      default: return '◎';
    }
  };

  const handleThemeChange = (newThemeId: ThemeType) => {
    setTheme(newThemeId);
    setIsOpen(false);
  };

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.simple-theme-switcher')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="simple-theme-switcher" style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: currentTheme.colors.surface,
          border: `2px solid ${currentTheme.colors.primary}`,
          color: currentTheme.colors.primary,
          fontSize: '20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s',
          boxShadow: `0 0 10px ${currentTheme.colors.primary}40`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = currentTheme.colors.primary;
          e.currentTarget.style.color = currentTheme.colors.background;
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = currentTheme.colors.surface;
          e.currentTarget.style.color = currentTheme.colors.primary;
          e.currentTarget.style.transform = 'scale(1)';
        }}
        title="切换主题"
      >
        {getThemeIcon(themeId)}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          background: currentTheme.colors.dropdownBg,
          border: `1px solid ${currentTheme.colors.border}`,
          borderRadius: '12px',
          padding: '8px',
          minWidth: '180px',
          zIndex: 1000,
          boxShadow: `0 8px 32px rgba(0,0,0,0.4)`,
        }}>
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleThemeChange(theme.id)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: theme.id === themeId
                  ? `${currentTheme.colors.primary}20`
                  : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: theme.id === themeId
                  ? currentTheme.colors.primary
                  : currentTheme.colors.text,
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.2s',
                marginBottom: '4px',
              }}
              onMouseEnter={(e) => {
                if (theme.id !== themeId) {
                  e.currentTarget.style.background = `${currentTheme.colors.primary}10`;
                }
              }}
              onMouseLeave={(e) => {
                if (theme.id !== themeId) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: '16px', color: theme.colors.primary }}>
                {getThemeIcon(theme.id)}
              </span>
              <span>{theme.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
