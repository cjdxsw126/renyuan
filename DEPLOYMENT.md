# 人员筛选平台部署文档

## 1. 环境要求

### 开发环境
- Node.js 18.0.0 或更高版本
- npm 9.0.0 或更高版本
- Git

### 部署环境
- GitHub 账号
- GitHub Pages 功能

## 2. 部署步骤

### 步骤 1: 克隆项目

```bash
git clone <项目仓库地址>
cd <项目目录>
```

### 步骤 2: 安装依赖

```bash
npm install
```

### 步骤 3: 构建项目

```bash
npm run build
```

构建完成后，会在 `dist` 目录生成静态文件。

### 步骤 4: 部署到 GitHub Pages

#### 方法 A: 使用 gh-pages 分支

1. 创建并切换到 gh-pages 分支
   ```bash
   git checkout -b gh-pages
   ```

2. 添加构建文件
   ```bash
   git add dist
   git commit -m "Add deployment files"
   ```

3. 推送分支到 GitHub
   ```bash
   git push origin gh-pages
   ```

4. 配置 GitHub Pages
   - 登录 GitHub，进入项目仓库
   - 点击 "Settings" > "Pages"
   - 在 "Source" 下拉菜单中选择 "gh-pages" 分支
   - 点击 "Save"

#### 方法 B: 使用 GitHub Actions (推荐)

1. 在项目根目录创建 `.github/workflows/deploy.yml` 文件

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: npm install
      - name: Build project
        run: npm run build
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

2. 推送配置文件到 GitHub
3. GitHub Actions 会自动构建并部署项目

## 3. 域名解析和 SSL 证书

### 自定义域名设置

1. 在 GitHub Pages 设置中，添加自定义域名
2. 在域名注册商处添加 CNAME 记录，指向 `<username>.github.io`

### SSL 证书

GitHub Pages 自动为自定义域名提供 SSL 证书，无需额外配置。

## 4. 应用程序功能

### 核心功能
- 用户登录（默认账号：admin，密码：password）
- Excel 文件导入（支持 .xlsx 格式）
- 人员筛选（姓名、年龄范围、学历、证书）
- 筛选结果下载
- 后台管理（用户管理、数据管理、日志记录）

### 技术特点
- 前端框架：React + TypeScript
- 构建工具：Vite
- 数据处理：xlsx 库
- 样式：自定义 CSS

## 5. 常见问题解决方案

### 问题 1: 资源路径错误

**症状**：页面加载后样式丢失或脚本无法执行
**解决方案**：
- 确保 `vite.config.ts` 中设置了 `base: './'`
- 重新构建项目：`npm run build`

### 问题 2: 部署后页面空白

**症状**：GitHub Pages 访问时页面空白
**解决方案**：
- 检查浏览器控制台是否有错误
- 确保资源路径正确
- 等待 GitHub Pages 部署完成（可能需要 10 分钟）

### 问题 3: 文件上传失败

**症状**：无法上传 Excel 文件
**解决方案**：
- 确保文件格式为 .xlsx
- 检查文件大小（建议不超过 10MB）
- 确保文件包含必要的字段（如姓名）

## 6. 运维注意事项

### 数据安全
- 本应用使用前端存储，刷新页面后数据会丢失
- 建议定期导出数据备份

### 性能优化
- 大型 Excel 文件可能导致浏览器性能下降
- 建议分批导入数据

### 浏览器兼容性
- 支持现代浏览器（Chrome、Firefox、Edge）
- 不支持 IE 浏览器

### 权限管理
- 管理员账号（admin）具有全部权限
- 普通成员账号只能使用基本功能

## 7. 本地开发

### 启动开发服务器

```bash
npm run dev
```

### 代码检查

```bash
npm run lint
```

### 预览生产构建

```bash
npm run preview
```

## 8. 联系方式

如有问题或建议，请联系项目维护者。