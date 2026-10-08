export interface UserInfo {
  id: string;
  name: string;
  email: string;
}

export interface TestReport {
  id: string;
  name: string;
  createdAt: string;
  executor: string;
  totalTests: number;
  successTests: number;
  successWorkflows?: number;
  failedTests: number;
  failedWorkflows?: number;
  successRate: number;
  executionDuration: number;
  generationDuration: number;
  status: 'completed' | 'running' | 'failed';
  workflows: number;
  tags: string[];
  reportType?: 'MANUAL' | 'AUTO' | 'SCHEDULE';
  projectId?: string;
  triggerType?: string;
  startTime?: number;
  endTime?: number;
  skippedTests?: number;
  pendingTests?: number;
  avgDurationSeconds?: number;
  summary?: string;
  environmentId?: string;
  environmentName?: string;
  updatedAt?: number;
}
