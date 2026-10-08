/**
 * 系统设置-组织-服务集成（迁移自 AegisOne）
 * 服务集成列表、创建/编辑/测试/重置服务集成
 */
import { useState, useEffect, useCallback } from 'react';
import { Search, Settings, RotateCcw, TestTube } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { serviceIntegrationService } from '@/services/setting/service-integration';
import type { ServiceItem, AddOrUpdateServiceParams } from '@/types/setting/service-integration';

export function OrgServiceIntegrationView() {
  const organizationId = typeof localStorage !== 'undefined' ? localStorage.getItem('currentOrgId') ?? '' : '';
  const [keyword, setKeyword] = useState('');
  const [list, setList] = useState<ServiceItem[]>([]);
  const [filteredList, setFilteredList] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<ServiceItem | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, any>>({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [resetConfirm, setResetConfirm] = useState<ServiceItem | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const res = await serviceIntegrationService.getServiceList(organizationId);
      setList(res);
      setFilteredList(res);
    } catch (e) {
      toast.error('加载服务集成列表失败');
      setList([]);
      setFilteredList([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (keyword) {
      const kw = keyword.toLowerCase();
      setFilteredList(list.filter((item) => item.title?.toLowerCase().includes(kw)));
    } else {
      setFilteredList(list);
    }
  }, [keyword, list]);

  const handleSearch = () => {
    // 搜索逻辑已在 useEffect 中处理
  };

  const openConfig = async (item: ServiceItem) => {
    setActiveItem(item);
    if (item.config && item.configuration) {
      setConfigForm(item.configuration);
    } else {
      // 获取配置脚本
      try {
        const script = await serviceIntegrationService.getConfigScript(item.pluginId);
        const defaultConfig: Record<string, any> = {};
        // 根据脚本初始化配置表单
        if (script?.data?.formItems) {
          script.data.formItems.forEach((field: any) => {
            defaultConfig[field.field] = field.defaultValue ?? '';
          });
        }
        setConfigForm(defaultConfig);
      } catch {
        setConfigForm({});
      }
    }
    setConfigModalOpen(true);
  };

  const handleSave = async () => {
    if (!activeItem) return;
    setFormSubmitting(true);
    try {
      const data: AddOrUpdateServiceParams = {
        id: activeItem.id,
        pluginId: activeItem.pluginId,
        organizationId,
        configuration: configForm,
        enable: activeItem.enable ?? true,
      };
      if (activeItem.config && activeItem.id) {
        await serviceIntegrationService.updateService(data);
        toast.success('更新成功');
      } else {
        await serviceIntegrationService.addService(data);
        toast.success('创建成功');
      }
      setConfigModalOpen(false);
      setActiveItem(null);
      loadList();
    } catch (e) {
      toast.error(activeItem.config ? '更新失败' : '创建失败');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleTest = async (item: ServiceItem) => {
    if (!item.config || !item.id) {
      toast.error('请先配置服务集成');
      return;
    }
    setTesting(item.id);
    try {
      await serviceIntegrationService.getValidate(item.id);
      toast.success('连接测试成功');
    } catch (e) {
      toast.error('连接测试失败');
    } finally {
      setTesting(null);
    }
  };

  const handleReset = async () => {
    if (!resetConfirm?.id) return;
    const id = resetConfirm.id;
    setResetConfirm(null);
    try {
      await serviceIntegrationService.resetService(id);
      toast.success('已重置');
      loadList();
    } catch (e) {
      toast.error('重置失败');
    }
  };

  const handleToggle = async (item: ServiceItem, enabled: boolean) => {
    if (!item.config || !item.id) {
      toast.error('请先配置服务集成');
      return;
    }
    try {
      const data: AddOrUpdateServiceParams = {
        id: item.id,
        pluginId: item.pluginId,
        organizationId,
        enable: enabled,
        configuration: item.configuration,
      };
      await serviceIntegrationService.updateService(data);
      toast.success(enabled ? '已启用' : '已禁用');
      loadList();
    } catch (e) {
      toast.error('操作失败');
    }
  };

  const gatewayAddress = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:${window.location.port}` : '';

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="搜索服务名称"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10 w-72"
            />
          </div>
          <Button variant="outline" onClick={handleSearch}>
            <Search className="h-4 w-4 mr-2" /> 搜索
          </Button>
        </div>
        <div>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">暂无服务集成</div>
          ) : (
            <div className="grid gap-4">
              {filteredList.map((item) => (
                <div key={item.id || item.pluginId} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {item.logo && (
                    <img
                      src={`${gatewayAddress}${item.logo}`}
                      alt={item.title}
                      className="w-10 h-10 rounded"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{item.title}</span>
                      {item.config ? (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">已配置</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">未配置</span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(item)}
                    disabled={!item.config || testing === (item.id || item.pluginId)}
                  >
                    <TestTube className="h-3 w-3 mr-1" />
                    {testing === (item.id || item.pluginId) ? '测试中...' : '测试连接'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openConfig(item)}>
                    <Settings className="h-3 w-3 mr-1" />
                    {item.config ? '编辑' : '添加'}
                  </Button>
                  {item.config && (
                    <Button variant="outline" size="sm" onClick={() => setResetConfirm(item)}>
                      <RotateCcw className="h-3 w-3 mr-1" />
                      重置
                    </Button>
                  )}
                  <Switch
                    checked={item.enable ?? false}
                    onCheckedChange={(v) => handleToggle(item, v)}
                    disabled={!item.config}
                  />
                </div>
              </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 配置对话框 */}
      <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{activeItem?.title} - {activeItem?.config ? '编辑配置' : '添加配置'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {Object.keys(configForm).length === 0 ? (
              <div className="text-sm text-muted-foreground">暂无配置项</div>
            ) : (
              Object.entries(configForm).map(([key, value]) => (
                <div key={key}>
                  <label className="text-sm font-medium">{key}</label>
                  <Input
                    value={String(value ?? '')}
                    onChange={(e) => setConfigForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="mt-1"
                    placeholder={`请输入${key}`}
                  />
                </div>
              ))
            )}
            <p className="text-xs text-muted-foreground">
              配置项根据插件定义动态生成，请根据实际需求填写。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigModalOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={formSubmitting}>
              {formSubmitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重置确认 */}
      <AlertDialog open={!!resetConfirm} onOpenChange={() => setResetConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认重置</AlertDialogTitle>
            <AlertDialogDescription>
              确定要重置服务集成「{resetConfirm?.title}」吗？重置后将清除所有配置信息。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>重置</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
