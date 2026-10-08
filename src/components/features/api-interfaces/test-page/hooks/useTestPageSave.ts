/**
 * TestPage 保存逻辑：handleSave、handleSaveDialogConfirm、handleDirectSave、同步数据 / 元数据
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { metadataService, pluginSyncNodeService, type MetadataDefinition } from '@/services/metadata';
import type { UseApiEditorResult } from '@/hooks/useApiEditor';

export interface UseTestPageSaveOptions {
  buildRequestConfig: () => Record<string, unknown>;
  url?: string;
  editor: UseApiEditorResult;
  projectId: string;
  spaceId?: string;
  definitionId?: string;
  onRefresh?: () => void;
  isSyncData: boolean;
  isCase: boolean;
  nodeId: string;
  findTestDataModuleId: string | null;
  loadedDefinitionIdRef: React.MutableRefObject<string | null>;
}

export function useTestPageSave({
  buildRequestConfig,
  url,
  editor,
  projectId,
  spaceId,
  onRefresh,
  isSyncData,
  isCase,
  nodeId,
  findTestDataModuleId,
  loadedDefinitionIdRef,
}: UseTestPageSaveOptions) {
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isSavingSyncData, setIsSavingSyncData] = useState(false);

  const handleDirectSave = async (requestConfig: Record<string, unknown>, saveAsTestData: boolean) => {
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
      const common = {
        name,
        moduleId,
        description: editor.state.description || undefined,
        tags: editor.state.tags?.length ? editor.state.tags : undefined,
      };

      const isUpdate = !!editor.state.definitionId && !saveAsTestData;
      let result: MetadataDefinition | string | null = null;

      if (isUpdate) {
        result = await metadataService.updateDefinition({
          id: editor.state.definitionId!,
          ...(spaceId ? { spaceId } : {}),
          ...common,
          requestConfig,
        } as Parameters<typeof metadataService.updateDefinition>[0]);
      } else {
        result = await metadataService.addDefinition({
          ...common,
          protocol: 'HTTP',
          projectId,
          ...(spaceId ? { spaceId } : {}),
          requestConfig,
          isCase: saveAsTestData ? true : undefined,
        } as Parameters<typeof metadataService.addDefinition>[0]);
      }

      if (!result) {
        toast.error('保存失败：服务器返回数据为空');
        return;
      }

      const newDefinitionId = typeof result === 'string' ? result : result.id;
      if (newDefinitionId) {
        const updatedDefinition: MetadataDefinition = {
          id: newDefinitionId,
          name: typeof result === 'string' ? editor.state.name : (result as MetadataDefinition).name || editor.state.name,
          protocol: 'HTTP',
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
        editor.loadFromDefinition(updatedDefinition);
        loadedDefinitionIdRef.current = newDefinitionId;
      }

      toast.success(isUpdate ? '接口已更新' : '接口已保存');
      setTimeout(() => onRefresh?.(), 500);
    } catch (e: unknown) {
      console.error('保存接口失败:', e);
      toast.error((e as { message?: string })?.message || '保存失败，请稍后重试');
    }
  };

  const handleSave = async () => {
    if (!url) {
      toast.error('请输入接口地址');
      return;
    }
    const requestConfig = buildRequestConfig();

    if (isSyncData) {
      try {
        setIsSavingSyncData(true);
        const endpointData = {
          name: editor.state.name || '',
          method: (requestConfig.method as string) || 'GET',
          url: (requestConfig.url as string) || '',
          path: (requestConfig.path as string) || (requestConfig.url as string) || '',
          headers: (requestConfig.headers as Record<string, string>) || {},
          queryParams: (requestConfig.query as Record<string, string>) || (requestConfig.queryParams as Record<string, string>) || {},
          body: (requestConfig.body as Record<string, unknown>) || {},
        };
        await pluginSyncNodeService.updateNode({ nodeId, endpointData });
        toast.success('同步数据保存成功');
        onRefresh?.();
      } catch (err: unknown) {
        console.error('保存同步数据失败:', err);
        const msg = (err as { message?: string; response?: { data?: { message?: string } } })?.message
          || (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          || '保存同步数据失败，请重试';
        toast.error(msg);
      } finally {
        setIsSavingSyncData(false);
      }
      return;
    }

    if (!isCase) {
      await handleDirectSave(requestConfig, true);
      return;
    }

    if (!editor.state.moduleId && !editor.confirmModuleId) {
      editor.setIsConfirmDialogOpen(true);
      return;
    }

    if (editor.state.definitionId) {
      await handleDirectSave(requestConfig, false);
    } else {
      setIsSaveDialogOpen(true);
    }
  };

  const handleSaveDialogConfirm = async () => {
    if (!editor.state.moduleId && !editor.confirmModuleId) {
      toast.error('请选择所属模块');
      return;
    }
    await handleDirectSave(buildRequestConfig(), false);
    setIsSaveDialogOpen(false);
  };

  return {
    isSaveDialogOpen,
    setIsSaveDialogOpen,
    isSavingSyncData,
    handleSave,
    handleSaveDialogConfirm,
  };
}
