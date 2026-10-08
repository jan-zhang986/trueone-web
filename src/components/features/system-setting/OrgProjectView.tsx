/**
 * 系统设置-组织-项目（迁移自 AegisOne）
 * 组织级别下的项目管理：列表、创建/编辑/删除/启用/禁用/恢复项目
 * 参考原项目：表格优化、字段补齐、功能补齐
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, RotateCcw, RefreshCw, Users } from 'lucide-react';
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
  DialogDescription,
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
import { Textarea } from '@/components/ui/textarea';
import { UnifiedPagination } from '@/components/ui/unified-pagination';
import { orgProjectService } from '@/services/setting/org-project';
import { getProjectManagementUrl } from '@/routes';
import type { OrgProjectTableItem, CreateOrUpdateSystemProjectParams } from '@/types/setting/organization-project';

const PAGE_SIZE = 10;

function formatTime(ts?: number) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('zh-CN');
}

export function OrgProjectView() {
  const navigate = useNavigate();
  const organizationId = typeof localStorage !== 'undefined' ? localStorage.getItem('currentOrgId') ?? '' : '';
  const [keyword, setKeyword] = useState('');
  const [list, setList] = useState<OrgProjectTableItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<OrgProjectTableItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<OrgProjectTableItem | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<OrgProjectTableItem | null>(null);

  const loadList = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const res = await orgProjectService.getProjectList({
        organizationId,
        current: page,
        pageSize,
        keyword: keyword || undefined,
      });
      setList(res.list ?? []);
      setTotal(res.total ?? 0);
    } catch (e) {
      toast.error('加载项目列表失败');
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [organizationId, page, pageSize, keyword]);

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
    setModalOpen(true);
  };

  const openEdit = (item: OrgProjectTableItem) => {
    setEditItem(item);
    setFormName(item.name ?? '');
    setFormDesc(item.description ?? '');
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!organizationId) return;
    const name = formName.trim();
    if (!name) {
      toast.error('请输入项目名称');
      return;
    }
    setFormSubmitting(true);
    try {
      if (editItem?.id) {
        await orgProjectService.updateProject({
          id: editItem.id,
          organizationId,
          name,
          description: formDesc,
        });
        toast.success('更新成功');
      } else {
        await orgProjectService.addProject({
          organizationId,
          name,
          description: formDesc,
        });
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
    if (!deleteConfirm?.id) return;
    const id = deleteConfirm.id;
    setDeleteConfirm(null);
    try {
      await orgProjectService.deleteProject(id);
      toast.success('已删除');
      loadList();
    } catch (e) {
      toast.error('删除失败');
    }
  };

  const handleRevoke = async () => {
    if (!revokeConfirm?.id) return;
    const id = revokeConfirm.id;
    setRevokeConfirm(null);
    try {
      await orgProjectService.revokeProject(id);
      toast.success('已恢复');
      loadList();
    } catch (e) {
      toast.error('恢复失败');
    }
  };

  const handleToggle = async (item: OrgProjectTableItem, enabled: boolean) => {
    try {
      if (enabled) {
        await orgProjectService.enableProject(item.id!);
        toast.success('已启用');
      } else {
        await orgProjectService.disableProject(item.id!);
        toast.success('已禁用');
      }
      loadList();
    } catch (e) {
      toast.error('操作失败');
    }
  };

  /** 跳转到项目管理-成员权限（选中该项目） */
  const goToProjectMembers = (projectId: string) => {
    localStorage.setItem('currentProjectId', projectId);
    navigate(getProjectManagementUrl('project-permission'));
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="搜索项目名称"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" /> 搜索
            </Button>
            <Button variant="outline" onClick={() => loadList()} disabled={loading} aria-label="刷新列表">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" /> 创建项目
          </Button>
        </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-[#f7f8fa] sticky top-0 z-10 border-b border-gray-200 shadow-sm">
                <TableRow className="hover:bg-transparent border-none h-11">
                  <TableHead scope="col" className="w-20 font-medium text-gray-500">序号</TableHead>
                  <TableHead scope="col" className="min-w-[140px] font-medium text-gray-500">项目名称</TableHead>
                  <TableHead scope="col" className="w-24 font-medium text-gray-500">成员数</TableHead>
                  <TableHead scope="col" className="w-24 font-medium text-gray-500">状态</TableHead>
                  <TableHead scope="col" className="min-w-[120px] font-medium text-gray-500">描述</TableHead>
                  <TableHead scope="col" className="w-24 font-medium text-gray-500">创建人</TableHead>
                  <TableHead scope="col" className="w-40 font-medium text-gray-500">创建时间</TableHead>
                  <TableHead scope="col" className="w-40 font-medium text-gray-500">更新时间</TableHead>
                  <TableHead scope="col" className="w-48 text-right font-medium text-gray-500">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      暂无项目
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((row, index) => (
                    <TableRow key={row.id || `project-${index}`} className="group transition-colors [&_td]:transition-colors [&_td]:group-hover:bg-[#f2f3f5] border-b border-gray-100 h-11">
                      <TableCell className="text-muted-foreground">{row.num ?? '-'}</TableCell>
                      <TableCell className="font-medium">
                        {row.deleted ? (
                          <span className="text-muted-foreground line-through">{row.name ?? '-'}</span>
                        ) : (
                          <span>{row.name ?? '-'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.deleted ? (
                          <span className="text-muted-foreground">{row.memberCount ?? 0}</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => goToProjectMembers(row.id)}
                            className="inline-flex items-center gap-1 text-primary hover:underline font-medium cursor-pointer"
                            title="管理成员"
                          >
                            <Users className="w-3.5 h-3.5" />
                            {row.memberCount ?? 0}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.deleted ? (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">已删除</span>
                        ) : (
                          <Switch
                            checked={row.enable ?? false}
                            onCheckedChange={(v) => handleToggle(row, v)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground" title={row.description}>{row.description ?? '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{row.createUser ?? '-'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatTime(row.createdAt)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatTime(row.updatedAt)}</TableCell>
                      <TableCell className="text-right pr-4 space-x-1">
                        {row.deleted ? (
                          <Button variant="ghost" size="sm" onClick={() => setRevokeConfirm(row)} className="h-8 rounded-lg text-emerald-600 hover:bg-emerald-50 font-bold text-[11px]">
                            <RotateCcw className="h-3.5 w-3.5 mr-1" /> 恢复
                          </Button>
                        ) : (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(row)} className="h-8 rounded-lg text-blue-600 hover:bg-blue-50 font-bold text-[11px]">
                              <Pencil className="h-3.5 w-3.5 mr-1" /> 编辑
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(row)} className="h-8 rounded-lg text-red-600 hover:bg-red-50 font-bold text-[11px]">
                              <Trash2 className="h-3.5 w-3.5 mr-1" /> 删除
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {total > 0 && (
            <UnifiedPagination
              currentPage={page}
              total={total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              unitLabel="条记录"
              hideWhenEmpty={false}
            />
          )}
        </div>

      {/* 创建/编辑项目 */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editItem ? '编辑项目' : '创建项目'}</DialogTitle>
            <DialogDescription>
              {editItem ? '修改项目名称与描述' : '在当前组织下新建项目'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>项目名称 <span className="text-red-500">*</span></Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="请输入项目名称"
                maxLength={255}
              />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="选填，建议简要说明项目用途"
                rows={3}
                maxLength={500}
                className="resize-y"
              />
              <p className="text-xs text-muted-foreground">{formDesc.length}/500</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={formSubmitting}>
              {formSubmitting ? '提交中...' : (editItem ? '保存' : '创建')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除项目「{deleteConfirm?.name}」吗？删除后该项目将无法使用。
              {deleteConfirm?.remainDayCount != null && deleteConfirm.remainDayCount > 0 && (
                <span className="block mt-2 text-amber-600">删除后可在 {deleteConfirm.remainDayCount} 天内恢复。</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 恢复确认 */}
      <AlertDialog open={!!revokeConfirm} onOpenChange={() => setRevokeConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认恢复</AlertDialogTitle>
            <AlertDialogDescription>
              确定要恢复项目「{revokeConfirm?.name}」吗？恢复后可正常使用。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke}>恢复</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
