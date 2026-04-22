import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { storageService, User, Person, DataSet } from './storageService';
import { useTheme } from './contexts/ThemeContext';
import { ThemeSwitcher } from './components/ThemeSwitcher';

interface FilterState {
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

const EXCLUDED_CERT_KEYWORDS = ['教育形式', '普通高等教育', '成人教育', '自学考试', '非全日制', '全日制', '函授', '网络教育'];

const COMPREHENSIVE_CERT_MAPPINGS: { [key: string]: string } = {
  '软考': '软考体系', '软考体系': '软考体系',
  '系统分析师': '软考体系', '信息系统项目管理师': '软考体系',
  '系统集成': '软考体系', '系统集成项目经理': '软考体系', '系统集成项目管理工程师': '软考体系',
  '系统架构师': '软考体系', '系统架构设计师': '软考体系',
  '网络规划设计师': '软考体系', '网络工程师': '软考体系',
  '高级工程师': '其他 IT 认证',
  '工信部': '工信部其他认证', '工信部其他认证': '工信部其他认证',
  '通信': '工信部其他认证', '网络安全': '工信部其他认证',
  '阿里云': '阿里云、腾讯云', '阿里云、腾讯云': '阿里云、腾讯云', '腾讯云': '阿里云、腾讯云',
  '云认证': '阿里云、腾讯云', '云架构师': '阿里云、腾讯云', '云计算': '阿里云、腾讯云',
  '华为': '华为、华三、CISP、ITSS', '华三': '华为、华三、CISP、ITSS',
  'h3c': '华为、华三、CISP、ITSS', 'H3C': '华为、华三、CISP、ITSS',
  'CISP': '华为、华三、CISP、ITSS', 'cisp': '华为、华三、CISP、ITSS',
  'ITSS': '华为、华三、CISP、ITSS',
  'ccna': '思科、甲骨文、微软、EXIN、Linux', 'ccnp': '思科、甲骨文、微软、EXIN、Linux', 'ccie': '思科、甲骨文、微软、EXIN、Linux',
  'CCNA': '思科、甲骨文、微软、EXIN、Linux', 'CCNP': '思科、甲骨文、微软、EXIN、Linux', 'CCIE': '思科、甲骨文、微软、EXIN、Linux',
  'ITIL': 'ITIL、CKA/CKS、Vmware、Redhead', 'CKA': 'ITIL、CKA/CKS、Vmware、Redhead',
  'CKS': 'ITIL、CKA/CKS、Vmware、Redhead', 'Vmware': 'ITIL、CKA/CKS、Vmware、Redhead',
  'Redhead': 'ITIL、CKA/CKS、Vmware、Redhead', 'redhat': 'ITIL、CKA/CKS、Vmware、Redhead',
  '红帽': 'ITIL、CKA/CKS、Vmware、Redhead', '红帽认证': 'ITIL、CKA/CKS、Vmware、Redhead',
  'RHCE': 'ITIL、CKA/CKS、Vmware、Redhead', 'RHCA': 'ITIL、CKA/CKS、Vmware、Redhead',
  '思科': '思科、甲骨文、微软、EXIN、Linux', 'cisco': '思科、甲骨文、微软、EXIN、Linux',
  'Cisco': '思科、甲骨文、微软、EXIN、Linux', 'Cisco思科': '思科、甲骨文、微软、EXIN、Linux',
  '甲骨文': '思科、甲骨文、微软、EXIN、Linux', 'oracle': '思科、甲骨文、微软、EXIN、Linux',
  'Oracle': '思科、甲骨文、微软、EXIN、Linux', 'ORACLE': '思科、甲骨文、微软、EXIN、Linux',
  '微软': '思科、甲骨文、微软、EXIN、Linux', '微软工程师': '思科、甲骨文、微软、EXIN、Linux',
  'EXIN': '思科、甲骨文、微软、EXIN、Linux', 'exin': '思科、甲骨文、微软、EXIN、Linux',
  'Linux': '思科、甲骨文、微软、EXIN、Linux', 'linux': '思科、甲骨文、微软、EXIN、Linux',
  'pmi': 'PMP', 'PMI': 'PMP',
  'PMP': 'PMP', 'pmp': 'PMP',
  '全媒体运营师': '全媒体运营师、NDPD等运营及产品相关计算机等级',
  'NDPD': '全媒体运营师、NDPD等运营及产品相关计算机等级',
  'ndpd': '全媒体运营师、NDPD等运营及产品相关计算机等级',
  '天宫认证': '全媒体运营师、NDPD等运营及产品相关计算机等级',
  '产品体验师': '全媒体运营师、NDPD等运营及产品相关计算机等级',
  '产品体验': '全媒体运营师、NDPD等运营及产品相关计算机等级',
  '计算机等级': '全媒体运营师、NDPD等运营及产品相关计算机等级',
  '其他IT认证': '其他 IT 认证', '其他 it 认证': '其他 IT 认证',
  '其他 IT 认证': '其他 IT 认证', '其他认证': '其他认证', '其他资质': '其他认证',
  '财会类': '其他认证', '人力资源类': '其他认证', '教育类': '其他认证', '语言类': '其他认证'
};

const hiddenColumns = ['PMP取证时间', 'PMP取证年限（年）', 'PMP是否过期'];

const BASE_CERT_CATEGORIES = [
  '软考体系', '工信部其他认证', '阿里云、腾讯云', '华为、华三、CISP、ITSS',
  'ITIL、CKA/CKS、Vmware、Redhead', '思科、甲骨文、微软、EXIN、Linux',
  '全媒体运营师、NDPD等运营及产品相关计算机等级', '计算机等级', '其他 IT 认证', '其他认证', 'PMP'
];

const getPersonAge = (person: any): number => {
  if (person.age) return parseInt(String(person.age)) || 0;
  const od = person.originalData || {};
  for (const key of Object.keys(od)) {
    const k = key.replace(/\s/g, '').toLowerCase();
    if (k === '年龄' || k === 'age' || k === '周岁' || k.includes('年龄') || k.includes('周岁')) {
      const v = parseFloat(String(od[key]));
      if (v && v > 0 && v < 150) return v;
    }
  }
  return 0;
};

const COMPANY_TENURE_FIELDS = [
  '入司年限', '入司年限（年）', '入司时间', '司龄'
];

const GRADUATION_TENURE_FIELDS = [
  '毕业年限', '毕业年限（年）', '毕业时间', '工作年限', '从业年限'
];

const getPersonCompanyTenureValue = (person: any): number => {
  if (person.tenure !== undefined && person.tenure !== null && Number(person.tenure) >= 0) {
    return Number(person.tenure);
  }
  const od = person.originalData || {};
  for (const key of Object.keys(od)) {
    const k = key.replace(/\s/g, '').toLowerCase();
    const matched = COMPANY_TENURE_FIELDS.find(fn =>
      k === fn.toLowerCase() || k.includes(fn.replace(/\s/g, '').toLowerCase())
    );
    if (matched) {
      const v = parseFloat(String(od[key]));
      if (!isNaN(v) && v >= 0) return v;
    }
  }
  return 0;
};

const getPersonGraduationTenureValue = (person: any): number => {
  if (person.graduationTenure !== undefined && person.graduationTenure !== null) {
    return Number(person.graduationTenure);
  }
  const od = person.originalData || {};
  for (const key of Object.keys(od)) {
    const k = key.replace(/\s/g, '').toLowerCase();
    const matched = GRADUATION_TENURE_FIELDS.find(fn =>
      k === fn.toLowerCase() || k.includes(fn.replace(/\s/g, '').toLowerCase())
    );
    if (matched) {
      const v = parseFloat(String(od[key]));
      if (!isNaN(v) && v >= 0) return v;
    }
  }
  return 0;
};

const PM_QUALIFICATION_CERTS = [
  '高级工程师',
  '工程咨询师',
  '信息系统项目管理师',
  '系统集成项目经理',
  'PMP'
];

const PM_CERT_ALIASES: { [key: string]: string[] } = {
  '高级工程师': ['高级工程师', '高级(工程师)', '高工'],
  '工程咨询师': ['工程咨询师', '工程咨询', '咨询工程师', '咨询师'],
  '信息系统项目管理师': ['信息系统项目管理师', '信管师', '信息系统项目管理', '软考高级项目管理'],
  '系统集成项目经理': ['系统集成项目经理', '系统集成项目管理工程师', '系统集成项目', '系集项目经理', '系集'],
  'PMP': ['PMP', 'pmp', 'PMP项目管理专业人士资格认证', 'PMI']
};

const getPMQualificationScore = (person: any): { count: number; score: number; details: string[] } => {
  const details: string[] = [];
  let matchedCount = 0;
  const personCertNorm = (certName: string): string => certName.replace(/\s/g, '').toLowerCase();

  const allCerts: string[] = [];
  if (Array.isArray(person.certificates)) {
    person.certificates.forEach((c: any) => {
      const name = typeof c === 'string' ? c : (c.name || c.value || String(c) || '');
      if (name) allCerts.push(name);
    });
  }
  if (person.certificateColumns) {
    Object.entries(person.certificateColumns).forEach(([colName, colValue]) => {
      const valStr = String(colValue || '').trim();
      if (!valStr || ['否', '无', '-', '/', 'N/A'].includes(valStr) || valStr.toLowerCase() === 'no') return;
      if (['是', '有'].includes(valStr)) {
        allCerts.push(colName.trim());
      } else {
        allCerts.push(valStr);
      }
    });
  }

  const allCertNorms = allCerts.map(c => personCertNorm(c));

  for (const pmCert of PM_QUALIFICATION_CERTS) {
    const aliases = PM_CERT_ALIASES[pmCert] || [pmCert];
    let found = false;
    for (const alias of aliases) {
      const aliasNorm = alias.replace(/\s/g, '').toLowerCase();
      if (allCertNorms.some(cn => cn.includes(aliasNorm) || aliasNorm.includes(cn))) {
        found = true;
        break;
      }
    }
    if (found) {
      matchedCount++;
      details.push(pmCert);
    }
  }

  let score = 0;
  if (matchedCount >= 2) score = 2;
  else if (matchedCount >= 1) score = 1;

  return { count: matchedCount, score, details };
};

interface EnrichedPerson extends Person {
  _pmScore?: { count: number; score: number; details: string[] };
  _certMatchInfo?: { matched: number; total: number; score: string } | null;
  _certDisplay?: string;
}

const enrichPersonData = (person: Person, searchCertString?: string): EnrichedPerson => {
  const enriched = { ...person } as EnrichedPerson;

  enriched._pmScore = getPMQualificationScore(person);

  const searchCerts: string[] = (() => {
    if (!searchCertString) return [];
    const raw = searchCertString.trim();
    if (!raw) return [];
    return raw.split(/[,，;；、]/).map(c => c.trim()).filter(c => c.length >= 1);
  })();

  if (searchCerts.length > 0) {
    const searchCertTerms = searchCerts.map(c => c.replace(/\s/g, '').toLowerCase());

    const localNormalize = (raw: string): string[] => {
      const cleaned = raw.replace(/\s/g, '').toLowerCase();
      const v: string[] = [cleaned];
      const np = cleaned.replace(/[（(][^）)]*[）)]/g, '');
      if (np && np !== cleaned) v.push(np);
      v.push(...np.split(/[,，、\/\\]/).filter(p => p.length >= 2));
      return [...new Set(v)];
    };

    let matched = 0;
    searchCerts.forEach(term => {
      const termVariants = localNormalize(term);
      let targetCol: string | null = null;
      for (const [k, col] of Object.entries(COMPREHENSIVE_CERT_MAPPINGS)) {
        if (k.replace(/\s/g, '').toLowerCase() === termVariants[0] ||
            termVariants.some(tv => k.replace(/\s/g, '').toLowerCase() === tv)) {
          targetCol = col;
          break;
        }
      }
      if (Array.isArray(person.certificates)) {
        const found = person.certificates.some((cert: any) => {
          const cn = typeof cert === 'string' ? cert : (cert.name || cert.value || '');
          return termVariants.some(tv => cn.replace(/\s/g, '').toLowerCase().includes(tv));
        });
        if (found) { matched++; return; }
      }
      if (person.certificateColumns) {
        const isMapped = !!targetCol;
        const tcn = targetCol ? targetCol.replace(/\s/g, '').toLowerCase() : null;
        let mappedChecked = false;

        for (const [cName, cVal] of Object.entries(person.certificateColumns)) {
          const vs = String(cVal || '').trim();
          if (!vs || ['否', '无', '-', '/', 'N/A'].includes(vs) || vs.toLowerCase() === 'no') continue;
          if (hiddenColumns.some(h => cName.includes(h))) continue;
          const vn = vs.replace(/\s/g, '').toLowerCase();
          const cnn = cName.replace(/\s/g, '').toLowerCase();
          const isBooleanValue = ['是', '有'].includes(vs);

          if (isMapped && tcn) {
            if (cnn.includes(tcn) || tcn.includes(cnn)) {
              mappedChecked = true;
              if (isBooleanValue) {
                if (termVariants.some(tv => cnn.includes(tv) || tv.includes(cnn))) { matched++; return; }
              } else {
                if (termVariants.some(tv => vn.includes(tv) || tv.includes(vn))) { matched++; return; }
              }
            }
          } else {
            if (isBooleanValue) {
              if (termVariants.some(tv => cnn.includes(tv) || tv.includes(cnn))) { matched++; return; }
            } else {
              if (termVariants.some(tv => vn.includes(tv) || cnn.includes(tv))) { matched++; return; }
            }
          }
        }

        if (isMapped && tcn && !mappedChecked) {
          for (const [, cVal] of Object.entries(person.certificateColumns)) {
            const vs = String(cVal || '').trim();
            if (!vs || ['否', '无', '-', '/', 'N/A'].includes(vs) || vs.toLowerCase() === 'no') continue;
            if (['是', '有'].includes(vs)) continue;
            if (termVariants.some(tv => vs.replace(/\s/g, '').toLowerCase().includes(tv))) { matched++; return; }
          }
        }

        if (isMapped && tcn && mappedChecked) {
          for (const [cName, cVal] of Object.entries(person.certificateColumns)) {
            if (hiddenColumns.some(h => cName.includes(h))) continue;
            const vs = String(cVal || '').trim();
            if (!vs || ['否', '无', '-', '/', 'N/A'].includes(vs) || vs.toLowerCase() === 'no') continue;
            const cnn = cName.replace(/\s/g, '').toLowerCase();
            if ((cnn.includes(tcn) || tcn.includes(cnn)) && ['是', '有'].includes(vs)) {
              if (termVariants.some(tv => cnn.includes(tv) || tv.includes(cnn))) { matched++; return; }
            }
          }
        }
      }
    });

    const total = searchCertTerms.length;
    let scoreStr = '-';
    if (matched >= total) scoreStr = `全匹配✓`;
    else if (matched > 0) scoreStr = `${matched}个✓`;
    enriched._certMatchInfo = { matched, total, score: scoreStr };
  }

  const aggregatedCerts = new Set<string>();
  if (Array.isArray(person.certificates)) {
    person.certificates.forEach((cert: any) => {
      const name = typeof cert === 'string' ? cert : (cert.name || cert.value || '');
      if (name && name.trim()) {
        const isHidden = hiddenColumns.some(h => name.includes(h));
        const isExcluded = EXCLUDED_CERT_KEYWORDS.some(kw => name.includes(kw));
        if (!isHidden && !isExcluded) aggregatedCerts.add(name.trim());
      }
    });
  }
  if (person.certificateColumns) {
    Object.entries(person.certificateColumns).forEach(([colName, colValue]) => {
      if (colName.includes('教育形式')) return;
      const valStr = String(colValue || '').trim();
      if (!valStr || ['否', '无', '-', '/', 'N/A'].includes(valStr) || valStr.toLowerCase() === 'no') return;
      let displayName: string;
      if (['是', '有'].includes(valStr)) displayName = colName.trim();
      else displayName = valStr;
      const isHidden = hiddenColumns.some(h => displayName.includes(h));
      const isExcluded = EXCLUDED_CERT_KEYWORDS.some(kw => displayName.includes(kw));
      if (!isHidden && !isExcluded) aggregatedCerts.add(displayName);
    });
  }
  enriched._certDisplay = Array.from(aggregatedCerts).join('、');

  return enriched;
};


const App: React.FC = () => {
  const { currentTheme } = useTheme();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [people, setPeople] = useState<Person[]>([]);
  const [filteredPeople, setFilteredPeople] = useState<Person[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    name: '',
    ageMin: 0,
    ageMax: 100,
    education: [],
    major: [],
    certificate: '',
    employeeId: '',
    tenureMin: 0,
    tenureMax: 50,
    graduationTenureMin: 0,
    graduationTenureMax: 50,
  });
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [certificateOptions, setCertificateOptions] = useState<string[]>([]);
  const [majorOptions, setMajorOptions] = useState<string[]>([]);
  const [certificateError, setCertificateError] = useState<string>('');
  const [showCertDropdown, setShowCertDropdown] = useState<boolean>(false);
  const [filteredCertOptions, setFilteredCertOptions] = useState<string[]>([]);
  const [selectedCertIndex, setSelectedCertIndex] = useState<number>(-1);
  const [blurTimeout, setBlurTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const certInputRef = React.useRef<HTMLInputElement>(null);

  // 分页相关状态
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 50; // 每页显示条数
  const [filteredCurrentPage, setFilteredCurrentPage] = useState<number>(1);
  
  // 密码管理相关状态
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  
  // 权限编辑相关状态
  const [showPermissionModal, setShowPermissionModal] = useState<boolean>(false);
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<User | null>(null);
  const [userPermissions, setUserPermissions] = useState<{
    fileUpload: boolean;
    search: boolean;
    download: boolean;
    adminPanel: boolean;
    dataDelete: boolean;
  }>({
    fileUpload: true,
    search: true,
    download: true,
    adminPanel: false,
    dataDelete: false
  });
  
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');
  const [showEducationDropdown, setShowEducationDropdown] = useState<boolean>(false);
  const [isFullTime, setIsFullTime] = useState<boolean | null>(null);
  const [showMajorDropdown, setShowMajorDropdown] = useState<boolean>(false);
  const [majorSearchText, setMajorSearchText] = useState<string>('');
  const [filteredMajorOptions, setFilteredMajorOptions] = useState<string[]>([]);
  const [selectedMajorIndex, setSelectedMajorIndex] = useState<number>(-1);
  const majorInputRef = React.useRef<HTMLInputElement>(null);
  const [showAgeDropdown, setShowAgeDropdown] = useState<boolean>(false);
  const [showTenureDropdown, setShowTenureDropdown] = useState<boolean>(false);
  const [showGraduationTenureDropdown, setShowGraduationTenureDropdown] = useState<boolean>(false);
  const [files, setFiles] = useState<{ id: string; name: string; size: number; uploadedAt: Date }[]>([]);
  const [modules, setModules] = useState<{
    fileUpload: boolean;
    search: boolean;
    download: boolean;
    adminPanel: boolean;
  }>({
    fileUpload: true,
    search: true,
    download: true,
    adminPanel: true
  });
  const [userRole, setUserRole] = useState<'admin' | 'member'>('admin');
  const [users, setUsers] = useState<User[]>([]);
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<Omit<User, 'id' | 'createdAt'>>({
    username: '',
    password: '',
    role: 'member',
    enabled: true
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [showContactModal, setShowContactModal] = useState<boolean>(false);
  const [selectedPeople, setSelectedPeople] = useState<(string | number)[]>([]);
  const [dataSets, setDataSets] = useState<DataSet[]>([]);
  const [currentDataSetId, setCurrentDataSetId] = useState<string | null>(null);
  const [showDataSetModal, setShowDataSetModal] = useState<boolean>(false);
  
  // AI 智能搜索状态
  const [smartQuery, setSmartQuery] = useState<string>('');
  const [isSmartSearching, setIsSmartSearching] = useState<boolean>(false);
  const [aiDiagnosticInfo, setAiDiagnosticInfo] = useState<string>('');
  const [showAISettings, setShowAISettings] = useState<boolean>(false);
  const [aiProvider, setAiProvider] = useState<string>('deepseek');
  const [aiApiKey, setAiApiKey] = useState<string>('');
  const [aiBaseUrl, setAiBaseUrl] = useState<string>('');
  const [aiModel, setAiModel] = useState<string>('');
  const [aiConfigSaved, setAiConfigSaved] = useState<boolean>(false);

  // 从持久化存储加载AI配置（仅在挂载时执行一次）
  useEffect(() => {
    const savedConfig = storageService.getAIConfig();
    if (savedConfig) {
      if (savedConfig.provider) setAiProvider(savedConfig.provider);
      if (savedConfig.apiKey) setAiApiKey(savedConfig.apiKey);
      if (savedConfig.baseUrl) setAiBaseUrl(savedConfig.baseUrl);
      if (savedConfig.model) setAiModel(savedConfig.model);
      setAiConfigSaved(true);
    }
  }, []);

  // 防抖自动保存AI配置
  useEffect(() => {
    const timer = setTimeout(() => {
      const config = { provider: aiProvider, apiKey: aiApiKey, baseUrl: aiBaseUrl, model: aiModel };
      storageService.saveAIConfig(config);
      setAiConfigSaved(true);
    }, 800);
    return () => clearTimeout(timer);
  }, [aiProvider, aiApiKey, aiBaseUrl, aiModel]);

  // 记录日志
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleString();
    const operator = username || 'admin';
    setLogs(prev => [...prev, `[${timestamp}] [${operator}] ${message}`]);
  };
  
  // 密码验证函数（用于修改密码）
  const validatePassword = (password: string): boolean => {
    const check = validatePasswordStrength(password);
    if (!check.valid) {
      setPasswordError(check.message);
      return false;
    }
    return true;
  };
  
  // 处理密码修改
  const handlePasswordChange = async () => {
    // 重置错误信息
    setPasswordError('');
    
    // 验证当前密码
    const currentUser = users.find(user => user.username === username);
    if (!currentUser || currentUser.password !== currentPassword) {
      setPasswordError('当前密码错误');
      return;
    }
    
    // 验证新密码
    if (!validatePassword(newPassword)) {
      return;
    }
    
    // 验证确认密码
    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的密码不一致');
      return;
    }
    
    // 更新密码
    const updatedUser = {
      ...currentUser,
      password: newPassword,
      lastPasswordChange: new Date()
    };

    try {
      // 使用新的存储服务更新用户密码
      await storageService.updateUser(updatedUser);
      
      // 更新React状态
      const updatedUsers = users.map(user => user.id === currentUser.id ? updatedUser : user);
      setUsers(updatedUsers);
      // 记录日志
      addLog(`用户 ${username} 修改了密码`);
      // 显示成功消息
      displayAlert('密码修改成功', 'success');
      // 重置表单
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordModal(false);
    } catch (error) {
      console.error('修改密码失败:', error);
      // 记录日志
      addLog(`用户 ${username} 修改密码失败`);
      // 显示错误消息
      displayAlert('密码修改失败，数据无法保存到数据库', 'error');
    }
  };
  
  // 处理管理员重置用户密码
  const handleResetUserPassword = async (userId: string, username: string) => {
    const newPassword = prompt('请输入新密码:', '');
    if (!newPassword) return;
    
    // 验证新密码
    if (!validatePassword(newPassword)) {
      return;
    }
    
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const updatedUser = {
      ...user,
      password: newPassword,
      lastPasswordChange: new Date()
    };

    try {
      // 使用新的存储服务更新用户密码
      await storageService.updateUser(updatedUser);
      
      // 更新React状态
      const updatedUsers = users.map(user => user.id === userId ? updatedUser : user);
      setUsers(updatedUsers);
      // 记录日志
      addLog(`管理员重置了用户 ${username} 的密码`);
      // 显示成功消息
      displayAlert(`用户 ${username} 的密码重置成功`, 'success');
    } catch (error) {
      console.error('重置密码失败:', error);
      // 记录日志
      addLog(`管理员重置用户 ${username} 的密码失败`);
      // 显示错误消息
      displayAlert(`用户 ${username} 的密码重置失败，数据无法保存到数据库`, 'error');
    }
  };
  
  // 处理权限编辑
  const handlePermissionEdit = (user: User) => {
    setEditingPermissionsUser(user);
    setUserPermissions({
      fileUpload: user.permissions?.fileUpload ?? true,
      search: user.permissions?.search ?? true,
      download: user.permissions?.download ?? true,
      adminPanel: user.permissions?.adminPanel ?? false,
      dataDelete: user.permissions?.dataDelete ?? false
    });
    setShowPermissionModal(true);
  };
  
  // 处理权限保存
  const handlePermissionSave = async () => {
    if (!editingPermissionsUser) return;

    const updatedUser = {
      ...editingPermissionsUser,
      permissions: userPermissions
    };

    try {
      // 使用新的存储服务更新用户权限
      await storageService.updateUser(updatedUser);
      
      // 更新React状态
      const updatedUsers = users.map(user => user.id === editingPermissionsUser.id ? updatedUser : user);
      setUsers(updatedUsers);
      // 记录日志
      addLog(`管理员修改了用户 ${editingPermissionsUser.username} 的权限`);
      // 显示成功消息
      displayAlert(`用户 ${editingPermissionsUser.username} 的权限更新成功`, 'success');
      // 关闭模态框
      setShowPermissionModal(false);
      setEditingPermissionsUser(null);
    } catch (error) {
      console.error('更新权限失败:', error);
      // 记录日志
      addLog(`管理员修改用户 ${editingPermissionsUser.username} 的权限失败`);
      // 显示错误消息
      displayAlert(`用户 ${editingPermissionsUser.username} 的权限更新失败，数据无法保存到数据库`, 'error');
    }
  };

  // 自定义弹框函数
  const displayAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
  };

  // 关闭弹框
  const closeAlert = () => {
    setShowAlert(false);
  };

  // 处理文件删除
  const handleFileDelete = (fileId: string, fileName: string) => {
    if (userRole !== 'admin') {
      displayAlert('权限不足，只有管理员可以删除文件', 'error');
      return;
    }

    if (window.confirm(`确定要删除文件 "${fileName}" 吗？`)) {
      setFiles(prev => prev.filter(file => file.id !== fileId));
      addLog(`文件删除成功: ${fileName}`);
      displayAlert(`文件 "${fileName}" 删除成功`, 'success');
    }
  };

  // 处理数据集删除
  const handleDeleteDataSet = async (dataSetId: string, dataSetName: string) => {
    if (userRole !== 'admin') {
      displayAlert('权限不足，只有管理员可以删除数据集', 'error');
      return;
    }

    try {
      await storageService.deleteDataSet(dataSetId);

      // 更新本地状态
      const updatedDataSets = dataSets.filter(ds => ds.id !== dataSetId);
      setDataSets(updatedDataSets);

      // 如果删除的是当前数据集，清空当前数据
      if (currentDataSetId === dataSetId) {
        setCurrentDataSetId(null);
        setPeople([]);
        setFilteredPeople([]);
        setCertificateOptions([]);
        setMajorOptions([]);
      }

      addLog(`删除数据集: ${dataSetName}`);
      displayAlert(`数据集 "${dataSetName}" 删除成功`, 'success');

      // 如果删除后没有数据集了，关闭模态框
      if (updatedDataSets.length === 0) {
        setShowDataSetModal(false);
      }
    } catch (error) {
      console.error('删除数据集失败:', error);
      displayAlert('删除数据集失败，请稍后重试', 'error');
    }
  };

  // 处理模块状态切换
  const handleModuleToggle = (module: keyof typeof modules) => {
    if (userRole !== 'admin') {
      displayAlert('权限不足，只有管理员可以修改模块状态', 'error');
      return;
    }
    
    setModules(prev => ({
      ...prev,
      [module]: !prev[module]
    }));
    addLog(`${module} 模块状态已切换为 ${!modules[module]}`);
  };

  // 处理用户角色切换
  const handleRoleChange = (role: 'admin' | 'member') => {
    setUserRole(role);
    addLog(`用户角色已切换为 ${role}`);
  };

  // 密码强度验证函数
  const validatePasswordStrength = (password: string): { valid: boolean; message: string } => {
    // 密码长度至少6位
    if (password.length < 6) {
      return { valid: false, message: '密码长度至少6位' };
    }
    // 密码必须包含至少一个数字
    if (!/\d/.test(password)) {
      return { valid: false, message: '密码必须包含至少一个数字' };
    }
    // 密码必须包含至少一个字母
    if (!/[a-zA-Z]/.test(password)) {
      return { valid: false, message: '密码必须包含至少一个字母' };
    }
    return { valid: true, message: '' };
  };

  // 验证用户输入
  const validateUserInput = (userData: Omit<User, 'id' | 'createdAt'>): {[key: string]: string} => {
    const errors: {[key: string]: string} = {};

    // 验证用户名
    if (!userData.username.trim()) {
      errors.username = '用户名不能为空';
    } else if (userData.username.length < 3) {
      errors.username = '用户名至少需要3个字符';
    } else if (users.some(user => user.username === userData.username && user.id !== editingUser?.id)) {
      errors.username = '用户名已存在';
    }

    // 验证密码强度
    const passwordCheck = validatePasswordStrength(userData.password);
    if (!passwordCheck.valid) {
      errors.password = passwordCheck.message;
    }

    return errors;
  };

  // 处理用户创建
  const handleUserCreate = async () => {
    // 验证输入
    const errors = validateUserInput(newUser);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    // 自定义确认对话框
    const confirmMessage = `确认创建用户？\n\n用户名: ${newUser.username}\n角色: ${newUser.role === 'admin' ? '管理员' : '成员'}\n状态: ${newUser.enabled ? '启用' : '禁用'}`;
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    setIsLoading(true);
    setValidationErrors({});
    
    try {
      // 使用新的存储服务创建用户
      const createdUser = await storageService.createUser(newUser);
      
      // 更新React状态
      const updatedUsers = [...users, createdUser];
      setUsers(updatedUsers);
      
      // 注意：storageService.createUser已经调用了saveUsers，这里不需要再次保存
      addLog(`创建用户: ${createdUser.username} (${createdUser.role})`);
      
      // 显示成功反馈
      displayAlert('用户创建成功', 'success');
      
      // 延迟关闭模态框，确保弹窗显示
      setTimeout(() => {
        setNewUser({ username: '', password: '', role: 'member', enabled: true });
        setShowUserModal(false);
      }, 500);

      // 验证创建结果
      const verifyUser = await storageService.getUserByUsername(createdUser.username);
      if (!verifyUser) {
        displayAlert('用户创建可能存在问题，请刷新页面检查', 'info');
      }
    } catch (error) {
      console.error('创建用户失败:', error);
      addLog(`创建用户失败: ${newUser.username} (${newUser.role})`);
      displayAlert('用户创建失败，数据无法保存到数据库', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理用户编辑
  const handleUserEdit = (user: User) => {
    setEditingUser(user);
    setNewUser({ username: user.username, password: user.password, role: user.role, enabled: user.enabled });
    setShowUserModal(true);
  };

  // 处理用户更新
  const handleUserUpdate = async () => {
    if (!editingUser) return;

    // 验证输入
    const errors = validateUserInput(newUser);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // 二次确认
    if (!window.confirm(`确认要更新用户 "${newUser.username}" 吗？`)) {
      return;
    }

    setIsLoading(true);
    setValidationErrors({});

    const updatedUser: User = {
      ...editingUser,
      ...newUser
    };

    try {
      // 使用新的存储服务更新用户
      await storageService.updateUser(updatedUser);
      
      // 更新React状态
      const updatedUsers = users.map(user => user.id === editingUser.id ? updatedUser : user);
      setUsers(updatedUsers);
      addLog(`更新用户: ${updatedUser.username} (${updatedUser.role})`);
      displayAlert('用户更新成功', 'success');
      
      // 延迟关闭模态框，确保弹窗显示
      setTimeout(() => {
        setEditingUser(null);
        setNewUser({ username: '', password: '', role: 'member', enabled: true });
        setShowUserModal(false);
      }, 500);
    } catch (error) {
      console.error('更新用户失败:', error);
      addLog(`更新用户失败: ${updatedUser.username} (${updatedUser.role})`);
      displayAlert('用户更新失败，数据无法保存到数据库', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理用户禁用/启用
  const handleUserToggle = async (userId: string, enabled: boolean) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const updatedUser = { ...user, enabled: !enabled };

    try {
      // 使用新的存储服务更新用户状态
      await storageService.updateUser(updatedUser);
      
      // 更新React状态
      const updatedUsers = users.map(user => user.id === userId ? updatedUser : user);
      setUsers(updatedUsers);
      addLog(`${enabled ? '禁用' : '启用'}用户: ${user.username}`);
    } catch (error) {
      console.error('更新用户状态失败:', error);
      addLog(`${enabled ? '禁用' : '启用'}用户失败: ${user.username}`);
      displayAlert('用户状态更新失败，数据无法保存到数据库', 'error');
    }
  };

  // 处理用户删除
  const handleUserDelete = async (userId: string, targetUsername: string) => {
    if (userId === '1') { // 保护管理员账户
      displayAlert('无法删除管理员账户', 'error');
      return;
    }

    if (window.confirm(`确定要删除用户 "${targetUsername}" 吗？`)) {
      try {
        // 使用新的存储服务删除用户
        await storageService.deleteUser(userId);
        
        // 更新React状态
        const updatedUsers = users.filter(user => user.id !== userId);
        setUsers(updatedUsers);
        addLog(`删除用户: ${targetUsername}`);
        displayAlert('用户删除成功', 'success');
      } catch (error) {
        console.error('删除用户失败:', error);
        addLog(`删除用户失败: ${targetUsername}`);
        displayAlert('用户删除失败，数据无法从数据库中删除', 'error');
      }
    }
  };

  // 处理单条数据删除
  const handlePersonDelete = (personId: string | number, personName: string) => {
    if (window.confirm(`确定要删除人员 "${personName}" 的数据吗？`)) {
      setPeople(prev => prev.filter(person => person.id !== personId));
      addLog(`删除人员数据: ${personName}`);
      displayAlert('人员数据删除成功', 'success');
    }
  };

  // 处理批量数据删除
  const handleBatchDelete = () => {
    if (selectedPeople.length === 0) {
      displayAlert('请选择要删除的人员数据', 'error');
      return;
    }

    if (window.confirm(`确定要删除选中的 ${selectedPeople.length} 条人员数据吗？`)) {
      const deletedNames = people.filter(person => selectedPeople.includes(person.id)).map(person => person.name);
      setPeople(prev => prev.filter(person => !selectedPeople.includes(person.id)));
      setSelectedPeople([]);
      addLog(`批量删除人员数据: ${deletedNames.join(', ')}`);
      displayAlert(`成功删除 ${selectedPeople.length} 条人员数据`, 'success');
    }
  };

  // 处理人员选择
  const handlePersonSelect = (personId: string | number) => {
    setSelectedPeople(prev => {
      if (prev.includes(personId)) {
        return prev.filter(id => id !== personId);
      } else {
        return [...prev, personId];
      }
    });
  };

  // 处理全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPeople(people.map(person => person.id));
    } else {
      setSelectedPeople([]);
    }
  };

  // 处理文件上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 重置文件输入框，确保可以重复选择同一文件
    e.target.value = '';

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isExcel) {
            displayAlert('请上传Excel格式的文件', 'error');
            addLog(`上传文件失败: 不支持的文件格式 - ${file.name}`);
            return;
          }

    if (isExcel) {
      addLog(`开始上传文件: ${file.name}`);
      
      // 开始上传，显示进度条
      setUploading(true);
      setUploadProgress(0);
      
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
               clearInterval(progressInterval);
               setUploading(false);
               setUploadProgress(0);
               displayAlert('文件读取失败', 'error');
               addLog(`上传文件失败: 文件读取失败 - ${file.name}`);
               return;
             }

          // 解析Excel数据
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
          
          if (jsonData.length === 0) {
            clearInterval(progressInterval);
            setUploading(false);
            setUploadProgress(0);
            displayAlert('Excel文件中没有数据', 'error');
            addLog(`上传文件失败: 无数据 - ${file.name}`);
            return;
          }

          // 获取表头
          const headers = Object.keys(jsonData[0] as object);
          
          // 检查表头是否为空
          const hasEmptyHeaders = headers.every(header => !header);
          if (hasEmptyHeaders) {
              clearInterval(progressInterval);
              setUploading(false);
              setUploadProgress(0);
              displayAlert('Excel文件表头为空，请确保第一行包含字段标题。', 'error');
              addLog(`上传文件失败: 表头为空 - ${file.name}`);
              return;
            }
          
          // 验证第一列（标题列）
          if (!headers[0]) {
            clearInterval(progressInterval);
            setUploading(false);
            setUploadProgress(0);
            displayAlert('Excel文件第一列（标题）不能为空', 'error');
            addLog(`上传文件失败: 第一列标题为空 - ${file.name}`);
            return;
          }
          
          // 检查表头是否包含必要的字段
          let hasNameField = false;
          let nameFieldIndex = 0; // 默认使用第一列作为姓名字段
          
          // 优先检查第一列
          const firstHeaderClean = headers[0].trim().toLowerCase();
          if (firstHeaderClean === '姓名' || firstHeaderClean === 'name' || firstHeaderClean.includes('姓名') || firstHeaderClean.includes('name')) {
            hasNameField = true;
          } else {
            // 如果第一列不是姓名字段，检查其他列
            for (let i = 0; i < headers.length; i++) {
              const headerClean = headers[i].trim().toLowerCase();
              if (headerClean === '姓名' || headerClean === 'name' || headerClean.includes('姓名') || headerClean.includes('name')) {
                hasNameField = true;
                nameFieldIndex = i;
                break;
              }
            }
          }
          

          
          if (!hasNameField) {
            clearInterval(progressInterval);
            setUploading(false);
            setUploadProgress(0);
            displayAlert(`Excel文件缺少必要的"姓名"字段。\n\n当前表头: ${headers.join(', ')}\n\n请确保表头中包含"姓名"或"name"字段，建议将姓名放在第一列。`, 'error');
            addLog(`上传文件失败: 缺少姓名字段 - ${file.name}`);
            return;
          }
          
          // 验证第一行数据（第一行实际数据）
          if (jsonData.length > 0) {
            const firstRow = jsonData[0] as Record<string, any>;
            
            // 检查第一行数据的第一列是否有值
            const firstColumnValue = firstRow[headers[0]];
            
            if (!firstColumnValue) {
              clearInterval(progressInterval);
              setUploading(false);
              setUploadProgress(0);
              displayAlert('Excel文件第一行数据的第一列不能为空', 'error');
              addLog(`上传文件失败: 第一行第一列数据为空 - ${file.name}`);
              return;
            }
            
            // 检查第一行数据是否包含有效的姓名
            let hasValidName = false;
            for (const [key, value] of Object.entries(firstRow)) {
              const keyClean = key.trim().toLowerCase();
              if ((keyClean === '姓名' || keyClean === 'name' || keyClean.includes('姓名') || keyClean.includes('name')) && value) {
                hasValidName = true;
                break;
              }
            }
            
            // 如果通过字段名没有找到姓名，尝试使用姓名字段索引
            if (!hasValidName && headers[nameFieldIndex]) {
              const nameField = headers[nameFieldIndex];
              if (firstRow[nameField]) {
                hasValidName = true;
              }
            }
            
            if (!hasValidName) {
              clearInterval(progressInterval);
              setUploading(false);
              setUploadProgress(0);
              displayAlert('Excel文件第一行数据缺少有效的姓名', 'error');
              addLog(`上传文件失败: 第一行数据无有效姓名 - ${file.name}`);
              return;
            }
          }

          // 定义字段映射配置 - 优化后的字段识别逻辑
          const fieldMappings = {
            name: ['姓名', 'name'],
            age: ['年龄', 'age'],
            education: ['学历', 'education'],
            major: ['专业', 'major'],
            employeeId: ['工号', 'employeeid', 'employee'],
            tenure: ['入司年限', '入司年限（年）', '入司时间', '司龄', 'tenure'],
            graduationTenure: ['毕业年限', '毕业年限（年）', '毕业时间', '工作年限', '从业年限']
          };
          
          const certificateColumnNames = [
            '红帽认证', 'ORACLE', 'Cisco思科', 'ITIL', '天宫认证', '产品体验师',
            '微软工程师', '系统分析师', '信息系统项目管理师', '系统集成项目经理',
            '系统集成项目管理工程师', '财会类', '人力资源类', '教育类', '语言类',
            '计算机等级', '其他资质', 'PMP',
            '软考体系', '工信部其他认证', '阿里云、腾讯云', '华为、华三、CISP、ITSS',
            'ITIL、CKA/CKS、Vmware、Redhead', '思科、甲骨文、微软、EXIN、Linux',
            '全媒体运营师、NDPD等运营及产品相关计算机等级', '其他 IT 认证', '其他认证'
          ];

          const certColumnPatterns = [
            /系统架构师/i, /系统分析师/i, /信息系统项目管理/i, /系统集成项目/i,
            /网络规划师/i, /网络工程师/i, /高级工程师/i, /工程咨询师/i,
            /软考/i, /工信部/i, /阿里云/i, /腾讯云/i, /华为/i, /华三/i, /H3C/i,
            /CISP/i, /ITSS/i, /CCNA/i, /CCNP/i, /CCIE/i,
            /ITIL/i, /CKA/i, /CKS/i, /Vmware/i, /Redhat/i, /红帽/i, /RHCE/i, /RHCA/i,
            /思科/i, /Cisco/i, /Oracle/i, /甲骨文/i, /微软/i, /EXIN/i, /Linux/i,
            /PMP/i, /PMI/i,
            /全媒体运营/i, /NDPD/i, /天宫认证/i, /产品体验/i, /计算机等级/i,
            /财会类/i, /人力资源类/i, /教育类/i, /语言类/i, /其他认证/i, /其他资质/i
          ];
          
          const excludedCertificateKeywords = ['毕业', '学位', '学历'];
          const imageFieldKeywords = ['图片', '照片', 'image', 'photo', 'pic'];
          const personalInfoKeywords = [
            '是否彩讯社保', '性别', '工作地点', '职级', '职位类别', '业务单元', '部门', '职位',
            '毕业时间', '毕业院校', '毕业证书号', '学位证书号', '入司时间', '当前合同开始日',
            '当前合同结束日', '入司年限', '入司年限（年）', '彩讯连续社保', '彩讯连续社保（月）', '教育形式', '985/211类院校', '身份证号',
            '身份证有效期起', '身份证有效期止', '出生日期', '邮箱', '联系方式', '专业类别', '专业分类', '毕业年限', '毕业年限（年）',
            '是否互联网公司项目可用人员', '微软', '工程师', 'PMI'
          ];
          
          // 使用 Set 提高查找性能
          const hiddenColumnsSet = new Set(hiddenColumns.map(c => c.toLowerCase()));
          const personalInfoSet = new Set(personalInfoKeywords.map(k => k.replace(/\s/g, '').toLowerCase()));
          const imageFieldSet = new Set(imageFieldKeywords.map(k => k.toLowerCase()));
          const certColumnSet = new Set(certificateColumnNames.map(c => c.replace(/\s/g, '').toLowerCase()));
          
          const unrecognizedFields: string[] = [];
          
          // 优化后的数据转换函数
          const processPersonData = (item: any, index: number): Person | null => {
            const allKeys = Object.keys(item);
            const certificateColumns: { [key: string]: string } = {};
            let name = '', education = '', major = '', employeeId = '';
            let age = 0, tenure = 0, graduationTenure = 0;
            const certificates: string[] = [];
            
            for (const [key, value] of Object.entries(item)) {
              const keyClean = key.trim().toLowerCase();
              const keyWithoutSpaces = key.replace(/\s/g, '').toLowerCase();
              let fieldRecognized = false;
              
              // 基础字段匹配
              if (!name && fieldMappings.name.some(k => keyClean.includes(k.toLowerCase()))) {
                name = String(value) || '';
                fieldRecognized = true;
              } else if (fieldMappings.age.some(k => keyClean.includes(k.toLowerCase()))) {
                age = parseInt(String(value)) || 0;
                fieldRecognized = true;
              } else if (fieldMappings.education.some(k => keyClean.includes(k.toLowerCase()))) {
                education = String(value) || '';
                fieldRecognized = true;
              } else if (key.trim() === '专业' || keyClean === 'major') {
                major = String(value) || '';
                fieldRecognized = true;
              } else if (fieldMappings.employeeId.some(k => keyClean.includes(k.toLowerCase()))) {
                employeeId = String(value) || '';
                fieldRecognized = true;
              } else if (fieldMappings.tenure.some(k => keyClean.includes(k.toLowerCase()) || keyWithoutSpaces.includes(k.replace(/\s/g, '').toLowerCase()))) {
                tenure = parseFloat(String(value)) || 0;
                fieldRecognized = true;
              } else if (fieldMappings.graduationTenure.some(k => keyClean.includes(k.toLowerCase()) || keyWithoutSpaces.includes(k.replace(/\s/g, '').toLowerCase()))) {
                graduationTenure = parseFloat(String(value)) || 0;
                fieldRecognized = true;
              }
              
              // 证书列处理
              const isHidden = hiddenColumnsSet.has(key.toLowerCase()) ||
                hiddenColumns.some(h => keyWithoutSpaces.includes(h.replace(/\s/g, '').toLowerCase()));

              const isCertColumn = certColumnSet.has(keyWithoutSpaces) ||
                certificateColumnNames.some(c => keyWithoutSpaces.includes(c.replace(/\s/g, '').toLowerCase())) ||
                certColumnPatterns.some(p => p.test(key));

              const isExcludedCert = excludedCertificateKeywords.some(k => keyClean.includes(k));
              const isFirstColumn = key === allKeys[0];
              
              if (isCertColumn && !isExcludedCert && !isFirstColumn && !isHidden) {
                const certValue = String(value || '').trim();
                certificateColumns[key] = certValue;
                if (certValue && !['是', '否', '有', '无'].includes(certValue)) {
                  certificates.push(certValue);
                } else if (certValue) {
                  certificates.push(key);
                }
                fieldRecognized = true;
              }
              
              // 其他已知字段
              if (isHidden || isFirstColumn || imageFieldSet.has(keyClean) || 
                  personalInfoSet.has(keyWithoutSpaces)) {
                fieldRecognized = true;
              }
              
              if (!fieldRecognized) {
                unrecognizedFields.push(key);
              }
            }
            
            // 清理证书列表
            const cleanCertificates = certificates.filter(cert => 
              cert && cert.trim() && !excludedCertificateKeywords.some(k => cert.includes(k))
            );
            
            // 处理PMP证书
            const pmpCertKey = Object.keys(certificateColumns).find(k => k.includes('PMP'));
            let finalCertificates = cleanCertificates.filter(c => !c.includes('PMP'));
            
            if (pmpCertKey) {
              const pmpValue = certificateColumns[pmpCertKey];
              if (pmpValue?.trim()) {
                const certName = ['是', '否', '有', '无'].includes(pmpValue) ? pmpCertKey : pmpValue;
                if (!finalCertificates.includes(certName)) {
                  finalCertificates.push(certName);
                }
              }
            }
            
            // 备用姓名获取
            if (!name && headers[nameFieldIndex]) {
              name = item[headers[nameFieldIndex]] || '';
            }
            
            const personName = name.trim();
            if (!personName || personName.includes('姓名') || personName.includes('name') || personName.includes('(周岁)')) {
              return null;
            }
            
            return {
              id: index + 1,
              name: personName,
              age,
              education,
              major,
              certificates: finalCertificates,
              employeeId,
              certificateColumns,
              tenure,
              graduationTenure,
              originalData: item
            };
          };
          
          // 分批处理数据，避免阻塞主线程
          const batchSize = 100;
          const importedPeople: Person[] = [];
          
          for (let i = 0; i < jsonData.length; i += batchSize) {
            const batch = jsonData.slice(i, i + batchSize);
            const processedBatch = batch
              .map((item, idx) => processPersonData(item, i + idx))
              .filter((person): person is Person => person !== null);
            importedPeople.push(...processedBatch);
            
            // 每处理一批，更新进度
            const progress = Math.min(90, 10 + Math.floor((i / jsonData.length) * 80));
            setUploadProgress(progress);
            
            // 让出主线程，避免UI卡顿
            await new Promise(resolve => setTimeout(resolve, 0));
          }

          // 验证转换后的数据
          const validPeople = importedPeople.filter(person => person.name);
          if (validPeople.length === 0) {
            clearInterval(progressInterval);
            setUploading(false);
            setUploadProgress(0);
            displayAlert('无法识别Excel文件中的数据，请确保文件格式正确。', 'error');
            addLog(`上传文件失败: 无法识别数据 - ${file.name}`);
            return;
          }

          // 完成上传进度
          clearInterval(progressInterval);
          setUploadProgress(100);
          
          // 提取所有唯一的证书名称
          const allCertificates = new Set<string>();
          // 提取所有唯一的专业名称
          const allMajors = new Set<string>();
          validPeople.forEach(person => {
            if (Array.isArray(person.certificates)) {
              person.certificates.forEach((cert: any) => {
                const certName = typeof cert === 'string' ? cert : (cert.name || cert.value || '');
                const isHidden = hiddenColumns.some(h =>
                  certName.includes(h) || certName.replace(/\s/g, '').toLowerCase().includes(h.replace(/\s/g, '').toLowerCase())
                );
                const isExcluded = EXCLUDED_CERT_KEYWORDS.some(kw => certName.includes(kw));
                if (!isHidden && !isExcluded && certName.trim()) {
                  allCertificates.add(certName.trim());
                }
              });
            }

            if (person.certificateColumns) {
              Object.entries(person.certificateColumns).forEach(([colName, colValue]) => {
                if (colName.includes('教育形式')) return;
                const valStr = String(colValue || '').trim();
                if (!valStr || ['否', '无', '-', '/', 'N/A'].includes(valStr) || valStr.toLowerCase() === 'no') return;
                const isHiddenCol = hiddenColumns.some(h => colName.includes(h));
                if (!isHiddenCol && colName.trim()) {
                  allCertificates.add(colName.trim());
                }
                if (['是', '有'].includes(valStr)) {
                  const isExcludedVal = EXCLUDED_CERT_KEYWORDS.some(kw => colName.includes(kw));
                  if (!isExcludedVal) allCertificates.add(colName.trim());
                } else {
                  const isExcludedVal = EXCLUDED_CERT_KEYWORDS.some(kw => valStr.includes(kw));
                  if (!isExcludedVal && valStr.trim()) allCertificates.add(valStr.trim());
                }
              });
            }

            // 提取专业
            if (person.major && person.major.trim()) {
              allMajors.add(person.major.trim());
            }
          });
          
          // 延迟一下，让用户看到100%的进度
          setTimeout(() => {
            // 生成导入反馈信息
            let feedbackMessage = `文件上传成功！导入了 ${validPeople.length} 条记录`;
            
            // 如果有未识别的字段，添加到反馈信息
            if (unrecognizedFields.length > 0) {
              // 去重
              const uniqueUnrecognizedFields = [...new Set(unrecognizedFields)];
              feedbackMessage += `\n\n未识别的字段: ${uniqueUnrecognizedFields.join(', ')}\n\n可能的原因: 这些字段可能不是系统支持的标准字段，或者字段名称与系统预期的不匹配。`;
            }
            
            // 记录文件信息
            const newFile = {
              id: Date.now().toString(),
              name: file.name,
              size: file.size,
              uploadedAt: new Date()
            };
            setFiles(prev => [...prev, newFile]);
            
            // 处理数据集合
            const handleDataSetCreation = async (action: 'overwrite' | 'new', dataSetName?: string) => {
              try {
                if (action === 'overwrite' && currentDataSetId) {
                  // 覆盖现有数据集合
                  // 首先清空现有数据集中的人员
                  // 然后批量创建新人员
                  const personsWithCertificates = validPeople.map(person => ({
                    ...person,
                    certificates: person.certificates.map(cert => ({
                      name: cert,
                      value: '有'
                    }))
                  }));
                  
                  await storageService.batchCreatePersons(currentDataSetId, personsWithCertificates);
                  
                  // 重新加载数据集列表
                  const updatedDataSets = await storageService.getAllDataSets();
                  setDataSets(updatedDataSets);
                  
                  // 重新加载人员数据
                  const persons = await storageService.getPersonsByDatasetId(currentDataSetId);
                  setPeople(persons);
                  setCertificateOptions([...BASE_CERT_CATEGORIES, ...allCertificates]);
                  setMajorOptions([...allMajors]);
                  feedbackMessage += '\n\n已覆盖当前数据集合。';
                } else {
                  // 创建新的数据集合
                  const newDataSet = await storageService.createDataSet({
                    name: dataSetName || file.name,
                    count: validPeople.length,
                    certificateOptions: [...allCertificates]
                  });
                  
                  // 批量创建人员
                  const personsWithCertificates = validPeople.map(person => ({
                    ...person,
                    certificates: person.certificates.map(cert => ({
                      name: cert,
                      value: '有'
                    }))
                  }));
                  
                  await storageService.batchCreatePersons(newDataSet.id, personsWithCertificates);
                  
                  // 重新加载数据集列表
                  const updatedDataSets = await storageService.getAllDataSets();
                  setDataSets(updatedDataSets);
                  setCurrentDataSetId(newDataSet.id);
                  
                  // 加载新创建的人员数据
                  const persons = await storageService.getPersonsByDatasetId(newDataSet.id);
                  setPeople(persons);
                  setCertificateOptions([...BASE_CERT_CATEGORIES, ...allCertificates]);
                  setMajorOptions([...allMajors]);
                  feedbackMessage += `\n\n已创建新数据集合: ${newDataSet.name}`;
                }
                
                // 重置筛选结果
                setFilteredPeople([]);
                // 重置证书错误信息
                setCertificateError('');
                
                addLog(`文件上传成功: ${file.name}，导入 ${validPeople.length} 条记录`);
                // 显示导入成功提示
                displayAlert(feedbackMessage, 'success');
              } catch (error: any) {
                console.error('数据存储失败:', error);
                const errorMsg = error?.message || error || '未知错误';
                displayAlert(`数据存储失败: ${errorMsg}`, 'error');
                addLog(`❌ 数据存储失败: ${errorMsg}`);
              } finally {
                // 重置上传状态
                setUploading(false);
                setUploadProgress(0);
              }
            };
            
            // 检查是否有同名文件已存在
            const existingDatasetWithSameName = dataSets.find(ds => ds.name === file.name);
            
            if (existingDatasetWithSameName) {
              // 文件名完全相同，询问是否覆盖元数据
              if (window.confirm(`文件名 "${file.name}" 已存在。是否覆盖现有文件的元数据？\n\n点击"确定"覆盖，点击"取消"导入为新文件。`)) {
                setCurrentDataSetId(existingDatasetWithSameName.id);
                handleDataSetCreation('overwrite');
              } else {
                const dataSetName = prompt('请输入新数据集合的名称:', file.name);
                handleDataSetCreation('new', dataSetName || file.name);
              }
            } else {
              // 文件名不同，直接创建新的数据集合
              handleDataSetCreation('new', file.name);
            }
          }, 500);
        } catch (error) {
          clearInterval(progressInterval);
          setUploading(false);
          setUploadProgress(0);
          console.error('文件解析错误:', error);
          displayAlert('文件解析失败，请检查文件格式', 'error');
          addLog(`上传文件失败: 解析错误 - ${file.name}`);
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  // 必须包裹在 async 函数内才能使用 await 
  const loadUserData = async () => {
    try {
      const loadedUsers = await storageService.getAllUsers();

      if (loadedUsers && loadedUsers.length > 0) {
        setUsers(loadedUsers);
      } else {
        // 创建默认管理员用户
        const defaultAdmin = await storageService.createUser({
          username: 'admin',
          password: 'password',
          role: 'admin',
          enabled: true
        });
        setUsers([defaultAdmin]);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  }; 
  
  // 从存储服务加载数据
  const loadDataFromStorage = async () => {
    try {
      // 调用用户数据加载函数
      await loadUserData();

      // 加载数据集数据
      const loadedDataSets = await storageService.getAllDataSets();
      if (loadedDataSets && loadedDataSets.length > 0) {
        setDataSets(loadedDataSets);
        
        // 加载第一个数据集作为当前数据集
        if (loadedDataSets.length > 0 && !currentDataSetId) {
          const firstDataSet = loadedDataSets[0];
          setCurrentDataSetId(firstDataSet.id);
          // 从API获取数据集中的人员数据
          const persons = await storageService.getPersonsByDatasetId(firstDataSet.id);
          setPeople(persons);
          // 提取证书选项（兼容字符串和对象格式）
          const certificateOptions = new Set<string>();
          // 提取专业选项
          const majorOptions = new Set<string>();
          persons.forEach(person => {
            if (person.certificates && Array.isArray(person.certificates)) {
              person.certificates.forEach((cert: any) => {
                const getCertName = (c: any): string => {
                  if (!c) return '';
                  if (typeof c === 'string') return c;
                  return c.name || c.value || String(c) || '';
                };
                const certName = getCertName(cert);
                const isHidden = hiddenColumns.some(h =>
                  certName.includes(h) || certName.replace(/\s/g, '').toLowerCase().includes(h.replace(/\s/g, '').toLowerCase())
                );
                const isExcluded = EXCLUDED_CERT_KEYWORDS.some(kw => certName.includes(kw));
                if (certName && certName.trim() && !isHidden && !isExcluded) {
                  certificateOptions.add(certName.trim());
                }
              });
            }

            if (person.certificateColumns) {
              Object.entries(person.certificateColumns).forEach(([colName, colValue]) => {
                if (colName.includes('教育形式')) return;
                const valStr = String(colValue || '').trim();
                if (!valStr || ['否', '无', '-', '/', 'N/A'].includes(valStr) || valStr.toLowerCase() === 'no') return;
                const isHiddenCol = hiddenColumns.some(h => colName.includes(h));
                if (!isHiddenCol && colName.trim()) certificateOptions.add(colName.trim());
                if (['是', '有'].includes(valStr)) {
                  if (!EXCLUDED_CERT_KEYWORDS.some(kw => colName.includes(kw))) certificateOptions.add(colName.trim());
                } else {
                  if (!EXCLUDED_CERT_KEYWORDS.some(kw => valStr.includes(kw)) && valStr.trim()) certificateOptions.add(valStr.trim());
                }
              });
            }

            if (person.major && person.major.trim()) {
              majorOptions.add(person.major.trim());
            }
          });
          setCertificateOptions([...BASE_CERT_CATEGORIES, ...certificateOptions]);
          setMajorOptions([...majorOptions]);
        }
      }
    } catch (error: any) {
      console.error('从存储服务加载数据失败:', error);
      addLog('从存储服务加载数据失败: ' + (error.message || '未知错误'));
    }
  };
  
  // 组件挂载时加载数据
  useEffect(() => {
    const initData = async () => {
      await loadDataFromStorage();
    };
    initData();
  }, []);
  
  // 用户登录时重新加载数据
  useEffect(() => {
    if (isLoggedIn) {
      // 登录时重新加载所有数据，确保数据一致性
      const reloadData = async () => {
        await loadDataFromStorage();
      };
      reloadData();
    }
  }, [isLoggedIn]);
  
  // 数据保存现在通过存储服务自动处理
  // 不再需要LocalStorage相关代码

  // 处理登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // 动态获取 API 基础 URL
    const getApiBaseUrl = () => {
      if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
      }
      return 'https://xuanren-1.onrender.com/api';
    };

    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '登录失败');
      }

      const loginData = await response.json();

      // 转换字段名为camelCase
      const user = loginData.user ? {
        ...loginData.user,
        createdAt: loginData.user.created_at ? new Date(loginData.user.created_at) : undefined,
        lastPasswordChange: loginData.user.last_password_change ? new Date(loginData.user.last_password_change) : undefined,
        permissions: loginData.user.permissions ? {
          fileUpload: loginData.user.permissions.file_upload,
          search: loginData.user.permissions.search,
          download: loginData.user.permissions.download,
          adminPanel: loginData.user.permissions.admin_panel,
          dataDelete: loginData.user.permissions.data_delete
        } : undefined
      } : null;

      if (!user) {
        throw new Error('登录响应中缺少用户信息');
      }

      setIsLoggedIn(true);
      setUserRole(user.role || 'member');
      setError('');
      addLog(`用户登录成功: ${username} (${user.role === 'admin' ? '管理员' : '成员'})`);

      // 登录后重新加载所有数据以确保一致性
      await loadDataFromStorage();
    } catch (error: any) {
      console.error('登录失败:', error);
      // 统一错误提示信息
      let errorMessage = '登录失败，请稍后重试';
      if (error.message === 'Failed to fetch') {
        errorMessage = '无法连接到服务器，请检查网络连接或稍后重试';
      } else if (error.message === '用户名或密码错误') {
        errorMessage = '用户名或密码错误，请重新输入';
      } else if (error.message === '账号已被禁用，请联系管理员') {
        errorMessage = '账号已被禁用，请联系管理员';
      } else if (error.message === '服务器内部错误，请稍后重试') {
        errorMessage = '服务器繁忙，请稍后重试';
      } else if (error.message === '登录响应中缺少用户信息') {
        errorMessage = '登录异常，请稍后重试';
      }
      setError(errorMessage);
      addLog(`登录失败: ${username}`);
    }
  };

  // 处理登出
  const handleLogout = () => {
    addLog('用户登出');
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    setUserRole('admin'); // 重置为默认角色
    setShowAdminPanel(false);
  };

  // 处理学历复选框变更
  const handleEducationChange = (education: string) => {
    setFilters(prev => {
      if (prev.education.includes(education)) {
        return {
          ...prev,
          education: prev.education.filter(e => e !== education)
        };
      } else {
        return {
          ...prev,
          education: [...prev.education, education]
        };
      }
    });
  };

  // 处理专业复选框变更
  const handleMajorChange = (major: string) => {
    setFilters(prev => {
      if (prev.major.includes(major)) {
        return {
          ...prev,
          major: prev.major.filter(m => m !== major)
        };
      } else {
        return {
          ...prev,
          major: [...prev.major, major]
        };
      }
    });
  };

  // 处理专业全选/取消全选
  const handleMajorSelectAll = () => {
    if (filters.major.length === majorOptions.length && majorOptions.length > 0) {
      setFilters(prev => ({ ...prev, major: [] }));
    } else {
      setFilters(prev => ({ ...prev, major: [...majorOptions] }));
    }
  };

  // 处理专业搜索输入
  const handleMajorSearchInput = (value: string) => {
    setMajorSearchText(value);
    setSelectedMajorIndex(-1);

    if (value.trim()) {
      const searchTerm = value.replace(/\s/g, '').toLowerCase();
      const filtered = majorOptions.filter(option =>
        option.replace(/\s/g, '').toLowerCase().includes(searchTerm)
      );
      setFilteredMajorOptions(filtered);
    } else {
      setFilteredMajorOptions([...majorOptions]);
    }
  };

  // 处理专业搜索键盘事件
  const handleMajorSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showMajorDropdown || filteredMajorOptions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedMajorIndex(prev =>
          prev < filteredMajorOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedMajorIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedMajorIndex >= 0 && selectedMajorIndex < filteredMajorOptions.length) {
          handleMajorChange(filteredMajorOptions[selectedMajorIndex]);
          setSelectedMajorIndex(-1);
        }
        break;
      case 'Escape':
        setShowMajorDropdown(false);
        if (blurTimeout) {
          clearTimeout(blurTimeout);
          setBlurTimeout(null);
        }
        break;
    }
  };

  // 选择专业选项（从搜索结果）
  const handleMajorOptionSelect = (option: string) => {
    if (blurTimeout) {
      clearTimeout(blurTimeout);
      setBlurTimeout(null);
    }
    handleMajorChange(option);
    setSelectedMajorIndex(-1);
  };

  // 处理年龄范围快速选择
  const handleAgeRangeSelect = (min: number, max: number) => {
    setFilters(prev => ({
      ...prev,
      ageMin: min,
      ageMax: max
    }));
    setShowAgeDropdown(false);
  };

  // 处理入司年限快速选择
  const handleTenureRangeSelect = (min: number, max: number) => {
    setFilters(prev => ({
      ...prev,
      tenureMin: min,
      tenureMax: max
    }));
    setShowTenureDropdown(false);
  };

  // 处理毕业年限快速选择
  const handleGraduationTenureRangeSelect = (min: number, max: number) => {
    setFilters(prev => ({
      ...prev,
      graduationTenureMin: min,
      graduationTenureMax: max
    }));
    setShowGraduationTenureDropdown(false);
  };

  // 处理筛选
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // 实时验证证书输入
    if (name === 'certificate') {
      if (value) {
        // 模糊搜索证书选项
        const searchTerm = value.replace(/\s/g, '').toLowerCase();
        
        // 收集所有可能的证书值（包括列标题和实际值）
        const allPossibleCertificates = new Set<string>();
        
        // 添加证书选项（列标题）
        certificateOptions.forEach(option => {
          if (option && option.trim()) {
            allPossibleCertificates.add(option.trim());
          }
        });
        
        // 添加所有人员的证书实际值（兼容字符串和对象格式）
        const getCertName = (cert: any): string => {
          if (!cert) return '';
          if (typeof cert === 'string') return cert;
          return cert.name || cert.value || String(cert) || '';
        };

        people.forEach(person => {
          // 添加人员证书数组中的证书
          if (person.certificates && Array.isArray(person.certificates)) {
            person.certificates.forEach(cert => {
              const certName = getCertName(cert);
              if (certName && certName.trim()) {
                allPossibleCertificates.add(certName.trim());
              }
            });
          }
          // 添加证书列数据
          Object.entries(person.certificateColumns || {}).forEach(([key, certValue]) => {
            const valueStr = String(certValue || '').trim();
            if (valueStr && !['是', '否', '有', '无'].includes(valueStr)) {
              allPossibleCertificates.add(valueStr);
            }
            // 同时添加列名作为可能的证书
            if (key && key.trim()) {
              allPossibleCertificates.add(key.trim());
            }
          });
        });
        
        // 过滤匹配的证书
        const filtered = Array.from(allPossibleCertificates).filter(cert => 
          cert.replace(/\s/g, '').toLowerCase().includes(searchTerm)
        );
        
        // 限制显示数量，避免性能问题
        setFilteredCertOptions(filtered.slice(0, 50));
        setShowCertDropdown(filtered.length > 0);
        setSelectedCertIndex(-1);
        
        // 检查输入是否有匹配的证书选项
        const hasMatch = filtered.length > 0;
        
        if (!hasMatch) {
          setCertificateError('输入的证书名称与系统中的证书不匹配');
        } else {
          setCertificateError('');
        }
      } else {
        setCertificateError('');
        setShowCertDropdown(false);
        setFilteredCertOptions([]);
        setSelectedCertIndex(-1);
      }
    }
    
    const numericFields = ['ageMin', 'ageMax', 'tenureMin', 'tenureMax', 'graduationTenureMin', 'graduationTenureMax'];
    setFilters(prev => ({
      ...prev,
      [name]: numericFields.includes(name) ? (parseInt(value) || 0) : value
    }));
  };

  // 处理证书输入框键盘事件
  const handleCertKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showCertDropdown || filteredCertOptions.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedCertIndex(prev => 
          prev < filteredCertOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedCertIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedCertIndex >= 0 && selectedCertIndex < filteredCertOptions.length) {
          const selectedCert = filteredCertOptions[selectedCertIndex];
          handleCertSelect(selectedCert);
        } else {
          // 如果没有选择任何选项，直接关闭下拉菜单
          setShowCertDropdown(false);
          if (blurTimeout) {
            clearTimeout(blurTimeout);
            setBlurTimeout(null);
          }
        }
        break;
      case 'Escape':
        setShowCertDropdown(false);
        if (blurTimeout) {
          clearTimeout(blurTimeout);
          setBlurTimeout(null);
        }
        break;
    }
  };

  // 选择证书选项
  const handleCertSelect = (cert: string) => {
    // 清除blur超时
    if (blurTimeout) {
      clearTimeout(blurTimeout);
      setBlurTimeout(null);
    }
    setFilters(prev => ({ ...prev, certificate: cert }));
    setCertificateError('');
    setShowCertDropdown(false);
  };
  
  // 点击页面其他区域关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const certificateInput = document.getElementById('certificate');
      const certDropdown = certificateInput?.nextElementSibling?.nextElementSibling;
      
      // 检查点击目标是否在证书输入框或下拉菜单内
      if (certificateInput && certDropdown && !certificateInput.contains(event.target as Node) && !certDropdown.contains(event.target as Node)) {
        setShowCertDropdown(false);
        if (blurTimeout) {
          clearTimeout(blurTimeout);
          setBlurTimeout(null);
        }
      }
    };
    
    // 添加全局点击事件监听器
    document.addEventListener('mousedown', handleClickOutside);
    
    // 清理函数
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [blurTimeout]);

  // AI 智能搜索处理 - 动态阈值架构
  const handleSmartSearch = async () => {
    if (!smartQuery.trim()) {
      displayAlert('请输入筛选条件', 'error');
      return;
    }

    setIsSmartSearching(true);
    setAiDiagnosticInfo('');

    try {
      const config: any = { apiKey: aiApiKey };
      if (aiBaseUrl) config.baseUrl = aiBaseUrl;
      if (aiModel) config.model = aiModel;

      const result = await storageService.smartSearch(smartQuery, aiProvider, config);

      if (result.success) {
        const isNewFormat = result.cert_pool !== undefined;
        const rule = isNewFormat ? result : { ...result.filters, _legacy: true };

        const pool = isNewFormat ? (rule.cert_pool || []) : (rule.certificates || []);
        let threshold: number;
        let mode: string;

        if (isNewFormat) {
          const rawThreshold = Number(rule.threshold);
          const rawMatchMode = rule.match_mode || 'AT_LEAST';
          
          // 关键修复：区分 "AI返回0" 和 "AI返回有效的threshold"
          // 如果 threshold 是有效的正数，直接使用
          // 如果 threshold 为0或无效，根据match_mode决定默认值
          if (rawThreshold > 0) {
            threshold = rawThreshold;
            mode = rawMatchMode;
          } else {
            // threshold为0或无效时，根据match_mode设置合理的默认值
            if (rawMatchMode === 'ALL') {
              threshold = pool.length;  // 全部匹配
              mode = 'ALL';
            } else if (rawMatchMode === 'ANY') {
              threshold = 1;  // 任意1个
              mode = 'ANY';
            } else {
              // AT_LEAST模式但threshold无效，默认设为1（至少1个）
              threshold = 1;
              mode = 'AT_LEAST';
              addLog(`[警告] AI返回AT_LEAST模式但threshold=${rawThreshold}无效，默认设为1`);
            }
          }
        } else {
          const legacyLogic = (rule.cert_logic || 'and').toLowerCase();
          const legacyMinCount = rule.cert_min_count ? Number(rule.cert_min_count) : null;
          const explanation = (result.explanation || rule.explanation || '').toLowerCase();

          if (legacyLogic === 'count' && legacyMinCount !== null) {
            mode = 'AT_LEAST';
            threshold = Math.min(legacyMinCount, pool.length);
          } else if (legacyLogic === 'or') {
            mode = 'ANY';
            threshold = 1;
          } else if (legacyLogic === 'and') {
            const hasAtLeastHint = /至少|以上|超过|其中|任意|任选|满足.*项|达到|具备.*种/.test(explanation);
            const hasArabicCount = /(\d+)\s*(个|种|项|证)/.test(explanation);
            const extractedArabicNum = hasArabicCount ? parseInt(explanation.match(/(\d+)\s*(个|种|项|证)/)?.[1] || '0') : 0;

            const chineseNumMap: { [key: string]: number } = {
              '一': 1, '二': 2, '两': 2, '双': 2, '三': 3, '四': 4,
              '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10
            };
            const chineseNumMatch = explanation.match(/([一二两三四五六七八九十双])\s*(个|种|项|证)/);
            const extractedChineseNum = chineseNumMatch ? (chineseNumMap[chineseNumMatch[1]] || 0) : 0;
            const extractedNum = extractedArabicNum > 0 ? extractedArabicNum : extractedChineseNum;

            if ((pool.length > 3 || hasAtLeastHint) && extractedNum > 0) {
              mode = 'AT_LEAST';
              threshold = Math.min(extractedNum, pool.length);
              addLog(`[旧格式修正] 检测到'explanation中的数量线索(${extractedNum})', 将AND→AT_LEAST`);
            } else if (pool.length > 3 && hasAtLeastHint) {
              mode = 'AT_LEAST';
              threshold = Math.max(1, Math.ceil(pool.length / 2));
              addLog(`[旧格式修正] 池大(>3)+有至少提示, AND→AT_LEAST, N=${threshold}`);
            } else if (pool.length > 5) {
              mode = 'AT_LEAST';
              threshold = Math.max(1, Math.ceil(pool.length * 0.4));
              addLog(`[旧格式修正] 池很大(>5), AND→AT_LEAST, N=${threshold}`);
            } else {
              mode = 'ALL';
              threshold = pool.length;
            }
          } else {
            mode = 'AT_LEAST';
            threshold = (legacyMinCount !== null && legacyMinCount !== undefined) ? legacyMinCount : Math.max(1, Math.ceil(pool.length / 2));
          }

          if (threshold > pool.length) threshold = pool.length;
          if (threshold < 0) threshold = pool.length > 0 ? 1 : 0;
        }

        const diagLines = [
          `📥 AI解析结果:`,
          `  格式: ${isNewFormat ? '新(cert_pool/threshold)' : '旧(legacy)'}`,
          `  证书池(S=${pool.length}): ${pool.join(', ')}`,
          `  阈值(N): ${threshold}`,
          `  模式: ${mode.toUpperCase()}`,
          rule.name ? `  姓名: ${rule.name}` : '',
          rule.age_min !== undefined && rule.age_min !== null ? `  年龄: ${rule.age_min}-${rule.age_max ?? '?'}岁` : '',
          rule.education ? `  学历: ${rule.education}` : '',
          result.explanation || rule.explanation ? `  说明: ${result.explanation || rule.explanation}` : ''
        ].filter(Boolean);
        setAiDiagnosticInfo(diagLines.join('\n'));

        addLog(`AI 解析: "${smartQuery}" → S=${pool.length}, N=${threshold}, mode=${mode}`);

        if (!isNewFormat) {
          displayAlert('⚠ AI返回旧格式，建议重启服务以使用新Prompt', 'info');
        }

        rule._precomputed = { pool, threshold, mode };
        setTimeout(() => executeAIDirectSearch(rule), 100);
      } else {
        displayAlert(`AI 解析失败：${result.error || '无法解析查询条件'}`, 'error');
      }
    } catch (error: any) {
      console.error('Smart search error:', error);
      if (error.message?.includes('未配置 API Key')) {
        setShowAISettings(true);
        displayAlert('请先配置 AI 服务 API Key', 'info');
      } else {
        displayAlert(error.message || '智能搜索失败，请重试', 'error');
      }
    } finally {
      setIsSmartSearching(false);
    }
  };

  const normalizeCertName = (raw: string): string => raw.replace(/\s/g, '').toLowerCase();

  const collectPersonCerts = (person: any): Set<string> => {
    const certs = new Set<string>();
    if (Array.isArray(person.certificates)) {
      person.certificates.forEach((c: any) => {
        const name = typeof c === 'string' ? c : (c.name || c.value || '');
        if (name) certs.add(normalizeCertName(name));
      });
    }
    if (person.certificateColumns) {
      Object.entries(person.certificateColumns).forEach(([colName, colValue]) => {
        if (hiddenColumns.some(h => colName.includes(h))) return;
        const vs = String(colValue || '').trim();
        if (!vs || ['否', '无', '-', '/', 'N/A'].includes(vs) || vs.toLowerCase() === 'no') return;
        if (['是', '有'].includes(vs)) {
          certs.add(normalizeCertName(colName));
        } else {
          certs.add(normalizeCertName(vs));
        }
      });
    }
    return certs;
  };

  const certFuzzyMatch = (personCerts: Set<string>, searchTerm: string): boolean => {
    const searchNorm = normalizeCertName(searchTerm);
    
    // 1. 精确匹配：搜索词完全等于证书名
    for (const pc of personCerts) {
      if (pc === searchNorm) return true;
    }
    
    // 2. 包含匹配：证书名包含完整搜索词，或搜索词包含完整证书名
    for (const pc of personCerts) {
      if (pc.includes(searchNorm) || searchNorm.includes(pc)) return true;
    }
    
    // 3. 去除括号后的匹配
    const searchNoParen = searchNorm.replace(/[（(][^）)]*[）)]/g, '');
    if (searchNoParen !== searchNorm) {
      for (const pc of personCerts) {
        const pcNoParen = pc.replace(/[（(][^）)]*[）)]/g, '');
        if (pcNoParen === searchNoParen) return true;
        if (pcNoParen.includes(searchNoParen) || searchNoParen.includes(pcNoParen)) return true;
      }
    }
    
    return false;
  };

  const countMatchedDistinct = (personCerts: Set<string>, certPool: string[]): number => {
    const matched = new Set<string>();
    for (const poolItem of certPool) {
      if (certFuzzyMatch(personCerts, poolItem)) {
        matched.add(normalizeCertName(poolItem));
      }
    }
    return matched.size;
  };

  // 获取人员实际持有的证书总数（基于后台数据表格记录）
  const getPersonTotalCertCount = (person: any): number => {
    const uniqueCerts = new Set<string>();
    
    // 从 certificates 数组统计
    if (Array.isArray(person.certificates)) {
      person.certificates.forEach((cert: any) => {
        const certName = typeof cert === 'string' ? cert : (cert.name || cert.value || '');
        if (certName) uniqueCerts.add(normalizeCertName(certName));
      });
    }
    
    // 从 certificateColumns 对象统计（值为"是"/"有"或非空值的列）
    if (person.certificateColumns) {
      for (const [colName, colValue] of Object.entries(person.certificateColumns)) {
        if (hiddenColumns.some(h => colName.includes(h))) continue;
        const vs = String(colValue || '').trim();
        if (!vs || ['否', '无', '-', '/', 'N/A'].includes(vs) || vs.toLowerCase() === 'no') continue;
        
        // 如果值是"是"/"有"，使用列名作为证书名；否则使用值
        const certName = ['是', '有'].includes(vs) ? colName : vs;
        if (certName) uniqueCerts.add(normalizeCertName(certName));
      }
    }
    
    return uniqueCerts.size;
  };

  // 核心查询引擎 - 等效 SQL: COUNT(DISTINCT matched_cert) >= :threshold
  const executeAIDirectSearch = (aiRule: any) => {
    setIsSearching(true);
    setShowCertDropdown(false);

    if (!people || people.length === 0) {
      displayAlert('没有可用的数据，请先导入文件', 'error');
      setIsSearching(false);
      return;
    }

    const isNewFormat = !aiRule._legacy;
    const precomputed = aiRule._precomputed || null;
    const certPool: string[] = precomputed ? precomputed.pool : (isNewFormat ? (aiRule.cert_pool || []) : (aiRule.certificates || []));
    const threshold: number = precomputed ? precomputed.threshold : (
      isNewFormat
        ? ((aiRule.threshold !== undefined && aiRule.threshold !== null) ? Number(aiRule.threshold) : certPool.length)
        : ((aiRule.cert_logic === 'and' ? certPool.length : ((aiRule.cert_min_count !== undefined && aiRule.cert_min_count !== null) ? Number(aiRule.cert_min_count) : certPool.length)))
    );
    const matchMode: string = precomputed ? precomputed.mode : (isNewFormat ? (aiRule.match_mode || 'AT_LEAST') : (aiRule.cert_logic || 'and'));

    const searchName = aiRule.name ? String(aiRule.name).replace(/\s/g, '').toLowerCase() : '';
    const searchMajorTerms = aiRule.major ? [String(aiRule.major).replace(/\s/g, '').toLowerCase()] : [];
    
    // 提取 tenure（入司年限/毕业年限）
    const tenureMin = (aiRule.tenure_min !== undefined && aiRule.tenure_min !== null) ? Number(aiRule.tenure_min) : null;
    const tenureMax = (aiRule.tenure_max !== undefined && aiRule.tenure_max !== null) ? Number(aiRule.tenure_max) : null;

    try {
      // 边界处理 #0: 负数阈值修正为0
      const safeThreshold = Math.max(0, threshold);

      // 边界处理 #1: threshold > len(S)
      const effectiveThreshold = Math.min(safeThreshold, certPool.length);

      // 调试日志
      addLog(`[调试] matchMode=${matchMode}, threshold=${threshold}, effectiveThreshold=${effectiveThreshold}, certPool.length=${certPool.length}`);

      // 边界处理 #2: N=0 时，根据match_mode设置合理默认值
      let finalThreshold = effectiveThreshold;
      if (finalThreshold === 0 && certPool.length > 0) {
        if (matchMode === 'ALL') {
          finalThreshold = certPool.length;  // 全部匹配
        } else if (matchMode === 'ANY') {
          finalThreshold = 1;  // 任意1个
        } else {
          // AT_LEAST模式，默认至少1个（但会记录警告）
          finalThreshold = 1;
          addLog(`[警告] AT_LEAST模式但threshold=0，默认设为1`);
        }
      }

      // 边界处理 #3: S空且N>0 → 返回空
      if (certPool.length === 0 && finalThreshold > 0) {
        displayAlert('未指定任何证书条件（证书池为空）', 'info');
        setIsSearching(false);
        return;
      }

      // 边界处理 #4: 证书池为空 → 返回全部人员
      const noCertRequired = certPool.length === 0;

      const filtered = people.filter((person: any) => {
        if (searchName && !(person.name || '').replace(/\s/g, '').toLowerCase().includes(searchName)) return false;

        const age = getPersonAge(person);
        if (aiRule.age_min !== null && aiRule.age_min !== undefined && age < Number(aiRule.age_min)) return false;
        if (aiRule.age_max !== null && aiRule.age_max !== undefined && age > Number(aiRule.age_max)) return false;

        if (aiRule.education && person.education !== aiRule.education) return false;

        if (searchMajorTerms.length > 0) {
          const pm = (person.major || '').replace(/\s/g, '').toLowerCase();
          if (!searchMajorTerms.some(t => pm.includes(t))) return false;
        }

        // 毕业年限过滤（AI搜索的tenure_min/tenure_max对应毕业年限）
        if (tenureMin !== null || tenureMax !== null) {
          const tenure = getPersonGraduationTenureValue(person);

          if (tenureMin !== null && tenure < tenureMin) {
            addLog(`[筛选排除] ${person.name || '未知'}: 毕业年限(${tenure}) < 要求最小值(${tenureMin})`);
            return false;
          }
          if (tenureMax !== null && tenure > tenureMax) {
            addLog(`[筛选排除] ${person.name || '未知'}: 毕业年限(${tenure}) > 要求最大值(${tenureMax})`);
            return false;
          }
        }

        if (noCertRequired) return true;

        const personCerts = collectPersonCerts(person);

        if (matchMode === 'ALL') {
          const allMatched = certPool.every(item => certFuzzyMatch(personCerts, item));
          if (!allMatched) return false;
        } else if (matchMode === 'ANY') {
          const anyMatched = certPool.some(item => certFuzzyMatch(personCerts, item));
          if (!anyMatched) return false;
        } else {
          // AT_LEAST 模式：检查两个条件
          // 1. 人员实际持有的证书总数 >= finalThreshold（基于后台数据表格记录数）
          // 2. 匹配搜索池的证书数 >= finalThreshold
          const totalCertCount = getPersonTotalCertCount(person);
          const matchedCount = countMatchedDistinct(personCerts, certPool);
          
          // 关键修复：确保证书总数和匹配数都满足阈值要求
          if (totalCertCount < finalThreshold) {
            addLog(`[筛选排除] ${person.name || '未知'}: 实际证书数(${totalCertCount}) < 要求(${finalThreshold})`);
            return false;
          }
          if (matchedCount < finalThreshold) {
            addLog(`[筛选排除] ${person.name || '未知'}: 匹配证书数(${matchedCount}) < 要求(${finalThreshold})`);
            return false;
          }
          
          (person as any)._matchedCertCount = matchedCount;
          (person as any)._totalCertCount = totalCertCount;
          (person as any)._totalPoolSize = certPool.length;
        }

        return true;
      });

      const enrichedFiltered = filtered.map(p => enrichPersonData(p, certPool.join('、')));
      setFilteredPeople(enrichedFiltered);
      setFilteredCurrentPage(1);

      if (enrichedFiltered.length > 0) {
        let msg: string;
        if (noCertRequired) {
          msg = `✓ 找到 ${enrichedFiltered.length} 人（无证书限制）`;
        } else if (matchMode === 'ALL') {
          msg = `✓ 精确匹配 ${enrichedFiltered.length} 人（${certPool.length}项全部具备）`;
        } else if (matchMode === 'ANY') {
          msg = `✓ 找到 ${enrichedFiltered.length} 人（具备${certPool.length}项中任一）`;
        } else {
          msg = `✓ 找到 ${enrichedFiltered.length} 人（从${certPool.length}项中匹配≥${finalThreshold}项）`;
        }
        displayAlert(msg, 'success');
        addLog(`搜索[${matchMode}] S=${certPool.length}, N=${finalThreshold} → ${enrichedFiltered.length}人`);
      } else {
        let msg: string;
        if (noCertRequired) {
          msg = '未找到匹配的人员';
        } else if (matchMode === 'ALL') {
          msg = `未找到同时具备全部${certPool.length}项证书的人员`;
        } else if (matchMode === 'ANY') {
          msg = '未找到具备任一指定证书的人员';
        } else {
          msg = `未找到从${certPool.length}项证书中匹配≥${finalThreshold}项的人员`;
        }
        displayAlert(msg, 'info');
        addLog(`搜索[${matchMode}] S=${certPool.length}, N=${effectiveThreshold} → 无结果`);
      }
    } catch (err) {
      console.error('AI direct search error:', err);
      displayAlert('搜索过程出错', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // 手动执行筛选 - 优化版本
  const handleSearch = () => {
    setIsSearching(true);
    setShowCertDropdown(false);
    setShowEducationDropdown(false);
    setShowMajorDropdown(false);
    setShowAgeDropdown(false);
    setShowTenureDropdown(false);
    setShowGraduationTenureDropdown(false);
    
    if (blurTimeout) {
      clearTimeout(blurTimeout);
      setBlurTimeout(null);
    }

    setTimeout(() => {
      if (!people || people.length === 0) {
        displayAlert('没有可用的数据，请先导入文件', 'error');
        addLog('查询失败: 无数据');
        setShowCertDropdown(false);
        setIsSearching(false);
        return;
      }
      
      if (filters.certificate && certificateError) {
        displayAlert('证书输入无效，请输入与系统中匹配的证书名称', 'info');
        addLog('查询警告: 证书输入可能无效，但仍将尝试搜索');
        // 不再阻止搜索，而是继续执行，让 handleSearch 的过滤逻辑来决定结果
      }

      addLog(`执行查询: 姓名=${filters.name}, 年龄=${filters.ageMin}-${filters.ageMax}, 学历=${filters.education.join(',')}, 全日制=${isFullTime === true ? '是' : isFullTime === false ? '否' : '不限'}, 专业=${filters.major.join(',')}, 证书=${filters.certificate}`);

      // 预处理搜索条件，避免重复计算
      const searchName = filters.name ? filters.name.replace(/\s/g, '').toLowerCase() : '';
      const searchMajorTerms = filters.major.length > 0
        ? filters.major.map(m => m.replace(/\s/g, '').toLowerCase())
        : [];
      const searchCert = filters.certificate ? filters.certificate.replace(/\s/g, '').toLowerCase() : '';

      try {
        const filtered = people.filter((person) => {
          try {
            // 姓名匹配
            if (searchName && !(person.name || '').replace(/\s/g, '').toLowerCase().includes(searchName)) {
              return false;
            }

            // 年龄匹配
            const age = parseInt(String(person.age || 0)) || 0;
            if (age < filters.ageMin || age > filters.ageMax) {
              return false;
            }

            // 学历匹配
            if (filters.education.length > 0 && !filters.education.includes(person.education)) {
              return false;
            }

            // 教育形式匹配（全日制筛选）
            if (isFullTime !== null) {
              const educationForm = person.originalData?.['教育形式'] || '';
              const isOrdinaryHigherEducation = String(educationForm).includes('普通高等教育');
              if (isFullTime && !isOrdinaryHigherEducation) {
                return false;
              }
              if (!isFullTime && isOrdinaryHigherEducation) {
                return false;
              }
            }

            // 专业匹配（多选OR条件）
            if (searchMajorTerms.length > 0) {
              const personMajor = (person.major || '').replace(/\s/g, '').toLowerCase();
              const hasMajorMatch = searchMajorTerms.some(term => personMajor.includes(term));
              if (!hasMajorMatch) {
                return false;
              }
            }

            // 入司年限匹配（对应"入司年限（年）"列）
            const companyTenure = getPersonCompanyTenureValue(person);
            if (companyTenure < filters.tenureMin || companyTenure > filters.tenureMax) {
              return false;
            }

            // 毕业年限匹配（对应"毕业年限（年）"列）- 仅当数据中有此字段时才生效
            if (filters.graduationTenureMin > 0 || filters.graduationTenureMax < 50) {
              const gradTenure = getPersonGraduationTenureValue(person);
              if (gradTenure < filters.graduationTenureMin || gradTenure > filters.graduationTenureMax) {
                return false;
              }
            }

            // 证书匹配（增强版：支持多证书AND逻辑 + 证书映射表）
            if (searchCert) {
              const searchCertTerms = searchCert.split(/[,，、;；]/).map(s => s.trim()).filter(s => s.length >= 1);

              const normalizeSearchTerm = (raw: string): string[] => {
                const cleaned = raw.replace(/\s/g, '').toLowerCase();
                const variants: string[] = [cleaned];
                const noParen = cleaned.replace(/[（(][^）)]*[）)]/g, '');
                if (noParen && noParen !== cleaned) variants.push(noParen);
                variants.push(...noParen.split(/[,，、\/\\]/).filter(p => p.length >= 2));
                return [...new Set(variants)];
              };

              const checkSingleCertMatch = (searchTerm: string): boolean => {
                const termVariants = normalizeSearchTerm(searchTerm);

                let targetColumn: string | null = null;
                for (const [k, col] of Object.entries(COMPREHENSIVE_CERT_MAPPINGS)) {
                  if (k.replace(/\s/g, '').toLowerCase() === termVariants[0] ||
                      termVariants.some(tv => k.replace(/\s/g, '').toLowerCase() === tv)) {
                    targetColumn = col;
                    break;
                  }
                }

                if (Array.isArray(person.certificates)) {
                  const found = person.certificates.some((cert: any) => {
                    const cn = typeof cert === 'string' ? cert : (cert.name || cert.value || '');
                    const cnNorm = cn.replace(/\s/g, '').toLowerCase();
                    return termVariants.some(tv => cnNorm.includes(tv) || tv.includes(cnNorm));
                  });
                  if (found) return true;
                }

                if (person.certificateColumns) {
                  const isMappedSearch = !!targetColumn;
                  const targetColNormalized = targetColumn ? targetColumn.replace(/\s/g, '').toLowerCase() : null;
                  let mappedColumnChecked = false;
                  let foundInBooleanCol = false;

                  for (const [colName, colValue] of Object.entries(person.certificateColumns)) {
                    if (hiddenColumns.some(h => colName.includes(h))) continue;
                    const valStr = String(colValue || '').trim();
                    if (!valStr || ['否', '无', '-', '/', 'N/A'].includes(valStr) || valStr.toLowerCase() === 'no') continue;

                    const valueNormalized = valStr.replace(/\s/g, '').toLowerCase();
                    const colNameNormalized = colName.replace(/\s/g, '').toLowerCase();
                    const isBooleanValue = ['是', '有'].includes(valStr);

                    if (isMappedSearch && targetColNormalized) {
                      if (colNameNormalized.includes(targetColNormalized) || targetColNormalized.includes(colNameNormalized)) {
                        mappedColumnChecked = true;
                        if (isBooleanValue) {
                          if (termVariants.some(tv => colNameNormalized.includes(tv) || tv.includes(colNameNormalized))) {
                            foundInBooleanCol = true;
                            return true;
                          }
                        } else {
                          if (termVariants.some(tv => valueNormalized.includes(tv) || tv.includes(valueNormalized))) return true;
                        }
                      }
                    } else {
                      if (isBooleanValue) {
                        if (termVariants.some(tv => colNameNormalized.includes(tv) || tv.includes(colNameNormalized))) return true;
                      } else {
                        if (termVariants.some(tv => valueNormalized.includes(tv) || colNameNormalized.includes(tv))) return true;
                        if (termVariants.some(tv => colName.includes(tv))) return true;
                      }
                    }
                  }

                  if (isMappedSearch && targetColNormalized && !mappedColumnChecked) {
                    for (const [, cVal] of Object.entries(person.certificateColumns)) {
                      const vs = String(cVal || '').trim();
                      if (!vs || ['否', '无', '-', '/', 'N/A'].includes(vs) || vs.toLowerCase() === 'no') continue;
                      if (['是', '有'].includes(vs)) continue;
                      if (termVariants.some(tv => vs.replace(/\s/g, '').toLowerCase().includes(tv))) return true;
                    }
                  }

                  if (isMappedSearch && targetColNormalized && mappedColumnChecked && !foundInBooleanCol) {
                    for (const [colName, colValue] of Object.entries(person.certificateColumns)) {
                      if (hiddenColumns.some(h => colName.includes(h))) continue;
                      const vs = String(colValue || '').trim();
                      if (!vs || ['否', '无', '-', '/', 'N/A'].includes(vs) || vs.toLowerCase() === 'no') continue;
                      const cnn = colName.replace(/\s/g, '').toLowerCase();
                      if ((cnn.includes(targetColNormalized) || targetColNormalized.includes(cnn)) && ['是', '有'].includes(vs)) {
                        if (termVariants.some(tv => cnn.includes(tv) || tv.includes(cnn))) return true;
                      }
                    }
                  }
                }

                return false;
              };

              const allMatched = searchCertTerms.every(checkSingleCertMatch);
              if (!allMatched) {
                return false;
              }
            }

            return true;
          } catch (err) {
            console.warn('过滤人员时出错:', err, person);
            return false;
          }
        });

        setFilteredPeople(filtered);
        setFilteredCurrentPage(1);
        addLog(`查询完成: 找到 ${filtered.length} 条匹配记录`);

        if (filtered.length === 0) {
          displayAlert('没有找到匹配的记录，请调整筛选条件', 'info');
        } else {
          displayAlert(`查询成功，找到 ${filtered.length} 条匹配记录`, 'success');
        }
      } catch (error) {
        console.error('查询过程出错:', error);
        displayAlert('查询过程中发生错误，请重试', 'error');
        addLog('查询出错: ' + (error instanceof Error ? error.message : String(error)));
      }

      setTimeout(() => {
        setShowCertDropdown(false);
        setIsSearching(false);
      }, 100);
    }, 50);
  };

  // 导出查询结果为XLSX格式
  const handleDownload = (data: Person[]) => {
    if (data.length === 0) {
      displayAlert('没有数据可导出', 'info');
      return;
    }

    try {
      // 收集所有可能的字段，保持原始列顺序
      const allFields: string[] = [];
      const fieldOrderMap = new Map<string, number>();

      // 从原始数据中收集字段，保持首次出现的顺序
      data.forEach(person => {
        if (person.originalData) {
          Object.keys(person.originalData).forEach(key => {
            if (!fieldOrderMap.has(key)) {
              fieldOrderMap.set(key, allFields.length);
              allFields.push(key);
            }
          });
        }
      });

      // 数据格式验证和转换
      // 统一日期格式标准: YYYY-MM-DD

      const parseAndFormatDate = (dateStr: string): string | null => {
        if (!dateStr || typeof dateStr !== 'string') return null;

        const trimmed = dateStr.trim();

        // 日期格式解析规则（按优先级排序）
        const formatPatterns: { pattern: RegExp; parser: (match: RegExpExecArray) => Date }[] = [
          {
            // ISO格式: 2024-01-15 或 2024/01/15
            pattern: /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/,
            parser: (m) => new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]))
          },
          {
            // 中文格式: 2024年1月15日
            pattern: /^(\d{4})年(\d{1,2})月(\d{1,2})日/,
            parser: (m) => new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]))
          },
          {
            // 美式格式: 01/15/2024 或 1/15/2024
            pattern: /^(\d{1,2})\/(\d{1,2})\/(\d{4})/,
            parser: (m) => new Date(parseInt(m[3]), parseInt(m[1]) - 1, parseInt(m[2]))
          },
          {
            // 带时间的ISO格式: 2024-01-15T10:30:00
            pattern: /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/,
            parser: (m) => new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]))
          }
        ];

        for (const { pattern, parser } of formatPatterns) {
          const match = pattern.exec(trimmed);
          if (match) {
            try {
              const date = parser(match);
              if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
                // 格式化为 YYYY-MM-DD
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
              }
            } catch (e) {
              continue;
            }
          }
        }

        // 尝试直接用Date构造函数解析
        try {
          const fallbackDate = new Date(trimmed);
          if (!isNaN(fallbackDate.getTime()) && trimmed.length <= 25) {
            const year = fallbackDate.getFullYear();
            if (year > 1900 && year < 2100) {
              const month = String(fallbackDate.getMonth() + 1).padStart(2, '0');
              const day = String(fallbackDate.getDate()).padStart(2, '0');
              return `${year}-${month}-${day}`;
            }
          }
        } catch (e) {}

        return null;
      };

      // 检测字段名是否为日期相关列
      const isDateField = (fieldName: string): boolean => {
        const dateKeywords = [
          '日期', '时间', 'time', 'date', '生日', '出生',
          '入职', '入司', '合同', '毕业', '有效期',
          'created_at', 'updated_at', 'start_date', 'end_date',
          'hire_date', 'birth'
        ];
        const lowerName = fieldName.toLowerCase();
        return dateKeywords.some(keyword => lowerName.includes(keyword.toLowerCase()));
      };

      const validateAndFormatValue = (value: any, fieldName: string): any => {
        if (value === null || value === undefined || value === '') {
          return '';
        }

        // 如果是数字，确保数值精度
        if (typeof value === 'number') {
          // 检查是否为Excel日期序列号（如44000+的数字可能是日期）
          if (isDateField(fieldName)) {
            // Excel日期序列号转换（基准日期1899-12-30）
            if (value >= 1 && value < 100000) {
              const excelDate = new Date((value - 25569) * 86400 * 1000);
              if (!isNaN(excelDate.getTime())) {
                const year = excelDate.getFullYear();
                if (year > 1900 && year < 2100) {
                  const month = String(excelDate.getMonth() + 1).padStart(2, '0');
                  const day = String(excelDate.getDate()).padStart(2, '0');
                  return `${year}-${month}-${day}`;
                }
              }
            }
          }
          return value;
        }

        // 如果是字符串
        if (typeof value === 'string') {
          // 对日期相关字段进行统一格式化
          if (isDateField(fieldName)) {
            const formattedDate = parseAndFormatDate(value);
            if (formattedDate) {
              return formattedDate;
            }
          }

          // 非日期文本字段 - 清理特殊字符
          return String(value).trim();
        }

        // 对象类型处理
        if (typeof value === 'object') {
          if (value.name || value.value) {
            return value.name || value.value || '';
          }
          return JSON.stringify(value);
        }

        return value;
      };

      // 构建表头和数据行
      const headers = allFields;
      const rows: any[][] = [];

      data.forEach(person => {
        const row: any[] = [];

        headers.forEach(header => {
          let cellValue: any;

          switch (header) {
            case '工号':
              cellValue = person.employeeId || '';
              break;
            case '姓名':
              cellValue = person.name || '';
              break;
            case '年龄':
              cellValue = person.age !== undefined && person.age !== null ? person.age : '';
              break;
            case '学历':
              cellValue = person.education || '';
              break;
            case '专业':
              cellValue = person.major || '';
              break;
            default:
              cellValue = person.originalData?.[header] ?? '';
              break;
          }

          row.push(validateAndFormatValue(cellValue, header));
        });

        rows.push(row);
      });

      // 创建工作簿和工作表
      const wb = XLSX.utils.book_new();
      const wsData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // 设置列宽以适应内容
      const colWidths = headers.map((header, i) => {
        let maxWidth = String(header).length * 2;

        rows.forEach(row => {
          const cellValue = row[i];
          if (cellValue !== undefined && cellValue !== null) {
            const strLength = String(cellValue).length * 1.5 + 2;
            if (strLength > maxWidth) {
              maxWidth = Math.min(strLength, 50);
            }
          }
        });

        return { wch: Math.max(maxWidth, 10) };
      });
      ws['!cols'] = colWidths;

      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(wb, ws, '人员信息');

      // 生成文件名并导出
      const fileName = `人员信息_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      addLog(`导出查询结果: ${data.length} 条记录, 格式: XLSX`);
      displayAlert(`成功导出 ${data.length} 条记录到 ${fileName}`, 'success');

    } catch (error) {
      console.error('导出失败:', error);
      displayAlert('导出失败，请稍后重试', 'error');
      addLog(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="theme-container" style={{ 
        minHeight: '100vh', 
        background: currentTheme.colors.background,
        fontFamily: currentTheme.fonts.body,
        position: 'relative'
      }}>
        {/* 主题特效层 */}
        {currentTheme.effects.scanline && <div className="scanline" />}
        {currentTheme.effects.particles && <div className="particles-container" id="particles" />}
        
        {/* 主题切换按钮 */}
        <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 100 }}>
          <ThemeSwitcher />
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          position: 'relative',
          zIndex: 10
        }}>
          {/* Logo 区域 */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 20px',
              border: `3px solid ${currentTheme.colors.primary}`,
              borderRadius: currentTheme.id === 'chimera' ? '50% 40% 60% 30%' : '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              color: currentTheme.colors.primary,
              animation: currentTheme.effects.breathing ? 'breathe 2s ease-in-out infinite' : 
                        currentTheme.effects.morphing ? 'morph 3s ease-in-out infinite' : 'none',
              boxShadow: `0 0 30px ${currentTheme.colors.primary}50`
            }}>
              {currentTheme.id === 'lighthouse' ? '◉' : 
               currentTheme.id === 'chimera' ? '◈' : '✦'}
            </div>
            <h1 style={{
              fontSize: '32px',
              color: currentTheme.colors.primary,
              fontFamily: currentTheme.fonts.heading,
              letterSpacing: '4px',
              marginBottom: '10px',
              textShadow: `0 0 20px ${currentTheme.colors.primary}50`
            }}>
              {currentTheme.name}
            </h1>
            <p style={{
              color: currentTheme.colors.textSecondary,
              fontSize: '14px',
              letterSpacing: '2px'
            }}>
              {currentTheme.description}
            </p>
          </div>

          {/* 登录表单 */}
          <form 
            onSubmit={handleLogin}
            style={{
              width: '100%',
              maxWidth: '400px',
              background: currentTheme.colors.surface,
              border: `1px solid ${currentTheme.colors.border}`,
              borderRadius: '12px',
              padding: '40px',
              boxShadow: `0 10px 40px rgba(0,0,0,0.3)`
            }}
          >
            <h2 style={{
              textAlign: 'center',
              marginBottom: '30px',
              color: currentTheme.colors.text,
              fontFamily: currentTheme.fonts.heading,
              letterSpacing: '3px'
            }}>
              系统登录 // LOGIN
            </h2>
            
            {error && (
              <div style={{
                background: `${currentTheme.colors.danger}20`,
                border: `1px solid ${currentTheme.colors.danger}`,
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '20px',
                color: currentTheme.colors.danger,
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: currentTheme.colors.textSecondary,
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '2px'
              }}>
                用户名 // Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  background: 'rgba(0,0,0,0.3)',
                  border: `1px solid ${currentTheme.colors.border}`,
                  borderRadius: '8px',
                  color: currentTheme.colors.text,
                  fontSize: '15px',
                  fontFamily: currentTheme.fonts.body,
                  outline: 'none',
                  transition: 'all 0.3s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = currentTheme.colors.primary;
                  e.target.style.boxShadow = `0 0 20px ${currentTheme.colors.primary}30`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = currentTheme.colors.border;
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: currentTheme.colors.textSecondary,
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '2px'
              }}>
                密码 // Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  background: 'rgba(0,0,0,0.3)',
                  border: `1px solid ${currentTheme.colors.border}`,
                  borderRadius: '8px',
                  color: currentTheme.colors.text,
                  fontSize: '15px',
                  fontFamily: currentTheme.fonts.body,
                  outline: 'none',
                  transition: 'all 0.3s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = currentTheme.colors.primary;
                  e.target.style.boxShadow = `0 0 20px ${currentTheme.colors.primary}30`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = currentTheme.colors.border;
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.accent})`,
                  border: 'none',
                  borderRadius: '8px',
                  color: currentTheme.colors.background,
                  fontSize: '15px',
                  fontWeight: 600,
                  fontFamily: currentTheme.fonts.body,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 5px 20px ${currentTheme.colors.primary}50`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                登录
              </button>
              <button
                type="button"
                onClick={() => setShowContactModal(true)}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  background: 'transparent',
                  border: `1px solid ${currentTheme.colors.primary}`,
                  borderRadius: '8px',
                  color: currentTheme.colors.primary,
                  fontSize: '15px',
                  fontWeight: 600,
                  fontFamily: currentTheme.fonts.body,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  transition: 'all 0.3s'
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
                联系管理员
              </button>
            </div>
          </form>
        </div>

        {/* 联系管理员弹窗 */}
        {showContactModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: `0 8px 24px ${currentTheme.colors.glow}`,
              border: `2px solid ${currentTheme.colors.border}`
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3 style={{ margin: 0, color: currentTheme.colors.primary, fontSize: '20px' }}>
                  联系管理员
                </h3>
                <button
                  onClick={() => setShowContactModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#999',
                    padding: '0',
                    boxShadow: 'none'
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <p style={{ marginBottom: '16px', color: '#5a3d31', lineHeight: '1.6' }}>
                  如果您遇到登录问题或需要帮助，请通过以下方式联系管理员：
                </p>
                <div style={{
                  backgroundColor: '#fff5f5',
                  padding: '16px',
                  borderRadius: '12px',
                  marginBottom: '16px'
                }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: '500', color: currentTheme.colors.primary }}>
                    管理员邮箱：
                  </p>
                  <a
                    href="mailto:593098881@qq.com"
                    style={{
                      color: '#5a3d31',
                      textDecoration: 'none',
                      wordBreak: 'break-all'
                    }}
                  >
                    593098881@qq.com
                  </a>
                </div>
                <div style={{
                  backgroundColor: '#fff5f5',
                  padding: '16px',
                  borderRadius: '12px'
                }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: '500', color: currentTheme.colors.primary }}>
                    工作时间：
                  </p>
                  <p style={{ margin: 0, color: '#5a3d31' }}>
                    周一至周五 9:00-18:00
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowContactModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '12px',
                    backgroundColor: '#ffffff',
                    color: '#5a3d31',
                    cursor: 'pointer'
                  }}
                >
                  关闭
                </button>
                <button
                  onClick={() => window.location.href = 'mailto:593098881@qq.com'}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: 'none',
                    borderRadius: '12px',
                    backgroundColor: '#ff6b81',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  发送邮件
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="theme-container" style={{ 
      minHeight: '100vh', 
      background: currentTheme.colors.background,
      fontFamily: currentTheme.fonts.body,
      color: currentTheme.colors.text,
      position: 'relative'
    }}>
      {/* 主题特效层 */}
      {currentTheme.effects.scanline && <div className="scanline" />}
      {currentTheme.effects.particles && <div className="particles-container" id="particles" />}
      
      <div className="container" style={{ position: 'relative', zIndex: 10 }}>
      {/* 自定义弹框 */}
      {showAlert && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: currentTheme.colors.surface,
            border: `1px solid ${currentTheme.colors.border}`,
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '80%',
            maxHeight: '80%',
            overflow: 'auto',
            boxShadow: `0 4px 20px rgba(0,0,0,0.5)`,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <h3 style={{
                margin: 0,
                color: alertType === 'success' ? '#4CAF50' : alertType === 'error' ? '#ff6b81' : '#5a3d31'
              }}>
                {alertType === 'success' ? '成功' : alertType === 'error' ? '错误' : '信息'}
              </h3>
              <button
                onClick={closeAlert}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#999'
                }}
              >
                ×
              </button>
            </div>
            <div style={{
              whiteSpace: 'pre-line',
              lineHeight: '1.5',
              marginBottom: '20px'
            }}>
              {alertMessage}
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={closeAlert}
                style={{
                  padding: '8px 16px',
                  backgroundColor: alertType === 'success' ? '#4CAF50' : alertType === 'error' ? '#ff6b81' : '#ffb3ba',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 数据集选择模态框 */}
      {showDataSetModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '80%',
            maxHeight: '80%',
            overflow: 'auto',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            border: `2px solid ${currentTheme.colors.border}`
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <h3 style={{
                margin: 0,
                color: '#5a3d31'
              }}>
                选择数据集
              </h3>
              <button
                onClick={() => setShowDataSetModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#999'
                }}
              >
                ×
              </button>
            </div>
            <div style={{
              marginBottom: '20px'
            }}>
              {dataSets.length === 0 ? (
                <p>暂无可用数据集，请先导入文件。</p>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  {dataSets.map((dataSet) => (
                    <div key={dataSet.id} style={{
                      padding: '12px',
                      border: `1px solid ${currentDataSetId === dataSet.id ? currentTheme.colors.primary : '#ddd'}`,
                      borderRadius: '4px',
                      backgroundColor: currentDataSetId === dataSet.id ? '#fff5f5' : '#ffffff',
                      cursor: 'pointer'
                    }} onClick={async () => {
                      setCurrentDataSetId(dataSet.id);
                      setShowDataSetModal(false);
                      displayAlert(`正在加载数据集: ${dataSet.name}...`, 'info');
                      try {
                        const persons = await storageService.getPersonsByDatasetId(dataSet.id);
                        setPeople(persons || []);
                        if (persons && persons.length > 0) {
                          const certs = new Set<string>();
                          persons.forEach((p: any) => {
                            (p.certificates || []).forEach((c: any) => {
                              const cn = typeof c === 'string' ? c : (c.name || c.value || '');
                              if (cn && cn.trim()) {
                                const isHidden = hiddenColumns.some(h => cn.includes(h));
                                const isExcluded = EXCLUDED_CERT_KEYWORDS.some(kw => cn.includes(kw));
                                if (!isHidden && !isExcluded) certs.add(cn.trim());
                              }
                            });
                            if (p.certificateColumns) {
                              Object.entries(p.certificateColumns).forEach(([colName, colValue]) => {
                                if (colName.includes('教育形式')) return;
                                const vs = String(colValue || '').trim();
                                if (!vs || ['否', '无', '-', '/', 'N/A'].includes(vs) || vs.toLowerCase() === 'no') return;
                                const isHiddenCol = hiddenColumns.some(h => colName.includes(h));
                                if (!isHiddenCol && colName.trim()) certs.add(colName.trim());
                                if (['是', '有'].includes(vs)) {
                                  if (!EXCLUDED_CERT_KEYWORDS.some(kw => colName.includes(kw))) certs.add(colName.trim());
                                } else {
                                  if (!EXCLUDED_CERT_KEYWORDS.some(kw => vs.includes(kw)) && vs.trim()) certs.add(vs.trim());
                                }
                              });
                            }
                          });
                          setCertificateOptions([...BASE_CERT_CATEGORIES, ...certs]);
                        } else {
                          setCertificateOptions([]);
                        }
                        setFilteredPeople([]);
                        displayAlert(`已切换到数据集: ${dataSet.name} (${persons?.length || 0} 条记录)`, 'success');
                        addLog(`切换到数据集: ${dataSet.name}`);
                      } catch (error) {
                        console.error('切换数据集失败:', error);
                        setPeople([]);
                        setCertificateOptions([]);
                        displayAlert('加载数据失败，请重试', 'error');
                      }
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '5px'
                      }}>
                        <h4 style={{ margin: 0, color: '#5a3d31' }}>{dataSet.name}</h4>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {currentDataSetId === dataSet.id && (
                            <span style={{
                              padding: '2px 8px',
                              backgroundColor: '#ff6b81',
                              color: 'white',
                              borderRadius: '10px',
                              fontSize: '12px'
                            }}>
                              当前使用
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`确定要删除数据集"${dataSet.name}"吗？此操作将删除该数据集下的所有人员数据，且不可恢复。`)) {
                                handleDeleteDataSet(dataSet.id, dataSet.name);
                              }
                            }}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#ff6b81',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        <div>记录数: {dataSet.count}</div>
                        <div>创建时间: {dataSet.createdAt instanceof Date ? dataSet.createdAt.toLocaleString() : (dataSet.createdAt ? new Date(dataSet.createdAt).toLocaleString() : '未知')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowDataSetModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ffb3ba',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="header" style={{ 
        borderBottom: `1px solid ${currentTheme.colors.border}`,
        padding: '20px 0',
        marginBottom: '30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 700,
          color: currentTheme.colors.primary,
          fontFamily: currentTheme.fonts.heading,
          letterSpacing: '4px',
          margin: 0
        }}>
          {currentTheme.name} // 人员筛选
        </h1>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {/* 当前用户信息展示 */}
          {isLoggedIn && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 12px',
              background: currentTheme.colors.surface,
              borderRadius: '20px',
              border: `1px solid ${currentTheme.colors.border}`
            }}>
              {/* 用户头像 */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.accent})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: currentTheme.colors.background,
                fontWeight: 'bold',
                fontSize: '14px'
              }}>
                {username ? username.charAt(0).toUpperCase() : 'U'}
              </div>
              {/* 用户信息 */}
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: currentTheme.colors.text }}>
                  {username || '用户'}
                </span>
                <span style={{ fontSize: '11px', color: currentTheme.colors.textSecondary }}>
                  {userRole === 'admin' ? '管理员' : '成员'}
                </span>
              </div>
            </div>
          )}
          {modules.fileUpload && (userRole === 'admin' || userRole === 'member') && (
            <>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                id="excel-upload"
              />
              <button 
                type="button" 
                onClick={() => document.getElementById('excel-upload')?.click()} 
                disabled={uploading}
                style={{
                  padding: '10px 20px',
                  background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.accent})`,
                  border: 'none',
                  borderRadius: '6px',
                  color: currentTheme.colors.background,
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  opacity: uploading ? 0.6 : 1,
                  transition: 'all 0.3s',
                  fontFamily: currentTheme.fonts.body,
                }}
                onMouseEnter={(e) => {
                  if (!uploading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 4px 15px ${currentTheme.colors.primary}50`;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {uploading ? '上传中...' : '导入文件'}
              </button>
              {dataSets.length > 0 && (
                <button 
                  type="button" 
                  onClick={() => setShowDataSetModal(true)}
                  style={{
                    padding: '10px 20px',
                    background: 'transparent',
                    border: `1px solid ${currentTheme.colors.primary}`,
                    borderRadius: '6px',
                    color: currentTheme.colors.primary,
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    fontFamily: currentTheme.fonts.body,
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
                  切换数据集
                </button>
              )}
            </>
          )}
          {uploading && (
            <div style={{ width: '200px', marginTop: '10px' }}>
              <div style={{ 
                width: '100%', 
                height: '8px', 
                backgroundColor: '#ffb3ba', 
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  width: `${uploadProgress}%`, 
                  height: '100%', 
                  backgroundColor: '#ff6b81',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{ 
                fontSize: '12px', 
                textAlign: 'center', 
                marginTop: '5px',
                color: '#5a3d31'
              }}>
                {uploadProgress}%
              </div>
            </div>
          )}
          {modules.adminPanel && (userRole === 'admin') && (
            <button 
              type="button" 
              onClick={() => setShowAdminPanel(!showAdminPanel)}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: `1px solid ${currentTheme.colors.primary}`,
                borderRadius: '6px',
                color: currentTheme.colors.primary,
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s',
                fontFamily: currentTheme.fonts.body,
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
              {showAdminPanel ? '返回筛选' : '后台管理'}
            </button>
          )}
          <button 
            onClick={handleLogout}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: `1px solid ${currentTheme.colors.primary}`,
              borderRadius: '6px',
              color: currentTheme.colors.primary,
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s',
              fontFamily: currentTheme.fonts.body,
              letterSpacing: '1px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = currentTheme.colors.primary;
              e.currentTarget.style.color = currentTheme.colors.background;
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 4px 15px ${currentTheme.colors.primary}50`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = currentTheme.colors.primary;
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {currentTheme.labels.logout}
          </button>
          {/* 主题切换按钮 */}
          <ThemeSwitcher />
        </div>
      </div>

      {!showAdminPanel && (
        <div>
          {/* AI 智能搜索区域 */}
          <div style={{
            background: currentTheme.colors.surface,
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '20px',
            border: `1px solid ${currentTheme.colors.border}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ 
                fontSize: '16px', 
                fontWeight: 'bold', 
                color: currentTheme.colors.primary,
                fontFamily: currentTheme.fonts.heading,
                letterSpacing: '2px'
              }}>
                {currentTheme.labels.aiSearchTitle} // {currentTheme.labels.aiSearchSubtitle}
              </span>
              <button
                type="button"
                onClick={() => setShowAISettings(!showAISettings)}
                style={{
                  fontSize: '12px',
                  padding: '4px 12px',
                  background: 'transparent',
                  border: `1px solid ${currentTheme.colors.primary}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  color: currentTheme.colors.primary,
                  transition: 'all 0.3s'
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
                ⚙️ 设置
              </button>
            </div>

            {showAISettings && (
              <div style={{
                background: currentTheme.colors.surface,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px',
                border: `1px solid ${currentTheme.colors.border}`
              }}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '13px', color: currentTheme.colors.textSecondary, display: 'block', marginBottom: '8px' }}>选择 AI 模型</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {[
                      { id: 'deepseek', name: 'DeepSeek', desc: '推荐', color: '#4a6cf7' },
                      { id: 'qwen', name: '通义千问', desc: '阿里云', color: '#ff6a00' },
                      { id: 'doubao', name: '豆包', desc: '字节跳动', color: '#1677ff' },
                      { id: 'custom', name: '自定义', desc: 'OpenAI兼容', color: '#52c41a' }
                    ].map(model => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => setAiProvider(model.id)}
                        style={{
                          padding: '8px 14px',
                          border: `2px solid ${aiProvider === model.id ? model.color : '#ddd'}`,
                          borderRadius: '8px',
                          backgroundColor: aiProvider === model.id ? `${model.color}15` : '#fff',
                          color: aiProvider === model.id ? model.color : '#555',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: aiProvider === model.id ? '600' : '400',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px',
                          minWidth: '80px'
                        }}
                      >
                        <span>{model.name}</span>
                        <span style={{ fontSize: '10px', opacity: 0.7 }}>{model.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
                  <div>
                    <label style={{ fontSize: '13px', color: currentTheme.colors.textSecondary, display: 'block', marginBottom: '4px' }}>API Key *</label>
                    <input
                      type="password"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder={aiProvider === 'deepseek' ? 'sk-...' : aiProvider === 'qwen' ? 'sk-...' : aiProvider === 'doubao' ? '输入 API Key' : '输入 OpenAI 格式的 API Key'}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'rgba(0,0,0,0.3)',
                        border: `1px solid ${currentTheme.colors.border}`,
                        borderRadius: '6px',
                        fontSize: '14px',
                        color: currentTheme.colors.text,
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = currentTheme.colors.primary;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = currentTheme.colors.border;
                      }}
                    />
                  </div>
                  {(aiProvider === 'custom') && (
                    <>
                      <div style={{ marginTop: '8px' }}>
                        <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>API 地址</label>
                        <input
                          type="text"
                          value={aiBaseUrl}
                          onChange={(e) => setAiBaseUrl(e.target.value)}
                          placeholder="https://api.example.com/v1"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <div style={{ marginTop: '8px' }}>
                        <label style={{ fontSize: '13px', color: '#666', display: 'block', marginBottom: '4px' }}>模型名称</label>
                        <input
                          type="text"
                          value={aiModel}
                          onChange={(e) => setAiModel(e.target.value)}
                          placeholder="gpt-3.5-turbo"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    </>
                  )}
                  <div style={{ marginTop: '10px', fontSize: '11px', color: '#999', lineHeight: '1.5' }}>
                    💡 提示：DeepSeek 可在 platform.deepseek.com 免费申请 API Key
                  </div>
                  <div style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {aiConfigSaved && (
                      <span style={{ fontSize: '11px', color: '#52c41a' }}>✓ 配置已自动保存</span>
                    )}
                    {aiApiKey && (
                      <button
                        type="button"
                        onClick={() => {
                          setAiApiKey('');
                          setAiBaseUrl('');
                          setAiModel('');
                          storageService.saveAIConfig({ provider: aiProvider, apiKey: '', baseUrl: '', model: '' });
                          setAiConfigSaved(false);
                        }}
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          background: '#fff',
                          color: '#999',
                          cursor: 'pointer'
                        }}
                      >
                        清除 API Key
                      </button>
                    )}
                  </div>
                </div>
              )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <textarea
                value={smartQuery}
                onChange={(e) => setSmartQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isSmartSearching) { e.preventDefault(); handleSmartSearch(); } }}
                placeholder='例如：30岁以下有PMP证书的软件工程师'
                rows={2}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  border: `2px solid ${currentTheme.colors.primary}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: '52px',
                  fontFamily: 'inherit',
                  lineHeight: '1.5'
                }}
              />
              <button
                type="button"
                onClick={handleSmartSearch}
                disabled={isSmartSearching}
                style={{
                  padding: '12px 24px',
                  background: isSmartSearching 
                    ? 'rgba(128,128,128,0.5)' 
                    : `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.accent})`,
                  color: currentTheme.colors.background,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isSmartSearching ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  alignSelf: 'center',
                  fontFamily: currentTheme.fonts.body,
                  letterSpacing: '2px',
                  transition: 'all 0.3s',
                  boxShadow: isSmartSearching ? 'none' : `0 4px 15px ${currentTheme.colors.primary}40`
                }}
                onMouseEnter={(e) => {
                  if (!isSmartSearching) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 6px 20px ${currentTheme.colors.primary}60`;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = isSmartSearching ? 'none' : `0 4px 15px ${currentTheme.colors.primary}40`;
                }}
              >
                {isSmartSearching ? `⏳ ${currentTheme.labels.aiSearching}` : `🔍 ${currentTheme.labels.aiSearchButton}`}
              </button>
            </div>

            {isSmartSearching && (
              <div style={{
                marginTop: '12px',
                backgroundColor: '#e3f2fd',
                borderRadius: '8px',
                padding: '12px',
                border: '1px solid #2196f3',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '13px', color: '#1565c0' }}>
                  🔄 AI正在分析并执行精确匹配搜索...
                </div>
              </div>
            )}

            {!isSmartSearching && aiDiagnosticInfo && (
              <div style={{
                marginTop: '10px',
                backgroundColor: '#fff8e1',
                borderRadius: '8px',
                padding: '10px 14px',
                border: '1px solid #ffc107'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#f57c00', marginBottom: '4px' }}>🔍 AI解析诊断</div>
                <pre style={{
                  fontSize: '11px',
                  color: '#5d4037',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  lineHeight: 1.4,
                  fontFamily: 'monospace'
                }}>{aiDiagnosticInfo}</pre>
              </div>
            )}

            <div style={{ fontSize: '11px', color: '#999', marginTop: '6px' }}>
              提示：支持自然语言描述，如"35岁左右本科以上学历有PMP证书的"
            </div>
          </div>

          {/* 原有筛选表单 */}
          <div className="filter-container" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginTop: '20px'
          }}>
          <div className="form-group">
            <label htmlFor="name" style={{ 
              display: 'block', 
              marginBottom: '6px', 
              color: currentTheme.colors.textSecondary,
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              {currentTheme.labels.name}
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={filters.name}
              onChange={handleFilterChange}
              placeholder="输入姓名"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(0,0,0,0.3)',
                border: `1px solid ${currentTheme.colors.border}`,
                borderRadius: '6px',
                color: currentTheme.colors.text,
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.3s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = currentTheme.colors.primary;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = currentTheme.colors.border;
              }}
            />
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label>年龄范围</label>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowAgeDropdown(!showAgeDropdown)}
                style={{
                  width: '100%',
                  minWidth: '120px',
                  maxWidth: '180px',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  textAlign: 'left',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = currentTheme.colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#ddd';
                }}
              >
                <span style={{ maxWidth: 'calc(100% - 20px)' }}>
                  {filters.ageMin === 0 && filters.ageMax === 100 ? '全部年龄' : `${filters.ageMin} - ${filters.ageMax}`}
                </span>
                <span>{showAgeDropdown ? '▼' : '▶'}</span>
              </button>
              {showAgeDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: '#ffffff',
                  border: `1px solid ${currentTheme.colors.border}`,
                  borderRadius: '4px',
                  padding: '10px',
                  zIndex: 1000,
                  marginTop: '5px',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  animation: 'fadeIn 0.2s ease'
                }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#000000' }}>常用年龄区间</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '15px' }}>
                    <button
                      type="button"
                      onClick={() => handleAgeRangeSelect(0, 100)}
                      style={{
                        padding: '6px 10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontSize: '12px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffe6e6';
                        e.currentTarget.style.borderColor = '#ffb3ba';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#ddd';
                      }}
                    >
                      全部年龄
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAgeRangeSelect(18, 30)}
                      style={{
                        padding: '6px 10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontSize: '12px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffe6e6';
                        e.currentTarget.style.borderColor = '#ffb3ba';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#ddd';
                      }}
                    >
                      18-30岁
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAgeRangeSelect(31, 40)}
                      style={{
                        padding: '6px 10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontSize: '12px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffe6e6';
                        e.currentTarget.style.borderColor = '#ffb3ba';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#ddd';
                      }}
                    >
                      31-40岁
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAgeRangeSelect(41, 50)}
                      style={{
                        padding: '6px 10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontSize: '12px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffe6e6';
                        e.currentTarget.style.borderColor = '#ffb3ba';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#ddd';
                      }}
                    >
                      41-50岁
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAgeRangeSelect(51, 60)}
                      style={{
                        padding: '6px 10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontSize: '12px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffe6e6';
                        e.currentTarget.style.borderColor = '#ffb3ba';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#ddd';
                      }}
                    >
                      51-60岁
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAgeRangeSelect(61, 100)}
                      style={{
                        padding: '6px 10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontSize: '12px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffe6e6';
                        e.currentTarget.style.borderColor = '#ffb3ba';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#ddd';
                      }}
                    >
                      61岁以上
                    </button>
                  </div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#000000' }}>自定义区间</h4>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <input
                      type="number"
                      id="ageMin"
                      name="ageMin"
                      value={filters.ageMin}
                      onChange={handleFilterChange}
                      min="0"
                      max="100"
                      placeholder="最小"
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                    <span style={{ display: 'flex', alignItems: 'center' }}>至</span>
                    <input
                      type="number"
                      id="ageMax"
                      name="ageMax"
                      value={filters.ageMax}
                      onChange={handleFilterChange}
                      min="0"
                      max="100"
                      placeholder="最大"
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAgeDropdown(false)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: `1px solid ${currentTheme.colors.primary}`,
                      borderRadius: '4px',
                      backgroundColor: currentTheme.colors.primary,
                      color: '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontSize: '12px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = currentTheme.colors.secondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = currentTheme.colors.primary;
                    }}
                  >
                    应用
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label>入司年限（年）</label>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowTenureDropdown(!showTenureDropdown)}
                style={{
                  width: '100%',
                  minWidth: '120px',
                  maxWidth: '180px',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  textAlign: 'left',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = currentTheme.colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#ddd';
                }}
              >
                <span style={{ maxWidth: 'calc(100% - 20px)' }}>
                  {filters.tenureMin === 0 && filters.tenureMax === 50 ? '全部年限' : `${filters.tenureMin} - ${filters.tenureMax}年`}
                </span>
                <span>{showTenureDropdown ? '▼' : '▶'}</span>
              </button>
              {showTenureDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: '#ffffff',
                  border: `1px solid ${currentTheme.colors.border}`,
                  borderRadius: '4px',
                  padding: '10px',
                  zIndex: 1000,
                  marginTop: '5px',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  animation: 'fadeIn 0.2s ease'
                }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#000000' }}>常用年限区间</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '15px' }}>
                    <button
                      type="button"
                      onClick={() => handleTenureRangeSelect(0, 50)}
                      style={{
                        padding: '6px 10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontSize: '12px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffe6e6';
                        e.currentTarget.style.borderColor = '#ffb3ba';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#ddd';
                      }}
                    >
                      全部年限
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTenureRangeSelect(0, 1)}
                      style={{
                        padding: '6px 10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontSize: '12px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffe6e6';
                        e.currentTarget.style.borderColor = '#ffb3ba';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#ddd';
                      }}
                    >
                      最近1年
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTenureRangeSelect(0, 3)}
                      style={{
                        padding: '6px 10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontSize: '12px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffe6e6';
                        e.currentTarget.style.borderColor = '#ffb3ba';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#ddd';
                      }}
                    >
                      最近3年
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTenureRangeSelect(0, 5)}
                      style={{
                        padding: '6px 10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontSize: '12px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffe6e6';
                        e.currentTarget.style.borderColor = '#ffb3ba';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#ddd';
                      }}
                    >
                      最近5年
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTenureRangeSelect(1, 3)}
                      style={{
                        padding: '6px 10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontSize: '12px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffe6e6';
                        e.currentTarget.style.borderColor = '#ffb3ba';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#ddd';
                      }}
                    >
                      1-3年
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTenureRangeSelect(3, 5)}
                      style={{
                        padding: '6px 10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontSize: '12px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffe6e6';
                        e.currentTarget.style.borderColor = '#ffb3ba';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#ddd';
                      }}
                    >
                      3-5年
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTenureRangeSelect(5, 10)}
                      style={{
                        padding: '6px 10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontSize: '12px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffe6e6';
                        e.currentTarget.style.borderColor = '#ffb3ba';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#ddd';
                      }}
                    >
                      5-10年
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTenureRangeSelect(10, 50)}
                      style={{
                        padding: '6px 10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        color: '#000000',
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontSize: '12px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffe6e6';
                        e.currentTarget.style.borderColor = '#ffb3ba';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = '#ddd';
                      }}
                    >
                      10年以上
                    </button>
                  </div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#000000' }}>自定义区间</h4>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <input
                      type="number"
                      id="tenureMin"
                      name="tenureMin"
                      value={filters.tenureMin}
                      onChange={handleFilterChange}
                      min="0"
                      max="50"
                      placeholder="最小"
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                    <span style={{ display: 'flex', alignItems: 'center' }}>至</span>
                    <input
                      type="number"
                      id="tenureMax"
                      name="tenureMax"
                      value={filters.tenureMax}
                      onChange={handleFilterChange}
                      min="0"
                      max="50"
                      placeholder="最大"
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTenureDropdown(false)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: `1px solid ${currentTheme.colors.primary}`,
                      borderRadius: '4px',
                      backgroundColor: currentTheme.colors.primary,
                      color: '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontSize: '12px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = currentTheme.colors.secondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = currentTheme.colors.primary;
                    }}
                  >
                    应用
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label>毕业年限（年）</label>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowGraduationTenureDropdown(!showGraduationTenureDropdown)}
                style={{
                  width: '100%',
                  minWidth: '120px',
                  maxWidth: '180px',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  textAlign: 'left',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = currentTheme.colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#ddd';
                }}
              >
                <span style={{ maxWidth: 'calc(100% - 20px)' }}>
                  {filters.graduationTenureMin === 0 && filters.graduationTenureMax === 50 ? '全部年限' : `${filters.graduationTenureMin} - ${filters.graduationTenureMax}年`}
                </span>
                <span>{showGraduationTenureDropdown ? '▼' : '▶'}</span>
              </button>
              {showGraduationTenureDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: '#ffffff',
                  border: `1px solid ${currentTheme.colors.border}`,
                  borderRadius: '4px',
                  padding: '10px',
                  zIndex: 1000,
                  marginTop: '5px',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  animation: 'fadeIn 0.2s ease'
                }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#000000' }}>常用年限区间</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '15px' }}>
                    {[
                      { label: '全部', min: 0, max: 50 },
                      { label: '1年内', min: 0, max: 1 },
                      { label: '1-3年', min: 1, max: 3 },
                      { label: '3-5年', min: 3, max: 5 },
                      { label: '5-10年', min: 5, max: 10 },
                      { label: '10年以上', min: 10, max: 50 }
                    ].map(range => (
                      <button
                        key={range.label}
                        type="button"
                        onClick={() => handleGraduationTenureRangeSelect(range.min, range.max)}
                        style={{
                          padding: '6px 10px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          backgroundColor: '#ffffff',
                          color: '#000000',
                          cursor: 'pointer',
                          textAlign: 'center',
                          fontSize: '12px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffe6e6';
                          e.currentTarget.style.borderColor = '#ffb3ba';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.borderColor = '#ddd';
                        }}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#000000' }}>自定义区间</h4>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <input
                      type="number"
                      name="graduationTenureMin"
                      value={filters.graduationTenureMin}
                      onChange={handleFilterChange}
                      min="0"
                      max="50"
                      placeholder="最小"
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                    <span style={{ display: 'flex', alignItems: 'center' }}>至</span>
                    <input
                      type="number"
                      name="graduationTenureMax"
                      value={filters.graduationTenureMax}
                      onChange={handleFilterChange}
                      min="0"
                      max="50"
                      placeholder="最大"
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGraduationTenureDropdown(false)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: `1px solid ${currentTheme.colors.primary}`,
                      borderRadius: '4px',
                      backgroundColor: currentTheme.colors.primary,
                      color: '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontSize: '12px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = currentTheme.colors.secondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = currentTheme.colors.primary;
                    }}
                  >
                    应用
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label>学历</label>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowEducationDropdown(!showEducationDropdown)}
                style={{
                  width: '100%',
                  minWidth: '120px',
                  maxWidth: '180px', // 大约6个中文字符的宽度
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  textAlign: 'left',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                <span style={{ maxWidth: 'calc(100% - 20px)' }}>{filters.education.length > 0 ? filters.education.join('、') : '请选择学历'}</span>
                <span>{showEducationDropdown ? '▼' : '▶'}</span>
              </button>
              {showEducationDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: '#ffffff',
                  border: `1px solid ${currentTheme.colors.border}`,
                  borderRadius: '4px',
                  padding: '10px',
                  zIndex: 1000,
                  marginTop: '5px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
                    <input
                      type="checkbox"
                      checked={filters.education.includes('大专')}
                      onChange={() => handleEducationChange('大专')}
                    />
                    大专
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
                    <input
                      type="checkbox"
                      checked={filters.education.includes('本科')}
                      onChange={() => handleEducationChange('本科')}
                    />
                    本科
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
                    <input
                      type="checkbox"
                      checked={filters.education.includes('硕士')}
                      onChange={() => handleEducationChange('硕士')}
                    />
                    硕士
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input
                      type="checkbox"
                      checked={filters.education.includes('博士')}
                      onChange={() => handleEducationChange('博士')}
                    />
                    博士
                  </label>
                  <div style={{
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid #f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>是否全日制</span>
                    {[
                      { label: '是', value: true },
                      { label: '否', value: false },
                      { label: '不限', value: null as boolean | null }
                    ].map(opt => (
                      <label key={String(opt.value)} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        border: isFullTime === opt.value ? '1.5px solid #ff6b81' : '1px solid #e0e0e0',
                        backgroundColor: isFullTime === opt.value ? '#fff0f3' : '#fafafa',
                        color: isFullTime === opt.value ? '#ff6b81' : '#666',
                        fontWeight: isFullTime === opt.value ? 500 : 400,
                        transition: 'all 0.15s'
                      }}>
                        <input
                          type="radio"
                          name="fulltime"
                          checked={isFullTime === opt.value}
                          onChange={() => setIsFullTime(opt.value)}
                          style={{ cursor: 'pointer', margin: 0 }}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label>专业</label>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setShowMajorDropdown(!showMajorDropdown);
                  if (!showMajorDropdown) {
                    setFilteredMajorOptions([...majorOptions]);
                    setMajorSearchText('');
                    setSelectedMajorIndex(-1);
                  }
                }}
                style={{
                  width: '100%',
                  minWidth: '120px',
                  maxWidth: '180px',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  textAlign: 'left',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                <span style={{ maxWidth: 'calc(100% - 20px)' }}>{filters.major.length > 0 ? (filters.major.length === 1 ? filters.major[0] : `已选 ${filters.major.length} 项`) : '请选择专业'}</span>
                <span>{showMajorDropdown ? '▼' : '▶'}</span>
              </button>
              {showMajorDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: '#ffffff',
                  border: `1px solid ${currentTheme.colors.border}`,
                  borderRadius: '4px',
                  zIndex: 1000,
                  marginTop: '5px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}>
                  <div style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                    <input
                      ref={majorInputRef}
                      type="text"
                      value={majorSearchText}
                      onChange={(e) => handleMajorSearchInput(e.target.value)}
                      onKeyDown={handleMajorSearchKeyDown}
                      onFocus={() => {
                        if (blurTimeout) {
                          clearTimeout(blurTimeout);
                          setBlurTimeout(null);
                        }
                      }}
                      onBlur={() => {
                        const timeout = setTimeout(() => {
                          setShowMajorDropdown(false);
                        }, 200);
                        setBlurTimeout(timeout);
                      }}
                      placeholder="输入专业名称搜索..."
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    padding: '8px 10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #f0f0f0' }}>
                      <input
                        type="checkbox"
                        checked={filters.major.length === majorOptions.length && majorOptions.length > 0}
                        onChange={handleMajorSelectAll}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '12px', fontWeight: '500', color: '#333' }}>全选/取消全选</span>
                      {filters.major.length > 1 && (
                        <span style={{ fontSize: '11px', color: '#ff6b81', marginLeft: 'auto' }}>({filters.major.length}项已选)</span>
                      )}
                    </div>
                    {filteredMajorOptions.length > 0 ? (
                      filteredMajorOptions.map((option, index) => (
                        <label
                          key={option}
                          onClick={() => handleMajorOptionSelect(option)}
                          onMouseEnter={() => setSelectedMajorIndex(index)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            marginBottom: '6px',
                            cursor: 'pointer',
                            padding: '4px 6px',
                            borderRadius: '3px',
                            backgroundColor: selectedMajorIndex === index ? '#fff0f3' : 'transparent',
                            transition: 'background-color 0.15s'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={filters.major.includes(option)}
                            onChange={() => handleMajorChange(option)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{
                            fontSize: '13px',
                            color: filters.major.includes(option) ? '#ff6b81' : '#333',
                            fontWeight: filters.major.includes(option) ? '500' : '400'
                          }}>{option}</span>
                        </label>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', color: '#999', fontSize: '13px', padding: '10px 0' }}>
                        {majorSearchText ? '未找到匹配的专业' : (majorOptions.length > 0 ? '暂无专业选项' : '请先导入数据')}
                      </div>
                    )}
                  </div>
                  {majorSearchText && filteredMajorOptions.length > 0 && (
                    <div style={{
                      padding: '6px 10px',
                      borderTop: '1px solid #eee',
                      backgroundColor: '#fafafa',
                      fontSize: '11px',
                      color: '#666'
                    }}>
                      找到 {filteredMajorOptions.length} 个匹配项 {selectedMajorIndex >= 0 && `(↑↓选择, Enter确认)`}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label htmlFor="certificate">证书</label>
            <input
              ref={certInputRef}
              type="text"
              id="certificate"
              name="certificate"
              value={filters.certificate}
              onChange={handleFilterChange}
              onKeyDown={handleCertKeyDown}
              onBlur={() => {
                // 使用setTimeout确保点击下拉菜单项时不会触发收起
                const timeout = setTimeout(() => {
                  setShowCertDropdown(false);
                }, 200);
                setBlurTimeout(timeout);
              }}
              onFocus={() => {
                // 清除之前的超时
                if (blurTimeout) {
                  clearTimeout(blurTimeout);
                  setBlurTimeout(null);
                }
                // 如果正在搜索，不显示下拉菜单
                if (isSearching) {
                  return;
                }
                // 如果输入框有内容，显示下拉菜单
                if (filters.certificate) {
                  const searchTerm = filters.certificate.replace(/\s/g, '').toLowerCase();
                  const allPossibleCertificates = new Set<string>();
                  certificateOptions.forEach(option => allPossibleCertificates.add(option));
                  people.forEach(person => {
                    Object.entries(person.certificateColumns || {}).forEach(([_, certValue]) => {
                      const valueStr = String(certValue || '').trim();
                      if (valueStr && valueStr !== '是' && valueStr !== '否' && valueStr !== '有' && valueStr !== '无') {
                        allPossibleCertificates.add(valueStr);
                      }
                    });
                  });
                  const filtered = Array.from(allPossibleCertificates).filter(cert => 
                    cert.replace(/\s/g, '').toLowerCase().includes(searchTerm)
                  );
                  setFilteredCertOptions(filtered);
                  setShowCertDropdown(filtered.length > 0);
                  setSelectedCertIndex(-1);
                }
              }}
              placeholder="输入证书名称"
              style={{ borderColor: certificateError ? '#ff6b81' : '#ddd' }}
            />
            {certificateError && (
              <p style={{ color: '#ff6b81', fontSize: '12px', marginTop: '5px' }}>{certificateError}</p>
            )}
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: '#ffffff',
                border: `1px solid ${currentTheme.colors.border}`,
                borderRadius: '4px',
                maxHeight: showCertDropdown && filteredCertOptions.length > 0 ? '200px' : '0',
                opacity: showCertDropdown && filteredCertOptions.length > 0 ? 1 : 0,
                overflowY: 'auto',
                zIndex: 1000,
                marginTop: '5px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'max-height 0.25s ease-in-out, opacity 0.25s ease-in-out'
              }}
              onMouseLeave={() => setShowCertDropdown(false)}
              onMouseDown={(e) => {
                // 阻止事件冒泡，防止输入框失去焦点
                e.preventDefault();
              }}
            >
              {showCertDropdown && filteredCertOptions.length > 0 && filteredCertOptions.map((cert, index) => {
                // 高亮显示匹配部分
                const searchTerm = filters.certificate;
                const searchTermClean = searchTerm.replace(/\s/g, '').toLowerCase();
                const certOriginal = cert;
                
                // 找到匹配的位置（不区分大小写）
                let matchIndex = -1;
                let matchLength = 0;
                
                const certClean = certOriginal.replace(/\s/g, '').toLowerCase();
                const termIndex = certClean.indexOf(searchTermClean);
                
                if (termIndex >= 0) {
                  // 计算在原始字符串中的位置
                  let cleanedCount = 0;
                  for (let i = 0; i < certOriginal.length; i++) {
                    if (certOriginal[i].trim() !== '') {
                      if (cleanedCount === termIndex) {
                        matchIndex = i;
                        break;
                      }
                      cleanedCount++;
                    }
                  }
                  matchLength = searchTerm.length;
                }
                
                return (
                  <div
                    key={cert}
                    onClick={() => handleCertSelect(cert)}
                    style={{
                      padding: '10px',
                      cursor: 'pointer',
                      backgroundColor: index === selectedCertIndex ? '#ffb3ba' : 'transparent',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={() => setSelectedCertIndex(index)}
                    onMouseOver={() => setSelectedCertIndex(index)}
                  >
                    {matchIndex >= 0 ? (
                      <span>
                        {certOriginal.substring(0, matchIndex)}
                        <span style={{ backgroundColor: '#ff6b81', color: '#ffffff' }}>
                          {certOriginal.substring(matchIndex, matchIndex + matchLength)}
                        </span>
                        {certOriginal.substring(matchIndex + matchLength)}
                      </span>
                    ) : (
                      certOriginal
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {modules.search && (userRole === 'admin' || userRole === 'member') && (
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                type="button" 
                onClick={(e) => {
                  // 阻止事件冒泡，防止输入框获得焦点
                  e.stopPropagation();
                  // 立即关闭下拉菜单
                  setShowCertDropdown(false);
                  if (blurTimeout) {
                    clearTimeout(blurTimeout);
                    setBlurTimeout(null);
                  }
                  // 执行搜索
                  handleSearch();
                }} 
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  background: `linear-gradient(135deg, ${currentTheme.colors.primary}, ${currentTheme.colors.accent})`,
                  border: 'none',
                  borderRadius: '6px',
                  color: currentTheme.colors.background,
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontFamily: currentTheme.fonts.body,
                  letterSpacing: '2px',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 4px 15px ${currentTheme.colors.primary}50`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {currentTheme.labels.search}
              </button>
              {modules.download && (userRole === 'admin' || userRole === 'member') && (
                <button 
                  type="button" 
                  onClick={() => handleDownload(filteredPeople)} 
                  disabled={filteredPeople.length === 0}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    background: filteredPeople.length === 0 
                      ? 'rgba(128,128,128,0.3)' 
                      : currentTheme.colors.success,
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: filteredPeople.length === 0 ? 'not-allowed' : 'pointer',
                    fontFamily: currentTheme.fonts.body,
                    letterSpacing: '2px',
                    transition: 'all 0.3s',
                    opacity: filteredPeople.length === 0 ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (filteredPeople.length > 0) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 4px 15px ${currentTheme.colors.success}50`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {currentTheme.labels.download}
                </button>
              )}
            </div>
          )}
        </div>
        </div>
      )}

      {showAdminPanel ? (
        <div className="card">
          <h2>后台管理</h2>
          
          {/* 用户账户管理 */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3>用户账户管理</h3>
              <button
                type="button"
                onClick={() => {
                  setEditingUser(null);
                  setNewUser({ username: '', password: '', role: 'member', enabled: true });
                  setShowUserModal(true);
                }}
                style={{
                  padding: '6px 12px',
                  border: `1px solid ${currentTheme.colors.primary}`,
                  borderRadius: '4px',
                  backgroundColor: currentTheme.colors.primary,
                  color: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                创建用户
              </button>
            </div>
            <div style={{
              maxHeight: '300px',
              overflowY: 'auto',
              backgroundColor: '#f8f9fa',
              padding: '16px',
              borderRadius: '8px',
              border: `1px solid ${currentTheme.colors.border}`
            }}>
              {users.map((user) => (
                <div key={user.id} style={{
                  marginBottom: '12px',
                  padding: '12px',
                  backgroundColor: '#ffffff',
                  borderRadius: '4px',
                  border: `1px solid ${currentTheme.colors.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <p><strong>用户名:</strong> {user.username}</p>
                    <p><strong>角色:</strong> {user.role === 'admin' ? '管理员' : '普通成员'}</p>
                    <p><strong>状态:</strong> {user.enabled ? '启用' : '禁用'}</p>
                    <p><strong>创建时间:</strong> {user.createdAt instanceof Date ? user.createdAt.toLocaleString() : (user.createdAt ? new Date(user.createdAt).toLocaleString() : '未知')}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                    <button
                      type="button"
                      onClick={() => handleUserEdit(user)}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #4CAF50',
                        borderRadius: '4px',
                        backgroundColor: '#4CAF50',
                        color: '#ffffff',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePermissionEdit(user)}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #2196F3',
                        borderRadius: '4px',
                        backgroundColor: '#2196F3',
                        color: '#ffffff',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      权限
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResetUserPassword(user.id, user.username)}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #9c27b0',
                        borderRadius: '4px',
                        backgroundColor: '#9c27b0',
                        color: '#ffffff',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      重置密码
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUserToggle(user.id, user.enabled)}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #ff9800',
                        borderRadius: '4px',
                        backgroundColor: '#ff9800',
                        color: '#ffffff',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      {user.enabled ? '禁用' : '启用'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUserDelete(user.id, user.username)}
                      disabled={user.id === '1'}
                      style={{
                        padding: '4px 8px',
                        border: `1px solid ${currentTheme.colors.primary}`,
                        borderRadius: '4px',
                        backgroundColor: currentTheme.colors.primary,
                        color: '#ffffff',
                        cursor: user.id === '1' ? 'not-allowed' : 'pointer',
                        opacity: user.id === '1' ? 0.5 : 1,
                        fontSize: '12px'
                      }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 用户角色管理 */}
          <div style={{ marginBottom: '24px' }}>
            <h3>当前角色管理</h3>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
              <span>当前角色: </span>
              <button
                type="button"
                onClick={() => handleRoleChange('admin')}
                style={{
                  padding: '6px 12px',
                  border: userRole === 'admin' ? `1px solid ${currentTheme.colors.primary}` : '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: userRole === 'admin' ? currentTheme.colors.primary : '#ffffff',
                  color: userRole === 'admin' ? '#ffffff' : '#000000',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                管理员
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('member')}
                style={{
                  padding: '6px 12px',
                  border: userRole === 'member' ? `1px solid ${currentTheme.colors.primary}` : '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: userRole === 'member' ? currentTheme.colors.primary : '#ffffff',
                  color: userRole === 'member' ? '#ffffff' : '#000000',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                普通成员
              </button>
            </div>
            <div style={{ marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #4CAF50',
                  borderRadius: '4px',
                  backgroundColor: '#4CAF50',
                  color: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                修改密码
              </button>
            </div>
          </div>
          
          {/* 模块状态控制 */}
          <div style={{ marginBottom: '24px' }}>
            <h3>模块状态控制</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>文件上传</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={modules.fileUpload}
                    onChange={() => handleModuleToggle('fileUpload')}
                    disabled={userRole !== 'admin'}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>搜索功能</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={modules.search}
                    onChange={() => handleModuleToggle('search')}
                    disabled={userRole !== 'admin'}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>下载功能</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={modules.download}
                    onChange={() => handleModuleToggle('download')}
                    disabled={userRole !== 'admin'}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>后台管理</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={modules.adminPanel}
                    onChange={() => handleModuleToggle('adminPanel')}
                    disabled={userRole !== 'admin'}
                  />
                  <span className="slider round"></span>
                </label>
              </div>
            </div>
          </div>
          
          {/* 文件管理 */}
          <div style={{ marginBottom: '24px' }}>
            <h3>文件管理</h3>
            <p>上传文件数: {files.length}</p>
            {files.length > 0 ? (
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                backgroundColor: '#f8f9fa',
                padding: '16px',
                borderRadius: '8px',
                border: `1px solid ${currentTheme.colors.border}`
              }}>
                {files.map((file) => (
                  <div key={file.id} style={{
                    marginBottom: '8px',
                    paddingBottom: '8px',
                    borderBottom: `1px solid ${currentTheme.colors.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <p><strong>文件名:</strong> {file.name}</p>
                      <p><strong>大小:</strong> {(file.size / 1024).toFixed(2)} KB</p>
                      <p><strong>上传时间:</strong> {file.uploadedAt instanceof Date ? file.uploadedAt.toLocaleString() : (file.uploadedAt ? new Date(file.uploadedAt).toLocaleString() : '未知')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFileDelete(file.id, file.name)}
                      disabled={userRole !== 'admin'}
                      style={{
                        padding: '6px 12px',
                        border: `1px solid ${currentTheme.colors.primary}`,
                        borderRadius: '4px',
                        backgroundColor: currentTheme.colors.primary,
                        color: '#ffffff',
                        cursor: userRole === 'admin' ? 'pointer' : 'not-allowed',
                        opacity: userRole === 'admin' ? 1 : 0.5,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p>暂无上传文件</p>
            )}
          </div>
          
          {/* 存储数据 */}
          {userRole === 'admin' && (
            <div style={{ marginBottom: '24px' }}>
              <h3>存储数据</h3>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <p style={{ margin: 0 }}>总记录数: {people.length}</p>
                <button
                  type="button"
                  onClick={() => setPeople([])}
                  style={{
                    padding: '4px 8px',
                    border: `1px solid ${currentTheme.colors.primary}`,
                    borderRadius: '4px',
                    backgroundColor: currentTheme.colors.primary,
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  清空所有数据
                </button>
                <button
                  type="button"
                  onClick={handleBatchDelete}
                  disabled={selectedPeople.length === 0}
                  style={{
                    padding: '4px 8px',
                    border: `1px solid ${currentTheme.colors.primary}`,
                    borderRadius: '4px',
                    backgroundColor: currentTheme.colors.primary,
                    color: '#ffffff',
                    cursor: selectedPeople.length > 0 ? 'pointer' : 'not-allowed',
                    opacity: selectedPeople.length > 0 ? 1 : 0.5,
                    fontSize: '12px'
                  }}
                >
                  批量删除 ({selectedPeople.length})
                </button>
              </div>
              {people.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h4>完整数据查阅</h4>
                  <div style={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                    backgroundColor: '#f8f9fa',
                    padding: '16px',
                    borderRadius: '8px',
                    border: `1px solid ${currentTheme.colors.border}`
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: currentTheme.colors.border }}>
                          <th style={{ padding: '8px', textAlign: 'center', border: `1px solid ${currentTheme.colors.border}`, width: '50px' }}>
                            <input
                              type="checkbox"
                              checked={people.length > 0 && selectedPeople.length === people.length}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                            />
                          </th>
                          <th style={{ padding: '8px', textAlign: 'left', border: `1px solid ${currentTheme.colors.border}` }}>工号</th>
                          <th style={{ padding: '8px', textAlign: 'left', border: `1px solid ${currentTheme.colors.border}` }}>姓名</th>
                          <th style={{ padding: '8px', textAlign: 'left', border: `1px solid ${currentTheme.colors.border}` }}>年龄</th>
                          <th style={{ padding: '8px', textAlign: 'left', border: `1px solid ${currentTheme.colors.border}` }}>学历</th>
                          <th style={{ padding: '8px', textAlign: 'left', border: `1px solid ${currentTheme.colors.border}` }}>证书</th>
                          <th style={{ padding: '8px', textAlign: 'center', border: `1px solid ${currentTheme.colors.border}`, width: '80px' }}>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // 计算分页数据，确保页码在有效范围内
                          const totalPages = Math.ceil(people.length / pageSize) || 1;
                          const validPage = Math.min(Math.max(1, currentPage), totalPages);
                          const startIndex = (validPage - 1) * pageSize;
                          const endIndex = Math.min(startIndex + pageSize, people.length);
                          const paginatedData = people.slice(startIndex, endIndex);

                          // 如果页码无效，自动修正
                          if (validPage !== currentPage) {
                            setCurrentPage(validPage);
                          }

                          return paginatedData.map((person) => {
                            const enriched = (person as any)._certDisplay !== undefined ? person as EnrichedPerson : enrichPersonData(person);

                            return (
                              <tr key={person.id} style={{ backgroundColor: '#ffffff' }}>
                                <td style={{ padding: '8px', border: `1px solid ${currentTheme.colors.border}`, textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={selectedPeople.includes(person.id)}
                                    onChange={() => handlePersonSelect(person.id)}
                                  />
                                </td>
                                <td style={{ padding: '8px', border: `1px solid ${currentTheme.colors.border}` }}>{person.employeeId || '-'}</td>
                                <td style={{ padding: '8px', border: `1px solid ${currentTheme.colors.border}` }}>{person.name || '-'}</td>
                                <td style={{ padding: '8px', border: `1px solid ${currentTheme.colors.border}` }}>{getPersonAge(person) || '-'}</td>
                                <td style={{ padding: '8px', border: `1px solid ${currentTheme.colors.border}` }}>{person.education || '-'}</td>
                                <td style={{ padding: '8px', border: `1px solid ${currentTheme.colors.border}` }}>
                                  {enriched._certDisplay || '无'}
                                </td>
                                <td style={{ padding: '8px', border: `1px solid ${currentTheme.colors.border}`, textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => handlePersonDelete(person.id, person.name)}
                                    style={{
                                      padding: '2px 6px',
                                      border: `1px solid ${currentTheme.colors.primary}`,
                                      borderRadius: '4px',
                                      backgroundColor: currentTheme.colors.primary,
                                      color: '#ffffff',
                                      cursor: 'pointer',
                                      fontSize: '10px'
                                    }}
                                  >
                                    删除
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                  {/* 分页控件 */}
                  {people.length > pageSize && (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      gap: '10px', 
                      marginTop: '16px',
                      padding: '10px'
                    }}>
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        style={{
                          padding: '6px 12px',
                          border: `1px solid ${currentTheme.colors.primary}`,
                          borderRadius: '4px',
                          backgroundColor: currentPage === 1 ? '#f0f0f0' : currentTheme.colors.primary,
                          color: currentPage === 1 ? '#999' : '#ffffff',
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        上一页
                      </button>
                      <span style={{ fontSize: '14px' }}>
                        第 {currentPage} 页 / 共 {Math.ceil(people.length / pageSize)} 页 (共 {people.length} 条)
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(people.length / pageSize), prev + 1))}
                        disabled={currentPage >= Math.ceil(people.length / pageSize)}
                        style={{
                          padding: '6px 12px',
                          border: `1px solid ${currentTheme.colors.primary}`,
                          borderRadius: '4px',
                          backgroundColor: currentPage >= Math.ceil(people.length / pageSize) ? '#f0f0f0' : currentTheme.colors.primary,
                          color: currentPage >= Math.ceil(people.length / pageSize) ? '#999' : '#ffffff',
                          cursor: currentPage >= Math.ceil(people.length / pageSize) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        下一页
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* 后台日志 */}
          <div>
            <h3>后台日志</h3>
            <div style={{
              maxHeight: '400px',
              overflowY: 'auto',
              backgroundColor: '#f8f9fa',
              padding: '16px',
              borderRadius: '8px',
              border: `1px solid ${currentTheme.colors.border}`
            }}>
              {logs.length > 0 ? (
                logs.map((log, index) => (
                  <p key={index} style={{ marginBottom: '8px', fontSize: '14px' }}>
                    {log}
                  </p>
                ))
              ) : (
                <p>暂无日志记录</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <h2>查询结果</h2>
          {filteredPeople.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: currentTheme.colors.border }}>
                    <th style={{ padding: '12px', textAlign: 'left', border: `1px solid ${currentTheme.colors.border}` }}>工号</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: `1px solid ${currentTheme.colors.border}` }}>姓名</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: `1px solid ${currentTheme.colors.border}` }}>年龄</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: `1px solid ${currentTheme.colors.border}` }}>学历</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: `1px solid ${currentTheme.colors.border}` }}>专业</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: `1px solid ${currentTheme.colors.border}` }}>证书</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // 计算分页数据，确保页码在有效范围内
                    const totalPages = Math.ceil(filteredPeople.length / pageSize) || 1;
                    const validPage = Math.min(Math.max(1, filteredCurrentPage), totalPages);
                    const startIndex = (validPage - 1) * pageSize;
                    const endIndex = Math.min(startIndex + pageSize, filteredPeople.length);
                    const paginatedData = filteredPeople.slice(startIndex, endIndex);

                    // 如果页码无效，自动修正
                    if (validPage !== filteredCurrentPage) {
                      setFilteredCurrentPage(validPage);
                    }

                    return paginatedData.map((person) => {
                      const enriched = (person as any)._certDisplay !== undefined ? person as EnrichedPerson : enrichPersonData(person, filters.certificate);

                      return (
                        <tr key={person.id} style={{ backgroundColor: '#ffffff' }}>
                          <td style={{ padding: '12px', border: `1px solid ${currentTheme.colors.border}` }}>{person.employeeId || '-'}</td>
                          <td style={{ padding: '12px', border: `1px solid ${currentTheme.colors.border}` }}>{person.name || '-'}</td>
                          <td style={{ padding: '12px', border: `1px solid ${currentTheme.colors.border}` }}>{getPersonAge(person) || '-'}</td>
                          <td style={{ padding: '12px', border: `1px solid ${currentTheme.colors.border}` }}>{person.education || '-'}</td>
                          <td style={{ padding: '12px', border: `1px solid ${currentTheme.colors.border}` }}>{person.major || '-'}</td>
                          <td style={{ padding: '12px', border: `1px solid ${currentTheme.colors.border}` }}>
                            {enriched._certDisplay || '无'}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ textAlign: 'center', padding: '20px' }}>没有找到匹配的人员</p>
          )}
          {/* 筛选结果分页控件 */}
          {filteredPeople.length > 0 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '10px', 
              marginTop: '16px',
              padding: '10px'
            }}>
              <button
                onClick={() => setFilteredCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={filteredCurrentPage <= 1}
                style={{
                  padding: '6px 12px',
                  border: `1px solid ${currentTheme.colors.primary}`,
                  borderRadius: '4px',
                  backgroundColor: filteredCurrentPage <= 1 ? '#f0f0f0' : currentTheme.colors.primary,
                  color: filteredCurrentPage <= 1 ? '#999' : '#ffffff',
                  cursor: filteredCurrentPage <= 1 ? 'not-allowed' : 'pointer'
                }}
              >
                上一页
              </button>
              <span style={{ fontSize: '14px' }}>
                第 {Math.min(filteredCurrentPage, Math.ceil(filteredPeople.length / pageSize) || 1)} 页 / 共 {Math.ceil(filteredPeople.length / pageSize) || 1} 页 (共 {filteredPeople.length} 条)
              </span>
              <button
                onClick={() => setFilteredCurrentPage(prev => Math.min(Math.ceil(filteredPeople.length / pageSize) || 1, prev + 1))}
                disabled={filteredCurrentPage >= Math.ceil(filteredPeople.length / pageSize)}
                style={{
                  padding: '6px 12px',
                  border: `1px solid ${currentTheme.colors.primary}`,
                  borderRadius: '4px',
                  backgroundColor: filteredCurrentPage >= Math.ceil(filteredPeople.length / pageSize) ? '#f0f0f0' : currentTheme.colors.primary,
                  color: filteredCurrentPage >= Math.ceil(filteredPeople.length / pageSize) ? '#999' : '#ffffff',
                  cursor: filteredCurrentPage >= Math.ceil(filteredPeople.length / pageSize) ? 'not-allowed' : 'pointer'
                }}
              >
                下一页
              </button>
            </div>
          )}
        </div>
      )}

      {/* 用户编辑/创建模态框 */}
      {showUserModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            border: `2px solid ${currentTheme.colors.border}`
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: 0, color: currentTheme.colors.primary }}>
                {editingUser ? '编辑用户' : '创建用户'}
              </h3>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setEditingUser(null);
                  setNewUser({ username: '', password: '', role: 'member', enabled: true });
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#999'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                用户名
              </label>
              <input
                type="text"
                value={newUser.username}
                onChange={(e) => {
                  const newUsername = e.target.value;
                  const updatedUser = { ...newUser, username: newUsername };
                  setNewUser(updatedUser);
                  // 实时验证所有字段
                  const errors = validateUserInput(updatedUser);
                  setValidationErrors(errors);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${validationErrors.username ? '#dc3545' : '#ddd'}`,
                  borderRadius: '4px'
                }}
              />
              {validationErrors.username && (
                <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                  {validationErrors.username}
                </div>
              )}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                密码
              </label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => {
                  const newPassword = e.target.value;
                  const updatedUser = { ...newUser, password: newPassword };
                  setNewUser(updatedUser);
                  // 实时验证所有字段
                  const errors = validateUserInput(updatedUser);
                  setValidationErrors(errors);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${validationErrors.password ? '#dc3545' : '#ddd'}`,
                  borderRadius: '4px'
                }}
              />
              {validationErrors.password && (
                <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
                  {validationErrors.password}
                </div>
              )}
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                密码长度至少6位，包含至少一个数字和一个字母
              </p>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                角色
              </label>
              <select
                value={newUser.role}
                onChange={(e) => {
                  const updatedUser = { ...newUser, role: e.target.value as 'admin' | 'member' };
                  setNewUser(updatedUser);
                  // 实时验证所有字段
                  const errors = validateUserInput(updatedUser);
                  setValidationErrors(errors);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                <option value="member">普通成员</option>
                <option value="admin">管理员</option>
              </select>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
                <input
                  type="checkbox"
                  checked={newUser.enabled}
                  onChange={(e) => {
                    const updatedUser = { ...newUser, enabled: e.target.checked };
                    setNewUser(updatedUser);
                    // 实时验证所有字段
                    const errors = validateUserInput(updatedUser);
                    setValidationErrors(errors);
                  }}
                />
                启用账户
              </label>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowUserModal(false);
                  setEditingUser(null);
                  setNewUser({ username: '', password: '', role: 'member', enabled: true });
                }}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  cursor: 'pointer'
                }}
              >
                取消
              </button>
              <button
                onClick={editingUser ? handleUserUpdate : handleUserCreate}
                disabled={isLoading || Object.keys(validationErrors).length > 0 || !newUser.username.trim() || !newUser.password}
                style={{
                  padding: '8px 16px',
                  border: `1px solid ${currentTheme.colors.primary}`,
                  borderRadius: '4px',
                  backgroundColor: isLoading || Object.keys(validationErrors).length > 0 || !newUser.username.trim() || !newUser.password ? '#ffcccc' : currentTheme.colors.primary,
                  color: '#ffffff',
                  cursor: isLoading || Object.keys(validationErrors).length > 0 || !newUser.username.trim() || !newUser.password ? 'not-allowed' : 'pointer',
                  opacity: isLoading || Object.keys(validationErrors).length > 0 || !newUser.username.trim() || !newUser.password ? 0.7 : 1,
                  transition: 'all 0.3s ease'
                }}
              >
                {isLoading ? '保存中...' : (editingUser ? '更新' : '创建')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 密码修改模态框 */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            border: `2px solid ${currentTheme.colors.border}`
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: 0, color: '#5a3d31' }}>修改密码</h3>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#999'
                }}
              >
                ×
              </button>
            </div>
            {passwordError && (
              <p style={{ color: '#ff6b81', fontSize: '12px', marginBottom: '16px' }}>{passwordError}</p>
            )}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                当前密码
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                新密码
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
              <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                密码长度至少6位，包含至少一个数字和一个字母
              </p>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                确认新密码
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError('');
                }}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  cursor: 'pointer'
                }}
              >
                取消
              </button>
              <button
                onClick={handlePasswordChange}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #4CAF50',
                  borderRadius: '4px',
                  backgroundColor: '#4CAF50',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                确认修改
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 权限编辑模态框 */}
      {showPermissionModal && editingPermissionsUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            padding: '20px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            border: `2px solid ${currentTheme.colors.border}`
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: 0, color: currentTheme.colors.primary }}>编辑用户权限 - {editingPermissionsUser.username}</h3>
              <button
                onClick={() => {
                  setShowPermissionModal(false);
                  setEditingPermissionsUser(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#999'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#5a3d31' }}>功能权限</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>文件上传</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={userPermissions.fileUpload}
                      onChange={(e) => setUserPermissions({ ...userPermissions, fileUpload: e.target.checked })}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>搜索功能</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={userPermissions.search}
                      onChange={(e) => setUserPermissions({ ...userPermissions, search: e.target.checked })}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>下载功能</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={userPermissions.download}
                      onChange={(e) => setUserPermissions({ ...userPermissions, download: e.target.checked })}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>后台管理</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={userPermissions.adminPanel}
                      onChange={(e) => setUserPermissions({ ...userPermissions, adminPanel: e.target.checked })}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>数据删除</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={userPermissions.dataDelete}
                      onChange={(e) => setUserPermissions({ ...userPermissions, dataDelete: e.target.checked })}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowPermissionModal(false);
                  setEditingPermissionsUser(null);
                }}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  cursor: 'pointer'
                }}
              >
                取消
              </button>
              <button
                onClick={handlePermissionSave}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #4CAF50',
                  borderRadius: '4px',
                  backgroundColor: '#4CAF50',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                保存权限
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default App;