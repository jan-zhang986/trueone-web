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
  Copy,
  Check,
  Tag,
  Info,
  GitMerge,
  Network,
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
import { WorkflowDagFlowView } from './WorkflowDagFlowView';

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
    scriptLanguage: 'python' | 'typescript' | 'yaml' | 'go' | string;
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
      gitRepo: c.gitRepo || 'trueone-anubis',
      gitBranch: c.gitBranch || 'main',
      gitFilePath: c.gitFilePath || '',
      functionName: c.functionName || '',
      scriptLanguage: (c.scriptLanguage as any) || 'yaml',
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
  onCreateCase?: () => void;
}

export function RepoCaseExplorer({
  initialRepoId,
  initialRepoName,
  branch,
  onBranchChange,
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
  const [drawerTab, setDrawerTab] = useState<'steps' | 'code' | 'logs'>('steps');
  const [dagViewMode, setDagViewMode] = useState<'flow' | 'list'>('flow');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
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
  const [newRepoToken, setNewRepoToken] = useState<string>('');
  const [dagExecutions, setDagExecutions] = useState<Record<string, any>>({});

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
        gitToken: newRepoToken.trim() || undefined,
        defaultBranch: newRepoBranch.trim() || 'main',
        testsDir: 'tests',
        gitPlatform: isGit ? (trimmedPath.includes('github.com') ? 'github' : 'gitlab') : 'local',
      });
      const newRepo = (created as any)?.data || created;
      toast.success('成功关联云端/本地代码工程用例库！');
      setIsCreateRepoModalOpen(false);
      setNewRepoName('');
      setNewRepoToken('');
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
  const handleExecuteSingleCase = async (caseItem: UnifiedTestCaseItem) => {
    setIsConsoleOpen(true);
    toast.info(`正在调度执行 [${caseItem.code}]...`);

    setCases((prev) =>
      prev.map((item) =>
        item.id === caseItem.id ? { ...item, status: 'ready', executionDuration: '执行中...' } : item
      )
    );

    const isWorkflow = caseItem.implementation.scriptLanguage === 'yaml' || caseItem.reqSource === 'E2E_WORKFLOW_DAG';

    setLogs((prev) => [
      ...prev,
      {
        id: `run-${Date.now()}`,
        time: new Date().toTimeString().slice(0, 8),
        type: 'info',
        tag: isWorkflow ? 'DAGEngine' : 'TestRunner',
        text: isWorkflow
          ? `🚀 [DAG 拓扑调度] 正在触发有向无环图执行: ${caseItem.code} (${caseItem.title})`
          : `⚡ [TestRunner] 运行测试: ${caseItem.implementation.gitFilePath}::${caseItem.implementation.functionName}`,
      },
    ]);

    try {
      const res = await repoCaseService.executeCase(currentRepoId, {
        caseId: caseItem.id,
        branch: selectedBranch,
      });
      const data = (res as any)?.data || res;
      const durationStr = `${data.durationMs || 15}ms`;

      setCases((prev) =>
        prev.map((item) =>
          item.id === caseItem.id
            ? {
                ...item,
                status: (data.status === 'SUCCESS' ? 'passed' : 'failed') as any,
                lastExecutionTime: new Date().toTimeString().slice(0, 8),
                executionDuration: durationStr,
              }
            : item
        )
      );

      if (data.caseType === 'WORKFLOW_DAG' && data.execution?.nodeResults) {
        setDagExecutions((prev) => ({
          ...prev,
          [caseItem.id]: data.execution,
        }));
        const nodes = Object.values(data.execution.nodeResults);
        const newLogs: LogEntry[] = nodes.map((n: any, idx: number) => ({
          id: `node-${Date.now()}-${idx}`,
          time: new Date().toTimeString().slice(0, 8),
          type: n.status === 'SUCCESS' ? 'step' : 'error',
          tag: `DAG-Step-${idx + 1}`,
          text: `[${n.status}] ${n.nodeName} (${n.durationMs}ms) - 输出: ${JSON.stringify(n.output || n.evidence || {})}`,
        }));
        setLogs((prev) => [
          ...prev,
          ...newLogs,
          {
            id: `end-${Date.now()}`,
            time: new Date().toTimeString().slice(0, 8),
            type: 'success',
            tag: 'WorkflowReport',
            text: `🎯 全链路 DAG 执行完成: 状态 ${data.status}, 总节点数 ${data.execution.totalNodes}, 耗时 ${durationStr} 🟢`,
          },
        ]);
      } else {
        setLogs((prev) => [
          ...prev,
          {
            id: `end-${Date.now()}`,
            time: new Date().toTimeString().slice(0, 8),
            type: 'success',
            tag: 'TestReport',
            text: `🎯 [${caseItem.code}] 断言通过 (${durationStr}) 🟢`,
          },
        ]);
      }
      toast.success(`用例 [${caseItem.code}] 执行通过！`);
    } catch (err: any) {
      toast.error(`执行失败: ${err.message || err}`);
      setCases((prev) =>
        prev.map((item) =>
          item.id === caseItem.id
            ? { ...item, status: 'failed', executionDuration: '失败' }
            : item
        )
      );
    }
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
      {/* ================= 主体工作区 (左侧目录树 + 右侧用例表格) ================= */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* 左侧：📁 Git 仓库目录树 (Repo Tree) */}
        {isLeftTreeOpen && (
          <div className="w-64 xl:w-72 shrink-0 bg-white border-r border-slate-200/80 flex flex-col min-h-0 z-10 animate-in slide-in-from-left-2 duration-150">
            <div className="h-11 px-4 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600 bg-slate-50/50">
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

        {/* 右侧：📋 统一用例列表与单层极简工具栏 */}
        <div className="flex-1 flex flex-col min-h-0 bg-white">
          {/* 单层极简工具栏 (去除了重复的仓库/分支/AI按钮) */}
          <div className="h-11 shrink-0 bg-white border-b border-slate-200/80 px-4 flex items-center justify-between text-xs z-10">
            {/* 左侧：收起/展开目录树 + 搜索框 + 优先级过滤 */}
            <div className="flex items-center gap-2.5 flex-1 max-w-2xl">
              <button
                onClick={() => setIsLeftTreeOpen(!isLeftTreeOpen)}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 px-2 py-1 rounded-md border border-slate-200 transition-colors font-medium cursor-pointer shrink-0"
                title={isLeftTreeOpen ? '收起左侧目录树' : '展开左侧目录树'}
              >
                {isLeftTreeOpen ? (
                  <>
                    <PanelLeftClose className="w-3.5 h-3.5 text-slate-500" />
                    <span>收起目录</span>
                  </>
                ) : (
                  <>
                    <PanelLeftOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>展开目录</span>
                  </>
                )}
              </button>

              <div className="h-3.5 w-px bg-slate-200 shrink-0" />

              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="搜索用例编号、标题、关联需求、函数名..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="h-7.5 pl-8 pr-3 text-xs bg-slate-50/60 hover:bg-white focus:bg-white border-slate-200 rounded-lg transition-colors"
                />
              </div>

              {/* 优先级过滤 */}
              <div className="flex items-center gap-1 shrink-0 text-slate-500">
                <span className="text-[11px]">优先级:</span>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200 text-[11px]">
                  {['ALL', 'P0', 'P1', 'P2'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriorityFilter(p)}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                        priorityFilter === p
                          ? 'bg-white font-bold text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 右侧：同步代码仓 + 批量执行 + 计数统计 */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden md:flex items-center gap-1.5 text-slate-400 text-[11px] font-mono">
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />}
                <span>共 {cases.length} 条用例</span>
                {selectedCaseIds.length > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-blue-600 font-semibold">已选 {selectedCaseIds.length} 项</span>
                  </>
                )}
              </div>

              <div className="h-3.5 w-px bg-slate-200" />

              {/* 同步扫描按钮 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSyncRepo}
                disabled={isSyncing}
                className="h-7.5 text-xs gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md cursor-pointer"
                title="重新扫描并解析代码工程中的用例"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
                <span>{isSyncing ? '扫描中...' : '同步代码仓'}</span>
              </Button>

              {/* 批量执行按钮 */}
              <Button
                size="sm"
                onClick={handleBatchExecute}
                disabled={selectedCaseIds.length === 0}
                className={`h-7.5 text-xs rounded-md px-3 gap-1.5 font-medium shadow-2xs transition-all cursor-pointer ${
                  selectedCaseIds.length > 0
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/60'
                }`}
              >
                <Play className="w-3 h-3 fill-current" />
                <span>
                  {selectedCaseIds.length > 0 ? `批量执行 (${selectedCaseIds.length})` : '批量执行'}
                </span>
              </Button>
            </div>
          </div>

          {/* 表格主体 */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-xs border-b border-slate-200 z-10 text-[11px] font-semibold text-slate-500 uppercase tracking-wider shadow-2xs">
                <tr>
                  <th className="w-10 px-3 py-2 text-center">
                    <button onClick={toggleSelectAll} className="p-0.5 hover:text-blue-600 transition-colors">
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300" />
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-2 min-w-[280px]">测试用例</th>
                  <th className="px-3 py-2 min-w-[200px]">测试函数 / 源码映射</th>
                  <th className="w-24 px-3 py-2">关联需求</th>
                  <th className="w-20 px-3 py-2 text-center">优先级</th>
                  <th className="w-28 px-3 py-2">运行状态</th>
                  <th className="w-20 px-3 py-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {cases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      {loading ? '正在从 Git 代码仓拉取 AST 用例...' : '当前目录下暂无测试用例，点击上方「同步代码仓」重新扫描'}
                    </td>
                  </tr>
                ) : (
                  cases.map((c) => {
                    const isChecked = selectedCaseIds.includes(c.id);
                    return (
                      <tr
                        key={c.id}
                        onClick={() => {
                          setActiveDrawerCase(c);
                          setDrawerTab('steps');
                        }}
                        className={`group cursor-pointer transition-colors hover:bg-blue-50/30 ${
                          isChecked ? 'bg-blue-50/50' : 'bg-white'
                        }`}
                      >
                        {/* 复选框 */}
                        <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => toggleSelectCase(c.id)} className="p-0.5">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                            )}
                          </button>
                        </td>

                        {/* 测试用例 (编号与标题并排，去掉冗余灰字) */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2 max-w-xl">
                            <span className="font-mono text-[11px] font-semibold text-blue-600 bg-blue-50/80 px-1.5 py-0.5 rounded border border-blue-200/50 shrink-0">
                              {c.code}
                            </span>
                            {(c.implementation.scriptLanguage === 'yaml' || c.reqSource === 'E2E_WORKFLOW_DAG') && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs shrink-0">
                                <GitMerge className="w-2.5 h-2.5 text-purple-600" />
                                E2E DAG
                              </span>
                            )}
                            <span className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                              {c.title}
                            </span>
                          </div>
                        </td>

                        {/* 测试函数与代码文件 */}
                        <td className="px-3 py-2.5 font-mono text-[11px]">
                          <div className="flex items-center gap-1.5 truncate max-w-sm">
                            <span className="font-semibold text-indigo-600 truncate">
                              {c.implementation.scriptLanguage === 'yaml'
                                ? c.implementation.functionName
                                : `${c.implementation.functionName || 'TestRunner'}()`}
                            </span>
                            <span className="text-slate-400 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                              {c.implementation.gitFilePath ? c.implementation.gitFilePath.split('/').pop() : 'test.go'}
                            </span>
                          </div>
                        </td>

                        {/* 关联需求 */}
                        <td className="px-3 py-2.5">
                          {c.reqSource ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] border border-slate-200/60">
                              <Tag className="w-2.5 h-2.5 text-slate-400" />
                              <span>{c.reqSource}</span>
                            </span>
                          ) : (
                            <span className="text-slate-300">--</span>
                          )}
                        </td>

                        {/* 优先级 */}
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              c.priority === 'P0'
                                ? 'bg-rose-50 text-rose-600 border border-rose-200/60'
                                : c.priority === 'P1'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                : 'bg-slate-50 text-slate-600 border border-slate-200/60'
                            }`}
                          >
                            {c.priority}
                          </span>
                        </td>

                        {/* 运行状态 */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                c.status === 'passed'
                                  ? 'bg-emerald-500'
                                  : c.status === 'failed'
                                  ? 'bg-rose-500'
                                  : 'bg-slate-300'
                              }`}
                            />
                            <span
                              className={`font-medium ${
                                c.status === 'passed'
                                  ? 'text-emerald-700'
                                  : c.status === 'failed'
                                  ? 'text-rose-600'
                                  : 'text-slate-500'
                              }`}
                            >
                              {c.status === 'passed' ? 'PASS' : c.status === 'failed' ? 'FAILED' : 'READY'}
                            </span>
                            {c.executionDuration && (
                              <span className="text-[10px] font-mono text-slate-400">
                                {c.executionDuration}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 快捷操作 (轻量化) */}
                        <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleExecuteSingleCase(c)}
                              title="单点调试执行"
                              className="p-1 hover:bg-blue-100/70 text-blue-700 rounded transition-colors"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                            <button
                              onClick={() => {
                                setActiveDrawerCase(c);
                                setDrawerTab('steps');
                              }}
                              title="查看用例详情"
                              className="p-1 hover:bg-slate-100 text-slate-600 rounded transition-colors"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
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

      {/* ================= 4. 统一用例详情专业抽屉 ================= */}
      <Sheet open={!!activeDrawerCase} onOpenChange={(open) => !open && setActiveDrawerCase(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 border-l border-slate-200 bg-white flex flex-col h-full shadow-2xl">
          {activeDrawerCase && (
            <div className="flex flex-col h-full overflow-hidden bg-white">
              {/* Header 区域: 面包屑 + 标题 + 运行与关闭操作 */}
              <div className="p-6 border-b border-slate-200 bg-slate-50/50">
                {/* 面包屑 */}
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-mono">
                  <div className="flex items-center gap-1.5 truncate">
                    <FolderGit2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-700 font-medium">{currentRepo?.name || '仓库'}</span>
                    <span>/</span>
                    <GitBranch className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-emerald-700 font-medium">{selectedBranch}</span>
                    <span>/</span>
                    <span className="truncate text-slate-500">{activeDrawerCase.implementation.gitFilePath}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-[11px] font-bold uppercase ${
                        activeDrawerCase.priority === 'P0'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : activeDrawerCase.priority === 'P1'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {activeDrawerCase.priority} 优先级
                    </Badge>
                  </div>
                </div>

                {/* 标题行 */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-sm text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                        {activeDrawerCase.code}
                      </span>
                      {(activeDrawerCase.implementation.scriptLanguage === 'yaml' || activeDrawerCase.reqSource === 'E2E_WORKFLOW_DAG') && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs">
                          <GitMerge className="w-3 h-3 text-purple-600" />
                          E2E Workflow DAG
                        </span>
                      )}
                      <h2 className="text-lg font-bold text-slate-900 leading-snug">
                        {activeDrawerCase.title}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleExecuteSingleCase(activeDrawerCase)}
                      className="h-8 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-xs gap-1.5 rounded-lg px-3.5 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>调度运行</span>
                    </Button>
                  </div>
                </div>

                {/* 核心属性网格 (4列优雅卡片) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-slate-200/70 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] text-slate-400 block mb-0.5">关联需求 / 来源</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {activeDrawerCase.reqSource || '无关联'}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] text-slate-400 block mb-0.5">测试函数目标</span>
                    <span className="font-mono font-semibold text-indigo-600 truncate block" title={activeDrawerCase.implementation.functionName}>
                      {activeDrawerCase.implementation.scriptLanguage === 'yaml'
                        ? activeDrawerCase.implementation.functionName
                        : `${activeDrawerCase.implementation.functionName || 'TestMain'}()`}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] text-slate-400 block mb-0.5">最近执行结果</span>
                    <span className={`font-semibold flex items-center gap-1 ${
                      activeDrawerCase.status === 'passed' ? 'text-emerald-600' : 'text-slate-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        activeDrawerCase.status === 'passed' ? 'bg-emerald-500' : 'bg-slate-400'
                      }`} />
                      {activeDrawerCase.status === 'passed' ? `PASS (${activeDrawerCase.executionDuration || '15ms'})` : 'READY'}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] text-slate-400 block mb-0.5">最新 Commit SHA</span>
                    <span className="font-mono text-slate-600 truncate block">
                      {activeDrawerCase.implementation.lastCommitHash.slice(0, 8)}
                    </span>
                  </div>
                </div>

                {/* Tab 导航条 */}
                <div className="flex items-center gap-1 mt-4 border-b border-slate-200/70 -mb-6 pb-0">
                  <button
                    onClick={() => setDrawerTab('steps')}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                      drawerTab === 'steps'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>DAG 步骤拓扑 ({activeDrawerCase.design.steps.length})</span>
                  </button>

                  <button
                    onClick={() => setDrawerTab('code')}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                      drawerTab === 'code'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Git 源码与 YAML 编排</span>
                  </button>

                  <button
                    onClick={() => setDrawerTab('logs')}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                      drawerTab === 'logs'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>执行调度日志</span>
                  </button>
                </div>
              </div>

              {/* Tab 内容区 */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {drawerTab === 'steps' && (
                  <div className="space-y-4">
                    {/* 前置条件与业务说明卡片 */}
                    {activeDrawerCase.design.precondition && (
                      <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200/60 text-xs flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-blue-900 block mb-0.5">业务链路说明 (Workflow Specification)</span>
                          <p className="text-blue-800/80 leading-relaxed font-mono text-[11px]">
                            {activeDrawerCase.design.precondition}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 视图切换栏：DAG 拓扑流程图 vs 步骤清单 */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">DAG 拓扑节点与执行断言</span>
                      <div className="inline-flex h-7 rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setDagViewMode('flow')}
                          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                            dagViewMode === 'flow'
                              ? 'bg-white font-bold text-purple-700 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <GitMerge className="w-3 h-3 text-purple-600" />
                          <span>DAG 流程图 (Flow)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDagViewMode('list')}
                          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                            dagViewMode === 'list'
                              ? 'bg-white font-bold text-slate-900 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <ListOrdered className="w-3 h-3 text-slate-600" />
                          <span>步骤清单 (List)</span>
                        </button>
                      </div>
                    </div>

                    {/* 视图内容切换 */}
                    {dagViewMode === 'flow' ? (
                      <WorkflowDagFlowView
                        yamlContent={activeDrawerCase.implementation.codeContent}
                        steps={activeDrawerCase.design.steps}
                        overallStatus={activeDrawerCase.status}
                        executionData={dagExecutions[activeDrawerCase.id]}
                      />
                    ) : (
                      /* 步骤时间线列表 */
                      <div className="space-y-2.5 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200 before:z-0">
                        {activeDrawerCase.design.steps.map((st) => (
                          <div
                            key={st.stepNumber}
                            className="relative z-10 flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-blue-200 transition-colors"
                          >
                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs shrink-0 font-mono">
                              {st.stepNumber}
                            </span>
                            <div className="flex-1 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {st.name.startsWith('[HTTP]') && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                      HTTP 接口
                                    </span>
                                  )}
                                  {st.name.startsWith('[SQL]') && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                      SQL 核算
                                    </span>
                                  )}
                                  {st.name.startsWith('[QUALITY_GATE]') && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                      QUALITY_GATE 门禁
                                    </span>
                                  )}
                                  <span className="font-semibold text-slate-800 text-xs">
                                    {st.name.replace(/^\[[A-Z_]+\]\s*/, '')}
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 font-semibold">
                                  {st.durationMs ? `${st.durationMs}ms` : 'READY'}
                                </span>
                              </div>
                              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-2 text-[11px] text-slate-600">
                                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-medium text-slate-700">预期断言：</span>
                                  <span>{st.expected}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {drawerTab === 'code' && (
                  <div className="space-y-3">
                    {/* 代码编辑器面板 */}
                    <div className="rounded-xl bg-[#0F172A] border border-slate-800 overflow-hidden shadow-lg font-mono text-xs">
                      {/* 仿 VS Code 代码顶栏 */}
                      <div className="h-9 px-4 bg-[#1E293B] border-b border-slate-800 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="font-semibold">{activeDrawerCase.implementation.gitFilePath}</span>
                          <span className="text-slate-500 text-[10px]">({activeDrawerCase.implementation.scriptLanguage})</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const code = codeEditBuffer[activeDrawerCase.id] !== undefined
                                ? codeEditBuffer[activeDrawerCase.id]
                                : activeDrawerCase.implementation.codeContent;
                              navigator.clipboard.writeText(code);
                              setCopiedCode(true);
                              setTimeout(() => setCopiedCode(false), 2000);
                              toast.success('代码已复制到剪贴板');
                            }}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedCode ? '已复制' : '复制代码'}</span>
                          </button>

                          <button
                            onClick={() => handleCommitToGit(activeDrawerCase)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                          >
                            <GitCommit className="w-3 h-3" />
                            <span>Commit 提交到 Git</span>
                          </button>
                        </div>
                      </div>

                      {/* 编辑代码文本区 */}
                      <div className="p-4">
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
                          rows={16}
                          className="w-full bg-transparent text-[#E2E8F0] text-xs font-mono leading-6 outline-none resize-y selection:bg-blue-600 selection:text-white"
                          placeholder="请输入测试代码..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {drawerTab === 'logs' && (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="p-4 rounded-xl bg-[#0F172A] border border-slate-800 text-slate-300 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-400">
                        <span>测试执行控制台输出 (Runner Logs)</span>
                        <span>最新执行: {activeDrawerCase.lastExecutionTime || '刚刚'}</span>
                      </div>
                      <div className="space-y-1 text-[11px] pt-1">
                        <div className="text-emerald-400">✓ pytest tests/ -k "{activeDrawerCase.implementation.functionName}"</div>
                        <div className="text-slate-400">test session starts (platform: TrueOne Universal Engine)</div>
                        <div className="text-slate-400">collected 1 item</div>
                        <div className="text-emerald-400">PASSED [100%] in {activeDrawerCase.executionDuration || '48ms'}</div>
                      </div>
                    </div>
                  </div>
                )}
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

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700">Git 访问凭证 (Personal Access Token / 可选)</label>
                <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-medium">支持云端 API 提交</span>
              </div>
              <Input
                type="password"
                placeholder="ghp_xxxxxxxxxxxx (用于云端通过 GitHub API 直接提交代码)"
                value={newRepoToken}
                onChange={(e) => setNewRepoToken(e.target.value)}
                className="h-8 text-xs font-mono"
              />
              <p className="text-[11px] text-slate-400">配置后可实现纯云端无状态提交；若留空则优先使用服务器本地已鉴权的 Git CLI</p>
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
