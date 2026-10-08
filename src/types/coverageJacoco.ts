/**
 * 精准测试/覆盖率 spotter-jacoco API 类型
 * 后端：/cov/aggregateReport、/cov/aggregateReportList
 */

/** 报告状态：0=待执行 1=下载代码成功 2=生成diffmethod成功 3=生成报告成功 -1=执行出错 */
export type CoverageRequestStatus = -1 | 0 | 1 | 2 | 3;

/** 报告列表项（aggregateReportList 返回） */
export interface CoverageReportListItem {
  reportId: string;
  requestStatus: CoverageRequestStatus;
  reportUrl: string;
  lineCoverage: number;
  branchCoverage: number;
  createdAt: string;
  serviceCode: string;
  env: string;
  type: number;
  errMsg: string;
  reportStart: string;
  reportEnd: string;
  gitUrl: string;
  nowVersion: string;
  baseVersion: string;
  projectId?: number | string;
  createUser?: string;
}

/** 报告列表请求参数（无 reportStart/reportEnd）
 * - type/from 支持传 null 表示「全部」
 */
export interface AggregateReportListParams {
  serviceCode: string;
  type: number | null;
  from: number | null;
  /** 当前项目 ID，可选，后端用于按项目过滤 */
  projectId?: string;
}

/** 报告列表返回（带 total，兼容老接口仅返回数组的情况） */
export interface CoverageReportListResult {
  list: CoverageReportListItem[];
  total: number;
}

/** 生成报告请求参数（aggregateReport） */
export interface AggregateReportParams {
  serviceCode: string;
  env: string[];
  reportStart: string;
  reportEnd: string;
  gitUrl: string;
  baseVersion: string;
  nowVersion: string;
  type: number;
  /** 项目 ID（cov 接口新增） */
  projectId?: string;
  /** 创建人（当前用户，cov 接口新增） */
  createUser?: string;
}

/** 单元测试触发覆盖率请求参数（/cov/triggerUnitCover） */
export interface TriggerUnitCoverParams {
  serviceCode: string;
  uuid: string;
  type: number;
  gitUrl: string;
  baseVersion: string;
  nowVersion: string;
  /** 项目 ID（cov 接口新增） */
  projectId?: string;
  /** 创建人（当前用户，cov 接口新增） */
  createUser?: string;
}

export const REQUEST_STATUS_LABEL: Record<CoverageRequestStatus, string> = {
  [-1]: '执行出错',
  0: '待执行',
  1: '下载代码成功',
  2: '生成 diffmethod 成功',
  3: '生成报告成功',
};

/** 排除规则类型：1=类文件排除 2=包名排除 */
export type ServiceExcludeRuleType = 1 | 2;

/** 新建服务排除规则（/cov/serviceExclude/create） */
export interface ServiceExcludeCreateParams {
  serviceName: string;
  /** 排除规则列表，如 ["sun/**", "com.third/**"] */
  excludeRules: string[];
  ruleType: ServiceExcludeRuleType;
  description?: string;
  createUser?: string;
  projectId?: string | number;
  status?: number;
}

/** 服务排除规则列表查询（/cov/serviceExclude/list） */
export interface ServiceExcludeListParams {
  serviceName?: string;
  projectId?: string | number;
  currentPage?: number;
  pageSize?: number;
}

/** 服务排除规则列表项 */
export interface ServiceExcludeListItem {
  id?: number | string;
  serviceName: string;
  excludeRule: string;
  ruleType: ServiceExcludeRuleType;
  description?: string;
  createUser?: string;
  projectId?: number | string;
  status?: number;
  createdAt?: string;
  [key: string]: unknown;
}

/** 服务排除规则列表返回 */
export interface ServiceExcludeListResult {
  list: ServiceExcludeListItem[];
  total: number;
}
