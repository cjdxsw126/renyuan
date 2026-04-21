/**
 * Electron 主进程
 * 人员筛选平台 - 桌面版
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// 保持窗口对象的全局引用，防止被垃圾回收
let mainWindow;
let backendProcess;

// 后端服务端口
const BACKEND_PORT = 3001;

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: '人员筛选平台 - 桌面版',
    icon: path.join(__dirname, '../public/favicon.ico')
  });

  // 加载前端页面
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    // 开发模式：加载 Vite 开发服务器
    mainWindow.loadURL('http://localhost:5175');
    // 打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式：加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 窗口关闭时清理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 启动后端服务
function startBackend() {
  const isDev = process.env.NODE_ENV === 'development';
  const serverPath = path.join(__dirname, '../server/app.js');
  
  console.log('🚀 启动后端服务...');
  
  // 设置环境变量
  const env = {
    ...process.env,
    NODE_ENV: isDev ? 'development' : 'production',
    PORT: BACKEND_PORT.toString(),
    ELECTRON_MODE: 'true'
  };

  // 启动 Node.js 后端
  backendProcess = spawn('node', [serverPath], {
    env,
    stdio: 'pipe'
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`[Backend] ${data.toString().trim()}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`[Backend Error] ${data.toString().trim()}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`[Backend] 进程退出，代码: ${code}`);
  });

  // 等待后端启动
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('✅ 后端服务已启动');
      resolve();
    }, 2000);
  });
}

// 停止后端服务
function stopBackend() {
  if (backendProcess) {
    console.log('🛑 停止后端服务...');
    backendProcess.kill();
    backendProcess = null;
  }
}

// Electron 应用就绪
app.whenReady().then(async () => {
  // 启动后端服务
  await startBackend();
  
  // 创建主窗口
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出前清理
app.on('before-quit', () => {
  stopBackend();
});

// IPC 通信处理
ipcMain.handle('get-backend-url', () => {
  return `http://localhost:${BACKEND_PORT}`;
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});
