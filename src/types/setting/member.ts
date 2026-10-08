/**
 * 系统设置-组织成员 相关类型（与 AegisOne 对齐）
 */

export interface MemberItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  enable: boolean;
  createdAt?: number;
  updatedAt?: number;
  language?: string;
  lastOrganizationId?: string;
  source?: string;
  lastProjectId?: string[];
  createUser?: string;
  updateUser?: string;
  deleted?: boolean;
  projectIdNameMap?: { id: string; name: string }[];
  userRoleIdNameMap?: { id: string; name: string }[];
}

export interface MemberListParams {
  current?: number;
  pageSize?: number;
  keyword?: string;
  sort?: Record<string, string>;
  sortString?: string;
  filter?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface MemberListResult {
  total: number;
  list: MemberItem[];
  current?: number;
  pageSize?: number;
}

export interface AddOrUpdateMemberParams {
  organizationId: string;
  memberIds?: string[];
  userRoleIds: string[];
  projectIds?: string[];
  memberId?: string;
}

export interface LinkItem {
  id: string;
  name: string;
  disabled?: boolean;
}

export interface InviteMemberParams {
  organizationId: string;
  inviteEmails: string[];
  userRoleIds: string[];
}
