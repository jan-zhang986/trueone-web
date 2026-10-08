/**
 * 需求质量工作台服务
 * 主路径：QualityWorkspace -> QualityTask -> QualityWorkItem
 */

import { http } from '@/utils/request';

export interface QualityWorkspacePageParams {
  current?: number;
  pageSize?: number;
  projectId?: string;
  keyword?: string;
  statuses?: string[];
  ownerIds?: string[];
  archived?: boolean;
  [key: string]: any;
}

export interface QualityTask {
  taskId: string;
  workspaceId: string;
  projectId: string;
  taskType: string;
  title: string;
  name?: string;
  description?: string;
  status: string;
  ownerId?: string;
  suiteId?: string;
  sourceType?: string;
  sourceId?: string;
  sort?: number;
  metadata?: Record<string, any>;
}

export interface QualityWorkItemPageParams {
  current?: number;
  pageSize?: number;
  projectId?: string;
  workspaceId: string;
  taskId: string;
  keyword?: string;
  statuses?: string[];
  assigneeIds?: string[];
  results?: string[];
  [key: string]: any;
}

export interface QualityWorkItem {
  workItemId: string;
  workspaceId: string;
  taskId: string;
  caseId?: string;
  implementationId?: string;
  sourceSpaceId?: string;
  title: string;
  status?: string;
  assigneeId?: string;
  assigneeName?: string;
  workflowId?: string;
  result?: string;
  evidenceCount?: number;
  runtimeSnapshot?: Record<string, any>;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface QualityWorkItemComment {
  commentId?: string;
  id?: string;
  content?: string;
  createUser?: string;
  createUserName?: string;
  createdAt?: number | string;
  uploadFileIds?: string[];
  attachments?: any[];
  files?: any[];
  [key: string]: any;
}

export interface WorkItemProposal {
  proposalId: string;
  projectId: string;
  spaceId?: string;
  workspaceId?: string;
  workItemId?: string;
  targetCaseId?: string;
  title: string;
  reason?: string;
  status?: string;
  workflowId?: string;
  changeSummary?: Record<string, any>;
  changeItems?: any[];
  metadata?: Record<string, any>;
  createUser?: string;
  updateUser?: string;
  createdAt?: number;
  updatedAt?: number;
  [key: string]: any;
}

export interface ProposalWorkflow {
  proposalId: string;
  workflowSubjectType?: string;
  workflowId?: string;
  currentStatus?: string;
  availableTransitions?: string[];
  transitionHistory?: any[];
  [key: string]: any;
}

export interface ProposalComment {
  commentId?: string;
  id?: string;
  content?: string;
  createUser?: string;
  createUserName?: string;
  createdAt?: number | string;
  [key: string]: any;
}

export interface QualityAnalysisInput {
  inputId?: string;
  inputType: string;
  title?: string;
  content?: string;
  refId?: string;
  refUrl?: string;
  fileId?: string;
  metadata?: Record<string, any>;
}

export interface QualityAnalysisSection {
  sectionId?: string;
  analysisId?: string;
  workspaceId?: string;
  projectId?: string;
  sectionKey: string;
  title: string;
  enabled?: boolean;
  content?: string;
  sort?: number;
  metadata?: Record<string, any>;
}

export interface QualityAnalysisItem {
  itemId?: string;
  analysisId?: string;
  workspaceId?: string;
  projectId?: string;
  sectionKey: string;
  prdNodeId?: string;
  itemType: string;
  title: string;
  description?: string;
  riskLevel?: string;
  ownerId?: string;
  status?: string;
  selected?: boolean;
  workItemId?: string;
  /** 沉淀的统一 Case 资产 ID（生成执行项时自动创建） */
  caseId?: string;
  metadata?: Record<string, any>;
}

export interface PrdDocNode {
  nodeId: string;
  parentId?: string;
  pageindexNodeId?: string;
  level?: number;
  sort?: number;
  title: string;
  body?: string;
  summary?: string;
  lineNum?: number;
  analysisContent?: string;
  itemCount?: number;
  caseCount?: number;
}

export interface PrdDocumentView {
  documentId?: string;
  workspaceId?: string;
  projectId?: string;
  title?: string;
  docDescription?: string;
  contentHash?: string;
  lineCount?: number;
  indexedAt?: number;
  sourceType?: string;
  sourceRef?: string;
  unchanged?: boolean;
  nodes?: PrdDocNode[];
}

export interface PrdDocumentSearchHit {
  nodeId: string;
  title?: string;
  level?: number;
  score?: number;
  reason?: string;
}

export interface PrdDocumentSearchResponse {
  hits?: PrdDocumentSearchHit[];
}

export interface PrdNodeGenerateItemsResponse {
  createdCount?: number;
  prdView?: PrdDocumentView;
  analysis?: QualityAnalysis;
}

export interface QualityAnalysisReviewRecord {
  reviewId?: string;
  analysisId?: string;
  workspaceId?: string;
  projectId?: string;
  reviewStatus?: string;
  content?: string;
  createUser?: string;
  createdAt?: number;
}

export interface QualityAnalysis {
  analysisId: string;
  workspaceId: string;
  projectId: string;
  spaceId?: string;
  title: string;
  status: 'DRAFT' | 'ANALYZED' | 'GENERATED' | string;
  summary?: string;
  riskLevel?: string;
  inputs?: QualityAnalysisInput[];
  impacts?: any[];
  coverage?: any[];
  gaps?: any[];
  sections?: QualityAnalysisSection[];
  items?: QualityAnalysisItem[];
  reviewStatus?: string;
  latestReview?: QualityAnalysisReviewRecord;
  metadata?: Record<string, any>;
}

export interface QualityWorkspaceStats {
  workspaceId?: string;
  total: number;
  todo?: number;
  inProgress?: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  passRate: number;
  executionRate: number;
  actualStartTime?: number;
  allDone?: boolean;
  analysisStatus?: string;
  reviewStatus?: string;
  checkItemTotal?: number;
  riskCount?: number;
  blockedCount?: number;
  releaseConclusion?: string;
}

export const ANALYSIS_STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: '未开始',
  DRAFT: '分析中',
  REVIEWING: '待评审',
  REVIEWED: '已通过',
  NEED_SUPPLEMENT: '需补充',
  GENERATED: '已生成用例',
};

export const REVIEW_STATUS_LABEL: Record<string, string> = {
  NOT_SUBMITTED: '未提交',
  REVIEWING: '待评审',
  REVIEWED: '已通过',
  NEED_SUPPLEMENT: '需补充',
};

export const RELEASE_CONCLUSION_LABEL: Record<string, string> = {
  NEED_ANALYSIS: '待分析',
  NEED_REVIEW: '待评审',
  BLOCKED: '阻塞',
  NOT_RECOMMENDED: '不建议上线',
  CONDITIONAL: '有条件',
  READY: '可上线',
};

export interface QualityReport {
  reportId: string;
  projectId: string;
  workspaceId: string;
  taskId?: string;
  reportType: 'OVERVIEW' | 'STAGE' | string;
  name: string;
  status?: string;
  versionNo?: number;
  latest?: boolean;
  snapshotJson?: Record<string, any>;
  markdownContent?: string;
  metadata?: Record<string, any>;
  createUser?: string;
  updateUser?: string;
  createdAt?: number;
  updatedAt?: number;
}

export const qualityWorkspaceService = {
  /** 获取质量工作台列表 */
  getWorkspaceList: async (params: QualityWorkspacePageParams) => {
    return http.post('/api/quality-workspace/page', params);
  },

  /** 获取质量工作台详情 */
  getWorkspaceDetail: async (id: string) => {
    return http.get(`/api/quality-workspace/${id}`);
  },

  /** 保存/更新质量工作台 */
  saveWorkspace: async (data: any) => {
    return http.post('/api/quality-workspace/save', data);
  },

  /** 归档质量工作台 */
  archiveWorkspace: async (id: string) => {
    return http.post(`/api/quality-workspace/${id}/archive`);
  },

  /** 删除质量工作台 */
  deleteWorkspace: async (id: string) => {
    return http.post(`/api/quality-workspace/${id}/delete`);
  },

  /** 获取质量工作台统计 */
  getWorkspaceStats: async (id: string) => {
    return http.get(`/api/quality-workspace/${id}/stats`);
  },

  /** 生成质量报告快照 */
  generateReport: async (workspaceId: string, data: { reportType: 'OVERVIEW' | 'STAGE'; taskId?: string }) => {
    return http.post(`/api/quality-workspace/${workspaceId}/report/generate`, data);
  },

  /** 获取质量报告列表 */
  getReportPage: async (params: {
    current?: number;
    pageSize?: number;
    projectId: string;
    workspaceId?: string;
    reportType?: string;
    keyword?: string;
    latest?: boolean;
  }) => {
    return http.post('/api/quality-workspace/report/page', params);
  },

  /** 获取质量报告详情 */
  getReportDetail: async (reportId: string) => {
    return http.get(`/api/quality-workspace/report/${reportId}`);
  },

  /** 导出质量报告 Markdown */
  exportReportMarkdown: async (reportId: string) => {
    return http.get(`/api/quality-workspace/report/${reportId}/markdown`, { responseType: 'blob' });
  },

  /** 获取测试任务列表 */
  getTaskList: async (workspaceId: string) => {
    return http.get(`/api/quality-workspace/${workspaceId}/task/list`);
  },

  /** 保存测试任务 */
  saveTask: async (workspaceId: string, data: any) => {
    return http.post(`/api/quality-workspace/${workspaceId}/task/save`, data);
  },

  /** 完成测试任务 */
  completeTask: async (workspaceId: string, taskId: string) => {
    return http.post(`/api/quality-workspace/${workspaceId}/task/${taskId}/complete`);
  },

  /** 重新打开测试任务 */
  reopenTask: async (workspaceId: string, taskId: string) => {
    return http.post(`/api/quality-workspace/${workspaceId}/task/${taskId}/reopen`);
  },

  /** 获取任务执行项列表 */
  getWorkItemPage: async (params: QualityWorkItemPageParams) => {
    const { workspaceId, taskId, ...body } = params;
    return http.post(`/api/quality-workspace/${workspaceId}/task/${taskId}/work-item/page`, body);
  },

  /** 执行单个执行项 */
  runWorkItem: async (workspaceId: string, taskId: string, workItemId: string, data: any) => {
    return http.post(`/api/quality-workspace/${workspaceId}/task/${taskId}/work-item/${workItemId}/run`, data);
  },

  /** 更新执行项负责人 */
  assignWorkItem: async (workspaceId: string, taskId: string, workItemId: string, data: any) => {
    return http.post(`/api/quality-workspace/${workspaceId}/task/${taskId}/work-item/${workItemId}/assign`, data);
  },

  /** 流转执行项状态 */
  transitionWorkItem: async (workspaceId: string, taskId: string, workItemId: string, data: any) => {
    return http.post(`/api/quality-workspace/${workspaceId}/task/${taskId}/work-item/${workItemId}/transition`, data);
  },

  /** 获取执行项详情 */
  getWorkItemDetail: async (workspaceId: string, taskId: string, workItemId: string) => {
    return http.get(`/api/quality-workspace/${workspaceId}/task/${taskId}/work-item/${workItemId}`);
  },

  /** 获取执行项评论 */
  getWorkItemComments: async (workspaceId: string, workItemId: string) => {
    return http.get(`/api/quality-workspace/${workspaceId}/work-item/${workItemId}/comment/list`);
  },

  /** 保存执行项评论，附件复用评论附件链路 */
  saveWorkItemComment: async (workspaceId: string, workItemId: string, data: any) => {
    return http.post(`/api/quality-workspace/${workspaceId}/work-item/${workItemId}/comment/save`, data);
  },

  /** 获取执行历史 */
  getWorkItemRuntimeHistory: async (workspaceId: string, workItemId: string) => {
    return http.get(`/api/quality-workspace/${workspaceId}/work-item/${workItemId}/runtime/history/list`);
  },

  /** 获取运行态详情 */
  getWorkItemRuntimeDetail: async (workspaceId: string, workItemId: string) => {
    return http.get(`/api/quality-workspace/${workspaceId}/work-item/${workItemId}/runtime/detail`);
  },

  /** 获取执行项沉淀提案 */
  getWorkItemProposalList: async (workspaceId: string, workItemId: string) => {
    return http.get(`/api/quality-workspace/${workspaceId}/work-item/${workItemId}/proposal/list`);
  },

  /** 获取提案详情 */
  getProposalDetail: async (proposalId: string) => {
    return http.get(`/api/proposal/${proposalId}`);
  },

  /** 获取提案评审流程视图 */
  getProposalWorkflow: async (proposalId: string) => {
    return http.get(`/api/proposal/${proposalId}/workflow`);
  },

  /** 流转提案状态 */
  transitionProposal: async (proposalId: string, data: { targetStatus: string; comment?: string }) => {
    return http.post(`/api/proposal/${proposalId}/transition`, data);
  },

  /** 获取提案评审意见 */
  getProposalComments: async (proposalId: string) => {
    return http.get(`/api/collab/comment/proposal/${proposalId}`);
  },

  /** 保存提案评审意见 */
  saveProposalComment: async (proposalId: string, data: { content: string }) => {
    return http.post(`/api/collab/comment/proposal/${proposalId}/save`, data);
  },

  /** 从执行项创建沉淀提案 */
  saveWorkItemProposal: async (workspaceId: string, workItemId: string, data: any) => {
    return http.post(`/api/quality-workspace/${workspaceId}/work-item/${workItemId}/proposal/save`, data);
  },

  /** 将沉淀提案合并回统一 Case */
  mergeProposalToCase: async (proposalId: string, data?: any) => {
    return http.post(`/api/proposal/${proposalId}/merge-to-case`, data || {});
  },

  /** 获取质量分析 */
  getAnalysis: async (workspaceId: string) => {
    return http.get(`/api/quality-workspace/${workspaceId}/analysis`);
  },

  /** 保存质量分析 */
  saveAnalysis: async (workspaceId: string, data: Partial<QualityAnalysis>) => {
    return http.post(`/api/quality-workspace/${workspaceId}/analysis/save`, data);
  },

  /** 保存测试分析章节 */
  saveAnalysisSection: async (workspaceId: string, analysisId: string, data: Partial<QualityAnalysisSection>) => {
    return http.post(`/api/quality-workspace/${workspaceId}/analysis/${analysisId}/section/save`, data);
  },

  /** 保存测试分析条目 */
  saveAnalysisItem: async (workspaceId: string, analysisId: string, data: Partial<QualityAnalysisItem>) => {
    return http.post(`/api/quality-workspace/${workspaceId}/analysis/${analysisId}/item/save`, data);
  },

  /** 删除测试分析条目 */
  deleteAnalysisItem: async (workspaceId: string, analysisId: string, itemId: string) => {
    return http.post(`/api/quality-workspace/${workspaceId}/analysis/${analysisId}/item/${itemId}/delete`);
  },

  /** 提交测试分析评审 */
  submitAnalysisReview: async (workspaceId: string, analysisId: string) => {
    return http.post(`/api/quality-workspace/${workspaceId}/analysis/${analysisId}/submit-review`);
  },

  /** 保存测试分析评审结论 */
  reviewAnalysis: async (workspaceId: string, analysisId: string, data: { reviewStatus: 'REVIEWED' | 'NEED_SUPPLEMENT'; content?: string }) => {
    return http.post(`/api/quality-workspace/${workspaceId}/analysis/${analysisId}/review`, data);
  },

  /** 从测试分析条目生成轻量检查项 */
  generateAnalysisCheckItems: async (workspaceId: string, analysisId: string, data?: { itemIds?: string[] }) => {
    return http.post(`/api/quality-workspace/${workspaceId}/analysis/${analysisId}/generate-check-items`, data || {});
  },

  /** 保存参考输入 */
  saveAnalysisInput: async (workspaceId: string, analysisId: string, data: QualityAnalysisInput) => {
    return http.post(`/api/quality-workspace/${workspaceId}/analysis/${analysisId}/input/save`, data);
  },

  /** 保存影响范围 */
  saveAnalysisImpact: async (workspaceId: string, analysisId: string, data: {
    impactId?: string;
    name: string;
    description?: string;
    impactType?: string;
    riskLevel?: string;
    refId?: string;
  }) => {
    return http.post(`/api/quality-workspace/${workspaceId}/analysis/${analysisId}/impact/save`, data);
  },

  /** 删除影响范围 */
  deleteAnalysisImpact: async (workspaceId: string, analysisId: string, impactId: string) => {
    return http.post(`/api/quality-workspace/${workspaceId}/analysis/${analysisId}/impact/${impactId}/delete`);
  },

  /** 保存 Case 覆盖 */
  saveAnalysisCoverage: async (workspaceId: string, analysisId: string, data: {
    coverageId?: string;
    caseId: string;
    impactId?: string;
    realizationType?: string;
    reason?: string;
  }) => {
    return http.post(`/api/quality-workspace/${workspaceId}/analysis/${analysisId}/coverage/save`, data);
  },

  /** 删除 Case 覆盖 */
  deleteAnalysisCoverage: async (workspaceId: string, analysisId: string, coverageId: string) => {
    return http.post(`/api/quality-workspace/${workspaceId}/analysis/${analysisId}/coverage/${coverageId}/delete`);
  },

  /** 保存补充项 */
  saveAnalysisGap: async (workspaceId: string, analysisId: string, data: {
    gapId?: string;
    title: string;
    description?: string;
    impactId?: string;
    gapType?: string;
    priority?: string;
  }) => {
    return http.post(`/api/quality-workspace/${workspaceId}/analysis/${analysisId}/gap/save`, data);
  },

  /** 删除补充项 */
  deleteAnalysisGap: async (workspaceId: string, analysisId: string, gapId: string) => {
    return http.post(`/api/quality-workspace/${workspaceId}/analysis/${analysisId}/gap/${gapId}/delete`);
  },

  /** PRD 树视图（PageIndex） */
  getPrdView: async (workspaceId: string) => {
    return http.get(`/api/quality-workspace/${workspaceId}/prd/view`);
  },

  /** 同步 PRD Markdown 索引 */
  syncPrdDocument: async (
    workspaceId: string,
    data: {
      markdownContent: string;
      fileName?: string;
      sourceType?: string;
      sourceRef?: string;
      withSummary?: boolean;
      model?: string;
    }
  ) => {
    return http.post(`/api/quality-workspace/${workspaceId}/prd/sync`, data);
  },

  /** 保存 PRD 节点测分 */
  savePrdNodeAnalysis: async (workspaceId: string, nodeId: string, data: { content?: string }) => {
    return http.post(`/api/quality-workspace/${workspaceId}/prd/node/${nodeId}/analysis`, data);
  },

  /** 从飞书 PRD 链接同步索引 */
  syncFeishuPrd: async (workspaceId: string) => {
    return http.post(`/api/quality-workspace/${workspaceId}/prd/sync-feishu`);
  },

  /** PRD 树节点检索 */
  searchPrdNodes: async (workspaceId: string, data: { query: string; topK?: number; useLlm?: boolean }) => {
    return http.post(`/api/quality-workspace/${workspaceId}/prd/search`, data);
  },

  /** 从 PRD 节点生成测试点 */
  generatePrdNodeItems: async (
    workspaceId: string,
    nodeId: string,
    data?: { replaceExisting?: boolean; maxItems?: number; useLlm?: boolean }
  ) => {
    return http.post(`/api/quality-workspace/${workspaceId}/prd/node/${nodeId}/generate-items`, data ?? {});
  },

  /** 查询测试计划-需求与测试差分对账大图 */
  getDiffMatrix: async (workspaceId: string) => {
    return http.get(`/api/quality-workspace/${workspaceId}/diff-matrix`);
  },

  /** 同步本地CLI或Git资产推入对账矩阵 */
  syncDiffMatrix: async (workspaceId: string, data: any) => {
    return http.post(`/api/quality-workspace/${workspaceId}/diff-matrix/sync`, data);
  },

  /** 用例执行结果与运行时证据上报 */
  reportCaseExecution: async (workspaceId: string, data: any) => {
    return http.post(`/api/quality-workspace/${workspaceId}/diff-matrix/case/report`, data);
  },

  /** 云端自主执行 AST 解析与对账矩阵同步 */
  autoParseDiffMatrix: async (workspaceId: string, data?: { repoPath?: string }) => {
    return http.post(`/api/quality-workspace/${workspaceId}/diff-matrix/auto-parse`, data || {});
  },
};
