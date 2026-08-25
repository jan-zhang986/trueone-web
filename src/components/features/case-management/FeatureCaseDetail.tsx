/**
 * 用例详情（创建/编辑）
 * 参考 aegis-next-server caseDetail.vue 与 MsCard 布局
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Play } from 'lucide-react';
import { caseManagementService } from '@/services';
import { CaseDetailForm, type CaseDetailFormRef } from './components';
import type { CaseDetail, CreateOrUpdateCaseRequest } from './types';

interface FeatureCaseDetailProps {
  mode: 'add' | 'edit' | 'copy';
  caseId?: string;
  projectId?: string;
  /** 当前 Space。新建/复制 Case 必须来自 Space 入口。 */
  spaceId?: string;
  /** 新建时从指定模块进入，预填所属模块 */
  initialModuleId?: string;
  onBack?: () => void;
  onSuccess?: (caseId: string, caseName: string) => void;
}


function mapUnifiedCaseDetailToLegacyShape(detail: any): CaseDetail {
  const manualRealization = Array.isArray(detail?.realizations)
    ? detail.realizations.find((item: any) => String(item?.realizationType || '').toUpperCase() === 'MANUAL')
    : null;
  const manualImplementation = Array.isArray(detail?.implementations)
    ? detail.implementations.find((item: any) => String(item?.type || '').toUpperCase() === 'MANUAL')
    : null;
  const manualDefinition =
    manualRealization?.workflowDefinition ||
    manualImplementation?.definition ||
    {};
  const metadata = detail?.metadata || {};
  const resolvedCaseEditType =
    metadata.caseEditType ||
    manualDefinition.caseEditType ||
    (manualDefinition.textDescription ? 'TEXT' : 'STEP');

  return {
    ...detail,
    id: detail?.caseId || detail?.id,
    caseId: detail?.caseId || detail?.id,
    num: detail?.caseKey || detail?.num,
    name: detail?.title || detail?.name || '',
    prerequisite: detail?.precondition || detail?.prerequisite || '',
    caseEditType: resolvedCaseEditType,
    steps: manualDefinition.steps || detail?.steps || '',
    textDescription: manualDefinition.textDescription || detail?.textDescription || '',
    expectedResult: detail?.expectedResult || manualDefinition.expectedResult || '',
    description: detail?.description || '',
    reviewStatus: detail?.lifecycleStatus || detail?.reviewStatus,
    customFields: Array.isArray(detail?.customFields) ? detail.customFields : [],
    functionalPriority: detail?.functionalPriority || detail?.priority,
    attachments: Array.isArray(detail?.attachments) ? detail.attachments : [],
    tags: Array.isArray(detail?.tags) ? detail.tags : [],
  } as CaseDetail;
}

function resolveUploadedFileId(res: any): string {
  if (typeof res === 'string') return res;
  if (typeof res?.data === 'string') return res.data;
  const fileId = res?.data?.id ?? res?.data?.fileId ?? res?.id ?? res?.fileId;
  if (!fileId || typeof fileId !== 'string') {
    throw new Error('上传失败：无法获取文件 ID');
  }
  return fileId;
}

async function uploadCaseAttachments(fileList: File[] = []): Promise<string[]> {
  const fileIds: string[] = [];
  for (const file of fileList) {
    const res = await caseManagementService.editorUploadFile({ fileList: [file] });
    fileIds.push(resolveUploadedFileId(res));
  }
  return fileIds;
}

function buildUnifiedCasePayload(
  req: CreateOrUpdateCaseRequest & { fileList?: File[] },
  options: {
    caseId?: string;
    spaceId?: string;
    sourceType?: string;
    lifecycleStatus?: string;
    ownerId?: string;
    uploadFileIds?: string[];
  }
) {
  const manualDefinition: Record<string, any> = {
    caseEditType: req.caseEditType,
    expectedResult: req.expectedResult,
  };
  if (req.caseEditType === 'STEP') {
    manualDefinition.steps = req.steps;
  } else {
    manualDefinition.textDescription = req.textDescription;
  }

  return {
    caseId: options.caseId,
    projectId: req.projectId,
    spaceId: options.spaceId,
    moduleId: req.moduleId,
    title: req.name,
    description: req.description,
    precondition: req.prerequisite,
    expectedResult: req.expectedResult,
    sourceType: options.sourceType,
    lifecycleStatus: options.lifecycleStatus,
    ownerId: options.ownerId,
    tags: req.tags,
    workflowId: req.workflowId,
    uploadFileIds: options.uploadFileIds || req.uploadFileIds,
    relateFileMetaIds: req.relateFileMetaIds,
    deleteFileMetaIds: req.deleteFileMetaIds,
    unLinkFilesIds: req.unLinkFilesIds,
    metadata: {
      templateId: req.templateId,
      caseEditType: req.caseEditType,
    },
    realizations: [
      {
        realizationType: 'MANUAL',
        name: `${req.name} [MANUAL]`,
        workflowDefinition: manualDefinition,
        status: 'ACTIVE',
        enabled: true,
      },
    ],
    // @deprecated compatibility payload for legacy backend write path; product-facing clients should prefer realizations
    implementations: [
      {
        type: 'MANUAL',
        name: `${req.name} [MANUAL]`,
        definition: manualDefinition,
      },
    ],
  };
}

export function FeatureCaseDetail({
  mode,
  caseId,
  projectId = localStorage.getItem('currentProjectId') || 'default-project',
  spaceId,
  initialModuleId,
  onBack,
  onSuccess,
}: FeatureCaseDetailProps) {
  const [loading, setLoading] = useState(false);
  const [defaultCaseInfo, setDefaultCaseInfo] = useState<CaseDetail | null>(null);
  const [viewMode, setViewMode] = useState<'text' | 'workflow'>('text');
  const formRef = useRef<CaseDetailFormRef>(null);

  const title = mode === 'edit' ? '编辑用例' : mode === 'copy' ? '复制用例' : '创建用例';
  const okText = mode === 'edit' ? '更新' : '确定';
  const isEdit = mode === 'edit';
  const [executing, setExecuting] = useState(false);
  const handleExecute = async () => {
    if (!caseId) return;
    setExecuting(true);
    try {
      const res: any = await caseManagementService.executeCaseWorkflow(caseId);
      if (res?.success !== false) {
        toast.success('自动化已触发执行');
      } else {
        toast.error(res?.message || '执行触发失败');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || '执行触发失败，请检查是否已绑定自动化');
    } finally {
      setExecuting(false);
    }
  };

  useEffect(() => {
    if ((mode === 'edit' || mode === 'copy') && caseId) {
      caseManagementService
        .getUnifiedCaseDetail(caseId)
        .then((res: any) => mapUnifiedCaseDetailToLegacyShape(res))
        .catch(async () => {
          const legacyRes = await caseManagementService.getCaseDetail(caseId);
          return legacyRes;
        })
        .then((res: any) => {
          setDefaultCaseInfo(res);
          if (mode === 'copy' && res?.name) {
            setDefaultCaseInfo({
              ...res,
              name: `copy_${res.name}`.slice(0, 255),
              id: '',
            });
          }
        })
        .catch(() => setDefaultCaseInfo(null));
    } else {
      setDefaultCaseInfo(null);
    }
  }, [mode, caseId]);

  const handleSave = useCallback(async (isContinue = false) => {
    const form = formRef.current;
    if (!form) return;
    const valid = await form.validate();
    if (!valid) {
      toast.error('请完善必填项：用例名称、所属模块、前置条件、步骤/文本描述');
      return;
    }
    setLoading(true);
    try {
      const req = form.getRequest();
      const request: Record<string, any> = {
        projectId: req.projectId || projectId || defaultCaseInfo?.projectId || localStorage.getItem('currentProjectId') || 'default-project',
        templateId: req.templateId || defaultCaseInfo?.templateId || 'default-template',
        name: req.name,
        prerequisite: req.prerequisite,
        caseEditType: req.caseEditType || defaultCaseInfo?.caseEditType || 'STEP',
        steps: req.steps,
        textDescription: req.textDescription,
        expectedResult: req.expectedResult,
        description: req.description,
        moduleId: req.moduleId || defaultCaseInfo?.moduleId,
        tags: req.tags,
        customFields: req.customFields,
        versionId: req.versionId || defaultCaseInfo?.versionId,
        spaceId: spaceId || defaultCaseInfo?.spaceId,
      };
      if (caseId && mode === 'edit') {
        request.id = caseId;
      }

      if (mode === 'add' || mode === 'copy') {
        let id = '';
        if (!spaceId) {
          const { fileList: fl, ...reqBody } = req;
          const res: any = await caseManagementService.createCaseRequest({
            request: {
              ...request,
              ...reqBody,
            },
            fileList: fl || [],
          });
          id = res?.id ?? res?.data?.id ?? '';
        } else {
          const uploadFileIds = await uploadCaseAttachments(req.fileList || []);
          id = await caseManagementService.saveUnifiedCase(
            buildUnifiedCasePayload(req, {
              spaceId,
              sourceType: defaultCaseInfo?.aiCreate ? 'AI' : undefined,
              uploadFileIds,
            })
          );
        }
        if (isContinue) {
          toast.success('保存成功');
          form.resetForm();
          return;
        }
        onSuccess?.(id, req.name);
      } else if (mode === 'edit' && caseId) {
        const resolvedSpaceId = spaceId || defaultCaseInfo?.spaceId;
        const updatePayload: Record<string, any> = {
          ...defaultCaseInfo,
          ...request,
          id: caseId,
          fileList: req.fileList || [],
        };
        if (!resolvedSpaceId) {
          await caseManagementService.updateCaseRequest(updatePayload);
        } else {
          try {
            const uploadFileIds = await uploadCaseAttachments(req.fileList || []);
            await caseManagementService.saveUnifiedCase(
              buildUnifiedCasePayload(req, {
                caseId,
                spaceId: resolvedSpaceId,
                sourceType: defaultCaseInfo?.aiCreate ? 'AI' : undefined,
                lifecycleStatus: defaultCaseInfo?.reviewStatus,
                ownerId: defaultCaseInfo?.createUser,
                uploadFileIds,
              })
            );
          } catch (unifiedErr) {
            console.warn('Unified save failed in full page mode, fallback to legacy update:', unifiedErr);
            await caseManagementService.updateCaseRequest(updatePayload);
          }
        }
        toast.success('保存成功');
        onSuccess?.(caseId, req.name);
      }
    } catch (err: any) {
      console.error('保存失败:', err);
      toast.error(err?.message || '保存失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [mode, caseId, projectId, spaceId, defaultCaseInfo, onSuccess]);

  // 快捷键 Ctrl+S 保存（参考 spotter useShortcutSave）
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave]);

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-h-0 overflow-hidden">
      <Card className="flex-1 m-4 min-h-0 flex flex-col overflow-hidden">
        {/* 头部：面包屑 + 标题 + 一体化视图切换器 */}
        <div className="px-6 pt-6 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="hover:text-gray-800 flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  用例
                </button>
              )}
              {onBack && <ChevronRight className="w-4 h-4 text-gray-400" />}
              <span className="text-gray-800 font-medium">{title}</span>
            </div>

            {/* 一体化双视图切换 (📖 业务文本视图 vs ⚡ 自动化 Workflow 视图) */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('text')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  viewMode === 'text'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📖 业务用例
              </button>
              <button
                type="button"
                onClick={() => setViewMode('workflow')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  viewMode === 'workflow'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ⚡ 自动化编排
              </button>
            </div>
          </div>
          <div className="h-px bg-gray-200 -mx-6" />
        </div>

        {/* 内容区：可滚动 */}
        <CardContent className="flex-1 p-6 min-h-0 overflow-auto">
          <div className="relative min-w-[1000px]">
            {loading && (
              <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-lg">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            
            {viewMode === 'text' ? (
              <CaseDetailForm
                ref={formRef}
                caseId={mode === 'edit' ? caseId : undefined}
                projectId={projectId}
                defaultCaseInfo={defaultCaseInfo}
                initialModuleId={mode === 'add' ? initialModuleId : undefined}
              />
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white text-xs font-black">⚡</span>
                      自动化执行编排
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      为此用例配置自动化执行指令与节点映射。
                    </p>
                  </div>
                  {defaultCaseInfo?.workflowId ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                      已关联自动化指令
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200">
                      未绑定自动化指令
                    </span>
                  )}
                </div>

                <CaseDetailForm
                  ref={formRef}
                  caseId={mode === 'edit' ? caseId : undefined}
                  projectId={projectId}
                  defaultCaseInfo={defaultCaseInfo}
                  initialModuleId={mode === 'add' ? initialModuleId : undefined}
                />
              </div>
            )}
          </div>
        </CardContent>

        {/* 底部：操作按钮（参考 MsCard footerRight） */}
        <div className="shrink-0 px-6 py-4 border-t border-gray-100 flex justify-end items-center gap-4">
          <div className="flex-1">
            {mode === 'edit' && defaultCaseInfo?.workflowId && (
              <Button 
                variant="outline" 
                className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                onClick={handleExecute}
                disabled={executing || loading}
              >
                <Play className="w-4 h-4 mr-2" />
                {executing ? '启动中...' : '执行自动化'}
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={onBack} disabled={loading}>
            取消
          </Button>
          {!isEdit && (
            <Button
              variant="outline"
              onClick={() => handleSave(true)}
              disabled={loading}
            >
              保存并继续
            </Button>
          )}
          <Button onClick={() => handleSave(false)} disabled={loading}>
            {loading ? '保存中...' : okText}
          </Button>
        </div>
      </Card>
    </div>
  );
}
