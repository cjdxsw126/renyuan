/**
 * Electron 预加载脚本
 * 用于安全地暴露主进程 API 到渲染进程
 */

const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给前端
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取后端服务地址
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
  
  // 获取应用版本
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // 判断是否在 Electron 环境中
  isElectron: true
});
