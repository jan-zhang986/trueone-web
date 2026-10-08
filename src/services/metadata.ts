/**
 * 元数据管理服务
 * 提供元数据模块树和定义列表的获取功能
 */

import { http } from '@/utils/request';

/**
 * 元数据模块树节点
 */
export interface MetadataModuleNode {
  id: string;
  name: string;
  type: 'API' | 'SQL' | 'DUBBO' | 'ROCKETMQ' | 'TCP' | 'WEBSOCKET' | 'FILE' | 'SCRIPT' | 'WORKFLOW';
  parentId: string;
  projectId: string;
  children: MetadataModuleNode[];
  attachInfo: Record<string, any>;
  count: number;
  path: string;
}

/**
 * 元数据定义项
 */
export interface MetadataDefinition {
  id: string;
  projectId: string;
  spaceId?: string;
  moduleId: string;
  name: string;
  protocol: 'HTTP' | 'SQL' | 'DUBBO' | 'ROCKETMQ' | 'TCP' | 'WEBSOCKET' | 'SCRIPT' | 'FILE';
  version: number;
  isLatest: boolean;
  description?: string;
  requestConfig?: any;
  responseConfig?: any;
  scriptContent?: string | null;
  tags?: string[];
  createUser: string;
  createdAt: number;
  updatedAt: number;
  deletedTime?: number | null;
  isCase?: boolean; // 是否为测试数据
}

/**
 * 分页查询参数
 */
export interface MetadataDefinitionPageParams {
  projectId: string;
  spaceId?: string;
  current: number;
  pageSize: number;
  moduleId?: string;
  keyword?: string; // 搜索关键词
  createUser?: string; // 创建人搜索
}

/**
 * 新增元数据定义参数
 */
export interface AddMetadataDefinitionParams {
  name: string;
  protocol: 'HTTP' | 'SQL' | 'DUBBO' | 'ROCKETMQ' | 'TCP' | 'WEBSOCKET' | 'SCRIPT' | 'FILE';
  projectId: string;
  spaceId?: string;
  moduleId: string;
  description?: string;
  tags?: string[];
  requestConfig?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    [key: string]: any;
  };
  responseConfig?: {
    schema?: any;
    [key: string]: any;
  };
  scriptContent?: string | null;
  isCase?: boolean; // 是否为测试数据
}

/**
 * 添加模块参数
 */
export interface AddModuleParams {
  projectId: string;
  name: string;
  parentId: string;
  moduleType: 'API' | 'SQL' | 'DUBBO' | 'ROCKETMQ' | 'TCP' | 'WEBSOCKET' | 'FILE' | 'SCRIPT' | 'WORKFLOW';
  typeId?: string;
}

/**
 * 修改模块参数
 */
export interface UpdateModuleParams {
  id: string;
  name: string;
}

/**
 * 导入 Swagger 参数
 */
export interface ImportSwaggerParams {
  url: string;
  serviceCode: string;
  projectId: string;
  spaceId?: string;
  moduleId: string;
}

/**
 * 导入 DUBBO Swagger 参数
 */
export interface ImportDubboSwaggerParams {
  url: string;
  moduleId: string;
  projectId: string;
  spaceId?: string;
}

/**
 * 更新元数据定义参数
 */
export interface UpdateMetadataDefinitionParams {
  id: string;
  name: string;
  spaceId?: string;
  moduleId: string;
  description?: string;
  tags?: string[];
  requestConfig?: {
    url?: string;
    path?: string;
    method?: string;
    headers?: Record<string, string>;
    query?: Record<string, string>;
    body?: any;
    raw?: string;
    bodyType?: string;
    [key: string]: any;
  };
  responseConfig?: {
    schema?: any;
    [key: string]: any;
  };
  scriptContent?: string | null;
}

/**
 * 批量移动元数据定义参数
 */
export interface BatchMoveMetadataDefinitionParams {
  ids: string[];
  moduleId: string;
}

/**
 * 用户环境配置项
 */
export interface UserProfile {
  id: string;
  name: string;
  [key: string]: any;
}

/**
 * 用户环境分页查询参数
 */
export interface UserProfilePageParams {
  projectId: string;
  current: number;
  pageSize: number;
}

export interface MetadataModuleTreeParams {
  typeId?: string;
  moduleType?: AddModuleParams['moduleType'];
}

export interface MetadataFileResource {
  id: string;
  projectId: string;
  spaceId?: string;
  storageName?: string;
  storageType?: string;
  path?: string;
  fileSize?: number;
  extension?: string;
  contentType?: string;
  checksum?: string;
  category?: string;
  createUser?: string;
  createdAt?: number;
  deletedTime?: number | null;
}

export const metadataService = {
  /**
   * 获取元数据模块树
   * @param projectId 项目ID
   */
  getModuleTree: async (projectId: string, params?: MetadataModuleTreeParams): Promise<MetadataModuleNode[]> => {
    return http.get(`/metadata/module/tree/${projectId}`, {
      params: {
        ...(params?.typeId ? { typeId: params.typeId } : {}),
        ...(params?.moduleType ? { moduleType: params.moduleType } : {}),
      },
    });
  },

  /**
   * 分页获取元数据定义列表
   * @param params 查询参数
   */
  getDefinitionPage: async (params: MetadataDefinitionPageParams): Promise<MetadataDefinition[]> => {
    return http.post('/metadata/definition/page', params);
  },

  /**
   * 新增元数据定义
   * @param params 新增参数
   */
  addDefinition: async (params: AddMetadataDefinitionParams): Promise<MetadataDefinition> => {
    return http.post('/metadata/definition/add', params);
  },

  /**
   * 添加模块
   * @param params 添加模块参数
   */
  addModule: async (params: AddModuleParams): Promise<MetadataModuleNode> => {
    return http.post('/metadata/module/add', params);
  },

  /**
   * 删除模块
   * @param moduleId 模块ID
   */
  deleteModule: async (moduleId: string): Promise<void> => {
    return http.get(`/metadata/module/delete/${moduleId}`);
  },

  /**
   * 修改模块
   * @param params 修改模块参数
   */
  updateModule: async (params: UpdateModuleParams): Promise<MetadataModuleNode> => {
    return http.post('/metadata/module/update', params);
  },

  /**
   * 导入 Swagger
   * @param params 导入参数
   */
  importSwagger: async (params: ImportSwaggerParams): Promise<void> => {
    return http.post('/metadata/definition/import/swagger', params);
  },

  /**
   * 导入 DUBBO Swagger
   * @param params 导入参数
   */
  importDubboSwagger: async (params: ImportDubboSwaggerParams): Promise<void> => {
    return http.post('/metadata/definition/import/dubbo/swagger', params);
  },

  /**
   * 更新元数据定义
   * @param params 更新参数
   */
  updateDefinition: async (params: UpdateMetadataDefinitionParams): Promise<MetadataDefinition> => {
    return http.post('/metadata/definition/update', params);
  },

  /**
   * 批量移动元数据定义
   * @param params 批量移动参数
   */
  batchMoveDefinitions: async (params: BatchMoveMetadataDefinitionParams): Promise<void> => {
    return http.post('/metadata/definition/batch/move/module', params);
  },

  /**
   * 获取用户环境列表
   * @param params 查询参数
   */
  getUserProfilePage: async (params: UserProfilePageParams): Promise<UserProfile[]> => {
    return http.post('/user/profile/page', params);
  },

  /**
   * 获取元数据定义详情
   * @param id 定义ID
   */
  getDefinition: async (id: string): Promise<MetadataDefinition | null> => {
    try {
      return await http.get(`/metadata/definition/get/${id}`);
    } catch (error: any) {
      // 如果元数据不存在（404或其他错误），返回 null
      if (error?.response?.status === 404 || error?.message?.includes('不存在')) {
        return null;
      }
      // 其他错误也返回 null，避免影响工作流加载
      return null;
    }
  },

  /**
   * 删除元数据定义
   * @param id 定义ID
   */
  deleteDefinition: async (id: string): Promise<void> => {
    return http.get(`/metadata/definition/delete/${id}`);
  },

  /**
   * 复制元数据定义
   * @param id 定义ID
   */
  copyDefinition: async (id: string): Promise<void> => {
    return http.post(`/metadata/definition/copy/${id}`);
  },

  /**
   * 工作流节点用：按 projectId 上传文件，返回 fileId（执行机将按 fileId 调平台下载接口取文件）
   * @param file 文件对象
   * @param projectId 项目ID（后端接口 id 参数）
   */
  uploadFileForWorkflow: async (file: File, projectId: string): Promise<{ fileId: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await http.post(`/metadata/definition/file/upload?id=${encodeURIComponent(projectId)}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    if (typeof response === 'string') {
      return { fileId: response };
    }
    if (response && typeof response === 'object' && 'fileId' in response) {
      return response as { fileId: string };
    }
    if (response && typeof response === 'object') {
      const fileId = (response as any).fileId ?? (response as any).id ?? (response as any).data;
      if (fileId) {
        return { fileId: String(fileId) };
      }
    }
    throw new Error('上传文件失败：无法获取文件ID');
  },

  /**
   * 上传文件
   * @param file 文件对象
   * @param moduleId 模块ID
   */
  uploadFile: async (file: File, projectId: string, spaceId?: string): Promise<{ fileId: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    // 使用 http.post，但需要特殊处理 multipart/form-data
    // axios 会自动设置 Content-Type 为 multipart/form-data，不需要手动设置
    const params = new URLSearchParams({ id: projectId });
    if (spaceId) {
      params.set('spaceId', spaceId);
    }
    const response = await http.post(`/metadata/definition/file/upload?${params.toString()}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    // 处理不同的响应格式
    // 如果返回的是字符串（文件ID），转换为对象格式
    if (typeof response === 'string') {
      return { fileId: response };
    }
    // 如果返回的是对象且包含 fileId，直接返回
    if (response && typeof response === 'object' && 'fileId' in response) {
      return response as { fileId: string };
    }
    // 如果返回的是对象但没有 fileId，尝试查找可能的文件ID字段
    if (response && typeof response === 'object') {
      const fileId = (response as any).fileId || (response as any).id || (response as any).data;
      if (fileId) {
        return { fileId: String(fileId) };
      }
    }
    
    throw new Error('上传文件失败：无法获取文件ID');
  },

  /**
   * 下载文件
   * @param fileId 文件ID
   */
  downloadFile: async (fileId: string): Promise<Blob> => {
    return http.get(`/metadata/definition/file/download/${fileId}`, {
      responseType: 'blob',
    });
  },

  /**
   * 查询文件资源列表
   */
  listFiles: async (params: { projectId: string; spaceId?: string; category?: string }): Promise<MetadataFileResource[]> => {
    return http.get('/metadata/definition/file/list', { params });
  },
};

/**
 * 插件同步节点数据接口
 */
export interface PluginSyncNode {
  nodeId: string;
  email: string;
  nodeType: 'HTTP' | 'SQL' | 'DUBBO' | 'ROCKETMQ';
  endpointData: any;
  createdAt: number;
  updatedAt: number;
}

/**
 * 更新插件同步节点参数
 */
export interface UpdatePluginSyncNodeParams {
  nodeId: string;
  endpointData: any;
}

/**
 * 插件同步节点服务
 */
export const pluginSyncNodeService = {
  /**
   * 获取当前用户的插件同步节点列表
   */
  getNodes: async (): Promise<PluginSyncNode[]> => {
    return http.get('/workflow/plugin-sync-node/list');
  },

  /**
   * 根据节点类型获取当前用户的插件同步节点列表
   * @param nodeType 节点类型（HTTP/SQL/DUBBO/ROCKETMQ）
   */
  getNodesByType: async (nodeType: 'HTTP' | 'SQL' | 'DUBBO' | 'ROCKETMQ'): Promise<PluginSyncNode[]> => {
    return http.get(`/workflow/plugin-sync-node/list/${nodeType}`);
  },

  /**
   * 更新插件同步节点
   * @param params 更新参数
   */
  updateNode: async (params: UpdatePluginSyncNodeParams): Promise<void> => {
    return http.post('/workflow/plugin-sync-node/update', params);
  },
};
