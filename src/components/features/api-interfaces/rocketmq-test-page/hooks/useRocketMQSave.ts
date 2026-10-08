/**
 * RocketMQTestPage 保存：handleSave、handleSaveDialogConfirm、handleDirectSave、同步数据/元数据
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { metadataService, pluginSyncNodeService, type MetadataDefinition } from '@/services/metadata';
import type { UseApiEditorResult } from '@/hooks/useApiEditor';
import type { RocketMQRequestConfig } from '../types';

export interface UseRocketMQSaveOptions {
  buildRequestConfig: (selectedSite: string) => RocketMQRequestConfig;
  selectedSite: string;
  editor: UseApiEditorResult;
  projectId: string;
  spaceId?: string;
  onRefresh?: () => void;
  isSyncData: boolean;
  nodeId: string;
  currentDefinition?: MetadataDefinition | null;
  topic: string;
  tag: string;
  key: string;
  loadedDefinitionIdRef: React.MutableRefObject<string | null>;
}

export function useRocketMQSave({
  buildRequestConfig,
  selectedSite,
  editor,
  projectId,
  spaceId,
  onRefresh,
  isSyncData,
  nodeId,
  currentDefinition,
  topic,
  tag,
  key,
  loadedDefinitionIdRef,
}: UseRocketMQSaveOptions) {
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isSavingSyncData, setIsSavingSyncData] = useState(false);

  const handleDirectSave = async (requestConfig: RocketMQRequestConfig) => {
    const moduleId = editor.state.moduleId || editor.confirmModuleId;
    if (!moduleId) {
      toast.error('请选择所属模块');
      return;
    }
    const name = editor.state.name?.trim();
    if (!name) {
      toast.error('请输入接口名称');
      return;
    }
    try {
      const common = { name, moduleId, description: editor.state.description || undefined, tags: editor.state.tags?.length ? editor.state.tags : undefined };
      const isUpdate = !!editor.state.definitionId;
      const result = isUpdate
        ? await metadataService.updateDefinition({ id: editor.state.definitionId!, ...(spaceId ? { spaceId } : {}), ...common, requestConfig, scriptContent: null } as Parameters<typeof metadataService.updateDefinition>[0])
        : await metadataService.addDefinition({ ...common, protocol: 'ROCKETMQ', projectId, ...(spaceId ? { spaceId } : {}), requestConfig, scriptContent: null } as Parameters<typeof metadataService.addDefinition>[0]);
      if (!result) {
        toast.error('保存失败：服务器返回数据为空');
        return;
      }
      const newId = typeof result === 'string' ? result : result.id;
      if (newId) {
        const def: MetadataDefinition = {
          id: newId,
          name: typeof result === 'string' ? editor.state.name : (result as MetadataDefinition).name || editor.state.name,
          protocol: 'ROCKETMQ',
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
    if (!editor.state.name?.trim()) { toast.error('请输入消息名称'); return; }
    if (!topic.trim()) { toast.error('请输入 Topic'); return; }
    if (!tag.trim()) { toast.error('请输入 Tag'); return; }
    if (!key.trim()) { toast.error('请输入 Key'); return; }

    const cfg = buildRequestConfig(selectedSite);

    if (isSyncData) {
      try {
        setIsSavingSyncData(true);
        let mqUrl = '';
        let producerGroup = '';
        if (currentDefinition?.requestConfig) {
          try {
            const c = typeof currentDefinition.requestConfig === 'string' ? JSON.parse(currentDefinition.requestConfig) : currentDefinition.requestConfig;
            mqUrl = (c as { mqUrl?: string; mq_url?: string }).mqUrl || (c as { mq_url?: string }).mq_url || '';
            producerGroup = (c as { producerGroup?: string; producer_group?: string }).producerGroup || (c as { producer_group?: string }).producer_group || '';
          } catch {
            /* noop */
          }
        }
        const endpointData = {
          name: editor.state.name || '',
          topic: cfg.topic || '',
          tag: cfg.tag || '',
          key: cfg.key || '',
          messageBody: cfg.body || '',
          body: cfg.body || '',
          mqUrl,
          mq_url: mqUrl,
          producerGroup,
          producer_group: producerGroup,
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

    if (!editor.state.moduleId && !editor.confirmModuleId) {
      editor.setIsConfirmDialogOpen(true);
      return;
    }
    if (editor.state.definitionId) {
      await handleDirectSave(cfg);
    } else {
      setIsSaveDialogOpen(true);
    }
  };

  const handleSaveDialogConfirm = async () => {
    if (!editor.state.moduleId && !editor.confirmModuleId) {
      toast.error('请选择所属模块');
      return;
    }
    if (!editor.state.name?.trim()) { toast.error('请输入消息名称'); return; }
    if (!topic.trim()) { toast.error('请输入 Topic'); return; }
    if (!tag.trim()) { toast.error('请输入 Tag'); return; }
    if (!key.trim()) { toast.error('请输入 Key'); return; }
    await handleDirectSave(buildRequestConfig(selectedSite));
    setIsSaveDialogOpen(false);
  };

  return { isSaveDialogOpen, setIsSaveDialogOpen, isSavingSyncData, handleSave, handleSaveDialogConfirm };
}
