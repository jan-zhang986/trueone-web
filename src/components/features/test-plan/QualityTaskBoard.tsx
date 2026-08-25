import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ClipboardCheck, Eye, FlaskConical, Link2, ListChecks, Loader2, Paperclip, PlayCircle, Plus, ShieldCheck, Target, UserRound, Workflow } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { qualityWorkspaceService, type QualityTask, type QualityWorkItem } from '@/services/quality-workspace';
import { testAssetService, type TestAssetGateBinding, type TestSuite } from '@/services/test-asset';
import { cn } from '@/utils/cn';
import { QualityWorkItemDrawer } from './QualityWorkItemDrawer';

interface QualityTaskBoardProps {
  workspaceId: string;
  projectId: string;
  spaceId?: string;
  canEdit?: boolean;
  onWorkItemsChange?: () => void;
}

const TASK_TYPE_META: Record<string, { label: string; tone: string; icon: typeof Target }> = {
  ANALYSIS: { label: '测试分析', tone: 'bg-sky-50 text-sky-700 ring-sky-100', icon: ListChecks },
  REVIEW: { label: '测试评审', tone: 'bg-cyan-50 text-cyan-700 ring-cyan-100', icon: ClipboardCheck },
  FUNCTIONAL_CHECK: { label: '功能检查', tone: 'bg-blue-50 text-blue-700 ring-blue-100', icon: ClipboardCheck },
  REGRESSION: { label: '回归测试', tone: 'bg-indigo-50 text-indigo-700 ring-indigo-100', icon: Workflow },
  SMOKE: { label: '冒烟验证', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100', icon: ShieldCheck },
  ACCEPTANCE: { label: '功能验收', tone: 'bg-blue-50 text-blue-700 ring-blue-100', icon: ClipboardCheck },
  API_REGRESSION: { label: 'API回归', tone: 'bg-indigo-50 text-indigo-700 ring-indigo-100', icon: Workflow },
  AUTOMATION_REGRESSION: { label: '自动化回归', tone: 'bg-violet-50 text-violet-700 ring-violet-100', icon: FlaskConical },
  SPECIAL: { label: '专项测试', tone: 'bg-amber-50 text-amber-700 ring-amber-100', icon: Target },
  SPECIAL_TEST: { label: '专项测试', tone: 'bg-amber-50 text-amber-700 ring-amber-100', icon: Target },
  JOINT_DEBUG: { label: '联调 CASE', tone: 'bg-teal-50 text-teal-700 ring-teal-100', icon: Workflow },
  DEFECT_RETEST: { label: '缺陷复测', tone: 'bg-rose-50 text-rose-700 ring-rose-100', icon: ListChecks },
  RELEASE_CHECK: { label: '准出检查', tone: 'bg-slate-50 text-slate-700 ring-slate-100', icon: ShieldCheck },
};

function unwrap<T>(res: any): T {
  return (res?.data ?? res) as T;
}

function extractRecords(res: any): any[] {
  const data = unwrap<any>(res);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

const RESULT_BADGE: Record<string, string> = {
  PASS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FAIL: 'bg-rose-50 text-rose-700 border-rose-200',
  BLOCKED: 'bg-amber-50 text-amber-700 border-amber-200',
  SKIPPED: 'bg-slate-50 text-slate-600 border-slate-200',
};

function isBlocked(item: QualityWorkItem) {
  return item.result === 'BLOCKED' || item.status === 'BLOCKED' || item.runtimeSnapshot?.isBlocked === true;
}

function getEvidenceCount(item: QualityWorkItem) {
  return item.evidenceCount ?? item.runtimeSnapshot?.commentFileIds?.length ?? item.runtimeSnapshot?.uploadFileIds?.length ?? 0;
}

const SUITE_TASK_TYPES = new Set(['SMOKE', 'API_REGRESSION', 'AUTOMATION_REGRESSION', 'REGRESSION', 'RELEASE_CHECK']);

export function QualityTaskBoard({ workspaceId, projectId, spaceId, canEdit = true, onWorkItemsChange }: QualityTaskBoardProps) {
  const [tasks, setTasks] = useState<QualityTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [workItems, setWorkItems] = useState<QualityWorkItem[]>([]);
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [gateBindings, setGateBindings] = useState<TestAssetGateBinding[]>([]);
  const [taskLoading, setTaskLoading] = useState(false);
  const [workItemLoading, setWorkItemLoading] = useState(false);
  const [suiteSaving, setSuiteSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeWorkItem, setActiveWorkItem] = useState<QualityWorkItem | null>(null);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.taskId === selectedTaskId) || tasks[0],
    [tasks, selectedTaskId]
  );
  const selectedSuite = useMemo(
    () => suites.find((suite) => suite.suiteId === selectedTask?.suiteId),
    [suites, selectedTask?.suiteId]
  );
  const selectedSuiteBindings = useMemo(
    () => gateBindings.filter((binding) => binding.targetType === 'SUITE' && binding.targetId === selectedTask?.suiteId),
    [gateBindings, selectedTask?.suiteId]
  );

  const loadTasks = async () => {
    if (!workspaceId) return;
    setTaskLoading(true);
    try {
      const list = unwrap<QualityTask[]>(await qualityWorkspaceService.getTaskList(workspaceId)) || [];
      const sorted = [...list].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
      setTasks(sorted);
      setSelectedTaskId((prev) => prev || sorted[0]?.taskId || '');
    } catch (error) {
      console.error(error);
      toast.error('加载测试任务失败');
    } finally {
      setTaskLoading(false);
    }
  };

  const loadAssetRefs = async () => {
    try {
      const [suiteRes, bindingRes] = await Promise.all([
        testAssetService.getSuitePage({ projectId, spaceId }),
        testAssetService.getGateBindings({ projectId, spaceId }),
      ]);
      setSuites(extractRecords(suiteRes));
      setGateBindings(unwrap<TestAssetGateBinding[]>(bindingRes) || []);
    } catch (error) {
      console.error(error);
      setSuites([]);
      setGateBindings([]);
    }
  };

  const loadWorkItems = async (taskId: string) => {
    if (!workspaceId || !taskId) {
      setWorkItems([]);
      return;
    }
    setWorkItemLoading(true);
    try {
      const res = await qualityWorkspaceService.getWorkItemPage({
        workspaceId,
        taskId,
        projectId,
        current: 1,
        pageSize: 50,
      });
      setWorkItems(extractRecords(res).map((item) => ({ ...item, taskId: item.taskId || taskId })));
    } catch (error) {
      console.error(error);
      setWorkItems([]);
      toast.error('加载执行项失败');
    } finally {
      setWorkItemLoading(false);
    }
  };

  const createSpecialTask = async () => {
    if (!canEdit) return;
    const name = `专项测试 ${tasks.filter((task) => task.taskType === 'SPECIAL_TEST').length + 1}`;
    try {
      const taskId = unwrap<string>(await qualityWorkspaceService.saveTask(workspaceId, {
        projectId,
        taskType: 'SPECIAL_TEST',
        title: name,
        status: 'TODO',
        sort: tasks.length + 1,
      }));
      toast.success('已创建专项测试任务');
      await loadTasks();
      if (taskId) setSelectedTaskId(taskId);
    } catch (error) {
      console.error(error);
      toast.error('创建任务失败');
    }
  };

  const transitionTask = async (task: QualityTask, action: 'complete' | 'reopen') => {
    if (!canEdit) return;
    try {
      if (action === 'complete') {
        await qualityWorkspaceService.completeTask(workspaceId, task.taskId);
        toast.success('任务已完成');
      } else {
        await qualityWorkspaceService.reopenTask(workspaceId, task.taskId);
        toast.success('任务已重新打开');
      }
      await loadTasks();
    } catch (error) {
      console.error(error);
      toast.error(action === 'complete' ? '完成任务失败' : '重新打开任务失败');
    }
  };

  const openWorkItem = (item: QualityWorkItem) => {
    setActiveWorkItem({ ...item, taskId: item.taskId || selectedTask?.taskId || '' });
    setDrawerOpen(true);
  };

  const refreshAfterWorkItemChange = async () => {
    if (selectedTask?.taskId) {
      await loadWorkItems(selectedTask.taskId);
    }
    onWorkItemsChange?.();
  };

  const bindSuiteToTask = async (suiteId: string) => {
    if (!selectedTask || !canEdit) return;
    setSuiteSaving(true);
    try {
      await qualityWorkspaceService.saveTask(workspaceId, {
        taskId: selectedTask.taskId,
        taskType: selectedTask.taskType,
        title: selectedTask.title || selectedTask.name || TASK_TYPE_META[selectedTask.taskType]?.label || selectedTask.taskType,
        description: selectedTask.description,
        status: selectedTask.status || 'TODO',
        ownerId: selectedTask.ownerId,
        suiteId: suiteId === '__none__' ? undefined : suiteId,
        sourceType: suiteId === '__none__' ? selectedTask.sourceType : 'SUITE',
        sourceId: suiteId === '__none__' ? undefined : suiteId,
        sort: selectedTask.sort,
        metadata: selectedTask.metadata,
      });
      toast.success(suiteId === '__none__' ? '已取消引用 Suite' : '任务已引用 Suite');
      await loadTasks();
      onWorkItemsChange?.();
    } catch (error) {
      console.error(error);
      toast.error('保存 Suite 引用失败');
    } finally {
      setSuiteSaving(false);
    }
  };

  useEffect(() => {
    loadTasks();
    loadAssetRefs();
  }, [workspaceId, projectId, spaceId]);

  useEffect(() => {
    if (selectedTask?.taskId) {
      loadWorkItems(selectedTask.taskId);
    }
  }, [selectedTask?.taskId]);

  return (
    <div className="flex h-full min-h-0 bg-slate-50/60">
      <aside className="w-[360px] shrink-0 border-r border-slate-200 bg-white p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Testing Tasks</div>
            <h3 className="mt-1 text-lg font-black text-slate-900">测试任务</h3>
          </div>
          <Button size="sm" variant="outline" className="rounded-xl" disabled={!canEdit} onClick={createSpecialTask}>
            <Plus className="mr-1 h-4 w-4" />
            补充
          </Button>
        </div>

        {taskLoading ? (
          <div className="flex h-40 items-center justify-center text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            加载任务中
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-310px)] pr-2">
            <div className="space-y-2">
              {tasks.map((task) => {
                const meta = TASK_TYPE_META[task.taskType] || TASK_TYPE_META.SPECIAL;
                const Icon = meta.icon;
                const active = selectedTask?.taskId === task.taskId;
                return (
                  <button
                    key={task.taskId}
                    type="button"
                    onClick={() => setSelectedTaskId(task.taskId)}
                    className={cn(
                      'group relative w-full rounded-xl border p-3.5 text-left transition-all duration-200',
                      active
                        ? 'border-blue-200 bg-blue-50/50 shadow-sm'
                        : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/50'
                    )}
                  >
                    {active && <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-600 rounded-r-full" />}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg transition-transform group-hover:scale-105', meta.tone)}>
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <div className="text-[13px] font-black text-slate-900 leading-tight">{task.title || task.name || meta.label}</div>
                          <div className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{meta.label}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn('rounded-md text-[9px] font-black px-1.5 py-0', task.status === 'DONE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100')}>
                        {task.status || 'TODO'}
                      </Badge>
                    </div>
                  </button>
                );
              })}
              {!tasks.length && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                  暂无任务。创建工作台时会自动生成分析、评审、功能检查、回归和准出任务。
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </aside>

      <main className="flex min-w-0 flex-1 flex-col p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Check Items</div>
            <h3 className="mt-1 text-2xl font-black text-slate-900">{selectedTask?.title || selectedTask?.name || '选择一个测试任务'}</h3>
          </div>
          {selectedTask && (
            <div className="flex items-center gap-2">
              <Badge className="rounded-xl bg-slate-900 px-3 py-1 text-white">{selectedTask.taskType}</Badge>
              {canEdit && (
                selectedTask.status === 'DONE' ? (
                  <Button variant="outline" className="rounded-xl" onClick={() => transitionTask(selectedTask, 'reopen')}>
                    重新打开
                  </Button>
                ) : (
                  <Button className="rounded-xl bg-slate-900 text-white hover:bg-slate-800" onClick={() => transitionTask(selectedTask, 'complete')}>
                    标记完成
                  </Button>
                )
              )}
            </div>
          )}
        </div>

        {selectedTask && SUITE_TASK_TYPES.has(selectedTask.taskType) && (
          <Card className="mb-5 rounded-3xl border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <Link2 className="h-4 w-4 text-blue-600" />
                  资产引用
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  这个任务只引用测试资产服务里的 Suite。门禁规则在资产侧维护，工作台这里只消费结果。
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-lg bg-slate-50 font-bold">
                    Suite：{selectedSuite?.name || '未绑定'}
                  </Badge>
                  <Badge variant="outline" className="rounded-lg bg-slate-50 font-bold">
                    门禁绑定：{selectedSuiteBindings.length}
                  </Badge>
                </div>
              </div>
              <div className="w-full lg:w-[320px]">
                <Select value={selectedTask.suiteId || '__none__'} onValueChange={bindSuiteToTask} disabled={!canEdit || suiteSaving}>
                  <SelectTrigger className="rounded-2xl bg-white">
                    <SelectValue placeholder="选择引用的 Suite" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">不引用 Suite</SelectItem>
                    {suites.filter((suite) => suite.suiteId).map((suite) => (
                      <SelectItem key={suite.suiteId} value={suite.suiteId || '__missing__'}>
                        {suite.name} / {suite.type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        )}

        <div className="grid gap-3">
          {workItemLoading ? (
            <Card className="flex h-44 items-center justify-center rounded-3xl border-slate-200 text-slate-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              加载执行项中
            </Card>
          ) : workItems.length ? (
            workItems.map((item) => (
              <Card key={item.workItemId || item.id} className={cn('relative overflow-hidden rounded-2xl border-slate-200 p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md group', isBlocked(item) && 'border-amber-200 bg-amber-50/30')}>
                {/* Result Indicator Bar */}
                <div className={cn('absolute left-0 top-0 bottom-0 w-1', {
                  'bg-emerald-500': item.result === 'PASS',
                  'bg-rose-500': item.result === 'FAIL',
                  'bg-amber-500': item.result === 'BLOCKED',
                  'bg-slate-200': !item.result || item.result === 'PENDING'
                })} />

                <div className="flex items-start justify-between gap-6 pl-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h4 className="truncate text-[15px] font-black text-slate-900 group-hover:text-blue-600 cursor-pointer" onClick={() => openWorkItem(item)}>
                        {item.title || item.name || item.caseTitle || '未命名用例'}
                      </h4>
                      {isBlocked(item) && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <UserRound className="h-3 w-3" />
                        <span>{item.assigneeName || item.assigneeId || '未分派'}</span>
                      </div>
                      {item.caseId && <div className="font-mono text-[10px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">CASE-{item.caseId}</div>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn('rounded-md text-[9px] font-black px-1.5 py-0 border-none uppercase tracking-tighter', RESULT_BADGE[item.result || ''] || 'bg-slate-100 text-slate-400')}>
                          {item.result || 'PENDING'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                        <Paperclip className="h-3 w-3" />
                        证据 {getEvidenceCount(item)}
                      </div>
                    </div>
                    <Button size="sm" className="h-9 rounded-xl bg-slate-950 px-4 text-[11px] font-black text-white hover:bg-slate-800 shadow-lg shadow-slate-950/10" onClick={() => openWorkItem(item)}>
                      {item.result ? '查看结果' : '立即执行'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="rounded-3xl border-dashed border-slate-200 p-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
                <ListChecks className="h-7 w-7 text-slate-300" />
              </div>
              <div className="text-lg font-black text-slate-900">这个任务还没有测试用例</div>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                请先在「测试用例」步骤从分析文档生成用例，执行项会出现在对应任务下。
              </p>
            </Card>
          )}
        </div>
      </main>

      <QualityWorkItemDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        workspaceId={workspaceId}
        taskId={activeWorkItem?.taskId || selectedTask?.taskId || ''}
        projectId={projectId}
        workItem={activeWorkItem}
        canEdit={canEdit}
        onChanged={refreshAfterWorkItemChange}
      />
    </div>
  );
}
