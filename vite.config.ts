import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')

  // AegisOne 后端服务地址（用例模块 API）
  // 可通过 .env.local 配置
  // 优先使用当前环境的配置，如果没有则使用默认值
  const AEGIS_BACKEND_URL = env.VITE_AEGIS_BACKEND_URL ||
    (mode === 'development'
      ? (env.VITE_AEGIS_BACKEND_URL_DEVELOPMENT || 'http://localhost:8081')
      : (env.VITE_AEGIS_BACKEND_URL_PRODUCTION || 'http://aegis.tst.spotter.ink'));

  // SnapTest 后端服务地址（Snap API）
  // 可通过 .env.local 配置
  // 优先使用当前环境的配置，如果没有则使用默认值
  const SNAPTEST_BACKEND_URL = env.VITE_SNAPTEST_BACKEND_URL ||
    (mode === 'development'
      ? (env.VITE_SNAPTEST_BACKEND_URL_DEVELOPMENT || 'http://localhost:8100')
      : (env.VITE_SNAPTEST_BACKEND_URL_PRODUCTION || 'http://snaptest.tst.spotter.ink'));

  const WEBTEST_BACKEND_URL = env.VITE_WEBTEST_BACKEND_URL ||
    (mode === 'development'
      ? (env.VITE_WEBTEST_BACKEND_URL_DEVELOPMENT || 'http://localhost:8090')
      : (env.VITE_WEBTEST_BACKEND_URL_PRODUCTION || 'http://aegis-web.tst.spotter.ink'));

  // SnapRPC 后端服务地址（DUBBO/RPC API）
  // 可通过 .env.local 配置
  // 优先使用当前环境的配置，如果没有则使用默认值
  const SNAPRPC_BACKEND_URL = env.VITE_SNAPRPC_BACKEND_URL ||
    (mode === 'development'
      ? (env.VITE_SNAPRPC_BACKEND_URL_DEVELOPMENT || 'http://spotter-snap-rpc.dev.spotter.ink')
      : (env.VITE_SNAPRPC_BACKEND_URL_PRODUCTION || 'http://spotter-snap-rpc.tst.spotter.ink'));

  // 精准测试/覆盖率后端（spotter-jacoco）
  const JACOCO_COVERAGE_BACKEND_URL = env.VITE_JACOCO_COVERAGE_URL ||
    (mode === 'development'
      ? (env.VITE_JACOCO_COVERAGE_URL_DEVELOPMENT || 'http://localhost:8898')
      : (env.VITE_JACOCO_COVERAGE_URL_PRODUCTION || 'http://jacoco.tst.spotter.ink/'));

  // DataForge 后端服务地址（造数工厂 API）
  // 可通过 .env.local 配置
  // 优先使用当前环境的配置，如果没有则使用默认值
  const DATA_FORGE_BACKEND_URL = env.VITE_DATA_FORGE_BACKEND_URL ||
    (mode === 'development'
      ? (env.VITE_DATA_FORGE_BACKEND_URL_DEVELOPMENT || 'http://localhost:8010')
      : (env.VITE_DATA_FORGE_BACKEND_URL_PRODUCTION || 'http://test-platform.tst.spotter.ink'));

  // 拨测管理平台地址（spotter-task-maestro / spotter-aegis-web / spotter-aegis-perf）
  // 开发环境默认指向 test-platform，确保代理请求能到达真实服务（不依赖本地起服务）
  const SPOTTER_PLATFORM_BACKEND_URL = env.VITE_SPOTTER_PLATFORM_URL ||
    (mode === 'development'
      ? (env.VITE_DATA_FORGE_BACKEND_URL_DEVELOPMENT || 'http://test-platform.tst.spotter.ink')
      : (env.VITE_DATA_FORGE_BACKEND_URL_PRODUCTION || env.VITE_DATA_FORGE_BACKEND_URL || 'http://test-platform.tst.spotter.ink'));

  // AegisAgent/RAG 后端服务地址（aegis-rag-backend）
  // 项目路径参考: /Users/jan/web/aegis-rag-backend
  // 可通过 VITE_RAG_BACKEND_URL 或 .env.local 配置
  const RAG_BACKEND_URL = env.VITE_RAG_BACKEND_URL ||
    (mode === 'development'
      ? (env.VITE_RAG_BACKEND_URL_DEVELOPMENT || 'http://localhost:8082')
      : (env.VITE_RAG_BACKEND_URL_PRODUCTION || 'http://aegis-rag.tst.spotter.ink'));

  // 打印当前配置
  console.log('🔧 Vite 配置:')
  console.log(`   环境模式: ${mode}`)
  console.log(`   AegisOne 后端: ${AEGIS_BACKEND_URL}`)
  console.log(`   SnapTest 后端: ${SNAPTEST_BACKEND_URL}`)
  console.log(`   WebTest 后端: ${WEBTEST_BACKEND_URL}`)
  console.log(`   SnapRPC 后端: ${SNAPRPC_BACKEND_URL}`)
  console.log(`   DataForge 后端: ${DATA_FORGE_BACKEND_URL}`)
  console.log(`   拨测管理代理目标: ${SPOTTER_PLATFORM_BACKEND_URL}`)
  console.log(`   RAG/AegisAgent 后端: ${RAG_BACKEND_URL}`)
  return {
    plugins: [react()],
    base: '/', // 确保基础路径正确
    optimizeDeps: {
      include: ['react-syntax-highlighter', 'react-syntax-highlighter/dist/esm/styles/prism'],
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      // 确保构建后的文件名包含 hash，便于缓存
      rollupOptions: {
        output: {
          // 确保 JS 文件使用正确的扩展名
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0', // 监听所有网络接口
      port: 5173,      // 端口号
      strictPort: false, // 如果端口被占用，尝试下一个可用端口
      open: false,     // 不自动打开浏览器
      // 开发环境代理配置，解决跨域问题
      // 配置代理错误处理，避免后端不可用时产生过多错误日志
      proxy: {
        // ==================== AegisAgent/RAG 后端代理（aegis-rag-backend）====================
        // 必须放在最前面，确保优先匹配，避免被 /login 等规则误匹配
        // /rag/v1/* -> RAG 后端（与 aegis-rag-frontend 的 /api 等效，RAG 后端同时支持两套路径）
        '/rag/v1': {
          target: RAG_BACKEND_URL,
          changeOrigin: true,
          secure: false,
          // 配置代理请求头，确保无论通过 localhost 还是内网 IP 访问都能正常工作
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              // 确保 Host header 设置为目标后端地址的 host
              const targetUrl = new URL(RAG_BACKEND_URL);
              proxyReq.setHeader('Host', targetUrl.host);
              // 可选：记录请求日志（仅在需要调试时启用）
              // console.log('🌐 [RAG Proxy] 代理请求:', req.method, req.url, '->', RAG_BACKEND_URL);
            });
            proxy.on('error', (err, _req, res) => {
              // 静默处理连接错误，避免在控制台产生大量错误日志
              if (res && !res.headersSent) {
                res.writeHead(500, {
                  'Content-Type': 'application/json',
                });
                res.end(JSON.stringify({
                  code: 500,
                  message: 'RAG 后端服务不可用',
                  error: 'ECONNREFUSED',
                  target: RAG_BACKEND_URL
                }));
              }
            });
          },
        },
        // /api/v1 全部 RAG 路径 -> RAG 后端（必须在 /api 之前，否则会被 AegisOne 代理抢走）
        // 覆盖 sessions、knowledge-chat、agent-chat、messages 等所有 RAG Chat API
        '/api/v1': {
          target: RAG_BACKEND_URL,
          changeOrigin: true,
          secure: false,
          // 配置代理请求头，确保无论通过 localhost 还是内网 IP 访问都能正常工作
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              // 确保 Host header 设置为目标后端地址的 host
              const targetUrl = new URL(RAG_BACKEND_URL);
              proxyReq.setHeader('Host', targetUrl.host);
              // 可选：记录请求日志（仅在需要调试时启用）
              // console.log('🌐 [RAG Proxy] 代理请求:', req.method, req.url, '->', RAG_BACKEND_URL);
            });
            proxy.on('error', (err, _req, res) => {
              // 静默处理连接错误，避免在控制台产生大量错误日志
              if (res && !res.headersSent) {
                res.writeHead(500, {
                  'Content-Type': 'application/json',
                });
                res.end(JSON.stringify({
                  code: 500,
                  message: 'RAG 后端服务不可用',
                  error: 'ECONNREFUSED',
                  target: RAG_BACKEND_URL
                }));
              }
            });
          },
        },
        // ==================== AegisOne 后端代理（用例模块 API）====================
        // 登录相关接口代理：只代理 POST 和 OPTIONS 请求，GET 请求由前端路由处理
        '/login': {
          target: AEGIS_BACKEND_URL,
          changeOrigin: true,
          secure: false,
          bypass(req, res, options) {
            // GET 请求跳过代理，返回 index.html 让 React Router 处理路由
            if (req.method === 'GET') {
              return '/index.html';
            }
            // POST 和 OPTIONS 请求代理到后端（返回 undefined 继续使用代理）
          },
        },
        '/signout': {
          target: AEGIS_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        '/is-login': {
          target: AEGIS_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        '/get-key': {
          target: AEGIS_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        // 代理所有以 /api 开头的请求到 AegisOne 后端
        '/api': {
          target: AEGIS_BACKEND_URL,
          changeOrigin: true,
          secure: false,
          // 重写路径：/api/functional/... -> /functional/...（去掉 /api 前缀）
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        // 附件下载代理（与 aegis-next-web 一致）
        // 直接代理 /attachment 路径，用于图片等静态资源加载
        '/attachment': {
          target: AEGIS_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        // 项目列表 API 代理（排除 /project-management 路由）
        '^\/project\/(?!management)': {
          target: AEGIS_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        // 系统设置与参数 API 代理
        '/system': {
          target: AEGIS_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        // 用户组与权限 API 代理
        '/user/role': {
          target: AEGIS_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        // 消息管理与通知 API 代理
        '/notice': {
          target: AEGIS_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        // 平台设置 API 代理
        '/setting': {
          target: AEGIS_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        // 显示设置 API 代理
        '/display': {
          target: AEGIS_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        // 组织管理 API 代理
        '/organization': {
          target: AEGIS_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        // 服务集成 API 代理
        '/service': {
          target: AEGIS_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        // 操作日志与系统日志 API 代理
        '/operation': {
          target: AEGIS_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        // 用例资产 API 代理
        '/functional': {
          target: AEGIS_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        // 缺陷管理 API 代理
        '/bug': {
          target: AEGIS_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        // 用户环境配置 API 代理
        '/user/profile': {
          target: AEGIS_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        // metrics efficiency API 代理（数据监控大盘 - Aegis 后端）
        '/metrics/efficiency': {
          target: AEGIS_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        // 需求质量视图 API 代理
        '/metrics/requirement-quality': {
          target: AEGIS_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        // 飞书相关 API 代理
        '/lark': {
          target: AEGIS_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        '/devops/feishu': {
          target: AEGIS_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        // Workflow 工作空间 API 代理（自动化用例）
        '/workflow': {
          target: AEGIS_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        // Metadata 模块 API 代理（自动化用例）
        '/metadata': {
          target: AEGIS_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        // Analytics 埋点 API 代理
        '/analytics': {
          target: AEGIS_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },

        // ==================== SnapTest 后端代理（Snap API）====================
        // SnapTest 统计 API 代理（通用配置，覆盖所有 /statistics 开头的请求）
        '/statistics': {
          target: SNAPTEST_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        // SnapTest 用户 API 代理
        '/user/all': {
          target: SNAPTEST_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        // 其他 SnapTest API 可以在这里添加
        // ==================== SnapRPC 后端代理（DUBBO/RPC API）====================
        // RPC 调用 API 代理（通用配置，覆盖所有 /rpc 开头的请求）
        '/rpc': {
          target: SNAPRPC_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        // ==================== WebTest 后端代理（WebTest API）====================
        '/dashboard/dialing': {
          target: WEBTEST_BACKEND_URL,
          changeOrigin: true,
          secure: false,
          // 配置代理错误处理，避免后端不可用时产生过多错误日志
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, res) => {
              // 静默处理连接错误，避免在控制台产生大量错误日志
              if (res && !res.headersSent) {
                res.writeHead(500, {
                  'Content-Type': 'application/json',
                });
                res.end(JSON.stringify({
                  code: 500,
                  message: 'WebTest 后端服务不可用',
                  error: 'ECONNREFUSED'
                }));
              }
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              // 可选：记录请求日志（仅在需要调试时启用）
              // console.log('🌐 [WebTest Proxy] 代理请求:', req.method, req.url);
            });
          },
        },
        // ==================== 精准测试/覆盖率后端代理（spotter-jacoco）====================
        '/cov': {
          target: JACOCO_COVERAGE_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        // ==================== DataForge 后端代理（造数工厂 API）====================
        '/spotter-data-forge': {
          target: DATA_FORGE_BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        // ==================== 拨测管理 API 代理（默认指向 test-platform，确保请求到真实服务）====================
        '/spotter-task-maestro': {
          target: SPOTTER_PLATFORM_BACKEND_URL,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err, _req, res) => {
              if (res && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  code: 502,
                  message: '拨测平台不可达，请检查网络或 VITE_SPOTTER_PLATFORM_URL',
                  target: SPOTTER_PLATFORM_BACKEND_URL,
                }));
              }
            });
          },
        },
        '/spotter-aegis-web': {
          target: SPOTTER_PLATFORM_BACKEND_URL,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err, _req, res) => {
              if (res && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  code: 502,
                  message: '拨测平台不可达，请检查网络或 VITE_SPOTTER_PLATFORM_URL',
                  target: SPOTTER_PLATFORM_BACKEND_URL,
                }));
              }
            });
          },
        },
        '/spotter-aegis-perf': {
          target: SPOTTER_PLATFORM_BACKEND_URL,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err, _req, res) => {
              if (res && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  code: 502,
                  message: '拨测平台不可达，请检查网络或 VITE_SPOTTER_PLATFORM_URL',
                  target: SPOTTER_PLATFORM_BACKEND_URL,
                }));
              }
            });
          },
        },
      },
    },
    define: {
      'import.meta.env.VITE_DATA_FORGE_BACKEND_URL': JSON.stringify(DATA_FORGE_BACKEND_URL),
    },
  }
})

