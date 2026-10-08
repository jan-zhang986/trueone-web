/**
 * API 请求工具
 * 基于 axios 封装，提供统一的请求拦截、响应处理和错误处理
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getToken, clearToken, setToken } from './auth';
import { authService } from '@/services/auth';
import { getRagApiKey, getCurrentUserId } from '@/services/rag-auth';
import { isDevAuthBypass } from '@/utils/devAuthBypass';

// API 配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api';

// 创建 axios 实例
const request: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 120秒超时
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * /api/v1 下属于 aegis-rag 的路径片段（与 e32e8d 及 aegis-rag-frontend 一致）
 * 仅这些请求走 X-API-Key + X-User-ID；新增 RAG Chat API 时需同步扩展此正则，否则误带 AegisOne 头会 403
 */
const RAG_API_V1_SEGMENT_RE =
  /\/(sessions|knowledge-chat|agent-chat|messages|auth|tenants|knowledgebases|knowledges|models|agents|web-search)/;

/**
 * 是否为发往 aegis-rag-backend 的请求
 * - /rag/v1：全部视为 RAG
 * - /api/v1：仅匹配 RAG_API_V1_SEGMENT_RE（与历史版本 e32e8d 行为一致），并兼容 axios 绝对 URL
 */
function isRagRequest(url: string | undefined): boolean {
  if (!url) return false;
  let path = url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      path = new URL(url).pathname || '';
    } catch {
      return false;
    }
  }
  if (path.startsWith('/rag/v1')) return true;
  if (path.startsWith('/api/v1')) {
    return RAG_API_V1_SEGMENT_RE.test(path);
  }
  return false;
}

/** 去掉与 RAG（X-API-Key + X-User-ID）冲突的 AegisOne / Bearer 头，避免后端按 JWT 分支返回 403 */
function stripHeadersForRag(
  headers: InternalAxiosRequestConfig['headers'] | undefined
): void {
  if (!headers) return;
  const keys = [
    'X-Tenant-ID',
    'X-AUTH-TOKEN',
    'CSRF-TOKEN',
    'ORGANIZATION',
    'PROJECT',
    'Authorization',
    'authorization',
  ] as const;
  const h = headers as Record<string, unknown> & { delete?: (name: string) => void };
  for (const k of keys) {
    if (typeof h.delete === 'function') {
      h.delete(k);
    } else {
      delete h[k];
    }
  }
}

// 判断是否为 RAG 登录请求（不需要认证）
function isRagLoginRequest(url: string | undefined): boolean {
  if (!url) return false;
  return url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh');
}

// 判断是否为拨测管理平台请求（spotter-* 与 test-platform 同域，不使用 AegisOne 鉴权）
function isSpotterPlatformRequest(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.includes('spotter-task-maestro') ||
    url.includes('spotter-aegis-web') ||
    url.includes('spotter-aegis-perf')
  );
}

// 请求拦截器
request.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const url = config.url || '';

    // ==================== RAG 请求：使用 X-API-Key + X-User-ID 认证 ====================
    // 无需登录，API Key 标识租户，X-User-ID 标识当前登录用户
    if (isRagRequest(url)) {
      // 构建时若设置了 VITE_API_BASE_URL（指向 aegis 等其它域），axios 会把 /rag/v1、/api/v1 发到外域 → 跨域预检
      // aegis-rag 默认 CORS 仅放行 localhost/内网，生产站点 Origin 会被拒，浏览器表现为 403 / CORS error
      // 必须走当前页面同源，由 nginx/vite 反代到 RAG
      config.baseURL = '';
      if (isRagLoginRequest(url)) {
        return config;
      }
      if (config.headers) {
        stripHeadersForRag(config.headers);
        // 设置 API Key + User ID 认证
        config.headers['X-API-Key'] = getRagApiKey();
        config.headers['X-User-ID'] = getCurrentUserId();
        // Content-Type
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
        } else if (!config.headers['Content-Type']) {
          config.headers['Content-Type'] = 'application/json';
        }
      }
      return config;
    }

    // ==================== 拨测平台请求：不添加 AegisOne 鉴权 ====================
    // spotter-aegis-web / spotter-task-maestro / spotter-aegis-perf 与 test-platform 同域，无需上述头，避免后端 500
    if (isSpotterPlatformRequest(url)) {
      return config;
    }

    // ==================== AegisOne 请求 ====================
    // 在请求发送前添加认证 token（兼容 AegisOne 鉴权机制）
    let token = getToken();

    // 如果 token 存在但 csrfToken 为空，尝试通过 /lark/user 接口获取 csrfToken
    // 这个接口不需要 CSRF token，可以用来刷新 csrfToken
    if (token && token.sessionId && (!token.csrfToken || !token.csrfToken.trim())) {
      const reqUrl = config.url || '';
      // 排除不需要 CSRF 的接口和 /lark/user 本身（避免循环）
      const needsCsrf = !reqUrl.includes('/lark/user') &&
        !reqUrl.includes('/lark/info') &&
        !reqUrl.includes('/lark/login') &&
        !reqUrl.includes('/is-login');

      if (needsCsrf) {
        try {
          // 使用 /lark/user 接口获取用户信息（不需要 CSRF token）
          const userInfo = await authService.getLarkUserBySessionId(token.sessionId);
          if (userInfo && (userInfo as any).csrfToken) {
            const newCsrfToken = (userInfo as any).csrfToken;
            // 更新 token
            setToken(token.sessionId, newCsrfToken);
            token = getToken(); // 重新获取更新后的 token
            console.log('[Request Interceptor] 已刷新 CSRF token');
          }
        } catch (error) {
          // 如果获取失败，继续使用现有的 token（可能为空）
          // 让后端返回错误，由响应拦截器处理
          console.warn('[Request Interceptor] 无法通过 /lark/user 获取 CSRF token，请求可能会失败');
        }
      }
    }

    if (token && config.headers) {
      config.headers['X-AUTH-TOKEN'] = token.sessionId;
      // 只有当 csrfToken 不为空时才设置，避免发送空字符串导致后端错误
      if (token.csrfToken && token.csrfToken.trim()) {
        config.headers['CSRF-TOKEN'] = token.csrfToken;
      }
      // 添加组织和项目 ID（参考老前端实现）
      const currentOrgId = localStorage.getItem('currentOrgId') || '';
      const currentProjectId = localStorage.getItem('currentProjectId') || '';
      if (currentOrgId) {
        config.headers['ORGANIZATION'] = currentOrgId;
      }
      if (currentProjectId) {
        config.headers['PROJECT'] = currentProjectId;
      }
    } else {
      // 兼容标准 Bearer token（备用）
      const bearerToken = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (bearerToken && config.headers) {
        config.headers.Authorization = `Bearer ${bearerToken}`;
      }
    }

    // 如果是 FormData，让 axios 自动设置 Content-Type（包含 boundary）
    if (config.data instanceof FormData && config.headers) {
      delete config.headers['Content-Type'];
    }

    // 添加 API 前缀（如果URL还没有这个前缀）
    // 例外：部分路径不添加 /api 前缀，直接通过 nginx 代理
    if (config.url && !config.url.startsWith('http') && API_PREFIX && !config.url.startsWith(API_PREFIX)) {
      // 这些路径需要直接使用，不添加 /api 前缀，由 nginx 代理转发
      const directProxyPaths = [
        '/import/database/table',
        '/metrics/efficiency', // 数据监控大盘 - Aegis 后端
        '/metrics/requirement-quality',
        '/system/user',
        '/user/profile',
        '/lark',
        '/devops/feishu',
        '/login',
        '/spotter-data-forge', // 造数工厂 API，通过 vite 代理转发
        '/cov', // 精准测试/覆盖率 spotter-jacoco API
        '/spotter-task-maestro', // 拨测-任务/执行器 API
        '/spotter-aegis-web', // 拨测-鉴权/菜单/拨测/计划 API
        '/spotter-aegis-perf', // 拨测-性能 API
        '/signout',
        '/is-login',
        '/get-key',
        '/workflow',
        '/metadata',
        '/analytics',
        '/dashboard', // webTest 拨测平台接口
        '/rpc', // SnapRPC DUBBO/RPC API 接口
        '/rag' // AegisAgent/RAG API，代理到 aegis-rag-backend
      ];
      const shouldSkipPrefix = directProxyPaths.some(path => config.url?.startsWith(path));

      if (!shouldSkipPrefix) {
        config.url = `${API_PREFIX}${config.url.startsWith('/') ? config.url : '/' + config.url}`;
      }
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

function normalizeTimeAliases(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      normalizeTimeAliases(obj[i]);
    }
    return obj;
  }
  if ('createdAt' in obj && !('createTime' in obj)) {
    obj.createTime = obj.createdAt;
  } else if ('createTime' in obj && !('createdAt' in obj)) {
    obj.createdAt = obj.createTime;
  }
  if ('updatedAt' in obj && !('updateTime' in obj)) {
    obj.updateTime = obj.updatedAt;
  } else if ('updateTime' in obj && !('updatedAt' in obj)) {
    obj.updatedAt = obj.updateTime;
  }
  for (const k of Object.keys(obj)) {
    if (obj[k] && typeof obj[k] === 'object') {
      normalizeTimeAliases(obj[k]);
    }
  }
  return obj;
}

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => {
    let { data } = response;
    normalizeTimeAliases(data);

    // 根据后端返回的数据结构处理
    // 如果后端统一返回格式为 { code, data, message }
    if (data && typeof data === 'object' && 'code' in data) {
      // 成功状态码（根据实际后端定义修改）
      // AegisOne 的成功状态码是 100200
      if (data.code === 200 || data.code === 0 || data.code === 100200) {
        return data.data !== undefined ? data.data : data;
      } else {
        // 业务错误
        const errorMessage = data.message || data.msg || '请求失败';
        console.error('[API Business Error]', errorMessage);
        return Promise.reject(new Error(errorMessage));
      }
    }

    // 直接返回数据
    return data;
  },
  async (error: AxiosError) => {
    // HTTP 错误处理
    if (error.response) {
      const { status, data } = error.response;
      const requestUrl = error.config?.url || '';

      // 检查是否是 CSRF token 错误
      const errorMessage =
        (data as any)?.message ||
        (data as any)?.msg ||
        error.message ||
        '请求失败';

      const isCsrfError = errorMessage.toLowerCase().includes('csrf token') ||
        errorMessage.toLowerCase().includes('csrf token is empty');

      // 如果是退出登录接口的错误，不抛出异常，因为本地状态已经清除
      const isSignoutRequest = requestUrl.includes('/signout');
      if (isSignoutRequest && (status === 405 || status === 404)) {
        // 返回一个成功的响应，避免抛出异常
        return Promise.resolve({ data: { success: true } });
      }

      switch (status) {
        case 401:
          // 未授权
          if (requestUrl.includes('/rag/v1')) {
            // RAG 401：API Key 无效，仅打印日志
            console.error('[API Error] RAG API Key 认证失败');
          } else {
            clearToken();
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');

            try {
              // 非登录/退出相关接口出现 401 时，强制回到欢迎页（根路径），由路由守卫决定是否跳转登录
              if (typeof window !== 'undefined') {
                const path = window.location.pathname || '';
                // 避免在登录页、分享页或根路径上出现 401 时再触发重复跳转
                const isAuthPage =
                  path.startsWith('/login') ||
                  path.startsWith('/share/test-plan-report') ||
                  path === '/';
                if (!isAuthPage) {
                  // 防止并发请求出现多个 401 时触发重复整页重载
                  const authRedirectingFlag = '__authRedirecting';
                  if (!(window as any)[authRedirectingFlag]) {
                    (window as any)[authRedirectingFlag] = true;
                    window.location.href = '/';
                  }
                }
              }
            } catch (_) {
              // window 不可用时忽略跳转错误
            }
          }
          break;
        case 403:
          console.error('[API Error] 无权限访问');
          break;
        case 404: {
          const isMindApi = String(requestUrl).includes('test-plan/minder/get') || String(requestUrl).includes('test-plan/mind/data');
          if (!isMindApi) console.error('[API Error] 请求的资源不存在');
          break;
        }
        case 405:
          // 方法不允许，可能是路由配置问题
          console.error('[API Error] 请求方法不允许:', requestUrl);
          break;
        case 500:
          if (isCsrfError) {
            console.error('[API Error] CSRF token 错误，尝试刷新 token');
            // 尝试刷新 CSRF token
            const token = getToken();
            if (token && token.sessionId) {
              try {
                const userInfo = await authService.getLarkUserBySessionId(token.sessionId);
                if (userInfo && (userInfo as any).csrfToken) {
                  setToken(token.sessionId, (userInfo as any).csrfToken);
                  console.log('[API Error] 已刷新 CSRF token，请重试请求');
                  // 注意：这里不自动重试，让用户手动重试或刷新页面
                }
              } catch (refreshError) {
                console.error('[API Error] 无法刷新 CSRF token，请重新登录');
              }
            }
          } else {
            // 脑图接口 500/404 视为暂无数据，与 aegis-next-web 一致静默，不打印
            const isMindApi = String(requestUrl).includes('test-plan/minder/get') || String(requestUrl).includes('test-plan/mind/data');
            // 未读通知、消息配置等为可选能力，后端未实现或异常时静默，不刷控制台
            const msg = typeof (data as any)?.message === 'string' ? (data as any).message : '';
            const isNotificationUnRead =
              String(requestUrl).includes('notification/un-read') ||
              (String(requestUrl).includes('notification') && String(requestUrl).includes('un-read')) ||
              (msg.includes('No static resource') && msg.includes('notification'));
            const isMessageConfigApi =
              String(requestUrl).includes('notice/message/task/get') ||
              String(requestUrl).includes('notice/message/task/save') ||
              String(requestUrl).includes('notice/message/template/detail') ||
              String(requestUrl).includes('notice/template/get/fields');
            if (!isMindApi && !isNotificationUnRead && !isMessageConfigApi) {
              console.error('[API Error] 服务器内部错误');
            }
          }
          break;
        default:
          console.error('[API Error]', status, data);
      }

      return Promise.reject(new Error(errorMessage));
    } else if (error.request) {
      // 请求已发出但没有收到响应（后端服务不可用）
      const requestUrl = error.config?.url || '';

      // 开发环境下，如果是后端服务不可用，静默处理，避免过多错误提示
      if (import.meta.env.DEV) {
        if (isDevAuthBypass()) {
          // 如果启用了绕过认证，静默处理网络错误
          console.warn('[API Warning] 后端服务不可用:', requestUrl);
          return Promise.reject(new Error('后端服务不可用'));
        }
      }

      console.error('[API Error] 网络错误，后端服务可能不可用:', requestUrl); ('[API Error] 网络错误，请检查网络连接');
      return Promise.reject(new Error('网络错误，请检查网络连接'));
    } else {
      // 其他错误
      console.error('[API Error]', error.message);
      return Promise.reject(error);
    }
  }
);

// 导出常用请求方法
export const http = {
  get: <T = any>(url: string, config?: any): Promise<T> => {
    // 拦截器已经处理了响应，直接返回（不再 .then(res => res.data)）
    return request.get<T, T>(url, config);
  },

  post: <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    // 拦截器已经处理了响应，直接返回
    return request.post<T, T>(url, data, config);
  },

  put: <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    // 拦截器已经处理了响应，直接返回
    return request.put<T, T>(url, data, config);
  },

  delete: <T = any>(url: string, config?: any): Promise<T> => {
    // 拦截器已经处理了响应，直接返回
    return request.delete<T, T>(url, config);
  },

  patch: <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    // 拦截器已经处理了响应，直接返回
    return request.patch<T, T>(url, data, config);
  },
};

export default request;

