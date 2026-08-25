
/**
 * 用例管理 - 功能用例服务
 * 从 AegisOne 迁移并转换为 React 格式
 */

import { http } from '@/utils/request';
import { caseManagementUrls } from './constants/urls';

// 临时类型定义（后续会迁移类型定义文件）
type TableQueryParams = any;
type CommonList<T> = any;
type ModuleTreeNode = any;
type CreateOrUpdateModule = any;
type UpdateModule = any;
type MoveModules = {
  dragNodeId: string;
  dropNodeId: string;
  dropPosition: number; // -1: 节点前, 0: 节点内, 1: 节点后（与 aegis-next-server 一致）
};
type ModulesTreeType = any;
type CaseManagementTable = any;
type DeleteCaseType = any;
type AssociatedList = any;
type BatchMoveOrCopyType = any;
type FeatureCaseMinderUpdateParams = any;
type MinderJsonNode = any;
type DemandItem = any;
type CreateOrUpdateDemand = any;
type OperationFile = any;
type PreviewImages = any;
type CommentItem = any;
type CommentParams = any;

// ==================== 模块树管理 ====================

/**
 * 获取模块树
 */
export function getCaseModuleTree(params: TableQueryParams) {
  return http.get<ModuleTreeNode[]>(`${caseManagementUrls.GetCaseModuleTreeUrl}/${params.projectId}`);
}

/**
 * 创建模块树
 */
export function createCaseModuleTree(data: CreateOrUpdateModule) {
  return http.post(caseManagementUrls.CreateCaseModuleTreeUrl, data);
}

/**
 * 更新模块树
 */
export function updateCaseModuleTree(data: UpdateModule) {
  return http.post(caseManagementUrls.UpdateCaseModuleTreeUrl, data);
}

/**
 * 移动模块树
 */
export function moveCaseModuleTree(data: MoveModules) {
  return http.post(caseManagementUrls.MoveCaseModuleTreeUrl, data);
}

/**
 * 回收站-模块-获取模块树
 */
export function getTrashCaseModuleTree(projectId: string) {
  return http.get<ModulesTreeType[]>(`${caseManagementUrls.GetTrashCaseModuleTreeUrl}/${projectId}`);
}

/**
 * 删除模块
 */
export function deleteCaseModuleTree(id: string) {
  return http.get(`${caseManagementUrls.DeleteCaseModuleTreeUrl}/${id}`);
}

/**
 * 获取用例模块数量
 */
export function getCaseModulesCounts(data: TableQueryParams) {
  return http.post(caseManagementUrls.GetCaseModulesCountUrl, data);
}

/**
 * 获取默认模板自定义字段
 */
export function getCaseDefaultFields(projectId: string) {
  return http.get(`${caseManagementUrls.GetDefaultTemplateFieldsUrl}/${projectId}`);
}

// ==================== 用例管理 ====================

/**
 * 获取用例列表
 * 请求体只带“有内容”的 combineSearch/filter，避免后端生成 AND () 导致 SQL 语法错误（ExtFunctionalCaseMapper.xml）
 */
export function getCaseList(data: TableQueryParams) {
  const { combineSearch, filter, ...rest } = data;
  const payload: TableQueryParams = { ...rest };
  if (Array.isArray(combineSearch?.conditions) && combineSearch.conditions.length > 0) {
    payload.combineSearch = combineSearch;
  }
  if (filter != null && typeof filter === 'object' && Object.keys(filter).length > 0) {
    payload.filter = filter;
  }
  return http.post<CommonList<CaseManagementTable>>(caseManagementUrls.GetCaseListUrl, payload);
}

/**
 * 获取用例详情
 */
export function getCaseDetail(id: string) {
  return http.get(`${caseManagementUrls.DetailCaseUrl}/${id}`);
}

/**
 * 创建用例（legacy functional_case 入口）
 * Space 主路径禁止调用：新产品写入统一走 saveUnifiedCase。
 * 与 aegis-next-web / 后端一致：request 为单个 JSON 的 part，文件 part 名为 files
 * 后端：addFunctionalCase(@RequestPart("request") ..., @RequestPart(value = "files", ...) ...)
 */
export function createCaseRequest(data: Record<string, any>) {
  const formData = new FormData();
  if (data.request) {
    const requestJson = JSON.stringify(data.request);
    formData.append('request', new Blob([requestJson], { type: 'application/json' }));
  }
  if (data.fileList && Array.isArray(data.fileList)) {
    data.fileList.forEach((file: File) => {
      formData.append('files', file);
    });
  }
  return http.post(caseManagementUrls.CreateCaseUrl, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/**
 * 更新用例（legacy functional_case 入口）
 * Space 主路径禁止调用：新产品写入统一走 saveUnifiedCase。
 * 与 aegis-next-web 一致：入参可为 { request, fileList } 或平铺 { ...requestBody, fileList }
 * 后端：updateFunctionalCase(@RequestPart("request") ..., @RequestPart(value = "files", ...) ...)
 * customFields.value 为 null 时转为 ''，避免后端 updateByPrimaryKeySelective 生成无效 SQL
 */
export function updateCaseRequest(data: Record<string, any>) {
  const formData = new FormData();
  let requestBody: Record<string, any>;
  let fileList: File[] = [];
  if (data.request != null) {
    requestBody = { ...data.request };
    fileList = Array.isArray(data.fileList) ? data.fileList : [];
  } else {
    const { fileList: fl, ...rest } = data;
    requestBody = rest;
    fileList = Array.isArray(fl) ? fl : [];
  }
  if (Array.isArray(requestBody.customFields)) {
    requestBody.customFields = requestBody.customFields.map((f: { fieldId?: string; value?: unknown }) => ({
      fieldId: f.fieldId ?? '',
      value: f.value != null ? String(f.value) : '',
    }));
  }
  const requestJson = JSON.stringify(requestBody);
  formData.append('request', new Blob([requestJson], { type: 'application/json' }));
  fileList.forEach((file: File) => formData.append('files', file));
  return http.post(caseManagementUrls.UpdateCaseUrl, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/**
 * 删除用例
 */
export function deleteCaseRequest(data: DeleteCaseType) {
  return http.post(`${caseManagementUrls.DeleteCaseUrl}`, data);
}

/**
 * 批量删除用例
 */
export function batchDeleteCase(data: TableQueryParams) {
  return http.post(caseManagementUrls.BatchDeleteCaseUrl, data);
}

/**
 * 批量编辑属性
 */
export function batchEditAttrs(data: TableQueryParams) {
  return http.post(caseManagementUrls.BatchEditCaseUrl, data);
}

/**
 * 批量移动到模块
 */
export function batchMoveToModules(data: BatchMoveOrCopyType) {
  return http.post(caseManagementUrls.BatchMoveCaseUrl, data);
}

/**
 * 批量复制到模块
 */
export function batchCopyToModules(data: BatchMoveOrCopyType) {
  return http.post(caseManagementUrls.BatchCopyCaseUrl, data);
}

/**
 * 复制模块及其下用例
 */
export function copyModuleWithCases(data: {
  projectId: string;
  sourceModuleId: string;
  targetModuleId: string;
}) {
  return http.post(caseManagementUrls.CopyModuleWithCasesUrl, data);
}

/**
 * 关注用例
 */
export function followerCaseRequest(data: { userId: string; functionalCaseId: string }) {
  return http.post(caseManagementUrls.FollowerCaseUrl, data);
}

/**
 * 获取用例关注人
 */
export function getCaseFollower(caseId: string) {
  return http.get(`${caseManagementUrls.GetCaseFollowerUrl}/${caseId}`);
}

/**
 * 拖拽排序
 */
export function dragSort(data: any) {
  return http.post(caseManagementUrls.dragSortUrl, data);
}

// ==================== 脑图管理 ====================

/**
 * 保存用例脑图
 */
export function saveCaseMinder(data: FeatureCaseMinderUpdateParams) {
  return http.post(caseManagementUrls.SaveCaseMinderUrl, data);
}

/**
 * 获取脑图数据
 */
export function getCaseMinder(data: { projectId: string; moduleId: string; current: number }) {
  return http.post<CommonList<MinderJsonNode>>(caseManagementUrls.GetCaseMinderUrl, data);
}

/**
 * 获取脑图模块树（包含文本节点）
 */
export function getCaseMinderTree(data: { projectId: string; moduleId: string }) {
  return http.post<MinderJsonNode[]>(caseManagementUrls.GetCaseMinderTreeUrl, data);
}

// ==================== 回收站管理 ====================

/**
 * 获取回收站用例列表
 */
export function getRecycleListRequest(data: TableQueryParams) {
  return http.post<CommonList<CaseManagementTable>>(caseManagementUrls.GetRecycleCaseListUrl, data);
}

/**
 * 获取回收站模块数量
 */
export function getRecycleModulesCounts(data: TableQueryParams) {
  return http.post(caseManagementUrls.GetRecycleCaseModulesCountUrl, data);
}

/**
 * 恢复回收站用例
 */
export function restoreCaseList(data: TableQueryParams) {
  return http.post(caseManagementUrls.RestoreCaseListUrl, data);
}

/**
 * 批量彻底删除回收站用例
 */
export function batchDeleteRecycleCase(data: TableQueryParams) {
  return http.post(caseManagementUrls.BatchDeleteRecycleCaseListUrl, data);
}

/**
 * 恢复单个回收站用例
 */
export function recoverRecycleCase(id: string) {
  return http.get(`${caseManagementUrls.RecoverRecycleCaseListUrl}/${id}`);
}

/**
 * 删除单个回收站用例
 */
export function deleteRecycleCaseList(id: string) {
  return http.get(`${caseManagementUrls.DeleteRecycleCaseListUrl}/${id}`);
}

// ==================== 需求管理 ====================

/**
 * 获取需求列表
 */
export function getDemandList(data: TableQueryParams) {
  return http.post<CommonList<DemandItem[]>>(caseManagementUrls.GetDemandListUrl, data);
}

/**
 * 添加需求
 */
export function addDemandRequest(data: CreateOrUpdateDemand) {
  return http.post(caseManagementUrls.AddDemandUrl, data);
}

/**
 * 更新需求
 */
export function updateDemandRequest(data: CreateOrUpdateDemand) {
  return http.post(caseManagementUrls.UpdateDemandUrl, data);
}

/**
 * 批量关联需求
 */
export function batchAssociationDemand(data: TableQueryParams) {
  return http.post(caseManagementUrls.BatchAssociationDemandUrl, data);
}

/**
 * 取消关联需求
 */
export function cancelAssociationDemand(id: string) {
  return http.get(`${caseManagementUrls.CancelAssociationDemandUrl}/${id}`);
}

/**
 * 获取三方需求列表
 */
export function getThirdDemand(data: TableQueryParams) {
  return http.post(caseManagementUrls.GetThirdDemandUrl, data);
}

/**
 * 获取关联需求选项
 */
export function getAssociatedProjectOptions(orgId: string, module: string) {
  return http.get(`${caseManagementUrls.associatedProjectOptionsUrl}/${orgId}/${module}`);
}

// ==================== 附件管理 ====================

/**
 * 获取关联文件列表
 */
export function getAssociatedFileListUrl(data: TableQueryParams) {
  return http.post<CommonList<AssociatedList>>(caseManagementUrls.GetAssociatedFilePageUrl, data);
}

/**
 * 上传或关联文件
 */
export function uploadOrAssociationFile(data: OperationFile) {
  const formData = new FormData();
  if (data.request) {
    Object.keys(data.request).forEach(key => {
      formData.append(key, data.request[key]);
    });
  }
  if (data.file) {
    formData.append('file', data.file);
  }
  return http.post(caseManagementUrls.UploadOrAssociationFileUrl, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/**
 * 转存文件
 */
export function transferFile(data: TableQueryParams) {
  return http.post(caseManagementUrls.TransferFileUrl, data);
}

/**
 * 获取转存目录
 */
export function getTransferTree(projectId: string) {
  return http.get(`${caseManagementUrls.getTransferTreeUrl}/${projectId}`);
}

/**
 * 预览文件
 */
export function previewFile(data: PreviewImages) {
  return http.post(caseManagementUrls.PreviewFileUrl, data, {
    responseType: 'blob',
  });
}

/**
 * 下载文件
 */
export function downloadFile(data: PreviewImages) {
  return http.post(caseManagementUrls.DownloadFileUrl, data, {
    responseType: 'blob',
  });
}

/**
 * 检查文件是否更新
 */
export function checkFileIsUpdate(data: TableQueryParams) {
  return http.post(caseManagementUrls.checkFileIsUpdateUrl, data);
}

/**
 * 获取文件更新状态
 */
export function getFileIsUpdate(projectId: string, id: string) {
  return http.get(`${caseManagementUrls.GetFileIsUpdateUrl}/${projectId}/${id}`);
}

/**
 * 删除文件或取消关联
 */
export function deleteFileOrCancelAssociation(data: TableQueryParams) {
  return http.post(caseManagementUrls.deleteFileOrCancelAssociationUrl, data);
}

// ==================== 评论管理 ====================

/**
 * 获取评论列表
 */
export function getCommentList(caseId: string) {
  return http.get<CommentItem[]>(`${caseManagementUrls.GetCommentListUrl}/${caseId}`);
}

/**
 * 获取评审评论列表
 */
export function getReviewCommentList(caseId: string) {
  return http.get<CommentItem[]>(`${caseManagementUrls.GetReviewCommentListUrl}/${caseId}`);
}

/**
 * 获取执行评论列表（测试计划执行记录）
 */
export function getTestPlanExecuteCommentList(caseId: string) {
  return http.get<CommentItem[]>(`${caseManagementUrls.GetPlanExecuteCommentListUrl}/${caseId}`);
}

/**
 * 创建评论
 */
export function createCommentItem(data: CommentParams) {
  return http.post(caseManagementUrls.CreateCommentItemUrl, data);
}

/**
 * 获取统一协作评论
 */
export function getCollabComments(projectId: string, subjectType: string, subjectId: string) {
  return http.get(`/api/collab/comment/subject/${subjectType}/${subjectId}`, {
    params: { projectId },
  });
}

/**
 * 保存统一协作评论
 */
export function saveCollabComment(data: Record<string, any>) {
  return http.post('/api/collab/comment/save', data);
}

/**
 * 更新评论
 */
export function updateCommentItem(data: CommentParams) {
  return http.post(caseManagementUrls.UpdateCommentItemUrl, data);
}

/**
 * 删除评论
 */
export function deleteCommentItem(commentId: string) {
  return http.get(`${caseManagementUrls.DeleteCommentItemUrl}/${commentId}`);
}

// ==================== 关联管理 ====================

/**
 * 获取详情用例评审
 */
export function getDetailCaseReview(data: TableQueryParams) {
  return http.post<CommonList<CaseManagementTable>>(caseManagementUrls.GetDetailCaseReviewUrl, data);
}

/**
 * 获取关联用例列表（公开）
 */
export function getAssociationPublicCasePage(data: TableQueryParams) {
  return http.post<CommonList<CaseManagementTable>>(caseManagementUrls.GetAssociationPublicCasePageUrl, data);
}

/**
 * 获取关联用例模块数量
 */
export function getAssociationPublicCaseModuleCount(data: TableQueryParams) {
  return http.post(caseManagementUrls.GetAssociationPublicCaseModuleCountUrl, data);
}

/**
 * 获取关联用例模块树
 */
export function getAssociationPublicModuleTree(data: TableQueryParams) {
  return http.post<ModuleTreeNode[]>(caseManagementUrls.GetAssociationPublicModuleTreeUrl, data);
}

/**
 * 关联用例
 */
export function publicAssociatedCase(data: TableQueryParams) {
  return http.post<ModulesTreeType[]>(caseManagementUrls.publicAssociatedCaseUrl, data);
}

/**
 * 获取已关联用例列表
 */
export function getAssociatedDrawerCase(data: TableQueryParams) {
  return http.post<CommonList<CaseManagementTable>>(caseManagementUrls.GetAssociatedDrawerCaseUrl, data);
}

// ==================== 前后置关系 ====================

/**
 * 获取前后置用例列表
 */
export function getDependOnPage(data: TableQueryParams) {
  return http.post<CommonList<CaseManagementTable>>(caseManagementUrls.GetDependOnPageUrl, data);
}

/**
 * 获取前后置关系
 */
export function getDependOnRelation(data: TableQueryParams) {
  return http.post<CommonList<CaseManagementTable>>(caseManagementUrls.GetDependOnRelationUrl, data);
}

/**
 * 添加前后置关系
 */
export function addDependOnRelation(data: TableQueryParams) {
  return http.post<ModulesTreeType[]>(caseManagementUrls.AddDependOnRelationUrl, data);
}

/**
 * 取消前后置关系
 */
export function cancelPreAndPostCase(data: TableQueryParams) {
  return http.post(caseManagementUrls.cancelPreAndPostCaseUrl, data);
}

/**
 * 获取已关联用例ID列表
 */
export function getAssociatedCaseIds(caseId: string) {
  return http.get<string[]>(`${caseManagementUrls.GetAssociatedCaseIdsUrl}/${caseId}`);
}

// ==================== 缺陷关联 ====================

/**
 * 获取缺陷列表
 */
export function getDebugDrawerPage(data: TableQueryParams) {
  return http.post<CommonList<CaseManagementTable>>(caseManagementUrls.GetDebugDrawerPageUrl, data);
}

/**
 * 关联缺陷
 */
export function associatedDebugger(data: TableQueryParams) {
  return http.post<CommonList<CaseManagementTable>>(caseManagementUrls.AssociatedDebuggerUrl, data);
}

/**
 * 取消关联缺陷
 */
export function cancelAssociatedDebugger(id: string) {
  return http.get(`${caseManagementUrls.CancelAssociatedDebuggerUrl}/${id}`);
}

/**
 * 获取已关联缺陷列表
 */
export function getAssociatedDebugger(data: TableQueryParams) {
  return http.post(caseManagementUrls.GetAssociatedDebuggerUrl, data);
}

// ==================== 导入导出 ====================

/**
 * 下载Excel模板
 */
export function downloadExcelTemplate(projectId: string) {
  return http.get(`${caseManagementUrls.DownloadExcelTemplateUrl}/${projectId}`, {
    responseType: 'blob',
  });
}

/**
 * 下载XMind模板
 */
export function downloadXMindTemplate(projectId: string) {
  return http.get(`${caseManagementUrls.DownloadXMindTemplateUrl}/${projectId}`, {
    responseType: 'blob',
  });
}

/**
 * 上传富文本编辑器文件
 * 后端 /attachment/upload/temp/file 要求 form 字段名为 file（Required part 'file' is not present）
 */
export function editorUploadFile(data: { fileList: File[] }) {
  const formData = new FormData();
  data.fileList.forEach((file) => {
    formData.append('file', file);
  });
  return http.post(caseManagementUrls.EditorUploadFileUrl, formData);
}

/**
 * 预览富文本编辑器图片
 */
export function previewEditorImage(data: any) {
  return http.post(caseManagementUrls.PreviewEditorImageUrl, data);
}

/**
 * 导入Excel文件检查
 */
export function exportExcelCheck(data: FormData) {
  return http.post(caseManagementUrls.exportExcelCheckUrl, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/**
 * 导入XMind文件检查
 */
export function exportXMindCheck(data: FormData) {
  return http.post(caseManagementUrls.exportXMindCheckUrl, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/**
 * 导入Excel文件
 */
export function importExcelCase(data: FormData) {
  return http.post(caseManagementUrls.importExcelCaseUrl, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/**
 * 导入XMind文件
 */
export function importXMindCase(data: FormData) {
  return http.post(caseManagementUrls.importXMindCaseUrl, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/**
 * 导出Excel文件
 */
export function exportExcelCase(data: TableQueryParams) {
  return http.post(caseManagementUrls.ExportExcelCaseUrl, data);
}

/**
 * 导出XMind文件
 */
export function exportXMindCase(data: TableQueryParams) {
  return http.post(caseManagementUrls.ExportXMindCaseUrl, data);
}

/**
 * 检查导出任务
 */
export function checkCaseExportTask() {
  return http.get(caseManagementUrls.CheckCaseExportTaskUrl);
}

/**
 * 停止导出任务
 */
export function stopCaseExport(taskId: string) {
  return http.get(`${caseManagementUrls.StopCaseExportUrl}/${taskId}`);
}

/**
 * 获取导出配置
 */
export function getCaseExportConfig(projectId: string) {
  return http.get(`${caseManagementUrls.GetCaseExportConfigUrl}/${projectId}`);
}

/**
 * 获取导出的文件（与 aegis-next-web 一致：GET /download/file/{projectId}/{fileId}）
 */
export function getCaseDownloadFile(projectId: string, fileId: string) {
  return http.get<Blob>(
    `${caseManagementUrls.GetCaseDownloadFileUrl}/${projectId}/${fileId}`,
    { responseType: 'blob' }
  );
}

// ==================== AI相关 ====================

/**
 * 获取AI配置
 */
export function getAiConfig(projectId: string) {
  return http.get(`${caseManagementUrls.GetAiConfigUrl}/${projectId}`);
}

/**
 * 保存AI配置
 */
export function saveAiConfig(data: any) {
  return http.post(caseManagementUrls.SaveAiConfigUrl, data);
}

/**
 * AI聊天
 */
export function caseAiChat(data: any) {
  return http.post(caseManagementUrls.CaseAiChatUrl, data);
}

/**
 * AI转换
 */
export function caseAiTransform(data: any) {
  return http.post(caseManagementUrls.CaseAiTransformUrl, data);
}

/**
 * AI批量保存
 */
export function caseAiBatchSave(data: any) {
  return http.post(caseManagementUrls.CaseAiBatchSaveUrl, data);
}

// ==================== 其他 ====================

/**
 * 获取变更历史列表
 */
export function getChangeHistoryList(data: TableQueryParams) {
  return http.post<CommonList<any>>(caseManagementUrls.getChangeHistoryListUrl, data);
}

/**
 * 获取关联测试计划
 */
export function getAssociatedTestPlan(data: TableQueryParams) {
  return http.post<CommonList<any>>(caseManagementUrls.GetAssociatedTestPlanUrl, data);
}

/**
 * 获取搜索自定义字段
 */
export function getSearchCustomFields(projectId: string) {
  return http.get(`${caseManagementUrls.GetSearchCustomFieldsUrl}/${projectId}`);
}

// ==================== 统一 Case（Case-first）====================

/**
 * 获取统一 Case 列表
 * 新前端应优先使用该接口，而不是继续直接消费 legacy functional case 列表。
 */
export function getUnifiedCaseList(data: TableQueryParams) {
  return http.post('/api/testcase/page', data);
}

/**
 * 获取统一 Case 详情
 */
export function getUnifiedCaseDetail(id: string) {
  return http.get(`/api/testcase/${id}`);
}

/**
 * 保存统一 Case
 * Space 主路径唯一写入口，附件通过 uploadFileIds/relateFileMetaIds/unLinkFilesIds 等字段提交。
 */
export function saveUnifiedCase(data: Record<string, any>) {
  return http.post('/api/testcase/save', data);
}

/**
 * 删除统一 Case
 */
export function deleteUnifiedCase(caseId: string) {
  return http.post(`/api/testcase/${caseId}/delete`);
}

/**
 * 批量删除统一 Case
 */
export function batchDeleteUnifiedCase(caseIds: string[]) {
  return http.post('/api/testcase/batch-delete', { caseIds });
}

/**
 * 获取 Case realization 列表
 */
export function getCaseRealizations(caseId: string) {
  return http.get(`/api/testcase/${caseId}/realization/list`);
}

/**
 * 合并用例版本
 */
export function mergeCaseVersion(data: {
  projectId: string;
  sourceVersionId: string;
  targetVersionId: string;
}) {
  return http.post(caseManagementUrls.MergeCaseVersionUrl, data);
}

/**
 * 执行用例关联的工作流
 */
export function executeCaseWorkflow(id: string) {
  return http.post(`${caseManagementUrls.ExecuteCaseWorkflowUrl}/${id}`);
}


/**
 * 获取 Case realization 摘要
 */
export function getCaseRealizationSummary(caseId: string) {
  return http.get(`/api/testcase/${caseId}/realization/summary`);
}

/**
 * 获取单个 realization 详情
 */
export function getCaseRealizationDetail(caseId: string, realizationType: string) {
  return http.get(`/api/testcase/${caseId}/realization/${realizationType}`);
}

/**
 * 保存 realization
 */
export function saveCaseRealization(caseId: string, data: Record<string, any>) {
  return http.post(`/api/testcase/${caseId}/realization/save`, data);
}

export function publishCaseRealization(caseId: string, realizationType: string) {
  return http.post(`/api/testcase/${caseId}/realization/${realizationType}/publish`);
}

export function enableCaseRealization(caseId: string, realizationType: string) {
  return http.post(`/api/testcase/${caseId}/realization/${realizationType}/enable`);
}

export function disableCaseRealization(caseId: string, realizationType: string) {
  return http.post(`/api/testcase/${caseId}/realization/${realizationType}/disable`);
}

export function deleteCaseRealization(caseId: string, realizationType: string) {
  return http.post(`/api/testcase/${caseId}/realization/${realizationType}/delete`);
}

// ==================== 用例库 (Repository) 管理 ====================

export interface CaseRepositoryItem {
  id: string;
  name: string;
  code?: string;
  defaultBranch?: string;
  description?: string;
  creator?: string;
  createUser?: string;
  updateUser?: string;
  createTime?: number;
  updateTime?: number;
  branches?: string[];
  caseCount?: number;
}

export function getCaseRepositories(projectId?: string, spaceId?: string) {
  return http.get<CaseRepositoryItem[]>('/api/case/repository/list', {
    params: { projectId, spaceId },
  });
}

export function createCaseRepository(data: { name: string; code?: string; defaultBranch?: string; description?: string; creator?: string }) {
  return http.post<CaseRepositoryItem>('/api/case/repository/create', data);
}

export function updateCaseRepository(data: { id: string; name?: string; code?: string; defaultBranch?: string; description?: string }) {
  return http.post<CaseRepositoryItem>('/api/case/repository/update', data);
}

export function deleteCaseRepository(id: string) {
  return http.delete<boolean>(`/api/case/repository/delete/${id}`);
}
