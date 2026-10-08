import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Database, X, Copy, Plus, Upload, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { metadataService, type MetadataDefinition } from '@/services/metadata';
import { toast } from 'sonner';
import { useApiEditor } from '@/hooks/useApiEditor';
import { EnvSelect } from '@/components/features/common/EnvSelect';
import { ModuleConfirmDialog } from '@/components/features/common/ModuleConfirmDialog';
import { SaveDialog } from '@/components/features/common/SaveDialog';
import { ModuleTreeSelect } from '@/components/features/common/ModuleTreeSelect';
import { environmentService, type Environment, type DataEndpoint } from '@/services/environment';
import { http } from '@/utils/request';

interface SqlTestPageProps {
  apiName: string;
  onClose: () => void;
  definitionId?: string; // 定义ID，用于获取详细信息
  definitions?: MetadataDefinition[]; // 定义列表，用于查找详细信息
  onRefresh?: () => void; // 刷新列表的回调函数
}

export function SqlTestPage({ apiName, onClose, definitionId, definitions = [], onRefresh }: SqlTestPageProps) {
  const [searchParams] = useSearchParams();
  
  // 获取项目ID：优先从 URL 参数，然后从 localStorage，获取不到则报错
  const projectId = useMemo(() => {
    const projectIdFromUrl = searchParams.get('projectId');
    const projectIdFromStorage = localStorage.getItem('currentProjectId');
    const finalProjectId = projectIdFromUrl || projectIdFromStorage;
    
    if (!finalProjectId) {
      console.error('项目ID不存在，请从URL参数或localStorage中提供projectId');
      toast.error('项目ID不存在，请先选择项目');
    }
    
    return finalProjectId || '';
  }, [searchParams]);
  
  // 使用统一的 API 编辑器 Hook
  const editor = useApiEditor({
    protocol: 'SQL',
    projectId: projectId,
    onRefresh,
  });

  // 初始化默认名称和清空模块选择
  useEffect(() => {
    if (!definitionId) {
      // 设置默认名称
      if (!editor.state.name || editor.state.name.trim() === '') {
        editor.setName('新建SQL');
      }
      // 清空模块选择，确保没有默认模块
      editor.setSelectedModuleId('');
      editor.setConfirmModuleId('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // DDL 导入相关状态
  const [database, setDatabase] = useState('');
  const [tableName, setTableName] = useState('');
  const [ddlContent, setDdlContent] = useState('');
  const [loadingDdl, setLoadingDdl] = useState(false);
  const [selectedDataEndpoint, setSelectedDataEndpoint] = useState<DataEndpoint | null>(null);

  // 保存对话框状态
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

  // 记录已加载的 definitionId，避免重复加载覆盖用户输入
  const loadedDefinitionIdRef = useRef<string | null>(null);
  // 记录模块树是否已经初始化过（用于判断是否需要清空默认模块）
  const moduleTreeInitializedRef = useRef<boolean>(false);

  // 加载并回显接口详情（仅在 definitionId 变化时执行，避免覆盖用户输入）
  useEffect(() => {
    // 如果已经加载过这个 definitionId，不再重复加载（防止保存后刷新导致数据重置）
      if (loadedDefinitionIdRef.current === definitionId) {
        return;
      }
      
    // 如果 editor.state.definitionId 已经更新（保存后），但 definitionId prop 还没更新
    // 这种情况下，不要重新加载，保持当前数据
    if (editor.state.definitionId && editor.state.definitionId !== definitionId) {
      return;
    }
    
    if (definitionId && definitions.length > 0) {
      const definition = definitions.find(def => def.id === definitionId);
      if (definition) {
        // 标记已加载
        loadedDefinitionIdRef.current = definitionId;
        
        // 使用 Hook 的 loadFromDefinition 方法
        editor.loadFromDefinition(definition);
        
        // 回显 DDL 内容
        if (definition.scriptContent) {
          setDdlContent(definition.scriptContent);
        }
      } else {
        // 如果找不到定义，但 editor.state.definitionId 已经更新（可能是刚保存的数据）
        // 这种情况下，不要重置数据，保持当前状态
        if (editor.state.definitionId && editor.state.definitionId === definitionId) {
          // 标记已加载，防止后续重新加载
          loadedDefinitionIdRef.current = definitionId;
        }
      }
    } else if (!definitionId) {
      // 如果没有 definitionId（新建页面），重置已加载标记
      loadedDefinitionIdRef.current = null;
      // 重置 DDL 内容
      setDdlContent('');
      // 重置模块树初始化标记，允许下次模块树加载时清空默认模块
      moduleTreeInitializedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definitionId, definitions]);

  // 当环境选择变化时，获取该环境的 dataEndpoint
  useEffect(() => {
    const fetchDataEndpoint = async () => {
      if (!editor.selectedEnvironment || !projectId) {
        setSelectedDataEndpoint(null);
        return;
      }

      try {
        const envList = await environmentService.getEnvironmentList({
          projectId: projectId,
          current: 1,
          pageSize: 100,
        });
        
        const selectedEnv = envList.records.find((env: Environment) => env.id === editor.selectedEnvironment);
        if (selectedEnv && selectedEnv.dataEndpoint) {
          setSelectedDataEndpoint(selectedEnv.dataEndpoint);
          // 清空之前选择的数据库和表
          setDatabase('');
          setTableName('');
        } else {
          setSelectedDataEndpoint(null);
          toast.warning('所选环境未配置 dataEndpoint');
        }
      } catch (error: any) {
        console.error('获取环境配置失败:', error);
        setSelectedDataEndpoint(null);
      }
    };

    fetchDataEndpoint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.selectedEnvironment, projectId]);

  // 监听模块树加载，如果是新建页面且模块树首次加载完成，清空自动设置的默认模块
  useEffect(() => {
    // 只在新建页面时执行
    if (!definitionId) {
      // 如果模块树已加载，且 confirmModuleId 被自动设置了，但用户还未手动选择（state.moduleId 为空）
      if (editor.moduleTree.length > 0 && editor.confirmModuleId && !editor.state.moduleId) {
        // 延迟清空，确保 useApiEditor 的自动设置逻辑执行完毕
        // 使用更长的延迟时间，确保能够覆盖 useApiEditor 中的 setTimeout(0)
        const timer = setTimeout(() => {
          // 再次检查，确保用户还没有手动选择
          if (editor.confirmModuleId && !editor.state.moduleId) {
            editor.setConfirmModuleId('');
            editor.setSelectedModuleId('');
          }
        }, 200);
        return () => clearTimeout(timer);
      }
    } else {
      // 如果 definitionId 存在（编辑页面），重置初始化标记
      moduleTreeInitializedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.moduleTree.length, editor.confirmModuleId, editor.state.moduleId, definitionId]);


  // 导入数据库 DDL
  const importDdl = async () => {
    if (!selectedDataEndpoint) {
      toast.error('请先选择环境并确保环境配置了 dataEndpoint');
      return;
    }

    if (!database) {
      toast.error('请选择数据库');
      return;
    }

    if (!editor.state.moduleId && !editor.confirmModuleId) {
      toast.error('请先选择所属模块');
      return;
    }

    try {
      setLoadingDdl(true);
      setDdlContent('');
      
      const moduleId = editor.state.moduleId || editor.confirmModuleId;
      
      // 调用后端接口导入 DDL
      const params: any = {
        dataEndpoint: selectedDataEndpoint,
        database: database,
        projectId: projectId,
        moduleId: moduleId,
      };

      // 如果指定了表名，则添加 tableName 参数（不传则导入全部数据库）
      if (tableName && tableName.trim()) {
        params.tableName = tableName.trim();
      }

      const response = await http.post('/metadata/definition/import/ddl', params);
      
      // 处理响应数据
      let responseData = response;
      if (response?.data) {
        responseData = response.data;
      }
      
      const message = responseData?.data?.message || responseData?.message || 'DDL 导入成功';
      toast.success(message);
      
      // 注意：新的响应格式不再返回 DDL 内容，而是异步执行导入任务
      // 如果需要显示 DDL 内容，需要等待任务完成后再获取
    } catch (apiError: any) {
      console.error('API 调用失败:', apiError);
      
      // 处理错误响应
      let errorMessage = '导入 DDL 失败';
      if (apiError.response?.data?.error || apiError.response?.data?.message) {
        errorMessage = apiError.response.data.error || apiError.response.data.message;
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      
      setDdlContent('');
      toast.error(errorMessage);
    } finally {
      setLoadingDdl(false);
    }
  };

  // 处理保存
  const handleSave = async () => {
    if (!editor.state.name.trim()) {
      toast.error('请输入名称');
      return;
    }
    if (!ddlContent.trim()) {
      toast.error('请先导入 DDL 内容');
      return;
    }

    // 检查模块
    if (!editor.state.moduleId && !editor.confirmModuleId) {
      editor.setIsConfirmDialogOpen(true);
      return;
    }
    
    // 如果有 definitionId，直接保存；否则打开保存对话框
    if (editor.state.definitionId) {
      // 直接保存，调用 addDefinition 或 updateDefinition API
      await handleDirectSave();
    } else {
      // 打开保存对话框
      setIsSaveDialogOpen(true);
    }
  };
  
  // 处理保存对话框确认
  const handleSaveDialogConfirm = async () => {
    if (!editor.state.moduleId && !editor.confirmModuleId) {
      toast.error('请选择所属模块');
      return;
    }
    
    // 调用直接保存方法（第一次调用 add，后续调用 update）
    await handleDirectSave();
    
    // 关闭保存对话框
    setIsSaveDialogOpen(false);
  };
  
  // 直接保存方法（第一次调用 add，后续调用 update，保留所有数据）
  const handleDirectSave = async () => {
    const moduleId = editor.state.moduleId || editor.confirmModuleId;
    if (!moduleId) {
      toast.error('请选择所属模块');
      return;
    }

    const name = editor.state.name && editor.state.name.trim();
    if (!name) {
      toast.error('请输入接口名称');
        return;
    }

    try {
      const common = {
        name,
        moduleId,
        description: editor.state.description || undefined,
        tags: editor.state.tags && editor.state.tags.length > 0 ? editor.state.tags : undefined,
      };

      // 根据是否有 definitionId 决定调用 add 还是 update
      const isUpdate = !!editor.state.definitionId;
      let result: MetadataDefinition | string | null = null;

      if (isUpdate) {
        // 更新接口：调用 updateDefinition
        const params: any = {
          id: editor.state.definitionId,
          ...common,
          scriptContent: ddlContent.trim(),
        };
        result = await metadataService.updateDefinition(params);
      } else {
        // 新建接口：调用 addDefinition
        const params: any = {
          ...common,
          protocol: 'SQL',
          projectId: projectId,
          scriptContent: ddlContent.trim(),
        };
        result = await metadataService.addDefinition(params);
      }

      // 检查返回结果是否为空
      if (!result) {
        toast.error('保存失败：服务器返回数据为空');
        return;
      }

      // 更新 definitionId（保留其他所有数据）
      const newDefinitionId = typeof result === 'string' ? result : result.id;
      if (newDefinitionId) {
        // 使用 loadFromDefinition 更新 definitionId，但保留当前的所有数据
        const updatedDefinition: MetadataDefinition = {
          id: newDefinitionId,
          name: typeof result === 'string' ? editor.state.name : (result.name || editor.state.name),
          protocol: 'SQL',
          projectId: projectId,
          moduleId: typeof result === 'string' ? moduleId : (result.moduleId || moduleId),
          version: typeof result === 'string' ? 1 : (result.version || 1),
          isLatest: typeof result === 'string' ? true : (result.isLatest !== undefined ? result.isLatest : true),
          description: typeof result === 'string' ? editor.state.description : (result.description || editor.state.description),
          tags: typeof result === 'string' ? editor.state.tags : (result.tags || editor.state.tags || []),
          scriptContent: typeof result === 'string' ? ddlContent.trim() : (result.scriptContent || ddlContent.trim()),
          createUser: typeof result === 'string' ? '' : (result.createUser || ''),
          createdAt: typeof result === 'string' ? Date.now() : (result.createdAt || Date.now()),
          updatedAt: typeof result === 'string' ? Date.now() : (result.updatedAt || Date.now()),
        };
        editor.loadFromDefinition(updatedDefinition);
        
        // 重要：更新 loadedDefinitionIdRef，防止 useEffect 重新加载数据
        loadedDefinitionIdRef.current = newDefinitionId;
      }

      // 显示成功提示
      toast.success(isUpdate ? '接口已更新' : '接口已保存');

      // 刷新模块目录（但不立即刷新 definitions，避免触发 useEffect 重置数据）
      // 延迟刷新，确保状态已更新
      setTimeout(() => {
        if (onRefresh) {
          onRefresh();
        }
      }, 500);
    } catch (e: any) {
      console.error('保存接口失败:', e);
      toast.error(e?.message || '保存失败，请稍后重试');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-cyan-500">SQL</span>
            <Input
              value={editor.state.name || '新建SQL'}
              onChange={(e) => editor.setName(e.target.value)}
              className="h-7 w-48 text-sm"
              placeholder="新建SQL"
              disabled
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="w-2 h-2 rounded-full bg-green-500"></button>
            <button className="text-sm text-gray-600 hover:text-gray-900">
              <Plus className="w-4 h-4" />
            </button>
            <button className="text-sm text-gray-600 hover:text-gray-900" onClick={onClose}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <EnvSelect
            environments={editor.environments}
            value={editor.selectedEnvironment}
            onChange={editor.setSelectedEnvironment}
          />
        </div>
      </div>

      {/* DDL 导入配置区域 - 卡片样式 */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="space-y-6">
            {/* 标题 */}
            <div className="flex items-center gap-2 pb-4 border-b border-gray-200">
              <Database className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-semibold text-gray-900">导入 DDL 配置</h3>
            </div>

            {/* 配置表单 */}
            <div className="space-y-4">
              {/* 第一行：数据库、表名 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-gray-700 font-medium">数据库 *</Label>
                  <Input
                    value={database}
                    onChange={(e) => setDatabase(e.target.value)}
                    placeholder="请输入数据库名"
                    className="border border-gray-300"
                    disabled={!selectedDataEndpoint}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-gray-700 font-medium">表名 (可选)</Label>
                  <Input
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                    placeholder="不填写则导入全部数据库"
                    className="border border-gray-300"
                    disabled={!database}
                  />
                </div>
              </div>

              {/* 第二行：模块选择 */}
              <div className="space-y-2">
                <ModuleTreeSelect
                  moduleTree={editor.moduleTree}
                  moduleId={editor.state.moduleId || (!definitionId ? '' : editor.confirmModuleId) || ''}
                  onModuleIdChange={(moduleId) => {
                    editor.setConfirmModuleId(moduleId);
                    editor.setSelectedModuleId(moduleId);
                  }}
                  moduleType="SQL"
                  projectId={projectId}
                  onModuleTreeRefresh={async () => {
                    await editor.refreshModuleTree();
                  }}
                  label="所属模块"
                  required
                  placeholder="请选择所属模块，用于归类当前DDL"
                  showQuickCreate={true}
                  defaultExpandFirstLevel={true}
                  disableRootNodes={true}
                />
              </div>

              {/* 第三行：数据源信息和导入按钮 */}
              <div className="flex items-center justify-between">
                {/* 数据源信息 */}
                {selectedDataEndpoint ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-xs font-medium text-blue-900">数据源连接:</span>
                      <span className="text-xs font-mono text-blue-700">{selectedDataEndpoint.data_host}:{selectedDataEndpoint.data_port}</span>
                    </div>
                  </div>
                ) : (
                  <div></div>
                )}
                
                {/* 导入按钮 */}
                <Button
                  onClick={importDdl}
                  disabled={loadingDdl || !selectedDataEndpoint || !database || (!editor.state.moduleId && !editor.confirmModuleId)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  {loadingDdl ? '导入中...' : '导入 DDL'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DDL 展示区域 - 卡片样式 */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        <div className="flex-1 p-4 overflow-auto">
          {loadingDdl ? (
            <div className="flex items-center justify-center h-full">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  <p className="text-sm text-gray-600 font-medium">正在导入 DDL...</p>
                  <p className="text-xs text-gray-400 mt-1">请稍候</p>
                </div>
              </div>
            </div>
          ) : ddlContent ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="space-y-4">
                {/* 标题栏 */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="text-base font-semibold text-gray-900">DDL 内容</h3>
                  </div>
                  <div 
                    className="text-xs text-gray-500 cursor-pointer hover:text-blue-600 transition-colors inline-flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-blue-50"
                    onClick={() => {
                      navigator.clipboard.writeText(ddlContent);
                      toast.success('DDL 已复制到剪贴板');
                    }} 
                    title="点击复制 DDL 语句"
                  >
                    <Copy className="w-3 h-3" />
                    <span>点击复制 DDL 语句</span>
                  </div>
                </div>
                
                {/* 代码编辑器 */}
                <div className="relative">
                  <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden shadow-lg">
                    {/* 代码编辑器头部 */}
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-medium">DDL</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-mono">
                          {ddlContent ? `${ddlContent.split('\n').length} 行` : '0 行'}
                        </span>
                      </div>
                    </div>
                    {/* 代码内容区域 */}
                    <div className="relative">
                      {/* 行号 */}
                      {ddlContent && (
                        <div className="absolute left-0 top-0 bottom-0 w-12 bg-slate-800 border-r border-slate-700 text-right py-4">
                          <div className="text-xs text-slate-500 font-mono leading-6">
                            {ddlContent.split('\n').map((_, index) => (
                              <div key={index} className="px-2">
                                {index + 1}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* 代码内容 */}
                      <div className="pl-12 pr-4 py-4 overflow-x-auto max-h-[600px]">
                        <pre className="text-sm font-mono leading-6 text-slate-100 whitespace-pre">
                          <code className="ddl-code">
                            {ddlContent.split('\n').map((line, lineIndex) => (
                              <div key={lineIndex}>{line || ' '}</div>
                            ))}
                          </code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Database className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-2">准备导入 DDL</h3>
                <p className="text-sm text-gray-500 mb-1">请选择环境、数据库和表（可选），然后点击"导入 DDL"按钮</p>
                {!selectedDataEndpoint && (
                  <p className="text-xs text-gray-400 mt-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md">
                    提示：请先选择环境，确保环境配置了 dataEndpoint
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 确认对话框 - 选择SQL模块 */}
      <ModuleConfirmDialog
        open={editor.isConfirmDialogOpen}
        onOpenChange={editor.setIsConfirmDialogOpen}
        moduleTree={editor.moduleTree}
        selectedModuleId={editor.confirmModuleId}
        onModuleChange={editor.setConfirmModuleId}
        moduleType="SQL"
        projectId={projectId}
        onModuleTreeRefresh={async () => {
          // 只刷新模块树，不刷新定义列表（避免清空用户输入的内容）
          await editor.refreshModuleTree();
        }}
        onConfirm={() => {
          if (!editor.confirmModuleId) {
            toast.error('请选择所属模块');
            return;
          }
          // 设置模块ID并打开保存对话框
          editor.setSelectedModuleId(editor.confirmModuleId);
          editor.setIsConfirmDialogOpen(false);
          setIsSaveDialogOpen(true);
        }}
        protocolLabel="SQL"
      />

      {/* 保存对话框 */}
      <SaveDialog
        open={isSaveDialogOpen}
        onOpenChange={setIsSaveDialogOpen}
        moduleTree={editor.moduleTree}
        moduleId={editor.state.moduleId || editor.confirmModuleId}
        description={editor.state.description || ''}
        tags={editor.state.tags.join(', ')}
        onDescriptionChange={editor.setDescription}
        onTagsChange={(tagsStr) => {
          const tagsArray = tagsStr
            ? tagsStr.split(',').map((t) => t.trim()).filter((t) => t)
            : [];
          editor.setTags(tagsArray);
        }}
        onModuleIdChange={(moduleId) => {
          editor.setConfirmModuleId(moduleId);
          editor.setSelectedModuleId(moduleId);
        }}
        moduleType="SQL"
        projectId={projectId}
        onModuleTreeRefresh={async () => {
          // 只刷新模块树，不刷新定义列表（避免清空用户输入的内容）
          await editor.refreshModuleTree();
        }}
        onConfirm={handleSaveDialogConfirm}
        saving={editor.state.saving}
      />
    </div>
  );
}
