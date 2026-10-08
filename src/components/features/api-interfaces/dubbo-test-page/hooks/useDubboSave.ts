/**
 * DubboTestPage 保存：handleSave、handleSaveDialogConfirm、handleDirectSave、同步数据/元数据
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { metadataService, pluginSyncNodeService, type MetadataDefinition } from '@/services/metadata';
import type { UseApiEditorResult } from '@/hooks/useApiEditor';
import type { DubboRequestConfig } from '../types';

export interface UseDubboSaveOptions {
  buildRequestConfig: (selectedSite: string) => DubboRequestConfig;
  selectedSite: string;
  editor: UseApiEditorResult;
  projectId: string;
  spaceId?: string;
  onRefresh?: () => void;
  isSyncData: boolean;
  isCase: boolean;
  nodeId: string;
  findTestDataModuleId: string | null;
  loadedDefinitionIdRef: React.MutableRefObject<string | null>;
  interfaceName: string;
  methodName: string;
  applicationName: string;
}

export function useDubboSave({
  buildRequestConfig,
  selectedSite,
  editor,
  projectId,
  spaceId,
  onRefresh,
  isSyncData,
  isCase,
  nodeId,
  findTestDataModuleId,
  loadedDefinitionIdRef,
  interfaceName,
  methodName,
  applicationName,
}: UseDubboSaveOptions) {
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isSavingSyncData, setIsSavingSyncData] = useState(false);

  const handleDirectSave = async (requestConfig: DubboRequestConfig, saveAsTestData: boolean) => {
    let moduleId = editor.state.moduleId || editor.confirmModuleId;
    if (saveAsTestData) {
      if (!findTestDataModuleId) {
        toast.error('未找到"测试数据"模块，请先创建该模块');
        return;
      }
      moduleId = findTestDataModuleId;
    } else {
      if (!moduleId) {
        toast.error('请选择所属模块');
        return;
      }
    }
    const name = editor.state.name?.trim();
    if (!name) {
      toast.error('请输入接口名称');
      return;
    }
    try {
      const common = { name, moduleId, description: editor.state.description || undefined, tags: editor.state.tags?.length ? editor.state.tags : undefined };
      const isUpdate = !!editor.state.definitionId && !saveAsTestData;
      const result = isUpdate
        ? await metadataService.updateDefinition({ id: editor.state.definitionId!, ...(spaceId ? { spaceId } : {}), ...common, requestConfig, scriptContent: null } as Parameters<typeof metadataService.updateDefinition>[0])
        : await metadataService.addDefinition({ ...common, protocol: 'DUBBO', projectId, ...(spaceId ? { spaceId } : {}), requestConfig, scriptContent: null, isCase: saveAsTestData ? true : undefined } as Parameters<typeof metadataService.addDefinition>[0]);
      if (!result) {
        toast.error('保存失败：服务器返回数据为空');
        return;
      }
      const newId = typeof result === 'string' ? result : result.id;
      if (newId) {
        const def: MetadataDefinition = {
          id: newId,
          name: typeof result === 'string' ? editor.state.name : (result as MetadataDefinition).name || editor.state.name,
          protocol: 'DUBBO',
          projectId,
          moduleId: typeof result === 'string' ? moduleId : (result as MetadataDefinition).moduleId || moduleId,
          version: typeof result === 'string' ? 1 : (result as MetadataDefinition).version || 1,
          isLatest: typeof result === 'string' ? true : (result as MetadataDefinition).isLatest ?? true,
          description: typeof result === 'string' ? editor.state.description : (result as MetadataDefinition).description || editor.state.description,
          tags: typeof result === 'string' ? editor.state.tags : (result as MetadataDefinition).tags || editor.state.tags || [],
          requestConfig: typeof result === 'string' ? requestConfig : (result as MetadataDefinition).requestConfig || requestConfig,
          createUser: typeof result === 'string' ? '' : (result as MetadataDefinition).createUser || '',
          createdAt: typeof result === 'string' ? Date.now() : (result as MetadataDefinition).createdAt || Date.now(),
          updatedAt: typeof result === 'string' ? Date.now() : (result as MetadataDefinition).updatedAt || Date.now(),
        };
        editor.loadFromDefinition(def);
        loadedDefinitionIdRef.current = newId;
      }
      toast.success(isUpdate ? '接口已更新' : '接口已保存');
      setTimeout(() => onRefresh?.(), 500);
    } catch (e: unknown) {
      console.error('保存接口失败:', e);
      toast.error((e as { message?: string })?.message || '保存失败，请稍后重试');
    }
  };

  const handleSave = async () => {
    if (!editor.state.name?.trim()) { toast.error('请输入DUBBO接口名称'); return; }
    if (!interfaceName.trim()) { toast.error('请输入服务接口'); return; }
    if (!methodName.trim()) { toast.error('请输入方法名'); return; }
    if (!applicationName.trim()) { toast.error('请输入应用名称'); return; }
    if (!selectedSite?.trim()) { toast.error('请选择站点租户'); return; }

    const cfg = buildRequestConfig(selectedSite);

    if (isSyncData) {
      try {
        setIsSavingSyncData(true);
        const endpointData = {
          name: editor.state.name || '',
          url: '',
          interface_name: cfg.interfaceName,
          interfaceName: cfg.interfaceName,
          method_name: cfg.methodName,
          methodName: cfg.methodName,
          application_name: cfg.applicationName,
          applicationName: cfg.applicationName,
          parameterTypes: cfg.parameterTypes || [],
          paramTypes: cfg.parameterTypes || [],
          params: cfg.params || [],
          version: '',
          group: '',
          timeout: 3000,
        };
        await pluginSyncNodeService.updateNode({ nodeId, endpointData });
        toast.success('同步数据保存成功');
        onRefresh?.();
      } catch (err: unknown) {
        console.error('保存同步数据失败:', err);
        toast.error((err as { message?: string; response?: { data?: { message?: string } } })?.message || (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '保存同步数据失败，请重试');
      } finally {
        setIsSavingSyncData(false);
      }
      return;
    }

    if (!isCase) {
      await handleDirectSave(cfg, true);
      return;
    }
    if (!editor.state.moduleId && !editor.confirmModuleId) {
      editor.setIsConfirmDialogOpen(true);
      return;
    }
    if (editor.state.definitionId) {
      await handleDirectSave(cfg, false);
    } else {
      setIsSaveDialogOpen(true);
    }
  };

  const handleSaveDialogConfirm = async () => {
    if (!editor.state.moduleId && !editor.confirmModuleId) {
      toast.error('请选择所属模块');
      return;
    }
    await handleDirectSave(buildRequestConfig(selectedSite), false);
    setIsSaveDialogOpen(false);
  };

  return { isSaveDialogOpen, setIsSaveDialogOpen, isSavingSyncData, handleSave, handleSaveDialogConfirm };
}
