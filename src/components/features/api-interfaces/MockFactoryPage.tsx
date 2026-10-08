import { useState, useRef } from 'react';
import { Save, Server, Copy, Plus, Trash2, Settings, Edit, History, Search, RefreshCw, ChevronsUpDown, Check, ChevronLeft, ChevronRight, ChevronDown, Code2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { mockFactoryService, type MockRule, type HttpRuleFeatures, type DubboRuleFeatures, type MockRespStruct } from '@/services/mock-factory';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { generatePageNumbers } from '@/utils/pagination';
import { CodeEditorDialog } from '@/components/workflow/panels/shared/CodeEditorDialog';
import { useMockScenes, useMockRules, useMockRuleForm, useMockRuleHistory, truncateMiddle, DEFAULT_PYTHON_SCRIPT } from './mock-factory-page';

interface MockFactoryPageProps {
  onClose?: () => void;
}

export function MockFactoryPage({ onClose }: MockFactoryPageProps) {
  const [activeTab, setActiveTab] = useState('config');
  const [isDeleteRuleDialogOpen, setIsDeleteRuleDialogOpen] = useState(false);
  const [deleteRuleId, setDeleteRuleId] = useState<number | null>(null);
  const [deleteRuleName, setDeleteRuleName] = useState<string>('');
  const scenesListRef = useRef<HTMLDivElement>(null);
  
  // 左侧面板收起状态
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(() => {
    const saved = localStorage.getItem('mockFactoryLeftPanelCollapsed');
    return saved === 'true';
  });

  const toggleLeftPanel = () => {
    const newState = !isLeftPanelCollapsed;
    setIsLeftPanelCollapsed(newState);
    localStorage.setItem('mockFactoryLeftPanelCollapsed', String(newState));
  };

  // 使用 hooks 管理状态
  const scenes = useMockScenes();
  const rules = useMockRules(scenes.selectedSceneCode);
  const form = useMockRuleForm(scenes.selectedSceneCode, () => {
    rules.loadRules(rules.searchKeyword.trim() || undefined);
  });
  const history = useMockRuleHistory();

  // 当场景变化时，刷新规则列表
  const handleSceneChange = (sceneCode: string) => {
    scenes.setSelectedSceneCode(sceneCode);
    rules.setCurrentPage(1);
  };

  // 当编辑规则时，加载历史记录
  const handleEditRule = (rule: MockRule) => {
    form.handleEditRule(rule);
    setActiveTab('config');
    if (rule.id) {
      history.handleViewHistory(rule.id);
    }
  };

  const handleToggleStatus = (id: number, currentStatus: number) => {
    rules.handleToggleStatus(id, currentStatus, (updatedRule) => {
      if (form.selectedRule?.id === id) {
        form.setSelectedRule(updatedRule);
        form.setRuleData({
          ...form.ruleData,
          status: updatedRule.status,
        });
      }
    });
  };

  const handleDeleteRuleConfirm = async () => {
    if (!deleteRuleId) return;
    await rules.handleDeleteRule(deleteRuleId);
    setIsDeleteRuleDialogOpen(false);
    setDeleteRuleId(null);
    setDeleteRuleName('');
    if (form.selectedRule?.id === deleteRuleId) {
      form.setSelectedRule(null);
      form.setIsEditing(false);
    }
  };

  const currentRuleFeatures = form.ruleData.ruleFeatures || {};
  const isHttpType = form.ruleData.features?.ruleType === 'HTTP';
  const httpFeatures = (isHttpType ? currentRuleFeatures : {}) as HttpRuleFeatures;
  const dubboFeatures = (!isHttpType ? currentRuleFeatures : {}) as DubboRuleFeatures;

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 pt-3 pb-2.5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Mock 工厂</h2>
          <p className="text-xs text-gray-500 mt-0.5">快速创建 Mock 接口，模拟 API 响应数据</p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Panel - Scenes List */}
        {isLeftPanelCollapsed ? (
          <div className="w-12 bg-white border-r border-gray-200 flex flex-col items-center justify-center relative">
            {/* 展开按钮 - 简单的 > 符号 */}
            <button
              onClick={toggleLeftPanel}
              className="absolute top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
              title="展开场景列表"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="w-[344px] bg-white border-r border-gray-200 flex flex-col min-h-0 shadow-sm overflow-visible relative">
            {/* 收起按钮 - 简单的 < 符号 */}
            <button
              onClick={toggleLeftPanel}
              className="absolute left-full top-1/2 -translate-y-1/2 w-5 h-10 flex items-center justify-center bg-white border border-l-0 border-gray-200 rounded-r hover:bg-gray-50 transition-colors z-50 shadow-md text-gray-500 hover:text-gray-700"
              title="收起场景列表"
              style={{ marginLeft: '-1px' }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            
            <div className="p-4 border-b border-gray-200 space-y-3 bg-gray-50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Mock 场景</h3>
                <Button size="sm" onClick={scenes.handleCreateScene} className="h-8">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  新建场景
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索场景..."
                  className="text-sm pl-9 h-9 bg-white"
                  value={scenes.searchKeyword}
                  onChange={(e) => scenes.setSearchKeyword(e.target.value)}
                />
              </div>
            </div>

            <div ref={scenesListRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-visible">
            <div className="pl-3 py-3 pr-5 space-y-2 w-full box-border">
              {scenes.mockScenes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <Server className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-sm mb-3">暂无场景</p>
                  <Button size="sm" variant="outline" onClick={scenes.handleCreateScene}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    创建场景
                  </Button>
                </div>
              ) : (
                scenes.filteredScenes.map((scene) => {
                    const isSelected = scenes.selectedSceneCode === scene.sceneCode;
                    const ruleCount = rules.mockRules.length;
                    const isLoading = rules.loading;

                    return (
                      <div
                        key={scene.sceneCode}
                        onClick={() => handleSceneChange(scene.sceneCode)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all box-border w-[96%] ${isSelected
                          ? 'bg-blue-50 border-blue-500 shadow-md ring-2 ring-blue-200 ring-inset'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                          }`}
                      >
                        <div className="w-full overflow-hidden">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="text-sm font-semibold text-gray-900 truncate" title={scene.sceneName}>
                                {scene.sceneName}
                              </div>
                            </div>
                            {isLoading && (
                              <RefreshCw className="w-3 h-3 animate-spin text-gray-400 flex-shrink-0 mt-0.5" />
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate mb-2 overflow-hidden" title={scene.sceneCode}>
                            {scene.sceneCode}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
          </div>
        )}

        {/* Right Panel - Rule Details */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-white">
          {!scenes.selectedSceneCode ? (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="flex flex-col items-center gap-4 text-center px-6 max-w-md">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center shadow-lg">
                  <Server className="w-10 h-10 text-blue-500" />
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-900 mb-1">请选择一个场景</p>
                  <p className="text-sm text-gray-500">从左侧列表中选择场景查看和管理规则</p>
                </div>
                {scenes.mockScenes.length === 0 && (
                  <Button onClick={scenes.handleCreateScene} className="mt-2">
                    <Plus className="w-4 h-4 mr-1.5" />
                    创建第一个场景
                  </Button>
                )}
              </div>
            </div>
          ) : form.isEditing ? (
            <>
              <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {form.selectedRule?.serviceCode || form.ruleData.serviceCode || '新建规则'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {(form.selectedRule?.features?.ruleType || form.ruleData.features?.ruleType || 'HTTP') === 'HTTP'
                        ? 'HTTP 接口规则'
                        : 'DUBBO 服务规则'}
                    </p>
                  </div>
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="shrink-0">
                    <TabsList className="h-9 bg-gray-100 p-0.5 rounded-lg">
                      <TabsTrigger value="config" className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4">规则配置</TabsTrigger>
                      <TabsTrigger value="history" className="text-xs rounded-md px-4" disabled={!form.selectedRule?.id}>操作日志</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                <ScrollArea className="flex-1 min-h-0" style={{ marginBottom: activeTab === 'config' ? '60px' : '0' }}>
                  <div className="p-6 bg-gray-50/50">
                    {activeTab === 'config' && (
                      <div className="space-y-6 max-w-4xl">
                        {/* 基本信息 */}
                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                          <h4 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">基本信息</h4>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">场景 <span className="text-red-500">*</span></Label>
                                <div className="flex gap-2">
                                  <Popover open={form.ruleScenePopoverOpen} onOpenChange={form.setRuleScenePopoverOpen}>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={form.ruleScenePopoverOpen}
                                        className="flex-1 justify-between h-9 rounded-lg bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 text-sm px-3 text-left font-normal transition-colors"
                                      >
                                        <div className="flex flex-col min-w-0 flex-1 text-left gap-0.5">
                                          {form.ruleData.sceneCode
                                            ? (() => {
                                              const scene = scenes.mockScenes.find(s => s.sceneCode === form.ruleData.sceneCode);
                                              if (scene) {
                                                return (
                                                  <>
                                                    <span className="truncate text-sm font-medium text-gray-900 leading-tight" title={scene.sceneName}>
                                                      {scene.sceneName}
                                                    </span>
                                                    <span className="text-xs text-gray-400 truncate leading-tight" title={scene.sceneCode}>
                                                      {scene.sceneCode}
                                                    </span>
                                                  </>
                                                );
                                              }
                                              return <span className="truncate text-sm text-gray-900">{form.ruleData.sceneCode}</span>;
                                            })()
                                            : <span className="text-sm text-gray-500">请选择场景</span>}
                                        </div>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                      <Command shouldFilter={false}>
                                        <div className="relative">
                                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                          <CommandInput
                                            placeholder="搜索场景..."
                                            className="h-9 pl-9"
                                            value={form.ruleSceneSearchValue}
                                            onValueChange={form.setRuleSceneSearchValue}
                                          />
                                        </div>
                                        <CommandList className="max-h-[200px] overflow-y-auto">
                                          <CommandEmpty>未找到场景</CommandEmpty>
                                          <CommandGroup>
                                            {scenes.mockScenes
                                              .filter((scene) =>
                                                !form.ruleSceneSearchValue.trim() ||
                                                scene.sceneName.toLowerCase().includes(form.ruleSceneSearchValue.toLowerCase()) ||
                                                scene.sceneCode.toLowerCase().includes(form.ruleSceneSearchValue.toLowerCase())
                                              )
                                              .map((scene) => (
                                                <CommandItem
                                                  key={scene.sceneCode}
                                                  value={`${scene.sceneCode}-${scene.sceneName}`}
                                                  onSelect={() => {
                                                    form.setRuleData({ ...form.ruleData, sceneCode: scene.sceneCode });
                                                    form.setRuleScenePopoverOpen(false);
                                                    form.setRuleSceneSearchValue('');
                                                  }}
                                                  className="cursor-pointer"
                                                >
                                                  <Check
                                                    className={`mr-3 h-4 w-4 shrink-0 mt-0.5 ${form.ruleData.sceneCode === scene.sceneCode ? 'opacity-100' : 'opacity-0'
                                                      }`}
                                                  />
                                                  <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                                                    <span className="truncate text-sm font-medium text-gray-900 leading-tight" title={scene.sceneName}>
                                                      {scene.sceneName}
                                                    </span>
                                                    <span className="text-xs text-gray-400 truncate leading-tight" title={scene.sceneCode}>
                                                      {scene.sceneCode}
                                                    </span>
                                                  </div>
                                                </CommandItem>
                                              ))}
                                          </CommandGroup>
                                        </CommandList>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
                                  {form.ruleData.sceneCode && (
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-9 w-9 shrink-0 border border-gray-300 hover:bg-gray-50"
                                      onClick={async () => {
                                        try {
                                          await navigator.clipboard.writeText(form.ruleData.sceneCode || '');
                                          toast.success('已复制场景代码');
                                        } catch (error) {
                                          toast.error('复制失败');
                                        }
                                      }}
                                      title="复制场景代码"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">服务代码 <span className="text-red-500">*</span></Label>
                                <Input
                                  value={form.ruleData.serviceCode || ''}
                                  onChange={(e) => form.setRuleData({ ...form.ruleData, serviceCode: e.target.value })}
                                  placeholder="服务代码"
                                  className="rounded-lg border-gray-200"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">规则类型 <span className="text-red-500">*</span></Label>
                                <Select
                                  value={form.ruleData.features?.ruleType || 'HTTP'}
                                  onValueChange={(value: 'HTTP' | 'DUBBO') => {
                                    form.setRuleData({
                                      ...form.ruleData,
                                      features: {
                                        ...form.ruleData.features!,
                                        ruleType: value,
                                      },
                                      ruleFeatures: value === 'HTTP' ? {} : {},
                                    });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="HTTP">HTTP</SelectItem>
                                    <SelectItem value="DUBBO">DUBBO</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {isHttpType && (
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">URL</Label>
                                  <Input
                                    value={httpFeatures.url || ''}
                                    onChange={(e) =>
                                      form.setRuleData({
                                        ...form.ruleData,
                                        ruleFeatures: {
                                          ...httpFeatures,
                                          url: e.target.value,
                                        },
                                      })
                                    }
                                    placeholder="/api/example"
                                    className="font-mono rounded-lg border-gray-200"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 接口配置 */}
                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                          <h4 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">接口配置</h4>
                          {isHttpType ? (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">请求方法</Label>
                                    <Select
                                      value={(httpFeatures.method || 'get').toLowerCase()}
                                      onValueChange={(value) =>
                                        form.setRuleData({
                                          ...form.ruleData,
                                          ruleFeatures: {
                                            ...httpFeatures,
                                            method: value.toLowerCase(),
                                          },
                                        })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="get">GET</SelectItem>
                                        <SelectItem value="post">POST</SelectItem>
                                        <SelectItem value="put">PUT</SelectItem>
                                        <SelectItem value="delete">DELETE</SelectItem>
                                        <SelectItem value="patch">PATCH</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 mb-1.5 block">应用代码</Label>
                                    <Input
                                      value={httpFeatures.appCode || ''}
                                      onChange={(e) =>
                                        form.setRuleData({
                                          ...form.ruleData,
                                          ruleFeatures: {
                                            ...httpFeatures,
                                            appCode: e.target.value,
                                          },
                                        })
                                      }
                                      placeholder="应用代码"
                                      className="rounded-lg border-gray-200"
                                    />
                                  </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div>
                                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">应用名称</Label>
                                  <Input
                                    value={dubboFeatures.applicationName || ''}
                                    onChange={(e) =>
                                      form.setRuleData({
                                        ...form.ruleData,
                                        ruleFeatures: {
                                          ...dubboFeatures,
                                          applicationName: e.target.value,
                                        },
                                      })
                                    }
                                    placeholder="应用名称"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 mb-1.5 block">接口名称</Label>
                                    <Input
                                      value={dubboFeatures.interfaceName || ''}
                                      onChange={(e) =>
                                        form.setRuleData({
                                          ...form.ruleData,
                                          ruleFeatures: {
                                            ...dubboFeatures,
                                            interfaceName: e.target.value,
                                          },
                                        })
                                      }
                                      placeholder="接口名称"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 mb-1.5 block">方法名</Label>
                                    <Input
                                      value={dubboFeatures.methodName || ''}
                                      onChange={(e) =>
                                        form.setRuleData({
                                          ...form.ruleData,
                                          ruleFeatures: {
                                            ...dubboFeatures,
                                            methodName: e.target.value,
                                          },
                                        })
                                      }
                                      placeholder="方法名"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">参数类型（逗号分隔）</Label>
                                  <Input
                                    value={(dubboFeatures.paramTypes || []).join(',')}
                                    onChange={(e) =>
                                      form.setRuleData({
                                        ...form.ruleData,
                                        ruleFeatures: {
                                          ...dubboFeatures,
                                          paramTypes: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                                        },
                                      })
                                    }
                                    placeholder="String,Integer"
                                  />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 响应设置 */}
                        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                          <h4 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">响应设置</h4>
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">响应类型 <span className="text-red-500">*</span></Label>
                              <Select
                                value={form.ruleData.respStruct?.responseTypes || 'Object'}
                                onValueChange={(value: 'String' | 'Object' | 'List' | 'Int' | 'Boolean' | 'python_script') => {
                                  const newRespStruct: MockRespStruct = {
                                    ...form.ruleData.respStruct!,
                                    responseTypes: value,
                                  };
                                  // 如果切换到 python_script，初始化 content 为默认脚本模板
                                  if (value === 'python_script' && typeof newRespStruct.content !== 'string') {
                                    newRespStruct.content = DEFAULT_PYTHON_SCRIPT;
                                  }
                                  // 如果从 python_script 切换到其他类型，初始化 content 为空对象
                                  if (value !== 'python_script' && typeof newRespStruct.content === 'string') {
                                    newRespStruct.content = {};
                                  }
                                  form.setRuleData({
                                    ...form.ruleData,
                                    respStruct: newRespStruct,
                                  });
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="String">String</SelectItem>
                                  <SelectItem value="Object">Object</SelectItem>
                                  <SelectItem value="List">List</SelectItem>
                                  <SelectItem value="Int">Int</SelectItem>
                                  <SelectItem value="Boolean">Boolean</SelectItem>
                                  <SelectItem value="python_script">Python Script</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <Label className="text-sm font-medium text-gray-700">响应内容 <span className="text-red-500">*</span></Label>
                                {(form.ruleData.respStruct?.responseTypes as string) === 'python_script' ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={form.handleOpenScriptEditor}
                                  >
                                    <Code2 className="w-3 h-3 mr-1.5" />
                                    脚本编写器
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => {
                                      try {
                                        const formatted = form.formatResponseContent(form.ruleData.respStruct?.content);
                                        form.updateResponseContent(formatted);
                                      } catch {
                                        toast.error('格式化失败');
                                      }
                                    }}
                                  >
                                    格式化
                                  </Button>
                                )}
                              </div>
                              {form.ruleData.respStruct?.responseTypes === 'python_script' ? (
                                <>
                                  <p className="mb-3 text-xs text-gray-500">
                                    提示：后端执行入口统一为 <code className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded font-mono">mock_response</code>
                                  </p>
                                  <Textarea
                                    className="min-h-[320px] font-mono text-sm rounded-lg border-gray-200 bg-gray-50/50 focus:bg-white"
                                    value={
                                      typeof form.ruleData.respStruct?.content === 'string' && form.ruleData.respStruct.content
                                        ? form.ruleData.respStruct.content
                                        : DEFAULT_PYTHON_SCRIPT
                                    }
                                    onChange={(e) => form.updateResponseContent(e.target.value)}
                                    placeholder="输入 Python 脚本代码..."
                                    readOnly
                                  />
                                </>
                              ) : (
                                <Textarea
                                  className="min-h-[320px] font-mono text-sm rounded-lg border-gray-200 bg-gray-50/50 focus:bg-white"
                                  value={
                                    typeof form.ruleData.respStruct?.content === 'string'
                                      ? form.ruleData.respStruct.content
                                      : form.formatResponseContent(form.ruleData.respStruct?.content)
                                  }
                                  onChange={(e) => form.updateResponseContent(e.target.value)}
                                  placeholder="输入响应内容（JSON格式）..."
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'history' && form.selectedRule?.id && (
                      <div className="max-w-4xl">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-base font-semibold text-gray-900">操作日志</h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => history.handleViewFullHistory(form.selectedRule!.id!)}
                            className="text-xs h-8"
                          >
                            <History className="w-3.5 h-3.5 mr-1.5" />
                            查看全部
                          </Button>
                        </div>
                        {history.historyData.length === 0 ? (
                          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
                            <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm text-gray-500">暂无历史记录</p>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                            <div className="w-full">
                              <table className="w-full text-sm border-collapse" style={{ tableLayout: 'fixed' }}>
                                <thead>
                                  <tr className="border-b border-gray-200 bg-gray-50/80">
                                    <th className="h-11 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider" style={{ width: '150px' }}>操作时间</th>
                                    <th className="h-11 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider" style={{ width: 'calc((100% - 150px) / 2)' }}>请求体</th>
                                    <th className="h-11 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider" style={{ width: 'calc((100% - 150px) / 2)' }}>响应体</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {history.historyData
                                    .slice((history.historyPage - 1) * history.historyPageSize, history.historyPage * history.historyPageSize)
                                    .map((item, index) => {
                                      const actualIndex = (history.historyPage - 1) * history.historyPageSize + index;
                                      const reqJson = item.req || item.content?.req || {};
                                      const respJson = item.resp || item.content?.resp || {};
                                      const createdAt = item.createAt || item.createdAt || '';
                                      const reqStr = JSON.stringify(reqJson);
                                      const respStr = JSON.stringify(respJson);
                                      const isReqExpanded = history.expandedJson?.type === 'req' && history.expandedJson.index === actualIndex;
                                      const isRespExpanded = history.expandedJson?.type === 'resp' && history.expandedJson.index === actualIndex;

                                      return (
                                        <tr key={item.id || actualIndex} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/80 transition-colors">
                                          <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">
                                            {history.formatDateTime(createdAt)}
                                          </td>
                                          <td className="px-4 py-3">
                                            <Popover open={isReqExpanded} onOpenChange={(open) => {
                                              if (open) {
                                                history.setExpandedJson({ type: 'req', index: actualIndex });
                                              } else {
                                                history.setExpandedJson(null);
                                              }
                                            }}>
                                              <PopoverTrigger asChild>
                                                <button
                                                  className="text-left text-xs font-mono text-gray-600 hover:text-blue-600 cursor-pointer w-full truncate block rounded px-1 -mx-1 py-0.5 hover:bg-gray-100 transition-colors"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    history.setExpandedJson({ type: 'req', index: actualIndex });
                                                  }}
                                                  title={JSON.stringify(reqJson)}
                                                >
                                                  {history.truncateJson(reqJson, 150)}
                                                </button>
                                              </PopoverTrigger>
                                              <PopoverContent className="w-[600px] max-h-[500px] overflow-auto" align="start">
                                                <div className="text-xs font-mono">
                                                  <pre className="whitespace-pre-wrap break-words">
                                                    {JSON.stringify(reqJson, null, 2)}
                                                  </pre>
                                                </div>
                                              </PopoverContent>
                                            </Popover>
                                          </td>
                                          <td className="px-4 py-3">
                                            <Popover open={isRespExpanded} onOpenChange={(open) => {
                                              if (open) {
                                                history.setExpandedJson({ type: 'resp', index: actualIndex });
                                              } else {
                                                history.setExpandedJson(null);
                                              }
                                            }}>
                                              <PopoverTrigger asChild>
                                                <button
                                                  className="text-left text-xs font-mono text-gray-600 hover:text-blue-600 cursor-pointer w-full truncate block rounded px-1 -mx-1 py-0.5 hover:bg-gray-100 transition-colors"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    history.setExpandedJson({ type: 'resp', index: actualIndex });
                                                  }}
                                                  title={JSON.stringify(respJson)}
                                                >
                                                  {history.truncateJson(respJson, 150)}
                                                </button>
                                              </PopoverTrigger>
                                              <PopoverContent className="w-[600px] max-h-[500px] overflow-auto" align="start">
                                                <div className="text-xs font-mono">
                                                  <pre className="whitespace-pre-wrap break-words">
                                                    {JSON.stringify(respJson, null, 2)}
                                                  </pre>
                                                </div>
                                              </PopoverContent>
                                            </Popover>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                </tbody>
                              </table>
                            </div>
                            {/* 分页控件 */}
                            {history.historyData.length > history.historyPageSize && (() => {
                              const totalHistoryPages = Math.ceil(history.historyData.length / history.historyPageSize);
                              const historyPageNumbers = generatePageNumbers(history.historyPage, totalHistoryPages, 1);

                              return (
                                <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50/80">
                                  <div className="flex items-center gap-1">
                                    {/* 左箭头 */}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => history.setHistoryPage(Math.max(1, history.historyPage - 1))}
                                      disabled={history.historyPage === 1}
                                      className="h-8 w-8 p-0"
                                      title="上一页"
                                    >
                                      <ChevronLeft className="w-4 h-4" />
                                    </Button>

                                    {/* 页码 */}
                                    {historyPageNumbers.map((page, index) => {
                                      if (page === 'ellipsis') {
                                        return (
                                          <span
                                            key={`ellipsis-${index}`}
                                            className="flex h-8 w-8 items-center justify-center text-gray-400 text-sm"
                                          >
                                            ...
                                          </span>
                                        );
                                      }

                                      return (
                                        <Button
                                          key={page}
                                          variant={history.historyPage === page ? 'default' : 'outline'}
                                          size="sm"
                                          onClick={() => history.setHistoryPage(page)}
                                          className={`h-8 w-8 p-0 text-sm ${history.historyPage === page
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'hover:bg-gray-100'
                                            }`}
                                          title={`第 ${page} 页`}
                                        >
                                          {page}
                                        </Button>
                                      );
                                    })}

                                    {/* 右箭头 */}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => history.setHistoryPage(Math.min(totalHistoryPages, history.historyPage + 1))}
                                      disabled={history.historyPage >= totalHistoryPages}
                                      className="h-8 w-8 p-0"
                                      title="下一页"
                                    >
                                      <ChevronRight className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* 只在规则配置标签页显示取消和保存按钮 */}
                {activeTab === 'config' && (
                  <div className="flex-shrink-0 bg-gray-50/80 border-t border-gray-200 px-6 py-3.5 flex items-center justify-end gap-3">
                    <Button variant="outline" size="sm" onClick={() => {
                      form.setIsEditing(false);
                      form.setSelectedRule(null);
                    }}>
                      取消
                    </Button>
                    <Button size="sm" onClick={form.handleSaveRule} disabled={form.loading}>
                      <Save className="w-4 h-4 mr-1" />
                      保存配置
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : scenes.selectedSceneCode ? (
            // 显示规则表格
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="px-6 py-3 border-b border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {scenes.mockScenes.find(s => s.sceneCode === scenes.selectedSceneCode)?.sceneName || '规则列表'}
                      </h3>
                      {rules.loading && (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-gray-400" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {scenes.mockScenes.find(s => s.sceneCode === scenes.selectedSceneCode)?.sceneCode || ''}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => form.handleCreateRule()} className="ml-4 h-8">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    新建规则
                  </Button>
                </div>
              </div>

              <div
                className="flex-1 min-h-0 overflow-y-auto overflow-x-auto"
                style={{ minHeight: 'calc(100vh - 250px)', maxHeight: 'calc(100vh - 250px)' }}
              >
                {(() => {
                  const filteredRules = rules.mockRules.filter(rule => {
                    if (!rules.searchKeyword.trim()) return true;
                    const keyword = rules.searchKeyword.toLowerCase();
                    const isHttp = rule.features?.ruleType === 'HTTP';
                    const httpFeatures = isHttp ? (rule.ruleFeatures as HttpRuleFeatures) : null;
                    const dubboFeatures = !isHttp ? (rule.ruleFeatures as DubboRuleFeatures) : null;
                    return (
                      rule.serviceCode?.toLowerCase().includes(keyword) ||
                      (isHttp && httpFeatures?.url?.toLowerCase().includes(keyword)) ||
                      (!isHttp && (
                        dubboFeatures?.interfaceName?.toLowerCase().includes(keyword) ||
                        dubboFeatures?.methodName?.toLowerCase().includes(keyword)
                      ))
                    );
                  });
                  const isLoading = rules.loading;

                  if (isLoading) {
                    return (
                      <div className="flex items-center justify-center h-full min-h-[400px]">
                        <div className="text-center text-gray-400">
                          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                          <p className="text-sm">加载中...</p>
                        </div>
                      </div>
                    );
                  }

                  if (filteredRules.length === 0) {
                    return (
                      <div className="flex items-center justify-center h-full min-h-[400px]">
                        <div className="text-center text-gray-400">
                          <Server className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm mb-2">
                            {rules.searchKeyword.trim() ? '未找到匹配的规则' : '暂无规则'}
                          </p>
                          {!rules.searchKeyword.trim() && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => form.handleCreateRule()}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              创建规则
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="p-6">
                      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider" style={{ width: '220px' }}>类型 / 服务代码</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">路径/接口</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider" style={{ width: '120px' }}>返回值类型</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider" style={{ width: '80px' }}>状态</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider" style={{ width: '100px' }}>操作</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                              {filteredRules.map((rule) => {
                                const isHttp = rule.features?.ruleType === 'HTTP';
                                const httpFeatures = isHttp ? (rule.ruleFeatures as HttpRuleFeatures) : null;
                                const dubboFeatures = !isHttp ? (rule.ruleFeatures as DubboRuleFeatures) : null;
                                const isSelected = form.selectedRule?.id === rule.id;

                                const serviceCode = rule.serviceCode || '-';
                                const pathOrInterface = isHttp
                                  ? (httpFeatures?.method?.toUpperCase() || 'GET') + ' ' + (httpFeatures?.url || '-')
                                  : dubboFeatures
                                    ? `${dubboFeatures.interfaceName || '-'}#${dubboFeatures.methodName || '-'}`
                                    : '-';

                                return (
                                  <tr
                                    key={rule.id}
                                    className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : ''
                                      }`}
                                    onClick={() => handleEditRule(rule)}
                                  >
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Badge
                                          variant="outline"
                                          className={`shrink-0 text-xs font-medium ${rule.features?.ruleType === 'HTTP'
                                            ? 'text-blue-700 border-blue-400 bg-blue-50'
                                            : 'text-purple-700 border-purple-400 bg-purple-50'
                                            }`}
                                        >
                                          {rule.features?.ruleType || 'HTTP'}
                                        </Badge>
                                        <span className="font-medium text-gray-900 truncate" title={serviceCode}>
                                          {serviceCode}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <code className="text-xs font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded block truncate" title={pathOrInterface}>
                                        {pathOrInterface}
                                      </code>
                                    </td>
                                    <td className="px-4 py-3">
                                      {(() => {
                                        const responseType = rule.respStruct?.responseTypes || 'Object';
                                        const typeLabels: Record<string, string> = {
                                          'String': 'String',
                                          'Object': 'Object',
                                          'List': 'List',
                                          'Int': 'Int',
                                          'Boolean': 'Boolean',
                                          'python_script': 'Python',
                                        };
                                        const typeColors: Record<string, string> = {
                                          'String': 'text-green-700 border-green-400 bg-green-50',
                                          'Object': 'text-blue-700 border-blue-400 bg-blue-50',
                                          'List': 'text-purple-700 border-purple-400 bg-purple-50',
                                          'Int': 'text-orange-700 border-orange-400 bg-orange-50',
                                          'Boolean': 'text-pink-700 border-pink-400 bg-pink-50',
                                          'python_script': 'text-indigo-700 border-indigo-400 bg-indigo-50',
                                        };
                                        const label = typeLabels[responseType] || responseType;
                                        const colorClass = typeColors[responseType] || 'text-gray-700 border-gray-400 bg-gray-50';
                                        return (
                                          <Badge variant="outline" className={`text-xs font-medium ${colorClass}`}>
                                            {label}
                                          </Badge>
                                        );
                                      })()}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <div
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (rule.id) {
                                            handleToggleStatus(rule.id, rule.status || 0);
                                          }
                                        }}
                                        className="cursor-pointer inline-flex items-center"
                                        title={rule.status === 1 ? '已启用，点击停用' : '已停用，点击启用'}
                                      >
                                        <div
                                          className={`w-9 h-5 rounded-full transition-colors flex items-center ${rule.status === 1
                                            ? 'bg-green-500'
                                            : 'bg-gray-300'
                                            }`}
                                        >
                                          <div
                                            className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${rule.status === 1 ? 'translate-x-4' : 'translate-x-0.5'
                                              }`}
                                          />
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                      <div className="flex items-center justify-end gap-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-8 w-8 p-0 hover:bg-blue-100"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditRule(rule);
                                          }}
                                          title="编辑"
                                        >
                                          <Edit className="w-4 h-4 text-gray-600" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-8 w-8 p-0 hover:bg-red-50"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (rule.id) {
                                              const ruleDisplayName = isHttp
                                                ? httpFeatures?.url || ''
                                                : dubboFeatures
                                                  ? `${dubboFeatures.interfaceName || ''}#${dubboFeatures.methodName || ''}`
                                                  : '';
                                              setDeleteRuleId(rule.id);
                                              setDeleteRuleName(ruleDisplayName || rule.serviceCode || '该规则');
                                              setIsDeleteRuleDialogOpen(true);
                                            }
                                          }}
                                          title="删除"
                                        >
                                          <Trash2 className="w-4 h-4 text-red-600" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="flex flex-col items-center gap-4 text-center px-6">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                  <Server className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">请选择一个场景</p>
                  <p className="text-xs text-gray-500">从左侧列表中选择场景查看规则</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 场景管理对话框 */}
      <Dialog open={scenes.isSceneDialogOpen} onOpenChange={scenes.setIsSceneDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{scenes.editingScene ? '编辑场景' : '新建场景'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>场景名称 *</Label>
              <Input
                value={scenes.sceneName}
                onChange={(e) => scenes.setSceneName(e.target.value)}
                placeholder="请输入场景名称"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => scenes.setIsSceneDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={scenes.handleSaveScene}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 操作日志对话框 */}
      <Dialog open={history.isHistoryDialogOpen} onOpenChange={history.setIsHistoryDialogOpen}>
        <DialogContent
          className="!max-w-[98vw] w-[98vw] max-h-[90vh] flex flex-col p-6"
          style={{ maxWidth: '98vw', width: '98vw' }}
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>操作日志</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {history.historyData.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">暂无历史记录</div>
            ) : (
              <>
                <div className="border rounded-lg">
                  <div className="w-full">
                    <table className="w-full text-sm border-collapse" style={{ tableLayout: 'fixed' }}>
                      <thead className="border-b">
                        <tr>
                          <th className="h-10 px-3 text-left align-middle font-medium" style={{ width: '150px' }}>操作时间</th>
                          <th className="h-10 px-3 text-left align-middle font-medium" style={{ width: 'calc((100% - 150px) / 2)' }}>请求体</th>
                          <th className="h-10 px-3 text-left align-middle font-medium" style={{ width: 'calc((100% - 150px) / 2)' }}>响应体</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.historyData
                          .slice((history.historyPage - 1) * history.historyPageSize, history.historyPage * history.historyPageSize)
                          .map((item, index) => {
                            const actualIndex = (history.historyPage - 1) * history.historyPageSize + index;
                            const reqJson = item.req || item.content?.req || {};
                            const respJson = item.resp || item.content?.resp || {};
                            const createdAt = item.createAt || item.createdAt || '';
                            const reqStr = JSON.stringify(reqJson);
                            const respStr = JSON.stringify(respJson);
                            const isReqExpanded = history.expandedJson?.type === 'req' && history.expandedJson.index === actualIndex;
                            const isRespExpanded = history.expandedJson?.type === 'resp' && history.expandedJson.index === actualIndex;

                            return (
                              <tr key={item.id || actualIndex} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-mono text-xs whitespace-nowrap">
                                  {history.formatDateTime(createdAt)}
                                </td>
                                <td className="p-3">
                                  <Popover open={isReqExpanded} onOpenChange={(open) => {
                                    if (open) {
                                      history.setExpandedJson({ type: 'req', index: actualIndex });
                                    } else {
                                      history.setExpandedJson(null);
                                    }
                                  }}>
                                    <PopoverTrigger asChild>
                                      <button
                                        className="text-left text-xs font-mono text-gray-700 hover:text-blue-600 cursor-pointer w-full truncate block"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          history.setExpandedJson({ type: 'req', index: actualIndex });
                                        }}
                                        title={JSON.stringify(reqJson)}
                                      >
                                        {history.truncateJson(reqJson, 150)}
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[600px] max-h-[500px] overflow-auto" align="start">
                                      <div className="text-xs font-mono">
                                        <pre className="whitespace-pre-wrap break-words">
                                          {JSON.stringify(reqJson, null, 2)}
                                        </pre>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </td>
                                <td className="p-3">
                                  <Popover open={isRespExpanded} onOpenChange={(open) => {
                                    if (open) {
                                      history.setExpandedJson({ type: 'resp', index: actualIndex });
                                    } else {
                                      history.setExpandedJson(null);
                                    }
                                  }}>
                                    <PopoverTrigger asChild>
                                      <button
                                        className="text-left text-xs font-mono text-gray-700 hover:text-blue-600 cursor-pointer w-full truncate block"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          history.setExpandedJson({ type: 'resp', index: actualIndex });
                                        }}
                                        title={JSON.stringify(respJson)}
                                      >
                                        {history.truncateJson(respJson, 150)}
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[600px] max-h-[500px] overflow-auto" align="start">
                                      <div className="text-xs font-mono">
                                        <pre className="whitespace-pre-wrap break-words">
                                          {JSON.stringify(respJson, null, 2)}
                                        </pre>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* 分页控件 */}
                {history.historyData.length > 0 && (() => {
                  const totalHistoryPages = Math.ceil(history.historyData.length / history.historyPageSize);
                  const historyPageNumbers = generatePageNumbers(history.historyPage, totalHistoryPages, 1);

                  return (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <Button variant="outline" size="sm" onClick={() => {
                        history.setIsHistoryDialogOpen(false);
                        history.setHistoryPage(1);
                        history.setExpandedJson(null);
                      }}>
                        关闭
                      </Button>
                      {totalHistoryPages > 1 && (
                        <div className="flex items-center gap-1">
                          {/* 左箭头 */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => history.setHistoryPage(Math.max(1, history.historyPage - 1))}
                            disabled={history.historyPage === 1}
                            className="h-8 w-8 p-0"
                            title="上一页"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>

                          {/* 页码 */}
                          {historyPageNumbers.map((page, index) => {
                            if (page === 'ellipsis') {
                              return (
                                <span
                                  key={`ellipsis-${index}`}
                                  className="flex h-8 w-8 items-center justify-center text-gray-400 text-sm"
                                >
                                  ...
                                </span>
                              );
                            }

                            return (
                              <Button
                                key={page}
                                variant={history.historyPage === page ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => history.setHistoryPage(page)}
                                className={`h-8 w-8 p-0 text-sm ${history.historyPage === page
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'hover:bg-gray-100'
                                  }`}
                                title={`第 ${page} 页`}
                              >
                                {page}
                              </Button>
                            );
                          })}

                          {/* 右箭头 */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => history.setHistoryPage(Math.min(totalHistoryPages, history.historyPage + 1))}
                            disabled={history.historyPage >= totalHistoryPages}
                            className="h-8 w-8 p-0"
                            title="下一页"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除规则确认对话框 */}
      <Dialog open={isDeleteRuleDialogOpen} onOpenChange={setIsDeleteRuleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>删除确认</DialogTitle>
            <DialogDescription>
              确定要删除 "{deleteRuleName}" 吗？删除后无法恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteRuleDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteRuleId) return;
                await handleDeleteRuleConfirm();
                setIsDeleteRuleDialogOpen(false);
                setDeleteRuleId(null);
                setDeleteRuleName('');
              }}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 脚本编辑器弹窗 */}
      <CodeEditorDialog
        open={form.isCodeEditorOpen}
        onOpenChange={(open) => {
          if (!open) {
            form.handleSaveScriptCode();
          }
        }}
        value={form.tempScriptCode}
        onChange={form.handleScriptCodeChange}
        language="python"
        title="编辑 Python 脚本"
        placeholder={`# 后端执行入口统一为 mock_response\n${DEFAULT_PYTHON_SCRIPT}`}
        onSave={form.handleSaveScriptCode}
      />
    </div>
  );
}
