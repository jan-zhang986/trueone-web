/**
 * 系统设置-插件管理 相关类型（与 AegisOne 对齐）
 */

export interface PluginForms {
  id: string;
  name: string;
}

export interface OrganizationsItem {
  id: string;
  num?: number;
  name: string;
}

export interface PluginItem {
  id: string;
  name: string;
  pluginId?: string;
  fileName?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
  createUser?: string;
  enable?: boolean;
  global?: boolean;
  xpack?: boolean;
  description?: string;
  scenario?: string;
  organizations?: OrganizationsItem[];
  pluginForms?: PluginForms[];
}

export interface UpdatePluginParams {
  id: string;
  name?: string;
  global?: boolean | string;
  description?: string;
  enable?: boolean;
  organizationIds?: string[];
}

export interface PluginOptionsParams {
  pluginId: string;
  organizationId: string;
  optionMethod: string;
  projectConfig?: string;
}
