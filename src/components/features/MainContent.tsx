import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import type { ApiItem, OpenedTest } from '@/types';
import { metadataService, type MetadataDefinition, type PluginSyncNode } from '@/services/metadata';
import { environmentService, type Environment } from '@/services/environment';
import { TYPE_CONFIG } from '@/constants/metadata';
import { ApiTypeCard } from './ApiTypeCard';
import { TestPage } from './api-interfaces/TestPage';
import { SqlTestPage } from './api-interfaces/SqlTestPage';
import { DubboTestPage } from './api-interfaces/DubboTestPage';
import { RocketMQTestPage } from './api-interfaces/RocketMQTestPage';
import { FileUploadPage } from './api-interfaces/FileUploadPage';
import { DataFactoryPage } from './api-interfaces/DataFactoryPage';
import { MockFactoryPage } from './api-interfaces/MockFactoryPage';
import { PerformanceManagementView } from './performance-management/PerformanceManagementView';
import WorkflowDesignPageV2 from './WorkflowDesignPageV2';
import { ApiPreviewPage } from './api-interfaces/ApiPreviewPage';
import { MetadataTreePanel } from './metadata/MetadataTreePanel';
import { MetadataTablePanel } from './metadata/MetadataTablePanel';
import { MetadataDialogs } from './metadata/MetadataDialogs';
import { useMetadataData } from '@/hooks/useMetadataData';
import { useMetadataSearch } from '@/hooks/useMetadataSearch';
import { useMetadataDialogs } from '@/hooks/useMetadataDialogs';
import { flattenNodes, getProtocolContext } from '@/utils/metadataHelpers';
import { useMainContentState, useMainContentCalculations, useMainContentRecentUpdates } from './main-content';

interface MainContentProps {
  selectedTopMenu: string;
}

export function MainContent({ selectedTopMenu }: MainContentProps) {
  const [searchParams] = useSearchParams();

  const projectId = useMemo(() => {
    const projectIdFromUrl = searchParams.get('projectId');
    const projectIdFromStorage = localStorage.getItem('currentProjectId');
    const finalProjectId = projectIdFromUrl || projectIdFromStorage;

    if (finalProjectId === 'no_such_project') {
      return '';
    }

    return finalProjectId || '';
  }, [searchParams]);
  // 使用 hooks 管理状态
  const metadataData = useMetadataData(projectId);
  const {
    moduleTree,
    definitions,
    filteredDefinitions,
    hasActiveSearch,
    loading,
    userNameMap,
    pluginSyncNodes,
    loadingPluginSyncNodes,
    loadModuleTree,
    loadDefinitions,
    loadPluginSyncNodes,
    refresh,
  } = metadataData;

  const [ddlImportEnvironments, setDdlImportEnvironments] = useState<Environment[]>([]);

  // 使用 hooks 管理状态
  const state = useMainContentState();
  const {
    currentSelection,
    setCurrentSelection,
    expandedFolders,
    setExpandedFolders,
    openedTest,
    setOpenedTest,
    previewDefinition,
    setPreviewDefinition,
    selectedDefinitionIds,
    setSelectedDefinitionIds,
    userGroups,
    handleToggleSelection,
    handleToggleSelectAll,
  } = state;

  const searchHooks = useMetadataSearch(projectId, currentSelection, moduleTree, loadDefinitions);
  const {
    searchKeyword,
    setSearchKeyword,
    sidebarCreateUserSearch,
    setSidebarCreateUserSearch,
    tableSearchKeyword,
    setTableSearchKeyword,
    createUserSearch,
    setCreateUserSearch,
    currentProtocolForSearch,
  } = searchHooks;

  const dialogs = useMetadataDialogs();

  // 使用计算 hooks
  const calculations = useMainContentCalculations(definitions, filteredDefinitions, moduleTree, hasActiveSearch);
  const {
    calculateModuleCounts,
    metadataTypes,
    metadataCategories,
    metadataItems,
  } = calculations;

  // 最近更新记录
  const recentUpdatesHook = useMainContentRecentUpdates(projectId, selectedTopMenu);
  const { recentUpdates: recentUpdatesData, loadingRecentUpdates: loadingRecentUpdatesData, loadRecentUpdates } = recentUpdatesHook;


  const loadDdlImportEnvironments = async () => {
    if (!projectId) {
      return;
    }
    try {
      const envList = await environmentService.getEnvironmentList({
        projectId: projectId,
        current: 1,
        pageSize: 100,
      });
      setDdlImportEnvironments(envList.records || []);
    } catch (error) {
      console.error('加载环境列表失败:', error);
      toast.error('加载环境列表失败');
    }
  };


  // 当切换二级菜单时，清除打开的详情页，回到初始页面
  useEffect(() => {
    if (selectedTopMenu === 'data-factory') {
      setCurrentSelection({ level: 'metadata-type', id: 'metadata-script', name: '造数工厂' });

      // 清除打开的测试页面和预览定义，确保显示初始列表页
      setOpenedTest(null);
      setPreviewDefinition(null);

      // 展开造数工厂模块树的一级目录
      setExpandedFolders(prev => {
        const newSet = new Set(prev);
        // 展开造数工厂根节点
        newSet.add('data-factory-root');

        // 查找所有造数工厂协议的根模块并展开下一层
        if (moduleTree && moduleTree.length > 0) {
          moduleTree.forEach(node => {
            if (node.type === 'SCRIPT' && node.parentId === 'NONE') {
              newSet.add(node.id);
            }
          });
        }
        return newSet;
      });
    } else if (selectedTopMenu === 'api') {
      // 切换到 API 接口时，清除打开的测试页面和预览定义，重置选择状态，确保显示初始页面（选择测试类型）
      setOpenedTest(null);
      setPreviewDefinition(null);
      setCurrentSelection({ level: 'none' });
    }
  }, [selectedTopMenu]);

  // 切换列表时清空选择数据
  useEffect(() => {
    setSelectedDefinitionIds(new Set());
  }, [currentSelection]);

  const handleRefresh = async () => {
    await refresh();
  };

  const handleDeleteDefinition = async (id: string) => {
    try {
      await metadataService.deleteDefinition(id);
      await refresh();
    } catch (error) {
      throw error;
    }
  };

  const handleBatchMove = async () => {
    if (!dialogs.batchMoveTargetModuleId) {
      toast.error('请选择目标模块');
      return;
    }

    if (selectedDefinitionIds.size === 0) {
      toast.error('请至少选择一个元数据');
      return;
    }

    try {
      dialogs.setIsBatchMoving(true);

      const definitionsToMove = definitions.filter(def => selectedDefinitionIds.has(def.id));

      if (definitionsToMove.length === 0) {
        toast.error('未找到需要移动的元数据');
        return;
      }

      // 使用批量移动接口
      const ids = Array.from(selectedDefinitionIds);
      await metadataService.batchMoveDefinitions({
        ids,
        moduleId: dialogs.batchMoveTargetModuleId,
      });

      toast.success(`成功移动 ${definitionsToMove.length} 个元数据`);

      setSelectedDefinitionIds(new Set());
      dialogs.setIsBatchMoveDialogOpen(false);
      dialogs.setBatchMoveTargetModuleId('');

      await refresh();
    } catch (error: any) {
      console.error('批量移动失败:', error);
      const errorMessage = error?.message || error?.response?.data?.message || '批量移动失败，请重试';
      toast.error(errorMessage);
    } finally {
      dialogs.setIsBatchMoving(false);
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleClickMetadata = () => {
    setOpenedTest(null);
    setPreviewDefinition(null);
  };

  const handleClickMetadataType = (typeId: string, typeName: string) => {
    setCurrentSelection({ level: 'metadata-type', id: typeId, name: typeName });
    setOpenedTest(null);
    setPreviewDefinition(null);
  };

  const handleClickMetadataCategory = (categoryId: string, categoryName: string) => {
    setCurrentSelection({ level: 'metadata-category', id: categoryId, name: categoryName });
    setOpenedTest(null);
    setPreviewDefinition(null);
  };

  const handleAddApi = (category: string, typeName: string) => {
    // 打开对应的测试页面
    const testTypeMap: { [key: string]: OpenedTest['type'] } = {
      'http': 'http',
      'sql': 'sql',
      'dubbo': 'dubbo',
      'rocketmq': 'rocketmq',
      'file': 'file',
      'data-factory': 'data-factory',
      'mock-factory': 'mock-factory',
    };

    setOpenedTest({
      id: Date.now().toString(),
      name: typeName,
      type: testTypeMap[category] || 'http',
    });
  };

  const handleOpenApi = (api: ApiItem) => {
    // 从 definitions 中查找对应的定义
    const definition = definitions.find(def => def.id === api.id);
    if (definition) {
      // RocketMQ 和 SCRIPT 直接进入编辑模式，不显示预览页
      if (definition.protocol === 'ROCKETMQ' || definition.protocol === 'SCRIPT') {
        const testTypeMap: { [key: string]: OpenedTest['type'] } = {
          'HTTP': 'http',
          'SQL': 'sql',
          'DUBBO': 'dubbo',
          'ROCKETMQ': 'rocketmq',
          'SCRIPT': 'data-factory',
        };

        setOpenedTest({
          id: definition.id,
          name: definition.name,
          type: testTypeMap[definition.protocol] || 'http',
          definitionId: definition.id,
        });
        setPreviewDefinition(null);
      } else {
        // 其他协议显示预览页
        setPreviewDefinition(definition);
        setOpenedTest(null);
      }
    } else {
      // 如果找不到定义，直接打开详情页（兼容旧逻辑）
      // 优先根据 protocol 判断类型
      const protocolTypeMap: { [key: string]: OpenedTest['type'] } = {
        'HTTP': 'http',
        'SQL': 'sql',
        'DUBBO': 'dubbo',
        'ROCKETMQ': 'rocketmq',
        'SCRIPT': 'data-factory',
        'FILE': 'file',
      };

      const categoryTypeMap: { [key: string]: OpenedTest['type'] } = {
        'http': 'http',
        'sql': 'sql',
        'dubbo': 'dubbo',
        'rocketmq': 'rocketmq',
        'data-factory': 'data-factory',
        'mock-factory': 'mock-factory',
      };

      // 优先使用 protocol，如果没有则使用 category
      const testType = api.protocol && protocolTypeMap[api.protocol]
        ? protocolTypeMap[api.protocol]
        : (categoryTypeMap[api.category] || 'http');

      setOpenedTest({
        id: api.id,
        name: api.name,
        type: testType,
        definitionId: api.id,
      });
      setPreviewDefinition(null);
    }
  };

  // 从预览页发起调试，进入详情页
  const handleStartDebug = () => {
    if (!previewDefinition) return;

    const testTypeMap: { [key: string]: OpenedTest['type'] } = {
      'HTTP': 'http',
      'SQL': 'sql',
      'DUBBO': 'dubbo',
      'ROCKETMQ': 'rocketmq',
      'FILE': 'file',
    };

    setOpenedTest({
      id: previewDefinition.id,
      name: previewDefinition.name,
      type: testTypeMap[previewDefinition.protocol] || 'http',
      definitionId: previewDefinition.id,
    });
    setPreviewDefinition(null);
  };

  // 从预览页返回
  const handleBackFromPreview = () => {
    setPreviewDefinition(null);
  };

  const handleCloseTest = () => {
    setOpenedTest(null);
    setPreviewDefinition(null);
  };

  // 将 PluginSyncNode 转换为 MetadataDefinition（用于预览）
  const convertSyncNodeToDefinition = (node: PluginSyncNode): MetadataDefinition => {
    const endpointData = node.endpointData || {};

    // 根据 nodeType 构建不同的定义
    if (node.nodeType === 'HTTP') {
      const method = endpointData.method || 'GET';
      const url = endpointData.url || '';
      const path = endpointData.path || url;
      const name = endpointData.name || path || node.nodeId;

      // 处理 body：如果是字符串，尝试解析为对象；否则直接使用
      let body = endpointData.body;
      if (typeof body === 'string' && body.trim()) {
        try {
          body = JSON.parse(body);
        } catch {
          // 如果解析失败，保持为字符串
        }
      }

      return {
        id: `sync-${node.nodeId}`, // 使用 sync- 前缀标识同步节点
        projectId: projectId,
        moduleId: 'plugin-sync',
        name: name,
        protocol: 'HTTP',
        version: 1,
        isLatest: true,
        description: `同步数据 - ${method} ${path}`,
        requestConfig: {
          url: url,
          method: method,
          path: path,
          headers: endpointData.headers || {},
          query: endpointData.queryParams || {},
          ...(body !== undefined && body !== null && { body: body }),
        },
        responseConfig: {},
        createUser: node.email || '',
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
      };
    } else if (node.nodeType === 'SQL') {
      const sql = endpointData.sql || '';
      const name = endpointData.name || (sql.length > 50 ? sql.substring(0, 50) + '...' : sql);

      return {
        id: node.nodeId,
        projectId: projectId,
        moduleId: 'plugin-sync',
        name: name,
        protocol: 'SQL',
        version: 1,
        isLatest: true,
        description: `同步数据 - SQL操作`,
        requestConfig: {
          sql: sql,
          operationType: endpointData.operationType || 'SELECT',
        },
        responseConfig: {},
        createUser: node.email || '',
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
      };
    } else if (node.nodeType === 'DUBBO') {
      // DUBBO 类型：提取接口名称、方法名、应用名等字段
      const interfaceName = endpointData.interface_name || endpointData.interfaceName || '';
      const methodName = endpointData.method_name || endpointData.methodName || '';
      const applicationName = endpointData.application_name || endpointData.applicationName || '';
      // 支持 paramTypes 和 parameterTypes 两种命名
      const parameterTypes = endpointData.paramTypes || endpointData.param_types || endpointData.parameterTypes || endpointData.parameter_types || [];
      // 支持 params 数组
      const params = endpointData.params || [];

      // 构建名称：优先使用 endpointData.name，否则使用接口名+方法名，最后使用 nodeId
      const name = endpointData.name || (interfaceName && methodName
        ? `${interfaceName}.${methodName}`
        : interfaceName || methodName || node.nodeId);

      return {
        id: `sync-${node.nodeId}`, // 使用 sync- 前缀标识同步节点
        projectId: projectId,
        moduleId: 'plugin-sync',
        name: name,
        protocol: 'DUBBO',
        version: 1,
        isLatest: true,
        description: `同步数据 - DUBBO接口: ${interfaceName} 方法: ${methodName}`,
        requestConfig: {
          interfaceName: interfaceName,
          methodName: methodName,
          applicationName: applicationName,
          parameterTypes: parameterTypes,
          params: params, // 确保 params 数组被传递
          // 保留其他可能的字段
          ...(endpointData.url && { url: endpointData.url }),
          ...(endpointData.group && { group: endpointData.group }),
          ...(endpointData.version && { version: endpointData.version }),
          ...(endpointData.timeout && { timeout: endpointData.timeout }),
          ...(endpointData.body && { body: endpointData.body }),
        },
        responseConfig: {},
        createUser: node.email || '',
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
      };
    } else if (node.nodeType === 'ROCKETMQ') {
      // ROCKETMQ 类型：提取 topic、tag、key、messageBody/body 等字段
      const topic = endpointData.topic || '';
      const tag = endpointData.tag || '';
      const key = endpointData.key || '';
      // 支持 messageBody 和 body 两种命名
      const body = endpointData.messageBody || endpointData.body || '';

      // 构建名称：优先使用 topic，否则使用 nodeId
      const name = topic || node.nodeId;

      return {
        id: `sync-${node.nodeId}`, // 使用 sync- 前缀标识同步节点
        projectId: projectId,
        moduleId: 'plugin-sync',
        name: name,
        protocol: 'ROCKETMQ',
        version: 1,
        isLatest: true,
        description: `同步数据 - RocketMQ消息: Topic: ${topic} Tag: ${tag}`,
        requestConfig: {
          topic: topic,
          tag: tag,
          key: key,
          body: body, // 将 messageBody 映射为 body，供 RocketMQTestPage 使用
          // 保留其他可能的字段
          ...(endpointData.mqUrl && { mqUrl: endpointData.mqUrl }),
        },
        responseConfig: {},
        createUser: node.email || '',
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
      };
    } else {
      // 其他未知类型
      return {
        id: `sync-${node.nodeId}`,
        projectId: projectId,
        moduleId: 'plugin-sync',
        name: node.nodeId,
        protocol: 'HTTP', // 默认协议
        version: 1,
        isLatest: true,
        description: `同步数据 - ${node.nodeType}`,
        requestConfig: endpointData,
        responseConfig: {},
        createUser: node.email || '',
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
      };
    }
  };

  // 打开同步节点的调试页面
  const handleOpenSyncNode = (node: PluginSyncNode, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    const testTypeMap: { [key: string]: OpenedTest['type'] } = {
      'HTTP': 'http',
      'SQL': 'sql',
      'DUBBO': 'dubbo',
      'ROCKETMQ': 'rocketmq',
    };

    // 转换节点为定义，以获取正确的名称
    const definition = convertSyncNodeToDefinition(node);

    setOpenedTest({
      id: node.nodeId,
      name: definition.name,
      type: testTypeMap[node.nodeType] || 'http',
      definitionId: definition.id, // 使用转换后的定义ID（已包含 sync- 前缀）
    });
    setPreviewDefinition(null);
  };

  // 预览同步节点
  const handlePreviewSyncNode = (node: PluginSyncNode, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    const definition = convertSyncNodeToDefinition(node);
    setPreviewDefinition(definition);
    setOpenedTest(null);
  };

  // 合并常规定义和同步节点定义，供测试页面使用
  const allDefinitions = useMemo(() => {
    const syncDefinitions = pluginSyncNodes.map(node => convertSyncNodeToDefinition(node));
    return [...definitions, ...syncDefinitions];
  }, [definitions, pluginSyncNodes, projectId]);

  const apiTypes = [
    { id: 'http', label: '新建Http接口', icon: '🔌', color: 'from-orange-100 to-orange-50', iconBg: 'bg-orange-100' },
    { id: 'sql', label: '导入DDL', icon: '📊', color: 'from-cyan-100 to-cyan-50', iconBg: 'bg-cyan-100' },
    { id: 'dubbo', label: '新建DUBBO', icon: '🔄', color: 'from-blue-100 to-blue-50', iconBg: 'bg-blue-100' },
    { id: 'rocketmq', label: '新建RocketMQ', icon: '🚀', color: 'from-green-100 to-green-50', iconBg: 'bg-green-100' },
    { id: 'file', label: '文件上传', icon: '📁', color: 'from-purple-100 to-purple-50', iconBg: 'bg-purple-100' },
  ];

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'GET': 'text-orange-600',
      'POST': 'text-yellow-600',
      'PUT': 'text-blue-600',
      'DELETE': 'text-red-600',
      'SQL': 'text-cyan-600',
      'DUBBO': 'text-blue-600',
      'RocketMQ': 'text-green-600',
      'FILE': 'text-purple-600',
    };
    return colors[type] || 'text-gray-600';
  };


  // 根据当前选择计算需要显示的表格数据（支持搜索和模块过滤）
  const tableData = useMemo(() => {
    let filteredItems: ApiItem[] = [];

    // 先根据当前选择过滤模块
    if (currentSelection.level === 'metadata') {
      // 显示所有元数据
      filteredItems = metadataItems;
    } else if (currentSelection.level === 'metadata-type' && currentSelection.id) {
      // 显示该类型下的所有元数据（通过moduleId筛选）
      // 特殊处理造数工厂（SCRIPT类型）
      if (currentSelection.id === 'metadata-script') {
        // 直接过滤 SCRIPT 协议的定义
        filteredItems = metadataItems.filter(item => item.protocol === 'SCRIPT');
      } else {
        const typeInfo = metadataTypes.find(t => t.id === currentSelection.id);
        if (typeInfo && typeInfo.moduleIds.length > 0) {
          filteredItems = metadataItems.filter(item =>
            typeInfo.moduleIds.includes(item.groupId)
          );
        } else {
          filteredItems = [];
        }
      }
    } else if (currentSelection.level === 'metadata-category' && currentSelection.id) {
      // 显示该分类（模块）及其所有子节点下的所有元数据
      // 收集当前节点及其所有子节点的ID
      const collectAllNodeIds = (nodeId: string): string[] => {
        const node = flattenNodes(moduleTree).find(n => n.id === nodeId);
        if (!node) return [nodeId];

        const ids = [nodeId];
        if (node.children && node.children.length > 0) {
          node.children.forEach(child => {
            ids.push(...collectAllNodeIds(child.id));
          });
        }
        return ids;
      };

      const allNodeIds = collectAllNodeIds(currentSelection.id);
      filteredItems = metadataItems.filter(item => allNodeIds.includes(item.groupId));
    } else {
      filteredItems = [];
    }

    // 注意：搜索过滤已经在后端完成（通过 filteredDefinitions），这里不需要再次过滤
    return filteredItems;
  }, [currentSelection, metadataItems, metadataTypes, moduleTree]);

  // 检查是否全选（在 tableData 定义之后）
  const isAllSelected = useMemo(() => {
    const validItems = tableData.filter(item => !item.id.startsWith('sync-'));
    return validItems.length > 0 && validItems.every(item => selectedDefinitionIds.has(item.id));
  }, [tableData, selectedDefinitionIds]);

  // 检查是否部分选中（在 tableData 定义之后）
  const isIndeterminate = useMemo(() => {
    const validItems = tableData.filter(item => !item.id.startsWith('sync-'));
    const selectedCount = validItems.filter(item => selectedDefinitionIds.has(item.id)).length;
    return selectedCount > 0 && selectedCount < validItems.length;
  }, [tableData, selectedDefinitionIds]);

  // 当前表格的协议上下文（SQL / DUBBO / ROCKETMQ / FILE / HTTP）
  const protocolContext = useMemo(() => {
    return getProtocolContext(currentSelection, moduleTree);
  }, [currentSelection, moduleTree]);

  // 兼容旧的 isSqlContext（保持向后兼容）
  const isSqlContext = useMemo(() => protocolContext === 'SQL', [protocolContext]);

  // 判断是否应该显示表格视图
  const shouldShowTable = currentSelection.level !== 'none' &&
    ['metadata', 'metadata-type', 'metadata-category'].includes(currentSelection.level);

  // 判断是否应该显示左侧模块树（用例实现 tab、Mock工厂和性能管理不显示，造数工厂需要显示）
  const isRealizationTab = selectedTopMenu === 'realization';
  const shouldShowTreePanel = !isRealizationTab && selectedTopMenu !== 'mock-factory' && selectedTopMenu !== 'performance';

  // 左侧树面板收起状态（造数工厂和Mock工厂支持收起）
  const [isTreePanelCollapsed, setIsTreePanelCollapsed] = useState(() => {
    // 从 localStorage 读取保存的状态
    const saved = localStorage.getItem('treePanelCollapsed');
    return saved === 'true';
  });

  // 切换树面板收起状态
  const toggleTreePanel = () => {
    const newState = !isTreePanelCollapsed;
    setIsTreePanelCollapsed(newState);
    localStorage.setItem('treePanelCollapsed', String(newState));
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left Panel - API Tree */}
      {shouldShowTreePanel && (
        <MetadataTreePanel
          expandedFolders={expandedFolders}
          toggleFolder={toggleFolder}
          currentSelection={currentSelection}
          metadataTypes={metadataTypes}
          metadataCategories={metadataCategories}
          moduleTree={moduleTree}
          metadataItems={metadataItems}
          calculateModuleCounts={calculateModuleCounts}
          userGroups={userGroups}
          pluginSyncNodes={pluginSyncNodes}
          loadingPluginSyncNodes={loadingPluginSyncNodes}
          searchKeyword={searchKeyword}
          dialogs={dialogs}
          onHandleClickMetadata={handleClickMetadata}
          onHandleClickMetadataType={handleClickMetadataType}
          onHandleClickMetadataCategory={handleClickMetadataCategory}
          onHandleOpenApi={handleOpenApi}
          onHandlePreviewSyncNode={handlePreviewSyncNode}
          onHandleOpenSyncNode={handleOpenSyncNode}
          onSetOpenedTest={setOpenedTest}
          onSetPreviewDefinition={setPreviewDefinition}
          selectedTopMenu={selectedTopMenu}
          isCollapsed={isTreePanelCollapsed}
          onToggleCollapse={toggleTreePanel}
        />
      )}

      {/* Right Panel - Main Content */}
      {previewDefinition ? (
        <ApiPreviewPage
          definition={previewDefinition}
          onStartDebug={handleStartDebug}
          onBack={handleBackFromPreview}
          moduleName={(() => {
            // 从 moduleTree 中查找 moduleId 对应的 name
            if (previewDefinition.moduleId) {
              const moduleNode = moduleTree.find(node => node.id === previewDefinition.moduleId);
              return moduleNode?.name;
            }
            return undefined;
          })()}
          moduleTree={moduleTree}
          definitions={allDefinitions}
          onRefresh={handleRefresh}
        />
      ) : openedTest ? (
        <>
          {openedTest.type === 'http' && (
            <TestPage
              apiType="http"
              apiName={openedTest.name}
              onClose={handleCloseTest}
              definitionId={openedTest.definitionId}
              definitions={allDefinitions}
              onRefresh={handleRefresh}
            />
          )}
          {openedTest.type === 'sql' && (
            <SqlTestPage
              apiName={openedTest.name}
              onClose={handleCloseTest}
              definitionId={openedTest.definitionId}
              definitions={allDefinitions}
              onRefresh={handleRefresh}
            />
          )}
          {openedTest.type === 'dubbo' && (
            <DubboTestPage
              apiName={openedTest.name}
              onClose={handleCloseTest}
              definitionId={openedTest.definitionId}
              definitions={allDefinitions}
              onRefresh={handleRefresh}
            />
          )}
          {openedTest.type === 'rocketmq' && (
            <RocketMQTestPage
              apiName={openedTest.name}
              onClose={handleCloseTest}
              definitionId={openedTest.definitionId}
              definitions={allDefinitions}
              onRefresh={handleRefresh}
            />
          )}
          {openedTest.type === 'file' && (
            <FileUploadPage
              apiName={openedTest.name}
              onClose={handleCloseTest}
              definitionId={openedTest.definitionId}
              definitions={allDefinitions}
              onRefresh={handleRefresh}
            />
          )}
          {openedTest.type === 'data-factory' && (
            <DataFactoryPage
              onClose={handleCloseTest}
              definitionId={openedTest.definitionId}
              onRefresh={handleRefresh}
            />
          )}
          {openedTest.type === 'mock-factory' && (
            <MockFactoryPage onClose={handleCloseTest} />
          )}
        </>
      ) : (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {selectedTopMenu === 'mock-factory' ? (
              <MockFactoryPage onClose={() => { }} />
            ) : selectedTopMenu === 'data-factory' ? (
              <MetadataTablePanel
                currentSelection={currentSelection}
                tableData={tableData}
                loading={loading}
                protocolContext={protocolContext}
                tableSearchKeyword={tableSearchKeyword}
                setTableSearchKeyword={setTableSearchKeyword}
                createUserSearch={createUserSearch}
                setCreateUserSearch={setCreateUserSearch}
                selectedDefinitionIds={selectedDefinitionIds}
                handleToggleSelection={handleToggleSelection}
                handleToggleSelectAll={handleToggleSelectAll}
                isAllSelected={isAllSelected}
                isIndeterminate={isIndeterminate}
                definitions={definitions}
                moduleTree={moduleTree}
                userNameMap={userNameMap}
                metadataTypes={metadataTypes}
                metadataCategories={metadataCategories}
                dialogs={dialogs}
                projectId={projectId}
                onSetCurrentSelection={setCurrentSelection}
                onHandleOpenApi={handleOpenApi}
                onHandleAddApi={handleAddApi}
                onLoadDdlImportEnvironments={loadDdlImportEnvironments}
                onRefresh={handleRefresh}
                selectedTopMenu={selectedTopMenu}
              />
            ) : shouldShowTable ? (
              <MetadataTablePanel
                currentSelection={currentSelection}
                tableData={tableData}
                loading={loading}
                protocolContext={protocolContext}
                tableSearchKeyword={tableSearchKeyword}
                setTableSearchKeyword={setTableSearchKeyword}
                createUserSearch={createUserSearch}
                setCreateUserSearch={setCreateUserSearch}
                selectedDefinitionIds={selectedDefinitionIds}
                handleToggleSelection={handleToggleSelection}
                handleToggleSelectAll={handleToggleSelectAll}
                isAllSelected={isAllSelected}
                isIndeterminate={isIndeterminate}
                definitions={definitions}
                moduleTree={moduleTree}
                userNameMap={userNameMap}
                metadataTypes={metadataTypes}
                metadataCategories={metadataCategories}
                dialogs={dialogs}
                projectId={projectId}
                onSetCurrentSelection={setCurrentSelection}
                onHandleOpenApi={handleOpenApi}
                onHandleAddApi={handleAddApi}
                onLoadDdlImportEnvironments={loadDdlImportEnvironments}
                onRefresh={handleRefresh}
              />
            ) : selectedTopMenu === 'api' ? (
              <div className="h-full bg-gradient-to-b from-gray-50 to-gray-100 overflow-y-auto flex items-start justify-center">
                <div className="w-full max-w-4xl px-8 py-12 space-y-10">
                  {/* Title Section */}
                  <div className="text-center space-y-2">
                    <h2 className="text-gray-900">选择测试类型</h2>
                    <p className="text-sm text-gray-500">快速创建接口测试或使用数据工具</p>
                  </div>

                  {/* API Type Cards */}
                  <div className="grid grid-cols-4 gap-5">
                    {apiTypes.map((type) => (
                      <div key={type.id} onClick={() => handleAddApi(type.id, type.label)}>
                        <ApiTypeCard {...type} />
                      </div>
                    ))}
                  </div>

                  {/* Recent Updates Section */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-sm text-gray-900">最近执行</h3>
                      <button
                        onClick={loadRecentUpdates}
                        disabled={loadingRecentUpdatesData}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <RefreshCw className={`w-3 h-3 ${loadingRecentUpdatesData ? 'animate-spin' : ''}`} />
                        <span>刷新</span>
                      </button>
                    </div>
                    <div className="space-y-1">
                      {loadingRecentUpdatesData ? (
                        <div className="text-center text-gray-500 py-4 text-xs">加载中...</div>
                      ) : recentUpdatesData.length === 0 ? (
                        <div className="text-center text-gray-500 py-4 text-xs">暂无数据</div>
                      ) : (
                        recentUpdatesData.map((record) => {
                          // 获取协议类型的图标和颜色配置
                          const getProtocolConfig = (moduleType: string) => {
                            const configs: Record<string, { icon: string; bgColor: string; text: string }> = {
                              'HTTP': { icon: '⚡', bgColor: 'bg-orange-100', text: 'HTTP' },
                              'DUBBO': { icon: '</>', bgColor: 'bg-purple-100', text: 'DUBBO' },
                              'SQL': { icon: '📄', bgColor: 'bg-blue-100', text: 'SQL' },
                              'ROCKETMQ': { icon: '📡', bgColor: 'bg-yellow-100', text: 'ROCKETMQ' },
                              'WEBSOCKET': { icon: '📡', bgColor: 'bg-yellow-100', text: 'WebSocket' },
                              'TCP': { icon: '🔌', bgColor: 'bg-gray-100', text: 'TCP' },
                              'SCRIPT': { icon: '📋', bgColor: 'bg-green-100', text: '脚本' },
                              'FILE': { icon: '📁', bgColor: 'bg-indigo-100', text: '文件' },
                            };
                            return configs[moduleType] || { icon: '📄', bgColor: 'bg-gray-100', text: moduleType };
                          };

                          // 获取模块路径（目录名称）
                          const getNodePath = (nodeId: string): string => {
                            if (!nodeId) return '';
                            // 如果是同步数据（moduleId 为 'plugin-sync'），直接返回"同步数据"
                            if (nodeId === 'plugin-sync') {
                              return '同步数据';
                            }
                            const allNodes = flattenNodes(moduleTree);
                            const node = allNodes.find(n => n.id === nodeId);
                            if (!node) return nodeId;

                            if (node.parentId === 'NONE') {
                              return node.name;
                            }

                            const parent = allNodes.find(n => n.id === node.parentId);
                            if (parent) {
                              const parentPath = getNodePath(parent.id);
                              return parentPath === parent.name
                                ? `${parent.name} / ${node.name}`
                                : `${parentPath} / ${node.name}`;
                            }
                            return node.name;
                          };

                          const protocolConfig = getProtocolConfig(record.moduleType);

                          // 获取接口名称（优先使用 name 字段）
                          const apiName = record.extraData?.name || record.extraData?.interfaceName || record.extraData?.url || `接口 ${record.relatedId}`;

                          // 获取目录名称（从 moduleId 获取）
                          const moduleId = record.extraData?.moduleId || '';
                          const modulePath = moduleId ? getNodePath(moduleId) : '';

                          // 获取描述
                          const description = record.extraData?.description || record.extraData?.method || '';

                          // 格式化时间
                          const formatTimeAgo = (dateString: string): string => {
                            const now = new Date();
                            const date = new Date(dateString);
                            const diffMs = now.getTime() - date.getTime();
                            const diffMins = Math.floor(diffMs / 60000);
                            const diffHours = Math.floor(diffMs / 3600000);
                            const diffDays = Math.floor(diffMs / 86400000);

                            if (diffMins < 1) return '刚刚';
                            if (diffMins < 60) return `${diffMins}分钟前`;
                            if (diffHours < 24) return `${diffHours}小时前`;
                            if (diffDays < 7) return `${diffDays}天前`;
                            return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
                          };

                          // 处理点击跳转
                          const handleRecordClick = () => {
                            const definitionId = record.relatedId;
                            const definition = definitions.find(def => def.id === definitionId);

                            if (definition) {
                              // RocketMQ 和 SCRIPT 直接进入编辑模式，不显示预览页
                              if (definition.protocol === 'ROCKETMQ' || definition.protocol === 'SCRIPT') {
                                const testTypeMap: { [key: string]: OpenedTest['type'] } = {
                                  'HTTP': 'http',
                                  'SQL': 'sql',
                                  'DUBBO': 'dubbo',
                                  'ROCKETMQ': 'rocketmq',
                                  'SCRIPT': 'data-factory',
                                };

                                setOpenedTest({
                                  id: definition.id,
                                  name: definition.name,
                                  type: testTypeMap[definition.protocol] || 'http',
                                  definitionId: definition.id,
                                });
                                setPreviewDefinition(null);
                              } else {
                                // 其他协议显示预览页
                                setPreviewDefinition(definition);
                                setOpenedTest(null)
                              }
                            } else {
                              // 如果找不到定义，根据协议类型打开对应的测试页面
                              const testTypeMap: { [key: string]: OpenedTest['type'] } = {
                                'HTTP': 'http',
                                'SQL': 'sql',
                                'DUBBO': 'dubbo',
                                'ROCKETMQ': 'rocketmq',
                              };

                              setOpenedTest({
                                id: definitionId,
                                name: apiName,
                                type: testTypeMap[record.moduleType] || 'http',
                                definitionId: definitionId,
                              });
                              setPreviewDefinition(null);
                            }
                          };

                          return (
                            <div
                              key={record.id}
                              onClick={handleRecordClick}
                              className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 ${protocolConfig.bgColor} rounded-lg flex items-center justify-center shadow-sm`}>
                                  <span className="text-base">{protocolConfig.icon}</span>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-900">{apiName}</span>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{protocolConfig.text}</span>
                                  </div>
                                  {modulePath && (
                                    <div className="text-xs text-gray-500 mt-0.5">{modulePath}</div>
                                  )}
                                  {!modulePath && description && (
                                    <div className="text-xs text-gray-500 mt-0.5">{description}</div>
                                  )}
                                  {!modulePath && !description && (
                                    <div className="text-xs text-gray-500 mt-0.5">点击可快捷跳转执行</div>
                                  )}
                                </div>
                              </div>
                              <span className="text-xs text-gray-400">{formatTimeAgo(record.createdAt)}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : isRealizationTab ? (
              <WorkflowDesignPageV2
                projectId={projectId}
              />
            ) : selectedTopMenu === 'performance' ? (
              <PerformanceManagementView />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <div className="text-gray-400 mb-2">
                    <span className="text-4xl">🚧</span>
                  </div>
                  <p className="text-gray-500">该功能正在开发中...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <MetadataDialogs
        dialogs={dialogs}
        projectId={projectId}
        moduleTree={moduleTree}
        definitions={definitions}
        selectedDefinitionIds={selectedDefinitionIds}
        currentSelection={currentSelection}
        protocolContext={protocolContext}
        calculateModuleCounts={calculateModuleCounts}
        onBatchMove={handleBatchMove}
        onRefresh={handleRefresh}
        onLoadModuleTree={loadModuleTree}
        onLoadDefinitions={loadDefinitions}
        onLoadDdlImportEnvironments={loadDdlImportEnvironments}
        ddlImportEnvironments={ddlImportEnvironments}
        onDeleteDefinition={handleDeleteDefinition}
        onUpdateCurrentSelection={setCurrentSelection}
      />
    </div>
  );
}
