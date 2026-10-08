/**
 * 工作流测试报告服务
 * 提供测试报告的分页查询、详情查看、删除和标签管理功能
 */

import { http } from '@/utils/request';

/**
 * 分页查询测试报告列表的请求参数
 */
export interface TestReportQueryRequest {
  current: number;      // 当前页码，从1开始
  pageSize: number;     // 每页显示数量
  projectId?: string;   // 项目ID
  keyword?: string;     // 关键词搜索（报告名称/报告ID/执行人）
  status?: string;      // 状态筛选（completed/running/failed）
  reportType?: string;  // 报告类型（MANUAL/AUTO/SCHEDULE）
  startTime?: number;   // 开始时间戳
  endTime?: number;     // 结束时间戳
}

/**
 * 分页查询工作流执行记录的请求参数
 */
export interface WorkflowExecutionQueryRequest {
  current: number;      // 当前页码，从1开始
  pageSize: number;     // 每页显示数量
  reportId: string;     // 报告ID（必需）
  keyword?: string;     // 关键词搜索（工作流名称）
  status?: string;      // 状态筛选（success/failed/running/cancelled）
}

/**
 * 分页响应
 */
export interface Pager<T> {
  total: number;        // 总记录数
  list: T[];           // 当前页的数据列表（后端返回的字段名是 list）
  pageSize: number;    // 每页大小
  current: number;     // 当前页码
}

/**
 * 测试报告列表顶部统计（与列表同条件）
 */
export interface TestReportStats {
  total: number;
  completed: number;
  running: number;
  failed: number;
  avgSuccessRate: number;
}

/**
 * 测试报告VO
 */
export interface TestReportVO {
  reportId: string;
  projectId: string;
  reportName: string;
  reportType?: 'MANUAL' | 'AUTO' | 'SCHEDULE';
  tags: string[];
  executor: string;
  triggerType?: string;
  status: string;
  startTime: number;
  endTime: number;
  durationMs: number; // 报告生成耗时（毫秒）：从reportId生成到所有workflow完成的时间差
  executionDurationMs?: number; // 执行时长（毫秒）：所有workflow执行耗时的总和
  totalWorkflows: number;
  totalTests: number;
  successTests: number;
  successWorkflows?: number;
  failedTests: number;
  failedWorkflows?: number;
  skippedTests: number;
  pendingTests: number;
  successRate: number;
  avgDurationSeconds: number;
  summary: string;
  environmentId?: string;
  environmentName?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * 工作流执行记录VO
 */
export interface WorkflowExecutionVO {
  id: string;           // 前端使用的id
  runId: string;       // 运行ID
  reportId: string;     // 报告ID
  workflowId: string;   // 工作流ID
  workflowName: string; // 工作流名称
  status: 'success' | 'failed' | 'running' | 'cancelled';
  startTime: number;    // 开始时间戳
  endTime: number;      // 结束时间戳
  duration: number;     // 耗时（秒）
  totalNodes: number;   // 总节点数
  successNodes: number; // 成功节点数
  failedNodes: number;  // 失败节点数
  skippedNodes: number; // 跳过节点数
  pendingNodes: number; // 待处理节点数
  executor: string;     // 执行人
  environmentId?: string;
  environmentName?: string;
}

/**
 * 测试报告详情 VO
 */
export interface TestReportDetailVO {
  reportId: string;
  projectId: string;
  reportName: string;
  reportType?: 'MANUAL' | 'AUTO' | 'SCHEDULE';
  tags: string[];
  executor: string;
  triggerType?: string;
  status: string; // RUNNING/COMPLETED/FAILED/CANCELLED
  startTime: number; // 开始时间（毫秒）
  endTime: number; // 结束时间（毫秒）
  durationMs: number; // 总耗时（毫秒）
  totalWorkflows: number;
  totalTests: number;
  successTests: number;
  failedTests: number;
  skippedTests: number;
  pendingTests: number;
  successRate: number; // 成功率（百分比）
  avgDurationSeconds: number; // 平均执行时长（秒）
  summary: string;
  resultSummary?: Record<string, any>; // 详细结果摘要
  environmentId?: string;
  environmentName?: string;
  reportFileId?: string;
  createdAt: number;
  createUser?: string;
  updatedAt: number;
  updateUser?: string;
}

/**
 * 更新标签请求
 */
export interface UpdateTagsRequest {
  tags: string[];
}

export const workflowTestReportService = {
  /**
   * 分页查询测试报告列表
   */
  getTestReportPage: async (params: TestReportQueryRequest): Promise<Pager<TestReportVO>> => {
    return http.post('/workflow-test-report/page', params);
  },

  /**
   * 获取测试报告统计（总报告数、已完成、运行中、失败、平均成功率），与列表同筛选条件
   */
  getTestReportStats: async (params: Omit<TestReportQueryRequest, 'current' | 'pageSize'>): Promise<TestReportStats> => {
    return http.post('/workflow-test-report/stats', { ...params, current: 1, pageSize: 10 });
  },

  /**
   * 查询测试报告详情
   */
  getTestReportDetail: async (reportId: string) => {
    return http.get(`/workflow-test-report/detail/${reportId}`);
  },

  /**
   * 分页查询工作流执行记录列表
   */
  getWorkflowExecutionPage: async (params: WorkflowExecutionQueryRequest): Promise<Pager<WorkflowExecutionVO>> => {
    return http.post('/workflow-test-report/executions/page', params);
  },

  /**
   * 删除测试报告
   */
  deleteTestReport: async (reportId: string) => {
    return http.post(`/workflow-test-report/delete/${reportId}`);
  },

  /**
   * 更新测试报告标签
   */
  updateTestReportTags: async (reportId: string, tags: string[]) => {
    return http.post(`/workflow-test-report/tags/${reportId}`, { tags });
  },

  /**
   * 更新测试报告名称
   */
  updateTestReportName: async (reportId: string, reportName: string) => {
    return http.post(`/workflow-test-report/name/${reportId}`, { reportName });
  },
};

