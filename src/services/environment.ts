/**
 * 环境管理服务
 * 提供环境配置的增删改查功能
 */

import { http } from '@/utils/request';

// 环境配置类型
export type EngineType = 'API' | 'SQL' | 'DUBBO' | 'ROCKETMQ' | 'FILE';

export type EnvCode = 'DEV' | 'TST' | 'PRE' | 'PRD';

// 机器人配置
export interface RobotsConfig {
  enabled?: boolean;
  webhook?: string;
  channels?: string[];
  [key: string]: any;
}

// 数据端点配置（字段已重命名）
export interface DataEndpoint {
  data_host?: string;
  data_port?: number;
  data_user?: string;
  data_password?: string;
  database?: string;
  charset?: string;
  connect_timeout?: number;
  read_timeout?: number;
  write_timeout?: number;
}

// XXL-Job 配置（字段已重命名）
export interface XxlJobInfo {
  xxjob_url?: string;
  xxljobuser?: string;
  xxljobpassword?: string;
}

// MQ 配置
export interface MqInfo {
  mq_url: string;
}

// DUBBO 配置
export interface DubboInfo {
  dubbo_url: string;
}

// 变量配置
export interface Variables {
  [key: string]: any;
}

// 环境配置
export interface Environment {
  id?: string;
  projectId: string;
  name: string;
  engineType: EngineType;
  envCode: EnvCode;
  domain: string;
  robots?: RobotsConfig;
  dataEndpoint?: DataEndpoint;
  variables?: Variables;
  xxljobInfo?: XxlJobInfo;
  mqInfo?: MqInfo;
  dubboInfo?: DubboInfo;
  createdAt?: string;
  updatedAt?: string;
  createUser?: string;
  updateUser?: string;
}

// 添加环境参数
export interface AddEnvironmentParams {
  projectId: string;
  name: string;
  engineType: EngineType;
  envCode: EnvCode;
  domain: string;
  robots?: RobotsConfig;
  dataEndpoint?: DataEndpoint;
  variables?: Variables;
  xxljobInfo?: XxlJobInfo;
  mqInfo?: MqInfo;
  dubboInfo?: DubboInfo;
}

// 更新环境参数
export interface UpdateEnvironmentParams {
  id: string;
  name?: string;
  engineType?: EngineType;
  envCode?: EnvCode;
  domain?: string;
  robots?: RobotsConfig;
  dataEndpoint?: DataEndpoint;
  variables?: Variables;
  xxljobInfo?: XxlJobInfo;
  mqInfo?: MqInfo;
  dubboInfo?: DubboInfo;
}

// 环境列表查询参数
export interface EnvironmentListParams {
  projectId: string;
  current?: number;
  pageSize?: number;
}

// 分页响应
export interface PageResponse<T> {
  records: T[];
  total: number;
  current: number;
  pageSize: number;
}

export const environmentService = {
  /**
   * 添加环境配置
   */
  addEnvironment: async (params: AddEnvironmentParams): Promise<Environment> => {
    return http.post('/user/profile/add', params);
  },

  /**
   * 更新环境配置
   */
  updateEnvironment: async (params: UpdateEnvironmentParams): Promise<Environment> => {
    return http.post('/user/profile/update', params);
  },

  /**
   * 获取环境列表（分页）
   * 注意：API 返回的是数组，需要转换为分页格式
   */
  getEnvironmentList: async (params: EnvironmentListParams): Promise<PageResponse<Environment>> => {
    const response = await http.post<Environment[]>('/user/profile/page', {
      projectId: params.projectId,
      current: params.current || 1,
      pageSize: params.pageSize || 10,
    });
    
    // API 返回的是数组，转换为分页格式
    if (Array.isArray(response)) {
      return {
        records: response,
        total: response.length,
        current: params.current || 1,
        pageSize: params.pageSize || 10,
      };
    }
    
    // 如果已经是分页格式，直接返回
    return response as PageResponse<Environment>;
  },

  /**
   * 删除环境配置
   */
  deleteEnvironment: async (id: string): Promise<void> => {
    return http.get(`/user/profile/delete/${id}`);
  },
};

