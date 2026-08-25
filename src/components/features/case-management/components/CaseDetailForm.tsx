/**
 * 用例详情表单
 * 1:1 迁移自 aegis-next-server caseTemplateDetail.vue
 */

import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { caseManagementService } from '@/services';
import { CaseEditTypeToggle } from './CaseEditTypeToggle';
import { StepEditor } from './StepEditor';
import { CaseModuleSelect } from './CaseModuleSelect';
import { CustomFieldsForm } from './CustomFieldsForm';
import { CaseRealizationSection } from './CaseRealizationSection';
import { WorkflowSelect } from './WorkflowSelect';
import { generateId } from '../utils';
import { getCaseLevel } from '../utils/getCaseLevel';
import type {
  CaseDetail,
  CaseEditType,
  CreateOrUpdateCaseRequest,
  StepListItem,
  ModuleTreeNode,
  CaseCustomField,
} from '../types';

function parseSteps(stepsStr?: string): StepListItem[] {
  if (!stepsStr?.trim()) return [{ id: generateId(), step: '', expected: '' }];
  try {
    const arr = JSON.parse(stepsStr);
    if (!Array.isArray(arr))
      return [{ id: generateId(), step: '', expected: '' }];
    return arr.map((item: any) => ({
      id: item.id || generateId(),
      step: item.desc ?? item.step ?? '',
      expected: item.result ?? item.expected ?? '',
    }));
  } catch {
    return [{ id: generateId(), step: '', expected: '' }];
  }
}

function buildStepsPayload(steps: StepListItem[]): string {
  const payload = steps
    .filter((s) => s.step?.trim())
    .map((s, i) => ({
      id: s.id,
      num: i,
      desc: s.step,
      result: s.expected,
    }));
  return payload.length ? JSON.stringify(payload) : '';
}

export interface CaseDetailFormRef {
  validate: () => Promise<boolean>;
  getRequest: () => CreateOrUpdateCaseRequest & { fileList: File[] };
  resetForm: () => void;
}

type ExistingCaseAttachment = {
  fileId: string;
  fileName: string;
};

interface CaseDetailFormProps {
  caseId?: string;
  projectId: string;
  defaultCaseInfo?: CaseDetail | null;
  /** 新建时从指定模块进入，预填所属模块 */
  initialModuleId?: string;
  value?: CreateOrUpdateCaseRequest & { fileList?: File[] };
  onChange?: (v: CreateOrUpdateCaseRequest & { fileList?: File[] }) => void;
  onModuleTreeLoaded?: (tree: ModuleTreeNode[]) => void;
}

export const CaseDetailForm = forwardRef<CaseDetailFormRef, CaseDetailFormProps>(
  (props, ref) => {
    const { caseId, projectId, defaultCaseInfo, initialModuleId, value, onChange, onModuleTreeLoaded } = props;
    const [moduleTree, setModuleTree] = useState<ModuleTreeNode[]>([]);
    const [customFields, setCustomFields] = useState<CaseCustomField[]>([]);
    const [loadingFields, setLoadingFields] = useState(true);
    const [name, setName] = useState('');
    const [prerequisite, setPrerequisite] = useState('');
    const [caseEditType, setCaseEditType] = useState<CaseEditType>('STEP');
    const [steps, setSteps] = useState<StepListItem[]>([{ id: generateId(), step: '', expected: '' }]);
    const [textDescription, setTextDescription] = useState('');
    const [expectedResult, setExpectedResult] = useState('');
    const [description, setDescription] = useState('');
    const [moduleId, setModuleId] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
    const [fileList, setFileList] = useState<File[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<ExistingCaseAttachment[]>([]);
    const [unLinkFilesIds, setUnLinkFilesIds] = useState<string[]>([]);
    const [templateId, setTemplateId] = useState('');
    const [workflowId, setWorkflowId] = useState('');
    const [type, setType] = useState<string>('FUNCTIONAL');

    const initialLoad = useRef(false);

    const handleUploadImage = useCallback(
      async (file: File): Promise<string> => {
        const res: any = await caseManagementService.editorUploadFile({ fileList: [file] });
        // 兼容多种后端响应格式：直接返回 id 字符串 / { data: id } / { id, fileId } 等
        let fileId: string | undefined;
        if (typeof res === 'string') fileId = res;
        else if (res?.data != null) fileId = typeof res.data === 'string' ? res.data : res.data?.id ?? res.data?.fileId;
        else if (res?.id) fileId = res.id;
        else if (res?.fileId) fileId = res.fileId;
        if (!fileId || typeof fileId !== 'string') throw new Error('上传失败：无法获取文件 ID');
        return `/attachment/download/file/${projectId}/${fileId}/true`;
      },
      [projectId]
    );

    useEffect(() => {
      caseManagementService.getCaseModuleTree({ projectId }).then((tree: any) => {
        const t = Array.isArray(tree) ? tree : tree || [];
        setModuleTree(t);
        onModuleTreeLoaded?.(t);
      }).catch(() => setModuleTree([]));
    }, [projectId, onModuleTreeLoaded]);

    useEffect(() => {
      setLoadingFields(true);
      caseManagementService
        .getCaseDefaultFields(projectId)
        .then((res: any) => {
          const custom = res?.customFields || [];
          const system = res?.systemFields || [];
          setCustomFields(custom);
          setTemplateId(res?.id || '');
          const vals: Record<string, any> = {};
          custom.forEach((f: CaseCustomField) => {
            const isPriority =
              f.fieldId === 'functional_priority' ||
              (f as any).internalFieldKey === 'functional_priority';
            // 创建用例时，用例等级默认 P0（覆盖模板默认值）
            vals[f.fieldId] = isPriority ? 'P0' : (f.defaultValue ?? '');
            if (isPriority) {
              vals['functional_priority'] = 'P0';
            }
          });
          system?.forEach((f: any) => {
            if (vals[f.fieldId] === '' || vals[f.fieldId] == null) {
              vals[f.fieldId] = f.defaultValue ?? '';
            }
          });
          setCustomFieldValues(vals);
        })
        .catch(() => setCustomFields([]))
        .finally(() => setLoadingFields(false));
    }, [projectId]);

    // 新建时从指定模块进入，预填所属模块
    useEffect(() => {
      if (!defaultCaseInfo && initialModuleId) {
        setModuleId(initialModuleId);
      }
    }, [defaultCaseInfo, initialModuleId]);

    useEffect(() => {
      if (defaultCaseInfo && !initialLoad.current) {
        initialLoad.current = true;
        const res = defaultCaseInfo;
        setName(res?.name || '');
        setPrerequisite(res?.prerequisite || '');
        setCaseEditType((res?.caseEditType || 'STEP') as CaseEditType);
        setTextDescription(res?.textDescription || '');
        setExpectedResult(res?.expectedResult || '');
        setDescription(res?.description || '');
        setModuleId(res?.moduleId || '');
        setType(res?.type || res?.caseType || 'FUNCTIONAL');
        const tagVal = res?.tags;
        setTags(Array.isArray(tagVal) ? tagVal : typeof tagVal === 'string' ? (tagVal ? [tagVal] : []) : []);
        if (res?.steps) setSteps(parseSteps(res.steps));
        const attachments = Array.isArray(res?.attachments) ? res.attachments : [];
        setExistingAttachments(
          attachments
            .map((item: any) => ({
              fileId: String(item?.fileId || item?.id || item?.attachmentId || ''),
              fileName: String(item?.fileName || item?.name || item?.fileId || '未命名附件'),
            }))
            .filter((item: ExistingCaseAttachment) => item.fileId)
        );
        setUnLinkFilesIds([]);
        const cf: Record<string, any> = {};
        (res?.customFields || []).forEach((f: any) => {
          if (f.value !== undefined && f.value !== null) {
            if (f.fieldId) cf[f.fieldId] = f.value;
            if (f.internalFieldKey) cf[f.internalFieldKey] = f.value;
          }
        });
        // 用例等级：兼容顶层 functionalPriority/caseLevel 及 customFields 中 fieldId/internalFieldKey
        const priorityVal = res?.functionalPriority ?? res?.caseLevel ?? (() => { const l = getCaseLevel(res as any); return l && l !== '-' ? l : undefined; })();
        if (priorityVal) {
          cf['functional_priority'] = priorityVal;
          const priorityField = customFields.find((f: any) => f.fieldId === 'functional_priority' || f.internalFieldKey === 'functional_priority');
          if (priorityField?.fieldId) cf[priorityField.fieldId] = priorityVal;
        }
        setWorkflowId(res?.workflowId || '');
        setCustomFieldValues((v) => ({ ...v, ...cf }));
      }
    }, [defaultCaseInfo]);

    // 模板 customFields 可能晚于 defaultCaseInfo 加载，用例等级需写入模板的 fieldId（可能为 UUID）
    useEffect(() => {
      if (!defaultCaseInfo || !customFields?.length) return;
      const priorityVal = defaultCaseInfo.functionalPriority ?? defaultCaseInfo.caseLevel ?? (() => { const l = getCaseLevel(defaultCaseInfo as any); return l && l !== '-' ? l : undefined; })();
      if (!priorityVal) return;
      const priorityField = customFields.find((f: any) => f.fieldId === 'functional_priority' || f.internalFieldKey === 'functional_priority');
      if (priorityField?.fieldId) {
        setCustomFieldValues((v) => (v[priorityField.fieldId] === priorityVal ? v : { ...v, [priorityField.fieldId]: priorityVal }));
      }
    }, [defaultCaseInfo, customFields]);

    const emitChange = useCallback(() => {
      const request: CreateOrUpdateCaseRequest = {
        projectId,
        templateId,
        name,
        prerequisite,
        caseEditType,
        steps: buildStepsPayload(steps),
        textDescription,
        expectedResult,
        description,
        moduleId,
        type,
        caseType: type,
        tags,
        customFields: Object.entries(customFieldValues).map(([fieldId, value]) => ({
          fieldId,
          value: Array.isArray(value) ? JSON.stringify(value) : String(value ?? ''),
        })),
        workflowId,
        relateFileMetaIds: existingAttachments.map((item) => item.fileId),
        unLinkFilesIds,
      };
      if (caseId) request.id = caseId;
      onChange?.({ ...request, fileList });
    }, [
      projectId,
      templateId,
      name,
      prerequisite,
      caseEditType,
      steps,
      textDescription,
      expectedResult,
      description,
      moduleId,
      tags,
      customFieldValues,
      fileList,
      existingAttachments,
      unLinkFilesIds,
      workflowId,
      caseId,
      onChange,
    ]);

    useEffect(() => {
      emitChange();
    }, [emitChange]);

    useImperativeHandle(ref, () => ({
      validate: async () => {
        if (!name?.trim()) return false;
        if (!moduleId) return false;
        if (caseEditType === 'STEP') {
          const hasStep = steps.some((s) => s.step?.trim());
          if (!hasStep) return false;
        }
        if (caseEditType === 'TEXT') {
          if (!textDescription?.trim()) return false;
        }
        if (!prerequisite?.trim()) return false;
        return true;
      },
      getRequest: () => ({
        projectId,
        templateId,
        name,
        prerequisite,
        caseEditType,
        steps: buildStepsPayload(steps),
        textDescription,
        expectedResult,
        description,
        moduleId,
        tags,
        customFields: Object.entries(customFieldValues).map(([fieldId, value]) => ({
          fieldId,
          value: Array.isArray(value) ? JSON.stringify(value) : String(value ?? ''),
        })),
        workflowId,
        relateFileMetaIds: existingAttachments.map((item) => item.fileId),
        unLinkFilesIds,
        fileList,
      }),
      resetForm: () => {
        setCaseEditType('STEP');
        setSteps([{ id: generateId(), step: '', expected: '' }]);
        setTextDescription('');
        setExpectedResult('');
        setDescription('');
        setFileList([]);
        setExistingAttachments([]);
        setUnLinkFilesIds([]);
        setWorkflowId('');
      },
    }));

    const handleCustomFieldChange = useCallback((fieldId: string, value: any) => {
      setCustomFieldValues((v) => ({ ...v, [fieldId]: value }));
    }, []);

    return (
      <div className="flex gap-6 wrapper-preview">
        {/* 左侧：主表单内容（参考 caseTemplateDetail preview-left） */}
        <div className="flex-1 space-y-5 pr-6 border-r border-gray-200 min-w-0">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">用例名称 <span className="text-red-500">*</span></Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入用例名称"
              maxLength={255}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">前置条件 <span className="text-red-500">*</span></Label>
            <RichTextEditor
              value={prerequisite}
              onChange={setPrerequisite}
              uploadImage={handleUploadImage}
              placeholder="请输入前置条件"
              minHeight="100px"
            />
          </div>
          <CaseEditTypeToggle value={caseEditType} onChange={setCaseEditType} />
          {caseEditType === 'STEP' ? (
            <StepEditor steps={steps} onChange={setSteps} />
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">文本描述 <span className="text-red-500">*</span></Label>
                <RichTextEditor
                  value={textDescription}
                  onChange={setTextDescription}
                  uploadImage={handleUploadImage}
                  placeholder="请输入文本描述"
                  minHeight="140px"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">预期结果</Label>
                <RichTextEditor
                  value={expectedResult}
                  onChange={setExpectedResult}
                  uploadImage={handleUploadImage}
                  placeholder="请输入预期结果"
                  minHeight="100px"
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">备注</Label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              uploadImage={handleUploadImage}
              placeholder="请输入备注"
              minHeight="100px"
            />
          </div>

          <div className="space-y-4 rounded-lg border border-gray-100 bg-gray-50/30 p-4">
            <Label className="text-sm font-semibold text-gray-900">用例实现绑定</Label>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 font-medium">关联自动化</Label>
                <WorkflowSelect
                  projectId={projectId}
                  value={workflowId}
                  onChange={setWorkflowId}
                  placeholder="选择自动化"
                />
                <p className="text-[11px] text-gray-400">
                  绑定后与本条用例一一对应，可从用例直接触发自动化。
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">附件</Label>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
              <input
                type="file"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setFileList((prev) => [...prev, ...files]);
                  e.target.value = '';
                }}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {fileList.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {fileList.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded bg-gray-50 hover:bg-gray-100">
                      <span className="flex-1 truncate text-gray-700" title={f.name}>{f.name}</span>
                      <span className="text-gray-400 text-xs shrink-0">{(f.size / 1024).toFixed(1)} KB</span>
                      <button
                        type="button"
                        onClick={() => setFileList((prev) => prev.filter((_, j) => j !== i))}
                        className="text-red-500 hover:text-red-700 text-xs px-1"
                        title="删除"
                      >
                        删除
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 mt-2">支持多选，拖拽或点击上传</p>
              )}
              {existingAttachments.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {existingAttachments.map((attachment) => (
                    <li
                      key={attachment.fileId}
                      className="flex items-center gap-2 text-sm py-1.5 px-2 rounded bg-white border border-gray-100 hover:bg-gray-50"
                    >
                      <span className="flex-1 truncate text-gray-700" title={attachment.fileName}>
                        {attachment.fileName}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setExistingAttachments((prev) => prev.filter((item) => item.fileId !== attachment.fileId));
                          setUnLinkFilesIds((prev) => (prev.includes(attachment.fileId) ? prev : [...prev, attachment.fileId]));
                        }}
                        className="text-red-500 hover:text-red-700 text-xs px-1"
                        title="移除"
                      >
                        移除
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        {/* 右侧：模块 + 自定义字段 + 标签（参考 caseTemplateDetail preview-right 428px） */}
        <div className="w-[400px] shrink-0 space-y-5 pl-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">用例类型</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full h-9 border-gray-200 bg-white text-xs">
                <SelectValue placeholder="选择用例类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FUNCTIONAL"><span className="text-xs font-semibold">功能测试用例 (Functional)</span></SelectItem>
                <SelectItem value="API"><span className="text-xs font-semibold">API 接口测试用例 (HTTP)</span></SelectItem>
                <SelectItem value="UI_AUTOMATION"><span className="text-xs font-semibold">UI 自动化测试用例 (Web UI)</span></SelectItem>
                <SelectItem value="PERF"><span className="text-xs font-semibold">性能测试用例 (Load Test)</span></SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CaseModuleSelect
            moduleTree={moduleTree}
            value={moduleId}
            onChange={setModuleId}
            required
          />
          {!loadingFields && (
            <CustomFieldsForm
              fields={customFields}
              values={customFieldValues}
              onChange={handleCustomFieldChange}
            />
          )}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">标签</Label>
            <Input
              value={Array.isArray(tags) ? tags.join(', ') : tags}
              onChange={(e) =>
                setTags(
                  e.target.value
                    .split(/[,，]/)
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
              placeholder="多个标签用逗号分隔"
            />
          </div>
          <CaseRealizationSection caseId={caseId} />
        </div>
      </div>
    );
  }
);
