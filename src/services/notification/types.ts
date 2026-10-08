/**
 * 顶部消息通知相关类型（参考 AegisOne message-box）
 */

/** 消息记录（弹层列表用） */
export interface MessageRecord {
  id: number;
  type: string; // 'message' | 'notice' | 'todo'
  title: string;
  subTitle: string;
  avatar?: string;
  content: string;
  time: string;
  status: 0 | 1; // 0 未读 1 已读
  messageType?: number; // 0 未开始 1 已开通 2 进行中 3 即将到期
}

/** 消息中心历史记录（抽屉分页列表用） */
export interface MessageHistoryItem {
  id: number;
  type: string;
  receiver: string;
  subject: string;
  status: string;
  createdAt: string;
  operator: string;
  operation: string;
  resourceId: string;
  resourceType: string;
  resourceName: string;
  content: string;
  organizationId: string;
  projectId: string;
  avatar?: string;
  userName?: string;
}

export type MessageListType = MessageRecord[];
