/**
 * 组织/项目模板-模板管理列表（模板的增删改、设置默认）
 * 参考原项目：表格优化、刷新、描述 Textarea、设为默认
 */
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, Star, RefreshCw } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
  getOrganizeTemplateList,
  getOrganizeTemplateInfo,
  getOrgFieldList,
  createOrganizeTemplate,
  updateOrganizeTemplate,
  deleteOrganizeTemplate,
  getProjectTemplateList,
  getProjectTemplateInfo,
  getProjectFieldList,
  createProjectTemplate,
  updateProjectTemplate,
  deleteProjectTemplate,
} from '@/services/setting/template';
import type { OrganizeTemplateItem, ActionTemplateManage, SceneType, CustomField } from '@/types/setting/template';

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

interface TemplateManagementListProps {
  organizationId?: string;
  scopeId?: string;
  scope?: TemplateScope;
  scene: SceneType;
  onBack: () => void;
}

export function TemplateManagementList({ organizationId, scopeId, scope = 'organization', scene, onBack }: TemplateManagementListProps) {
  const effectiveScopeId = scopeId ?? organizationId ?? '';
  const [list, setList] = useState<OrganizeTemplateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OrganizeTemplateItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formRemark, setFormRemark] = useState('');
  /** 编辑时：自定义字段配置（字段 id、是否纳入模板、是否必填、默认值） */
  const [formCustomFields, setFormCustomFields] = useState<{ fieldId: string; name: string; type?: string; included: boolean; required: boolean; defaultValue: string }[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OrganizeTemplateItem | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    if (!effectiveScopeId) return;
    setLoading(true);
    try {
      const data = scope === 'project'
        ? await getProjectTemplateList(effectiveScopeId, scene)
        : await getOrganizeTemplateList(effectiveScopeId, scene);
      setList(Array.isArray(data) ? data : []);
    } catch {
      toast.error('加载模板列表失败');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveScopeId, scope, scene]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const filteredList = keyword.trim()
    ? list.filter((i) => (i.name || '').toLowerCase().includes(keyword.trim().toLowerCase()))
    : list;

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormName('');
    setFormRemark('');
    setFormCustomFields([]);
    setModalOpen(true);
    loadFieldsOnly();
  };

  const loadDetailAndFields = useCallback(async (templateId: string) => {
    setDetailLoading(true);
    try {
      const getInfo = scope === 'project' ? getProjectTemplateInfo : getOrganizeTemplateInfo;
      const getFields = scope === 'project' ? getProjectFieldList : getOrgFieldList;
      const [detail, fieldList] = await Promise.all([
        getInfo(templateId),
        getFields(effectiveScopeId, scene),
      ]);
      const customFields = (detail?.customFields || []) as CustomField[];
      const merged = (fieldList || []).map((f: { id: string; name?: string; type?: string }) => {
        const cf = customFields.find((c) => c.fieldId === f.id);
        return {
          fieldId: f.id,
          name: f.name || f.id,
          type: f.type,
          included: !!cf,
          required: !!cf?.required,
          defaultValue: cf?.defaultValue != null ? String(cf.defaultValue) : '',
        };
      });
      setFormCustomFields(merged);
    } catch {
      toast.error('加载模板详情失败');
      setFormCustomFields([]);
    } finally {
      setDetailLoading(false);
    }
  }, [effectiveScopeId, scope, scene]);

  const loadFieldsOnly = useCallback(async () => {
    setDetailLoading(true);
    try {
      const getFields = scope === 'project' ? getProjectFieldList : getOrgFieldList;
      const fieldList = await getFields(effectiveScopeId, scene);
      const merged = (fieldList || []).map((f: { id: string; name?: string; type?: string }) => ({
        fieldId: f.id,
        name: f.name || f.id,
        type: f.type,
        included: false,
        required: false,
        defaultValue: '',
      }));
      setFormCustomFields(merged);
    } catch {
      toast.error('加载字段列表失败');
      setFormCustomFields([]);
    } finally {
      setDetailLoading(false);
    }
  }, [effectiveScopeId, scope, scene]);

  const handleOpenEdit = (row: OrganizeTemplateItem) => {
    if (row.internal) return;
    setEditingItem(row);
    setFormName(row.name || '');
    setFormRemark(row.remark || '');
    setFormCustomFields([]);
    setModalOpen(true);
    loadDetailAndFields(row.id);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error('请输入模板名称');
      return;
    }
    const customFields: CustomField[] = formCustomFields
      .filter((f) => f.included)
      .map((f) => ({
        fieldId: f.fieldId,
        required: f.required,
        defaultValue: f.defaultValue || '',
      }));
    setSubmitting(true);
    try {
      const payload: ActionTemplateManage = {
        name: formName.trim(),
        remark: formRemark.trim(),
        scopeId: effectiveScopeId,
        uploadImgFileIds: [],
        customFields,
      };
      if (editingItem?.id) {
        payload.id = editingItem.id;
        if (scope === 'project') {
          await updateProjectTemplate(payload);
        } else {
          await updateOrganizeTemplate(payload);
        }
        toast.success('更新成功');
      } else {
        payload.scene = scene;
        if (scope === 'project') {
          await createProjectTemplate(payload);
        } else {
          await createOrganizeTemplate(payload);
        }
        toast.success('创建成功');
      }
      setModalOpen(false);
      loadList();
    } catch {
      toast.error(editingItem ? '更新失败' : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const setFieldIncluded = (fieldId: string, included: boolean) => {
    setFormCustomFields((prev) => prev.map((f) => (f.fieldId === fieldId ? { ...f, included } : f)));
  };
  const setFieldRequired = (fieldId: string, required: boolean) => {
    setFormCustomFields((prev) => prev.map((f) => (f.fieldId === fieldId ? { ...f, required } : f)));
  };
  const setFieldDefaultValue = (fieldId: string, defaultValue: string) => {
    setFormCustomFields((prev) => prev.map((f) => (f.fieldId === fieldId ? { ...f, defaultValue } : f)));
  };

  const handleDelete = async (row: OrganizeTemplateItem) => {
    if (row.internal) return;
    try {
      if (scope === 'project') {
        await deleteProjectTemplate(row.id);
      } else {
        await deleteOrganizeTemplate(row.id);
      }
      toast.success('删除成功');
      setDeleteTarget(null);
      loadList();
    } catch {
      toast.error('删除失败');
    }
  };

  /** 设为默认模板（通过更新接口传 enableDefault: true，后端通常会将同场景其他模板置为非默认） */
  const handleSetDefault = async (row: OrganizeTemplateItem) => {
    if (row.internal || row.enableDefault) return;
    setSettingDefaultId(row.id);
    try {
      const getInfo = scope === 'project' ? getProjectTemplateInfo : getOrganizeTemplateInfo;
      const getFields = scope === 'project' ? getProjectFieldList : getOrgFieldList;
      const [detail, fieldList] = await Promise.all([
        getInfo(row.id),
        getFields(effectiveScopeId, scene),
      ]);
      const customFieldsFromDetail = (detail?.customFields || []) as CustomField[];
      const fieldListArr = fieldList || [];
      const customFields: CustomField[] = fieldListArr.map((f: { id: string; name?: string }) => {
        const cf = customFieldsFromDetail.find((c: CustomField) => c.fieldId === f.id);
        return {
          fieldId: f.id,
          required: !!cf?.required,
          defaultValue: cf?.defaultValue != null ? cf.defaultValue : '',
        };
      });
      const payload: ActionTemplateManage = {
        id: row.id,
        name: row.name || '',
        remark: row.remark || '',
        scopeId: effectiveScopeId,
        customFields,
        uploadImgFileIds: [],
        enableDefault: true,
      };
      if (scope === 'project') {
        await updateProjectTemplate(payload);
      } else {
        await updateOrganizeTemplate(payload);
      }
      toast.success('已设为默认模板');
      loadList();
    } catch {
      toast.error('设置默认失败');
    } finally {
      setSettingDefaultId(null);
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
          <CardTitle className="text-lg">{sceneLabel} - 模板管理</CardTitle>
          <CardDescription>管理该场景下的模板列表</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button onClick={handleOpenAdd} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" /> 创建模板
              </Button>
              <Button variant="outline" size="icon" onClick={loadList} disabled={loading} aria-label="刷新">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <Input
              placeholder="搜索模板名称"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-[#f7f8fa] sticky top-0 z-10 border-b border-gray-200 shadow-sm">
              <TableRow className="hover:bg-transparent border-none h-11">
                <TableHead scope="col" className="font-medium text-gray-500">模板名称</TableHead>
                <TableHead scope="col" className="font-medium text-gray-500">描述</TableHead>
                <TableHead scope="col" className="w-20 font-medium text-gray-500">默认</TableHead>
                <TableHead scope="col" className="w-[140px] font-medium text-gray-500">更新时间</TableHead>
                <TableHead scope="col" className="w-[180px] text-right font-medium text-gray-500">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                    加载中...
                  </TableCell>
                </TableRow>
              ) : filteredList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    暂无模板
                  </TableCell>
                </TableRow>
              ) : (
                filteredList.map((row) => (
                  <TableRow key={row.id} className="group transition-colors [&_td]:transition-colors [&_td]:group-hover:bg-[#f2f3f5] border-b border-gray-100 h-11">
                    <TableCell className="font-medium">
                      {row.name}
                      {row.internal && (
                        <span className="ml-2 text-xs text-muted-foreground">(内置)</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground" title={row.remark}>{row.remark || '-'}</TableCell>
                    <TableCell>{row.enableDefault ? <Star className="h-4 w-4 fill-amber-500 text-amber-500" /> : '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatTime(row.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      {row.internal ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          {!row.enableDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              onClick={() => handleSetDefault(row)}
                              disabled={!!settingDefaultId}
                              title="设为默认"
                            >
                              {settingDefaultId === row.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleOpenEdit(row)} title="编辑">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(row)} title="删除">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editingItem ? '编辑模板' : '创建模板'}</DialogTitle>
            <p className="text-sm text-muted-foreground">{editingItem ? '修改模板名称、描述及纳入字段' : '新建模板并选择要纳入的自定义字段'}</p>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
            <div className="space-y-2">
              <Label>模板名称 <span className="text-red-500">*</span></Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="请输入" maxLength={255} />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                value={formRemark}
                onChange={(e) => setFormRemark(e.target.value)}
                placeholder="选填"
                rows={3}
                maxLength={500}
                className="resize-y"
              />
              <p className="text-xs text-muted-foreground">{formRemark.length}/500</p>
            </div>
            {formCustomFields.length > 0 && (
              <div className="space-y-2">
                <Label>自定义字段（勾选纳入模板的字段）</Label>
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">纳入</TableHead>
                        <TableHead>字段名</TableHead>
                        <TableHead className="w-[80px]">必填</TableHead>
                        <TableHead className="w-[180px]">默认值</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formCustomFields.map((f) => (
                        <TableRow key={f.fieldId}>
                          <TableCell>
                            <Checkbox
                              checked={f.included}
                              onCheckedChange={(v) => setFieldIncluded(f.fieldId, v === true)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{f.name}</TableCell>
                          <TableCell>
                            <Checkbox
                              checked={f.required}
                              disabled={!f.included}
                              onCheckedChange={(v) => setFieldRequired(f.fieldId, v === true)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={f.defaultValue}
                              onChange={(e) => setFieldDefaultValue(f.fieldId, e.target.value)}
                              placeholder="选填"
                              className="h-8"
                              disabled={!f.included}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            {detailLoading && <p className="text-sm text-muted-foreground">加载字段列表中...</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>取消</Button>
            <Button onClick={handleSubmit} disabled={submitting || detailLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
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
              确定要删除模板「{deleteTarget?.name}」吗？删除后不可恢复。
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
