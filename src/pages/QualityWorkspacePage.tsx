/**
 * 质量工作台主路径页面。
 * 这里不再复用旧测试计划列表状态和服务，避免新产品继续暴露 test-plan 语义。
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  LayoutGrid,
  List,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Target,
  Trash2,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { qualityWorkspaceService } from '@/services/quality-workspace';
import { cn } from '@/utils/cn';
import { QualityWorkspaceSheet } from '@/components/features/test-plan/QualityWorkspaceSheet';

interface QualityWorkspaceListItem {
  workspaceId: string;
  projectId: string;
  name: string;
  goal?: string;
  description?: string;
  ownerId?: string;
  status?: string;
  plannedStartTime?: number;
  plannedEndTime?: number;
  actualStartTime?: number;
  actualEndTime?: number;
  tags?: string[];
  scopeDefinition?: Record<string, any>;
  metadata?: Record<string, any>;
  workItems?: any[];
  createUser?: string;
  createdAt?: number;
  updatedAt?: number;
  stats?: Record<string, any>;
  [key: string]: any;
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  DRAFT: { label: '草稿', className: 'bg-slate-100 text-slate-700' },
  TODO: { label: '待开始', className: 'bg-slate-100 text-slate-700' },
  READY: { label: '待开始', className: 'bg-slate-100 text-slate-700' },
  IN_PROGRESS: { label: '进行中', className: 'bg-blue-100 text-blue-700' },
  RUNNING: { label: '进行中', className: 'bg-blue-100 text-blue-700' },
  DONE: { label: '已完成', className: 'bg-emerald-100 text-emerald-700' },
  COMPLETED: { label: '已完成', className: 'bg-emerald-100 text-emerald-700' },
  ARCHIVED: { label: '已归档', className: 'bg-amber-100 text-amber-700' },
};

const TARGET_TYPE_LABEL: Record<string, string> = {
  ITERATION: '迭代',
  REQUIREMENT: '需求',
  VERSION: '版本',
  RELEASE_BATCH: '发布批次',
  MANUAL: '手动范围',
};

function unwrap<T>(res: any): T {
  return (res?.data ?? res) as T;
}

function unwrapList(res: any) {
  const data = res?.data ?? res;
  const list = data?.list ?? data?.records ?? data?.items ?? data;
  return {
    list: Array.isArray(list) ? list : [],
    total: data?.total ?? data?.totalCount ?? (Array.isArray(list) ? list.length : 0),
  };
}

function formatDate(value?: number | string) {
  if (!value) return '未设置';
  const date = new Date(Number(value));
  return Number.isNaN(date.getTime()) ? '未设置' : date.toLocaleDateString();
}

function getTargetInfo(item: QualityWorkspaceListItem) {
  const scope = item.scopeDefinition || {};
  const metadata = item.metadata || {};
  const type = item.targetType || scope.targetType || metadata.targetType || 'MANUAL';
  const name = item.targetName || scope.targetName || metadata.targetName || item.goal || '手动质量范围';
  const id = item.targetId || scope.targetId || metadata.targetId || '';
  return {
    type,
    label: TARGET_TYPE_LABEL[type] || type,
    name,
    id,
  };
}

function getStatusMeta(status?: string) {
  return STATUS_META[status || 'TODO'] || { label: status || '待开始', className: 'bg-slate-100 text-slate-700' };
}

function getRiskCount(item: QualityWorkspaceListItem) {
  const stats = item.stats || {};
  if (stats.riskCount != null) {
    return Number(stats.riskCount);
  }
  return Number(stats.failed || 0) + Number(stats.blocked || 0);
}

export function QualityWorkspacePage() {
  const navigate = useNavigate();
  const [projectId] = useState(() => localStorage.getItem('currentProjectId') || 'default-project');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<QualityWorkspaceListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<QualityWorkspaceListItem | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredTotalText = useMemo(() => `${total || items.length} 个工作台`, [total, items.length]);

  const loadList = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const response = await qualityWorkspaceService.getWorkspaceList({
        projectId,
        current: page,
        pageSize,
        keyword: keyword || undefined,
        statuses: status === 'ALL' ? undefined : [status],
      });
      const { list, total: nextTotal } = unwrapList(response);
      const normalized = list.map((item: any) => ({
        ...item,
        workspaceId: item.workspaceId || item.id,
      }));
      const statsEntries = await Promise.all(
        normalized.map(async (item: QualityWorkspaceListItem) => {
          if (!item.workspaceId) return [item.workspaceId, null] as const;
          try {
            return [item.workspaceId, unwrap<Record<string, any>>(await qualityWorkspaceService.getWorkspaceStats(item.workspaceId))] as const;
          } catch {
            return [item.workspaceId, null] as const;
          }
        })
      );
      const statsMap = new Map(statsEntries.filter(([id]) => Boolean(id)));
      setItems(normalized.map((item: QualityWorkspaceListItem) => ({ ...item, stats: statsMap.get(item.workspaceId) || item.stats || {} })));
      setTotal(nextTotal);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || '加载测试计划失败');
    } finally {
      setLoading(false);
    }
  }, [projectId, page, pageSize, keyword, status]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (item: QualityWorkspaceListItem) => {
    setEditing(item);
    setSheetOpen(true);
  };

  const archiveWorkspace = async (item: QualityWorkspaceListItem) => {
    if (!item.workspaceId) return;
    const toastId = toast.loading('正在归档测试计划...');
    try {
      await qualityWorkspaceService.archiveWorkspace(item.workspaceId);
      toast.success('测试计划已归档', { id: toastId });
      loadList();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || '归档失败', { id: toastId });
    }
  };

  const deleteWorkspace = async (item: QualityWorkspaceListItem) => {
    if (!item.workspaceId) return;
    if (!window.confirm(`确定删除测试计划「${item.name}」吗？`)) return;
    const toastId = toast.loading('正在删除测试计划...');
    try {
      await qualityWorkspaceService.deleteWorkspace(item.workspaceId);
      toast.success('测试计划已删除', { id: toastId });
      loadList();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || '删除失败', { id: toastId });
    }
  };

  const goDetail = (item: QualityWorkspaceListItem) => {
    if (!item.workspaceId) return;
    navigate(`/quality-workspace/${item.workspaceId}?menu=quality-workspace&tab=workspace`);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f7f8fb]">
      <div className="border-b border-slate-200 bg-white px-8 py-4">
        <div className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/20">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-950">测试计划</h1>
              <p className="hidden text-xs font-medium text-slate-500 lg:block">组织版本与迭代测试分析、评审、检查项执行、缺陷复测与准出评估。</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="mr-2 flex items-center gap-1 rounded-xl bg-slate-100 p-1">
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-7 w-7 rounded-lg', viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600')}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-7 w-7 rounded-lg', viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600')}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="h-9 rounded-xl font-bold text-slate-500 hover:bg-slate-50" onClick={loadList} disabled={loading}>
              <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
              刷新
            </Button>
            <Button size="sm" className="h-9 rounded-xl bg-slate-900 px-4 text-xs font-black text-white hover:bg-slate-800" onClick={openCreate}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              创建测试计划
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-row items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-9 rounded-xl border-none bg-slate-100/50 pl-9 text-xs focus:bg-white"
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setPage(1);
              }}
              placeholder="搜索工作台、关联对象、质量目标..."
            />
          </div>
          <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}>
            <SelectTrigger className="h-9 w-[120px] rounded-xl border-none bg-slate-100/50 px-3 text-xs focus:bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
              <SelectItem value="ALL">全部状态</SelectItem>
              <SelectItem value="DRAFT">草稿</SelectItem>
              <SelectItem value="IN_PROGRESS">进行中</SelectItem>
              <SelectItem value="DONE">已完成</SelectItem>
              <SelectItem value="ARCHIVED">已归档</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex h-9 items-center rounded-xl bg-emerald-50 px-3 text-[11px] font-black text-emerald-700">{filteredTotalText}</div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading && !items.length ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-slate-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            正在加载测试计划
          </div>
        ) : items.length ? (
          viewMode === 'grid' ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => {
                const target = getTargetInfo(item);
                const statusMeta = getStatusMeta(item.status);
                const stats = item.stats || {};
                const totalWorkItems = Number(stats.total ?? item.workItemCount ?? item.workItems?.length ?? 0);
                const executionRate = Math.round(Number(stats.executionRate || 0) * 100);
                const passRate = Math.round(Number(stats.passRate || 0) * 100);
                const riskCount = getRiskCount(item);
                return (
                  <Card key={item.workspaceId} className="group relative flex flex-col overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm transition hover:border-blue-200 hover:shadow-md">
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Badge className={cn('px-1.5 py-0 text-[9px] rounded-md font-bold', statusMeta.className)}>{statusMeta.label}</Badge>
                            <Badge variant="outline" className="px-1.5 py-0 text-[9px] rounded-md border-slate-100 text-slate-400">{target.label}</Badge>
                          </div>
                          <h2 className="truncate text-sm font-black text-slate-900 group-hover:text-blue-600 cursor-pointer" onClick={() => goDetail(item)}>{item.name || '未命名工作台'}</h2>
                          <p className="mt-1 line-clamp-1 text-[11px] text-slate-400 font-medium">{item.description || item.goal || '暂无描述'}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-slate-300 hover:text-slate-600 hover:bg-slate-50">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 rounded-xl p-1">
                            <DropdownMenuItem className="rounded-lg text-xs" onClick={() => openEdit(item)}>编辑</DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg text-xs" onClick={() => archiveWorkspace(item)}>归档</DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg text-xs text-rose-600 focus:text-rose-600" onClick={() => deleteWorkspace(item)}>删除</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-50 pt-3">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-tighter text-slate-400">执行</span>
                            <span className="text-[13px] font-black text-slate-900 leading-none">{executionRate}%</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-tighter text-emerald-500">通过</span>
                            <span className="text-[13px] font-black text-emerald-600 leading-none">{passRate}%</span>
                          </div>
                          {riskCount > 0 && (
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black uppercase tracking-tighter text-rose-500">风险</span>
                              <span className="text-[13px] font-black text-rose-600 leading-none">{riskCount}</span>
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 w-8 rounded-lg bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white transition-all group-hover:translate-x-0.5" onClick={() => goDetail(item)}>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="bg-slate-50/50 px-4 py-2 flex items-center justify-between text-[9px] font-bold text-slate-400 border-t border-slate-100/50">
                      <span className="truncate max-w-[80px]">{item.ownerId || '未设置'}</span>
                      <span>{formatDate(item.plannedStartTime)}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="px-6 py-3">工作台名称</th>
                    <th className="px-6 py-3">状态</th>
                    <th className="px-6 py-3">进度</th>
                    <th className="px-6 py-3">通过率</th>
                    <th className="px-6 py-3">负责人</th>
                    <th className="px-6 py-3">更新时间</th>
                    <th className="px-6 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((item) => {
                    const statusMeta = getStatusMeta(item.status);
                    const stats = item.stats || {};
                    const executionRate = Math.round(Number(stats.executionRate || 0) * 100);
                    const passRate = Math.round(Number(stats.passRate || 0) * 100);
                    return (
                      <tr key={item.workspaceId} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-900 group-hover:text-blue-600 cursor-pointer" onClick={() => goDetail(item)}>{item.name}</span>
                            <span className="text-[10px] text-slate-400">{getTargetInfo(item).name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <Badge className={cn('px-2 py-0 text-[10px] rounded-md font-bold', statusMeta.className)}>{statusMeta.label}</Badge>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${executionRate}%` }} />
                            </div>
                            <span className="text-xs font-black text-slate-700">{executionRate}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className={cn('text-xs font-black', passRate >= 80 ? 'text-emerald-600' : 'text-slate-600')}>{passRate}%</span>
                        </td>
                        <td className="px-6 py-3 text-xs font-medium text-slate-500">{item.ownerId || '未设置'}</td>
                        <td className="px-6 py-3 text-xs text-slate-400 font-medium">{formatDate(item.updatedAt)}</td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-300 hover:text-blue-600 hover:bg-blue-50" onClick={() => goDetail(item)}>
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-300">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                <DropdownMenuItem onClick={() => openEdit(item)}>编辑</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => archiveWorkspace(item)}>归档</DropdownMenuItem>
                                <DropdownMenuItem className="text-rose-600" onClick={() => deleteWorkspace(item)}>删除</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="flex h-96 flex-col items-center justify-center rounded-[32px] border border-dashed border-slate-200 bg-white text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
              <ClipboardList className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900">还没有测试计划</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">从一个需求、版本或发布批次开始，建立测试分析、任务执行、风险证据和资产沉淀的完整闭环。</p>
            <Button className="mt-6 rounded-2xl bg-slate-900 text-white hover:bg-slate-800" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              创建测试计划
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 bg-white px-8 py-4">
        <div className="text-sm text-slate-500">第 {page} 页，每页 {pageSize} 条</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl" disabled={page <= 1 || loading} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>上一页</Button>
          <Button variant="outline" className="rounded-xl" disabled={page * pageSize >= total || loading} onClick={() => setPage((prev) => prev + 1)}>下一页</Button>
        </div>
      </div>

      <QualityWorkspaceSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        projectId={projectId}
        workspaceId={editing?.workspaceId}
        initialValues={editing}
        onSuccess={(workspaceId) => {
          loadList();
          if (!editing && workspaceId) {
            navigate(`/quality-workspace/${workspaceId}?menu=quality-workspace&tab=workspace`);
          }
        }}
      />
    </div>
  );
}
