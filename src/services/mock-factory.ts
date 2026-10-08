/**
 * Mock 工厂服务
 * 提供Mock服务的CRUD功能
 */

import { http } from '@/utils/request';

/**
 * Mock 规则特征（HTTP类型）
 */
export interface HttpRuleFeatures {
  url?: string;
  method?: string;
  appCode?: string;
}

/**
 * Mock 规则特征（DUBBO类型）
 */
export interface DubboRuleFeatures {
  applicationName?: string;
  interfaceName?: string;
  methodName?: string;
  paramTypes?: string[];
}

/**
 * Mock 规则特征（联合类型）
 */
export type RuleFeatures = HttpRuleFeatures | DubboRuleFeatures;

/**
 * Mock 响应结构
 */
export interface MockRespStruct {
  responseTypes: 'String' | 'Object' | 'List' | 'Int' | 'Boolean' | 'python_script';
  content: any;
}

/**
 * Mock 规则特征信息
 */
export interface MockFeatures {
  rule: string;
  ruleType: 'HTTP' | 'DUBBO';
}

/**
 * Mock 规则数据
 */
export interface MockRule {
  id?: number;
  sceneCode: string;
  sceneName?: string; // 场景名称（从后端返回）
  serviceCode: string;
  status: number; // 0-停用, 1-启用
  ruleFeatures: RuleFeatures;
  respStruct: MockRespStruct;
  features: MockFeatures;
  createdAt?: string;
  updatedAt?: string;
  author?: string;
}

/**
 * Mock 场景数据
 */
export interface MockScene {
  id?: number;
  sceneCode: string;
  sceneName: string;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Mock 规则列表查询参数
 */
export interface MockRuleListParams {
  serviceCode?: string;
  sceneCode?: string;
  page?: number;
  size?: number;
  author?: string;
}

/**
 * Mock 规则列表响应
 */
export interface MockRuleListResponse {
  data: MockRule[];
  total: number;
}

/**
 * Mock 场景列表查询参数
 */
export interface MockSceneListParams {
  sceneName?: string;
  author?: string;
}

/**
 * Mock 历史记录
 */
export interface MockHistory {
  id: number;
  ruleId: number;
  content: any;
  createdAt: string;
}

/**
 * 获取当前用户邮箱
 */
const getCurrentUserEmail = (): string => {
  return localStorage.getItem('currentemail') || '';
};

export const mockFactoryService = {
  /**
   * 获取 Mock 规则列表
   */
  getMockList: async (params?: MockRuleListParams): Promise<MockRuleListResponse> => {
    const author = getCurrentUserEmail();
    const response = await http.post<{
      data: MockRule[];
      total: number;
      page?: number;
      size?: number;
      totalPages?: number;
    }>('/spotter-data-forge/mock/rule/list', {
      ...params,
      author,
    });
    
    // 响应拦截器已经提取了 data.data，所以这里 response 就是 { data: [...], total: ... }
    if (response && typeof response === 'object') {
      return {
        data: response.data || [],
        total: response.total || 0,
      };
    }
    
    // 兼容其他格式
    return {
      data: Array.isArray(response) ? response : [],
      total: 0,
    };
  },

  /**
   * 添加 Mock 规则
   */
  addMockData: async (data: Omit<MockRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<MockRule> => {
    return http.post<MockRule>('/spotter-data-forge/mock/rule/add', data);
  },

  /**
   * 更新 Mock 规则状态
   */
  updateMockStatus: async (id: number, status: number): Promise<void> => {
    return http.post('/spotter-data-forge/mock/rule/status/update', {
      id,
      status,
    });
  },

  /**
   * 删除 Mock 规则
   */
  delMock: async (id: number): Promise<void> => {
    return http.post('/spotter-data-forge/mock/rule/del', {
      id,
    });
  },

  /**
   * 更新 Mock 规则
   */
  updateMockData: async (data: MockRule): Promise<MockRule> => {
    return http.post<MockRule>('/spotter-data-forge/mock/rule/modify', data);
  },

  /**
   * 查看 Mock 历史记录
   */
  viewHistory: async (id: number): Promise<MockHistory[]> => {
    return http.get<MockHistory[]>(`/spotter-data-forge/mock/histry/${id}`);
  },

  /**
   * 添加 Mock 场景
   */
  addMockScene: async (sceneName: string): Promise<MockScene> => {
    const author = getCurrentUserEmail();
    return http.post<MockScene>('/spotter-data-forge/mock/scene/add', {
      sceneName,
      author,
    });
  },

  /**
   * 编辑 Mock 场景
   */
  editMockScene: async (id: number, sceneName: string): Promise<MockScene> => {
    return http.post<MockScene>('/spotter-data-forge/mock/scene/modify', {
      id,
      sceneName,
    });
  },

  /**
   * 查询 Mock 场景列表
   */
  queryMockScene: async (params?: MockSceneListParams): Promise<MockScene[]> => {
    const response = await http.post<{
      code: number;
      message: string;
      data: MockScene[];
    }>('/spotter-data-forge/mock/scene/list', params || {});
    
    // 处理响应格式
    if (response && typeof response === 'object' && 'data' in response) {
      return response.data || [];
    }
    
    // 兼容其他格式
    return Array.isArray(response) ? response : [];
  },
};
