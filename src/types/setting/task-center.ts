/**
 * 系统设置-任务中心 相关类型（与 AegisOne 对齐）
 */

export type TaskCenterType = 'system' | 'organization';

export type ExecuteStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'RERUNNING' | 'STOPPED';
export type ExecuteResult = 'SUCCESS' | 'ERROR' | 'FAKE_ERROR';
export type ExecuteTriggerMode = 'MANUAL' | 'BATCH' | 'API' | 'SCHEDULE';
export type ExecuteTaskType =
  | 'API_CASE'
  | 'API_CASE_BATCH'
  | 'API_SCENARIO'
  | 'API_SCENARIO_BATCH'
  | 'TEST_PLAN_API_CASE'
  | 'TEST_PLAN_API_CASE_BATCH'
  | 'TEST_PLAN_API_SCENARIO'
  | 'TEST_PLAN_API_SCENARIO_BATCH'
  | 'TEST_PLAN'
  | 'TEST_PLAN_GROUP';

/** 用例任务列表项 */
export interface TaskCenterTaskItem {
  id: string;
  reportId?: string;
  num: number;
  taskName: string;
  status: ExecuteStatus;
  caseCount?: number;
  result?: ExecuteResult;
  taskType?: ExecuteTaskType;
  resourceId?: string;
  triggerMode?: ExecuteTriggerMode;
  projectId?: string;
  organizationId?: string;
  createdAt?: number;
  createUser?: string;
  startTime?: number;
  endTime?: number;
  organizationName?: string;
  projectName?: string;
  createUserName?: string;
  [key: string]: unknown;
}

/** 系统后台任务列表项 */
export interface TaskCenterSystemTaskItem {
  id: string;
  organizationName?: string;
  projectName?: string;
  projectId?: string;
  organizationId?: string;
  reportId?: string;
  taskName: string;
  resourceId?: string;
  num?: number;
  resourceType?: string;
  resourceNum?: number;
  value?: string; // cron 表达式
  nextTime?: number;
  enable: boolean;
  createUserId?: string;
  createUserName?: string;
  createdAt?: number;
  [key: string]: unknown;
}

/** 任务列表查询参数 */
export interface TaskCenterListParams {
  current?: number;
  pageSize?: number;
  keyword?: string;
  sort?: Record<string, string>;
  sortString?: string;
  filter?: Record<string, unknown>;
  [key: string]: unknown;
}

/** 任务列表结果 */
export interface TaskCenterListResult<T> {
  total: number;
  list: T[];
  current?: number;
  pageSize?: number;
}

/** 用例任务详情列表项 */
export interface TaskCenterTaskDetailItem {
  id: string;
  reportId?: string;
  taskId?: string; // 任务ID
  resourceId?: string;
  resourceName?: string; // 用例名称
  taskOrigin?: string; // 任务来源
  status: ExecuteStatus; // 执行状态
  result?: ExecuteResult; // 执行结果
  resourcePoolId?: string; // 资源池ID
  resourcePoolNode?: string; // 资源池节点
  resourcePoolNodeStatus?: boolean; // 资源池节点状态
  resourceType?: string; // 资源类型
  projectId?: string;
  organizationId?: string;
  threadId?: string; // 线程ID
  startTime?: number;
  endTime?: number;
  executor?: string;
  taskName?: string;
  userName?: string;
  resourcePoolName?: string;
  triggerMode?: ExecuteTriggerMode; // 触发方式
  lineNum?: number | string; // 行号
  errorMessage?: string; // 错误信息
  num?: number; // 任务编号
  [key: string]: unknown;
}

/** 批量操作参数 */
export interface TaskCenterBatchParams extends TaskCenterListParams {
  taskId?: string;
  batchType?: string;
  resourcePoolIds?: string[];
  resourcePoolNodes?: string[];
}
