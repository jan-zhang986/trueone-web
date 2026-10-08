import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authService, LarkLoginResponse } from '@/services/auth';
import { getToken, setToken as setTokenUtil, clearToken } from '@/utils/auth';
import { isDevAuthBypass } from '@/utils/devAuthBypass';
import { toast } from 'sonner';

interface User {
  id?: string;
  name?: string;
  nickname?: string;
  email?: string;
  lastOrganizationId?: string;
  lastProjectId?: string;
  permissions?: string[];
  userRoles?: any[];
  userRoleRelations?: any[];
}

interface UserContextType {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (data: { username: string; password: string }) => Promise<any>;
  logout: () => Promise<void>;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  handleLoginSuccess: (sessionId: string, csrfToken?: string) => Promise<void>;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

// 从 URL 中提取 code 参数
function extractCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const url = new URL(window.location.href);
    
    // 首先尝试从查询参数中获取
    let code = url.searchParams.get('code');
    if (code) return code;

    // 如果查询参数中没有，尝试从哈希片段中获取
    const hash = window.location.hash;
    if (hash) {
      const hashMatch = hash.match(/[?&]code=([^&#]+)/);
      if (hashMatch) {
        return decodeURIComponent(hashMatch[1]);
      }
    }
  } catch (e) {
  }

  return null;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(() => {
    // 初始化时从 localStorage 读取 token
    const tokenPair = getToken();
    const sessionId = tokenPair?.sessionId || null;
    const csrfToken = tokenPair?.csrfToken || '';
    
    // 初始化时从 localStorage 读取 token
    return sessionId;
  });

  const [user, setUserState] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const name = localStorage.getItem('currentuser');
      const email = localStorage.getItem('currentemail');
      const id = localStorage.getItem('currentUserId');
      if (name || email || id) {
        return {
          id: id || undefined,
          name: name || undefined,
          email: email || undefined
        };
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(false);

  const setToken = (sessionId: string, csrfToken?: string) => {
    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      return;
    }

    setTokenUtil(sessionId, csrfToken || '');
    setTokenState(sessionId);
    
    // 同时保存到 localStorage 的 token 字段（兼容性）
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', sessionId);
    }
  };

  // 统一的登录成功处理函数：保存 token 并获取用户信息
  const handleLoginSuccess = useCallback(async (sessionId: string, csrfToken?: string) => {
    // 先保存已有的 token（即使 csrfToken 为空也要保存 sessionId）
    setToken(sessionId, csrfToken);

    // 开发模式下，如果启用了绕过认证，跳过用户信息获取
    const bypassAuth = isDevAuthBypass();
    if (bypassAuth) {
      // 设置一个模拟用户信息，避免组件报错
      setUser({
        id: 'dev-user',
        name: '开发用户',
        email: 'dev@example.com',
      });
      return;
    }

    // 获取用户信息（如果 csrfToken 为空，从响应中获取）
    try {
      const userInfo = await authService.getCurrentUser();
      
      if (userInfo) {
        // 如果响应中包含 csrfToken，使用它来更新（优先使用最新的）
        const latestCsrfToken = (userInfo as any).csrfToken;
        if (latestCsrfToken) {
          // 如果之前没有 csrfToken，或者新的 csrfToken 不为空，则更新
          if (!csrfToken || !csrfToken.trim() || latestCsrfToken !== csrfToken) {
            setToken(sessionId, latestCsrfToken);
          }
        }
        
        // 保存用户信息（包含id、name、email、lastOrganizationId、lastProjectId等所有字段）
        const userData: User = {
          id: userInfo.id,
          name: userInfo.name,
          nickname: (userInfo as any).nickname,
          email: userInfo.email,
          lastOrganizationId: (userInfo as any).lastOrganizationId,
          lastProjectId: (userInfo as any).lastProjectId,
          permissions: (userInfo as any).permissions ?? [],
          userRoles: (userInfo as any).userRoles ?? [],
          userRoleRelations: (userInfo as any).userRoleRelations ?? [],
        };
        setUser(userData);
      }
    } catch (error: any) {
      // 如果获取用户信息失败，可能是因为缺少 CSRF token 或后端服务不可用
      // 但至少 sessionId 已经保存，用户可以尝试重新登录
      // 如果是网络错误，静默处理
      if (error?.message?.includes('Network Error') || error?.code === 'ERR_NETWORK') {
        console.warn('[UserContext] 后端服务不可用，跳过用户信息获取');
      }
    }
  }, []);

  const setUser = (val: User) => {
    setUserState(val);
    if (typeof window !== 'undefined') {
      const displayName = val.name || val.nickname;
      if (displayName) {
        localStorage.setItem('currentuser', displayName);
      }
      if (val.email) {
        localStorage.setItem('currentemail', val.email);
      }
      if (val.id) {
        localStorage.setItem('currentUserId', val.id);
      }
      // 保存用户上次选择的组织和项目
      // 注意：如果 lastProjectId 是 "no_such_project"，不保存（这是后端表示无项目的特殊值）
      if (val.lastOrganizationId) {
        localStorage.setItem('currentOrgId', val.lastOrganizationId);
      }
      // 优先使用后端返回的 lastProjectId（这是用户上次退出时保存的项目）
      // 如果后端返回了有效的 lastProjectId，则使用它；否则保留前端当前的项目选择
      if (val.lastProjectId && val.lastProjectId !== 'no_such_project') {
        localStorage.setItem('currentProjectId', val.lastProjectId);
      } else if (!val.lastProjectId || val.lastProjectId === 'no_such_project') {
        // 如果后端返回的是空值或 "no_such_project"，清除当前项目
        localStorage.removeItem('currentProjectId');
      }
    }
  };

  const login = async (data: { username: string; password: string }): Promise<any> => {
    setLoading(true);
    try {
      const res = await authService.login(data);
      if (res.sessionId) {
        await handleLoginSuccess(res.sessionId, res.csrfToken);
      }
      return res;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      // 在退出前，更新后端的 lastProject 字段
      if (typeof window !== 'undefined' && token && user?.id) {
        const currentProjectId = localStorage.getItem('currentProjectId');
        if (currentProjectId && currentProjectId !== 'no_such_project') {
          try {
            await authService.switchProject({
              projectId: currentProjectId,
              userId: user.id,
            });
          } catch (error) {
            // 更新项目失败不影响退出流程
          }
        }
      }

      // 清除本地状态
      setTokenState(null);
      setUserState(null);
      clearToken();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('currentuser');
        localStorage.removeItem('currentemail');
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('currentOrgId');
      }
      
      // 调用后端退出接口（即使失败也不影响，因为本地状态已清除）
      try {
        await authService.logout();
      } catch (error) {
        // 退出接口失败不影响，因为本地状态已清除
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  // 处理飞书登录回调
  useEffect(() => {
    const processFeishuCallback = async () => {
      if (typeof window === 'undefined') return;

      // 检查是否已经在处理回调
      if ((window as any).__feishuCallbackProcessing) {
        return;
      }

      // 仅在登录回调相关场景触发，避免普通页面误触发造成循环处理
      const pathname = window.location.pathname || '';
      const searchParams = new URLSearchParams(window.location.search);
      const hasCallbackParams =
        !!searchParams.get('code') ||
        !!searchParams.get('sessionId') ||
        (searchParams.get('success') === 'true' && searchParams.get('source') === 'lark');
      const isLoginPath = pathname.startsWith('/login');
      if (!isLoginPath && !hasCallbackParams) {
        return;
      }

      const code = extractCodeFromUrl();
      if (!code) {
        return;
      }

      // 检查 URL 参数中是否有 sessionId（来自后端回调重定向）
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('sessionId');
      const success = urlParams.get('success');
      const source = urlParams.get('source');

      if (success === 'true' && source === 'lark' && sessionId) {
        // 后端已经处理了登录，直接使用 sessionId
        (window as any).__feishuCallbackProcessing = true;
        
        try {
          await handleLoginSuccess(sessionId);
          toast.success('飞书登录成功!');
          
          // 清除 URL 参数
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
          delete (window as any).__feishuCallbackProcessing;
        } catch (error) {
          delete (window as any).__feishuCallbackProcessing;
        }
        return;
      }

      // 如果没有 sessionId，使用 code 调用登录接口
      if (code && !sessionId) {
        (window as any).__feishuCallbackProcessing = true;

        try {
          const res: LarkLoginResponse = await authService.larkLogin(code);
          
          if (res.code === 200 && res.data?.sessionId) {
            await handleLoginSuccess(res.data.sessionId, res.data.csrfToken);
            toast.success('飞书登录成功!');
            
            // 清除 URL 中的 code 参数
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            delete (window as any).__feishuCallbackProcessing;
          } else {
            toast.error(res.message || '飞书登录失败');
            delete (window as any).__feishuCallbackProcessing;
          }
        } catch (error: any) {
          toast.error(error?.message || '飞书登录失败');
          delete (window as any).__feishuCallbackProcessing;
        }
      }
    };

    processFeishuCallback();
  }, [handleLoginSuccess]);

  // 开发免登录：无 token 时注入占位用户，避免界面依赖 user 时报错
  useEffect(() => {
    if (!isDevAuthBypass() || token) {
      return;
    }
    setUserState((prev) => {
      if (prev?.id) {
        return prev;
      }
      return {
        id: 'dev-user',
        name: '开发用户',
        email: 'dev@example.com',
      };
    });
  }, [token]);

  // 初始化时，如果有 token 但没有用户信息或用户ID，尝试获取用户信息
  useEffect(() => {
    const bypassAuth = isDevAuthBypass();

    if (!bypassAuth && token && (!user || !user.name || !user.id)) {
      handleLoginSuccess(token).catch((error) => {
        // 静默失败，避免重复弹出错误
        // 如果是网络错误或后端不可用，不显示错误提示
        if (error?.message?.includes('Network Error') || error?.code === 'ERR_NETWORK') {
          console.warn('[UserContext] 后端服务不可用，跳过用户信息获取');
        }
      });
    }
  }, [token, user, handleLoginSuccess]);

  const value: UserContextType = {
    token,
    user,
    isAuthenticated: !!token,
    login,
    logout,
    setToken,
    setUser,
    handleLoginSuccess,
    loading,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

