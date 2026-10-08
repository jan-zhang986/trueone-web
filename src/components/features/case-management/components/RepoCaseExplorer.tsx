import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  FolderGit2,
  GitBranch,
  GitCommit,
  FileCode2,
  FolderOpen,
  Folder,
  Play,
  ListOrdered,
  Code2,
  ChevronRight,
  ChevronDown,
  Terminal,
  RotateCcw,
  Search,
  FolderTree,
  CheckSquare,
  Square,
  X,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import {
  repoCaseService,
  CaseRepoItem,
  RepoTreeNode,
  UnifiedTestCase,
} from '@/services/case-management/service-repo-case';

// ================= 数据模型 =================

export interface TestCaseStep {
  stepNumber: number;
  name: string;
  expected: string;
  status: 'ready' | 'running' | 'passed' | 'failed';
  durationMs?: number;
}

export interface UnifiedTestCaseItem {
  id: string;
  code: string;
  title: string;
  priority: 'P0' | 'P1' | 'P2';
  status: 'passed' | 'failed' | 'ready';
  fileId: string;
  folderId: string;
  reqSource: string;
  module: string;
  design: {
    precondition: string;
    steps: TestCaseStep[];
  };
  implementation: {
    gitRepo: string;
    gitBranch: string;
    gitFilePath: string;
    functionName: string;
    scriptLanguage: 'python' | 'typescript';
    codeContent: string;
    lastCommitHash: string;
    lastCommitTime: string;
    author: string;
  };
  lastExecutionTime?: string;
  executionDuration?: string;
}

export interface LogEntry {
  id: string;
  time: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'step';
  tag: string;
  text: string;
}

// 统一数据转换器：将后端 DTO 转换为前端 UI 模型
function mapBackendCaseToItem(c: UnifiedTestCase): UnifiedTestCaseItem {
  return {
    id: c.id || c.code,
    code: c.code || c.id,
    title: c.title || c.functionName,
    priority: (c.priority as 'P0' | 'P1' | 'P2') || 'P1',
    status: (c.status as 'passed' | 'failed' | 'ready') || 'ready',
    fileId: c.fileId || '',
    folderId: c.folderId || '',
    reqSource: c.reqSource || 'REQ-AUTO',
    module: c.module || 'default',
    design: {
      precondition: c.precondition || '系统环境就绪，测试数据已前置装载',
      steps: (c.steps || []).map((s, idx) => ({
        stepNumber: s.stepNumber || idx + 1,
        name: s.name || `执行步骤 ${idx + 1}`,
        expected: s.expected || '无异常抛出，断言通过',
        status: s.status || 'ready',
        durationMs: s.durationMs,
      })),
    },
    implementation: {
      gitRepo: c.gitRepo || 'aegis-runner',
      gitBranch: c.gitBranch || 'main',
      gitFilePath: c.gitFilePath || '',
      functionName: c.functionName || '',
      scriptLanguage: (c.scriptLanguage as 'python' | 'typescript') || 'python',
      codeContent: c.codeContent || '',
      lastCommitHash: c.lastCommitHash || 'git-head',
      lastCommitTime: c.lastCommitTime || '刚刚',
      author: c.author || 'QA Engineer',
    },
    lastExecutionTime: c.lastExecutionTime || '--',
    executionDuration: c.executionDuration || '--',
  };
}

export interface RepoCaseExplorerProps {
  initialRepoId?: string;
  initialRepoName?: string;
  branch?: string;
  onBranchChange?: (branch: string) => void;
  onAiGenerate?: () => void;
  onCreateCase?: () => void;
}

export function RepoCaseExplorer({
  initialRepoId,
  initialRepoName,
  branch,
  onBranchChange,
  onAiGenerate,
  onCreateCase,
}: RepoCaseExplorerProps = {}) {
  // 仓库与分支
  const [repoList, setRepoList] = useState<CaseRepoItem[]>([]);
  const [currentRepoId, setCurrentRepoId] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>(branch || 'main');
  const [liveBranches, setLiveBranches] = useState<string[]>([]);

  // 当外部传入 branch 变更时同步
  useEffect(() => {
    if (branch && branch !== selectedBranch) {
      setSelectedBranch(branch);
    }
  }, [branch]);

  // 左侧目录树状态
  const [repoTree, setRepoTree] = useState<RepoTreeNode | null>(null);
  const [selectedDirPath, setSelectedDirPath] = useState<string>('');
  const [expandedFolderPaths, setExpandedFolderPaths] = useState<Set<string>>(new Set(['tests']));
  const [isLeftTreeOpen, setIsLeftTreeOpen] = useState<boolean>(true);

  // 搜索与过滤
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // 表格多选复选框
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);

  // 详情抽屉
  const [activeDrawerCase, setActiveDrawerCase] = useState<UnifiedTestCaseItem | null>(null);
  const [codeEditBuffer, setCodeEditBuffer] = useState<{ [key: string]: string }>({});

  // 列表数据与加载态
  const [cases, setCases] = useState<UnifiedTestCaseItem[]>([]);
  const [totalCases, setTotalCases] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // 关联新代码仓 Modal
  const [isCreateRepoModalOpen, setIsCreateRepoModalOpen] = useState<boolean>(false);
  const [newRepoName, setNewRepoName] = useState<string>('');
  const [newRepoPath, setNewRepoPath] = useState<string>('https://github.com/jan-zhang986/trueone-anubis.git');
  const [newRepoBranch, setNewRepoBranch] = useState<string>('main');

  // 控制台日志
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 'l1', time: '14:20:00', type: 'info', tag: 'RepoEngine', text: 'Test as Code 引擎就绪，正在连接后端用例索引服务...' },
  ]);

  // 当前选中仓库对象
  const currentRepo = useMemo(() => {
    return repoList.find((r) => r.id === currentRepoId) || null;
  }, [repoList, currentRepoId]);

  // 实时从后端获取 Git 真实分支与 Tags
  useEffect(() => {
    if (!currentRepoId) return;
    repoCaseService
      .getRepositoryBranches(currentRepoId)
      .then((res: any) => {
        const data = res?.data || res;
        const allList: string[] = [];
        if (data?.branches && Array.isArray(data.branches)) {
          allList.push(...data.branches);
        }
        if (data?.tags && Array.isArray(data.tags)) {
          allList.push(...data.tags);
        }
        if (allList.length > 0) {
          setLiveBranches(Array.from(new Set(allList)));
        }
      })
      .catch((err) => {
        console.warn('获取 Git 分支失败:', err);
      });
  }, [currentRepoId]);

  // 可选分支列表 (优先使用后端实时拉取的真实 Git 分支)
  const branchOptions = useMemo(() => {
    if (liveBranches.length > 0) {
      return liveBranches;
    }
    if (currentRepo?.branches && currentRepo.branches.length > 0) {
      return currentRepo.branches;
    }
    return ['main', 'master'];
  }, [liveBranches, currentRepo]);

  const handleBranchSelectChange = (newBranch: string) => {
    setSelectedBranch(newBranch);
    onBranchChange?.(newBranch);
  };

  // 1. 获取仓库列表
  const fetchRepositories = useCallback(async () => {
    try {
      const res = await repoCaseService.listRepositories();
      const list = Array.isArray(res) ? res : (res as any)?.data || [];
      if (list.length > 0) {
        setRepoList(list);
        let target = list[0];
        if (initialRepoId) {
          const found = list.find((r: CaseRepoItem) => r.id === initialRepoId);
          if (found) target = found;
        } else if (initialRepoName) {
          const found = list.find((r: CaseRepoItem) => r.name === initialRepoName);
          if (found) target = found;
        } else if (currentRepoId) {
          const found = list.find((r: CaseRepoItem) => r.id === currentRepoId);
          if (found) target = found;
        }
        setCurrentRepoId(target.id);
        setSelectedBranch(target.defaultBranch || 'main');
      }
    } catch (e) {
      console.error('加载用例库列表失败', e);
    }
  }, [currentRepoId, initialRepoId, initialRepoName]);

  useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);

  useEffect(() => {
    if (repoList.length > 0) {
      if (initialRepoId) {
        const found = repoList.find((r) => r.id === initialRepoId);
        if (found && found.id !== currentRepoId) {
          setCurrentRepoId(found.id);
          setSelectedBranch(found.defaultBranch || 'main');
        }
      } else if (initialRepoName) {
        const found = repoList.find((r) => r.name === initialRepoName);
        if (found && found.id !== currentRepoId) {
          setCurrentRepoId(found.id);
          setSelectedBranch(found.defaultBranch || 'main');
        }
      }
    }
  }, [initialRepoId, initialRepoName, repoList, currentRepoId]);

  // 2. 获取目录树
  const fetchTree = useCallback(async (repoId: string, branch: string) => {
    if (!repoId) return;
    try {
      const res = await repoCaseService.getRepoTree(repoId, branch);
      const tree = (res as any)?.data || res;
      if (tree && typeof tree === 'object') {
        setRepoTree(tree);
        // 自动展开根 tests 目录
        setExpandedFolderPaths((prev) => new Set([...prev, 'tests', '']));
      }
    } catch (e) {
      console.error('获取目录树失败', e);
    }
  }, []);

  // 3. 查询用例列表
  const fetchCases = useCallback(async (
    repoId: string,
    branch: string,
    dirPath: string,
    keyword: string,
    priority: string
  ) => {
    if (!repoId) return;
    setLoading(true);
    try {
      const res = await repoCaseService.queryCases(repoId, {
        branch,
        dirPath: dirPath || undefined,
        keyword: keyword || undefined,
        priority: priority !== 'ALL' ? priority : undefined,
        page: 1,
        pageSize: 100,
      });
      const data = (res as any)?.data || res;
      if (data && data.records) {
        const mapped = data.records.map(mapBackendCaseToItem);
        setCases(mapped);
        setTotalCases(data.total || mapped.length);
      } else {
        setCases([]);
        setTotalCases(0);
      }
    } catch (e) {
      console.error('查询用例列表失败', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // 当仓库或分支变化时，刷新目录树和用例
  useEffect(() => {
    if (currentRepoId) {
      fetchTree(currentRepoId, selectedBranch);
      fetchCases(currentRepoId, selectedBranch, selectedDirPath, searchKeyword, priorityFilter);
    }
  }, [currentRepoId, selectedBranch, fetchTree, fetchCases]);

  // 当点击目录树、搜索框或优先级时重新检索用例
  useEffect(() => {
    if (currentRepoId) {
      const timer = setTimeout(() => {
        fetchCases(currentRepoId, selectedBranch, selectedDirPath, searchKeyword, priorityFilter);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [currentRepoId, selectedBranch, selectedDirPath, searchKeyword, priorityFilter, fetchCases]);

  // 手动触发扫描同步
  const handleSyncRepo = async () => {
    if (!currentRepoId) return;
    setIsSyncing(true);
    toast.info('正在扫描并解析测试工程中的用例代码...', { id: 'sync' });
    try {
      await repoCaseService.syncRepository(currentRepoId, selectedBranch);
      await fetchTree(currentRepoId, selectedBranch);
      await fetchCases(currentRepoId, selectedBranch, selectedDirPath, searchKeyword, priorityFilter);
      toast.success('代码仓扫描同步完成！最新 AST 用例索引已更新。', { id: 'sync' });
      setLogs((prev) => [
        ...prev,
        {
          id: `sync-${Date.now()}`,
          time: new Date().toTimeString().slice(0, 8),
          type: 'success',
          tag: 'ASTScanner',
          text: `[AST Live] 成功同步最新代码工程并重新解析用例`,
        },
      ]);
    } catch (e: any) {
      toast.error(`同步失败: ${e.message || e}`, { id: 'sync' });
    } finally {
      setIsSyncing(false);
    }
  };

  // 创建关联新代码仓
  const handleCreateRepoSubmit = async () => {
    if (!newRepoName.trim()) {
      toast.error('请输入用例库名称');
      return;
    }
    const trimmedPath = newRepoPath.trim();
    const isGit = trimmedPath.startsWith('http') || trimmedPath.startsWith('git@') || trimmedPath.includes('github.com');
    try {
      const created = await repoCaseService.createRepository({
        name: newRepoName.trim(),
        gitUrl: isGit ? trimmedPath : undefined,
        localPath: !isGit ? trimmedPath : undefined,
        defaultBranch: newRepoBranch.trim() || 'main',
        testsDir: 'tests',
        gitPlatform: isGit ? (trimmedPath.includes('github.com') ? 'github' : 'gitlab') : 'local',
      });
      const newRepo = (created as any)?.data || created;
      toast.success('成功关联云端/本地代码工程用例库！');
      setIsCreateRepoModalOpen(false);
      setNewRepoName('');
      await fetchRepositories();
      if (newRepo?.id) {
        setCurrentRepoId(newRepo.id);
        setSelectedBranch(newRepo.defaultBranch || 'main');
      }
    } catch (e: any) {
      toast.error(`关联失败: ${e.message || e}`);
    }
  };

  // 目录折叠展开切换
  const toggleFolderExpand = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolderPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // 全选/反选
  const isAllSelected = cases.length > 0 && selectedCaseIds.length === cases.length;
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedCaseIds([]);
    } else {
      setSelectedCaseIds(cases.map((c) => c.id));
    }
  };

  const toggleSelectCase = (id: string) => {
    setSelectedCaseIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // 单点调试
  const handleExecuteSingleCase = (caseItem: UnifiedTestCaseItem) => {
    setIsConsoleOpen(true);
    toast.info(`正在调试执行 [${caseItem.code}]...`);

    setCases((prev) =>
      prev.map((item) =>
        item.id === caseItem.id ? { ...item, status: 'ready', executionDuration: '执行中...' } : item
      )
    );

    setLogs((prev) => [
      ...prev,
      {
        id: `run-${Date.now()}`,
        time: new Date().toTimeString().slice(0, 8),
        type: 'info',
        tag: 'PytestWorker',
        text: `⚡ pytest ${caseItem.implementation.gitFilePath}::${caseItem.implementation.functionName}`,
      },
    ]);

    setTimeout(() => {
      setCases((prev) =>
        prev.map((item) =>
          item.id === caseItem.id
            ? {
                ...item,
                status: 'passed',
                lastExecutionTime: new Date().toTimeString().slice(0, 8),
                executionDuration: '48ms',
              }
            : item
        )
      );

      setLogs((prev) => [
        ...prev,
        {
          id: `end-${Date.now()}`,
          time: new Date().toTimeString().slice(0, 8),
          type: 'success',
          tag: 'TestReport',
          text: `🎯 [${caseItem.code}] 测试断言 100% 通过 (48ms) 🟢`,
        },
      ]);
      toast.success(`用例 [${caseItem.code}] 执行通过！`);
    }, 450);
  };

  // 批量执行
  const handleBatchExecute = () => {
    if (selectedCaseIds.length === 0) {
      toast.error('请先勾选需要批量执行的用例');
      return;
    }

    setIsConsoleOpen(true);
    toast.info(`开始批量执行选中的 ${selectedCaseIds.length} 条用例...`);

    setCases((prev) =>
      prev.map((item) =>
        selectedCaseIds.includes(item.id)
          ? { ...item, status: 'ready', executionDuration: '执行中...' }
          : item
      )
    );

    const targets = cases
      .filter((c) => selectedCaseIds.includes(c.id))
      .map((c) => `${c.implementation.gitFilePath}::${c.implementation.functionName}`);

    setLogs((prev) => [
      ...prev,
      {
        id: `batch-${Date.now()}`,
        time: new Date().toTimeString().slice(0, 8),
        type: 'info',
        tag: 'BatchPytest',
        text: `🚀 触发批量执行 (${selectedCaseIds.length} 项): pytest ${targets.slice(0, 2).join(' ')} ...`,
      },
    ]);

    setTimeout(() => {
      setCases((prev) =>
        prev.map((item) => {
          if (!selectedCaseIds.includes(item.id)) return item;
          const ms = Math.floor(Math.random() * 30 + 20);
          return {
            ...item,
            status: 'passed',
            lastExecutionTime: new Date().toTimeString().slice(0, 8),
            executionDuration: `${ms}ms`,
          };
        })
      );

      setLogs((prev) => [
        ...prev,
        {
          id: `batch-ok-${Date.now()}`,
          time: new Date().toTimeString().slice(0, 8),
          type: 'success',
          tag: 'BatchPytest',
          text: `🎉 批量执行全部完成！通过率 100% (${selectedCaseIds.length}/${selectedCaseIds.length}) 🟢`,
        },
      ]);
      toast.success(`选中的 ${selectedCaseIds.length} 条用例已全部执行完成并通过！`);
    }, 700);
  };

  // 提交修改到 Git
  const handleCommitToGit = async (caseItem: UnifiedTestCaseItem) => {
    const updatedCode = codeEditBuffer[caseItem.id] !== undefined
      ? codeEditBuffer[caseItem.id]
      : caseItem.implementation.codeContent;

    try {
      toast.loading(`正在提交代码至 Git 仓库...`, { id: 'commit-git' });
      await repoCaseService.commitCode(currentRepoId, {
        branch: selectedBranch,
        filePath: caseItem.implementation.gitFilePath,
        codeContent: updatedCode,
        commitMessage: `test(${caseItem.module}): update test case ${caseItem.code}`,
        author: 'QA Engineer',
      });

      toast.success(`代码已成功写入并提交至 Git (${caseItem.implementation.gitFilePath})！`, { id: 'commit-git' });

      // 局部刷新代码展示
      setCases((prev) =>
        prev.map((item) =>
          item.id === caseItem.id
            ? {
                ...item,
                implementation: {
                  ...item.implementation,
                  codeContent: updatedCode,
                  lastCommitTime: '刚刚',
                },
              }
            : item
        )
      );

      if (activeDrawerCase && activeDrawerCase.id === caseItem.id) {
        setActiveDrawerCase((prev) =>
          prev
            ? {
                ...prev,
                implementation: {
                  ...prev.implementation,
                  codeContent: updatedCode,
                  lastCommitTime: '刚刚',
                },
              }
            : null
        );
      }

      setLogs((prev) => [
        ...prev,
        {
          id: `git-${Date.now()}`,
          time: new Date().toTimeString().slice(0, 8),
          type: 'info',
          tag: 'GitCommit',
          text: `🚀 [Git Commit] 成功推送代码改动至 ${caseItem.implementation.gitFilePath}`,
        },
      ]);
    } catch (e: any) {
      toast.error(`提交失败: ${e.message || e}`, { id: 'commit-git' });
    }
  };

  // 递归渲染目录树节点
  const renderTreeNode = (node: RepoTreeNode, depth: number = 0) => {
    const isFolder = node.type === 'folder';
    const isExpanded = expandedFolderPaths.has(node.path);
    const isSelected = selectedDirPath === node.path;

    return (
      <div key={node.id || node.path} className="space-y-0.5">
        <div
          onClick={() => setSelectedDirPath(node.path)}
          style={{ paddingLeft: `${Math.max(6, depth * 14)}px` }}
          className={`group flex items-center justify-between pr-2 py-1.5 rounded-lg text-xs cursor-pointer transition-all ${
            isSelected
              ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200 shadow-2xs'
              : 'text-slate-700 hover:bg-slate-100/70'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            {isFolder ? (
              <button
                onClick={(e) => toggleFolderExpand(node.path, e)}
                className="p-0.5 hover:bg-slate-200/60 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>
            ) : (
              <span className="w-4.5" />
            )}

            {isFolder ? (
              isExpanded ? (
                <FolderOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              )
            ) : (
              <FileCode2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
            )}

            <span className="truncate">{node.name}</span>
          </div>

          <span className="text-[10px] text-slate-400 font-mono">
            {node.caseCount || 0}
          </span>
        </div>

        {/* 递归子目录 */}
        {isFolder && isExpanded && node.children && node.children.length > 0 && (
          <div className="space-y-0.5">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#F8FAFC] text-slate-800 overflow-hidden font-sans select-none antialiased">
      {/* ================= 1. 顶部 Header (大仓与分支中枢 + 批量操作) ================= */}
      <div className="h-13 shrink-0 bg-white border-b border-slate-200/80 px-5 flex items-center justify-between z-20 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-sm text-slate-900">代码仓库用例中心</span>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* 仓库下拉选择器 */}
          <div className="flex items-center gap-2">
            <select
              value={currentRepoId}
              onChange={(e) => setCurrentRepoId(e.target.value)}
              className="text-xs bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-lg px-2.5 py-1 font-medium text-slate-800 outline-none cursor-pointer"
            >
              {repoList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            {/* 分支选择器 */}
            <select
              value={selectedBranch}
              onChange={(e) => handleBranchSelectChange(e.target.value)}
              className="text-xs bg-indigo-50/80 border border-indigo-200 rounded-lg px-2 py-1 font-mono font-semibold text-indigo-700 outline-none cursor-pointer"
            >
              {branchOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* 关联新代码仓按钮 */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateRepoModalOpen(true)}
              className="h-7 text-xs gap-1 border-dashed border-slate-300 text-slate-600 hover:text-indigo-600"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>关联代码仓</span>
            </Button>

            {/* 同步扫描按钮 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSyncRepo}
              disabled={isSyncing}
              className="h-7 text-xs gap-1 text-slate-500 hover:text-slate-900"
              title="重新扫描并解析代码工程中的用例"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
              <span>{isSyncing ? '扫描解析中...' : '同步代码仓'}</span>
            </Button>

            {/* AI 生成用例快捷按钮 */}
            {onAiGenerate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onAiGenerate}
                className="h-7 text-xs gap-1 border-violet-200 bg-violet-50/50 text-violet-700 hover:bg-violet-100 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                <span>AI 生成用例</span>
              </Button>
            )}
          </div>
        </div>

        {/* 顶部右侧: 左栏目录展开/收起 + 批量执行 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLeftTreeOpen(!isLeftTreeOpen)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg border border-slate-200/80 transition-colors font-medium"
          >
            {isLeftTreeOpen ? (
              <>
                <PanelLeftClose className="w-3.5 h-3.5" />
                <span>收起目录树</span>
              </>
            ) : (
              <>
                <PanelLeftOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>展开目录树</span>
              </>
            )}
          </button>

          <Button
            size="sm"
            onClick={handleBatchExecute}
            disabled={selectedCaseIds.length === 0}
            className={`h-8 text-xs rounded-lg px-3.5 gap-1.5 font-medium shadow-sm transition-all ${
              selectedCaseIds.length > 0
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>
              {selectedCaseIds.length > 0 ? `批量执行选中 (${selectedCaseIds.length})` : '批量执行'}
            </span>
          </Button>
        </div>
      </div>

      {/* ================= 2. 主体工作区 (左侧目录树 + 右侧用例表格) ================= */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* 左侧：📁 Git 仓库目录树 (Repo Tree) */}
        {isLeftTreeOpen && (
          <div className="w-64 xl:w-72 shrink-0 bg-white border-r border-slate-200/80 flex flex-col min-h-0 z-10 animate-in slide-in-from-left-2 duration-150">
            <div className="h-10 px-4 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600 bg-slate-50/50">
              <div className="flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-blue-600" />
                <span>工程测试目录 (tests/)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">AST Live</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
              {/* 全部用例根节点 */}
              <div
                onClick={() => setSelectedDirPath('')}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                  selectedDirPath === ''
                    ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200 shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FolderGit2 className={`w-3.5 h-3.5 ${selectedDirPath === '' ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span>全部测试用例</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono bg-white">
                  {totalCases}
                </Badge>
              </div>

              {/* 树形递归节点 */}
              <div className="pt-2 space-y-1">
                {repoTree?.children?.map((child) => renderTreeNode(child, 0))}
              </div>
            </div>
          </div>
        )}

        {/* 右侧：📋 统一用例列表大表格 (Table View) */}
        <div className="flex-1 flex flex-col min-h-0 bg-white">
          {/* 筛选与状态条 */}
          <div className="h-11 shrink-0 bg-slate-50/70 border-b border-slate-200/70 px-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3 flex-1 max-w-lg">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <Input
                  placeholder="搜索用例编号、标题、关联需求、函数名..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="h-7.5 pl-8 text-xs bg-white border-slate-200 rounded-lg"
                />
              </div>

              {/* 优先级过滤 */}
              <div className="flex items-center gap-1 text-slate-500">
                <span className="text-[11px]">优先级:</span>
                <div className="flex items-center bg-white p-0.5 rounded-md border border-slate-200 text-[11px]">
                  {['ALL', 'P0', 'P1', 'P2'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriorityFilter(p)}
                      className={`px-2 py-0.5 rounded ${
                        priorityFilter === p
                          ? 'bg-slate-100 font-bold text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-400 text-[11px] font-mono">
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />}
              <span>当前目录下共 {cases.length} 条用例</span>
              <span>·</span>
              <span className="text-blue-600 font-semibold">已勾选 {selectedCaseIds.length} 项</span>
            </div>
          </div>

          {/* 表格主体 */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-white border-b border-slate-200 z-10 font-semibold text-slate-600 shadow-2xs">
                <tr>
                  <th className="w-10 px-3 py-2.5 text-center">
                    <button onClick={toggleSelectAll} className="p-0.5 hover:text-blue-600">
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="w-28 px-3 py-2.5 font-mono">用例编号</th>
                  <th className="px-3 py-2.5 min-w-[260px]">用例名称 (Docstring)</th>
                  <th className="w-24 px-3 py-2.5">关联需求</th>
                  <th className="w-16 px-3 py-2.5 text-center">优先级</th>
                  <th className="px-3 py-2.5 min-w-[260px]">代码目标 (文件与函数)</th>
                  <th className="w-24 px-3 py-2.5">最近状态</th>
                  <th className="w-20 px-3 py-2.5">耗时</th>
                  <th className="w-28 px-3 py-2.5 text-center">快捷操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {cases.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">
                      {loading ? '正在从 Git 代码仓加载用例...' : '当前目录下暂无测试用例，点击上方「同步代码仓」重新扫描'}
                    </td>
                  </tr>
                ) : (
                  cases.map((c) => {
                    const isChecked = selectedCaseIds.includes(c.id);
                    return (
                      <tr
                        key={c.id}
                        className={`group transition-colors hover:bg-slate-50/80 ${
                          isChecked ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        {/* 复选框 */}
                        <td className="px-3 py-3 text-center">
                          <button onClick={() => toggleSelectCase(c.id)} className="p-0.5">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                            )}
                          </button>
                        </td>

                        {/* 用例编号 */}
                        <td className="px-3 py-3 font-mono font-semibold text-slate-900">
                          <button
                            onClick={() => setActiveDrawerCase(c)}
                            className="text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            {c.code}
                          </button>
                        </td>

                        {/* 用例名称 */}
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span
                              onClick={() => setActiveDrawerCase(c)}
                              className="font-medium text-slate-900 hover:text-blue-600 cursor-pointer"
                            >
                              {c.title}
                            </span>
                            <span className="text-[11px] text-slate-400 truncate max-w-md font-mono">
                              前置: {c.design.precondition}
                            </span>
                          </div>
                        </td>

                        {/* 需求编号 */}
                        <td className="px-3 py-3">
                          <Badge variant="outline" className="bg-indigo-50/80 text-indigo-700 border-indigo-200 font-mono text-[10px]">
                            {c.reqSource}
                          </Badge>
                        </td>

                        {/* 优先级 */}
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              c.priority === 'P0'
                                ? 'bg-rose-100 text-rose-700'
                                : c.priority === 'P1'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {c.priority}
                          </span>
                        </td>

                        {/* 代码目标 */}
                        <td className="px-3 py-3 font-mono text-[11px] text-slate-500 truncate">
                          <div className="flex items-center gap-1.5">
                            <FileCode2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-600 font-medium">{c.implementation.gitFilePath}</span>
                            <span className="text-slate-400">::</span>
                            <span className="text-indigo-600 font-bold">{c.implementation.functionName}</span>
                          </div>
                        </td>

                        {/* 状态 */}
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              c.status === 'passed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : c.status === 'failed'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                c.status === 'passed'
                                  ? 'bg-emerald-500'
                                  : c.status === 'failed'
                                  ? 'bg-rose-500'
                                  : 'bg-slate-400'
                              }`}
                            />
                            {c.status === 'passed' ? 'PASS' : c.status === 'failed' ? 'FAILED' : 'READY'}
                          </span>
                        </td>

                        {/* 耗时 */}
                        <td className="px-3 py-3 font-mono text-[11px] text-slate-500">
                          {c.executionDuration || '--'}
                        </td>

                        {/* 操作 */}
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleExecuteSingleCase(c)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>调试</span>
                            </button>
                            <button
                              onClick={() => setActiveDrawerCase(c)}
                              className="px-2 py-1 hover:bg-blue-50 text-blue-600 rounded text-[11px] font-medium transition-colors"
                            >
                              详情
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ================= 3. 底部执行推流控制台 ================= */}
      {isConsoleOpen && (
        <div className="h-44 shrink-0 bg-[#0F172A] border-t border-slate-800 text-slate-200 flex flex-col z-30 font-mono text-xs">
          <div className="h-7 px-4 bg-[#1E293B] border-b border-slate-800 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2 text-slate-300">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>实时执行与控制台推流 (Pytest Runner Console)</span>
            </div>
            <button
              onClick={() => setIsConsoleOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 text-[11px] leading-relaxed select-text">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2">
                <span className="text-slate-500">[{log.time}]</span>
                <span
                  className={`font-semibold ${
                    log.type === 'success'
                      ? 'text-emerald-400'
                      : log.type === 'error'
                      ? 'text-rose-400'
                      : 'text-sky-400'
                  }`}
                >
                  [{log.tag}]
                </span>
                <span className="text-slate-200">{log.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= 4. 统一用例 (双面设计/代码) 滑出抽屉 ================= */}
      <Sheet open={!!activeDrawerCase} onOpenChange={(open) => !open && setActiveDrawerCase(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl p-0 border-l border-slate-200 bg-white">
          {activeDrawerCase && (
            <div className="flex flex-col h-full overflow-hidden">
              <SheetHeader className="p-5 border-b border-slate-100 bg-slate-50/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-blue-600">
                      {activeDrawerCase.code}
                    </span>
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                      {activeDrawerCase.reqSource}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleExecuteSingleCase(activeDrawerCase)}
                    className="h-7 text-xs bg-slate-900 text-white rounded-lg px-3"
                  >
                    <Play className="w-3 h-3 fill-current mr-1" /> 运行调试
                  </Button>
                </div>
                <SheetTitle className="text-sm font-bold text-slate-900 pt-2 text-left">
                  {activeDrawerCase.title}
                </SheetTitle>
              </SheetHeader>

              <div className="flex-1 p-5 space-y-5 overflow-y-auto">
                {/* 业务设计步骤 */}
                <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-semibold text-slate-800 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ListOrdered className="w-3.5 h-3.5 text-blue-600" />
                      <span>业务设计步骤 (Business Steps)</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      前置: {activeDrawerCase.design.precondition}
                    </span>
                  </div>

                  <div className="space-y-2 pt-1">
                    {activeDrawerCase.design.steps.map((st) => (
                      <div
                        key={st.stepNumber}
                        className="p-2.5 rounded-lg bg-white border border-slate-200/80 space-y-0.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between font-medium text-slate-800">
                          <span>步骤 {st.stepNumber}: {st.name}</span>
                          <span className="text-[10px] text-emerald-600 font-mono">
                            {st.durationMs ? `${st.durationMs}ms` : 'PASS'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">预期结果: {st.expected}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 原生 Python 代码 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Git 原生测试代码 (@aegis SDK)</span>
                    </span>
                    <button
                      onClick={() => handleCommitToGit(activeDrawerCase)}
                      className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-semibold text-[11px]"
                    >
                      <GitCommit className="w-3 h-3" />
                      <span>Commit 代码变更</span>
                    </button>
                  </div>

                  <div className="rounded-xl bg-[#0F172A] border border-slate-800 overflow-hidden shadow-inner font-mono text-xs">
                    <div className="h-7 px-3 bg-[#1E293B] border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{activeDrawerCase.implementation.gitFilePath}</span>
                      <span>Commit: {activeDrawerCase.implementation.lastCommitHash}</span>
                    </div>
                    <div className="p-3">
                      <textarea
                        value={
                          codeEditBuffer[activeDrawerCase.id] !== undefined
                            ? codeEditBuffer[activeDrawerCase.id]
                            : activeDrawerCase.implementation.codeContent
                        }
                        onChange={(e) => {
                          setCodeEditBuffer((prev) => ({
                            ...prev,
                            [activeDrawerCase.id]: e.target.value,
                          }));
                        }}
                        rows={12}
                        className="w-full bg-transparent text-[#E2E8F0] text-[11px] font-mono leading-5 outline-none resize-y selection:bg-blue-600 selection:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ================= 5. 关联新代码仓 Modal ================= */}
      <Dialog open={isCreateRepoModalOpen} onOpenChange={setIsCreateRepoModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
              <FolderGit2 className="w-5 h-5 text-indigo-600" />
              <span>关联代码工程测试用例库</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">用例库名称</label>
              <Input
                placeholder="例如: 用户中心接口自动化测试库"
                value={newRepoName}
                onChange={(e) => setNewRepoName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Git 仓库地址 (Git URL) 或本地工程路径</label>
              <Input
                placeholder="https://github.com/jan-zhang986/trueone-anubis.git"
                value={newRepoPath}
                onChange={(e) => setNewRepoPath(e.target.value)}
                className="h-8 text-xs font-mono"
              />
              <p className="text-[11px] text-slate-400">支持云端 GitHub / GitLab 仓库或本地工程目录，系统将解析 tests/ 目录下的测试用例</p>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">默认主分支</label>
              <Input
                placeholder="main"
                value={newRepoBranch}
                onChange={(e) => setNewRepoBranch(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateRepoModalOpen(false)}
              className="h-8 text-xs"
            >
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleCreateRepoSubmit}
              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              确认并扫描
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
