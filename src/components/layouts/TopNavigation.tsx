import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, Bell, Search, User, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/contexts/UserContext';
import { projectService, ProjectSimple } from '@/services/project';
import { notificationService } from '@/services/notification';
import { MessageCenterDrawer } from '@/components/features/message-box';

interface TopNavigationProps {
  selectedTopMenu?: string;
  onSelectTopMenu?: (menu: string) => void;
  showSecondaryMenu?: boolean; // 是否显示二级菜单
  menuType?:
    | 'test-factory'
    | 'project-management'
    | 'workspace'
    | 'case-management'
    | 'quality-workspace'
    | 'system-setting'
    | 'aegis-agent'
    | 'dial-management'
    | 'task-management'; // 菜单类型
}

export function TopNavigation({ selectedTopMenu = 'api', onSelectTopMenu, showSecondaryMenu = false, menuType = 'test-factory' }: TopNavigationProps) {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState<ProjectSimple[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectSimple | null>(null);
  const [loading, setLoading] = useState(false);
  const [unReadCount, setUnReadCount] = useState(0);
  const [messageCenterOpen, setMessageCenterOpen] = useState(false);

  const fetchUnReadCount = useCallback(async () => {
    const projectId = selectedProject?.id ?? localStorage.getItem('currentProjectId');
    if (!projectId || projectId === 'no_such_project') {
      setUnReadCount(0);
      return;
    }
    try {
      const count = await notificationService.getUnReadCount(projectId);
      setUnReadCount(typeof count === 'number' ? count : 0);
    } catch {
      setUnReadCount(0);
    }
  }, [selectedProject?.id]);

  useEffect(() => {
    fetchUnReadCount();
  }, [fetchUnReadCount]);

  // 加载项目列表（根据组织权限过滤）
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);

        // 优先从 user 对象获取组织ID，如果没有则从 localStorage 获取
        const currentOrgId = user?.lastOrganizationId || localStorage.getItem('currentOrgId');

        // 如果没有组织ID，无法获取有权限的项目列表
        if (!currentOrgId) {
          // 如果用户信息还在加载中，不显示警告（避免控制台噪音）
          if (user === null) {
            // 用户信息还在加载，等待下次 user 更新时再尝试
            return;
          }
          console.warn('[TopNavigation] 未找到组织ID，无法加载项目列表', { user });
          setProjects([]);
          setSelectedProject(null);
          return;
        }

        // 使用组织ID获取有权限的项目列表
        const projectList = await projectService.getProjectListByOrg(currentOrgId);
        setProjects(projectList);

        // 从 localStorage 获取当前选中的项目ID
        const currentProjectId = localStorage.getItem('currentProjectId');

        if (currentProjectId && currentProjectId !== 'no_such_project') {
          // 检查项目是否存在于项目列表中
          const project = projectList.find(p => p.id === currentProjectId);
          if (project) {
            setSelectedProject(project);
            return; // 找到了项目，直接返回
          } else {
            // 项目ID存在但项目不在列表中（可能被删除或无权限）
            // 清除无效的项目ID
            localStorage.removeItem('currentProjectId');
          }
        }

        // 如果没有有效的项目ID，选择第一个可用项目
        if (projectList.length > 0) {
          setSelectedProject(projectList[0]);
          localStorage.setItem('currentProjectId', projectList[0].id);
        } else {
          // 没有可用项目
          setSelectedProject(null);
        }
      } catch (error) {
        console.error('[TopNavigation] 加载项目列表失败:', error);
        setProjects([]);
        setSelectedProject(null);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [user, location.pathname]); // 路由变化时（如从系统设置进入项目）重新同步当前项目

  // 处理项目选择
  const handleProjectSelect = (project: ProjectSimple) => {
    setSelectedProject(project);
    localStorage.setItem('currentProjectId', project.id);
    // 用 navigate 刷新当前路由（保留 pathname + search），避免 window.location.reload()
    // 在无 SPA fallback 的服务器上 reload 会直接命中后端返回 401
    navigate(0); // navigate(0) 等同于软刷新，走 React Router，不触发服务器请求
  };

  // 处理退出登录
  const handleLogout = async () => {
    try {
      // 先清除本地状态，然后跳转（不等待后端响应，避免 405 错误影响）
      await logout();
    } catch (error) {
    } finally {
      // 无论成功或失败，都跳转到登录页面
      // 使用 React Router 的 navigate 进行客户端路由跳转，避免触发后端 GET 请求
      navigate('/login', { replace: true });
    }
  };

  // 获取用户显示名称
  const getUserDisplayName = () => {
    return user?.name || user?.nickname || user?.email || '用户';
  };

  // 获取用户头像首字母
  const getUserInitial = () => {
    const name = getUserDisplayName();
    return name.charAt(0).toUpperCase();
  };

  // 测试工厂的二级菜单项
  const testFactoryNavItems = [
    { id: 'api', label: 'API接口' },
    { id: 'mock-factory', label: 'Mock工厂' },
    { id: 'data-factory', label: '造数工厂' },
    { id: 'performance', label: '性能管理' },
    { id: 'test-report', label: '报告中心' },
  ];

  // 项目管理的二级菜单项
  const projectManagementNavItems = [
    { id: 'project-permission', label: '项目与权限' },
    { id: 'template-management', label: '模板管理' },
    { id: 'message-management', label: '消息管理' },
    { id: 'service-management', label: '服务管理' },
    { id: 'environment-management', label: '环境管理' },
    { id: 'logs', label: '日志' },
  ];

  // 工作台的二级菜单项
  const workspaceNavItems = [
    { id: 'requirement-quality', label: '需求质量视图' },
    { id: 'test-factory', label: '数据监控大盘' },
  ];

  // 用例管理的二级菜单项（从 aegis-next-server 迁移）
  const caseManagementNavItems = [
    { id: 'feature-case', label: '用例库' },
    { id: 'test-suite', label: '测试套件' },
    { id: 'gate-binding', label: '门禁绑定' },
    { id: 'case-review', label: '用例评审' },
    { id: 'case-generation', label: '用例生成' },
  ];

  // 质量工作台的二级菜单项
  const qualityWorkspaceNavItems = [
    { id: 'requirements', label: '需求列表' },
    { id: 'workspace', label: '工作台' },
    { id: 'test-report', label: '报告中心' },
  ];

  // 系统设置的二级菜单项（与测试工厂二级菜单设计一致）
  const settingNavItems = [
    { id: 'system', label: '系统' },
    { id: 'organization', label: '组织' },
  ];

  // AegisAgent 的二级菜单项（agent-settings 仅限 admin 和指定用户可见）
  const isAgentSettingsAllowed =
    user?.name === 'admin' ||
    user?.email === 'admin' ||
    user?.email === 'jan.zhang@spotterio.com';
  const aegisAgentNavItems = [
    { id: 'agents', label: '智能体' },
    { id: 'knowledge-base', label: '知识库' },
    ...(isAgentSettingsAllowed ? [{ id: 'agent-settings', label: 'AI Agent设置' }] : []),
  ];

  // 拨测管理顶部二级菜单（账号、菜单、拨测配置、拨测历史、性能）
  const dialManagementNavItems = [
    { id: 'account', label: '鉴权账号' },
    { id: 'menu', label: '菜单' },
    { id: 'dial', label: '拨测配置' },
    { id: 'plan', label: '拨测历史' },
  ];

  // 任务中心：拨测任务 + 用例任务 + 用例任务详情 + 系统后台任务
  const taskManagementNavItems = [
    { id: 'tasks', label: '拨测任务' },
    { id: 'case-task', label: '用例任务' },
    { id: 'case-task-detail', label: '用例任务详情' },
    { id: 'schedule', label: '系统后台任务' },
  ];

  // 根据菜单类型选择对应的菜单项
  const secondaryNavItems =
    menuType === 'project-management' ? projectManagementNavItems :
      menuType === 'workspace' ? workspaceNavItems :
        menuType === 'case-management' ? caseManagementNavItems :
          menuType === 'quality-workspace' ? qualityWorkspaceNavItems :
            menuType === 'system-setting' ? settingNavItems :
              menuType === 'aegis-agent' ? aegisAgentNavItems :
                menuType === 'dial-management' ? dialManagementNavItems :
                  menuType === 'task-management' ? taskManagementNavItems :
                    testFactoryNavItems;

  return (
    <>
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <div className="flex items-center">
          <img
            src="/aegisones-logo.png?v=4"
            alt="AegisOnes"
            className="h-12 scale-110 origin-left w-auto object-contain cursor-pointer -ml-[10px]"
            style={{ imageRendering: '-webkit-optimize-contrast' }}
            onClick={() => navigate('/')}
          />
        </div>

        {showSecondaryMenu && (
          <nav className="flex items-center gap-1">
            {secondaryNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectTopMenu?.(item.id)}
                className={`px-4 py-2 text-sm transition-colors relative ${selectedTopMenu === item.id
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                {item.label}
                {selectedTopMenu === item.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                disabled={loading}
              >
                <span>{selectedProject?.name || '选择项目'}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>项目列表</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {projects.length === 0 ? (
                <DropdownMenuItem disabled>
                  {loading ? '加载中...' : '暂无项目'}
                </DropdownMenuItem>
              ) : (
                projects.map((project) => (
                  <DropdownMenuItem
                    key={project.id}
                    onClick={() => handleProjectSelect(project)}
                    className={selectedProject?.id === project.id ? 'bg-blue-50 text-blue-600' : ''}
                  >
                    {project.name}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="text-gray-600" title="设置" aria-label="设置">
            <Settings className="w-5 h-5" />
          </Button>
          <button
            type="button"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
            title="通知"
            aria-label="通知"
            onClick={() => setMessageCenterOpen(true)}
          >
            <Bell className="h-5 w-5" />
            {unReadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                {unReadCount > 99 ? '99+' : unReadCount}
              </span>
            )}
          </button>
          <Button variant="ghost" size="icon" className="text-gray-600" title="搜索" aria-label="搜索">
            <Search className="w-5 h-5" />
          </Button>

          {/* 用户头像下拉菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer"
                title="用户菜单"
                aria-label="用户菜单"
              >
                <User className="w-4 h-4 text-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{getUserDisplayName()}</p>
                  {user?.email && (
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span>退出登录</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <MessageCenterDrawer
        open={messageCenterOpen}
        onOpenChange={setMessageCenterOpen}
        onReadChange={fetchUnReadCount}
      />
    </>
  );
}
