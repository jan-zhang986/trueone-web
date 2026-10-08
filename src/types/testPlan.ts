/**
 * 测试计划类型定义
 * 从 AegisOne 迁移
 */

import { PlanStatusType, TestPlanType } from '@/constants/testPlanEnums';

/**
 * 测试计划列表项
 */
export interface TestPlanItem {
    id: string;
    projectId: string;
    num: number;
    name: string;
    status: PlanStatusType;
    type: TestPlanType;
    tags: string[] | { id: string; name: string }[];
    schedule: string; // 是否定时
    createUser: string;
    createUserName?: string;
    createdAt: number;
    moduleName: string;
    moduleId: string;
    children?: TestPlanItem[];
    childrenCount: number;
    groupId: string;
    functionalCaseCount: number;
    // 扩展字段
    passRate?: number;
    executeRate?: number;
    plannedStartTime?: number;
    plannedEndTime?: number;
    actualStartTime?: number;
    actualEndTime?: number;
    description?: string;
}

/**
 * 通过率统计详情
 */
export interface PassRateCountDetail {
    id: string;
    passThreshold: number;
    passRate: number;
    executeRate: number;
    successCount: number;
    errorCount: number;
    fakeErrorCount: number;
    blockCount: number;
    pendingCount: number;
    caseTotal: number;
    functionalCaseCount: number;
    apiCaseCount: number;
    apiScenarioCount: number;
    scheduleConfig?: {
        resourceId: string;
        enable: boolean;
        cron: string;
        runConfig: {
            runMode: 'SERIAL' | 'PARALLEL';
        };
    };
    nextTriggerTime?: number;
    status: PlanStatusType;
    pass: boolean; // 是否通过
}

/**
 * 测试计划详情
 */
export interface TestPlanDetail {
    id: string;
    num: number;
    name: string;
    status: PlanStatusType;
    type: TestPlanType;
    projectId: string;
    moduleId: string;
    moduleName?: string;
    groupId?: string;
    groupName?: string;
    tags: string[];
    description?: string;
    passThreshold: number;
    repeatCase: boolean;
    automaticStatusUpdate: boolean;
    testPlanning: boolean;
    plannedStartTime?: number;
    plannedEndTime?: number;
    actualStartTime?: number;
    actualEndTime?: number;
    createUser: string;
    createUserName?: string;
    createdAt: number;
    updatedAt?: number;
    followFlag: boolean;
    passRate: number;
    executeRate?: number;
    executedCount: number;
    caseCount: number;
    passCount: number;
    unPassCount: number;
    functionalCaseCount: number;
    apiCaseCount: number;
    apiScenarioCount: number;
    bugCount: number;
    feishuStoryId?: string;
}

/**
 * 创建/更新测试计划参数
 */
export interface AddTestPlanParams {
    id?: string;
    name: string;
    projectId?: string;
    moduleId: string;
    groupId?: string;
    type?: TestPlanType;
    tags: string[];
    description?: string;
    passThreshold: number;
    repeatCase: boolean;
    automaticStatusUpdate: boolean;
    testPlanning?: boolean;
    plannedStartTime?: number;
    plannedEndTime?: number;
    feishuStoryId?: string;
}

/**
 * 模块树节点
 */
export interface ModuleTreeNode {
    id: string;
    name: string;
    parentId: string;
    children?: ModuleTreeNode[];
    count?: number;
    type?: 'MODULE' | 'API';
    path?: string;
}

/**
 * 表格查询参数
 */
export interface TableQueryParams {
    current?: number;
    pageSize?: number;
    sort?: object;
    sortString?: string;
    filter?: object;
    keyword?: string;
    projectId?: string;
    moduleIds?: string[];
    type?: TestPlanType;
    [key: string]: any;
}

/**
 * 通用列表返回
 */
export interface CommonList<T> {
    pageSize: number;
    total: number;
    current: number;
    list: T[];
}

/**
 * 执行测试计划参数
 */
export interface ExecutePlanParams {
    executeId: string;
    projectId?: string;
    runMode: 'SERIAL' | 'PARALLEL';
    executionSource: string;
}

/**
 * 批量执行测试计划参数
 */
export interface BatchExecutePlanParams {
    projectId?: string;
    executeIds?: string[];
    runMode: 'SERIAL' | 'PARALLEL';
    executionSource: string;
}

/**
 * 关注测试计划参数
 */
export interface FollowPlanParams {
    userId: string;
    testPlanId: string;
}

// ==================== 测试计划报告相关 ====================

/** 报告用例/执行统计明细（success/error/pending 等） */
export interface ReportCountDetail {
    success: number;
    error: number;
    fakeError: number;
    block: number;
    pending: number;
}

/** 测试计划报告详情（后端 getReportDetail 返回） */
export interface PlanReportDetail {
    id: string;
    name: string;
    testPlanName?: string;
    startTime?: number;
    createdAt?: number;
    endTime?: number;
    summary?: string;
    passThreshold?: number;
    passRate?: number;
    executeRate?: number;
    bugCount?: number;
    caseTotal?: number;
    functionalTotal?: number;
    apiCaseTotal?: number;
    apiScenarioTotal?: number;
    executeCount?: ReportCountDetail;
    functionalCount?: ReportCountDetail;
    apiCaseCount?: ReportCountDetail;
    apiScenarioCount?: ReportCountDetail;
    planCount?: number;
    passCountOfPlan?: number;
    failCountOfPlan?: number;
    resultStatus?: string;
    defaultLayout?: boolean;
    createUser?: string;
    children?: PlanReportDetail[];
    [key: string]: any;
}

/** 报告分析项（指标卡片用） */
export interface ReportMetricsItemModel {
    name: string;
    value: number | string;
    unit: string;
    icon: string;
    tip?: string;
    runMode?: string;
}

/** 报告布局卡片项 */
export interface ReportLayoutCardItem {
    id: string;
    value: string;
    label: string;
    content?: string;
    type?: string;
    enableEdit?: boolean;
    richTextTmpFileIds?: string[];
}

/** 报告缺陷列表项 */
export interface ReportBugItem {
    id: string;
    num?: number;
    title?: string;
    statusName?: string;
    handleUserName?: string;
    relationCaseCount?: number;
    [key: string]: any;
}

/** 报告功能/接口/自动化用例列表项 */
export interface ReportCaseItem {
    id: string;
    num?: number;
    name?: string;
    moduleName?: string;
    priority?: string;
    executeResult?: string;
    executeUser?: string;
    bugCount?: number;
    reportId?: string;
    projectId?: string;
    requestTime?: number;
    [key: string]: any;
}

// ==================== 测试计划脑图（关联用例） ====================

/** 脑图节点关联 DTO（与 aegis-next-server PlanMinderAssociateDTO 一致） */
export interface PlanMinderAssociateDTO {
    projectId?: string;
    selectIds?: string[];
    selectAll?: boolean;
    excludeIds?: string[];
    moduleIds?: string[];
    moduleMaps?: Record<string, { selectIds: string[]; selectAll: boolean; excludeIds: string[]; moduleIds: string[] }>;
    associateType: string; // FUNCTIONAL_CASE | API_CASE | SCENARIO_CASE 等
    [key: string]: any;
}

/** 脑图编辑项（与 aegis-next-server PlanMinderEditListItem 一致） */
export interface PlanMinderEditListItem {
    id: string;
    name?: string;
    level?: number;
    type?: string;
    num?: number;
    associateDTOS?: PlanMinderAssociateDTO[];
    [key: string]: any;
}

/** 脑图编辑入参（与 aegis-next-server editPlanMinder 一致） */
export interface PlanMinderEditParams {
    planId: string;
    editList: PlanMinderEditListItem[];
    deletedIds: string[];
}
