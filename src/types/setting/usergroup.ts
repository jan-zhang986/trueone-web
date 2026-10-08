/**
 * 系统设置-用户组 相关类型（与 AegisOne 对齐）
 */

export type UserGroupScope = 'SYSTEM' | 'ORGANIZATION' | 'PROJECT';

export interface UserGroupItem {
  id: string;
  name: string;
  description?: string;
  internal?: boolean;
  type?: string;
  createdAt?: number;
  updatedAt?: number;
  createUser?: string;
  scopeId?: string;
  pos?: number;
}

export interface SystemUserGroupParams {
  id?: string;
  name?: string;
  scopeId?: string;
  type?: string;
}

export interface OrgUserGroupParams {
  id?: string;
  name: string;
  scopeId: string;
  type?: string;
}

/** 用户组内成员（列表项，含关联 id） */
export interface UserGroupMemberItem {
  id: string; // 关联 id，移除时使用
  userId?: string;
  name: string;
  email?: string;
  phone?: string;
  enable?: boolean;
  createdAt?: number;
  [key: string]: string | boolean | number | undefined;
}

export interface UserGroupMemberListParams {
  roleId: string;
  current?: number;
  pageSize?: number;
  keyword?: string;
}

export interface UserGroupMemberListResult {
  total: number;
  list: UserGroupMemberItem[];
  current?: number;
  pageSize?: number;
}

/** 添加成员到用户组 - 系统 */
export interface AddSystemUserToGroupParams {
  roleId: string;
  userIds: string[];
}

/** 添加成员到用户组 - 组织 */
export interface AddOrgUserToGroupParams {
  userRoleId: string;
  userIds: string[];
  organizationId: string;
}

/** 添加成员时可选的用户项（下拉） */
export interface UserGroupOptionItem {
  id: string;
  name: string;
  email?: string;
  checkRoleFlag?: boolean;
  exclude?: boolean;
}

/** 用户组权限配置（与 AegisOne 对齐） */
export interface UserGroupPermissionItem {
  id: string;
  name: string;
  enable?: boolean;
  license?: boolean;
}

export interface UserGroupAuthSetting {
  id: string;
  name: string;
  type?: string;
  license?: boolean;
  enable?: boolean;
  permissions?: UserGroupPermissionItem[];
  /** 子节点（操作对象），部分后端可能用 permissionList 等 */
  children?: UserGroupAuthSetting[];
  permissionList?: UserGroupPermissionItem[];
}

/** 保存权限时单项 */
export interface SavePermissionItem {
  id: string;
  enable: boolean;
}

/** 保存权限请求体 */
export interface SavePermissionPayload {
  userRoleId: string;
  permissions: SavePermissionItem[];
}
