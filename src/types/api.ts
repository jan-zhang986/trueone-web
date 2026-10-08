/**
 * API 相关类型定义
 */

// 通用响应类型
export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message?: string;
  msg?: string;
}

// 分页响应类型
export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 分页请求参数
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// 认证相关
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken?: string;
  user: UserInfo;
}

export interface UserInfo {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  roles?: string[];
}

// 项目相关
export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// API 接口相关
export interface ApiItem {
  id: string;
  name: string;
  type: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'SQL' | 'TCP' | 'WebSocket' | 'DUBBO' | 'RocketMQ';
  projectId: string;
  groupId?: string;
  category: string;
  config: any;
  createdAt: string;
  updatedAt: string;
}

// 测试报告相关
export interface TestReport {
  id: string;
  name: string;
  projectId: string;
  status: 'success' | 'failed' | 'running';
  duration: number;
  createdAt: string;
  details?: any;
}

// 工作流相关
export interface Workflow {
  id: string;
  name: string;
  projectId: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowNode {
  id: string;
  type: string;
  data: any;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

// ==================== 测试用例管理类型（基于 AegisOne） ====================

// 测试用例状态
export type TestCaseStatus = 'PENDING' | 'UNDERWAY' | 'PASS' | 'UN_PASS' | 'RE_REVIEW';

// 测试用例执行结果
export type TestCaseExecuteResult = 'NOT_EXECUTED' | 'PASS' | 'FAIL' | 'BLOCKED' | 'SKIP';

// 测试用例等级
export type TestCaseLevel = 'P0' | 'P1' | 'P2' | 'P3';

// 模块节点
export interface ModuleTreeNode {
  id: string;
  name: string;
  type: string;
  parentId: string;
  children?: ModuleTreeNode[];
  attachInfo?: Record<string, any>;
  count?: number;
}

// 测试用例详情
export interface TestCaseDetail {
  id: string;
  num: number;
  moduleId: string;
  projectId: string;
  templateId: string;
  name: string;
  reviewStatus: TestCaseStatus;
  tags?: any;
  caseEditType?: 'STEP' | 'TEXT';
  prerequisite?: string;
  pos: number;
  versionId: string;
  refId: string;
  lastExecuteResult?: TestCaseExecuteResult;
  deleted: boolean;
  publicCase: boolean;
  latest: boolean;
  createUser: string;
  updateUser: string;
  deleteUser?: string;
  createdAt: string;
  updatedAt: string;
  deleteTime?: string;
  steps?: string;
  customFields?: any[];
  [key: string]: any;
}

// 测试步骤
export interface TestCaseStep {
  id: string;
  num?: string;
  step: string;
  expected: string;
  showStep?: boolean;
  showExpected?: boolean;
  actualResult?: string;
  executeResult?: TestCaseExecuteResult;
  status?: string;
}

// 测试用例列表查询参数
export interface TestCaseListParams extends PaginationParams {
  projectId?: string;
  moduleId?: string;
  keyword?: string;
  reviewStatus?: TestCaseStatus;
  lastExecuteResult?: TestCaseExecuteResult;
  createUser?: string;
  [key: string]: any;
}

// 测试用例列表响应
export interface TestCaseListResponse {
  list: TestCaseDetail[];
  total: number;
  page: number;
  pageSize: number;
}

// 创建/更新测试用例请求
export interface CreateOrUpdateTestCaseRequest {
  projectId: string;
  moduleId: string;
  name: string;
  steps?: TestCaseStep[];
  prerequisite?: string;
  tags?: string[];
  customFields?: any[];
  [key: string]: any;
}

// 批量操作请求
export interface BatchOperationRequest {
  ids: string[];
  projectId: string;
  [key: string]: any;
}

// 模块操作请求
export interface CreateModuleRequest {
  projectId: string;
  name: string;
  parentId: string;
}

export interface UpdateModuleRequest {
  id: string;
  name: string;
}

