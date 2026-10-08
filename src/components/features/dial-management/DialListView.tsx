/**
 * 拨测管理 - 拨测列表（主拨测 / Web / API / Dubbo / 脚本 / LLM 共用列表页，来自 spotter-aegislm dial）
 */
import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';
import { Loader2 } from 'lucide-react';
import { dialApi } from '@/services/dial-management';
import { DialAddDialog, DialDetailDialog } from './dialogs';
import { UnifiedPagination } from '@/components/ui/unified-pagination';
import { toast } from 'sonner';
import { APP_OPTIONS, DIAL_SUB_TO_DIALING_TYPE } from './constants';

const PAGE_SIZE = 20;

/** 兼容多种时间字段并格式化为本地时间 */
function formatDialTime(v: unknown): string {
  if (v == null) return '-';
  const t = typeof v === 'number' ? v : typeof v === 'string' ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? new Date(t).toLocaleString('zh-CN') : String(v);
}

/** 当前 Tab 对应的拨测类型（由页面传入，用于按类型筛选） */
export interface DialListViewProps {
  dialSub?: string;
}

export function DialListView({ dialSub }: DialListViewProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<Record<string, unknown> | null>(null);
  /** true=以编辑模式打开，false=以详情（只读）模式打开 */
  const [detailOpenAsEdit, setDetailOpenAsEdit] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<Record<string, unknown> | null>(null);
  const [filters, setFilters] = useState({
    description: '',
    priority: null as number | null,
    appCode: '',
    dialingType: '',
    isActive: null as number | null,
    userName: '',
  });
  const [list, setList] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  /** 当前 Tab 锁定的拨测类型（API/Dubbo/脚本/LLM/Web 各 Tab 只查对应类型） */
  const fixedDialingType = dialSub ? DIAL_SUB_TO_DIALING_TYPE[dialSub] ?? '' : '';

  /**
   * 加载列表数据（与原项目 dialWeb.vue/queryDialList 及其它拨测类型保持一致）.
   * 说明：
   * - 参数结构完全对齐：description、priority、appCode、dialingType、userName、isActive
   * - dialingType：Web 拨测固定为 'WEB'，其它 Tab 走 fixedDialingType 或 filters.dialingType
   * - 仅在「查询」按钮、重置、分页、状态切换、新建/编辑成功时主动调用，避免不必要的自动请求
   */
  const loadList = async (p = 1, silent = false, overrideFilters?: typeof filters) => {
    if (!silent) setLoading(true);
    const f = overrideFilters ?? filters;
    try {
      const params = {
        currentPage: p,
        pageSize: PAGE_SIZE,
        description: f.description ?? '',
        priority: f.priority ?? null,
        appCode: f.appCode ?? '',
        dialingType: fixedDialingType || (f.dialingType ?? ''),
        userName: f.userName ?? '',
      };
      if (f.isActive !== null) (params as Record<string, unknown>).isActive = f.isActive;
      const res = await dialApi.page(params);
      if (res && typeof res === 'object' && 'data' in res && Array.isArray((res as any).data)) {
        const raw = (res as any).data as Record<string, unknown>[];
        setList(
          raw.map((item) => {
            const features = item.features as Record<string, unknown> | undefined;
            const alarmConfig = features?.alarmConfig as Record<string, unknown> | undefined;
            const account = item.account as Record<string, unknown> | undefined;
            const accountFeatures = account?.accountFeatures as Record<string, unknown> | undefined;
            const menu = item.menu as Record<string, unknown> | undefined;
            const webActions = features?.webActions as Record<string, unknown> | undefined;
            const llmActions = features?.llmActions as Record<string, unknown> | undefined;
            const apiActions = features?.apiActions as Record<string, unknown> | undefined;
            const url =
              webActions?.url ?? llmActions?.url ?? apiActions?.url ?? (item.url as string) ?? '';
            const createdAt =
              item.createdAt ?? item.createdAt ?? item.create_time ?? item.gmtCreate ?? '';
            const updatedAt =
              item.updatedAt ?? item.updatedAt ?? item.update_time ?? item.gmtModified ?? '';
            return {
              ...item,
              status: item.isActive === 0 ? '禁用' : '启用',
              dialingType: features?.dialingType ?? item.dialingType ?? '',
              openId: alarmConfig?.openId ?? '',
              userName: alarmConfig?.userName ?? '',
              menuName: menu?.name ?? '',
              accountName: accountFeatures?.user ?? '',
              dialUrl: typeof url === 'string' ? url : String(url ?? ''),
              createdAt,
              updatedAt,
            };
          })
        );
        setTotal((res as any).totalNum ?? (res as any).total ?? 0);
        setPage(p);
      }
    } catch (e) {
      toast.error((e as Error).message || '加载拨测列表失败');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    // 初次加载 / 切换 Tab 时加载一次（其余通过按钮显式触发）
    loadList(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixedDialingType]);

  const onSearch = () => loadList(1);
  const onReset = () => {
    const next = {
      description: '',
      priority: null,
      appCode: '',
      dialingType: fixedDialingType || '',
      isActive: null,
      userName: '',
    };
    setFilters(next);
    setPage(1);
    // 重置后按照原项目逻辑重新拉一次列表
    loadList(1, false, next);
  };

  const handleToggleStatus = async (row: Record<string, unknown>) => {
    const id = row.id;
    if (id == null) return;
    const nextActive = row.isActive === 1 ? 0 : 1;
    const oldList = [...list];

    // Optimistic UI update
    setList(prev => prev.map(r => r.id === id ? { ...r, isActive: nextActive, status: nextActive === 0 ? '禁用' : '启用' } : r));

    try {
      await dialApi.modify({
        id,
        description: row.description ?? '',
        testPrompt: row.testPrompt ?? {},
        priority: row.priority ?? 0,
        textCode: row.textCode ?? '',
        features: row.features,
        isActive: nextActive,
        appCode: row.appCode ?? '',
        userId: row.userId ?? '',
        e2eMenuId: (row.menu as Record<string, unknown>)?.id ?? 0,
        accountId: (row.account as Record<string, unknown>)?.id ?? 0,
      });
      toast.success(nextActive === 1 ? '启用成功' : '停用成功');
      await loadList(page, true);
    } catch (e) {
      toast.error((e as Error).message || (nextActive === 1 ? '启用失败' : '停用失败'));
      setList(oldList);
    }
  };

  const handleDeleteClick = (row: Record<string, unknown>) => {
    setDeleteRow(row);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteRow?.id) return;
    try {
      await dialApi.delete(String(deleteRow.id));
      toast.success('删除成功');
      setDeleteOpen(false);
      setDeleteRow(null);
      await loadList(page);
    } catch (e) {
      toast.error((e as Error).message || '删除失败');
    }
  };

  const openDetail = (row: Record<string, unknown>) => {
    setDetailRow(row);
    setDetailOpenAsEdit(false);
    setDetailOpen(true);
  };
  const openEdit = (row: Record<string, unknown>) => {
    setDetailRow(row);
    setDetailOpenAsEdit(true);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-5">
      <form
        className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm"
        onSubmit={(e) => { e.preventDefault(); onSearch(); }}
      >
        <Input
          className="h-9 w-[180px] rounded-lg border-gray-200"
          placeholder="描述"
          value={filters.description}
          onChange={(e) => setFilters((f) => ({ ...f, description: e.target.value }))}
        />
        <Select
          value={filters.priority === null ? 'all' : String(filters.priority)}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, priority: v === 'all' ? null : Number(v) }))
          }
        >
          <SelectTrigger className="h-9 w-[88px] rounded-lg border-gray-200">
            <SelectValue placeholder="优先级" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="0">低</SelectItem>
            <SelectItem value="1">中</SelectItem>
            <SelectItem value="2">高</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.appCode || 'all'}
          onValueChange={(v) => setFilters((f) => ({ ...f, appCode: v === 'all' ? '' : v }))}
        >
          <SelectTrigger className="h-9 w-[100px] rounded-lg border-gray-200">
            <SelectValue placeholder="应用" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            {APP_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.isActive === null ? 'all' : String(filters.isActive)}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, isActive: v === 'all' ? null : Number(v) }))
          }
        >
          <SelectTrigger className="h-9 w-[88px] rounded-lg border-gray-200">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="1">启用</SelectItem>
            <SelectItem value="0">禁用</SelectItem>
          </SelectContent>
        </Select>
        <Input
          className="h-9 w-[120px] rounded-lg border-gray-200"
          placeholder="通知人"
          value={filters.userName}
          onChange={(e) => setFilters((f) => ({ ...f, userName: e.target.value }))}
        />
        <div className="h-8 w-px bg-gray-200 shrink-0" aria-hidden />
        <Button type="submit" size="sm" className="rounded-lg h-9">
          查询
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg h-9"
          onClick={onReset}
        >
          重置
        </Button>
        <Button type="button" size="sm" className="ml-auto rounded-lg h-9" onClick={() => setAddOpen(true)}>
          新建拨测
        </Button>
      </form>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-[#f7f8fa] sticky top-0 z-10 border-b border-gray-200">
            <TableRow className="bg-gray-50/60 hover:bg-gray-50/60 border-b border-gray-100 h-11">
              <TableHead scope="col" className="w-[80px] font-medium text-gray-500">拨测ID</TableHead>
              <TableHead scope="col" className="min-w-[160px] font-medium text-gray-500">描述</TableHead>
              <TableHead scope="col" className="w-[90px] font-medium text-gray-500">应用</TableHead>
              <TableHead scope="col" className="w-[80px] font-medium text-gray-500">优先级</TableHead>
              <TableHead scope="col" className="w-[100px] font-medium text-gray-500">拨测类型</TableHead>
              <TableHead scope="col" className="min-w-[180px] max-w-[220px] font-medium text-gray-500">拨测地址</TableHead>
              <TableHead scope="col" className="min-w-[140px] font-medium text-gray-500">菜单</TableHead>
              <TableHead scope="col" className="min-w-[120px] font-medium text-gray-500">账号</TableHead>
              <TableHead scope="col" className="min-w-[160px] font-medium text-gray-500">告警配置</TableHead>
              <TableHead scope="col" className="w-[140px] font-medium text-gray-500">创建时间</TableHead>
              <TableHead scope="col" className="w-[140px] font-medium text-gray-500">更新时间</TableHead>
              <TableHead scope="col" className="w-[90px] font-medium text-gray-500">状态</TableHead>
              <TableHead scope="col" className="text-right min-w-[180px] font-medium text-gray-500">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={13} className="text-center text-gray-400 py-12">
                  <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> 加载中...</span>
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={13} className="text-center text-gray-500 py-12">暂无数据</TableCell>
              </TableRow>
            ) : (
              list.map((row, idx) => (
                <TableRow
                  key={(row.id as string) ?? idx}
                  className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                  onClick={() => openDetail(row)}
                >
                  <TableCell className="font-mono text-xs text-gray-600">{String(row.id ?? '-')}</TableCell>
                  <TableCell>{String(row.description ?? '-')}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {String(row.appCode ?? '-')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        row.priority === 0 && 'bg-red-50 text-red-700',
                        row.priority === 1 && 'bg-blue-50 text-blue-700',
                        row.priority === 2 && 'bg-green-50 text-green-700',
                        (row.priority !== 0 && row.priority !== 1 && row.priority !== 2) && 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {row.priority === 0 ? '低' : row.priority === 1 ? '中' : row.priority === 2 ? '高' : '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {String(row.dialingType || '-')}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    {(row.dialUrl as string) ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate font-mono text-xs text-gray-600 cursor-default">
                              {String(row.dialUrl)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-md break-all">
                            {String(row.dialUrl)}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-600">{String(row.menuName ?? '-')}</TableCell>
                  <TableCell className="text-gray-600">{String(row.accountName ?? '-')}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    <div>openId : {String(row.openId ?? '-')}</div>
                    <div>通知人 : {String(row.userName ?? '-')}</div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                    {formatDialTime(row.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                    {formatDialTime(row.updatedAt)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={row.isActive === 1}
                        onCheckedChange={() => handleToggleStatus(row)}
                      />
                      <span className={cn('text-xs', row.isActive === 0 ? 'text-red-600' : 'text-green-600')}>
                        {row.isActive === 0 ? '禁用' : '启用'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-primary font-medium"
                      onClick={() => openEdit(row)}
                    >
                      编辑
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-primary font-medium"
                      onClick={() => openDetail(row)}
                    >
                      拨测详情
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-red-600 hover:text-red-700 font-medium"
                      onClick={() => handleDeleteClick(row)}
                    >
                      删除
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <UnifiedPagination
          total={total}
          currentPage={page}
          pageSize={PAGE_SIZE}
          onPageChange={(p) => loadList(p, false)}
          unitLabel="条"
          hideWhenEmpty={false}
        />
      </div>
      <DialAddDialog open={addOpen} onOpenChange={setAddOpen} onSuccess={() => loadList(1)} dialSub={dialSub} />
      <DialDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        logId={(detailRow?.id as string | number) ?? null}
        detailForm={detailRow}
        initialEditing={detailOpenAsEdit}
        onSuccess={() => loadList(page)}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定删除？</AlertDialogTitle>
            <AlertDialogDescription>删除后不可恢复，确定要删除该拨测吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={async () => {
                await handleDeleteConfirm();
              }}
            >
              确定删除
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
