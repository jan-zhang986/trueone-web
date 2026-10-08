import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Settings } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
} from '@/components/ui/drawer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { notificationService } from '@/services/notification';
import { projectManagementService } from '@/services/project-management';
import { getProjectManagementUrl } from '@/routes';
import type { MessageHistoryItem } from '@/services/notification';

/** 左侧分类项：全部 + 各模块（来自消息配置列表） */
interface MessageModuleItem {
  type: string;
  name: string;
}

interface MessageCenterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReadChange?: () => void;
}

const SHOW_TYPES = [
  { value: 'all', label: '全部' },
  { value: 'mentioned_me', label: '@我的' },
  { value: 'unRead', label: '未读' },
  { value: 'read', label: '已读' },
] as const;

const PAGE_SIZE = 10;

/** 模块 type 到展示名的兜底映射（与 AegisOne 一致） */
const MODULE_TYPE_LABELS: Record<string, string> = {
  TEST_PLAN_MANAGEMENT: '测试计划',
  BUG_MANAGEMENT: '缺陷管理',
  CASE_MANAGEMENT: '测试用例',
  API_TEST_MANAGEMENT: '接口测试',
  SCHEDULE_TASK_MANAGEMENT: '定时任务',
  JENKINS_TASK_MANAGEMENT: 'Jenkins',
};

export function MessageCenterDrawer({ open, onOpenChange, onReadChange }: MessageCenterDrawerProps) {
  const navigate = useNavigate();
  const [position, setPosition] = useState<string>('all');
  const [currentResourceType, setCurrentResourceType] = useState<string>('');
  const [list, setList] = useState<MessageHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [moduleList, setModuleList] = useState<MessageModuleItem[]>([]);
  const [defaultCount, setDefaultCount] = useState('0');
  const [countOptions, setCountOptions] = useState<{ id: string; name: string }[]>([]);

  const projectId = typeof window !== 'undefined' ? localStorage.getItem('currentProjectId') ?? '' : '';

  const loadModuleList = useCallback(async () => {
    if (!projectId) {
      setModuleList([]);
      return;
    }
    try {
      const raw = await projectManagementService.getMessageList(projectId);
      const arr = Array.isArray(raw) ? raw : [];
      const items: MessageModuleItem[] = arr.map((item: any) => ({
        type: item.type ?? item.taskType ?? '',
        name: item.name ?? item.taskTypeName ?? MODULE_TYPE_LABELS[item.type] ?? item.type ?? '',
      })).filter((m: MessageModuleItem) => m.type);
      setModuleList(items);
    } catch {
      setModuleList([]);
    }
  }, [projectId]);

  const loadTotalCount = useCallback(async (resourceType: string) => {
    try {
      const res = await notificationService.queryMessageHistoryCount({
        resourceType: resourceType || undefined,
        status: position === 'all' || position === 'mentioned_me' ? '' : position === 'unRead' ? 'UNREAD' : 'READ',
        type: position === 'mentioned_me' ? 'MENTIONED_ME' : '',
        current: 1,
        pageSize: 10,
      });
      const opts = Array.isArray(res) ? res : [];
      setCountOptions(opts);
      const totalItem = opts.find((o: { id: string }) => o.id === 'total');
      if (totalItem) {
        const n = parseInt(totalItem.name, 10);
        setDefaultCount(n > 99 ? '+99' : totalItem.name);
      } else {
        setDefaultCount('0');
      }
    } catch {
      setDefaultCount('0');
      setCountOptions([]);
    }
  }, [position]);

  const getModuleCount = (type: string): string => {
    const key = type === 'BUG_MANAGEMENT' ? 'BUG' : type === 'CASE_MANAGEMENT' ? 'CASE' : type === 'API_TEST_MANAGEMENT' ? 'API' : type === 'SCHEDULE_TASK_MANAGEMENT' ? 'SCHEDULE' : type === 'TEST_PLAN_MANAGEMENT' ? 'TEST_PLAN' : type === 'JENKINS_TASK_MANAGEMENT' ? 'JENKINS' : type;
    const item = countOptions.find((o) => o.id === key);
    if (!item) return '0';
    const n = parseInt(item.name, 10);
    return n > 99 ? '+99' : item.name;
  };

  const fetchList = useCallback(
    async (currentPage: number, append: boolean) => {
      if (!open) return;
      setLoading(true);
      try {
        const type = position === 'mentioned_me' ? 'MENTIONED_ME' : '';
        const status = position === 'unRead' ? 'UNREAD' : position === 'read' ? 'READ' : undefined;
        const res = await notificationService.queryMessageHistoryList({
          current: currentPage,
          pageSize: PAGE_SIZE,
          type: type || undefined,
          status,
          resourceType: currentResourceType || undefined,
        });
        const data = res.data ?? [];
        const totalCount = res.total ?? 0;
        setTotal(totalCount);
        if (append && currentPage > 1) {
          setList((prev) => [...prev, ...data]);
        } else {
          setList(data);
        }
      } catch {
        if (!append) setList([]);
      } finally {
        setLoading(false);
      }
    },
    [open, position, currentResourceType]
  );

  useEffect(() => {
    if (open) {
      loadModuleList();
    }
  }, [open, loadModuleList]);

  useEffect(() => {
    if (open) {
      setPage(1);
      fetchList(1, false);
      loadTotalCount(currentResourceType);
    }
  }, [open, position, currentResourceType, loadTotalCount]);

  const clickModule = (key: string) => {
    if (key === 'message-settings') {
      onOpenChange(false);
      navigate(getProjectManagementUrl('message-management'));
      return;
    }
    setPosition('all');
    setList([]);
    setPage(1);
    const resourceType = key === 'all' ? '' : key === 'BUG_MANAGEMENT' ? 'BUG' : key === 'CASE_MANAGEMENT' ? 'CASE' : key === 'API_TEST_MANAGEMENT' ? 'API' : key === 'SCHEDULE_TASK_MANAGEMENT' ? 'SCHEDULE' : key === 'TEST_PLAN_MANAGEMENT' ? 'TEST_PLAN' : key === 'JENKINS_TASK_MANAGEMENT' ? 'JENKINS' : key;
    setCurrentResourceType(resourceType);
    // 由 useEffect 根据 currentResourceType 变化触发加载
  };

  const changeShowType = (value: string) => {
    setPosition(value);
    setList([]);
    setPage(1);
    fetchList(1, false);
    loadTotalCount(currentResourceType);
  };

  const loadMore = () => {
    const next = page + 1;
    if (list.length >= total) return;
    setPage(next);
    fetchList(next, true);
  };

  const handleReadOne = async (item: MessageHistoryItem) => {
    try {
      await notificationService.readOne(item.id);
      setList((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'READ' } : i)));
      onReadChange?.();
      loadTotalCount(currentResourceType);
    } catch {
      // ignore
    }
  };

  const handleReadAll = async () => {
    try {
      await notificationService.readAll(currentResourceType || undefined);
      setList((prev) => prev.map((i) => ({ ...i, status: 'READ' })));
      onReadChange?.();
      loadTotalCount(currentResourceType);
      setDefaultCount('0');
    } catch {
      // ignore
    }
  };

  const openMessageSettings = () => {
    onOpenChange(false);
    navigate(getProjectManagementUrl('message-management'));
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent
        className="!h-full flex flex-col border-l border-border bg-background p-0 [&[data-vaul-drawer-direction=right]]:!w-[1180px] [&[data-vaul-drawer-direction=right]]:!max-w-[100vw]"
      >
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* 左侧分类导航 */}
          <aside className="flex w-[220px] shrink-0 flex-col border-r border-border bg-muted/30">
            <nav className="flex flex-1 flex-col gap-0.5 py-3">
              <button
                type="button"
                className={`flex items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                  currentResourceType === ''
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-foreground hover:bg-muted/80'
                }`}
                onClick={() => clickModule('all')}
              >
                <span className="truncate">全部消息</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{defaultCount}</span>
              </button>
              {moduleList.map((menu) => {
                const resType = menu.type === 'BUG_MANAGEMENT' ? 'BUG' : menu.type === 'CASE_MANAGEMENT' ? 'CASE' : menu.type === 'API_TEST_MANAGEMENT' ? 'API' : menu.type === 'SCHEDULE_TASK_MANAGEMENT' ? 'SCHEDULE' : menu.type === 'TEST_PLAN_MANAGEMENT' ? 'TEST_PLAN' : menu.type === 'JENKINS_TASK_MANAGEMENT' ? 'JENKINS' : menu.type;
                const isSelected = currentResourceType === resType;
                return (
                  <button
                    key={menu.type}
                    type="button"
                    className={`flex items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                      isSelected ? 'bg-primary/10 font-medium text-primary' : 'text-foreground hover:bg-muted/80'
                    }`}
                    onClick={() => clickModule(menu.type)}
                  >
                    <span className="truncate">{menu.name || menu.type}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{getModuleCount(menu.type)}</span>
                  </button>
                );
              })}
            </nav>
            <div className="shrink-0 border-t border-border">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                onClick={openMessageSettings}
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span>消息设置</span>
              </button>
            </div>
          </aside>

          {/* 右侧：标题 + 筛选 + 列表 */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {/* 标题栏 */}
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-6 py-3">
              <h2 className="truncate text-base font-medium text-foreground">
                消息管理{' '}
                <span className="font-normal text-muted-foreground">(仅展示近3个月内站内消息)</span>
              </h2>
              <button
                type="button"
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => onOpenChange(false)}
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 筛选 Tabs + 全部标为已读 */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-6 py-3">
              <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
                {SHOW_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      position === t.value
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => changeShowType(t.value)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={handleReadAll} className="shrink-0">
                全部标为已读
              </Button>
            </div>

            {/* 消息列表：参考 AegisOne 布局 - 左侧头像 + 右侧三行（标题/正文/时间），留足行高与间距 */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 pr-10">
              {loading && list.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-sm text-muted-foreground">
                  加载中...
                </div>
              ) : !list.length ? (
                <div className="flex flex-col items-center justify-center py-16 text-sm text-muted-foreground">
                  暂无消息
                </div>
              ) : (
                <ul className="space-y-2">
                  {list.map((item) => (
                    <li
                      key={item.id}
                      className={`flex min-h-[88px] cursor-pointer items-start gap-3 rounded-lg px-4 py-4 transition-colors hover:bg-muted/60 ${
                        item.status === 'UNREAD' ? 'bg-muted/40' : 'bg-background'
                      }`}
                      onClick={() => item.status === 'UNREAD' && handleReadOne(item)}
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        {item.avatar ? (
                          <AvatarImage src={item.avatar} alt="" />
                        ) : null}
                        <AvatarFallback className="text-xs text-muted-foreground">
                          {(item.userName || item.operator || '?').slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1 flex flex-col">
                        {/* 第一行：标题 + 未读角标，行高与 AegisOne leading-[22px] 一致 */}
                        <div className="flex items-center gap-2 leading-[22px]">
                          {item.status === 'UNREAD' && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" aria-hidden />
                          )}
                          <span className="min-w-0 truncate font-medium text-foreground" title={item.subject}>
                            {item.subject}
                          </span>
                          {item.status === 'UNREAD' && (
                            <span className="shrink-0 rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                              未读
                            </span>
                          )}
                        </div>
                        {/* 第二行：正文 + 资源名（可点击），与第一行留出间距 */}
                        {(item.content || item.resourceName) && (
                          <div className="mt-2 flex flex-wrap items-baseline gap-x-1 gap-y-0.5 text-sm leading-[22px] text-muted-foreground">
                            {item.content && <span className="break-words">{item.content}</span>}
                            {item.resourceName && (
                              <button
                                type="button"
                                className="shrink-0 text-primary underline-offset-4 hover:underline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                              >
                                {item.resourceName}
                              </button>
                            )}
                          </div>
                        )}
                        {/* 第三行：时间 + 操作人，与正文留出间距 */}
                        <div className="mt-2 text-xs leading-normal text-muted-foreground">
                          {item.createdAt}
                          {item.operator && ` · ${item.operator}`}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {list.length > 0 && list.length < total && (
                <div className="mt-4 flex justify-center">
                  <Button variant="outline" size="sm" onClick={loadMore} disabled={loading}>
                    {loading ? '加载中...' : '加载更多'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
