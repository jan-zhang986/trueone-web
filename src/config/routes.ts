/**
 * 统一路由和 API 配置
 * 支持本地环境和生产环境的配置切换
 */

// ==================== 环境判断 ====================
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;
const currentMode = import.meta.env.MODE || 'development';

// ==================== API 后端地址配置 ====================

/**
 * AegisOne 后端配置（用例模块 API）
 * 用例模块 API
 */
export const METERSPHERE_CONFIG = {
  // 本地开发环境
  development: {
    baseUrl: import.meta.env.VITE_AEGIS_BACKEND_URL_DEVELOPMENT || 
             import.meta.env.VITE_AEGIS_BACKEND_URL || 
             'http://localhost:8080',
    // API 路径前缀（如果需要）
    apiPrefix: '/api',
  },
  // 生产环境
  production: {
    baseUrl: import.meta.env.VITE_AEGIS_BACKEND_URL_PRODUCTION || 
             import.meta.env.VITE_AEGIS_BACKEND_URL || 
             'http://aegis.tst.spotter.ink',
    apiPrefix: '/api',
  },
} as const;

/**
 * SnapTest 后端配置（Snap API）
 * Snap API
 */
export const SNAPTEST_CONFIG = {
  // 本地开发环境
  development: {
    baseUrl: import.meta.env.VITE_SNAPTEST_BACKEND_URL_DEVELOPMENT || 
             import.meta.env.VITE_SNAPTEST_BACKEND_URL || 
             'http://localhost:8100',
    // API 路径前缀（如果需要）
    apiPrefix: '',
  },
  // 生产环境
  production: {
    baseUrl: import.meta.env.VITE_SNAPTEST_BACKEND_URL_PRODUCTION || 
             import.meta.env.VITE_SNAPTEST_BACKEND_URL || 
             'http://snaptest.tst.spotter.ink',
    apiPrefix: '',
  },
} as const;

/**
 * Aegis 后端配置（keeper-one-web 项目后端路由）
 * 注意：keeper-one-web 项目的后端就是 AegisOne，所以使用相同的配置
 * 数据监控大盘接口：metrics/efficiency/overview、metrics/efficiency/activity 均走此配置（开发环境由 vite 代理 /metrics/efficiency）
 */
export const AEGIS_CONFIG = {
  // 本地开发环境（使用 AegisOne 的配置）
  development: {
    baseUrl: import.meta.env.VITE_AEGIS_BACKEND_URL_DEVELOPMENT || 
             import.meta.env.VITE_AEGIS_BACKEND_URL || 
             'http://localhost:8081',
    apiPrefix: '/api',
  },
  // 生产环境（使用 AegisOne 的配置）
  production: {
    baseUrl: import.meta.env.VITE_AEGIS_BACKEND_URL_PRODUCTION || 
             import.meta.env.VITE_AEGIS_BACKEND_URL || 
             'http://aegis.tst.spotter.ink',
    apiPrefix: '/api',
  },
} as const;

/**
 * DataForge 后端配置（造数工厂 API）
 */
export const DATA_FORGE_CONFIG = {
  // 本地开发环境
  development: {
    baseUrl: import.meta.env.VITE_DATA_FORGE_BACKEND_URL_DEVELOPMENT || 
             import.meta.env.VITE_DATA_FORGE_BACKEND_URL || 
             'http://test-platform.tst.spotter.ink',
    // API 路径前缀
    apiPrefix: '/spotter-data-forge',
  },
  // 生产环境
  production: {
    baseUrl: import.meta.env.VITE_DATA_FORGE_BACKEND_URL_PRODUCTION || 
             import.meta.env.VITE_DATA_FORGE_BACKEND_URL || 
             'http://test-platform.tst.spotter.ink',
    // API 路径前缀
    apiPrefix: '/spotter-data-forge',
  },
} as const;

/**
 * 精准测试/覆盖率后端配置（spotter-jacoco）
 * 本地：http://localhost:8898，线上：http://jacoco.tst.spotter.ink/
 * 请求使用相对路径 /cov，由 vite/nginx 代理
 */
export const JACOCO_COVERAGE_CONFIG = {
  development: {
    baseUrl: import.meta.env.VITE_JACOCO_COVERAGE_URL_DEVELOPMENT || 'http://localhost:8898',
  },
  production: {
    baseUrl: import.meta.env.VITE_JACOCO_COVERAGE_URL_PRODUCTION || 'http://jacoco.tst.spotter.ink/',
  },
} as const;

/**
 * 拨测管理平台配置（spotter-task-maestro / spotter-aegis-web / spotter-aegis-perf，与 test-platform 同域）
 * 生产环境直接使用该 baseUrl 拼接完整请求地址
 */
export const SPOTTER_PLATFORM_CONFIG = {
  development: {
    baseUrl: import.meta.env.VITE_SPOTTER_PLATFORM_URL || 
             import.meta.env.VITE_DATA_FORGE_BACKEND_URL_DEVELOPMENT || 
             '', // 开发用相对路径，由 vite 代理转发
  },
  production: {
    baseUrl: import.meta.env.VITE_SPOTTER_PLATFORM_URL || 
             import.meta.env.VITE_DATA_FORGE_BACKEND_URL_PRODUCTION || 
             import.meta.env.VITE_DATA_FORGE_BACKEND_URL || 
             'http://test-platform.tst.spotter.ink',
  },
} as const;

// ==================== 当前环境配置 ====================

/**
 * 获取当前环境的 AegisOne 配置
 */
export const getAegisOneConfig = () => {
  return isDevelopment ? METERSPHERE_CONFIG.development : METERSPHERE_CONFIG.production;
};

/**
 * 获取当前环境的 SnapTest 配置
 */
export const getSnapTestConfig = () => {
  return isDevelopment ? SNAPTEST_CONFIG.development : SNAPTEST_CONFIG.production;
};

/**
 * 获取当前环境的 Aegis 配置
 */
export const getAegisConfig = () => {
  return isDevelopment ? AEGIS_CONFIG.development : AEGIS_CONFIG.production;
};

/**
 * 获取当前环境的 DataForge 配置
 */
export const getDataForgeConfig = () => {
  return isDevelopment ? DATA_FORGE_CONFIG.development : DATA_FORGE_CONFIG.production;
};

/**
 * 获取当前环境的精准测试/覆盖率（jacoco）配置
 */
export const getJacocoCoverageConfig = () => {
  return isDevelopment ? JACOCO_COVERAGE_CONFIG.development : JACOCO_COVERAGE_CONFIG.production;
};

/**
 * 获取当前环境的拨测管理平台配置（生产环境用完整 baseUrl）
 */
export const getSpotterPlatformConfig = () => {
  return isDevelopment ? SPOTTER_PLATFORM_CONFIG.development : SPOTTER_PLATFORM_CONFIG.production;
};

/**
 * 拨测管理 API 完整 URL（生产走生产路由，开发走相对路径由代理转发）
 */
export const getSpotterPlatformApiUrl = (path: string): string => {
  const config = getSpotterPlatformConfig();
  if (!config.baseUrl) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${config.baseUrl.replace(/\/$/, '')}${p}`;
};

// ==================== API 基础 URL ====================

/**
 * AegisOne API 基础 URL（用例模块）
 * 开发环境：使用相对路径（通过 vite 代理）
 * 生产环境：使用完整 URL（通过 nginx 代理或直接访问）
 */
export const METERSPHERE_API_BASE_URL = isDevelopment 
  ? '' // 开发环境使用相对路径，通过 vite 代理
  : getAegisOneConfig().baseUrl; // 生产环境使用完整 URL

/**
 * SnapTest API 基础 URL
 * 开发环境：使用相对路径（通过 vite 代理）
 * 生产环境：使用完整 URL（通过 nginx 代理或直接访问）
 */
export const SNAPTEST_API_BASE_URL = isDevelopment 
  ? '' // 开发环境使用相对路径，通过 vite 代理
  : getSnapTestConfig().baseUrl; // 生产环境使用完整 URL

/**
 * Aegis API 基础 URL（keeper-one-web 项目后端，如 metrics/efficiency/overview、metrics/efficiency/activity）
 * 始终使用相对路径，避免跨域 CORS：
 * - 开发环境：由 vite 代理 /metrics/efficiency 到 Aegis 后端
 * - 生产环境：由 nginx 将 /metrics/efficiency 代理到 Aegis 后端（需在部署侧配置）
 */
export const AEGIS_API_BASE_URL = '';

/**
 * 精准测试/覆盖率 API 基础 URL（spotter-jacoco，/cov/aggregateReport、/cov/aggregateReportList）
 * 始终使用相对路径，由 vite/nginx 代理到 jacoco 后端
 */
export const JACOCO_COVERAGE_API_BASE_URL = '';

/**
 * DataForge API 基础 URL（造数工厂）
 * 开发环境：使用相对路径（通过 vite 代理）
 * 生产环境：使用完整 URL（通过 nginx 代理或直接访问）
 */
export const DATA_FORGE_API_BASE_URL = isDevelopment 
  ? '' // 开发环境使用相对路径，通过 vite 代理
  : getDataForgeConfig().baseUrl; // 生产环境使用完整 URL

/**
 * 获取完整的 AegisOne API URL（用于需要完整 URL 的场景，如跨域请求）
 */
export const getAegisOneApiUrl = (path: string): string => {
  const config = getAegisOneConfig();
  return path.startsWith('http') ? path : `${config.baseUrl}${path}`;
};

/**
 * 获取完整的 SnapTest API URL（用于需要完整 URL 的场景，如跨域请求）
 */
export const getSnapTestApiUrl = (path: string): string => {
  const config = getSnapTestConfig();
  return path.startsWith('http') ? path : `${config.baseUrl}${path}`;
};

/**
 * 获取完整的 Aegis API URL（用于需要完整 URL 的场景，如跨域请求）
 * 注意：keeper-one-web 项目的后端就是 AegisOne
 */
export const getAegisApiUrl = (path: string): string => {
  const config = getAegisConfig();
  return path.startsWith('http') ? path : `${config.baseUrl}${path}`;
};

/**
 * 获取完整的 DataForge API URL（用于需要完整 URL 的场景，如跨域请求）
 */
export const getDataForgeApiUrl = (path: string): string => {
  const config = getDataForgeConfig();
  const fullPath = path.startsWith('/') ? path : `/${path}`;
  return fullPath.startsWith('http') ? fullPath : `${config.baseUrl}${config.apiPrefix}${fullPath}`;
};

// ==================== 前端路由配置 ====================

/**
 * 前端路由路径配置
 */
export const FRONTEND_ROUTES = {
  // 主页
  HOME: '/',
  
  // 工作台
  WORKSPACE: '/workspace',
  
  // 项目管理
  PROJECT_MANAGEMENT: '/project-management',
  
  // 缺陷管理
  BUG_MANAGEMENT: '/bug-management',
  
  // @deprecated 旧测试计划入口已下线，保留常量只为旧调用点跳转到需求质量主路径
  TEST_PLAN: '/quality-workspace?menu=quality-workspace&tab=workspace',
  
  // 用例管理
  CASE_MANAGEMENT: '/case-management',
  
  // 精准测试
  PRECISION_TEST: '/precision-test',
  
  // 测试工厂
  TEST_FACTORY: {
    BASE: '/test-factory',
    API: '/test-factory/api',
    /** @deprecated compatibility-only route target; ordinary users should enter realizations from Case pages */
    E2E_AUTO: '/case-management?menu=test-case&tab=feature-case',
    PERFORMANCE: '/test-factory/performance',
    TEST_REPORT: '/test-factory/test-report',
    TEST_REPORT_DETAIL: (reportId: string) => `/test-factory/test-report/${reportId}`,
  },
  
  // AI 助手
  AI_ASSISTANT: '/ai-assistant',
  
  // AegisAgent（知识库为二级菜单）
  AEGIS_AGENT: '/aegis-agent',
  KNOWLEDGE_BASE: '/knowledge-base',
  
  // 登录页
  LOGIN: '/login',
  
  // 项目管理子页面
  PROJECT: {
    MESSAGE_MANAGEMENT: (projectId: string) => `/project/${projectId}/message`,
    LOG_MANAGEMENT: (projectId: string) => `/project/${projectId}/logs`,
  },
} as const;

// ==================== API 路径配置 ====================

/**
 * AegisOne API 路径（用例模块）
 */
export const METERSPHERE_API_PATHS = {
  // 登录相关
  LOGIN: '/login',
  LOGOUT: '/signout',
  IS_LOGIN: '/is-login',
  GET_KEY: '/get-key',
  
  // 项目相关
  PROJECT: '/project',
  
  // 用户相关
  SYSTEM_USER: '/system/user',
  
  // 用例管理
  FUNCTIONAL_CASE: '/functional/case',
  CASE_REVIEW: '/case/review',
  
  // 飞书相关
  LARK_INFO: '/lark/info',
  LARK_LOGIN: '/lark/login',
  FEISHU_CALLBACK: '/devops/feishu',
} as const;

/**
 * SnapTest API 路径
 */
export const SNAPTEST_API_PATHS = {
  // 统计概览
  STATISTICS_OVERVIEW: '/statistics/snaptest/overview',
  
  // 用户管理
  USER_ALL: '/user/all',
  
  // 其他 SnapTest API 路径可以在这里添加
} as const;

// ==================== 配置信息输出 ====================
// 配置信息已移除，避免控制台输出

// ==================== 导出类型 ====================

export type Environment = 'development' | 'production';

export interface ApiConfig {
  baseUrl: string;
  apiPrefix: string;
}
