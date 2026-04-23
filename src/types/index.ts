// 全局类型定义

// 筛选状态
export interface FilterState {
  name: string;
  ageMin: number;
  ageMax: number;
  education: string[];
  major: string[];
  certificate: string;
  employeeId: string;
  tenureMin: number;
  tenureMax: number;
  graduationTenureMin: number;
  graduationTenureMax: number;
}

// 用户类型
export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'member';
  enabled: boolean;
  createdAt: Date;
  lastPasswordChange?: Date;
  avatar?: string;
  permissions?: {
    fileUpload: boolean;
    search: boolean;
    download: boolean;
    adminPanel: boolean;
    dataDelete: boolean;
  };
}

// 人员类型
export interface Person {
  id: number | string;
  name: string;
  age: number;
  education: string;
  major: string;
  certificates: string[];
  employeeId: string;
  certificateColumns: { [key: string]: string };
  tenure: number;
  graduationTenure: number;
  originalData: any;
  _matchScore?: number;
  _matchDetails?: string;
}

// 数据集类型
export interface DataSet {
  id: string;
  name: string;
  count: number;
  createdAt: Date;
  updatedAt?: Date;
  data?: Person[];
  certificateOptions: string[];
}

// 日志类型
export interface LogEntry {
  id: string;
  time: Date;
  message: string;
  type: 'info' | 'success' | 'error';
}

// AI配置类型
export interface AIConfig {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

// 主题类型
export type ThemeType = 'classic' | 'lighthouse' | 'chimera' | 'mana';
