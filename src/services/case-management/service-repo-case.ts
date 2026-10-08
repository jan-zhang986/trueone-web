/**
 * 代码工程化用例库 (Test as Code) API 服务
 */
import { http } from '@/utils/request';

export interface CaseRepoItem {
  id: string;
  name: string;
  code: string;
  projectId?: string;
  spaceId?: string;
  defaultBranch?: string;
  description?: string;
  creator?: string;
  branches?: string[];
  caseCount?: number;
  gitUrl?: string;
  gitPlatform?: string;
  testsDir?: string;
  localPath?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface RepoTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'folder' | 'file';
  caseCount?: number;
  passRate?: number;
  children?: RepoTreeNode[];
}

export interface TestCaseStep {
  stepNumber: number;
  name: string;
  expected: string;
  status: 'ready' | 'running' | 'passed' | 'failed';
  durationMs?: number;
}

export interface UnifiedTestCase {
  id: string;
  code: string;
  title: string;
  priority: 'P0' | 'P1' | 'P2';
  status: 'passed' | 'failed' | 'ready';
  fileId?: string;
  folderId?: string;
  reqSource?: string;
  module?: string;
  precondition?: string;
  steps: TestCaseStep[];
  gitRepo?: string;
  gitBranch?: string;
  gitFilePath: string;
  functionName: string;
  scriptLanguage?: string;
  codeContent?: string;
  lastCommitHash?: string;
  lastCommitTime?: string;
  author?: string;
  lastExecutionTime?: string;
  executionDuration?: string;
}

export interface QueryCasesResult {
  total: number;
  page: number;
  pageSize: number;
  records: UnifiedTestCase[];
}

export interface CommitCodePayload {
  repositoryId?: string;
  branch?: string;
  filePath: string;
  codeContent: string;
  commitMessage?: string;
  author?: string;
}

export const repoCaseService = {
  /**
   * 获取当前项目的用例库列表
   */
  listRepositories: (projectId?: string, spaceId?: string) => {
    return http.get<CaseRepoItem[]>('/api/case/repository/list', {
      params: { projectId, spaceId },
    });
  },

  /**
   * 创建新的用例库
   */
  createRepository: (data: Partial<CaseRepoItem>) => {
    return http.post<CaseRepoItem>('/api/case/repository/create', data);
  },

  /**
   * 获取指定用例库详情
   */
  getRepositoryDetail: (id: string) => {
    return http.get<CaseRepoItem>(`/api/case/repository/get-detail/${id}`);
  },

  /**
   * 更新用例库
   */
  updateRepository: (data: Partial<CaseRepoItem>) => {
    return http.post<CaseRepoItem>('/api/case/repository/update', data);
  },

  /**
   * 删除用例库
   */
  deleteRepository: (id: string) => {
    return http.post<boolean>(`/api/case/repository/delete/${id}`);
  },

  /**
   * 获取用例仓代码工程目录树 (含各节点用例计数)
   */
  getRepoTree: (id: string, branch?: string) => {
    return http.get<RepoTreeNode>(`/api/case/repository/${id}/tree`, {
      params: { branch },
    });
  },

  /**
   * 检索用例列表 (支持目录层级、关键词、优先级与分页)
   */
  queryCases: (
    id: string,
    params: {
      branch?: string;
      dirPath?: string;
      keyword?: string;
      priority?: string;
      page?: number;
      pageSize?: number;
    }
  ) => {
    return http.get<QueryCasesResult>(`/api/case/repository/${id}/cases`, {
      params,
    });
  },

  /**
   * 获取用例详情 (含设计步骤与代码实现)
   */
  getCaseDetail: (id: string, caseId: string) => {
    return http.get<UnifiedTestCase>(`/api/case/repository/${id}/case-detail`, {
      params: { caseId },
    });
  },

  /**
   * 在线修改代码并提交 (Commit to Git)
   */
  commitCode: (id: string, payload: CommitCodePayload) => {
    return http.post<boolean>(`/api/case/repository/${id}/commit`, payload);
  },

  /**
   * 手动触发代码仓重新扫描与索引
   */
  syncRepository: (id: string, branch?: string) => {
    return http.post<boolean>(`/api/case/repository/${id}/sync`, null, {
      params: { branch },
    });
  },

  /**
   * 实时获取用例库的 Git 真实分支与 Tag 列表
   */
  getRepositoryBranches: (id: string) => {
    return http.get<{
      defaultBranch: string;
      branches: string[];
      tags?: string[];
    }>(`/api/case/repository/${id}/branches`);
  },

  /**
   * 为用例库创建新分支
   */
  createRepositoryBranch: (
    id: string,
    data: { branchName: string; baseBranch?: string; desc?: string }
  ) => {
    return http.post<boolean>(`/api/case/repository/${id}/branches`, data);
  },
};

