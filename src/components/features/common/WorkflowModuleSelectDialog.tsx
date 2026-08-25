/**
 * 工作流模块选择对话框组件
 * 用于E2E用例的批量复制到和移动到功能
 * 支持跨空间：显示项目下的所有空间，每个空间下显示其模块树
 */

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ChevronRight, ChevronDown, Search } from 'lucide-react';
import { metadataModuleService, type MetadataModuleTreeNode } from '@/services/metadata-module';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

// 空间节点（包含空间信息和模块树）
interface SpaceNode {
  id: string; // 空间ID
  name: string; // 空间名称
  moduleCount?: number; // 模块数量
  modules?: MetadataModuleTreeNode[]; // 模块树
  loading?: boolean; // 是否正在加载模块
}

interface WorkflowModuleSelectDialogProps {
  /** 对话框是否打开 */
  open: boolean;
  /** 对话框打开状态变化回调 */
  onOpenChange: (open: boolean) => void;
  /** 项目ID */
  projectId: string;
  /** 工作空间ID（当前空间，用于默认选中） */
  workspaceId: string;
  /** 当前选中的模块ID */
  selectedModuleId?: string;
  /** 模块ID变化回调 */
  onModuleChange?: (moduleId: string) => void;
  /** 确认回调 */
  onConfirm: (moduleId: string) => Promise<void>;
  /** 对话框标题 */
  title?: string;
  /** 用例数量（用于显示） */
  caseCount?: number;
  /** 操作类型（用于描述） */
  operationType?: 'copy' | 'move';
}

export function WorkflowModuleSelectDialog({
  open,
  onOpenChange,
  projectId,
  workspaceId,
  selectedModuleId = '',
  onModuleChange,
  onConfirm,
  title,
  caseCount = 0,
  operationType = 'copy',
}: WorkflowModuleSelectDialogProps) {
  const [spaces, setSpaces] = useState<SpaceNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [operating, setOperating] = useState(false); // 操作中的loading状态
  const [currentModuleId, setCurrentModuleId] = useState(selectedModuleId);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set()); // 展开的空间ID
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set()); // 展开的模块ID

  // 加载空间列表和模块树
  useEffect(() => {
    if (open && projectId) {
      loadSpacesAndModules();
    }
  }, [open, projectId]);

  // 同步外部selectedModuleId到内部状态
  useEffect(() => {
    if (open) {
      setCurrentModuleId(selectedModuleId);
    }
  }, [open, selectedModuleId]);

  // 关闭时重置状态
  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      setCurrentModuleId('');
      setExpandedSpaces(new Set());
      setExpandedModules(new Set());
      setOperating(false);
    }
  }, [open]);

  // 加载空间列表和模块树
  const loadSpacesAndModules = async () => {
    try {
      setLoading(true);
      setSpaces([]);
    } catch (error: any) {
      console.error('加载模块目录失败:', error);
      setSpaces([]);
    } finally {
      setLoading(false);
    }
  };

  // 加载指定空间的模块树
  const loadSpaceModules = async (spaceId: string) => {
    setSpaces(prev => {
      const spaceIndex = prev.findIndex(s => s.id === spaceId);
      if (spaceIndex < 0) return prev;

      // 如果已经加载过，不再重复加载
      if (prev[spaceIndex].modules !== undefined) {
        return prev;
      }

      // 标记为加载中
      const next = [...prev];
      next[spaceIndex] = { ...next[spaceIndex], loading: true };
      return next;
    });

    try {
      // 加载模块树
      const treeNodes = await metadataModuleService.getModuleTree(
        projectId,
        spaceId, // typeId: workspaceId
        'WORKFLOW'   // moduleType: WORKFLOW
      );

      // 更新空间节点，添加模块树
      setSpaces(prev => {
        const next = [...prev];
        const spaceIndex = next.findIndex(s => s.id === spaceId);
        if (spaceIndex >= 0) {
          next[spaceIndex] = {
            ...next[spaceIndex],
            modules: treeNodes,
            loading: false,
          };
        }
        return next;
      });

      // 默认展开第一层模块节点
      const firstLevelModuleIds = new Set<string>();
      treeNodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          firstLevelModuleIds.add(node.id);
        }
      });
      setExpandedModules(prev => {
        const next = new Set(prev);
        firstLevelModuleIds.forEach(id => next.add(id));
        return next;
      });
    } catch (error: any) {
      console.error(`加载空间 ${spaceId} 的模块树失败:`, error);
      toast.error('加载模块树失败');
      setSpaces(prev => {
        const next = [...prev];
        const spaceIndex = next.findIndex(s => s.id === spaceId);
        if (spaceIndex >= 0) {
          next[spaceIndex] = { ...next[spaceIndex], modules: [], loading: false };
        }
        return next;
      });
    }
  };

  // 切换空间展开/折叠
  const toggleSpace = async (spaceId: string) => {
    const isExpanded = expandedSpaces.has(spaceId);
    setExpandedSpaces(prev => {
      const next = new Set(prev);
      if (isExpanded) {
        next.delete(spaceId);
      } else {
        next.add(spaceId);
        // 展开时加载模块
        loadSpaceModules(spaceId);
      }
      return next;
    });
  };

  // 切换模块节点展开/折叠
  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  // 选择模块
  const handleModuleSelect = (moduleId: string) => {
    setCurrentModuleId(moduleId);
    onModuleChange?.(moduleId);
  };

  // 过滤空间和模块（根据搜索关键词）
  const filterSpacesAndModules = (spaceList: SpaceNode[], search: string): SpaceNode[] => {
    if (!search.trim()) {
      return spaceList;
    }

    const keyword = search.toLowerCase();
    const filtered: SpaceNode[] = [];

    spaceList.forEach(space => {
      const matchesSpaceName = space.name.toLowerCase().includes(keyword);
      
      // 过滤模块树
      const filterModules = (nodes: MetadataModuleTreeNode[] | undefined): MetadataModuleTreeNode[] | undefined => {
        if (!nodes) return undefined;
        const filteredModules: MetadataModuleTreeNode[] = [];
        nodes.forEach(node => {
          const matchesModuleName = node.name.toLowerCase().includes(keyword);
          const filteredChildren = node.children ? filterModules(node.children) : undefined;
          if (matchesModuleName || (filteredChildren && filteredChildren.length > 0)) {
            filteredModules.push({
              ...node,
              children: filteredChildren && filteredChildren.length > 0 ? filteredChildren : node.children,
            });
          }
        });
        return filteredModules.length > 0 ? filteredModules : undefined;
      };

      const filteredModules = filterModules(space.modules);

      if (matchesSpaceName || filteredModules) {
        filtered.push({
          ...space,
          modules: filteredModules || space.modules,
        });
      }
    });

    return filtered;
  };

  // 获取过滤后的空间列表
  const filteredSpaces = useMemo(() => {
    return filterSpacesAndModules(spaces, searchTerm);
  }, [spaces, searchTerm]);

  // 递归渲染模块树节点
  const renderModuleNode = (node: MetadataModuleTreeNode, level: number = 0): JSX.Element => {
    const isExpanded = expandedModules.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = currentModuleId === node.id;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 px-3 py-2 ${
            operating ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'
          } ${
            isSelected ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
          }`}
          style={{ paddingLeft: `${12 + level * 20}px` }}
          onClick={() => !operating && handleModuleSelect(node.id)}
        >
          {/* 展开/折叠按钮 */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) {
                toggleModule(node.id);
              }
            }}
            className="w-4 h-4 flex items-center justify-center flex-shrink-0"
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )
            ) : (
              <div className="w-4" />
            )}
          </div>
          {/* 模块名称 */}
          <span className={`text-sm flex-1 ${isSelected ? 'font-medium' : ''}`}>
            {node.name}
          </span>
        </div>
        {/* 递归渲染子节点 */}
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map(child => renderModuleNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // 渲染空间节点
  const renderSpaceNode = (space: SpaceNode): JSX.Element => {
    const isSpaceExpanded = expandedSpaces.has(space.id);
    const hasModules = space.modules !== undefined && space.modules.length > 0;
    const isLoadingModules = space.loading;

    return (
      <div key={space.id}>
        {/* 空间节点 */}
        <div
          className={`flex items-center gap-2 px-3 py-2 ${
            operating ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50'
          } text-gray-700 font-medium`}
          onClick={() => !operating && toggleSpace(space.id)}
        >
          {/* 展开/折叠按钮 */}
          <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
            {isLoadingModules ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            ) : hasModules || space.moduleCount ? (
              isSpaceExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )
            ) : (
              <div className="w-4" />
            )}
          </div>
          {/* 空间名称和模块数 */}
          <span className="text-sm flex-1">
            {space.name}
            {space.moduleCount !== undefined && space.moduleCount > 0 && (
              <span className="ml-2 text-xs text-gray-500">({space.moduleCount} 个模块)</span>
            )}
          </span>
        </div>
        {/* 空间下的模块树 */}
        {isSpaceExpanded && (
          <div>
            {isLoadingModules ? (
              <div className="px-3 py-2 text-sm text-gray-500" style={{ paddingLeft: '32px' }}>
                加载模块中...
              </div>
            ) : hasModules ? (
              <div>
                {space.modules!.map(module => renderModuleNode(module, 1))}
              </div>
            ) : (
              <div className="px-3 py-2 text-sm text-gray-400" style={{ paddingLeft: '32px' }}>
                暂无模块
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const handleConfirm = async () => {
    if (!currentModuleId) {
      toast.error('请选择目标模块');
      return;
    }
    
    try {
      setOperating(true);
      await onConfirm(currentModuleId);
      // 操作成功后关闭对话框
      handleClose();
    } catch (error) {
      // 错误已在onConfirm中处理，这里不需要额外处理
      // 保持对话框打开，让用户可以选择其他模块或取消
    } finally {
      setOperating(false);
    }
  };

  const handleClose = () => {
    setCurrentModuleId('');
    setSearchTerm('');
    setExpandedSpaces(new Set());
    setExpandedModules(new Set());
    onOpenChange(false);
  };

  // 获取选中的模块名称和空间名称
  const getSelectedModuleInfo = (): { spaceName: string; moduleName: string } => {
    const findModule = (nodes: MetadataModuleTreeNode[] | undefined): MetadataModuleTreeNode | null => {
      if (!nodes) return null;
      for (const node of nodes) {
        if (node.id === currentModuleId) {
          return node;
        }
        if (node.children) {
          const found = findModule(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    for (const space of spaces) {
      const module = findModule(space.modules);
      if (module) {
        return { spaceName: space.name, moduleName: module.name };
      }
    }
    return { spaceName: '', moduleName: '' };
  };

  const defaultTitle = operationType === 'copy' ? '批量复制' : '批量移动';
  const actionText = operationType === 'copy' ? '复制' : '移动';
  const { spaceName, moduleName } = getSelectedModuleInfo();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen && !operating) {
        handleClose();
      }
    }}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0 pb-2">
          <DialogTitle>
            {title || defaultTitle} (已选 {caseCount} 条用例)
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4 flex-1 min-h-0 overflow-hidden">
          {/* 搜索框 */}
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="请输入空间名称或模块名称"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={operating}
              className="pl-9 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* 空间和模块树列表 - 使用固定高度和滚动 */}
          <div 
            className="flex-1 min-h-0 overflow-y-auto border rounded-md scrollbar-thin"
            style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: '#94a3b8 #f1f5f9'
            }}
          >
            <div className="p-2">
              {loading ? (
                <div className="text-sm text-gray-500 py-8 text-center">加载空间列表中...</div>
              ) : operating ? (
                <div className="text-sm text-gray-500 py-8 text-center">
                  <div className="inline-block animate-spin mr-2">⏳</div>
                  {actionText}中，请稍候...
                </div>
              ) : filteredSpaces.length === 0 ? (
                <div className="text-sm text-gray-500 py-8 text-center">
                  {searchTerm ? '未找到匹配的空间或模块' : '暂无可用空间，请先创建空间'}
                </div>
              ) : (
                <div>
                  {filteredSpaces.map(space => renderSpaceNode(space))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={operating}
          >
            取消
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!currentModuleId || loading || filteredSpaces.length === 0 || operating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {operating ? (
              <>
                <span className="inline-block animate-spin mr-2">⏳</span>
                {actionText}中...
              </>
            ) : (
              `${actionText} ${caseCount} 个用例${moduleName ? `至${spaceName ? `${spaceName}/` : ''}${moduleName}` : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
