/**
 * 系统设置-日志 相关类型（与 AegisOne 对齐）
 */

export interface LogListParams {
  keyword?: string;
  filter?: Record<string, string[]>;
  combine?: Record<string, unknown>;
  current: number;
  pageSize: number;
  sort?: Record<string, string>;
  sortString?: string;
  operUser?: string;
  startTime: number;
  endTime: number;
  projectIds?: string[];
  organizationIds?: string[];
  type?: string;
  module?: string;
  content?: string;
  level?: string;
}

export interface OptionsItem {
  id: string;
  name: string;
}

export interface LogOptions {
  organizationList: OptionsItem[];
  projectList: OptionsItem[];
}

export interface LogItem {
  id: string;
  createUser?: string;
  userName: string;
  projectId?: string;
  projectName?: string;
  organizationId?: string;
  organizationName?: string;
  module?: string;
  type?: string;
  content?: string;
  createdAt: number;
  sourceId?: string;
  /** 操作结果，系统/组织/项目日志可能返回（兼容多种字段名） */
  status?: 'SUCCESS' | 'FAILED';
  result?: string | boolean;
  operationStatus?: string;
  state?: string;
}

export interface LogListResult {
  total: number;
  list: LogItem[];
  current?: number;
  pageSize?: number;
}

export interface LogUserItem {
  id: string;
  name: string;
  email?: string;
}
