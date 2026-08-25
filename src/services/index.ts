/**
 * API 服务层统一导出
 * 所有服务都在各自的文件中定义，这里统一导出以保持向后兼容
 */

export { apiTestService } from './api-test';
export { projectService } from './project';
export { apiService } from './api';
export { dataFactoryService } from './data-factory';
export { mockFactoryService } from './mock-factory';
export { testReportService } from './test-report';
export { workflowService } from './workflow';
export { workflowTestReportService } from './workflow-test-report';
export { authService } from './auth';
export { testCaseService } from './test-case';
export { projectManagementService } from './project-management';
export { bugManagementService } from './bug-management';
export { testPlanManagementService } from './test-plan';
export { requirementService } from './requirement';
export { caseManagementService } from './case-management';
export { requirementQualityService } from './requirement-quality';
export { metadataService } from './metadata';
export { environmentService } from './environment';
export {
  qualityWorkspaceService,
  ANALYSIS_STATUS_LABEL,
  REVIEW_STATUS_LABEL,
  RELEASE_CONCLUSION_LABEL,
} from './quality-workspace';
export type { QualityWorkspaceStats } from './quality-workspace';
export { testAssetService } from './test-asset';
