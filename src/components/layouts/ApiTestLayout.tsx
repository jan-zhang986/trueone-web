import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { useSystemAdminCheck } from '@/hooks/usePermissionCheck';
import { TopNavigation } from './TopNavigation';
import { LeftSidebar } from './LeftSidebar';
import { MainContent } from '@/components/features/MainContent';
// 使用 pages 目录下的页面组件
import { WorkspacePage } from '@/pages/WorkspacePage';
import { TestReportPage } from '@/pages/TestReportPage';
import { TestReportManagementView } from '@/components/features/test-report/TestReportManagementView';
import { TestReportListPage } from '@/pages/TestReportListPage';
import { ProjectManagementPage } from '@/pages/ProjectManagementPage';
import { BugManagementPage } from '@/pages/BugManagementPage';
import { RequirementQualityPage } from '@/pages/RequirementQualityPage';
import { QualityWorkspacePage } from '@/pages/QualityWorkspacePage';
import { QualityWorkspaceDetailPage } from '@/pages/QualityWorkspaceDetailPage';
import { QualityWorkspaceReportPage, QualityWorkspaceReportDetailPage } from '@/pages/QualityWorkspaceReportPage';
import { CaseManagementPage } from '@/pages/CaseManagementPage';
import { PrecisionTestPage } from '@/pages/PrecisionTestPage';
import { SystemSettingPage } from '@/pages/SystemSettingPage';
import { AIAssistantPage } from '@/pages/AIAssistantPage';
import { KnowledgeBasePage } from '@/pages/KnowledgeBasePage';
import { AgentSettingsPage } from '@/pages/AgentSettingsPage';
import { AgentListPage } from '@/pages/AgentListPage';
import { WelcomePage } from '@/pages/WelcomePage';
import { NotFoundPage } from '@/pages/NotFoundPage';

/** 一级菜单与规范路径的映射，避免重复点击或从其他 path 切换时路径被拼接/错乱 */
const MENU_CANONICAL_PATH: Record<string, string> = {
  'welcome': '/',
  'workspace': '/workspace',
  'project-management': '/project-management',
  'quality-workspace': '/quality-workspace',
  'test-plan': '/quality-workspace',
  'test-case': '/case-management',
  'case-management': '/case-management',
  'test-factory': '/',
  'precision-test': '/precision-test',
  'bug-management': '/bug-management',
  'dial-management': '/dial-management',
  'task-management': '/task-management',
  'aegis-agent': '/',
  'setting': '/',
  'ai-assistant': '/ai-assistant',
};

function getCanonicalPathForMenu(menu: string): string {
  return MENU_CANONICAL_PATH[menu] ?? '/';
}

export function ApiTestLayout() {
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const pathname = location.pathname;
  const { isSystemAdmin } = useSystemAdminCheck();

  // agent-settings 权限检查（与 TopNavigation 一致）
  const isAgentSettingsAllowed =
    user?.name === 'admin' ||
    user?.email === 'admin' ||
    user?.email === 'jan.zhang@spotterio.com';

  // 质量工作台详情：/quality-workspace/:workspaceId。旧 /test-plan 入口会统一重定向到需求质量主路径。
  const isQualityWorkspaceDetailPath = useMemo(() => /^\/quality-workspace\/[^/]+\/?$/.test(pathname), [pathname]);
  const isQualityWorkspaceBasePath = pathname === '/quality-workspace';
  // 测试工厂报告 path：/test-factory/test-report 或 /test-factory/test-report/:reportId，用于直接访问/书签
  const testFactoryReportPathMatch = useMemo(() => pathname.match(/^\/test-factory\/test-report(?:\/([^/]+))?$/), [pathname]);

  // 从 pathname 优先识别：规范路径优先于 query.menu，避免 /project-management?menu=xxx 导致内容错乱或 401
  // 兼容旧 URL：menu=knowledge-base 重定向为 menu=aegis-agent&tab=knowledge-base
  const rawMenu = searchParams.get('menu') || 'welcome';
  const rawTab = searchParams.get('tab') || 'api';
  const isProjectManagementPath = pathname === '/project-management';
  const isWelcomePath = pathname === '/welcome' || pathname === '/' || pathname === '';
  const isWorkspacePath = pathname === '/workspace';
  const isCaseManagementPath = pathname === '/case-management' || pathname.startsWith('/case-management/');
  const isTaskManagementPath = pathname === '/task-management';
  const isDialManagementPath = pathname === '/dial-management';
  const isBugOrOtherPath = /^\/(bug-management|precision-test|ai-assistant)(\/|$)/.test(pathname);
  const isRootPath = pathname === '/' || pathname === '';
  // 根路径 / 下根据 tab 推断 menu，避免 /?tab=system 无 menu 时错显测试工厂
  const settingTabs = ['system', 'organization'];
  const aegisAgentTabs = ['agents', 'knowledge-base', 'agent-settings'];
  const menuFromRootTab = isRootPath && settingTabs.includes(rawTab)
    ? 'setting'
    : isRootPath && aegisAgentTabs.includes(rawTab)
      ? 'aegis-agent'
      : null;
  const selectedMenuItem = isQualityWorkspaceDetailPath || isQualityWorkspaceBasePath || pathname.startsWith('/test-plan')
    ? 'quality-workspace'
    : testFactoryReportPathMatch
      ? 'test-factory'
      : pathname === '/welcome'
        ? 'welcome'
        : (pathname === '/' || pathname === '')
          ? rawMenu
          : rawMenu === 'knowledge-base'
            ? 'aegis-agent'
            : isProjectManagementPath
              ? 'project-management'
              : isWorkspacePath
                ? 'workspace'
                : isCaseManagementPath
                  ? 'test-case'
                  : isTaskManagementPath
                    ? 'task-management'
                    : isDialManagementPath
                      ? 'dial-management'
                      : isBugOrOtherPath
                        ? (pathname.slice(1).split('/')[0] as string) || 'workspace'
                        : menuFromRootTab ?? rawMenu;
  const FEATURE_CASE_TAB = 'feature-case' as const;
  const SPACE_TAB = 'space' as const;
  const REALIZATION_TAB = 'realization' as const;
  const CASE_MANAGEMENT_TABS = ['feature-case', 'space', 'test-suite', 'gate-binding', 'case-review', 'case-generation', 'realization'] as const;

  const rawTopMenu = testFactoryReportPathMatch ? 'test-report' : (searchParams.get('tab') || 'api');
  const normalizedTopMenu = rawTopMenu;
  const selectedReportIdFromPath = testFactoryReportPathMatch?.[1] ?? null;
  const selectedReportId = selectedReportIdFromPath || searchParams.get('reportId') || null;
  const validAegisAgentTabs = ['agents', 'knowledge-base', 'agent-settings'];
  const validDialManagementTabs = ['account', 'menu', 'dial', 'plan'];
  const validTaskManagementTabs = ['tasks', 'case-task', 'case-task-detail', 'schedule'];
  const validWorkspaceTabs = ['requirement-quality', 'test-factory'];

  // 测试用例/测试计划/AegisAgent/拨测管理：仅允许其对应 tab 有效
  const selectedTopMenu =
    (selectedMenuItem === 'workspace' && !validWorkspaceTabs.includes(rawTopMenu))
      ? 'requirement-quality'
      : (selectedMenuItem === 'test-case' && !CASE_MANAGEMENT_TABS.includes(normalizedTopMenu as (typeof CASE_MANAGEMENT_TABS)[number]))
      ? FEATURE_CASE_TAB
    : (selectedMenuItem === 'quality-workspace' && !['requirements', 'workspace', 'test-report'].includes(rawTopMenu))
        ? 'requirements'
        : (selectedMenuItem === 'aegis-agent' && !validAegisAgentTabs.includes(rawTopMenu))
          ? 'agents'
          : (selectedMenuItem === 'dial-management' && !validDialManagementTabs.includes(rawTopMenu))
            ? 'account'
            : (selectedMenuItem === 'task-management' && !validTaskManagementTabs.includes(rawTopMenu))
              ? 'tasks'
              : normalizedTopMenu;

  // 非系统管理员访问工作台/系统设置时重定向到欢迎页
  useEffect(() => {
    if (isSystemAdmin === false && (selectedMenuItem === 'workspace' || selectedMenuItem === 'setting')) {
      navigate('/welcome', { replace: true });
    }
  }, [isSystemAdmin, selectedMenuItem, navigate]);

  // 任务中心、拨测管理、发布管理入口已下线：旧链接重定向到欢迎页
  useEffect(() => {
    const hiddenByPath = pathname === '/task-management' || pathname === '/dial-management' || pathname === '/gate-management' || pathname.startsWith('/task-management/') || pathname.startsWith('/dial-management/') || pathname.startsWith('/gate-management/');
    const hiddenByMenu = rawMenu === 'task-management' || rawMenu === 'dial-management' || rawMenu === 'gate-management';
    if (!hiddenByPath && !hiddenByMenu) return;
    navigate('/welcome', { replace: true });
  }, [pathname, rawMenu, navigate]);

  // 旧测试计划入口下线：/test-plan 不再渲染旧页面，只作为旧链接识别后跳到需求质量主路径。
  useEffect(() => {
    if (!pathname.startsWith('/test-plan')) return;
    const params = new URLSearchParams(searchParams);
    params.set('menu', 'quality-workspace');
    params.set('tab', 'requirements');
    params.delete('reportId');
    navigate(`/quality-workspace?${params.toString()}`, { replace: true });
  }, [pathname, searchParams, navigate]);

  // 更新URL参数（在现有 searchParams 上合并），并始终跳转到该菜单的规范路径，避免路径被拼接
  const updateUrl = (menu: string, tab?: string, reportId?: string | null) => {
    const params = new URLSearchParams(searchParams);
    params.set('menu', menu);
    if (tab !== undefined) {
      if (tab) params.set('tab', tab);
      else params.delete('tab');
    }
    if (reportId !== undefined) {
      if (reportId) params.set('reportId', reportId);
      else params.delete('reportId');
    }
    const targetPath = getCanonicalPathForMenu(menu);
    const search = params.toString();
    navigate(search ? `${targetPath}?${search}` : targetPath);
  };

  const handleMenuItemSelect = (item: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('menu', item);
    params.delete('kbId');

    if (item === 'quality-workspace') {
      params.set('tab', 'requirements');
    } else if (item === 'test-plan') {
      params.set('tab', 'requirements');
    } else if (item === 'test-factory') {
      params.set('tab', 'api');
    } else if (item === 'project-management') {
      params.set('tab', 'project-permission');
    } else if (item === 'workspace') {
      params.set('tab', 'requirement-quality');
    } else if (item === 'test-case') {
      params.set('tab', FEATURE_CASE_TAB);
    } else if (item === 'setting') {
      params.set('tab', 'system');
    } else if (item === 'aegis-agent') {
      params.set('tab', 'agents');
    } else if (item === 'dial-management') {
      params.set('tab', 'account');
      params.delete('sub');
    } else if (item === 'task-management') {
      params.set('tab', 'tasks');
      params.delete('sub');
    }
    // 切到不使用 sub 的菜单时清除 sub，避免残留 &sub=system-log 等
    if (item !== 'dial-management' && item !== 'setting') {
      params.delete('sub');
    }

    const targetPath = getCanonicalPathForMenu(item);
    const search = params.toString();
    const targetUrl = search ? `${targetPath}?${search}` : targetPath;
    // 重复点击当前菜单且已在规范路径上时用 replace，避免历史栈重复压入
    const isSameMenuClick = selectedMenuItem === item && pathname === targetPath;
    navigate(targetUrl, { replace: isSameMenuClick });
  };

  const handleTopMenuSelect = (menu: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('menu', selectedMenuItem);
    params.set('tab', menu);
    if (selectedMenuItem === 'aegis-agent' && menu === 'knowledge-base') params.delete('kbId');
    if (selectedMenuItem === 'dial-management' || selectedMenuItem === 'setting') params.delete('sub');
    const targetPath = getCanonicalPathForMenu(selectedMenuItem);
    const search = params.toString();
    const targetUrl = search ? `${targetPath}?${search}` : targetPath;
    const isSameTabClick = pathname === targetPath && searchParams.get('tab') === menu;
    navigate(targetUrl, { replace: isSameTabClick });
  };

  const handleViewReport = (reportId: string) => {
    updateUrl(selectedMenuItem, selectedTopMenu, reportId);
  };

  const handleBackToList = () => {
    updateUrl(selectedMenuItem, selectedTopMenu, null);
  };

  // 初始化：URL 无 menu 时根据 pathname 推断菜单并跳转到规范路径，避免 path 与内容不一致
  useEffect(() => {
    if (searchParams.get('menu')) return;
    if (pathname.startsWith('/quality-workspace') || pathname.startsWith('/test-plan')) return;
    if (pathname === '/task-management' || pathname === '/dial-management' || pathname === '/gate-management' || pathname.startsWith('/task-management/') || pathname.startsWith('/dial-management/') || pathname.startsWith('/gate-management/')) return;
    const params = new URLSearchParams(location.search);
    let menu = '';
    if (pathname === '/case-management' || pathname.startsWith('/case-management/')) {
      menu = 'test-case';
      if (!params.has('tab')) params.set('tab', SPACE_TAB);
    } else if (pathname === '/workspace') {
      menu = 'workspace';
      if (!params.has('tab')) params.set('tab', 'requirement-quality');
    } else if (pathname === '/project-management') {
      menu = 'project-management';
      if (!params.has('tab')) params.set('tab', 'project-permission');
    } else if (pathname === '/welcome' || pathname === '/' || pathname === '') {
      menu = 'welcome';
    } else if (pathname.startsWith('/bug-management') || pathname.startsWith('/precision-test') || pathname.startsWith('/ai-assistant')) {
      menu = pathname.slice(1).split('/')[0] || 'workspace';
    } else {
      // 未知路径，不设置 menu，让 renderContent 渲染 NotFoundPage
      menu = '';
    }
    if (menu) {
      params.set('menu', menu);
      const targetPath = getCanonicalPathForMenu(menu);
      navigate(`${targetPath}?${params.toString()}`, { replace: true });
    }
  }, [pathname]);

  // pathname 与 URL 中 menu 不一致时仅同步 menu（replace），避免 /project-management?menu=test-factory 等错链导致页面或请求异常
  // 根路径 / 下以 URL 的 menu 为准，不强制为 welcome，否则测试工厂/系统设置/Aegis Agent 等会被覆盖成欢迎页
  useEffect(() => {
    let expectedMenu = '';
    if (pathname.startsWith('/quality-workspace') || pathname.startsWith('/test-plan')) {
      expectedMenu = 'quality-workspace';
    } else if (isProjectManagementPath) {
      expectedMenu = 'project-management';
    } else if (pathname === '/welcome') {
      expectedMenu = 'welcome';
    } else if (pathname === '/' || pathname === '') {
      const rootMenu = searchParams.get('menu') || 'welcome';
      if (rootMenu === 'task-management' || rootMenu === 'dial-management' || rootMenu === 'gate-management') return;
      expectedMenu = rootMenu;
    } else if (isWorkspacePath) {
      expectedMenu = 'workspace';
    } else if (isCaseManagementPath) {
      expectedMenu = 'test-case';
    } else if (isTaskManagementPath || isDialManagementPath) {
      return;
    } else if (isBugOrOtherPath) {
      expectedMenu = pathname.slice(1).split('/')[0] || '';
    } else if (isRootPath && (settingTabs.includes(rawTab) || aegisAgentTabs.includes(rawTab))) {
      expectedMenu = settingTabs.includes(rawTab) ? 'setting' : 'aegis-agent';
    }
    if (!expectedMenu) return;
    const currentMenu = searchParams.get('menu');
    if (currentMenu === expectedMenu) return;
    const params = new URLSearchParams(searchParams);
    params.set('menu', expectedMenu);
    const targetPath = pathname.startsWith('/quality-workspace')
      ? pathname
      : pathname.startsWith('/test-plan')
        ? '/quality-workspace'
        : pathname || '/';
    navigate(targetPath ? `${targetPath}?${params.toString()}` : `/?${params.toString()}`, { replace: true });
  }, [pathname, isProjectManagementPath, isWorkspacePath, isCaseManagementPath, isTaskManagementPath, isDialManagementPath, isBugOrOtherPath, isRootPath, rawTab, searchParams]);

  // 路径形式 /test-factory/test-report 或 /test-factory/test-report/:id 归一化为 query 形式，便于返回/书签一致
  useEffect(() => {
    if (!testFactoryReportPathMatch) return;
    const reportIdFromPath = testFactoryReportPathMatch[1];
    const params = new URLSearchParams();
    params.set('menu', 'test-factory');
    params.set('tab', 'test-report');
    if (reportIdFromPath) params.set('reportId', reportIdFromPath);
    navigate(`/?${params.toString()}`, { replace: true });
  }, [pathname]);

  // 兼容旧 URL：menu=knowledge-base 重定向为 menu=aegis-agent&tab=knowledge-base
  useEffect(() => {
    if (searchParams.get('menu') !== 'knowledge-base') return;
    const params = new URLSearchParams(searchParams);
    params.set('menu', 'aegis-agent');
    params.set('tab', 'knowledge-base');
    const targetPath = getCanonicalPathForMenu('aegis-agent');
    navigate(`${targetPath}?${params.toString()}`, { replace: true });
  }, [searchParams.get('menu')]);

  // AegisAgent 下：tab 仅支持 agents / knowledge-base / agent-settings，无效时修正为 agents
  // agent-settings 需要额外权限校验
  useEffect(() => {
    if (selectedMenuItem !== 'aegis-agent') return;
    const tab = searchParams.get('tab');
    // 无权限用户直接访问 agent-settings 时重定向到 agents
    if (tab === 'agent-settings' && !isAgentSettingsAllowed) {
      const params = new URLSearchParams(searchParams);
      params.set('tab', 'agents');
      navigate(`?${params.toString()}`, { replace: true });
      return;
    }
    if (tab === 'agents' || tab === 'knowledge-base' || (tab === 'agent-settings' && isAgentSettingsAllowed)) return;
    const params = new URLSearchParams(searchParams);
    params.set('tab', 'agents');
    navigate(`${getCanonicalPathForMenu('aegis-agent')}?${params.toString()}`, { replace: true });
  }, [selectedMenuItem, searchParams.get('tab'), isAgentSettingsAllowed]);

  // 测试用例下：tab 仅支持 feature-case / case-review / case-generation，无效时修正为 feature-case
  useEffect(() => {
    if (selectedMenuItem !== 'test-case') return;
    const tab = searchParams.get('tab');
    if (tab && CASE_MANAGEMENT_TABS.includes(tab as (typeof CASE_MANAGEMENT_TABS)[number])) return;
    const params = new URLSearchParams(searchParams);
    params.set('tab', SPACE_TAB);
    navigate(`${getCanonicalPathForMenu('test-case')}?${params.toString()}`, { replace: true });
  }, [selectedMenuItem, searchParams.get('tab')]);

  // 质量工作台下：tab 仅支持 requirements / workspace / test-report，无效时修正为 requirements（详情页不重定向，保留 pathname）
  useEffect(() => {
    if (selectedMenuItem !== 'quality-workspace') return;
    if (isQualityWorkspaceDetailPath) return; // 详情页不强制改 tab，避免覆盖为列表页
    const tab = searchParams.get('tab');
    if (tab === 'requirements' || tab === 'workspace' || tab === 'test-report') return;
    const params = new URLSearchParams(searchParams);
    params.set('tab', 'requirements');
    navigate(`${getCanonicalPathForMenu('quality-workspace')}?${params.toString()}`, { replace: true });
  }, [selectedMenuItem, searchParams.get('tab'), isQualityWorkspaceDetailPath]);

  // 系统设置下：tab 仅支持 system / organization，无效时修正为 system
  useEffect(() => {
    if (selectedMenuItem !== 'setting') return;
    const tab = searchParams.get('tab');
    if (tab === 'system' || tab === 'organization') return;
    const params = new URLSearchParams(searchParams);
    params.set('tab', 'system');
    navigate(`${getCanonicalPathForMenu('setting')}?${params.toString()}`, { replace: true });
  }, [selectedMenuItem, searchParams.get('tab')]);

  // 判断是否显示左侧边栏（始终显示一级菜单）
  const showSidebar = true;

  // 判断是否显示二级菜单（含拨测管理：9 个顶部分类，其子项为页面内左侧三级菜单）
  const showSecondaryMenu =
    selectedMenuItem === 'test-factory' ||
    selectedMenuItem === 'project-management' ||
    selectedMenuItem === 'workspace' ||
    selectedMenuItem === 'test-case' ||
    selectedMenuItem === 'quality-workspace' ||
    selectedMenuItem === 'setting' ||
    selectedMenuItem === 'aegis-agent' ||
    selectedMenuItem === 'dial-management' ||
    selectedMenuItem === 'task-management';

  // 判断菜单类型（用于 TopNavigation 渲染对应二级菜单项）
  const menuType =
    selectedMenuItem === 'project-management' ? 'project-management' :
      selectedMenuItem === 'workspace' ? 'workspace' :
        selectedMenuItem === 'test-case' ? 'case-management' :
          selectedMenuItem === 'quality-workspace' ? 'quality-workspace' :
            selectedMenuItem === 'setting' ? 'system-setting' :
              selectedMenuItem === 'aegis-agent' ? 'aegis-agent' :
                selectedMenuItem === 'dial-management' ? 'dial-management' :
                  selectedMenuItem === 'task-management' ? 'task-management' :
                    'test-factory';

  // 获取当前上下文，传递给AI助手
  const getCurrentContext = (): 'test-factory' | 'realization' | 'data-dashboard' | 'test-report' | 'metadata' => {
    if (selectedMenuItem === 'workspace') return 'data-dashboard';
    if (selectedTopMenu === 'test-report') return 'test-report';
    if (selectedMenuItem === 'test-case' && (selectedTopMenu === SPACE_TAB || selectedTopMenu === REALIZATION_TAB)) return 'realization';
    if (selectedMenuItem === 'test-factory') return 'test-factory';
    return 'metadata';
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <TopNavigation
        selectedTopMenu={selectedTopMenu}
        onSelectTopMenu={handleTopMenuSelect}
        showSecondaryMenu={showSecondaryMenu}
        menuType={menuType}
      />
      <div className="flex flex-1 overflow-hidden relative">
        {showSidebar && (
          <LeftSidebar
            selectedItem={selectedMenuItem}
            onSelectItem={handleMenuItemSelect}
          />
        )}
        {selectedMenuItem === 'welcome' ? (
          <WelcomePage />
        ) : selectedMenuItem === 'workspace' ? (
          <div className="flex-1 w-full min-h-0 h-full relative flex flex-col overflow-hidden">
            <WorkspacePage selectedSubMenu={selectedTopMenu || 'requirement-quality'} />
          </div>
        ) : selectedMenuItem === 'project-management' ? (
          <ProjectManagementPage selectedTopMenu={selectedTopMenu} />
        ) : selectedMenuItem === 'bug-management' ? (
          <BugManagementPage />
        ) : selectedMenuItem === 'quality-workspace' ? (
          <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
            {selectedTopMenu === 'test-report' ? (
              selectedReportId ? (
                <QualityWorkspaceReportDetailPage workspaceId={selectedReportId} onBack={handleBackToList} />
              ) : (
                <QualityWorkspaceReportPage onViewReport={handleViewReport} />
              )
            ) : isQualityWorkspaceDetailPath ? (
              <QualityWorkspaceDetailPage />
            ) : selectedTopMenu === 'workspace' ? (
              <QualityWorkspacePage />
            ) : (
              <RequirementQualityPage />
            )}
          </div>
        ) : selectedMenuItem === 'test-case' || selectedMenuItem === 'case-management' ? (
          <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
            <CaseManagementPage
              selectedTopMenu={selectedTopMenu}
              onNavigate={(menu, tab) => { if (tab) updateUrl(menu, tab); }}
            />
          </div>
        ) : selectedMenuItem === 'precision-test' ? (
          <div className="flex-1 w-full h-full relative overflow-hidden">
            <PrecisionTestPage />
          </div>
        ) : selectedMenuItem === 'test-factory' ? (
          // 测试工厂：根据二级菜单显示内容（自动化用例已迁至「测试用例」二级菜单）
          selectedTopMenu === 'test-report' ? (
            selectedReportId ? (
              <TestReportPage reportId={selectedReportId} onBack={handleBackToList} />
            ) : (
              <TestReportManagementView onViewReport={handleViewReport} />
            )
          ) : (
            <MainContent selectedTopMenu={selectedTopMenu} />
          )
        ) : selectedMenuItem === 'setting' ? (
          <SystemSettingPage selectedTopMenu={selectedTopMenu as any} />
        ) : selectedMenuItem === 'ai-assistant' ? (
          <AIAssistantPage currentContext={getCurrentContext()} />
        ) : selectedMenuItem === 'aegis-agent' && selectedTopMenu === 'agents' ? (
          <div className="flex-1 w-full h-full relative overflow-hidden">
            <AgentListPage />
          </div>
        ) : selectedMenuItem === 'aegis-agent' && selectedTopMenu === 'knowledge-base' ? (
          <div className="flex-1 w-full h-full relative overflow-hidden">
            <KnowledgeBasePage />
          </div>
        ) : selectedMenuItem === 'aegis-agent' && selectedTopMenu === 'agent-settings' ? (
          <div className="flex-1 w-full h-full relative overflow-hidden">
            <AgentSettingsPage />
          </div>
        ) : (
          <NotFoundPage />
        )}

        {/* AI助手 - 暂时隐藏 */}
        {/* <AIAssistant currentContext={getCurrentContext()} /> */}
      </div>
    </div>
  );
}
