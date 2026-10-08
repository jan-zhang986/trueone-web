/**
 * 系统设置-资源池（迁移自 AegisOne）
 * 资源池列表、创建/编辑/删除/启用/禁用资源池
 */
import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2, Power, PowerOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { resourcePoolService } from '@/services/setting/resource-pool';
import type { ResourcePoolItem, AddResourcePoolParams } from '@/types/setting/resource-pool';

const PAGE_SIZE = 10;

function formatTime(ts?: number) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('zh-CN');
}

export function SystemResourcePoolView() {
  const [keyword, setKeyword] = useState('');
  const [list, setList] = useState<ResourcePoolItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ResourcePoolItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState<'Node' | 'Kubernetes'>('Node');
  const [formEnable, setFormEnable] = useState(true);
  const [formApiTest, setFormApiTest] = useState(true);
  const [formUiTest, setFormUiTest] = useState(false);
  const [formServerUrl, setFormServerUrl] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<ResourcePoolItem | null>(null);
  const [toggleConfirm, setToggleConfirm] = useState<{ item: ResourcePoolItem; enable: boolean } | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await resourcePoolService.getPoolList({
        current: page,
        pageSize: PAGE_SIZE,
        keyword: keyword || undefined,
      });
      setList(res.list ?? []);
      setTotal(res.total ?? 0);
    } catch (e) {
      toast.error('加载资源池列表失败');
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, keyword]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleSearch = () => {
    setPage(1);
    loadList();
  };

  const openCreate = () => {
    setEditItem(null);
    setFormName('');
    setFormDesc('');
    setFormType('Node');
    setFormEnable(true);
    setFormApiTest(true);
    setFormUiTest(false);
    setFormServerUrl('');
    setModalOpen(true);
  };

  const openEdit = (item: ResourcePoolItem) => {
    setEditItem(item);
    setFormName(item.name);
    setFormDesc(item.description ?? '');
    setFormType(item.type);
    setFormEnable(item.enable);
    setFormApiTest(item.apiTest ?? true);
    setFormUiTest(item.uiTest ?? false);
    setFormServerUrl(item.serverUrl ?? '');
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const name = formName.trim();
    if (!name) {
      toast.error('请输入资源池名称');
      return;
    }
    setFormSubmitting(true);
    try {
      const data: AddResourcePoolParams = {
        name,
        description: formDesc,
        type: formType,
        enable: formEnable,
        apiTest: formApiTest,
        uiTest: formUiTest,
        serverUrl: formServerUrl || undefined,
        testResourceDTO: {},
      };
      if (editItem?.id) {
        await resourcePoolService.updatePool({ ...data, id: editItem.id });
        toast.success('更新成功');
      } else {
        await resourcePoolService.addPool(data);
        toast.success('创建成功');
      }
      setModalOpen(false);
      loadList();
    } catch (e) {
      toast.error(editItem ? '更新失败' : '创建失败');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    if (list.length === 1) {
      toast.error('至少需要保留一个资源池');
      setDeleteConfirm(null);
      return;
    }
    const item = deleteConfirm;
    setDeleteConfirm(null);
    try {
      await resourcePoolService.deletePool(item.id);
      toast.success('已删除');
      loadList();
    } catch (e) {
      toast.error('删除失败');
    }
  };

  const handleToggle = async () => {
    if (!toggleConfirm) return;
    const { item, enable } = toggleConfirm;
    setToggleConfirm(null);
    try {
      await resourcePoolService.togglePoolStatus(item.id);
      toast.success(enable ? '已启用' : '已禁用');
      loadList();
    } catch (e) {
      toast.error('操作失败');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="搜索资源池名称"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" /> 搜索
            </Button>
          </div>
          <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" /> 创建资源池
          </Button>
        </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <Table>
          <TableHeader className="bg-[#f7f8fa] sticky top-0 z-10 border-b border-gray-200 shadow-sm">
            <TableRow className="hover:bg-transparent border-none h-11">
              <TableHead className="font-medium text-gray-500">名称</TableHead>
              <TableHead className="w-24 font-medium text-gray-500">类型</TableHead>
              <TableHead className="w-24 font-medium text-gray-500">状态</TableHead>
              <TableHead className="w-32 font-medium text-gray-500">最大并发数</TableHead>
              <TableHead className="font-medium text-gray-500">描述</TableHead>
              <TableHead className="w-40 font-medium text-gray-500">创建时间</TableHead>
              <TableHead className="w-48 text-right font-medium text-gray-500">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody key={`pool-tbody-${list.length}-${list[0]?.id ?? ''}`}>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">加载中...</TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">暂无资源池</TableCell>
              </TableRow>
            ) : (
              list.map((row, index) => (
                <TableRow key={row.id || `pool-${index}`} className="group transition-colors [&_td]:transition-colors [&_td]:group-hover:bg-[#f2f3f5] border-b border-gray-100 h-11">
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.type}</TableCell>
                  <TableCell>
                    <Switch checked={row.enable} onCheckedChange={(v) => setToggleConfirm({ item: row, enable: v })} />
                  </TableCell>
                  <TableCell>{row.maxConcurrentNumber ?? '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={row.description}>{row.description ?? '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{formatTime(row.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
                      <Pencil className="h-3 w-3 mr-1" /> 编辑
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setDeleteConfirm(row)}>
                      <Trash2 className="h-3 w-3 mr-1" /> 删除
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
            </TableBody>
          </Table>
          </div>
          {total > PAGE_SIZE && (
            <div className="flex justify-between items-center px-6 py-4 border-t bg-muted/30">
              <div className="text-sm text-muted-foreground">
                共 <span className="font-medium text-foreground">{total}</span> 条记录
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
                <Button variant="outline" size="sm" disabled={page * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>下一页</Button>
              </div>
            </div>
          )}
        </div>

      {/* 创建/编辑资源池 */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? '编辑资源池' : '创建资源池'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>资源池名称 *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="请输入资源池名称" maxLength={255} />
            </div>
            <div>
              <Label>资源池类型 *</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as 'Node' | 'Kubernetes')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Node">Node</SelectItem>
                  <SelectItem value="Kubernetes">Kubernetes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>资源池地址</Label>
              <Input value={formServerUrl} onChange={(e) => setFormServerUrl(e.target.value)} placeholder="选填" />
            </div>
            <div>
              <Label>描述</Label>
              <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="选填" />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <Switch checked={formEnable} onCheckedChange={setFormEnable} />
                <span className="text-sm">启用</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={formApiTest} onCheckedChange={(checked) => setFormApiTest(checked === true)} />
                <span className="text-sm">支持 API 测试</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={formUiTest} onCheckedChange={(checked) => setFormUiTest(checked === true)} />
                <span className="text-sm">支持 UI 测试</span>
              </label>
            </div>
            <p className="text-xs text-muted-foreground">详细配置（Node 节点列表、Kubernetes 配置等）可在编辑时完善。</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={formSubmitting}>{formSubmitting ? '提交中...' : (editItem ? '保存' : '创建')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除资源池「{deleteConfirm?.name}」吗？删除后该资源池将无法使用。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 启用/禁用确认 */}
      <AlertDialog open={!!toggleConfirm} onOpenChange={() => setToggleConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{toggleConfirm?.enable ? '确认启用' : '确认禁用'}</AlertDialogTitle>
            <AlertDialogDescription>
              {toggleConfirm?.enable
                ? `确定要启用资源池「${toggleConfirm?.item.name}」吗？`
                : `确定要禁用资源池「${toggleConfirm?.item.name}」吗？禁用后该资源池将无法使用。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggle}>确定</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
