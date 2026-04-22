export type ThemeType = 'lighthouse' | 'chimera' | 'mana';

export interface Theme {
  id: ThemeType;
  name: string;
  nameEn: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    danger: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  effects: {
    glow: boolean;
    scanline: boolean;
    particles: boolean;
    breathing: boolean;
    morphing: boolean;
  };
}

export const themes: Record<ThemeType, Theme> = {
  lighthouse: {
    id: 'lighthouse',
    name: '灯塔控制室',
    nameEn: 'Lighthouse Control',
    description: '未来科技风格 - 人类文明最后的堡垒',
    colors: {
      primary: '#00d4ff',
      secondary: '#0d1f35',
      accent: '#ff6b35',
      background: '#0a1628',
      surface: 'rgba(13, 31, 53, 0.8)',
      text: '#e0f7ff',
      textSecondary: '#8ba3b8',
      border: 'rgba(0, 212, 255, 0.3)',
      success: '#27ae60',
      warning: '#f39c12',
      danger: '#ff2d55',
    },
    fonts: {
      heading: "'Orbitron', 'Microsoft YaHei', sans-serif",
      body: "'Orbitron', 'Microsoft YaHei', sans-serif",
    },
    effects: {
      glow: true,
      scanline: true,
      particles: false,
      breathing: false,
      morphing: false,
    },
  },
  chimera: {
    id: 'chimera',
    name: '噬极兽生态',
    nameEn: 'Chimera Ecology',
    description: '生物机械风格 - 原始生命力与危险',
    colors: {
      primary: '#39ff14',
      secondary: '#1a0a2e',
      accent: '#ff006e',
      background: '#0d0518',
      surface: 'rgba(26, 10, 46, 0.85)',
      text: '#e0ffe0',
      textSecondary: '#8b9d8b',
      border: 'rgba(57, 255, 20, 0.3)',
      success: '#39ff14',
      warning: '#ffaa00',
      danger: '#ff006e',
    },
    fonts: {
      heading: "'Rajdhani', 'Microsoft YaHei', sans-serif",
      body: "'Rajdhani', 'Microsoft YaHei', sans-serif",
    },
    effects: {
      glow: true,
      scanline: false,
      particles: false,
      breathing: true,
      morphing: true,
    },
  },
  mana: {
    id: 'mana',
    name: '玛娜之花',
    nameEn: 'Mana Flower',
    description: '神圣宗教风格 - 末日中的希望',
    colors: {
      primary: '#ffd700',
      secondary: '#1a1a2e',
      accent: '#ffaa00',
      background: '#0f0f1a',
      surface: 'rgba(26, 26, 46, 0.9)',
      text: '#fff8e7',
      textSecondary: '#b8a88a',
      border: 'rgba(255, 215, 0, 0.3)',
      success: '#ffd700',
      warning: '#ffaa00',
      danger: '#ff6b6b',
    },
    fonts: {
      heading: "'Cinzel', 'SimSun', 'Microsoft YaHei', serif",
      body: "'Cinzel', 'SimSun', 'Microsoft YaHei', serif",
    },
    effects: {
      glow: true,
      scanline: false,
      particles: true,
      breathing: true,
      morphing: false,
    },
  },
};

export const defaultTheme: ThemeType = 'lighthouse';

export const getTheme = (themeId: ThemeType): Theme => themes[themeId];

export const getAllThemes = (): Theme[] => Object.values(themes);
