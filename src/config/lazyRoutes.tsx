/**
 * Lazy Routes Configuration
 * 延迟加载路由配置 - 按路由分割代码
 */

import { lazy, ComponentType, Suspense } from 'react';
import { RefreshCw } from 'lucide-react';

// 加载中组件
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
  </div>
);

// 创建带 Suspense 的懒加载组件
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) {
  const LazyComponent = lazy(importFunc);
  
  return (props: any) => (
    <Suspense fallback={<LoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

// 消息管理路由
export const MessageManagementRoute = lazyLoad(() => 
  import('@/components/features/message-management/MessageManagementPage').then(module => ({
    default: module.MessageManagementPage
  }))
);

// 需求质量路由。旧测试计划入口已下线，历史组件只保留在 legacy 文件中。
export const RequirementQualityRoute = lazyLoad(() =>
  import('@/pages/RequirementQualityPage').then(module => ({
    default: module.RequirementQualityPage
  }))
);

// 用例管理路由
export const CaseManagementRoute = lazyLoad(() => 
  import('@/components/features/case-management/FeatureCaseList').then(module => ({
    default: module.FeatureCaseList
  }))
);

// 路由配置示例
export const lazyRoutes = {
  messageManagement: {
    path: '/project/:projectId/message',
    component: MessageManagementRoute,
    preload: () => import('@/components/features/message-management/MessageManagementPage'),
  },
  requirementQuality: {
    path: '/project/:projectId/quality-workspace',
    component: RequirementQualityRoute,
    preload: () => import('@/pages/RequirementQualityPage'),
  },
  caseManagement: {
    path: '/project/:projectId/cases',
    component: CaseManagementRoute,
    preload: () => import('@/components/features/case-management/FeatureCaseList'),
  },
};

// 预加载函数 - 可以在用户悬停在链接上时调用
export function preloadRoute(routeName: keyof typeof lazyRoutes) {
  const route = lazyRoutes[routeName];
  if (route && route.preload) {
    route.preload();
  }
}
