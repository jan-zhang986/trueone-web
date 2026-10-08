/**
 * 工作流相关类型定义
 */

export interface ExecutionLog {
  id: string;
  nodeId: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  timestamp: string;
  startTime?: string | number;
  description: string;
  duration?: number;
  runId?: string; // 运行ID，用于获取详情
  runStepId?: string; // 运行步骤ID，用于获取日志
  parentId?: string; // 父节点ID，用于树形结构
  stepDetail?: { // 步骤执行详情
    requestData?: any;
    responseData?: any;
    assertion?: any[];
    extractVars?: any;
    errorMsg?: string;
    errorStack?: string;
  };
  consoleLogs?: Array<{ // 控制台日志
    logId: number;
    level: string;
    content: string;
    logTime: number;
  }>;
}

export interface DebugHistoryItem {
  runId: string;
  workflowName: string;
  triggerUser: string;
  triggerType: string;
  status: string;
  environmentName?: string;
  createdAt?: number;
  startTime?: number;
  duration?: number;
  durationMs?: number;
  steps?: any[];
}

export type DebugMode = 'single' | 'all';

