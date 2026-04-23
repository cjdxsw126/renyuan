// 证书相关常量配置

// 排除的证书关键词
export const EXCLUDED_CERT_KEYWORDS = [
  '教育形式',
  '普通高等教育',
  '成人教育',
  '自学考试',
  '非全日制',
  '全日制',
  '函授',
  '网络教育'
];

// 证书映射表
export const COMPREHENSIVE_CERT_MAPPINGS: { [key: string]: string } = {
  // 软考体系
  '软考': '软考体系',
  '软考体系': '软考体系',
  '系统分析师': '软考体系',
  '信息系统项目管理师': '软考体系',
  '系统集成': '软考体系',
  '系统集成项目经理': '软考体系',
  '系统集成项目管理工程师': '软考体系',
  '系统架构师': '软考体系',
  '系统架构设计师': '软考体系',
  '网络规划设计师': '软考体系',
  '网络工程师': '软考体系',
  '高级工程师': '其他 IT 认证',

  // 工信部认证
  '工信部': '工信部其他认证',
  '工信部其他认证': '工信部其他认证',
  '通信': '工信部其他认证',
  '网络安全': '工信部其他认证',

  // 阿里云、腾讯云
  '阿里云': '阿里云、腾讯云',
  '阿里云、腾讯云': '阿里云、腾讯云',
  '腾讯云': '阿里云、腾讯云',
  '云认证': '阿里云、腾讯云',
  '云架构师': '阿里云、腾讯云',
  '云计算': '阿里云、腾讯云',

  // 华为、华三、CISP、ITSS
  '华为': '华为、华三、CISP、ITSS',
  '华三': '华为、华三、CISP、ITSS',
  'h3c': '华为、华三、CISP、ITSS',
  'H3C': '华为、华三、CISP、ITSS',
  'CISP': '华为、华三、CISP、ITSS',
  'cisp': '华为、华三、CISP、ITSS',
  'ITSS': '华为、华三、CISP、ITSS',

  // 思科、甲骨文、微软、EXIN、Linux
  'ccna': '思科、甲骨文、微软、EXIN、Linux',
  'ccnp': '思科、甲骨文、微软、EXIN、Linux',
  'ccie': '思科、甲骨文、微软、EXIN、Linux',
  'CCNA': '思科、甲骨文、微软、EXIN、Linux',
  'CCNP': '思科、甲骨文、微软、EXIN、Linux',
  'CCIE': '思科、甲骨文、微软、EXIN、Linux',
  '思科': '思科、甲骨文、微软、EXIN、Linux',
  'cisco': '思科、甲骨文、微软、EXIN、Linux',
  'Cisco': '思科、甲骨文、微软、EXIN、Linux',
  'Cisco思科': '思科、甲骨文、微软、EXIN、Linux',
  '甲骨文': '思科、甲骨文、微软、EXIN、Linux',
  'oracle': '思科、甲骨文、微软、EXIN、Linux',
  'Oracle': '思科、甲骨文、微软、EXIN、Linux',
  'ORACLE': '思科、甲骨文、微软、EXIN、Linux',
  '微软': '思科、甲骨文、微软、EXIN、Linux',
  '微软工程师': '思科、甲骨文、微软、EXIN、Linux',
  'EXIN': '思科、甲骨文、微软、EXIN、Linux',
  'exin': '思科、甲骨文、微软、EXIN、Linux',
  'Linux': '思科、甲骨文、微软、EXIN、Linux',
  'linux': '思科、甲骨文、微软、EXIN、Linux',

  // ITIL、CKA/CKS、Vmware、Redhead
  'ITIL': 'ITIL、CKA/CKS、Vmware、Redhead',
  'CKA': 'ITIL、CKA/CKS、Vmware、Redhead',
  'CKS': 'ITIL、CKA/CKS、Vmware、Redhead',
  'Vmware': 'ITIL、CKA/CKS、Vmware、Redhead',
  'Redhead': 'ITIL、CKA/CKS、Vmware、Redhead',
  'redhat': 'ITIL、CKA/CKS、Vmware、Redhead',
  '红帽': 'ITIL、CKA/CKS、Vmware、Redhead',
  '红帽认证': 'ITIL、CKA/CKS、Vmware、Redhead',
  'RHCE': 'ITIL、CKA/CKS、Vmware、Redhead',
  'RHCA': 'ITIL、CKA/CKS、Vmware、Redhead',

  // PMP
  'pmi': 'PMP',
  'PMI': 'PMP',
  'PMP': 'PMP',
  'pmp': 'PMP',

  // 全媒体运营师等
  '全媒体运营师': '全媒体运营师、NDPD等运营及产品相关计算机等级',
  'NDPD': '全媒体运营师、NDPD等运营及产品相关计算机等级',
  'ndpd': '全媒体运营师、NDPD等运营及产品相关计算机等级',
  '天宫认证': '全媒体运营师、NDPD等运营及产品相关计算机等级',
  '产品体验师': '全媒体运营师、NDPD等运营及产品相关计算机等级',
  '产品体验': '全媒体运营师、NDPD等运营及产品相关计算机等级',
  '计算机等级': '全媒体运营师、NDPD等运营及产品相关计算机等级',

  // 其他认证
  '其他IT认证': '其他 IT 认证',
  '其他 it 认证': '其他 IT 认证',
  '其他 IT 认证': '其他 IT 认证',
  '其他认证': '其他认证',
  '其他资质': '其他认证',
  '财会类': '其他认证',
  '人力资源类': '其他认证',
  '教育类': '其他认证',
  '语言类': '其他认证'
};

// 隐藏的列
export const HIDDEN_COLUMNS = [
  'PMP取证时间',
  'PMP取证年限（年）',
  'PMP是否过期'
];

// 基础证书分类
export const BASE_CERT_CATEGORIES = [
  '软考体系',
  '工信部其他认证',
  '阿里云、腾讯云',
  '华为、华三、CISP、ITSS',
  'ITIL、CKA/CKS、Vmware、Redhead',
  '思科、甲骨文、微软、EXIN、Linux',
  '全媒体运营师、NDPD等运营及产品相关计算机等级',
  '计算机等级',
  '其他 IT 认证',
  '其他认证',
  'PMP'
];

// 预设头像列表
export const PRESET_AVATARS = [
  '😀', '😎', '🤠', '👻', '👽', '🤖', '🎃', '🐱', '🐶', '🐼',
  '🐨', '🐯', '🦁', '🦊', '🐰', '🐹', '🐭', '🐻', '🐷', '🐸'
];
