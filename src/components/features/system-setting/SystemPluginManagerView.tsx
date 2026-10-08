/**
 * 系统设置-插件管理（迁移自 AegisOne）
 * 插件列表、上传/编辑/删除插件
 */
import { useState, useEffect, useCallback } from 'react';
import { Upload, Search, Pencil, Trash2 } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { pluginService } from '@/services/setting/plugin';
import { organizationProjectService } from '@/services/setting/organization-project';
import type { PluginItem, UpdatePluginParams } from '@/types/setting/plugin';

function formatTime(ts?: string | number) {
  if (!ts) return '-';
  return new Date(typeof ts === 'string' ? ts : ts).toLocaleString('zh-CN');
}

export function SystemPluginManagerView() {
  const [keyword, setKeyword] = useState('');
  const [scene, setScene] = useState('');
  const [list, setList] = useState<PluginItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<PluginItem | null>(null);
  const [orgOptions, setOrgOptions] = useState<{ id: string; name: string }[]>([]);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formGlobal, setFormGlobal] = useState(true);
  const [formOrgIds, setFormOrgIds] = useState<string[]>([]);
  const [formEnable, setFormEnable] = useState(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<PluginItem | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pluginService.getPluginList();
      let filtered = res;
      if (keyword) {
        filtered = filtered.filter((p) => p.name?.toLowerCase().includes(keyword.toLowerCase()));
      }
      if (scene) {
        filtered = filtered.filter((p) => p.scenario === scene);
      }
      setList(filtered);
    } catch (e) {
      toast.error('加载插件列表失败');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [keyword, scene]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const loadOrgOptions = useCallback(async () => {
    try {
      const opts = await organizationProjectService.getOrgOptions();
      setOrgOptions(opts);
    } catch {
      setOrgOptions([]);
    }
  }, []);

  useEffect(() => {
    if (uploadModalOpen || editModalOpen) {
      loadOrgOptions();
    }
  }, [uploadModalOpen, editModalOpen, loadOrgOptions]);

  const handleSearch = () => {
    loadList();
  };

  const openUpload = () => {
    setFormName('');
    setFormDesc('');
    setFormGlobal(true);
    setFormOrgIds([]);
    setFormEnable(true);
    setUploadFile(null);
    setUploadModalOpen(true);
  };

  const openEdit = (item: PluginItem) => {
    setEditItem(item);
    setFormName(item.name ?? '');
    setFormDesc(item.description ?? '');
    setFormGlobal(item.global ?? true);
    setFormOrgIds(item.organizations?.map((o) => o.id) ?? []);
    setFormEnable(item.enable ?? true);
    setEditModalOpen(true);
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error('请选择插件文件');
      return;
    }
    const name = formName.trim() || uploadFile.name.replace(/\.jar$/, '');
    if (!name) {
      toast.error('请输入插件名称');
      return;
    }
    setFormSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('name', name);
      formData.append('description', formDesc);
      formData.append('global', String(formGlobal));
      if (!formGlobal && formOrgIds.length > 0) {
        formData.append('organizationIds', JSON.stringify(formOrgIds));
      }
      formData.append('enable', String(formEnable));
      await pluginService.uploadPlugin(formData);
      toast.success('上传成功');
      setUploadModalOpen(false);
      loadList();
    } catch (e) {
      toast.error('上传失败');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editItem) return;
    const name = formName.trim();
    if (!name) {
      toast.error('请输入插件名称');
      return;
    }
    setFormSubmitting(true);
    try {
      const data: UpdatePluginParams = {
        id: editItem.id,
        name,
        description: formDesc,
        global: formGlobal,
        enable: formEnable,
        organizationIds: !formGlobal && formOrgIds.length > 0 ? formOrgIds : undefined,
      };
      await pluginService.updatePlugin(data);
      toast.success('更新成功');
      setEditModalOpen(false);
      setEditItem(null);
      loadList();
    } catch (e) {
      toast.error('更新失败');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const item = deleteConfirm;
    setDeleteConfirm(null);
    try {
      await pluginService.deletePlugin(item.id);
      toast.success('已删除');
      loadList();
    } catch (e) {
      toast.error('删除失败');
    }
  };

  const sceneOptions = [
    { value: 'all', label: '全部' },
    { value: 'API_TEST', label: 'API 测试' },
    { value: 'UI_TEST', label: 'UI 测试' },
    { value: 'LOAD_TEST', label: '性能测试' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Select value={scene || 'all'} onValueChange={(v) => setScene(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="应用场景" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                {sceneOptions.filter(opt => opt.value !== 'all').map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="搜索插件名称"
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
          <Button onClick={openUpload} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Upload className="h-4 w-4 mr-2" /> 上传插件
          </Button>
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <Table>
          <TableHeader className="bg-[#f7f8fa] sticky top-0 z-10 border-b border-gray-200 shadow-sm">
            <TableRow className="hover:bg-transparent border-none h-11">
              <TableHead className="font-medium text-gray-500">插件名称</TableHead>
              <TableHead className="font-medium text-gray-500">应用场景</TableHead>
              <TableHead className="font-medium text-gray-500">应用组织</TableHead>
              <TableHead className="w-24 font-medium text-gray-500">状态</TableHead>
              <TableHead className="font-medium text-gray-500">描述</TableHead>
              <TableHead className="w-40 font-medium text-gray-500">创建时间</TableHead>
              <TableHead className="w-40 text-right font-medium text-gray-500">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody key={`plugin-tbody-${list.length}-${list[0]?.id ?? ''}`}>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">加载中...</TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">暂无插件</TableCell>
              </TableRow>
            ) : (
              list.map((row, index) => (
                <TableRow key={row.id || `plugin-${index}`} className="group transition-colors [&_td]:transition-colors [&_td]:group-hover:bg-[#f2f3f5] border-b border-gray-100 h-11">
                  <TableCell className="font-medium">
                    {row.name}
                    {row.pluginForms && row.pluginForms.length > 0 && (
                      <span className="text-xs text-muted-foreground ml-1">({row.pluginForms.length})</span>
                    )}
                  </TableCell>
                  <TableCell>{row.scenario ?? '-'}</TableCell>
                  <TableCell>
                    {row.global ? (
                      <span className="text-xs px-2 py-0.5 bg-muted rounded">全部组织</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {row.organizations?.map((o) => (
                          <span key={o.id} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">{o.name}</span>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{row.enable ? '启用' : '禁用'}</TableCell>
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
          <div className="px-6 py-4 border-t bg-muted/30">
            <div className="text-sm text-muted-foreground">
              共 <span className="font-medium text-foreground">{list.length}</span> 个插件
            </div>
          </div>
        </div>

      {/* 上传插件 */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>上传插件</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>插件文件 *</Label>
              <Input
                type="file"
                accept=".jar"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setUploadFile(file);
                    if (!formName) setFormName(file.name.replace(/\.jar$/, ''));
                  }
                }}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">支持 .jar 格式</p>
            </div>
            <div>
              <Label>插件名称 *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="默认使用文件名" maxLength={255} />
            </div>
            <div>
              <Label>应用组织 *</Label>
              <RadioGroup value={formGlobal ? 'all' : 'selected'} onValueChange={(v) => setFormGlobal(v === 'all')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <label htmlFor="all" className="text-sm cursor-pointer">全部组织</label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="selected" id="selected" />
                  <label htmlFor="selected" className="text-sm cursor-pointer">指定组织</label>
                </div>
              </RadioGroup>
              {!formGlobal && (
                <div className="max-h-32 overflow-y-auto rounded-md border p-2 space-y-1 mt-2">
                  {orgOptions.map((o) => (
                    <label key={o.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formOrgIds.includes(o.id)}
                        onChange={(e) =>
                          setFormOrgIds((prev) =>
                            e.target.checked ? [...prev, o.id] : prev.filter((id) => id !== o.id)
                          )
                        }
                        className="rounded"
                      />
                      <span className="text-sm">{o.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>描述</Label>
              <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="选填" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formEnable} onCheckedChange={setFormEnable} />
              <span className="text-sm">启用插件</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadModalOpen(false)}>取消</Button>
            <Button onClick={handleUpload} disabled={formSubmitting || !uploadFile}>{formSubmitting ? '上传中...' : '上传'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑插件 */}
      <Dialog open={editModalOpen} onOpenChange={(open) => { if (!open) setEditItem(null); setEditModalOpen(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑插件 - {editItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>插件名称 *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} maxLength={255} />
            </div>
            <div>
              <Label>应用组织 *</Label>
              <RadioGroup value={formGlobal ? 'all' : 'selected'} onValueChange={(v) => setFormGlobal(v === 'all')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="edit-all" />
                  <label htmlFor="edit-all" className="text-sm cursor-pointer">全部组织</label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="selected" id="edit-selected" />
                  <label htmlFor="edit-selected" className="text-sm cursor-pointer">指定组织</label>
                </div>
              </RadioGroup>
              {!formGlobal && (
                <div className="max-h-32 overflow-y-auto rounded-md border p-2 space-y-1 mt-2">
                  {orgOptions.map((o) => (
                    <label key={o.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formOrgIds.includes(o.id)}
                        onChange={(e) =>
                          setFormOrgIds((prev) =>
                            e.target.checked ? [...prev, o.id] : prev.filter((id) => id !== o.id)
                          )
                        }
                        className="rounded"
                      />
                      <span className="text-sm">{o.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>描述</Label>
              <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formEnable} onCheckedChange={setFormEnable} />
              <span className="text-sm">启用插件</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>取消</Button>
            <Button onClick={handleEdit} disabled={formSubmitting}>{formSubmitting ? '保存中...' : '保存'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除插件「{deleteConfirm?.name}」吗？删除后该插件将无法使用。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
