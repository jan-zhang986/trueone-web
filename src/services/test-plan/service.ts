/**
 * 测试计划服务
 * 从 AegisOne 迁移并转换为 React 格式
 */

import { http } from '@/utils/request';
import { testPlanUrls } from './constants/urls';

// 临时类型定义（后续会迁移类型定义文件）
// TODO: 迁移类型定义后更新这些导入
type TableQueryParams = any;
type CommonList<T> = any;
type ModuleTreeNode = any;
type TestPlanItem = any;
type TestPlanWithoutPageItem = any;
type TestPlanDetail = any;
type CaseManagementTable = any;
type UseCountType = any;
type CreateOrUpdateModule = any;
type UpdateModule = any;
type MoveModules = any;
type AddTestPlanParams = any;
type ExecutePlan = any;
type BatchExecutePlan = any;
type FollowPlanParams = any;
type CreateTask = any;
type BatchConfigSchedule = any;
type PlanMinderEditParams = import('@/types/testPlan').PlanMinderEditParams;
type PlanMinderEditListItem = import('@/types/testPlan').PlanMinderEditListItem;
type PlanMinderAssociateDTO = import('@/types/testPlan').PlanMinderAssociateDTO;
type PlanMinderNode = any;

// ==================== 模块树管理 ====================

/**
 * 获取测试计划模块树
 */
export function getTestPlanModule(params: TableQueryParams) {
  return http.get<ModuleTreeNode[]>(`${testPlanUrls.GetTestPlanModuleUrl}/${params.projectId}`);
}

/**
 * 创建测试计划模块
 */
export function addTestPlanModule(data: CreateOrUpdateModule) {
  return http.post(testPlanUrls.addTestPlanModuleUrl, data);
}

/**
 * 更新测试计划模块
 */
export function updateTestPlanModule(data: UpdateModule) {
  return http.post(testPlanUrls.updateTestPlanModuleUrl, data);
}

/**
 * 移动测试计划模块
 */
export function moveTestPlanModule(data: MoveModules) {
  return http.post(testPlanUrls.MoveTestPlanModuleUrl, data);
}

/**
 * 删除测试计划模块
 */
export function deletePlanModuleTree(id: string) {
  return http.get(`${testPlanUrls.DeleteTestPlanModuleUrl}/${id}`);
}

/**
 * 获取测试计划模块数量
 */
export function getPlanModulesCount(data: TableQueryParams) {
  return http.post(testPlanUrls.GetTestPlanModuleCountUrl, data);
}

// ==================== 测试计划管理 ====================

/**
 * 获取测试计划列表
 */
export function getTestPlanList(data: TableQueryParams) {
  return http.post<CommonList<TestPlanItem>>(testPlanUrls.GetTestPlanListUrl, data);
}

/**
 * 获取测试计划列表（无分页）
 */
export function getTestPlanListWithoutPage(projectId: string) {
  return http.get<TestPlanWithoutPageItem[]>(`${testPlanUrls.GetTestPlanListWithoutPageUrl}/${projectId}`);
}

/**
 * 获取测试计划详情
 */
export function getTestPlanDetail(id: string) {
  return http.get<TestPlanDetail>(`${testPlanUrls.GetTestPlanDetailUrl}/${id}`);
}

/**
 * 创建测试计划
 */
export function addTestPlan(data: AddTestPlanParams) {
  return http.post(testPlanUrls.AddTestPlanUrl, data);
}

/**
 * 更新测试计划
 */
export function updateTestPlan(data: AddTestPlanParams) {
  return http.post(testPlanUrls.UpdateTestPlanUrl, data);
}

/**
 * 删除测试计划
 */
export function deletePlan(id: string) {
  return http.get(`${testPlanUrls.deletePlanUrl}/${id}`);
}

/**
 * 批量删除测试计划
 */
export function batchDeletePlan(data: TableQueryParams) {
  return http.post(testPlanUrls.batchDeletePlanUrl, data);
}

/**
 * 批量编辑测试计划
 */
export function batchEditTestPlan(data: TableQueryParams) {
  return http.post(testPlanUrls.BatchEditTestPlanUrl, data);
}

/**
 * 复制测试计划
 */
export function copyTestPlan(data: TableQueryParams) {
  return http.post(testPlanUrls.copyTestPlanUrl, data);
}

/**
 * 归档测试计划
 */
export function archivedPlan(id: string) {
  return http.get(`${testPlanUrls.archivedPlanUrl}/${id}`);
}

/**
 * 批量复制测试计划
 */
export function batchCopyPlan(data: TableQueryParams) {
  return http.post(testPlanUrls.batchCopyPlanUrl, data);
}

/**
 * 批量移动测试计划
 */
export function batchMovePlan(data: TableQueryParams) {
  return http.post(testPlanUrls.batchMovePlanUrl, data);
}

/**
 * 批量归档测试计划
 */
export function batchArchivedPlan(data: TableQueryParams) {
  return http.post(testPlanUrls.batchArchivedPlanUrl, data);
}

/**
 * 获取统计数量
 */
export function getStatisticalCount(id: string) {
  return http.get<UseCountType>(`${testPlanUrls.getStatisticalCountUrl}/${id}`);
}

/**
 * 关注测试计划
 */
export function followPlan(data: FollowPlanParams) {
  return http.post(testPlanUrls.followPlanUrl, data);
}

/**
 * 生成报告（与 aegis 一致：需传 projectId、testPlanId、triggerMode）
 */
export function generateReport(data: { projectId: string; testPlanId: string; triggerMode?: string }) {
  return http.post(testPlanUrls.GenerateReportUrl, {
    projectId: data.projectId,
    testPlanId: data.testPlanId,
    triggerMode: data.triggerMode ?? 'MANUAL',
  });
}

/**
 * 获取测试计划通过率
 */
export function getPlanPassRate(data: string[]) {
  return http.post(testPlanUrls.planPassRateUrl, data);
}

/**
 * 获取测试计划用例列表
 */
export function getTestPlanCaseList(data: TableQueryParams) {
  return http.post<CommonList<CaseManagementTable>>(testPlanUrls.GetTestPlanCaseListUrl, data);
}

// 计划详情-功能用例
/**
 * 获取计划详情功能用例模块树
 */
export function getFeatureCaseModule(data: { testPlanId: string; treeType: string }) {
  return http.post<ModuleTreeNode[]>(testPlanUrls.GetFeatureCaseModuleUrl, data);
}

/**
 * 获取计划详情功能用例模块数量
 */
export function getFeatureCaseModuleCount(data: any) {
  return http.post(testPlanUrls.GetFeatureCaseModuleCountUrl, data);
}

/**
 * 获取计划详情功能用例列表
 */
export function getPlanDetailFeatureCaseList(data: TableQueryParams) {
  return http.post<CommonList<any>>(testPlanUrls.GetPlanDetailFeatureCaseListUrl, data);
}

/**
 * 执行功能用例
 */
export function runFeatureCase(data: any) {
  return http.post(testPlanUrls.RunFeatureCaseUrl, data);
}

/**
 * 取消关联功能用例
 */
export function disassociateCase(data: { testPlanId: string; id: string }) {
  return http.post(testPlanUrls.DisassociateCaseUrl, data);
}

/**
 * 获取执行项提案列表
 */
export function getWorkItemProposalList(workspaceId: string, workItemId: string) {
  return http.get(`/api/quality-workspace/${workspaceId}/work-item/${workItemId}/proposal/list`);
}

/**
 * 从执行项发起沉淀提案
 */
export function saveWorkItemProposal(workspaceId: string, workItemId: string, data: any) {
  return http.post(`/api/quality-workspace/${workspaceId}/work-item/${workItemId}/proposal/save`, data);
}

/**
 * 将提案合并回统一 Case
 */
export function mergeProposalToCase(proposalId: string, data?: any) {
  return http.post(`/api/proposal/${proposalId}/merge-to-case`, data ?? {});
}

// ==================== 测试计划组 ====================

/**
 * 获取测试计划组选项
 */
export function getPlanGroupOptions(projectId: string) {
  return http.get(`${testPlanUrls.TestPlanGroupOptionsUrl}/${projectId}`);
}

/**
 * 拖拽测试计划在组内排序
 */
export function dragPlanOnGroup(data: any) {
  return http.post(testPlanUrls.dragPlanOnGroupUrl, data);
}

// ==================== 视图（与老前端 user-view 一致） ====================

const TEST_PLAN_VIEW_TYPE = 'test-plan';

export interface ViewItem {
  id: string;
  userId?: string;
  name: string;
  viewType?: string;
  internal?: boolean;
  scopeId?: string;
  searchMode?: string;
  pos?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface ViewList {
  internalViews: ViewItem[];
  customViews: ViewItem[];
}

export interface ViewParams {
  id?: string;
  name: string;
  scopeId?: string;
  searchMode?: string;
  conditions?: Array<{ name?: string; operator?: string; value?: any; customField?: boolean; customFieldType?: string }>;
}

export interface ViewDetail extends ViewParams {
  userId?: string;
  viewType?: string;
  internal?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

/** 获取视图列表（系统视图 + 我的视图） */
export function getViewList(scopeId: string) {
  return http.get<ViewList>(`/user-view/${TEST_PLAN_VIEW_TYPE}/grouped/list`, { params: { scopeId } });
}

/** 获取视图详情 */
export function getViewDetail(id: string) {
  return http.get<ViewDetail>(`/user-view/${TEST_PLAN_VIEW_TYPE}/get/${id}`);
}

/** 新增视图 */
export function addView(data: ViewParams) {
  return http.post(`/user-view/${TEST_PLAN_VIEW_TYPE}/add`, data);
}

/** 更新视图 */
export function updateView(data: ViewParams) {
  return http.post(`/user-view/${TEST_PLAN_VIEW_TYPE}/update`, data);
}

/** 删除视图 */
export function deleteView(id: string) {
  return http.get(`/user-view/${TEST_PLAN_VIEW_TYPE}/delete/${id}`);
}

// ==================== 定时任务 ====================

/**
 * 配置定时任务
 */
export function configSchedule(data: CreateTask) {
  return http.post(testPlanUrls.ConfigScheduleUrl, data);
}

/**
 * 批量配置定时任务
 */
export function batchConfigSchedule(data: BatchConfigSchedule) {
  return http.post(testPlanUrls.BatchConfigScheduleUrl, data);
}

/**
 * 删除定时任务
 */
export function deleteScheduleTask(id: string) {
  return http.get(`${testPlanUrls.DeleteScheduleTaskUrl}/${id}`);
}

// ==================== 执行相关 ====================

/**
 * 执行单个测试计划
 */
export function executeSinglePlan(data: any) {
  return http.post(testPlanUrls.ExecuteSinglePlanUrl, data);
}

/**
 * 批量执行测试计划
 */
export function batchExecutePlan(data: any) {
  return http.post(testPlanUrls.BatchExecutePlanUrl, data);
}

// ==================== 测试计划脑图 ====================

/**
 * 获取测试计划脑图
 * 与 aegis-next-web 一致：GET /test-plan/mind/data/:id（路径参数，非 query testPlanId），
 * 无数据时通常返回 200 空数据；若该接口 404 则回退到 GET /test-plan/minder/get/:id
 */
export async function getTestPlanMinder(id: string): Promise<PlanMinderNode | PlanMinderNode[] | null> {
  try {
    const data = await http.get<PlanMinderNode | PlanMinderNode[]>(
      `${testPlanUrls.GetPlanMindDataUrl}/${id}`
    );
    return data ?? null;
  } catch (err: any) {
    if (err?.response?.status === 404 || err?.response?.status === 500) {
      try {
        return await http.get<PlanMinderNode>(`${testPlanUrls.GetTestPlanMinderUrl}/${id}`);
      } catch {
        return null;
      }
    }
    throw err;
  }
}

/**
 * 编辑测试计划脑图
 */
export function editPlanMinder(data: PlanMinderEditParams) {
  return http.post(testPlanUrls.EditPlanMinderUrl, data);
}

/**
 * 从脑图原始数据构建 editList（与 aegis-next-server makeMinderParams 一致：遍历 level<=2 的节点）
 * 后端 /test-plan/mind/data 返回的节点无 level 字段，需在遍历时注入 depth 作为 level（与原项目 mapTree 注入 level 一致）
 */
function buildEditListFromMinderRaw(rawData: any): PlanMinderEditListItem[] {
  const editList: PlanMinderEditListItem[] = [];
  const rootRaw = Array.isArray(rawData) ? rawData[0] : rawData?.root ?? rawData;
  if (!rootRaw) return editList;

  let numIndex = 0;
  function walk(node: any, depth: number) {
    const data = node?.data ?? node;
    if (!data || data.id === 'fakeNode' || data.type === 'tmp') return;
    const level = data.level ?? depth;
    editList.push({
      ...data,
      name: data.text ?? data.name,
      num: numIndex++,
      level,
    });
    const children = node?.children ?? [];
    if (depth < 2 && Array.isArray(children)) {
      children.forEach((c: any) => walk(c, depth + 1));
    }
  }
  walk(rootRaw, 0);
  return editList;
}

/**
 * 测试计划关联功能用例（通过脑图 edit 接口写入关联）
 * @param planId 计划 ID
 * @param projectId 项目 ID
 * @param caseIds 要关联的功能用例 ID 列表
 * @param collectionId 目标测试点/集合 ID，为空则关联到「功能用例」下第一个测试点或根下第一个 level2 节点
 */
export async function associateFeatureCasesToPlan(
  planId: string,
  projectId: string,
  caseIds: string[],
  collectionId?: string | null
): Promise<void> {
  const raw = await getTestPlanMinder(planId);
  if (!raw) {
    throw new Error('无法获取测试规划数据，请先在测试规划中创建功能用例测试点后再关联');
  }
  const editList = buildEditListFromMinderRaw(raw);
  if (editList.length === 0) {
    throw new Error('测试规划为空，请先在测试规划中创建功能用例测试点');
  }
  // associateType 与原项目 PlanMinderCollectionType.FUNCTIONAL 一致，值为 'FUNCTIONAL'
  const FUNC_TYPE = 'FUNCTIONAL';
  const associateDTO: PlanMinderAssociateDTO = {
    projectId,
    selectIds: caseIds,
    selectAll: false,
    excludeIds: [],
    moduleIds: [],
    moduleMaps: {
      [projectId]: {
        selectIds: caseIds,
        selectAll: false,
        excludeIds: [],
        moduleIds: [],
      },
    },
    associateType: FUNC_TYPE,
  };
  let targetIndex = -1;
  if (collectionId) {
    targetIndex = editList.findIndex((n) => n.id === collectionId);
  }
  if (targetIndex < 0) {
    // 先找 level-1 的功能用例分类节点（type 为 'FUNCTIONAL'，与原项目 PlanMinderCollectionType.FUNCTIONAL 一致）
    const funcL1Index = editList.findIndex(
      (n) => n.level === 1 && (n.type === FUNC_TYPE || n.name === '功能用例' || n.text === '功能用例')
    );
    if (funcL1Index >= 0) {
      // 找功能用例分类下的第一个 level-2 测试点
      const firstL2After = editList.findIndex(
        (n, i) => i > funcL1Index && n.level === 2
      );
      if (firstL2After >= 0) targetIndex = firstL2After;
    }
    if (targetIndex < 0) targetIndex = editList.findIndex((n) => n.level === 2);
    // 兜底：后端可能未返回 level 字段，按 type + 顺序找「功能用例」分类后的第一个测试点
    if (targetIndex < 0) {
      const funcNameIdx = editList.findIndex(
        (n) => n.type === FUNC_TYPE && (n.name === '功能用例' || n.text === '功能用例')
      );
      if (funcNameIdx >= 0 && funcNameIdx + 1 < editList.length) {
        targetIndex = funcNameIdx + 1;
      } else {
        const firstFunc = editList.findIndex((n) => n.type === FUNC_TYPE);
        if (firstFunc >= 0 && firstFunc + 1 < editList.length) {
          targetIndex = firstFunc + 1;
        } else if (firstFunc >= 0) {
          targetIndex = firstFunc;
        }
      }
    }
  }
  if (targetIndex < 0) {
    throw new Error('未找到可关联的测试点，请先在测试规划中创建功能用例测试点');
  }
  const existing = editList[targetIndex].associateDTOS ?? [];
  const existingFunctional = existing.find((d) => d.associateType === FUNC_TYPE);
  const newDTOs = existing.filter((d) => d.associateType !== FUNC_TYPE);
  if (existingFunctional) {
    const mergedIds = [...new Set([...(existingFunctional.selectIds ?? []), ...caseIds])];
    newDTOs.push({ ...existingFunctional, selectIds: mergedIds, ...associateDTO });
  } else {
    newDTOs.push(associateDTO);
  }
  editList[targetIndex] = { ...editList[targetIndex], associateDTOS: newDTOs };
  await editPlanMinder({ planId, editList, deletedIds: [] });
}

/** 测试规划分类 type（与后端 CaseType.getKey() 一致） */
const FUNCTIONAL_TYPE = 'FUNCTIONAL';
const API_TYPE = 'API';
const SCENARIO_TYPE = 'SCENARIO';

export type PlanCollectionCategoryType = 'FUNCTIONAL' | 'API' | 'SCENARIO';

/** 各分类在 editList 中 level=1 的匹配条件 */
function findL1IndexByCategory(editList: PlanMinderEditListItem[], category: PlanCollectionCategoryType): number {
  if (category === 'FUNCTIONAL') {
    return editList.findIndex(
      (n) =>
        n.level === 1 &&
        (n.type === FUNCTIONAL_TYPE ||
          n.type === 'FUNCTIONAL_CASE' ||
          n.name === '功能用例' ||
          n.text === '功能用例')
    );
  }
  if (category === 'API') {
    return editList.findIndex(
      (n) =>
        n.level === 1 &&
        (n.type === API_TYPE || n.type === 'API_CASE' || n.name === '接口用例' || n.text === '接口用例')
    );
  }
  if (category === 'SCENARIO') {
    return editList.findIndex(
      (n) =>
        n.level === 1 &&
        (n.type === SCENARIO_TYPE ||
          n.type === 'SCENARIO_CASE' ||
          n.name === '场景用例' ||
          n.text === '场景用例' ||
          n.name === '自动化用例' ||
          n.text === '自动化用例' ||
          n.name === '用例实现' ||
          n.text === '用例实现')
    );
  }
  return -1;
}

/** 生成 UUID，兼容无 crypto.randomUUID 的环境（如非 HTTPS、部分旧浏览器） */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const CATEGORY_LABEL: Record<PlanCollectionCategoryType, string> = {
  FUNCTIONAL: '功能用例',
  API: '接口用例',
  SCENARIO: '场景用例',
};

/**
 * 在测试规划指定分类下新增测试点（功能用例 / 接口用例 / 场景用例）
 * 与 aegis-next-server testPlanMinder addTestSet + editPlanMinder 逻辑一致
 * @param planId 测试计划 ID
 * @param category 分类：FUNCTIONAL | API | SCENARIO
 * @param insertAfterCollectionId 可选，在该测试点后插入（同级）；不传则在该分类下追加
 * @param options 可选：name、executeMethod（功能用例生效）
 */
export async function addPlanCollectionTestPoint(
  planId: string,
  category: PlanCollectionCategoryType,
  insertAfterCollectionId?: string | null,
  options?: { name?: string; executeMethod?: 'SERIAL' | 'PARALLEL' }
): Promise<void> {
  const raw = await getTestPlanMinder(planId);
  if (!raw) {
    throw new Error('无法获取测试规划数据');
  }
  const editList = buildEditListFromMinderRaw(raw);
  if (editList.length === 0) {
    throw new Error('测试规划为空');
  }
  const l1Index = findL1IndexByCategory(editList, category);
  if (l1Index < 0) {
    const label = CATEGORY_LABEL[category];
    throw new Error(`未找到「${label}」分类，无法新增测试点`);
  }
  const parent = editList[l1Index] as PlanMinderEditListItem & {
    executeMethod?: string;
    environmentId?: string;
    testResourcePoolId?: string;
    type?: string;
  };
  const typeForBackend = category === 'FUNCTIONAL' ? FUNCTIONAL_TYPE : category === 'API' ? API_TYPE : SCENARIO_TYPE;
  const executeMethod = options?.executeMethod ?? parent.executeMethod ?? 'PARALLEL';
  const environmentId = parent.environmentId ?? 'NONE';
  const testResourcePoolId = parent.testResourcePoolId ?? 'NONE';
  const defaultNames: Record<PlanCollectionCategoryType, string> = {
    FUNCTIONAL: '默认测试点',
    API: '默认接口点',
    SCENARIO: '默认场景点',
  };
  const pointName = options?.name?.trim() || defaultNames[category];
  let insertIndex: number;
  if (insertAfterCollectionId) {
    const idx = editList.findIndex((n) => n.id === insertAfterCollectionId);
    insertIndex = idx >= 0 ? idx + 1 : l1Index + 1;
  } else {
    insertIndex = l1Index + 1;
  }
  const newItem: PlanMinderEditListItem = {
    id: generateUUID(),
    tempCollectionNode: true,
    text: pointName,
    name: pointName,
    level: 2,
    type: typeForBackend,
    num: insertIndex,
    executeMethod,
    extended: false,
    grouped: false,
    environmentId,
    testResourcePoolId,
    retryOnFail: true,
    retryType: 'SCENARIO',
    retryTimes: 5,
    retryInterval: 1000,
    stopOnFail: true,
  };
  const nextEditList = [...editList.slice(0, insertIndex), newItem, ...editList.slice(insertIndex)];
  await editPlanMinder({ planId, editList: nextEditList, deletedIds: [] });
}

/**
 * 在测试规划「功能用例」下新增功能点（默认测试点）
 * 兼容旧调用，内部调用 addPlanCollectionTestPoint(planId, 'FUNCTIONAL', ...)
 */
export async function addFunctionalTestPoint(
  planId: string,
  insertAfterCollectionId?: string | null,
  options?: { name?: string; executeMethod?: 'SERIAL' | 'PARALLEL' }
): Promise<void> {
  await addPlanCollectionTestPoint(planId, 'FUNCTIONAL', insertAfterCollectionId, options);
}

// ==================== 其他 ====================

/**
 * 复制测试计划和测试计划组
 */
export function testPlanAndGroupCopy(id: string) {
  return http.get(`${testPlanUrls.TestPlanAndGroupCopyUrl}/${id}`);
}

/**
 * 获取测试计划执行人选项
 */
export function getTestPlanExecutorOptions(projectId: string) {
  return http.get(`${testPlanUrls.GetTestPlanExecutorOptionsUrl}/${projectId}`);
}

/**
 * 获取测试计划用户列表
 */
export function getTestPlanUsers(projectId: string) {
  return http.get(`${testPlanUrls.GetTestPlanUsersUrl}/${projectId}`);
}

/**
 * 获取任务结果
 */
export function getTaskResult(id: string) {
  return http.get(`${testPlanUrls.TaskResultUrl}/${id}`);
}

/**
 * 获取计划详情缺陷管理列表
 */
export function getPlanDetailBugPage(data: TableQueryParams) {
  return http.post(testPlanUrls.planDetailBugPageUrl, data);
}

/**
 * 获取计划详情执行历史
 */
export function getPlanDetailExecuteHistory(data: TableQueryParams) {
  return http.post(testPlanUrls.PlanDetailExecuteHistoryUrl, data);
}

/**
 * 批量执行功能用例
 */
export function batchRunCase(data: any) {
  return http.post(testPlanUrls.BatchRunCaseUrl, data);
}

/**
 * 测试计划-关联缺陷
 */
export function testPlanAssociateBug(data: any) {
  return http.post(testPlanUrls.TestPlanAssociateBugUrl, data);
}

/**
 * 测试计划-取消关联缺陷
 */
export function testPlanCancelBug(data: any) {
  return http.post(testPlanUrls.TestPlanCancelBugUrl, data);
}

/**
 * 获取用例关联的缺陷列表
 */
export function getAssociatedBug(data: any) {
  return http.post(testPlanUrls.GetAssociatedBugUrl, data);
}

/**
 * 获取用例详情
 */
export function getTestPlanCaseDetail(id: string) {
  return http.get(`${testPlanUrls.TestPlanCaseDetailUrl}/${id}`);
}

/**
 * 获取执行历史
 */
export function getExecuteHistory(id: string, type: string) {
  return http.get(`${testPlanUrls.ExecuteHistoryUrl}/${id}/${type}`);
}
