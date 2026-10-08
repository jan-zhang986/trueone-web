/**
 * Log Management Type Definitions
 * 日志管理相关类型定义
 */

// 操作类型
export type OperationType = 
  | 'ADD'
  | 'DELETE'
  | 'UPDATE'
  | 'DEBUG'
  | 'REVIEW'
  | 'COPY'
  | 'EXECUTE'
  | 'SHARE'
  | 'RESTORE'
  | 'IMPORT'
  | 'EXPORT'
  | 'LOGIN'
  | 'SELECT'
  | 'RECOVER'
  | 'LOGOUT'
  | 'ASSOCIATE'
  | 'DISASSOCIATE'
  | 'ARCHIVED'
  | 'STOP'
  | 'RERUN';

// 操作范围
export type OperationScope = 'SYSTEM' | 'ORGANIZATION' | 'PROJECT';

// 操作日志数据模型
export interface OperationLog {
  id: string;
  operUser: string;
  userName: string;
  organizationId: string;
  organizationName: string;
  projectId: string;
  projectName: string;
  module: string;
  type: OperationType;
  content: string;
  createdAt: string;
  sourceId?: string;
  details?: Record<string, any>;
}

// 日志查询参数
export interface LogQueryParams {
  projectId?: string;
  operUser?: string;
  startTime?: number;
  endTime?: number;
  level?: OperationScope;
  type?: OperationType;
  module?: string;
  content?: string;
  projectIds?: string[];
  organizationIds?: string[];
  current: number;
  pageSize: number;
  sort?: Record<string, string>;
}

// 日志查询结果
export interface LogQueryResult {
  list: OperationLog[];
  total: number;
  pageSize: number;
  current: number;
}

// 日志筛选器状态
export interface LogFilters {
  operator?: string;
  startTime?: Date;
  endTime?: Date;
  scope?: OperationScope;
  type?: OperationType;
  module?: string;
  content?: string;
}

// 日志选项
export interface LogOptions {
  organizationList: Array<{ id: string; name: string }>;
  projectList: Array<{ id: string; name: string }>;
}

// 用户选项
export interface UserOption {
  id: string;
  name: string;
  email: string;
}
