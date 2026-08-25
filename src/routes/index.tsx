/**
 * 路由配置（当前未被 App.tsx 使用）
 * App.tsx 仅注册 /login、/share/test-plan-report、/*（ApiTestLayout），
 * 主内容通过 ApiTestLayout 内 URL 参数 ?menu= & tab= & reportId= 控制。
 * 本文件保留作 path 与 menu 映射参考，或后续改为 useRoutes(routes) 时使用。
 */

import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';

// 懒加载页面组件（从 pages 目录导入）
const WorkspacePage = lazy(() => import('@/pages/WorkspacePage').then(m => ({ default: m.WorkspacePage })));
const ProjectManagementPage = lazy(() => import('@/pages/ProjectManagementPage').then(m => ({ default: m.ProjectManagementPage })));
const BugManagementPage = lazy(() => import('@/pages/BugManagementPage').then(m => ({ default: m.BugManagementPage })));
const RequirementQualityPage = lazy(() => import('@/pages/RequirementQualityPage').then(m => ({ default: m.RequirementQualityPage })));
const QualityWorkspacePage = lazy(() => import('@/pages/QualityWorkspacePage').then(m => ({ default: m.QualityWorkspacePage })));
const QualityWorkspaceDetailPage = lazy(() => import('@/pages/QualityWorkspaceDetailPage').then(m => ({ default: m.QualityWorkspaceDetailPage })));
const CaseManagementPage = lazy(() => import('@/pages/CaseManagementPage').then(m => ({ default: m.CaseManagementPage })));
const MainContent = lazy(() => import('@/components/features/MainContent').then(m => ({ default: m.MainContent })));
const TestReportListPage = lazy(() => import('@/pages/TestReportListPage').then(m => ({ default: m.TestReportListPage })));
const TestReportPage = lazy(() => import('@/pages/TestReportPage').then(m => ({ default: m.TestReportPage })));
const AIAssistantPage = lazy(() => import('@/pages/AIAssistantPage').then(m => ({ default: m.AIAssistantPage })));
const KnowledgeBasePage = lazy(() => import('@/pages/KnowledgeBasePage').then(m => ({ default: m.KnowledgeBasePage })));
const PrecisionTestPage = lazy(() => import('@/pages/PrecisionTestPage').then(m => ({ default: m.PrecisionTestPage })));

// 路由配置
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <MainContent selectedTopMenu="api" />,
  },
  {
    path: '/workspace',
    element: <WorkspacePage />,
  },
  {
    path: '/project-management',
    element: <ProjectManagementPage />,
  },
  {
    path: '/bug-management',
    element: <BugManagementPage />,
  },
  {
    path: '/quality-workspace',
    children: [
      {
        index: true,
        element: <RequirementQualityPage />,
      },
      {
        path: ':planId',
        element: <QualityWorkspaceDetailPage />,
      }
    ]
  },
  {
    path: '/case-management',
    element: <CaseManagementPage />,
  },
  {
    path: '/precision-test',
    element: <PrecisionTestPage />,
  },
  {
    path: '/test-factory',
    children: [
      {
        index: true,
        element: <MainContent selectedTopMenu="api" />,
      },
      {
        path: 'api',
        element: <MainContent selectedTopMenu="api" />,
      },
      {
        path: 'data-factory',
        element: <MainContent selectedTopMenu="data-factory" />,
      },
      {
        path: 'performance',
        element: <MainContent selectedTopMenu="performance" />,
      },
      {
        path: 'test-report',
        element: <TestReportListPage />,
      },
      {
        path: 'test-report/:reportId',
        element: <TestReportPage />,
      },
    ],
  },
  {
    path: '/ai-assistant',
    element: <AIAssistantPage />,
  },
  {
    path: '/knowledge-base',
    element: <KnowledgeBasePage />,
  },
];

// 路由映射配置（用于兼容旧的URL参数方式）
export const routeMap: Record<string, { path: string; params?: Record<string, string> }> = {
  'workspace': { path: '/workspace' },
  'quality-workspace': { path: '/quality-workspace' },
  'project-management': { path: '/project-management' },
  'bug-management': { path: '/bug-management' },
  'test-factory': { path: '/test-factory' },
  'case-management': { path: '/case-management' },
  'precision-test': { path: '/precision-test' },
  'ai-assistant': { path: '/ai-assistant' },
  'aegis-agent': { path: '/?menu=aegis-agent&tab=knowledge-base' },
  'knowledge-base': { path: '/knowledge-base' },
};

/** 系统设置规范路径（与 ApiTestLayout MENU_CANONICAL_PATH.setting 一致） */
export const SETTING_BASE_PATH = '/';

/**
 * 构建系统设置页 URL（menu=setting&tab&sub），与 SystemSettingPage / ApiTestLayout 保持一致
 */
export function getSettingUrl(tab: 'system' | 'organization', sub: string): string {
  const params = new URLSearchParams();
  params.set('menu', 'setting');
  params.set('tab', tab);
  params.set('sub', sub);
  return `${SETTING_BASE_PATH}?${params.toString()}`;
}

/** 构建项目管理页 URL（与侧栏 menu=project-management 一致） */
export const PROJECT_MANAGEMENT_PATH = '/project-management';

export function getProjectManagementUrl(tab: string, projectId?: string): string {
  const params = new URLSearchParams();
  params.set('tab', tab);
  if (projectId) params.set('projectId', projectId);
  return `${PROJECT_MANAGEMENT_PATH}?${params.toString()}`;
}
