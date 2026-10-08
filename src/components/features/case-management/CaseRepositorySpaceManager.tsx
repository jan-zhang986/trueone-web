import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/components/ui/hover-card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  FolderGit2,
  Plus,
  GitBranch,
  ArrowRight,
  PackageCheck,
  CheckCircle2,
  Search,
  Clock,
  Code2,
  FileText,
  LayoutGrid,
  List,
  Pencil,
  Trash2,
  GitFork,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import type { CaseRepositoryItem } from '@/services/case-management/service-feature-case';

export interface CaseRepositorySpaceManagerProps {
  repoList: (CaseRepositoryItem | string)[];
  selectedRepo: string;
  onSelectRepo: (repoName: string) => void;
  onCreateRepoSubmit?: (data: {
    name: string;
    code?: string;
    description?: string;
    defaultBranch?: string;
    creator?: string;
    gitUrl?: string;
    gitPlatform?: string;
    testsDir?: string;
    localPath?: string;
  }) => Promise<void> | void;
  onUpdateRepoSubmit?: (data: {
    id: string;
    name: string;
    code?: string;
    description?: string;
    defaultBranch?: string;
    branches?: string[];
    gitUrl?: string;
    gitPlatform?: string;
    testsDir?: string;
  }) => Promise<void> | void;
  onDeleteRepoSubmit?: (repo: CaseRepositoryItem) => Promise<void> | void;
  onCreateBranchSubmit?: (repo: CaseRepositoryItem, branchName: string, baseBranch: string, desc?: string) => Promise<void> | void;
}

function formatDate(time?: number | string) {
  if (!time) return '暂无记录';
  const date = typeof time === 'number' ? new Date(time) : new Date(time);
  if (isNaN(date.getTime())) return String(time);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs > 0 && diffMs < 60000) return '刚刚';
  if (diffMs > 0 && diffMs < 3600000) return `${Math.floor(diffMs / 60000)}分钟前`;
  if (diffMs > 0 && diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}小时前`;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

export function CaseRepositorySpaceManager({
  repoList,
  selectedRepo,
  onSelectRepo,
  onCreateRepoSubmit,
  onUpdateRepoSubmit,
  onDeleteRepoSubmit,
  onCreateBranchSubmit,
}: CaseRepositorySpaceManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [displayLayout, setDisplayLayout] = useState<'grid' | 'table'>('table');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingRepoId, setEditingRepoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Branch Creation State
  const [isCreateBranchOpen, setIsCreateBranchOpen] = useState(false);
  const [createBranchTargetRepo, setCreateBranchTargetRepo] = useState<CaseRepositoryItem | null>(null);
  const [branchFormName, setBranchFormName] = useState('');
  const [branchFormBase, setBranchFormBase] = useState('master');
  const [branchFormDesc, setBranchFormDesc] = useState('');
  const [branchLoading, setBranchLoading] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCreator, setFormCreator] = useState('admin');
  const [formBranch, setFormBranch] = useState('main');
  const [formGitUrl, setFormGitUrl] = useState('');
  const [formTestsDir, setFormTestsDir] = useState('tests');
  const [formDesc, setFormDesc] = useState('');

  // Standardize repo objects
  const normalizedRepos = useMemo<CaseRepositoryItem[]>(() => {
    return repoList.map((item, idx) => {
      if (typeof item === 'string') {
        return {
          id: `repo-${idx}`,
          name: item,
          code: item === '示例用例库' ? 'demo-case-repo' : `repo-${idx + 1}`,
          defaultBranch: 'main',
          description:
            item === '示例用例库'
              ? '系统默认示例用例库，全量关联现存测试用例集与业务模块树'
              : '功能业务测试用例库',
          creator: 'admin',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          caseCount: item === '示例用例库' ? 128 : 0,
          branches: ['main', 'master'],
          gitUrl: item === '示例用例库' ? 'https://github.com/jan-zhang986/trueone-anubis.git' : '',
          gitPlatform: 'github',
          testsDir: 'tests',
        };
      }
      return {
        ...item,
        code: item.code || `repo-${idx + 1}`,
        creator: item.creator || item.createUser || 'admin',
        createdAt: item.createdAt || Date.now(),
        updatedAt: item.updatedAt || item.createdAt || Date.now(),
        caseCount: item.caseCount ?? 0,
        gitUrl: item.gitUrl || item.localPath || '',
        gitPlatform: item.gitPlatform || (item.gitUrl?.includes('github.com') ? 'github' : 'local'),
        testsDir: item.testsDir || 'tests',
      };
    });
  }, [repoList]);

  // Filtered list
  const filteredRepos = useMemo(() => {
    if (!searchTerm.trim()) return normalizedRepos;
    const term = searchTerm.toLowerCase();
    return normalizedRepos.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        (r.code || '').toLowerCase().includes(term) ||
        (r.creator || '').toLowerCase().includes(term) ||
        (r.description || '').toLowerCase().includes(term) ||
        (r.gitUrl || '').toLowerCase().includes(term)
    );
  }, [normalizedRepos, searchTerm]);

  const handleOpenCreateBranchModal = (repo: CaseRepositoryItem) => {
    setCreateBranchTargetRepo(repo);
    setBranchFormName('');
    setBranchFormBase(repo.defaultBranch || 'master');
    setBranchFormDesc('');
    setIsCreateBranchOpen(true);
  };

  const handleBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createBranchTargetRepo) return;
    const trimmed = branchFormName.trim();
    if (!trimmed) {
      toast.error('请输入分支名称');
      return;
    }

    try {
      setBranchLoading(true);
      if (onCreateBranchSubmit) {
        await onCreateBranchSubmit(createBranchTargetRepo, trimmed, branchFormBase, branchFormDesc);
      } else {
        toast.success(`成功创建分支: ${trimmed}`);
      }
      setIsCreateBranchOpen(false);
      setBranchFormName('');
      setBranchFormDesc('');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || '创建分支失败');
    } finally {
      setBranchLoading(false);
    }
  };

  const renderBranchBadge = (repo: CaseRepositoryItem) => {
    const rawBranches = repo.branches && repo.branches.length > 0 ? repo.branches : [repo.defaultBranch || 'master'];
    const branches = Array.from(
      new Set([repo.defaultBranch || 'master', ...rawBranches.filter((b) => b !== 'v1.0.0' && b !== 'v2.0.0')])
    );

    return (
      <HoverCard openDelay={120} closeDelay={180}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenCreateBranchModal(repo);
            }}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200 px-2 py-0.5 rounded font-medium transition-colors cursor-pointer group/branch"
            title="鼠标悬停查看所有分支，点击新建分支"
          >
            <GitBranch className="w-3 h-3 text-emerald-600 group-hover/branch:scale-110 transition-transform" />
            <span className="truncate max-w-[120px]">{repo.defaultBranch || 'master'}</span>
            {branches.length > 1 && (
              <span className="text-[10px] bg-slate-200 group-hover/branch:bg-emerald-100 text-slate-600 group-hover/branch:text-emerald-800 px-1 rounded-full font-bold">
                {branches.length}
              </span>
            )}
          </button>
        </HoverCardTrigger>
        <HoverCardContent
          align="start"
          side="top"
          className="w-64 p-3 shadow-xl border-slate-200 bg-white text-slate-800 rounded-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
              <GitBranch className="w-3.5 h-3.5 text-emerald-600" />
              <span>分支与基线 ({branches.length})</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">#{repo.code || repo.name}</span>
          </div>

          <div className="space-y-1 max-h-40 overflow-y-auto py-0.5">
            {branches.map((b) => {
              const isDefault = b === (repo.defaultBranch || 'master');
              return (
                <div
                  key={b}
                  className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5 truncate font-medium text-slate-700">
                    <GitBranch className={`w-3 h-3 ${isDefault ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="truncate">{b}</span>
                  </div>
                  {isDefault && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded leading-none">
                      默认
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-2 mt-2 border-t border-slate-100">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenCreateBranchModal(repo);
              }}
              className="w-full h-7 text-xs font-semibold text-blue-600 bg-blue-50/50 hover:bg-blue-50 border-blue-200 hover:border-blue-300 gap-1 rounded-lg"
            >
              <Plus className="w-3 h-3 text-blue-600" />
              <span>为此用例库新建分支</span>
            </Button>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingRepoId(null);
    setFormName('');
    setFormCode('');
    setFormCreator('admin');
    setFormBranch('main');
    setFormGitUrl('');
    setFormTestsDir('tests');
    setFormDesc('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (repo: CaseRepositoryItem) => {
    setModalMode('edit');
    setEditingRepoId(repo.id);
    setFormName(repo.name);
    setFormCode(repo.code || '');
    setFormCreator(repo.creator || 'admin');
    setFormBranch(repo.defaultBranch || 'main');
    setFormGitUrl(repo.gitUrl || repo.localPath || '');
    setFormTestsDir(repo.testsDir || 'tests');
    setFormDesc(repo.description || '');
    setIsModalOpen(true);
  };

  const handleDeleteRepo = async (repo: CaseRepositoryItem) => {
    const caseCount = repo.caseCount ?? 0;
    if (caseCount > 0) {
      toast.error(`用例库「${repo.name}」中包含 ${caseCount} 条测试用例，无法删除！请先迁移或删除库内用例。`);
      return;
    }

    if (!window.confirm(`确定要删除测试用例库「${repo.name}」吗？删除后无法恢复。`)) {
      return;
    }

    try {
      if (onDeleteRepoSubmit) {
        await onDeleteRepoSubmit(repo);
      } else {
        toast.success(`已成功删除用例库: ${repo.name}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || '删除用例库失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formName.trim();
    if (!trimmedName) {
      toast.error('请输入用例库名称');
      return;
    }

    const trimmedGitUrl = formGitUrl.trim();
    if (modalMode === 'create' && !trimmedGitUrl) {
      toast.error('请输入 Git 仓库地址 (如 https://github.com/owner/repo.git)');
      return;
    }

    try {
      setLoading(true);
      if (modalMode === 'edit' && editingRepoId) {
        if (onUpdateRepoSubmit) {
          await onUpdateRepoSubmit({
            id: editingRepoId,
            name: trimmedName,
            code: formCode.trim() || undefined,
            description: formDesc.trim() || undefined,
            defaultBranch: formBranch.trim() || 'main',
            gitUrl: trimmedGitUrl || undefined,
            testsDir: formTestsDir.trim() || 'tests',
          });
        } else {
          toast.success(`已成功更新用例库: ${trimmedName}`);
        }
      } else {
        if (onCreateRepoSubmit) {
          await onCreateRepoSubmit({
            name: trimmedName,
            code: formCode.trim() || undefined,
            description: formDesc.trim() || undefined,
            defaultBranch: formBranch.trim() || 'main',
            creator: formCreator.trim() || 'admin',
            gitUrl: trimmedGitUrl,
            testsDir: formTestsDir.trim() || 'tests',
          });
        } else {
          toast.success(`已成功创建用例库: ${trimmedName}`);
        }
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || (modalMode === 'edit' ? '更新用例库失败' : '创建用例库失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 overflow-y-auto p-6 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* 简洁干练的顶部 Page Header (Linear/Vercel 质感) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm flex-shrink-0">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  测试用例库
                </h1>
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
                  {filteredRepos.length} 个用例库
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                独立维护业务架构、测试用例资产与主干分支基线
              </p>
            </div>
          </div>

          <Button
            onClick={handleOpenCreateModal}
            className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>新建用例库</span>
          </Button>
        </div>

        {/* 视图控制与搜索工具栏 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="按名称、编码或创建人搜索..."
              className="pl-9 h-9 rounded-xl bg-white border-slate-200 text-xs shadow-2xs focus-visible:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-200/60 p-1 rounded-xl border border-slate-200/70">
              <button
                type="button"
                onClick={() => setDisplayLayout('grid')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  displayLayout === 'grid'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>卡片</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayLayout('table')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  displayLayout === 'table'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>列表</span>
              </button>
            </div>
          </div>
        </div>

        {/* 模式一：网格卡片视图 (Card Grid View) */}
        {displayLayout === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRepos.map((repo) => {
              const isSelected = selectedRepo === repo.name;
              const initialLetter = (repo.creator || 'A').charAt(0).toUpperCase();

              return (
                <Card
                  key={repo.id || repo.name}
                  className={`group relative rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between border bg-white ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500/10 shadow-sm'
                      : 'border-slate-200/80 hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-3.5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all flex-shrink-0 ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-600'
                          }`}
                        >
                          <PackageCheck className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                              {repo.name}
                            </h3>
                            {isSelected && (
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white flex-shrink-0">
                                <CheckCircle2 className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {renderBranchBadge(repo)}
                            {repo.code && (
                              <span className="font-mono text-[10px] text-slate-400 truncate">
                                #{repo.code}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCreateBranchModal(repo);
                          }}
                          className="h-7 w-7 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg"
                          title="为此用例库新建分支"
                        >
                          <GitFork className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(repo);
                          }}
                          className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg"
                          title="编辑用例库"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRepo(repo);
                          }}
                          className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="删除用例库"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 min-h-[32px]">
                      {repo.description || '暂无描述信息'}
                    </p>

                    {/* Git URL & Tests Dir Badge */}
                    {repo.gitUrl ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-700 font-mono">
                        <Globe className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate flex-1 font-medium" title={repo.gitUrl}>
                          {repo.gitUrl.replace(/^https?:\/\//, '')}
                        </span>
                        {repo.testsDir && (
                          <span className="text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                            {repo.testsDir}/
                          </span>
                        )}
                        {repo.gitUrl.startsWith('http') && (
                          <a
                            href={repo.gitUrl.replace(/\.git$/, '')}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-400 hover:text-blue-600 p-0.5 rounded transition-colors shrink-0"
                            title="在云端打开 Git 仓库"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 italic">
                        <span>未绑定云端 Git 仓库</span>
                      </div>
                    )}
                  </div>

                  {/* Footer Meta info */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex-shrink-0">
                          {initialLetter}
                        </div>
                        <span className="truncate text-slate-700 font-medium">{repo.creator}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 text-[11px] flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(repo.updatedAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-500 font-medium">
                        <strong className="text-slate-900">{repo.caseCount ?? 0}</strong> 用例
                      </span>
                      <Button
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onSelectRepo(repo.name)}
                        className={`h-8 px-3 rounded-lg text-xs font-semibold gap-1 transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        <span>{isSelected ? '已在库中' : '进入用例库'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}

            {/* 新建用例库虚线卡片 */}
            <div
              onClick={handleOpenCreateModal}
              className="group cursor-pointer rounded-2xl border border-dashed border-slate-300/80 bg-white/60 hover:bg-blue-50/30 hover:border-blue-400 p-5 transition-all duration-200 flex flex-col items-center justify-center text-center space-y-2 min-h-[220px]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                  新建测试用例库
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                  划分独立业务用例集合与分支
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 模式二：表格列表视图 (Table List View) */}
        {displayLayout === 'table' && (
          <Card className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-slate-200/70">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[240px] text-xs font-bold text-slate-600 py-3">用例库名称 & 编码</TableHead>
                  <TableHead className="w-[260px] text-xs font-bold text-slate-600 py-3">绑定的 Git 仓库 (Git URL)</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600 py-3">描述</TableHead>
                  <TableHead className="w-[140px] text-xs font-bold text-slate-600 py-3">分支与基线</TableHead>
                  <TableHead className="w-[90px] text-xs font-bold text-slate-600 py-3">用例关联</TableHead>
                  <TableHead className="w-[120px] text-xs font-bold text-slate-600 py-3">创建人</TableHead>
                  <TableHead className="w-[150px] text-xs font-bold text-slate-600 py-3">更新时间</TableHead>
                  <TableHead className="w-[190px] text-right text-xs font-bold text-slate-600 py-3 pr-6">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRepos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-xs text-slate-400">
                      未找到符合条件的用例库
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRepos.map((repo) => {
                    const isSelected = selectedRepo === repo.name;
                    const initialLetter = (repo.creator || 'A').charAt(0).toUpperCase();

                    return (
                      <TableRow key={repo.id || repo.name} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="py-3 font-medium">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                              <PackageCheck className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-900 truncate">{repo.name}</span>
                                {isSelected && <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-1 rounded font-semibold">当前在用</span>}
                              </div>
                              {repo.code && <span className="font-mono text-[10px] text-slate-400 block truncate">#{repo.code}</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          {repo.gitUrl ? (
                            <div className="flex items-center gap-1.5 max-w-[240px]">
                              <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="font-mono text-[11px] text-slate-700 truncate font-medium" title={repo.gitUrl}>
                                {repo.gitUrl.replace(/^https?:\/\//, '')}
                              </span>
                              {repo.gitUrl.startsWith('http') && (
                                <a
                                  href={repo.gitUrl.replace(/\.git$/, '')}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-slate-400 hover:text-blue-600 ml-0.5 shrink-0 transition-colors"
                                  title="在云端打开 Git 仓库"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-mono">未绑定 Git</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-xs text-slate-500 max-w-xs truncate">
                          {repo.description || '暂无描述'}
                        </TableCell>
                        <TableCell className="py-3">
                          {renderBranchBadge(repo)}
                        </TableCell>
                        <TableCell className="py-3 text-xs font-bold text-slate-800">
                          {repo.caseCount ?? 0}
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-700 font-bold text-[10px]">
                              {initialLetter}
                            </div>
                            <span className="text-xs text-slate-700 font-medium">{repo.creator}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-xs text-slate-500 font-mono">
                          {formatDate(repo.updatedAt)}
                        </TableCell>
                        <TableCell className="py-3 text-right pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenCreateBranchModal(repo)}
                              className="h-7 w-7 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg"
                              title="新建分支"
                            >
                              <GitFork className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditModal(repo)}
                              className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg"
                              title="编辑"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteRepo(repo)}
                              className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              title="删除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant={isSelected ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => onSelectRepo(repo.name)}
                              className={`h-7 px-2.5 rounded-lg text-xs font-semibold gap-1 ${
                                isSelected
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-blue-50'
                              }`}
                            >
                              <span>{isSelected ? '进入' : '进入用例库'}</span>
                              <ArrowRight className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* 新建/编辑用例库 Modal 对话框 */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[540px] rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FolderGit2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  {modalMode === 'create' ? '新建测试用例库' : '编辑测试用例库'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  {modalMode === 'create'
                    ? '绑定真实云端 Git 仓库，实现 Test-as-Code 驱动的测试资产库。'
                    : '修改用例库与云端 Git 仓库的基本参数配置。'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 my-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <span>用例库名称</span>
                <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="例如：核心交易系统用例库"
                className="h-9 rounded-xl bg-slate-50 border-slate-200 text-xs focus-visible:bg-white"
                required
              />
            </div>

            {/* 云端 Git 仓库核心绑定配置区 */}
            <div className="rounded-xl border border-blue-200/90 bg-blue-50/50 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span>云端 Git 仓库绑定 (Test-as-Code)</span>
                </div>
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                  GitHub / GitLab
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <span>Git 仓库地址 (Git URL)</span>
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formGitUrl}
                  onChange={(e) => setFormGitUrl(e.target.value)}
                  placeholder="例如：https://github.com/jan-zhang986/trueone-anubis.git"
                  className="h-9 rounded-xl bg-white border-blue-200 text-xs font-mono focus-visible:ring-blue-500"
                  required
                />
                <p className="text-[11px] text-slate-500 leading-normal">
                  必填。平台将直接读取该云端仓库的测试代码与用例目录树。
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    默认分支
                  </Label>
                  <Input
                    value={formBranch}
                    onChange={(e) => setFormBranch(e.target.value)}
                    placeholder="main"
                    className="h-8 rounded-lg bg-white border-blue-200 text-xs font-mono focus-visible:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    测试套件根目录
                  </Label>
                  <Input
                    value={formTestsDir}
                    onChange={(e) => setFormTestsDir(e.target.value)}
                    placeholder="tests"
                    className="h-8 rounded-lg bg-white border-blue-200 text-xs font-mono focus-visible:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  仓库编码 (Code)
                </Label>
                <Input
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="例如：trade-core-repo"
                  className="h-9 rounded-xl bg-slate-50 border-slate-200 text-xs font-mono focus-visible:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  创建人
                </Label>
                <Input
                  value={formCreator}
                  onChange={(e) => setFormCreator(e.target.value)}
                  placeholder="admin"
                  disabled={modalMode === 'edit'}
                  className="h-9 rounded-xl bg-slate-50 border-slate-200 text-xs focus-visible:bg-white disabled:opacity-60"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                描述
              </Label>
              <Textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="请输入关于此用例库范围或模块功能的说明..."
                className="min-h-[70px] rounded-xl bg-slate-50 border-slate-200 text-xs focus-visible:bg-white"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="h-9 rounded-xl text-xs font-medium text-slate-600"
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
              >
                {loading
                  ? modalMode === 'create'
                    ? '创建中...'
                    : '保存中...'
                  : modalMode === 'create'
                  ? '确认创建'
                  : '保存修改'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 新建分支 / 基线 Tag 弹窗 */}
      <Dialog open={isCreateBranchOpen} onOpenChange={setIsCreateBranchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
              <GitBranch className="w-5 h-5 text-emerald-600" />
              新建版本分支 / 基线 Tag
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              为用例库 <span className="font-semibold text-slate-800">「{createBranchTargetRepo?.name}」</span> 创建独立分支，在该分支下的用例修改不会影响主干和其他分支。
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBranchSubmit} className="space-y-4 py-2 text-sm">
            <div className="space-y-1.5">
              <Label htmlFor="branch-target-name" className="text-xs font-semibold text-slate-700">
                所属用例库
              </Label>
              <Input
                id="branch-target-name"
                value={createBranchTargetRepo?.name || ''}
                disabled
                className="h-9 text-xs bg-slate-50 text-slate-600 font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="space-branch-name" className="text-xs font-semibold text-slate-700">
                分支名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="space-branch-name"
                placeholder="例如: v2.1.0 或 feature/user-auth"
                value={branchFormName}
                onChange={(e) => setBranchFormName(e.target.value)}
                className="h-9 text-xs"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="space-branch-base" className="text-xs font-semibold text-slate-700">
                基于来源分支 (Base)
              </Label>
              <Input
                id="space-branch-base"
                value={branchFormBase}
                disabled
                className="h-9 text-xs bg-slate-50 text-slate-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="space-branch-desc" className="text-xs font-semibold text-slate-700">
                分支描述 (可选)
              </Label>
              <Input
                id="space-branch-desc"
                placeholder="请输入该版本分支的迭代目标或描述"
                value={branchFormDesc}
                onChange={(e) => setBranchFormDesc(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateBranchOpen(false)}
                className="h-8 text-xs"
              >
                取消
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={branchLoading}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {branchLoading ? '创建中...' : '确认创建分支'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
