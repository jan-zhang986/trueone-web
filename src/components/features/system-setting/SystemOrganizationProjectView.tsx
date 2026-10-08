/**
 * 系统设置-组织与项目（迁移自 AegisOne）
 * Tab：组织 | 项目；表格 + 搜索 + 创建/编辑/删除/启用/禁用/恢复
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Power, PowerOff, RotateCcw, LogIn, UserPlus, Building2, Users, FolderKanban, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { UnifiedPagination } from '@/components/ui/unified-pagination';
import { organizationProjectService } from '@/services/setting/organization-project';
import { authService } from '@/services/auth';
import { useUser } from '@/contexts/UserContext';
import { AddMemberModal } from './AddMemberModal';
import { MemberDrawer } from './MemberDrawer';
import { ProjectDrawer } from './ProjectDrawer';
import { getSettingUrl, getProjectManagementUrl } from '@/routes';
import { cn } from '@/utils/cn';
import type {
  OrgProjectTableItem,
  CreateOrUpdateSystemOrgParams,
  CreateOrUpdateSystemProjectParams,
} from '@/types/setting/organization-project';

const PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];

function formatTime(ts?: number) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('zh-CN');
}

export function SystemOrganizationProjectView() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [tab, setTab] = useState<'organization' | 'project'>('organization');
  const [keyword, setKeyword] = useState('');
  const [orgList, setOrgList] = useState<OrgProjectTableItem[]>([]);
  const [orgTotal, setOrgTotal] = useState(0);
  const [orgPage, setOrgPage] = useState(1);
  const [orgPageSize, setOrgPageSize] = useState(PAGE_SIZE);
  const [orgLoading, setOrgLoading] = useState(false);
  const [projectList, setProjectList] = useState<OrgProjectTableItem[]>([]);
  const [projectTotal, setProjectTotal] = useState(0);
  const [projectPage, setProjectPage] = useState(1);
  const [projectPageSize, setProjectPageSize] = useState(PAGE_SIZE);
  const [projectLoading, setProjectLoading] = useState(false);
  const [count, setCount] = useState({ organizationTotal: 0, projectTotal: 0 });

  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [orgEditItem, setOrgEditItem] = useState<OrgProjectTableItem | null>(null);
  const [orgName, setOrgName] = useState('');
  const [orgDesc, setOrgDesc] = useState('');
  const [orgAdminIds, setOrgAdminIds] = useState<string[]>([]);
  const [orgAdminOptions, setOrgAdminOptions] = useState<{ id: string; name: string }[]>([]);
  const [orgSubmitting, setOrgSubmitting] = useState(false);

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectEditItem, setProjectEditItem] = useState<OrgProjectTableItem | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectOrgId, setProjectOrgId] = useState('');
  const [projectAdminIds, setProjectAdminIds] = useState<string[]>([]);
  const [projectOrgOptions, setProjectOrgOptions] = useState<{ id: string; name: string }[]>([]);
  const [projectAdminOptions, setProjectAdminOptions] = useState<{ id: string; name: string }[]>([]);
  const [projectSubmitting, setProjectSubmitting] = useState(false);

  const [confirmAction, setConfirmAction] = useState<{
    type: 'deleteOrg' | 'deleteProject' | 'disableOrg' | 'disableProject' | 'enableOrg' | 'enableProject' | 'revokeOrg' | 'revokeProject';
    item: OrgProjectTableItem;
  } | null>(null);

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addMemberTarget, setAddMemberTarget] = useState<{ type: 'org' | 'project'; id: string; name: string } | null>(null);

  const [memberDrawerOpen, setMemberDrawerOpen] = useState(false);
  const [memberDrawerTarget, setMemberDrawerTarget] = useState<{ type: 'org' | 'project'; id: string; name: string } | null>(null);
  const [projectDrawerOpen, setProjectDrawerOpen] = useState(false);
  const [projectDrawerOrg, setProjectDrawerOrg] = useState<{ id: string; name: string } | null>(null);

  const loadOrgList = useCallback(async () => {
    setOrgLoading(true);
    try {
      const res = await organizationProjectService.getOrgList({
        current: orgPage,
        pageSize: orgPageSize,
        keyword: keyword || undefined,
      });
      setOrgList(res.list ?? []);
      setOrgTotal(res.total ?? 0);
    } catch (e) {
      toast.error('加载组织列表失败');
      setOrgList([]);
      setOrgTotal(0);
    } finally {
      setOrgLoading(false);
    }
  }, [orgPage, orgPageSize, keyword]);

  const loadProjectList = useCallback(async () => {
    setProjectLoading(true);
    try {
      const res = await organizationProjectService.getProjectList({
        current: projectPage,
        pageSize: projectPageSize,
        keyword: keyword || undefined,
      });
      setProjectList(res.list ?? []);
      setProjectTotal(res.total ?? 0);
    } catch (e) {
      toast.error('加载项目列表失败');
      setProjectList([]);
      setProjectTotal(0);
    } finally {
      setProjectLoading(false);
    }
  }, [projectPage, projectPageSize, keyword]);

  const loadCount = useCallback(async () => {
    try {
      const res = await organizationProjectService.getCount();
      setCount(res);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (tab === 'organization') loadOrgList();
    else loadProjectList();
  }, [tab, tab === 'organization' ? loadOrgList : loadProjectList]);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  const handleSearch = () => {
    if (tab === 'organization') {
      setOrgPage(1);
      loadOrgList();
    } else {
      setProjectPage(1);
      loadProjectList();
    }
  };

  const openOrgCreate = () => {
    setOrgEditItem(null);
    setOrgName('');
    setOrgDesc('');
    setOrgAdminIds([]);
    setOrgModalOpen(true);
  };

  const openOrgEdit = (item: OrgProjectTableItem) => {
    setOrgEditItem(item);
    setOrgName(item.name);
    setOrgDesc(item.description ?? '');
    setOrgAdminIds(item.orgAdmins?.map((a) => a.id) ?? item.userIds ?? []);
    setOrgModalOpen(true);
  };

  const loadOrgAdminOptions = useCallback(async () => {
    try {
      const list = await organizationProjectService.getAdminOptions('');
      setOrgAdminOptions(list.map((u) => ({ id: u.id, name: u.name || u.email || u.id })));
    } catch {
      setOrgAdminOptions([]);
    }
  }, []);

  useEffect(() => {
    if (orgModalOpen) loadOrgAdminOptions();
  }, [orgModalOpen, loadOrgAdminOptions]);

  const handleOrgSubmit = async () => {
    const name = orgName.trim();
    if (!name) {
      toast.error('请输入组织名称');
      return;
    }
    setOrgSubmitting(true);
    try {
      if (orgEditItem?.id) {
        await organizationProjectService.updateOrg({
          id: orgEditItem.id,
          name,
          description: orgDesc,
          userIds: orgAdminIds,
        });
        toast.success('更新成功');
      } else {
        await organizationProjectService.addOrg({
          name,
          description: orgDesc,
          userIds: orgAdminIds.length ? orgAdminIds : [],
        });
        toast.success('创建成功');
      }
      setOrgModalOpen(false);
      loadOrgList();
      loadCount();
    } catch (e) {
      toast.error(orgEditItem ? '更新失败' : '创建失败');
    } finally {
      setOrgSubmitting(false);
    }
  };

  const openProjectCreate = async () => {
    setProjectEditItem(null);
    setProjectName('');
    setProjectDesc('');
    setProjectOrgId('');
    setProjectAdminIds([]);
    try {
      const opts = await organizationProjectService.getOrgOptions();
      setProjectOrgOptions(opts);
    } catch {
      setProjectOrgOptions([]);
    }
    setProjectModalOpen(true);
  };

  const openProjectEdit = async (item: OrgProjectTableItem) => {
    setProjectEditItem(item);
    setProjectName(item.name);
    setProjectDesc(item.description ?? '');
    setProjectOrgId(item.organizationId ?? '');
    setProjectAdminIds(item.userIds ?? []);
    try {
      const [orgs, admins] = await Promise.all([
        organizationProjectService.getOrgOptions(),
        organizationProjectService.getAdminOptions(''),
      ]);
      setProjectOrgOptions(orgs);
      setProjectAdminOptions(admins.map((u) => ({ id: u.id, name: u.name || u.email || u.id })));
    } catch {
      setProjectOrgOptions([]);
      setProjectAdminOptions([]);
    }
    setProjectModalOpen(true);
  };

  useEffect(() => {
    if (projectModalOpen && !projectEditItem) {
      organizationProjectService.getAdminOptions('').then((list) => {
        setProjectAdminOptions(list.map((u) => ({ id: u.id, name: u.name || u.email || u.id })));
      }).catch(() => setProjectAdminOptions([]));
    }
  }, [projectModalOpen, projectEditItem]);

  const handleProjectSubmit = async () => {
    const name = projectName.trim();
    if (!name) {
      toast.error('请输入项目名称');
      return;
    }
    if (!projectEditItem && !projectOrgId) {
      toast.error('请选择所属组织');
      return;
    }
    setProjectSubmitting(true);
    try {
      if (projectEditItem?.id) {
        await organizationProjectService.updateProject({
          id: projectEditItem.id,
          name,
          description: projectDesc,
          organizationId: projectOrgId,
          userIds: projectAdminIds,
        });
        toast.success('更新成功');
      } else {
        await organizationProjectService.addProject({
          name,
          description: projectDesc,
          organizationId: projectOrgId,
          userIds: projectAdminIds.length ? projectAdminIds : [],
        });
        toast.success('创建成功');
      }
      setProjectModalOpen(false);
      loadProjectList();
      loadCount();
    } catch (e) {
      toast.error(projectEditItem ? '更新失败' : '创建失败');
    } finally {
      setProjectSubmitting(false);
    }
  };

  const runConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, item } = confirmAction;
    setConfirmAction(null);
    try {
      switch (type) {
        case 'deleteOrg':
          await organizationProjectService.deleteOrg(item.id);
          toast.success('已删除');
          loadOrgList();
          break;
        case 'deleteProject':
          await organizationProjectService.deleteProject(item.id);
          toast.success('已删除');
          loadProjectList();
          break;
        case 'disableOrg':
          await organizationProjectService.disableOrg(item.id);
          toast.success('已禁用');
          loadOrgList();
          break;
        case 'disableProject':
          await organizationProjectService.disableProject(item.id);
          toast.success('已禁用');
          loadProjectList();
          break;
        case 'enableOrg':
          await organizationProjectService.enableOrg(item.id);
          toast.success('已启用');
          loadOrgList();
          break;
        case 'enableProject':
          await organizationProjectService.enableProject(item.id);
          toast.success('已启用');
          loadProjectList();
          break;
        case 'revokeOrg':
          await organizationProjectService.revokeOrg(item.id);
          toast.success('已恢复');
          loadOrgList();
          break;
        case 'revokeProject':
          await organizationProjectService.revokeProject(item.id);
          toast.success('已恢复');
          loadProjectList();
          break;
      }
      loadCount();
    } catch (e) {
      toast.error('操作失败');
    }
  };

  const getConfirmTitle = () => {
    if (!confirmAction) return '';
    const t = confirmAction.type;
    if (t === 'deleteOrg' || t === 'deleteProject') return '确认删除';
    if (t === 'disableOrg' || t === 'disableProject') return '确认禁用';
    if (t === 'enableOrg' || t === 'enableProject') return '确认启用';
    if (t === 'revokeOrg' || t === 'revokeProject') return '确认恢复';
    return '确认';
  };

  const enterProject = async (projectId: string, organizationId?: string) => {
    const userId = user?.id ?? '';
    if (!userId) {
      toast.error('请先登录');
      return;
    }
    try {
      await authService.switchProject({ projectId, userId });
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('currentProjectId', projectId);
      }
      toast.success('已切换至该项目');
      navigate(getProjectManagementUrl('project-permission', projectId), { replace: true });
    } catch (e) {
      toast.error('切换项目失败');
    }
  };

  const enterOrganization = (organizationId: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('currentOrgId', organizationId);
    }
    navigate(getSettingUrl('organization', 'org-member'), { replace: true });
    toast.success('已进入该组织');
  };

  const openAddMember = (type: 'org' | 'project', item: OrgProjectTableItem) => {
    setAddMemberTarget({ type, id: item.id, name: item.name });
    setAddMemberOpen(true);
  };

  const openMemberDrawer = (type: 'org' | 'project', item: OrgProjectTableItem) => {
    setMemberDrawerTarget({ type, id: item.id, name: item.name });
    setMemberDrawerOpen(true);
  };

  const openProjectDrawer = (item: OrgProjectTableItem) => {
    setProjectDrawerOrg({ id: item.id, name: item.name });
    setProjectDrawerOpen(true);
  };

  return (
    <div className="space-y-4 max-w-[1400px] pb-6">
      {/* 操作条：Tab + 搜索 + 创建 + 统计 */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/30">
        <Tabs value={tab} onValueChange={(v) => { setTab(v as 'organization' | 'project'); setKeyword(''); }} className="bg-gray-100/50 p-1 rounded-lg">
          <TabsList className="bg-transparent h-8 gap-1">
            <TabsTrigger value="organization" className="rounded-md px-4 h-6 text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-blue-600">
              组织列表
            </TabsTrigger>
            <TabsTrigger value="project" className="rounded-md px-4 h-6 text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-blue-600">
              项目列表
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">组织：<strong className="text-gray-900">{count.organizationTotal}</strong></span>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">项目：<strong className="text-gray-900">{count.projectTotal}</strong></span>
          <div className="h-6 w-px bg-gray-200" />
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={`搜索${tab === 'organization' ? '组织' : '项目'}名称...`}
              className="w-[240px] pl-8 h-9 text-sm rounded-lg border-gray-200 bg-white"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          {tab === 'organization' ? (
            <>
              <Button onClick={openOrgCreate} size="sm" className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                创建组织
              </Button>
              <Button variant="outline" size="sm" className="h-9 px-3 rounded-lg" onClick={() => loadOrgList()} disabled={orgLoading} aria-label="刷新组织列表">
                <RefreshCw className={cn("w-4 h-4", orgLoading && "animate-spin")} />
              </Button>
            </>
          ) : (
            <>
              <Button onClick={openProjectCreate} size="sm" className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                创建项目
              </Button>
              <Button variant="outline" size="sm" className="h-9 px-3 rounded-lg" onClick={() => loadProjectList()} disabled={projectLoading} aria-label="刷新项目列表">
                <RefreshCw className={cn("w-4 h-4", projectLoading && "animate-spin")} />
              </Button>
            </>
          )}
        </div>
      </div>

      {tab === 'organization' && (
        <div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto text-left">
              <Table>
                <TableHeader className="bg-[#f7f8fa] sticky top-0 z-10 border-b border-gray-200 shadow-sm">
                  <TableRow className="hover:bg-transparent border-none h-11">
                    <TableHead className="w-20 pl-4 font-medium text-gray-500 text-left">序号</TableHead>
                    <TableHead className="min-w-[140px] font-medium text-gray-500 text-left">组织名称</TableHead>
                    <TableHead className="w-32 font-medium text-gray-500 text-center">统计数据</TableHead>
                    <TableHead className="w-28 font-medium text-gray-500 text-center">运行状态</TableHead>
                    <TableHead className="min-w-[120px] font-medium text-gray-500 text-left">描述</TableHead>
                    <TableHead className="w-24 font-medium text-gray-500 text-left">创建人</TableHead>
                    <TableHead className="w-36 font-medium text-gray-500 text-left">创建时间</TableHead>
                    <TableHead className="w-36 font-medium text-gray-500 text-left">更新时间</TableHead>
                    <TableHead className="w-56 text-right pr-4 font-medium text-gray-500">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgLoading ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">加载中...</TableCell></TableRow>
                  ) : orgList.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">暂无组织</TableCell></TableRow>
                  ) : (
                    orgList.map((row) => (
                      <TableRow key={row.id} className="group transition-colors [&_td]:transition-colors [&_td]:group-hover:bg-[#f2f3f5] border-b border-gray-100 h-11">
                        <TableCell className="pl-4 text-muted-foreground tabular-nums">{row.num}</TableCell>
                        <TableCell className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{row.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-3 text-sm">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); if (!row.deleted) openMemberDrawer('org', row); }}
                              className={cn("tabular-nums", row.deleted ? "text-muted-foreground cursor-default" : "text-primary hover:underline cursor-pointer")}
                              title="查看成员"
                            >
                              {row.memberCount ?? 0} 成员
                            </button>
                            <span className="text-muted-foreground">/</span>
                            <span className="tabular-nums text-muted-foreground">{row.projectCount ?? 0} 项目</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            row.deleted ? "bg-red-100 text-red-700" :
                              row.enable ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                          )}>
                            {row.deleted ? "已删除" : row.enable ? "运行中" : "已禁用"}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground" title={row.description}>{row.description || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{row.createUser ?? '-'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{formatTime(row.createdAt)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{formatTime(row.updatedAt)}</TableCell>
                        <TableCell className="text-right pr-4 space-x-1">
                        {row.deleted ? (
                          <Button variant="ghost" size="sm" onClick={() => setConfirmAction({ type: 'revokeOrg', item: row })} className="h-8 rounded-lg text-emerald-600 hover:bg-emerald-50 font-bold text-[11px]">
                            <RotateCcw className="h-3.5 w-3.5 mr-1" /> 恢复组织
                          </Button>
                        ) : (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => openAddMember('org', row)} className="h-8 rounded-lg text-blue-600 hover:bg-blue-50 font-bold text-[11px]"><UserPlus className="h-3.5 w-3.5 mr-1" /> 添加成员</Button>
                            <Button variant="ghost" size="sm" onClick={() => openMemberDrawer('org', row)} className="h-8 rounded-lg text-gray-600 hover:bg-gray-100 font-bold text-[11px]"><Users className="h-3.5 w-3.5 mr-1" /> 查看成员</Button>
                            <Button variant="ghost" size="sm" onClick={() => openProjectDrawer(row)} className="h-8 rounded-lg text-gray-600 hover:bg-gray-100 font-bold text-[11px]"><FolderKanban className="h-3.5 w-3.5 mr-1" /> 查看项目</Button>
                            <Button variant="ghost" size="sm" onClick={() => enterOrganization(row.id)} className="h-8 rounded-lg text-gray-600 hover:bg-gray-100 font-bold text-[11px]"><Building2 className="h-3.5 w-3.5 mr-1" /> 进入组织</Button>
                            <Button variant="ghost" size="sm" onClick={() => openOrgEdit(row)} className="h-8 rounded-lg text-blue-600 hover:bg-blue-50 font-bold text-[11px]"><Pencil className="h-3.5 w-3.5 mr-1" /> 编辑</Button>
                            {!row.enable && (
                              <Button variant="ghost" size="sm" onClick={() => setConfirmAction({ type: 'enableOrg', item: row })} className="h-8 rounded-lg text-emerald-600 hover:bg-emerald-50 font-bold text-[11px]"><Power className="h-3.5 w-3.5 mr-1" /> 启用</Button>
                            )}
                          </>
                        )}
                      </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          {orgTotal > 0 && (
            <div className="border-t border-gray-200 px-6 py-4">
              <UnifiedPagination
                currentPage={orgPage}
                total={orgTotal}
                pageSize={orgPageSize}
                onPageChange={setOrgPage}
                onPageSizeChange={(size) => { setOrgPageSize(size); setOrgPage(1); }}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                unitLabel="条"
                hideWhenEmpty={false}
              />
            </div>
          )}
        </div>
      )}

      {tab === 'project' && (
        <div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto text-left">
              <Table>
                <TableHeader className="bg-[#f7f8fa] sticky top-0 z-10 border-b border-gray-200 shadow-sm">
                  <TableRow className="hover:bg-transparent border-none h-11">
                    <TableHead className="w-20 pl-4 font-medium text-gray-500 text-left">序号</TableHead>
                    <TableHead className="min-w-[140px] font-medium text-gray-500 text-left">项目名称</TableHead>
                    <TableHead className="w-32 font-medium text-gray-500 text-center">所属组织</TableHead>
                    <TableHead className="w-28 font-medium text-gray-500 text-center">状态</TableHead>
                    <TableHead className="min-w-[120px] font-medium text-gray-500 text-left">描述</TableHead>
                    <TableHead className="w-24 font-medium text-gray-500 text-left">创建人</TableHead>
                    <TableHead className="w-36 font-medium text-gray-500 text-left">创建时间</TableHead>
                    <TableHead className="w-36 font-medium text-gray-500 text-left">更新时间</TableHead>
                    <TableHead className="w-48 text-right pr-4 font-medium text-gray-500">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectLoading ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">加载中...</TableCell></TableRow>
                  ) : projectList.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">暂无项目</TableCell></TableRow>
                  ) : (
                    projectList.map((row) => (
                      <TableRow key={row.id} className="group transition-colors [&_td]:transition-colors [&_td]:group-hover:bg-[#f2f3f5] border-b border-gray-100 h-11">
                        <TableCell className="pl-4 text-muted-foreground">{row.num ?? '-'}</TableCell>
                        <TableCell className="font-medium">
                          {row.deleted ? (
                            <span className="text-muted-foreground line-through">{row.name ?? '-'}</span>
                          ) : (
                            <span>{row.name ?? '-'}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">{row.organizationName || '-'}</TableCell>
                        <TableCell className="text-center">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            row.deleted ? "bg-red-100 text-red-700" :
                              row.enable ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                          )}>
                            {row.deleted ? "已删除" : row.enable ? "服务中" : "已挂起"}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground" title={row.description}>{row.description ?? '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{row.createUser ?? '-'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{formatTime(row.createdAt)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{formatTime(row.updatedAt)}</TableCell>
                        <TableCell className="text-right pr-4 space-x-1">
                        {row.deleted ? (
                          <Button variant="ghost" size="sm" onClick={() => setConfirmAction({ type: 'revokeProject', item: row })} className="h-8 rounded-lg text-emerald-600 hover:bg-emerald-50 font-bold text-[11px]">
                            <RotateCcw className="h-3.5 w-3.5 mr-1" /> 撤销删除
                          </Button>
                        ) : (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => openProjectEdit(row)} className="h-8 rounded-lg text-blue-600 hover:bg-blue-50 font-bold text-[11px]"><Pencil className="h-3.5 w-3.5 mr-1" /> 编辑项目</Button>
                            <Button variant="ghost" size="sm" onClick={() => openAddMember('project', row)} className="h-8 rounded-lg text-blue-600 hover:bg-blue-50 font-bold text-[11px]"><UserPlus className="h-3.5 w-3.5 mr-1" /> 添加成员</Button>
                            <Button variant="ghost" size="sm" onClick={() => openMemberDrawer('project', row)} className="h-8 rounded-lg text-gray-600 hover:bg-gray-100 font-bold text-[11px]"><Users className="h-3.5 w-3.5 mr-1" /> 查看成员</Button>
                            <Button variant="ghost" size="sm" onClick={() => enterProject(row.id, row.organizationId)} className="h-8 rounded-lg text-emerald-600 hover:bg-emerald-50 font-bold text-[11px]"><LogIn className="h-3.5 w-3.5 mr-1" /> 进入项目</Button>
                            {row.enable ? (
                              <Button variant="ghost" size="sm" onClick={() => setConfirmAction({ type: 'disableProject', item: row })} className="h-8 rounded-lg text-amber-600 hover:bg-amber-50 font-bold text-[11px]"><PowerOff className="h-3.5 w-3.5 mr-1" /> 禁用</Button>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => setConfirmAction({ type: 'enableProject', item: row })} className="h-8 rounded-lg text-emerald-600 hover:bg-emerald-50 font-bold text-[11px]"><Power className="h-3.5 w-3.5 mr-1" /> 激活</Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => setConfirmAction({ type: 'deleteProject', item: row })} className="h-8 rounded-lg text-red-600 hover:bg-red-50 font-bold text-[11px]"><Trash2 className="h-3.5 w-3.5 mr-1" /> 移除</Button>
                          </>
                        )}
                      </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          {projectTotal > 0 && (
            <div className="border-t border-gray-200 px-6 py-4">
              <UnifiedPagination
                currentPage={projectPage}
                total={projectTotal}
                pageSize={projectPageSize}
                onPageChange={setProjectPage}
                onPageSizeChange={(size) => { setProjectPageSize(size); setProjectPage(1); }}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                unitLabel="条"
                hideWhenEmpty={false}
              />
            </div>
          )}
        </div>
      )}

      {/* 组织 创建/编辑 */}
      <Dialog open={orgModalOpen} onOpenChange={setOrgModalOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>{orgEditItem ? '编辑组织' : '创建组织'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase">组织名称 *</Label>
              <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="请输入组织名称" maxLength={255} className="w-full h-10 rounded-xl focus:ring-blue-500/20" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase">组织管理员（可选）</Label>
              <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-100 p-3 space-y-2 bg-gray-50/30">
                {orgAdminOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4 italic">加载中...</p>
                ) : (
                  orgAdminOptions.map((u) => (
                    <label key={u.id} className="flex items-center gap-3 cursor-pointer group p-1.5 rounded-lg hover:bg-white transition-colors">
                      <Checkbox
                        checked={orgAdminIds.includes(u.id)}
                        onCheckedChange={(checked) =>
                          setOrgAdminIds((prev) =>
                            checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)
                          )
                        }
                        className="rounded-md border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">{u.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase">描述</Label>
              <Input value={orgDesc} onChange={(e) => setOrgDesc(e.target.value)} placeholder="选填，描述该组织的用途" className="w-full h-10 rounded-xl" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setOrgModalOpen(false)} className="rounded-xl flex-1 h-10">取消</Button>
            <Button onClick={handleOrgSubmit} disabled={orgSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex-1 h-10">{orgSubmitting ? '提交中' : (orgEditItem ? '保存修改' : '立即创建')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 项目 创建/编辑 */}
      <Dialog open={projectModalOpen} onOpenChange={setProjectModalOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>{projectEditItem ? '编辑项目' : '创建项目'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase">项目名称 *</Label>
              <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="请输入项目名称" maxLength={255} className="w-full h-10 rounded-xl focus:ring-blue-500/20" />
            </div>
            {!projectEditItem && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-500 uppercase">所属组织 *</Label>
                <Select value={projectOrgId} onValueChange={setProjectOrgId}>
                  <SelectTrigger className="w-full h-10 rounded-xl border-gray-200"><SelectValue placeholder="请选择所属组织" /></SelectTrigger>
                  <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                    {projectOrgOptions.filter(o => o.id).map((o) => (
                      <SelectItem key={o.id} value={o.id} className="rounded-lg">{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase">项目管理员（可选）</Label>
              <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-100 p-3 space-y-2 bg-gray-50/30">
                {projectAdminOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4 italic">加载中...</p>
                ) : (
                  projectAdminOptions.map((u) => (
                    <label key={u.id} className="flex items-center gap-3 cursor-pointer group p-1.5 rounded-lg hover:bg-white transition-colors">
                      <Checkbox
                        checked={projectAdminIds.includes(u.id)}
                        onCheckedChange={(checked) =>
                          setProjectAdminIds((prev) =>
                            checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)
                          )
                        }
                        className="rounded-md border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">{u.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase">描述</Label>
              <Input value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)} placeholder="选填，描述该项目的业务范围" className="w-full h-10 rounded-xl" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setProjectModalOpen(false)} className="rounded-xl flex-1 h-10">取消</Button>
            <Button onClick={handleProjectSubmit} disabled={projectSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex-1 h-10">{projectSubmitting ? '提交中' : (projectEditItem ? '保存修改' : '立即创建')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 操作确认 */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent className="rounded-3xl p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">{getConfirmTitle()}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 mt-2">
              {confirmAction && (
                confirmAction.type.includes('delete')
                  ? (confirmAction.type === 'deleteProject' && confirmAction.item.remainDayCount != null && confirmAction.item.remainDayCount > 0
                      ? `确定要删除「${confirmAction.item.name}」吗？删除后可在 ${confirmAction.item.remainDayCount} 天内恢复。`
                      : `确定要永久删除「${confirmAction.item.name}」吗？${confirmAction.type === 'deleteProject' ? '删除后该项目将无法使用。' : '该操作不可撤销，请谨慎操作。'}`)
                  : confirmAction.type.includes('disable')
                    ? `确定要禁用「${confirmAction.item.name}」吗？禁用后该项目下的所有资源将无法访问。`
                    : confirmAction.type.includes('enable')
                      ? `确定要重新启用「${confirmAction.item.name}」吗？`
                      : `确定要从回收站恢复「${confirmAction.item.name}」吗？`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="rounded-xl h-11 border-gray-200">取消</AlertDialogCancel>
            <AlertDialogAction onClick={runConfirmAction} className={cn("rounded-xl h-11 px-8", confirmAction?.type.includes('delete') ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700")}>
              确认执行
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {addMemberTarget && (
        <AddMemberModal
          open={addMemberOpen}
          onOpenChange={setAddMemberOpen}
          type={addMemberTarget.type}
          targetId={addMemberTarget.id}
          targetName={addMemberTarget.name}
          onSuccess={() => {
            if (addMemberTarget.type === 'org') loadOrgList();
            else loadProjectList();
            setAddMemberTarget(null);
          }}
        />
      )}

      {memberDrawerTarget && (
        <MemberDrawer
          open={memberDrawerOpen}
          onOpenChange={(open) => {
            setMemberDrawerOpen(open);
            if (!open) setMemberDrawerTarget(null);
          }}
          type={memberDrawerTarget.type}
          targetId={memberDrawerTarget.id}
          targetName={memberDrawerTarget.name}
          onSuccess={() => {
            if (memberDrawerTarget.type === 'org') loadOrgList();
            else loadProjectList();
          }}
        />
      )}

      {projectDrawerOrg && (
        <ProjectDrawer
          open={projectDrawerOpen}
          onOpenChange={(open) => {
            setProjectDrawerOpen(open);
            if (!open) setProjectDrawerOrg(null);
          }}
          organizationId={projectDrawerOrg.id}
          organizationName={projectDrawerOrg.name}
        />
      )}
    </div>
  );
}
