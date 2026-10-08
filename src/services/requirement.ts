import { http } from '@/utils/request';

export interface Requirement {
  requirementId: string;
  projectId: string;
  spaceId?: string;
  sourceType?: string;
  sourceRequirementId?: string;
  parentRequirementRef?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  ownerId?: string;
  iterationId?: string;
  url?: string;
  metadata?: Record<string, any>;
  archived?: boolean;
  workspaceIds?: string[];
  caseIds?: string[];
  qualitySummary?: Record<string, any>;
  createdAt?: number;
  updatedAt?: number;
  [key: string]: any;
}

export interface RequirementPageParams {
  current?: number;
  pageSize?: number;
  projectId: string;
  spaceId?: string;
  keyword?: string;
  sourceTypes?: string[];
  statuses?: string[];
  iterationId?: string;
  [key: string]: any;
}

export const requirementService = {
  getRequirementPage: async (params: RequirementPageParams) => {
    return http.post('/api/requirement/page', params);
  },

  getRequirementDetail: async (requirementId: string) => {
    return http.get(`/api/requirement/${requirementId}`);
  },

  saveRequirement: async (data: Partial<Requirement>) => {
    return http.post('/api/requirement/save', data);
  },

  archiveRequirement: async (requirementId: string) => {
    return http.post(`/api/requirement/${requirementId}/archive`);
  },

  deleteRequirement: async (requirementId: string) => {
    return http.post(`/api/requirement/${requirementId}/delete`);
  },

  ensureQualityWorkspace: async (requirementId: string) => {
    return http.post(`/api/requirement/${requirementId}/quality-workspace/ensure`);
  },

  getTrace: async (requirementId: string) => {
    return http.get(`/api/requirement/${requirementId}/trace`);
  },
};
