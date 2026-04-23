// 工具函数

/**
 * 获取人员年龄
 * @param person 人员数据
 * @returns 年龄数字
 */
export const getPersonAge = (person: any): number => {
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

/**
 * 格式化日期
 * @param date 日期
 * @returns 格式化后的字符串
 */
export const formatDate = (date: Date | string | undefined): string => {
  if (!date) return '未知';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString('zh-CN');
};

/**
 * 截断文本
 * @param text 文本
 * @param maxLength 最大长度
 * @returns 截断后的文本
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * 防抖函数
 * @param fn 函数
 * @param delay 延迟时间
 * @returns 防抖后的函数
 */
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

/**
 * 生成唯一ID
 * @returns 唯一ID字符串
 */
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
