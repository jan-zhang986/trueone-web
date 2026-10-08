/**
 * 系统设置-任务中心（迁移自 AegisOne）
 * Tab：用例任务列表 | 系统后台任务列表
 */
import { useState, useEffect, useCallback } from 'react';
import { Search, RotateCcw, Play, Square, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Switch } from '@/components/ui/switch';
import { systemTaskCenterService, orgTaskCenterService } from '@/services/setting/task-center';
import type { TaskCenterTaskItem, TaskCenterSystemTaskItem, TaskCenterTaskDetailItem, TaskCenterBatchParams } from '@/types/setting/task-center';

const PAGE_SIZE = 10;

export type TaskCenterTab = 'execute' | 'detail' | 'schedule';

interface SystemTaskCenterViewProps {
  /** 系统 或 组织 */
  scope: 'system' | 'organization';
  /** 仅展示单个 Tab 时传入（用于任务中心二级菜单分页） */
  fixedTab?: TaskCenterTab;
  /** 详情 Tab 初始选中的任务 ID（如从 URL taskId 传入） */
  initialTaskId?: string;
  /** 单 Tab 模式下从用例任务跳转详情时回调（由调用方做路由跳转） */
  onNavigateToDetail?: (taskId: string) => void;
  /** 单 Tab 模式下从详情页返回用例任务列表时回调 */
  onNavigateToExecute?: () => void;
}

function formatTime(ts?: number) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('zh-CN');
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: '待执行',
    RUNNING: '执行中',
    COMPLETED: '已完成',
    RERUNNING: '重跑中',
    STOPPED: '已停止',
  };
  return map[status] || status;
}

function getResultLabel(result?: string): string {
  if (!result) return '-';
  const map: Record<string, string> = {
    SUCCESS: '成功',
    ERROR: '失败',
    FAKE_ERROR: '误报',
  };
  return map[result] || result;
}

export function SystemTaskCenterView({
  scope,
  fixedTab,
  initialTaskId = '',
  onNavigateToDetail,
  onNavigateToExecute,
}: SystemTaskCenterViewProps) {
  const api = scope === 'system' ? systemTaskCenterService : orgTaskCenterService;
  const effectiveTab = fixedTab ?? 'execute';
  const [tab, setTab] = useState<'execute' | 'detail' | 'schedule'>(fixedTab ?? 'execute');
  const [keyword, setKeyword] = useState('');
  const [executeList, setExecuteList] = useState<TaskCenterTaskItem[]>([]);
  const [executeTotal, setExecuteTotal] = useState(0);
  const [executePage, setExecutePage] = useState(1);
  const [executeLoading, setExecuteLoading] = useState(false);
  const [detailList, setDetailList] = useState<TaskCenterTaskDetailItem[]>([]);
  const [detailTotal, setDetailTotal] = useState(0);
  const [detailPage, setDetailPage] = useState(1);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(initialTaskId);
  const [scheduleList, setScheduleList] = useState<TaskCenterSystemTaskItem[]>([]);
  const [scheduleTotal, setScheduleTotal] = useState(0);
  const [schedulePage, setSchedulePage] = useState(1);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [cronEditOpen, setCronEditOpen] = useState(false);
  const [cronEditItem, setCronEditItem] = useState<TaskCenterSystemTaskItem | null>(null);
  const [cronValue, setCronValue] = useState('');
  const [cronSubmitting, setCronSubmitting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'stop' | 'delete' | 'rerun' | 'deleteSchedule' | 'stopDetail' | 'batchStopDetail';
    item: TaskCenterTaskItem | TaskCenterSystemTaskItem | TaskCenterTaskDetailItem;
    items?: TaskCenterTaskDetailItem[];
  } | null>(null);

  const loadExecuteList = useCallback(async () => {
    setExecuteLoading(true);
    try {
      const res = await api.getExecuteTaskList({
        current: executePage,
        pageSize: PAGE_SIZE,
        keyword: keyword || undefined,
      });
      setExecuteList(res.list ?? []);
      setExecuteTotal(res.total ?? 0);
    } catch (e) {
      toast.error('加载用例任务列表失败');
      setExecuteList([]);
      setExecuteTotal(0);
    } finally {
      setExecuteLoading(false);
    }
  }, [api, executePage, keyword]);

  const loadDetailList = useCallback(async () => {
    if (!selectedTaskId) {
      setDetailList([]);
      setDetailTotal(0);
      return;
    }
    setDetailLoading(true);
    try {
      const params: TaskCenterBatchParams = {
        current: detailPage,
        pageSize: PAGE_SIZE,
        keyword: keyword || undefined,
        taskId: selectedTaskId,
      };
      const res = await api.getExecuteTaskDetailList(params);
      setDetailList(res.list ?? []);
      setDetailTotal(res.total ?? 0);
    } catch (e) {
      toast.error('加载任务详情列表失败');
      setDetailList([]);
      setDetailTotal(0);
    } finally {
      setDetailLoading(false);
    }
  }, [api, detailPage, keyword, selectedTaskId]);

  const loadScheduleList = useCallback(async () => {
    setScheduleLoading(true);
    try {
      const res = await api.getScheduleList({
        current: schedulePage,
        pageSize: PAGE_SIZE,
        keyword: keyword || undefined,
      });
      setScheduleList(res.list ?? []);
      setScheduleTotal(res.total ?? 0);
    } catch (e) {
      toast.error('加载后台任务列表失败');
      setScheduleList([]);
      setScheduleTotal(0);
    } finally {
      setScheduleLoading(false);
    }
  }, [api, schedulePage, keyword]);

  useEffect(() => {
    setSelectedTaskId((prev) => (initialTaskId !== undefined && initialTaskId !== '' ? initialTaskId : prev));
  }, [initialTaskId]);

  const currentTab = fixedTab ?? tab;
  useEffect(() => {
    if (currentTab === 'execute') loadExecuteList();
    else if (currentTab === 'detail') loadDetailList();
    else loadScheduleList();
  }, [currentTab, currentTab === 'execute' ? loadExecuteList : currentTab === 'detail' ? loadDetailList : loadScheduleList]);

  const handleSearch = () => {
    if (tab === 'execute') {
      setExecutePage(1);
      loadExecuteList();
    } else if (tab === 'detail') {
      setDetailPage(1);
      loadDetailList();
    } else {
      setSchedulePage(1);
      loadScheduleList();
    }
  };

  const handleStopTaskDetail = async () => {
    if (!confirmAction || !('taskId' in confirmAction.item)) return;
    const item = confirmAction.item as TaskCenterTaskDetailItem;
    setConfirmAction(null);
    try {
      await api.stopTaskDetail(item.id);
      toast.success('已停止');
      loadDetailList();
    } catch (e) {
      toast.error('停止失败');
    }
  };

  const handleBatchStopTaskDetail = async () => {
    if (!confirmAction || !confirmAction.items) return;
    setConfirmAction(null);
    try {
      const params: TaskCenterBatchParams = {
        taskId: selectedTaskId,
        batchType: 'STOP',
      };
      await api.batchStopTaskDetail(params);
      toast.success('批量停止成功');
      loadDetailList();
    } catch (e) {
      toast.error('批量停止失败');
    }
  };

  const handleStopTask = async () => {
    if (!confirmAction || !('status' in confirmAction.item)) return;
    const item = confirmAction.item as TaskCenterTaskItem;
    setConfirmAction(null);
    try {
      await api.stopTask(item.id);
      toast.success('已停止');
      loadExecuteList();
    } catch (e) {
      toast.error('停止失败');
    }
  };

  const handleDeleteTask = async () => {
    if (!confirmAction) return;
    const item = confirmAction.item;
    setConfirmAction(null);
    try {
      if ('status' in item) {
        await api.deleteTask(item.id);
        toast.success('已删除');
        loadExecuteList();
      } else {
        await api.deleteSchedule(item.id);
        toast.success('已删除');
        loadScheduleList();
      }
    } catch (e) {
      toast.error('删除失败');
    }
  };

  const handleRerunTask = async () => {
    if (!confirmAction || !('status' in confirmAction.item)) return;
    const item = confirmAction.item as TaskCenterTaskItem;
    setConfirmAction(null);
    try {
      await api.rerunTask(item.id);
      toast.success('已重跑');
      loadExecuteList();
    } catch (e) {
      toast.error('重跑失败');
    }
  };

  const handleScheduleSwitch = async (item: TaskCenterSystemTaskItem, enabled: boolean) => {
    try {
      await api.scheduleSwitch(item.id);
      toast.success(enabled ? '已开启' : '已关闭');
      loadScheduleList();
    } catch (e) {
      toast.error('操作失败');
    }
  };

  const handleEditCron = (item: TaskCenterSystemTaskItem) => {
    setCronEditItem(item);
    setCronValue(item.value ?? '');
    setCronEditOpen(true);
  };

  const handleSaveCron = async () => {
    if (!cronEditItem || !cronValue.trim()) {
      toast.error('请输入 cron 表达式');
      return;
    }
    setCronSubmitting(true);
    try {
      await api.editCron(cronEditItem.id, cronValue.trim());
      toast.success('保存成功');
      setCronEditOpen(false);
      loadScheduleList();
    } catch (e) {
      toast.error('保存失败');
    } finally {
      setCronSubmitting(false);
    }
  };

  const runConfirmAction = async () => {
    if (!confirmAction) return;
    switch (confirmAction.type) {
      case 'stop':
        await handleStopTask();
        break;
      case 'delete':
        await handleDeleteTask();
        break;
      case 'rerun':
        await handleRerunTask();
        break;
      case 'deleteSchedule':
        await handleDeleteTask();
        break;
      case 'stopDetail':
        await handleStopTaskDetail();
        break;
      case 'batchStopDetail':
        await handleBatchStopTaskDetail();
        break;
    }
  };

  const getConfirmTitle = () => {
    if (!confirmAction) return '';
    const t = confirmAction.type;
    if (t === 'stop' || t === 'stopDetail') return '确认停止';
    if (t === 'delete' || t === 'deleteSchedule') return '确认删除';
    if (t === 'rerun') return '确认重跑';
    if (t === 'batchStopDetail') return '确认批量停止';
    return '确认';
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="搜索任务名称"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 w-64"
              />
            </div>
            <Button variant="outline" onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" /> 搜索
            </Button>
          </div>
        </div>
        <div>
          <Tabs value={currentTab} onValueChange={(v) => !fixedTab && setTab(v as 'execute' | 'detail' | 'schedule')}>
            {!fixedTab && (
              <TabsList>
                <TabsTrigger value="execute">用例任务列表</TabsTrigger>
                <TabsTrigger value="detail">用例任务详情列表</TabsTrigger>
                <TabsTrigger value="schedule">系统后台任务列表</TabsTrigger>
              </TabsList>
            )}

            <TabsContent value="execute" className="mt-6">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-[#f7f8fa] sticky top-0 z-10 border-b border-gray-200 shadow-sm">
              <TableRow className="hover:bg-transparent border-none h-11">
                <TableHead className="w-20 font-medium text-gray-500">序号</TableHead>
                <TableHead className="font-medium text-gray-500">任务名称</TableHead>
                <TableHead className="w-24 font-medium text-gray-500">状态</TableHead>
                <TableHead className="w-24 font-medium text-gray-500">结果</TableHead>
                <TableHead className="w-28 font-medium text-gray-500">触发方式</TableHead>
                <TableHead className="w-32 font-medium text-gray-500">创建人</TableHead>
                <TableHead className="w-40 font-medium text-gray-500">创建时间</TableHead>
                <TableHead className="w-48 text-right font-medium text-gray-500">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody key={`execute-tbody-${executeList.length}-${executeList[0]?.id ?? ''}`}>
              {executeLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">加载中...</TableCell>
                </TableRow>
              ) : executeList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">暂无任务</TableCell>
                </TableRow>
              ) : (
                executeList.map((row) => (
                  <TableRow key={row.id || `execute-${row.num}`} className="group transition-colors [&_td]:transition-colors [&_td]:group-hover:bg-[#f2f3f5] border-b border-gray-100 h-11">
                    <TableCell>
                      <Button
                        variant="link"
                        className="h-auto p-0 font-medium text-primary"
                        onClick={() => {
                          if (fixedTab === 'execute' && onNavigateToDetail && row.id) {
                            onNavigateToDetail(row.id);
                          } else {
                            setSelectedTaskId(row.id);
                            setTab('detail');
                          }
                        }}
                      >
                        {row.num ?? '-'}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{row.taskName}</TableCell>
                    <TableCell>{getStatusLabel(row.status)}</TableCell>
                    <TableCell>{getResultLabel(row.result)}</TableCell>
                    <TableCell>{row.triggerMode === 'SCHEDULE' ? '定时' : row.triggerMode === 'MANUAL' ? '手动' : row.triggerMode ?? '-'}</TableCell>
                    <TableCell>{row.createUserName ?? row.createUser ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{formatTime(row.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      {['RUNNING', 'RERUNNING'].includes(row.status) && (
                        <Button variant="outline" size="sm" onClick={() => setConfirmAction({ type: 'stop', item: row })}>
                          <Square className="h-3 w-3 mr-1" /> 停止
                        </Button>
                      )}
                      {!['RUNNING', 'RERUNNING'].includes(row.status) && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setConfirmAction({ type: 'delete', item: row })}>
                            <Trash2 className="h-3 w-3 mr-1" /> 删除
                          </Button>
                          {row.result === 'ERROR' && (
                            <Button variant="outline" size="sm" onClick={() => setConfirmAction({ type: 'rerun', item: row })}>
                              <RotateCcw className="h-3 w-3 mr-1" /> 重跑
                            </Button>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {executeTotal > PAGE_SIZE && (
            <div className="flex justify-between items-center border-t px-6 py-4 bg-muted/30">
              <div className="text-sm text-muted-foreground">
                共 <span className="font-medium text-foreground">{executeTotal}</span> 条记录
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={executePage <= 1} onClick={() => setExecutePage((p) => p - 1)}>上一页</Button>
                <Button variant="outline" size="sm" disabled={executePage * PAGE_SIZE >= executeTotal} onClick={() => setExecutePage((p) => p + 1)}>下一页</Button>
              </div>
            </div>
          )}
              </div>
            </TabsContent>

            <TabsContent value="detail" className="mt-6">
              {!selectedTaskId ? (
                <div className="rounded-lg border bg-muted/20 p-12 text-center">
                  <p className="text-muted-foreground mb-4">请先在「用例任务」中选择一个任务查看详情</p>
                  <Button variant="outline" onClick={() => (fixedTab === 'detail' && onNavigateToExecute ? onNavigateToExecute() : setTab('execute'))}>
                    返回用例任务列表
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      任务ID: <span className="font-medium text-foreground">{selectedTaskId}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSelectedTaskId('')}>
                      切换任务
                    </Button>
                  </div>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-[#f7f8fa] sticky top-0 z-10 border-b border-gray-200 shadow-sm">
                        <TableRow className="hover:bg-transparent border-none h-11">
                          <TableHead className="w-20 font-medium text-gray-500">任务ID</TableHead>
                          <TableHead className="font-medium text-gray-500">任务名称</TableHead>
                          <TableHead className="font-medium text-gray-500">用例名称</TableHead>
                          <TableHead className="w-24 font-medium text-gray-500">状态</TableHead>
                          <TableHead className="w-24 font-medium text-gray-500">结果</TableHead>
                          <TableHead className="w-28 font-medium text-gray-500">触发方式</TableHead>
                          <TableHead className="w-32 font-medium text-gray-500">资源池节点</TableHead>
                          <TableHead className="w-40 font-medium text-gray-500">创建时间</TableHead>
                          <TableHead className="w-32 text-right font-medium text-gray-500">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody key={`detail-tbody-${detailList.length}-${detailList[0]?.id ?? ''}`}>
                        {detailLoading ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">加载中...</TableCell>
                          </TableRow>
                        ) : detailList.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">暂无详情</TableCell>
                          </TableRow>
                        ) : (
                          detailList.map((row) => (
                            <TableRow key={row.id || `detail-${row.num}`} className="group transition-colors [&_td]:transition-colors [&_td]:group-hover:bg-[#f2f3f5] border-b border-gray-100 h-11">
                              <TableCell>{row.num ?? '-'}</TableCell>
                              <TableCell className="font-medium">{row.taskName ?? '-'}</TableCell>
                              <TableCell>{row.resourceName ?? '-'}</TableCell>
                              <TableCell>{getStatusLabel(row.status)}</TableCell>
                              <TableCell>{getResultLabel(row.result)}</TableCell>
                              <TableCell>{row.triggerMode === 'SCHEDULE' ? '定时' : row.triggerMode === 'MANUAL' ? '手动' : row.triggerMode ?? '-'}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <span className="text-sm">{row.resourcePoolNode ?? '-'}</span>
                                  {row.resourcePoolNodeStatus === false && (
                                    <span className="text-xs text-destructive" title="节点异常">⚠</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{formatTime(row.startTime)}</TableCell>
                              <TableCell className="text-right">
                                {['RUNNING', 'RERUNNING'].includes(row.status) && (
                                  <Button variant="outline" size="sm" onClick={() => setConfirmAction({ type: 'stopDetail', item: row })}>
                                    <Square className="h-3 w-3 mr-1" /> 停止
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                    {detailTotal > PAGE_SIZE && (
                      <div className="flex justify-between items-center border-t px-6 py-4 bg-muted/30">
                        <div className="text-sm text-muted-foreground">
                          共 <span className="font-medium text-foreground">{detailTotal}</span> 条记录
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" disabled={detailPage <= 1} onClick={() => setDetailPage((p) => p - 1)}>上一页</Button>
                          <Button variant="outline" size="sm" disabled={detailPage * PAGE_SIZE >= detailTotal} onClick={() => setDetailPage((p) => p + 1)}>下一页</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="schedule" className="mt-6">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-[#f7f8fa] sticky top-0 z-10 border-b border-gray-200 shadow-sm">
              <TableRow className="hover:bg-transparent border-none h-11">
                <TableHead className="w-20 font-medium text-gray-500">序号</TableHead>
                <TableHead className="font-medium text-gray-500">任务名称</TableHead>
                <TableHead className="w-32 font-medium text-gray-500">所属组织</TableHead>
                <TableHead className="w-32 font-medium text-gray-500">所属项目</TableHead>
                <TableHead className="w-40 font-medium text-gray-500">运行规则</TableHead>
                <TableHead className="w-24 font-medium text-gray-500">状态</TableHead>
                <TableHead className="w-40 font-medium text-gray-500">创建时间</TableHead>
                <TableHead className="w-48 text-right font-medium text-gray-500">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody key={`schedule-tbody-${scheduleList.length}-${scheduleList[0]?.id ?? ''}`}>
              {scheduleLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">加载中...</TableCell>
                </TableRow>
              ) : scheduleList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">暂无任务</TableCell>
                </TableRow>
              ) : (
                scheduleList.map((row) => (
                  <TableRow key={row.id} className="group transition-colors [&_td]:transition-colors [&_td]:group-hover:bg-[#f2f3f5] border-b border-gray-100 h-11">
                    <TableCell>{row.num ?? '-'}</TableCell>
                    <TableCell className="font-medium">{row.taskName}</TableCell>
                    <TableCell>{row.organizationName ?? '-'}</TableCell>
                    <TableCell>{row.projectName ?? '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{row.value ?? '-'}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditCron(row)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch checked={row.enable} onCheckedChange={(v) => handleScheduleSwitch(row, v)} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatTime(row.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="destructive" size="sm" onClick={() => setConfirmAction({ type: 'deleteSchedule', item: row })}>
                        <Trash2 className="h-3 w-3 mr-1" /> 删除
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {scheduleTotal > PAGE_SIZE && (
            <div className="flex justify-between items-center border-t px-6 py-4 bg-muted/30">
              <div className="text-sm text-muted-foreground">
                共 <span className="font-medium text-foreground">{scheduleTotal}</span> 条记录
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={schedulePage <= 1} onClick={() => setSchedulePage((p) => p - 1)}>上一页</Button>
                <Button variant="outline" size="sm" disabled={schedulePage * PAGE_SIZE >= scheduleTotal} onClick={() => setSchedulePage((p) => p + 1)}>下一页</Button>
              </div>
            </div>
          )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 编辑 cron */}
      <Dialog open={cronEditOpen} onOpenChange={setCronEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑运行规则</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Cron 表达式</label>
            <Input value={cronValue} onChange={(e) => setCronValue(e.target.value)} placeholder="如 0 0 12 * * ?" />
            <p className="text-xs text-muted-foreground">示例：0 0 12 * * ? 表示每天12点执行</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCronEditOpen(false)}>取消</Button>
            <Button onClick={handleSaveCron} disabled={cronSubmitting}>{cronSubmitting ? '保存中...' : '保存'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 操作确认 */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getConfirmTitle()}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction && (
                confirmAction.type === 'stop' || confirmAction.type === 'stopDetail'
                  ? `确定要停止任务「${confirmAction.item.taskName || '详情'}」吗？`
                  : confirmAction.type === 'delete' || confirmAction.type === 'deleteSchedule'
                    ? `确定要删除任务「${confirmAction.item.taskName}」吗？`
                    : confirmAction.type === 'rerun'
                      ? `确定要重跑任务「${confirmAction.item.taskName}」吗？`
                      : confirmAction.type === 'batchStopDetail'
                        ? `确定要批量停止选中的 ${confirmAction.items?.length || 0} 个任务详情吗？`
                        : '确定执行此操作吗？'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={runConfirmAction}>确定</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
