export type ThemeType = 'classic' | 'lighthouse' | 'chimera' | 'mana';

export interface ThemeLabels {
  aiSearchTitle: string;
  aiSearchSubtitle: string;
  aiSearchButton: string;
  aiSearching: string;
  name: string;
  age: string;
  education: string;
  tenure: string;
  graduationTenure: string;
  certificates: string;
  search: string;
  download: string;
  matchScore: string;
  logout: string;
}

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
  labels: ThemeLabels;
}

export const themes: Record<ThemeType, Theme> = {
  classic: {
    id: 'classic',
    name: '经典风格',
    nameEn: 'Classic',
    description: '原网页风格 - 简洁明快',
    colors: {
      primary: '#ff6b81',
      secondary: '#f8f4f0',
      accent: '#ff8a9b',
      background: '#ffffff',
      surface: '#f8f9fa',
      text: '#333333',
      textSecondary: '#666666',
      border: '#e0e0e0',
      success: '#4CAF50',
      warning: '#f39c12',
      danger: '#ff6b81',
    },
    fonts: {
      heading: "'Microsoft YaHei', sans-serif",
      body: "'Microsoft YaHei', sans-serif",
    },
    effects: {
      glow: false,
      scanline: false,
      particles: false,
      breathing: false,
      morphing: false,
    },
    labels: {
      aiSearchTitle: 'AI智能筛选',
      aiSearchSubtitle: '',
      aiSearchButton: 'AI筛选',
      aiSearching: '搜索中...',
      name: '姓名',
      age: '年龄范围',
      education: '学历',
      tenure: '入司年限（年）',
      graduationTenure: '毕业年限（年）',
      certificates: '证书',
      search: '查询',
      download: '下载',
      matchScore: '匹配度',
      logout: '登出',
    },
  },
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
    labels: {
      aiSearchTitle: 'AI智能筛选',
      aiSearchSubtitle: 'SMART SEARCH PROTOCOL',
      aiSearchButton: '执行筛选',
      aiSearching: '系统检索中...',
      name: '姓名 // NAME',
      age: '年龄范围 // AGE',
      education: '学历 // EDUCATION',
      tenure: '入司年限 // TENURE',
      graduationTenure: '毕业年限 // GRADUATION',
      certificates: '证书要求 // CERTIFICATES',
      search: '查询 // SEARCH',
      download: '下载 // DOWNLOAD',
      matchScore: '匹配度 // MATCH',
      logout: '登出 // LOGOUT',
    },
  },
  chimera: {
    id: 'chimera',
    name: '噬极兽生态',
    nameEn: 'Chimera Ecology',
    description: '生物机械风格 - 原始生命力与危险',
    colors: {
      primary: '#b829dd',
      secondary: '#1a0a2e',
      accent: '#ff006e',
      background: '#0d0518',
      surface: 'rgba(26, 10, 46, 0.85)',
      text: '#f0e0ff',
      textSecondary: '#a080b0',
      border: 'rgba(184, 41, 221, 0.3)',
      success: '#b829dd',
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
    labels: {
      aiSearchTitle: '生命探测',
      aiSearchSubtitle: 'LIFE FORM DETECTION',
      aiSearchButton: '启动探测',
      aiSearching: '生命扫描中...',
      name: '生命体标识 // IDENTITY',
      age: '年龄周期 // AGE CYCLE',
      education: '知识等级 // KNOWLEDGE',
      tenure: '服务时长 // SERVICE',
      graduationTenure: '进化年限 // EVOLUTION',
      certificates: '能力认证 // ABILITY',
      search: '探测 // DETECT',
      download: '提取 // EXTRACT',
      matchScore: '适配度 // FIT',
      logout: '断开 // DISCONNECT',
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
    labels: {
      aiSearchTitle: '神启筛选',
      aiSearchSubtitle: 'DIVINE SEARCH',
      aiSearchButton: '启示录',
      aiSearching: '神谕降临中...',
      name: '灵魂之名 // NAME',
      age: '岁月轮回 // AGE',
      education: '智慧等级 // WISDOM',
      tenure: '奉献时长 // DEDICATION',
      graduationTenure: '觉醒年限 // AWAKENING',
      certificates: '圣印认证 // SEAL',
      search: '预言 // PROPHECY',
      download: '圣典 // SCRIPTURE',
      matchScore: '契合度 // BOND',
      logout: '归隐 // RETREAT',
    },
  },
};

export const defaultTheme: ThemeType = 'classic';

export const getTheme = (themeId: ThemeType): Theme => themes[themeId];

export const getAllThemes = (): Theme[] => Object.values(themes);
