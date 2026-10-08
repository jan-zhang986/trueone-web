/**
 * 项目管理相关类型定义
 * 基于 AegisOne 项目管理功能
 */

import { PaginationParams } from './api';

// ==================== 基础信息 ====================

export interface ProjectBasicInfo {
  id: string;
  num: number;
  organizationId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: number;
  updateUser: string;
  createUser: string;
  deleteTime?: number;
  deleted: boolean;
  deleteUser?: string;
  enable: boolean;
  moduleSetting: string;
  memberCount: number;
  organizationName: string;
  adminList: ProjectAdmin[];
  projectCreateUserIsAdmin: boolean;
  moduleIds: string[];
  resourcePoolList: { name: string; id: string }[];
}

export interface ProjectAdmin {
  id: string;
  name: string;
  email: string;
  password?: string;
  enable: boolean;
  createdAt: string;
  updatedAt: number;
  language: string;
  lastOrganizationId: string;
  phone: string;
  source: string;
  lastProjectId: string;
  createUser: string;
  updateUser: string;
  deleted: boolean;
  adminFlag: boolean;
  memberFlag: boolean;
  checkRoleFlag: boolean;
  sourceId: string;
}

export interface UpdateProjectParams {
  organizationId?: string;
  name: string;
  description: string;
  enable?: boolean;
  moduleIds?: string[];
  id?: string;
  userIds?: string[];
}

// ==================== 项目管理成员 ====================

export interface ProjectMemberItem {
  id?: string;
  name: string;
  email: string;
  password?: string;
  enable: boolean;
  createdAt: number | string;
  updatedAt: number | string;
  language: string;
  lastOrganizationId: string;
  phone: string;
  source: string;
  lastProjectId: string;
  createUser: string;
  updateUser: string;
  deleted: boolean;
  userRoles: ProjectUserGroup[];
  showUserSelect?: boolean;
  selectUserList?: string[];
}

export interface ProjectUserGroup {
  id: string;
  name: string;
  description: string;
  internal: boolean;
  type: string;
  createdAt: number | string;
  updatedAt: number | string;
  createUser: string;
  scopeId: string;
}

export interface ActionProjectMemberParams {
  userId?: string;
  projectId?: string;
  userIds?: (string | number)[] | string;
  roleIds?: (string | number)[] | string;
}

export interface InviteMemberParams {
  inviteEmails: string[];
  userRoleIds: string[];
  organizationId: string;
  projectId: string;
}

// ==================== 项目版本 ====================

export interface ProjectVersion {
  id?: string;
  name: string;
  description?: string;
  status?: boolean;
  publishTime?: number;
  latest?: boolean;
  projectId: string;
  createdAt?: number;
  createUser?: string;
}

export interface ProjectVersionOption {
  name: string;
  id: string;
  latest: boolean;
  enable: boolean;
}

// ==================== 环境管理 ====================

export interface EnvironmentListItem {
  mock?: boolean;
  name: string;
  id: string;
  description: string;
  createdAt?: number;
  updatedAt?: number;
  createUser?: string;
  updateUser?: string;
  pos?: number;
  projectId?: string;
}

export interface EnvironmentDetail {
  id?: string;
  projectId: string;
  name: string;
  config: EnvironmentConfig;
  mock?: boolean;
  description?: string;
}

export interface EnvironmentConfig {
  id?: string;
  commonParams?: CommonParams;
  commonVariables: KeyValueParam[];
  httpConfig: KeyValueParam[];
  dataSources: DataSourceItem[];
  hostConfig: KeyValueParam;
  preProcessorConfig?: ProcessorConfig;
  postProcessorConfig?: ProcessorConfig;
  assertionConfig?: AssertionConfig;
  pluginConfigMap?: KeyValueParam;
  name?: string;
}

export interface CommonParams {
  requestTimeout: number;
  responseTimeout: number;
  [key: string]: any;
}

export interface KeyValueParam {
  key: string;
  value: string;
  valid?: boolean;
  description?: string;
  [key: string]: any;
}

export interface DataSourceItem {
  id: string;
  dataSource: string;
  driverId: string;
  dbUrl: string;
  username: string;
  password: string;
  poolMax?: number;
  timeout?: number;
}

export interface ProcessorConfig {
  apiProcessorConfig: {
    scenarioProcessorConfig: {
      processors: any[];
    };
    requestProcessorConfig: {
      processors: any[];
    };
  };
}

export interface AssertionConfig {
  assertions: any[];
}

export interface EnvironmentGroup {
  id: string;
  name: string;
  description: string;
  projectId: string;
  environmentGroupInfo?: EnvironmentGroupProject[];
}

export interface EnvironmentGroupProject {
  projectId: string;
  environmentId: string;
}

export interface GlobalParam {
  id?: string;
  projectId: string;
  globalParams: GlobalParamItem;
}

export interface GlobalParamItem {
  headers: KeyValueParam[];
  commonVariables: KeyValueParam[];
}

// ==================== 文件管理 ====================

export type FileStorageType = 'GIT' | 'OSS' | 'LOCAL';

export interface ProjectFileItem {
  id: string;
  name: string;
  originalName: string;
  fileType: string;
  tags: string[];
  description: string;
  updateUser: string;
  updatedAt: number;
  previewSrc?: string;
  size: number;
  enable: boolean;
  branch?: string;
  filePath?: string;
  fileVersion?: string;
  storage?: FileStorageType;
  projectId?: string;
  moduleName?: string;
  moduleId?: string;
  createUser?: string;
  createdAt?: number;
}

export interface FileUploadParams {
  request: {
    projectId: string;
    moduleId: string;
    enable: boolean;
  };
  file: File;
}

export interface FileUpdateParams {
  id: string;
  name?: string;
  tags?: (string | number)[];
  description?: string;
  moduleId?: string;
}

export interface FileReuploadParams {
  request: {
    fileId: string;
    enable: boolean;
  };
  file: File;
}

export interface FileBatchParams {
  selectIds?: string[];
  excludeIds?: string[];
  selectAll?: boolean;
  projectId: string;
  fileType: string;
  moduleIds: string[];
  moveModuleId?: string | number;
}

export interface FileHistoryItem {
  id: string;
  fileVersion: string;
  updateHistory: string;
  operator: string;
  operateTime: number;
}

export interface Repository {
  id: string;
  name: string;
  type: string;
  parentId: string;
  children: string[];
  attachInfo: Record<string, any>;
  count: number;
}

export interface RepositoryInfo {
  id: string;
  name: string;
  platform: string;
  token: string;
  userName: string;
  url: string;
  projectId: string;
}

// ==================== 公共脚本 ====================

export type ScriptLanguage = 'groovy' | 'python' | 'javascript';

export interface CommonScriptItem {
  id: string;
  projectId: string;
  name: string;
  tags: string[];
  description: string;
  type: ScriptLanguage;
  status: string;
  createdAt: number;
  updatedAt: number;
  createUser: string;
  updateUser: string;
  createUserName: string;
  params: string;
  script: string;
  result: string;
}

export interface CommonScriptParams {
  id?: string;
  projectId: string;
  name: string;
  type: ScriptLanguage;
  status: string;
  tags: string[];
  description: string;
  params: string;
  script: string;
  result: string;
}

export interface ScriptTestParams {
  type: string;
  params: {
    key: string;
    value: string;
    valid: boolean;
  }[];
  script: string;
  projectId: string;
}

export interface ScriptChangeHistory {
  id: string;
  projectId: string;
  createdAt: string;
  createUser: string;
  sourceId: string;
  type: string;
  module: string;
  refId: string;
  createUserName: string;
  versionName: string;
}

// ==================== 消息管理 ====================

export type RobotPlatform = 'DING_TALK' | 'LARK' | 'WE_COM' | 'CUSTOM' | 'IN_SITE' | 'MAIL';
export type DingTalkType = 'CUSTOM' | 'ENTERPRISE';

export interface Robot {
  id: string;
  name: string;
  platform: RobotPlatform;
  webhook: string;
  enable: boolean;
  description?: string;
  projectId: string;
  type?: DingTalkType;
  appKey?: string;
  appSecret?: string;
  createUser: string;
  createdAt: number;
  updateUser?: string;
  updatedAt?: number;
}

export interface RobotCreateParams {
  name: string;
  platform: 'DING_TALK' | 'LARK' | 'WE_COM' | 'CUSTOM';
  webhook: string;
  enable: boolean;
  description?: string;
  projectId: string;
  type?: DingTalkType;
  appKey?: string;
  appSecret?: string;
}

export interface MessageTask {
  event: string;
  eventName: string;
  receivers: MessageReceiver[];
  projectRobotConfigMap: Record<string, RobotConfig>;
}

export interface MessageReceiver {
  id: string;
  name: string;
}

export interface RobotConfig {
  robotId: string;
  robotName: string;
  platform: RobotPlatform;
  type?: DingTalkType;
  dingType?: DingTalkType;
  enable: boolean;
  template: string;
  defaultTemplate: string;
  useDefaultTemplate: boolean;
  previewSubject?: string;
  previewTemplate?: string;
  subject: string;
  defaultSubject: string;
  useDefaultSubject: boolean;
}

export interface MessageItem {
  projectId: string;
  type: string;
  name: string;
  messageTaskTypeList: MessageTaskType[];
}

export interface MessageTaskType {
  taskType: string;
  taskTypeName: string;
  messageTaskDetailList: MessageTask[];
}

export interface MessageTemplateParams {
  projectId: string;
  taskType: string;
  dingType?: string;
  event: string;
  receiverIds: string[];
  testId?: string;
  robotId: string;
  enable: boolean;
  template: string;
  subject: string;
  useDefaultTemplate: boolean;
  useDefaultSubject: boolean;
}

// ==================== 菜单管理 ====================

export interface MenuListItem {
  module: string;
  moduleEnable: boolean;
  moduleDesc?: string;
  children?: any[];
  type?: string;
}

export interface MenuConfigItem {
  [key: string]: any;
}

export interface ResourcePoolOption {
  id: string;
  name: string;
}

// ==================== 查询参数 ====================

export interface ProjectQueryParams extends PaginationParams {
  projectId?: string;
  organizationId?: string;
  keyword?: string;
  moduleId?: string;
  [key: string]: any;
}

export interface EnvironmentQueryParams {
  projectId: string;
  keyword?: string;
}

export interface FileListQueryParams extends PaginationParams {
  moduleIds: string[];
  fileType: string;
  projectId: string;
}

export interface CommonScriptQueryParams extends PaginationParams {
  projectId: string;
  keyword?: string;
  type?: ScriptLanguage;
  status?: string;
}

export interface MemberQueryParams extends PaginationParams {
  projectId: string;
  keyword?: string;
  filter?: {
    roleIds?: string[];
  };
}

