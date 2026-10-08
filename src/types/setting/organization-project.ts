/**
 * 系统设置-组织与项目 相关类型（与 AegisOne 对齐）
 */

export interface CreateOrUpdateSystemOrgParams {
  id?: string;
  name: string;
  description: string;
  userIds: string[];
}

export interface CreateOrUpdateSystemProjectParams {
  id?: string;
  name: string;
  description?: string;
  enable?: boolean;
  userIds?: string[];
  organizationId?: string;
  moduleIds?: string[];
  resourcePoolIds?: string[];
  allResourcePool?: boolean;
}

/** 组织/项目列表项（表格行，接口共用类似结构） */
export interface OrgProjectTableItem {
  id: string;
  name: string;
  description?: string;
  enable: boolean;
  organizationId?: string;
  organizationName?: string;
  num?: number;
  updatedAt?: number;
  createdAt?: number;
  memberCount?: number;
  projectCount?: number;
  createUser?: string;
  deleted?: boolean;
  remainDayCount?: number;
  userIds?: string[];
  orgAdmins?: { id: string; name: string }[];
}

export interface OrgProjectListParams {
  current?: number;
  pageSize?: number;
  keyword?: string;
  sort?: Record<string, string>;
  sortString?: string;
  filter?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface OrgProjectListResult {
  total: number;
  list: OrgProjectTableItem[];
  current?: number;
  pageSize?: number;
}

export interface OrgProjectCountResult {
  organizationTotal: number;
  projectTotal: number;
}

/** 添加成员弹窗 - 可选的用户列表项 */
export interface OrgProjectMemberOption {
  id: string;
  name: string;
  email?: string;
  memberFlag?: boolean;
}

export interface MemberListParams {
  current?: number;
  pageSize?: number;
  keyword?: string;
  organizationId?: string;
  projectId?: string;
  sourceId?: string;
}

export interface MemberListResult {
  total: number;
  list: OrgProjectMemberOption[];
  current?: number;
  pageSize?: number;
}

/** 添加组织/项目成员参数 */
export interface AddOrgOrProjectMemberParams {
  userIds: string[];
  userRoleIds?: string[];
  organizationId?: string;
  projectId?: string;
}

/** 当前成员列表项（组织/项目成员侧滑用） */
export interface CurrentMemberItem {
  id: string;
  name: string;
  email?: string;
  userRoleIds?: string[];
  userRoleIdNameMap?: { id: string; name: string }[];
}

export interface CurrentMemberListResult {
  total: number;
  list: CurrentMemberItem[];
  current?: number;
  pageSize?: number;
}
