/**
 * 项目管理页面
 * 路由: /project-management
 * 这是与路由对应的顶层页面组件
 * 基于 AegisOne 项目管理功能
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FolderKanban, FileText, MessageSquare, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ProjectListPage } from '@/components/features/ProjectListPage';
import { ProjectBasicInfoPage } from '@/components/features/ProjectBasicInfoPage';
import { ApplicationSettingsPage } from '@/components/features/ApplicationSettingsPage';
import { MembersManagementPage } from '@/components/features/MembersManagementPage';
import { UserGroupsPage } from '@/components/features/UserGroupsPage';
import { EnvironmentManagementPage } from '@/components/features/EnvironmentManagementPage';
import { ProjectPermissionView } from '@/components/features/project-management/ProjectPermissionView';
import { ProjectMessageView } from '@/components/features/project-management/ProjectMessageView';
import { ProjectTemplateView } from '@/components/features/project-management/ProjectTemplateView';
import { TruncateWithTooltip } from '@/components/ui/truncate-with-tooltip';
import { projectService, ProjectSimple } from '@/services/project';
import { cn } from '@/utils/cn';
import { projectManagementService } from '@/services/project-management';

type SubMenuItem =
  | 'basic-info'
  | 'app-settings'
  | 'permissions'
  | 'members'
  | 'user-groups';

interface Project {
  id: string;
  name: string;
  creator?: string;
  organization?: string;
  createdAt?: string;
  description?: string;
}

interface ProjectManagementPageProps {
  selectedTopMenu?: string;
}

export function ProjectManagementPage({ selectedTopMenu: propSelectedTopMenu }: ProjectManagementPageProps = {}) {
  const [searchParams] = useSearchParams();
  const isProduction = import.meta.env.PROD;
  // 优先使用路由参数，如果不存在则使用 props（向后兼容）
  const selectedTopMenu = propSelectedTopMenu || searchParams.get('tab') || 'project-permission';
  const [selectedSubMenu, setSelectedSubMenu] = useState<SubMenuItem>('basic-info');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  // 服务管理弹窗状态
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [serviceGitUrl, setServiceGitUrl] = useState('');
  const [serviceSwaggerUrl, setServiceSwaggerUrl] = useState('');
  const [serviceCurl, setServiceCurl] = useState('');
  const [serviceCode, setServiceCode] = useState('');
  const [serviceProjectId, setServiceProjectId] = useState<string | undefined>(undefined);
  const [serviceSaving, setServiceSaving] = useState(false);
  const [projectOptions, setProjectOptions] = useState<ProjectSimple[]>([]);

  // 项目与权限的左侧栏仅保留：基本信息、应用设置、成员、用户组。模板管理/消息通知/日志仅在顶部二级菜单。
  const projectSubMenuConfig = [
    { id: 'basic-info', label: '基本信息', type: 'item' },
    { id: 'app-settings', label: '应用设置', type: 'item' },
    { id: 'divider-1', label: '', type: 'divider' },
    { id: 'permission-section', label: '成员权限', type: 'section' },
    { id: 'members', label: '成员', type: 'item' },
    { id: 'user-groups', label: '用户组', type: 'item' },
  ];

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setSelectedSubMenu('basic-info');
    // 保存到 localStorage 以便下次访问时恢复
    if (project?.id) {
      localStorage.setItem('currentProjectId', project.id);
    }
  };

  // 初始化服务管理弹窗的项目下拉：使用公开项目列表接口
  useEffect(() => {
    projectService
      .getProjectList()
      .then((list) => setProjectOptions(list))
      .catch(() => setProjectOptions([]));
  }, []);

  // 初始化：尝试从 URL 参数或 localStorage 加载项目
  useEffect(() => {
    const initProject = async () => {
      // 如果已经选择了项目，不需要重新加载
      if (selectedProject) {
        return;
      }

      // 优先从 URL 参数获取项目ID
      const projectIdFromUrl = searchParams.get('projectId');

      // 如果没有 URL 参数，尝试从 localStorage 获取
      const projectIdFromStorage = localStorage.getItem('currentProjectId');

      const projectId = projectIdFromUrl || projectIdFromStorage;

      if (projectId) {
        try {
          // 加载完整的项目详情
          const projectDetail = await projectManagementService.getProjectInfo(projectId);

          if (projectDetail) {
            // 格式化创建时间
            const formatDate = (timestamp?: number) => {
              if (!timestamp) return '未知';
              return new Date(timestamp).toLocaleDateString('zh-CN');
            };

            setSelectedProject({
              id: projectDetail.id,
              name: projectDetail.name || '',
              creator: projectDetail.adminList && projectDetail.adminList.length > 0
                ? projectDetail.adminList[0].name || '未知'
                : '未知',
              organization: projectDetail.organizationName || '未知',
              createdAt: formatDate(projectDetail.createdAt as number),
              description: projectDetail.description || '',
            });

            // 如果加载成功，保持在当前子菜单（默认是基本信息）
          } else {
            // 如果项目ID在列表中找不到（可能被删除了），清除 localStorage
            localStorage.removeItem('currentProjectId');
          }
        } catch (error) {
          console.error('加载项目信息失败:', error);
        }
      }
    };

    initProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在组件挂载时执行一次

  const renderProjectPermissionContent = () => {
    if (!selectedProject) {
      return (
        <div className="flex-1 overflow-auto bg-gray-50/30 p-8 animate-in fade-in duration-500">
          <ProjectListPage onSelectProject={handleProjectSelect} />
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-auto bg-gray-50/20 p-8 custom-scrollbar animate-in slide-in-from-right-4 duration-500">
        <div className="max-w-[1400px] mx-auto">
          {(() => {
            switch (selectedSubMenu) {
              case 'basic-info':
                return <ProjectBasicInfoPage project={selectedProject} />;
              case 'app-settings':
                return <ApplicationSettingsPage project={selectedProject} />;
              case 'user-groups':
                return <ProjectPermissionView projectId={selectedProject.id} />;
              case 'members':
                return <MembersManagementPage project={selectedProject} />;
              default:
                return null;
            }
          })()}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (selectedTopMenu) {
      case 'project-permission':
        return (
          <div className="flex h-full w-full min-w-0 overflow-hidden bg-white">
            {/* 左侧子菜单 */}
            <div className="w-64 border-r border-gray-100 bg-white flex flex-col flex-shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
              {/* 标题 */}
              <div className="px-6 py-6 flex-shrink-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-5 bg-blue-600 rounded-full" />
                  <h2 className="text-base font-bold tracking-tight text-gray-900">项目管理</h2>
                </div>
              </div>

              {/* 子菜单列表 */}
              <nav className="px-4 flex-1 overflow-auto custom-scrollbar space-y-1">
                {projectSubMenuConfig.map((item, index) => {
                  if (item.type === 'divider') {
                    return <div key={item.id} className="h-px bg-gray-50 my-4 mx-2" />;
                  }

                  if (item.type === 'section') {
                    return (
                      <div key={item.id} className="px-4 py-2 flex items-center gap-2">
                        <div className="h-px flex-1 bg-gray-100" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                          {item.label}
                        </span>
                        <div className="h-px flex-1 bg-gray-100" />
                      </div>
                    );
                  }

                  const itemId = item.id as SubMenuItem;
                  const isActive = selectedSubMenu === itemId;
                  const isDisabled = !selectedProject;

                  return (
                    <button
                      key={item.id}
                      onClick={() => !isDisabled && setSelectedSubMenu(itemId)}
                      disabled={isDisabled}
                      className={cn(
                        "w-full group flex items-center h-11 px-4 rounded-2xl transition-all duration-300 relative",
                        isActive
                          ? "bg-blue-50/80 text-blue-700 shadow-sm"
                          : isDisabled
                            ? "opacity-40 cursor-not-allowed grayscale"
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-full" />
                      )}
                      <span className={cn(
                        "text-sm font-bold transition-transform duration-300",
                        isActive ? "translate-x-1" : "group-hover:translate-x-1"
                      )}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </nav>

              {/* 当前选中项目信息 */}
              {/* 当前选中项目信息 */}
              {selectedProject && (
                <div className="p-4 mt-auto border-t border-gray-50">
                  <div className="flex items-center justify-between mb-3 px-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">当前项目</span>
                    <button
                      onClick={() => setSelectedProject(null)}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      切换项目
                    </button>
                  </div>
                  <div className="p-3 rounded-2xl bg-gray-50/80 border border-gray-100 group transition-all hover:bg-white hover:shadow-lg hover:shadow-gray-200/40">
                    <TruncateWithTooltip className="text-xs font-bold text-gray-700 group-hover:text-blue-600 transition-colors">
                      {selectedProject.name}
                    </TruncateWithTooltip>
                  </div>
                </div>
              )}
            </div>

            {/* 右侧内容区 */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0 w-full relative">
              {/* 背景装饰 */}
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50/30 blur-[120px] rounded-full -z-10 pointer-events-none" />
              {renderProjectPermissionContent()}
            </div>
          </div>
        );

      case 'template-management':
        if (!selectedProject) {
          return (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 animate-in fade-in duration-700">
              <div className="p-8 rounded-[40px] bg-white shadow-2xl shadow-gray-200/50 flex flex-col items-center gap-6">
                <div className="p-6 rounded-3xl bg-blue-50 text-blue-500">
                  <FileText className="w-12 h-12" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-black text-gray-900">未选择项目</h3>
                  <p className="text-sm text-gray-400 font-medium">请先进入“项目与权限”选择一个具体项目进行配置</p>
                </div>
                <Button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.set('tab', 'project-permission');
                    window.history.pushState(null, '', `?${params.toString()}`);
                    window.location.reload();
                  }}
                  className="rounded-2xl bg-blue-600 px-8 font-bold"
                >
                  去选择项目
                </Button>
              </div>
            </div>
          );
        }
        return (
          <div className="flex-1 overflow-auto p-8 bg-gray-50/20 custom-scrollbar animate-in fade-in duration-500">
            <ProjectTemplateView projectId={selectedProject.id} />
          </div>
        );

      case 'message-management':
        if (!selectedProject) {
          return (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 animate-in fade-in duration-700">
              <div className="p-8 rounded-[40px] bg-white shadow-2xl shadow-gray-200/50 flex flex-col items-center gap-6">
                <div className="p-6 rounded-3xl bg-indigo-50 text-indigo-500">
                  <MessageSquare className="w-12 h-12" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-black text-gray-900">未选择项目</h3>
                  <p className="text-sm text-gray-400 font-medium">请先选择一个项目以配置通知机器人</p>
                </div>
                <Button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.set('tab', 'project-permission');
                    window.history.pushState(null, '', `?${params.toString()}`);
                    window.location.reload();
                  }}
                  className="rounded-2xl bg-indigo-600 px-8 font-bold"
                >
                  去选择项目
                </Button>
              </div>
            </div>
          );
        }
        return (
          <div className="flex-1 overflow-auto p-8 bg-gray-50/20 custom-scrollbar animate-in fade-in duration-500">
            <ProjectMessageView projectId={selectedProject.id} />
          </div>
        );

      case 'service-management':
        if (isProduction) {
          // 线上环境：仅展示占位提示，不暴露具体功能
          return (
            <div className="flex-1 flex items-center justify-center bg-gray-50/40">
              <div className="text-sm text-gray-400">
                功能界面正在开发中，敬请期待。
              </div>
            </div>
          );
        }
        // 本地 / 非生产环境：展示完整服务管理界面
        return (
          <div className="flex-1 flex flex-col overflow-auto bg-gray-50/20 custom-scrollbar animate-in fade-in duration-500">
            <div className="max-w-[1200px] mx-auto py-8 px-8">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">服务管理</h2>
                  <p className="mt-1 text-xs text-gray-400">
                    统一管理项目下的各类业务服务，后续可在此维护服务与项目的映射关系。
                  </p>
                </div>
                <Button
                  type="button"
                  className="h-9 px-4 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-sm"
                  onClick={() => {
                    setServiceDialogOpen(true);
                  }}
                >
                  + 新增服务
                </Button>
              </div>

              <div className="border border-gray-100 rounded-2xl bg-white shadow-[0_18px_45px_rgba(15,23,42,0.04)] overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items中心 justify-between bg-gray-50/40">
                  <span className="text-sm font-medium text-gray-700">服务列表</span>
                </div>
                <div className="overflow-x-auto">
                  <Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-[200px] text-gray-600">服务名称</TableHead>
                        <TableHead className="w-[260px] text-gray-600">服务描述</TableHead>
                        <TableHead className="w-[220px] text-gray-600">关联项目</TableHead>
                        <TableHead className="w-[200px] text-gray-600">Service Code</TableHead>
                        <TableHead className="w-[120px] text-right text-gray-600">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-sm text-gray-400">
                          暂无服务配置，后续可在此维护服务与项目的管理关系。
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>
        );

      case 'environment-management':
        return (
          <div className="flex-1 overflow-auto custom-scrollbar animate-in fade-in duration-500">
            <EnvironmentManagementPage projectId={selectedProject?.id} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden h-screen">
      {/* 内容区 */}
      <div className="flex-1 overflow-hidden min-w-0">
        {renderContent()}
      </div>

      {/* 新增服务弹窗（仅前端占位，暂不提交后端） */}
      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>新增服务</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-700">
                <span className="text-red-500 mr-0.5">*</span>GitUrl
              </div>
              <Input
                placeholder="请输入 Git 仓库地址"
                value={serviceGitUrl}
                onChange={(e) => setServiceGitUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-700">
                <span className="text-red-500 mr-0.5">*</span>Swagger地址
              </div>
              <Input
                placeholder="请输入 Swagger 文档地址"
                value={serviceSwaggerUrl}
                onChange={(e) => setServiceSwaggerUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-700">
                <span className="text-red-500 mr-0.5">*</span>CURL命令
              </div>
              <Input
                placeholder="请输入 CURL 命令"
                value={serviceCurl}
                onChange={(e) => setServiceCurl(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-700">
                <span className="text-red-500 mr-0.5">*</span>服务名称
              </div>
              <Input
                placeholder="请输入服务名称"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-700">
                <span className="text-red-500 mr-0.5">*</span>服务描述
              </div>
              <Input
                placeholder="请输入服务描述"
                value={serviceDesc}
                onChange={(e) => setServiceDesc(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-700">
                <span className="text-red-500 mr-0.5">*</span>关联项目
              </div>
              <Select
                value={serviceProjectId ?? ''}
                onValueChange={(val) => setServiceProjectId(val || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择项目" />
                </SelectTrigger>
                <SelectContent>
                  {projectOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-700">
                <span className="text-red-500 mr-0.5">*</span>serviceCode
              </div>
              <Input
                placeholder="请输入 service_code"
                value={serviceCode}
                onChange={(e) => setServiceCode(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => setServiceDialogOpen(false)}
              disabled={serviceSaving}
            >
              取消
            </Button>
            <Button
              type="button"
              className="min-w-[96px]"
              disabled={serviceSaving}
              onClick={() => {
                // 仅前端占位：校验必填后先关闭弹窗，后续接入真实保存接口
                if (
                  !serviceGitUrl.trim() ||
                  !serviceSwaggerUrl.trim() ||
                  !serviceCurl.trim() ||
                  !serviceName.trim() ||
                  !serviceDesc.trim() ||
                  !serviceProjectId ||
                  !serviceCode.trim()
                ) {
                  return;
                }
                setServiceDialogOpen(false);
              }}
            >
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
