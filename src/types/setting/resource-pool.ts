/**
 * 系统设置-资源池 相关类型（与 AegisOne 对齐）
 */

export type ResourcePoolType = 'Node' | 'Kubernetes';

export interface NodesListItem {
  ip: string;
  port: string;
  concurrentNumber: number;
  singleTaskConcurrentNumber?: number;
}

export interface OrgIdNameMap {
  id: string;
  name: string;
}

export interface TestResourceDTO {
  nodesList?: NodesListItem[];
  ip?: string;
  token?: string;
  namespace?: string;
  concurrentNumber?: number;
  singleTaskConcurrentNumber?: number;
  podThreads?: number;
  jobDefinition?: string;
  deployName?: string;
  uiGrid?: string;
  girdConcurrentNumber?: number;
  orgIds?: string[];
  orgIdNameMap?: OrgIdNameMap[];
}

export interface ResourcePoolItem {
  id: string;
  name: string;
  description?: string;
  type: ResourcePoolType;
  enable: boolean;
  apiTest?: boolean;
  uiTest?: boolean;
  serverUrl?: string;
  allOrg?: boolean;
  maxConcurrentNumber?: number;
  orgNames?: string;
  createdAt?: number;
  updatedAt?: number;
  testResourceDTO?: TestResourceDTO;
}

export interface ResourcePoolListParams {
  current?: number;
  pageSize?: number;
  keyword?: string;
  sort?: Record<string, string>;
  sortString?: string;
  filter?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ResourcePoolListResult {
  total: number;
  list: ResourcePoolItem[];
  current?: number;
  pageSize?: number;
}

export interface AddResourcePoolParams {
  name: string;
  description?: string;
  type: ResourcePoolType;
  enable?: boolean;
  apiTest?: boolean;
  uiTest?: boolean;
  serverUrl?: string;
  allOrg?: boolean;
  testResourceDTO?: Partial<TestResourceDTO>;
}

export interface UpdateResourcePoolParams extends AddResourcePoolParams {
  id: string;
}
