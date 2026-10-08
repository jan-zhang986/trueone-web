/**
 * Message Management Type Definitions
 * 消息管理相关类型定义
 */

// 机器人平台类型
export type RobotPlatform = 'WE_COM' | 'DING_TALK' | 'LARK' | 'CUSTOM' | 'IN_SITE' | 'MAIL';

// 钉钉机器人类型
export type DingtalkType = 'CUSTOM' | 'ENTERPRISE';

// 接收人类型
export type RecipientType = 
  | 'OPERATOR'      // 操作人
  | 'CREATE_USER'   // 创建人
  | 'FOLLOW_PEOPLE' // 关注人
  | 'HANDLE_USER'   // 处理人
  | string;         // 自定义用户ID

// 机器人数据模型
export interface Robot {
  id: string;
  projectId: string;
  name: string;
  platform: RobotPlatform;
  type?: DingtalkType;
  webhook?: string;
  appKey?: string;
  appSecret?: string;
  enable: boolean;
  createdAt: string;
  updatedAt: string;
  createUser: string;
  updateUser: string;
  description?: string;
}

// 消息配置数据模型
export interface MessageConfig {
  id: string;
  projectId: string;
  eventType: string;
  eventName: string;
  module: string;
  enabled: boolean;
  robotId: string | null;
  recipients: RecipientType[];
  templateId: string;
  createdAt: string;
  updatedAt: string;
}

// 消息模板数据模型
export interface MessageTemplate {
  id: string;
  eventType: string;
  subject: string;
  template: string;
  defaultSubject: string;
  defaultTemplate: string;
  previewSubject: string;
  previewTemplate: string;
  useDefaultSubject: boolean;
  useDefaultTemplate: boolean;
  variables: TemplateVariable[];
  createdAt: string;
  updatedAt: string;
}

// 模板变量数据模型
export interface TemplateVariable {
  id: string;
  name: string;
  fieldSource: string;
  type: 'string' | 'number' | 'date' | 'user' | 'object';
  description?: string;
  example?: string;
}

// 机器人表单数据
export interface RobotFormData {
  name: string;
  platform: RobotPlatform;
  type?: DingtalkType;
  webhook?: string;
  appKey?: string;
  appSecret?: string;
  enable: boolean;
}

// 消息事件配置
export interface MessageItem {
  type: string;
  name: string;
  messageTaskTypeDTOList: MessageTaskType[];
}

export interface MessageTaskType {
  taskType: string;
  taskTypeName: string;
  messageTaskDetailDTOList: MessageTaskDetail[];
}

export interface MessageTaskDetail {
  event: string;
  eventName: string;
  receivers: Receiver[];
  projectRobotConfigMap: Record<string, ProjectRobotConfig>;
}

export interface Receiver {
  id: string;
  name: string;
}

export interface ProjectRobotConfig {
  robotId: string;
  robotName: string;
  platform: RobotPlatform;
  type?: DingtalkType;
  enable: boolean;
  template: string;
  defaultTemplate: string;
  previewTemplate: string;
  useDefaultTemplate: boolean;
  subject: string;
  defaultSubject: string;
  previewSubject: string;
  useDefaultSubject: boolean;
}

// 消息模板详情
export interface MessageTemplateDetail extends MessageTemplate {
  robotId: string;
  robotName: string;
  taskType: string;
  taskTypeName: string;
  event: string;
  eventName: string;
  receiverIds: string[];
}

// 字段来源
export interface FieldSource {
  id: string;
  name: string;
}

// 消息字段响应
export interface MessageFieldsResponse {
  fieldList: TemplateVariable[];
  fieldSourceList: FieldSource[];
}

// API 请求参数
export interface SaveMessageConfigParams {
  projectId: string;
  taskType: string;
  event: string;
  robotId: string;
  receiverIds: string[];
  enable?: boolean;
  subject?: string;
  template?: string;
  useDefaultSubject?: boolean;
  useDefaultTemplate?: boolean;
}

export interface RobotAddParams {
  projectId: string;
  name: string;
  platform: RobotPlatform;
  type?: DingtalkType;
  webhook?: string;
  appKey?: string;
  appSecret?: string;
  enable: boolean;
}

export interface RobotEditParams extends RobotAddParams {
  id: string;
}
