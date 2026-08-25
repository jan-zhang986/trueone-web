import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive,
  ArrowRight,
  Bookmark,
  ClipboardCheck,
  FileText,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { requirementService, Requirement } from '@/services/requirement';
import { qualityWorkspaceService, QualityTask } from '@/services/quality-workspace';
import { cn } from '@/utils/cn';

type FormState = Partial<Requirement>;

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  IN_REVIEW: '评审中',
  READY: '待测试',
  TESTING: '测试中',
  DONE: '已完成',
  ARCHIVED: '已归档',
};

const STATUS_CLASS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  IN_REVIEW: 'bg-amber-100 text-amber-700',
  READY: 'bg-blue-100 text-blue-700',
  TESTING: 'bg-indigo-100 text-indigo-700',
  DONE: 'bg-emerald-100 text-emerald-700',
  ARCHIVED: 'bg-slate-200 text-slate-600',
};

const TASK_TYPE_LABEL: Record<string, string> = {
  ANALYSIS: '测试分析',
  SMOKE: '冒烟验证',
  ACCEPTANCE: '功能验收',
  API_REGRESSION: 'API回归',
  AUTOMATION_REGRESSION: '自动化回归',
  SPECIAL: '专项测试',
  DEFECT_RETEST: '缺陷复测',
  RELEASE_CHECK: '准出检查',
};

const TASK_STATUS_LABEL: Record<string, string> = {
  TODO: '待开始',
  DRAFT: '草稿',
  IN_PROGRESS: '进行中',
  RUNNING: '进行中',
  DONE: '已完成',
  COMPLETED: '已完成',
  BLOCKED: '阻塞',
};

function unwrapList(res: any) {
  const data = res?.data ?? res;
  const list = data?.list ?? data?.records ?? data?.items ?? data;
  return {
    list: Array.isArray(list) ? list : [],
    total: data?.total ?? data?.totalCount ?? (Array.isArray(list) ? list.length : 0),
  };
}

function unwrap<T>(res: any): T {
  return (res?.data ?? res) as T;
}

function formatTime(value?: number) {
  if (!value) return '未更新';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '未更新' : date.toLocaleDateString();
}

function normalizeTextList(value: any): string[] {
  return Array.isArray(value) ? value.filter(Boolean).map(String) : [];
}

function emptyForm(projectId: string): FormState {
  return {
    projectId,
    sourceType: 'LOCAL',
    status: 'DRAFT',
    priority: 'P1',
  };
}

export function RequirementQualityPage() {
  const navigate = useNavigate();
  const [projectId] = useState(() => localStorage.getItem('currentProjectId') || 'default-project');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<Requirement[]>([]);
  const [selected, setSelected] = useState<Requirement | null>(null);
  const [trace, setTrace] = useState<any>(null);
  const [workspaceStats, setWorkspaceStats] = useState<Record<string, any> | null>(null);
  const [workspaceTasks, setWorkspaceTasks] = useState<QualityTask[]>([]);
  const [workspaceAnalysis, setWorkspaceAnalysis] = useState<any>(null);
  const [runtimeLoading, setRuntimeLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [traceLoading, setTraceLoading] = useState(false);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const totalText = useMemo(() => `${total || items.length} 个需求`, [items.length, total]);

  const loadList = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await requirementService.getRequirementPage({
        projectId,
        current: page,
        pageSize,
        keyword: keyword || undefined,
        statuses: status === 'ALL' ? undefined : [status],
      });
      const { list, total: nextTotal } = unwrapList(res);
      const normalized = list.map((item: any) => ({
        ...item,
        requirementId: item.requirementId || item.id,
      }));
      setItems(normalized);
      setTotal(nextTotal);
      setSelected((prev) => {
        if (!normalized.length) return null;
        if (!prev) return normalized[0];
        return normalized.find((item: Requirement) => item.requirementId === prev.requirementId) || normalized[0];
      });
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || '加载需求质量列表失败');
    } finally {
      setLoading(false);
    }
  }, [projectId, page, pageSize, keyword, status]);

  const loadTrace = useCallback(async (requirement?: Requirement | null) => {
    if (!requirement?.requirementId) {
      setTrace(null);
      return;
    }
    setTraceLoading(true);
    try {
      setTrace(unwrap(await requirementService.getTrace(requirement.requirementId)));
    } catch (error: any) {
      console.error(error);
      setTrace(null);
    } finally {
      setTraceLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadTrace(selected);
  }, [selected?.requirementId, loadTrace]);

  const openCreate = () => setEditing(emptyForm(projectId));

  const openEdit = (item: Requirement) => setEditing({ ...item, projectId });

  const closeForm = () => {
    if (saving) return;
    setEditing(null);
  };

  const saveRequirement = async () => {
    if (!editing?.title?.trim()) {
      toast.error('需求标题不能为空');
      return;
    }
    setSaving(true);
    const toastId = toast.loading(editing.requirementId ? '正在更新需求...' : '正在创建需求...');
    try {
      const requirementId = unwrap<string>(await requirementService.saveRequirement({
        ...editing,
        projectId,
        title: editing.title.trim(),
      }));
      toast.success('需求已保存，并已确保默认质量工作台', { id: toastId });
      setEditing(null);
      await loadList();
      if (requirementId) {
        const detail = unwrap<Requirement>(await requirementService.getRequirementDetail(requirementId));
        setSelected(detail);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || '保存需求失败', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const archiveRequirement = async (item: Requirement) => {
    if (!item.requirementId) return;
    const toastId = toast.loading('正在归档需求...');
    try {
      await requirementService.archiveRequirement(item.requirementId);
      toast.success('需求已归档', { id: toastId });
      await loadList();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || '归档需求失败', { id: toastId });
    }
  };

  const deleteRequirement = async (item: Requirement) => {
    if (!item.requirementId) return;
    if (!window.confirm(`确定删除需求「${item.title}」吗？质量工作台和资产不会被物理删除。`)) return;
    const toastId = toast.loading('正在删除需求...');
    try {
      await requirementService.deleteRequirement(item.requirementId);
      toast.success('需求已删除', { id: toastId });
      await loadList();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || '删除需求失败', { id: toastId });
    }
  };

  const enterWorkspace = async (item?: Requirement | null) => {
    if (!item?.requirementId) return;
    const toastId = toast.loading('正在进入需求质量工作台...');
    try {
      const workspace = unwrap<any>(await requirementService.ensureQualityWorkspace(item.requirementId));
      const workspaceId = workspace?.workspaceId || workspace?.id;
      toast.success('已进入质量工作台', { id: toastId });
      if (workspaceId) {
        navigate(`/quality-workspace/${workspaceId}?menu=quality-workspace&tab=workspace`);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || '进入质量工作台失败', { id: toastId });
    }
  };

  const reports = trace?.reports || [];
  const workspaces = trace?.workspaces || [];
  const proposals = trace?.proposals || [];
  const cases = trace?.cases || [];
  const selectedQualitySummary = trace?.qualityStatusEvidence || selected?.qualitySummary || {};
  const selectedStatusReason = selectedQualitySummary.statusReason || '系统会根据质量工作台进展自动判定需求状态。';
  const selectedBlockers = normalizeTextList(selectedQualitySummary.blockers);
  const selectedNextActions = normalizeTextList(selectedQualitySummary.nextActions);
  const selectedStatus = selected?.status || 'DRAFT';
  const primaryWorkspaceId = workspaces[0]?.workspaceId || selected?.workspaceIds?.[0] || '';
  const executed = Number(workspaceStats?.executed || 0);
  const totalItems = Number(workspaceStats?.total || 0);
  const riskCount = Number(workspaceStats?.failed || 0) + Number(workspaceStats?.blocked || 0);
  const executionRate = Math.round(Number(workspaceStats?.executionRate || 0) * 100);
  const passRate = Math.round(Number(workspaceStats?.passRate || 0) * 100);

  const loadWorkspaceRuntime = useCallback(async (workspaceId?: string) => {
    if (!workspaceId) {
      setWorkspaceStats(null);
      setWorkspaceTasks([]);
      setWorkspaceAnalysis(null);
      return;
    }
    setRuntimeLoading(true);
    try {
      const [statsRes, tasksRes, analysisRes] = await Promise.all([
        qualityWorkspaceService.getWorkspaceStats(workspaceId).catch(() => null),
        qualityWorkspaceService.getTaskList(workspaceId).catch(() => null),
        qualityWorkspaceService.getAnalysis(workspaceId).catch(() => null),
      ]);
      setWorkspaceStats(statsRes ? unwrap<Record<string, any>>(statsRes) : null);
      const rawTasks = tasksRes ? unwrap<any>(tasksRes) : [];
      setWorkspaceTasks(Array.isArray(rawTasks) ? rawTasks : rawTasks?.list || []);
      setWorkspaceAnalysis(analysisRes ? unwrap<any>(analysisRes) : null);
    } catch (error) {
      console.error(error);
      setWorkspaceStats(null);
      setWorkspaceTasks([]);
      setWorkspaceAnalysis(null);
    } finally {
      setRuntimeLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspaceRuntime(primaryWorkspaceId);
  }, [primaryWorkspaceId, loadWorkspaceRuntime]);

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-[#f4f7f4]">
      <div className="flex w-[460px] shrink-0 flex-col border-r border-emerald-100 bg-white/95">
        <div className="border-b border-emerald-100 bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <div className="mb-1 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                Quality
              </div>
              <h1 className="text-xl font-black tracking-tight text-slate-950">需求质量</h1>
            </div>
            <Button className="h-9 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-800 px-4 text-xs font-bold text-white shadow-md transition-all hover:scale-105 active:scale-95" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              新建需求
            </Button>
          </div>

          <div className="mt-4 flex flex-row items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-9 rounded-xl border-none bg-slate-100/50 pl-9 text-xs focus:bg-white"
                value={keyword}
                onChange={(event) => {
                  setKeyword(event.target.value);
                  setPage(1);
                }}
                placeholder="搜索需求..."
              />
            </div>
            <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}>
              <SelectTrigger className="h-9 w-[90px] rounded-xl border-none bg-slate-100/50 px-2 text-[11px] font-bold text-slate-700 focus:bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                <SelectItem value="ALL">全部</SelectItem>
                <SelectItem value="DRAFT">草稿</SelectItem>
                <SelectItem value="IN_REVIEW">评审中</SelectItem>
                <SelectItem value="READY">待测试</SelectItem>
                <SelectItem value="TESTING">测试中</SelectItem>
                <SelectItem value="DONE">已完成</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              className="h-9 w-9 shrink-0 rounded-xl border-none bg-slate-100/50 p-0 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700" 
              disabled={loading} 
              onClick={loadList}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            </Button>
          </div>
          <div className="mt-3 rounded-xl bg-emerald-50/50 px-3 py-1.5 text-[11px] font-black text-emerald-700">
            {totalText}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading && !items.length ? (
            <div className="flex h-64 items-center justify-center rounded-3xl border border-dashed border-emerald-100 text-slate-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              正在加载需求
            </div>
          ) : items.length ? (
            <div className="space-y-3">
              {items.map((item) => {
                const itemStatus = item.status || 'DRAFT';
                const active = selected?.requirementId === item.requirementId;
                const summary = item.qualitySummary || {};
                const itemExecutionRate = Math.round(Number(summary.executionRate || 0) * 100);
                const itemRiskCount = Number(summary.riskCount || 0);
                const itemTotal = Number(summary.total || 0);
                const itemStatusReason = summary.statusReason || '等待质量流程推进';
                return (
                  <Card
                    key={item.requirementId}
                    className={cn(
                      'group relative cursor-pointer overflow-hidden rounded-[16px] border p-3 transition-all duration-300',
                      active 
                        ? 'border-emerald-400 bg-emerald-50/80 shadow-sm' 
                        : 'border-slate-100 bg-white hover:border-emerald-200 hover:shadow-sm'
                    )}
                    onClick={() => setSelected(item)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={cn('rounded-md px-1.5 py-0 text-[9px] font-black uppercase tracking-tight', STATUS_CLASS[itemStatus] || STATUS_CLASS.DRAFT)}>
                            {STATUS_LABEL[itemStatus] || itemStatus}
                          </Badge>
                          <h2 className="line-clamp-1 text-[14px] font-black tracking-tight text-slate-950 group-hover:text-emerald-700">{item.title}</h2>
                        </div>
                        
                        <div className="mt-2 flex items-center gap-3">
                          <p className="line-clamp-1 text-[11px] font-semibold text-emerald-700/70">{itemStatusReason}</p>
                          {itemRiskCount > 0 && (
                            <span className="flex items-center text-[10px] font-bold text-rose-500">
                              <ShieldAlert className="mr-1 h-3 w-3" />
                              {itemRiskCount} 风险
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex shrink-0 items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={cn(
                            "h-7 w-7 rounded-lg transition-all",
                            active ? "bg-emerald-600 text-white hover:bg-emerald-700" : "text-slate-300 hover:bg-emerald-50 hover:text-emerald-600"
                          )}
                          onClick={(e) => { e.stopPropagation(); enterWorkspace(item); }}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-300 hover:bg-slate-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 rounded-xl p-1.5">
                            <DropdownMenuItem className="rounded-lg text-xs" onClick={(event) => { event.stopPropagation(); openEdit(item); }}>编辑需求</DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg text-xs" onClick={(event) => { event.stopPropagation(); archiveRequirement(item); }}>归档</DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg text-xs text-rose-600 focus:text-rose-600" onClick={(event) => { event.stopPropagation(); deleteRequirement(item); }}>删除</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-100/50 pt-2.5">
                      <div className="flex items-center gap-4">
                        <div className="flex items-baseline gap-1">
                          <span className="text-[12px] font-black text-slate-900">{itemExecutionRate}%</span>
                          <span className="text-[8px] font-bold uppercase tracking-tighter text-slate-400">进度</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-[12px] font-black text-blue-700">{itemTotal}</span>
                          <span className="text-[8px] font-bold uppercase tracking-tighter text-slate-400">用例</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400">
                        <span className="max-w-[60px] truncate">{item.ownerId || '未设置'}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-200" />
                        <span>{formatTime(item.updateTime)}</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="flex h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-emerald-100 text-center">
              <FileText className="mb-4 h-10 w-10 text-emerald-300" />
              <div className="font-black text-slate-900">还没有需求</div>
              <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">先把需求放进系统，平台会自动准备默认质量工作台。</p>
              <Button className="mt-5 rounded-2xl bg-emerald-700 text-white hover:bg-emerald-800" onClick={openCreate}>创建需求</Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-emerald-100 p-4">
          <Button variant="outline" className="rounded-xl" disabled={page <= 1 || loading} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>上一页</Button>
          <span className="text-sm text-slate-500">第 {page} 页</span>
          <Button variant="outline" className="rounded-xl" disabled={page * pageSize >= total || loading} onClick={() => setPage((prev) => prev + 1)}>下一页</Button>
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-auto p-8">
        {selected ? (
          <div className="mx-auto max-w-6xl space-y-6">
            <Card className="overflow-hidden rounded-[32px] border-0 bg-slate-950 text-white shadow-2xl shadow-emerald-900/20">
              <div className="relative p-8">
                <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl" />
                <div className="relative flex flex-row items-center justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge className={cn('rounded-lg', STATUS_CLASS[selectedStatus] || STATUS_CLASS.DRAFT)}>
                        {STATUS_LABEL[selectedStatus] || selectedStatus}
                      </Badge>
                      <Badge className="rounded-lg bg-white/10 text-[10px] font-bold text-white/80 uppercase tracking-wider">{selected.priority || 'P1'}</Badge>
                      <Badge className="rounded-lg bg-white/10 text-[10px] font-bold text-white/80 uppercase tracking-wider">{selected.sourceType || 'LOCAL'}</Badge>
                    </div>
                    <h2 className="text-2xl font-black leading-tight tracking-tight">{selected.title}</h2>
                  </div>
                  <div className="flex flex-row items-center gap-3 shrink-0">
                    <Button 
                      variant="outline" 
                      className="h-10 rounded-xl border-white/20 bg-white/5 px-4 text-xs font-bold text-white backdrop-blur-md transition-all hover:bg-white/10 active:scale-95" 
                      onClick={() => openEdit(selected)}
                    >
                      编辑
                    </Button>
                    <Button 
                      className="h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 px-5 text-xs font-black text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95" 
                      onClick={() => enterWorkspace(selected)}
                    >
                      进入工作台
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="mt-4 max-w-4xl line-clamp-2 text-xs leading-relaxed text-slate-400">{selected.description || '暂无详细描述。'}</p>
              </div>
            </Card>

            <div className="grid gap-5 md:grid-cols-4">
              <Card className="rounded-[24px] border-emerald-100 bg-white p-5">
                <ClipboardCheck className="mb-4 h-6 w-6 text-emerald-600" />
                <div className="text-3xl font-black text-slate-950">{executionRate}%</div>
                <div className="mt-1 text-sm text-slate-500">执行进度</div>
              </Card>
              <Card className="rounded-[24px] border-blue-100 bg-white p-5">
                <ShieldAlert className="mb-4 h-6 w-6 text-blue-600" />
                <div className="text-3xl font-black text-slate-950">{riskCount}</div>
                <div className="mt-1 text-sm text-slate-500">风险项</div>
              </Card>
              <Card className="rounded-[24px] border-amber-100 bg-white p-5">
                <Bookmark className="mb-4 h-6 w-6 text-amber-600" />
                <div className="text-3xl font-black text-slate-950">{proposals.length}</div>
                <div className="mt-1 text-sm text-slate-500">资产沉淀提案</div>
              </Card>
              <Card className="rounded-[24px] border-slate-200 bg-white p-5">
                <FileText className="mb-4 h-6 w-6 text-slate-600" />
                <div className="text-3xl font-black text-slate-950">{cases.length}</div>
                <div className="mt-1 text-sm text-slate-500">关联 Case</div>
              </Card>
            </div>

            <Card className="rounded-[28px] border-emerald-100 bg-white p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-950">状态依据</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{selectedStatusReason}</p>
                </div>
                <div className="grid min-w-[320px] grid-cols-2 gap-3 text-center">
                  <div className="rounded-2xl bg-emerald-50 p-4">
                    <div className="text-2xl font-black text-emerald-700">{selectedQualitySummary.doneTaskCount || 0}</div>
                    <div className="mt-1 text-xs text-emerald-700">已完成任务</div>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-4">
                    <div className="text-2xl font-black text-amber-700">{selectedQualitySummary.unfinishedTaskCount || 0}</div>
                    <div className="mt-1 text-xs text-amber-700">未完成任务</div>
                  </div>
                </div>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
                  <div className="mb-3 text-sm font-black text-rose-700">阻塞项</div>
                  {selectedBlockers.length ? (
                    <div className="space-y-2">
                      {selectedBlockers.map((item) => (
                        <div key={item} className="rounded-xl bg-white px-3 py-2 text-sm text-rose-700">{item}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">当前没有失败或阻塞类状态阻碍。</div>
                  )}
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="mb-3 text-sm font-black text-blue-700">下一步建议</div>
                  {selectedNextActions.length ? (
                    <div className="space-y-2">
                      {selectedNextActions.map((item) => (
                        <div key={item} className="rounded-xl bg-white px-3 py-2 text-sm text-blue-700">{item}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">质量状态已闭环，后续只需关注变更回归。</div>
                  )}
                </div>
              </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <Card className="rounded-[28px] border-slate-200 bg-white p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">质量追踪</h3>
                    <p className="mt-1 text-sm text-slate-500">需求到工作台、报告、Proposal、Case 的可追踪关系。</p>
                  </div>
                  {traceLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
                </div>
                <div className="space-y-3">
                  {workspaces.map((workspace: any) => (
                    <button
                      key={workspace.workspaceId}
                      className="flex w-full items-center justify-between rounded-2xl bg-emerald-50 p-4 text-left hover:bg-emerald-100"
                      onClick={() => navigate(`/quality-workspace/${workspace.workspaceId}?menu=quality-workspace&tab=workspace`)}
                    >
                      <div>
                        <div className="font-black text-slate-950">{workspace.name}</div>
                        <div className="mt-1 text-sm text-slate-500">状态：{workspace.status || '-'}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-emerald-700" />
                    </button>
                  ))}
                  {!workspaces.length ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">暂无工作台，点击“进入质量工作台”会自动创建。</div>
                  ) : null}
                </div>
              </Card>

              <Card className="rounded-[28px] border-slate-200 bg-white p-6">
                <h3 className="text-lg font-black text-slate-950">需求信息</h3>
                <div className="mt-5 space-y-4 text-sm">
                  <div className="flex justify-between gap-4"><span className="text-slate-400">负责人</span><span className="font-bold text-slate-700">{selected.ownerId || '未设置'}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-slate-400">迭代/版本</span><span className="font-bold text-slate-700">{selected.iterationId || '未设置'}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-slate-400">外部ID</span><span className="font-bold text-slate-700">{selected.sourceRequirementId || selected.requirementId}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-slate-400">更新时间</span><span className="font-bold text-slate-700">{formatTime(selected.updateTime)}</span></div>
                  {selected.url ? (
                    <a className="block truncate rounded-2xl bg-slate-50 px-4 py-3 text-blue-600 hover:underline" href={selected.url} target="_blank" rel="noreferrer">{selected.url}</a>
                  ) : null}
                </div>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <Card className="rounded-[28px] border-slate-200 bg-white p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">测试分析</h3>
                    <p className="mt-1 text-sm text-slate-500">需求摘要会自动成为分析输入，先明确测什么，再生成任务。</p>
                  </div>
                  {runtimeLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
                </div>
                <div className="rounded-2xl bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-black text-slate-900">{workspaceAnalysis?.title || '尚未创建测试分析'}</div>
                      <div className="mt-2 text-sm text-slate-500">状态：{workspaceAnalysis?.status || '待开始'} · 风险等级：{workspaceAnalysis?.riskLevel || '未评估'}</div>
                    </div>
                    <Button
                      variant="outline"
                      className="rounded-2xl bg-white"
                      disabled={!primaryWorkspaceId}
                      onClick={() => primaryWorkspaceId && navigate(`/quality-workspace/${primaryWorkspaceId}?menu=quality-workspace&tab=workspace&detailTab=document`)}
                    >
                      进入分析
                    </Button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl bg-emerald-50 p-4">
                    <div className="text-2xl font-black text-emerald-700">{executed}</div>
                    <div className="mt-1 text-xs text-emerald-700">已执行</div>
                  </div>
                  <div className="rounded-2xl bg-blue-50 p-4">
                    <div className="text-2xl font-black text-blue-700">{totalItems}</div>
                    <div className="mt-1 text-xs text-blue-700">执行项</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-2xl font-black text-slate-900">{passRate}%</div>
                    <div className="mt-1 text-xs text-slate-500">通过率</div>
                  </div>
                </div>
              </Card>

              <Card className="rounded-[28px] border-slate-200 bg-white p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">测试任务</h3>
                    <p className="mt-1 text-sm text-slate-500">一个需求下可以组织多个任务，任务再拆成执行项。</p>
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    disabled={!primaryWorkspaceId}
                    onClick={() => primaryWorkspaceId && navigate(`/quality-workspace/${primaryWorkspaceId}?menu=quality-workspace&tab=workspace&detailTab=execution`)}
                  >
                    查看任务
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {workspaceTasks.map((task) => (
                    <div key={task.taskId} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-black text-slate-950">{task.title || TASK_TYPE_LABEL[task.taskType] || task.taskType}</div>
                          <div className="mt-1 text-sm text-slate-500">{TASK_TYPE_LABEL[task.taskType] || task.taskType}</div>
                        </div>
                        <Badge className="rounded-lg bg-slate-100 text-slate-700">{TASK_STATUS_LABEL[task.status] || task.status || '待开始'}</Badge>
                      </div>
                      {task.suiteId ? <div className="mt-3 text-xs text-blue-600">引用套件：{task.suiteId}</div> : null}
                    </div>
                  ))}
                  {!workspaceTasks.length ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">默认任务会在创建质量工作台时生成。</div>
                  ) : null}
                </div>
              </Card>
            </div>

            <Card className="rounded-[28px] border-slate-200 bg-white p-6">
              <h3 className="text-lg font-black text-slate-950">最新质量报告</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {reports.map((report: any) => (
                  <button
                    key={report.reportId}
                    className="rounded-2xl border border-slate-200 p-4 text-left hover:border-blue-200 hover:bg-blue-50"
                    onClick={() => navigate(`/quality-workspace?menu=quality-workspace&tab=test-report&reportId=${report.reportId}`)}
                  >
                    <div className="font-black text-slate-950">{report.name}</div>
                    <div className="mt-2 text-sm text-slate-500">{report.reportType} · v{report.versionNo || 1}</div>
                  </button>
                ))}
                {!reports.length ? <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">完成质量任务后，会自动生成阶段报告和总览报告。</div> : null}
              </div>
            </Card>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">选择一个需求查看质量闭环。</div>
        )}
      </div>

      {editing ? (
        <div className="fixed inset-y-0 right-0 z-50 flex w-[520px] flex-col border-l border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-100 p-6">
            <h2 className="text-xl font-black text-slate-950">{editing.requirementId ? '编辑需求' : '创建需求'}</h2>
            <p className="mt-1 text-sm text-slate-500">保存后会自动确保默认质量工作台，测试分析会读取需求摘要。</p>
          </div>
          <div className="flex-1 space-y-5 overflow-auto p-6">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">需求标题</label>
              <Input value={editing.title || ''} onChange={(event) => setEditing({ ...editing, title: event.target.value })} placeholder="例如：订单退款流程优化" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">需求描述</label>
              <Textarea className="min-h-32" value={editing.description || ''} onChange={(event) => setEditing({ ...editing, description: event.target.value })} placeholder="业务背景、验收标准、影响范围、风险点..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">状态</label>
                <Select value={editing.status || 'DRAFT'} onValueChange={(value) => setEditing({ ...editing, status: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">草稿</SelectItem>
                    <SelectItem value="IN_REVIEW">评审中</SelectItem>
                    <SelectItem value="READY">待测试</SelectItem>
                    <SelectItem value="TESTING">测试中</SelectItem>
                    <SelectItem value="DONE">已完成</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">优先级</label>
                <Select value={editing.priority || 'P1'} onValueChange={(value) => setEditing({ ...editing, priority: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P0">P0</SelectItem>
                    <SelectItem value="P1">P1</SelectItem>
                    <SelectItem value="P2">P2</SelectItem>
                    <SelectItem value="P3">P3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">负责人</label>
                <Input value={editing.ownerId || ''} onChange={(event) => setEditing({ ...editing, ownerId: event.target.value })} placeholder="用户ID" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">迭代/版本</label>
                <Input value={editing.iterationId || ''} onChange={(event) => setEditing({ ...editing, iterationId: event.target.value })} placeholder="例如：2026.05" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">来源</label>
                <Select value={editing.sourceType || 'LOCAL'} onValueChange={(value) => setEditing({ ...editing, sourceType: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOCAL">平台内</SelectItem>
                    <SelectItem value="JIRA">Jira</SelectItem>
                    <SelectItem value="TAPD">TAPD</SelectItem>
                    <SelectItem value="MEEGO">Meego</SelectItem>
                    <SelectItem value="OTHER">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">外部ID</label>
                <Input value={editing.sourceRequirementId || ''} onChange={(event) => setEditing({ ...editing, sourceRequirementId: event.target.value })} placeholder="可选" />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">外部链接</label>
              <Input value={editing.url || ''} onChange={(event) => setEditing({ ...editing, url: event.target.value })} placeholder="https://..." />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 p-5">
            <Button variant="outline" className="rounded-2xl" onClick={closeForm} disabled={saving}>取消</Button>
            <Button className="rounded-2xl bg-emerald-700 text-white hover:bg-emerald-800" onClick={saveRequirement} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              保存需求
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
