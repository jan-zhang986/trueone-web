import type {
  MetadataDefinition,
  MetadataModuleNode,
  UserProfile,
} from '@/services/metadata';

// 导出消息管理类型
export * from './message';

// 导出日志管理类型
export * from './log';

// API 相关类型
export interface ApiItem {
  id: string;
  name: string;
  type: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'SQL' | 'TCP' | 'WebSocket' | 'DUBBO' | 'RocketMQ' | 'FILE';
  groupId: string;
  category: string;
  path?: string; // API路径
  protocol?: string; // 协议类型
  status?: string; // 状态
  module?: string; // 所属模块
  testCount?: number; // 用例数
  description?: string; // 描述
  team?: string; // 所属团队
  lastModified?: string; // 最后修改时间
  creator?: string; // 创建人
  version?: string; // 版本
  createdAt?: string; // 创建时间
  updatedAt?: string; // 更新时间
}

export interface ApiGroup {
  id: string;
  name: string;
  items: ApiItem[];
}

export interface OpenedTest {
  id: string;
  name: string;
  type: 'http' | 'sql' | 'dubbo' | 'websocket' | 'tcp' | 'rocketmq' | 'file' | 'data-factory' | 'mock-factory';
  definitionId?: string; // 定义ID，用于获取详细信息
}

// 测试报告相关类型
export interface TestReport {
  id: string;
  name: string;
  status: 'success' | 'failure' | 'pending';
  duration: number;
  timestamp: string;
  executor: string;
  tags: string[];
}

export interface TestRecord {
  id: string;
  name: string;
  status: 'success' | 'failure' | 'pending';
  duration: number;
  timestamp: string;
  executor: string;
}

// 工作流相关类型
export interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
}

export interface Connection {
  id: string;
  source: string;
  target: string;
}

export interface SavedTest {
  id: string;
  name: string;
  type: string;
  config: any;
}

/**
 * 通用接口编辑状态
 * 供 HTTP / SQL / MQ 等协议统一使用
 */
export interface ApiEditorState {
  /** 当前定义 ID，undefined 表示新建 */
  definitionId?: string;
  /** 协议类型 */
  protocol: MetadataDefinition['protocol'];
  /** 项目 ID */
  projectId: string;
  /** 接口名称 */
  name: string;
  /** 所属模块 ID */
  moduleId?: string;
  /** 描述 */
  description?: string;
  /** 标签列表 */
  tags: string[];
  /** 当前环境 ID */
  environmentId?: string;
  /** 是否处于加载状态 */
  loading: boolean;
  /** 是否处于保存中状态 */
  saving: boolean;
}

/** Hook 里使用到的一些通用数据集合类型 */
export interface ApiEditorContextData {
  environments: UserProfile[];
  moduleTree: MetadataModuleNode[];
}

// 数据工厂相关类型
export interface DataField {
  name: string;
  type: string;
  rule: string;
  example: string;
  enabled: boolean;
}

// 仪表板相关类型
export interface DashboardStats {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  successRate: number;
  activeUsers: number;
}

export interface ApiTestRecord {
  id: string;
  name: string;
  status: string;
  timestamp: string;
}

