/**
 * 系统设置 - 菜单管理
 * 提供全局侧边栏菜单的可视化配置：支持原生功能、导航目录、内嵌网页 (Iframe)、外部链接的管理与权限绑定
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  FolderTree,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Layers,
  Globe,
  Sliders,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
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
import { menuService, SysMenuItem } from '@/services/setting/menu';
import { getDynamicIcon, AVAILABLE_ICON_NAMES } from '@/utils/dynamicIcon';
import { triggerMenuRefresh } from '@/utils/menuEvents';
import { cn } from '@/utils/cn';

interface FlattenedMenuItem extends SysMenuItem {
  level: number;
  hasChildren: boolean;
}

export function SystemMenuView() {
  const [menuTree, setMenuTree] = useState<SysMenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Record<number, boolean>>({});

  // 弹窗状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<Partial<SysMenuItem>>({
    parentId: 0,
    menuKey: '',
    title: '',
    path: '',
    icon: 'Globe',
    permission: '',
    menuType: 'MENU',
    sort: 10,
    isHidden: 0,
    status: 'ENABLE',
  });
  const [submitting, setSubmitting] = useState(false);

  // 删除确认弹窗
  const [deleteTarget, setDeleteTarget] = useState<SysMenuItem | null>(null);

  // 加载完整菜单树
  const fetchMenuTree = useCallback(async () => {
    setLoading(true);
    try {
      const data = await menuService.getMenuTree();
      setMenuTree(Array.isArray(data) ? data : []);
      // 默认展开所有一级菜单
      const initialExpanded: Record<number, boolean> = {};
      (data || []).forEach((item) => {
        initialExpanded[item.id] = true;
      });
      setExpandedKeys(initialExpanded);
    } catch (err: any) {
      toast.error('加载菜单树失败: ' + (err.message || '网络异常'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenuTree();
  }, [fetchMenuTree]);

  // 切换展开/折叠
  const toggleExpand = (id: number) => {
    setExpandedKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 扁平化菜单树以供表格行展示
  const flatItems = useMemo(() => {
    const rows: FlattenedMenuItem[] = [];
    const traverse = (items: SysMenuItem[], level: number) => {
      for (const item of items) {
        const hasChildren = Boolean(item.children && item.children.length > 0);
        rows.push({
          ...item,
          level,
          hasChildren,
        });
        if (hasChildren && expandedKeys[item.id]) {
          traverse(item.children!, level + 1);
        }
      }
    };
    traverse(menuTree, 0);
    return rows;
  }, [menuTree, expandedKeys]);

  // 供上级菜单选择的扁平列表
  const parentOptions = useMemo(() => {
    const list: { id: number; title: string; level: number }[] = [{ id: 0, title: '根目录 (顶级节点)', level: 0 }];
    const traverse = (items: SysMenuItem[], level: number) => {
      for (const item of items) {
        list.push({ id: item.id, title: item.title, level });
        if (item.children && item.children.length > 0) {
          traverse(item.children, level + 1);
        }
      }
    };
    traverse(menuTree, 1);
    return list;
  }, [menuTree]);

  // 打开新建弹窗
  const handleOpenCreate = (parentId = 0) => {
    setDialogMode('create');
    setFormData({
      parentId,
      menuKey: '',
      title: '',
      path: '',
      icon: 'Globe',
      permission: '',
      menuType: 'MENU',
      sort: (menuTree.length + 1) * 5,
      isHidden: 0,
      status: 'ENABLE',
    });
    setDialogOpen(true);
  };

  // 打开编辑弹窗
  const handleOpenEdit = (item: SysMenuItem) => {
    setDialogMode('edit');
    setFormData({
      id: item.id,
      parentId: item.parentId,
      menuKey: item.menuKey,
      title: item.title,
      path: item.path,
      icon: item.icon || 'Globe',
      permission: item.permission || '',
      menuType: item.menuType,
      sort: item.sort,
      isHidden: item.isHidden,
      status: item.status,
    });
    setDialogOpen(true);
  };

  // 提交保存
  const handleSubmit = async () => {
    if (!formData.title?.trim()) {
      toast.error('请输入菜单名称');
      return;
    }
    if (!formData.menuKey?.trim()) {
      toast.error('请输入菜单唯一标识');
      return;
    }

    setSubmitting(true);
    try {
      if (dialogMode === 'create') {
        await menuService.addMenu(formData);
        toast.success(`菜单「${formData.title}」创建成功`);
      } else {
        await menuService.updateMenu(formData);
        toast.success(`菜单「${formData.title}」更新成功`);
      }
      setDialogOpen(false);
      await fetchMenuTree();
      triggerMenuRefresh();
    } catch (err: any) {
      toast.error(err.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 执行删除
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await menuService.deleteMenu(deleteTarget.id);
      toast.success(`菜单「${deleteTarget.title}」已删除`);
      setDeleteTarget(null);
      await fetchMenuTree();
      triggerMenuRefresh();
    } catch (err: any) {
      toast.error(err.message || '删除失败');
    }
  };

  // 快捷切换状态
  const handleToggleStatus = async (item: SysMenuItem) => {
    const nextStatus = item.status === 'ENABLE' ? 'DISABLE' : 'ENABLE';
    try {
      await menuService.updateMenu({
        ...item,
        status: nextStatus,
      });
      toast.success(`已${nextStatus === 'ENABLE' ? '启用' : '停用'}「${item.title}」`);
      await fetchMenuTree();
      triggerMenuRefresh();
    } catch (err: any) {
      toast.error(err.message || '状态切换失败');
    }
  };

  return (
    <div className="space-y-6">
      {/* 顶部操作区 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h4 className="text-base font-medium text-gray-900">动态菜单管理</h4>
          <p className="text-xs text-gray-500 mt-1">
            可视化配置系统侧栏导航。支持添加原生功能页面、导航分类目录、以及内嵌外部看板（Iframe / 外链）。
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMenuTree}
            disabled={loading}
            className="h-9 px-3 gap-1.5"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            刷新
          </Button>
          <Button
            size="sm"
            onClick={() => handleOpenCreate(0)}
            className="h-9 px-3.5 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <Plus className="w-4 h-4" />
            新建顶级菜单
          </Button>
        </div>
      </div>

      {/* 菜单树表格 */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50/80">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[280px]">菜单名称</TableHead>
              <TableHead className="w-[140px]">唯一标识 (Key)</TableHead>
              <TableHead className="w-[120px]">类型</TableHead>
              <TableHead>路由 / 链接地址</TableHead>
              <TableHead className="w-[160px]">关联权限标识</TableHead>
              <TableHead className="w-[70px] text-center">排序</TableHead>
              <TableHead className="w-[90px] text-center">状态</TableHead>
              <TableHead className="w-[170px] text-right pr-4">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flatItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-gray-500 text-sm">
                  {loading ? '正在加载菜单列表...' : '暂无菜单数据，请点击右上角新建'}
                </TableCell>
              </TableRow>
            ) : (
              flatItems.map((item) => (
                <TableRow key={item.id} className="hover:bg-blue-50/30 transition-colors">
                  {/* 菜单名称（层级缩进 + 图标） */}
                  <TableCell>
                    <div
                      className="flex items-center gap-2"
                      style={{ paddingLeft: `${item.level * 22}px` }}
                    >
                      {item.hasChildren ? (
                        <button
                          type="button"
                          onClick={() => toggleExpand(item.id)}
                          className="p-1 -ml-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
                        >
                          {expandedKeys[item.id] ? (
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                      ) : (
                        <span className="w-6 inline-block" />
                      )}

                      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 shrink-0">
                        {getDynamicIcon(item.icon, "w-4 h-4")}
                      </div>

                      <span className="font-medium text-gray-900 text-sm truncate">
                        {item.title}
                      </span>

                      {item.isHidden === 1 && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                          <EyeOff className="w-2.5 h-2.5" /> 隐藏
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* 唯一标识 */}
                  <TableCell>
                    <code className="text-xs font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                      {item.menuKey}
                    </code>
                  </TableCell>

                  {/* 菜单类型 */}
                  <TableCell>
                    {item.menuType === 'MENU' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        原生页面
                      </span>
                    )}
                    {item.menuType === 'DIRECTORY' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                        分类目录
                      </span>
                    )}
                    {item.menuType === 'IFRAME' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 gap-1">
                        内嵌外链
                      </span>
                    )}
                    {item.menuType === 'LINK' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 gap-1">
                        外部新开
                      </span>
                    )}
                  </TableCell>

                  {/* 路由 / 链接地址 */}
                  <TableCell>
                    <span className="text-xs text-gray-600 font-mono truncate max-w-[200px] block" title={item.path}>
                      {item.path || '-'}
                    </span>
                  </TableCell>

                  {/* 权限标识 */}
                  <TableCell>
                    {item.permission ? (
                      <span className="text-xs font-mono text-indigo-700 bg-indigo-50/80 px-1.5 py-0.5 rounded border border-indigo-100">
                        {item.permission}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">公开 (无需权限)</span>
                    )}
                  </TableCell>

                  {/* 排序 */}
                  <TableCell className="text-center font-mono text-xs text-gray-500">
                    {item.sort}
                  </TableCell>

                  {/* 状态 */}
                  <TableCell className="text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item)}
                      className="cursor-pointer"
                      title="点击切换启用状态"
                    >
                      {item.status === 'ENABLE' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium hover:opacity-80">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 启用
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-rose-500 font-medium hover:opacity-80">
                          <XCircle className="w-3.5 h-3.5" /> 停用
                        </span>
                      )}
                    </button>
                  </TableCell>

                  {/* 操作 */}
                  <TableCell className="text-right pr-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenCreate(item.id)}
                        className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="在此节点下添加子菜单"
                      >
                        <Plus className="w-3.5 h-3.5 mr-0.5" /> 子菜单
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(item)}
                        className="h-7 w-7 p-0 text-gray-500 hover:text-gray-900"
                        title="编辑菜单"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(item)}
                        className="h-7 w-7 p-0 text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                        title="删除菜单"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 新增 / 编辑 菜单弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">
              {dialogMode === 'create' ? '新建系统菜单' : '编辑系统菜单'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            {/* 上级菜单 */}
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">上级目录/菜单</Label>
              <Select
                value={String(formData.parentId ?? 0)}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, parentId: Number(val) }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="选择上级菜单" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {parentOptions.map((opt) => (
                    <SelectItem key={opt.id} value={String(opt.id)}>
                      <span style={{ paddingLeft: `${opt.level * 12}px` }}>
                        {opt.level > 0 ? `└─ ${opt.title}` : opt.title}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 菜单类型 */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">菜单类型</Label>
              <Select
                value={formData.menuType || 'MENU'}
                onValueChange={(val: any) => setFormData((prev) => ({ ...prev, menuType: val }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MENU">原生页面 (平台自带组件)</SelectItem>
                  <SelectItem value="DIRECTORY">分类目录 (不可直接点击)</SelectItem>
                  <SelectItem value="IFRAME">内嵌外链 (平台内部 Iframe 嵌入)</SelectItem>
                  <SelectItem value="LINK">外部链接 (新窗口打开)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 菜单名称 */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">
                菜单名称 <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="例如: 性能测试 / 监控大盘"
                value={formData.title || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                className="h-9"
              />
            </div>

            {/* 唯一标识 (Key) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">
                唯一标识 (Key) <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="例如: load-test 或 grafana-board"
                value={formData.menuKey || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, menuKey: e.target.value }))}
                className="h-9 font-mono text-xs"
              />
            </div>

            {/* 图标选择 */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">图标 (Lucide)</Label>
              <Select
                value={formData.icon || 'Globe'}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, icon: val }))}
              >
                <SelectTrigger className="h-9">
                  <div className="flex items-center gap-2">
                    {getDynamicIcon(formData.icon, "w-4 h-4 text-blue-600")}
                    <span>{formData.icon || 'Globe'}</span>
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {AVAILABLE_ICON_NAMES.map((name) => (
                    <SelectItem key={name} value={name}>
                      <div className="flex items-center gap-2">
                        {getDynamicIcon(name, "w-4 h-4")}
                        <span>{name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 路由路径 / URL */}
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">
                {formData.menuType === 'IFRAME' || formData.menuType === 'LINK'
                  ? '链接 URL (以 http:// 或 https:// 开头)'
                  : '路由地址 (以 / 开头)'}
              </Label>
              <Input
                placeholder={
                  formData.menuType === 'IFRAME' || formData.menuType === 'LINK'
                    ? 'https://grafana.internal.com'
                    : '/workspace/load-test'
                }
                value={formData.path || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, path: e.target.value }))}
                className="h-9 font-mono text-xs"
              />
            </div>

            {/* 权限标识符 */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">关联权限标识符 (选填)</Label>
              <Input
                placeholder="例如: LOAD_TEST:READ"
                value={formData.permission || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, permission: e.target.value }))}
                className="h-9 font-mono text-xs"
              />
              <p className="text-[11px] text-gray-400">留空则对所有登录用户可见</p>
            </div>

            {/* 排序号 */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">排序权重 (从小到大)</Label>
              <Input
                type="number"
                value={formData.sort ?? 0}
                onChange={(e) => setFormData((prev) => ({ ...prev, sort: Number(e.target.value) }))}
                className="h-9"
              />
            </div>

            {/* 显隐与启用 */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">侧栏可见性</Label>
              <Select
                value={String(formData.isHidden ?? 0)}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, isHidden: Number(val) }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">正常显示</SelectItem>
                  <SelectItem value="1">隐藏 (不在侧栏展示)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">启用状态</Label>
              <Select
                value={formData.status || 'ENABLE'}
                onValueChange={(val: any) => setFormData((prev) => ({ ...prev, status: val }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENABLE">启用</SelectItem>
                  <SelectItem value="DISABLE">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {submitting ? '保存中...' : '确定保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">确认删除菜单？</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              确定要删除菜单「{deleteTarget?.title}」吗？如果该菜单包含子菜单，必须先删除或移走子菜单。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-rose-600 hover:bg-rose-700 text-white">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
