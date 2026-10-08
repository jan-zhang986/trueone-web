/**
 * 用例管理页面
 * 从 aegis-next-server 迁移，整合用例、用例评审与生成流程
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  FeatureCaseList,
  CaseRepositorySpaceManager,
  FeatureCaseDetail,
  CreateSuccess,
  RecycleCaseList,
  CaseReviewList,
  CreateReview,
  ReviewDetail,
  ReviewCaseDetail,
  CaseGenerationLayout,
} from '@/components/features/case-management';
import type { CaseItem } from '@/components/features/case-management';
import { TestSuiteManager, GateBindingManager } from '@/components/features/test-asset';
import { caseManagementService, projectManagementService } from '@/services';
import { repoCaseService } from '@/services/case-management/service-repo-case';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CaseRepositoryItem } from '@/services/case-management/service-feature-case';
import { Layers3, Plus, FolderPlus, GitBranch, GitMerge, FolderGit2, Check, PackageCheck, Sparkles, ChevronDown, LayoutGrid, ArrowLeft, Globe, ExternalLink, Tag } from 'lucide-react';
import { VersionMergeDrawer } from '@/components/features/case-management/components/VersionMergeDrawer';

interface CaseManagementPageProps {
  selectedTopMenu?: string;
  searchParams?: Record<string, string | null>;
  onNavigate?: (menu: string, tab?: string, reportId?: string | null) => void;
}

export function CaseManagementPage({
  selectedTopMenu = 'feature-case',
  searchParams: propSearchParams,
  onNavigate,
}: CaseManagementPageProps) {
  const [urlSearchParams, setUrlSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const params = propSearchParams ?? Object.fromEntries(urlSearchParams.entries());
  const tab = selectedTopMenu || params.tab || 'feature-case';
  // 兼容分享链接：/#/case-management/featureCase?id=...（旧系统使用 id 作为用例ID）
  const caseId = params.caseId ?? params.id ?? null;
  const mode = params.mode ?? null;
  /** 从测试计划用例执行页跳转编辑时携带，返回时应回到该页面 */
  const fromPlanId = params.fromPlanId ?? null;
  const fromPlanCaseId = params.fromPlanCaseId ?? null;
  /** 执行页的 query（含 ?），返回时带回以保持模块/测试点过滤 */
  const fromPlanQuery = params.fromPlanQuery ?? null;
  const success = params.success === '1' || params.success === 'true';
  const recycle = params.recycle === '1' || params.recycle === 'true';
  const action = params.action ?? null;
  const reviewId = params.reviewId ?? null;
  const chatId = params.chatId ?? null;
  const firstQuery = params.firstQuery ?? null;
  const firstMentioned = params.firstMentioned ?? null;
  const firstModelId = params.firstModelId ?? null;
  const spaceId = params.spaceId ?? null;
  const projectId = params.pId ? String(params.pId) : (localStorage.getItem('currentProjectId') || 'default-project');

  const [repoItems, setRepoItems] = useState<CaseRepositoryItem[]>([
    {
      id: 'repo-demo-001',
      name: '示例用例库',
      code: 'demo-case-repo',
      defaultBranch: 'master',
      description: '系统默认示例用例库，已全量关联现存测试用例集与功能模块树',
      creator: '系统管理员 (admin)',
      createdAt: Date.now() - 86400000 * 7,
      updatedAt: Date.now() - 3600000 * 4,
      caseCount: 128,
    },
  ]);
  const [selectedRepo, setSelectedRepo] = useState(localStorage.getItem('currentCaseRepo') || '示例用例库');
  const [selectedVersion, setSelectedVersion] = useState(() => {
    const cached = localStorage.getItem('currentCaseVersion');
    if (cached === 'v1.0.0' || cached === 'v2.0.0') {
      localStorage.setItem('currentCaseVersion', 'master');
      return 'master';
    }
    return cached || 'master';
  });
  const [repoViewMode, setRepoViewMode] = useState<'detail' | 'hub'>(() => (caseId || mode ? 'detail' : 'hub'));

  // 新建版本分支 Modal 状态
  const [isCreateBranchModalOpen, setIsCreateBranchModalOpen] = useState(false);
  const [isVersionMergeOpen, setIsVersionMergeOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchBase, setNewBranchBase] = useState('master');
  const [newBranchDesc, setNewBranchDesc] = useState('');

  useEffect(() => {
    caseManagementService.getCaseRepositories(projectId, spaceId ?? undefined)
      .then((res: any) => {
        const list = Array.isArray(res) ? res : res?.data;
        if (Array.isArray(list) && list.length > 0) {
          const items: CaseRepositoryItem[] = list.map((item: any) => {
            if (typeof item === 'string') {
              return {
                id: item,
                name: item,
                defaultBranch: 'master',
                creator: 'admin',
                updatedAt: Date.now(),
              };
            }
            return {
              ...item,
              branches: (item.branches || []).filter((b: string) => b !== 'v1.0.0' && b !== 'v2.0.0'),
              creator: item.creator || item.createUser || 'admin',
              updatedAt: item.updatedAt || item.createdAt || Date.now(),
            };
          });
          setRepoItems(items);
          const names = items.map((i) => i.name);
          if (!selectedRepo || !names.includes(selectedRepo)) {
            setSelectedRepo(names[0]);
            localStorage.setItem('currentCaseRepo', names[0]);
          }
        }
      })
      .catch((err) => {
        console.warn('获取服务端用例库失败，使用静态示例用例库:', err);
      });
  }, [projectId, spaceId]);

  const repoList = useMemo(() => repoItems.map((r) => r.name), [repoItems]);

  const [projectVersions, setProjectVersions] = useState<any[]>([]);

  const fetchVersions = useCallback(async () => {
    if (!projectId) return;
    try {
      const res: any = await projectManagementService.getVersionOptions(projectId);
      const list = Array.isArray(res) ? res : res?.data || [];
      setProjectVersions(list);
    } catch (e) {
      console.warn('获取项目版本列表失败:', e);
    }
  }, [projectId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  // 当前选中的 Repo 对象
  const currentRepoObj = useMemo(() => {
    return repoItems.find((r) => r.name === selectedRepo || r.id === selectedRepo) || repoItems[0];
  }, [repoItems, selectedRepo]);

  // 选中的用例库的真实 Git 分支和 Tag 列表
  const [gitBranches, setGitBranches] = useState<string[]>([]);
  const [gitTags, setGitTags] = useState<string[]>([]);

  const fetchRepoGitBranches = useCallback(async (repoId?: string) => {
    if (!repoId) return;
    try {
      const res: any = await repoCaseService.getRepositoryBranches(repoId);
      const data = res?.data || res;
      if (data?.branches && Array.isArray(data.branches)) {
        setGitBranches(data.branches);
        if (data.tags && Array.isArray(data.tags)) {
          setGitTags(data.tags);
        }
        // 如果当前选中的版本不在分支列表里，或为空/默认master，自动对齐到仓库默认分支
        const defaultBranch = data.defaultBranch || data.branches[0] || 'main';
        setSelectedVersion((prev) => {
          if (!prev || prev === 'master' || !data.branches.includes(prev)) {
            localStorage.setItem('currentCaseVersion', defaultBranch);
            return defaultBranch;
          }
          return prev;
        });
      }
    } catch (e) {
      console.warn('获取 Git 分支失败:', e);
    }
  }, []);

  useEffect(() => {
    if (currentRepoObj?.id) {
      fetchRepoGitBranches(currentRepoObj.id);
    }
  }, [currentRepoObj?.id, fetchRepoGitBranches]);

  // 当前 Repo 与项目的分支版本列表 (优先使用真实的 Git 分支与 Tag)
  const currentBranches = useMemo(() => {
    if (gitBranches.length > 0) {
      return Array.from(new Set([...gitBranches, ...gitTags]));
    }
    const listNames = projectVersions.map((v: any) => v.name || v.id).filter(Boolean);
    const repoBranches = (currentRepoObj?.branches || []).filter((b: string) => b !== 'v1.0.0' && b !== 'v2.0.0');
    const combined = [currentRepoObj?.defaultBranch || 'main', ...listNames, ...repoBranches];
    return Array.from(new Set(combined));
  }, [gitBranches, gitTags, projectVersions, currentRepoObj]);

  const handleCreateBranchSubmit = async () => {
    const trimmed = newBranchName.trim();
    if (!trimmed) {
      toast.error('请输入分支/版本名称');
      return;
    }
    if (currentBranches.includes(trimmed)) {
      toast.error(`分支/版本「${trimmed}」已存在`);
      return;
    }

    try {
      if (currentRepoObj?.id) {
        await repoCaseService.createRepositoryBranch(currentRepoObj.id, {
          branchName: trimmed,
          baseBranch: newBranchBase || currentRepoObj.defaultBranch || 'main',
          desc: newBranchDesc,
        });
      }
      try {
        await projectManagementService.addVersion({
          projectId,
          name: trimmed,
          description: newBranchDesc || '',
          latest: false,
          status: 'open',
        });
      } catch (_) {}
      await fetchRepoGitBranches(currentRepoObj?.id);
      toast.success(`成功在 Git 仓库创建并切出新分支: ${trimmed}`);
    } catch (e: any) {
      console.error('创建版本分支失败:', e);
      toast.error(`创建版本分支失败: ${e?.message || '网络异常'}`);
    }

    setSelectedVersion(trimmed);
    localStorage.setItem('currentCaseVersion', trimmed);
    setIsCreateBranchModalOpen(false);
    setNewBranchName('');
    setNewBranchDesc('');
  };

  const handleBranchCreateForRepo = async (
    repo: CaseRepositoryItem,
    branchName: string,
    baseBranch: string,
    desc?: string
  ) => {
    const trimmed = branchName.trim();
    if (!trimmed) {
      toast.error('请输入分支名称');
      return;
    }
    const currentRepoBranches = (repo.branches || [repo.defaultBranch || 'master']).filter(
      (b) => b !== 'v1.0.0' && b !== 'v2.0.0'
    );
    if (currentRepoBranches.includes(trimmed)) {
      toast.error(`分支「${trimmed}」已存在`);
      return;
    }
    const updatedBranches = [...currentRepoBranches, trimmed];

    try {
      if (repo.id) {
        await caseManagementService.updateCaseRepository({
          id: repo.id,
          name: repo.name,
          code: repo.code,
          defaultBranch: repo.defaultBranch || 'master',
          branches: updatedBranches,
        });
      }
      await projectManagementService.addVersion({
        projectId,
        name: trimmed,
        description: desc || '',
        latest: false,
        status: 'open',
      });
      await fetchVersions();
      toast.success(`用例库「${repo.name}」成功创建分支: ${trimmed}`);
    } catch (e: any) {
      console.warn('同步服务端分支失败，使用本地状态:', e);
      toast.success(`用例库「${repo.name}」成功创建分支: ${trimmed}`);
    }

    setRepoItems((prev) =>
      prev.map((item) =>
        item.id === repo.id || item.name === repo.name
          ? { ...item, branches: updatedBranches }
          : item
      )
    );
  };

  const handleRepoChange = (repo: string) => {
    setSelectedRepo(repo);
    localStorage.setItem('currentCaseRepo', repo);
    toast.info(`已切换用例库: ${repo}`);
    setRepoViewMode('detail');
  };

  const handleVersionChange = (ver: string) => {
    setSelectedVersion(ver);
    localStorage.setItem('currentCaseVersion', ver);
    toast.info(`已切换版本基线: ${ver}`);
  };

  const handleCreateRepoSubmit = async (data: {
    name: string;
    code?: string;
    description?: string;
    defaultBranch?: string;
    creator?: string;
    gitUrl?: string;
    gitPlatform?: string;
    testsDir?: string;
    localPath?: string;
  }) => {
    const trimmed = data.name.trim();
    if (!trimmed) {
      toast.error('请输入用例库名称');
      return;
    }

    try {
      const created = await caseManagementService.createCaseRepository({
        name: trimmed,
        code: data.code,
        description: data.description,
        defaultBranch: data.defaultBranch || 'main',
        creator: data.creator || 'admin',
        gitUrl: data.gitUrl,
        gitPlatform: data.gitPlatform,
        testsDir: data.testsDir || 'tests',
        localPath: data.localPath,
      });

      const newItem: CaseRepositoryItem = {
        id: (created as any)?.id || `repo-${Date.now()}`,
        name: trimmed,
        code: data.code || `code-${Date.now() % 10000}`,
        defaultBranch: data.defaultBranch || 'main',
        description: data.description || '新建功能业务用例库',
        creator: data.creator || 'admin',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        caseCount: (created as any)?.caseCount || 0,
        gitUrl: data.gitUrl,
        gitPlatform: data.gitPlatform,
        testsDir: data.testsDir || 'tests',
        branches: ['main', 'master'],
      };

      setRepoItems((prev) => {
        const filtered = prev.filter((item) => item.name !== trimmed);
        return [newItem, ...filtered];
      });

      setSelectedRepo(trimmed);
      localStorage.setItem('currentCaseRepo', trimmed);
      toast.success(`成功创建并绑定 Git 用例库: ${trimmed}`);
      setRepoViewMode('detail');
    } catch (err: any) {
      console.error(err);
      const newItem: CaseRepositoryItem = {
        id: `repo-${Date.now()}`,
        name: trimmed,
        code: data.code || `code-${Date.now() % 10000}`,
        defaultBranch: data.defaultBranch || 'main',
        description: data.description || '新建功能业务用例库',
        creator: data.creator || 'admin',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        caseCount: 0,
        gitUrl: data.gitUrl,
        gitPlatform: data.gitPlatform,
        testsDir: data.testsDir || 'tests',
      };
      setRepoItems((prev) => [newItem, ...prev.filter((i) => i.name !== trimmed)]);
      setSelectedRepo(trimmed);
      localStorage.setItem('currentCaseRepo', trimmed);
      toast.success(`成功创建用例库: ${trimmed}`);
      setRepoViewMode('detail');
    }
  };

  const handleUpdateRepoSubmit = async (data: {
    id: string;
    name: string;
    code?: string;
    description?: string;
    defaultBranch?: string;
    branches?: string[];
    gitUrl?: string;
    gitPlatform?: string;
    testsDir?: string;
  }) => {
    const trimmed = data.name.trim();
    if (!trimmed) {
      toast.error('请输入用例库名称');
      return;
    }

    try {
      await caseManagementService.updateCaseRepository({
        id: data.id,
        name: trimmed,
        code: data.code,
        description: data.description,
        defaultBranch: data.defaultBranch || 'main',
        gitUrl: data.gitUrl,
        gitPlatform: data.gitPlatform,
        testsDir: data.testsDir || 'tests',
      });

      setRepoItems((prev) =>
        prev.map((item) =>
          item.id === data.id
            ? {
                ...item,
                name: trimmed,
                code: data.code || item.code,
                description: data.description ?? item.description,
                defaultBranch: data.defaultBranch || item.defaultBranch,
                gitUrl: data.gitUrl !== undefined ? data.gitUrl : item.gitUrl,
                testsDir: data.testsDir !== undefined ? data.testsDir : item.testsDir,
                updatedAt: Date.now(),
              }
            : item
        )
      );

      if (selectedRepo === data.id || repoItems.find((r) => r.id === data.id)?.name === selectedRepo) {
        setSelectedRepo(trimmed);
        localStorage.setItem('currentCaseRepo', trimmed);
      }
      toast.success(`成功更新用例库: ${trimmed}`);
    } catch (err: any) {
      console.error(err);
      toast.error('更新用例库配置失败');
    }
  };

  const handleDeleteRepoSubmit = async (repo: CaseRepositoryItem) => {
    try {
      await caseManagementService.deleteCaseRepository(repo.id);

      setRepoItems((prev) => prev.filter((item) => item.id !== repo.id && item.name !== repo.name));

      if (selectedRepo === repo.name || selectedRepo === repo.id) {
        const remaining = repoItems.filter((i) => i.id !== repo.id && i.name !== repo.name);
        const nextRepo = remaining.length > 0 ? remaining[0].name : '示例用例库';
        setSelectedRepo(nextRepo);
        localStorage.setItem('currentCaseRepo', nextRepo);
      }
      toast.success(`已成功删除用例库: ${repo.name}`);
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes('条测试用例')) {
        toast.error(err.message);
      } else {
        setRepoItems((prev) => prev.filter((item) => item.id !== repo.id && item.name !== repo.name));
        toast.success(`已成功删除用例库: ${repo.name}`);
      }
    }
  };

  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(urlSearchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v == null || v === '') next.delete(k);
      else next.set(k, v);
    });
    setUrlSearchParams(next, { replace: true });
  };

  const currentMenu = params.menu || 'test-case';
  const goToFeatureCase = () => {
    // 只清除用例/模式，保留 moduleId 以便返回后停留在原目录；保留 keyword 和 filter 以便恢复搜索状态
    updateParams({ caseId: null, mode: null, success: null, recycle: null });
    // 不调用 onNavigate：父级 updateUrl 会用旧的 searchParams 重新 navigate，把刚清除的 caseId/mode 又写回 URL，导致返回不生效
  };

  const goToRecycle = () => {
    updateParams({ caseId: null, mode: null, success: null, recycle: '1' });
  };

  /** 进入详情/编辑/新建；moduleId 写入 URL，返回列表时恢复该目录 */
  const goToCaseDetail = (id?: string | null, m: 'add' | 'edit' | 'copy' = 'add', moduleId?: string | null) => {
    const updates: Record<string, string | null> = { caseId: id || null, mode: m, success: null, recycle: null };
    if (moduleId != null && moduleId !== '') updates.moduleId = moduleId;
    updateParams(updates);
  };

  const goToCreateSuccess = (id: string, name: string) => {
    updateParams({ caseId: id, caseName: name, mode: null, success: '1', recycle: null });
  };

  const goToCaseReview = () => {
    updateParams({ action: null, reviewId: null, caseId: null });
    // 已在用例评审 tab 时不再调用 onNavigate，避免父级 updateUrl 覆盖掉已清除的 action
    if (tab !== 'case-review') {
      onNavigate?.(currentMenu, 'case-review');
    }
  };

  const goToCreateReview = (moduleId?: string) => {
    updateParams({ action: 'create', reviewId: null, caseId: null, moduleId: moduleId ?? null, success: null });
    // 若已在用例评审 tab，不再调用 onNavigate，避免父级 updateUrl 覆盖掉 action=create
    if (tab !== 'case-review') {
      onNavigate?.(currentMenu, 'case-review');
    }
  };

  const goToEditReview = (id: string) => {
    updateParams({ action: 'edit', reviewId: id, caseId: null });
  };

  const goToReviewDetail = (id: string) => {
    updateParams({ reviewId: id, caseId: null, action: null });
  };

  const goToReviewCaseDetail = (rId: string, cId: string, moduleId?: string) => {
    updateParams({ reviewId: rId, caseId: cId, moduleId: moduleId ?? null });
  };
  if (tab === 'test-suite') {
    return <TestSuiteManager projectId={projectId} spaceId={spaceId || undefined} />;
  }

  if (tab === 'gate-binding') {
    return <GateBindingManager projectId={projectId} spaceId={spaceId || undefined} />;
  }

  // 用例
  if (tab === 'feature-case') {
    if (recycle) {
      return (
        <RecycleCaseList
          projectId={projectId}
          onBack={goToFeatureCase}
        />
      );
    }
    if (success && caseId) {
      return (
        <CreateSuccess
          caseId={caseId}
          caseName={params.caseName ?? undefined}
          onBackToList={goToFeatureCase}
          onEditCase={() => goToCaseDetail(caseId, 'edit')}
          onContinueCreate={() => goToCaseDetail(null, 'add')}
          onCreateCaseReview={goToCreateReview}
        />
      );
    }
    if ((mode === 'add' || mode === 'edit' || mode === 'copy') && (mode === 'add' || caseId)) {
      const backFromEdit = fromPlanId && fromPlanCaseId
        ? () => {
            const queryPart = fromPlanQuery ? decodeURIComponent(fromPlanQuery) : '';
            navigate(`/test-plan/${fromPlanId}/feature-case/${fromPlanCaseId}${queryPart}`);
          }
        : goToFeatureCase;
      return (
        <FeatureCaseDetail
          mode={mode as 'add' | 'edit' | 'copy'}
          caseId={mode !== 'add' ? caseId ?? undefined : undefined}
          projectId={projectId}
          spaceId={spaceId ?? undefined}
          initialModuleId={mode === 'add' ? (params.moduleId ?? undefined) : undefined}
          onBack={backFromEdit}
          onSuccess={(id, name) => {
            if (mode === 'add' || mode === 'copy') {
              updateParams({ caseName: name });
              goToCreateSuccess(id, name);
            } else {
              if (fromPlanId && fromPlanCaseId) {
                const queryPart = fromPlanQuery ? decodeURIComponent(fromPlanQuery) : '';
                navigate(`/test-plan/${fromPlanId}/feature-case/${fromPlanCaseId}${queryPart}`);
              } else {
                goToFeatureCase();
              }
            }
          }}
        />
      );
    }

    if (repoViewMode === 'hub') {
      return (
        <CaseRepositorySpaceManager
          repoList={repoItems}
          selectedRepo={selectedRepo}
          onSelectRepo={handleRepoChange}
          onCreateRepoSubmit={handleCreateRepoSubmit}
          onUpdateRepoSubmit={handleUpdateRepoSubmit}
          onDeleteRepoSubmit={handleDeleteRepoSubmit}
          onCreateBranchSubmit={handleBranchCreateForRepo}
        />
      );
    }

    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50">
        {/* 参考空间/项目选择器的标准 AegisOne 风格顶栏 */}
        <div className="bg-white border-b border-gray-200 px-6 py-2 shrink-0 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-4">
            {/* 返回用例库列表按钮 */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRepoViewMode('hub')}
              className="h-8 gap-1.5 border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-blue-50/80 hover:border-blue-200 transition-colors shadow-2xs font-medium text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>返回用例库列表</span>
            </Button>

            <div className="h-4 w-px bg-gray-200" />

            {/* 当前用例库 Dropdown 选择器 */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">当前用例库:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    title="点击切换当前代码用例库"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-md transition-all cursor-pointer shadow-2xs"
                  >
                    <FolderGit2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>{selectedRepo}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel className="text-xs text-gray-500 font-semibold">
                    切换用例库 ({repoItems.length})
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {repoItems.map((r) => (
                    <DropdownMenuItem
                      key={r.id || r.name}
                      onClick={() => handleRepoChange(r.name)}
                      className={`flex items-center justify-between text-xs cursor-pointer ${
                        selectedRepo === r.name ? 'bg-blue-50 text-blue-700 font-bold' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FolderGit2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>{r.name}</span>
                      </div>
                      {selectedRepo === r.name && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setRepoViewMode('hub')}
                    className="text-xs text-blue-600 font-medium cursor-pointer flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>管理与关联新用例库...</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {currentRepoObj?.gitUrl && (
                <a
                  href={currentRepoObj.gitUrl.replace(/\.git$/, '')}
                  target="_blank"
                  rel="noreferrer"
                  title={`绑定的 Git 仓库: ${currentRepoObj.gitUrl}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-md transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="max-w-[200px] truncate">{currentRepoObj.gitUrl.replace(/^https?:\/\//, '')}</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              )}
            </div>

            <div className="h-4 w-px bg-gray-200" />

            {/* 版本基线 Dropdown 选择器 (同空间选择器) */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">版本基线:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md transition-colors shadow-2xs">
                    <GitBranch className="w-4 h-4 text-emerald-600" />
                    <span>{selectedVersion}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel className="text-xs text-gray-500 font-semibold flex items-center justify-between">
                    <span>Git 分支与基线 Tag ({currentBranches.length})</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {currentBranches.map((ver) => (
                    <DropdownMenuItem
                      key={ver}
                      onClick={() => handleVersionChange(ver)}
                      className={`flex items-center justify-between text-sm ${
                        selectedVersion === ver ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {gitTags.includes(ver) ? (
                          <Tag className="w-3.5 h-3.5 text-amber-600" />
                        ) : (
                          <GitBranch className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        <span>
                          {ver}{' '}
                          {ver === currentRepoObj?.defaultBranch
                            ? '(默认主干)'
                            : gitTags.includes(ver)
                            ? '(Release Tag)'
                            : '(Git 分支)'}
                        </span>
                      </span>
                      {selectedVersion === ver && <Check className="w-4 h-4 text-blue-600" />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setNewBranchBase(selectedVersion || currentRepoObj?.defaultBranch || 'main');
                      setIsCreateBranchModalOpen(true);
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-600" />
                    <span>新建版本分支 / Tag 快照...</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setIsVersionMergeOpen(true);
                    }}
                    className="text-xs font-semibold text-purple-600 hover:text-purple-700 hover:bg-purple-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <GitMerge className="w-3.5 h-3.5 text-purple-600" />
                    <span>合并分支 / 增量同步到 Master...</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-200/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              当前运行环境: {selectedVersion === 'master' ? 'Master 主干测试机' : `基线快照 ${selectedVersion}`}
            </span>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <FeatureCaseList
            projectId={params.pId ? String(params.pId) : projectId}
            spaceId={spaceId ?? undefined}
            repositoryId={selectedRepo}
            versionId={selectedVersion}
            initialCaseId={caseId}
            initialSelectedModuleId={params.moduleId ?? undefined}
            onViewCase={(item: CaseItem, selectedModuleId?: string) => {
              const updates: Record<string, string | null> = { caseId: item.id, mode: null, success: null, recycle: null };
              if (selectedModuleId != null && selectedModuleId !== '') updates.moduleId = selectedModuleId;
              updateParams(updates);
            }}
            onEditCase={(item: CaseItem, selectedModuleId?: string) => goToCaseDetail(item.id, 'edit', selectedModuleId)}
            onCopyCase={(item: CaseItem, selectedModuleId?: string) => goToCaseDetail(item.id, 'copy', selectedModuleId)}
            onCreateCase={(selectedModuleId?: string) => goToCaseDetail(null, 'add', selectedModuleId)}
            onNavigateToRecycle={goToRecycle}
            onAiGenerate={() => onNavigate?.(currentMenu, 'case-generation')}
          />
        </div>
      </div>
    );
  }

  // 用例生成（RAG Chat）- 侧边栏 + 主区域，参考 aegis-rag-frontend
  if (tab === 'case-generation') {
    const handleChatIdChange = (id: string | null) => {
      const next = new URLSearchParams(urlSearchParams);
      if (id == null || id === '') {
        next.delete('chatId');
        next.delete('firstQuery');
        next.delete('firstMentioned');
        next.delete('firstModelId');
      } else {
        next.set('chatId', id);
        next.delete('firstQuery');
        next.delete('firstMentioned');
        next.delete('firstModelId');
      }
      const path = location.pathname || '/';
      navigate(`${path}?${next.toString()}`, { replace: true });
    };
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
        <CaseGenerationLayout
          projectId={projectId}
          spaceId={spaceId ?? undefined}
          chatId={chatId}
          firstQuery={firstQuery}
          firstMentionedItems={
            firstMentioned ? (() => {
              try {
                return JSON.parse(decodeURIComponent(firstMentioned));
              } catch {
                return null;
              }
            })() : null
          }
          firstModelId={firstModelId}
          onChatIdChange={handleChatIdChange}
          onParamsClear={() =>
            updateParams({ firstQuery: null, firstMentioned: null, firstModelId: null })
          }
        />
      </div>
    );
  }

  // 用例评审
  if (tab === 'case-review') {
    if (reviewId && caseId) {
      return (
        <ReviewCaseDetail
          reviewId={reviewId}
          caseId={caseId}
          projectId={projectId}
          filterModuleId={params.moduleId ?? undefined}
          onBack={() => goToReviewDetail(reviewId)}
          onSelectCase={(newCaseId) => updateParams({ caseId: newCaseId })}
        />
      );
    }
    if (reviewId) {
      const editSheetOpen = action === 'edit';
      return (
        <>
          <ReviewDetail
            reviewId={reviewId}
            projectId={projectId}
            initialModuleId={params.moduleId ?? undefined}
            onBack={goToCaseReview}
            onViewCase={(cId, mId) => goToReviewCaseDetail(reviewId, cId, mId)}
            onEditReview={(id) => updateParams({ action: 'edit', reviewId: id })}
          />
          <Sheet
            open={editSheetOpen}
            onOpenChange={(open) => { if (!open) updateParams({ action: null }); }}
          >
            <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0 pt-14">
              <CreateReview
                projectId={projectId}
                moduleId={params.moduleId ?? undefined}
                reviewId={params.reviewId ?? undefined}
                onBack={() => updateParams({ action: null })}
                onSuccess={(id) => { updateParams({ action: null }); goToReviewDetail(id); }}
                inDrawer
              />
            </SheetContent>
          </Sheet>
        </>
      );
    }
    const createOrEditOpen = action === 'create' || action === 'edit';
    return (
      <>
        <CaseReviewList
          projectId={projectId}
          onCreateReview={goToCreateReview}
          onViewReview={goToReviewDetail}
          onEditReview={goToEditReview}
        />
        <Sheet open={createOrEditOpen} onOpenChange={(open) => { if (!open) goToCaseReview(); }}>
          <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0 pt-14">
            <CreateReview
              projectId={projectId}
              moduleId={params.moduleId ?? undefined}
              reviewId={action === 'edit' ? (params.reviewId ?? undefined) : undefined}
              onBack={goToCaseReview}
              onSuccess={(id) => { goToCaseReview(); goToReviewDetail(id); }}
              inDrawer
            />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // 默认显示用例
  return (
    <>
      <FeatureCaseList
        projectId={projectId}
        spaceId={spaceId ?? undefined}
        versionId={selectedVersion}
        onVersionChange={handleVersionChange}
        initialSelectedModuleId={params.moduleId ?? undefined}
        onViewCase={(item, selectedModuleId) => {
          const updates: Record<string, string | null> = { caseId: item.id, mode: null, success: null, recycle: null };
          if (selectedModuleId != null && selectedModuleId !== '') updates.moduleId = selectedModuleId;
          updateParams(updates);
        }}
        onEditCase={(item, selectedModuleId) => goToCaseDetail(item.id, 'edit', selectedModuleId)}
        onCreateCase={(selectedModuleId) => goToCaseDetail(null, 'add', selectedModuleId)}
        onNavigateToRecycle={goToRecycle}
        onAiGenerate={() => onNavigate?.(currentMenu, 'case-generation')}
      />

      {/* 新建版本分支 / Tag 快照 Modal */}
      <Dialog open={isCreateBranchModalOpen} onOpenChange={setIsCreateBranchModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
              <GitBranch className="w-5 h-5 text-emerald-600" />
              新建版本分支 / 基线 Tag
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              切出独立版本分支后，在该分支下的用例修改不会影响主干 `master` 和其他分支。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="space-y-1.5">
              <Label htmlFor="branch-name" className="text-xs font-semibold text-slate-700">
                版本分支名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="branch-name"
                placeholder="例如: v2.1.0 或 feature/user-auth"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branch-base" className="text-xs font-semibold text-slate-700">
                基于来源分支 (Base)
              </Label>
              <Input
                id="branch-base"
                value={newBranchBase}
                disabled
                className="h-9 text-xs bg-slate-50 text-slate-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branch-desc" className="text-xs font-semibold text-slate-700">
                版本分支描述 (可选)
              </Label>
              <Input
                id="branch-desc"
                placeholder="请输入该版本分支的迭代目标或描述"
                value={newBranchDesc}
                onChange={(e) => setNewBranchDesc(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateBranchModalOpen(false)}
              className="h-8 text-xs"
            >
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleCreateBranchSubmit}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              创建并切换分支
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 版本比对与合并 Drawer */}
      <VersionMergeDrawer
        open={isVersionMergeOpen}
        onOpenChange={setIsVersionMergeOpen}
        projectId={projectId}
        availableBranches={currentBranches}
        onSuccess={() => {
          toast.success('版本用例合并成功！');
        }}
      />
    </>
  );
}
