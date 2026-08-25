/**
 * 用例管理 - 类型定义
 * 从 aegis-next-server 迁移，与 CaseManagementTable 保持一致
 */

export interface CaseItem {
  id: string;
  num?: string | number;
  name: string;
  projectId: string;
  moduleId?: string;
  moduleName?: string;
  /** 用例类型：FUNCTIONAL / API / UI_AUTOMATION / PERF */
  type?: string;
  caseType?: string;
  /** 用例等级（从 customFields 解析） */
  caseLevel?: string;
  /** 评审结果：UN_REVIEWED/UNDER_REVIEWED/PASS/UN_PASS/RE_REVIEWED */
  reviewStatus?: string;
  /** 执行结果：PENDING/SUCCESS/ERROR/BLOCKED/SKIPPED */
  lastExecuteResult?: string;
  tags?: string[] | any;
  customFields?: any[];
  createTime?: number | string;
  updateTime?: number | string;
  deleteTime?: number | string;
  createUser?: string;
  updateUser?: string;
  deleteUser?: string;
  createUserName?: string;
  updateUserName?: string;
  deleteUserName?: string;
  /** 是否 AI 创建（用例生成保存的用例） */
  aiCreate?: boolean;
  realizations?: CaseRealization[];
  realizationSummary?: CaseRealizationSummary;
  [key: string]: any;
}

export interface ModuleTreeNode {
  id: string;
  name: string;
  parentId: string;
  children?: ModuleTreeNode[];
  count?: number;
}

/** 用例编辑模式：步骤模式 / 文本模式 */
export type CaseEditType = 'STEP' | 'TEXT';

/** 步骤列表项 */
export interface StepListItem {
  id: string;
  step: string;
  expected: string;
  showStep?: boolean;
  showExpected?: boolean;
}

/** 创建或更新用例参数 */
export interface CreateOrUpdateCaseRequest {
  id?: string;
  projectId: string;
  templateId?: string;
  name: string;
  prerequisite?: string;
  caseEditType?: CaseEditType;
  steps?: string;
  textDescription?: string;
  expectedResult?: string;
  description?: string;
  publicCase?: boolean;
  moduleId: string;
  versionId?: string;
  tags?: string[];
  workflowId?: string;
  customFields?: { fieldId: string; value: string }[];
  uploadFileIds?: string[];
  relateFileMetaIds?: string[];
  deleteFileMetaIds?: string[];
  unLinkFilesIds?: string[];
  [key: string]: any;
}

export type CaseRealizationType = 'MANUAL' | 'API' | 'UI_AUTOMATION' | 'FLOW' | 'PERF';

export interface CaseRealizationSummary {
  caseId: string;
  totalSlots?: number;
  realizedCount?: number;
  manualCount?: number;
  apiCount?: number;
  uiAutomationCount?: number;
  perfCount?: number;
  flowCount?: number;
  automationCount?: number;
  enabledCount?: number;
  readyCount?: number;
  hasAutomationRealization?: boolean;
  automationCoverageStatus?: 'NONE' | 'PARTIAL' | 'AUTOMATED_ONLY' | string;
  coveredTypes?: CaseRealizationType[] | string[];
}

export interface CaseRealization {
  caseId: string;
  realizationType: CaseRealizationType | string;
  realized?: boolean;
  enabled?: boolean;
  status?: string;
  workflowDefinitionId?: string;
  workflowName?: string;
  workflowCategory?: string;
  workflowStatus?: string;
  lastRunStatus?: string;
  lastRunTime?: number | string;
  lastDurationMs?: number;
  workflowDefinition?: Record<string, any> | null;
}

/** 用例详情（API 返回） */
export interface CaseDetail {
  id: string;
  caseId?: string;
  num?: number;
  moduleId: string;
  moduleName?: string;
  projectId: string;
  templateId?: string;
  name: string;
  reviewStatus?: string;
  tags?: string[];
  caseEditType?: string;
  versionId?: string;
  publicCase?: boolean;
  latest?: boolean;
  createUser?: string;
  steps?: string;
  textDescription?: string;
  expectedResult?: string;
  prerequisite?: string;
  description?: string;
  workflowId?: string;
  customFields?: { fieldId: string; value: string }[];
  attachments?: { id?: string; attachmentId?: string; fileId?: string; fileName?: string; local?: boolean }[];
  functionalPriority?: string;
  realizations?: CaseRealization[];
  realizationSummary?: CaseRealizationSummary;
  [key: string]: any;
}

/** 默认模板字段（自定义字段配置） */
export interface CaseCustomField {
  fieldId: string;
  fieldName: string;
  required?: boolean;
  defaultValue?: string;
  type: string;
  options?: { value: string; text: string }[];
}

/** 评审列表项，与 aegis-next-server ReviewItem 保持一致 */
export interface ReviewItem {
  id: string;
  num?: number;
  name: string;
  projectId: string;
  moduleId?: string;
  moduleName?: string;
  /** 评审状态：PREPARED/UNDERWAY/COMPLETED */
  status?: string;
  /** 评审类型：SINGLE/MULTIPLE */
  reviewPassRule?: string;
  caseCount?: number;
  passRate?: number;
  /** 已评审数量（用于评审进度 x/y），后端可选返回 */
  reviewedCount?: number;
  /** 各状态数量，后端可选返回 */
  passCount?: number;
  unPassCount?: number;
  reReviewCount?: number;
  underReviewCount?: number;
  unReviewCount?: number;
  reviewers?: string[] | { userName: string }[];
  tags?: string[];
  description?: string;
  createTime?: number | string;
  updateTime?: number | string;
  createUser?: string;
  updateUser?: string;
  createUserName?: string;
  startTime?: number | null;
  endTime?: number | null;
  [key: string]: any;
}
