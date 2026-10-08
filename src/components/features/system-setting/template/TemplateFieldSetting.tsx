/**
 * 组织模板-字段设置（自定义字段列表与增删改）
 */
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
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
  getOrgFieldList,
  addOrUpdateOrgField,
  deleteOrgField,
  getProjectFieldList,
  addOrUpdateProjectField,
  deleteProjectField,
} from '@/services/setting/template';
import type { DefinedFieldItem, AddOrUpdateFieldParams, SceneType } from '@/types/setting/template';

const SCENE_LABELS: Record<string, string> = {
  FUNCTIONAL: '用例',
  BUG: '缺陷',
  API: 'API',
};

function formatTime(ts?: number) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('zh-CN');
}

export type TemplateScope = 'organization' | 'project';

interface TemplateFieldSettingProps {
  /** 组织 ID（scope 为 organization 时使用），与 scopeId 二选一，兼容旧用法 */
  organizationId?: string;
  /** 项目 ID（scope 为 project 时使用）或组织 ID，与 organizationId 二选一 */
  scopeId?: string;
  /** 范围：组织模板 | 项目模板，默认 organization */
  scope?: TemplateScope;
  scene: SceneType;
  onBack: () => void;
}

export function TemplateFieldSetting({ organizationId, scopeId, scope = 'organization', scene, onBack }: TemplateFieldSettingProps) {
  const effectiveScopeId = scopeId ?? organizationId ?? '';
  const [list, setList] = useState<DefinedFieldItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DefinedFieldItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formRemark, setFormRemark] = useState('');
  const [formType, setFormType] = useState('INPUT');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DefinedFieldItem | null>(null);

  const loadList = useCallback(async () => {
    if (!effectiveScopeId) return;
    setLoading(true);
    try {
      const data = scope === 'project'
        ? await getProjectFieldList(effectiveScopeId, scene)
        : await getOrgFieldList(effectiveScopeId, scene);
      setList(Array.isArray(data) ? data : []);
    } catch {
      toast.error('加载字段列表失败');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveScopeId, scope, scene]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const filteredList = keyword.trim()
    ? list.filter((i) => i.name?.toLowerCase().includes(keyword.trim().toLowerCase()))
    : list;

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormName('');
    setFormRemark('');
    setFormType('INPUT');
    setModalOpen(true);
  };

  const handleOpenEdit = (row: DefinedFieldItem) => {
    if (row.internal) return;
    setEditingItem(row);
    setFormName(row.name || '');
    setFormRemark(row.remark || '');
    setFormType((row.type as string) || 'INPUT');
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error('请输入字段名称');
      return;
    }
    setSubmitting(true);
    try {
      const payload: AddOrUpdateFieldParams = {
        name: formName.trim(),
        remark: formRemark.trim(),
        scene,
        type: formType,
        scopeId: effectiveScopeId,
        enableOptionKey: false,
      };
      if (editingItem?.id) payload.id = editingItem.id;
      if (scope === 'project') {
        await addOrUpdateProjectField(payload);
      } else {
        await addOrUpdateOrgField(payload);
      }
      toast.success(editingItem ? '更新成功' : '添加成功');
      setModalOpen(false);
      loadList();
    } catch {
      toast.error(editingItem ? '更新失败' : '添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row: DefinedFieldItem) => {
    if (row.internal) return;
    try {
      if (scope === 'project') {
        await deleteProjectField(row.id);
      } else {
        await deleteOrgField(row.id);
      }
      toast.success('删除成功');
      setDeleteTarget(null);
      loadList();
    } catch {
      toast.error('删除失败');
    }
  };

  const sceneLabel = SCENE_LABELS[scene] || scene;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center border-b border-gray-200 bg-white px-4 py-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-600">
          <ArrowLeft className="mr-1 h-4 w-4" /> 返回
        </Button>
      </div>
      <Card className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100 bg-gray-50/50">
          <CardTitle className="text-lg">{sceneLabel} - 字段设置</CardTitle>
          <CardDescription>管理该场景下的自定义字段</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between gap-4">
            <Button onClick={handleOpenAdd} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" /> 添加字段
            </Button>
            <Input
              placeholder="搜索字段名称"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>字段名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>备注</TableHead>
                <TableHead className="w-[100px]">更新时间</TableHead>
                <TableHead className="w-[120px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">加载中...</TableCell>
                </TableRow>
              ) : filteredList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">暂无字段</TableCell>
                </TableRow>
              ) : (
                filteredList.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.name}
                      {row.internal && (
                        <span className="ml-2 text-xs text-muted-foreground">(内置)</span>
                      )}
                    </TableCell>
                    <TableCell>{row.type || '-'}</TableCell>
                    <TableCell>{row.remark || '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatTime(row.updatedAt)}</TableCell>
                    <TableCell>
                      {!row.internal && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(row)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(row)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editingItem ? '编辑字段' : '添加字段'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>字段名称 *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="请输入" />
            </div>
            <div className="space-y-2">
              <Label>类型</Label>
              <Input value={formType} onChange={(e) => setFormType(e.target.value)} placeholder="如 INPUT" />
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Input value={formRemark} onChange={(e) => setFormRemark(e.target.value)} placeholder="选填" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {submitting ? '提交中...' : '确定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除字段「{deleteTarget?.name}」吗？删除后不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget)} className="bg-destructive text-destructive-foreground">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
