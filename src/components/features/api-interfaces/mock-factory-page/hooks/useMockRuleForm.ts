import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { mockFactoryService, type MockRule, type HttpRuleFeatures, type DubboRuleFeatures } from '@/services/mock-factory';
import { CodeEditorDialog } from '@/components/workflow/panels/shared/CodeEditorDialog';
import { DEFAULT_PYTHON_SCRIPT } from '../constants';
import type { MockRuleFormData } from '../types';

const createDefaultRuleData = (sceneCode: string): MockRuleFormData => ({
  sceneCode,
  serviceCode: '',
  status: 1,
  ruleFeatures: {},
  respStruct: {
    responseTypes: 'Object',
    content: {},
  },
  features: {
    rule: '',
    ruleType: 'HTTP',
  },
});

export function useMockRuleForm(selectedSceneCode: string, onSaveSuccess?: () => void) {
  const [ruleData, setRuleData] = useState<MockRuleFormData>(createDefaultRuleData(selectedSceneCode));
  const [selectedRule, setSelectedRule] = useState<MockRule | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ruleScenePopoverOpen, setRuleScenePopoverOpen] = useState(false);
  const [ruleSceneSearchValue, setRuleSceneSearchValue] = useState('');
  
  // 脚本编辑器状态
  const [isCodeEditorOpen, setIsCodeEditorOpen] = useState(false);
  const [tempScriptCode, setTempScriptCode] = useState<string>('');

  const generateRuleIdentifier = useCallback((): string => {
    const ruleType = ruleData.features?.ruleType || 'HTTP';
    if (ruleType === 'HTTP') {
      const httpFeatures = ruleData.ruleFeatures as HttpRuleFeatures;
      return httpFeatures.url || '';
    } else {
      const dubboFeatures = ruleData.ruleFeatures as DubboRuleFeatures;
      return dubboFeatures.interfaceName || '';
    }
  }, [ruleData]);

  const handleCreateRule = useCallback(() => {
    setSelectedRule(null);
    setIsEditing(true);
    setRuleData(createDefaultRuleData(selectedSceneCode));
  }, [selectedSceneCode]);

  const handleEditRule = useCallback((rule: MockRule) => {
    setSelectedRule(rule);
    setIsEditing(true);
    // 如果响应类型是 python_script 但 content 为空或不是字符串，设置默认值
    const respStruct = rule.respStruct;
    if (respStruct?.responseTypes === 'python_script' && typeof respStruct.content !== 'string') {
      setRuleData({
        ...rule,
        respStruct: {
          ...respStruct,
          content: DEFAULT_PYTHON_SCRIPT,
        },
      });
    } else {
      setRuleData({
        ...rule,
      });
    }
  }, []);

  const handleSaveRule = useCallback(async () => {
    if (!ruleData.sceneCode) {
      toast.error('请选择场景');
      return;
    }
    if (!ruleData.serviceCode) {
      toast.error('请输入服务代码');
      return;
    }

    const ruleIdentifier = generateRuleIdentifier();
    if (!ruleIdentifier) {
      const ruleType = ruleData.features?.ruleType || 'HTTP';
      if (ruleType === 'HTTP') {
        toast.error('请输入URL');
      } else {
        toast.error('请输入接口名称');
      }
      return;
    }

    try {
      setLoading(true);
      
      let ruleFeaturesToSave = ruleData.ruleFeatures || {};
      if (ruleData.features?.ruleType === 'HTTP') {
        const httpFeatures = ruleFeaturesToSave as HttpRuleFeatures;
        ruleFeaturesToSave = {
          ...httpFeatures,
          method: httpFeatures.method || 'get',
        };
      } else if (ruleData.features?.ruleType === 'DUBBO') {
        const dubboFeatures = ruleFeaturesToSave as DubboRuleFeatures;
        ruleFeaturesToSave = {
          ...dubboFeatures,
          paramTypes: Array.isArray(dubboFeatures?.paramTypes) ? dubboFeatures.paramTypes : [],
        };
      }
      
      const responseType = ruleData.respStruct?.responseTypes as 'String' | 'Object' | 'List' | 'Int' | 'Boolean' | 'python_script' | undefined;
      
      const dataToSave = {
        ...ruleData,
        ruleFeatures: ruleFeaturesToSave,
        features: {
          ...ruleData.features!,
          rule: ruleIdentifier,
        },
        // 如果是 python_script 类型，直接存储字符串
        respStruct: responseType === 'python_script' 
          ? {
              ...ruleData.respStruct!,
              content: typeof ruleData.respStruct?.content === 'string' 
                ? ruleData.respStruct.content 
                : DEFAULT_PYTHON_SCRIPT,
            }
          : ruleData.respStruct,
      };
      
      if (selectedRule?.id) {
        await mockFactoryService.updateMockData({
          ...dataToSave,
          id: selectedRule.id,
        } as MockRule);
        toast.success('更新成功');
      } else {
        await mockFactoryService.addMockData(dataToSave as Omit<MockRule, 'id' | 'createdAt' | 'updatedAt'>);
        toast.success('创建成功');
      }
      setIsEditing(false);
      setSelectedRule(null);
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (error: any) {
      toast.error('保存失败: ' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  }, [ruleData, selectedRule, generateRuleIdentifier, onSaveSuccess]);

  const updateResponseContent = useCallback((value: string) => {
    const responseType = ruleData.respStruct?.responseTypes as 'String' | 'Object' | 'List' | 'Int' | 'Boolean' | 'python_script' | undefined;
    // 如果是 python_script 类型，直接存储字符串
    if (responseType === 'python_script') {
      setRuleData({
        ...ruleData,
        respStruct: {
          ...ruleData.respStruct!,
          content: value,
        },
      });
    } else {
      // 其他类型，尝试解析 JSON
      try {
        const parsed = JSON.parse(value);
        setRuleData({
          ...ruleData,
          respStruct: {
            ...ruleData.respStruct!,
            content: parsed,
          },
        });
      } catch {
        setRuleData({
          ...ruleData,
          respStruct: {
            ...ruleData.respStruct!,
            content: value,
          },
        });
      }
    }
  }, [ruleData]);

  const formatResponseContent = useCallback((content: any): string => {
    if (typeof content === 'string') {
      try {
        return JSON.stringify(JSON.parse(content), null, 2);
      } catch {
        return content;
      }
    }
    return JSON.stringify(content, null, 2);
  }, []);

  // 处理脚本编辑器打开
  const handleOpenScriptEditor = useCallback(() => {
    const content = ruleData.respStruct?.content;
    const scriptContent = typeof content === 'string' ? content : '';
    // 如果内容为空，使用默认脚本模板
    setTempScriptCode(scriptContent || DEFAULT_PYTHON_SCRIPT);
    setIsCodeEditorOpen(true);
  }, [ruleData]);

  // 处理脚本编辑器保存
  const handleSaveScriptCode = useCallback(() => {
    updateResponseContent(tempScriptCode);
    setIsCodeEditorOpen(false);
  }, [tempScriptCode, updateResponseContent]);

  // 处理脚本编辑器内容变更
  const handleScriptCodeChange = useCallback((value: string) => {
    setTempScriptCode(value);
  }, []);

  return {
    ruleData,
    setRuleData,
    selectedRule,
    setSelectedRule,
    isEditing,
    setIsEditing,
    loading,
    ruleScenePopoverOpen,
    setRuleScenePopoverOpen,
    ruleSceneSearchValue,
    setRuleSceneSearchValue,
    isCodeEditorOpen,
    tempScriptCode,
    handleCreateRule,
    handleEditRule,
    handleSaveRule,
    updateResponseContent,
    formatResponseContent,
    handleOpenScriptEditor,
    handleSaveScriptCode,
    handleScriptCodeChange,
  };
}
