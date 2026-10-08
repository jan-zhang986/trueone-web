/**
 * 拨测管理 - web性能配置（来自 spotter-aegis-perf PerfConfig，1:1 还原）
 * 筛选、分页、表格、新建/编辑/删除
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { performanceApi } from '@/services/dial-management';
import { toast } from 'sonner';
import { APP_OPTIONS } from './constants';
import { Textarea } from '@/components/ui/textarea';
import { MenuTreeCheckbox, type MenuTreeNode } from './MenuTreeCheckbox';

const PAGE_SIZE = 20;

/** 业务线选项（与 spotter-aegislm performance/businessEnum.js 一致，value 为中文文案） */
const BUSINESS_OPTIONS = [
  { value: '商家&运营', label: '商家&运营' },
  { value: '金融&财会', label: '金融&财会' },
  { value: '供应链', label: '供应链' },
  { value: '数据引擎', label: '数据引擎' },
  { value: '效率协同', label: '效率协同' },
] as const;

/** 兼容多种时间字段并格式化 */
function formatConfigTime(v: unknown): string {
  if (v == null) return '-';
  const t = typeof v === 'number' ? v : typeof v === 'string' ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? new Date(t).toLocaleString('zh-CN') : String(v);
}

/** 获取配置行的创建时间（兼容多种字段名） */
function getCreateTime(row: Record<string, unknown>): string {
  const v = row.createdAt ?? row.create_time ?? row.createdAt ?? row.created_at ?? row.gmtCreate ?? row.gmt_create ?? row.ctime;
  return formatConfigTime(v);
}

/** 获取配置行的创建人（取 open_id） */
function getCreator(row: Record<string, unknown>): string {
  const v = row.open_id ?? row.openId ?? '';
  return v != null && String(v).trim() ? String(v).trim() : '-';
}

export function PerformanceConfigView() {
  const [filters, setFilters] = useState({
    name: '',
    business_name: '',
    app_code: '',
    is_active: null as number | null,
    description: '',
  });
  const [list, setList] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);
  const [executeOpen, setExecuteOpen] = useState(false);
  const [executeRow, setExecuteRow] = useState<Record<string, unknown> | null>(null);
  const [accountList, setAccountList] = useState<Record<string, unknown>[]>([]);
  const [executing, setExecuting] = useState(false);
  const [executeForm, setExecuteForm] = useState({
    account: '',
    device: 'desktop',
    categories: ['performance', 'accessibility', 'best-practices', 'seo'] as string[],
    locale: 'zh-CN',
  });
  const [form, setForm] = useState({
    name: '',
    business_name: '',
    app_code: '',
    is_active: 1,
    description: '',
    open_id: '',
    accountId: '',
    account_features: null as Record<string, unknown> | null,
    menu_ids: [] as (string | number)[],
    // 默认每天一次：0 0 * * *
    cron: '0 0 * * *',
    performance_config: {
      device: 'desktop' as 'desktop' | 'mobile',
      locale: 'zh-CN' as string,
      categories: ['accessibility', 'best-practices', 'performance', 'seo'] as string[],
    },
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [addAccountOptions, setAddAccountOptions] = useState<Record<string, unknown>[]>([]);
  const [addMenuTree, setAddMenuTree] = useState<MenuTreeNode[]>([]);
  const [cronDialogOpen, setCronDialogOpen] = useState(false);
  const [tempCronValue, setTempCronValue] = useState('');

  const loadList = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        current_page: p,
        page_size: PAGE_SIZE,
        currentPage: p,
        pageSize: PAGE_SIZE,
        name: filters.name || undefined,
        business_name: filters.business_name || undefined,
        app_code: filters.app_code || undefined,
        is_active: filters.is_active !== null ? filters.is_active : undefined,
        description: filters.description || undefined,
      };
      const res = await performanceApi.configList(params);
      const data = Array.isArray(res) ? res : (res && typeof res === 'object' && 'data' in res ? (res as any).data : []);
      const totalCount = (res && typeof res === 'object' && 'total' in res) ? (res as any).total : data.length;
      setList(Array.isArray(data) ? data : []);
      setTotal(typeof totalCount === 'number' ? totalCount : 0);
      setPage(p);
    } catch (e) {
      toast.error((e as Error).message || '加载性能配置失败');
    } finally {
      setLoading(false);
    }
  }, [filters.name, filters.business_name, filters.app_code, filters.is_active, filters.description]);

  useEffect(() => {
    loadList(1);
  }, [loadList]);

  const onSearch = () => loadList(1);
  const onReset = () => {
    setFilters({ name: '', business_name: '', app_code: '', is_active: null, description: '' });
    setPage(1);
    setTimeout(() => loadList(1), 0);
  };

  const fetchAccounts = useCallback(async (appCode: string) => {
    try {
      const res = await performanceApi.accountList({
        appCode,
        currentPage: 1,
        pageSize: 999,
        accountTitle: '',
        baseUrl: '',
      } as Record<string, unknown>);
      const data = res && typeof res === 'object' && 'data' in res
        ? ((res as any).data?.data ?? (res as any).data ?? [])
        : [];
      setAccountList(Array.isArray(data) ? data : []);
    } catch {
      toast.error('获取账号列表失败');
    }
  }, []);

  const openExecute = useCallback(async (row: Record<string, unknown>) => {
    setExecuteRow(row);
    setExecuteForm({
      account: '',
      device: 'desktop',
      categories: ['performance', 'accessibility', 'best-practices', 'seo'],
      locale: 'zh-CN',
    });
    const appCode = String(row.app_code ?? row.appCode ?? 'Gmesh');
    await fetchAccounts(appCode);
    setExecuteOpen(true);
  }, [fetchAccounts]);

  const handleExecute = useCallback(async () => {
    if (!executeForm.account) {
      toast.error('请选择执行账号');
      return;
    }
    if (!executeRow) return;
    setExecuting(true);
    try {
      const appCode = String(executeRow.app_code ?? executeRow.appCode ?? '');
      const configId = executeRow.id ?? executeRow.configuration_id;
      const selectedAccount = accountList.find((a: Record<string, unknown>) => String(a.id) === executeForm.account) as Record<string, unknown> | undefined;
      const payload = {
        configuration_id: configId,
        app_code: appCode,
        device: executeForm.device,
        categories: executeForm.categories,
        locale: executeForm.locale,
        status: 'pending',
        error_message: '',
        report_path: '',
        account_features: selectedAccount?.accountFeatures,
        task_type: 'WEB',
        alarm_features: null,
        menu_datas: [],
      };
      const res = await performanceApi.createTask(payload);
      if (res && typeof res === 'object' && (res as any).code === 200) {
        toast.success('任务创建成功');
        setExecuteOpen(false);
        setExecuteRow(null);
      } else {
        toast.error((res as any)?.message || '任务创建失败');
      }
    } catch (e) {
      toast.error((e as Error)?.message || '执行失败');
    } finally {
      setExecuting(false);
    }
  }, [executeForm, executeRow, accountList]);

  /** 新建弹窗打开时按应用加载账号与菜单（与原项目 AddConfig 一致） */
  useEffect(() => {
    if (!addOpen) return;
    if (form.app_code) {
      performanceApi
        .accountList({
          appCode: form.app_code,
          currentPage: 1,
          pageSize: 999,
          accountTitle: '',
          baseUrl: '',
        } as Record<string, unknown>)
        .then((res) => {
          const raw = res && typeof res === 'object' && 'data' in res ? (res as any).data : res;
          const data = Array.isArray(raw) ? raw : raw?.data ?? [];
          setAddAccountOptions(Array.isArray(data) ? data : []);
        });

      performanceApi
        .menuList({
          appCode: form.app_code,
          currentPage: 1,
          pageSize: 9999,
        } as Record<string, unknown>)
        .then((res) => {
          const raw = res && typeof res === 'object' && 'data' in res ? (res as any).data : res;
          const data = Array.isArray(raw) ? raw : raw?.data ?? [];
          const list = Array.isArray(data) ? data : [];
          const toTreeNode = (item: {
            id?: string | number;
            menuId?: string | number;
            menu_id?: string | number;
            name?: string;
            children?: unknown[];
          }): MenuTreeNode => {
            const rawId = (item.id ?? (item as any).menuId ?? (item as any).menu_id) as
              | string
              | number
              | undefined;
            return {
              id: String(rawId ?? ''),
              name: String(item.name ?? ''),
              children:
                Array.isArray(item.children) && item.children.length
                  ? (item.children as {
                      id?: string | number;
                      menuId?: string | number;
                      menu_id?: string | number;
                      name?: string;
                      children?: unknown[];
                    }[]).map(toTreeNode)
                  : undefined,
            };
          };
          setAddMenuTree(
            list.map(
              (item: {
                id?: string | number;
                menuId?: string | number;
                menu_id?: string | number;
                name?: string;
                children?: unknown[];
              }) => toTreeNode(item),
            ),
          );
        });
    } else {
      setAddAccountOptions([]);
      setAddMenuTree([]);
    }
  }, [addOpen, form.app_code]);

  const validateCron = (value: string): { ok: boolean; message?: string } => {
    const v = value?.trim() ?? '';
    if (!v) return { ok: false, message: '请配置Cron表达式' };
    const parts = v.split(/\s+/);
    if (parts.length !== 5) return { ok: false, message: 'Cron表达式格式错误，必须包含5个字段' };
    return { ok: true };
  };

  const openEdit = (row: Record<string, unknown>) => {
    setEditRow(row);

    // 兼容后端返回 features 为对象或 JSON 字符串的情况
    let rawFeatures = (row as any).features ?? (row as any).configFeatures ?? null;
    if (typeof rawFeatures === 'string') {
      try {
        rawFeatures = JSON.parse(rawFeatures);
      } catch {
        rawFeatures = null;
      }
    }
    const features = (rawFeatures ?? null) as Record<string, unknown> | null;
    const perfConfig = (features?.performance_config ?? null) as Record<string, unknown> | null;

    // 处理 menu_ids（数组或逗号分隔字符串）
    let menuIds: (string | number)[] = [];
    const rawMenuIds = (features as any)?.menu_ids;
    if (Array.isArray(rawMenuIds)) {
      menuIds = rawMenuIds as (string | number)[];
    } else if (typeof rawMenuIds === 'string') {
      menuIds = rawMenuIds
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id)
        .map((id) => (Number.isNaN(Number(id)) ? id : Number(id)));
    }

    const cronValue = String((row as any).cron ?? '');

    // 兼容历史数据中业务线为英文 Key 的情况（如 Efficiency）
    const rawBusinessName = String(row.business_name ?? row.businessName ?? '');
    const businessNameMap: Record<string, string> = {
      Merchant: '商家&运营',
      Finance: '金融&财会',
      SupplyChain: '供应链',
      DataEngine: '数据引擎',
      Efficiency: '效率协同',
    };
    const normalizedBusinessName = businessNameMap[rawBusinessName] ?? rawBusinessName;

    setForm({
      name: String(row.name ?? ''),
      business_name: normalizedBusinessName,
      app_code: String(row.app_code ?? row.appCode ?? ''),
      is_active:
        row.is_active !== undefined
          ? Number(row.is_active)
          : row.isActive !== undefined
            ? Number(row.isActive)
            : 1,
      description: String(row.description ?? ''),
      open_id: String((row as any).open_id ?? (row as any).openId ?? ''),
      accountId: '',
      account_features: (features as any)?.account_features ?? null,
      menu_ids: menuIds,
      cron: cronValue,
      performance_config: {
        device: (perfConfig?.device as 'desktop' | 'mobile') ?? 'desktop',
        locale: String(perfConfig?.locale ?? 'zh-CN'),
        categories: Array.isArray(perfConfig?.categories)
          ? (perfConfig!.categories as string[])
          : (['accessibility', 'best-practices', 'performance', 'seo'] as string[]),
      },
    });

    // 编辑时也需要加载账号和菜单树（与 AddConfig/EditConfig 一致），并尽量匹配原有账号
    const appCode = String(row.app_code ?? row.appCode ?? '');
    if (appCode) {
      performanceApi
        .accountList({
          appCode,
          currentPage: 1,
          pageSize: 999,
          accountTitle: '',
          baseUrl: '',
        } as Record<string, unknown>)
        .then((res) => {
          const raw = res && typeof res === 'object' && 'data' in res ? (res as any).data : res;
          const data = (Array.isArray(raw) ? raw : raw?.data ?? []) as Record<string, unknown>[];
          setAddAccountOptions(Array.isArray(data) ? data : []);

          // 根据 account_features 尝试回显选中的账号（对齐原项目：按 user + apiUrl 匹配）
          let targetFeatures: any = (features as any)?.account_features;
          if (typeof targetFeatures === 'string') {
            try {
              targetFeatures = JSON.parse(targetFeatures);
            } catch {
              targetFeatures = null;
            }
          }
          if (targetFeatures) {
            const matched = data.find((acc: any) => {
              const source = acc.accountFeatures;
              return (
                source &&
                source.user === targetFeatures.user &&
                source.apiUrl === targetFeatures.apiUrl
              );
            });
            if (matched?.id != null) {
              setForm((f) => ({ ...f, accountId: String(matched.id) }));
            }
          }
        });

      performanceApi
        .menuList({
          appCode,
          currentPage: 1,
          pageSize: 9999,
        } as Record<string, unknown>)
        .then((res) => {
          const raw = res && typeof res === 'object' && 'data' in res ? (res as any).data : res;
          const data = Array.isArray(raw) ? raw : raw?.data ?? [];
          const list = Array.isArray(data) ? data : [];
          const toTreeNode = (item: {
            id?: string | number;
            menuId?: string | number;
            menu_id?: string | number;
            name?: string;
            children?: unknown[];
          }): MenuTreeNode => {
            const rawId = (item.id ?? (item as any).menuId ?? (item as any).menu_id) as
              | string
              | number
              | undefined;
            return {
              id: String(rawId ?? ''),
              name: String(item.name ?? ''),
              children:
                Array.isArray(item.children) && item.children.length
                  ? (item.children as {
                      id?: string | number;
                      menuId?: string | number;
                      menu_id?: string | number;
                      name?: string;
                      children?: unknown[];
                    }[]).map(toTreeNode)
                  : undefined,
            };
          };
          setAddMenuTree(
            list.map(
              (item: {
                id?: string | number;
                menuId?: string | number;
                menu_id?: string | number;
                name?: string;
                children?: unknown[];
              }) => toTreeNode(item),
            ),
          );
        });
    } else {
      setAddAccountOptions([]);
      setAddMenuTree([]);
    }

    setTempCronValue(cronValue);
    setEditOpen(true);
  };

  const resetAddForm = useCallback(() => {
    setForm({
      name: '',
      business_name: '',
      app_code: '',
      is_active: 1,
      description: '',
      open_id: '',
      accountId: '',
      account_features: null,
      menu_ids: [],
      // 重置时也默认每天一次
      cron: '0 0 * * *',
      performance_config: {
        device: 'desktop',
        locale: 'zh-CN',
        categories: ['accessibility', 'best-practices', 'performance', 'seo'],
      },
    });
    setAddAccountOptions([]);
    setAddMenuTree([]);
    setTempCronValue('0 0 * * *');
  }, []);

  const handleCreate = async () => {
    if (!form.name?.trim()) {
      toast.error('请输入配置名称');
      return;
    }
    if (!form.business_name?.trim()) {
      toast.error('请选择业务线');
      return;
    }
    if (!form.app_code?.trim()) {
      toast.error('请选择应用');
      return;
    }
    if (!form.accountId || !form.account_features) {
      toast.error('请选择账号');
      return;
    }
    if (!form.menu_ids?.length) {
      toast.error('请选择菜单');
      return;
    }
    if (!form.open_id?.trim()) {
      toast.error('请输入创建人');
      return;
    }
    const cronValid = validateCron(form.cron);
    if (!cronValid.ok) {
      toast.error(cronValid.message || 'Cron表达式格式错误');
      return;
    }
    setSubmitLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        business_name: form.business_name.trim(),
        description: form.description?.trim() ?? '',
        app_code: form.app_code,
        features: {
          account_features: form.account_features,
          menu_ids: form.menu_ids,
          performance_config: form.performance_config,
        },
        cron: form.cron.trim(),
        is_active: 1,
        open_id: form.open_id.trim(),
      };
      await performanceApi.configCreate(payload);
      toast.success('新建成功');
      setAddOpen(false);
      resetAddForm();
      loadList(page);
    } catch (e) {
      toast.error((e as Error).message || '新建失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editRow?.id) return;

    if (!form.name?.trim()) {
      toast.error('请输入配置名称');
      return;
    }
    if (!form.business_name?.trim()) {
      toast.error('请选择业务线');
      return;
    }
    if (!form.app_code?.trim()) {
      toast.error('请选择应用');
      return;
    }
    if (!form.account_features) {
      toast.error('请选择账号');
      return;
    }
    if (!form.menu_ids?.length) {
      toast.error('请选择菜单');
      return;
    }
    if (!form.open_id?.trim()) {
      toast.error('请输入创建人');
      return;
    }
    const cronValid = validateCron(form.cron);
    if (!cronValid.ok) {
      toast.error(cronValid.message || 'Cron表达式格式错误');
      return;
    }

    setSubmitLoading(true);
    try {
      const payload: Record<string, unknown> = {
        id: editRow.id,
        name: form.name.trim(),
        business_name: form.business_name.trim(),
        description: form.description?.trim() ?? '',
        app_code: form.app_code,
        features: {
          account_features: form.account_features,
          menu_ids: form.menu_ids,
          performance_config: form.performance_config,
        },
        cron: form.cron.trim(),
        is_active: form.is_active,
        open_id: form.open_id.trim(),
      };
      if (editRow.createdAt !== undefined) payload.createdAt = editRow.createdAt;
      if (editRow.create_time !== undefined) payload.create_time = editRow.create_time;
      if (editRow.updatedAt !== undefined) payload.updatedAt = editRow.updatedAt;
      if (editRow.updated_at !== undefined) payload.updated_at = editRow.updated_at;

      await performanceApi.configEdit(payload);
      toast.success('保存成功');
      setEditOpen(false);
      setEditRow(null);
      loadList(page);
    } catch (e) {
      toast.error((e as Error).message || '保存失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (row: Record<string, unknown>) => {
    if (!confirm('确定删除该配置？')) return;
    try {
      await performanceApi.configDelete({ id: row.id });
      toast.success('删除成功');
      loadList(page);
    } catch (e) {
      toast.error((e as Error).message || '删除失败');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <form
        className="flex flex-wrap items-end gap-4 rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm"
        onSubmit={(e) => { e.preventDefault(); onSearch(); }}
      >
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-gray-500 font-medium">配置名称</span>
          <Input
            className="h-9 w-[160px]"
            placeholder="请输入"
            value={filters.name}
            onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-gray-500 font-medium">业务名称</span>
          <Input
            className="h-9 w-[160px]"
            placeholder="请输入"
            value={filters.business_name}
            onChange={(e) => setFilters((f) => ({ ...f, business_name: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-gray-500 font-medium">应用</span>
          <Select
            value={filters.app_code || 'all'}
            onValueChange={(v) => setFilters((f) => ({ ...f, app_code: v === 'all' ? '' : v }))}
          >
            <SelectTrigger className="h-9 w-[120px]">
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              {APP_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-gray-500 font-medium">状态</span>
          <Select
            value={filters.is_active === null ? 'all' : String(filters.is_active)}
            onValueChange={(v) => setFilters((f) => ({ ...f, is_active: v === 'all' ? null : Number(v) }))}
          >
            <SelectTrigger className="h-9 w-[100px]">
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="1">启用</SelectItem>
              <SelectItem value="0">禁用</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <div className="flex items-center gap-2">
          <Button type="submit">查询</Button>
          <Button type="button" variant="outline" onClick={onReset}>重置</Button>
        </div>
        <Button type="button" className="ml-auto" onClick={() => { resetAddForm(); setAddOpen(true); }}>
          新建配置
        </Button>
      </form>

      <div className="rounded-xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
              <TableHead className="w-[90px]">ID</TableHead>
              <TableHead className="min-w-[140px]">配置名称</TableHead>
              <TableHead className="min-w-[120px]">业务线</TableHead>
              <TableHead className="w-[100px]">应用</TableHead>
              <TableHead className="min-w-[140px]">菜单ID</TableHead>
              <TableHead className="min-w-[200px]">Cron</TableHead>
              <TableHead className="w-[80px]">状态</TableHead>
              <TableHead className="min-w-[200px]">描述</TableHead>
              <TableHead className="w-[100px]">创建人</TableHead>
              <TableHead className="w-[160px]">创建时间</TableHead>
              <TableHead className="text-right min-w-[120px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-gray-500 py-8">
                  加载中...
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-gray-500 py-8">
                  暂无配置数据
                </TableCell>
              </TableRow>
            ) : (
              list.map((row, idx) => {
                const features = (row as any).features ?? (row as any).configFeatures;
                const menuIds = Array.isArray(features?.menu_ids) ? features.menu_ids : [];
                const menuIdsStr = menuIds.length ? menuIds.join(', ') : '-';
                return (
                <TableRow key={(row.id as string) ?? idx}>
                  <TableCell className="text-sm text-gray-600">{String(row.id ?? '-')}</TableCell>
                  <TableCell className="font-medium">{String(row.name ?? '-')}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                      {String(row.business_name ?? row.businessName ?? '-')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {String(row.app_code ?? row.appCode ?? '-')}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate font-mono text-xs text-gray-600" title={menuIdsStr}>
                    {menuIdsStr}
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate font-mono text-xs text-gray-700" title={String((row as any).cron ?? '')}>
                    {String((row as any).cron ?? '-')}
                  </TableCell>
                  <TableCell>
                    <span className={row.is_active === 1 || row.isActive === 1 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {row.is_active === 1 || row.isActive === 1 ? '启用' : '禁用'}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate" title={String(row.description ?? '')}>
                    {String(row.description ?? '-')}
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm">{getCreator(row)}</TableCell>
                  <TableCell className="text-gray-500 text-sm whitespace-nowrap">
                    {getCreateTime(row)}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="link" size="sm" className="h-auto p-0 text-primary font-medium" onClick={() => openExecute(row)}>
                      执行
                    </Button>
                    <Button variant="link" size="sm" className="h-auto p-0 text-primary font-medium" onClick={() => openEdit(row)}>
                      编辑
                    </Button>
                    <Button variant="link" size="sm" className="h-auto p-0 text-red-600 hover:text-red-700 font-medium" onClick={() => handleDelete(row)}>
                      删除
                    </Button>
                  </TableCell>
                </TableRow>
              );
              })
            )}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
            <span className="text-sm text-gray-500">共 {total} 条</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => loadList(page - 1)}>上一页</Button>
              <span className="flex items-center px-2 text-sm text-gray-600">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => loadList(page + 1)}>下一页</Button>
            </div>
          </div>
        )}
      </div>

      {/* 新建配置（与原项目 AddConfig.vue 一致：基础配置 + web性能配置 + 调度配置） */}
      <Dialog open={addOpen} onOpenChange={(open) => { if (!open) resetAddForm(); setAddOpen(open); }}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto z-[100]">
          <DialogHeader>
            <DialogTitle>新建web性能配置</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">基础配置</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>业务线 <span className="text-red-500">*</span></Label>
                  <Select value={form.business_name} onValueChange={(v) => setForm((f) => ({ ...f, business_name: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent className="z-[110]">
                      {BUSINESS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>配置名称 <span className="text-red-500">*</span></Label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="请输入" />
                </div>
                <div className="space-y-2">
                  <Label>应用 <span className="text-red-500">*</span></Label>
                  <Select value={form.app_code} onValueChange={(v) => setForm((f) => ({ ...f, app_code: v, accountId: '', account_features: null, menu_ids: [] }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent className="z-[110]">
                      {APP_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>账号 <span className="text-red-500">*</span></Label>
                  <Select
                    value={form.accountId}
                    onValueChange={(v) => {
                      const acc = addAccountOptions.find((a) => String(a.id) === v) as Record<string, unknown> | undefined;
                      setForm((f) => ({ ...f, accountId: v, account_features: (acc?.accountFeatures ?? acc ?? null) as Record<string, unknown> | null }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请先选择应用" />
                    </SelectTrigger>
                    <SelectContent className="z-[110]">
                      {addAccountOptions.map((a) => (
                        <SelectItem key={String(a.id)} value={String(a.id)}>
                          {String((a as any).accountTitle ?? (a as any).account_title ?? a.id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2 min-w-0">
                  <Label>菜单 <span className="text-red-500">*</span></Label>
                  <MenuTreeCheckbox
                    value={form.menu_ids}
                    onValueChange={(ids) => setForm((f) => ({ ...f, menu_ids: ids }))}
                    options={addMenuTree}
                    emptyText="请先选择应用"
                    maxHeight="12rem"
                  />
                  {form.menu_ids.length > 0 && <p className="text-xs text-gray-500">已选 {form.menu_ids.length} 项</p>}
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>创建人 <span className="text-red-500">*</span></Label>
                  <Input value={form.open_id} onChange={(e) => setForm((f) => ({ ...f, open_id: e.target.value }))} placeholder="请输入 open_id" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>配置描述</Label>
                  <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="选填" rows={2} />
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">web性能配置</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>设备 <span className="text-red-500">*</span></Label>
                  <RadioGroup value={form.performance_config.device} onValueChange={(v) => setForm((f) => ({ ...f, performance_config: { ...f.performance_config, device: v as 'desktop' | 'mobile' } }))} className="flex gap-4 pt-1">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="desktop" id="add-device-desktop" />
                      <Label htmlFor="add-device-desktop" className="font-normal">桌面端</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="mobile" id="add-device-mobile" />
                      <Label htmlFor="add-device-mobile" className="font-normal">移动端</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label>语言 <span className="text-red-500">*</span></Label>
                  <RadioGroup value={form.performance_config.locale} onValueChange={(v) => setForm((f) => ({ ...f, performance_config: { ...f.performance_config, locale: v } }))} className="flex gap-4 pt-1">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="zh-CN" id="add-locale-zh" />
                      <Label htmlFor="add-locale-zh" className="font-normal">中文</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="en-US" id="add-locale-en" />
                      <Label htmlFor="add-locale-en" className="font-normal">英文</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2 col-span-2 min-w-0">
                  <Label>类别 <span className="text-red-500">*</span></Label>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                    {[
                      { id: 'accessibility', label: '无障碍功能' },
                      { id: 'best-practices', label: '最佳实践' },
                      { id: 'performance', label: '性能' },
                      { id: 'seo', label: 'SEO' },
                    ].map((cat) => (
                      <div key={cat.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`add-${cat.id}`}
                          checked={form.performance_config.categories.includes(cat.id)}
                          onCheckedChange={(checked) => {
                            const newCats = !!checked
                              ? [...form.performance_config.categories, cat.id]
                              : form.performance_config.categories.filter((c) => c !== cat.id);
                            setForm((f) => ({ ...f, performance_config: { ...f.performance_config, categories: newCats } }));
                          }}
                        />
                        <Label htmlFor={`add-${cat.id}`} className="font-normal">{cat.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">调度配置</h4>
              <div className="space-y-2">
                <Label>Cron表达式 <span className="text-red-500">*</span></Label>
                <div className="flex gap-2">
                  <Input value={form.cron} readOnly onClick={() => { setTempCronValue(form.cron); setCronDialogOpen(true); }} placeholder="点击配置 Cron 表达式" className="cursor-pointer" />
                  <Button type="button" variant="outline" size="sm" onClick={() => setCronDialogOpen(true)}>配置</Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={submitLoading}>{submitLoading ? '提交中...' : '确定'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cron 配置弹窗（叠在新建/编辑弹窗之上） */}
      <Dialog open={cronDialogOpen} onOpenChange={setCronDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto z-[130]">
          <DialogHeader>
            <DialogTitle>Cron表达式配置</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Cron表达式</Label>
            <Input value={tempCronValue} onChange={(e) => setTempCronValue(e.target.value)} placeholder="如 */5 * * * *" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCronDialogOpen(false); setTempCronValue(form.cron); }}>取消</Button>
            <Button onClick={() => {
              const v = validateCron(tempCronValue);
              if (!v.ok) { toast.error(v.message); return; }
              setForm((f) => ({ ...f, cron: tempCronValue.trim() }));
              setCronDialogOpen(false);
            }}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 执行配置弹窗 */}
      <Dialog open={executeOpen} onOpenChange={(o) => { if (!o) setExecuteRow(null); setExecuteOpen(o); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>性能测试执行配置</DialogTitle>
          </DialogHeader>
          {executeRow && (
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label className="text-gray-500">配置</Label>
                <Input disabled value={String(executeRow.name ?? '-')} className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label className="after:content-['*'] after:ml-0.5 after:text-red-500">账号</Label>
                <Select
                  value={executeForm.account}
                  onValueChange={(v) => setExecuteForm((f) => ({ ...f, account: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择账号" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountList.map((a: Record<string, unknown>) => (
                      <SelectItem key={String(a.id)} value={String(a.id)}>
                        {String(a.accountTitle ?? a.account_title ?? a.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>设备</Label>
                <RadioGroup
                  value={executeForm.device}
                  onValueChange={(v) => setExecuteForm((f) => ({ ...f, device: v }))}
                  className="flex gap-4 pt-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="desktop" id="exec-desktop" />
                    <Label htmlFor="exec-desktop" className="font-normal">桌面端</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mobile" id="exec-mobile" />
                    <Label htmlFor="exec-mobile" className="font-normal">移动端</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-3">
                <Label>测试类别</Label>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {[
                    { id: 'performance', label: '性能' },
                    { id: 'accessibility', label: '无障碍功能' },
                    { id: 'best-practices', label: '最佳实践' },
                    { id: 'seo', label: 'SEO' },
                  ].map((cat) => (
                    <div key={cat.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`exec-${cat.id}`}
                        checked={executeForm.categories.includes(cat.id)}
                        onCheckedChange={(checked) => {
                          const newCats = !!checked
                            ? [...executeForm.categories, cat.id]
                            : executeForm.categories.filter((c) => c !== cat.id);
                          setExecuteForm((f) => ({ ...f, categories: newCats }));
                        }}
                      />
                      <Label htmlFor={`exec-${cat.id}`} className="font-normal truncate">{cat.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>语言</Label>
                <RadioGroup
                  value={executeForm.locale}
                  onValueChange={(v) => setExecuteForm((f) => ({ ...f, locale: v }))}
                  className="flex gap-4 pt-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="zh-CN" id="exec-zh" />
                    <Label htmlFor="exec-zh" className="font-normal">中文</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="en-US" id="exec-en" />
                    <Label htmlFor="exec-en" className="font-normal">英文</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setExecuteOpen(false)}>取消</Button>
            <Button onClick={handleExecute} disabled={executing}>
              {executing ? '提交中...' : '立即执行'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑配置（与原项目 EditConfig.vue 一致：基础配置 + web性能配置 + 调度配置） */}
      <Dialog open={editOpen} onOpenChange={(open) => { if (!open) setEditRow(null); setEditOpen(open); }}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto z-[100]">
          <DialogHeader>
            <DialogTitle>编辑web性能配置</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">基础配置</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>业务线 <span className="text-red-500">*</span></Label>
                  <Select
                    value={form.business_name}
                    onValueChange={(v) => setForm((f) => ({ ...f, business_name: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent className="z-[110]">
                      {BUSINESS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>配置名称 <span className="text-red-500">*</span></Label>
                  <Input
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="请输入"
                  />
                </div>
                <div className="space-y-2">
                  <Label>应用 <span className="text-red-500">*</span></Label>
                  <Select
                    value={form.app_code}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        app_code: v,
                        accountId: '',
                        account_features: f.account_features,
                        menu_ids: f.menu_ids,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent className="z-[110]">
                      {APP_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>账号 <span className="text-red-500">*</span></Label>
                  <Select
                    value={form.accountId}
                    onValueChange={(v) => {
                      const acc = addAccountOptions.find(
                        (a) => String(a.id) === v,
                      ) as Record<string, unknown> | undefined;
                      setForm((f) => ({
                        ...f,
                        accountId: v,
                        account_features:
                          (acc as any)?.accountFeatures ?? (acc as any) ?? f.account_features,
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择账号" />
                    </SelectTrigger>
                    <SelectContent className="z-[110]">
                      {addAccountOptions.map((a) => (
                        <SelectItem key={String(a.id)} value={String(a.id)}>
                          {String(
                            (a as any).accountTitle ??
                              (a as any).account_title ??
                              a.id,
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2 min-w-0">
                  <Label>菜单 <span className="text-red-500">*</span></Label>
                  <MenuTreeCheckbox
                    value={form.menu_ids}
                    onValueChange={(ids) =>
                      setForm((f) => ({ ...f, menu_ids: ids }))
                    }
                    options={addMenuTree}
                    emptyText="请先选择应用"
                    maxHeight="12rem"
                  />
                  {form.menu_ids.length > 0 && (
                    <p className="text-xs text-gray-500">
                      已选 {form.menu_ids.length} 项
                    </p>
                  )}
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>创建人 <span className="text-red-500">*</span></Label>
                  <Input
                    value={form.open_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, open_id: e.target.value }))
                    }
                    placeholder="请输入 open_id"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>配置描述</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="选填"
                    rows={2}
                  />
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                web性能配置
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    设备 <span className="text-red-500">*</span>
                  </Label>
                  <RadioGroup
                    value={form.performance_config.device}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        performance_config: {
                          ...f.performance_config,
                          device: v as 'desktop' | 'mobile',
                        },
                      }))
                    }
                    className="flex gap-4 pt-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="desktop" id="edit-device-desktop" />
                      <Label
                        htmlFor="edit-device-desktop"
                        className="font-normal"
                      >
                        桌面端
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="mobile" id="edit-device-mobile" />
                      <Label
                        htmlFor="edit-device-mobile"
                        className="font-normal"
                      >
                        移动端
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label>
                    语言 <span className="text-red-500">*</span>
                  </Label>
                  <RadioGroup
                    value={form.performance_config.locale}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        performance_config: {
                          ...f.performance_config,
                          locale: v,
                        },
                      }))
                    }
                    className="flex gap-4 pt-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="zh-CN" id="edit-locale-zh" />
                      <Label htmlFor="edit-locale-zh" className="font-normal">
                        中文
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="en-US" id="edit-locale-en" />
                      <Label htmlFor="edit-locale-en" className="font-normal">
                        英文
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2 col-span-2 min-w-0">
                  <Label>
                    类别 <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                    {[
                      { id: 'accessibility', label: '无障碍功能' },
                      { id: 'best-practices', label: '最佳实践' },
                      { id: 'performance', label: '性能' },
                      { id: 'seo', label: 'SEO' },
                    ].map((cat) => (
                      <div key={cat.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-${cat.id}`}
                          checked={form.performance_config.categories.includes(
                            cat.id,
                          )}
                          onCheckedChange={(checked) => {
                            const newCats = checked
                              ? [
                                  ...form.performance_config.categories,
                                  cat.id,
                                ]
                              : form.performance_config.categories.filter(
                                  (c) => c !== cat.id,
                                );
                            setForm((f) => ({
                              ...f,
                              performance_config: {
                                ...f.performance_config,
                                categories: newCats,
                              },
                            }));
                          }}
                        />
                        <Label
                          htmlFor={`edit-${cat.id}`}
                          className="font-normal"
                        >
                          {cat.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                调度配置
              </h4>
              <div className="space-y-2">
                <Label>
                  Cron表达式 <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={form.cron}
                    readOnly
                    onClick={() => {
                      setTempCronValue(form.cron);
                      setCronDialogOpen(true);
                    }}
                    placeholder="点击配置 Cron 表达式"
                    className="cursor-pointer"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTempCronValue(form.cron);
                      setCronDialogOpen(true);
                    }}
                  >
                    配置
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEdit} disabled={submitLoading}>
              {submitLoading ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
