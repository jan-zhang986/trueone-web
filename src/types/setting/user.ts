/**
 * 系统设置-用户 相关类型（与 AegisOne 对齐）
 */

export interface UserRoleListItem {
  id: string;
  name: string;
  description?: string;
  internal?: boolean;
  type?: string;
  createdAt?: number;
  updatedAt?: number;
  createUser?: string;
  scopeId?: string;
}

export interface OrganizationListItem {
  id: string;
  num?: number;
  name: string;
  description?: string;
  createdAt?: number;
  updatedAt?: number;
  createUser?: string;
  updateUser?: string;
  deleted?: boolean;
  deleteUser?: string;
  deleteTime?: number;
  enable?: boolean;
}

export interface UserListItem {
  id: string;
  name: string;
  email: string;
  password?: string;
  enable: boolean;
  createdAt?: number;
  updatedAt?: number;
  language?: string;
  lastOrganizationId?: string;
  phone?: string;
  source?: string;
  lastProjectId?: string;
  createUser?: string;
  updateUser?: string;
  organizationList: OrganizationListItem[];
  userRoleList: UserRoleListItem[];
  userRoles?: UserRoleListItem[];
}

export interface SimpleUserInfo {
  id?: string;
  name: string;
  email: string;
  phone?: string;
}

export interface UpdateUserInfoParams extends SimpleUserInfo {
  id: string;
  userRoleIdList: string[];
}

export interface CreateUserParams {
  userInfoList: SimpleUserInfo[];
  userRoleIdList: string[];
}

export interface CreateUserResult {
  errorEmails: Record<string, unknown> | null;
  successList: unknown[];
}

export interface SystemRole {
  id: string;
  name: string;
  selected?: boolean;
  closeable?: boolean;
}

/** 列表查询参数 */
export interface UserListQueryParams {
  current?: number;
  pageSize?: number;
  keyword?: string;
  sort?: Record<string, string>;
}

/** 列表响应 */
export interface UserListResult {
  total: number;
  list: UserListItem[];
  current?: number;
  pageSize?: number;
}

/** 批量操作基础参数 */
export interface BatchApiParams {
  selectIds: string[];
  excludeIds?: string[];
  selectAll: boolean;
  condition: Record<string, unknown>;
  currentSelectCount?: number;
}

/** 批量加入用户组/组织/项目参数 */
export interface BatchAddParams extends BatchApiParams {
  roleIds: string[];
}

/** 导入用户结果 */
export interface ImportUserResult {
  successCount: number;
  importCount: number;
  errorMessages?: Record<string, string>;
}

/** 组织/项目下拉项（用于批量加入选择） */
export interface OrgsItem {
  id: string;
  name: string;
  children?: OrgsItem[];
  disabled?: boolean;
}

export interface UpdateUserStatusParams extends BatchApiParams {
  enable: boolean;
}

export type DeleteUserParams = BatchApiParams;
export type ResetUserPasswordParams = BatchApiParams;
