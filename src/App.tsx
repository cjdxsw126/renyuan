import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

interface Person {
  id: number;
  name: string;
  age: number;
  education: string;
  certificates: string[];
  employeeId: string;
  // 证书相关列存储
  certificateColumns: { [key: string]: string };
  originalData: any;
}

interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'member';
  enabled: boolean;
  createdAt: Date;
}

interface FilterState {
  name: string;
  ageMin: number;
  ageMax: number;
  education: string[];
  certificate: string;
  employeeId: string;
  tenureMin: number;
  tenureMax: number;
}

const App: React.FC = () => {
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
    certificate: '',
    employeeId: '',
    tenureMin: 0,
    tenureMax: 50
  });
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [certificateOptions, setCertificateOptions] = useState<string[]>([]);
  const [certificateError, setCertificateError] = useState<string>('');
  const [showCertDropdown, setShowCertDropdown] = useState<boolean>(false);
  const [filteredCertOptions, setFilteredCertOptions] = useState<string[]>([]);
  const [selectedCertIndex, setSelectedCertIndex] = useState<number>(-1);
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');
  const [showEducationDropdown, setShowEducationDropdown] = useState<boolean>(false);
  const [showAgeDropdown, setShowAgeDropdown] = useState<boolean>(false);
  const [showTenureDropdown, setShowTenureDropdown] = useState<boolean>(false);
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
  const [users, setUsers] = useState<User[]>([
    { id: '1', username: 'admin', password: 'password', role: 'admin', enabled: true, createdAt: new Date() }
  ]);
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<Omit<User, 'id' | 'createdAt'>>({ username: '', password: '', role: 'member', enabled: true });
  const [selectedPeople, setSelectedPeople] = useState<number[]>([]);
  
  // 定义需要隐藏的列
  const hiddenColumns = ['PMP取证时间', 'PMP取证年限（年）', 'PMP是否过期'];

  // 获取IP地址（模拟）
  const getIPAddress = () => {
    // 在实际应用中，这应该从服务器端获取
    // 这里使用模拟值
    return '192.168.1.1';
  };

  // 记录日志
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleString();
    const ipAddress = getIPAddress();
    const operator = username || 'admin'; // 使用当前登录用户名或默认管理员
    setLogs(prev => [...prev, `[${timestamp}] [${operator}] [${ipAddress}] ${message}`]);
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

  // 处理用户创建
  const handleUserCreate = () => {
    if (!newUser.username || !newUser.password) {
      displayAlert('用户名和密码不能为空', 'error');
      return;
    }

    // 检查用户名是否已存在
    if (users.some(user => user.username === newUser.username)) {
      displayAlert('用户名已存在', 'error');
      return;
    }

    const user: User = {
      ...newUser,
      id: Date.now().toString(),
      createdAt: new Date()
    };

    setUsers(prev => [...prev, user]);
    setNewUser({ username: '', password: '', role: 'member', enabled: true });
    setShowUserModal(false);
    addLog(`创建用户: ${user.username} (${user.role})`);
    displayAlert('用户创建成功', 'success');
  };

  // 处理用户编辑
  const handleUserEdit = (user: User) => {
    setEditingUser(user);
    setNewUser({ username: user.username, password: user.password, role: user.role, enabled: user.enabled });
    setShowUserModal(true);
  };

  // 处理用户更新
  const handleUserUpdate = () => {
    if (!editingUser) return;

    if (!newUser.username || !newUser.password) {
      displayAlert('用户名和密码不能为空', 'error');
      return;
    }

    // 检查用户名是否已存在（排除当前编辑的用户）
    if (users.some(user => user.username === newUser.username && user.id !== editingUser.id)) {
      displayAlert('用户名已存在', 'error');
      return;
    }

    const updatedUser: User = {
      ...editingUser,
      ...newUser
    };

    setUsers(prev => prev.map(user => user.id === editingUser.id ? updatedUser : user));
    setEditingUser(null);
    setNewUser({ username: '', password: '', role: 'member', enabled: true });
    setShowUserModal(false);
    addLog(`更新用户: ${updatedUser.username} (${updatedUser.role})`);
    displayAlert('用户更新成功', 'success');
  };

  // 处理用户禁用/启用
  const handleUserToggle = (userId: string, enabled: boolean) => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, enabled: !enabled } : user
    ));
    addLog(`${enabled ? '禁用' : '启用'}用户: ${users.find(u => u.id === userId)?.username}`);
  };

  // 处理用户删除
  const handleUserDelete = (userId: string, username: string) => {
    if (userId === '1') { // 保护管理员账户
      displayAlert('无法删除管理员账户', 'error');
      return;
    }

    if (window.confirm(`确定要删除用户 "${username}" 吗？`)) {
      setUsers(prev => prev.filter(user => user.id !== userId));
      addLog(`删除用户: ${username}`);
      displayAlert('用户删除成功', 'success');
    }
  };

  // 处理单条数据删除
  const handlePersonDelete = (personId: number, personName: string) => {
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
  const handlePersonSelect = (personId: number) => {
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

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isExcel) {
            displayAlert('请上传Excel格式的文件', 'error');
            addLog(`上传文件失败: 不支持的文件格式 - ${file.name}`);
            return;
          }

    if (isExcel) {
      addLog(`开始上传文件: ${file.name}`);
      console.log('开始上传文件:', file.name);
      
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
      reader.onload = (e) => {
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
          
          console.log('解析后的数据:', jsonData);
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
          console.log('Excel表头:', headers);
          console.log('第一列表头:', headers[0]);
          
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
          
          console.log('是否包含姓名字段:', hasNameField);
          console.log('姓名字段索引:', nameFieldIndex);
          console.log('表头详情:', headers.map(h => ({ original: h, clean: h.trim().toLowerCase() })));
          
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
            console.log('第一行数据:', firstRow);
            
            // 检查第一行数据的第一列是否有值
            const firstColumnValue = firstRow[headers[0]];
            console.log('第一行第一列值:', firstColumnValue);
            
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
            
            console.log('第一行数据是否包含有效姓名:', hasValidName);
            if (!hasValidName) {
              clearInterval(progressInterval);
              setUploading(false);
              setUploadProgress(0);
              displayAlert('Excel文件第一行数据缺少有效的姓名', 'error');
              addLog(`上传文件失败: 第一行数据无有效姓名 - ${file.name}`);
              return;
            }
          }

          // 定义证书相关列的范围
          const certificateColumnNames = [
            '红帽认证', 'ORACLE', 'Cisco思科', 'ITIL', '天宫认证', '产品体验师', 
            '微软工程师', '系统分析师', '信息系统项目管理师', '系统集成项目经理', 
            '系统集成项目管理工程师', '财会类', '人力资源类', '教育类', '语言类', 
            '计算机等级', '其他资质', 'PMP'
          ];
          
          // 定义需要排除的证书类型（学历证书）
          const excludedCertificateKeywords = ['毕业', '学位', '学历'];
          
          // 定义图片相关字段
          const imageFieldKeywords = ['图片', '照片', 'image', 'photo', 'pic'];
          
          // 定义常见个人信息字段
          const personalInfoKeywords = [
            '是否彩讯社保', '性别', '工作地点', '职级', '职位类别', '业务单元', '部门', '职位', 
            '毕业时间', '毕业院校', '专业', '毕业证书号', '学位证书号', '入司时间', '当前合同开始日', 
            '当前合同结束日', '入司年限', '彩讯连续社保', '教育形式', '985/211类院校', '身份证号', 
            '身份证有效期起', '身份证有效期止', '出生日期', '邮箱', '联系方式', '专业类别', '毕业年限', 
            '是否互联网公司项目可用人员', 'PMI'
          ];
          
          // 存储未识别的字段
          const unrecognizedFields: string[] = [];
          
          // 转换数据格式
          const importedPeople: Person[] = jsonData.map((item: any, index: number) => {
            // 尝试多种可能的字段名
            let name = '';
            let age = 0;
            let education = '';
            let certificates: string[] = [];
            let employeeId = '';
            // 存储证书相关列的数据
            const certificateColumns: { [key: string]: string } = {};
            
            // 获取所有字段名
            const allKeys = Object.keys(item);
            
            // 遍历所有字段，寻找匹配的字段名
            for (const [key, value] of Object.entries(item)) {
              const keyClean = key.trim().toLowerCase();
              const keyWithoutSpaces = key.replace(/\s/g, '');
              
              let fieldRecognized = false;
              
              if (!name && (keyClean === '姓名' || keyClean === 'name' || keyClean.includes('姓名') || keyClean.includes('name'))) {
                name = String(value) || '';
                fieldRecognized = true;
              } else if (keyClean === '年龄' || keyClean === 'age' || keyClean.includes('年龄') || keyClean.includes('age')) {
                age = parseInt(String(value) || '0');
                fieldRecognized = true;
              } else if (keyClean === '学历' || keyClean === 'education' || keyClean.includes('学历') || keyClean.includes('education')) {
                education = String(value) || '';
                fieldRecognized = true;
              } else if (keyClean === '工号' || keyClean === 'employeeid' || keyClean.includes('工号') || keyClean.includes('employee')) {
                employeeId = String(value) || '';
                fieldRecognized = true;
              }
              
              // 检查是否是需要隐藏的列
              const isHiddenColumn = hiddenColumns.some(hiddenColumn => 
                hiddenColumn === key || 
                key.replace(/\s/g, '').toLowerCase().includes(hiddenColumn.replace(/\s/g, '').toLowerCase())
              );
              
              // 检查是否是证书相关列
              const isCertificateColumn = certificateColumnNames.some(type => {
                const typeClean = type.replace(/\s/g, '').toLowerCase();
                const keyClean = keyWithoutSpaces.toLowerCase();
                return typeClean.includes(keyClean) || keyClean.includes(typeClean);
              });
              
              // 检查是否是需要排除的学历证书列
              const isExcludedCertificate = excludedCertificateKeywords.some(keyword => 
                keyClean.includes(keyword) || keyWithoutSpaces.toLowerCase().includes(keyword)
              );
              
              // 检查是否是第一列（证书类别）
              const isFirstColumn = key === allKeys[0];
              
              // 处理证书相关列，排除学历证书、第一列（证书类别）和隐藏列
              if (isCertificateColumn && !isExcludedCertificate && !isFirstColumn && !isHiddenColumn) {
                const certValue = String(value || '').trim();
                // 存储证书相关列的数据
                certificateColumns[key] = certValue;
                // 如果该列有值，添加到证书数组
                if (certValue) {
                  // 存储证书的实际值，而不是列标题
                  // 如果证书值不是简单的"是"、"否"等，直接使用证书值
                  // 否则使用列标题作为证书名称
                  const certificateName = (certValue === '是' || certValue === '否' || certValue === '有' || certValue === '无') ? key : certValue;
                  certificates.push(certificateName);
                }
                fieldRecognized = true;
              }
              
              // 处理需要隐藏的列
              if (isHiddenColumn) {
                fieldRecognized = true;
              }
              
              // 处理第一列（证书类别），标记为已识别
              if (isFirstColumn) {
                fieldRecognized = true;
              }
              
              // 处理图片相关字段，标记为已识别
              const isImageField = imageFieldKeywords.some(keyword => 
                keyClean.includes(keyword) || keyWithoutSpaces.toLowerCase().includes(keyword)
              );
              if (isImageField) {
                fieldRecognized = true;
              }
              
              // 处理常见个人信息字段，标记为已识别
              const isPersonalInfoField = personalInfoKeywords.some(keyword => 
                keyClean.includes(keyword.replace(/\s/g, '').toLowerCase()) || 
                keyWithoutSpaces.toLowerCase().includes(keyword.replace(/\s/g, '').toLowerCase())
              );
              if (isPersonalInfoField) {
                fieldRecognized = true;
              }
              
              // 如果字段未被识别，添加到未识别字段列表
              if (!fieldRecognized) {
                unrecognizedFields.push(key);
              }
            }
            
            // 清理证书列表，去除无效值
            certificates = certificates.filter(cert => {
              return cert && 
                     cert.trim() && 
                     !excludedCertificateKeywords.some(keyword => cert.includes(keyword));
            });
            
            // 处理PMP证书的显示：只显示PMP证书信息，排除其他相关字段
            const pmpCertKey = Object.keys(certificateColumns).find(key => 
              key.includes('PMP证书') || key.includes('PMP')
            );
            
            if (pmpCertKey) {
              const pmpCertValue = certificateColumns[pmpCertKey];
              if (pmpCertValue && pmpCertValue.trim()) {
                // 只保留PMP证书信息，移除其他PMP相关字段
                certificates = certificates.filter(cert => {
                  return !cert.includes('PMP') || cert === pmpCertKey || cert === pmpCertValue;
                });
                
                // 确保PMP证书在证书列表中
                const certificateName = (pmpCertValue === '是' || pmpCertValue === '否' || pmpCertValue === '有' || pmpCertValue === '无') ? pmpCertKey : pmpCertValue;
                if (!certificates.includes(certificateName)) {
                  certificates.push(certificateName);
                }
              } else {
                // 移除所有PMP相关证书
                certificates = certificates.filter(cert => {
                  return !cert.includes('PMP');
                });
              }
            } else {
              // 移除所有PMP相关证书
              certificates = certificates.filter(cert => {
                return !cert.includes('PMP');
              });
            }
            
            // 如果通过字段名没有找到姓名，尝试使用姓名字段索引
            if (!name && headers[nameFieldIndex]) {
              const nameField = headers[nameFieldIndex];
              name = item[nameField] || '';
              console.log(`使用索引 ${nameFieldIndex} 作为姓名字段: ${nameField}, 值: ${name}`);
            }
            
            // 创建包含所有原始列的对象
            const person: Person = {
              id: index + 1,
              name,
              age,
              education,
              certificates,
              employeeId,
              // 存储证书相关列的数据
              certificateColumns,
              // 存储原始数据用于检索
              originalData: item
            };
            
            return person;
          }).filter(person => {
            // 只保留有姓名且姓名不是表头或无效值的人员数据
            return person.name && 
                   person.name.trim() && 
                   !person.name.includes('姓名') && 
                   !person.name.includes('name') &&
                   !person.name.includes('(周岁)');
          });

          console.log('转换后的数据:', importedPeople);
          
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
          validPeople.forEach(person => {
            person.certificates.forEach(cert => {
              // 排除需要隐藏的列
              const isHidden = hiddenColumns.some(hiddenColumn => 
                cert.includes(hiddenColumn) || 
                cert.replace(/\s/g, '').toLowerCase().includes(hiddenColumn.replace(/\s/g, '').toLowerCase())
              );
              if (!isHidden) {
                allCertificates.add(cert);
              }
            });
          });
          
          // 延迟一下，让用户看到100%的进度
          setTimeout(() => {
            // 存储到后台状态，不直接展示
            setPeople(validPeople);
            // 更新证书选项列表
            setCertificateOptions([...allCertificates]);
            // 重置筛选结果
            setFilteredPeople([]);
            // 重置证书错误信息
            setCertificateError('');
            
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
            
            addLog(`文件上传成功: ${file.name}，导入 ${validPeople.length} 条记录`);
            console.log('数据存储成功，记录数:', validPeople.length);
            console.log('提取的证书选项:', [...allCertificates]);
            // 显示导入成功提示
            displayAlert(feedbackMessage, 'success');
            // 重置上传状态
            setUploading(false);
            setUploadProgress(0);
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

  // 初始状态
  useEffect(() => {
    // 初始为空，等待用户上传数据
    console.log('初始化状态');
  }, []);

  // 处理登录
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'password') {
      setIsLoggedIn(true);
      setError('');
      addLog(`用户登录成功: ${username}`);
    } else {
      setError('用户名或密码错误');
      addLog(`用户登录失败: ${username}`);
    }
  };

  // 处理登出
  const handleLogout = () => {
    addLog('用户登出');
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    setShowAdminPanel(false);
  };

  // 处理学历复选框变更
  const handleEducationChange = (education: string) => {
    setFilters(prev => {
      if (prev.education.includes(education)) {
        // 如果已选中，则移除
        return {
          ...prev,
          education: prev.education.filter(e => e !== education)
        };
      } else {
        // 如果未选中，则添加
        return {
          ...prev,
          education: [...prev.education, education]
        };
      }
    });
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
        certificateOptions.forEach(option => allPossibleCertificates.add(option));
        
        // 添加所有人员的证书实际值
        people.forEach(person => {
          Object.entries(person.certificateColumns || {}).forEach(([_, certValue]) => {
            const valueStr = String(certValue || '').trim();
            if (valueStr && valueStr !== '是' && valueStr !== '否' && valueStr !== '有' && valueStr !== '无') {
              allPossibleCertificates.add(valueStr);
            }
          });
        });
        
        // 过滤匹配的证书
        const filtered = Array.from(allPossibleCertificates).filter(cert => 
          cert.replace(/\s/g, '').toLowerCase().includes(searchTerm)
        );
        
        setFilteredCertOptions(filtered);
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
    
    setFilters(prev => ({
      ...prev,
      [name]: name.includes('age') ? parseInt(value) : value
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
          setFilters(prev => ({ ...prev, certificate: selectedCert }));
          setCertificateError('');
          setShowCertDropdown(false);
        }
        break;
      case 'Escape':
        setShowCertDropdown(false);
        break;
    }
  };

  // 选择证书选项
  const handleCertSelect = (cert: string) => {
    setFilters(prev => ({ ...prev, certificate: cert }));
    setCertificateError('');
    setShowCertDropdown(false);
  };

  // 手动执行筛选
  const handleSearch = () => {
    console.log('执行查询前的存储数据:', people);
    console.log('存储数据长度:', people.length);
    console.log('查询条件:', filters);
    console.log('证书选项:', certificateOptions);
    
    if (people.length === 0) {
      displayAlert('没有可用的数据，请先导入文件', 'error');
      addLog('查询失败: 无数据');
      return;
    }
    
    // 检查证书输入是否有效
    if (filters.certificate && certificateError) {
      displayAlert('证书输入无效，请输入与系统中匹配的证书名称', 'error');
      addLog('查询失败: 证书输入无效');
      return;
    }
    
    addLog(`执行查询: 姓名=${filters.name}, 年龄=${filters.ageMin}-${filters.ageMax}, 学历=${filters.education}, 证书=${filters.certificate}`);
    
    let filtered = [];
    
    // 构建更精准的搜索逻辑
    filtered = people.filter(person => {
      // 姓名匹配：精确匹配姓名字段
      const nameMatch = filters.name ? 
        person.name.replace(/\s/g, '').toLowerCase().includes(filters.name.replace(/\s/g, '').toLowerCase()) : true;
      
      // 年龄匹配：在age字段中搜索
      const ageMatch = person.age >= filters.ageMin && person.age <= filters.ageMax;
      
      // 学历匹配：支持多个学历的匹配
      const educationMatch = filters.education.length > 0 ? 
        filters.education.includes(person.education) : true;
      
      // 入司年限匹配
      const tenureMatch = (() => {
        // 尝试从原始数据中获取入司年限
        const tenureValue = person.originalData?.['入司年限（年）'] || 
                           person.originalData?.['入司年限'] || 
                           person.originalData?.['tenure'] || 
                           person.originalData?.['years'] || 0;
        const tenure = parseFloat(tenureValue) || 0;
        return tenure >= filters.tenureMin && tenure <= filters.tenureMax;
      })();
      
      // 证书匹配：包含型检索模式
      const certificateMatch = filters.certificate ? (
        // 检查证书数组是否包含匹配的证书
        person.certificates.some(cert => {
          // 跳过需要隐藏的列
          if (hiddenColumns.some(hiddenColumn => 
            cert.includes(hiddenColumn) || 
            cert.replace(/\s/g, '').toLowerCase().includes(hiddenColumn.replace(/\s/g, '').toLowerCase())
          )) {
            return false;
          }
          // 包含型匹配证书名称
          return cert.replace(/\s/g, '').toLowerCase().includes(filters.certificate.replace(/\s/g, '').toLowerCase());
        }) ||
        // 同时检查证书相关列的实际值
        Object.entries(person.certificateColumns || {}).some(([key, value]) => {
          // 跳过需要隐藏的列
          if (hiddenColumns.some(hiddenColumn => 
            key.includes(hiddenColumn) || 
            key.replace(/\s/g, '').toLowerCase().includes(hiddenColumn.replace(/\s/g, '').toLowerCase())
          )) {
            return false;
          }
          // 包含型匹配证书列的实际值
          const certValue = String(value || '').trim();
          return certValue.replace(/\s/g, '').toLowerCase().includes(filters.certificate.replace(/\s/g, '').toLowerCase());
        })
      ) : true;
      
      return nameMatch && ageMatch && educationMatch && certificateMatch && tenureMatch;
    });
    
    console.log('查询结果:', filtered);
    console.log('查询结果长度:', filtered.length);
    
    setFilteredPeople(filtered);
    addLog(`查询完成: 找到 ${filtered.length} 条匹配记录`);
    console.log('查询完成，找到记录数:', filtered.length);
    
    if (filtered.length === 0) {
      displayAlert('没有找到匹配的记录，请调整筛选条件', 'info');
    }
  };

  // 导出查询结果
  const handleDownload = (data: Person[]) => {
    if (data.length === 0) return;
    
    // 收集所有可能的字段
    const allFields = new Set<string>();
    allFields.add('工号');
    allFields.add('姓名');
    allFields.add('年龄');
    allFields.add('学历');
    allFields.add('证书');
    
    // 收集所有人员的原始数据字段
    data.forEach(person => {
      Object.keys(person.originalData || {}).forEach(key => {
        allFields.add(key);
      });
    });
    
    // 生成CSV内容
    const headers = Array.from(allFields);
    const csvContent = [
      headers.join(','),
      ...data.map(person => {
        // 收集所有证书名称，以顿号作为分隔符，排除需要隐藏的列
        const visibleCertificates = person.certificates.filter(cert => {
          // 检查是否是需要隐藏的列
          return !hiddenColumns.some(hiddenColumn => 
            cert.includes(hiddenColumn) || 
            cert.replace(/\s/g, '').toLowerCase().includes(hiddenColumn.replace(/\s/g, '').toLowerCase())
          );
        });
        const allCertificates = visibleCertificates.join('、');
        
        // 构建行数据
        const row = headers.map(header => {
          switch (header) {
            case '工号':
              return person.employeeId;
            case '姓名':
              return person.name;
            case '年龄':
              return person.age;
            case '学历':
              return person.education;
            case '证书':
              return allCertificates || '无';
            default:
              return person.originalData?.[header] || '';
          }
        });
        
        return row.join(',');
      })
    ].join('\n');
    
    // 创建带有BOM的Blob对象，解决中文乱码问题
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // 创建下载链接
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `人员信息_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addLog(`导出查询结果: ${data.length} 条记录`);
  };

  if (!isLoggedIn) {
    return (
      <div className="container">
        <form className="login-form" onSubmit={handleLogin}>
          <h2>登录</h2>
          {error && <p className="error-message">{error}</p>}
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input
              type="text"
              id="username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit">登录</button>
        </form>
      </div>
    );
  }

  return (
    <div className="container">
      {/* 自定义弹框 */}
      {showAlert && (
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
            border: `2px solid ${alertType === 'success' ? '#4CAF50' : alertType === 'error' ? '#ff6b81' : '#ffb3ba'}`
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
      <div className="header">
        <h1>人员筛选平台</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {modules.fileUpload && (userRole === 'admin' || userRole === 'member') && (
            <>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                id="excel-upload"
              />
              <button type="button" onClick={() => document.getElementById('excel-upload')?.click()} disabled={uploading}>
                {uploading ? '上传中...' : '导入文件'}
              </button>
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
            <button type="button" onClick={() => setShowAdminPanel(!showAdminPanel)}>
              {showAdminPanel ? '返回筛选' : '后台管理'}
            </button>
          )}
          <button onClick={handleLogout}>登出</button>
        </div>
      </div>

      {!showAdminPanel && (
        <div className="filter-container">
          <div className="form-group">
            <label htmlFor="name">姓名</label>
            <input
              type="text"
              id="name"
              name="name"
              value={filters.name}
              onChange={handleFilterChange}
              placeholder="输入姓名"
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
                  e.currentTarget.style.borderColor = '#ffb3ba';
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
                  border: '1px solid #ffb3ba',
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
                      border: '1px solid #ffb3ba',
                      borderRadius: '4px',
                      backgroundColor: '#ffb3ba',
                      color: '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontSize: '12px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#ff6b81';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffb3ba';
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
                  e.currentTarget.style.borderColor = '#ffb3ba';
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
                  border: '1px solid #ffb3ba',
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
                      border: '1px solid #ffb3ba',
                      borderRadius: '4px',
                      backgroundColor: '#ffb3ba',
                      color: '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontSize: '12px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#ff6b81';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffb3ba';
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
                  border: '1px solid #ffb3ba',
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
                </div>
              )}
            </div>
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label htmlFor="certificate">证书</label>
            <input
              type="text"
              id="certificate"
              name="certificate"
              value={filters.certificate}
              onChange={handleFilterChange}
              onKeyDown={handleCertKeyDown}
              placeholder="输入证书名称"
              style={{ borderColor: certificateError ? '#ff6b81' : '#ddd' }}
            />
            {certificateError && (
              <p style={{ color: '#ff6b81', fontSize: '12px', marginTop: '5px' }}>{certificateError}</p>
            )}
            {showCertDropdown && filteredCertOptions.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: '#ffffff',
                border: '1px solid #ffb3ba',
                borderRadius: '4px',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 1000,
                marginTop: '5px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                {filteredCertOptions.map((cert, index) => {
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
            )}
          </div>
          {modules.search && (userRole === 'admin' || userRole === 'member') && (
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button type="button" onClick={handleSearch} style={{ width: '100%' }}>
                查询
              </button>
              {modules.download && (userRole === 'admin' || userRole === 'member') && (
                <button 
                  type="button" 
                  onClick={() => handleDownload(filteredPeople)} 
                  disabled={filteredPeople.length === 0}
                  style={{ width: '100%', backgroundColor: '#4CAF50' }}
                >
                  下载
                </button>
              )}
            </div>
          )}
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
                  border: '1px solid #ffb3ba',
                  borderRadius: '4px',
                  backgroundColor: '#ffb3ba',
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
              border: '1px solid #ffb3ba'
            }}>
              {users.map((user) => (
                <div key={user.id} style={{ 
                  marginBottom: '12px', 
                  padding: '12px', 
                  backgroundColor: '#ffffff',
                  borderRadius: '4px',
                  border: '1px solid #ffb3ba',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <p><strong>用户名:</strong> {user.username}</p>
                    <p><strong>角色:</strong> {user.role === 'admin' ? '管理员' : '普通成员'}</p>
                    <p><strong>状态:</strong> {user.enabled ? '启用' : '禁用'}</p>
                    <p><strong>创建时间:</strong> {user.createdAt.toLocaleString()}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
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
                        border: '1px solid #ff6b81',
                        borderRadius: '4px',
                        backgroundColor: '#ff6b81',
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
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span>当前角色: </span>
              <button
                type="button"
                onClick={() => handleRoleChange('admin')}
                style={{
                  padding: '6px 12px',
                  border: userRole === 'admin' ? '1px solid #ffb3ba' : '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: userRole === 'admin' ? '#ffb3ba' : '#ffffff',
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
                  border: userRole === 'member' ? '1px solid #ffb3ba' : '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: userRole === 'member' ? '#ffb3ba' : '#ffffff',
                  color: userRole === 'member' ? '#ffffff' : '#000000',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                普通成员
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
                border: '1px solid #ffb3ba'
              }}>
                {files.map((file) => (
                  <div key={file.id} style={{ 
                    marginBottom: '8px', 
                    paddingBottom: '8px', 
                    borderBottom: '1px solid #ffb3ba',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <p><strong>文件名:</strong> {file.name}</p>
                      <p><strong>大小:</strong> {(file.size / 1024).toFixed(2)} KB</p>
                      <p><strong>上传时间:</strong> {file.uploadedAt.toLocaleString()}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFileDelete(file.id, file.name)}
                      disabled={userRole !== 'admin'}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #ff6b81',
                        borderRadius: '4px',
                        backgroundColor: '#ff6b81',
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
                    border: '1px solid #ff6b81',
                    borderRadius: '4px',
                    backgroundColor: '#ff6b81',
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
                    border: '1px solid #ff6b81',
                    borderRadius: '4px',
                    backgroundColor: '#ff6b81',
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
                    border: '1px solid #ffb3ba'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#ffb3ba' }}>
                          <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #ffb3ba', width: '50px' }}>
                            <input
                              type="checkbox"
                              checked={people.length > 0 && selectedPeople.length === people.length}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                            />
                          </th>
                          <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ffb3ba' }}>工号</th>
                          <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ffb3ba' }}>姓名</th>
                          <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ffb3ba' }}>年龄</th>
                          <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ffb3ba' }}>学历</th>
                          <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ffb3ba' }}>证书</th>
                          <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #ffb3ba', width: '80px' }}>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {people.map((person) => {
                          // 收集所有证书名称，以顿号作为分隔符，排除需要隐藏的列
                          const visibleCertificates = person.certificates.filter(cert => {
                            // 检查是否是需要隐藏的列
                            return !hiddenColumns.some(hiddenColumn => 
                              cert.includes(hiddenColumn) || 
                              cert.replace(/\s/g, '').toLowerCase().includes(hiddenColumn.replace(/\s/g, '').toLowerCase())
                            );
                          });
                          const allCertificates = visibleCertificates.join('、');
                          
                          return (
                            <tr key={person.id} style={{ backgroundColor: '#ffffff' }}>
                              <td style={{ padding: '8px', border: '1px solid #ffb3ba', textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={selectedPeople.includes(person.id)}
                                  onChange={() => handlePersonSelect(person.id)}
                                />
                              </td>
                              <td style={{ padding: '8px', border: '1px solid #ffb3ba' }}>{person.employeeId}</td>
                              <td style={{ padding: '8px', border: '1px solid #ffb3ba' }}>{person.name}</td>
                              <td style={{ padding: '8px', border: '1px solid #ffb3ba' }}>{person.age}</td>
                              <td style={{ padding: '8px', border: '1px solid #ffb3ba' }}>{person.education}</td>
                              <td style={{ padding: '8px', border: '1px solid #ffb3ba' }}>
                                {allCertificates || '无'}
                              </td>
                              <td style={{ padding: '8px', border: '1px solid #ffb3ba', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handlePersonDelete(person.id, person.name)}
                                  style={{
                                    padding: '2px 6px',
                                    border: '1px solid #ff6b81',
                                    borderRadius: '4px',
                                    backgroundColor: '#ff6b81',
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
                        })}
                      </tbody>
                    </table>
                  </div>
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
              border: '1px solid #ffb3ba'
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
                  <tr style={{ backgroundColor: '#ffb3ba' }}>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ffb3ba' }}>工号</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ffb3ba' }}>姓名</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ffb3ba' }}>年龄</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ffb3ba' }}>学历</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ffb3ba' }}>证书</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPeople.map((person) => {
                    // 收集所有证书名称，以顿号作为分隔符，排除需要隐藏的列
                    const visibleCertificates = person.certificates.filter(cert => {
                      // 检查是否是需要隐藏的列
                      return !hiddenColumns.some(hiddenColumn => 
                        cert.includes(hiddenColumn) || 
                        cert.replace(/\s/g, '').toLowerCase().includes(hiddenColumn.replace(/\s/g, '').toLowerCase())
                      );
                    });
                    const allCertificates = visibleCertificates.join('、');
                    
                    return (
                      <tr key={person.id} style={{ backgroundColor: '#ffffff' }}>
                        <td style={{ padding: '12px', border: '1px solid #ffb3ba' }}>{person.employeeId}</td>
                        <td style={{ padding: '12px', border: '1px solid #ffb3ba' }}>{person.name}</td>
                        <td style={{ padding: '12px', border: '1px solid #ffb3ba' }}>{person.age}</td>
                        <td style={{ padding: '12px', border: '1px solid #ffb3ba' }}>{person.education}</td>
                        <td style={{ padding: '12px', border: '1px solid #ffb3ba' }}>
                          {allCertificates || '无'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ textAlign: 'center', padding: '20px' }}>没有找到匹配的人员</p>
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
            border: '2px solid #ffb3ba'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: 0, color: '#ff6b81' }}>
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
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
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
                密码
              </label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
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
                角色
              </label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'member' })}
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
                  onChange={(e) => setNewUser({ ...newUser, enabled: e.target.checked })}
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
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ffb3ba',
                  borderRadius: '4px',
                  backgroundColor: '#ffb3ba',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                {editingUser ? '更新' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;