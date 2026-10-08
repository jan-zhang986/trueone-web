/**
 * 组织/项目模板相关类型（与 AegisOne 对齐）
 */

export type SceneType = 'FUNCTIONAL' | 'BUG' | 'API' | 'UI' | 'TEST_PLAN';

export interface FieldOption {
  value: string;
  text: string;
  fieldId?: string;
  internal?: boolean;
  pos?: number;
}

/** 自定义字段列表项 */
export interface DefinedFieldItem {
  id: string;
  name: string;
  scene: SceneType;
  type: string;
  remark: string;
  internal: boolean;
  scopeType: string;
  scopeId: string;
  createdAt: number;
  updatedAt: number;
  createUser?: string;
  refId?: string | null;
  enableOptionKey?: boolean | null;
  options?: FieldOption[] | null;
  required?: boolean;
  internalFieldKey?: string;
  [key: string]: unknown;
}

/** 新增/编辑自定义字段参数 */
export interface AddOrUpdateFieldParams {
  id?: string;
  name: string;
  used?: boolean;
  scene: SceneType;
  type: string;
  remark: string;
  scopeId: string;
  options?: FieldOption[];
  enableOptionKey: boolean;
}

/** 组织模板列表项 */
export interface OrganizeTemplateItem {
  id: string;
  name: string;
  remark: string;
  internal: boolean;
  updatedAt: number;
  createdAt: number;
  createUser?: string;
  scopeType: string;
  scopeId: string;
  enableThirdPart: boolean;
  enableDefault: boolean;
  refId?: string;
  scene: string;
}

/** 创建/更新模板参数 */
export interface ActionTemplateManage {
  id?: string;
  name: string;
  remark: string;
  scopeId: string;
  scene?: SceneType;
  enableThirdPart?: boolean;
  customFields?: CustomField[];
  uploadImgFileIds?: string[];
  [key: string]: unknown;
}

export interface CustomField {
  fieldId: string;
  required?: boolean;
  apiFieldId?: string;
  defaultValue: string | (string | number)[] | number;
  [key: string]: unknown;
}

/** 工作流状态项 */
export interface WorkFlowStatusItem {
  id: string;
  name: string;
  scene: string;
  remark: string;
  internal?: boolean;
  scopeType: string;
  scopeId: string;
  refId?: string;
  pos: number;
  statusDefinitions?: string[];
  statusFlowTargets?: string[];
  [key: string]: unknown;
}

/** 创建工作流状态参数 */
export interface OrdWorkStatusParams {
  scopeId?: string;
  id?: string;
  name: string;
  scene?: SceneType;
  remark: string;
  allTransferTo?: boolean;
}

/** 设置状态初始/结束 */
export interface SetStateTypeParams {
  statusId: string;
  definitionId: string;
  enable: boolean;
}

/** 更新状态流转 */
export interface UpdateWorkFlowSettingParams {
  fromId: string;
  toId: string;
  enable: boolean;
}
