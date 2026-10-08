/**
 * Bug 管理服务
 * 从 AegisOne 迁移并转换为 React 格式
 */

import { http } from '@/utils/request';
import { bugUrls } from './constants/urls';

// 临时类型定义（后续会迁移类型文件）
// TODO: 迁移类型定义后更新这些导入
type TableQueryParams = any;
type CommonList<T> = any;
type BugEditFormObject = any;
type BugListItem = any;
type BugOptionListItem = any;
type TemplateOption = any;
type AssociatedList = any;
type OperationFile = any;
type CommentParams = any;
type DemandItem = any;

/**
 * 校验缺陷是否存在
 */
export function checkBugExist(id: string) {
  return http.get(`${bugUrls.checkBugExist}${id}`);
}

/**
 * 表格的查询
 */
export function getBugList(data: TableQueryParams) {
  return http.post<CommonList<BugListItem>>(bugUrls.postTableListUrl, data);
}

/**
 * 表格筛选字段的数据查询
 */
export function getCustomOptionHeader(projectId: string) {
  return http.get<BugOptionListItem>(`${bugUrls.getCustomOptionHeaderUrl}${projectId}`);
}

/**
 * 更新Bug
 */
export function updateBug(data: { request: BugEditFormObject; fileList: File[] }) {
  const formData = new FormData();
  const request = {
    ...data.request,
    tags: Array.isArray(data.request?.tags) ? data.request.tags : [],
  };
  formData.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }));
  data.fileList.forEach(file => {
    formData.append('files', file);
  });
  return http.post(bugUrls.postUpdateBugUrl, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

/**
 * 批量更新
 */
export function updateBatchBug(data: TableQueryParams) {
  return http.post(bugUrls.postBatchUpdateBugUrl, data);
}

/**
 * 创建Bug
 */
export function createOrUpdateBug(data: { request: BugEditFormObject; fileList: File[] }) {
  const formData = new FormData();
  // 保证 request 中始终包含 tags 数组，避免后端收不到或解析丢失
  const request = {
    ...data.request,
    tags: Array.isArray(data.request?.tags) ? data.request.tags : [],
  };
  formData.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }));
  data.fileList.forEach(file => {
    formData.append('files', file);
  });
  const url = data.request.id ? bugUrls.postUpdateBugUrl : bugUrls.postCreateBugUrl;
  return http.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

/**
 * 获取 bug 详情
 */
export function getBugDetail(id: string) {
  return http.get(`${bugUrls.getBugDetailUrl}${id}`);
}

/**
 * 下载缺陷附件（POST，返回 blob，由调用方触发保存）
 */
export function downloadBugAttachment(params: {
  projectId: string;
  bugId: string;
  fileId: string;
  associated?: boolean;
}) {
  return http.post(bugUrls.downloadFileUrl, params, { responseType: 'blob' });
}

/**
 * 删除单个缺陷
 * @param data.id 缺陷 ID
 * @param data.deleteFeishu 是否同步删除飞书侧缺陷（仅对飞书缺陷有效）
 */
export function deleteSingleBug(data: { id: string; deleteFeishu?: boolean }) {
  const query = data.deleteFeishu ? '?deleteFeishu=true' : '';
  return http.get(`${bugUrls.getDeleteBugUrl}${data.id}${query}`);
}

/**
 * 批量删除文件
 */
export function deleteBatchBug(data: TableQueryParams) {
  return http.post(bugUrls.postBatchDeleteBugUrl, data);
}

/**
 * 获取模板 Option
 */
export function getTemplateOption(projectId: string) {
  return http.get<TemplateOption[]>(`${bugUrls.getTemplateOption}/${projectId}`);
}

/**
 * 获取模板详情
 */
export function getTemplateById(data: TableQueryParams) {
  return http.post(bugUrls.getTemplateUrl, data);
}

/**
 * 获取导出字段配置
 */
export function getExportConfig(projectId: string) {
  return http.get(`${bugUrls.getExportConfigUrl}${projectId}`);
}

/**
 * 获取模板详情
 */
export function getTemplateDetailInfo(data: {
  id: string;
  projectId: string;
  fromStatusId?: string;
  platformBugKey?: string;
  showLocal?: boolean;
}) {
  return http.post(bugUrls.getTemplateDetailUrl, data);
}

/**
 * 获取当前项目所属平台
 */
export function getPlatform(projectId: string) {
  return http.get(`${bugUrls.getPlatform}${projectId}`);
}

/** 飞书业务线选项项（与飞书接口一致；带 level/path 时前端按层级展示） */
export type FeishuBusinessLineOption = { id: string; name: string; level?: string; path?: string };

/**
 * 获取飞书业务线选项列表（与飞书接口一致，供下拉用，只展示中文 name）
 */
export function getFeishuBusinessLineOptions(projectKey?: string) {
  const params = projectKey ? { projectKey } : {};
  return http.get<FeishuBusinessLineOption[]>(bugUrls.getFeishuBusinessLineOptionsUrl, { params });
}

/** 飞书缺陷原因选项：与后端 /bug/feishu/defect-reason-options 一致，一级 group + 二级 options（value 为「一级」或「一级_二级」） */
export type FeishuDefectReasonGroup = { group: string; options: { value: string; label: string }[] };

/**
 * 获取飞书缺陷原因选项列表（从飞书 Open API 拉取，供下拉用，与业务线一样不走写死）
 */
export function getFeishuDefectReasonOptions(projectKey?: string) {
  const params = projectKey ? { projectKey } : {};
  return http.get<FeishuDefectReasonGroup[]>(bugUrls.getFeishuDefectReasonOptionsUrl, { params });
}

/**
 * 获取飞书指定字段的枚举选项（通用，与缺陷原因同结构），供全部枚举下拉不走写死。
 * fieldKey 如：priority、business、field_1cbc4e、field_39dbe4、field_0b1b4f、field_6b822e、field_f12022
 */
export function getFeishuFieldOptions(fieldKey: string, projectKey?: string) {
  const params: Record<string, string> = { fieldKey };
  if (projectKey) params.projectKey = projectKey;
  return http.get<FeishuDefectReasonGroup[]>(bugUrls.getFeishuFieldOptionsUrl, { params });
}

/**
 * 获取飞书缺陷变更历史（操作记录）
 */
export function getFeishuHistory(id: string) {
  return http.get(bugUrls.getFeishuHistoryUrl + id);
}

/**
 * 同步缺陷开源
 */
export function syncBugOpenSource(projectId: string) {
  return http.get(bugUrls.getSyncBugOpenSourceUrl + projectId);
}

/**
 * 同步缺陷企业版
 */
export function syncBugEnterprise(data: { projectId: string; pre: boolean; createdAt: number }) {
  return http.post(bugUrls.getSyncBugEnterpriseUrl, data);
}

/**
 * 获取同步状态
 */
export function getSyncStatus(projectId: string) {
  return http.get<{ complete: boolean; msg: string }>(bugUrls.getSyncStatusUrl + projectId);
}

/**
 * 导出缺陷
 */
export function exportBug(data: TableQueryParams) {
  return http.post<Blob>(bugUrls.postExportBugUrl, data, {
    responseType: 'blob',
  });
}

/**
 * 获取关联文件列表
 */
export function getAssociatedFileList(data: TableQueryParams) {
  return http.post<CommonList<AssociatedList>>(bugUrls.postAssociatedFileListUrl, data);
}

/**
 * 关注/取消关注 缺陷
 */
export function followBug(id: string, isFollow: boolean) {
  if (isFollow) {
    return http.get(`${bugUrls.getUnFollowBugUrl}${id}`);
  }
  return http.get(`${bugUrls.getFollowBugUrl}${id}`);
}

/**
 * 创建评论
 */
export function createOrUpdateComment(data: CommentParams) {
  if (data.fetchType === 'UPDATE') {
    return http.post(bugUrls.postUpdateCommentUrl, data);
  }
  return http.post(bugUrls.postCreateCommentUrl, data);
}

/**
 * 获取评论列表
 */
export function getCommentList(bugId: string) {
  return http.get(`${bugUrls.getCommentListUrl}${bugId}`);
}

/**
 * 获取飞书评论列表（实时从飞书拉取）
 */
export function getFeishuComments(bugId: string) {
  return http.get(`${bugUrls.getFeishuCommentsUrl}${bugId}`);
}

/**
 * 删除评论
 */
export function deleteComment(commentId: string) {
  return http.get(`${bugUrls.getDeleteCommentUrl}${commentId}`);
}

/**
 * 获取自定义字段头部
 */
export function getCustomFieldHeader(projectId: string) {
  return http.get(`${bugUrls.getCustomFieldHeaderUrl}${projectId}`);
}

// ==================== 附件管理 ====================

/**
 * 上传文件并关联用例
 */
export function uploadOrAssociationFile(data: Record<string, any>) {
  const formData = new FormData();
  formData.append('request', JSON.stringify(data.request));
  if (data.file) {
    formData.append('fileList', data.file);
  }
  return http.post(bugUrls.uploadOrAssociationFileUrl, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

/**
 * 转存文件
 */
export function transferFileRequest(data: OperationFile) {
  return http.post(bugUrls.transferFileUrl, data);
}

/**
 * 获取文件转存目录
 */
export function getTransferFileTree(projectId: string) {
  return http.get(`${bugUrls.getTransferTreeUrl}/${projectId}`);
}

/**
 * 预览文件
 */
export function previewFile(data: OperationFile) {
  return http.post<Blob>(bugUrls.previewFileUrl, data, {
    responseType: 'blob',
  });
}

/**
 * 下载文件
 */
export function downloadFileRequest(data: OperationFile) {
  return http.post<Blob>(bugUrls.downloadFileUrl, data, {
    responseType: 'blob',
  });
}

/**
 * 检查文件是否更新
 */
export function checkFileIsUpdateRequest(data: string[]) {
  return http.post(bugUrls.checkFileIsUpdateUrl, data);
}

/**
 * 更新文件
 */
export function updateFile(data: OperationFile) {
  return http.post(bugUrls.getFileIsUpdateUrl, data);
}

/**
 * 删除文件或取消关联用例文件
 */
export function deleteFileOrCancelAssociation(data: OperationFile) {
  return http.post(bugUrls.deleteFileOrCancelAssociationUrl, data);
}

/**
 * 获取文件列表
 */
export function getAttachmentList(bugId: string) {
  return http.get(`${bugUrls.getAttachmentListUrl}${bugId}`);
}

/**
 * 富文本编辑器上传图片文件（可多文件，后端接口单文件需逐个上传）
 */
export function editorUploadFile(data: { fileList: File[] }) {
  const formData = new FormData();
  data.fileList.forEach(file => {
    formData.append('fileList', file);
  });
  return http.post(bugUrls.editorUploadFileUrl, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

/**
 * 评论/富文本上传单张图片，返回临时文件 ID（后端 @RequestParam("file")）
 */
export function uploadCommentImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  return http
    .post<string>(bugUrls.editorUploadFileUrl, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res: any) => (typeof res === 'string' ? res : res?.data ?? res?.id ?? ''));
}

// ==================== 回收站 ====================

/**
 * 获取回收站列表
 */
export function getRecycleList(data: TableQueryParams) {
  return http.post<CommonList<BugListItem>>(bugUrls.getRecycleListUrl, data);
}

/**
 * 单个恢复
 */
export function recoverSingleByRecycle(id: string) {
  return http.get(`${bugUrls.getRecoverSingleUrl}${id}`);
}

/**
 * 批量恢复
 */
export function recoverBatchByRecycle(data: TableQueryParams) {
  return http.post(bugUrls.getBatchRecoverUrl, data);
}

/**
 * 删除
 */
export function deleteSingleByRecycle(id: string) {
  return http.get(`${bugUrls.getDeleteSingleUrl}${id}`);
}

/**
 * 批量删除
 */
export function deleteBatchByRecycle(data: TableQueryParams) {
  return http.post(bugUrls.getBatchDeleteUrl, data);
}

// ==================== 关联需求 ====================

/**
 * 已关联用例列表
 */
export function getAssociatedList(data: TableQueryParams) {
  return http.post<CommonList<DemandItem[]>>(bugUrls.getDemandListUrl, data);
}

/**
 * 缺陷管理-关联用例-未关联用例-列表分页
 */
export function getUnAssociatedList(data: TableQueryParams) {
  return http.post(bugUrls.getUnrelatedDemandListUrl, data);
}

/**
 * 未关联用例-模块树
 */
export function getModuleTree(data: TableQueryParams) {
  return http.post(bugUrls.getUnrelatedModuleTreeUrl, data);
}

/**
 * 未关联用例-模块树-统计
 */
export function getModuleTreeCounts(data: TableQueryParams) {
  return http.post(bugUrls.getUnrelatedModuleTreeCountUrl, data);
}

/**
 * 批量关联需求
 */
export function batchAssociation(data: TableQueryParams) {
  return http.post(bugUrls.postAddDemandUrl, data);
}

/**
 * 取消关联
 */
export function cancelAssociation(id: string) {
  return http.get(`${bugUrls.getCancelDemandUrl}/${id}`);
}

/**
 * 缺陷管理-变更历史-列表
 */
export function getChangeHistoryList(data: TableQueryParams) {
  return http.post(bugUrls.getChangeHistoryListUrl, data);
}

/**
 * 校验跳转用例权限
 */
export function checkCasePermission(projectId: string, caseType: string) {
  return http.get(`${bugUrls.checkCasePermissionUrl}/${projectId}/${caseType}`);
}
