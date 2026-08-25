import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, useEffect } from 'react';
import React from 'react';
import { ApiTestLayout } from '@/components/layouts/ApiTestLayout';
import { LoginPage } from '@/components/features/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { TestPlanReportSharePage } from '@/pages/TestPlanReportSharePage';
import { AegisAgentPanel } from '@/components/features/AegisAgentPanel';
import { useUser } from '@/contexts/UserContext';
import { hasToken } from '@/utils/auth';
import { isDevAuthBypass } from '@/utils/devAuthBypass';
import { Toaster } from '@/components/ui/sonner';

const Loading = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-gray-500">加载中...</div>
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useUser();
  const tokenExists = hasToken();
  const location = useLocation();

  // 开发模式：默认免登录；见 utils/devAuthBypass.ts
  const bypassAuth = isDevAuthBypass();

  if (loading && !bypassAuth) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!bypassAuth && !isAuthenticated && !tokenExists) {
    const redirectPath = location.pathname + location.search;
    if (redirectPath !== '/login') {
      return <Navigate to={`/login?redirect=${encodeURIComponent(redirectPath)}`} state={{ from: location }} replace />;
    }
  }

  return <>{children}</>;
}

// 主应用内容
function AppContent() {
  const location = useLocation();

  // 全局保护：确保输入框获得焦点时自动恢复 userSelect
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      // 如果焦点在输入框、文本域等可编辑元素上，确保 userSelect 已恢复
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // 如果 userSelect 被设置为 none，立即恢复
        if (document.body.style.userSelect === 'none') {
          document.body.style.userSelect = '';
        }
      }
    };

    // 监听全局焦点事件
    document.addEventListener('focusin', handleFocus, true);

    return () => {
      document.removeEventListener('focusin', handleFocus, true);
    };
  }, []);

  // 回退保护：在应用首次加载时，确保历史栈中有应用的记录
  // 这样即使用户回退，也会停留在应用内
  useEffect(() => {
    // 只在应用首次加载时执行一次
    const hasInitialized = sessionStorage.getItem('aegis-app-initialized');
    if (!hasInitialized) {
      // 标记应用已初始化
      sessionStorage.setItem('aegis-app-initialized', 'true');

      // 如果当前不是登录页，在历史栈中插入一个首页记录
      // 这样用户回退时会先到首页，而不是退出应用
      if (location.pathname !== '/login') {
        // 使用 replaceState 确保当前页面有正确的状态
        window.history.replaceState(
          { app: 'aegis-one', path: location.pathname },
          '',
          location.pathname + location.search
        );
      }
    }
  }, []);

  // 监听 beforeunload 事件，在用户尝试离开页面时给予提示（可选）
  // 这里不添加，因为可能影响用户体验

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/share/test-plan-report"
        element={
          <ProtectedRoute>
            <TestPlanReportSharePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/test-plan/*"
        element={<Navigate to="/quality-workspace?menu=quality-workspace&tab=workspace" replace />}
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <ApiTestLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  // 处理后端重定向的 hash 路由格式（/#/login?xxx）转换为标准路由格式（/login?xxx）
  // 后端硬编码了重定向URL为 http://aegis.tst.spotter.ink/#/login，需要转换
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash;
      // 检查是否是 hash 路由格式的登录页面
      if (hash.includes('/login') || hash.includes('login?')) {
        const hashMatch = hash.match(/\/?login\?([^#]+)/);
        if (hashMatch) {
          const queryString = hashMatch[1];
          const newUrl = window.location.origin + '/login' + (queryString ? '?' + queryString : '');
          window.history.replaceState({}, document.title, newUrl);
        } else if (hash.includes('/login')) {
          // 只有 /login 没有参数
          const newUrl = window.location.origin + '/login';
          window.history.replaceState({}, document.title, newUrl);
        }
      }
    }
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <AppContent />
      </Suspense>
      {/* Toast 提示组件 */}
      <Toaster position="top-center" richColors />
      {/* AegisAgent AI 智能操作助手 - 暂时隐藏 */}
      <AegisAgentPanel />
    </BrowserRouter>
  );
}
