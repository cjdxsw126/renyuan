# 部署说明

## 项目结构

```
renyuan/
├── dist/              # 前端构建产物
├── server/            # 后端API服务
│   ├── app.js         # 主入口
│   ├── db.js          # 数据库配置
│   ├── routes/        # API路由
│   └── .env.example   # 环境变量示例
├── src/               # 前端源码
└── .env.production    # 前端生产环境配置
```

## 前端部署 (GitHub Pages)

前端已配置为使用相对路径 `/api` 访问后端API。

```bash
# 构建前端
npm run build

# 部署到GitHub Pages
npm run deploy:github
```

## 后端部署

### 1. 服务器要求
- Node.js 18+
- SQLite (内置，无需额外安装)
- 可选: PostgreSQL

### 2. 安装依赖

```bash
cd server
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，设置以下变量：
```

**必需配置：**
```env
JWT_SECRET=your-strong-secret-key-here
PORT=3001
```

**可选配置：**
```env
# CORS允许的域名（多个用逗号分隔）
ALLOWED_ORIGINS=https://your-frontend-domain.com

# AI API密钥（用于AI搜索功能）
OPENAI_API_KEY=your-openai-api-key
DEEPSEEK_API_KEY=your-deepseek-api-key
```

### 4. 启动服务

**开发模式：**
```bash
npm run dev
```

**生产模式：**
```bash
npm start
```

## 部署平台推荐

### Render (推荐)
1. 创建Web Service
2. 选择GitHub仓库
3. 设置构建命令: `cd server && npm install`
4. 设置启动命令: `cd server && node app.js`
5. 添加环境变量

### Vercel
1. 导入GitHub仓库
2. 设置根目录为 `server`
3. 配置环境变量

## API端点

- `POST /api/auth/login` - 用户登录
- `GET /api/persons` - 获取人员列表
- `POST /api/persons` - 创建人员
- `PUT /api/persons/:id` - 更新人员
- `DELETE /api/persons/:id` - 删除人员
- `POST /api/ai/search` - AI智能搜索

## 注意事项

1. **数据库**: 默认使用SQLite，数据存储在 `server/data.sqlite`
2. **CORS**: 已配置允许GitHub Pages域名，如需其他域名请修改 `ALLOWED_ORIGINS`
3. **JWT密钥**: 生产环境务必使用强密码
4. **文件上传**: 支持Excel文件导入导出
