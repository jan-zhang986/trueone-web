/**
 * 用例管理 API URL 常量
 * 从 AegisOne 迁移
 */

// ==================== 后端服务地址配置 ====================
// aegis-next-server 后端服务地址
// 使用相对路径，通过 nginx 代理转发到后端，避免跨域问题
const AEGIS_BACKEND_URL = '';

// ==================== 功能用例管理 ====================

// 用例管理列表
export const GetCaseListUrl = '/functional/case/page';
// 用例管理-添加
export const CreateCaseUrl = '/functional/case/add';
// 用例管理-更新
export const UpdateCaseUrl = '/functional/case/update';
// 用例管理-删除
export const DeleteCaseUrl = '/functional/case/delete';
// 用例管理-详情
export const DetailCaseUrl = '/functional/case/detail';
// 用例管理-批量移动用例
export const BatchMoveCaseUrl = '/functional/case/batch/move';
// 用例管理-批量删除用例
export const BatchDeleteCaseUrl = '/functional/case/batch/delete-to-gc';
// 用例管理-批量编辑用例
export const BatchEditCaseUrl = '/functional/case/batch/edit';
// 用例管理-批量复制
export const BatchCopyCaseUrl = '/functional/case/batch/copy';
// 用例管理-关注/取消关注用例
export const FollowerCaseUrl = '/functional/case/edit/follower';
// 获取用例关注人
export const GetCaseFollowerUrl = '/functional/case/follower';
// 获取表头自定义字段（高级搜索中的自定义字段）
export const GetSearchCustomFieldsUrl = '/functional/case/custom/field';
// 关联文件列表
export const GetAssociatedFilePageUrl = '/attachment/page';
export const SaveCaseMinderUrl = '/functional/mind/case/edit'; // 保存用例脑图
export const GetCaseMinderUrl = '/functional/mind/case/list'; // 获取脑图数据
export const GetCaseMinderTreeUrl = '/functional/mind/case/tree'; // 获取脑图模块树（含文本节点）
export const MergeCaseVersionUrl = '/functional/case/version/merge'; // 合并用例版本
export const ExecuteCaseWorkflowUrl = '/functional/case/execute'; // 执行关联工作流

// 获取模块树
export const GetCaseModuleTreeUrl = '/functional/case/module/tree';
// 创建模块树
export const CreateCaseModuleTreeUrl = '/functional/case/module/add';
// 更新模块树
export const UpdateCaseModuleTreeUrl = '/functional/case/module/update';
// 移动模块
export const MoveCaseModuleTreeUrl = '/functional/case/module/move';
// 回收站-模块-获取模块树
export const GetTrashCaseModuleTreeUrl = '/functional/case/module/trash/tree';
// 删除模块
export const DeleteCaseModuleTreeUrl = '/functional/case/module/delete';
// 复制模块（含其下用例）
export const CopyModuleWithCasesUrl = '/functional/case/module/copy';
// 获取默认模板自定义字段
export const GetDefaultTemplateFieldsUrl = '/functional/case/default/template/field';

// 回收站
// 回收站分页
export const GetRecycleCaseListUrl = '/functional/case/trash/page';
// 获取回收站模块数量
export const GetRecycleCaseModulesCountUrl = '/functional/case/trash/module/count';
// 获取全部用例模块数量
export const GetCaseModulesCountUrl = '/functional/case/module/count';
// 恢复回收站用例表
export const RestoreCaseListUrl = '/functional/case/trash/batch/recover';
// 批量彻底删除回收站用例表
export const BatchDeleteRecycleCaseListUrl = '/functional/case/trash/batch/delete';
// 恢复回收站单个用例
export const RecoverRecycleCaseListUrl = '/functional/case/trash/recover';
// 删除回收站单个用例
export const DeleteRecycleCaseListUrl = '/functional/case/trash/delete';

// 关联需求
// 已关联需求列表
export const GetDemandListUrl = '/functional/case/demand/page';
// 添加需求
export const AddDemandUrl = '/functional/case/demand/add';
// 更新需求
export const UpdateDemandUrl = '/functional/case/demand/update';
// 批量关联需求
export const BatchAssociationDemandUrl = '/functional/case/demand/batch/relevance';
// 取消关联
export const CancelAssociationDemandUrl = '/functional/case/demand/cancel';
// 获取三方关联需求的接口
export const GetThirdDemandUrl = '/functional/case/demand/third/list/page';

// 附件管理
// 上传文件并关联用例
export const UploadOrAssociationFileUrl = '/attachment/upload/file';
// 转存文件
export const TransferFileUrl = '/attachment/transfer';
// 预览文件
export const PreviewFileUrl = '/attachment/preview';
// 下载文件
export const DownloadFileUrl = '/attachment/download';
// 删除文件或取消关联用例文件
export const deleteFileOrCancelAssociationUrl = '/attachment/delete/file';
// 获取转存目录
export const getTransferTreeUrl = '/attachment/options';
// 附件是否更新
export const GetFileIsUpdateUrl = '/attachment/update';
// 检查文件是否更新
export const checkFileIsUpdateUrl = '/attachment/check-update';

// 评论列表
export const GetCommentListUrl = '/functional/case/comment/get/list';
// 评审评论
export const GetReviewCommentListUrl = '/functional/case/review/comment';
// 执行评论
export const GetPlanExecuteCommentListUrl = '/functional/case/test/plan/comment';
// 创建评论
export const CreateCommentItemUrl = '/functional/case/comment/save';
// 更新评论
export const UpdateCommentItemUrl = '/functional/case/comment/update';
// 删除评论
export const DeleteCommentItemUrl = '/functional/case/comment/delete';
// 获取详情用例评审
export const GetDetailCaseReviewUrl = '/functional/case/review/page';
// 获取用例详情弹窗关联用例接口用例
export const GetAssociationPublicCasePageUrl = '/functional/case/test/associate/case/page';
// 获取接口测试接口模块数量
export const GetAssociationPublicCaseModuleCountUrl = '/functional/case/test/associate/case/module/count';
// 获取用例详情接口模块树
export const GetAssociationPublicModuleTreeUrl = '/functional/case/test/associate/case/module/tree';
// 获取前后置用例列表
export const GetDependOnPageUrl = '/functional/case/relationship/page';
// 用例管理-功能用例-用例详情-前后置关系
export const GetDependOnRelationUrl = '/functional/case/relationship/relate/page';
// 添加前后置关系
export const AddDependOnRelationUrl = '/functional/case/relationship/add';
// 取消关联前后置关系
export const cancelPreAndPostCaseUrl = '/functional/case/relationship/delete';
// 关联用例
export const publicAssociatedCaseUrl = '/functional/case/test/associate/case';
// 获取关联用例已关联列表
export const GetAssociatedDrawerCaseUrl = '/functional/case/test/has/associate/case/page';
// 获取用例详情缺陷
export const GetDebugDrawerPageUrl = '/functional/case/test/associate/bug/page';
// 关联缺陷
export const AssociatedDebuggerUrl = '/functional/case/test/associate/bug';
// 取消关联缺陷
export const CancelAssociatedDebuggerUrl = '/functional/case/test/disassociate/bug';
// 获取详情已关联缺陷列表
export const GetAssociatedDebuggerUrl = '/functional/case/test/has/associate/bug/page';
// 获取前后置已关联用例ids
export const GetAssociatedCaseIdsUrl = '/functional/case/relationship/get-ids';

// 导入功能
// 功能用例导入excel下载模板
export const DownloadExcelTemplateUrl = '/functional/case/download/excel/template';
// 功能用例导入xmind下载模板
export const DownloadXMindTemplateUrl = '/functional/case/download/xmind/template';
// 富文本所需资源上传
export const EditorUploadFileUrl = '/attachment/upload/temp/file';
// 富文本资源详情预览压缩图
export const PreviewEditorImageUrl = '/attachment/download/file';
// 导入excel文件检查
export const exportExcelCheckUrl = '/functional/case/pre-check/excel';
// 导入xmind文件检查
export const exportXMindCheckUrl = '/functional/case/pre-check/xmind';
// 导入excel文件
export const importExcelCaseUrl = '/functional/case/import/excel';
// 导入xmind文件
export const importXMindCaseUrl = '/functional/case/import/xmind';
// 导出 Excel/XMind、检查任务、下载文件、停止导出（与 aegis-next-web / 后端一致）
export const ExportExcelCaseUrl = '/functional/case/export/excel';
export const ExportXMindCaseUrl = '/functional/case/export/xmind';
export const CheckCaseExportTaskUrl = '/functional/case/check/export-task';
export const StopCaseExportUrl = '/functional/case/stop';
export const GetCaseExportConfigUrl = '/functional/case/export/columns';
export const GetCaseDownloadFileUrl = '/functional/case/download/file';

// AI相关
export const GetAiConfigUrl = '/functional/case/ai/config';
export const SaveAiConfigUrl = '/functional/case/ai/config/save';
export const CaseAiChatUrl = '/functional/case/ai/chat';
export const CaseAiTransformUrl = '/functional/case/ai/transform';
export const CaseAiBatchSaveUrl = '/functional/case/ai/batch/save';

// 变更历史（与 aegis-next-server 一致）
export const getChangeHistoryListUrl = '/functional/case/operation-history';

// 获取已关联测试计划列表（与 aegis-next-server 一致）
export const GetAssociatedTestPlanUrl = '/functional/case/test/has/associate/plan/page';
// 关联需求选项
export const associatedProjectOptionsUrl = '/functional/case/demand/options';
// 拖拽排序
export const dragSortUrl = '/functional/case/edit/pos';

// ==================== 用例评审 ====================

export const GetReviewListUrl = '/case/review/page'; // 获取评审列表
export const EditReviewUrl = '/case/review/edit'; // 编辑评审
export const SortReviewUrl = '/case/review/edit/pos'; // 评审拖拽排序
export const FollowReviewUrl = '/case/review/edit/follower'; // 关注/取消关注评审
export const CopyReviewUrl = '/case/review/copy'; // 复制评审
export const MoveReviewUrl = '/case/review/batch/move'; // 移动评审
export const AssociateReviewUrl = '/case/review/associate'; // 关联用例
export const AddReviewUrl = '/case/review/add'; // 新增评审
export const GetReviewUsersUrl = '/case/review/user-option'; // 获取评审人员列表
export const GetReviewDetailUrl = '/case/review/detail'; // 获取评审详情
export const DisassociateReviewCaseUrl = '/case/review/disassociate'; // 取消关联用例
export const DeleteReviewUrl = '/case/review/delete'; // 删除用例评审
export const UpdateReviewModuleUrl = '/case/review/module/update'; // 更新评审模块
export const MoveReviewModuleUrl = '/case/review/module/move'; // 移动评审模块
export const AddReviewModuleUrl = '/case/review/module/add'; // 新增评审模块
export const GetReviewModulesUrl = '/case/review/module/tree'; // 获取评审模块树
export const DeleteReviewModuleUrl = '/case/review/module/delete'; // 删除评审模块
export const ReviewModuleCountUrl = '/case/review/module/count'; // 模块下用例数量统计
export const GetReviewDetailCasePageUrl = '/case/review/detail/page'; // 评审详情-获取已关联用例列表
export const SortReviewDetailCaseUrl = '/case/review/detail/edit/pos'; // 评审详情-已关联用例拖拽排序
export const BatchReviewUrl = '/case/review/detail/batch/review'; // 评审详情-批量评审
export const MinderReviewCaseUrl = '/case/review/detail/mind/multiple/review'; // 评审详情-脑图评审用例
export const BatchChangeReviewerUrl = '/case/review/detail/batch/edit/reviewers'; // 评审详情-批量修改评审人
export const BatchDisassociateReviewCaseUrl = '/case/review/detail/batch/disassociate'; // 评审详情-批量取消关联用例
export const GetAssociatedIdsUrl = '/case/review/detail/get-ids'; // 获取已关联用例id集合
export const GetReviewDetailModuleCountUrl = '/case/review/detail/module/count'; // 评审详情-模块下用例数量统计
export const GetReviewDetailModuleTreeUrl = '/case/review/detail/tree'; // 评审详情-已关联用例模块树
export const GetCaseReviewHistoryListUrl = '/review/functional/case/get/list'; // 评审详情-获取用例评审历史
export const SaveCaseReviewResultUrl = '/review/functional/case/save'; // 评审详情-提交评审
export const getCaseReviewerListUrl = '/case/review/detail/reviewer/list'; // 评审详情-获取用例的评审人
export const GetCaseReviewMinderUrl = '/functional/mind/case/review/list'; // 获取评审脑图数据
export const GetReviewerAndStatusUrl = '/case/review/detail/reviewer/status/total'; // 脑图-获取用例评审最终结果和每个评审人最终的评审结果
export const GetCasePlanMinderUrl = '/functional/mind/case/plan/list'; // 获取测试计划用例脑图
export const GetCasePlanCollectionMinderUrl = '/functional/mind/case/collection/list'; // 获取测试计划用例脑图-测试点

// ==================== 统一导出 ====================

export const caseManagementUrls = {
  // 功能用例
  GetCaseListUrl,
  CreateCaseUrl,
  UpdateCaseUrl,
  DeleteCaseUrl,
  DetailCaseUrl,
  BatchMoveCaseUrl,
  BatchDeleteCaseUrl,
  BatchEditCaseUrl,
  BatchCopyCaseUrl,
  FollowerCaseUrl,
  GetCaseFollowerUrl,
  GetSearchCustomFieldsUrl,
  GetAssociatedFilePageUrl,
  SaveCaseMinderUrl,
  GetCaseMinderUrl,
  GetCaseMinderTreeUrl,
  GetCaseModuleTreeUrl,
  CreateCaseModuleTreeUrl,
  UpdateCaseModuleTreeUrl,
  MoveCaseModuleTreeUrl,
  GetTrashCaseModuleTreeUrl,
  DeleteCaseModuleTreeUrl,
  CopyModuleWithCasesUrl,
  GetDefaultTemplateFieldsUrl,
  GetRecycleCaseListUrl,
  GetRecycleCaseModulesCountUrl,
  GetCaseModulesCountUrl,
  RestoreCaseListUrl,
  BatchDeleteRecycleCaseListUrl,
  RecoverRecycleCaseListUrl,
  DeleteRecycleCaseListUrl,
  GetDemandListUrl,
  AddDemandUrl,
  UpdateDemandUrl,
  BatchAssociationDemandUrl,
  CancelAssociationDemandUrl,
  GetThirdDemandUrl,
  UploadOrAssociationFileUrl,
  TransferFileUrl,
  PreviewFileUrl,
  DownloadFileUrl,
  deleteFileOrCancelAssociationUrl,
  getTransferTreeUrl,
  GetFileIsUpdateUrl,
  checkFileIsUpdateUrl,
  GetCommentListUrl,
  GetReviewCommentListUrl,
  GetPlanExecuteCommentListUrl,
  CreateCommentItemUrl,
  UpdateCommentItemUrl,
  DeleteCommentItemUrl,
  GetDetailCaseReviewUrl,
  GetAssociationPublicCasePageUrl,
  GetAssociationPublicCaseModuleCountUrl,
  GetAssociationPublicModuleTreeUrl,
  GetDependOnPageUrl,
  GetDependOnRelationUrl,
  AddDependOnRelationUrl,
  cancelPreAndPostCaseUrl,
  publicAssociatedCaseUrl,
  GetAssociatedDrawerCaseUrl,
  GetDebugDrawerPageUrl,
  AssociatedDebuggerUrl,
  CancelAssociatedDebuggerUrl,
  GetAssociatedDebuggerUrl,
  GetAssociatedCaseIdsUrl,
  DownloadExcelTemplateUrl,
  DownloadXMindTemplateUrl,
  EditorUploadFileUrl,
  PreviewEditorImageUrl,
  exportExcelCheckUrl,
  exportXMindCheckUrl,
  importExcelCaseUrl,
  importXMindCaseUrl,
  ExportExcelCaseUrl,
  ExportXMindCaseUrl,
  CheckCaseExportTaskUrl,
  StopCaseExportUrl,
  GetCaseExportConfigUrl,
  GetCaseDownloadFileUrl,
  GetAiConfigUrl,
  SaveAiConfigUrl,
  CaseAiChatUrl,
  CaseAiTransformUrl,
  CaseAiBatchSaveUrl,
  getChangeHistoryListUrl,
  GetAssociatedTestPlanUrl,
  associatedProjectOptionsUrl,
  dragSortUrl,
  MergeCaseVersionUrl,
  ExecuteCaseWorkflowUrl,
  // 用例评审
  GetReviewListUrl,
  EditReviewUrl,
  SortReviewUrl,
  FollowReviewUrl,
  CopyReviewUrl,
  MoveReviewUrl,
  AssociateReviewUrl,
  AddReviewUrl,
  GetReviewUsersUrl,
  GetReviewDetailUrl,
  DisassociateReviewCaseUrl,
  DeleteReviewUrl,
  UpdateReviewModuleUrl,
  MoveReviewModuleUrl,
  AddReviewModuleUrl,
  GetReviewModulesUrl,
  DeleteReviewModuleUrl,
  ReviewModuleCountUrl,
  GetReviewDetailCasePageUrl,
  SortReviewDetailCaseUrl,
  BatchReviewUrl,
  MinderReviewCaseUrl,
  BatchChangeReviewerUrl,
  BatchDisassociateReviewCaseUrl,
  GetAssociatedIdsUrl,
  GetReviewDetailModuleCountUrl,
  GetReviewDetailModuleTreeUrl,
  GetCaseReviewHistoryListUrl,
  SaveCaseReviewResultUrl,
  getCaseReviewerListUrl,
  GetCaseReviewMinderUrl,
  GetReviewerAndStatusUrl,
  GetCasePlanMinderUrl,
  GetCasePlanCollectionMinderUrl,
} as const;
